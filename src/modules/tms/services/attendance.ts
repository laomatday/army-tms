import { db } from "@/core/firebase";
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  setDoc, 
  updateDoc, 
  writeBatch,
  orderBy,
  limit
} from 'firebase/firestore';
import { Employee, Attendance, LocationConfig } from "@/shared/types";
import { COLLECTIONS } from "./constants";
import { getSystemConfig, getShifts, determineShift } from "./config";
import { calculateAndSaveMonthlyStats } from "./stats";
import { calculateDistance, getCurrentTimeStr, timeToMinutes, calculateNetWorkHours } from "@/core/utils/helpers";

export async function doCheckIn(data: { employeeId: string, lat: number, lng: number, deviceId: string, imageUrl: string, checkinType?: string }, user: Employee) {
  try {
    const attRef = collection(db, COLLECTIONS.ATTENDANCE);
    const openSessionQuery = query(
        attRef,
        where("employee_id", "==", user.employee_id),
        where("time_out", "==", "")
    );

    const [sysConfig, openSessionSnap, shifts] = await Promise.all([
        getSystemConfig(),
        getDocs(openSessionQuery),
        getShifts()
    ]);
    
    const todayStr = new Date().toISOString().split('T')[0];
    
    if (!openSessionSnap.empty) {
        const batch = writeBatch(db);
        let hasTodaySession = false;

        openSessionSnap.docs.forEach(d => {
            const att = d.data() as Attendance;
            if (att.date === todayStr) {
                hasTodaySession = true;
            } else {
                batch.update(d.ref, {
                    time_out: "23:59",
                    status: "Invalid",
                    note: "System: Auto-closed (Forgot Checkout)",
                    last_updated: new Date().toISOString()
                });
            }
        });

        if (hasTodaySession) {
            return { 
                success: false, 
                message: "Bạn chưa Check-out ca làm việc hiện tại! Vui lòng Check-out trước." 
            };
        }

        await batch.commit();
    }
    
    const userLat = Number(data.lat);
    const userLng = Number(data.lng);

    if (isNaN(userLat) || isNaN(userLng)) {
        return { success: false, message: "Dữ liệu GPS từ thiết bị không hợp lệ (Bị rỗng hoặc NaN)." };
    }

    const locRef = collection(db, COLLECTIONS.LOCATIONS);
    let locationsQuery;
    const userAllowed = user.allowed_locations || [];

    // Fallback to center_id if allowed_locations is empty
    const allowedIds = (userAllowed.length > 0) ? userAllowed : [user.center_id];
    const cleanAllowedIds = allowedIds.filter(id => !!id).map(id => String(id).trim());

    if (cleanAllowedIds.length > 0) {
        // Firestore 'in' query supports max 10 items. 
        // If > 10, we might need multiple queries or client-side filtering.
        // For now assuming < 10 locations per employee.
        locationsQuery = query(locRef, where('center_id', 'in', cleanAllowedIds.slice(0, 10)));
    } else {
        locationsQuery = query(locRef, where('center_id', 'in', ['__EMPTY__']));
    }

    const locationsSnap = await getDocs(locationsQuery);
    const allowedLocations = locationsSnap.docs.map((d: any) => d.data() as LocationConfig);

    if (allowedLocations.length === 0) {
        return { 
            success: false, 
            message: `Bạn không có quyền chấm công tại bất kỳ chi nhánh nào. (Center ID: ${user.center_id || 'N/A'})` 
        };
    }

    let nearestLoc: LocationConfig | null = null;
    let minDistance = Infinity;

    allowedLocations.forEach((loc: LocationConfig) => {
        const locLat = Number(loc.latitude);
        const locLng = Number(loc.longitude);
        
        if (isNaN(locLat) || isNaN(locLng) || (locLat === 0 && locLng === 0)) {
            console.warn(`Bỏ qua chi nhánh ${loc.location_name} do tọa độ DB sai.`);
            return;
        }

        const dist = calculateDistance(userLat, userLng, locLat, locLng);
        if (dist < minDistance) {
            minDistance = dist;
            nearestLoc = loc;
        }
    });

    if (!nearestLoc) {
        return { 
            success: false, 
            message: "Không tìm thấy chi nhánh hợp lệ trong danh sách phân quyền của bạn." 
        };
    }

    const finalLoc = nearestLoc as LocationConfig;
    const allowedRadius = Number(finalLoc.radius_meters) || sysConfig.MAX_DISTANCE_METERS || 200;
    
    if (minDistance > allowedRadius) {
        return { 
            success: false, 
            message: `Bạn đang ở quá xa chi nhánh ${finalLoc.location_name} (${Math.round(minDistance)}m). Bán kính cho phép là ${allowedRadius}m. (Vị trí: ${userLat.toFixed(4)}, ${userLng.toFixed(4)})` 
        };
    }

    const nowTimeStr = getCurrentTimeStr();
    const currentShift = determineShift(nowTimeStr, shifts);
    
    let lateMins = 0;
    const startMins = timeToMinutes(currentShift.start);
    const nowMins = timeToMinutes(nowTimeStr);
    if (nowMins > startMins + (sysConfig.LATE_TOLERANCE || 15)) {
        lateMins = nowMins - startMins;
    }

    const now = new Date();
    const docId = `${user.employee_id}_${now.getTime()}`;

    const newAttendance: Attendance = {
        date: todayStr,
        employee_id: user.employee_id,
        name: user.name,
        center_id: finalLoc.center_id,
        shift_name: currentShift.name,
        shift_start: currentShift.start,
        shift_end: currentShift.end,
        time_in: nowTimeStr,
        time_out: "",
        checkin_type: (data.checkinType as any) || 'Mobile',
        checkin_lat: userLat,
        checkin_lng: userLng,
        distance_meters: minDistance,
        device_id: data.deviceId,
        selfie_url: data.imageUrl,
        late_minutes: lateMins,
        early_minutes: 0,
        work_hours: 0,
        status: lateMins > 0 ? 'Late' : 'Valid',
        is_valid: 'Yes',
        note: '',
        timestamp: now.getTime(),
        last_updated: now.toISOString()
    };

    await setDoc(doc(db, COLLECTIONS.ATTENDANCE, docId), newAttendance);

    calculateAndSaveMonthlyStats(user.employee_id, todayStr);

    return { success: true, message: `Check-in thành công tại ${finalLoc.location_name}! (${currentShift.name})` };
  } catch (e: any) {
    console.error("Check-in Error:", e);
    return { success: false, message: e.message || "Lỗi chấm công" };
  }
}

export async function doCheckOut(employeeId: string, lat?: number, lng?: number) {
  try {
    const attRef = collection(db, COLLECTIONS.ATTENDANCE);
    const q = query(
        attRef,
        where("employee_id", "==", employeeId),
        where("time_out", "==", ""),
        orderBy("timestamp", "desc"),
        limit(1)
    ); 
    
    const snap = await getDocs(q);
    
    if (snap.empty) {
        return { success: false, message: "Không tìm thấy phiên làm việc để Check-out." };
    }

    const docSnap = snap.docs[0];
    const openDoc = { ...docSnap.data(), id: docSnap.id } as Attendance;

    const todayStr = new Date().toISOString().split('T')[0];
    if (openDoc.date !== todayStr) {
        return { 
            success: false, 
            message: `Bạn đang cố gắng Check-out cho một phiên làm việc cũ (${openDoc.date}). Vui lòng liên hệ quản lý để được hỗ trợ.` 
        };
    }

    const nowTimeStr = getCurrentTimeStr();
    const sysConfig = await getSystemConfig();

    let checkoutDistance = 0;
    let finalCheckoutLat: number | undefined = undefined;
    let finalCheckoutLng: number | undefined = undefined;

    if (lat !== undefined && lng !== undefined) {
        const userLat = Number(lat);
        const userLng = Number(lng);

        if (isNaN(userLat) || isNaN(userLng)) {
            return { success: false, message: "Dữ liệu GPS Check-out không hợp lệ." };
        }

        finalCheckoutLat = userLat;
        finalCheckoutLng = userLng;

        const locRef = collection(db, COLLECTIONS.LOCATIONS);
        const locQuery = query(locRef, where("center_id", "==", openDoc.center_id), limit(1));
        const locSnap = await getDocs(locQuery);

        if (!locSnap.empty) {
            const loc = locSnap.docs[0].data() as LocationConfig;
            checkoutDistance = calculateDistance(userLat, userLng, Number(loc.latitude), Number(loc.longitude));
            const allowedRadius = Number(loc.radius_meters) || sysConfig.MAX_DISTANCE_METERS || 200;
            
            if (checkoutDistance > allowedRadius) {
                 return { success: false, message: `Check-out thất bại: Bạn đang ở quá xa chi nhánh ${loc.location_name} (${Math.round(checkoutDistance)}m). Bán kính cho phép: ${allowedRadius}m.` };
            }
        }
    }

    const netHoursStr = calculateNetWorkHours(
        openDoc.time_in, 
        nowTimeStr, 
        sysConfig.LUNCH_START, 
        sysConfig.LUNCH_END
    );
    let netHours = parseFloat(netHoursStr);

    if (openDoc.total_break_mins) {
        netHours = Math.max(0, netHours - (openDoc.total_break_mins / 60));
    }

    let earlyMins = 0;
    if (openDoc.shift_end && openDoc.shift_start) {
        let endMins = timeToMinutes(openDoc.shift_end);
        const startMins = timeToMinutes(openDoc.shift_start);
        let nowMins = timeToMinutes(nowTimeStr);
        
        if (endMins < startMins && nowMins < startMins) {
             endMins += 24 * 60;
             nowMins += 24 * 60;
        } else if (endMins < startMins) {
             endMins += 24 * 60;
        }

        if (nowMins < endMins - 1) {
            earlyMins = endMins - nowMins;
        }
    }

    await updateDoc(doc(db, COLLECTIONS.ATTENDANCE, openDoc.id!), {
        time_out: nowTimeStr,
        checkout_lat: finalCheckoutLat,
        checkout_lng: finalCheckoutLng,
        checkout_distance: checkoutDistance,
        work_hours: parseFloat(netHours.toFixed(2)),
        early_minutes: earlyMins,
        last_updated: new Date().toISOString()
    });

    calculateAndSaveMonthlyStats(employeeId, openDoc.date);

    return { success: true, message: `Check-out thành công! Công: ${netHours.toFixed(2)}h` };

  } catch (e: any) {
    console.error("Check-out Error:", e);
    return { success: false, message: e.message || "Lỗi chấm công" };
  }
}

export async function togglePause(employeeId: string, isPausing: boolean) {
    try {
        const attRef = collection(db, COLLECTIONS.ATTENDANCE);
        const q = query(
            attRef,
            where("employee_id", "==", employeeId),
            where("time_out", "==", ""),
            orderBy("timestamp", "desc"),
            limit(1)
        );
            
        const snap = await getDocs(q);
        
        if (snap.empty) return { success: false, message: "Không tìm thấy phiên làm việc!" };

        const docSnap = snap.docs[0];
        const openDoc = { ...docSnap.data(), id: docSnap.id } as Attendance;

        const now = new Date();

        if (isPausing) {
            if (openDoc.break_start) return { success: false, message: "Bạn đang trong thời gian nghỉ rồi." };
            await updateDoc(doc(db, COLLECTIONS.ATTENDANCE, openDoc.id!), {
                break_start: now.toISOString(),
                last_updated: now.toISOString()
            });
            return { success: true, message: "Đã tạm dừng công việc." };
        } else {
            if (!openDoc.break_start) return { success: false, message: "Bạn chưa tạm dừng." };
            
            const breakStart = new Date(openDoc.break_start);
            const diffMs = now.getTime() - breakStart.getTime();
            const diffMins = Math.floor(diffMs / 60000);
            const currentTotal = openDoc.total_break_mins || 0;

            await updateDoc(doc(db, COLLECTIONS.ATTENDANCE, openDoc.id!), {
                break_start: null, 
                total_break_mins: currentTotal + diffMins,
                last_updated: now.toISOString()
            });
            return { success: true, message: `Đã tiếp tục làm việc! (Nghỉ ${diffMins}p)` };
        }
    } catch(e: any) {
        return { success: false, message: e.message };
    }
}

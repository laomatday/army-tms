import { db } from "@/core/firebase";
import { collection, query, where, getDocs, doc, getDoc, setDoc } from 'firebase/firestore';
import { HolidayConfig, Attendance, LeaveRequest, Explanation, Employee, MonthlyStats } from "@/shared/types";
import { getSystemConfig } from "./config";
import { sendSystemNotification } from "./notification";
import { COLLECTIONS } from "./constants";

export async function calculateAndSaveMonthlyStats(employeeId: string, dateStr: string) {
    try {
        const dateObj = new Date(dateStr);
        const month = dateObj.getMonth() + 1;
        const year = dateObj.getFullYear();
        const keyId = `${employeeId}_${month}_${year}`;
        const todayStr = new Date().toISOString().split('T')[0];

        const daysInMonth = new Date(year, month, 0).getDate();
        const startStr = `${year}-${String(month).padStart(2,'0')}-01`;
        const endStr = `${year}-${String(month).padStart(2,'0')}-${String(daysInMonth).padStart(2,'0')}`;

        // 1. Fetch System Config & Holidays
        const sysConfig = await getSystemConfig();
        const holidaySnap = await getDocs(collection(db, COLLECTIONS.HOLIDAYS));
        const holidays = holidaySnap.docs.map(d => d.data() as HolidayConfig);
        const offDays = sysConfig.OFF_DAYS || [0]; 

        // 2. Fetch Data (Attendance, Leaves, Explanations)
        const attRef = collection(db, COLLECTIONS.ATTENDANCE);
        
        const qAtt = query(attRef,
            where("employee_id", "==", employeeId),
            where("date", ">=", startStr),
            where("date", "<=", endStr));
        
        const [attSnap, leaveSnap, explainSnap, userSnap] = await Promise.all([
            getDocs(qAtt),
            getDocs(query(collection(db, COLLECTIONS.LEAVE),
                where("employee_id", "==", employeeId),
                where("status", "==", "Approved"))),
            getDocs(query(collection(db, COLLECTIONS.EXPLANATIONS),
                where("employee_id", "==", employeeId),
                where("status", "==", "Approved"))),
            getDoc(doc(db, COLLECTIONS.EMPLOYEES, employeeId))
        ]);
        
        const monthAtt = attSnap.docs.map(d => d.data() as Attendance);
        
        const leaves = leaveSnap.docs
            .map(d => d.data() as LeaveRequest)
            .filter(req => {
                return (req.from_date >= startStr && req.from_date <= endStr) || 
                       (req.to_date >= startStr && req.to_date <= endStr);
            });
        
        const explanations = explainSnap.docs
            .map(d => d.data() as Explanation)
            .filter(e => e.date >= startStr && e.date <= endStr);

        // 3. Count Standard Working Days
        const holidaySet = new Set<string>();
        holidays.forEach(h => {
             let loop = new Date(h.from_date);
             const end = new Date(h.to_date);
             while(loop <= end) {
                 holidaySet.add(loop.toISOString().split('T')[0]);
                 loop.setDate(loop.getDate() + 1);
             }
        });

        let standard_days = 0;
        for (let d = 1; d <= daysInMonth; d++) {
             const date = new Date(year, month - 1, d);
             const dayOfWeek = date.getDay();
             if (!offDays.includes(dayOfWeek)) {
                 standard_days++;
             }
        }

        // 4. Calculate Stats
        const dailyMap: Record<string, { 
            hours: number, 
            late: number, 
            early: number, 
            error: number, 
            isLeave: boolean,
            isExplained: boolean,
            isHoliday: boolean 
        }> = {};

        // A. Process Attendance
        monthAtt.forEach(att => {
             const dStr = att.date;
             if (!dailyMap[dStr]) dailyMap[dStr] = { hours: 0, late: 0, early: 0, error: 0, isLeave: false, isExplained: false, isHoliday: false };
             
             let hours = 0;
             if (att.time_in && att.time_out) {
                 hours = att.work_hours || 0;
             } 
             
             if (!att.time_out && dStr < todayStr) {
                 dailyMap[dStr].error = 1;
             }

             dailyMap[dStr].hours += hours;
             dailyMap[dStr].late += (att.late_minutes || 0);
             dailyMap[dStr].early += (att.early_minutes || 0);
        });

        // B. Process Leaves
        let leave_days = 0;
        leaves.forEach(req => {
            let loop = new Date(req.from_date);
            const toDate = new Date(req.to_date);

            while (loop <= toDate) {
                const dStr = loop.toISOString().split('T')[0];
                if (dStr >= startStr && dStr <= endStr) {
                    if (!dailyMap[dStr]) dailyMap[dStr] = { hours: 0, late: 0, early: 0, error: 0, isLeave: false, isExplained: false, isHoliday: false };
                    
                    dailyMap[dStr].isLeave = true;
                    if (req.type.includes("Nghỉ phép")) {
                         leave_days++;
                    }
                }
                loop.setDate(loop.getDate() + 1);
            }
        });

        // C. Process Explanations
        explanations.forEach(exp => {
            const dStr = exp.date;
            if (!dailyMap[dStr]) dailyMap[dStr] = { hours: 0, late: 0, early: 0, error: 0, isLeave: false, isExplained: false, isHoliday: false };
            dailyMap[dStr].isExplained = true;
        });

        // D. Final Aggregation
        let work_days = 0;
        let total_late_minutes = 0;
        let total_early_minutes = 0;
        let error_count = 0;
        let late_count = 0;
        let early_count = 0;

        holidaySet.forEach(dStr => {
            if (dStr >= startStr && dStr <= endStr) {
                if (!dailyMap[dStr]) dailyMap[dStr] = { hours: 0, late: 0, early: 0, error: 0, isLeave: false, isExplained: false, isHoliday: false };
                dailyMap[dStr].isHoliday = true;
            }
        });

        Object.keys(dailyMap).forEach(d => {
            const day = dailyMap[d];
            const isExcused = day.isLeave || day.isExplained || day.isHoliday;
            
            let dayCredit = 0;
            if (day.hours >= sysConfig.MIN_HOURS_FULL) {
                dayCredit = 1.0;
            } else if (day.hours >= sysConfig.MIN_HOURS_HALF) {
                dayCredit = 0.5;
            }

            if (isExcused) {
                work_days += Math.max(dayCredit, 1.0);
            } else {
                work_days += dayCredit;
                total_late_minutes += day.late;
                total_early_minutes += day.early;
                error_count += day.error;
                
                if (day.late > 0) late_count++;
                if (day.early > 0) early_count++;
            }
        });

        // 5. Update Stats
        const userData = userSnap.exists() ? (userSnap.data() as Employee) : null;
        const currentBalance = userData?.annual_leave_balance ?? 12;

        const statsData: MonthlyStats = {
            key_id: keyId,
            employee_id: employeeId,
            month,
            year,
            work_days,
            standard_days,
            late_mins: total_late_minutes,
            late_count,
            early_mins: total_early_minutes, 
            early_count,
            error_count,
            leave_days,
            remaining_leave: currentBalance,
            last_updated: new Date().toISOString()
        };

        await setDoc(doc(db, COLLECTIONS.MONTHLY_STATS, keyId), statsData, { merge: true });
        
        const now = new Date();
        if (now.getDate() === (sysConfig.LOCK_DATE || 5)) {
             await sendSystemNotification(
                 employeeId, 
                 "Chốt công tháng", 
                 `Bảng công tháng ${month} đã được cập nhật. Vui lòng kiểm tra lại.`,
                 "info"
             );
        }

        return statsData;

    } catch (e) {
        console.error("Error updating stats", e);
        return null;
    }
}

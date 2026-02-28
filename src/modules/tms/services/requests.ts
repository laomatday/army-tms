import { db } from "@/core/firebase";
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc, 
  updateDoc,
  deleteDoc
} from 'firebase/firestore';
import { LeaveRequest, Explanation, Employee } from "@/shared/types";
import { formatDateString } from "@/core/utils/helpers";
import { getSystemConfig } from "./config";
import { calculateAndSaveMonthlyStats } from "./stats";
import { sendSystemNotification } from "./notification";
import { COLLECTIONS } from "./constants";

export async function submitExplanation(data: { employeeId: string, name: string, date: string, reason: string }) {
    try {
        const sysConfig = await getSystemConfig();
        const now = new Date();
        
        const reqDate = new Date(data.date);
        if (reqDate.getMonth() < now.getMonth() && now.getDate() > (sysConfig.LOCK_DATE || 5)) {
            return { success: false, message: `Đã khóa sổ tháng trước.` };
        }

        const newExp: Explanation = {
            employee_id: data.employeeId,
            name: data.name,
            date: data.date,
            reason: data.reason,
            status: "Pending",
            created_at: new Date().toISOString()
        };
        await addDoc(collection(db, COLLECTIONS.EXPLANATIONS), newExp);

        // --- NOTIFY MANAGER ---
        try {
            const userQuery = query(collection(db, COLLECTIONS.EMPLOYEES), where("employee_id", "==", data.employeeId));
            const userSnap = await getDocs(userQuery);
            if (!userSnap.empty) {
                const userData = userSnap.docs[0].data() as Employee;
                if (userData.direct_manager_id) {
                    await sendSystemNotification(
                        userData.direct_manager_id,
                        "Giải trình mới",
                        `Nhân viên ${data.name} vừa gửi giải trình công ngày ${formatDateString(data.date)}.`,
                        "warning"
                    );
                }
            }
        } catch (err) {
            console.error("Failed to notify manager", err);
        }
        // ---------------------

        return { success: true, message: "Gửi giải trình thành công!" };
    } catch(e: any) {
        return { success: false, message: e.message };
    }
}

export async function processExplanation(docId: string, status: string, note: string) {
    try {
        const docRef = doc(db, COLLECTIONS.EXPLANATIONS, docId);
        const snap = await getDoc(docRef);
        if(!snap.exists()) return { success: false, message: "Not found" };
        const exp = snap.data() as Explanation;

        await updateDoc(docRef, { status, manager_note: note });
        await calculateAndSaveMonthlyStats(exp.employee_id, exp.date);
        
        const statusText = status === 'Approved' ? 'được DUYỆT' : 'bị TỪ CHỐI';
        await sendSystemNotification(
            exp.employee_id, 
            "Kết quả giải trình công", 
            `Giải trình ngày ${formatDateString(exp.date)} của bạn đã ${statusText}.`,
            status === 'Approved' ? 'success' : 'error'
        );

        return { success: true, message: "Đã xử lý!" };
    } catch (e: any) {
        return { success: false, message: e.message };
    }
}

export async function submitRequest(data: any) {
    try {
        const sysConfig = await getSystemConfig();
        const now = new Date();
        
        const reqDate = new Date(data.fromDate);
        if (reqDate.getMonth() < now.getMonth() && now.getDate() > (sysConfig.LOCK_DATE || 5)) {
            return { success: false, message: `Đã khóa sổ tháng trước.` };
        }

        const newReq = {
            request_id: "REQ_" + Date.now(),
            employee_id: data.employeeId,
            name: data.name,
            created_at: new Date().toISOString(),
            type: data.type,
            from_date: data.fromDate,
            to_date: data.toDate,
            expiration_date: data.expirationDate || null,
            reason: data.reason,
            status: "Pending"
        };
        await addDoc(collection(db, COLLECTIONS.LEAVE), newReq);

        // --- NOTIFY MANAGER ---
        try {
            const userQuery = query(collection(db, COLLECTIONS.EMPLOYEES), where("employee_id", "==", data.employeeId));
            const userSnap = await getDocs(userQuery);
            if (!userSnap.empty) {
                const userData = userSnap.docs[0].data() as Employee;
                if (userData.direct_manager_id) {
                    await sendSystemNotification(
                        userData.direct_manager_id,
                        "Yêu cầu cần duyệt",
                        `Nhân viên ${data.name} vừa gửi đơn ${data.type} (${formatDateString(data.fromDate)}).`,
                        "warning"
                    );
                }
            }
        } catch (err) {
            console.error("Failed to notify manager", err);
        }
        // ---------------------

        return { success: true, message: "Gửi đề xuất thành công!" };
    } catch (e: any) {
        return { success: false, message: e.message };
    }
}

export async function processRequest(docId: string, status: string, note: string) {
    try {
        const docRef = doc(db, COLLECTIONS.LEAVE, docId);
        const snap = await getDoc(docRef);
        if(!snap.exists()) return { success: false, message: "Not found" };
        const req = snap.data() as LeaveRequest;

        await updateDoc(docRef, { status, manager_note: note });
        await calculateAndSaveMonthlyStats(req.employee_id, req.from_date);
        
        const statusText = status === 'Approved' ? 'được DUYỆT' : 'bị TỪ CHỐI';
        await sendSystemNotification(
            req.employee_id, 
            "Kết quả đơn xin nghỉ", 
            `Đơn ${req.type} (${formatDateString(req.from_date)}) đã ${statusText}.`,
            status === 'Approved' ? 'success' : 'error'
        );

        return { success: true, message: "Đã xử lý!" };
    } catch (e: any) {
        return { success: false, message: e.message };
    }
}

export async function deleteExplanation(docId: string) {
    try {
        const docRef = doc(db, COLLECTIONS.EXPLANATIONS, docId);
        await deleteDoc(docRef);
        return { success: true, message: "Đã xoá giải trình!" };
    } catch (e: any) {
        return { success: false, message: e.message };
    }
}

export async function deleteRequest(docId: string) {
    try {
        const docRef = doc(db, COLLECTIONS.LEAVE, docId);
        await deleteDoc(docRef);
        return { success: true, message: "Đã xoá đơn!" };
    } catch (e: any) {
        return { success: false, message: e.message };
    }
}

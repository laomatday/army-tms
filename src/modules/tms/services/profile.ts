import { db, auth } from "@/core/firebase";
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  updateDoc 
} from 'firebase/firestore';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { Employee } from "@/shared/types";
import { COLLECTIONS } from "./constants";

export async function updateProfileAvatar(employeeId: string, avatarUrl: string) {
    try {
        const usersRef = collection(db, COLLECTIONS.EMPLOYEES);
        const qId = query(usersRef, where("employee_id", "==", employeeId));
        const userSnap = await getDocs(qId);
        if(userSnap.empty) return { success: false, message: "User not found" };
        
        await updateDoc(doc(db, COLLECTIONS.EMPLOYEES, userSnap.docs[0].id), { face_ref_url: avatarUrl });
        
        return { success: true, message: "Cập nhật ảnh thành công!" };
    } catch (e: any) {
        return { success: false, message: e.message };
    }
}

export async function changePassword(employeeId: string, oldPass: string, newPass: string) {
    try {
        const user = auth.currentUser;
        if (!user || !user.email) {
            return { success: false, message: "Không tìm thấy thông tin đăng nhập." };
        }

        // Re-authenticate user before changing password
        const credential = EmailAuthProvider.credential(user.email, oldPass);
        try {
            await reauthenticateWithCredential(user, credential);
        } catch (authError: any) {
            console.error("Re-authentication error:", authError);
            if (authError.code === 'auth/wrong-password' || authError.code === 'auth/invalid-credential') {
                return { success: false, message: "Mật khẩu cũ không đúng." };
            }
            return { success: false, message: "Lỗi xác thực: " + authError.message };
        }

        // Update password in Firebase Auth
        await updatePassword(user, newPass);
        
        return { success: true, message: "Đổi mật khẩu thành công!" };
    } catch (e: any) {
        console.error("Change password error:", e);
        return { success: false, message: e.message };
    }
}

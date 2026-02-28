import { db, auth, functions } from "@/core/firebase";
import { collection, query, where, getDocs, doc, updateDoc, arrayUnion, getDoc } from 'firebase/firestore';
import { signInWithCustomToken } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { Employee } from "@/shared/types";
import { COLLECTIONS } from "@/shared/constants";

export async function doLogin(loginId: string, password: string, deviceId: string) {
  try {
    const cleanId = loginId.trim().toLowerCase();
    const authEmail = cleanId.includes('@') ? cleanId : `${cleanId}@army.vn`;

    // 1. Tiến hành gọi Firebase Authentication TRƯỚC
    // Vì bảng employees đã bị khóa public read (bảo mật), ta phải login Auth thành công mới có Token đọc DB
    let userCredential;
    try {
      const { signInWithEmailAndPassword } = await import('firebase/auth');
      userCredential = await signInWithEmailAndPassword(auth, authEmail, password);
    } catch (error: any) {
      if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
        // Thử lại với acc nội bộ cũ nếu gõ bằng ID
        if (!cleanId.includes('@')) {
          try {
            const { signInWithEmailAndPassword } = await import('firebase/auth');
            userCredential = await signInWithEmailAndPassword(auth, `${cleanId}@army.internal`, password);
          } catch (e2: any) {
            return { success: false, message: "Sai Tài khoản, Sai Mật khẩu, HOẶC Chưa được Cấp Auth gốc." };
          }
        } else {
          return { success: false, message: "Sai Tài khoản, Sai Mật khẩu, HOẶC Chưa được Cấp Auth gốc." };
        }
      } else {
        return { success: false, message: "Đăng nhập Auth thất bại: " + error.message };
      }
    }

    const firebaseUser = userCredential.user;

    // 2. Login Auth thành công -> Đã có quyền -> Lấy User Data từ Firestore
    const usersRef = collection(db, COLLECTIONS.EMPLOYEES);

    // Tìm kiếm theo Email
    const qEmail = query(usersRef, where("email", "==", authEmail));
    const emailSnap = await getDocs(qEmail);

    let userDoc;
    if (emailSnap.empty) {
      // Fallback: Tìm kiếm theo employee_id nếu người dùng lỡ nhập Mã nhân viên
      const qFallback = query(usersRef, where("employee_id", "==", loginId.toUpperCase()));
      const fallbackSnap = await getDocs(qFallback);

      if (fallbackSnap.empty) {
        return { success: false, message: "Firebase Auth hợp lệ nhưng không tìm thấy hồ sơ DB tương ứng." };
      }
      userDoc = fallbackSnap.docs[0];
    } else {
      userDoc = emailSnap.docs[0];
    }

    const userData = userDoc.data() as Employee;
    const docId = userDoc.id;

    // 4. Trusted Device Check
    const role = (userData.role || "").trim();
    const isPrivileged = ['Admin', 'Director', 'HR'].includes(role);

    if (!isPrivileged) {
      const storedTrustedId = (userData.trusted_device_id || "").trim();
      const currentDeviceId = (deviceId || "").trim();

      if (!currentDeviceId) {
        return { success: false, message: "Lỗi: Không xác định được ID thiết bị." };
      }

      if (!storedTrustedId && docId) {
        try {
          await updateDoc(doc(db, COLLECTIONS.EMPLOYEES, docId), {
            trusted_device_id: currentDeviceId
          });
        } catch (e: any) {
          console.error("Update trusted_device_id failed:", e);
        }
        userData.trusted_device_id = currentDeviceId;
      } else {
        if (storedTrustedId !== currentDeviceId) {
          // Sign out if device doesn't match
          await auth.signOut();
          return {
            success: false,
            message: `THIẾT BỊ LẠ! Tài khoản ${userData.employee_id} đã gắn liền với thiết bị khác. Vui lòng liên hệ Admin để reset.`
          };
        }
      }
    }

    const safeUser = { ...userData, id: docId };

    return { success: true, data: safeUser };
  } catch (e: any) {
    console.error("Login Error:", e);
    return { success: false, message: "Lỗi Server: " + e.message };
  }
}

export async function saveDeviceToken(employeeDocId: string, token: string) {
  try {
    await updateDoc(doc(db, COLLECTIONS.EMPLOYEES, employeeDocId), {
      fcm_tokens: arrayUnion(token)
    });
  } catch (e) { }
}

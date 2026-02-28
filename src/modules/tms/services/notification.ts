import { db, messaging } from "@/core/firebase";
import { collection, addDoc, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { getToken, onMessage } from 'firebase/messaging';
import { UserNotification } from "@/shared/types";
import { COLLECTIONS } from "./constants";
import { saveDeviceToken } from '@/core/auth/authService';

export async function sendSystemNotification(employeeId: string, title: string, body: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') {
    try {
        const noti: UserNotification = {
            employee_id: employeeId,
            title,
            body,
            type,
            is_read: false,
            created_at: new Date().toISOString()
        };
        await addDoc(collection(db, COLLECTIONS.NOTIFICATIONS), noti);
    } catch (e) {
        console.error("Failed to send notification", e);
    }
}

export const subscribeToUserNotifications = (employeeId: string, onNotificationAdded: (data: any) => void) => {
  const q = query(
    collection(db, 'user_notifications'), 
    where("employee_id", "==", employeeId),
    where("is_read", "==", false)
  );

  return onSnapshot(q, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === "added") {
        const data = change.doc.data();
        onNotificationAdded(data);
        updateDoc(doc(db, 'user_notifications', change.doc.id), { is_read: true }).catch(console.error);
      }
    });
  }, (error) => {
    console.warn("Notification listener error (likely missing permissions):", error);
  });
};

export const initFCM = async (empId: string) => {
  const messagingInstance = messaging;
  if (!messagingInstance) return;
  try {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      console.log('Firebase Messaging SW registered:', registration);
      
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        const token = await getToken(messagingInstance, { 
          serviceWorkerRegistration: registration,
        });
        
        if (token) {
          console.log('FCM Token:', token);
          await saveDeviceToken(empId, token);
        }
      }
    }
  } catch (error) {
    console.error('Error initializing notifications:', error);
  }
};

export const subscribeToFCM = (onMessageReceived: (payload: any) => void) => {
  const messagingInstance = messaging;
  if (!messagingInstance) return () => {};
  
  return onMessage(messagingInstance, onMessageReceived);
};

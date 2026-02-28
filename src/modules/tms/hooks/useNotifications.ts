import { useEffect } from 'react';
import { useToast } from '@/shared/contexts/ToastContext';
import { subscribeToUserNotifications, initFCM, subscribeToFCM } from '@/modules/tms/services/notification';
import { Employee } from '@/shared/types';
import { APP_INFO } from '@/shared/constants';

export const useNotifications = (user: Employee | null) => {
  const { showToast } = useToast();

  useEffect(() => {
    if (!user) return;

    const unsubscribe = subscribeToUserNotifications(user.employee_id, (data) => {
      showToast({
        title: data.title,
        body: data.body,
        type: data.type || 'info'
      });
      
      if (document.hidden && Notification.permission === 'granted' && 'serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then(registration => {
          registration.showNotification(data.title, {
            body: data.body,
            icon: APP_INFO.LOGO_URL,
            badge: APP_INFO.LOGO_URL,
            vibrate: [100, 50, 100],
            data: { url: window.location.origin }
          } as any);
        });
      }
    });

    return () => unsubscribe();
  }, [user, showToast]);

  useEffect(() => {
    if (user && user.role !== 'Kiosk') {
      initFCM(user.employee_id);
      
      const unsubscribe = subscribeToFCM((payload) => {
        if (payload.notification) {
          showToast({
            title: payload.notification.title || 'Thông báo',
            body: payload.notification.body || '',
            type: 'info'
          });
        }
      });
      return () => unsubscribe();
    }
  }, [user, showToast]);
};

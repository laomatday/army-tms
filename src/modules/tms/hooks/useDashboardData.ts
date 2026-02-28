import { useState, useEffect, useRef } from 'react';
import { DashboardData, Employee } from '@/shared/types';
import { getDashboardData } from '@/modules/tms/services';
import { timeToMinutes, getCurrentTimeStr, triggerHaptic } from '@/core/utils/helpers';

export const useDashboardData = (
    user: Employee, 
    onLogout: () => void,
    onNotification?: (title: string, body: string) => void
) => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(user);
  
  const prevDataJson = useRef<string>("");

  const fetchData = async (isInitial = false) => {
    if (isInitial) {
        setLoading(true);
    }
    
    try {
        const res = await getDashboardData(currentUser);
        if (res.success && res.data) {
          if (res.data.userProfile && res.data.userProfile.status !== 'Active') {
              onLogout();
              return;
          }
          
          if (res.data.userProfile) {
              const isProfileChanged = JSON.stringify(res.data.userProfile) !== JSON.stringify(currentUser);
              if (isProfileChanged) {
                  setCurrentUser(res.data.userProfile);
              }
          }

          const newDataJson = JSON.stringify(res.data);
          if (newDataJson !== prevDataJson.current) {
              prevDataJson.current = newDataJson;
              setData(res.data);
              checkShiftEndReminder(res.data);
          }
        }
    } catch (e) {
        console.error("Dashboard data fetch error", e);
    } finally {
        if (isInitial) setLoading(false);
    }
  };

  const checkShiftEndReminder = (d: DashboardData) => {
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      const activeSession = d.history.history.find(h => h.date === todayStr && !h.time_out);

      if (activeSession && activeSession.shift_end) {
          const shiftEndMins = timeToMinutes(activeSession.shift_end);
          const currentMins = timeToMinutes(getCurrentTimeStr());
          const tolerance = 15; 

          if (currentMins > shiftEndMins + tolerance) {
              const lastRemindKey = `remind_checkout_${todayStr}`;
              if (!localStorage.getItem(lastRemindKey)) {
                  const title = "Nhắc nhở Check-out";
                  const body = `Ca làm việc của bạn đã kết thúc lúc ${activeSession.shift_end}. Vui lòng Check-out!`;

                  if (onNotification) {
                      triggerHaptic('warning');
                      onNotification(title, body);
                  }

                  localStorage.setItem(lastRemindKey, 'true');
              }
          }
      }
  };

  useEffect(() => {
    fetchData(true);
    const interval = setInterval(fetchData, 120000);
    return () => clearInterval(interval);
  }, [currentUser.employee_id]);

  return { data, loading, currentUser, refresh: fetchData };
};

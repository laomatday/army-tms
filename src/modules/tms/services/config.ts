import { db } from "@/core/firebase";
import { 
  collection, 
  getDocs, 
  query 
} from 'firebase/firestore';
import { ShiftConfig, SystemConfig } from "@/shared/types";
import { timeToMinutes } from "@/core/utils/helpers";
import { COLLECTIONS } from "./constants";

export async function getShifts(): Promise<ShiftConfig[]> {
  const defaultShifts: ShiftConfig[] = [
      { name: "Ca Sáng", start: "08:30", end: "12:00", break_point: "13:00" },
      { name: "Ca Chiều", start: "14:00", end: "17:30", break_point: "17:30" },
      { name: "Ca Tối", start: "17:30", end: "21:00", break_point: "23:59" }
  ];

  try {
      const snap = await getDocs(collection(db, COLLECTIONS.SHIFTS));
      
      let shifts: ShiftConfig[] = [];
      
      if (!snap.empty) {
          shifts = snap.docs.map(d => {
              const data = d.data() as any;
              return {
                  name: data.name || data.shift_name || "Unnamed Shift",
                  start: data.start || data.start_time || "00:00",
                  end: data.end || data.end_time || "00:00",
                  break_point: data.break_point || "23:59"
              } as ShiftConfig;
          });
      } else {
          shifts = defaultShifts;
      }

      // Sắp xếp ca làm việc theo giờ bắt đầu tăng dần để đảm bảo logic determineShift hoạt động đúng
      return shifts.sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));
  } catch(e) { 
      return defaultShifts; 
  }
}

export async function getSystemConfig(): Promise<SystemConfig> {
    const defaults: SystemConfig = {
        LATE_TOLERANCE: 15,
        MIN_HOURS_FULL: 7.0,
        MIN_HOURS_HALF: 3.5,
        LUNCH_START: "12:00", 
        LUNCH_END: "13:30",   
        OFF_DAYS: [0], 
        MAX_DISTANCE_METERS: 200,
        LOCK_DATE: 5
    };
    
    try {
        const snap = await getDocs(collection(db, COLLECTIONS.SYSTEM));
        if (snap.empty) return defaults;

        const config: any = { ...defaults };
        snap.forEach(doc => {
            const data = doc.data() as any;
            const key = data.key;
            let value = data.value;

            if (key) {
                if (key === 'OFF_DAYS') {
                     if (typeof value === 'string') {
                         config.OFF_DAYS = value.split(',').map((s: string) => Number(s.trim()));
                     } else if (typeof value === 'number') {
                         config.OFF_DAYS = [value];
                     } else if (Array.isArray(value)) {
                         config.OFF_DAYS = value;
                     }
                } else if (!isNaN(Number(value)) && key !== 'LUNCH_START' && key !== 'LUNCH_END') {
                     config[key] = Number(value);
                } else {
                     config[key] = value;
                }
            }
        });
        return config as SystemConfig;
    } catch(e) {
        return defaults;
    }
}

export function determineShift(timeStr: string, shifts: ShiftConfig[]) {
  if (!shifts || shifts.length === 0) return { name: "Ca Mặc định", start: "08:00", end: "17:30", break_point: "23:59" };

  // Đảm bảo danh sách ca luôn được sort theo giờ bắt đầu
  const sortedShifts = [...shifts].sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));
  const currentMins = timeToMinutes(timeStr);
  
  // 1. Nếu thời gian hiện tại nhỏ hơn giờ bắt đầu của ca đầu tiên
  // (Ví dụ: 7:21 sáng, Ca Sáng bắt đầu 8:30) -> Return Ca đầu tiên
  const firstShiftStart = timeToMinutes(sortedShifts[0].start);
  if (currentMins < firstShiftStart) {
      return sortedShifts[0];
  }

  // 2. Duyệt qua các ca, sử dụng break_point để xác định ranh giới kết thúc logic của ca đó
  for (const shift of sortedShifts) {
      let breakMins = timeToMinutes(shift.break_point);
      
      // Xử lý trường hợp break_point qua ngày hôm sau (ví dụ 00:30)
      // Nếu break_point nhỏ hơn start_time nhiều, có thể nó thuộc ngày hôm sau
      const startMins = timeToMinutes(shift.start);
      if (breakMins < startMins) {
          breakMins += 24 * 60; 
      }

      // So sánh (xử lý currentMins nếu nó thuộc ngày hôm sau so với mốc 0h)
      // Tuy nhiên logic đơn giản nhất cho app chấm công trong ngày là so sánh trực tiếp
      if (currentMins <= breakMins) {
          return shift;
      }
  }
  
  // 3. Fallback: Nếu vượt qua tất cả break_point (ví dụ đêm khuya), trả về ca cuối cùng hoặc ca đầu tiên
  // Thường là ca tối
  return sortedShifts[sortedShifts.length - 1];
}

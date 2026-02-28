import { Employee } from "@/shared/types";
import { COLLECTIONS } from "@/modules/tms/services/constants";


// --- SECURITY UTILS ---
export async function hashPassword(str: string) {
  if (!str) return "";
  const msgBuffer = new TextEncoder().encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
// ----------------------

export function getShortName(fullName: string) {
  if (!fullName) return "";
  const parts = String(fullName).trim().split(" ");
  return parts.length > 0 ? parts[parts.length - 1] : "";
}

export function formatDateString(dateStr: string) {
  if (!dateStr) return "";
  const datePart = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
  const parts = datePart.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

export function formatTimeString(timeStr: string) {
  if (!timeStr) return "";
  const s = String(timeStr);
  // If it's an ISO string like 2023-10-27T08:30:00.000Z
  if (s.includes('T')) {
    const timePart = s.split('T')[1];
    if (timePart) {
      const parts = timePart.split(':');
      if (parts.length >= 2) {
        return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
      }
    }
  }
  // If it's already HH:mm:ss or HH:mm
  const parts = s.split(':');
  if (parts.length >= 2) {
    return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
  }
  return s;
}

export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3; // metres
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function timeToMinutes(timeStr: string) {
  if (!timeStr) return 0;
  const p = String(timeStr).split(":").map(Number);
  if (p.length < 2) return 0;
  return p[0] * 60 + p[1];
}

/**
 * Calculates net work hours excluding lunch break.
 * Handles overnight shifts by adding 24h to outTime if it's smaller than inTime.
 */
export function calculateNetWorkHours(inTime: string, outTime: string, lunchStart: string = "12:00", lunchEnd: string = "13:30") {
  if (!inTime || !outTime) return "0";

  const inMins = timeToMinutes(inTime);
  let outMins = timeToMinutes(outTime);

  // Handle overnight shift
  if (outMins < inMins) {
    outMins += 24 * 60;
  }

  if (outMins <= inMins) return "0";

  const breakStart = timeToMinutes(lunchStart);
  const breakEnd = timeToMinutes(lunchEnd);

  let grossMins = outMins - inMins;

  // Calculate Intersection with Break
  // Interval A (Work): [inMins, outMins]
  // Interval B (Break): [breakStart, breakEnd]
  // Overlap = Max(0, Min(EndA, EndB) - Max(StartA, StartB))

  let overlap = 0;
  if (breakEnd > breakStart) {
    const startMax = Math.max(inMins, breakStart);
    const endMin = Math.min(outMins, breakEnd);
    if (endMin > startMax) {
      overlap = endMin - startMax;
    }
  }

  let netMins = grossMins - overlap;
  if (netMins < 0) netMins = 0;

  return (netMins / 60).toFixed(2);
}

export function getCurrentTimeStr() {
  const now = new Date();
  const h = now.getHours().toString().padStart(2, '0');
  const m = now.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
}

export const getAvatarHtml = (name: string, url: string) => {
  if (url && url.length > 5 && !url.includes("ui-avatars.com")) {
    return { type: 'img', src: url, alt: name };
  }
  let initials = "--";
  if (name) {
    const parts = name.trim().split(" ");
    initials = parts.length === 1 ? parts[0].substring(0, 2) : parts[0].charAt(0) + parts[parts.length - 1].charAt(0);
    initials = initials.toUpperCase();
  }
  return { type: 'initials', text: initials };
};

export function getDeviceId() {
  let devId = localStorage.getItem("army_device_id");
  if (!devId) {
    devId = "DEV_" + Date.now().toString(36) + Math.random().toString(36).substr(2, 5).toUpperCase();
    localStorage.setItem("army_device_id", devId);
  }
  return devId;
}

export function toISODateString(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export const triggerHaptic = (pattern: 'light' | 'medium' | 'heavy' | 'success' | 'error' | 'warning' = 'light') => {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    switch (pattern) {
      case 'light': navigator.vibrate(10); break;
      case 'medium': navigator.vibrate(20); break;
      case 'heavy': navigator.vibrate(40); break;
      case 'success': navigator.vibrate([10, 30, 10]); break;
      case 'warning': navigator.vibrate([30, 50, 30]); break;
      case 'error': navigator.vibrate([50, 30, 50, 30, 50]); break;
    }
  } // Fix: closed the if statement
};

export function removeVietnameseTones(str: string) {
  str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a");
  str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e");
  str = str.replace(/ì|í|ị|ỉ|ĩ/g, "i");
  str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o");
  str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u");
  str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y");
  str = str.replace(/đ/g, "d");
  str = str.replace(/À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ/g, "A");
  str = str.replace(/È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ/g, "E");
  str = str.replace(/Ì|Í|Ị|Ỉ|Ĩ/g, "I");
  str = str.replace(/Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ/g, "O");
  str = str.replace(/Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ/g, "U");
  str = str.replace(/Ỳ|Ý|Ỵ|Ỷ|Ỹ/g, "Y");
  str = str.replace(/Đ/g, "D");
  // Some system encode vietnamese combining accent as individual utf-8 characters
  // Một vài bộ encode coi các dấu mũ, dấu chữ như một kí tự riêng biệt nên thêm hai dòng này
  str = str.replace(/\u0300|\u0301|\u0303|\u0309|\u0323/g, ""); // ̀ ́ ̃ ̉ ̣  huyền, sắc, ngã, hỏi, nặng
  str = str.replace(/\u02C6|\u0306|\u031B/g, ""); // ˆ ̆ ̛  Â, Ê, Ă, Ơ, Ư
  // Remove extra spaces
  str = str.replace(/ + /g, " ");
  str = str.trim();
  return str;
}

export function generateEmailFromName(fullName: string) {
  if (!fullName) return "";
  const cleanName = removeVietnameseTones(fullName).toLowerCase();
  const parts = cleanName.split(' ');
  if (parts.length === 0) return "";

  // Last word is actually the first name in Vietnamese (e.g. Nhiên)
  const firstName = parts[parts.length - 1];

  // Initials of the middle and last name (Hồ An -> ha)
  let initials = "";
  for (let i = 0; i < parts.length - 1; i++) {
    initials += parts[i].charAt(0);
  }

  return `${firstName}${initials}@army.vn`;
}

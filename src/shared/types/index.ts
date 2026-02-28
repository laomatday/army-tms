export interface Employee {
  id?: string;
  employee_id: string; // Khóa chính
  name: string;
  email: string;
  password?: string | number;
  role: 'Staff' | 'Leader' | 'Manager' | 'Director' | 'Admin' | 'HR' | 'Kiosk'; // Updated roles
  center_id: string; // Nơi làm việc chính (Workplace)
  allowed_locations?: string[]; // Danh sách chi nhánh được phép chấm công (Check-in locations)
  managed_locations?: string[]; // Danh sách chi nhánh phụ trách (Managed branches for Manager/Leader)
  position: string;
  department: string;
  phone: string | number;
  annual_leave_balance: number;
  face_ref_url: string; // Avatar
  trusted_device_id: string;
  status: 'Active' | 'Inactive';
  direct_manager_id?: string;
  join_date?: string;
  fcm_tokens?: string[];
}

export interface Attendance {
  id?: string; // document id: employee_id_YYYY-MM-DD
  date: string; // YYYY-MM-DD
  employee_id: string;
  name: string;
  center_id: string; // Mã chi nhánh thực tế tại thời điểm chấm công
  shift_name?: string;
  shift_start?: string;
  shift_end?: string;
  time_in: string; // HH:mm
  time_out: string; // HH:mm
  checkin_type: 'GPS' | 'Manual' | 'Mobile' | 'Kiosk';
  checkin_lat: number;
  checkin_lng: number;
  distance_meters: number;
  device_id: string;
  selfie_url: string;
  late_minutes: number;
  early_minutes: number;
  work_hours: number;
  status: 'Valid' | 'Late' | 'Invalid';
  is_valid: 'Yes' | 'No';
  note: string;
  timestamp: number; 
  last_updated?: string;
  checkout_lat?: number;
  checkout_lng?: number;
  checkout_distance?: number;
  
  break_start?: string | null; 
  total_break_mins?: number; 
}

export interface LeaveRequest {
  id?: string; 
  request_id: string;
  employee_id: string;
  name: string;
  created_at: string; 
  type: string;
  from_date: string; // YYYY-MM-DD
  to_date: string; // YYYY-MM-DD
  expiration_date?: string; // YYYY-MM-DD
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  note?: string; 
  manager_note?: string;
}

export interface Explanation {
  id?: string;
  employee_id: string;
  name: string;
  date: string; // YYYY-MM-DD
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  created_at: string;
  manager_note?: string;
}

export interface UserNotification {
  id?: string;
  employee_id: string;
  title: string;
  body: string;
  type: 'info' | 'success' | 'warning' | 'error';
  is_read: boolean;
  created_at: string;
  link?: string;
}

export interface LocationConfig {
  id?: string;
  center_id: string; 
  location_name: string; 
  name?: string; 
  address?: string; // Địa chỉ làm việc
  city?: string; // Tỉnh thành
  type?: 'Center' | 'HO' | 'Other'; // Phân loại chi nhánh
  latitude: number;
  longitude: number;
  radius_meters: number;
}

export interface ShiftConfig {
    name: string;
    start: string; 
    end: string;   
    break_point: string; 
}

export interface HolidayConfig {
    name: string;
    from_date: string;
    to_date: string;
}

export interface SystemConfig {
    LATE_TOLERANCE: number;
    MIN_HOURS_FULL: number;
    MIN_HOURS_HALF: number;
    LUNCH_START: string;
    LUNCH_END: string;
    OFF_DAYS: number[]; 
    MAX_DISTANCE_METERS: number;
    LOCK_DATE?: number;
}

export interface MonthlyStats {
  key_id: string;        
  employee_id: string;   
  month: number;         
  year: number;          
  standard_days: number;   
  work_days: number;  
  late_mins: number;   
  late_count: number;           
  early_mins: number;  
  early_count: number;
  error_count: number;          
  leave_days: number;      
  remaining_leave: number;
  last_updated: string; 
}

export interface Kiosk {
  id?: string;
  name: string;
  kiosk_id: string; 
  center_id: string; 
  status: 'Active' | 'Inactive';
  created_at: string;
  description?: string;
}

export interface DashboardData {
  userProfile: Employee;
  history: {
    history: Attendance[]; 
    summary: {
        workDays: number;     
        lateMins: number;     
        leaveDays: number;    
        remainingLeave: number;
        standardDays: number; 
        errorCount: number;   
    };
  };
  notifications: {
    approvals: LeaveRequest[];
    explanationApprovals: Explanation[];
    myRequests: LeaveRequest[];
    myExplanations: Explanation[];
  };
  myRequests: LeaveRequest[];
  myExplanations: Explanation[];
  teamLeaves: LeaveRequest[];
  locations: LocationConfig[];
  contacts: Employee[];
  holidays: HolidayConfig[];
  shifts: ShiftConfig[];
  systemConfig: SystemConfig;
}

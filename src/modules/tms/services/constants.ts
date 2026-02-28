export const COLLECTIONS = {
  EMPLOYEES: "employees",
  ATTENDANCE: "attendance",
  LOCATIONS: "config_locations",
  LEAVE: "leave_requests",
  EXPLANATIONS: "explanations",
  SHIFTS: "config_shifts",
  HOLIDAYS: "config_holidays",
  SYSTEM: "config_system",
  MONTHLY_STATS: "monthly_stats",
  NOTIFICATIONS: "user_notifications"
};

export const GLOBAL_ADMINS = ["Admin", "HR", "Director"];
export const MANAGERS = ["Manager", "Leader"];
export const PRIVILEGED_ROLES = [...GLOBAL_ADMINS, ...MANAGERS];

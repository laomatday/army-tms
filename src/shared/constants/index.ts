export const APP_INFO = {
  NAME: "Army TMS",
  VERSION: "2026.2.0",
  DEVELOPER: "Mr. Tester",
  BUILD_DATE: "26/02/2026",
  CONTACT_EMAIL: "support@armytms.com",
  WEBSITE: "https://armytms.com",
  LOGO_URL: "https://lh3.googleusercontent.com/d/1r_FuqN4QJbch0FYXAwX8efW9s0ucreiO"
};

export const MANAGEMENT_ROLES = ['Director', 'Manager', 'Leader', 'Admin', 'HR'];

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

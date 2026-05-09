// Canonical permission keys — each key maps to one page/feature section.
// Custom-role users are granted access only to the pages listed in their permissions array.
// Base-role users (admin, teacher, parent, etc.) bypass this system and use allowedRoles checks.

export const ALL_PERMISSIONS = [
  "dashboard",
  "students",
  "groups",
  "evaluations",
  "levels",
  "behavioral",
  "payments",
  "revenue",
  "performance",
  "financial_requests",
  "consultations",
  "psychologist_feed",
  "psychologist_sessions",
  "psychologist_earnings",
  "news",
  "inbox",
  "requests",
  "gallery",
  "studio",
  "idea_box",
  "users",
  "settings",
  "branches",
  "registration_requests",
  "web_content",
  "my_profile",
  "programs",
] as const;

export type PermissionKey = typeof ALL_PERMISSIONS[number];

export const PERMISSION_LABELS: Record<PermissionKey, { en: string; ar: string; group: string }> = {
  dashboard:             { en: "Dashboard",             ar: "لوحة التحكم",        group: "General" },
  my_profile:            { en: "My Profile",            ar: "ملفي الشخصي",        group: "General" },
  idea_box:              { en: "Idea Box",              ar: "صندوق الأفكار",      group: "General" },
  students:              { en: "Students",              ar: "الطلاب",             group: "Academic" },
  groups:                { en: "Groups & Earnings",     ar: "الأفواج والمداخيل",  group: "Academic" },
  evaluations:           { en: "Evaluations",           ar: "التقييمات",          group: "Academic" },
  levels:                { en: "Levels",                ar: "المستويات",          group: "Academic" },
  programs:              { en: "Programs",              ar: "البرامج",            group: "Academic" },
  behavioral:            { en: "Behavioral Lab",        ar: "مختبر السلوك",       group: "Academic" },
  psychologist_feed:     { en: "Priority Queue",        ar: "قائمة الأولويات",    group: "Psychologist" },
  psychologist_sessions: { en: "Psychologist Sessions", ar: "جلسات الأخصائي",     group: "Psychologist" },
  psychologist_earnings: { en: "Psychologist Earnings", ar: "مداخيل الأخصائي",    group: "Psychologist" },
  payments:              { en: "Payments",              ar: "المدفوعات",          group: "Finance" },
  revenue:               { en: "Revenue",               ar: "الإيرادات",          group: "Finance" },
  performance:           { en: "Financial Performance", ar: "الأداء المالي",      group: "Finance" },
  financial_requests:    { en: "Financial Requests",    ar: "طلبات الدفع",        group: "Finance" },
  consultations:         { en: "Consultations",         ar: "الاستشارات",         group: "Communication" },
  news:                  { en: "News",                  ar: "الأخبار",            group: "Communication" },
  inbox:                 { en: "Inbox",                 ar: "صندوق البريد",       group: "Communication" },
  requests:              { en: "Activity Requests",     ar: "طلبات الأنشطة",      group: "Communication" },
  gallery:               { en: "Gallery",               ar: "المعرض",             group: "Media" },
  studio:                { en: "Creative Studio",       ar: "الاستوديو الإبداعي", group: "Media" },
  users:                 { en: "User Management",       ar: "إدارة المستخدمين",   group: "Admin" },
  settings:              { en: "Settings",              ar: "الإعدادات",          group: "Admin" },
  branches:              { en: "Branches",              ar: "الفروع",             group: "Admin" },
  registration_requests: { en: "Registration Requests", ar: "طلبات الانضمام",     group: "Admin" },
  web_content:           { en: "Web Content",           ar: "محتوى الموقع",       group: "Admin" },
};

export const PERMISSION_GROUPS = [
  "General",
  "Academic",
  "Psychologist",
  "Finance",
  "Communication",
  "Media",
  "Admin",
] as const;

export type PermissionGroup = typeof PERMISSION_GROUPS[number];

/** Returns true if this user (custom-role user) has a given permission */
export function hasPermission(userPermissions: string[] | undefined, key: PermissionKey): boolean {
  if (!userPermissions) return false;
  return userPermissions.includes(key);
}

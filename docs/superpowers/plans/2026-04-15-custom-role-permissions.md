# Custom Role Permissions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the label-only custom roles system with a real page-access permission system where each custom role has a configurable list of allowed pages/features.

**Architecture:** Add a `permissions` JSON column to `custom_roles` table storing an array of permission keys. The backend loads these permissions during auth and exposes them via `/auth/me`. The frontend `ProtectedRoute` component and sidebar both check permissions for users who have a `customRoleId` set.

**Tech Stack:** Drizzle ORM (jsonText helper), Express 5, React + Wouter, TanStack Query (`useGetMe`)

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `lib/db/src/schema/customRoles.ts` | Modify | Add `permissions` JSON column |
| `artifacts/api-server/src/middlewares/auth.ts` | Modify | Load custom role permissions in `requireAuth`; add `requirePermission()` |
| `artifacts/api-server/src/routes/auth.ts` | Modify | Include permissions in `/auth/login` + `/auth/me` responses |
| `artifacts/api-server/src/routes/customRoles.ts` | Modify | Accept + save `permissions` array in POST/PUT |
| `artifacts/kidspeak/src/lib/permissions.ts` | Create | Canonical permission keys + display labels (EN/AR) |
| `artifacts/kidspeak/src/App.tsx` | Modify | `ProtectedRoute` checks `user.permissions` when `user.customRoleId` is set |
| `artifacts/kidspeak/src/components/layout.tsx` | Modify | Filter sidebar nav items by `user.permissions` for custom-role users |
| `artifacts/kidspeak/src/pages/users/index.tsx` | Modify | Permissions checkbox grid in custom role create/edit dialog |

---

## Task 1: Add `permissions` column to `custom_roles` schema

**Files:**
- Modify: `lib/db/src/schema/customRoles.ts`

- [ ] **Step 1: Update the schema file**

Replace the entire file content with:

```typescript
import { table, text, integer, id, timestamp, jsonText } from "./helpers";

export const baseTemplates = ["teacher", "psychologist", "accountant", "photographer", "designer"] as const;
export type BaseTemplate = typeof baseTemplates[number];

export const customRolesTable = table("custom_roles", {
  id: id(),
  name: text("name").notNull(),
  nameAr: text("name_ar"),
  baseTemplate: text("base_template", { enum: baseTemplates }).notNull(),
  description: text("description"),
  permissions: jsonText("permissions").$type<string[]>().notNull().default([]),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
```

- [ ] **Step 2: Push schema change to database**

Run from `lib/db/` directory:
```bash
cd "lib/db" && pnpm drizzle-kit push
```

Expected: "Changes applied" or similar. If it asks to confirm adding a nullable column, confirm yes.

- [ ] **Step 3: Verify column was added**

For SQLite:
```bash
cd "artifacts/api-server" && node -e "
const Database = require('better-sqlite3');
const db = new Database('./dev.db');
const info = db.pragma('table_info(custom_roles)');
console.log(info);
"
```

Expected: Output includes a row with `name: 'permissions'`.

- [ ] **Step 4: Commit**

```bash
git add lib/db/src/schema/customRoles.ts
git commit -m "feat: add permissions JSON column to custom_roles table"
```

---

## Task 2: Create permission keys definition file (frontend)

**Files:**
- Create: `artifacts/kidspeak/src/lib/permissions.ts`

- [ ] **Step 1: Create the file**

```typescript
// artifacts/kidspeak/src/lib/permissions.ts

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
  dashboard:               { en: "Dashboard",               ar: "لوحة التحكم",        group: "General" },
  students:                { en: "Students",                ar: "الطلاب",             group: "Academic" },
  groups:                  { en: "Groups & Earnings",       ar: "الأفواج والمداخيل",  group: "Academic" },
  evaluations:             { en: "Evaluations",             ar: "التقييمات",          group: "Academic" },
  levels:                  { en: "Levels",                  ar: "المستويات",          group: "Academic" },
  behavioral:              { en: "Behavioral Lab",          ar: "مختبر السلوك",       group: "Academic" },
  psychologist_feed:       { en: "Priority Queue",          ar: "قائمة الأولويات",    group: "Psychologist" },
  psychologist_sessions:   { en: "Psychologist Sessions",   ar: "جلسات الأخصائي",     group: "Psychologist" },
  psychologist_earnings:   { en: "Psychologist Earnings",   ar: "مداخيل الأخصائي",    group: "Psychologist" },
  payments:                { en: "Payments",                ar: "المدفوعات",          group: "Finance" },
  revenue:                 { en: "Revenue",                 ar: "الإيرادات",          group: "Finance" },
  performance:             { en: "Financial Performance",   ar: "الأداء المالي",      group: "Finance" },
  financial_requests:      { en: "Financial Requests",      ar: "طلبات الدفع",        group: "Finance" },
  consultations:           { en: "Consultations",           ar: "الاستشارات",         group: "Communication" },
  news:                    { en: "News",                    ar: "الأخبار",            group: "Communication" },
  inbox:                   { en: "Inbox",                   ar: "صندوق البريد",       group: "Communication" },
  requests:                { en: "Activity Requests",       ar: "طلبات الأنشطة",      group: "Communication" },
  gallery:                 { en: "Gallery",                 ar: "المعرض",             group: "Media" },
  studio:                  { en: "Creative Studio",         ar: "الاستوديو الإبداعي", group: "Media" },
  idea_box:                { en: "Idea Box",                ar: "صندوق الأفكار",      group: "General" },
  users:                   { en: "User Management",         ar: "إدارة المستخدمين",   group: "Admin" },
  settings:                { en: "Settings",                ar: "الإعدادات",          group: "Admin" },
  branches:                { en: "Branches",                ar: "الفروع",             group: "Admin" },
  registration_requests:   { en: "Registration Requests",   ar: "طلبات الانضمام",     group: "Admin" },
  web_content:             { en: "Web Content",             ar: "محتوى الموقع",       group: "Admin" },
  my_profile:              { en: "My Profile",              ar: "ملفي الشخصي",        group: "General" },
  programs:                { en: "Programs",                ar: "البرامج",            group: "Academic" },
};

export const PERMISSION_GROUPS = ["General", "Academic", "Psychologist", "Finance", "Communication", "Media", "Admin"] as const;

/** Returns true if this user (custom-role user) has a given permission */
export function hasPermission(userPermissions: string[] | undefined, key: PermissionKey): boolean {
  if (!userPermissions) return false;
  return userPermissions.includes(key);
}
```

- [ ] **Step 2: Commit**

```bash
git add artifacts/kidspeak/src/lib/permissions.ts
git commit -m "feat: define canonical permission keys for custom roles"
```

---

## Task 3: Update backend auth middleware to load permissions

**Files:**
- Modify: `artifacts/api-server/src/middlewares/auth.ts`

- [ ] **Step 1: Replace auth middleware file**

```typescript
import { type Request, type Response, type NextFunction } from "express";
import { eq, and, gt } from "drizzle-orm";
import { db, sessionsTable, usersTable, customRolesTable } from "@workspace/db";

// Extend req.user to include resolved permissions
export type AuthUser = typeof usersTable.$inferSelect & {
  permissions: string[];  // empty for base roles; populated for custom-role users
};

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token = req.cookies?.["session_token"];
  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const now = new Date();
  const [session] = await db
    .select({ user: usersTable })
    .from(sessionsTable)
    .innerJoin(usersTable, eq(sessionsTable.userId, usersTable.id))
    .where(and(eq(sessionsTable.token, token), gt(sessionsTable.expiresAt, now)));

  if (!session) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  let permissions: string[] = [];
  if (session.user.customRoleId) {
    const [cr] = await db
      .select({ permissions: customRolesTable.permissions })
      .from(customRolesTable)
      .where(eq(customRolesTable.id, session.user.customRoleId));
    permissions = cr?.permissions ?? [];
  }

  (req as Request & { user?: AuthUser }).user = { ...session.user, permissions };
  next();
}

export async function requireRole(roles: string[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const user = (req as Request & { user?: AuthUser }).user;
    if (!user || !roles.includes(user.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    next();
  };
}

/**
 * Middleware for custom-role users: checks that the user's custom role includes
 * a specific permission key. Falls through for base-role users (they use requireRole).
 */
export async function requirePermission(key: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const user = (req as Request & { user?: AuthUser }).user;
    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    // Base-role users (no customRoleId) bypass permission check — use requireRole for them
    if (!user.customRoleId) {
      next();
      return;
    }
    if (!user.permissions.includes(key)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    next();
  };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd "e:/Kidspeak Hub/Kidspeak-Edu-Finance" && pnpm typecheck:libs
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add artifacts/api-server/src/middlewares/auth.ts
git commit -m "feat: load custom role permissions in requireAuth middleware"
```

---

## Task 4: Expose permissions in `/auth/login` and `/auth/me`

**Files:**
- Modify: `artifacts/api-server/src/routes/auth.ts`

- [ ] **Step 1: Update the login endpoint to include permissions**

Find the login handler (`router.post("/auth/login", ...)`). Replace the final response block (lines 43-44) with:

```typescript
  // Resolve permissions for custom-role users
  let permissions: string[] = [];
  if (user.customRoleId) {
    const [cr] = await db
      .select({ permissions: customRolesTable.permissions })
      .from(customRolesTable)
      .where(eq(customRolesTable.id, user.customRoleId));
    permissions = cr?.permissions ?? [];
  }

  const { passwordHash: _, ...safeUser } = user;
  res.json({
    user: { ...safeUser, createdAt: safeUser.createdAt.toISOString(), permissions },
    message: "Login successful",
  });
```

Add `customRolesTable` to the import at the top of the file:
```typescript
import { db, usersTable, sessionsTable, customRolesTable } from "@workspace/db";
```

- [ ] **Step 2: Update the `/auth/me` endpoint to include permissions**

Find the `router.get("/auth/me", ...)` handler. Replace the final response block (lines 75-76) with:

```typescript
  let permissions: string[] = [];
  if (session.user.customRoleId) {
    const [cr] = await db
      .select({ permissions: customRolesTable.permissions })
      .from(customRolesTable)
      .where(eq(customRolesTable.id, session.user.customRoleId));
    permissions = cr?.permissions ?? [];
  }

  const { passwordHash: _, ...safeUser } = session.user;
  res.json({ ...safeUser, createdAt: safeUser.createdAt.toISOString(), permissions });
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd "e:/Kidspeak Hub/Kidspeak-Edu-Finance" && pnpm typecheck:libs
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add artifacts/api-server/src/routes/auth.ts
git commit -m "feat: include custom role permissions in auth/login and auth/me responses"
```

---

## Task 5: Update custom roles CRUD to handle permissions

**Files:**
- Modify: `artifacts/api-server/src/routes/customRoles.ts`

- [ ] **Step 1: Update POST `/custom-roles` to accept permissions**

In the POST handler, after the `baseTemplate` validation, add permissions parsing:

```typescript
  const { name, nameAr, baseTemplate, description, permissions } = req.body as any;

  // Validate permissions is an array of strings if provided
  const parsedPermissions: string[] = Array.isArray(permissions)
    ? permissions.filter((p: any) => typeof p === "string")
    : [];
```

Update the `db.insert` call to include permissions:
```typescript
  const [role] = await db.insert(customRolesTable).values({
    name: name.trim(),
    nameAr: nameAr?.trim() || null,
    baseTemplate,
    description: description?.trim() || null,
    permissions: parsedPermissions,
  }).returning();

  res.status(201).json({ ...role, createdAt: role.createdAt.toISOString(), userCount: 0 });
```

- [ ] **Step 2: Update PUT `/custom-roles/:id` to accept permissions**

In the PUT handler, after existing `updateData` assignments, add:

```typescript
  if (req.body.permissions !== undefined) {
    updateData.permissions = Array.isArray(req.body.permissions)
      ? (req.body.permissions as any[]).filter((p: any) => typeof p === "string")
      : [];
  }
```

- [ ] **Step 3: Update the GET response to include permissions**

In the GET `/custom-roles` handler, update the `.select()` object to include permissions:

```typescript
  const rows = await db
    .select({
      id: customRolesTable.id,
      name: customRolesTable.name,
      nameAr: customRolesTable.nameAr,
      baseTemplate: customRolesTable.baseTemplate,
      description: customRolesTable.description,
      permissions: customRolesTable.permissions,
      createdAt: customRolesTable.createdAt,
      userCount: sql<number>`(select count(*) from ${usersTable} where ${usersTable.customRoleId} = ${customRolesTable.id})::int`,
    })
    .from(customRolesTable)
    .orderBy(customRolesTable.createdAt);
```

- [ ] **Step 4: Commit**

```bash
git add artifacts/api-server/src/routes/customRoles.ts
git commit -m "feat: accept and persist permissions array in custom roles CRUD"
```

---

## Task 6: Update `ProtectedRoute` in frontend to check permissions

**Files:**
- Modify: `artifacts/kidspeak/src/App.tsx`

- [ ] **Step 1: Update ProtectedRoute component**

Find the `ProtectedRoute` component (lines 90-98). Replace it entirely:

```typescript
function ProtectedRoute({
  component: Component,
  allowedRoles,
  requiredPermission,
  redirectTo = "/login",
}: {
  component: any;
  allowedRoles?: string[];
  requiredPermission?: string;
  redirectTo?: string;
}) {
  const { data: user, isLoading } = useGetMe();

  if (isLoading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (!user) return <Redirect to="/login" />;

  // Custom-role user: check permission key instead of role
  if (user.customRoleId && requiredPermission) {
    const userPerms: string[] = (user as any).permissions ?? [];
    if (!userPerms.includes(requiredPermission)) return <Redirect to={redirectTo} />;
    return <Component />;
  }

  // Base-role user: check allowedRoles as before
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Redirect to={redirectTo} />;

  return <Component />;
}
```

- [ ] **Step 2: Add `requiredPermission` prop to each route**

Update routes in the `Router` function. Each route gets a `requiredPermission` matching the key defined in `permissions.ts`. Example — update all routes:

```typescript
      <Route path="/dashboard">
        <Layout><ProtectedRoute component={Dashboard} allowedRoles={["admin", "accountant"]} requiredPermission="dashboard" /></Layout>
      </Route>
      <Route path="/students">
        <Layout><ProtectedRoute component={Students} requiredPermission="students" /></Layout>
      </Route>
      <Route path="/students/:id">
        <Layout><ProtectedRoute component={StudentProfile} requiredPermission="students" /></Layout>
      </Route>
      <Route path="/evaluations">
        <Layout><ProtectedRoute component={Evaluations} allowedRoles={["admin", "teacher"]} requiredPermission="evaluations" /></Layout>
      </Route>
      <Route path="/levels">
        <Layout><ProtectedRoute component={Levels} allowedRoles={["admin"]} requiredPermission="levels" /></Layout>
      </Route>
      <Route path="/payments">
        <Layout><ProtectedRoute component={Payments} allowedRoles={["admin", "parent", "accountant"]} requiredPermission="payments" /></Layout>
      </Route>
      <Route path="/revenue">
        <Layout><ProtectedRoute component={Revenue} allowedRoles={["admin", "accountant"]} requiredPermission="revenue" /></Layout>
      </Route>
      <Route path="/behavioral">
        <Layout><ProtectedRoute component={Behavioral} allowedRoles={["admin", "psychologist"]} requiredPermission="behavioral" /></Layout>
      </Route>
      <Route path="/performance">
        <Layout><ProtectedRoute component={Performance} allowedRoles={["admin"]} requiredPermission="performance" /></Layout>
      </Route>
      <Route path="/users">
        <Layout><ProtectedRoute component={Users} allowedRoles={["admin"]} requiredPermission="users" /></Layout>
      </Route>
      <Route path="/groups">
        <Layout><ProtectedRoute component={Groups} allowedRoles={["admin", "teacher"]} requiredPermission="groups" /></Layout>
      </Route>
      <Route path="/groups/earnings">
        <Layout><ProtectedRoute component={TeacherEarnings} allowedRoles={["admin", "teacher"]} requiredPermission="groups" /></Layout>
      </Route>
      <Route path="/groups/:id">
        <Layout><ProtectedRoute component={GroupDetail} allowedRoles={["admin", "teacher", "psychologist"]} requiredPermission="groups" /></Layout>
      </Route>
      <Route path="/admin/consultations">
        <Layout><ProtectedRoute component={AdminConsultations} allowedRoles={["admin"]} requiredPermission="consultations" /></Layout>
      </Route>
      <Route path="/psychologist/consultations">
        <Layout><ProtectedRoute component={PsychologistConsultations} allowedRoles={["psychologist", "admin"]} requiredPermission="consultations" /></Layout>
      </Route>
      <Route path="/news">
        <Layout><ProtectedRoute component={NewsPage} requiredPermission="news" /></Layout>
      </Route>
      <Route path="/requests">
        <Layout><ProtectedRoute component={RequestsPage} allowedRoles={["admin", "parent"]} requiredPermission="requests" /></Layout>
      </Route>
      <Route path="/inbox">
        <Layout><ProtectedRoute component={InboxPage} requiredPermission="inbox" /></Layout>
      </Route>
      <Route path="/gallery">
        <Layout><ProtectedRoute component={GalleryPage} requiredPermission="gallery" /></Layout>
      </Route>
      <Route path="/psychologist/feed">
        <Layout><ProtectedRoute component={PsychologistFeed} allowedRoles={["admin", "psychologist"]} requiredPermission="psychologist_feed" /></Layout>
      </Route>
      <Route path="/psychologist/sessions">
        <Layout><ProtectedRoute component={Groups} allowedRoles={["psychologist", "admin"]} requiredPermission="psychologist_sessions" /></Layout>
      </Route>
      <Route path="/psychologist/earnings">
        <Layout><ProtectedRoute component={PsychologistEarnings} allowedRoles={["psychologist", "admin"]} requiredPermission="psychologist_earnings" /></Layout>
      </Route>
      <Route path="/programs">
        <Layout><ProtectedRoute component={ProgramsPage} allowedRoles={["admin"]} requiredPermission="programs" /></Layout>
      </Route>
      <Route path="/admin/financial-requests">
        <Layout><ProtectedRoute component={AdminFinancialRequests} allowedRoles={["admin"]} requiredPermission="financial_requests" /></Layout>
      </Route>
      <Route path="/studio/:id">
        <Layout><ProtectedRoute component={StudioProjectPage} allowedRoles={["admin", "designer", "marketer", "photographer"]} requiredPermission="studio" /></Layout>
      </Route>
      <Route path="/studio">
        <Layout><ProtectedRoute component={StudioPage} allowedRoles={["admin", "designer", "marketer", "photographer"]} requiredPermission="studio" /></Layout>
      </Route>
      <Route path="/settings">
        <Layout><ProtectedRoute component={Settings} allowedRoles={["admin"]} requiredPermission="settings" redirectTo="/my-profile" /></Layout>
      </Route>
      <Route path="/my-profile">
        <Layout><ProtectedRoute component={MyProfile} allowedRoles={["teacher", "psychologist", "accountant", "photographer", "designer", "admin"]} requiredPermission="my_profile" /></Layout>
      </Route>
      <Route path="/idea-box">
        <Layout><ProtectedRoute component={IdeaBoxPage} requiredPermission="idea_box" /></Layout>
      </Route>
      <Route path="/admin/registration-requests">
        <Layout><ProtectedRoute component={RegistrationRequestsPage} allowedRoles={["admin"]} requiredPermission="registration_requests" /></Layout>
      </Route>
      <Route path="/branches">
        <Layout><ProtectedRoute component={BranchesPage} allowedRoles={["admin"]} requiredPermission="branches" /></Layout>
      </Route>
      <Route path="/admin/web-content">
        <Layout><ProtectedRoute component={WebContentPage} allowedRoles={["admin"]} requiredPermission="web_content" /></Layout>
      </Route>
```

- [ ] **Step 3: Commit**

```bash
git add artifacts/kidspeak/src/App.tsx
git commit -m "feat: update ProtectedRoute to check permissions for custom-role users"
```

---

## Task 7: Filter sidebar navigation items by permissions

**Files:**
- Modify: `artifacts/kidspeak/src/components/layout.tsx`

- [ ] **Step 1: Add permission-aware nav item filter**

At the top of the `Layout` function body (after the existing hooks), add:

```typescript
  const userPermissions: string[] = (user as any)?.permissions ?? [];
  const isCustomRoleUser = !!(user as any)?.customRoleId;

  function canSee(permissionKey: string): boolean {
    if (!isCustomRoleUser) return true; // base-role users: sidebar items are role-filtered already
    return userPermissions.includes(permissionKey);
  }
```

- [ ] **Step 2: Wrap each sidebar nav item with `canSee()`**

For every nav item in the sidebar that maps to a permission key, wrap its rendering in a `canSee()` check. Example pattern for items in the sidebar:

```typescript
// Before:
{ href: "/dashboard", label: t("nav.dashboard"), icon: LayoutDashboard }

// After — each item gets a `permission` field:
{ href: "/dashboard", label: t("nav.dashboard"), icon: LayoutDashboard, permission: "dashboard" }
```

Then in the render, filter the items array before mapping:
```typescript
navItems
  .filter(item => canSee(item.permission ?? ""))
  .map(item => <NavLink key={item.href} ... />)
```

Apply this pattern to all nav item arrays in the sidebar (admin items, teacher items, etc.).

- [ ] **Step 3: Commit**

```bash
git add artifacts/kidspeak/src/components/layout.tsx
git commit -m "feat: filter sidebar nav items by custom role permissions"
```

---

## Task 8: Add permission configurator UI to custom roles dialog

**Files:**
- Modify: `artifacts/kidspeak/src/pages/users/index.tsx`

- [ ] **Step 1: Update `CustomRole` interface to include permissions**

Find the `CustomRole` interface (around line 89). Add `permissions`:

```typescript
interface CustomRole {
  id: number;
  name: string;
  nameAr: string | null;
  baseTemplate: string;
  description?: string | null;
  permissions: string[];
  userCount: number;
}
```

- [ ] **Step 2: Add permission state to custom role dialog**

Find the custom role dialog state. Add:
```typescript
const [editingRolePermissions, setEditingRolePermissions] = useState<string[]>([]);
```

When the custom role edit dialog opens, initialize:
```typescript
setEditingRolePermissions(role.permissions ?? []);
```

When creating a new custom role, initialize as empty:
```typescript
setEditingRolePermissions([]);
```

- [ ] **Step 3: Import permission definitions**

At the top of the file, add:
```typescript
import { ALL_PERMISSIONS, PERMISSION_LABELS, PERMISSION_GROUPS, type PermissionKey } from "@/lib/permissions";
```

- [ ] **Step 4: Add permission checkboxes UI inside the dialog**

Add this section inside the custom role create/edit dialog, after the description field:

```tsx
{/* Permissions */}
<div className="space-y-3">
  <label className="text-sm font-medium text-gray-700">
    {language === "ar" ? "الصلاحيات" : "Permissions"}
  </label>
  <p className="text-xs text-gray-500">
    {language === "ar"
      ? "اختر الصفحات التي يمكن لهذا الدور الوصول إليها"
      : "Select which pages this role can access"}
  </p>
  {PERMISSION_GROUPS.map((group) => {
    const groupPerms = ALL_PERMISSIONS.filter(
      (p) => PERMISSION_LABELS[p].group === group
    );
    return (
      <div key={group} className="space-y-1">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{group}</p>
        <div className="grid grid-cols-2 gap-1">
          {groupPerms.map((perm) => {
            const label = PERMISSION_LABELS[perm as PermissionKey];
            const checked = editingRolePermissions.includes(perm);
            return (
              <label
                key={perm}
                className="flex items-center gap-2 cursor-pointer text-sm p-1.5 rounded hover:bg-gray-50"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => {
                    setEditingRolePermissions((prev) =>
                      e.target.checked
                        ? [...prev, perm]
                        : prev.filter((p) => p !== perm)
                    );
                  }}
                  className="rounded border-gray-300 text-[#1B2E8F]"
                />
                <span>{language === "ar" ? label.ar : label.en}</span>
              </label>
            );
          })}
        </div>
      </div>
    );
  })}
</div>
```

- [ ] **Step 5: Pass permissions when saving custom role**

When calling the create/update API for custom roles, include permissions:

```typescript
const payload = {
  name: roleFormData.name,
  nameAr: roleFormData.nameAr,
  baseTemplate: roleFormData.baseTemplate,
  description: roleFormData.description,
  permissions: editingRolePermissions,
};
// Then fetch("/api/custom-roles", { method: "POST", body: JSON.stringify(payload), ... })
// or fetch(`/api/custom-roles/${id}`, { method: "PUT", ... })
```

- [ ] **Step 6: Commit**

```bash
git add artifacts/kidspeak/src/pages/users/index.tsx
git commit -m "feat: add permission checkboxes to custom role create/edit dialog"
```

---

## Task 9: Manual verification

- [ ] **Step 1: Start dev servers**

```bash
# Terminal 1 — backend
cd "artifacts/api-server" && pnpm dev

# Terminal 2 — frontend
cd "artifacts/kidspeak" && pnpm dev
```

- [ ] **Step 2: Create a custom role with limited permissions**

1. Log in as admin
2. Go to `/users` → Custom Roles tab
3. Create a new role: name="Financial Observer", baseTemplate="accountant"
4. Check only: `dashboard`, `revenue`, `payments`
5. Save

- [ ] **Step 3: Create a user with that custom role**

1. In `/users`, create user: name="Test Observer", email="obs@test.com", password="test1234"
2. Assign the "Financial Observer" custom role

- [ ] **Step 4: Log in as the new user and verify**

1. Log in as obs@test.com
2. Verify sidebar shows ONLY: Dashboard, Revenue, Payments
3. Try navigating to `/students` manually — should redirect
4. Try navigating to `/revenue` — should load correctly

- [ ] **Step 5: Verify admin's sidebar is unaffected**

Log back in as admin. Confirm all items still appear normally.


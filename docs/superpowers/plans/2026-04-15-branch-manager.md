# Branch Manager Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a `branch_manager` role that can log in and see only their branch's data (students, groups, staff, payments), with a FK link between branches and their assigned manager user.

**Architecture:** Add `branch_manager` to the `userRoles` enum and `managerId` FK to the `branches` table. Each API route that returns scoped data checks `user.role === "branch_manager"` and automatically filters by `user.branchId`. The frontend shows a user-picker when assigning a branch manager, and renders a branch_manager-specific sidebar.

**Tech Stack:** Drizzle ORM, Express 5, React + Wouter, SQLite (dev) / PostgreSQL (prod)

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `lib/db/src/schema/users.ts` | Modify | Add "branch_manager" to userRoles enum |
| `lib/db/src/schema/branches.ts` | Modify | Add `managerId` integer FK → users |
| `artifacts/api-server/src/routes/branches.ts` | Modify | Accept/store managerId; return manager name in responses |
| `artifacts/api-server/src/routes/students.ts` | Modify | Auto-filter by branchId when role=branch_manager |
| `artifacts/api-server/src/routes/groups.ts` | Modify | Auto-filter by branchId when role=branch_manager |
| `artifacts/api-server/src/routes/users.ts` | Modify | Auto-filter by branchId when role=branch_manager |
| `artifacts/api-server/src/routes/payments.ts` | Modify | Allow branch_manager + auto-filter by branchId |
| `artifacts/kidspeak/src/contexts/branch-context.tsx` | Modify | Add managerId to Branch type |
| `artifacts/kidspeak/src/pages/branches/index.tsx` | Modify | Replace managerName text input with user-picker dropdown |
| `artifacts/kidspeak/src/App.tsx` | Modify | Add branch_manager to ProtectedRoute allowedRoles |
| `artifacts/kidspeak/src/components/layout.tsx` | Modify | branch_manager sidebar items |

---

## Task 1: Add `branch_manager` to userRoles + `managerId` FK to branches

**Files:**
- Modify: `lib/db/src/schema/users.ts`
- Modify: `lib/db/src/schema/branches.ts`

- [ ] **Step 1: Update users.ts — add branch_manager to enum**

In `lib/db/src/schema/users.ts`, replace line 6:
```typescript
export const userRoles = ["admin", "teacher", "parent", "psychologist", "accountant", "photographer", "designer", "marketer", "branch_manager"] as const;
```

- [ ] **Step 2: Update branches.ts — add managerId FK**

Replace entire `lib/db/src/schema/branches.ts`:
```typescript
import { table, text, integer, id, timestamp, boolean } from "./helpers";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const branchesTable = table("branches", {
  id: id(),
  name: text("name").notNull(),
  nameAr: text("name_ar"),
  address: text("address"),
  addressAr: text("address_ar"),
  managerName: text("manager_name"),
  managerId: integer("manager_id"),   // FK to users — set separately to avoid circular dep
  phone: text("phone"),
  invoicePrefix: text("invoice_prefix").notNull().default("INV"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertBranchSchema = createInsertSchema(branchesTable).omit({ id: true, createdAt: true });
export type InsertBranch = z.infer<typeof insertBranchSchema>;
export type Branch = typeof branchesTable.$inferSelect;
```

Note: We don't use `.references()` here to avoid the circular dependency between branches and users (users.branchId → branches, branches.managerId → users). The FK integrity is handled at application level.

- [ ] **Step 3: Push schema to database**

```bash
cd "e:/Kidspeak Hub/Kidspeak-Edu-Finance/lib/db"
DATABASE_URL="file:E:/Kidspeak Hub/Kidspeak-Edu-Finance/artifacts/api-server/dev.db" DATABASE_PROVIDER=sqlite pnpm drizzle-kit push
```

Expected: "Changes applied"

---

## Task 2: Update branches API — accept managerId, return manager info

**Files:**
- Modify: `artifacts/api-server/src/routes/branches.ts`

- [ ] **Step 1: Replace entire branches.ts**

```typescript
import { Router, Request, Response } from "express";
import { db, branchesTable, studentsTable, usersTable, groupsTable } from "@workspace/db";
import { eq, count } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();

// GET /branches — list all branches with pupil counts + manager info
router.get("/branches", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const branches = await db.select().from(branchesTable).orderBy(branchesTable.name);

  const pupilCounts = await db
    .select({ branchId: studentsTable.branchId, count: count() })
    .from(studentsTable)
    .groupBy(studentsTable.branchId);

  const countMap: Record<number, number> = {};
  for (const row of pupilCounts) {
    if (row.branchId !== null) countMap[row.branchId] = Number(row.count);
  }

  // Resolve manager names for branches that have managerId set
  const managerIds = branches.map(b => (b as any).managerId).filter(Boolean) as number[];
  const managers: Record<number, { name: string; email: string; role: string }> = {};
  if (managerIds.length > 0) {
    const mgrs = await db
      .select({ id: usersTable.id, name: usersTable.name, email: usersTable.email, role: usersTable.role })
      .from(usersTable)
      .where(
        managerIds.length === 1
          ? eq(usersTable.id, managerIds[0])
          : eq(usersTable.id, managerIds[0]) // fallback for single; multi handled below
      );
    // Fetch all managers in one query using JS filter (avoids inArray import complexity)
    const allMgrs = await db
      .select({ id: usersTable.id, name: usersTable.name, email: usersTable.email, role: usersTable.role })
      .from(usersTable);
    for (const m of allMgrs) {
      if (managerIds.includes(m.id)) managers[m.id] = m;
    }
  }

  const result = branches.map(b => {
    const mid = (b as any).managerId as number | null;
    const mgr = mid ? managers[mid] : null;
    return {
      ...b,
      managerId: mid,
      managerName: mgr ? mgr.name : b.managerName,
      managerEmail: mgr?.email ?? null,
      managerRole: mgr?.role ?? null,
      pupilCount: countMap[b.id] ?? 0,
    };
  });

  res.json(result);
});

// GET /branches/:id — single branch
router.get("/branches/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  const [branch] = await db.select().from(branchesTable).where(eq(branchesTable.id, id));
  if (!branch) { res.status(404).json({ error: "Branch not found" }); return; }
  res.json(branch);
});

// POST /branches — create branch (admin only)
router.post("/branches", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  if (user.role !== "admin") { res.status(403).json({ error: "Admin only" }); return; }

  const { name, nameAr, address, addressAr, managerName, managerId, phone, invoicePrefix, isActive } = req.body as Record<string, unknown>;
  if (!name || typeof name !== "string" || !name.trim()) {
    res.status(400).json({ error: "Branch name is required" }); return;
  }

  // If managerId provided, verify user exists and is branch_manager or eligible
  let resolvedManagerName = (managerName as string | null) ?? null;
  const resolvedManagerId = managerId ? parseInt(managerId as string) : null;
  if (resolvedManagerId) {
    const [mgr] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, resolvedManagerId));
    if (!mgr) { res.status(400).json({ error: "Manager user not found" }); return; }
    resolvedManagerName = mgr.name;
  }

  const [branch] = await db.insert(branchesTable).values({
    name: (name as string).trim(),
    nameAr: (nameAr as string | null) ?? null,
    address: (address as string | null) ?? null,
    addressAr: (addressAr as string | null) ?? null,
    managerName: resolvedManagerName,
    managerId: resolvedManagerId,
    phone: (phone as string | null) ?? null,
    invoicePrefix: (invoicePrefix as string) || "INV",
    isActive: isActive !== false,
  }).returning();

  // If manager assigned, set their branchId
  if (resolvedManagerId && branch) {
    await db.update(usersTable).set({ branchId: branch.id }).where(eq(usersTable.id, resolvedManagerId));
  }

  res.status(201).json(branch);
});

// PUT /branches/:id — update branch (admin only)
router.put("/branches/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  if (user.role !== "admin") { res.status(403).json({ error: "Admin only" }); return; }

  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const body = req.body as Record<string, unknown>;
  const updateData: Partial<typeof branchesTable.$inferInsert> = {};
  if (body.name !== undefined) updateData.name = body.name as string;
  if (body.nameAr !== undefined) updateData.nameAr = body.nameAr as string;
  if (body.address !== undefined) updateData.address = body.address as string;
  if (body.addressAr !== undefined) updateData.addressAr = body.addressAr as string;
  if (body.phone !== undefined) updateData.phone = body.phone as string;
  if (body.invoicePrefix !== undefined) updateData.invoicePrefix = body.invoicePrefix as string;
  if (body.isActive !== undefined) updateData.isActive = body.isActive as boolean;

  // Handle manager assignment/change
  if (body.managerId !== undefined) {
    const newManagerId = body.managerId ? parseInt(body.managerId as string) : null;
    (updateData as any).managerId = newManagerId;

    if (newManagerId) {
      const [mgr] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, newManagerId));
      if (!mgr) { res.status(400).json({ error: "Manager user not found" }); return; }
      updateData.managerName = mgr.name;
      // Assign branchId to new manager
      await db.update(usersTable).set({ branchId: id }).where(eq(usersTable.id, newManagerId));
    } else {
      updateData.managerName = (body.managerName as string | null) ?? null;
    }
  } else if (body.managerName !== undefined) {
    updateData.managerName = body.managerName as string;
  }

  const [updated] = await db.update(branchesTable).set(updateData).where(eq(branchesTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Branch not found" }); return; }
  res.json(updated);
});

// DELETE /branches/:id (admin only)
router.delete("/branches/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  if (user.role !== "admin") { res.status(403).json({ error: "Admin only" }); return; }

  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const [{ count: pupilCount }] = await db.select({ count: count() }).from(studentsTable).where(eq(studentsTable.branchId, id));
  if (Number(pupilCount) > 0) {
    res.status(400).json({ error: `Cannot delete branch with ${pupilCount} enrolled pupil(s). Reassign them first.` }); return;
  }

  await db.delete(branchesTable).where(eq(branchesTable.id, id));
  res.status(204).send();
});

// GET /branches/:id/stats — detailed stats for one branch
router.get("/branches/:id/stats", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const [{ pupilCount }] = await db.select({ pupilCount: count() }).from(studentsTable).where(eq(studentsTable.branchId, id));
  const [{ staffCount }] = await db.select({ staffCount: count() }).from(usersTable).where(eq(usersTable.branchId, id));
  const [{ groupCount }] = await db.select({ groupCount: count() }).from(groupsTable).where(eq(groupsTable.branchId, id));

  res.json({
    branchId: id,
    pupilCount: Number(pupilCount),
    staffCount: Number(staffCount),
    groupCount: Number(groupCount),
  });
});

export default router;
```

---

## Task 3: Branch-scope the students, groups, users APIs

**Files:**
- Modify: `artifacts/api-server/src/routes/students.ts` (line ~29)
- Modify: `artifacts/api-server/src/routes/groups.ts` (line ~92)
- Modify: `artifacts/api-server/src/routes/users.ts` (line ~49)

### students.ts

- [ ] **Step 1: Add branch_manager filter after the parent filter (around line 29)**

Find this block:
```typescript
  // Parents can only see their own children
  const forceParentId = user.role === "parent" ? user.id : null;
```

Replace with:
```typescript
  // Parents see only their children; branch_manager sees only their branch
  const forceParentId = user.role === "parent" ? user.id : null;
  const forceBranchId = user.role === "branch_manager" ? (user.branchId ?? -1) : null;
```

Find this block:
```typescript
    .where(forceParentId ? eq(studentsTable.parentId, forceParentId) : undefined)
```

Replace with:
```typescript
    .where(
      forceParentId
        ? eq(studentsTable.parentId, forceParentId)
        : forceBranchId !== null
          ? eq(studentsTable.branchId, forceBranchId)
          : undefined
    )
```

Also find the existing branchId query param filter block (around line 85):
```typescript
  const branchIdParam = req.query.branchId;
  if (branchIdParam && !forceParentId) {
    const bid = parseInt(branchIdParam as string);
```

Update condition to also skip JS filter for branch_manager (they already filtered at DB level):
```typescript
  const branchIdParam = req.query.branchId;
  if (branchIdParam && !forceParentId && !forceBranchId) {
    const bid = parseInt(branchIdParam as string);
```

### groups.ts

- [ ] **Step 2: Add branch_manager filter in GET /groups (around line 92)**

Find:
```typescript
  const branchIdParam = (req.query as any).branchId;
  if (branchIdParam && user.role === "admin") {
    const bid = parseInt(branchIdParam);
    if (!isNaN(bid)) rows = rows.filter(g => (g as any).branchId === bid);
  }
```

Replace with:
```typescript
  const branchIdParam = (req.query as any).branchId;
  if (user.role === "branch_manager" && user.branchId) {
    rows = rows.filter(g => (g as any).branchId === user.branchId);
  } else if (branchIdParam && user.role === "admin") {
    const bid = parseInt(branchIdParam);
    if (!isNaN(bid)) rows = rows.filter(g => (g as any).branchId === bid);
  }
```

### users.ts

- [ ] **Step 3: Add branch_manager filter in GET /users (after the existing branchId filter)**

Find (around line 65):
```typescript
  // Branch filter
  const branchIdParam = (req.query as any).branchId;
  if (branchIdParam) {
    const bid = parseInt(branchIdParam);
    if (!isNaN(bid)) serialized = serialized.filter(u => (u as any).branchId === bid);
  }
```

Replace with:
```typescript
  // Branch filter — branch_manager always scoped to their branch
  if (user.role === "branch_manager" && user.branchId) {
    serialized = serialized.filter(u => (u as any).branchId === user.branchId);
  } else {
    const branchIdParam = (req.query as any).branchId;
    if (branchIdParam) {
      const bid = parseInt(branchIdParam);
      if (!isNaN(bid)) serialized = serialized.filter(u => (u as any).branchId === bid);
    }
  }
```

---

## Task 4: Allow branch_manager access in payments API

**Files:**
- Modify: `artifacts/api-server/src/routes/payments.ts`

- [ ] **Step 1: Add branch_manager to all role checks and add scoping**

In `payments.ts`, find every role check that includes `"admin"` and add `"branch_manager"`. There are ~8 such checks. Pattern:

```typescript
// Before:
if (!["admin", "accountant"].includes(user.role)) {

// After:
if (!["admin", "accountant", "branch_manager"].includes(user.role)) {
```

```typescript
// Before:
if (!["admin", "accountant", "parent"].includes(user.role)) {

// After:
if (!["admin", "accountant", "parent", "branch_manager"].includes(user.role)) {
```

- [ ] **Step 2: Add branch scoping helper at the top of the GET /payments handler**

After fetching payments and enriching them with student data, add a filter for branch_manager:

```typescript
  // branch_manager sees only their branch's payments
  if (user.role === "branch_manager" && user.branchId) {
    result = result.filter((p: any) => p.student?.branchId === user.branchId);
  }
```

---

## Task 5: Update branch-context.tsx type

**Files:**
- Modify: `artifacts/kidspeak/src/contexts/branch-context.tsx`

- [ ] **Step 1: Add managerId and manager info to Branch interface**

Find:
```typescript
export interface Branch {
  id: number;
  name: string;
  nameAr?: string | null;
  address?: string | null;
  addressAr?: string | null;
  managerName?: string | null;
  phone?: string | null;
  invoicePrefix: string;
  isActive: boolean;
  createdAt: string;
}
```

Replace with:
```typescript
export interface Branch {
  id: number;
  name: string;
  nameAr?: string | null;
  address?: string | null;
  addressAr?: string | null;
  managerName?: string | null;
  managerId?: number | null;
  managerEmail?: string | null;
  phone?: string | null;
  invoicePrefix: string;
  isActive: boolean;
  createdAt: string;
  pupilCount?: number;
}
```

---

## Task 6: Update branches page — user picker for manager

**Files:**
- Modify: `artifacts/kidspeak/src/pages/branches/index.tsx`

- [ ] **Step 1: Add managerId to form state**

Find `EMPTY_FORM`:
```typescript
const EMPTY_FORM = {
  name: "",
  nameAr: "",
  address: "",
  addressAr: "",
  managerName: "",
  phone: "",
  invoicePrefix: "",
};
```

Replace with:
```typescript
const EMPTY_FORM = {
  name: "",
  nameAr: "",
  address: "",
  addressAr: "",
  managerId: "" as string,   // user id as string for select value
  phone: "",
  invoicePrefix: "",
};
```

- [ ] **Step 2: Add staff list state to the component**

After `const { toast } = useToast();`, add:
```typescript
  const [staffList, setStaffList] = useState<{ id: number; name: string; role: string }[]>([]);
  useEffect(() => {
    fetch("/api/users?role=branch_manager", { credentials: "include" })
      .then(r => r.ok ? r.json() : [])
      .then((data: any[]) => setStaffList(data))
      .catch(() => {});
  }, []);
```

- [ ] **Step 3: Initialize managerId in openEdit**

Find in `openEdit`:
```typescript
      managerName: branch.managerName ?? "",
```

Replace with:
```typescript
      managerId: branch.managerId ? String(branch.managerId) : "",
```

- [ ] **Step 4: Update handleSave to send managerId**

Find:
```typescript
          managerName: form.managerName.trim() || null,
```

Replace with:
```typescript
          managerId: form.managerId ? parseInt(form.managerId) : null,
```

- [ ] **Step 5: Replace managerName text input with user-picker in the dialog**

Find the manager name input field in the dialog (search for `managerName`). Replace it with:

```tsx
{/* Manager — user picker */}
<div className={fieldCls}>
  <label className={labelCls}>{lbl("Branch Manager", "مسؤول الفرع")}</label>
  <select
    value={form.managerId}
    onChange={e => setForm(f => ({ ...f, managerId: e.target.value }))}
    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
  >
    <option value="">{lbl("— No manager assigned —", "— بدون مسؤول —")}</option>
    {staffList.map(s => (
      <option key={s.id} value={String(s.id)}>
        {s.name}
      </option>
    ))}
  </select>
  <p className="text-xs text-muted-foreground">
    {lbl("Only users with 'Branch Manager' role appear here.", "يظهر هنا المستخدمون الذين لديهم دور مسؤول الفرع فقط.")}
  </p>
</div>
```

---

## Task 7: Update App.tsx — add branch_manager to routes

**Files:**
- Modify: `artifacts/kidspeak/src/App.tsx`

- [ ] **Step 1: Add branch_manager to relevant ProtectedRoute allowedRoles**

Update these routes to include "branch_manager":

```typescript
// Dashboard
<ProtectedRoute component={Dashboard} allowedRoles={["admin", "accountant", "branch_manager"]} requiredPermission="dashboard" />

// Students
<ProtectedRoute component={Students} allowedRoles={["admin", "teacher", "psychologist", "branch_manager"]} requiredPermission="students" />
<ProtectedRoute component={StudentProfile} allowedRoles={["admin", "teacher", "psychologist", "branch_manager"]} requiredPermission="students" />

// Groups
<ProtectedRoute component={Groups} allowedRoles={["admin", "teacher", "branch_manager"]} requiredPermission="groups" />
<ProtectedRoute component={TeacherEarnings} allowedRoles={["admin", "teacher", "branch_manager"]} requiredPermission="groups" />
<ProtectedRoute component={GroupDetail} allowedRoles={["admin", "teacher", "psychologist", "branch_manager"]} requiredPermission="groups" />

// Evaluations
<ProtectedRoute component={Evaluations} allowedRoles={["admin", "teacher", "branch_manager"]} requiredPermission="evaluations" />

// Payments
<ProtectedRoute component={Payments} allowedRoles={["admin", "parent", "accountant", "branch_manager"]} requiredPermission="payments" />

// Revenue
<ProtectedRoute component={Revenue} allowedRoles={["admin", "accountant", "branch_manager"]} requiredPermission="revenue" />

// Users
<ProtectedRoute component={Users} allowedRoles={["admin", "branch_manager"]} requiredPermission="users" />

// News, Inbox, Gallery — already open to all authenticated users (no allowedRoles needed)
```

---

## Task 8: Update layout.tsx — branch_manager sidebar

**Files:**
- Modify: `artifacts/kidspeak/src/components/layout.tsx`

- [ ] **Step 1: Add branch_manager sidebar items**

In the `navItems` array, add a section for branch_manager (after or before the psychologist section):

```typescript
    // Branch Manager: local admin for their branch
    ...(role === "branch_manager" ? [
      { href: "/dashboard", label: t.nav.dashboard, icon: LayoutDashboard, permission: "dashboard" },
      { href: "/students", label: pupilLabel, icon: Users, permission: "students" },
      { href: "/groups", label: t.nav.groups, icon: BookOpen, permission: "groups" },
      { href: "/evaluations", label: t.nav.evaluations, icon: LineChart, permission: "evaluations" },
      { href: "/payments", label: t.nav.payments, icon: CreditCard, permission: "payments" },
      { href: "/revenue", label: t.nav.revenue, icon: DollarSign, permission: "revenue" },
      { href: "/users", label: t.nav.users, icon: UserCog, permission: "users" },
      { href: "/news", label: t.nav.news, icon: Megaphone, permission: "news" },
      { href: "/inbox", label: t.nav.inbox, icon: Inbox, badge: unreadMsgCount > 0 ? unreadMsgCount : undefined, permission: "inbox" },
      { href: "/gallery", label: t.nav.gallery, icon: GalleryHorizontalEnd, permission: "gallery" },
    ] : []),
```

- [ ] **Step 2: Add branch_manager to unread message fetch roles**

Find:
```typescript
    if (!["parent", "admin", "teacher"].includes(user.role)) return;
```

Replace with:
```typescript
    if (!["parent", "admin", "teacher", "branch_manager"].includes(user.role)) return;
```

---

## Task 9: Manual Verification

- [ ] **Step 1: Create a branch_manager user**
  1. Log in as admin → `/users`
  2. Create user: name="Hamid", email="hamid@school.com", password="test1234", role="branch_manager"
  3. Assign them to branch "Algiers" via branchId field

- [ ] **Step 2: Assign manager to a branch**
  1. Go to `/branches`
  2. Edit "Algiers" branch → select "Hamid" from manager dropdown
  3. Save → branch card should show "Hamid" as manager

- [ ] **Step 3: Log in as the branch manager and verify scoping**
  1. Log in as hamid@school.com
  2. Verify sidebar shows: Dashboard, Students, Groups, Evaluations, Payments, Revenue, Users, News, Inbox, Gallery
  3. Go to `/students` — should only show students from Algiers branch
  4. Go to `/groups` — should only show groups from Algiers branch
  5. Go to `/payments` — should only show payments for Algiers students

- [ ] **Step 4: Verify admin is unaffected**
  1. Log back in as admin
  2. Confirm all data still visible without branch filter

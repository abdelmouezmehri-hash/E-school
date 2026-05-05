# أمر الإصلاح للإيجنت في Replit — مشروع Kidspeak-Hub

## نتيجة التحقيق (ما وجدناه في الكود)

قارنّا قائمة الإصلاحات مع الكود الفعلي. هذه هي الأخطاء **المؤكدة** الموجودة:

---

## الأمر الكامل للإيجنت

> انسخ هذا الأمر كاملاً وأرسله للإيجنت في Replit

---

```
Fix the following confirmed bugs in the Kidspeak-Hub project. 
Work file by file, test your logic, and do NOT break anything else.

---

### BUG 1 — CRITICAL: CMS landing page changes not reflecting on the published site

**File:** `artifacts/kidspeak/src/pages/admin/web-content/index.tsx`
**Problem:** The admin web-content page reads and writes to CMS key `landing_v2`, 
but the public landing page (`artifacts/kidspeak/src/pages/landing/index.tsx`) 
reads from `landing_v3`. This means every change the admin saves NEVER appears 
on the live landing page — they are writing to the wrong key.

**Fix:** In `web-content/index.tsx`, change every occurrence of `"landing_v2"` 
to `"landing_v3"`. There are two occurrences:
  - The GET fetch on load (around line 590)
  - The PUT/POST fetch on save (around line 610)

After the fix, the admin CMS panel and the public landing page must use the 
same key: `landing_v3`.

---

### BUG 2 — Students page: show only last 3 enrollment requests by default

**File:** `artifacts/kidspeak/src/pages/students/index.tsx`
**Problem:** The enrollment requests section shows ALL requests with no limit.
The requirement is: show only the 3 most recent requests by default, 
with a "show all" toggle to expand.

**Fix:**
1. Add a state: `const [showAllRequests, setShowAllRequests] = useState(false);`
2. In the admin enrollment requests map (the first section, not marketing), 
   instead of:
   ```tsx
   (enrollmentRequests as any[]).map((req: any) => (
   ```
   Use:
   ```tsx
   (showAllRequests ? enrollmentRequests : enrollmentRequests.slice(0, 3)).map((req: any) => (
   ```
3. After the `.map()` block, if `enrollmentRequests.length > 3`, add a toggle button:
   ```tsx
   {enrollmentRequests.length > 3 && (
     <button 
       onClick={() => setShowAllRequests(!showAllRequests)}
       className="w-full py-2 text-xs text-muted-foreground hover:text-foreground text-center border-t"
     >
       {showAllRequests ? "عرض أقل ▲" : `عرض الكل (${enrollmentRequests.length}) ▼`}
     </button>
   )}
   ```

---

### BUG 3 — Enrollment requests (طلبات الانضمام): submitted requests not appearing

**File:** `artifacts/api-server/src/routes/enrollment-requests.ts`
**Problem:** When a parent submits an "add child" enrollment request, 
the admin should see it in the Students page AND it should appear in the admin's 
enrollment requests list. Verify that the GET route returns ALL requests 
(not filtered) when `user.role === "admin"`. The current filter line is:
```ts
.where(user.role === "parent" ? eq(enrollmentRequestsTable.parentId, user.id) : undefined)
```
This is correct, but also verify the following:
- The admin-facing enrollment request list in `artifacts/kidspeak/src/pages/students/index.tsx` 
  calls `useListEnrollmentRequests()` — this hook must NOT pass any branchId or parentId filter 
  when the user is admin.
  
**Also check:** `lib/api-client-react/src/enrollment-requests-api.ts` — make sure 
the query does not silently add a `parentId` param when called by admin.

If `useListEnrollmentRequests` is passing `{ parentId: me?.id }` for all roles, 
fix it to only pass parentId when `me.role === "parent"`.

---

### BUG 4 — Delete custom role shows error without clear message

**File:** `artifacts/kidspeak/src/components/role-management-section.tsx`
**Problem:** When deleting a custom role that has assigned users, the backend 
returns HTTP 409 with `{ error: "Cannot delete: X user(s) assigned to this role. Reassign them first." }`
But the frontend may swallow this error or show a generic toast.

**Fix:** Find the delete mutation/handler for custom roles. After the fetch/mutation call, 
catch the error response and show a proper toast:
```tsx
toast({
  title: "لا يمكن حذف الدور",
  description: error.message, // will contain the 409 message from server
  variant: "destructive",
});
```
Make sure the mutation's `onError` reads `error.message` from the server response, 
not a generic fallback string.

---

### BUG 5 — Session reports not visible as a dedicated section in Group (Admin view)

**File:** `artifacts/kidspeak/src/pages/groups/detail.tsx`
**Problem:** The teacher writes a session report, and it's linked to a session 
(reportStatus: "published"). But in the admin view of a group, there is no 
dedicated "Reports" tab/section. The admin can only see a small "view report" 
button inside the sessions table.

**Fix:** Inside the group detail page, add a **"التقارير"** tab alongside the 
existing sessions tabs (academic/psychological). This tab should:
1. Filter sessions where `session.reportStatus === "published"` 
2. Show each one as a card with: session date, teacher name, lesson title
3. Each card has a button that navigates to `/groups/${groupId}/sessions/${session.id}/report`

The tab should only be visible to admins (`isAdmin` role check).

---

### BUG 6 — Earnings/مستحقاتي: verify total logic and add month filter

**File:** `artifacts/kidspeak/src/pages/revenue/index.tsx` 
(or wherever مستحقاتي page renders for admin)
**Problem:** Admin wants to see:
  - إجمالي المستحقات (total earned by all staff)
  - إجمالي المدفوع (total paid)
  - الرصيد المتبقي (remaining = earned - paid)
  - A month/year filter (فلتر الأشهر)

**Fix:** If the summary cards at the top don't already show these three values 
together, add them. Also add a `<Select>` for month filter that filters the 
displayed data by the selected month. The backend route `GET /earnings/teachers/:id` 
already returns the correct values per teacher — the frontend just needs to 
aggregate them and display the filter.

---

### BUG 7 — Broadcast: group/level dropdowns not loading (send button stays disabled)

**File:** `artifacts/kidspeak/src/pages/inbox/index.tsx`
**Problem:** The broadcast dialog has 6 types: group, level, role, specific_students,
all_parents, global. When admin selects "group" or "level", a dropdown appears 
but it may be empty — causing the Send button to stay permanently disabled because:
```ts
disabled={
  (bType === "group" && !bGroupId) ||   // stays true if no groups loaded
  (bType === "level" && !bLevelId) ||
  ...
}
```

**Root cause to verify:**
1. `useMessageGroups()` calls `GET /api/messages/groups` — check this returns 
   data correctly for admin role
2. The levels list (`levels`) used in broadcast comes from `useListLevels()` — 
   verify it is in scope inside the broadcast dialog section
3. If either list is empty or undefined, the dropdowns show nothing and the 
   user cannot send

**Fix:**
1. Add loading/empty state to group select:
```tsx
{bType === "group" && (
  <Select value={bGroupId} onValueChange={setBGroupId}>
    <SelectTrigger>
      <SelectValue placeholder={groupOptions.length === 0 ? "لا توجد أفواج" : mt.selectGroup} />
    </SelectTrigger>
    <SelectContent>
      {groupOptions.length === 0 
        ? <SelectItem value="_empty" disabled>لا توجد أفواج متاحة</SelectItem>
        : groupOptions.map((g) => (
            <SelectItem key={g.id} value={String(g.id)}>{g.name}</SelectItem>
          ))
      }
    </SelectContent>
  </Select>
)}
```
2. Same pattern for level select — show "لا توجد مستويات" if levels array is empty
3. Verify `GET /api/messages/groups` backend route returns the correct shape 
   `{ id: number, name: string }[]` for admin users

---

### BUG 8 — Broadcast: no saved contact lists (مجموعات البث المحفوظة)

**Problem:** Admin needs to create a named distribution list once, then reuse 
it to send broadcasts repeatedly without re-selecting recipients every time.
Currently every broadcast is one-off with no ability to save a list.

**Implementation:**

**Step 1 — Database** (`lib/db/src/schema/`):
Create two new schema files:

`messageLists.ts`:
```ts
export const messageListsTable = sqliteTable("message_lists", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  createdBy: integer("created_by").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export const messageListMembersTable = sqliteTable("message_list_members", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  listId: integer("list_id").notNull().references(() => messageListsTable.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull(),
});
```
Export both from `lib/db/src/schema/index.ts`.
Run migration: `pnpm db:push` or add a migration file.

**Step 2 — Backend** (`artifacts/api-server/src/routes/messages.ts`):
Add these routes:
```
GET  /messages/lists          → return all lists with member count (admin only)
POST /messages/lists          → create list { name: string, userIds: number[] }
DELETE /messages/lists/:id    → delete list (admin only)
```
In the existing broadcast `POST /messages/send`, add a new case:
```ts
case "list": {
  if (!listId) return res.status(400).json({ error: "listId required" });
  const members = await db.select({ userId: messageListMembersTable.userId })
    .from(messageListMembersTable)
    .where(eq(messageListMembersTable.listId, parseInt(listId)));
  recipientIds = members.map(m => m.userId);
  break;
}
```

**Step 3 — Frontend** (`artifacts/kidspeak/src/pages/inbox/index.tsx`):
1. Add `"list"` to the BroadcastType union
2. Add a `<Select>` for saved lists (fetch from `GET /messages/lists`)
3. Add a **"إدارة القوائم"** button next to the Broadcast button that opens 
   a management dialog:
   - Shows existing lists with name + member count
   - "إنشاء قائمة جديدة" button: input for name + multi-select users (same 
     student picker pattern already used for specific_students)
   - Delete button per list (with confirmation)
4. After creating/deleting a list, invalidate the lists query

---

### BUG 11 — CRASH: Admin profile page shows blank screen (loading forever)

**File:** `artifacts/kidspeak/src/pages/my-profile/index.tsx`

**Root cause confirmed:** The `MySalarySection` component at the bottom of the
profile page renders for ALL non-parent roles including admin. It calls
`GET /api/salaries/my` which returns:
```json
{ "salaries": [], "summary": { "totalEarned": 0, "totalPaid": 0, "balance": 0 } }
```
But the component treats the response as a plain array:
```ts
const { data: salaries = [], isLoading } = useQuery<any[]>({
  queryFn: () => fetch("/api/salaries/my").then(r => r.json()),
});
// Later:
salaries.map(...)  // 💥 CRASH — data is an object, not an array
```
`salaries.map is not a function` — this throws an unhandled error that crashes
the entire component, showing a blank blue screen with no error message.

**Fix — Two parts:**

**Part A:** Fix `MySalarySection` to read the correct shape:
```ts
const { data, isLoading } = useQuery<{ salaries: any[]; summary: any }>({
  queryKey: ["salaries/my"],
  queryFn: () => fetch("/api/salaries/my", { credentials: "include" }).then(r => r.json()),
});
const salaries = data?.salaries ?? [];
const summary = data?.summary;
```

**Part B:** The `MySalarySection` is irrelevant for admin (admin has no personal
salary as an employee). Hide it completely for admin role:
```tsx
{/* My Salary Section — only for staff, NOT admin */}
{(me as any)?.role !== "parent" && 
 (me as any)?.role !== "admin" && 
 (me as any)?.role !== undefined && (
  <MySalarySection isRTL={isRTL} />
)}
```

**Part C:** Add an error boundary or try/catch around the salary fetch so a
failed API call never crashes the whole profile page:
```ts
queryFn: async () => {
  try {
    const r = await fetch("/api/salaries/my", { credentials: "include" });
    if (!r.ok) return { salaries: [], summary: null };
    return r.json();
  } catch {
    return { salaries: [], summary: null };
  }
},
```

---



**Files:**
- `artifacts/kidspeak/src/pages/students/index.tsx` (enrollment requests)
- `artifacts/kidspeak/src/pages/admin/registration-requests.tsx` (registration requests)

**Problem:** After the admin approves or rejects a request, the request stays
visible in the list. It should disappear immediately from the active/pending view.

**Fix — Part A: Enrollment requests (students page)**
After calling `approveEnrollmentRequest` or `rejectEnrollmentRequest` mutations,
invalidate the query so the list refreshes:
```ts
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ["enrollment-requests"] });
  toast({ title: "تمت المعالجة بنجاح" });
}
```
Also filter the displayed list to only show `status === "pending"` by default.
Add a toggle to show all (pending + processed) if the admin wants to review history.

**Fix — Part B: Registration requests (admin page)**
The filter already defaults to `"pending"`. After approve/reject mutation:
```ts
onSuccess: () => {
  qc.invalidateQueries({ queryKey: ["registration-requests"] });
}
```
Verify this invalidation is correctly wired to BOTH the approve and reject
mutation `onSuccess` handlers — not just one of them.

**Fix — Part C: Consistent behavior across both sections**
Both sections must follow the same rule:
- Default view: show only `status === "pending"` requests
- After any action (approve/reject): request disappears from default view instantly
- A secondary "السجل" or "عرض الكل" toggle reveals processed requests for history

---

### BUG 10 — Read Receipt: "استلمت الرسالة وقرأتها" feature

**Problem:** When admin sends a broadcast message to parents (via the inbox),
there is no way to know which parents have read the message. The parent has
no "mark as read" button, and the admin sees no read status.

**Implementation:**

**Step 1 — Database** (`lib/db/src/schema/messages.ts` or new file):
Add a `message_reads` table:
```ts
export const messageReadsTable = sqliteTable("message_reads", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  messageId: integer("message_id").notNull()
    .references(() => messagesTable.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull(),
  readAt: integer("read_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});
```
Export from `lib/db/src/schema/index.ts` and run migration.

**Step 2 — Backend** (`artifacts/api-server/src/routes/messages.ts`):
Add two routes:

```
POST /messages/:id/read
```
Called by the parent/recipient when they open or click "قرأت الرسالة":
```ts
router.post("/messages/:id/read", requireAuth, async (req, res) => {
  const user = (req as any).user;
  const messageId = parseInt(req.params.id);
  // Insert only if not already read (upsert pattern)
  const existing = await db.select()
    .from(messageReadsTable)
    .where(and(
      eq(messageReadsTable.messageId, messageId),
      eq(messageReadsTable.userId, user.id)
    ));
  if (existing.length === 0) {
    await db.insert(messageReadsTable)
      .values({ messageId, userId: user.id });
  }
  res.json({ ok: true });
});
```

```
GET /messages/:id/reads
```
Called by admin to see who has read a message:
```ts
router.get("/messages/:id/reads", requireAuth, async (req, res) => {
  const user = (req as any).user;
  if (user.role !== "admin") return res.status(403).json({ error: "Forbidden" });
  const reads = await db
    .select({
      userId: messageReadsTable.userId,
      userName: usersTable.name,
      readAt: messageReadsTable.readAt,
    })
    .from(messageReadsTable)
    .leftJoin(usersTable, eq(messageReadsTable.userId, usersTable.id))
    .where(eq(messageReadsTable.messageId, parseInt(req.params.id)));
  res.json(reads);
});
```

Also update `GET /messages` to include a `readAt` field per message for the
current user (so the parent can see which messages they already marked as read).

**Step 3 — Frontend (Parent side)** (`artifacts/kidspeak/src/pages/inbox/index.tsx`):
For messages received by a parent (role === "parent"):
1. Show a button **"✓ قرأت الرسالة"** on unread broadcast messages
2. When clicked, call `POST /messages/:id/read`
3. After success, update the message UI to show **"✓ تمت القراءة"** (grayed out,
   no longer clickable)
4. On page load, mark messages as read automatically after 3 seconds of viewing
   (optional — or only on explicit button click)

**Step 4 — Frontend (Admin side)** (`artifacts/kidspeak/src/pages/inbox/index.tsx`):
For broadcast messages sent by admin:
1. Show a small read count badge: **"قرأ 5 / 12"** next to the message
2. Clicking the badge opens a small dialog showing:
   - List of who read it (name + time)
   - List of who has NOT read it yet
3. This data comes from `GET /messages/:id/reads`

---



When fixing data issues: always ensure that after any mutation (approve, reject, 
delete, create), the relevant React Query cache is invalidated so UI updates 
automatically without requiring a page refresh. Use:
```ts
queryClient.invalidateQueries({ queryKey: ["enrollment-requests"] });
// or whatever the relevant queryKey is
```

Do NOT just call `refetch()` — use `invalidateQueries` so all components 
that depend on the same data update together.
```

---

## ملخص الأخطاء المؤكدة (للمراجعة)

| # | القسم | الخطأ | الملف الرئيسي |
|---|-------|-------|--------------|
| 1 | CMS/إعدادات | التغييرات لا تظهر في الصفحة المنشورة — خطأ في اسم المفتاح (`landing_v2` مقابل `landing_v3`) | `admin/web-content/index.tsx` + `landing/index.tsx` |
| 2 | التلاميذ | يظهر كل الطلبات بدون حد — يجب إظهار 3 فقط مع زر "عرض الكل" | `students/index.tsx` |
| 3 | طلبات الانضمام | قد لا تظهر للأدمن بسبب فلتر parentId في hook | `enrollment-requests-api.ts` |
| 4 | الإعدادات | حذف الدور يظهر خطأ غير واضح — رسالة الخطأ من السيرفر (409) لا تُعرض بشكل صحيح | `role-management-section.tsx` |
| 5 | الأفواج | لا يوجد قسم مستقل للتقارير في صفحة الفوج عند الأدمن | `groups/detail.tsx` |
| 6 | مستحقاتي | يحتاج ملخص ثلاثي (إجمالي/مدفوع/متبقي) + فلتر الشهر | `revenue/index.tsx` |
| 7 | الرسائل | قوائم الأفواج والمستويات لا تُحمَّل → زر الإرسال معطّل | `inbox/index.tsx` |
| 8 | الرسائل | لا توجد قوائم بث محفوظة قابلة للإعادة | `inbox/index.tsx` + DB |
| 9 | التلاميذ + طلبات التسجيل | الطلب لا يختفي بعد الموافقة/الرفض | `students/index.tsx` + `registration-requests.tsx` |
| 10 | الرسائل | لا توجد خاصية "قرأت الرسالة" للولي ولا إحصاء القراءة للأدمن | `inbox/index.tsx` + `messages.ts` + DB |
| 11 | الملف الشخصي | **الصفحة تنهار عند الأدمن** — `salaries.map is not a function` بسبب shape خاطئ | `my-profile/index.tsx` |

---

## ملاحظة للأدمن

الخطأ رقم 1 (CMS key mismatch) هو **الأكثر أهمية** — يجعل كل التعديلات على الصفحة الرئيسية 
لا تُحفظ بشكل صحيح. يجب إصلاحه أولاً.

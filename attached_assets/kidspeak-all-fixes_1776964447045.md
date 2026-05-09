# Kidspeak-Hub — All Fixes

Apply all fixes in order. Each fix specifies exactly which file, what to find, and what to replace.

---

## FIX 1 — CRITICAL BUG: Parent edit destroys student links

**File:** `artifacts/kidspeak/src/pages/users/index.tsx`

Find the `openEdit` function. Inside it, find this line:
```tsx
      studentIds: [],
```

Replace it with:
```tsx
      studentIds: user.role === "parent"
        ? (students as any[]).filter((s: any) => s.parentId === user.id).map((s: any) => s.id)
        : [],
```

---

## FIX 2 — Link student to existing parent from student profile

### 2A — Backend (no changes needed)
The `PUT /students/:id` endpoint already supports `parentId`. No backend change required.

### 2B — Frontend
**File:** `artifacts/kidspeak/src/pages/students/profile.tsx`

Find the section that shows guardian info. It contains something like:
```tsx
{student.parentName && (
```

Just before that block, add a new "Link to parent account" control. Find this exact block (it will be inside the info section, probably inside a Card):
```tsx
                      <div className="text-xs text-muted-foreground mb-0.5">{isRTL ? "معلومات الولي" : "Guardian Info"}</div>
```

After that label and its surrounding block finishes (look for the closing tags of the guardian info section), add the following new block. Place it right before or after the guardian info card, still inside the admin-visible section:

```tsx
              {/* ── Link to parent account ── */}
              {isAdmin && (
                <LinkParentControl
                  studentId={student.id}
                  currentParentId={(student as any).parentId ?? null}
                  isRTL={isRTL}
                />
              )}
```

Then add this component near the top of the file, before the `export default` function:

```tsx
function LinkParentControl({
  studentId,
  currentParentId,
  isRTL,
}: {
  studentId: number;
  currentParentId: number | null;
  isRTL: boolean;
}) {
  const { data: allUsers = [] } = useGetUsers?.() ?? { data: [] };
  const parentUsers = (allUsers as any[]).filter((u: any) => u.role === "parent");
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<string>(
    currentParentId ? String(currentParentId) : "none"
  );

  const handleLink = async (value: string) => {
    setSelected(value);
    setSaving(true);
    try {
      await fetch(`/api/students/${studentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ parentId: value === "none" ? null : parseInt(value) }),
      });
      queryClient.invalidateQueries({ queryKey: [`/students/${studentId}`] });
      toast({ title: isRTL ? "تم ربط الولي بنجاح" : "Parent linked successfully" });
    } catch {
      toast({ title: isRTL ? "حدث خطأ" : "Error", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (parentUsers.length === 0) return null;

  return (
    <div className="space-y-1.5 mt-3 pt-3 border-t">
      <label className="text-xs font-semibold text-muted-foreground">
        {isRTL ? "ربط بحساب ولي" : "Link to parent account"}
      </label>
      <Select value={selected} onValueChange={handleLink} disabled={saving}>
        <SelectTrigger className="h-8 text-xs">
          <SelectValue placeholder={isRTL ? "اختر ولياً..." : "Select a parent..."} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">{isRTL ? "— بدون ربط" : "— No parent account"}</SelectItem>
          {parentUsers.map((u: any) => (
            <SelectItem key={u.id} value={String(u.id)}>
              {u.name}
              {u.phone ? ` — ${u.phone}` : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
```

> **Note:** If `useGetUsers` is not imported in this file, add it to the existing import from `@workspace/api-client-react`. If it doesn't exist, use `useListUsers` or whatever the correct hook name is in that project — check the other existing imports in the file.

---

## FIX 3 — Add "Add student" button to parent user card

**File:** `artifacts/kidspeak/src/pages/users/index.tsx`

Find the part of the user card that shows linked students (inside the user card display, not the form). It contains something like:
```tsx
<span className="truncate">
  {user.email?.includes("@kidspeak.local")
```

In the same user card, find the footer area with the edit/delete buttons:
```tsx
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-primary hover:bg-primary/10 h-8 w-8"
                        onClick={() => openEdit(user)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
```

Add a new "Add student" button for parent users, right before the Pencil button:
```tsx
                    <div className="flex gap-2">
                      {user.role === "parent" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50 h-8 w-8"
                          title={isRTL ? "إضافة تلميذ لهذا الولي" : "Add student for this parent"}
                          onClick={() => {
                            setPrefilledParentId(user.id);
                            setPrefilledGuardianName(user.name);
                            setPrefilledGuardianPhone(user.phone ?? "");
                            setIsAddStudentOpen(true);
                          }}
                        >
                          <UserPlus className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-primary hover:bg-primary/10 h-8 w-8"
                        onClick={() => openEdit(user)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
```

Then add these state variables near the top of the component (alongside the other useState hooks):
```tsx
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [prefilledParentId, setPrefilledParentId] = useState<number | null>(null);
  const [prefilledGuardianName, setPrefilledGuardianName] = useState("");
  const [prefilledGuardianPhone, setPrefilledGuardianPhone] = useState("");
```

Then add this modal at the very end of the component's JSX, just before the closing `</div>` of the return:
```tsx
      {/* Add student for parent modal */}
      {isAddStudentOpen && (
        <AddStudentForParentModal
          parentId={prefilledParentId!}
          guardianName={prefilledGuardianName}
          guardianPhone={prefilledGuardianPhone}
          isRTL={isRTL}
          onClose={() => {
            setIsAddStudentOpen(false);
            setPrefilledParentId(null);
          }}
        />
      )}
```

Then add this component before the `export default` function:
```tsx
function AddStudentForParentModal({
  parentId,
  guardianName,
  guardianPhone,
  isRTL,
  onClose,
}: {
  parentId: number;
  guardianName: string;
  guardianPhone: string;
  isRTL: boolean;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [enrollmentDate, setEnrollmentDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: name.trim(),
          enrollmentDate,
          guardianName,
          guardianPhone,
          parentId,
        }),
      });
      queryClient.invalidateQueries({ queryKey: ["/students"] });
      toast({ title: isRTL ? "تم إنشاء التلميذ وربطه بالولي" : "Student created and linked to parent" });
      onClose();
    } catch {
      toast({ title: isRTL ? "حدث خطأ" : "Error", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm" dir={isRTL ? "rtl" : "ltr"}>
        <DialogHeader>
          <DialogTitle>{isRTL ? "إضافة تلميذ للولي" : "Add student for parent"}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {isRTL ? `الولي: ${guardianName}` : `Parent: ${guardianName}`}
          </p>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1">
            <label className="text-xs font-semibold">
              {isRTL ? "اسم التلميذ *" : "Student name *"}
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={isRTL ? "مثال: يوسف بن علي" : "e.g. Youcef Benali"}
              autoFocus
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold">
              {isRTL ? "تاريخ التسجيل" : "Enrollment date"}
            </label>
            <Input
              type="date"
              value={enrollmentDate}
              onChange={(e) => setEnrollmentDate(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter className="gap-2 flex-row-reverse">
          <Button
            onClick={handleSubmit}
            disabled={!name.trim() || saving}
            style={{ backgroundColor: "#1B2E8F", color: "white" }}
          >
            {saving ? "..." : isRTL ? "إنشاء وربط" : "Create & link"}
          </Button>
          <DialogClose asChild>
            <Button variant="outline">{isRTL ? "إلغاء" : "Cancel"}</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

Make sure `UserPlus` is imported from `lucide-react`. If it is not already in the import line, add it.

---

## FIX 4 — Open comprehensive registration modal when approving marketing requests

### 4A — Backend
**File:** `artifacts/api-server/src/routes/students.ts`

**Step 1:** Add `marketingEnrollmentRequestsTable, leadsTable` to the existing db import line. Find:
```ts
import { db, studentsTable, usersTable, levelsTable, evaluationsTable, paymentsTable, sessionAttendanceTable, classSessionsTable, observationsTable, messagesTable, groupStudentsTable, groupsTable, programsTable, supportSessionsTable, branchesTable, adhocSessionsTable, confidenceMetricsTable, performanceReportsTable } from "@workspace/db";
```
Replace with:
```ts
import { db, studentsTable, usersTable, levelsTable, evaluationsTable, paymentsTable, sessionAttendanceTable, classSessionsTable, observationsTable, messagesTable, groupStudentsTable, groupsTable, programsTable, supportSessionsTable, branchesTable, adhocSessionsTable, confidenceMetricsTable, performanceReportsTable, marketingEnrollmentRequestsTable, leadsTable } from "@workspace/db";
```

**Step 2:** Find:
```ts
  const fakeEmail = `${guardianPhone.replace(/[^0-9]/g, "")}@parent.kidspeak.local`;
```
Replace with:
```ts
  const fakeEmail = `parent.${guardianPhone.replace(/[^0-9]/g, "")}@kidspeak.local`;
```

**Step 3:** Find:
```ts
  res.status(201).json({ ...student, createdAt: student.createdAt.toISOString() });
```
Insert this block **immediately before** that line:
```ts
  const marketingRequestId = body.marketingRequestId
    ? parseInt(body.marketingRequestId as string)
    : null;
  if (marketingRequestId) {
    try {
      const [reqRow] = await db
        .select()
        .from(marketingEnrollmentRequestsTable)
        .where(eq(marketingEnrollmentRequestsTable.id, marketingRequestId));
      if (reqRow && reqRow.status === "pending") {
        await db
          .update(marketingEnrollmentRequestsTable)
          .set({ status: "approved", updatedAt: new Date() })
          .where(eq(marketingEnrollmentRequestsTable.id, marketingRequestId));
        if (reqRow.leadId) {
          await db
            .update(leadsTable)
            .set({ status: "registered", updatedAt: new Date() })
            .where(eq(leadsTable.id, reqRow.leadId));
        }
      }
    } catch (err) {
      console.error("Failed to mark marketing request as approved:", err);
    }
  }
```

### 4B — Frontend
**File:** `artifacts/kidspeak/src/pages/students/index.tsx`

**Step 4:** Find:
```tsx
  const [approveForm, setApproveForm] = useState({ name: "", gender: "", dateOfBirth: "", levelId: "", branchId: "", enrollmentDate: new Date().toISOString().split("T")[0], price: "", notes: "" });
```
Add a new line immediately after:
```tsx
  const [pendingMarketingApprovalId, setPendingMarketingApprovalId] = useState<number | null>(null);
```

**Step 5:** Find the `onClick` of the "Approve & Register" button (inside the marketing requests list). It currently starts with:
```tsx
                        onClick={() => {
                          setApproveRequest(req);
                          const preLevel = req.levelId ? (levels as any[]).find((l: any) => l.id === req.levelId) : null;
                          setApproveForm({
```
Replace the entire `onClick` handler with:
```tsx
                        onClick={() => {
                          setPendingMarketingApprovalId(req.id);
                          setCreateForm({
                            ...EMPTY_CREATE_FORM,
                            name: req.childName,
                            levelId: req.levelId ? String(req.levelId) : "",
                            branchId: req.branchId ? String(req.branchId) : "",
                            guardianName: req.parentName,
                            guardianPhone: req.parentPhone,
                            referralSource: "marketing",
                          });
                          setCreateTab("basic");
                          setCreateError("");
                          setIsCreateOpen(true);
                        }}
```

**Step 6:** Inside `handleComprehensiveSubmit`, find:
```tsx
      if (createForm.createParentAccount) {
        payload.createParentAccount = true;
        payload.parentPassword = createForm.parentPassword;
      }
```
Add immediately after:
```tsx
      if (pendingMarketingApprovalId) {
        payload.marketingRequestId = pendingMarketingApprovalId;
      }
```

**Step 7:** Inside `handleComprehensiveSubmit`, find:
```tsx
      if (res.ok) {
        toast({ title: lbl("Pupil enrolled successfully!", "تم تسجيل التلميذ بنجاح!") });
        setIsCreateOpen(false);
        setCreateTab("basic");
        setCreateForm({ ...EMPTY_CREATE_FORM });
        queryClientInstance.invalidateQueries({ queryKey: ["/students"] });
```
Replace with:
```tsx
      if (res.ok) {
        toast({ title: lbl("Pupil enrolled successfully!", "تم تسجيل التلميذ بنجاح!") });
        setIsCreateOpen(false);
        setCreateTab("basic");
        setCreateForm({ ...EMPTY_CREATE_FORM });
        if (pendingMarketingApprovalId) {
          queryClientInstance.invalidateQueries({ queryKey: ["/marketing-enrollment-requests"] });
        }
        setPendingMarketingApprovalId(null);
        queryClientInstance.invalidateQueries({ queryKey: ["/students"] });
```

**Step 8:** Delete the entire old "Approve Marketing Enrollment Modal" dialog. Find the comment line:
```tsx
      {/* Approve Marketing Enrollment Modal */}
      {approveRequest && (
```
Delete everything from that comment all the way to the closing `)}` of that specific dialog block (roughly 70 lines). Stop before the next `{/*` comment or other component.

---

## FIX 5 — Fix parent username display

**File:** `artifacts/kidspeak/src/pages/users/index.tsx`

Find:
```tsx
                      <span className="truncate">{user.email}</span>
```
Replace with:
```tsx
                      <span className="truncate">
                        {user.email?.includes("@kidspeak.local")
                          ? ((user as any).phone
                              ? (isRTL ? `تسجيل الدخول: ${(user as any).phone}` : `Login: ${(user as any).phone}`)
                              : user.email)
                          : user.email}
                      </span>
```

---

## FIX 6 — Hide Expenses and Debt tabs from parent role

**File:** `artifacts/kidspeak/src/pages/payments/index.tsx`

**Step 1:** Find:
```tsx
  const canManage = ["admin", "accountant"].includes(currentUser?.role ?? "");
```
Add immediately after:
```tsx
  const isParentUser = currentUser?.role === "parent";
```

**Step 2:** Find:
```tsx
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="invoices" className="gap-1.5">
            <FileText className="w-3.5 h-3.5" />
            {pt.tabInvoices}
          </TabsTrigger>
          <TabsTrigger value="expenses" className="gap-1.5">
            <TrendingDown className="w-3.5 h-3.5" />
            {pt.tabExpenses}
          </TabsTrigger>
          <TabsTrigger value="debt" className="gap-1.5">
            <AlertCircle className="w-3.5 h-3.5" />
            {pt.tabDebt}
          </TabsTrigger>
        </TabsList>
```
Replace with:
```tsx
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className={`grid w-full ${isParentUser ? "grid-cols-1" : "grid-cols-3"}`}>
          <TabsTrigger value="invoices" className="gap-1.5">
            <FileText className="w-3.5 h-3.5" />
            {pt.tabInvoices}
          </TabsTrigger>
          {!isParentUser && (
            <TabsTrigger value="expenses" className="gap-1.5">
              <TrendingDown className="w-3.5 h-3.5" />
              {pt.tabExpenses}
            </TabsTrigger>
          )}
          {!isParentUser && (
            <TabsTrigger value="debt" className="gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" />
              {pt.tabDebt}
            </TabsTrigger>
          )}
        </TabsList>
```

**Step 3:** Find:
```tsx
      {payments.length > 0 && (
```
Replace with:
```tsx
      {payments.length > 0 && !isParentUser && (
```

---

## Summary

| Fix | File | Priority |
|-----|------|----------|
| 1 — Fix parent edit deletes student links | `pages/users/index.tsx` | CRITICAL |
| 2 — Link student to existing parent from profile | `pages/students/profile.tsx` | High |
| 3 — Add student button from parent user card | `pages/users/index.tsx` | Medium |
| 4 — Comprehensive modal for marketing approval | `routes/students.ts` + `pages/students/index.tsx` | High |
| 5 — Fix parent username display | `pages/users/index.tsx` | Low |
| 6 — Hide expenses/debt tabs from parent role | `pages/payments/index.tsx` | Medium |

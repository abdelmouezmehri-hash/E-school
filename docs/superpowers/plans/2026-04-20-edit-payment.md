# Edit Payment with Audit Trail — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow admin and accountant roles to edit a payment's original amount, discount, due date, and notes, with a full audit trail recording who changed what and when.

**Architecture:** A new `payment_edits` table stores JSON snapshots of changes per edit. The existing `PUT /api/payments/:id` endpoint is extended to accept `amountDue`, `discount`, and `dueDate`, and to write an audit row after each update. A new `GET /api/payments/:id/edits` endpoint serves the history. On the frontend, an edit dialog opens from a pencil button on `PaymentCard`, and a collapsible "سجل التعديلات" section displays the history.

**Tech Stack:** Drizzle ORM (SQLite dev / PostgreSQL prod), Express, React, TanStack Query, Zod, shadcn/ui, TypeScript

---

## File Map

| File | Action |
|------|--------|
| `lib/db/src/schema/payments.ts` | Add `paymentEditsTable` |
| `lib/api-zod/src/generated/api.ts` | Add `amountDue`, `discount`, `dueDate` to `UpdatePaymentBody` |
| `lib/api-zod/src/generated/types/updatePaymentBody.ts` | Add same fields to TypeScript interface |
| `artifacts/api-server/src/routes/payments.ts` | Update PUT handler; add GET edits endpoint |
| `lib/api-client-react/src/payments-api.ts` | Add `useListPaymentEdits` hook |
| `artifacts/kidspeak/src/pages/payments/index.tsx` | Add edit button, `EditPaymentModal`, edit history section |

---

## Task 1: Add paymentEditsTable to DB schema

**Files:**
- Modify: `lib/db/src/schema/payments.ts`

- [ ] **Step 1: Add the table definition**

Open `lib/db/src/schema/payments.ts`. The current content ends at line 23. Apply these changes:

Add `usersTable` import and `jsonText` import at the top (replace the existing import line):

```typescript
import { table, text, integer, real, id, timestamp, jsonText } from "./helpers";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { studentsTable } from "./students";
import { levelsTable } from "./levels";
import { usersTable } from "./users";
```

Then append after the existing exports at the bottom of the file:

```typescript
export type PaymentEditChanges = Record<string, { old: unknown; new: unknown }>;

export const paymentEditsTable = table("payment_edits", {
  id: id(),
  paymentId: integer("payment_id").notNull().references(() => paymentsTable.id, { onDelete: "cascade" }),
  editedBy: integer("edited_by").notNull().references(() => usersTable.id),
  editedAt: timestamp("edited_at").notNull().defaultNow(),
  changes: jsonText("changes").$type<PaymentEditChanges>().notNull(),
});

export type PaymentEdit = typeof paymentEditsTable.$inferSelect;
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd "e:/Kidspeak Hub/Kidspeak-Edu-Finance"
pnpm run typecheck:libs
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/db/src/schema/payments.ts
git commit -m "feat: add paymentEditsTable to DB schema"
```

---

## Task 2: Apply schema to development database

**Files:**
- Runtime: `artifacts/api-server/dev.db`

- [ ] **Step 1: Push schema to dev.db**

```bash
cd "e:/Kidspeak Hub/Kidspeak-Edu-Finance/lib/db"
pnpm run push:dev
```

Expected output: drizzle-kit reports the `payment_edits` table is created (no destructive changes).

- [ ] **Step 2: Verify table exists**

```bash
cd "e:/Kidspeak Hub/Kidspeak-Edu-Finance"
node -e "
const { createClient } = require('@libsql/client');
const db = createClient({ url: 'file:artifacts/api-server/dev.db' });
db.execute('PRAGMA table_info(payment_edits)').then(r => console.log(r.rows.map(c => c[1])));
" 2>/dev/null || echo "verify manually via API after Task 4"
```

Expected (if node can resolve the package): `['id', 'payment_id', 'edited_by', 'edited_at', 'changes']`

---

## Task 3: Extend UpdatePaymentBody Zod schema and TypeScript interface

**Files:**
- Modify: `lib/api-zod/src/generated/api.ts` (around line 670)
- Modify: `lib/api-zod/src/generated/types/updatePaymentBody.ts`

- [ ] **Step 1: Update the Zod schema in `lib/api-zod/src/generated/api.ts`**

Find the current `UpdatePaymentBody` definition (around line 670):

```typescript
export const UpdatePaymentBody = zod.object({
  amountPaid: zod.number().optional(),
  status: zod.enum(["paid", "partially_paid", "overdue", "pending"]).optional(),
  notes: zod.string().nullish(),
  paidAt: zod.coerce.date().nullish(),
});
```

Replace it with:

```typescript
export const UpdatePaymentBody = zod.object({
  amountPaid: zod.number().optional(),
  amountDue: zod.number().positive().optional(),
  discount: zod.number().min(0).optional(),
  dueDate: zod.string().optional(),
  status: zod.enum(["paid", "partially_paid", "overdue", "pending"]).optional(),
  notes: zod.string().nullish(),
  paidAt: zod.coerce.date().nullish(),
});
```

- [ ] **Step 2: Update the TypeScript interface in `lib/api-zod/src/generated/types/updatePaymentBody.ts`**

Current content:

```typescript
import type { UpdatePaymentBodyStatus } from "./updatePaymentBodyStatus";

export interface UpdatePaymentBody {
  amountPaid?: number;
  status?: UpdatePaymentBodyStatus;
  notes?: string | null;
  paidAt?: Date | null;
}
```

Replace with:

```typescript
import type { UpdatePaymentBodyStatus } from "./updatePaymentBodyStatus";

export interface UpdatePaymentBody {
  amountPaid?: number;
  amountDue?: number;
  discount?: number;
  dueDate?: string;
  status?: UpdatePaymentBodyStatus;
  notes?: string | null;
  paidAt?: Date | null;
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd "e:/Kidspeak Hub/Kidspeak-Edu-Finance"
pnpm run typecheck
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add lib/api-zod/src/generated/api.ts lib/api-zod/src/generated/types/updatePaymentBody.ts
git commit -m "feat: add amountDue, discount, dueDate to UpdatePaymentBody schema"
```

---

## Task 4: Update PUT handler to support new fields and record audit trail

**Files:**
- Modify: `artifacts/api-server/src/routes/payments.ts`

- [ ] **Step 1: Add `paymentEditsTable` to the DB import**

Find the existing import at line 3:

```typescript
import { db, paymentsTable, paymentTransactionsTable, studentsTable, levelsTable, usersTable, groupsTable, groupStudentsTable } from "@workspace/db";
```

Replace with:

```typescript
import { db, paymentsTable, paymentTransactionsTable, paymentEditsTable, studentsTable, levelsTable, usersTable, groupsTable, groupStudentsTable } from "@workspace/db";
```

- [ ] **Step 2: Replace the PUT handler (lines 151–184)**

Replace the entire `router.put("/payments/:id", ...)` block with:

```typescript
router.put("/payments/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  if (!["admin", "accountant"].includes(user.role)) {
    res.status(403).json({ error: "Only admins and accountants can update payments" });
    return;
  }

  const params = GetPaymentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdatePaymentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [current] = await db.select().from(paymentsTable).where(eq(paymentsTable.id, params.data.id));
  if (!current) {
    res.status(404).json({ error: "Payment not found" });
    return;
  }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.amountDue !== undefined) updateData.amountDue = parsed.data.amountDue.toString();
  if (parsed.data.amountPaid !== undefined) updateData.amountPaid = parsed.data.amountPaid.toString();
  if (parsed.data.discount !== undefined) updateData.discount = Math.max(0, parsed.data.discount).toString();
  if (parsed.data.dueDate !== undefined) updateData.dueDate = parsed.data.dueDate;
  if (parsed.data.status !== undefined) updateData.status = parsed.data.status;
  if (parsed.data.notes !== undefined) updateData.notes = parsed.data.notes;
  if (parsed.data.paidAt !== undefined) updateData.paidAt = parsed.data.paidAt ? new Date(parsed.data.paidAt) : null;

  const [payment] = await db.update(paymentsTable).set(updateData).where(eq(paymentsTable.id, params.data.id)).returning();
  if (!payment) {
    res.status(404).json({ error: "Payment not found" });
    return;
  }

  const changes: Record<string, { old: unknown; new: unknown }> = {};
  if (parsed.data.amountDue !== undefined && parseFloat(current.amountDue) !== parsed.data.amountDue) {
    changes.amountDue = { old: parseFloat(current.amountDue), new: parsed.data.amountDue };
  }
  if (parsed.data.discount !== undefined && parseFloat(current.discount ?? "0") !== parsed.data.discount) {
    changes.discount = { old: parseFloat(current.discount ?? "0"), new: parsed.data.discount };
  }
  if (parsed.data.dueDate !== undefined && current.dueDate !== parsed.data.dueDate) {
    changes.dueDate = { old: current.dueDate, new: parsed.data.dueDate };
  }
  if (parsed.data.notes !== undefined && current.notes !== parsed.data.notes) {
    changes.notes = { old: current.notes ?? null, new: parsed.data.notes ?? null };
  }

  if (Object.keys(changes).length > 0) {
    await db.insert(paymentEditsTable).values({
      paymentId: params.data.id,
      editedBy: user.id,
      changes,
    });
  }

  res.json(await enrichPayment(payment));
});
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd "e:/Kidspeak Hub/Kidspeak-Edu-Finance"
pnpm run typecheck
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add artifacts/api-server/src/routes/payments.ts
git commit -m "feat: extend PUT /payments/:id to support amountDue, dueDate and record audit trail"
```

---

## Task 5: Add GET /payments/:id/edits endpoint

**Files:**
- Modify: `artifacts/api-server/src/routes/payments.ts`

- [ ] **Step 1: Add the edits endpoint after the PUT handler**

Insert the following block immediately after the closing `});` of the PUT handler (before the `router.get("/payments/:id/receipt", ...)` line):

```typescript
router.get("/payments/:id/edits", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  if (!["admin", "accountant"].includes(user.role)) {
    res.status(403).json({ error: "Access denied." });
    return;
  }
  const paymentId = parseInt(req.params.id, 10);
  if (isNaN(paymentId)) { res.status(400).json({ error: "Invalid payment id" }); return; }

  const edits = await db
    .select({
      id: paymentEditsTable.id,
      editedAt: paymentEditsTable.editedAt,
      changes: paymentEditsTable.changes,
      editorId: usersTable.id,
      editorName: usersTable.name,
    })
    .from(paymentEditsTable)
    .leftJoin(usersTable, eq(paymentEditsTable.editedBy, usersTable.id))
    .where(eq(paymentEditsTable.paymentId, paymentId))
    .orderBy(desc(paymentEditsTable.editedAt));

  res.json(edits.map(e => ({
    id: e.id,
    editedAt: e.editedAt.toISOString(),
    changes: e.changes,
    editedBy: { id: e.editorId, name: e.editorName ?? "" },
  })));
});
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd "e:/Kidspeak Hub/Kidspeak-Edu-Finance"
pnpm run typecheck
```

Expected: no errors.

- [ ] **Step 3: Manual smoke test**

Start the API server, then:

```bash
# Edit a payment (replace 1 with a real payment id)
curl -X PUT http://localhost:3000/api/payments/1 \
  -H "Content-Type: application/json" \
  -H "Cookie: <your-session-cookie>" \
  -d '{"amountDue": 14000}'

# Fetch edit history
curl http://localhost:3000/api/payments/1/edits \
  -H "Cookie: <your-session-cookie>"
```

Expected: array with one edit record showing `"amountDue": { "old": 16000, "new": 14000 }`.

- [ ] **Step 4: Commit**

```bash
git add artifacts/api-server/src/routes/payments.ts
git commit -m "feat: add GET /payments/:id/edits endpoint"
```

---

## Task 6: Add useListPaymentEdits hook to API client

**Files:**
- Modify: `lib/api-client-react/src/payments-api.ts`

- [ ] **Step 1: Add the interface and hook at the end of the file**

Append to `lib/api-client-react/src/payments-api.ts`:

```typescript
export interface PaymentEditChange {
  old: unknown;
  new: unknown;
}

export interface PaymentEditRecord {
  id: number;
  editedAt: string;
  changes: Record<string, PaymentEditChange>;
  editedBy: { id: number; name: string };
}

export const useListPaymentEdits = (paymentId: number, options?: { enabled?: boolean }) =>
  useQuery<PaymentEditRecord[]>({
    queryKey: ["payments", paymentId, "edits"] as const,
    queryFn: () => customFetch(`/api/payments/${paymentId}/edits`),
    enabled: options?.enabled !== false && paymentId > 0,
  });
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd "e:/Kidspeak Hub/Kidspeak-Edu-Finance"
pnpm run typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/api-client-react/src/payments-api.ts
git commit -m "feat: add useListPaymentEdits hook"
```

---

## Task 7: Add edit button, EditPaymentModal, and edit history to PaymentCard

**Files:**
- Modify: `artifacts/kidspeak/src/pages/payments/index.tsx`

- [ ] **Step 1: Add new imports**

In the lucide-react import block, add `Pencil` and `History`:

```typescript
import {
  Search, Printer, X, ChevronDown, ChevronUp, Plus, Banknote, Building2,
  FileText, TrendingDown, AlertCircle, CalendarDays, Trash2, Receipt, Pencil, History,
} from "lucide-react";
```

In the `@workspace/api-client-react` import block, add `useUpdatePayment` and `useListPaymentEdits`:

```typescript
import {
  useListPayments,
  useGetReceipt,
  useGetMe,
  useListExpenses,
  useCreateExpense,
  useDeleteExpense,
  useListTransactions,
  useAddTransaction,
  useDeleteTransaction,
  useGetTransactionReceipt,
  useGetDebtSummary,
  useUpdatePayment,
  useListPaymentEdits,
} from "@workspace/api-client-react";
```

- [ ] **Step 2: Add the EditPaymentModal component**

Insert this new component just before the `// ── Payment Card ──` comment (around line 459):

```typescript
// ── Edit Payment Modal ────────────────────────────────────────────────────────

function EditPaymentModal({ payment, onClose }: { payment: any; onClose: () => void }) {
  const { toast } = useToast();
  const updatePayment = useUpdatePayment();
  const [amountDue, setAmountDue] = useState(String(payment.amountDue));
  const [discount, setDiscount] = useState(String(payment.discount ?? 0));
  const [dueDate, setDueDate] = useState(payment.dueDate ?? "");
  const [notes, setNotes] = useState(payment.notes ?? "");

  const handleSave = async () => {
    const due = parseFloat(amountDue);
    const disc = parseFloat(discount);
    if (isNaN(due) || due <= 0) {
      toast({ title: "المبلغ الأصلي يجب أن يكون أكبر من صفر", variant: "destructive" });
      return;
    }
    if (isNaN(disc) || disc < 0 || disc > due) {
      toast({ title: "الخصم يجب أن يكون بين 0 والمبلغ الأصلي", variant: "destructive" });
      return;
    }
    try {
      await updatePayment.mutateAsync({ id: payment.id, data: { amountDue: due, discount: disc, dueDate, notes: notes || null } });
      toast({ title: "تم تعديل الدفعة بنجاح ✓" });
      onClose();
    } catch {
      toast({ title: "حدث خطأ أثناء التعديل", variant: "destructive" });
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle>تعديل الدفعة</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">المبلغ الأصلي</label>
            <Input type="number" min="1" value={amountDue} onChange={e => setAmountDue(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">الخصم</label>
            <Input type="number" min="0" value={discount} onChange={e => setDiscount(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">تاريخ الاستحقاق</label>
            <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">ملاحظات</label>
            <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="اختياري" />
          </div>
        </div>
        <DialogFooter className="gap-2 flex-row-reverse">
          <Button
            onClick={handleSave}
            disabled={updatePayment.isPending}
            style={{ backgroundColor: BRAND_BLUE, color: "white" }}
          >
            {updatePayment.isPending ? "جارٍ الحفظ..." : "حفظ التعديل"}
          </Button>
          <DialogClose asChild>
            <Button variant="outline">إلغاء</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 3: Update PaymentCard state and add edit button + edit history section**

In `PaymentCard`, find the existing state declarations (around line 467–470):

```typescript
const [expanded, setExpanded] = useState(false);
const [showAddTx, setShowAddTx] = useState(false);
const [receiptTxId, setReceiptTxId] = useState<number | null>(null);
const [enrollmentReceiptPaymentId, setEnrollmentReceiptPaymentId] = useState<number | null>(null);
```

Replace with:

```typescript
const [expanded, setExpanded] = useState(false);
const [expandedEdits, setExpandedEdits] = useState(false);
const [showAddTx, setShowAddTx] = useState(false);
const [showEdit, setShowEdit] = useState(false);
const [receiptTxId, setReceiptTxId] = useState<number | null>(null);
const [enrollmentReceiptPaymentId, setEnrollmentReceiptPaymentId] = useState<number | null>(null);
```

Below the existing `useListTransactions` line, add:

```typescript
const { data: paymentEdits = [], isLoading: editsLoading } = useListPaymentEdits(expandedEdits ? payment.id : 0);
```

- [ ] **Step 4: Add edit button next to "إضافة دفعة"**

Find the "إضافة دفعة" button block (around line 535–545):

```typescript
{canManage && (
  <Button
    size="sm"
    className="w-full gap-1.5 text-xs font-semibold"
    style={{ backgroundColor: BRAND_BLUE, color: "white" }}
    onClick={() => setShowAddTx(true)}
  >
    <Plus className="w-3.5 h-3.5" />
    {pt.addPayment}
  </Button>
)}
```

Replace with:

```typescript
{canManage && (
  <div className="flex gap-2">
    <Button
      size="sm"
      className="flex-1 gap-1.5 text-xs font-semibold"
      style={{ backgroundColor: BRAND_BLUE, color: "white" }}
      onClick={() => setShowAddTx(true)}
    >
      <Plus className="w-3.5 h-3.5" />
      {pt.addPayment}
    </Button>
    <Button
      size="sm"
      variant="outline"
      className="gap-1 text-xs"
      onClick={() => setShowEdit(true)}
      title="تعديل الدفعة"
    >
      <Pencil className="w-3.5 h-3.5" />
    </Button>
  </div>
)}
```

- [ ] **Step 5: Add the edit history collapsible section**

Find the closing `</Card>` tag for the transaction history section (around line 595). Just before it (after the closing `}` of the `{expanded && (...)}` block), add:

```typescript
{/* Edit history section */}
{canManage && (
  <div className="border-t">
    <button
      className="w-full px-4 py-2 flex items-center justify-between text-xs hover:bg-muted/30 transition-colors"
      onClick={() => setExpandedEdits(e => !e)}
    >
      <span className="font-bold uppercase tracking-wide flex items-center gap-1.5" style={{ color: "#7c3aed" }}>
        <History className="w-3.5 h-3.5" />
        سجل التعديلات
      </span>
      {expandedEdits ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
    </button>
    {expandedEdits && (
      <div className="divide-y">
        {editsLoading ? (
          <div className="py-3 text-center text-xs text-muted-foreground">جارٍ التحميل...</div>
        ) : paymentEdits.length === 0 ? (
          <div className="py-3 text-center text-xs text-muted-foreground">لا توجد تعديلات مسجّلة</div>
        ) : (
          paymentEdits.map((edit: any) => (
            <div key={edit.id} className="px-4 py-2.5 text-xs">
              <div className="flex justify-between text-muted-foreground mb-1">
                <span className="font-medium">{edit.editedBy?.name ?? "—"}</span>
                <span>{safeFmt(edit.editedAt, "MMM d, yyyy HH:mm")}</span>
              </div>
              <div className="space-y-0.5">
                {Object.entries(edit.changes as Record<string, { old: unknown; new: unknown }>).map(([field, val]) => {
                  const labels: Record<string, string> = {
                    amountDue: "المبلغ الأصلي",
                    discount: "الخصم",
                    dueDate: "تاريخ الاستحقاق",
                    notes: "ملاحظات",
                  };
                  const label = labels[field] ?? field;
                  const oldVal = typeof val.old === "number" ? val.old.toLocaleString() : String(val.old ?? "—");
                  const newVal = typeof val.new === "number" ? val.new.toLocaleString() : String(val.new ?? "—");
                  return (
                    <div key={field} className="text-muted-foreground">
                      <span className="font-medium text-foreground">{label}:</span>{" "}
                      <span className="line-through text-red-400">{oldVal}</span>
                      {" ← "}
                      <span className="text-emerald-600 font-medium">{newVal}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    )}
  </div>
)}
```

- [ ] **Step 6: Render the EditPaymentModal**

In the JSX returned after the `</Card>`, add the modal (after the `{showAddTx && <AddTransactionModal ... />}` block):

```typescript
{showEdit && (
  <EditPaymentModal payment={payment} onClose={() => setShowEdit(false)} />
)}
```

- [ ] **Step 7: Verify TypeScript compiles**

```bash
cd "e:/Kidspeak Hub/Kidspeak-Edu-Finance"
pnpm run typecheck
```

Expected: no errors.

- [ ] **Step 8: Manual end-to-end test**

1. Start dev server: `pnpm run dev` (from the artifacts/kidspeak directory or workspace root)
2. Open `http://localhost:5173/` and navigate to Payments
3. Log in as admin or accountant
4. Click the pencil icon (✏️) on any payment card
5. Change the original amount and click "حفظ التعديل"
6. Verify the card updates with the new amount
7. Expand "سجل التعديلات" — confirm one row appears showing the old → new value
8. Log in as a teacher (non-admin) — verify the pencil icon does NOT appear

- [ ] **Step 9: Commit**

```bash
git add artifacts/kidspeak/src/pages/payments/index.tsx
git commit -m "feat: add edit payment UI with audit history"
```
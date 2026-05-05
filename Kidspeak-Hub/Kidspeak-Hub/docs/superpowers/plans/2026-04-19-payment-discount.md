# Payment: Auto-populate + Discount + تسديد المتبقي — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix amount-due auto-populate bug, add discount field with دج/% toggle and live net preview, and add a "تسديد المتبقي" button on partially paid cards.

**Architecture:** All changes are confined to one file (`profile.tsx`). No backend or schema changes required — the `discount` column already exists in `payments`, and `POST /api/payments/:id/transactions` already handles partial payment recording.

**Tech Stack:** React 18, TypeScript, shadcn/ui (Dialog, Input, Button, Badge), Tailwind CSS

---

## Files to Change

| File | What changes |
|------|-------------|
| `artifacts/kidspeak/src/pages/students/profile.tsx` | Fix bug (~line 1405), extend `paymentForm` state, update modal UI, update `handleAddPayment`, add تسديد المتبقي state + modal + button on cards |

---

### Task 1: Fix Auto-populate Bug

**Files:**
- Modify: `artifacts/kidspeak/src/pages/students/profile.tsx:1405`

- [ ] **Step 1: Open the file and locate the bug**

Find line 1405:
```tsx
const price = lvl?.price ? String(lvl.price) : "";
```
This evaluates `0` as falsy and returns `""` instead of `"0"`.

- [ ] **Step 2: Fix the null check**

Replace that line with:
```tsx
const price = lvl?.price != null ? String(lvl.price) : "";
```

Full context of the onClick after the fix (lines 1403–1408):
```tsx
onClick={() => {
  const lvl = levels.find((l: any) => l.id === (student as any).levelId) as any;
  const price = lvl?.price != null ? String(lvl.price) : "";
  setPaymentForm(f => ({ ...f, amountDue: price, amountPaid: "", discount: "", discountType: "amount", status: "pending", dueDate: "", notes: "" }));
  setIsPaymentOpen(true);
}}
```
(The `discount` and `discountType` resets are added here; they come from Task 2. Apply both changes at once.)

- [ ] **Step 3: Verify in browser**

Open any student's Payments tab. Click "إضافة دفعة". The "المبلغ المستحق" field should auto-fill with the level price. If the student's level has price `0`, the field should show `0` (not empty).

---

### Task 2: Add Discount Field to Add-Payment Modal

**Files:**
- Modify: `artifacts/kidspeak/src/pages/students/profile.tsx` (state ~line 338, handleAddPayment ~line 430, modal ~line 2182)

- [ ] **Step 1: Extend paymentForm state**

Find the existing state at line 338:
```tsx
const [paymentForm, setPaymentForm] = useState({
  amountDue: "",
  amountPaid: "",
  status: "pending" as "pending" | "paid" | "partially_paid" | "overdue",
  dueDate: "",
  notes: "",
});
```

Replace with:
```tsx
const [paymentForm, setPaymentForm] = useState({
  amountDue: "",
  amountPaid: "",
  discount: "",
  discountType: "amount" as "amount" | "percent",
  status: "pending" as "pending" | "paid" | "partially_paid" | "overdue",
  dueDate: "",
  notes: "",
});
```

- [ ] **Step 2: Update handleAddPayment to send discount**

Find the `handleAddPayment` function body (line ~430). Replace the `body: JSON.stringify(...)` block only:

Old:
```tsx
body: JSON.stringify({
  studentId,
  amountDue: parseFloat(paymentForm.amountDue),
  amountPaid: parseFloat(paymentForm.amountPaid || "0"),
  status: paymentForm.status,
  dueDate: paymentForm.dueDate,
  notes: paymentForm.notes || null,
}),
```

New:
```tsx
body: JSON.stringify({
  studentId,
  amountDue: parseFloat(paymentForm.amountDue),
  amountPaid: parseFloat(paymentForm.amountPaid || "0"),
  discount: (() => {
    const raw = parseFloat(paymentForm.discount) || 0;
    return paymentForm.discountType === "percent"
      ? (parseFloat(paymentForm.amountDue) || 0) * raw / 100
      : raw;
  })(),
  status: paymentForm.status,
  dueDate: paymentForm.dueDate,
  notes: paymentForm.notes || null,
}),
```

Also update the form reset in the success branch (line ~452):

Old:
```tsx
setPaymentForm({ amountDue: "", amountPaid: "", status: "pending", dueDate: "", notes: "" });
```

New:
```tsx
setPaymentForm({ amountDue: "", amountPaid: "", discount: "", discountType: "amount", status: "pending", dueDate: "", notes: "" });
```

- [ ] **Step 3: Add discount UI to the modal**

Inside the Add Payment Dialog, find the block that ends with the auto-status hint (line ~2215). Insert the discount field **after** the `<div className="grid grid-cols-2 gap-3">` block (after the amountDue + amountPaid pair), before the auto-status hint div:

```tsx
{/* Discount */}
<div className="space-y-1.5">
  <label className="text-sm font-medium">{isRTL ? "التخفيض" : "Discount"}</label>
  <div className="flex gap-2">
    <Input
      type="number"
      min="0"
      placeholder="0"
      value={paymentForm.discount}
      onChange={e => setPaymentForm(f => ({ ...f, discount: e.target.value }))}
      className="flex-1"
    />
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="shrink-0 px-3 font-semibold"
      onClick={() =>
        setPaymentForm(f => ({
          ...f,
          discountType: f.discountType === "amount" ? "percent" : "amount",
        }))
      }
    >
      {paymentForm.discountType === "amount" ? "دج ⇌ %" : "% ⇌ دج"}
    </Button>
  </div>
</div>

{/* Net amount preview */}
{parseFloat(paymentForm.amountDue) > 0 && (
  <div className="rounded-md px-3 py-2 text-sm font-medium border" style={{ backgroundColor: "#1B2E8F0D", color: "#1B2E8F", borderColor: "#1B2E8F30" }}>
    {(() => {
      const due = parseFloat(paymentForm.amountDue) || 0;
      const raw = parseFloat(paymentForm.discount) || 0;
      const effectiveDiscount = paymentForm.discountType === "percent" ? due * raw / 100 : raw;
      const net = due - effectiveDiscount;
      return `${isRTL ? "المبلغ الصافي" : "Net amount"}: ${net.toLocaleString()} ${isRTL ? "دج" : "DZD"}`;
    })()}
  </div>
)}
```

- [ ] **Step 4: Verify in browser**

Open a student's Payments tab → click "إضافة دفعة".
- Discount field appears below the amount grid.
- Toggle button switches between `دج ⇌ %` and `% ⇌ دج`.
- Net amount line appears when amountDue > 0 and updates live as you type a discount.
- 10% of 16,000 shows as 15,600 (net). 1,600 دج discount on 16,000 shows as 14,400.
- Submit a payment and confirm no console errors; the payment is saved with the correct discount.

---

### Task 3: Add "تسديد المتبقي" Button and Modal

**Files:**
- Modify: `artifacts/kidspeak/src/pages/students/profile.tsx` (state ~line 335, payment card ~line 1420, add modal near line 2252)

- [ ] **Step 1: Add state for the تسديد المتبقي modal**

Find the payment-related state block (around line 335). After the `enrollmentReceiptPaymentId` state line, add:

```tsx
const [settlePaymentId, setSettlePaymentId] = useState<number | null>(null);
const [settleAmount, setSettleAmount] = useState("");
const [settleMethod, setSettleMethod] = useState("cash");
const [isSavingSettle, setIsSavingSettle] = useState(false);
```

- [ ] **Step 2: Add the تسديد المتبقي button to partially-paid payment cards**

Find the payment card rendering (line ~1421). The existing card `div` inside `studentExtra.payments.map` contains a right-side flex area with the badge and receipt button.

Inside the `<div className="flex items-center gap-2 shrink-0">` (the right side of the card), add a "تسديد المتبقي" button **before** the receipt button, but only when the payment is partially paid or overdue and there is a remaining balance:

```tsx
{(p.status === "partially_paid" || p.status === "overdue") &&
  Number(p.amountDue) - Number(p.amountPaid) > 0 && (
  <Button
    variant="outline"
    size="sm"
    className="h-7 px-2.5 text-xs gap-1.5 font-semibold"
    style={{ color: "#059669", borderColor: "#05966950" }}
    onClick={() => {
      const remaining = Number(p.amountDue) - Number(p.amountPaid) - Number(p.discount ?? 0);
      setSettlePaymentId(p.id);
      setSettleAmount(String(Math.max(0, remaining)));
      setSettleMethod("cash");
    }}
  >
    {isRTL ? "تسديد المتبقي" : "Settle Balance"}
  </Button>
)}
```

Also add the remaining balance info to the card text area (inside `<div className="flex-1 min-w-0">`), after the `amountPaid / amountDue` line:

```tsx
{(p.status === "partially_paid" || p.status === "overdue") && (
  <div className="text-xs font-medium mt-0.5" style={{ color: "#059669" }}>
    {isRTL ? "متبقٍّ" : "Remaining"}: {(Number(p.amountDue) - Number(p.amountPaid) - Number(p.discount ?? 0)).toLocaleString()} {isRTL ? "دج" : "DZD"}
  </div>
)}
```

- [ ] **Step 3: Add the تسديد المتبقي modal**

Find the closing tag of the Add Payment Dialog (after line 2252). Immediately after it, add the settle modal:

```tsx
{/* ── تسديد المتبقي Modal ── */}
{canManagePayments && settlePaymentId !== null && (
  <Dialog
    open={settlePaymentId !== null}
    onOpenChange={open => {
      if (!open) {
        setSettlePaymentId(null);
        setSettleAmount("");
        setSettleMethod("cash");
      }
    }}
  >
    <DialogContent className="sm:max-w-sm">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <CreditCard className="w-4 h-4" style={{ color: "#059669" }} />
          {isRTL ? `تسديد المتبقي — ${student.name}` : `Settle Balance — ${student.name}`}
        </DialogTitle>
      </DialogHeader>
      <div className="space-y-4 py-2">
        {/* Remaining label */}
        <div className="rounded-md px-3 py-2 text-sm font-medium border" style={{ backgroundColor: "#05966910", color: "#059669", borderColor: "#05966930" }}>
          {isRTL ? "المبلغ المتبقي" : "Remaining balance"}: {Number(settleAmount).toLocaleString()} {isRTL ? "دج" : "DZD"}
        </div>
        {/* Amount to pay now */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">{isRTL ? "المبلغ المدفوع الآن" : "Amount paid now"}</label>
          <Input
            type="number"
            min="0"
            value={settleAmount}
            onChange={e => setSettleAmount(e.target.value)}
          />
        </div>
        {/* Payment method */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">{isRTL ? "طريقة الدفع" : "Payment method"}</label>
          <select
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={settleMethod}
            onChange={e => setSettleMethod(e.target.value)}
          >
            <option value="cash">{isRTL ? "نقداً" : "Cash"}</option>
            <option value="bank_transfer">{isRTL ? "تحويل بنكي" : "Bank Transfer"}</option>
            <option value="cheque">{isRTL ? "شيك" : "Cheque"}</option>
          </select>
        </div>
      </div>
      <DialogFooter>
        <DialogClose asChild>
          <Button variant="outline" disabled={isSavingSettle}>
            {isRTL ? "إلغاء" : "Cancel"}
          </Button>
        </DialogClose>
        <Button
          style={{ backgroundColor: "#059669", color: "white" }}
          className="font-semibold"
          disabled={isSavingSettle || !settleAmount}
          onClick={async () => {
            if (!settlePaymentId) return;
            setIsSavingSettle(true);
            try {
              const res = await fetch(`/api/payments/${settlePaymentId}/transactions`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                  amount: parseFloat(settleAmount),
                  paymentMethod: settleMethod,
                  transactionDate: new Date().toISOString().split("T")[0],
                }),
              });
              if (res.ok) {
                toast({ title: isRTL ? "تم تسجيل الدفعة" : "Payment recorded" });
                setSettlePaymentId(null);
                setSettleAmount("");
                setSettleMethod("cash");
                refetchStudent();
              } else {
                const err = await res.json();
                toast({ title: "Error", description: err.error, variant: "destructive" });
              }
            } finally {
              setIsSavingSettle(false);
            }
          }}
        >
          {isSavingSettle ? (isRTL ? "جارٍ الحفظ..." : "Saving...") : (isRTL ? "تأكيد" : "Confirm")}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
)}
```

- [ ] **Step 4: Verify in browser**

1. Open a student who has a "مدفوع جزئياً" payment card.
2. Confirm the card shows "متبقٍّ: X دج" and a green "تسديد المتبقي" button.
3. Click the button — modal opens pre-filled with the remaining amount.
4. Change the amount if needed, pick a payment method, click "تأكيد".
5. If the paid amount now equals or exceeds (amountDue - discount), the card should refresh to show "مدفوع" (paid). Otherwise it stays "مدفوع جزئياً" with an updated remaining amount.

---

## Acceptance Checklist

- [ ] "إضافة دفعة" auto-fills amount due from level price (including price = 0)
- [ ] Discount field with دج/% toggle renders in Add Payment modal
- [ ] Net amount preview updates on every keystroke
- [ ] 10% of 16,000 correctly shows net 14,400
- [ ] Submitted payment includes `discount` as a fixed amount
- [ ] Partially paid cards show "متبقٍّ: X دج" and green "تسديد المتبقي" button
- [ ] تسديد المتبقي modal pre-fills with remaining balance
- [ ] After full collection, payment status refreshes to "مدفوع"
- [ ] Form and modal reset cleanly on close
# Payment: Auto-populate + Discount + تسديد المتبقي

**Date:** 2026-04-19  
**Status:** Approved

---

## Scope

Three improvements to the student payment system:

1. **Bug fix** — auto-populate amount due from level price
2. **Discount field** — fixed amount or percentage, with live net preview
3. **"تسديد المتبقي" button** — collect remaining balance on partially paid invoices

---

## 1. Bug Fix — Auto-populate Amount Due

**File:** `artifacts/kidspeak/src/pages/students/profile.tsx` line ~1405

**Problem:** `lvl?.price ? String(lvl.price) : ""` — price `0` is falsy, returns empty string.

**Fix:**
```ts
const price = lvl?.price != null ? String(lvl.price) : "";
```

**Behavior:** "إضافة دفعة" always defaults to the level price (new billing period).  
Completing a partial payment is a separate operation (see section 3).

---

## 2. Discount Field in Add-Payment Modal

### State additions

```ts
paymentForm: {
  amountDue: "",
  amountPaid: "",
  discount: "",           // new
  discountType: "amount", // new — "amount" | "percent"
  dueDate: "",
  notes: "",
  status: "pending",
}
```

### UI layout

```
المبلغ المستحق (DZD)      المبلغ المدفوع (DZD)
[ 16,000           ]      [ 0                ]

التخفيض
[ 300         ] [ دج ⇌ % ]

─────────────────────────────
المبلغ الصافي: 15,700 دج
─────────────────────────────

الاستحقاق         ملاحظات
[ mm/dd/yyyy ]   [ ...   ]
```

- Toggle button switches `discountType` between `"amount"` and `"percent"`
- `effectiveDiscount = type === "percent" ? (amountDue × discount / 100) : discount`
- Net amount line renders only when `amountDue > 0`
- Net amount updates on every keystroke

### Submission

```ts
const amountDue = parseFloat(paymentForm.amountDue) || 0;
const discountRaw = parseFloat(paymentForm.discount) || 0;
const effectiveDiscount = paymentForm.discountType === "percent"
  ? (amountDue * discountRaw / 100)
  : discountRaw;

POST /api/payments {
  studentId,
  amountDue,
  discount: effectiveDiscount,  // always sent as fixed amount
  amountPaid,
  dueDate,
  notes,
}
```

No backend changes — `discount` column already exists in `payments` table.

---

## 3. "تسديد المتبقي" Button on Partial Payments

### Concept

Each payment card that is `partially_paid` or `overdue` shows a new button:

```
April 2026 — مدفوع جزئياً
13,500 / 16,000 دج  [متبقٍّ: 2,500 دج]
[ تسديد المتبقي ]  [ إيصال ]
```

### What it does

Opens a small modal pre-filled with the remaining balance:

```
تسديد المتبقي — طارق
المبلغ المتبقي: 2,500 دج

المبلغ المدفوع الآن:  [ 2,500 ]
طريقة الدفع:         [ نقداً ▼ ]

[ تأكيد ]  [ إلغاء ]
```

On confirm → calls existing `POST /api/payments/:id/transactions` (or `PUT /api/payments/:id`) to record the new payment amount against the existing invoice.

### Status update

After recording:
- If `totalPaid >= amountDue - discount` → status becomes `"paid"`
- Otherwise → stays `"partially_paid"` with updated balance

---

## Files to Change

| File | Change |
|------|--------|
| `artifacts/kidspeak/src/pages/students/profile.tsx` | Fix auto-populate, add discount state + UI, add تسديد المتبقي button + modal |

No schema changes required. API endpoints already support all operations.

---

## Acceptance Criteria

- [ ] "إضافة دفعة" auto-fills amount due from level price (including price = 0)
- [ ] Discount field with دج/% toggle renders in modal
- [ ] Net amount updates live as user types discount
- [ ] % discount correctly calculated (10% of 16,000 = 1,600)
- [ ] Submitted payment includes `discount` as fixed amount
- [ ] Partially paid cards show "متبقٍّ: X دج" and "تسديد المتبقي" button
- [ ] تسديد المتبقي modal pre-fills with remaining balance
- [ ] After full collection, payment status updates to "paid"
- [ ] Form resets cleanly on modal close
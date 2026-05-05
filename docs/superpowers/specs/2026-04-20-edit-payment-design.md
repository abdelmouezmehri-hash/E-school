# Edit Payment with Audit Trail — Design Spec

**Date:** 2026-04-20
**Status:** Approved

## Problem

When an employee enters incorrect payment data (wrong original amount, discount, due date, or notes), there is no UI to correct it. The backend `PUT /api/payments/:id` endpoint exists but is not wired to any interface.

## Goal

Allow `admin` and `accountant` roles to edit payment records, with a full audit trail showing who changed what and when.

## Scope

- Edit dialog on PaymentCard (admin/accountant only)
- Editable fields: original amount, discount, due date, notes
- Audit table recording every change with old/new values
- Edit history UI section on PaymentCard (collapsible, like transaction history)

---

## Data Layer

### New table: `payment_edits`

| Column | Type | Description |
|--------|------|-------------|
| id | integer PK | Auto-increment |
| payment_id | integer FK | References `payments.id` (cascade delete) |
| edited_by | integer FK | References `users.id` |
| edited_at | timestamp | When the edit occurred |
| changes | text (JSON) | Snapshot of changed fields: `{ field: { old, new } }` |

**Example `changes` value:**
```json
{
  "amountDue": { "old": 16000, "new": 14000 },
  "discount": { "old": 0, "new": 500 }
}
```

Only fields that actually changed are included in the snapshot.

### Updates to existing `payments` table

No new columns needed — the audit is fully captured in `payment_edits`.

---

## Backend

### Updated endpoint: `PUT /api/payments/:id`

**Authorization:** `admin` or `accountant` only (existing behavior)

**New behavior after a successful update:**
1. Compute `changes` by comparing submitted values to current DB values
2. If any field changed, insert a row into `payment_edits`
3. Return the updated payment as before

**Current PUT body supports:** `amountPaid`, `discount`, `status`, `notes`, `paidAt`

**Fields to add to PUT body:**
- `amountDue` (المبلغ الأصلي) — needs to be added to `UpdatePaymentBody` Zod schema and PUT handler
- `dueDate` (تاريخ الاستحقاق) — needs to be added to `UpdatePaymentBody` Zod schema and PUT handler
- `discount` — already supported
- `notes` — already supported

### New endpoint: `GET /api/payments/:id/edits`

**Authorization:** `admin` or `accountant`

**Response:** Array of edit records, newest first:
```json
[
  {
    "id": 1,
    "editedBy": { "id": 3, "name": "Abdelmouez Mehri" },
    "editedAt": "2026-04-20T10:30:00Z",
    "changes": {
      "amountDue": { "old": 16000, "new": 14000 }
    }
  }
]
```

---

## Frontend

### Edit button on PaymentCard

- Pencil icon (✏️) rendered only for `admin` and `accountant`
- Positioned alongside the existing "إضافة دفعة" button
- Opens the edit dialog on click

### Edit dialog

- Title: "تعديل الدفعة"
- Fields (pre-filled with current values):
  - المبلغ الأصلي (`amountDue`) — number input, must be > 0
  - الخصم (`discount`) — number input, must be ≥ 0 and ≤ amountDue
  - تاريخ الاستحقاق (`dueDate`) — date input
  - ملاحظات (`notes`) — textarea
- "حفظ التعديل" button — calls `PUT /api/payments/:id`, shows loading state
- "إلغاء" button — closes dialog without saving
- On error: toast with error message, dialog stays open

### Edit history section on PaymentCard

- Collapsible section titled "سجل التعديلات" (same pattern as "سجل المعاملات")
- Visible only to `admin` and `accountant`
- Each row shows:
  - Editor name
  - Date/time
  - Human-readable change summary (e.g., "المبلغ الأصلي: 16,000 ← 14,000")
- Fetched from `GET /api/payments/:id/edits` when expanded

---

## Validation Rules

| Field | Rule |
|-------|------|
| amountDue | Required, integer > 0 |
| discount | Integer ≥ 0, must not exceed amountDue |
| dueDate | Valid date string |
| notes | Optional, no length restriction |

---

## Permissions Summary

| Action | admin | accountant | other |
|--------|-------|------------|-------|
| See edit button | ✅ | ✅ | ❌ |
| Submit edit | ✅ | ✅ | ❌ |
| View edit history | ✅ | ✅ | ❌ |

---

## Files to Create / Modify

| File | Change |
|------|--------|
| `lib/db/src/schema/payments.ts` | Add `paymentEditsTable` definition |
| `lib/db/src/schema/index.ts` | Export `paymentEditsTable` |
| `lib/api-zod/src/generated/api.ts` | Add `amountDue` and `dueDate` to `UpdatePaymentBody` schema |
| `lib/api-zod/src/generated/types/updatePaymentBody.ts` | Add `amountDue` and `dueDate` to TypeScript interface |
| `artifacts/api-server/src/routes/payments.ts` | Update PUT handler; add `GET /payments/:id/edits` endpoint |
| `lib/api-client-react/src/payments-api.ts` | Add `usePaymentEdits` query hook and update `useUpdatePayment` types |
| `artifacts/kidspeak/src/pages/payments/index.tsx` | Add edit button, edit dialog, and edit history section |
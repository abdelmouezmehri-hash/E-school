# Salary System — Precise Bug Fix Instructions

## CRITICAL BUG 1 — DELETE salary does not delete its expense record

**File:** `artifacts/api-server/src/routes/salaries.ts`

**Problem:** `DELETE /salaries/:id` only deletes from `salariesTable`.
But when a salary is created (POST /salaries), it auto-creates a record in `expensesTable`.
When the salary is deleted, the expense record stays — causing wrong totals forever.

**Fix:** Before deleting the salary, find and delete the matching expense.
The expense was created with:
- `category: "salaries"`
- `description` containing the employee name and period
- `amount` equal to salary amount

Best approach: add a `salaryId` foreign key column to `expensesTable`, OR
query by `category = "salaries"` AND `amount = salary.amount` AND `expenseDate = salary.paidAt`.

Simplest fix — add to DELETE route:
```ts
// First get the salary to know amount and paidAt
const [existing] = await db.select().from(salariesTable).where(eq(salariesTable.id, id));
if (existing) {
  // Delete the matching expense created for this salary
  await db.delete(expensesTable).where(
    and(
      eq(expensesTable.category, "salaries"),
      eq(expensesTable.amount, existing.amount),
      eq(expensesTable.expenseDate, existing.paidAt),
    )
  );
}
await db.delete(salariesTable).where(eq(salariesTable.id, id));
```

---

## CRITICAL BUG 2 — Frontend cache not invalidated after salary changes

**File:** `artifacts/kidspeak/src/pages/admin/salaries/index.tsx`

**Problem:** Both `addMutation` and `delMutation` only invalidate `["salaries"]`.
This means the revenue page, expenses log, and dashboard never refresh.

**Fix:** In BOTH `addMutation.onSuccess` and `delMutation.onSuccess`, invalidate ALL these keys:
```ts
qc.invalidateQueries({ queryKey: ["salaries"] });
qc.invalidateQueries({ queryKey: ["/api/dashboard/revenue"] });
qc.invalidateQueries({ queryKey: ["/api/expenses"] });
qc.invalidateQueries({ queryKey: ["/api/dashboard"] });
qc.invalidateQueries({ queryKey: ["salaries/my"] });
```

---

## CRITICAL BUG 3 — Salary page stats don't reflect current month correctly

**File:** `artifacts/kidspeak/src/pages/admin/salaries/index.tsx`

**Problem:** `totalThisMonth` is calculated client-side from cached data.
The stat cards show stale data because the query doesn't re-fetch after mutations.

**Fix:** The invalidation fix in Bug 2 will fix this automatically since the query refetches.
Also verify that `عدد الموظفين` counts DISTINCT employees with salary records, not total users.

---

## CRITICAL BUG 4 — مستحقاتي (My Earnings) doesn't show salary records

**File:** `artifacts/kidspeak/src/pages/psychologist/earnings.tsx` (and groups/earnings.tsx)

**Problem:** The `SalarySection` component uses query key `["salaries/my"]`.
When admin adds a salary for this employee, the component doesn't know to refetch
because no invalidation is triggered for `["salaries/my"]`.

**Fix:** 
1. The invalidation fix in Bug 2 (`qc.invalidateQueries({ queryKey: ["salaries/my"] })`) will fix this.
2. Also verify `إجمالي المدفوع` in the earnings summary INCLUDES salary payments, not just session payments.
3. Verify `إجمالي المستحقات` logic is correct — it should be (total owed from sessions) - (total paid via salaries + payments).

---

## NEW FEATURE — Admin Salary + Profit Share

### Backend changes needed:
1. Add optional `profitSharePercent` column to `salariesTable` (nullable decimal)
2. In `POST /salaries`: accept `profitSharePercent` field
3. In `GET /salaries/my`: return `profitSharePercent` field
4. Add new endpoint `GET /salaries/admin-summary` that returns:
   - base salary amount
   - profit share percentage  
   - calculated profit share amount (profitSharePercent% of current month netRevenue)
   - total earnings

### Frontend changes needed:
1. In salaries page: add "نسبة من الأرباح %" field in the add salary dialog (optional, only shown when employee is admin)
2. In admin's مستحقاتي page: show a new card "نسبة الأرباح" with the calculated amount

---

## INTEGRATION RULE (must follow for all future features)

Every mutation that changes financial data MUST invalidate:
```ts
qc.invalidateQueries({ queryKey: ["/api/dashboard/revenue"] });
qc.invalidateQueries({ queryKey: ["/api/expenses"] });  
qc.invalidateQueries({ queryKey: ["/api/dashboard"] });
```

---

## After all fixes:
1. Run `npm run build` — must show zero TypeScript errors
2. Test: add salary → check revenue page updates immediately
3. Test: delete salary → check expense disappears from revenue page
4. Test: add salary for employee → check their مستحقاتي page updates
5. Commit and push to main

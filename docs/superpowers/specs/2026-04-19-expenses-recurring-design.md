# Expenses: Fixed (Recurring) + Variable — Design

**Date:** 2026-04-19  
**Status:** Approved

---

## Scope

Two improvements to the expense system:

1. **Fixed recurring expenses** — templates with default amounts, generated monthly with one click and editable before saving
2. **Variable expenses** — already fully implemented; no changes needed

---

## Current State

The existing expenses system is fully functional:
- `expenses` table: id, branchId, category, description, amount, expenseDate, notes, createdAt
- Categories: `rent | utilities | salaries | materials | maintenance | other`
- Full CRUD API at `/api/expenses`
- Finance page (`revenue/index.tsx`) has working "تسجيل مصروف" button

The only missing piece is recurring/fixed expense templates.

---

## 1. Database Changes

### New table: `expense_templates`

```ts
export const expenseTemplates = sqliteTable("expense_templates", {
  id:            integer("id").primaryKey({ autoIncrement: true }),
  branchId:      integer("branch_id").references(() => branches.id),
  name:          text("name").notNull(),
  category:      text("category").notNull(),  // same enum as expenses
  defaultAmount: real("default_amount").notNull(),
  isActive:      integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt:     text("created_at").notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
});
```

### Modified table: `expenses`

Add one nullable column:

```ts
templateId: integer("template_id").references(() => expenseTemplates.id)
```

- `templateId = null` → manual/variable expense
- `templateId = <id>` → generated from a template

---

## 2. API Endpoints

### Templates CRUD

| Method | Endpoint | Body | Returns |
|--------|----------|------|---------|
| GET | `/api/expense-templates` | — (query: `branchId?`) | `ExpenseTemplate[]` |
| POST | `/api/expense-templates` | `{ name, category, defaultAmount, branchId? }` | `ExpenseTemplate` |
| PUT | `/api/expense-templates/:id` | `{ name?, category?, defaultAmount?, isActive? }` | `ExpenseTemplate` |
| DELETE | `/api/expense-templates/:id` | — | `{ message }` |

**DELETE behavior:** Before deleting the template, set `templateId = null` on all existing expenses that reference it. Then delete the template. This prevents orphaned FK references.

### Generate endpoint

**POST `/api/expense-templates/generate`**

Request body:
```ts
{
  month: "2026-04",           // YYYY-MM
  amounts: Array<{
    templateId: number,
    amount: number,           // user-adjusted amount (may differ from defaultAmount)
  }>
}
```

Logic:
1. For each entry in `amounts`, check if an expense with this `templateId` already exists for this month (i.e., `expenseDate` starts with `"2026-04"`)
2. Skip already-generated ones (do not overwrite)
3. Insert the rest as new expenses with:
   - `expenseDate` = first day of the month (`"2026-04-01"`)
   - `description` = template name
   - `category` = template category
   - `amount` = user-provided amount
   - `templateId` = template id
4. Return:
```ts
{
  created: Expense[],
  skipped: number[]   // templateIds already generated for this month
}
```

---

## 3. Frontend Changes

**File:** `artifacts/kidspeak/src/pages/revenue/index.tsx`

### New section: "المصاريف الثابتة" (above the expense log)

- Table listing all active templates: name, category, default amount, active toggle, edit/delete buttons
- "إضافة قالب" button → opens a small dialog (name, category, defaultAmount fields)
- Edit template → same dialog pre-filled
- Toggle `isActive` inline without opening a dialog

### New button: "توليد مصاريف [month]"

Positioned next to the "تسجيل مصروف" button.

On click → opens a **Generate Dialog**:
- Lists all **active** templates
- Each row: checkbox (checked by default) + template name + editable amount input (pre-filled with `defaultAmount`)
- Templates already generated for this month: shown greyed out with "مولَّد ✓" label, checkbox disabled
- Footer shows total sum (live, updates as amounts change)
- "تأكيد التوليد" button → calls POST `/api/expense-templates/generate` with checked templates + their amounts
- On success: invalidates expense list query → expense log refreshes automatically

### API client additions

New hooks in `lib/api-client-react/src/expense-templates-api.ts`:
```ts
useListExpenseTemplates()
useCreateExpenseTemplate()
useUpdateExpenseTemplate()
useDeleteExpenseTemplate()
useGenerateExpenses()     // POST /api/expense-templates/generate
```

---

## Files to Change

| File | Change |
|------|--------|
| `lib/db/src/schema/expenses.ts` | Add `expenseTemplates` table + `templateId` column to `expenses` |
| `lib/db/src/index.ts` | Export new table |
| `artifacts/api-server/src/db/index.ts` | Include new table in schema |
| `artifacts/api-server/src/routes/expense-templates.ts` | New file — CRUD + generate endpoints |
| `artifacts/api-server/src/index.ts` | Register new router |
| `lib/api-client-react/src/expense-templates-api.ts` | New file — React Query hooks for templates (separate from generated expenses hooks) |
| `artifacts/kidspeak/src/pages/revenue/index.tsx` | Add templates section + generate dialog |

No changes to existing expense API or expense table columns other than adding `templateId`.

---

## Acceptance Criteria

- [ ] `expense_templates` table created with migration
- [ ] `expenses.templateId` column added
- [ ] GET/POST/PUT/DELETE `/api/expense-templates` work
- [ ] POST `/api/expense-templates/generate` creates expenses and skips duplicates
- [ ] Finance page shows templates list with add/edit/delete/toggle
- [ ] "توليد مصاريف" button opens dialog with active templates, editable amounts
- [ ] Already-generated templates shown greyed out in the dialog
- [ ] After generation, expense log refreshes automatically
- [ ] Variable expenses (manual entry) unchanged and still work
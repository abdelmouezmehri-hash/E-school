# Expenses: Fixed Recurring Templates — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a fixed-expense template system to the finance page: manage recurring expense templates, then generate them for any month with one click and editable amounts.

**Architecture:** New `expense_templates` DB table + `templateId` FK on `expenses` table → new API routes registered in the existing routes barrel → new React Query hooks file → UI additions to `revenue/index.tsx`.

**Tech Stack:** Drizzle ORM (libSQL/SQLite), Express 5, React 18, TanStack Query, shadcn/ui, Tailwind CSS

---

## File Map

| File | Action |
|------|--------|
| `lib/db/src/schema/expense-templates.ts` | Create — `expenseTemplatesTable` schema + types |
| `lib/db/src/schema/expenses.ts` | Modify — add `templateId` FK column |
| `lib/db/src/schema/index.ts` | Modify — add `export * from "./expense-templates"` |
| `artifacts/api-server/src/routes/expense-templates.ts` | Create — CRUD + generate endpoints |
| `artifacts/api-server/src/routes/index.ts` | Modify — register new router |
| `lib/api-client-react/src/expense-templates-api.ts` | Create — React Query hooks |
| `lib/api-client-react/src/index.ts` | Modify — export new hooks file |
| `artifacts/kidspeak/src/pages/revenue/index.tsx` | Modify — templates section + generate dialog |

---

### Task 1: Database Schema

**Files:**
- Create: `lib/db/src/schema/expense-templates.ts`
- Modify: `lib/db/src/schema/expenses.ts`
- Modify: `lib/db/src/schema/index.ts`

- [ ] **Step 1: Create the expense_templates schema file**

Create `lib/db/src/schema/expense-templates.ts` with this exact content:

```ts
import { table, text, integer, real, id, timestamp } from "./helpers";
import { branchesTable } from "./branches";

export const expenseTemplatesTable = table("expense_templates", {
  id:            id(),
  branchId:      integer("branch_id").references(() => branchesTable.id, { onDelete: "set null" }),
  name:          text("name").notNull(),
  category:      text("category", { enum: ["rent", "utilities", "salaries", "materials", "maintenance", "other"] }).notNull(),
  defaultAmount: real("default_amount").notNull(),
  isActive:      integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt:     timestamp("created_at").notNull().defaultNow(),
});

export type ExpenseTemplate = typeof expenseTemplatesTable.$inferSelect;
export type InsertExpenseTemplate = typeof expenseTemplatesTable.$inferInsert;
```

- [ ] **Step 2: Add templateId FK to the expenses table**

Open `lib/db/src/schema/expenses.ts`. Add this import at the top (after existing imports):

```ts
import { expenseTemplatesTable } from "./expense-templates";
```

Then add `templateId` as a column inside `expensesTable`, after the `notes` column and before `createdAt`:

```ts
  templateId:  integer("template_id").references(() => expenseTemplatesTable.id, { onDelete: "set null" }),
```

The full `expensesTable` definition after the change:
```ts
export const expensesTable = table("expenses", {
  id:          id(),
  branchId:    integer("branch_id").references(() => branchesTable.id, { onDelete: "set null" }),
  category:    text("category", { enum: ["rent", "utilities", "salaries", "materials", "maintenance", "other"] }).notNull(),
  description: text("description").notNull(),
  amount:      real("amount").notNull(),
  expenseDate: text("expense_date").notNull(),
  notes:       text("notes"),
  templateId:  integer("template_id").references(() => expenseTemplatesTable.id, { onDelete: "set null" }),
  createdAt:   timestamp("created_at").notNull().defaultNow(),
});
```

- [ ] **Step 3: Export the new table from the schema barrel**

Open `lib/db/src/schema/index.ts`. Add this line after `export * from "./expenses"`:

```ts
export * from "./expense-templates";
```

- [ ] **Step 4: Push schema to the development database**

Run from the repo root:
```bash
pnpm --filter @workspace/db run push:dev
```

Expected output: Drizzle prints the SQL it executed, including `CREATE TABLE expense_templates` and `ALTER TABLE expenses ADD COLUMN template_id`. No errors.

If prompted to accept data loss, type `y` (adding a nullable column is safe).

- [ ] **Step 5: Verify the new table exists**

```bash
cd artifacts/api-server
node -e "
import('@libsql/client').then(({createClient}) => {
  const c = createClient({ url: 'file:./dev.db' });
  c.execute('SELECT name FROM sqlite_master WHERE type=\"table\" AND name=\"expense_templates\"').then(r => { console.log(r.rows); process.exit(0); });
});
"
```

Expected: `[ { name: 'expense_templates' } ]`

---

### Task 2: API Routes

**Files:**
- Create: `artifacts/api-server/src/routes/expense-templates.ts`
- Modify: `artifacts/api-server/src/routes/index.ts`

- [ ] **Step 1: Create the route file**

Create `artifacts/api-server/src/routes/expense-templates.ts`:

```ts
import { Router, type IRouter, type Request, type Response } from "express";
import { eq, and, gte, lte } from "drizzle-orm";
import { db, expenseTemplatesTable, expensesTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

// GET /api/expense-templates
router.get("/expense-templates", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const templates = await db.select().from(expenseTemplatesTable).orderBy(expenseTemplatesTable.createdAt);
  res.json(templates.map(t => ({ ...t, defaultAmount: parseFloat(String(t.defaultAmount)) })));
});

// POST /api/expense-templates
router.post("/expense-templates", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { name, category, defaultAmount, branchId } = req.body;
  if (!name || !category || defaultAmount == null) {
    res.status(400).json({ error: "name, category, and defaultAmount are required" });
    return;
  }
  const [template] = await db.insert(expenseTemplatesTable).values({
    name,
    category,
    defaultAmount,
    branchId: branchId ? parseInt(branchId) : null,
    isActive: true,
  }).returning();
  if (!template) { res.status(500).json({ error: "Failed to create template" }); return; }
  res.status(201).json({ ...template, defaultAmount: parseFloat(String(template.defaultAmount)) });
});

// POST /api/expense-templates/generate  ← MUST be before /:id routes
router.post("/expense-templates/generate", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { month, amounts } = req.body;
  // month: "2026-04", amounts: [{ templateId: number, amount: number }]
  if (!month || !Array.isArray(amounts) || amounts.length === 0) {
    res.status(400).json({ error: "month and amounts[] are required" });
    return;
  }
  const [year, mon] = month.split("-");
  const startDate = `${year}-${mon}-01`;
  const endDate   = `${year}-${mon}-31`;

  const skipped: number[] = [];
  const created: unknown[] = [];

  for (const { templateId, amount } of amounts) {
    const existing = await db.select({ id: expensesTable.id })
      .from(expensesTable)
      .where(and(
        eq(expensesTable.templateId, templateId),
        gte(expensesTable.expenseDate, startDate),
        lte(expensesTable.expenseDate, endDate),
      ));
    if (existing.length > 0) { skipped.push(templateId); continue; }

    const [tmpl] = await db.select().from(expenseTemplatesTable).where(eq(expenseTemplatesTable.id, templateId));
    if (!tmpl) continue;

    const [expense] = await db.insert(expensesTable).values({
      templateId,
      description: tmpl.name,
      category:    tmpl.category,
      amount,
      expenseDate: startDate,
      branchId:    tmpl.branchId ?? null,
      notes:       null,
    }).returning();
    if (expense) created.push({ ...expense, amount: parseFloat(String(expense.amount)) });
  }

  res.json({ created, skipped });
});

// PUT /api/expense-templates/:id
router.put("/expense-templates/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const updates: Record<string, unknown> = {};
  const { name, category, defaultAmount, isActive } = req.body;
  if (name != null)          updates.name = name;
  if (category != null)      updates.category = category;
  if (defaultAmount != null) updates.defaultAmount = defaultAmount;
  if (isActive != null)      updates.isActive = isActive;

  const [template] = await db.update(expenseTemplatesTable).set(updates).where(eq(expenseTemplatesTable.id, id)).returning();
  if (!template) { res.status(404).json({ error: "Template not found" }); return; }
  res.json({ ...template, defaultAmount: parseFloat(String(template.defaultAmount)) });
});

// DELETE /api/expense-templates/:id
router.delete("/expense-templates/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.update(expensesTable).set({ templateId: null }).where(eq(expensesTable.templateId, id));
  await db.delete(expenseTemplatesTable).where(eq(expenseTemplatesTable.id, id));
  res.json({ message: "Template deleted" });
});

export default router;
```

- [ ] **Step 2: Register the router**

Open `artifacts/api-server/src/routes/index.ts`. Add this import after the `expensesRouter` import line:

```ts
import expenseTemplatesRouter from "./expense-templates";
```

Add this `router.use` line immediately after `router.use(expensesRouter)`:

```ts
router.use(expenseTemplatesRouter);
```

- [ ] **Step 3: Rebuild and restart the API server**

```bash
cd artifacts/api-server
pnpm run build
```

Then kill the current server process and start it again:
```bash
node ./dist/index.mjs
```

- [ ] **Step 4: Verify the endpoints respond**

```bash
# List templates (empty at first)
curl -s http://localhost:3000/api/expense-templates \
  -H "Cookie: <paste your session cookie here>"
# Expected: []

# Create a template
curl -s -X POST http://localhost:3000/api/expense-templates \
  -H "Content-Type: application/json" \
  -H "Cookie: <paste your session cookie here>" \
  -d '{"name":"إيجار المقر","category":"rent","defaultAmount":15000}'
# Expected: { id: 1, name: "إيجار المقر", category: "rent", defaultAmount: 15000, isActive: true, ... }
```

---

### Task 3: API Client Hooks

**Files:**
- Create: `lib/api-client-react/src/expense-templates-api.ts`
- Modify: `lib/api-client-react/src/index.ts`

- [ ] **Step 1: Create the hooks file**

Create `lib/api-client-react/src/expense-templates-api.ts`:

```ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "./custom-fetch";

export interface ExpenseTemplate {
  id: number;
  branchId: number | null;
  name: string;
  category: "rent" | "utilities" | "salaries" | "materials" | "maintenance" | "other";
  defaultAmount: number;
  isActive: boolean;
  createdAt: string;
}

export interface GenerateExpensesResult {
  created: Array<{
    id: number;
    templateId: number | null;
    description: string;
    category: string;
    amount: number;
    expenseDate: string;
  }>;
  skipped: number[];
}

const templatesQueryKey = () => ["/api/expense-templates"] as const;

export const useListExpenseTemplates = () =>
  useQuery({
    queryKey: templatesQueryKey(),
    queryFn: () => customFetch<ExpenseTemplate[]>("/api/expense-templates"),
  });

export const useCreateExpenseTemplate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; category: string; defaultAmount: number; branchId?: number }) =>
      customFetch<ExpenseTemplate>("/api/expense-templates", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: templatesQueryKey() }),
  });
};

export const useUpdateExpenseTemplate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: { name?: string; category?: string; defaultAmount?: number; isActive?: boolean } }) =>
      customFetch<ExpenseTemplate>(`/api/expense-templates/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: templatesQueryKey() }),
  });
};

export const useDeleteExpenseTemplate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      customFetch<{ message: string }>(`/api/expense-templates/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: templatesQueryKey() }),
  });
};

export const useGenerateExpenses = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { month: string; amounts: Array<{ templateId: number; amount: number }> }) =>
      customFetch<GenerateExpensesResult>("/api/expense-templates/generate", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/expenses"] });
      qc.invalidateQueries({ queryKey: templatesQueryKey() });
      qc.invalidateQueries({ queryKey: ["/api/dashboard/revenue"] });
    },
  });
};
```

- [ ] **Step 2: Export from the package index**

Open `lib/api-client-react/src/index.ts`. Add this line after the `export * from "./payments-api"` line:

```ts
export * from "./expense-templates-api";
```

- [ ] **Step 3: Verify TypeScript compilation**

```bash
cd artifacts/kidspeak
pnpm tsc --noEmit
```

Expected: no errors mentioning `expense-templates-api`.

---

### Task 4: Frontend — Templates Section + Template Dialog

**Files:**
- Modify: `artifacts/kidspeak/src/pages/revenue/index.tsx`

- [ ] **Step 1: Add new imports**

At the top of `revenue/index.tsx`, find the existing import from `@workspace/api-client-react`:
```ts
import { useGetRevenueDashboard, useListExpenses, useCreateExpense } from "@workspace/api-client-react";
```

Replace it with:
```ts
import {
  useGetRevenueDashboard, useListExpenses, useCreateExpense,
  useListExpenseTemplates, useCreateExpenseTemplate, useUpdateExpenseTemplate,
  useDeleteExpenseTemplate,
  type ExpenseTemplate,
} from "@workspace/api-client-react";
```

Add `Pencil, Trash2` to the lucide-react imports:
```ts
import { Plus, ArrowUpRight, ArrowDownRight, TrendingUp, TrendingDown, Receipt as ReceiptIcon, Minus, Equal, Pencil, Trash2 } from "lucide-react";
```

Add `DialogFooter, DialogClose` to the shadcn Dialog imports:
```ts
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
```

- [ ] **Step 2: Add isRTL and new state/hooks to the component**

Inside `RevenueDashboard()`, find the `useLanguage` line:
```ts
const { t } = useLanguage();
```
Replace with:
```ts
const { t, isRTL } = useLanguage();
```

After the existing hooks (`useGetRevenueDashboard`, `useListExpenses`, `useCreateExpense`), add:

```ts
const { data: templates = [] } = useListExpenseTemplates();
const { mutate: createTemplate, isPending: isCreatingTemplate } = useCreateExpenseTemplate();
const { mutate: updateTemplate, isPending: isUpdatingTemplate } = useUpdateExpenseTemplate();
const { mutate: deleteTemplate } = useDeleteExpenseTemplate();

const [isTemplateOpen, setIsTemplateOpen] = useState(false);
const [editingTemplate, setEditingTemplate] = useState<ExpenseTemplate | null>(null);
const [templateForm, setTemplateForm] = useState({ name: "", category: "other", defaultAmount: "" });
```

- [ ] **Step 3: Add handleSaveTemplate function**

After the existing `onSubmitExpense` function, add:

```ts
const handleSaveTemplate = () => {
  if (!templateForm.name || !templateForm.defaultAmount) return;
  const payload = {
    name: templateForm.name,
    category: templateForm.category,
    defaultAmount: parseFloat(templateForm.defaultAmount),
  };
  if (editingTemplate) {
    updateTemplate({ id: editingTemplate.id, data: payload }, {
      onSuccess: () => { setIsTemplateOpen(false); setEditingTemplate(null); setTemplateForm({ name: "", category: "other", defaultAmount: "" }); },
    });
  } else {
    createTemplate(payload, {
      onSuccess: () => { setIsTemplateOpen(false); setTemplateForm({ name: "", category: "other", defaultAmount: "" }); },
    });
  }
};
```

- [ ] **Step 4: Add templates section to JSX**

In the JSX return, find the Profit & Loss card block (it starts with `{(() => {` and contains `BRAND_BLUE`). Insert the templates section **immediately after** the closing `})()}` of that P&L block:

```tsx
{/* ─── Fixed Expense Templates ─── */}
<Card>
  <CardHeader className="pb-3">
    <div className="flex items-center justify-between">
      <CardTitle className="text-base">{isRTL ? "المصاريف الثابتة (القوالب)" : "Fixed Expense Templates"}</CardTitle>
      <Button
        size="sm"
        variant="outline"
        onClick={() => { setEditingTemplate(null); setTemplateForm({ name: "", category: "other", defaultAmount: "" }); setIsTemplateOpen(true); }}
        className="gap-1.5"
      >
        <Plus className="w-3.5 h-3.5" />
        {isRTL ? "إضافة قالب" : "Add Template"}
      </Button>
    </div>
  </CardHeader>
  <CardContent>
    {templates.length === 0 ? (
      <p className="text-sm text-muted-foreground text-center py-4">
        {isRTL ? "لا توجد قوالب بعد. أضف مصروفاً ثابتاً للبدء." : "No templates yet. Add a fixed expense to start."}
      </p>
    ) : (
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-muted-foreground">
            <th className="text-start pb-2 font-medium">{isRTL ? "الاسم" : "Name"}</th>
            <th className="text-start pb-2 font-medium">{isRTL ? "الفئة" : "Category"}</th>
            <th className="text-start pb-2 font-medium">{isRTL ? "المبلغ الافتراضي" : "Default Amount"}</th>
            <th className="text-start pb-2 font-medium">{isRTL ? "الحالة" : "Status"}</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {templates.map(tmpl => (
            <tr key={tmpl.id} className="border-b last:border-0">
              <td className="py-2.5">{tmpl.name}</td>
              <td className="py-2.5 text-muted-foreground">{t.revenue.categories[tmpl.category as keyof typeof t.revenue.categories]}</td>
              <td className="py-2.5 font-medium">{tmpl.defaultAmount.toLocaleString()} {isRTL ? "دج" : "DZD"}</td>
              <td className="py-2.5">
                <button
                  onClick={() => updateTemplate({ id: tmpl.id, data: { isActive: !tmpl.isActive } })}
                  className={`text-xs px-2 py-0.5 rounded-full font-medium transition-colors ${
                    tmpl.isActive
                      ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                      : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  }`}
                >
                  {tmpl.isActive ? (isRTL ? "نشط" : "Active") : (isRTL ? "معطّل" : "Inactive")}
                </button>
              </td>
              <td className="py-2.5">
                <div className="flex gap-1 justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => {
                      setEditingTemplate(tmpl);
                      setTemplateForm({ name: tmpl.name, category: tmpl.category, defaultAmount: String(tmpl.defaultAmount) });
                      setIsTemplateOpen(true);
                    }}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                    onClick={() => deleteTemplate(tmpl.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    )}
  </CardContent>
</Card>

{/* ─── Add/Edit Template Dialog ─── */}
<Dialog open={isTemplateOpen} onOpenChange={open => { setIsTemplateOpen(open); if (!open) { setEditingTemplate(null); setTemplateForm({ name: "", category: "other", defaultAmount: "" }); } }}>
  <DialogContent className="sm:max-w-sm">
    <DialogHeader>
      <DialogTitle>
        {editingTemplate ? (isRTL ? "تعديل القالب" : "Edit Template") : (isRTL ? "إضافة قالب" : "Add Template")}
      </DialogTitle>
    </DialogHeader>
    <div className="space-y-4 py-2">
      <div className="space-y-1.5">
        <label className="text-sm font-medium">{isRTL ? "الاسم" : "Name"}</label>
        <Input
          placeholder={isRTL ? "مثال: إيجار المقر" : "e.g. Rent"}
          value={templateForm.name}
          onChange={e => setTemplateForm(f => ({ ...f, name: e.target.value }))}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">{isRTL ? "الفئة" : "Category"}</label>
          <Select value={templateForm.category} onValueChange={v => setTemplateForm(f => ({ ...f, category: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="rent">{t.revenue.categories.rent}</SelectItem>
              <SelectItem value="utilities">{t.revenue.categories.utilities}</SelectItem>
              <SelectItem value="salaries">{t.revenue.categories.salaries}</SelectItem>
              <SelectItem value="materials">{t.revenue.categories.materials}</SelectItem>
              <SelectItem value="maintenance">{t.revenue.categories.maintenance}</SelectItem>
              <SelectItem value="other">{t.revenue.categories.other}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">{isRTL ? "المبلغ الافتراضي (دج)" : "Default Amount (DZD)"}</label>
          <Input
            type="number"
            min="0"
            placeholder="0"
            value={templateForm.defaultAmount}
            onChange={e => setTemplateForm(f => ({ ...f, defaultAmount: e.target.value }))}
          />
        </div>
      </div>
    </div>
    <DialogFooter>
      <DialogClose asChild>
        <Button variant="outline">{isRTL ? "إلغاء" : "Cancel"}</Button>
      </DialogClose>
      <Button
        style={{ backgroundColor: "#1B2E8F", color: "white" }}
        className="font-semibold"
        onClick={handleSaveTemplate}
        disabled={isCreatingTemplate || isUpdatingTemplate || !templateForm.name || !templateForm.defaultAmount}
      >
        {isCreatingTemplate ? (isRTL ? "جارٍ الحفظ..." : "Saving...") : (isRTL ? "حفظ" : "Save")}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

- [ ] **Step 5: Verify in browser**

Open the finance page. Confirm:
- "المصاريف الثابتة" section appears after the P&L card
- "إضافة قالب" opens a dialog with name, category, defaultAmount fields
- After saving, the template appears in the table
- Edit button pre-fills the dialog
- Active/Inactive toggle updates the badge color
- Delete removes the row

---

### Task 5: Frontend — Generate Dialog

**Files:**
- Modify: `artifacts/kidspeak/src/pages/revenue/index.tsx`

- [ ] **Step 1: Add useGenerateExpenses import**

Find the import from `@workspace/api-client-react` (updated in Task 4). Add `useGenerateExpenses` to it:

```ts
import {
  useGetRevenueDashboard, useListExpenses, useCreateExpense,
  useListExpenseTemplates, useCreateExpenseTemplate, useUpdateExpenseTemplate,
  useDeleteExpenseTemplate, useGenerateExpenses,
  type ExpenseTemplate,
} from "@workspace/api-client-react";
```

- [ ] **Step 2: Add generate state and hook**

After the `useDeleteExpenseTemplate` line, add:

```ts
const { mutate: generateExpenses, isPending: isGenerating } = useGenerateExpenses();

const [isGenerateOpen, setIsGenerateOpen] = useState(false);
const [generateAmounts, setGenerateAmounts] = useState<Record<number, { amount: number; checked: boolean }>>({});
```

- [ ] **Step 3: Compute already-generated template IDs**

After the templates hooks block, add this derived value:

```ts
const generatedTemplateIds = new Set(
  (expenses as any[]).filter(e => e.templateId != null).map((e: any) => e.templateId as number)
);

const activeTemplates = templates.filter(t => t.isActive);
```

- [ ] **Step 4: Add handleGenerate function**

After `handleSaveTemplate`, add:

```ts
const openGenerateDialog = () => {
  const initial: Record<number, { amount: number; checked: boolean }> = {};
  activeTemplates.forEach(t => {
    initial[t.id] = { amount: t.defaultAmount, checked: true };
  });
  setGenerateAmounts(initial);
  setIsGenerateOpen(true);
};

const handleGenerate = () => {
  const amounts = activeTemplates
    .filter(t => !generatedTemplateIds.has(t.id) && generateAmounts[t.id]?.checked !== false)
    .map(t => ({ templateId: t.id, amount: generateAmounts[t.id]?.amount ?? t.defaultAmount }));
  if (amounts.length === 0) { setIsGenerateOpen(false); return; }
  generateExpenses({ month, amounts }, {
    onSuccess: (result) => {
      toast({ title: isRTL ? `تم توليد ${result.created.length} مصروف` : `Generated ${result.created.length} expense(s)` });
      setIsGenerateOpen(false);
    },
    onError: () => toast({ title: "Error", variant: "destructive" }),
  });
};
```

- [ ] **Step 5: Add "توليد مصاريف" button next to the existing button**

Find the existing header button area. The current header div ends with the `<Dialog>` trigger for "تسجيل مصروف". Add the generate button **before** that Dialog:

Find this block in the header:
```tsx
<div className="flex items-center gap-4">
  <Input
    type="month"
    value={month}
    onChange={(e) => setMonth(e.target.value)}
    className="w-40"
  />
  <Dialog open={isExpenseOpen} onOpenChange={setIsExpenseOpen}>
```

Replace the `<div className="flex items-center gap-4">` opening with the generate button added inside:
```tsx
<div className="flex items-center gap-4">
  <Input
    type="month"
    value={month}
    onChange={(e) => setMonth(e.target.value)}
    className="w-40"
  />
  {activeTemplates.length > 0 && (
    <Button
      variant="outline"
      onClick={openGenerateDialog}
      className="gap-1.5 font-semibold"
      style={{ borderColor: "#1B2E8F50", color: "#1B2E8F" }}
    >
      {isRTL ? `توليد مصاريف ${month}` : `Generate ${month}`}
    </Button>
  )}
  <Dialog open={isExpenseOpen} onOpenChange={setIsExpenseOpen}>
```

- [ ] **Step 6: Add the Generate Dialog JSX**

After the Add/Edit Template Dialog closing tag (from Task 4), add:

```tsx
{/* ─── Generate Expenses Dialog ─── */}
<Dialog open={isGenerateOpen} onOpenChange={setIsGenerateOpen}>
  <DialogContent className="sm:max-w-md">
    <DialogHeader>
      <DialogTitle>
        {isRTL ? `توليد مصاريف ${month}` : `Generate Expenses for ${month}`}
      </DialogTitle>
    </DialogHeader>
    <div className="space-y-2 py-2 max-h-80 overflow-y-auto">
      {activeTemplates.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          {isRTL ? "لا توجد قوالب نشطة" : "No active templates"}
        </p>
      ) : activeTemplates.map(tmpl => {
        const alreadyGenerated = generatedTemplateIds.has(tmpl.id);
        const entry = generateAmounts[tmpl.id] ?? { amount: tmpl.defaultAmount, checked: true };
        return (
          <div
            key={tmpl.id}
            className={`flex items-center gap-3 p-2 rounded-lg border ${alreadyGenerated ? "opacity-50 bg-muted/30" : "bg-background"}`}
          >
            <input
              type="checkbox"
              className="w-4 h-4 accent-blue-700"
              checked={!alreadyGenerated && entry.checked}
              disabled={alreadyGenerated}
              onChange={e => setGenerateAmounts(prev => ({
                ...prev,
                [tmpl.id]: { ...entry, checked: e.target.checked },
              }))}
            />
            <span className="flex-1 text-sm font-medium">{tmpl.name}</span>
            {alreadyGenerated ? (
              <span className="text-xs text-emerald-600 font-medium shrink-0">مولَّد ✓</span>
            ) : (
              <div className="flex items-center gap-1.5 shrink-0">
                <Input
                  type="number"
                  min="0"
                  className="w-28 h-7 text-sm"
                  value={entry.amount}
                  onChange={e => setGenerateAmounts(prev => ({
                    ...prev,
                    [tmpl.id]: { ...entry, amount: parseFloat(e.target.value) || 0 },
                  }))}
                />
                <span className="text-xs text-muted-foreground">دج</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
    {/* Total */}
    <div className="border-t pt-3 flex justify-between items-center text-sm font-semibold">
      <span>{isRTL ? "المجموع" : "Total"}</span>
      <span style={{ color: "#1B2E8F" }}>
        {activeTemplates
          .filter(t => !generatedTemplateIds.has(t.id) && (generateAmounts[t.id]?.checked !== false))
          .reduce((sum, t) => sum + (generateAmounts[t.id]?.amount ?? t.defaultAmount), 0)
          .toLocaleString()} {isRTL ? "دج" : "DZD"}
      </span>
    </div>
    <DialogFooter>
      <DialogClose asChild>
        <Button variant="outline" disabled={isGenerating}>{isRTL ? "إلغاء" : "Cancel"}</Button>
      </DialogClose>
      <Button
        style={{ backgroundColor: "#1B2E8F", color: "white" }}
        className="font-semibold"
        onClick={handleGenerate}
        disabled={isGenerating}
      >
        {isGenerating ? (isRTL ? "جارٍ التوليد..." : "Generating...") : (isRTL ? "تأكيد التوليد" : "Confirm")}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

- [ ] **Step 7: Final verification in browser**

1. Finance page loads with "توليد مصاريف" button visible (when templates exist)
2. Click "توليد مصاريف 2026-04" → dialog opens with all active templates, pre-filled amounts, total sum
3. Change an amount → total updates live
4. Uncheck a template → it's excluded from the total
5. Click "تأكيد التوليد" → expenses appear in the expense log below
6. Open the dialog again for the same month → generated templates show "مولَّد ✓" greyed out
7. The stat cards (totalExpenses, net profit) update to reflect the new expenses

---

## Acceptance Checklist

- [ ] `expense_templates` table in DB with correct columns
- [ ] `expenses.template_id` nullable FK column exists
- [ ] GET/POST/PUT/DELETE `/api/expense-templates` return correct data
- [ ] POST `/api/expense-templates/generate` creates expenses and skips duplicates
- [ ] Finance page shows templates list with add/edit/delete/toggle-active
- [ ] "توليد مصاريف" button appears in header when active templates exist
- [ ] Generate dialog shows active templates with editable amounts + live total
- [ ] Already-generated templates are greyed out with "مولَّد ✓"
- [ ] After generation, expense log and stat cards refresh automatically
- [ ] Variable expenses (تسجيل مصروف) still work unchanged
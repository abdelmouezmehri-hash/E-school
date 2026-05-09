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

// POST /api/expense-templates/generate  ← defined before /:id to avoid route conflict
router.post("/expense-templates/generate", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { month, amounts } = req.body;
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
    if (!tmpl) { skipped.push(templateId); continue; }

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
  const id = parseInt((req.params.id as string));
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
  const id = parseInt((req.params.id as string));
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.update(expensesTable).set({ templateId: null }).where(eq(expensesTable.templateId, id));
  await db.delete(expenseTemplatesTable).where(eq(expenseTemplatesTable.id, id));
  res.json({ message: "Template deleted" });
});

export default router;
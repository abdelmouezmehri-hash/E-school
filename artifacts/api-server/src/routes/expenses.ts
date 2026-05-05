import { Router, type IRouter, type Request, type Response } from "express";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { db, expensesTable } from "@workspace/db";
import { CreateExpenseBody, ListExpensesQueryParams, UpdateExpenseParams, DeleteExpenseParams } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/expenses", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const params = ListExpensesQueryParams.safeParse(req.query);

  let expenses = await db.select().from(expensesTable).orderBy(expensesTable.expenseDate);

  if (params.success) {
    if (params.data.month) {
      const [year, month] = params.data.month.split("-").map(Number);
      const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
      const endDate = `${year}-${String(month).padStart(2, "0")}-31`;
      expenses = await db.select().from(expensesTable)
        .where(and(gte(expensesTable.expenseDate, startDate), lte(expensesTable.expenseDate, endDate)))
        .orderBy(expensesTable.expenseDate);
    }
    if (params.data.category) {
      expenses = expenses.filter(e => e.category === params.data.category);
    }
  }

  // Branch filter
  const branchIdParam = (req.query.branchId as string);
  if (branchIdParam) {
    const bid = parseInt(branchIdParam as string);
    if (!isNaN(bid)) {
      expenses = expenses.filter(e => (e as any).branchId === bid);
    }
  }

  res.json(expenses.map(e => ({
    ...e,
    amount: e.amount,
    createdAt: e.createdAt.toISOString(),
  })));
});

router.post("/expenses", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const parsed = CreateExpenseBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const body = req.body as Record<string, unknown>;
  const [expense] = await db.insert(expensesTable).values({
    category: parsed.data.category,
    description: parsed.data.description,
    amount: parsed.data.amount,
    expenseDate: parsed.data.expenseDate instanceof Date ? parsed.data.expenseDate.toISOString().split("T")[0] : String(parsed.data.expenseDate),
    notes: parsed.data.notes ?? null,
    branchId: body.branchId ? parseInt(body.branchId as string) : null,
  }).returning();

  if (!expense) {
    res.status(500).json({ error: "Failed to create expense" });
    return;
  }

  res.status(201).json({ ...expense, amount: expense.amount, createdAt: expense.createdAt.toISOString() });
});

router.put("/expenses/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const params = UpdateExpenseParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = CreateExpenseBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [expense] = await db.update(expensesTable).set({
    category: parsed.data.category,
    description: parsed.data.description,
    amount: parsed.data.amount,
    expenseDate: parsed.data.expenseDate instanceof Date ? parsed.data.expenseDate.toISOString().split("T")[0] : String(parsed.data.expenseDate),
    notes: parsed.data.notes ?? null,
  }).where(eq(expensesTable.id, params.data.id)).returning();

  if (!expense) {
    res.status(404).json({ error: "Expense not found" });
    return;
  }

  res.json({ ...expense, amount: expense.amount, createdAt: expense.createdAt.toISOString() });
});

router.delete("/expenses/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const params = DeleteExpenseParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [expense] = await db.delete(expensesTable).where(eq(expensesTable.id, params.data.id)).returning({ id: expensesTable.id });
  if (!expense) {
    res.status(404).json({ error: "Expense not found" });
    return;
  }

  res.json({ message: "Expense deleted successfully" });
});

export default router;

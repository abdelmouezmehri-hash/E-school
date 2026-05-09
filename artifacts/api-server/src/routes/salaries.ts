import { Router, type Request, type Response } from "express";
import { db, salariesTable, expensesTable, usersTable, paymentsTable } from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// SALARIES — canonical employee-payment ledger.
// Every salary INSERT creates a paired row in `expenses` linked via
// `expenses.salary_id`. DELETE cascades through the FK; we never match on
// (category, amount, date) anymore.
// ─────────────────────────────────────────────────────────────────────────────

// GET /salaries/my — own salary history (any authenticated employee)
router.get("/salaries/my", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user as { id: number };

  const rows = await db
    .select({
      id: salariesTable.id,
      employeeId: salariesTable.employeeId,
      amount: salariesTable.amount,
      period: salariesTable.period,
      note: salariesTable.note,
      paidAt: salariesTable.paidAt,
      profitSharePercent: salariesTable.profitSharePercent,
      createdAt: salariesTable.createdAt,
    })
    .from(salariesTable)
    .where(eq(salariesTable.employeeId, user.id))
    .orderBy(desc(salariesTable.paidAt));

  const totalEarned = rows.reduce((sum, r) => sum + parseFloat(String(r.amount ?? "0")), 0);
  const totalPaid = rows.filter(r => r.paidAt).reduce((sum, r) => sum + parseFloat(String(r.amount ?? "0")), 0);
  const balance = totalEarned - totalPaid;

  res.json({
    salaries: rows,
    summary: { totalEarned, totalPaid, balance },
  });
});

// GET /salaries/admin-summary — admin's base salary + profit share summary
router.get("/salaries/admin-summary", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user as { role: string; id: number };
  if (user.role !== "admin") {
    res.status(403).json({ error: "Admin only" });
    return;
  }

  const now = new Date();
  const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const [latestSalary] = await db
    .select({
      amount: salariesTable.amount,
      profitSharePercent: salariesTable.profitSharePercent,
      period: salariesTable.period,
      paidAt: salariesTable.paidAt,
    })
    .from(salariesTable)
    .where(eq(salariesTable.employeeId, user.id))
    .orderBy(desc(salariesTable.paidAt))
    .limit(1);

  const [revenueRow] = await db
    .select({
      total: sql<number>`CAST(COALESCE(SUM(CAST(${paymentsTable.amountPaid} AS REAL)), 0) AS REAL)`,
    })
    .from(paymentsTable)
    .where(
      sql`EXTRACT(YEAR FROM ${paymentsTable.paidAt}) = ${now.getFullYear()} AND EXTRACT(MONTH FROM ${paymentsTable.paidAt}) = ${now.getMonth() + 1}`,
    );

  const [expenseRow] = await db
    .select({
      total: sql<number>`CAST(COALESCE(SUM(${expensesTable.amount}), 0) AS REAL)`,
    })
    .from(expensesTable)
    .where(sql`${expensesTable.expenseDate} LIKE ${monthPrefix + "%"}`);

  const totalRevenue = revenueRow?.total ?? 0;
  const totalExpenses = expenseRow?.total ?? 0;
  const netRevenue = totalRevenue - totalExpenses;

  const baseSalary = latestSalary?.amount ?? 0;
  const profitSharePercent = latestSalary?.profitSharePercent ?? null;
  const profitShareAmount = profitSharePercent != null ? (profitSharePercent / 100) * netRevenue : null;
  const totalEarnings = baseSalary + (profitShareAmount ?? 0);

  res.json({
    baseSalary,
    profitSharePercent,
    profitShareAmount,
    netRevenue,
    totalEarnings,
    period: latestSalary?.period ?? null,
    paidAt: latestSalary?.paidAt ?? null,
  });
});

// GET /salaries — list all (admin only)
router.get("/salaries", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user as { role: string };
  if (user.role !== "admin") {
    res.status(403).json({ error: "Admin only" });
    return;
  }

  const rows = await db
    .select({
      id: salariesTable.id,
      employeeId: salariesTable.employeeId,
      amount: salariesTable.amount,
      period: salariesTable.period,
      note: salariesTable.note,
      paidAt: salariesTable.paidAt,
      profitSharePercent: salariesTable.profitSharePercent,
      createdAt: salariesTable.createdAt,
      employeeName: usersTable.name,
      employeeRole: usersTable.role,
      employeeBranchId: usersTable.branchId,
    })
    .from(salariesTable)
    .leftJoin(usersTable, eq(salariesTable.employeeId, usersTable.id))
    .orderBy(desc(salariesTable.paidAt));

  res.json(rows);
});

// GET /salaries/employee/:id — salary history for a specific employee (admin only)
router.get("/salaries/employee/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user as { role: string };
  if (user.role !== "admin") {
    res.status(403).json({ error: "Admin only" });
    return;
  }

  const empId = parseInt(req.params.id as string);
  if (isNaN(empId)) {
    res.status(400).json({ error: "Invalid employee id" });
    return;
  }

  const rows = await db
    .select()
    .from(salariesTable)
    .where(eq(salariesTable.employeeId, empId))
    .orderBy(desc(salariesTable.paidAt));

  res.json(rows);
});

// POST /salaries — add salary payment (admin only).
// Atomically creates BOTH the salary row AND its paired expense row, linked
// via expenses.salary_id. We attribute the expense to the EMPLOYEE's branch
// (not the admin's), and we use the salaries category.
router.post("/salaries", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user as { role: string };
  if (user.role !== "admin") {
    res.status(403).json({ error: "Admin only" });
    return;
  }

  const { employeeId, amount, period, note, paidAt, profitSharePercent } = req.body as {
    employeeId: number;
    amount: number;
    period: string;
    note?: string;
    paidAt: string;
    profitSharePercent?: number | null;
  };

  if (!employeeId || !amount || !period || !paidAt) {
    res.status(400).json({ error: "employeeId, amount, period and paidAt are required" });
    return;
  }

  // Look up the employee — used for both validation and expense attribution.
  const [employee] = await db
    .select({ id: usersTable.id, name: usersTable.name, branchId: usersTable.branchId })
    .from(usersTable)
    .where(eq(usersTable.id, employeeId));

  if (!employee) {
    res.status(404).json({ error: "Employee not found" });
    return;
  }

  // Wrap both inserts in a transaction — if the expense fails, the salary is rolled back too.
  const salary = await db.transaction(async (tx) => {
    // 1. Insert the salary row.
    const [newSalary] = await tx
      .insert(salariesTable)
      .values({
        employeeId,
        amount,
        period,
        note: note || null,
        paidAt,
        profitSharePercent: profitSharePercent ?? null,
      })
      .returning();

    // 2. Insert the paired expense row, linked via salary_id.
    //    Cascade delete will fire when the salary is deleted.
    await tx.insert(expensesTable).values({
      category: "salaries",
      description: `راتب ${employee.name} — ${period}`,
      amount,
      expenseDate: paidAt,
      notes: note || null,
      branchId: employee.branchId ?? null,
      salaryId: newSalary.id,
    });

    return newSalary;
  });

  res.status(201).json(salary);
});

// DELETE /salaries/:id — remove salary entry. The paired expense is removed
// automatically by the FK cascade on expenses.salary_id.
router.delete("/salaries/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user as { role: string };
  if (user.role !== "admin") {
    res.status(403).json({ error: "Admin only" });
    return;
  }

  const id = parseInt(req.params.id as string);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const result = await db.delete(salariesTable).where(eq(salariesTable.id, id)).returning({ id: salariesTable.id });
  if (result.length === 0) {
    res.status(404).json({ error: "Salary not found" });
    return;
  }

  res.json({ success: true });
});

export default router;

import { Router, type IRouter, type Request, type Response } from "express";
import { eq, and, desc, ne } from "drizzle-orm";
import {
  db,
  usersTable,
  classSessionsTable,
  adhocSessionsTable,
  supportSessionsTable,
  staffPaymentRequestsTable,
  salariesTable,
  expensesTable,
} from "@workspace/db";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

// ─────────────────────────────────────────────────────────────────────────────
// EARNINGS — single source of truth for staff financials.
//
// The previous version read payments from BOTH `teacher_payments` AND
// `salaries`, which double-counted approved staff_payment_requests and made
// the dashboard show 0 for monthly-paid staff with no sessions.
//
// New rules:
//   - All paid amounts come from `salaries` ONLY. (teacher_payments is no
//     longer written; the legacy POST /teacher-payments endpoint below
//     redirects writes into `salaries`.)
//   - For per_session staff, totalEarned = sessionCount * payPerSession.
//   - For monthly staff, totalEarned = elapsedMonths * monthlySalary, where
//     elapsedMonths is counted from the user's createdAt month (their hire
//     month) to the current month, inclusive.
//   - balance = totalEarned - totalPaid.
//   - Approved staff_payment_requests are surfaced separately; their amount
//     is already in totalPaid via the `salaries` row created at approval time,
//     so we DO NOT add them again.
// ─────────────────────────────────────────────────────────────────────────────

function monthsBetweenInclusive(start: Date, end: Date): number {
  const s = new Date(start.getFullYear(), start.getMonth(), 1);
  const e = new Date(end.getFullYear(), end.getMonth(), 1);
  if (e < s) return 0;
  return (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth()) + 1;
}

// GET /earnings/my — staff sees own financials
router.get("/earnings/my", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  await sendStaffEarnings(req, res, user.id);
});

// GET /earnings/summary?month=YYYY-MM — admin aggregate across all staff
router.get(
  "/earnings/summary",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const user = (req as any).user;
    if (user.role !== "admin") {
      res.status(403).json({ error: "Not authorized" });
      return;
    }

    const monthStr = String(req.query.month ?? "").trim();
    if (!/^\d{4}-\d{2}$/.test(monthStr)) {
      res.status(400).json({ error: "month is required as YYYY-MM" });
      return;
    }
    const [yearS, monthS] = monthStr.split("-");
    const year = parseInt(yearS!);
    const monthNum = parseInt(monthS!);
    const monthStart = new Date(Date.UTC(year, monthNum - 1, 1));
    const monthEnd = new Date(Date.UTC(year, monthNum, 1)); // exclusive

    // Fetch all staff (anyone with a paymentType configured)
    const staff = await db
      .select({
        id: usersTable.id,
        role: usersTable.role,
        paymentType: usersTable.paymentType,
        payPerSession: usersTable.payPerSession,
        monthlySalary: usersTable.monthlySalary,
        createdAt: usersTable.createdAt,
      })
      .from(usersTable);

    let totalEarned = 0;

    for (const s of staff) {
      if (!s.paymentType) continue;
      if (s.role === "admin" || s.role === "parent") continue;

      if (s.paymentType === "monthly") {
        // Earned for this month if the staff member was hired by month-end
        const hire = new Date(s.createdAt);
        if (hire < monthEnd) {
          totalEarned += Number(s.monthlySalary ?? 0);
        }
      } else if (s.paymentType === "per_session") {
        // Count sessions in this month (regular as teacher; psych as psychologist)
        const regular = await db
          .select({ id: classSessionsTable.id, sessionDate: classSessionsTable.sessionDate })
          .from(classSessionsTable)
          .where(
            and(
              eq(classSessionsTable.teacherId, s.id),
              ne(classSessionsTable.status as any, "planned"),
            ),
          );

        const psychAsPsych =
          s.role === "psychologist"
            ? await db
                .select({ id: classSessionsTable.id, sessionDate: classSessionsTable.sessionDate })
                .from(classSessionsTable)
                .where(
                  and(
                    eq(classSessionsTable.psychologistId, s.id),
                    ne(classSessionsTable.status as any, "planned"),
                  ),
                )
            : [];

        const adhoc =
          s.role === "psychologist"
            ? await db
                .select({ id: adhocSessionsTable.id, sessionDate: adhocSessionsTable.sessionDate })
                .from(adhocSessionsTable)
                .where(eq(adhocSessionsTable.psychologistId, s.id))
            : [];

        const support =
          s.role === "psychologist"
            ? await db
                .select({ id: supportSessionsTable.id, sessionDate: supportSessionsTable.sessionDate })
                .from(supportSessionsTable)
                .where(eq(supportSessionsTable.psychologistId, s.id))
            : [];

        const inMonth = (rows: { sessionDate: any }[]) =>
          rows.filter((r) => {
            if (!r.sessionDate) return false;
            const d = new Date(r.sessionDate);
            return d >= monthStart && d < monthEnd;
          }).length;

        const count =
          inMonth(regular) + inMonth(psychAsPsych) + inMonth(adhoc) + inMonth(support);

        totalEarned += count * Number(s.payPerSession ?? 0);
      }
    }

    // Total paid in this month (period column is YYYY-MM string)
    const paidRows = await db
      .select({ amount: salariesTable.amount })
      .from(salariesTable)
      .where(eq(salariesTable.period, monthStr));
    const totalPaid = paidRows.reduce((sum, r) => sum + Number(r.amount), 0);

    res.json({
      month: monthStr,
      totalEarned,
      totalPaid,
      balance: totalEarned - totalPaid,
    });
  },
);

// GET /earnings/teachers/:id — admin sees any staff member's financials
router.get(
  "/earnings/teachers/:id",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const user = (req as any).user;
    if (user.role !== "admin") {
      res.status(403).json({ error: "Not authorized" });
      return;
    }
    const teacherId = parseInt(req.params.id as string);
    if (!teacherId) {
      res.status(400).json({ error: "Invalid teacher ID" });
      return;
    }
    await sendStaffEarnings(req, res, teacherId);
  },
);

async function sendStaffEarnings(_req: Request, res: Response, staffId: number): Promise<void> {
  const [staff] = await db
    .select({
      id: usersTable.id,
      name: usersTable.name,
      email: usersTable.email,
      role: usersTable.role,
      paymentType: usersTable.paymentType,
      payPerSession: usersTable.payPerSession,
      monthlySalary: usersTable.monthlySalary,
      createdAt: usersTable.createdAt,
    })
    .from(usersTable)
    .where(eq(usersTable.id, staffId));

  if (!staff) {
    res.status(404).json({ error: "Staff member not found" });
    return;
  }

  // ── Sessions ──────────────────────────────────────────────────────────────
  // Regular sessions (as teacher) — exclude planned
  const regularSessions = await db
    .select({
      id: classSessionsTable.id,
      sessionDate: classSessionsTable.sessionDate,
      groupId: classSessionsTable.groupId,
      sessionKind: classSessionsTable.sessionKind,
    })
    .from(classSessionsTable)
    .where(
      and(
        eq(classSessionsTable.teacherId, staffId),
        ne(classSessionsTable.status as any, "planned"),
      ),
    )
    .orderBy(desc(classSessionsTable.sessionDate));

  // Intervention sessions (as psychologist on teacher groups)
  const interventionSessions =
    staff.role === "psychologist"
      ? await db
          .select({
            id: classSessionsTable.id,
            sessionDate: classSessionsTable.sessionDate,
            groupId: classSessionsTable.groupId,
            sessionKind: classSessionsTable.sessionKind,
          })
          .from(classSessionsTable)
          .where(
            and(
              eq(classSessionsTable.psychologistId, staffId),
              ne(classSessionsTable.status as any, "planned"),
            ),
          )
          .orderBy(desc(classSessionsTable.sessionDate))
      : [];

  // Ad-hoc sessions (psychologist)
  const adhocSessions =
    staff.role === "psychologist"
      ? await db
          .select({
            id: adhocSessionsTable.id,
            sessionDate: adhocSessionsTable.sessionDate,
          })
          .from(adhocSessionsTable)
          .where(eq(adhocSessionsTable.psychologistId, staffId))
          .orderBy(desc(adhocSessionsTable.sessionDate))
      : [];

  // Group support sessions (psychologist)
  const groupSupportSessions =
    staff.role === "psychologist"
      ? await db
          .select({
            id: supportSessionsTable.id,
            sessionDate: supportSessionsTable.sessionDate,
            groupId: supportSessionsTable.groupId,
            topic: supportSessionsTable.topic,
          })
          .from(supportSessionsTable)
          .where(eq(supportSessionsTable.psychologistId, staffId))
          .orderBy(desc(supportSessionsTable.sessionDate))
      : [];

  const allSessions = [
    ...regularSessions.map((s) => ({ ...s, kind: s.sessionKind ?? "regular" })),
    ...interventionSessions.map((s) => ({ ...s, kind: "intervention" })),
    ...adhocSessions.map((s) => ({
      id: s.id,
      sessionDate: s.sessionDate,
      groupId: null as number | null,
      kind: "adhoc",
    })),
    ...groupSupportSessions.map((s) => ({
      id: s.id,
      sessionDate: s.sessionDate,
      groupId: s.groupId,
      kind: "group_support",
    })),
  ];

  const sessionCount = allSessions.length;

  // ── Earned (accrued) ──────────────────────────────────────────────────────
  const payPerSession = staff.payPerSession ?? 0;
  const monthlySalary = staff.monthlySalary ?? 0;

  let totalEarned = 0;
  let earnedMode: "per_session" | "monthly" | "unset" = "unset";

  if (staff.paymentType === "per_session") {
    totalEarned = sessionCount * payPerSession;
    earnedMode = "per_session";
  } else if (staff.paymentType === "monthly") {
    // Show only the current month's salary — not the cumulative total
    // since hire date (which gives an inflated figure).
    totalEarned = monthlySalary;
    earnedMode = "monthly";
  }

  // ── Paid (single source of truth = salaries table) ────────────────────────
  const salaryRows = await db
    .select({
      id: salariesTable.id,
      amount: salariesTable.amount,
      period: salariesTable.period,
      note: salariesTable.note,
      paidAt: salariesTable.paidAt,
      createdAt: salariesTable.createdAt,
    })
    .from(salariesTable)
    .where(eq(salariesTable.employeeId, staffId))
    .orderBy(desc(salariesTable.paidAt));

  const totalPaid = salaryRows.reduce((sum, s) => sum + Number(s.amount), 0);

  // ── Pending requests (visible separately on the dashboard) ────────────────
  const pendingRequests = await db
    .select({ amount: staffPaymentRequestsTable.amount })
    .from(staffPaymentRequestsTable)
    .where(
      and(
        eq(staffPaymentRequestsTable.staffId, staffId),
        eq(staffPaymentRequestsTable.status, "pending"),
      ),
    );

  const totalPending = pendingRequests.reduce((sum, r) => sum + Number(r.amount), 0);

  // ── Payment History (for the UI) ──────────────────────────────────────────
  // Salaries that originated from an approved request are tagged so the UI
  // can de-duplicate against the PaymentRequestsSection if it wants to.
  const linkedSalaryIds = new Set(
    (
      await db
        .select({ linkedPaymentId: staffPaymentRequestsTable.linkedPaymentId })
        .from(staffPaymentRequestsTable)
        .where(eq(staffPaymentRequestsTable.staffId, staffId))
    )
      .map((r) => r.linkedPaymentId)
      .filter((x): x is number => x !== null),
  );

  const payments = salaryRows.map((s) => ({
    id: s.id,
    amount: s.amount,
    period: s.period,
    note: s.note,
    status: "paid" as const,
    paidAt: s.paidAt ?? null,
    createdAt: s.createdAt.toISOString(),
    fromRequest: linkedSalaryIds.has(s.id),
  }));

  res.json({
    teacher: {
      id: staff.id,
      name: staff.name,
      email: staff.email,
      role: staff.role,
      paymentType: staff.paymentType,
      payPerSession,
      monthlySalary,
    },
    sessionCount,
    regularSessionCount: regularSessions.length,
    interventionSessionCount: interventionSessions.length,
    adhocSessionCount: adhocSessions.length,
    groupSupportSessionCount: groupSupportSessions.length,
    earnedMode,
    totalEarned,
    totalPaid,
    totalPending,
    balance: totalEarned - totalPaid,
    payments,
    sessions: allSessions.slice(0, 30),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// LEGACY /teacher-payments ENDPOINTS
// Kept as thin redirects to `salaries` so the existing frontend hooks
// (useListTeacherPayments, useCreateTeacherPayment, useMarkTeacherPaymentPaid)
// keep working without changes. New code should use /salaries directly.
// ─────────────────────────────────────────────────────────────────────────────

// GET /teacher-payments — list (admin)
router.get(
  "/teacher-payments",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const user = (req as any).user;
    if (user.role !== "admin") {
      res.status(403).json({ error: "Not authorized" });
      return;
    }
    const teacherIdParam = req.query.teacherId
      ? parseInt(String(req.query.teacherId))
      : null;

    const baseQuery = db
      .select({
        id: salariesTable.id,
        teacherId: salariesTable.employeeId,
        amount: salariesTable.amount,
        period: salariesTable.period,
        note: salariesTable.note,
        paidAt: salariesTable.paidAt,
        createdAt: salariesTable.createdAt,
      })
      .from(salariesTable);

    const rows = teacherIdParam
      ? await baseQuery
          .where(eq(salariesTable.employeeId, teacherIdParam))
          .orderBy(desc(salariesTable.createdAt))
      : await baseQuery.orderBy(desc(salariesTable.createdAt));

    res.json(
      rows.map((p) => ({
        ...p,
        status: "paid" as const,
        createdAt: p.createdAt.toISOString(),
        paidAt: p.paidAt ?? null,
      })),
    );
  },
);

// POST /teacher-payments — admin creates a payment (writes to salaries + expenses)
router.post(
  "/teacher-payments",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const user = (req as any).user;
    if (user.role !== "admin") {
      res.status(403).json({ error: "Not authorized" });
      return;
    }

    const { teacherId, amount, period, note } = req.body as any;
    if (!teacherId || !amount || !period) {
      res.status(400).json({ error: "teacherId, amount, period are required" });
      return;
    }

    const [employee] = await db
      .select({ name: usersTable.name, branchId: usersTable.branchId })
      .from(usersTable)
      .where(eq(usersTable.id, teacherId));

    if (!employee) {
      res.status(404).json({ error: "Employee not found" });
      return;
    }

    const paidAtIso = new Date().toISOString().split("T")[0];

    const [salary] = await db
      .insert(salariesTable)
      .values({
        employeeId: teacherId,
        amount: Number(amount),
        period,
        note: note ?? null,
        paidAt: paidAtIso,
        profitSharePercent: null,
      })
      .returning();

    await db.insert(expensesTable).values({
      category: "salaries",
      description: `راتب ${employee.name} — ${period}`,
      amount: Number(amount),
      expenseDate: paidAtIso,
      notes: note ?? null,
      branchId: employee.branchId ?? null,
      salaryId: salary.id,
    });

    res.status(201).json({
      id: salary.id,
      teacherId: salary.employeeId,
      amount: salary.amount,
      period: salary.period,
      note: salary.note,
      status: "paid" as const,
      paidAt: salary.paidAt,
      createdAt: salary.createdAt.toISOString(),
    });
  },
);

// PUT /teacher-payments/:id/mark-paid — no-op (salaries are paid by definition)
router.put(
  "/teacher-payments/:id/mark-paid",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const user = (req as any).user;
    if (user.role !== "admin") {
      res.status(403).json({ error: "Not authorized" });
      return;
    }
    const id = parseInt(req.params.id as string);
    const [salary] = await db
      .select()
      .from(salariesTable)
      .where(eq(salariesTable.id, id));
    if (!salary) {
      res.status(404).json({ error: "Payment not found" });
      return;
    }
    res.json({
      id: salary.id,
      teacherId: salary.employeeId,
      amount: salary.amount,
      period: salary.period,
      note: salary.note,
      status: "paid" as const,
      paidAt: salary.paidAt,
      createdAt: salary.createdAt.toISOString(),
    });
  },
);

// PUT /teacher-payments/:id — admin edits a payment.
// Updates the salary row AND its linked expense (matched by salary_id).
router.put(
  "/teacher-payments/:id",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const user = (req as any).user;
    if (user.role !== "admin") {
      res.status(403).json({ error: "Not authorized" });
      return;
    }
    const id = parseInt(req.params.id as string);
    const { amount, period, note } = req.body as any;

    const updateSalary: Record<string, unknown> = {};
    if (amount !== undefined) updateSalary.amount = Number(amount);
    if (period !== undefined) updateSalary.period = period;
    if (note !== undefined) updateSalary.note = note;

    if (Object.keys(updateSalary).length === 0) {
      res.status(400).json({ error: "No fields to update" });
      return;
    }

    const [salary] = await db
      .update(salariesTable)
      .set(updateSalary)
      .where(eq(salariesTable.id, id))
      .returning();

    if (!salary) {
      res.status(404).json({ error: "Payment not found" });
      return;
    }

    // Mirror amount/notes onto the linked expense (if one exists).
    const updateExpense: Record<string, unknown> = {};
    if (amount !== undefined) updateExpense.amount = Number(amount);
    if (note !== undefined) updateExpense.notes = note;
    if (Object.keys(updateExpense).length > 0) {
      await db
        .update(expensesTable)
        .set(updateExpense)
        .where(eq(expensesTable.salaryId, id));
    }

    res.json({
      id: salary.id,
      teacherId: salary.employeeId,
      amount: salary.amount,
      period: salary.period,
      note: salary.note,
      status: "paid" as const,
      paidAt: salary.paidAt,
      createdAt: salary.createdAt.toISOString(),
    });
  },
);

export default router;

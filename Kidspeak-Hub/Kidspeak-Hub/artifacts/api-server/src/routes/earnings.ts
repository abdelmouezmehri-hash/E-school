import { Router, type IRouter, type Request, type Response } from "express";
import { eq, and, desc, ne, isNotNull } from "drizzle-orm";
import { db, usersTable, classSessionsTable, groupsTable, teacherPaymentsTable, adhocSessionsTable, supportSessionsTable, staffPaymentRequestsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

// GET /api/earnings/my — teacher or psychologist sees their own earnings summary
router.get("/earnings/my", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  if (user.role !== "teacher" && user.role !== "admin" && user.role !== "psychologist") {
    res.status(403).json({ error: "Not authorized" }); return;
  }

  const teacherId = user.id;
  await sendTeacherEarnings(req, res, teacherId);
});

// GET /api/earnings/teachers/:id — admin sees any teacher's earnings
router.get("/earnings/teachers/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  if (user.role !== "admin") {
    res.status(403).json({ error: "Not authorized" }); return;
  }
  const teacherId = parseInt(req.params.id);
  if (!teacherId) { res.status(400).json({ error: "Invalid teacher ID" }); return; }
  await sendTeacherEarnings(req, res, teacherId);
});

async function sendTeacherEarnings(_req: Request, res: Response, teacherId: number): Promise<void> {
  const [teacher] = await db.select({
    id: usersTable.id,
    name: usersTable.name,
    email: usersTable.email,
    role: usersTable.role,
    paymentType: usersTable.paymentType,
    payPerSession: usersTable.payPerSession,
    monthlySalary: usersTable.monthlySalary,
  }).from(usersTable).where(eq(usersTable.id, teacherId));

  if (!teacher) { res.status(404).json({ error: "Teacher not found" }); return; }

  // Regular sessions (as teacher) — exclude planned sessions
  const regularSessions = await db.select({
    id: classSessionsTable.id,
    sessionDate: classSessionsTable.sessionDate,
    groupId: classSessionsTable.groupId,
    sessionKind: classSessionsTable.sessionKind,
  }).from(classSessionsTable)
    .where(and(eq(classSessionsTable.teacherId, teacherId), ne(classSessionsTable.status as any, "planned")))
    .orderBy(desc(classSessionsTable.sessionDate));

  // Intervention sessions (as psychologist in teacher groups) — exclude planned
  const interventionSessions = teacher.role === "psychologist"
    ? await db.select({
        id: classSessionsTable.id,
        sessionDate: classSessionsTable.sessionDate,
        groupId: classSessionsTable.groupId,
        sessionKind: classSessionsTable.sessionKind,
      }).from(classSessionsTable)
        .where(and(eq(classSessionsTable.psychologistId, teacherId), ne(classSessionsTable.status as any, "planned")))
        .orderBy(desc(classSessionsTable.sessionDate))
    : [];

  // Ad-hoc sessions (for psychologist)
  const adhocSessions = teacher.role === "psychologist"
    ? await db.select({
        id: adhocSessionsTable.id,
        sessionDate: adhocSessionsTable.sessionDate,
      }).from(adhocSessionsTable)
        .where(eq(adhocSessionsTable.psychologistId, teacherId))
        .orderBy(desc(adhocSessionsTable.sessionDate))
    : [];

  // Group support sessions (for psychologist — support sessions added to teacher groups)
  const groupSupportSessions = teacher.role === "psychologist"
    ? await db.select({
        id: supportSessionsTable.id,
        sessionDate: supportSessionsTable.sessionDate,
        groupId: supportSessionsTable.groupId,
        topic: supportSessionsTable.topic,
      }).from(supportSessionsTable)
        .where(eq(supportSessionsTable.psychologistId, teacherId))
        .orderBy(desc(supportSessionsTable.sessionDate))
    : [];

  const allSessionDates = [
    ...regularSessions.map(s => ({ ...s, kind: s.sessionKind ?? "regular" })),
    ...interventionSessions.map(s => ({ ...s, kind: "intervention" })),
    ...adhocSessions.map(s => ({ id: s.id, sessionDate: s.sessionDate, groupId: null as number | null, kind: "adhoc" })),
    ...groupSupportSessions.map(s => ({ id: s.id, sessionDate: s.sessionDate, groupId: s.groupId, kind: "group_support" })),
  ];

  const sessionCount = allSessionDates.length;

  // Calculate total earned
  let totalEarned = 0;
  const payPerSession = teacher.payPerSession ? parseFloat(teacher.payPerSession) : 0;
  const monthlySalary = teacher.monthlySalary ? parseFloat(teacher.monthlySalary) : 0;

  if (teacher.paymentType === "per_session") {
    totalEarned = sessionCount * payPerSession;
  } else if (teacher.paymentType === "monthly") {
    const months = new Set(allSessionDates.map((s) => s.sessionDate.substring(0, 7)));
    totalEarned = months.size * monthlySalary;
  }

  // Fetch all payment records (used for financial totals)
  const allPayments = await db.select().from(teacherPaymentsTable)
    .where(eq(teacherPaymentsTable.teacherId, teacherId))
    .orderBy(desc(teacherPaymentsTable.createdAt));

  // Find teacherPayment IDs that were auto-created from approved staffPaymentRequests.
  // These already appear in the PaymentRequestsSection on the frontend, so we exclude
  // them from the "Payment History" list to avoid showing the same payment twice.
  const linkedRows = await db
    .select({ linkedPaymentId: staffPaymentRequestsTable.linkedPaymentId })
    .from(staffPaymentRequestsTable)
    .where(and(
      eq(staffPaymentRequestsTable.staffId, teacherId),
      isNotNull(staffPaymentRequestsTable.linkedPaymentId)
    ));
  const linkedPaymentIds = new Set(linkedRows.map((r) => r.linkedPaymentId!));

  // Display-only payments (admin-created salary records, not auto-linked ones)
  const payments = allPayments.filter((p) => !linkedPaymentIds.has(p.id));

  const totalPaid = allPayments
    .filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + parseFloat(String(p.amount)), 0);

  const totalPending = allPayments
    .filter((p) => p.status === "pending")
    .reduce((sum, p) => sum + parseFloat(String(p.amount)), 0);

  res.json({
    teacher: {
      id: teacher.id,
      name: teacher.name,
      email: teacher.email,
      paymentType: teacher.paymentType,
      payPerSession: payPerSession,
      monthlySalary: monthlySalary,
    },
    sessionCount,
    regularSessionCount: regularSessions.length,
    interventionSessionCount: interventionSessions.length,
    adhocSessionCount: adhocSessions.length,
    groupSupportSessionCount: groupSupportSessions.length,
    totalEarned,
    totalPaid,
    totalPending,
    balance: totalEarned - totalPaid,
    payments: payments.map((p) => ({
      ...p,
      amount: parseFloat(p.amount),
      createdAt: p.createdAt.toISOString(),
      paidAt: p.paidAt?.toISOString() ?? null,
    })),
    sessions: allSessionDates.slice(0, 30),
  });
}

// GET /api/teacher-payments — admin lists all teacher payments
router.get("/teacher-payments", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  if (user.role !== "admin") { res.status(403).json({ error: "Not authorized" }); return; }

  const teacherIdParam = req.query.teacherId ? parseInt(String(req.query.teacherId)) : null;

  let payments;
  if (teacherIdParam) {
    payments = await db.select().from(teacherPaymentsTable)
      .where(eq(teacherPaymentsTable.teacherId, teacherIdParam))
      .orderBy(desc(teacherPaymentsTable.createdAt));
  } else {
    payments = await db.select().from(teacherPaymentsTable)
      .orderBy(desc(teacherPaymentsTable.createdAt));
  }

  res.json(payments.map((p) => ({
    ...p,
    amount: parseFloat(p.amount),
    createdAt: p.createdAt.toISOString(),
    paidAt: p.paidAt?.toISOString() ?? null,
  })));
});

// POST /api/teacher-payments — admin creates a payment record
router.post("/teacher-payments", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  if (user.role !== "admin") { res.status(403).json({ error: "Not authorized" }); return; }

  const { teacherId, amount, period, status, note } = req.body as any;
  if (!teacherId || !amount || !period) {
    res.status(400).json({ error: "teacherId, amount, period are required" }); return;
  }

  const [payment] = await db.insert(teacherPaymentsTable).values({
    teacherId,
    amount: String(amount),
    period,
    status: status ?? "pending",
    note: note ?? null,
  }).returning();

  res.status(201).json({
    ...payment,
    amount: parseFloat(payment.amount),
    createdAt: payment.createdAt.toISOString(),
    paidAt: null,
  });
});

// PUT /api/teacher-payments/:id/mark-paid — admin marks a payment as paid
router.put("/teacher-payments/:id/mark-paid", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  if (user.role !== "admin") { res.status(403).json({ error: "Not authorized" }); return; }

  const id = parseInt(req.params.id);
  const [payment] = await db.update(teacherPaymentsTable)
    .set({ status: "paid", paidAt: new Date() })
    .where(and(eq(teacherPaymentsTable.id, id)))
    .returning();

  if (!payment) { res.status(404).json({ error: "Payment not found" }); return; }

  res.json({
    ...payment,
    amount: parseFloat(payment.amount),
    createdAt: payment.createdAt.toISOString(),
    paidAt: payment.paidAt?.toISOString() ?? null,
  });
});

// PUT /api/teacher-payments/:id — admin updates a payment
router.put("/teacher-payments/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  if (user.role !== "admin") { res.status(403).json({ error: "Not authorized" }); return; }

  const id = parseInt(req.params.id);
  const { amount, period, status, note } = req.body as any;
  const updateData: Record<string, unknown> = {};
  if (amount !== undefined) updateData.amount = String(amount);
  if (period !== undefined) updateData.period = period;
  if (note !== undefined) updateData.note = note;
  if (status !== undefined) {
    updateData.status = status;
    if (status === "paid") updateData.paidAt = new Date();
  }

  const [payment] = await db.update(teacherPaymentsTable).set(updateData).where(eq(teacherPaymentsTable.id, id)).returning();
  if (!payment) { res.status(404).json({ error: "Payment not found" }); return; }

  res.json({
    ...payment,
    amount: parseFloat(payment.amount),
    createdAt: payment.createdAt.toISOString(),
    paidAt: payment.paidAt?.toISOString() ?? null,
  });
});

export default router;

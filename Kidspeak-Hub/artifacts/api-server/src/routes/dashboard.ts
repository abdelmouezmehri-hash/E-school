import { Router, type IRouter, type Request, type Response } from "express";
import { eq, sql, and, gte, lte, desc, count, ne, isNotNull } from "drizzle-orm";
import { db, studentsTable, usersTable, levelsTable, evaluationsTable, paymentsTable, expensesTable, observationsTable } from "@workspace/db";
import { monthOf } from "@workspace/db/helpers";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/dashboard/admin", requireAuth, async (_req: Request, res: Response): Promise<void> => {
  const [
    [studentCount],
    [teacherCount],
    [parentCount],
    [levelCount],
    [overdueCount],
    [recentEvalCount],
    [revenue],
    [avgProgress],
  ] = await Promise.all([
    db.select({ count: count() }).from(studentsTable),
    db.select({ count: count() }).from(usersTable).where(eq(usersTable.role, "teacher")),
    db.select({ count: count() }).from(usersTable).where(eq(usersTable.role, "parent")),
    db.select({ count: count() }).from(levelsTable),
    db.select({ count: count() }).from(paymentsTable).where(eq(paymentsTable.status, "overdue")),
    db.select({ count: count() }).from(evaluationsTable),
    db.select({
      total: sql<number>`CAST(SUM(CAST(${paymentsTable.amountPaid} AS REAL)) AS REAL)`,
      pending: sql<number>`CAST(SUM(CAST(${paymentsTable.amountDue} AS REAL) - CAST(${paymentsTable.amountPaid} AS REAL)) AS REAL)`,
    }).from(paymentsTable),
    db.select({
      avg: sql<number>`CAST(AVG(CAST(${evaluationsTable.progressScore} AS REAL)) AS REAL)`,
    }).from(evaluationsTable),
  ]);

  // Students per level — SQL GROUP BY with level name via JOIN (no JS join needed)
  const studentsByLevel = await db
    .select({
      levelId: studentsTable.levelId,
      levelName: levelsTable.name,
      count: count(),
    })
    .from(studentsTable)
    .innerJoin(levelsTable, eq(studentsTable.levelId, levelsTable.id))
    .where(isNotNull(studentsTable.levelId))
    .groupBy(studentsTable.levelId, levelsTable.name);

  // Revenue by month — SQL GROUP BY using the cross-DB monthOf helper
  // monthOf returns strftime('%Y-%m', col) for SQLite, to_char(col, 'YYYY-MM') for PostgreSQL
  const revenueByMonth = await db
    .select({
      month: monthOf(paymentsTable.createdAt),
      revenue: sql<number>`CAST(SUM(CAST(${paymentsTable.amountPaid} AS REAL)) AS REAL)`,
    })
    .from(paymentsTable)
    .groupBy(monthOf(paymentsTable.createdAt))
    .orderBy(monthOf(paymentsTable.createdAt));

  res.json({
    totalStudents: studentCount?.count ?? 0,
    totalRevenue: revenue?.total ?? 0,
    pendingRevenue: revenue?.pending ?? 0,
    totalLevels: levelCount?.count ?? 0,
    totalTeachers: teacherCount?.count ?? 0,
    totalParents: parentCount?.count ?? 0,
    averageProgressScore: avgProgress?.avg ?? null,
    recentEvaluationsCount: recentEvalCount?.count ?? 0,
    overduePaymentsCount: overdueCount?.count ?? 0,
    studentsByLevel: studentsByLevel.map((s) => ({
      levelId: s.levelId!,
      levelName: s.levelName ?? "Unknown",
      count: s.count,
    })),
    revenueByMonth: revenueByMonth.map((r) => ({
      month: r.month,
      revenue: r.revenue ?? 0,
    })),
  });
});

router.get("/dashboard/revenue", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const month = (req.query.month as string) || new Date().toISOString().slice(0, 7);
  const [year, monthNum] = month.split("-").map(Number);
  const startDate = `${year}-${String(monthNum).padStart(2, "0")}-01`;
  const endDate = new Date(year, monthNum, 0).toISOString().slice(0, 10);

  const dateRange = and(
    gte(paymentsTable.dueDate, startDate),
    lte(paymentsTable.dueDate, endDate),
  );

  const [totals, revenueByLevel, statusCounts, [expenseTotal]] = await Promise.all([
    // Total collected and due for the month
    db
      .select({
        collected: sql<number>`CAST(SUM(CAST(${paymentsTable.amountPaid} AS REAL)) AS REAL)`,
        due: sql<number>`CAST(SUM(CAST(${paymentsTable.amountDue} AS REAL)) AS REAL)`,
      })
      .from(paymentsTable)
      .where(dateRange),

    // Revenue grouped by level — JOIN gives levelName without a second query
    db
      .select({
        levelId: paymentsTable.levelId,
        levelName: levelsTable.name,
        collected: sql<number>`CAST(SUM(CAST(${paymentsTable.amountPaid} AS REAL)) AS REAL)`,
        due: sql<number>`CAST(SUM(CAST(${paymentsTable.amountDue} AS REAL)) AS REAL)`,
      })
      .from(paymentsTable)
      .innerJoin(levelsTable, eq(paymentsTable.levelId, levelsTable.id))
      .where(and(dateRange, isNotNull(paymentsTable.levelId)))
      .groupBy(paymentsTable.levelId, levelsTable.name),

    // Status breakdown via conditional aggregation — one row, four counters
    db
      .select({
        paid: sql<number>`CAST(SUM(CASE WHEN ${paymentsTable.status} = 'paid' THEN 1 ELSE 0 END) AS INTEGER)`,
        partially_paid: sql<number>`CAST(SUM(CASE WHEN ${paymentsTable.status} = 'partially_paid' THEN 1 ELSE 0 END) AS INTEGER)`,
        overdue: sql<number>`CAST(SUM(CASE WHEN ${paymentsTable.status} = 'overdue' THEN 1 ELSE 0 END) AS INTEGER)`,
        pending: sql<number>`CAST(SUM(CASE WHEN ${paymentsTable.status} = 'pending' THEN 1 ELSE 0 END) AS INTEGER)`,
      })
      .from(paymentsTable)
      .where(dateRange),

    // Total expenses for the same month
    db
      .select({
        total: sql<number>`CAST(SUM(CAST(${expensesTable.amount} AS REAL)) AS REAL)`,
      })
      .from(expensesTable)
      .where(
        and(
          gte(expensesTable.expenseDate, startDate),
          lte(expensesTable.expenseDate, endDate),
        ),
      ),
  ]);

  const totalCollected = totals[0]?.collected ?? 0;
  const totalDue = totals[0]?.due ?? 0;
  const totalExpenses = expenseTotal?.total ?? 0;
  const statusBreakdown = statusCounts[0] ?? { paid: 0, partially_paid: 0, overdue: 0, pending: 0 };

  res.json({
    month,
    totalCollected,
    totalDue,
    totalExpenses,
    netRevenue: totalCollected - totalExpenses,
    revenueByLevel: revenueByLevel.map((r) => ({
      levelId: r.levelId,
      levelName: r.levelName ?? "Unknown",
      collected: r.collected ?? 0,
      due: r.due ?? 0,
    })),
    paymentStatusBreakdown: {
      paid: statusBreakdown.paid ?? 0,
      partially_paid: statusBreakdown.partially_paid ?? 0,
      overdue: statusBreakdown.overdue ?? 0,
      pending: statusBreakdown.pending ?? 0,
    },
  });
});

router.get("/dashboard/performance", requireAuth, async (_req: Request, res: Response): Promise<void> => {
  const [scoreBreakdown, topPerformers, students] = await Promise.all([
    // Score averages — three AVG calls in one query
    db
      .select({
        avgSpeaking: sql<number>`CAST(AVG(${evaluationsTable.speakingScore}) AS REAL)`,
        avgConfidence: sql<number>`CAST(AVG(${evaluationsTable.confidenceScore}) AS REAL)`,
        avgParticipation: sql<number>`CAST(AVG(${evaluationsTable.participationScore}) AS REAL)`,
        overallAvg: sql<number>`CAST(AVG(CAST(${evaluationsTable.progressScore} AS REAL)) AS REAL)`,
      })
      .from(evaluationsTable),

    // Top 5 performers — GROUP BY student, ORDER BY average progress score DESC
    db
      .select({
        studentId: evaluationsTable.studentId,
        studentName: studentsTable.name,
        levelName: levelsTable.name,
        avgScore: sql<number>`CAST(AVG(CAST(${evaluationsTable.progressScore} AS REAL)) AS REAL)`,
      })
      .from(evaluationsTable)
      .innerJoin(studentsTable, eq(evaluationsTable.studentId, studentsTable.id))
      .leftJoin(levelsTable, eq(studentsTable.levelId, levelsTable.id))
      .groupBy(evaluationsTable.studentId, studentsTable.name, levelsTable.name)
      .orderBy(sql`AVG(CAST(${evaluationsTable.progressScore} AS REAL)) DESC`)
      .limit(5),

    // Students needed only for behavioral flag counting (JS-side, see note below)
    db
      .select({ id: studentsTable.id, behavioralFlags: studentsTable.behavioralFlags })
      .from(studentsTable),
  ]);

  const scores = scoreBreakdown[0];

  // Behavioral flag counts: kept in JS because JSON array element counting
  // requires DB-specific functions (SQLite: json_each, PostgreSQL: @> operator).
  const flagCounts = { fear: 0, shyness: 0, high_potential: 0 };
  for (const s of students) {
    if (s.behavioralFlags.includes("fear")) flagCounts.fear++;
    if (s.behavioralFlags.includes("shyness")) flagCounts.shyness++;
    if (s.behavioralFlags.includes("high_potential")) flagCounts.high_potential++;
  }

  res.json({
    overallAverageScore: scores?.overallAvg ?? null,
    topPerformers: topPerformers.map((t) => ({
      studentId: t.studentId,
      studentName: t.studentName ?? "Unknown",
      progressScore: Math.round((t.avgScore ?? 0) * 10) / 10,
      levelName: t.levelName ?? null,
    })),
    behavioralFlagCounts: flagCounts,
    scoreBreakdown: {
      averageSpeaking: scores?.avgSpeaking ?? null,
      averageConfidence: scores?.avgConfidence ?? null,
      averageParticipation: scores?.avgParticipation ?? null,
    },
  });
});

router.get("/dashboard/behavioral", requireAuth, async (_req: Request, res: Response): Promise<void> => {
  const students = (await db
    .select({
      id: studentsTable.id,
      name: studentsTable.name,
      levelId: studentsTable.levelId,
      behavioralFlags: studentsTable.behavioralFlags,
    })
    .from(studentsTable)
  ).filter(s => s.behavioralFlags.length > 0);

  const levelsMap = await db.select({ id: levelsTable.id, name: levelsTable.name }).from(levelsTable);

  const evals = await db.select({
    studentId: evaluationsTable.studentId,
    progressScore: evaluationsTable.progressScore,
  }).from(evaluationsTable);

  const studentScores: Map<number, number[]> = new Map();
  evals.forEach(e => {
    const scores = studentScores.get(e.studentId) ?? [];
    scores.push(parseFloat(e.progressScore?.toString() ?? "0"));
    studentScores.set(e.studentId, scores);
  });

  const observations = await db
    .select({
      id: observationsTable.id,
      studentId: observationsTable.studentId,
      authorId: observationsTable.authorId,
      authorName: usersTable.name,
      content: observationsTable.content,
      observationType: observationsTable.observationType,
      createdAt: observationsTable.createdAt,
    })
    .from(observationsTable)
    .leftJoin(usersTable, eq(observationsTable.authorId, usersTable.id))
    .orderBy(desc(observationsTable.createdAt));

  const result = students.map(s => {
    const scores = studentScores.get(s.id) ?? [];
    const avgScore = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
    return {
      studentId: s.id,
      studentName: s.name,
      levelName: s.levelId ? levelsMap.find(l => l.id === s.levelId)?.name ?? null : null,
      behavioralFlags: s.behavioralFlags,
      latestProgressScore: avgScore,
      observations: observations
        .filter(o => o.studentId === s.id)
        .map(o => ({ ...o, authorName: o.authorName ?? "Unknown", createdAt: o.createdAt.toISOString() })),
    };
  });

  res.json(result);
});

router.get("/dashboard/pending-payments", requireAuth, async (_req: Request, res: Response): Promise<void> => {
  const payments = await db.select().from(paymentsTable)
    .where(ne(paymentsTable.status, "paid"))
    .orderBy(paymentsTable.dueDate);

  const studentsMap = await db.select({ id: studentsTable.id, name: studentsTable.name }).from(studentsTable);
  const levelsMap = await db.select({ id: levelsTable.id, name: levelsTable.name }).from(levelsTable);

  const now = new Date();
  const result = payments.map(p => {
    const amountDue = parseFloat(p.amountDue);
    const amountPaid = parseFloat(p.amountPaid);
    const dueDate = new Date(p.dueDate);
    const daysOverdue = p.status === "overdue" ? Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)) : null;

    return {
      paymentId: p.id,
      studentId: p.studentId,
      studentName: studentsMap.find(s => s.id === p.studentId)?.name ?? "Unknown",
      levelName: p.levelId ? levelsMap.find(l => l.id === p.levelId)?.name ?? null : null,
      amountDue,
      amountPaid,
      balance: amountDue - amountPaid,
      status: p.status,
      dueDate: p.dueDate,
      daysOverdue,
    };
  });

  res.json(result);
});

export default router;

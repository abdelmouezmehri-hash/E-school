import { Router, type IRouter, type Request, type Response } from "express";
import { eq, desc } from "drizzle-orm";
import { db, performanceReportsTable, usersTable, studentsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

// GET /api/performance-reports/student/:studentId
router.get("/performance-reports/student/:studentId", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  const studentId = parseInt(req.params.studentId);
  if (isNaN(studentId)) { res.status(400).json({ error: "Invalid studentId" }); return; }

  // Parents: only their own children
  if (user.role === "parent") {
    const [student] = await db.select({ parentId: studentsTable.parentId }).from(studentsTable).where(eq(studentsTable.id, studentId));
    if (!student || student.parentId !== user.id) { res.status(403).json({ error: "Forbidden" }); return; }
  }

  const reports = await db
    .select({
      id: performanceReportsTable.id,
      studentId: performanceReportsTable.studentId,
      period: performanceReportsTable.period,
      reportDate: performanceReportsTable.reportDate,
      status: performanceReportsTable.status,
      teacherId: performanceReportsTable.teacherId,
      teacherVocabNotes: performanceReportsTable.teacherVocabNotes,
      teacherStructureNotes: performanceReportsTable.teacherStructureNotes,
      teacherFluencyNotes: performanceReportsTable.teacherFluencyNotes,
      teacherSummary: performanceReportsTable.teacherSummary,
      teacherVocabScore: performanceReportsTable.teacherVocabScore,
      teacherStructureScore: performanceReportsTable.teacherStructureScore,
      teacherFluencyScore: performanceReportsTable.teacherFluencyScore,
      psychologistId: performanceReportsTable.psychologistId,
      fearReductionScore: performanceReportsTable.fearReductionScore,
      socialInitiativeScore: performanceReportsTable.socialInitiativeScore,
      selfConfidenceScore: performanceReportsTable.selfConfidenceScore,
      psychologistNotes: performanceReportsTable.psychologistNotes,
      psychologistSummary: performanceReportsTable.psychologistSummary,
      createdAt: performanceReportsTable.createdAt,
      updatedAt: performanceReportsTable.updatedAt,
      teacherName: usersTable.name,
    })
    .from(performanceReportsTable)
    .leftJoin(usersTable, eq(performanceReportsTable.teacherId, usersTable.id))
    .where(eq(performanceReportsTable.studentId, studentId))
    .orderBy(desc(performanceReportsTable.reportDate));

  // Enrich with psychologist name separately
  const enriched = await Promise.all(
    reports.map(async (r) => {
      let psychologistName: string | null = null;
      if (r.psychologistId) {
        const [psy] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, r.psychologistId));
        psychologistName = psy?.name ?? null;
      }
      return { ...r, psychologistName };
    })
  );

  res.json(enriched);
});

// POST /api/performance-reports
router.post("/performance-reports", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  if (!["admin", "teacher", "psychologist"].includes(user.role)) { res.status(403).json({ error: "Forbidden" }); return; }

  const { studentId, period, reportDate } = req.body;
  if (!studentId || !period || !reportDate) { res.status(400).json({ error: "studentId, period, reportDate required" }); return; }

  const [report] = await db.insert(performanceReportsTable).values({
    studentId: parseInt(studentId),
    period,
    reportDate,
    status: "draft",
  }).returning();

  res.status(201).json(report);
});

// PUT /api/performance-reports/:id
router.put("/performance-reports/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  if (!["admin", "teacher", "psychologist"].includes(user.role)) { res.status(403).json({ error: "Forbidden" }); return; }

  const reportId = parseInt(req.params.id);
  if (isNaN(reportId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const {
    period, reportDate, status,
    teacherVocabNotes, teacherStructureNotes, teacherFluencyNotes, teacherSummary,
    teacherVocabScore, teacherStructureScore, teacherFluencyScore,
    fearReductionScore, socialInitiativeScore, selfConfidenceScore,
    psychologistNotes, psychologistSummary,
  } = req.body;

  const updates: Record<string, any> = { updatedAt: new Date() };

  if (period !== undefined) updates.period = period;
  if (reportDate !== undefined) updates.reportDate = reportDate;
  if (status !== undefined) updates.status = status;

  if (user.role === "teacher" || user.role === "admin") {
    if (teacherVocabNotes !== undefined) updates.teacherVocabNotes = teacherVocabNotes;
    if (teacherStructureNotes !== undefined) updates.teacherStructureNotes = teacherStructureNotes;
    if (teacherFluencyNotes !== undefined) updates.teacherFluencyNotes = teacherFluencyNotes;
    if (teacherSummary !== undefined) updates.teacherSummary = teacherSummary;
    if (teacherVocabScore !== undefined) updates.teacherVocabScore = teacherVocabScore;
    if (teacherStructureScore !== undefined) updates.teacherStructureScore = teacherStructureScore;
    if (teacherFluencyScore !== undefined) updates.teacherFluencyScore = teacherFluencyScore;
    if (user.role === "teacher") updates.teacherId = user.id;
  }

  if (user.role === "psychologist" || user.role === "admin") {
    if (fearReductionScore !== undefined) updates.fearReductionScore = fearReductionScore;
    if (socialInitiativeScore !== undefined) updates.socialInitiativeScore = socialInitiativeScore;
    if (selfConfidenceScore !== undefined) updates.selfConfidenceScore = selfConfidenceScore;
    if (psychologistNotes !== undefined) updates.psychologistNotes = psychologistNotes;
    if (psychologistSummary !== undefined) updates.psychologistSummary = psychologistSummary;
    if (user.role === "psychologist") updates.psychologistId = user.id;
  }

  const [updated] = await db
    .update(performanceReportsTable)
    .set(updates)
    .where(eq(performanceReportsTable.id, reportId))
    .returning();

  if (!updated) { res.status(404).json({ error: "Report not found" }); return; }
  res.json(updated);
});

export default router;

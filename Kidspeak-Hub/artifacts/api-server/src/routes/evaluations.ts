import { Router, type IRouter, type Request, type Response } from "express";
import { eq, and } from "drizzle-orm";
import { db, evaluationsTable, studentsTable } from "@workspace/db";
import { CreateEvaluationBody, ListEvaluationsQueryParams, UpdateEvaluationParams, DeleteEvaluationParams } from "@workspace/api-zod";
import { requireAuth, requireRole } from "../middlewares/auth";

const router: IRouter = Router();

function calcProgressScore(speakingScore: number, confidenceScore: number, participationScore: number): number {
  return Math.round(((speakingScore + confidenceScore + participationScore) / 30) * 100 * 10) / 10;
}

router.get("/evaluations", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const params = ListEvaluationsQueryParams.safeParse(req.query);

  let evals = await db.select().from(evaluationsTable).orderBy(evaluationsTable.weekNumber);

  if (params.success) {
    if (params.data.studentId && params.data.weekNumber) {
      evals = await db.select().from(evaluationsTable)
        .where(and(eq(evaluationsTable.studentId, params.data.studentId), eq(evaluationsTable.weekNumber, params.data.weekNumber)))
        .orderBy(evaluationsTable.weekNumber);
    } else if (params.data.studentId) {
      evals = await db.select().from(evaluationsTable)
        .where(eq(evaluationsTable.studentId, params.data.studentId))
        .orderBy(evaluationsTable.weekNumber);
    } else if (params.data.weekNumber) {
      evals = await db.select().from(evaluationsTable)
        .where(eq(evaluationsTable.weekNumber, params.data.weekNumber))
        .orderBy(evaluationsTable.weekNumber);
    }
  }

  res.json(evals.map(e => ({
    ...e,
    progressScore: parseFloat(e.progressScore?.toString() ?? "0"),
    createdAt: e.createdAt.toISOString(),
  })));
});

router.post("/evaluations", requireAuth, requireRole(["admin", "teacher"]), async (req: Request, res: Response): Promise<void> => {
  const parsed = CreateEvaluationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const progressScore = calcProgressScore(parsed.data.speakingScore, parsed.data.confidenceScore, parsed.data.participationScore);

  const [evaluation] = await db.insert(evaluationsTable).values({
    studentId: parsed.data.studentId,
    weekNumber: parsed.data.weekNumber,
    sessionDate: parsed.data.sessionDate,
    speakingScore: parsed.data.speakingScore,
    confidenceScore: parsed.data.confidenceScore,
    participationScore: parsed.data.participationScore,
    progressScore: progressScore.toString(),
    teacherNotes: parsed.data.teacherNotes ?? null,
  }).returning();

  if (!evaluation) {
    res.status(500).json({ error: "Failed to create evaluation" });
    return;
  }

  res.status(201).json({
    ...evaluation,
    progressScore: parseFloat(evaluation.progressScore?.toString() ?? "0"),
    createdAt: evaluation.createdAt.toISOString(),
  });
});

router.put("/evaluations/:id", requireAuth, requireRole(["admin", "teacher"]), async (req: Request, res: Response): Promise<void> => {
  const params = UpdateEvaluationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = CreateEvaluationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const progressScore = calcProgressScore(parsed.data.speakingScore, parsed.data.confidenceScore, parsed.data.participationScore);

  const [evaluation] = await db.update(evaluationsTable).set({
    studentId: parsed.data.studentId,
    weekNumber: parsed.data.weekNumber,
    sessionDate: parsed.data.sessionDate,
    speakingScore: parsed.data.speakingScore,
    confidenceScore: parsed.data.confidenceScore,
    participationScore: parsed.data.participationScore,
    progressScore: progressScore.toString(),
    teacherNotes: parsed.data.teacherNotes ?? null,
  }).where(eq(evaluationsTable.id, params.data.id)).returning();

  if (!evaluation) {
    res.status(404).json({ error: "Evaluation not found" });
    return;
  }

  res.json({
    ...evaluation,
    progressScore: parseFloat(evaluation.progressScore?.toString() ?? "0"),
    createdAt: evaluation.createdAt.toISOString(),
  });
});

router.delete("/evaluations/:id", requireAuth, requireRole(["admin"]), async (req: Request, res: Response): Promise<void> => {
  const params = DeleteEvaluationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [ev] = await db.delete(evaluationsTable).where(eq(evaluationsTable.id, params.data.id)).returning({ id: evaluationsTable.id });
  if (!ev) {
    res.status(404).json({ error: "Evaluation not found" });
    return;
  }

  res.json({ message: "Evaluation deleted successfully" });
});

export default router;

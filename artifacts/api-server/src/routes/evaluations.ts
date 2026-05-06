import { Router, type IRouter, type Request, type Response } from "express";
import { eq, and, or } from "drizzle-orm";
import {
  db,
  evaluationsTable,
  studentsTable,
  getBranchIdFromStudent,
  calculateProgressScore,
} from "@workspace/db";
import {
  CreateEvaluationBody,
  ListEvaluationsQueryParams,
  UpdateEvaluationParams,
  DeleteEvaluationParams,
} from "@workspace/api-zod";
import { requireAuth, type AuthUser } from "../middlewares/auth";

const router: IRouter = Router();

async function canAccessStudent(
  user: AuthUser,
  studentId: number,
  mutate = false,
): Promise<boolean> {
  const [student] = await db
    .select()
    .from(studentsTable)
    .where(eq(studentsTable.id, studentId));
  if (!student) return false;
  if (["admin", "branch_manager"].includes(user.role)) return true;
  if (user.role === "teacher") return student.teacherId === user.id;
  if (user.role === "parent") return !mutate && student.parentId === user.id;
  return false;
}

async function canAccessEvaluation(
  user: AuthUser,
  evaluationId: number,
  mutate = false,
): Promise<boolean> {
  const [row] = await db
    .select({ studentId: evaluationsTable.studentId })
    .from(evaluationsTable)
    .where(eq(evaluationsTable.id, evaluationId));
  return row ? canAccessStudent(user, row.studentId, mutate) : false;
}

router.get(
  "/evaluations",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const params = ListEvaluationsQueryParams.safeParse(req.query);

    const user = (req as Request & { user: AuthUser }).user;
    let evals = await db
      .select({ evaluation: evaluationsTable })
      .from(evaluationsTable)
      .innerJoin(
        studentsTable,
        eq(evaluationsTable.studentId, studentsTable.id),
      )
      .where(
        user.role === "teacher"
          ? eq(studentsTable.teacherId, user.id)
          : user.role === "parent"
            ? eq(studentsTable.parentId, user.id)
            : or(eq(studentsTable.id, studentsTable.id)),
      )
      .orderBy(evaluationsTable.weekNumber);

    if (params.success) {
      if (params.data.studentId && params.data.weekNumber) {
        evals = await db
          .select({ evaluation: evaluationsTable })
          .from(evaluationsTable)
          .innerJoin(
            studentsTable,
            eq(evaluationsTable.studentId, studentsTable.id),
          )
          .where(
            and(
              eq(evaluationsTable.studentId, params.data.studentId),
              eq(evaluationsTable.weekNumber, params.data.weekNumber),
              user.role === "teacher"
                ? eq(studentsTable.teacherId, user.id)
                : user.role === "parent"
                  ? eq(studentsTable.parentId, user.id)
                  : or(eq(studentsTable.id, studentsTable.id)),
            ),
          )
          .orderBy(evaluationsTable.weekNumber);
      } else if (params.data.studentId) {
        evals = await db
          .select({ evaluation: evaluationsTable })
          .from(evaluationsTable)
          .innerJoin(
            studentsTable,
            eq(evaluationsTable.studentId, studentsTable.id),
          )
          .where(
            and(
              eq(evaluationsTable.studentId, params.data.studentId),
              user.role === "teacher"
                ? eq(studentsTable.teacherId, user.id)
                : user.role === "parent"
                  ? eq(studentsTable.parentId, user.id)
                  : or(eq(studentsTable.id, studentsTable.id)),
            ),
          )
          .orderBy(evaluationsTable.weekNumber);
      } else if (params.data.weekNumber) {
        evals = await db
          .select({ evaluation: evaluationsTable })
          .from(evaluationsTable)
          .innerJoin(
            studentsTable,
            eq(evaluationsTable.studentId, studentsTable.id),
          )
          .where(
            and(
              eq(evaluationsTable.weekNumber, params.data.weekNumber),
              user.role === "teacher"
                ? eq(studentsTable.teacherId, user.id)
                : user.role === "parent"
                  ? eq(studentsTable.parentId, user.id)
                  : or(eq(studentsTable.id, studentsTable.id)),
            ),
          )
          .orderBy(evaluationsTable.weekNumber);
      }
    }

    res.json(
      evals.map((row) => {
        const e = "evaluation" in row ? row.evaluation : row;
        return {
          ...e,
          progressScore: parseFloat(e.progressScore?.toString() ?? "0"),
          createdAt: e.createdAt.toISOString(),
        };
      }),
    );
  },
);

router.post(
  "/evaluations",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const parsed = CreateEvaluationBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const user = (req as Request & { user: AuthUser }).user;
    if (!(await canAccessStudent(user, parsed.data.studentId, true))) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const progressScore = calculateProgressScore({
      speakingScore: parsed.data.speakingScore,
      confidenceScore: parsed.data.confidenceScore,
      participationScore: parsed.data.participationScore,
    });

    const [evaluation] = await db
      .insert(evaluationsTable)
      .values({
        studentId: parsed.data.studentId,
        weekNumber: parsed.data.weekNumber,
        sessionDate:
          parsed.data.sessionDate instanceof Date
            ? parsed.data.sessionDate.toISOString().split("T")[0]
            : String(parsed.data.sessionDate),
        speakingScore: parsed.data.speakingScore,
        confidenceScore: parsed.data.confidenceScore,
        participationScore: parsed.data.participationScore,
        progressScore: progressScore,
        teacherNotes: parsed.data.teacherNotes ?? null,
      })
      .returning();

    if (!evaluation) {
      res.status(500).json({ error: "Failed to create evaluation" });
      return;
    }

    res.status(201).json({
      ...evaluation,
      progressScore: parseFloat(evaluation.progressScore?.toString() ?? "0"),
      createdAt: evaluation.createdAt.toISOString(),
    });
  },
);

router.put(
  "/evaluations/:id",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
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

    const user = (req as Request & { user: AuthUser }).user;
    if (
      !(await canAccessEvaluation(user, params.data.id, true)) ||
      !(await canAccessStudent(user, parsed.data.studentId, true))
    ) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const progressScore = calculateProgressScore({
      speakingScore: parsed.data.speakingScore,
      confidenceScore: parsed.data.confidenceScore,
      participationScore: parsed.data.participationScore,
    });

    const [evaluation] = await db
      .update(evaluationsTable)
      .set({
        studentId: parsed.data.studentId,
        weekNumber: parsed.data.weekNumber,
        sessionDate:
          parsed.data.sessionDate instanceof Date
            ? parsed.data.sessionDate.toISOString().split("T")[0]
            : String(parsed.data.sessionDate),
        speakingScore: parsed.data.speakingScore,
        confidenceScore: parsed.data.confidenceScore,
        participationScore: parsed.data.participationScore,
        progressScore: progressScore,
        teacherNotes: parsed.data.teacherNotes ?? null,
      })
      .where(eq(evaluationsTable.id, params.data.id))
      .returning();

    if (!evaluation) {
      res.status(404).json({ error: "Evaluation not found" });
      return;
    }

    res.json({
      ...evaluation,
      progressScore: parseFloat(evaluation.progressScore?.toString() ?? "0"),
      createdAt: evaluation.createdAt.toISOString(),
    });
  },
);

router.delete(
  "/evaluations/:id",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const params = DeleteEvaluationParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const user = (req as Request & { user: AuthUser }).user;
    if (!(await canAccessEvaluation(user, params.data.id, true))) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const [ev] = await db
      .delete(evaluationsTable)
      .where(eq(evaluationsTable.id, params.data.id))
      .returning({ id: evaluationsTable.id });
    if (!ev) {
      res.status(404).json({ error: "Evaluation not found" });
      return;
    }

    res.json({ message: "Evaluation deleted successfully" });
  },
);

export default router;

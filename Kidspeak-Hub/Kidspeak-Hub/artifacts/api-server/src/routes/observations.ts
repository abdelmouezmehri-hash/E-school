import { Router, type IRouter, type Request, type Response } from "express";
import { eq, desc } from "drizzle-orm";
import { db, observationsTable, usersTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

const VALID_TYPES = ["fear", "shyness", "participation", "general"] as const;
type ObsType = typeof VALID_TYPES[number];

function validateCreateObs(body: unknown): { studentId: number; content: string; observationType: ObsType } | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  if (typeof b.studentId !== "number" || !Number.isInteger(b.studentId) || b.studentId <= 0) return null;
  if (typeof b.content !== "string" || b.content.trim().length === 0) return null;
  if (!VALID_TYPES.includes(b.observationType as ObsType)) return null;
  return { studentId: b.studentId, content: b.content.trim(), observationType: b.observationType as ObsType };
}

router.get("/observations", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const studentId = req.query.studentId ? parseInt(req.query.studentId as string) : undefined;

  let rows;
  if (studentId) {
    rows = await db
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
      .where(eq(observationsTable.studentId, studentId))
      .orderBy(desc(observationsTable.createdAt));
  } else {
    rows = await db
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
  }

  res.json(rows.map(r => ({ ...r, authorName: r.authorName ?? "Unknown", createdAt: r.createdAt.toISOString() })));
});

router.post("/observations", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  const data = validateCreateObs(req.body);
  if (!data) {
    res.status(400).json({ error: "Invalid observation data" });
    return;
  }

  const [obs] = await db.insert(observationsTable).values({
    studentId: data.studentId,
    authorId: user.id,
    content: data.content,
    observationType: data.observationType,
  }).returning({
    id: observationsTable.id,
    studentId: observationsTable.studentId,
    authorId: observationsTable.authorId,
    content: observationsTable.content,
    observationType: observationsTable.observationType,
    createdAt: observationsTable.createdAt,
  });

  if (!obs) {
    res.status(500).json({ error: "Failed to create observation" });
    return;
  }

  const [author] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, user.id));

  res.status(201).json({ ...obs, authorName: author?.name ?? "Unknown", createdAt: obs.createdAt.toISOString() });
});

router.delete("/observations/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  const [obs] = await db.delete(observationsTable).where(eq(observationsTable.id, id)).returning({ id: observationsTable.id });
  if (!obs) {
    res.status(404).json({ error: "Observation not found" });
    return;
  }

  res.json({ message: "Observation deleted successfully" });
});

export default router;

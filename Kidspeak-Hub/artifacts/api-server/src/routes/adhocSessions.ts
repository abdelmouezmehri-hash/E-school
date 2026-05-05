import { Router, type IRouter, type Request, type Response } from "express";
import { eq, desc, and } from "drizzle-orm";
import { db, adhocSessionsTable, studentsTable, usersTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

// GET /adhoc-sessions/my — psychologist sees their ad-hoc sessions
router.get("/adhoc-sessions/my", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  if (user.role !== "psychologist" && user.role !== "admin") {
    res.status(403).json({ error: "Not authorized" }); return;
  }
  const userId = user.role === "admin" && req.query.psychologistId ? parseInt(String(req.query.psychologistId)) : user.id;
  const rows = await db.select().from(adhocSessionsTable)
    .where(eq(adhocSessionsTable.psychologistId, userId))
    .orderBy(desc(adhocSessionsTable.sessionDate));
  const enriched = await Promise.all(rows.map(async (s) => {
    const student = await db.select({ name: studentsTable.name, profilePicture: studentsTable.profilePicture })
      .from(studentsTable).where(eq(studentsTable.id, s.studentId)).then(r => r[0]);
    return { ...s, studentName: student?.name ?? "Unknown", studentPicture: student?.profilePicture ?? null };
  }));
  res.json(enriched);
});

// POST /adhoc-sessions — psychologist creates a one-off session
router.post("/adhoc-sessions", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  if (user.role !== "psychologist" && user.role !== "admin") {
    res.status(403).json({ error: "Not authorized" }); return;
  }
  const { studentId, sessionDate, durationMinutes, title, notes } = req.body as any;
  if (!studentId || !sessionDate) {
    res.status(400).json({ error: "studentId and sessionDate are required" }); return;
  }
  const [session] = await db.insert(adhocSessionsTable).values({
    psychologistId: user.id,
    studentId: parseInt(String(studentId)),
    sessionDate,
    durationMinutes: durationMinutes ? parseInt(String(durationMinutes)) : null,
    title: title?.trim() ?? null,
    notes: notes?.trim() ?? null,
  }).returning();
  res.status(201).json({ ...session });
});

// DELETE /adhoc-sessions/:id — psychologist deletes their ad-hoc session
router.delete("/adhoc-sessions/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  if (user.role !== "psychologist" && user.role !== "admin") {
    res.status(403).json({ error: "Not authorized" }); return;
  }
  const id = parseInt(req.params.id);
  const [session] = await db.select().from(adhocSessionsTable).where(eq(adhocSessionsTable.id, id));
  if (!session) { res.status(404).json({ error: "Not found" }); return; }
  if (user.role !== "admin" && session.psychologistId !== user.id) {
    res.status(403).json({ error: "Forbidden" }); return;
  }
  await db.delete(adhocSessionsTable).where(eq(adhocSessionsTable.id, id));
  res.json({ message: "Deleted" });
});

export default router;

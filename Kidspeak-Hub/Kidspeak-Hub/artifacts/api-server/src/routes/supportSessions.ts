import { Router, type IRouter, type Request, type Response } from "express";
import { eq, desc, and, inArray } from "drizzle-orm";
import {
  db,
  supportSessionsTable,
  groupsTable,
  usersTable,
  groupStudentsTable,
  studentsTable,
} from "@workspace/db";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

// ── GET /support-sessions/groups ─────────────────────────────────────────
// Returns all active groups so the psychologist can pick one
router.get("/support-sessions/groups", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  if (!["psychologist", "admin"].includes(user.role)) {
    res.status(403).json({ error: "Not authorized" }); return;
  }
  const groups = await db
    .select({
      id: groupsTable.id,
      name: groupsTable.name,
      schedule: groupsTable.schedule,
      teacherId: groupsTable.teacherId,
    })
    .from(groupsTable)
    .orderBy(groupsTable.name);

  // Enrich with teacher name
  const enriched = await Promise.all(groups.map(async (g) => {
    const teacher = g.teacherId
      ? await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, g.teacherId)).then(r => r[0])
      : null;
    return { ...g, teacherName: teacher?.name ?? null };
  }));
  res.json(enriched);
});

// ── GET /support-sessions ─────────────────────────────────────────────────
// Psychologist: own sessions; Teacher: for their groups; Admin: all
router.get("/support-sessions", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;

  let rows: any[];

  if (user.role === "admin") {
    rows = await db.select().from(supportSessionsTable).orderBy(desc(supportSessionsTable.sessionDate));
  } else if (user.role === "psychologist") {
    rows = await db
      .select()
      .from(supportSessionsTable)
      .where(eq(supportSessionsTable.psychologistId, user.id))
      .orderBy(desc(supportSessionsTable.sessionDate));
  } else if (user.role === "teacher") {
    const teacherGroups = await db
      .select({ id: groupsTable.id })
      .from(groupsTable)
      .where(eq(groupsTable.teacherId, user.id));
    const groupIds = teacherGroups.map(g => g.id);
    if (!groupIds.length) { res.json([]); return; }
    rows = await db
      .select()
      .from(supportSessionsTable)
      .where(inArray(supportSessionsTable.groupId, groupIds))
      .orderBy(desc(supportSessionsTable.sessionDate));
  } else {
    res.status(403).json({ error: "Not authorized" }); return;
  }

  // Enrich with group name and psychologist name
  const enriched = await Promise.all(rows.map(async (s) => {
    const [group, psychologist] = await Promise.all([
      db.select({ name: groupsTable.name }).from(groupsTable).where(eq(groupsTable.id, s.groupId)).then(r => r[0]),
      db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, s.psychologistId)).then(r => r[0]),
    ]);
    return {
      ...s,
      groupName: group?.name ?? "Unknown",
      psychologistName: psychologist?.name ?? "Unknown",
    };
  }));
  res.json(enriched);
});

// ── GET /support-sessions/for-group/:groupId ──────────────────────────────
// Get support sessions for a specific group (teacher view in group detail)
router.get("/support-sessions/for-group/:groupId", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  if (!["psychologist", "admin", "teacher"].includes(user.role)) {
    res.status(403).json({ error: "Not authorized" }); return;
  }
  const groupId = parseInt(req.params.groupId);
  if (isNaN(groupId)) { res.status(400).json({ error: "Invalid groupId" }); return; }

  const rows = await db
    .select()
    .from(supportSessionsTable)
    .where(eq(supportSessionsTable.groupId, groupId))
    .orderBy(desc(supportSessionsTable.sessionDate));

  const enriched = await Promise.all(rows.map(async (s) => {
    const psychologist = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, s.psychologistId)).then(r => r[0]);
    return { ...s, psychologistName: psychologist?.name ?? "Unknown" };
  }));
  res.json(enriched);
});

// ── GET /support-sessions/for-student/:studentId ──────────────────────────
// Get support sessions visible to a student (for attendance map + learning journey)
router.get("/support-sessions/for-student/:studentId", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  const studentId = parseInt(req.params.studentId);
  if (isNaN(studentId)) { res.status(400).json({ error: "Invalid studentId" }); return; }

  if (user.role === "parent") {
    const student = await db.select({ parentId: studentsTable.parentId }).from(studentsTable).where(eq(studentsTable.id, studentId)).then(r => r[0]);
    if (!student || student.parentId !== user.id) { res.status(403).json({ error: "Forbidden" }); return; }
  } else if (!["admin", "psychologist", "teacher"].includes(user.role)) {
    res.status(403).json({ error: "Forbidden" }); return;
  }

  // Find groups this student belongs to
  const memberships = await db
    .select({ groupId: groupStudentsTable.groupId })
    .from(groupStudentsTable)
    .where(eq(groupStudentsTable.studentId, studentId));

  if (!memberships.length) { res.json([]); return; }

  const groupIds = memberships.map(m => m.groupId);
  const rows = await db
    .select()
    .from(supportSessionsTable)
    .where(inArray(supportSessionsTable.groupId, groupIds))
    .orderBy(desc(supportSessionsTable.sessionDate));

  const enriched = await Promise.all(rows.map(async (s) => {
    const [group, psychologist] = await Promise.all([
      db.select({ name: groupsTable.name }).from(groupsTable).where(eq(groupsTable.id, s.groupId)).then(r => r[0]),
      db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, s.psychologistId)).then(r => r[0]),
    ]);
    return {
      ...s,
      groupName: group?.name ?? null,
      psychologistName: psychologist?.name ?? null,
      sessionKind: "group_support",
      title: s.topic,
    };
  }));
  res.json(enriched);
});

// ── POST /support-sessions ────────────────────────────────────────────────
// Psychologist creates a support session for a group
router.post("/support-sessions", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  if (!["psychologist", "admin"].includes(user.role)) {
    res.status(403).json({ error: "Not authorized" }); return;
  }

  const { groupId, sessionDate, sessionTime, topic, teacherNote } = req.body as any;
  if (!groupId || !sessionDate || !topic?.trim()) {
    res.status(400).json({ error: "groupId, sessionDate, and topic are required" }); return;
  }

  // Get the psychologist's rate to auto-calculate earnings
  const psychologist = await db
    .select({ payPerSession: usersTable.payPerSession })
    .from(usersTable)
    .where(eq(usersTable.id, user.id))
    .then(r => r[0]);

  const rateAmount = psychologist?.payPerSession ?? null;

  const [session] = await db
    .insert(supportSessionsTable)
    .values({
      psychologistId: user.id,
      groupId: parseInt(String(groupId)),
      sessionDate,
      sessionTime: sessionTime?.trim() || null,
      topic: topic.trim(),
      teacherNote: teacherNote?.trim() || null,
      status: "scheduled",
      rateAmount: rateAmount ? String(rateAmount) : null,
    })
    .returning();

  // Enrich response
  const group = await db.select({ name: groupsTable.name }).from(groupsTable).where(eq(groupsTable.id, session.groupId)).then(r => r[0]);
  res.status(201).json({ ...session, groupName: group?.name ?? null });
});

// ── PATCH /support-sessions/:id ───────────────────────────────────────────
router.patch("/support-sessions/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  if (!["psychologist", "admin"].includes(user.role)) {
    res.status(403).json({ error: "Not authorized" }); return;
  }
  const id = parseInt(req.params.id);
  const [existing] = await db.select().from(supportSessionsTable).where(eq(supportSessionsTable.id, id));
  if (!existing) { res.status(404).json({ error: "Not found" }); return; }
  if (user.role !== "admin" && existing.psychologistId !== user.id) {
    res.status(403).json({ error: "Forbidden" }); return;
  }

  const { status, topic, teacherNote, sessionDate, sessionTime } = req.body as any;
  const updates: Record<string, any> = { updatedAt: new Date() };
  if (status !== undefined) updates.status = status;
  if (topic !== undefined) updates.topic = topic.trim();
  if (teacherNote !== undefined) updates.teacherNote = teacherNote?.trim() || null;
  if (sessionDate !== undefined) updates.sessionDate = sessionDate;
  if (sessionTime !== undefined) updates.sessionTime = sessionTime?.trim() || null;

  const [updated] = await db.update(supportSessionsTable).set(updates).where(eq(supportSessionsTable.id, id)).returning();
  res.json(updated);
});

// ── DELETE /support-sessions/:id ──────────────────────────────────────────
router.delete("/support-sessions/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  if (!["psychologist", "admin"].includes(user.role)) {
    res.status(403).json({ error: "Not authorized" }); return;
  }
  const id = parseInt(req.params.id);
  const [existing] = await db.select().from(supportSessionsTable).where(eq(supportSessionsTable.id, id));
  if (!existing) { res.status(404).json({ error: "Not found" }); return; }
  if (user.role !== "admin" && existing.psychologistId !== user.id) {
    res.status(403).json({ error: "Forbidden" }); return;
  }
  await db.delete(supportSessionsTable).where(eq(supportSessionsTable.id, id));
  res.json({ message: "Deleted" });
});

export default router;

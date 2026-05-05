import { Router, type IRouter, type Request, type Response } from "express";
import { eq, sql, and, inArray } from "drizzle-orm";
import { db, levelsTable, studentsTable, groupsTable, groupStudentsTable, usersTable, programsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

/* ─── helpers ─── */
async function enrichLevel(level: typeof levelsTable.$inferSelect) {
  const [countResult] = await db
    .select({ count: sql<number>`CAST(count(*) AS INTEGER)` })
    .from(studentsTable)
    .where(eq(studentsTable.levelId, level.id));

  const groupRows = await db
    .select({
      groupId: groupsTable.id,
      groupName: groupsTable.name,
      teacherId: groupsTable.teacherId,
      maxStudents: groupsTable.maxStudents,
    })
    .from(groupsTable)
    .where(eq(groupsTable.levelId, level.id));

  const teacherIds = [...new Set(groupRows.map(g => g.teacherId).filter(Boolean) as number[])];
  const teachers = teacherIds.length > 0
    ? await db
        .select({ id: usersTable.id, name: usersTable.name })
        .from(usersTable)
        .where(inArray(usersTable.id, teacherIds))
    : [];

  let program: { id: number; name: string; nameAr: string | null; type: string } | null = null;
  if (level.programId) {
    const [p] = await db
      .select({ id: programsTable.id, name: programsTable.name, nameAr: programsTable.nameAr, type: programsTable.type })
      .from(programsTable)
      .where(eq(programsTable.id, level.programId));
    program = p ?? null;
  }

  return {
    ...level,
    price: level.price,
    studentCount: countResult?.count ?? 0,
    createdAt: level.createdAt.toISOString(),
    teachers: teachers.filter(Boolean),
    groups: groupRows,
    program,
  };
}

/* ─── GET /levels ─── */
router.get("/levels", requireAuth, async (_req: Request, res: Response): Promise<void> => {
  const levels = await db.select().from(levelsTable).orderBy(levelsTable.name);
  const enriched = await Promise.all(levels.map(enrichLevel));
  res.json(enriched);
});

/* ─── GET /levels/:id ─── */
router.get("/levels/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const id = parseInt((req.params.id as string));
  if (!id) { res.status(400).json({ error: "Invalid level ID" }); return; }

  const [level] = await db.select().from(levelsTable).where(eq(levelsTable.id, id));
  if (!level) { res.status(404).json({ error: "Level not found" }); return; }

  res.json(await enrichLevel(level));
});

/* ─── POST /levels ─── */
router.post("/levels", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  if (user.role !== "admin") { res.status(403).json({ error: "Admins only" }); return; }

  const { name, nameAr, description, descriptionAr, durationWeeks, sessionsPerWeek, price, teacherIds, defaultMaxStudents, programId, sessionType } = req.body as any;
  if (!name?.trim()) { res.status(400).json({ error: "Name is required" }); return; }
  if (!durationWeeks || durationWeeks < 1) { res.status(400).json({ error: "Duration must be ≥ 1 week" }); return; }
  if (!sessionsPerWeek || sessionsPerWeek < 1) { res.status(400).json({ error: "Sessions/week must be ≥ 1" }); return; }
  if (price === undefined || price < 0) { res.status(400).json({ error: "Price must be ≥ 0" }); return; }

  const [level] = await db.insert(levelsTable).values({
    name: name.trim(),
    nameAr: nameAr?.trim() || null,
    description: description?.trim() ?? null,
    descriptionAr: descriptionAr?.trim() || null,
    durationWeeks: parseInt(durationWeeks),
    sessionsPerWeek: parseInt(sessionsPerWeek),
    price: price.toString(),
    programId: programId ? parseInt(programId) : null,
    sessionType: sessionType?.trim() ?? null,
  }).returning();

  // Auto-create groups for each assigned teacher
  if (Array.isArray(teacherIds) && teacherIds.length > 0) {
    for (const teacherId of teacherIds) {
      const tid = parseInt(teacherId);
      if (!tid) continue;
      const existing = await db.select({ id: groupsTable.id })
        .from(groupsTable)
        .where(and(eq(groupsTable.levelId, level.id), eq(groupsTable.teacherId, tid)));
      if (existing.length === 0) {
        const [teacher] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, tid));
        await db.insert(groupsTable).values({
          name: `${level.name} — ${teacher?.name ?? "Teacher"}`,
          teacherId: tid,
          levelId: level.id,
          maxStudents: defaultMaxStudents ? parseInt(defaultMaxStudents) : 10,
        });
      }
    }
  }

  res.status(201).json(await enrichLevel(level));
});

/* ─── PUT /levels/:id ─── */
router.put("/levels/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  if (user.role !== "admin") { res.status(403).json({ error: "Admins only" }); return; }

  const id = parseInt((req.params.id as string));
  if (!id) { res.status(400).json({ error: "Invalid level ID" }); return; }

  const { name, nameAr, description, descriptionAr, durationWeeks, sessionsPerWeek, price, teacherIds, defaultMaxStudents, programId, sessionType } = req.body as any;
  const updateData: Record<string, unknown> = {};
  if (name !== undefined) updateData.name = name.trim();
  if (nameAr !== undefined) updateData.nameAr = nameAr?.trim() || null;
  if (description !== undefined) updateData.description = description?.trim() ?? null;
  if (descriptionAr !== undefined) updateData.descriptionAr = descriptionAr?.trim() || null;
  if (durationWeeks !== undefined) updateData.durationWeeks = parseInt(durationWeeks);
  if (sessionsPerWeek !== undefined) updateData.sessionsPerWeek = parseInt(sessionsPerWeek);
  if (price !== undefined) updateData.price = price.toString();
  if (programId !== undefined) updateData.programId = programId ? parseInt(programId) : null;
  if (sessionType !== undefined) updateData.sessionType = sessionType?.trim() ?? null;

  const [level] = await db.update(levelsTable).set(updateData).where(eq(levelsTable.id, id)).returning();
  if (!level) { res.status(404).json({ error: "Level not found" }); return; }

  if (Array.isArray(teacherIds)) {
    for (const teacherId of teacherIds) {
      const tid = parseInt(teacherId);
      if (!tid) continue;
      const existing = await db.select({ id: groupsTable.id })
        .from(groupsTable)
        .where(and(eq(groupsTable.levelId, id), eq(groupsTable.teacherId, tid)));
      if (existing.length === 0) {
        const [teacher] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, tid));
        await db.insert(groupsTable).values({
          name: `${level.name} — ${teacher?.name ?? "Teacher"}`,
          teacherId: tid,
          levelId: id,
          maxStudents: defaultMaxStudents ? parseInt(defaultMaxStudents) : 10,
        });
      }
    }
  }

  res.json(await enrichLevel(level));
});

/* ─── DELETE /levels/:id ─── */
router.delete("/levels/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  if (user.role !== "admin") { res.status(403).json({ error: "Admins only" }); return; }

  const id = parseInt((req.params.id as string));
  if (!id) { res.status(400).json({ error: "Invalid level ID" }); return; }

  const [countResult] = await db
    .select({ count: sql<number>`CAST(count(*) AS INTEGER)` })
    .from(studentsTable)
    .where(eq(studentsTable.levelId, id));

  if ((countResult?.count ?? 0) > 0) {
    res.status(409).json({
      error: "active_students",
      count: countResult.count,
      message: `This level has ${countResult.count} active student(s). Please reassign them before deleting.`,
    });
    return;
  }

  const [deleted] = await db.delete(levelsTable).where(eq(levelsTable.id, id)).returning({ id: levelsTable.id });
  if (!deleted) { res.status(404).json({ error: "Level not found" }); return; }

  res.json({ message: "Level deleted successfully" });
});

/* ─── GET /levels/:id/eligible-students ─── */
router.get("/levels/:id/eligible-students", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const id = parseInt((req.params.id as string));
  if (!id) { res.status(400).json({ error: "Invalid level ID" }); return; }

  const rows = await db
    .select({
      studentId: groupStudentsTable.studentId,
      groupId: groupStudentsTable.groupId,
    })
    .from(groupStudentsTable)
    .innerJoin(groupsTable, eq(groupStudentsTable.groupId, groupsTable.id))
    .where(eq(groupsTable.levelId, id));

  res.json(rows);
});

export default router;

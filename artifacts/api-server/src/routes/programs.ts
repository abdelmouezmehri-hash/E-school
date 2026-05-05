import { Router, type IRouter, type Request, type Response } from "express";
import { eq, sql } from "drizzle-orm";
import { db, programsTable, levelsTable, usersTable, groupsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

async function enrichProgram(program: typeof programsTable.$inferSelect) {
  const levels = await db
    .select()
    .from(levelsTable)
    .where(eq(levelsTable.programId, program.id))
    .orderBy(levelsTable.name);

  let leadSpecialist: { id: number; name: string; role: string } | null = null;
  if (program.leadSpecialistId) {
    const [u] = await db
      .select({ id: usersTable.id, name: usersTable.name, role: usersTable.role })
      .from(usersTable)
      .where(eq(usersTable.id, program.leadSpecialistId));
    leadSpecialist = u ?? null;
  }

  const isPsych = program.type === "psychological";

  const levelsEnriched = await Promise.all(levels.map(async (l) => {
    let linkedGroups: { id: number; name: string; teacherName: string | null }[] = [];
    if (isPsych) {
      const groups = await db
        .select({ id: groupsTable.id, name: groupsTable.name, teacherId: groupsTable.teacherId })
        .from(groupsTable)
        .where(eq((groupsTable as any).psychologicalLevelId, l.id));
      linkedGroups = await Promise.all(groups.map(async (g) => {
        const teacher = g.teacherId
          ? await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, g.teacherId)).then(r => r[0])
          : null;
        return { id: g.id, name: g.name, teacherName: teacher?.name ?? null };
      }));
    }
    return { ...l, price: parseFloat(String(l.price)), createdAt: l.createdAt.toISOString(), linkedGroups };
  }));

  return {
    ...program,
    createdAt: program.createdAt.toISOString(),
    leadSpecialist,
    levels: levelsEnriched,
    levelCount: levels.length,
  };
}

/* ── GET /programs ── */
router.get("/programs", requireAuth, async (_req: Request, res: Response): Promise<void> => {
  const programs = await db.select().from(programsTable).orderBy(programsTable.name);
  const enriched = await Promise.all(programs.map(enrichProgram));
  res.json(enriched);
});

/* ── GET /programs/:id ── */
router.get("/programs/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const id = parseInt((req.params.id as string));
  if (!id) { res.status(400).json({ error: "Invalid program ID" }); return; }
  const [program] = await db.select().from(programsTable).where(eq(programsTable.id, id));
  if (!program) { res.status(404).json({ error: "Program not found" }); return; }
  res.json(await enrichProgram(program));
});

/* ── POST /programs ── */
router.post("/programs", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  if (user.role !== "admin") { res.status(403).json({ error: "Admins only" }); return; }

  const { name, nameAr, type, description, descriptionAr, leadSpecialistId } = req.body as any;
  if (!name?.trim()) { res.status(400).json({ error: "Name is required" }); return; }
  if (!type || !["language", "psychological"].includes(type)) {
    res.status(400).json({ error: "Type must be 'language' or 'psychological'" }); return;
  }

  const [program] = await db.insert(programsTable).values({
    name: name.trim(),
    nameAr: nameAr?.trim() || null,
    type,
    description: description?.trim() ?? null,
    descriptionAr: descriptionAr?.trim() || null,
    leadSpecialistId: leadSpecialistId ? parseInt(leadSpecialistId) : null,
  }).returning();

  res.status(201).json(await enrichProgram(program));
});

/* ── PUT /programs/:id ── */
router.put("/programs/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  if (user.role !== "admin") { res.status(403).json({ error: "Admins only" }); return; }

  const id = parseInt((req.params.id as string));
  if (!id) { res.status(400).json({ error: "Invalid program ID" }); return; }

  const { name, nameAr, type, description, descriptionAr, leadSpecialistId } = req.body as any;
  const updateData: Record<string, unknown> = {};
  if (name !== undefined) updateData.name = name.trim();
  if (nameAr !== undefined) updateData.nameAr = nameAr?.trim() || null;
  if (type !== undefined) updateData.type = type;
  if (description !== undefined) updateData.description = description?.trim() ?? null;
  if (descriptionAr !== undefined) updateData.descriptionAr = descriptionAr?.trim() || null;
  if (leadSpecialistId !== undefined) updateData.leadSpecialistId = leadSpecialistId ? parseInt(leadSpecialistId) : null;

  const [program] = await db.update(programsTable).set(updateData).where(eq(programsTable.id, id)).returning();
  if (!program) { res.status(404).json({ error: "Program not found" }); return; }

  res.json(await enrichProgram(program));
});

/* ── DELETE /programs/:id ── */
router.delete("/programs/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  if (user.role !== "admin") { res.status(403).json({ error: "Admins only" }); return; }

  const id = parseInt((req.params.id as string));
  if (!id) { res.status(400).json({ error: "Invalid program ID" }); return; }

  const [countResult] = await db
    .select({ count: sql<number>`CAST(count(*) AS INTEGER)` })
    .from(levelsTable)
    .where(eq(levelsTable.programId, id));

  if ((countResult?.count ?? 0) > 0) {
    res.status(409).json({
      error: "has_levels",
      count: countResult.count,
      message: `This program has ${countResult.count} level(s). Please remove them first.`,
    });
    return;
  }

  const [deleted] = await db.delete(programsTable).where(eq(programsTable.id, id)).returning({ id: programsTable.id });
  if (!deleted) { res.status(404).json({ error: "Program not found" }); return; }

  res.json({ message: "Program deleted successfully" });
});

export default router;

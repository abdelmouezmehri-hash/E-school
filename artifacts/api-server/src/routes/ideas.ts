import { Router } from "express";
import { db, ideasTable, usersTable } from "@workspace/db";
import { desc, eq, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();

// GET /api/ideas — own ideas for all users; all ideas for admin
router.get("/ideas", requireAuth, async (req, res) => {
  const user = (req as any).user;
  try {
    const rows = await db
      .select({
        id: ideasTable.id,
        title: ideasTable.title,
        description: ideasTable.description,
        category: ideasTable.category,
        status: ideasTable.status,
        attachmentUrl: ideasTable.attachmentUrl,
        attachmentType: ideasTable.attachmentType,
        adminFeedback: ideasTable.adminFeedback,
        adminFeedbackAr: ideasTable.adminFeedbackAr,
        submittedBy: ideasTable.submittedBy,
        submitterName: usersTable.name,
        submitterRole: usersTable.role,
        createdAt: ideasTable.createdAt,
        updatedAt: ideasTable.updatedAt,
      })
      .from(ideasTable)
      .leftJoin(usersTable, eq(ideasTable.submittedBy, usersTable.id))
      .where(user.role === "admin" ? undefined : eq(ideasTable.submittedBy, user.id))
      .orderBy(desc(ideasTable.createdAt));

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch ideas" });
  }
});

// GET /api/ideas/new-count
router.get("/ideas/new-count", requireAuth, async (req, res) => {
  const user = (req as any).user;
  try {
    if (user.role === "admin") {
      const result = await db
        .select({ count: sql<number>`CAST(count(*) AS INTEGER)` })
        .from(ideasTable)
        .where(eq(ideasTable.status, "under_review"));
      res.json({ count: result[0]?.count ?? 0 });
    } else {
      const result = await db
        .select({ count: sql<number>`CAST(count(*) AS INTEGER)` })
        .from(ideasTable)
        .where(sql`submitted_by = ${user.id} AND status = 'approved'`);
      res.json({ count: result[0]?.count ?? 0 });
    }
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch count" });
  }
});

// POST /api/ideas — all authenticated users can submit
router.post("/ideas", requireAuth, async (req, res) => {
  const user = (req as any).user;
  const { title, description, category, attachmentUrl, attachmentType } = req.body;

  if (!title || !description || !category) {
    return void res.status(400).json({ error: "title, description, category are required" });
  }

  const validCategories = ["marketing_idea", "educational_activity", "system_improvement", "event_suggestion"];
  if (!validCategories.includes(category)) {
    return void res.status(400).json({ error: "Invalid category" });
  }

  try {
    const [idea] = await db
      .insert(ideasTable)
      .values({
        title: title.trim(),
        description: description.trim(),
        category,
        attachmentUrl: attachmentUrl || null,
        attachmentType: attachmentType || null,
        submittedBy: user.id,
      })
      .returning();

    res.status(201).json(idea);
  } catch (err) {
    res.status(500).json({ error: "Failed to submit idea" });
  }
});

// PATCH /api/ideas/:id — admin: update status or leave feedback
router.patch("/ideas/:id", requireAuth, async (req, res) => {
  const user = (req as any).user;
  if (user.role !== "admin") return void res.status(403).json({ error: "Forbidden" });

  const id = parseInt((req.params.id as string));
  if (isNaN(id)) return void res.status(400).json({ error: "Invalid id" });

  const validStatuses = ["under_review", "approved", "done", "archived"];
  const { status, adminFeedback, adminFeedbackAr } = req.body;

  if (status && !validStatuses.includes(status)) {
    return void res.status(400).json({ error: "Invalid status" });
  }

  const updates: Record<string, any> = { updatedAt: new Date() };
  if (status !== undefined) updates.status = status;
  if (adminFeedback !== undefined) updates.adminFeedback = adminFeedback;
  if (adminFeedbackAr !== undefined) updates.adminFeedbackAr = adminFeedbackAr;
  updates.reviewedBy = user.id;

  try {
    const [updated] = await db
      .update(ideasTable)
      .set(updates)
      .where(eq(ideasTable.id, id))
      .returning();

    if (!updated) return void res.status(404).json({ error: "Idea not found" });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Failed to update idea" });
  }
});

// DELETE /api/ideas/:id — admin only
router.delete("/ideas/:id", requireAuth, async (req, res) => {
  const user = (req as any).user;
  if (user.role !== "admin") return void res.status(403).json({ error: "Forbidden" });

  const id = parseInt((req.params.id as string));
  if (isNaN(id)) return void res.status(400).json({ error: "Invalid id" });

  try {
    await db.delete(ideasTable).where(eq(ideasTable.id, id));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete idea" });
  }
});

export default router;

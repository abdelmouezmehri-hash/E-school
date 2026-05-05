import { Router } from "express";
import { db, schoolNewsTable, usersTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();

// GET /api/news — all authenticated users, optional ?category= filter
router.get("/news", requireAuth, async (req, res) => {
  try {
    const { category } = req.query as { category?: string };

    const selectFields = {
      id: schoolNewsTable.id,
      title: schoolNewsTable.title,
      titleAr: schoolNewsTable.titleAr,
      content: schoolNewsTable.content,
      contentAr: schoolNewsTable.contentAr,
      imageUrl: schoolNewsTable.imageUrl,
      category: schoolNewsTable.category,
      authorId: schoolNewsTable.authorId,
      authorName: usersTable.name,
      createdAt: schoolNewsTable.createdAt,
    };

    const validCategories = ["school_update", "educational_tip", "event_gallery"];

    if (category && validCategories.includes(category)) {
      const items = await db
        .select(selectFields)
        .from(schoolNewsTable)
        .leftJoin(usersTable, eq(schoolNewsTable.authorId, usersTable.id))
        .where(eq(schoolNewsTable.category, category as any))
        .orderBy(desc(schoolNewsTable.createdAt));
      return void res.json(items);
    }

    const items = await db
      .select(selectFields)
      .from(schoolNewsTable)
      .leftJoin(usersTable, eq(schoolNewsTable.authorId, usersTable.id))
      .orderBy(desc(schoolNewsTable.createdAt));
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch news" });
  }
});

// POST /api/news — admin only
router.post("/news", requireAuth, async (req, res) => {
  const user = (req as any).user;
  if (!["admin", "teacher"].includes(user.role)) return void res.status(403).json({ error: "Forbidden" });

  const { title, titleAr, content, contentAr, imageUrl, category } = req.body;
  if (!title || !content) return void res.status(400).json({ error: "title and content are required" });

  const validCategories = ["school_update", "educational_tip", "event_gallery"];
  const cat = validCategories.includes(category) ? category : "school_update";

  try {
    const [item] = await db
      .insert(schoolNewsTable)
      .values({
        title,
        titleAr: titleAr?.trim() || null,
        content,
        contentAr: contentAr?.trim() || null,
        imageUrl: imageUrl || null,
        category: cat,
        authorId: user.id,
      })
      .returning();
    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ error: "Failed to create news" });
  }
});

// DELETE /api/news/:id — admin only
router.delete("/news/:id", requireAuth, async (req, res) => {
  const user = (req as any).user;
  if (!["admin", "teacher"].includes(user.role)) return void res.status(403).json({ error: "Forbidden" });

  const id = parseInt((req.params.id as string));
  if (isNaN(id)) return void res.status(400).json({ error: "Invalid id" });

  try {
    await db.delete(schoolNewsTable).where(eq(schoolNewsTable.id, id));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete news" });
  }
});

export default router;

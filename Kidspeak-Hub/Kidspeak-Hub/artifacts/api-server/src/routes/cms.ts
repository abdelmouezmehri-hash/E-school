import { Router } from "express";
import { db } from "@workspace/db";
import { cmsSettings, customPages } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth";

const router = Router();

// ── PUBLIC: read CMS settings ────────────────────────────────────────────────
router.get("/public/cms/settings/:key", async (req, res) => {
  try {
    const { key } = req.params;
    const [row] = await db.select().from(cmsSettings).where(eq(cmsSettings.key, key));
    if (!row) return res.json({ key, data: null });
    return res.json({ key, data: JSON.parse(row.valueJson) });
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch CMS setting" });
  }
});

// ── PUBLIC: list all CMS settings keys ───────────────────────────────────────
router.get("/public/cms/settings", async (_req, res) => {
  try {
    const rows = await db.select().from(cmsSettings);
    const result: Record<string, any> = {};
    for (const row of rows) {
      try { result[row.key] = JSON.parse(row.valueJson); } catch { result[row.key] = {}; }
    }
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch CMS settings" });
  }
});

// ── PUBLIC: list published custom pages ──────────────────────────────────────
router.get("/public/pages", async (_req, res) => {
  try {
    const pages = await db.select().from(customPages).where(eq(customPages.status, "published"));
    return res.json(pages);
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch pages" });
  }
});

// ── PUBLIC: get single published page by slug ─────────────────────────────────
router.get("/public/pages/:slug", async (req, res) => {
  try {
    const { slug } = req.params;
    const [page] = await db.select().from(customPages).where(eq(customPages.slug, slug));
    if (!page || page.status !== "published") return res.status(404).json({ error: "Page not found" });
    return res.json(page);
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch page" });
  }
});

// ── ADMIN: upsert a CMS setting ──────────────────────────────────────────────
router.put(
  "/admin/cms/settings/:key",
  requireAuth,
  await requireRole(["admin"]),
  async (req, res) => {
    try {
      const { key } = req.params;
      const valueJson = JSON.stringify(req.body);
      const existing = await db.select().from(cmsSettings).where(eq(cmsSettings.key, key));
      if (existing.length > 0) {
        await db.update(cmsSettings)
          .set({ valueJson, updatedAt: new Date() })
          .where(eq(cmsSettings.key, key));
      } else {
        await db.insert(cmsSettings).values({ key, valueJson });
      }
      return res.json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: "Failed to save CMS setting" });
    }
  }
);

// ── ADMIN: list all custom pages ─────────────────────────────────────────────
router.get("/admin/cms/pages", requireAuth, await requireRole(["admin"]), async (_req, res) => {
  try {
    const pages = await db.select().from(customPages).orderBy(customPages.createdAt);
    return res.json(pages);
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch pages" });
  }
});

// ── ADMIN: create a custom page ──────────────────────────────────────────────
router.post("/admin/cms/pages", requireAuth, await requireRole(["admin"]), async (req, res) => {
  try {
    const { titleEn, titleAr, slug, contentEn, contentAr, status, showInNavbar, showInFooter } = req.body;
    if (!titleEn || !slug) return res.status(400).json({ error: "Title and slug are required" });
    // Check slug uniqueness
    const existing = await db.select().from(customPages).where(eq(customPages.slug, slug));
    if (existing.length > 0) return res.status(409).json({ error: "A page with this slug already exists" });
    const cleanSlug = slug.startsWith("/") ? slug : `/${slug}`;
    const [page] = await db.insert(customPages).values({
      titleEn,
      titleAr: titleAr ?? "",
      slug: cleanSlug,
      contentEn: contentEn ?? "",
      contentAr: contentAr ?? "",
      status: status ?? "draft",
      showInNavbar: showInNavbar ?? false,
      showInFooter: showInFooter ?? false,
    }).returning();
    return res.status(201).json(page);
  } catch (err) {
    return res.status(500).json({ error: "Failed to create page" });
  }
});

// ── ADMIN: update a custom page ──────────────────────────────────────────────
router.put("/admin/cms/pages/:id", requireAuth, await requireRole(["admin"]), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { titleEn, titleAr, slug, contentEn, contentAr, status, showInNavbar, showInFooter } = req.body;
    if (!titleEn || !slug) return res.status(400).json({ error: "Title and slug are required" });
    // Check slug uniqueness (exclude self)
    const existing = await db.select().from(customPages).where(eq(customPages.slug, slug));
    if (existing.length > 0 && existing[0].id !== id) return res.status(409).json({ error: "A page with this slug already exists" });
    const cleanSlug = slug.startsWith("/") ? slug : `/${slug}`;
    await db.update(customPages).set({
      titleEn,
      titleAr: titleAr ?? "",
      slug: cleanSlug,
      contentEn: contentEn ?? "",
      contentAr: contentAr ?? "",
      status: status ?? "draft",
      showInNavbar: showInNavbar ?? false,
      showInFooter: showInFooter ?? false,
      updatedAt: new Date(),
    }).where(eq(customPages.id, id));
    const [updated] = await db.select().from(customPages).where(eq(customPages.id, id));
    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ error: "Failed to update page" });
  }
});

// ── ADMIN: delete a custom page ──────────────────────────────────────────────
router.delete("/admin/cms/pages/:id", requireAuth, await requireRole(["admin"]), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(customPages).where(eq(customPages.id, id));
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: "Failed to delete page" });
  }
});

// ── ADMIN: /admin/pages aliases (used by page builder UI) ─────────────────────
router.get("/admin/pages", requireAuth, await requireRole(["admin"]), async (_req, res) => {
  try {
    const pages = await db.select().from(customPages).orderBy(customPages.createdAt);
    return res.json(pages);
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch pages" });
  }
});

router.post("/admin/pages", requireAuth, await requireRole(["admin"]), async (req, res) => {
  try {
    const { titleEn, titleAr, slug, contentEn, contentAr, status, showInNavbar, showInFooter } = req.body;
    if (!titleEn || !slug) return res.status(400).json({ error: "titleEn and slug required" });
    const existing = await db.select().from(customPages).where(eq(customPages.slug, slug));
    if (existing.length > 0) return res.status(409).json({ error: "Slug already exists" });
    const cleanSlug = slug.startsWith("/") ? slug : `/${slug}`;
    const [page] = await db.insert(customPages).values({
      titleEn, titleAr: titleAr ?? titleEn, slug: cleanSlug,
      contentEn: contentEn ?? "", contentAr: contentAr ?? "",
      status: status ?? "draft", showInNavbar: showInNavbar ?? false, showInFooter: showInFooter ?? false,
    }).returning();
    return res.json(page);
  } catch (err) {
    return res.status(500).json({ error: "Failed to create page" });
  }
});

router.put("/admin/pages/:id", requireAuth, await requireRole(["admin"]), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const updates: Record<string, any> = { updatedAt: new Date() };
    const { titleEn, titleAr, contentEn, contentAr, status, showInNavbar, showInFooter } = req.body;
    if (titleEn !== undefined) updates.titleEn = titleEn;
    if (titleAr !== undefined) updates.titleAr = titleAr;
    if (contentEn !== undefined) updates.contentEn = contentEn;
    if (contentAr !== undefined) updates.contentAr = contentAr;
    if (status !== undefined) updates.status = status;
    if (showInNavbar !== undefined) updates.showInNavbar = showInNavbar;
    if (showInFooter !== undefined) updates.showInFooter = showInFooter;
    const [updated] = await db.update(customPages).set(updates).where(eq(customPages.id, id)).returning();
    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ error: "Failed to update page" });
  }
});

router.delete("/admin/pages/:id", requireAuth, await requireRole(["admin"]), async (req, res) => {
  try {
    await db.delete(customPages).where(eq(customPages.id, parseInt(req.params.id)));
    return res.json({ message: "Deleted" });
  } catch (err) {
    return res.status(500).json({ error: "Failed to delete page" });
  }
});

export default router;

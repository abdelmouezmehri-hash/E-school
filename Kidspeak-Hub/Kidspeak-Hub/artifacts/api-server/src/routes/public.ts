import { Router, type Request, type Response } from "express";
import { db, schoolSettingsTable, publicEnquiriesTable, levelsTable } from "@workspace/db";
import { desc, isNotNull } from "drizzle-orm";

const router = Router();

// Helper to get or create settings
async function getSettings() {
  const rows = await db.select().from(schoolSettingsTable).limit(1);
  if (rows.length > 0) return rows[0];
  const [created] = await db.insert(schoolSettingsTable).values({}).returning();
  return created;
}

// ── GET /api/public/settings — school brand info (no auth required) ──────────
router.get("/public/settings", async (_req: Request, res: Response): Promise<void> => {
  try {
    const settings = await getSettings();
    res.json({
      schoolName: settings.schoolName,
      slogan: settings.slogan,
      sloganAr: settings.sloganAr,
      address: settings.address,
      phone: settings.phone,
      phone2: settings.phone2,
      email: settings.email,
      website: settings.website,
      instagram: settings.instagram,
      facebook: settings.facebook,
      youtube: settings.youtube,
      tiktok: settings.tiktok,
      logoUrl: settings.logoUrl,
      logoWhiteUrl: settings.logoWhiteUrl,
      primaryColor: settings.primaryColor,
      secondaryColor: settings.secondaryColor,
    });
  } catch {
    res.status(500).json({ error: "Failed to fetch settings" });
  }
});

// ── GET /api/public/levels — program levels for landing page ─────────────────
router.get("/public/levels", async (_req: Request, res: Response): Promise<void> => {
  try {
    const levels = await db
      .select({
        id: levelsTable.id,
        name: levelsTable.name,
        nameAr: levelsTable.nameAr,
        description: levelsTable.description,
        descriptionAr: levelsTable.descriptionAr,
        price: levelsTable.price,
        durationWeeks: levelsTable.durationWeeks,
        sessionsPerWeek: levelsTable.sessionsPerWeek,
      })
      .from(levelsTable)
      .where(isNotNull(levelsTable.programId))
      .orderBy(levelsTable.id);
    res.json(levels.map(l => ({ ...l, price: parseFloat(l.price) })));
  } catch {
    res.status(500).json({ error: "Failed to fetch levels" });
  }
});

// ── POST /api/public/enquiry — enrollment enquiry (no auth required) ─────────
router.post("/public/enquiry", async (req: Request, res: Response): Promise<void> => {
  const { parentName, parentPhone, parentEmail, childName, childAge, preferredLevel, notes } = req.body;

  if (!parentName?.trim() || !parentPhone?.trim() || !childName?.trim()) {
    res.status(400).json({ error: "parentName, parentPhone, and childName are required" });
    return;
  }

  try {
    await db.insert(publicEnquiriesTable).values({
      parentName: parentName.trim(),
      parentPhone: parentPhone.trim(),
      parentEmail: parentEmail?.trim() || null,
      childName: childName.trim(),
      childAge: childAge?.trim() || null,
      preferredLevel: preferredLevel?.trim() || null,
      notes: notes?.trim() || null,
    });
    res.status(201).json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to submit enquiry" });
  }
});

// ── GET /api/admin/enquiries — admin: view all enquiries ────────────────────
import { requireAuth } from "../middlewares/auth";
router.get("/admin/enquiries", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  if (user.role !== "admin") {
    res.status(403).json({ error: "Admin only" });
    return;
  }
  try {
    const rows = await db
      .select()
      .from(publicEnquiriesTable)
      .orderBy(desc(publicEnquiriesTable.createdAt));
    res.json(rows);
  } catch {
    res.status(500).json({ error: "Failed to fetch enquiries" });
  }
});

export default router;

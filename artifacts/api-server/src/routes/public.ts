import { Router, type Request, type Response } from "express";
import { db, schoolSettingsTable, publicEnquiriesTable, levelsTable, groupsTable, groupStudentsTable, cmsSettings, usersTable } from "@workspace/db";
import { desc, isNotNull, eq, sql, and } from "drizzle-orm";

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

// ── GET /api/public/levels — program levels with PUBLIC available groups ─────
// Only returns groups where is_public = true AND not full. Each group also
// carries its weekly schedule + the teacher's display info (name + photo +
// specialization) for the landing-page card.
router.get("/public/levels", async (_req: Request, res: Response): Promise<void> => {
  try {
    // Load admin programs display config
    const [configRow] = await db.select().from(cmsSettings).where(eq(cmsSettings.key, "programs_display_v1"));
    const programsConfig: { levelId: number; visible: boolean; landingDescription?: string }[] =
      configRow ? JSON.parse(configRow.valueJson) : [];

    // Fetch all levels that belong to a program
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

    // For each level apply visibility + custom description + fetch public, non-full groups
    const result = [];
    for (const level of levels) {
      const cfg = programsConfig.find(c => c.levelId === level.id);
      // If admin has explicitly hidden this level, skip it
      if (cfg && cfg.visible === false) continue;

      // Fetch groups for this level with enrolled count + teacher info.
      // is_public = true is enforced at the SQL layer so closed groups are
      // never sent to the public endpoint.
      const groups = await db
        .select({
          id: groupsTable.id,
          name: groupsTable.name,
          schedule: groupsTable.schedule,
          maxStudents: groupsTable.maxStudents,
          recurringDays: groupsTable.recurringDays,
          sessionStartTime: groupsTable.sessionStartTime,
          sessionDayTimes: groupsTable.sessionDayTimes,
          sessionDurationMins: groupsTable.sessionDurationMins,
          startDate: groupsTable.startDate,
          teacherId: groupsTable.teacherId,
          teacherName: usersTable.name,
          teacherPhoto: usersTable.profilePicture,
          teacherSpecialization: usersTable.specialization,
          enrolledCount: sql<number>`(SELECT COUNT(*) FROM group_students WHERE group_id = ${groupsTable.id})::int`,
        })
        .from(groupsTable)
        .leftJoin(usersTable, eq(groupsTable.teacherId, usersTable.id))
        .where(and(eq(groupsTable.levelId, level.id), eq(groupsTable.isPublic, true)));

      // Keep only non-full groups
      const availableGroups = groups
        .filter(g => g.enrolledCount < (g.maxStudents ?? 10))
        .map(g => ({
          ...g,
          // Compute remaining slots for the UI badge
          spotsRemaining: (g.maxStudents ?? 10) - g.enrolledCount,
        }));

      result.push({
        ...level,
        price: level.price,
        landingDescription: cfg?.landingDescription || null,
        groups: availableGroups,
      });
    }

    res.json(result);
  } catch (err) {
    console.error("public/levels error:", err);
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

// ── GET /api/admin/programs-display — admin: get all levels with display config
router.get("/admin/programs-display", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  if (user.role !== "admin") { res.status(403).json({ error: "Admin only" }); return; }
  try {
    const levels = await db
      .select({
        id: levelsTable.id,
        name: levelsTable.name,
        nameAr: levelsTable.nameAr,
        description: levelsTable.description,
        descriptionAr: levelsTable.descriptionAr,
        price: levelsTable.price,
      })
      .from(levelsTable)
      .where(isNotNull(levelsTable.programId))
      .orderBy(levelsTable.id);

    const [configRow] = await db.select().from(cmsSettings).where(eq(cmsSettings.key, "programs_display_v1"));
    const programsConfig: { levelId: number; visible: boolean; landingDescription?: string }[] =
      configRow ? JSON.parse(configRow.valueJson) : [];

    const result = levels.map(l => {
      const cfg = programsConfig.find(c => c.levelId === l.id);
      return {
        id: l.id,
        name: l.name,
        nameAr: l.nameAr,
        description: l.description,
        descriptionAr: l.descriptionAr,
        price: parseFloat(String(l.price)),
        visible: cfg ? cfg.visible : true,
        landingDescription: cfg?.landingDescription ?? "",
      };
    });

    res.json(result);
  } catch {
    res.status(500).json({ error: "Failed to fetch programs display config" });
  }
});

// ── PUT /api/admin/programs-display — admin: save programs display config ─────
router.put("/admin/programs-display", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  if (user.role !== "admin") { res.status(403).json({ error: "Admin only" }); return; }
  try {
    const levels: { levelId: number; visible: boolean; landingDescription?: string }[] = req.body;
    const valueJson = JSON.stringify(levels);
    await db
      .insert(cmsSettings)
      .values({ key: "programs_display_v1", valueJson })
      .onConflictDoUpdate({ target: cmsSettings.key, set: { valueJson } });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to save programs display config" });
  }
});

export default router;

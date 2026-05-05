import { Router, type Request, type Response } from "express";
import { eq, desc, count, and, sql, isNull } from "drizzle-orm";
import {
  db, campaignsTable, leadsTable, usersTable,
  campaignExpensesTable, levelsTable, studentsTable, paymentsTable, marketingEnrollmentRequestsTable,
} from "@workspace/db";
import { requireAuth } from "../middlewares/auth";

const router = Router();

// ── Helpers ────────────────────────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

async function enrichCampaign(c: typeof campaignsTable.$inferSelect) {
  const [stats] = await db
    .select({
      total: count(),
      newCount: sql<number>`SUM(CASE WHEN ${leadsTable.status} = 'new' THEN 1 ELSE 0 END)`,
      registeredCount: sql<number>`SUM(CASE WHEN ${leadsTable.status} = 'registered' THEN 1 ELSE 0 END)`,
    })
    .from(leadsTable)
    .where(eq(leadsTable.campaignId, c.id));

  let assignee = null;
  if (c.assignedTo) {
    const [u] = await db
      .select({ id: usersTable.id, name: usersTable.name })
      .from(usersTable)
      .where(eq(usersTable.id, c.assignedTo));
    assignee = u ?? null;
  }

  return {
    ...c,
    leadsCount: stats?.total ?? 0,
    newLeadsCount: stats?.newCount ?? 0,
    registeredCount: stats?.registeredCount ?? 0,
    conversionRate:
      stats && stats.total > 0
        ? Math.round(((stats.registeredCount ?? 0) / stats.total) * 100)
        : null,
    assignee,
  };
}

// ── LIST campaigns ─────────────────────────────────────────────────────────────
router.get("/campaigns", requireAuth, async (req: Request, res: Response) => {
  const user = (req as any).user;
  if (!["admin", "accountant"].includes(user.role) && !user.permissions?.includes("marketing_hub")) {
    return void res.status(403).json({ error: "Forbidden" });
  }

  const rows = await db
    .select()
    .from(campaignsTable)
    .orderBy(desc(campaignsTable.createdAt));

  const enriched = await Promise.all(rows.map(enrichCampaign));
  res.json(enriched);
});

// ── GET single campaign ────────────────────────────────────────────────────────
router.get("/campaigns/:id", requireAuth, async (req: Request, res: Response) => {
  const user = (req as any).user;
  if (!["admin", "accountant"].includes(user.role) && !user.permissions?.includes("marketing_hub")) {
    return void res.status(403).json({ error: "Forbidden" });
  }

  const id = parseInt((req.params.id as string));
  if (isNaN(id)) return void res.status(400).json({ error: "Invalid id" });

  const [c] = await db.select().from(campaignsTable).where(eq(campaignsTable.id, id));
  if (!c) return void res.status(404).json({ error: "Campaign not found" });

  res.json(await enrichCampaign(c));
});

// ── CREATE campaign ────────────────────────────────────────────────────────────
router.post("/campaigns", requireAuth, async (req: Request, res: Response) => {
  const user = (req as any).user;
  if (!["admin"].includes(user.role)) {
    return void res.status(403).json({ error: "Admin only" });
  }

  const {
    name, nameAr, type, startDate, endDate, ctaType,
    whatsappNumber, description, descriptionAr, branchId, assignedTo,
    landingPageEnabled, landingPageTitle, landingPageSubtitle, landingPageColor,
    heroTitleEn, heroTitleAr, heroSubtitleEn, heroSubtitleAr, heroImage,
    ctaTextEn, ctaTextAr, benefits, testimonials, accentColor, videoUrl,
  } = req.body;

  if (!name || !nameAr || !startDate || !endDate) {
    return void res.status(400).json({ error: "name, nameAr, startDate, endDate are required" });
  }

  let slug = slugify(name);
  const existing = await db
    .select({ id: campaignsTable.id })
    .from(campaignsTable)
    .where(eq(campaignsTable.slug, slug as string));
  if (existing.length > 0) slug = `${slug}-${Date.now()}`;

  const [campaign] = await db
    .insert(campaignsTable)
    .values({
      name: name.trim(),
      nameAr: nameAr.trim(),
      type: type ?? "custom",
      status: "active",
      startDate,
      endDate,
      ctaType: ctaType ?? "form",
      whatsappNumber: whatsappNumber ?? null,
      description: description ?? null,
      descriptionAr: descriptionAr ?? null,
      slug,
      branchId: branchId ? parseInt(branchId) : null,
      assignedTo: assignedTo ? parseInt(assignedTo) : null,
      createdBy: user.id,
      landingPageEnabled: landingPageEnabled ?? false,
      landingPageTitle: landingPageTitle ?? null,
      landingPageSubtitle: landingPageSubtitle ?? null,
      landingPageColor: landingPageColor ?? "#1B2E8F",
      heroTitleEn: heroTitleEn ?? null,
      heroTitleAr: heroTitleAr ?? null,
      heroSubtitleEn: heroSubtitleEn ?? null,
      heroSubtitleAr: heroSubtitleAr ?? null,
      heroImage: heroImage ?? null,
      ctaTextEn: ctaTextEn ?? null,
      ctaTextAr: ctaTextAr ?? null,
      benefits: benefits ?? null,
      testimonials: testimonials ?? null,
      accentColor: accentColor ?? "#F5A600",
      videoUrl: videoUrl ?? null,
    })
    .returning();

  res.status(201).json(await enrichCampaign(campaign));
});

// ── UPDATE campaign ────────────────────────────────────────────────────────────
router.put("/campaigns/:id", requireAuth, async (req: Request, res: Response) => {
  const user = (req as any).user;
  if (!["admin"].includes(user.role)) {
    return void res.status(403).json({ error: "Admin only" });
  }

  const id = parseInt((req.params.id as string));
  if (isNaN(id)) return void res.status(400).json({ error: "Invalid id" });

  const {
    name, nameAr, type, status, startDate, endDate, ctaType,
    whatsappNumber, description, descriptionAr, branchId, assignedTo,
    landingPageEnabled, landingPageTitle, landingPageSubtitle, landingPageColor,
    heroTitleEn, heroTitleAr, heroSubtitleEn, heroSubtitleAr, heroImage,
    ctaTextEn, ctaTextAr, benefits, testimonials, accentColor, videoUrl,
  } = req.body;

  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name.trim();
  if (nameAr !== undefined) updates.nameAr = nameAr.trim();
  if (type !== undefined) updates.type = type;
  if (status !== undefined) updates.status = status;
  if (startDate !== undefined) updates.startDate = startDate;
  if (endDate !== undefined) updates.endDate = endDate;
  if (ctaType !== undefined) updates.ctaType = ctaType;
  if (whatsappNumber !== undefined) updates.whatsappNumber = whatsappNumber || null;
  if (description !== undefined) updates.description = description || null;
  if (descriptionAr !== undefined) updates.descriptionAr = descriptionAr || null;
  if (branchId !== undefined) updates.branchId = branchId ? parseInt(branchId) : null;
  if (assignedTo !== undefined) updates.assignedTo = assignedTo ? parseInt(assignedTo) : null;
  if (landingPageEnabled !== undefined) updates.landingPageEnabled = landingPageEnabled;
  if (landingPageTitle !== undefined) updates.landingPageTitle = landingPageTitle || null;
  if (landingPageSubtitle !== undefined) updates.landingPageSubtitle = landingPageSubtitle || null;
  if (landingPageColor !== undefined) updates.landingPageColor = landingPageColor || "#1B2E8F";
  if (heroTitleEn !== undefined) updates.heroTitleEn = heroTitleEn || null;
  if (heroTitleAr !== undefined) updates.heroTitleAr = heroTitleAr || null;
  if (heroSubtitleEn !== undefined) updates.heroSubtitleEn = heroSubtitleEn || null;
  if (heroSubtitleAr !== undefined) updates.heroSubtitleAr = heroSubtitleAr || null;
  if (heroImage !== undefined) updates.heroImage = heroImage || null;
  if (ctaTextEn !== undefined) updates.ctaTextEn = ctaTextEn || null;
  if (ctaTextAr !== undefined) updates.ctaTextAr = ctaTextAr || null;
  if (benefits !== undefined) updates.benefits = benefits;
  if (testimonials !== undefined) updates.testimonials = testimonials;
  if (accentColor !== undefined) updates.accentColor = accentColor || "#F5A600";
  if (videoUrl !== undefined) updates.videoUrl = videoUrl || null;

  const [updated] = await db
    .update(campaignsTable)
    .set(updates)
    .where(eq(campaignsTable.id, id))
    .returning();

  if (!updated) return void res.status(404).json({ error: "Campaign not found" });
  res.json(await enrichCampaign(updated));
});

// ── DELETE campaign ────────────────────────────────────────────────────────────
router.delete("/campaigns/:id", requireAuth, async (req: Request, res: Response) => {
  const user = (req as any).user;
  if (!["admin"].includes(user.role)) {
    return void res.status(403).json({ error: "Admin only" });
  }

  const id = parseInt((req.params.id as string));
  if (isNaN(id)) return void res.status(400).json({ error: "Invalid id" });

  await db.delete(campaignsTable).where(eq(campaignsTable.id, id));
  res.json({ message: "Deleted" });
});

// ── LIST leads for a campaign ──────────────────────────────────────────────────
router.get("/campaigns/:id/leads", requireAuth, async (req: Request, res: Response) => {
  const user = (req as any).user;
  if (!["admin", "accountant"].includes(user.role) && !user.permissions?.includes("marketing_hub")) {
    return void res.status(403).json({ error: "Forbidden" });
  }

  const campaignId = parseInt((req.params.id as string));
  if (isNaN(campaignId)) return void res.status(400).json({ error: "Invalid id" });

  const leads = await db
    .select({
      id: leadsTable.id,
      campaignId: leadsTable.campaignId,
      parentName: leadsTable.parentName,
      parentPhone: leadsTable.parentPhone,
      parentEmail: leadsTable.parentEmail,
      childName: leadsTable.childName,
      childAge: leadsTable.childAge,
      preferredLevel: leadsTable.preferredLevel,
      source: leadsTable.source,
      status: leadsTable.status,
      notes: leadsTable.notes,
      followUpDate: leadsTable.followUpDate,
      createdAt: leadsTable.createdAt,
      updatedAt: leadsTable.updatedAt,
      assigneeName: usersTable.name,
    })
    .from(leadsTable)
    .leftJoin(usersTable, eq(leadsTable.assignedTo, usersTable.id))
    .where(eq(leadsTable.campaignId, campaignId))
    .orderBy(desc(leadsTable.createdAt));

  res.json(leads);
});

// ── LIST standalone leads (no campaign) ───────────────────────────────────────
router.get("/leads", requireAuth, async (req: Request, res: Response) => {
  const user = (req as any).user;
  if (!["admin", "accountant"].includes(user.role) && !user.permissions?.includes("marketing_hub")) {
    return void res.status(403).json({ error: "Forbidden" });
  }

  const leads = await db
    .select({
      id: leadsTable.id,
      campaignId: leadsTable.campaignId,
      parentName: leadsTable.parentName,
      parentPhone: leadsTable.parentPhone,
      parentEmail: leadsTable.parentEmail,
      childName: leadsTable.childName,
      childAge: leadsTable.childAge,
      preferredLevel: leadsTable.preferredLevel,
      source: leadsTable.source,
      status: leadsTable.status,
      notes: leadsTable.notes,
      followUpDate: leadsTable.followUpDate,
      createdAt: leadsTable.createdAt,
      updatedAt: leadsTable.updatedAt,
      assigneeName: usersTable.name,
    })
    .from(leadsTable)
    .leftJoin(usersTable, eq(leadsTable.assignedTo, usersTable.id))
    .where(isNull(leadsTable.campaignId))
    .orderBy(desc(leadsTable.createdAt));

  res.json(leads);
});

// ── ADD standalone lead ────────────────────────────────────────────────────────
router.post("/leads", requireAuth, async (req: Request, res: Response) => {
  const user = (req as any).user;
  if (!["admin", "accountant"].includes(user.role) && !user.permissions?.includes("marketing_hub")) {
    return void res.status(403).json({ error: "Forbidden" });
  }

  const { parentName, parentPhone, parentEmail, childName, childAge, preferredLevel, source, notes, followUpDate, assignedTo } = req.body;
  if (!parentName || !parentPhone || !childName) {
    return void res.status(400).json({ error: "parentName, parentPhone, childName required" });
  }

  const [lead] = await db
    .insert(leadsTable)
    .values({
      campaignId: null,
      parentName: parentName.trim(),
      parentPhone: parentPhone.trim(),
      parentEmail: parentEmail ?? null,
      childName: childName.trim(),
      childAge: childAge ?? null,
      preferredLevel: preferredLevel ?? null,
      source: source ?? "call",
      status: "new",
      assignedTo: assignedTo ? parseInt(assignedTo) : null,
      notes: notes ?? null,
      followUpDate: followUpDate ?? null,
    })
    .returning();

  res.status(201).json(lead);
});

// ── PUBLIC submit form (no auth) ───────────────────────────────────────────────
router.post("/campaigns/:slug/submit", async (req: Request, res: Response) => {
  const { slug } = req.params;

  const [campaign] = await db
    .select()
    .from(campaignsTable)
    .where(and(eq(campaignsTable.slug, slug as string), eq(campaignsTable.status, "active")));

  if (!campaign) return void res.status(404).json({ error: "Campaign not found or inactive" });

  const { parentName, parentPhone, parentEmail, childName, childAge, preferredLevel, notes } = req.body;
  if (!parentName || !parentPhone || !childName) {
    return void res.status(400).json({ error: "parentName, parentPhone, childName are required" });
  }

  const [lead] = await db
    .insert(leadsTable)
    .values({
      campaignId: campaign.id,
      parentName: parentName.trim(),
      parentPhone: parentPhone.trim(),
      parentEmail: parentEmail ?? null,
      childName: childName.trim(),
      childAge: childAge ?? null,
      preferredLevel: preferredLevel ?? null,
      source: "form",
      status: "new",
      assignedTo: campaign.assignedTo ?? null,
      notes: notes ?? null,
    })
    .returning();

  res.status(201).json({ id: lead.id, message: "Submitted successfully" });
});

// ── PUBLIC get campaign info (for landing pages) ───────────────────────────────
router.get("/public/campaigns/:slug", async (req: Request, res: Response) => {
  const [c] = await db
    .select()
    .from(campaignsTable)
    .where(and(eq(campaignsTable.slug, (req.params.slug as string)), eq(campaignsTable.status, "active")));

  if (!c) return void res.status(404).json({ error: "Not found" });

  res.json({
    id: c.id,
    name: c.name,
    nameAr: c.nameAr,
    slug: c.slug,
    ctaType: c.ctaType,
    whatsappNumber: c.whatsappNumber,
    landingPageTitle: c.landingPageTitle,
    landingPageSubtitle: c.landingPageSubtitle,
    landingPageColor: c.landingPageColor,
    heroTitleEn: c.heroTitleEn,
    heroTitleAr: c.heroTitleAr,
    heroSubtitleEn: c.heroSubtitleEn,
    heroSubtitleAr: c.heroSubtitleAr,
    heroImage: c.heroImage,
    ctaTextEn: c.ctaTextEn,
    ctaTextAr: c.ctaTextAr,
    benefits: c.benefits,
    testimonials: c.testimonials,
    accentColor: c.accentColor,
    videoUrl: c.videoUrl,
  });
});

// ── ADD lead manually (authenticated) ─────────────────────────────────────────
router.post("/campaigns/:id/leads", requireAuth, async (req: Request, res: Response) => {
  const user = (req as any).user;
  if (!["admin", "accountant"].includes(user.role) && !user.permissions?.includes("marketing_hub")) {
    return void res.status(403).json({ error: "Forbidden" });
  }

  const campaignId = parseInt((req.params.id as string));
  if (isNaN(campaignId)) return void res.status(400).json({ error: "Invalid id" });

  const { parentName, parentPhone, parentEmail, childName, childAge, preferredLevel, source, notes, followUpDate, assignedTo } = req.body;
  if (!parentName || !parentPhone || !childName) {
    return void res.status(400).json({ error: "parentName, parentPhone, childName are required" });
  }

  const [campaign] = await db
    .select({ id: campaignsTable.id, assignedTo: campaignsTable.assignedTo })
    .from(campaignsTable)
    .where(eq(campaignsTable.id, campaignId));
  if (!campaign) return void res.status(404).json({ error: "Campaign not found" });

  const [lead] = await db
    .insert(leadsTable)
    .values({
      campaignId,
      parentName: parentName.trim(),
      parentPhone: parentPhone.trim(),
      parentEmail: parentEmail ?? null,
      childName: childName.trim(),
      childAge: childAge ?? null,
      preferredLevel: preferredLevel ?? null,
      source: source ?? "call",
      status: "new",
      assignedTo: assignedTo ? parseInt(assignedTo) : (campaign.assignedTo ?? null),
      notes: notes ?? null,
      followUpDate: followUpDate ?? null,
    })
    .returning();

  res.status(201).json(lead);
});

// ── GET campaign ROI ───────────────────────────────────────────────────────────
router.get("/campaigns/:id/roi", requireAuth, async (req: Request, res: Response) => {
  const user = (req as any).user;
  if (!["admin", "accountant"].includes(user.role)) {
    return void res.status(403).json({ error: "Forbidden" });
  }

  const campaignId = parseInt((req.params.id as string));
  if (isNaN(campaignId)) return void res.status(400).json({ error: "Invalid id" });

  const [registeredLeads, expenses, levels] = await Promise.all([
    db
      .select({ id: leadsTable.id, childName: leadsTable.childName, preferredLevel: leadsTable.preferredLevel })
      .from(leadsTable)
      .where(and(eq(leadsTable.campaignId, campaignId), eq(leadsTable.status, "registered"))),
    db
      .select()
      .from(campaignExpensesTable)
      .where(eq(campaignExpensesTable.campaignId, campaignId))
      .orderBy(desc(campaignExpensesTable.createdAt)),
    db
      .select({ id: levelsTable.id, name: levelsTable.name, price: levelsTable.price })
      .from(levelsTable)
      .orderBy(levelsTable.name),
  ]);

  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);

  res.json({
    registeredLeads,
    expenses,
    levels,
    totalExpenses,
    registeredCount: registeredLeads.length,
  });
});

// ── ADD campaign expense ───────────────────────────────────────────────────────
router.post("/campaigns/:id/expenses", requireAuth, async (req: Request, res: Response) => {
  const user = (req as any).user;
  if (!["admin", "accountant"].includes(user.role)) {
    return void res.status(403).json({ error: "Forbidden" });
  }

  const campaignId = parseInt((req.params.id as string));
  if (isNaN(campaignId)) return void res.status(400).json({ error: "Invalid id" });

  const { description, amount, category } = req.body;
  if (!description || amount === undefined) {
    return void res.status(400).json({ error: "description and amount required" });
  }

  const [expense] = await db
    .insert(campaignExpensesTable)
    .values({
      campaignId,
      description: description.trim(),
      amount: parseFloat(amount),
      category: category ?? "other",
    })
    .returning();

  res.status(201).json(expense);
});

// ── DELETE campaign expense ────────────────────────────────────────────────────
router.delete("/campaigns/expenses/:id", requireAuth, async (req: Request, res: Response) => {
  const user = (req as any).user;
  if (!["admin", "accountant"].includes(user.role)) {
    return void res.status(403).json({ error: "Forbidden" });
  }

  const id = parseInt((req.params.id as string));
  if (isNaN(id)) return void res.status(400).json({ error: "Invalid id" });

  await db.delete(campaignExpensesTable).where(eq(campaignExpensesTable.id, id));
  res.json({ message: "Deleted" });
});

// ── UPDATE lead ────────────────────────────────────────────────────────────────
router.patch("/leads/:id", requireAuth, async (req: Request, res: Response) => {
  const user = (req as any).user;
  if (!["admin", "accountant"].includes(user.role) && !user.permissions?.includes("marketing_hub")) {
    return void res.status(403).json({ error: "Forbidden" });
  }

  const id = parseInt((req.params.id as string));
  if (isNaN(id)) return void res.status(400).json({ error: "Invalid id" });

  const { status, notes, followUpDate, assignedTo } = req.body;
  const updates: Record<string, unknown> = {
    updatedAt: new Date(),
  };
  if (status !== undefined) updates.status = status;
  if (notes !== undefined) updates.notes = notes || null;
  if (followUpDate !== undefined) updates.followUpDate = followUpDate || null;
  if (assignedTo !== undefined) updates.assignedTo = assignedTo ? parseInt(assignedTo) : null;

  const [updated] = await db
    .update(leadsTable)
    .set(updates)
    .where(eq(leadsTable.id, id))
    .returning();

  if (!updated) return void res.status(404).json({ error: "Lead not found" });
  res.json(updated);
});

// ── CONVERT lead to student ────────────────────────────────────────────────────
router.post("/leads/:id/convert-to-student", requireAuth, async (req: Request, res: Response) => {
  const user = (req as any).user;
  if (!["admin"].includes(user.role)) {
    return void res.status(403).json({ error: "Admin only" });
  }

  const leadId = parseInt((req.params.id as string));
  if (isNaN(leadId)) return void res.status(400).json({ error: "Invalid id" });

  const [lead] = await db.select().from(leadsTable).where(eq(leadsTable.id, leadId));
  if (!lead) return void res.status(404).json({ error: "Lead not found" });

  const {
    name, gender, dateOfBirth, levelId, branchId,
    guardianName, guardianPhone, guardianPhone2,
    notes, enrollmentDate,
  } = req.body;

  if (!name) return void res.status(400).json({ error: "Student name is required" });

  try {
    const [student] = await db
      .insert(studentsTable)
      .values({
        name: name.trim(),
        gender: gender ?? null,
        dateOfBirth: dateOfBirth ?? null,
        levelId: levelId ? parseInt(levelId) : null,
        branchId: branchId ? parseInt(branchId) : null,
        guardianName: guardianName ?? lead.parentName,
        guardianPhone: guardianPhone ?? lead.parentPhone,
        guardianPhone2: guardianPhone2 ?? null,
        referralSource: `campaign_lead_${leadId}`,
        notes: notes ?? lead.notes ?? null,
        enrollmentDate: enrollmentDate ?? new Date().toISOString().split("T")[0],
        behavioralFlags: [],
      })
      .returning();

    let payment = null;
    if (levelId) {
      const [level] = await db
        .select({ id: levelsTable.id, price: levelsTable.price })
        .from(levelsTable)
        .where(eq(levelsTable.id, parseInt(levelId)));

      if (level) {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 30);
        const [newPayment] = await db
          .insert(paymentsTable)
          .values({
            studentId: student.id,
            levelId: level.id,
            amountDue: level.price ?? 0,
            amountPaid: 0,
            status: "pending",
            dueDate: dueDate.toISOString().split("T")[0],
          })
          .returning();
        payment = newPayment;
      }
    }

    await db
      .update(leadsTable)
      .set({ status: "registered", updatedAt: new Date() })
      .where(eq(leadsTable.id, leadId));

    return void res.json({ success: true, student, payment });
  } catch (err) {
    console.error("convert-to-student error:", err);
    return void res.status(500).json({ error: "Failed to convert lead to student" });
  }
});

// ── POST /leads/:id/request-enrollment ─────────────────────────────────────────
router.post("/leads/:id/request-enrollment", requireAuth, async (req: Request, res: Response) => {
  const user = (req as any).user;
  if (!["admin", "accountant"].includes(user.role)) {
    return void res.status(403).json({ error: "Forbidden" });
  }

  const leadId = parseInt((req.params.id as string));
  if (isNaN(leadId)) return void res.status(400).json({ error: "Invalid id" });

  const [lead] = await db.select().from(leadsTable).where(eq(leadsTable.id, leadId));
  if (!lead) return void res.status(404).json({ error: "Lead not found" });

  const existing = await db
    .select()
    .from(marketingEnrollmentRequestsTable)
    .where(eq(marketingEnrollmentRequestsTable.leadId, leadId));

  if (existing.length > 0 && existing[0].status === "pending") {
    return void res.status(409).json({ error: "Enrollment request already exists" });
  }

  const [request] = await db
    .insert(marketingEnrollmentRequestsTable)
    .values({
      leadId,
      campaignId: lead.campaignId ?? null,
      childName: lead.childName,
      parentName: lead.parentName,
      parentPhone: lead.parentPhone,
      parentEmail: lead.parentEmail ?? null,
      childAge: lead.childAge ?? null,
      preferredLevel: lead.preferredLevel ?? null,
      notes: lead.notes ?? null,
      status: "pending",
    })
    .returning();

  await db.update(leadsTable).set({ status: "interested", updatedAt: new Date() }).where(eq(leadsTable.id, leadId));

  res.status(201).json(request);
});

// ── GET /marketing-enrollment-requests ─────────────────────────────────────────
router.get("/marketing-enrollment-requests", requireAuth, async (req: Request, res: Response) => {
  const user = (req as any).user;
  if (user.role !== "admin") return void res.status(403).json({ error: "Admin only" });

  const requests = await db
    .select({
      id: marketingEnrollmentRequestsTable.id,
      leadId: marketingEnrollmentRequestsTable.leadId,
      campaignId: marketingEnrollmentRequestsTable.campaignId,
      childName: marketingEnrollmentRequestsTable.childName,
      parentName: marketingEnrollmentRequestsTable.parentName,
      parentPhone: marketingEnrollmentRequestsTable.parentPhone,
      parentEmail: marketingEnrollmentRequestsTable.parentEmail,
      childAge: marketingEnrollmentRequestsTable.childAge,
      preferredLevel: marketingEnrollmentRequestsTable.preferredLevel,
      notes: marketingEnrollmentRequestsTable.notes,
      status: marketingEnrollmentRequestsTable.status,
      adminNotes: marketingEnrollmentRequestsTable.adminNotes,
      levelId: marketingEnrollmentRequestsTable.levelId,
      branchId: marketingEnrollmentRequestsTable.branchId,
      createdAt: marketingEnrollmentRequestsTable.createdAt,
      campaignName: campaignsTable.name,
      campaignNameAr: campaignsTable.nameAr,
    })
    .from(marketingEnrollmentRequestsTable)
    .leftJoin(campaignsTable, eq(marketingEnrollmentRequestsTable.campaignId, campaignsTable.id))
    .orderBy(desc(marketingEnrollmentRequestsTable.createdAt));

  res.json(requests);
});

// ── POST /marketing-enrollment-requests/:id/approve ────────────────────────────
router.post("/marketing-enrollment-requests/:id/approve", requireAuth, async (req: Request, res: Response) => {
  const user = (req as any).user;
  if (user.role !== "admin") return void res.status(403).json({ error: "Admin only" });

  const id = parseInt((req.params.id as string));
  const [request] = await db.select().from(marketingEnrollmentRequestsTable).where(eq(marketingEnrollmentRequestsTable.id, id));
  if (!request) return void res.status(404).json({ error: "Request not found" });
  if (request.status !== "pending") return void res.status(400).json({ error: "Already processed" });

  const { name, gender, dateOfBirth, levelId, branchId, guardianPhone2, adminNotes, enrollmentDate, price, notes } = req.body;

  const [student] = await db.insert(studentsTable).values({
    name: (name ?? request.childName).trim(),
    gender: gender ?? null,
    dateOfBirth: dateOfBirth ?? null,
    levelId: levelId ? parseInt(levelId) : (request.levelId ?? null),
    branchId: branchId ? parseInt(branchId) : (request.branchId ?? null),
    guardianName: request.parentName,
    guardianPhone: request.parentPhone,
    guardianPhone2: guardianPhone2 ?? null,
    referralSource: `marketing_lead_${request.leadId}`,
    notes: notes ?? request.notes ?? null,
    enrollmentDate: enrollmentDate ?? new Date().toISOString().split("T")[0],
    behavioralFlags: [],
  }).returning();

  let payment = null;
  const finalLevelId = levelId ? parseInt(levelId) : request.levelId;
  if (finalLevelId) {
    const [level] = await db.select({ id: levelsTable.id, price: levelsTable.price })
      .from(levelsTable).where(eq(levelsTable.id, finalLevelId));
    if (level) {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30);
      const customPrice = price !== undefined && price !== null && price !== "" ? Number(price) : null;
      const [newPayment] = await db.insert(paymentsTable).values({
        studentId: student.id,
        levelId: level.id,
        amountDue: customPrice !== null ? customPrice : (level.price ?? 0),
        amountPaid: 0,
        status: "pending",
        dueDate: dueDate.toISOString().split("T")[0],
      }).returning();
      payment = newPayment;
    }
  }

  await db.update(marketingEnrollmentRequestsTable)
    .set({ status: "approved", adminNotes: adminNotes ?? null, updatedAt: new Date() })
    .where(eq(marketingEnrollmentRequestsTable.id, id));

  await db.update(leadsTable).set({ status: "registered", updatedAt: new Date() }).where(eq(leadsTable.id, request.leadId));

  res.json({ success: true, student, payment });
});

// ── POST /marketing-enrollment-requests/:id/reject ─────────────────────────────
router.post("/marketing-enrollment-requests/:id/reject", requireAuth, async (req: Request, res: Response) => {
  const user = (req as any).user;
  if (user.role !== "admin") return void res.status(403).json({ error: "Admin only" });

  const id = parseInt((req.params.id as string));
  const { adminNotes } = req.body;

  await db.update(marketingEnrollmentRequestsTable)
    .set({ status: "rejected", adminNotes: adminNotes ?? null, updatedAt: new Date() })
    .where(eq(marketingEnrollmentRequestsTable.id, id));

  res.json({ message: "Rejected" });
});

// ── DELETE lead ────────────────────────────────────────────────────────────────
router.delete("/leads/:id", requireAuth, async (req: Request, res: Response) => {
  const user = (req as any).user;
  if (!["admin"].includes(user.role)) return void res.status(403).json({ error: "Admin only" });

  const id = parseInt((req.params.id as string));
  await db.delete(leadsTable).where(eq(leadsTable.id, id));
  res.json({ message: "Deleted" });
});

export default router;

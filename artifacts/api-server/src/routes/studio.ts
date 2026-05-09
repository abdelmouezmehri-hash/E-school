import { Router, type Request, type Response } from "express";
import { eq, desc, and, inArray, sql } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  creativeProjectsTable,
  projectFilesTable,
  projectCommentsTable,
  schoolNewsTable,
  usersTable,
  creativeAssetVaultTable,
} from "@workspace/db";
import { requireAuth } from "../middlewares/auth";

const router = Router();

const STUDIO_ROLES = ["admin", "designer", "marketer", "photographer"];

function canAccessStudio(role: string) {
  return STUDIO_ROLES.includes(role);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function enrichProject(project: any) {
  const [assignee] = project.assignedTo
    ? await db.select({ id: usersTable.id, name: usersTable.name, role: usersTable.role })
        .from(usersTable).where(eq(usersTable.id, project.assignedTo))
    : [];
  const [creator] = project.createdBy
    ? await db.select({ id: usersTable.id, name: usersTable.name })
        .from(usersTable).where(eq(usersTable.id, project.createdBy))
    : [];
  const [paidBy] = project.earningPaidBy
    ? await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, project.earningPaidBy))
    : [];
  const files = await db.select().from(projectFilesTable)
    .where(eq(projectFilesTable.projectId, project.id))
    .orderBy(desc(projectFilesTable.createdAt));
  const comments = await db.select().from(projectCommentsTable)
    .where(eq(projectCommentsTable.projectId, project.id))
    .orderBy(projectCommentsTable.createdAt);
  const commentsEnriched = await Promise.all(comments.map(async (c) => {
    const [author] = c.authorId
      ? await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, c.authorId))
      : [];
    return { ...c, authorName: author?.name ?? null };
  }));
  return {
    ...project,
    budget: project.budget ? parseFloat(project.budget) : null,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt?.toISOString() ?? null,
    earningPaidAt: project.earningPaidAt?.toISOString() ?? null,
    assigneeName: assignee?.name ?? null,
    assigneeRole: assignee?.role ?? null,
    creatorName: creator?.name ?? null,
    earningPaidByName: paidBy?.name ?? null,
    files: files.map(f => ({ ...f, createdAt: f.createdAt.toISOString() })),
    comments: commentsEnriched.map(c => ({ ...c, createdAt: c.createdAt.toISOString() })),
  };
}

// ── GET /studio/projects ───────────────────────────────────────────────────────

router.get("/studio/projects", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  if (!canAccessStudio(user.role)) { res.status(403).json({ error: "Forbidden" }); return; }

  let projects;
  if (user.role === "admin") {
    projects = await db.select().from(creativeProjectsTable).orderBy(desc(creativeProjectsTable.createdAt));
  } else {
    projects = await db.select().from(creativeProjectsTable)
      .where(eq(creativeProjectsTable.assignedTo, user.id))
      .orderBy(desc(creativeProjectsTable.createdAt));
  }

  const enriched = await Promise.all(projects.map(enrichProject));
  res.json(enriched);
});

// ── GET /studio/projects/pending-approvals ─────────────────────────────────────

router.get("/studio/projects/pending-approvals", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  if (user.role !== "admin") { res.json({ count: 0 }); return; }

  const rows = await db.select({ id: creativeProjectsTable.id })
    .from(creativeProjectsTable)
    .where(eq(creativeProjectsTable.status, "review"));
  res.json({ count: rows.length });
});

// ── GET /studio/projects/:id ──────────────────────────────────────────────────

router.get("/studio/projects/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  if (!canAccessStudio(user.role)) { res.status(403).json({ error: "Forbidden" }); return; }

  const id = parseInt((req.params.id as string));
  const [project] = await db.select().from(creativeProjectsTable).where(eq(creativeProjectsTable.id, id));
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }

  if (user.role !== "admin" && project.assignedTo !== user.id) {
    res.status(403).json({ error: "Forbidden" }); return;
  }

  res.json(await enrichProject(project));
});

// ── POST /studio/projects ──────────────────────────────────────────────────────

router.post("/studio/projects", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  if (user.role !== "admin") { res.status(403).json({ error: "Admin only" }); return; }

  const { title, description, deadline, assignedTo, taskType, budget } = req.body as any;
  if (!title?.trim()) { res.status(400).json({ error: "Title is required" }); return; }

  const [project] = await db.insert(creativeProjectsTable).values({
    title: title.trim(),
    description: description?.trim() || null,
    deadline: deadline || null,
    assignedTo: assignedTo ? parseInt(assignedTo) : null,
    createdBy: user.id,
    status: "todo",
    taskType: taskType || "graphic_design",
    budget: budget ? String(budget) : null,
    earningStatus: "pending",
  } as any).returning();

  res.status(201).json(await enrichProject(project));
});

// ── PUT /studio/projects/:id ──────────────────────────────────────────────────

router.put("/studio/projects/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  if (!canAccessStudio(user.role)) { res.status(403).json({ error: "Forbidden" }); return; }

  const id = parseInt((req.params.id as string));
  const [project] = await db.select().from(creativeProjectsTable).where(eq(creativeProjectsTable.id, id));
  if (!project) { res.status(404).json({ error: "Not found" }); return; }

  const { title, description, deadline, assignedTo, status, taskType, budget } = req.body as any;

  const updateData: any = { updatedAt: new Date() };
  if (user.role === "admin") {
    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (deadline !== undefined) updateData.deadline = deadline || null;
    if (assignedTo !== undefined) updateData.assignedTo = assignedTo ? parseInt(assignedTo) : null;
    if (status !== undefined) updateData.status = status;
    if (taskType !== undefined) updateData.taskType = taskType;
    if (budget !== undefined) updateData.budget = budget ? String(budget) : null;
  } else {
    // Designer/marketer/photographer can only update status (submit to review)
    if (status !== undefined) updateData.status = status;
  }

  const [updated] = await db.update(creativeProjectsTable)
    .set(updateData).where(eq(creativeProjectsTable.id, id)).returning();
  res.json(await enrichProject(updated));
});

// ── PUT /studio/projects/:id/status ──────────────────────────────────────────
// Dedicated status-only endpoint with fine-grained permission checks for creative roles

router.put("/studio/projects/:id/status", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  if (!canAccessStudio(user.role)) { res.status(403).json({ error: "Forbidden" }); return; }

  const id = parseInt((req.params.id as string));
  const [project] = await db.select().from(creativeProjectsTable).where(eq(creativeProjectsTable.id, id));
  if (!project) { res.status(404).json({ error: "Not found" }); return; }

  if (user.role !== "admin" && project.assignedTo !== user.id) {
    res.status(403).json({ error: "Forbidden" }); return;
  }

  const { status } = req.body as any;
  if (!status) { res.status(400).json({ error: "status is required" }); return; }

  if (user.role !== "admin") {
    const ALLOWED: Record<string, string[]> = {
      todo: ["in_progress"],
      in_progress: ["review"],
    };
    if (!ALLOWED[project.status]?.includes(status)) {
      res.status(403).json({ error: "You cannot set this status from the current state" }); return;
    }
  }

  const [updated] = await db.update(creativeProjectsTable)
    .set({ status, updatedAt: new Date() } as any)
    .where(eq(creativeProjectsTable.id, id))
    .returning();

  res.json({ id: updated.id, status: updated.status });
});

// ── DELETE /studio/projects/:id ───────────────────────────────────────────────

router.delete("/studio/projects/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  if (user.role !== "admin") { res.status(403).json({ error: "Admin only" }); return; }

  const id = parseInt((req.params.id as string));
  await db.delete(creativeProjectsTable).where(eq(creativeProjectsTable.id, id));
  res.json({ message: "Deleted" });
});

// ── POST /studio/projects/:id/files ──────────────────────────────────────────

router.post("/studio/projects/:id/files", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  if (!canAccessStudio(user.role)) { res.status(403).json({ error: "Forbidden" }); return; }

  const projectId = parseInt((req.params.id as string));
  const { fileName, fileUrl, fileType } = req.body as any;
  if (!fileName || !fileUrl) { res.status(400).json({ error: "fileName and fileUrl are required" }); return; }

  const [file] = await db.insert(projectFilesTable).values({
    projectId,
    uploadedBy: user.id,
    fileName: fileName.trim(),
    fileUrl: fileUrl.trim(),
    fileType: fileType || "image",
  } as any).returning();

  res.status(201).json({ ...file, createdAt: file.createdAt.toISOString() });
});

// ── DELETE /studio/files/:id ───────────────────────────────────────────────────

router.delete("/studio/files/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  const id = parseInt((req.params.id as string));
  const [file] = await db.select().from(projectFilesTable).where(eq(projectFilesTable.id, id));
  if (!file) { res.status(404).json({ error: "Not found" }); return; }
  if (user.role !== "admin" && file.uploadedBy !== user.id) {
    res.status(403).json({ error: "Forbidden" }); return;
  }
  await db.delete(projectFilesTable).where(eq(projectFilesTable.id, id));
  res.json({ message: "Deleted" });
});

// ── POST /studio/projects/:id/comments ───────────────────────────────────────

router.post("/studio/projects/:id/comments", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  if (!canAccessStudio(user.role)) { res.status(403).json({ error: "Forbidden" }); return; }

  const projectId = parseInt((req.params.id as string));
  const { content, isApproval, isRevision } = req.body as any;
  if (!content?.trim()) { res.status(400).json({ error: "Content is required" }); return; }

  if (isApproval && user.role !== "admin") {
    res.status(403).json({ error: "Only admin can approve" }); return;
  }
  if (isRevision && user.role !== "admin") {
    res.status(403).json({ error: "Only admin can request revision" }); return;
  }

  const [comment] = await db.insert(projectCommentsTable).values({
    projectId,
    authorId: user.id,
    content: content.trim(),
    isApproval: Boolean(isApproval),
    isRevision: Boolean(isRevision),
  } as any).returning();

  if (isApproval) {
    // Auto-set earningStatus to in_wallet when approved (if budget exists)
    const [proj] = await db.select().from(creativeProjectsTable).where(eq(creativeProjectsTable.id, projectId));
    await db.update(creativeProjectsTable)
      .set({
        status: "approved",
        earningStatus: proj?.budget ? "in_wallet" : "pending",
      } as any)
      .where(eq(creativeProjectsTable.id, projectId));
  }

  if (isRevision) {
    // Send back to in_progress
    await db.update(creativeProjectsTable)
      .set({ status: "in_progress" } as any)
      .where(eq(creativeProjectsTable.id, projectId));
  }

  res.status(201).json({ ...comment, authorName: user.name, createdAt: comment.createdAt.toISOString() });
});

// ── POST /studio/projects/:id/publish ─────────────────────────────────────────

router.post("/studio/projects/:id/publish", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  if (user.role !== "admin" && user.role !== "marketer") {
    res.status(403).json({ error: "Admin or Marketer only" }); return;
  }

  const id = parseInt((req.params.id as string));
  const [project] = await db.select().from(creativeProjectsTable).where(eq(creativeProjectsTable.id, id));
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }
  if ((project as any).status !== "approved") {
    res.status(400).json({ error: "Project must be approved before publishing" }); return;
  }
  if ((project as any).publishedNewsId) {
    res.status(400).json({ error: "Already published" }); return;
  }

  const { newsTitle, newsContent, imageUrl } = req.body as any;

  const [news] = await db.insert(schoolNewsTable).values({
    title: (newsTitle || project.title).trim(),
    content: (newsContent || project.description || "").trim() || "Published from Creative Studio.",
    imageUrl: imageUrl || null,
    category: "school_update",
    authorId: user.id,
  } as any).returning();

  await db.update(creativeProjectsTable)
    .set({ publishedNewsId: news.id, status: "completed" } as any)
    .where(eq(creativeProjectsTable.id, id));

  res.status(201).json({ news: { ...news, createdAt: news.createdAt.toISOString() } });
});

// ── GET /studio/assignees ──────────────────────────────────────────────────────

router.get("/studio/assignees", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  if (user.role !== "admin") { res.status(403).json({ error: "Admin only" }); return; }

  const rows = await db.select({ id: usersTable.id, name: usersTable.name, role: usersTable.role })
    .from(usersTable)
    .where(inArray(usersTable.role as any, ["designer", "marketer", "photographer"]))
    .orderBy(usersTable.name);

  res.json(rows);
});

// ── GET /studio/earnings ───────────────────────────────────────────────────────
// Returns current user's earnings (all approved projects assigned to them with a budget)

router.get("/studio/earnings", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  if (!canAccessStudio(user.role)) { res.status(403).json({ error: "Forbidden" }); return; }

  let projects;
  if (user.role === "admin") {
    // Admin sees all projects with budgets that are approved/completed
    projects = await db.select().from(creativeProjectsTable)
      .where(
        sql`${creativeProjectsTable.budget} IS NOT NULL AND ${creativeProjectsTable.status} IN ('approved','completed')`
      )
      .orderBy(desc(creativeProjectsTable.updatedAt));
  } else {
    projects = await db.select().from(creativeProjectsTable)
      .where(
        and(
          eq(creativeProjectsTable.assignedTo, user.id),
          sql`${creativeProjectsTable.budget} IS NOT NULL AND ${creativeProjectsTable.status} IN ('approved','completed')`
        )
      )
      .orderBy(desc(creativeProjectsTable.updatedAt));
  }

  // Enrich with assignee names for admin view
  const enriched = await Promise.all(projects.map(async (p) => {
    const [assignee] = p.assignedTo
      ? await db.select({ name: usersTable.name, role: usersTable.role }).from(usersTable).where(eq(usersTable.id, p.assignedTo))
      : [];
    const [paidBy] = p.earningPaidBy
      ? await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, p.earningPaidBy))
      : [];
    return {
      id: p.id,
      title: p.title,
      taskType: p.taskType,
      budget: p.budget ? p.budget : 0,
      earningStatus: p.earningStatus || "pending",
      earningPaidAt: p.earningPaidAt?.toISOString() ?? null,
      earningPaidByName: paidBy?.name ?? null,
      assigneeName: assignee?.name ?? null,
      assigneeRole: assignee?.role ?? null,
      status: p.status,
      updatedAt: p.updatedAt?.toISOString() ?? null,
    };
  }));

  const totalEarned = enriched.reduce((s, p) => s + p.budget, 0);
  const totalPaid = enriched.filter(p => p.earningStatus === "paid").reduce((s, p) => s + p.budget, 0);
  const inWallet = totalEarned - totalPaid;

  res.json({ projects: enriched, totalEarned, totalPaid, inWallet });
});

// ── POST /studio/earnings/:projectId/pay ───────────────────────────────────────
// Admin marks a project's earning as paid

router.post("/studio/earnings/:projectId/pay", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  if (user.role !== "admin") { res.status(403).json({ error: "Admin only" }); return; }

  const projectId = parseInt((req.params.projectId as string));
  const [project] = await db.select().from(creativeProjectsTable).where(eq(creativeProjectsTable.id, projectId));
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }

  const [updated] = await db.update(creativeProjectsTable)
    .set({
      earningStatus: "paid",
      earningPaidAt: new Date(),
      earningPaidBy: user.id,
    } as any)
    .where(eq(creativeProjectsTable.id, projectId))
    .returning();

  res.json({
    id: updated.id,
    earningStatus: updated.earningStatus,
    earningPaidAt: updated.earningPaidAt?.toISOString() ?? null,
  });
});

// Media Lab categories (kept separate from brand asset vault)
const MEDIA_LAB_CATS = ["event_photo", "talk_show"];
const VAULT_ONLY_CATS_EXCLUDE = MEDIA_LAB_CATS;

// ── GET /studio/vault ─────────────────────────────────────────────────────────

router.get("/studio/vault", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  if (!canAccessStudio(user.role)) { res.status(403).json({ error: "Forbidden" }); return; }

  // Vault only shows brand assets — excludes media lab categories
  const items = await db.select().from(creativeAssetVaultTable)
    .where(sql`${creativeAssetVaultTable.category} NOT IN ('event_photo', 'talk_show')`)
    .orderBy(desc(creativeAssetVaultTable.createdAt));
  const enriched = await Promise.all(items.map(async (item) => {
    const [uploader] = item.uploadedBy
      ? await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, item.uploadedBy))
      : [];
    return { ...item, uploaderName: uploader?.name ?? null, createdAt: item.createdAt.toISOString() };
  }));
  res.json(enriched);
});

// ── POST /studio/vault ────────────────────────────────────────────────────────
// Only admin and designer can upload brand assets

router.post("/studio/vault", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  if (!["admin", "designer"].includes(user.role)) {
    res.status(403).json({ error: "Only designers can upload brand assets to the vault" }); return;
  }

  const { title, description, fileUrl, fileType, category } = req.body as any;
  if (!title?.trim() || !fileUrl?.trim()) {
    res.status(400).json({ error: "title and fileUrl are required" }); return;
  }

  const [item] = await db.insert(creativeAssetVaultTable).values({
    title: title.trim(),
    description: description?.trim() || null,
    fileUrl: fileUrl.trim(),
    fileType: fileType || "image",
    category: category || "other",
    uploadedBy: user.id,
  } as any).returning();

  const [uploader] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, user.id));
  res.status(201).json({ ...item, uploaderName: uploader?.name ?? null, createdAt: item.createdAt.toISOString() });
});

// ── DELETE /studio/vault/:id ──────────────────────────────────────────────────

router.delete("/studio/vault/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  if (!canAccessStudio(user.role)) { res.status(403).json({ error: "Forbidden" }); return; }

  const id = parseInt((req.params.id as string));
  const [item] = await db.select().from(creativeAssetVaultTable).where(eq(creativeAssetVaultTable.id, id));
  if (!item) { res.status(404).json({ error: "Not found" }); return; }
  if (user.role !== "admin" && item.uploadedBy !== user.id) {
    res.status(403).json({ error: "Forbidden" }); return;
  }

  await db.delete(creativeAssetVaultTable).where(eq(creativeAssetVaultTable.id, id));
  res.json({ message: "Deleted" });
});

// ── GET /studio/media-lab ─────────────────────────────────────────────────────
// Returns event photos and talk show items

router.get("/studio/media-lab", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  if (!canAccessStudio(user.role)) { res.status(403).json({ error: "Forbidden" }); return; }

  const items = await db.select().from(creativeAssetVaultTable)
    .where(sql`${creativeAssetVaultTable.category} IN ('event_photo', 'talk_show')`)
    .orderBy(desc(creativeAssetVaultTable.createdAt));
  const enriched = await Promise.all(items.map(async (item) => {
    const [uploader] = item.uploadedBy
      ? await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, item.uploadedBy))
      : [];
    return { ...item, uploaderName: uploader?.name ?? null, createdAt: item.createdAt.toISOString() };
  }));
  res.json(enriched);
});

// ── POST /studio/media-lab ────────────────────────────────────────────────────
// Any studio role can upload to media lab (event photos / talk show)

router.post("/studio/media-lab", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  if (!canAccessStudio(user.role)) { res.status(403).json({ error: "Forbidden" }); return; }

  const { title, description, fileUrl, fileType, category } = req.body as any;
  if (!title?.trim() || !fileUrl?.trim()) {
    res.status(400).json({ error: "title and fileUrl are required" }); return;
  }
  const cat = MEDIA_LAB_CATS.includes(category) ? category : "event_photo";

  const [item] = await db.insert(creativeAssetVaultTable).values({
    title: title.trim(),
    description: description?.trim() || null,
    fileUrl: fileUrl.trim(),
    fileType: fileType || "image",
    category: cat,
    uploadedBy: user.id,
  } as any).returning();

  const [uploader] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, user.id));
  res.status(201).json({ ...item, uploaderName: uploader?.name ?? null, createdAt: item.createdAt.toISOString() });
});

// ── DELETE /studio/media-lab/:id ──────────────────────────────────────────────

router.delete("/studio/media-lab/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  if (!canAccessStudio(user.role)) { res.status(403).json({ error: "Forbidden" }); return; }

  const id = parseInt((req.params.id as string));
  const [item] = await db.select().from(creativeAssetVaultTable).where(eq(creativeAssetVaultTable.id, id));
  if (!item) { res.status(404).json({ error: "Not found" }); return; }
  if (user.role !== "admin" && item.uploadedBy !== user.id) {
    res.status(403).json({ error: "Forbidden" }); return;
  }

  await db.delete(creativeAssetVaultTable).where(eq(creativeAssetVaultTable.id, id));
  res.json({ message: "Deleted" });
});

// ── GET /studio/pipeline ──────────────────────────────────────────────────────
// Admin global creative pipeline — all staff with their task counts

router.get("/studio/pipeline", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  if (user.role !== "admin") { res.status(403).json({ error: "Admin only" }); return; }

  const staff = await db.select({ id: usersTable.id, name: usersTable.name, role: usersTable.role })
    .from(usersTable)
    .where(inArray(usersTable.role as any, ["designer", "marketer", "photographer"]))
    .orderBy(usersTable.name);

  const result = await Promise.all(staff.map(async (s) => {
    const tasks = await db.select({
      id: creativeProjectsTable.id,
      title: creativeProjectsTable.title,
      status: creativeProjectsTable.status,
      taskType: creativeProjectsTable.taskType,
      deadline: creativeProjectsTable.deadline,
    }).from(creativeProjectsTable)
      .where(eq(creativeProjectsTable.assignedTo, s.id))
      .orderBy(desc(creativeProjectsTable.updatedAt));
    return { ...s, tasks };
  }));

  res.json(result);
});

export default router;

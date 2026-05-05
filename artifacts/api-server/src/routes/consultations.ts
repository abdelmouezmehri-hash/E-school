import { Router, type IRouter, type Request, type Response } from "express";
import { eq, desc, and } from "drizzle-orm";
import { db, consultationsTable, usersTable, studentsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

const CONSULTATION_FIELDS = {
  id: consultationsTable.id,
  parentId: consultationsTable.parentId,
  parentName: usersTable.name,
  parentEmail: usersTable.email,
  studentId: consultationsTable.studentId,
  studentName: studentsTable.name,
  type: consultationsTable.type,
  status: consultationsTable.status,
  parentNotes: consultationsTable.parentNotes,
  price: consultationsTable.price,
  adminDescription: consultationsTable.adminDescription,
  psychologistSummary: consultationsTable.psychologistSummary,
  scheduledDate: consultationsTable.scheduledDate,
  initiatedBy: consultationsTable.initiatedBy,
  psychologistId: consultationsTable.psychologistId,
  createdAt: consultationsTable.createdAt,
  updatedAt: consultationsTable.updatedAt,
  approvedAt: consultationsTable.approvedAt,
  completedAt: consultationsTable.completedAt,
};

function formatRow(r: any) {
  return {
    ...r,
    price: r.price != null ? parseFloat(r.price) : null,
    createdAt: r.createdAt?.toISOString() ?? null,
    updatedAt: r.updatedAt?.toISOString() ?? null,
    approvedAt: r.approvedAt?.toISOString() ?? null,
    completedAt: r.completedAt?.toISOString() ?? null,
  };
}

// ── GET /api/consultations ──
router.get("/consultations", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  const role = user.role;

  let rows: any[];

  if (role === "admin" || role === "psychologist") {
    rows = await db
      .select(CONSULTATION_FIELDS)
      .from(consultationsTable)
      .leftJoin(usersTable, eq(consultationsTable.parentId, usersTable.id))
      .leftJoin(studentsTable, eq(consultationsTable.studentId, studentsTable.id))
      .orderBy(desc(consultationsTable.createdAt));
  } else if (role === "parent") {
    rows = await db
      .select(CONSULTATION_FIELDS)
      .from(consultationsTable)
      .leftJoin(usersTable, eq(consultationsTable.parentId, usersTable.id))
      .leftJoin(studentsTable, eq(consultationsTable.studentId, studentsTable.id))
      .where(eq(consultationsTable.parentId, user.id))
      .orderBy(desc(consultationsTable.createdAt));
  } else {
    res.status(403).json({ error: "Not authorized" }); return;
  }

  res.json(rows.map(formatRow));
});

// ── POST /api/consultations ── (parent or admin creates)
router.post("/consultations", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  if (user.role !== "parent" && user.role !== "admin") {
    res.status(403).json({ error: "Only parents can create consultation requests" }); return;
  }

  const { studentId, type, parentNotes, scheduledDate } = req.body as any;
  if (!type || !["free", "paid"].includes(type)) {
    res.status(400).json({ error: "type must be 'free' or 'paid'" }); return;
  }

  const parentId = user.role === "admin" ? (req.body.parentId ?? user.id) : user.id;

  if (type === "free") {
    const existing = await db
      .select({ id: consultationsTable.id })
      .from(consultationsTable)
      .where(and(eq(consultationsTable.parentId, parentId), eq(consultationsTable.type, "free")));
    if (existing.length > 0) {
      res.status(409).json({ error: "You have already requested a free consultation." }); return;
    }
  }

  const [created] = await db
    .insert(consultationsTable)
    .values({
      parentId,
      studentId: studentId ?? null,
      type,
      status: "pending",
      parentNotes: parentNotes ?? null,
      scheduledDate: scheduledDate ?? null,
      initiatedBy: "parent",
    })
    .returning();

  res.status(201).json(formatRow({ ...created, parentName: null, parentEmail: null, studentName: null }));
});

// ── POST /api/consultations/schedule ── (psychologist initiates session for a parent)
router.post("/consultations/schedule", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  if (user.role !== "psychologist" && user.role !== "admin") {
    res.status(403).json({ error: "Psychologist or Admin only" }); return;
  }

  const { parentId, studentId, type, scheduledDate, adminDescription, price } = req.body as any;
  if (!parentId) { res.status(400).json({ error: "parentId is required" }); return; }
  if (!scheduledDate) { res.status(400).json({ error: "scheduledDate is required" }); return; }
  if (!type || !["free", "paid"].includes(type)) {
    res.status(400).json({ error: "type must be 'free' or 'paid'" }); return;
  }

  const [created] = await db
    .insert(consultationsTable)
    .values({
      parentId: parseInt(parentId),
      studentId: studentId ? parseInt(studentId) : null,
      type,
      status: "approved",
      scheduledDate,
      adminDescription: adminDescription ?? null,
      price: price ? Number(price) : null,
      initiatedBy: "psychologist",
      psychologistId: user.id,
      approvedAt: new Date(),
    })
    .returning();

  res.status(201).json(formatRow({ ...created, parentName: null, parentEmail: null, studentName: null }));
});

// ── PUT /api/consultations/:id/approve ── (admin approves + sets price)
router.put("/consultations/:id/approve", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  if (user.role !== "admin") { res.status(403).json({ error: "Admin only" }); return; }

  const id = parseInt((req.params.id as string));
  const { price, adminDescription, scheduledDate } = req.body as any;

  const updateData: Record<string, unknown> = {
    status: "approved",
    approvedAt: new Date(),
    updatedAt: new Date(),
  };
  if (price !== undefined) updateData.price = String(price);
  if (adminDescription !== undefined) updateData.adminDescription = adminDescription;
  if (scheduledDate !== undefined) updateData.scheduledDate = scheduledDate;

  const [updated] = await db
    .update(consultationsTable)
    .set(updateData)
    .where(eq(consultationsTable.id, id))
    .returning();

  if (!updated) { res.status(404).json({ error: "Consultation not found" }); return; }

  res.json(formatRow({ ...updated, parentName: null, parentEmail: null, studentName: null }));
});

// ── PUT /api/consultations/:id/reject ── (admin rejects)
router.put("/consultations/:id/reject", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  if (user.role !== "admin") { res.status(403).json({ error: "Admin only" }); return; }

  const id = parseInt((req.params.id as string));
  const { adminDescription } = req.body as any;

  const [updated] = await db
    .update(consultationsTable)
    .set({ status: "rejected", updatedAt: new Date(), adminDescription: adminDescription ?? null })
    .where(eq(consultationsTable.id, id))
    .returning();

  if (!updated) { res.status(404).json({ error: "Consultation not found" }); return; }

  res.json(formatRow({ ...updated, parentName: null, parentEmail: null, studentName: null }));
});

// ── PUT /api/consultations/:id/complete ── (psychologist adds summary)
router.put("/consultations/:id/complete", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  if (user.role !== "psychologist" && user.role !== "admin") {
    res.status(403).json({ error: "Psychologist or Admin only" }); return;
  }

  const id = parseInt((req.params.id as string));
  const { psychologistSummary } = req.body as any;

  const [updated] = await db
    .update(consultationsTable)
    .set({ status: "completed", completedAt: new Date(), updatedAt: new Date(), psychologistSummary: psychologistSummary ?? null })
    .where(eq(consultationsTable.id, id))
    .returning();

  if (!updated) { res.status(404).json({ error: "Consultation not found" }); return; }

  res.json(formatRow({ ...updated, parentName: null, parentEmail: null, studentName: null }));
});

export default router;

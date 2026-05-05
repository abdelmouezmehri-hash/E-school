import { Router, type IRouter, type Request, type Response } from "express";
import { eq, desc, and } from "drizzle-orm";
import {
  db,
  usersTable,
  staffPaymentRequestsTable,
  teacherPaymentsTable,
} from "@workspace/db";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

const STAFF_ROLES = ["teacher", "psychologist"];
const canSubmit = (role: string) => STAFF_ROLES.includes(role) || role === "admin";

// ── GET /staff-payment-requests/my — staff sees own requests ──────────────────
router.get("/staff-payment-requests/my", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  if (!canSubmit(user.role)) { res.status(403).json({ error: "Not authorized" }); return; }

  const rows = await db.select().from(staffPaymentRequestsTable)
    .where(eq(staffPaymentRequestsTable.staffId, user.id))
    .orderBy(desc(staffPaymentRequestsTable.createdAt));
  res.json(rows.map(serializeRequest));
});

// ── GET /staff-payment-requests — admin sees all requests ─────────────────────
router.get("/staff-payment-requests", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  if (user.role !== "admin") { res.status(403).json({ error: "Not authorized" }); return; }

  const rows = await db.select({
    request: staffPaymentRequestsTable,
    staffName: usersTable.name,
    staffRole: usersTable.role,
    staffEmail: usersTable.email,
  })
    .from(staffPaymentRequestsTable)
    .innerJoin(usersTable, eq(staffPaymentRequestsTable.staffId, usersTable.id))
    .orderBy(desc(staffPaymentRequestsTable.createdAt));

  res.json(rows.map((r) => ({
    ...serializeRequest(r.request),
    staffName: r.staffName,
    staffRole: r.staffRole,
    staffEmail: r.staffEmail,
  })));
});

// ── POST /staff-payment-requests — staff submits a request ────────────────────
router.post("/staff-payment-requests", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  if (!canSubmit(user.role)) { res.status(403).json({ error: "Not authorized" }); return; }

  const { type, amount, category, reason } = req.body as any;
  if (!type || !amount || isNaN(parseFloat(amount))) {
    res.status(400).json({ error: "type and amount are required" }); return;
  }
  if (!["payment_request", "bonus_expense"].includes(type)) {
    res.status(400).json({ error: "Invalid type" }); return;
  }
  if (category && !["bonus", "materials", "transportation"].includes(category)) {
    res.status(400).json({ error: "Invalid category" }); return;
  }

  const [req_] = await db.insert(staffPaymentRequestsTable).values({
    staffId: user.id,
    type,
    amount: String(parseFloat(amount).toFixed(2)),
    category: category ?? null,
    reason: reason?.trim() ?? null,
    status: "pending",
  }).returning();
  res.status(201).json(serializeRequest(req_));
});

// ── PUT /staff-payment-requests/:id/approve — admin approves ──────────────────
router.put("/staff-payment-requests/:id/approve", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  if (user.role !== "admin") { res.status(403).json({ error: "Not authorized" }); return; }

  const id = parseInt(req.params.id);
  const [existing] = await db.select().from(staffPaymentRequestsTable).where(eq(staffPaymentRequestsTable.id, id));
  if (!existing) { res.status(404).json({ error: "Request not found" }); return; }
  if (existing.status !== "pending") { res.status(409).json({ error: "Request is not pending" }); return; }

  const { period, adminComment } = req.body as any;
  const refPeriod = period?.trim() || new Date().toLocaleDateString("en-GB", { month: "long", year: "numeric" });

  // Generate reference number: REF-YYYY-MMDD-ID
  const now = new Date();
  const referenceNumber = `REF-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${id}`;

  // Create a teacher_payment record (status=paid) so it syncs with earnings totalPaid
  const noteText = existing.reason
    ? `[${existing.type === "bonus_expense" ? `${existing.category ?? "bonus"} - ` : ""}${existing.reason}] ${referenceNumber}`
    : `${existing.type === "bonus_expense" ? existing.category ?? "bonus" : "payment request"} ${referenceNumber}`;

  const [payment] = await db.insert(teacherPaymentsTable).values({
    teacherId: existing.staffId,
    amount: existing.amount,
    period: refPeriod,
    status: "paid",
    note: noteText,
    paidAt: now,
  }).returning();

  // Update the request
  const [updated] = await db.update(staffPaymentRequestsTable)
    .set({
      status: "approved",
      referenceNumber,
      linkedPaymentId: payment.id,
      approvedAt: now,
      adminComment: adminComment?.trim() ?? null,
    })
    .where(eq(staffPaymentRequestsTable.id, id))
    .returning();

  res.json(serializeRequest(updated));
});

// ── PUT /staff-payment-requests/:id/reject — admin rejects ───────────────────
router.put("/staff-payment-requests/:id/reject", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  if (user.role !== "admin") { res.status(403).json({ error: "Not authorized" }); return; }

  const id = parseInt(req.params.id);
  const [existing] = await db.select().from(staffPaymentRequestsTable).where(eq(staffPaymentRequestsTable.id, id));
  if (!existing) { res.status(404).json({ error: "Request not found" }); return; }
  if (existing.status !== "pending") { res.status(409).json({ error: "Request is not pending" }); return; }

  const { adminComment } = req.body as any;
  const [updated] = await db.update(staffPaymentRequestsTable)
    .set({
      status: "rejected",
      rejectedAt: new Date(),
      adminComment: adminComment?.trim() ?? null,
    })
    .where(eq(staffPaymentRequestsTable.id, id))
    .returning();

  res.json(serializeRequest(updated));
});

// ── PUT /staff-payment-requests/:id/confirm-receipt — staff confirms receipt ──
router.put("/staff-payment-requests/:id/confirm-receipt", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;

  const id = parseInt(req.params.id);
  const [existing] = await db.select().from(staffPaymentRequestsTable).where(eq(staffPaymentRequestsTable.id, id));
  if (!existing) { res.status(404).json({ error: "Request not found" }); return; }
  if (existing.staffId !== user.id && user.role !== "admin") { res.status(403).json({ error: "Forbidden" }); return; }
  if (existing.status !== "approved") { res.status(409).json({ error: "Request not approved yet" }); return; }
  if (existing.receiptConfirmedAt) { res.status(409).json({ error: "Already confirmed" }); return; }

  const [updated] = await db.update(staffPaymentRequestsTable)
    .set({ receiptConfirmedAt: new Date() })
    .where(eq(staffPaymentRequestsTable.id, id))
    .returning();

  res.json(serializeRequest(updated));
});

function serializeRequest(r: typeof staffPaymentRequestsTable.$inferSelect) {
  return {
    ...r,
    amount: parseFloat(r.amount),
    createdAt: r.createdAt.toISOString(),
    approvedAt: r.approvedAt?.toISOString() ?? null,
    rejectedAt: r.rejectedAt?.toISOString() ?? null,
    receiptConfirmedAt: r.receiptConfirmedAt?.toISOString() ?? null,
  };
}

export default router;

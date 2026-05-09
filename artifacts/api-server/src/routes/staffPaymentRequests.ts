import { Router, type IRouter, type Request, type Response } from "express";
import { eq, desc } from "drizzle-orm";
import {
  db,
  usersTable,
  staffPaymentRequestsTable,
  salariesTable,
  expensesTable,
} from "@workspace/db";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

const STAFF_ROLES = [
  "teacher",
  "psychologist",
  "accountant",
  "photographer",
  "designer",
  "marketer",
  "branch_manager",
  "receptionist",
];
const canSubmit = (role: string) => STAFF_ROLES.includes(role) || role === "admin";

// ─────────────────────────────────────────────────────────────────────────────
// STAFF PAYMENT REQUESTS — bonuses, expense reimbursements, advance requests.
//
// Lifecycle:
//   1. Staff POSTs a request (status=pending).
//   2. Admin approves → we INSERT a row in `salaries` (status=paid) AND a row
//      in `expenses` linked via expenses.staff_payment_request_id.
//      `linkedPaymentId` on the request is set to the new salary.id.
//   3. If the request is later deleted, the FK cascade removes the expense.
//      The salary record is preserved (admin must delete it explicitly from
//      /salaries/:id) so we never lose payment history silently.
//
// This replaces the old behaviour of writing only to `teacher_payments` and
// never recording the outflow in `expenses`.
// ─────────────────────────────────────────────────────────────────────────────

// GET /staff-payment-requests/my — staff sees own requests
router.get(
  "/staff-payment-requests/my",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const user = (req as any).user;
    if (!canSubmit(user.role)) {
      res.status(403).json({ error: "Not authorized" });
      return;
    }

    const rows = await db
      .select()
      .from(staffPaymentRequestsTable)
      .where(eq(staffPaymentRequestsTable.staffId, user.id))
      .orderBy(desc(staffPaymentRequestsTable.createdAt));
    res.json(rows.map(serializeRequest));
  },
);

// GET /staff-payment-requests — admin sees all
router.get(
  "/staff-payment-requests",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const user = (req as any).user;
    if (user.role !== "admin") {
      res.status(403).json({ error: "Not authorized" });
      return;
    }

    const rows = await db
      .select({
        request: staffPaymentRequestsTable,
        staffName: usersTable.name,
        staffRole: usersTable.role,
        staffEmail: usersTable.email,
      })
      .from(staffPaymentRequestsTable)
      .innerJoin(usersTable, eq(staffPaymentRequestsTable.staffId, usersTable.id))
      .orderBy(desc(staffPaymentRequestsTable.createdAt));

    res.json(
      rows.map((r) => ({
        ...serializeRequest(r.request),
        staffName: r.staffName,
        staffRole: r.staffRole,
        staffEmail: r.staffEmail,
      })),
    );
  },
);

// POST /staff-payment-requests — staff submits a new request
router.post(
  "/staff-payment-requests",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const user = (req as any).user;
    if (!canSubmit(user.role)) {
      res.status(403).json({ error: "Not authorized" });
      return;
    }

    const { type, amount, category, reason } = req.body as any;
    if (!type || !amount || isNaN(parseFloat(amount))) {
      res.status(400).json({ error: "type and amount are required" });
      return;
    }
    if (!["payment_request", "bonus_expense"].includes(type)) {
      res.status(400).json({ error: "Invalid type" });
      return;
    }
    if (category && !["bonus", "materials", "transportation"].includes(category)) {
      res.status(400).json({ error: "Invalid category" });
      return;
    }

    const [created] = await db
      .insert(staffPaymentRequestsTable)
      .values({
        staffId: user.id,
        type,
        amount: parseFloat(amount),
        category: category ?? null,
        reason: reason?.trim() ?? null,
        status: "pending",
      })
      .returning();

    res.status(201).json(serializeRequest(created));
  },
);

// PUT /staff-payment-requests/:id/approve — admin approves the request,
// creating a paid salary row AND a linked expense row.
router.put(
  "/staff-payment-requests/:id/approve",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const user = (req as any).user;
    if (user.role !== "admin") {
      res.status(403).json({ error: "Not authorized" });
      return;
    }

    const id = parseInt(req.params.id as string);
    const [existing] = await db
      .select()
      .from(staffPaymentRequestsTable)
      .where(eq(staffPaymentRequestsTable.id, id));
    if (!existing) {
      res.status(404).json({ error: "Request not found" });
      return;
    }
    if (existing.status !== "pending") {
      res.status(409).json({ error: "Request is not pending" });
      return;
    }

    // Look up staff for branch attribution and a human-readable description.
    const [staff] = await db
      .select({ id: usersTable.id, name: usersTable.name, branchId: usersTable.branchId })
      .from(usersTable)
      .where(eq(usersTable.id, existing.staffId));

    const { period, adminComment } = req.body as any;
    const refPeriod =
      period?.trim() ||
      new Date().toLocaleDateString("en-GB", { month: "long", year: "numeric" });

    const now = new Date();
    const referenceNumber = `REF-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${id}`;

    // Categorise the resulting expense based on the request type/category.
    // payment_request and bonus_expense(bonus) → "salaries"
    // bonus_expense(materials)                  → "materials"
    // bonus_expense(transportation)             → "other"
    const expenseCategory: "salaries" | "materials" | "other" =
      existing.type === "bonus_expense"
        ? existing.category === "materials"
          ? "materials"
          : existing.category === "transportation"
            ? "other"
            : "salaries"
        : "salaries";

    const descParts: string[] = [];
    if (existing.type === "bonus_expense") {
      descParts.push(existing.category ?? "bonus");
    } else {
      descParts.push("payment request");
    }
    descParts.push(staff?.name ?? `#${existing.staffId}`);
    if (existing.reason) descParts.push(existing.reason);
    const description = `${descParts.join(" — ")} (${referenceNumber})`;

    const paidAtIso = now.toISOString().split("T")[0];

    // 1. Insert the salary row (status implicitly paid — salaries table has no status column).
    const [salary] = await db
      .insert(salariesTable)
      .values({
        employeeId: existing.staffId,
        amount: existing.amount,
        period: refPeriod,
        note: `${existing.type === "bonus_expense" ? `[${existing.category ?? "bonus"}] ` : "[request] "}${existing.reason ?? ""} ${referenceNumber}`.trim(),
        paidAt: paidAtIso,
        profitSharePercent: null,
      })
      .returning();

    // 2. Insert the linked expense row.
    //    NOTE: salary_id is intentionally LEFT NULL here — the expense is
    //    "owned" by the request, not by the salary, so deleting the request
    //    cascades but deleting the salary alone does not double-delete.
    await db.insert(expensesTable).values({
      category: expenseCategory,
      description,
      amount: existing.amount,
      expenseDate: paidAtIso,
      notes: existing.reason || null,
      branchId: staff?.branchId ?? null,
      staffPaymentRequestId: id,
    });

    // 3. Update the request to approved, pointing linkedPaymentId at the new salary.
    const [updated] = await db
      .update(staffPaymentRequestsTable)
      .set({
        status: "approved",
        referenceNumber,
        linkedPaymentId: salary.id,
        approvedAt: now,
        adminComment: adminComment?.trim() ?? null,
      })
      .where(eq(staffPaymentRequestsTable.id, id))
      .returning();

    res.json(serializeRequest(updated));
  },
);

// PUT /staff-payment-requests/:id/reject — admin rejects (no money moves)
router.put(
  "/staff-payment-requests/:id/reject",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const user = (req as any).user;
    if (user.role !== "admin") {
      res.status(403).json({ error: "Not authorized" });
      return;
    }

    const id = parseInt(req.params.id as string);
    const [existing] = await db
      .select()
      .from(staffPaymentRequestsTable)
      .where(eq(staffPaymentRequestsTable.id, id));
    if (!existing) {
      res.status(404).json({ error: "Request not found" });
      return;
    }
    if (existing.status !== "pending") {
      res.status(409).json({ error: "Request is not pending" });
      return;
    }

    const { adminComment } = req.body as any;
    const [updated] = await db
      .update(staffPaymentRequestsTable)
      .set({
        status: "rejected",
        rejectedAt: new Date(),
        adminComment: adminComment?.trim() ?? null,
      })
      .where(eq(staffPaymentRequestsTable.id, id))
      .returning();

    res.json(serializeRequest(updated));
  },
);

// PUT /staff-payment-requests/:id/confirm-receipt — staff confirms receipt
router.put(
  "/staff-payment-requests/:id/confirm-receipt",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const user = (req as any).user;

    const id = parseInt(req.params.id as string);
    const [existing] = await db
      .select()
      .from(staffPaymentRequestsTable)
      .where(eq(staffPaymentRequestsTable.id, id));
    if (!existing) {
      res.status(404).json({ error: "Request not found" });
      return;
    }
    if (existing.staffId !== user.id && user.role !== "admin") {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    if (existing.status !== "approved") {
      res.status(409).json({ error: "Request not approved yet" });
      return;
    }
    if (existing.receiptConfirmedAt) {
      res.status(409).json({ error: "Already confirmed" });
      return;
    }

    const [updated] = await db
      .update(staffPaymentRequestsTable)
      .set({ receiptConfirmedAt: new Date() })
      .where(eq(staffPaymentRequestsTable.id, id))
      .returning();

    res.json(serializeRequest(updated));
  },
);

// DELETE /staff-payment-requests/:id — admin deletes the request.
// FK cascade removes the linked expense automatically. The salary row is
// preserved (deleting it requires DELETE /salaries/:id explicitly).
router.delete(
  "/staff-payment-requests/:id",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const user = (req as any).user;
    if (user.role !== "admin") {
      res.status(403).json({ error: "Not authorized" });
      return;
    }

    const id = parseInt(req.params.id as string);
    const result = await db
      .delete(staffPaymentRequestsTable)
      .where(eq(staffPaymentRequestsTable.id, id))
      .returning({ id: staffPaymentRequestsTable.id });

    if (result.length === 0) {
      res.status(404).json({ error: "Request not found" });
      return;
    }

    res.json({ success: true });
  },
);

function serializeRequest(r: typeof staffPaymentRequestsTable.$inferSelect) {
  return {
    ...r,
    amount: r.amount,
    createdAt: r.createdAt.toISOString(),
    approvedAt: r.approvedAt?.toISOString() ?? null,
    rejectedAt: r.rejectedAt?.toISOString() ?? null,
    receiptConfirmedAt: r.receiptConfirmedAt?.toISOString() ?? null,
  };
}

export default router;

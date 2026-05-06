import { Router, type IRouter, type Request, type Response } from "express";
import { eq, and, inArray, sql, desc, gte } from "drizzle-orm";
import {
  db,
  paymentsTable,
  paymentTransactionsTable,
  paymentEditsTable,
  studentsTable,
  levelsTable,
  usersTable,
  groupsTable,
  groupStudentsTable,
} from "@workspace/db";
import {
  CreatePaymentBody,
  UpdatePaymentBody,
  GetPaymentParams,
  ListPaymentsQueryParams,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";
import { createNotification } from "./notifications";

const router: IRouter = Router();

async function enrichPayment(payment: typeof paymentsTable.$inferSelect) {
  // One JOIN query replaces the previous 2–3 sequential queries.
  // The levels LEFT JOIN uses a constant condition derived from payment.levelId
  // so we avoid joining a table we don't need when levelId is null.
  const [row] = await db
    .select({
      studentName: studentsTable.name,
      parentName: usersTable.name,
      levelName: levelsTable.name,
    })
    .from(studentsTable)
    .leftJoin(usersTable, eq(studentsTable.parentId, usersTable.id))
    .leftJoin(
      levelsTable,
      payment.levelId
        ? eq(levelsTable.id, payment.levelId)
        : sql<boolean>`false`,
    )
    .where(eq(studentsTable.id, payment.studentId));

  const amountDue = payment.amountDue;
  const discount = payment.discount ?? 0;
  const amountPaid = payment.amountPaid;
  const netTotal = Math.max(0, amountDue - discount);
  const balance = Math.max(0, netTotal - amountPaid);

  return {
    ...payment,
    amountDue,
    discount,
    netTotal,
    balance,
    amountPaid,
    paidAt: payment.paidAt?.toISOString() ?? null,
    createdAt: payment.createdAt.toISOString(),
    studentName: row?.studentName ?? "",
    levelName: row?.levelName ?? null,
    parentName: row?.parentName ?? null,
  };
}

router.get(
  "/payments",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const user = (req as any).user;
    if (
      ![
        "admin",
        "accountant",
        "parent",
        "branch_manager",
        "receptionist",
      ].includes(user.role)
    ) {
      res
        .status(403)
        .json({
          error:
            "Access to payment data is restricted to Admin and Accountant roles.",
        });
      return;
    }
    const params = ListPaymentsQueryParams.safeParse(req.query);
    let payments: (typeof paymentsTable.$inferSelect)[] = [];

    // If parent: scope to their students only
    if (user.role === "parent") {
      const parentStudents = await db
        .select({ id: studentsTable.id })
        .from(studentsTable)
        .where(eq(studentsTable.parentId, user.id));
      const studentIds = parentStudents.map((s) => s.id);
      if (studentIds.length === 0) {
        res.json([]);
        return;
      }
      const whereClause =
        params.success && params.data.status
          ? and(
              inArray(paymentsTable.studentId, studentIds),
              eq(paymentsTable.status, params.data.status as any),
            )
          : inArray(paymentsTable.studentId, studentIds);
      payments = await db
        .select()
        .from(paymentsTable)
        .where(whereClause)
        .orderBy(paymentsTable.dueDate);
    } else if (params.success && params.data.studentId) {
      payments = await db
        .select()
        .from(paymentsTable)
        .where(eq(paymentsTable.studentId, params.data.studentId))
        .orderBy(paymentsTable.dueDate);
    } else if (params.success && params.data.status) {
      payments = await db
        .select()
        .from(paymentsTable)
        .where(eq(paymentsTable.status, params.data.status))
        .orderBy(paymentsTable.dueDate);
    } else if (params.success && params.data.levelId) {
      payments = await db
        .select()
        .from(paymentsTable)
        .where(eq(paymentsTable.levelId, params.data.levelId))
        .orderBy(paymentsTable.dueDate);
    } else {
      payments = await db
        .select()
        .from(paymentsTable)
        .orderBy(paymentsTable.dueDate);
    }

    // branch_manager sees only their branch's payments
    if (user.role === "branch_manager" && user.branchId) {
      const branchStudents = await db
        .select({ id: studentsTable.id })
        .from(studentsTable)
        .where(eq(studentsTable.branchId, user.branchId));
      const branchStudentIds = new Set(branchStudents.map((s) => s.id));
      payments = payments.filter((p) => branchStudentIds.has(p.studentId));
    }

    const enriched = await Promise.all(payments.map(enrichPayment));
    res.json(enriched);
  },
);

router.post(
  "/payments",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const user = (req as any).user;
    if (!["admin", "accountant", "receptionist"].includes(user.role)) {
      res
        .status(403)
        .json({ error: "Only admins and accountants can create payments" });
      return;
    }

    const parsed = CreatePaymentBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const amountDue = parsed.data.amountDue;
    const amountPaid = parsed.data.amountPaid;
    const autoStatus =
      amountPaid >= amountDue
        ? "paid"
        : amountPaid > 0
          ? "partially_paid"
          : parsed.data.status;
    const rawDue = parsed.data.dueDate;
    const dueDate =
      rawDue && rawDue instanceof Date && !isNaN(rawDue.getTime())
        ? rawDue.toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0];

    const [payment] = await db
      .insert(paymentsTable)
      .values({
        studentId: parsed.data.studentId,
        levelId: parsed.data.levelId ?? null,
        amountDue: amountDue,
        amountPaid: amountPaid,
        status: autoStatus,
        dueDate: dueDate ?? new Date().toISOString().split("T")[0],
        notes: parsed.data.notes ?? null,
        paidAt: autoStatus === "paid" ? new Date() : null,
      })
      .returning();

    if (!payment) {
      res.status(500).json({ error: "Failed to create payment" });
      return;
    }

    const enriched = await enrichPayment(payment);

    // Notify the parent (if student has one) that a payment was recorded
    const [studentRow] = await db
      .select({ parentId: studentsTable.parentId, name: studentsTable.name })
      .from(studentsTable)
      .where(eq(studentsTable.id, parsed.data.studentId));
    if (studentRow?.parentId) {
      const statusLabel =
        autoStatus === "paid" ? "تم استلام الدفع" : "تسجيل دفعة جزئية";
      await createNotification(
        studentRow.parentId,
        "payment_received",
        `${statusLabel} — ${studentRow.name}`,
        `المبلغ المدفوع: ${amountPaid} دج`,
        "/payments",
      );
    }

    res.status(201).json(enriched);
  },
);

router.get(
  "/payments/:id",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const user = (req as any).user;
    if (
      !["admin", "accountant", "parent", "branch_manager"].includes(user.role)
    ) {
      res
        .status(403)
        .json({
          error:
            "Access to payment data is restricted to Admin and Accountant roles.",
        });
      return;
    }
    const params = GetPaymentParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const [payment] = await db
      .select()
      .from(paymentsTable)
      .where(eq(paymentsTable.id, params.data.id));
    if (!payment) {
      res.status(404).json({ error: "Payment not found" });
      return;
    }

    res.json(await enrichPayment(payment));
  },
);

router.put(
  "/payments/:id",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const user = (req as any).user;
    if (!["admin", "accountant"].includes(user.role)) {
      res
        .status(403)
        .json({ error: "Only admins and accountants can update payments" });
      return;
    }

    const params = GetPaymentParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const parsed = UpdatePaymentBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const [oldPayment] = await db
      .select()
      .from(paymentsTable)
      .where(eq(paymentsTable.id, params.data.id));
    if (!oldPayment) {
      res.status(404).json({ error: "Payment not found" });
      return;
    }

    const updateData: Record<string, unknown> = {};
    if (parsed.data.amountDue !== undefined)
      updateData.amountDue = parsed.data.amountDue.toString();
    if (parsed.data.amountPaid !== undefined)
      updateData.amountPaid = parsed.data.amountPaid.toString();
    if (parsed.data.discount !== undefined)
      updateData.discount = Math.max(0, parsed.data.discount).toString();
    if (parsed.data.dueDate !== undefined)
      updateData.dueDate = parsed.data.dueDate;
    if (parsed.data.notes !== undefined) updateData.notes = parsed.data.notes;

    // Auto-recalculate status from final values
    const finalAmountDue = parseFloat(
      String(updateData.amountDue ?? oldPayment.amountDue),
    );
    const finalDiscount = parseFloat(
      String(updateData.discount ?? oldPayment.discount ?? "0"),
    );
    const finalAmountPaid = parseFloat(
      String(updateData.amountPaid ?? oldPayment.amountPaid),
    );
    const finalNetTotal = Math.max(0, finalAmountDue - finalDiscount);
    const autoStatus =
      finalAmountPaid >= finalNetTotal
        ? "paid"
        : finalAmountPaid > 0
          ? "partially_paid"
          : "pending";
    updateData.status = autoStatus;
    if (autoStatus === "paid" && !oldPayment.paidAt) {
      updateData.paidAt = new Date();
    } else if (autoStatus !== "paid") {
      updateData.paidAt = null;
    }

    const [payment] = await db
      .update(paymentsTable)
      .set(updateData)
      .where(eq(paymentsTable.id, params.data.id))
      .returning();
    if (!payment) {
      res.status(404).json({ error: "Payment not found" });
      return;
    }

    const changes: Record<string, { old: unknown; new: unknown }> = {};
    const oldAmountDue = parseFloat(oldPayment.amountDue as unknown as string);
    const newAmountDue = parseFloat(payment.amountDue as unknown as string);
    if (oldAmountDue !== newAmountDue)
      changes.amountDue = { old: oldAmountDue, new: newAmountDue };

    const oldDiscount = parseFloat(
      (oldPayment.discount ?? "0") as unknown as string,
    );
    const newDiscount = parseFloat(
      (payment.discount ?? "0") as unknown as string,
    );
    if (oldDiscount !== newDiscount)
      changes.discount = { old: oldDiscount, new: newDiscount };

    if (oldPayment.dueDate !== payment.dueDate)
      changes.dueDate = { old: oldPayment.dueDate, new: payment.dueDate };
    if (oldPayment.notes !== payment.notes)
      changes.notes = { old: oldPayment.notes, new: payment.notes };

    if (Object.keys(changes).length > 0) {
      await db.insert(paymentEditsTable).values({
        paymentId: payment.id,
        editedBy: user.id,
        changes,
      });
    }

    // Notify parent that payment was updated
    const [studentRow] = await db
      .select({ parentId: studentsTable.parentId, name: studentsTable.name })
      .from(studentsTable)
      .where(eq(studentsTable.id, payment.studentId));
    if (studentRow?.parentId) {
      await createNotification(
        studentRow.parentId,
        "payment",
        "تم تحديث الدفعة",
        `تم تحديث بيانات دفعة ${studentRow.name}`,
        "/payments",
      );
    }

    res.json(await enrichPayment(payment));
  },
);

router.get(
  "/payments/:id/edits",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const user = (req as any).user;
    if (!["admin", "accountant"].includes(user.role)) {
      res
        .status(403)
        .json({ error: "Only admins and accountants can view payment edits" });
      return;
    }

    const paymentId = parseInt(req.params.id as string, 10);
    if (isNaN(paymentId)) {
      res.status(400).json({ error: "Invalid payment id" });
      return;
    }

    const edits = await db
      .select({
        id: paymentEditsTable.id,
        editedAt: paymentEditsTable.editedAt,
        changes: paymentEditsTable.changes,
        editorId: usersTable.id,
        editorName: usersTable.name,
      })
      .from(paymentEditsTable)
      .leftJoin(usersTable, eq(paymentEditsTable.editedBy, usersTable.id))
      .where(eq(paymentEditsTable.paymentId, paymentId))
      .orderBy(desc(paymentEditsTable.editedAt));

    res.json(
      edits.map((e) => ({
        id: e.id,
        editedAt:
          e.editedAt instanceof Date ? e.editedAt.toISOString() : e.editedAt,
        changes: e.changes,
        editedBy: { id: e.editorId ?? null, name: e.editorName ?? null },
      })),
    );
  },
);

router.get(
  "/payments/:id/receipt",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const user = (req as any).user;
    if (
      !["admin", "accountant", "parent", "branch_manager"].includes(user.role)
    ) {
      res
        .status(403)
        .json({ error: "Access to payment receipts is restricted." });
      return;
    }
    const params = GetPaymentParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const [payment] = await db
      .select()
      .from(paymentsTable)
      .where(eq(paymentsTable.id, params.data.id));
    if (!payment) {
      res.status(404).json({ error: "Payment not found" });
      return;
    }

    const enriched = await enrichPayment(payment);
    const amountDue = payment.amountDue;
    const discount = payment.discount ?? 0;
    const netTotal = amountDue - discount;
    const amountPaid = payment.amountPaid;

    res.json({
      receiptNumber: `RCP-${payment.id.toString().padStart(5, "0")}`,
      studentName: enriched.studentName,
      parentName: enriched.parentName,
      levelName: enriched.levelName,
      amountDue,
      discount,
      netTotal,
      amountPaid,
      balance: Math.max(0, netTotal - amountPaid),
      status: payment.status,
      dueDate: payment.dueDate,
      paidAt: payment.paidAt?.toISOString() ?? null,
      notes: payment.notes ?? null,
      issuedAt: new Date().toISOString(),
    });
  },
);

// ── TRANSACTION ROUTES ────────────────────────────────────────────────────────

router.get(
  "/payments/:id/transactions",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const user = (req as any).user;
    if (
      !["admin", "accountant", "parent", "branch_manager"].includes(user.role)
    ) {
      res.status(403).json({ error: "Access denied." });
      return;
    }
    const paymentId = parseInt(req.params.id as string, 10);
    if (isNaN(paymentId)) {
      res.status(400).json({ error: "Invalid payment id" });
      return;
    }

    const txs = await db
      .select()
      .from(paymentTransactionsTable)
      .where(eq(paymentTransactionsTable.paymentId, paymentId))
      .orderBy(desc(paymentTransactionsTable.transactionDate));

    res.json(
      txs.map((tx) => ({
        ...tx,
        amount: tx.amount,
        createdAt: tx.createdAt.toISOString(),
      })),
    );
  },
);

router.post(
  "/payments/:id/transactions",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const user = (req as any).user;
    if (!["admin", "accountant"].includes(user.role)) {
      res
        .status(403)
        .json({ error: "Only admins and accountants can record payments." });
      return;
    }
    const paymentId = parseInt(req.params.id as string, 10);
    if (isNaN(paymentId)) {
      res.status(400).json({ error: "Invalid payment id" });
      return;
    }

    const [payment] = await db
      .select()
      .from(paymentsTable)
      .where(eq(paymentsTable.id, paymentId));
    if (!payment) {
      res.status(404).json({ error: "Payment not found" });
      return;
    }

    const {
      amount,
      paymentMethod,
      transactionDate,
      notes,
      discount: discountRaw,
    } = req.body as any;
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      res.status(400).json({ error: "Valid amount is required." });
      return;
    }
    if (!transactionDate) {
      res.status(400).json({ error: "Transaction date is required." });
      return;
    }
    const validMethods = ["cash", "bank_transfer", "cheque", "online"];
    const method = validMethods.includes(paymentMethod)
      ? paymentMethod
      : "cash";

    const [tx] = await db
      .insert(paymentTransactionsTable)
      .values({
        paymentId,
        amount: parseFloat(amount),
        paymentMethod: method,
        transactionDate,
        notes: notes?.trim() || null,
      })
      .returning();

    // Recompute amountPaid from all transactions for this payment
    const [agg] = await db
      .select({ total: sql<string>`COALESCE(SUM(amount), 0)` })
      .from(paymentTransactionsTable)
      .where(eq(paymentTransactionsTable.paymentId, paymentId));
    const newPaid = parseFloat(agg?.total ?? "0");
    const due = payment.amountDue;
    const newDiscount =
      discountRaw !== undefined && !isNaN(parseFloat(discountRaw))
        ? Math.max(0, parseFloat(discountRaw))
        : (payment.discount ?? 0);
    const netTotal = Math.max(0, due - newDiscount);
    const newStatus =
      newPaid >= netTotal ? "paid" : newPaid > 0 ? "partially_paid" : "pending";

    await db
      .update(paymentsTable)
      .set({
        amountPaid: parseFloat(newPaid.toFixed(2)),
        discount: parseFloat(newDiscount.toFixed(2)),
        status: newStatus as any,
        paidAt: newStatus === "paid" ? new Date() : null,
      })
      .where(eq(paymentsTable.id, paymentId));

    res
      .status(201)
      .json({
        ...tx,
        amount: tx.amount,
        createdAt: tx.createdAt.toISOString(),
      });
  },
);

router.delete(
  "/payments/:paymentId/transactions/:txId",
  requireAuth,
  async (_req: Request, res: Response): Promise<void> => {
    res
      .status(405)
      .json({
        error:
          "Payment ledger transactions are immutable; create an adjusting transaction instead.",
      });
  },
);

// ── RECEIPT PER TRANSACTION ───────────────────────────────────────────────────

router.get(
  "/transactions/:txId/receipt",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const user = (req as any).user;
    if (
      !["admin", "accountant", "parent", "branch_manager"].includes(user.role)
    ) {
      res.status(403).json({ error: "Access denied." });
      return;
    }
    const txId = parseInt(req.params.txId as string, 10);
    if (isNaN(txId)) {
      res.status(400).json({ error: "Invalid transaction id" });
      return;
    }

    const [tx] = await db
      .select()
      .from(paymentTransactionsTable)
      .where(eq(paymentTransactionsTable.id, txId));
    if (!tx) {
      res.status(404).json({ error: "Transaction not found" });
      return;
    }

    const [payment] = await db
      .select()
      .from(paymentsTable)
      .where(eq(paymentsTable.id, tx.paymentId));
    if (!payment) {
      res.status(404).json({ error: "Payment not found" });
      return;
    }

    const enriched = await enrichPayment(payment);

    const amountDue = payment.amountDue;
    const discount = payment.discount ?? 0;
    const netTotal = Math.max(0, amountDue - discount);
    const amountPaid = payment.amountPaid;
    const remaining = Math.max(0, netTotal - amountPaid);

    res.json({
      receiptNumber: `TXN-${tx.id.toString().padStart(5, "0")}`,
      studentName: enriched.studentName,
      parentName: enriched.parentName,
      levelName: enriched.levelName,
      amountDue,
      discount,
      netTotal,
      transactionAmount: tx.amount,
      totalPaid: amountPaid,
      balance: remaining,
      paymentMethod: tx.paymentMethod,
      transactionDate: tx.transactionDate,
      notes: tx.notes ?? null,
      issuedAt: new Date().toISOString(),
    });
  },
);

// ── ENROLLMENT RECEIPT (full: financial + educational) ────────────────────────
router.get(
  "/payments/:id/enrollment-receipt",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const user = (req as any).user;
    if (
      !["admin", "accountant", "parent", "branch_manager"].includes(user.role)
    ) {
      res
        .status(403)
        .json({ error: "Access to enrollment receipts is restricted." });
      return;
    }
    const paymentId = parseInt(req.params.id as string, 10);
    if (isNaN(paymentId)) {
      res.status(400).json({ error: "Invalid payment id" });
      return;
    }

    const [payment] = await db
      .select()
      .from(paymentsTable)
      .where(eq(paymentsTable.id, paymentId));
    if (!payment) {
      res.status(404).json({ error: "Payment not found" });
      return;
    }

    const enriched = await enrichPayment(payment);
    const amountDue = payment.amountDue;
    const discount = payment.discount ?? 0;
    const netTotal = Math.max(0, amountDue - discount);
    const amountPaid = payment.amountPaid;
    const balance = Math.max(0, netTotal - amountPaid);

    // Fetch full student record for fallback level + teacher
    const [studentRecord] = await db
      .select({
        levelId: studentsTable.levelId,
        teacherId: studentsTable.teacherId,
      })
      .from(studentsTable)
      .where(eq(studentsTable.id, payment.studentId));

    // Level: payment.levelId takes priority; fall back to student.levelId
    let levelName: string | null = enriched.levelName;
    if (!levelName && studentRecord?.levelId) {
      const [lvl] = await db
        .select({ name: levelsTable.name })
        .from(levelsTable)
        .where(eq(levelsTable.id, studentRecord.levelId));
      levelName = lvl?.name ?? null;
    }

    // Fetch student's group (most recently joined)
    let groupName: string | null = null;
    let teacherName: string | null = null;
    let schedule: string | null = null;
    let recurringDays: string | null = null;
    let sessionStartTime: string | null = null;
    let sessionDurationMins: number | null = null;
    let isAssigned = false;

    try {
      const groupLinks = await db
        .select({ groupId: groupStudentsTable.groupId })
        .from(groupStudentsTable)
        .where(eq(groupStudentsTable.studentId, payment.studentId))
        .orderBy(desc(groupStudentsTable.joinedAt))
        .limit(1);

      if (groupLinks.length > 0) {
        const [group] = await db
          .select()
          .from(groupsTable)
          .where(eq(groupsTable.id, groupLinks[0].groupId));
        if (group) {
          isAssigned = true;
          groupName = group.name;
          schedule = group.schedule ?? null;
          recurringDays = group.recurringDays ?? null;
          sessionStartTime = group.sessionStartTime ?? null;
          sessionDurationMins = group.sessionDurationMins ?? null;
          if (group.teacherId) {
            const [teacher] = await db
              .select({ name: usersTable.name })
              .from(usersTable)
              .where(eq(usersTable.id, group.teacherId));
            teacherName = teacher?.name ?? null;
          }
        }
      }

      // Fallback: if not assigned to a group but student has a direct teacherId, use that
      if (!teacherName && studentRecord?.teacherId) {
        const [teacher] = await db
          .select({ name: usersTable.name })
          .from(usersTable)
          .where(eq(usersTable.id, studentRecord.teacherId));
        teacherName = teacher?.name ?? null;
      }
    } catch (_) {
      /* group data is optional, proceed without it */
    }

    res.json({
      receiptNumber: `ENR-${payment.id.toString().padStart(5, "0")}`,
      studentName: enriched.studentName,
      studentId: payment.studentId,
      parentName: enriched.parentName,
      levelName,
      groupName,
      teacherName,
      isAssigned,
      schedule,
      recurringDays,
      sessionStartTime,
      sessionDurationMins,
      amountDue,
      discount,
      netTotal,
      amountPaid,
      balance,
      status: payment.status,
      dueDate: payment.dueDate,
      paidAt: payment.paidAt?.toISOString() ?? null,
      notes: payment.notes ?? null,
      issuedAt: new Date().toISOString(),
    });
  },
);

// ── DEBT SUMMARY ─────────────────────────────────────────────────────────────

router.get(
  "/debt-summary",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const user = (req as any).user;
    if (!["admin", "accountant"].includes(user.role)) {
      res.status(403).json({ error: "Access denied." });
      return;
    }

    // Single query: join payments → students → levels, group by student,
    // filter to only students with remaining balance > 0.
    const debtRows = await db
      .select({
        studentId: paymentsTable.studentId,
        studentName: studentsTable.name,
        levelName: levelsTable.name,
        totalDue: sql<number>`CAST(SUM(CAST(${paymentsTable.amountDue} AS REAL) - COALESCE(CAST(${paymentsTable.discount} AS REAL), 0)) AS REAL)`,
        totalPaid: sql<number>`CAST(SUM(CAST(${paymentsTable.amountPaid} AS REAL)) AS REAL)`,
        balance: sql<number>`CAST(SUM(
        CAST(${paymentsTable.amountDue} AS REAL)
        - COALESCE(CAST(${paymentsTable.discount} AS REAL), 0)
        - CAST(${paymentsTable.amountPaid} AS REAL)
      ) AS REAL)`,
        oldestDueDate: sql<string>`MIN(${paymentsTable.dueDate})`,
      })
      .from(paymentsTable)
      .innerJoin(studentsTable, eq(paymentsTable.studentId, studentsTable.id))
      .leftJoin(levelsTable, eq(studentsTable.levelId, levelsTable.id))
      .where(
        sql`(CAST(${paymentsTable.amountDue} AS REAL) - COALESCE(CAST(${paymentsTable.discount} AS REAL), 0) - CAST(${paymentsTable.amountPaid} AS REAL)) > 0`,
      )
      .groupBy(paymentsTable.studentId, studentsTable.name, levelsTable.name)
      .having(
        sql`SUM(CAST(${paymentsTable.amountDue} AS REAL) - COALESCE(CAST(${paymentsTable.discount} AS REAL), 0) - CAST(${paymentsTable.amountPaid} AS REAL)) > 0`,
      )
      .orderBy(sql`MIN(${paymentsTable.dueDate})`);

    const totalDebt = debtRows.reduce((s, r) => s + r.balance, 0);

    res.json({
      totalDebt,
      students: debtRows.map((r) => ({
        studentId: r.studentId,
        studentName: r.studentName ?? "Unknown",
        levelName: r.levelName ?? null,
        amountDue: r.totalDue,
        amountPaid: r.totalPaid,
        balance: r.balance,
        oldestDueDate: r.oldestDueDate,
      })),
    });
  },
);

export default router;

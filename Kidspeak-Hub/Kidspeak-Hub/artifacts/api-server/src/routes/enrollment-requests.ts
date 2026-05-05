import { Router } from "express";
import { db, enrollmentRequestsTable, studentsTable, usersTable, paymentsTable, levelsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();

// GET /api/enrollment-requests — admin: all, parent: own
router.get("/enrollment-requests", requireAuth, async (req, res) => {
  const user = (req as any).user;
  if (user.role !== "admin" && user.role !== "parent") return res.status(403).json({ error: "Forbidden" });

  try {
    const rows = await db
      .select({
        id: enrollmentRequestsTable.id,
        parentId: enrollmentRequestsTable.parentId,
        parentName: usersTable.name,
        studentName: enrollmentRequestsTable.studentName,
        dateOfBirth: enrollmentRequestsTable.dateOfBirth,
        notes: enrollmentRequestsTable.notes,
        status: enrollmentRequestsTable.status,
        adminNotes: enrollmentRequestsTable.adminNotes,
        createdAt: enrollmentRequestsTable.createdAt,
      })
      .from(enrollmentRequestsTable)
      .leftJoin(usersTable, eq(enrollmentRequestsTable.parentId, usersTable.id))
      .where(user.role === "parent" ? eq(enrollmentRequestsTable.parentId, user.id) : undefined)
      .orderBy(desc(enrollmentRequestsTable.createdAt));

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch enrollment requests" });
  }
});

// POST /api/enrollment-requests — parent creates
router.post("/enrollment-requests", requireAuth, async (req, res) => {
  const user = (req as any).user;
  if (user.role !== "parent") return res.status(403).json({ error: "Only parents can submit enrollment requests" });

  const { studentName, dateOfBirth, notes } = req.body;
  if (!studentName || typeof studentName !== "string" || !studentName.trim()) {
    return res.status(400).json({ error: "studentName is required" });
  }

  try {
    const [item] = await db
      .insert(enrollmentRequestsTable)
      .values({
        parentId: user.id,
        studentName: studentName.trim(),
        dateOfBirth: dateOfBirth || null,
        notes: notes || null,
        status: "pending",
      })
      .returning();
    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ error: "Failed to create enrollment request" });
  }
});

// POST /api/enrollment-requests/:id/approve — admin approves → creates student
router.post("/enrollment-requests/:id/approve", requireAuth, async (req, res) => {
  const user = (req as any).user;
  if (user.role !== "admin") return res.status(403).json({ error: "Admin only" });

  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const { adminNotes, levelId } = req.body;

  try {
    const [request] = await db
      .select()
      .from(enrollmentRequestsTable)
      .where(eq(enrollmentRequestsTable.id, id));

    if (!request) return res.status(404).json({ error: "Request not found" });
    if (request.status !== "pending") return res.status(400).json({ error: "Request is not pending" });

    // Create the student
    const [student] = await db
      .insert(studentsTable)
      .values({
        name: request.studentName,
        parentId: request.parentId,
        dateOfBirth: request.dateOfBirth || undefined,
        enrollmentDate: new Date().toISOString().split("T")[0],
        levelId: levelId ? parseInt(levelId) : null,
        notes: request.notes || null,
        behavioralFlags: [],
      })
      .returning();

    // Mark request as approved
    await db
      .update(enrollmentRequestsTable)
      .set({ status: "approved", adminNotes: adminNotes || null, updatedAt: new Date() })
      .where(eq(enrollmentRequestsTable.id, id));

    // Auto-create invoice if a level was assigned
    let payment = null;
    const parsedLevelId = levelId ? parseInt(levelId) : null;
    if (parsedLevelId && !isNaN(parsedLevelId)) {
      const [level] = await db
        .select({ id: levelsTable.id, price: levelsTable.price })
        .from(levelsTable)
        .where(eq(levelsTable.id, parsedLevelId));

      if (level) {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 30);
        const [newPayment] = await db
          .insert(paymentsTable)
          .values({
            studentId: student.id,
            levelId: level.id,
            amountDue: level.price,
            amountPaid: "0",
            status: "pending",
            dueDate: dueDate.toISOString().split("T")[0],
          })
          .returning();
        payment = newPayment;
      }
    }

    res.json({ success: true, student, payment });
  } catch (err) {
    res.status(500).json({ error: "Failed to approve enrollment request" });
  }
});

// POST /api/enrollment-requests/:id/reject — admin rejects
router.post("/enrollment-requests/:id/reject", requireAuth, async (req, res) => {
  const user = (req as any).user;
  if (user.role !== "admin") return res.status(403).json({ error: "Admin only" });

  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const { adminNotes } = req.body;

  try {
    await db
      .update(enrollmentRequestsTable)
      .set({ status: "rejected", adminNotes: adminNotes || null, updatedAt: new Date() })
      .where(eq(enrollmentRequestsTable.id, id));

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to reject enrollment request" });
  }
});

export default router;

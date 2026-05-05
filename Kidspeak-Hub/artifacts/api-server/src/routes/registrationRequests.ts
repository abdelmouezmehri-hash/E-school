import { Router, type IRouter, type Request, type Response } from "express";
import { eq, desc } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db, registrationRequestsTable, usersTable } from "@workspace/db";
import { requireAuth, requireRole } from "../middlewares/auth";

const router: IRouter = Router();

/* ── Public: Submit a parent registration request ─────────────────────────── */
router.post("/public/registration-requests", async (req: Request, res: Response): Promise<void> => {
  const { fullName, email, phone, whatsappPhone, address, source } = req.body ?? {};

  if (!fullName || typeof fullName !== "string" || fullName.trim().length < 2) {
    res.status(400).json({ error: "Full name is required." });
    return;
  }
  if (!email || typeof email !== "string" || !email.includes("@")) {
    res.status(400).json({ error: "A valid email address is required." });
    return;
  }
  if (!phone || typeof phone !== "string" || phone.trim().length < 8) {
    res.status(400).json({ error: "A valid phone number is required." });
    return;
  }

  const [existing] = await db
    .select({ id: registrationRequestsTable.id })
    .from(registrationRequestsTable)
    .where(eq(registrationRequestsTable.email, email.trim().toLowerCase()));

  if (existing) {
    res.status(409).json({ error: "A request with this email already exists." });
    return;
  }

  const [request] = await db
    .insert(registrationRequestsTable)
    .values({
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      whatsappPhone: whatsappPhone?.trim() || null,
      address: address?.trim() || null,
      source: (typeof source === "string" && source.trim()) ? source.trim() : null,
      status: "pending",
    })
    .returning();

  res.status(201).json(request);
});

/* ── Admin: List all registration requests ────────────────────────────────── */
router.get(
  "/admin/registration-requests",
  requireAuth,
  await requireRole(["admin"]),
  async (_req: Request, res: Response): Promise<void> => {
    const requests = await db
      .select()
      .from(registrationRequestsTable)
      .orderBy(desc(registrationRequestsTable.createdAt));
    res.json(requests);
  }
);

/* ── Admin: Approve request & create parent account ──────────────────────── */
router.post(
  "/admin/registration-requests/:id/approve",
  requireAuth,
  await requireRole(["admin"]),
  async (req: Request, res: Response): Promise<void> => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

    const { loginEmail, password, displayName } = req.body ?? {};

    if (!loginEmail || typeof loginEmail !== "string" || !loginEmail.includes("@")) {
      res.status(400).json({ error: "A valid login email is required." });
      return;
    }
    if (!password || typeof password !== "string" || password.length < 6) {
      res.status(400).json({ error: "Password must be at least 6 characters." });
      return;
    }

    const [request] = await db
      .select()
      .from(registrationRequestsTable)
      .where(eq(registrationRequestsTable.id, id));

    if (!request) { res.status(404).json({ error: "Request not found" }); return; }
    if (request.status !== "pending") {
      res.status(400).json({ error: "This request has already been processed." });
      return;
    }

    const [existingUser] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.email, loginEmail.trim().toLowerCase()));

    if (existingUser) {
      res.status(409).json({ error: "A user with this email already exists." });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const [newUser] = await db
      .insert(usersTable)
      .values({
        name: (displayName?.trim() || request.fullName),
        email: loginEmail.trim().toLowerCase(),
        passwordHash,
        role: "parent",
        phone: request.phone,
        phone2: request.whatsappPhone ?? undefined,
        status: "active",
      })
      .returning();

    await db
      .update(registrationRequestsTable)
      .set({ status: "approved" })
      .where(eq(registrationRequestsTable.id, id));

    const { passwordHash: _, ...safeUser } = newUser;
    res.json({ user: safeUser, message: "Parent account created successfully." });
  }
);

/* ── Admin: Reject / delete a request ────────────────────────────────────── */
router.delete(
  "/admin/registration-requests/:id",
  requireAuth,
  await requireRole(["admin"]),
  async (req: Request, res: Response): Promise<void> => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

    await db
      .update(registrationRequestsTable)
      .set({ status: "rejected" })
      .where(eq(registrationRequestsTable.id, id));

    res.json({ message: "Request rejected." });
  }
);

export default router;

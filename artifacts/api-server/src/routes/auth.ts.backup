import { Router, type IRouter, type Request, type Response } from "express";
import { eq, and, gt } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db, usersTable, sessionsTable, customRolesTable } from "@workspace/db";
import { LoginBody } from "@workspace/api-zod";
import { randomBytes } from "crypto";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.post("/auth/login", async (req: Request, res: Response): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { email, password } = parsed.data;
  const isPhone = !email.includes("@");
  const [user] = isPhone
    ? await db.select().from(usersTable).where(eq(usersTable.phone, email))
    : await db.select().from(usersTable).where(eq(usersTable.email, email));

  if (!user || !await bcrypt.compare(password, user.passwordHash)) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  if (user.status === "inactive") {
    res.status(403).json({ error: "Your account is inactive. Please contact the administration." });
    return;
  }

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await db.insert(sessionsTable).values({ userId: user.id, token, expiresAt });

  res.cookie("session_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: expiresAt,
  });

  // Resolve permissions for custom-role users
  let permissions: string[] = [];
  if (user.customRoleId) {
    const [cr] = await db
      .select({ permissions: customRolesTable.permissions })
      .from(customRolesTable)
      .where(eq(customRolesTable.id, user.customRoleId));
    permissions = cr?.permissions ?? [];
  }

  const { passwordHash: _, ...safeUser } = user;
  res.json({
    user: { ...safeUser, createdAt: safeUser.createdAt.toISOString(), permissions },
    message: "Login successful",
  });
});

router.post("/auth/logout", async (req: Request, res: Response): Promise<void> => {
  const token = req.cookies?.["session_token"];
  if (token) {
    await db.delete(sessionsTable).where(eq(sessionsTable.token, token));
  }
  res.clearCookie("session_token");
  res.json({ message: "Logged out successfully" });
});

router.get("/auth/me", async (req: Request, res: Response): Promise<void> => {
  const token = req.cookies?.["session_token"];
  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const now = new Date();
  const [session] = await db
    .select({ user: usersTable })
    .from(sessionsTable)
    .innerJoin(usersTable, eq(sessionsTable.userId, usersTable.id))
    .where(and(eq(sessionsTable.token, token), gt(sessionsTable.expiresAt, now)));

  if (!session) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  let permissions: string[] = [];
  if (session.user.customRoleId) {
    const [cr] = await db
      .select({ permissions: customRolesTable.permissions })
      .from(customRolesTable)
      .where(eq(customRolesTable.id, session.user.customRoleId));
    permissions = cr?.permissions ?? [];
  }

  const { passwordHash: _, ...safeUser } = session.user;
  res.json({ ...safeUser, createdAt: safeUser.createdAt.toISOString(), permissions });
});

// ── Self-service profile update ───────────────────────────────────────────────
router.patch("/auth/me", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  const {
    name, phone, phone2, bio, specialization, profilePicture,
    emergencyContact1Name, emergencyContact1Relation, emergencyContact1Phone,
    emergencyContact2Name, emergencyContact2Relation, emergencyContact2Phone,
    ccpNumber, ccpKey, rip,
  } = req.body ?? {};

  const updates: Record<string, unknown> = {};
  if (name !== undefined && typeof name === "string" && name.trim()) updates.name = name.trim();
  if (phone !== undefined) updates.phone = phone || null;
  if (phone2 !== undefined) updates.phone2 = phone2 || null;
  if (bio !== undefined) updates.bio = bio || null;
  if (specialization !== undefined) updates.specialization = specialization || null;
  if (profilePicture !== undefined) updates.profilePicture = profilePicture || null;
  if (emergencyContact1Name !== undefined) updates.emergencyContact1Name = emergencyContact1Name || null;
  if (emergencyContact1Relation !== undefined) updates.emergencyContact1Relation = emergencyContact1Relation || null;
  if (emergencyContact1Phone !== undefined) updates.emergencyContact1Phone = emergencyContact1Phone || null;
  if (emergencyContact2Name !== undefined) updates.emergencyContact2Name = emergencyContact2Name || null;
  if (emergencyContact2Relation !== undefined) updates.emergencyContact2Relation = emergencyContact2Relation || null;
  if (emergencyContact2Phone !== undefined) updates.emergencyContact2Phone = emergencyContact2Phone || null;
  if (ccpNumber !== undefined) updates.ccpNumber = ccpNumber || null;
  if (ccpKey !== undefined) updates.ccpKey = ccpKey || null;
  if (rip !== undefined) updates.rip = rip || null;

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "No updates provided" });
    return;
  }

  try {
    const [updated] = await db.update(usersTable).set(updates).where(eq(usersTable.id, user.id)).returning();
    if (!updated) { res.status(404).json({ error: "User not found" }); return; }
    const { passwordHash: _, ...safe } = updated;
    res.json({ ...safe, createdAt: safe.createdAt.toISOString() });
  } catch (err) {
    console.error("PATCH /auth/me error:", err);
    res.status(500).json({ error: "Failed to update profile" });
  }
});

// ── Change own password ────────────────────────────────────────────────────────
router.post("/auth/change-password", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  const { currentPassword, newPassword } = req.body ?? {};

  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: "currentPassword and newPassword are required" }); return;
  }
  if (typeof newPassword !== "string" || newPassword.length < 8) {
    res.status(400).json({ error: "New password must be at least 8 characters" }); return;
  }

  try {
    const [fullUser] = await db.select().from(usersTable).where(eq(usersTable.id, user.id));
    if (!fullUser || !await bcrypt.compare(currentPassword, fullUser.passwordHash)) {
      res.status(401).json({ error: "Current password is incorrect" }); return;
    }
    await db.update(usersTable).set({ passwordHash: await bcrypt.hash(newPassword, 10) }).where(eq(usersTable.id, user.id));
    res.json({ message: "Password changed successfully" });
  } catch (err) {
    console.error("POST /auth/change-password error:", err);
    res.status(500).json({ error: "Failed to change password" });
  }
});

export default router;

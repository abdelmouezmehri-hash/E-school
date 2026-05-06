import { Router, type IRouter, type Request, type Response } from "express";
import { eq, inArray } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db, usersTable, studentsTable, customRolesTable } from "@workspace/db";
import { CreateUserBody, UpdateUserBody, GetUserParams, ListUsersQueryParams } from "@workspace/api-zod";
import { requireAuth, requireRole } from "../middlewares/auth";

const router: IRouter = Router();

// Fields to select from usersTable (no password hash)
const userCols = {
  id: usersTable.id,
  name: usersTable.name,
  email: usersTable.email,
  role: usersTable.role,
  phone: usersTable.phone,
  phone2: usersTable.phone2,
  profilePicture: usersTable.profilePicture,
  bio: usersTable.bio,
  specialization: usersTable.specialization,
  emergencyContact1Name: usersTable.emergencyContact1Name,
  emergencyContact1Relation: usersTable.emergencyContact1Relation,
  emergencyContact1Phone: usersTable.emergencyContact1Phone,
  emergencyContact2Name: usersTable.emergencyContact2Name,
  emergencyContact2Relation: usersTable.emergencyContact2Relation,
  emergencyContact2Phone: usersTable.emergencyContact2Phone,
  ccpNumber: usersTable.ccpNumber,
  ccpKey: usersTable.ccpKey,
  rip: usersTable.rip,
  status: usersTable.status,
  paymentType: usersTable.paymentType,
  payPerSession: usersTable.payPerSession,
  monthlySalary: usersTable.monthlySalary,
  customRoleId: usersTable.customRoleId,
  branchId: usersTable.branchId,
  createdAt: usersTable.createdAt,
} as const;

function serialize(u: any, cr?: any) {
  return {
    ...u,
    createdAt: u.createdAt instanceof Date ? u.createdAt.toISOString() : u.createdAt,
    customRoleName: cr?.name ?? null,
    customRoleNameAr: cr?.nameAr ?? null,
    customRoleBaseTemplate: cr?.baseTemplate ?? null,
  };
}

router.get("/users", requireAuth, requireRole(["admin"]), async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  const params = ListUsersQueryParams.safeParse(req.query);

  const rows = await db
    .select({ user: userCols, customRole: customRolesTable })
    .from(usersTable)
    .leftJoin(customRolesTable, eq(usersTable.customRoleId, customRolesTable.id))
    .where(
      params.success && params.data.role
        ? eq(usersTable.role, params.data.role)
        : undefined
    );

  let serialized = rows.map(({ user, customRole }) => serialize(user, customRole));

  // Branch filter — branch_manager always scoped to their branch
  if (user.role === "branch_manager" && user.branchId) {
    serialized = serialized.filter(u => (u as any).branchId === user.branchId);
  } else {
    const branchIdParam = (req.query as any).branchId;
    if (branchIdParam) {
      const bid = parseInt(branchIdParam);
      if (!isNaN(bid)) serialized = serialized.filter(u => (u as any).branchId === bid);
    }
  }

  res.json(serialized);
});

router.post("/users", requireAuth, requireRole(["admin"]), async (req: Request, res: Response): Promise<void> => {
  const parsed = CreateUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { password, studentIds, ...rest } = parsed.data;
  const passwordHash = await bcrypt.hash(password, 10);

  const body = req.body as any;
  const customRoleId = body.customRoleId ? parseInt(body.customRoleId) : null;

  // If customRoleId is provided, resolve baseTemplate as the role
  let effectiveRole = rest.role;
  let resolvedCustomRole: any = null;
  if (customRoleId) {
    const [cr] = await db.select().from(customRolesTable).where(eq(customRolesTable.id, customRoleId));
    if (!cr) { res.status(400).json({ error: "Custom role not found" }); return; }
    effectiveRole = cr.baseTemplate as any;
    resolvedCustomRole = cr;
  }

  const [user] = await db.insert(usersTable).values({
    ...rest,
    role: effectiveRole,
    passwordHash,
    customRoleId: customRoleId ?? undefined,
  }).returning(userCols);

  if (!user) { res.status(500).json({ error: "Failed to create user" }); return; }

  if (effectiveRole === "parent" && studentIds && studentIds.length > 0) {
    await db.update(studentsTable).set({ parentId: user.id }).where(inArray(studentsTable.id, studentIds));
  }

  res.status(201).json(serialize(user, resolvedCustomRole));
});

router.get("/users/:id", requireAuth, requireRole(["admin"]), async (req: Request, res: Response): Promise<void> => {
  const params = GetUserParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const [row] = await db
    .select({ user: userCols, customRole: customRolesTable })
    .from(usersTable)
    .leftJoin(customRolesTable, eq(usersTable.customRoleId, customRolesTable.id))
    .where(eq(usersTable.id, params.data.id));

  if (!row) { res.status(404).json({ error: "User not found" }); return; }

  res.json(serialize(row.user, row.customRole));
});

router.put("/users/:id", requireAuth, requireRole(["admin"]), async (req: Request, res: Response): Promise<void> => {
  const params = GetUserParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const parsed = UpdateUserBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const { password, studentIds, ...rest } = parsed.data;
  const body = req.body as any;

  const updateData: Record<string, unknown> = { ...rest };
  if (password) updateData.passwordHash = await bcrypt.hash(password, 10);

  if (body.bio !== undefined) updateData.bio = body.bio || null;
  if (body.specialization !== undefined) updateData.specialization = body.specialization || null;
  if (body.paymentType !== undefined) updateData.paymentType = body.paymentType || null;
  if (body.payPerSession !== undefined) updateData.payPerSession = body.payPerSession != null ? String(body.payPerSession) : null;
  if (body.monthlySalary !== undefined) updateData.monthlySalary = body.monthlySalary != null ? String(body.monthlySalary) : null;
  if (body.ccpNumber !== undefined) updateData.ccpNumber = body.ccpNumber || null;
  if (body.ccpKey !== undefined) updateData.ccpKey = body.ccpKey || null;
  if (body.rip !== undefined) updateData.rip = body.rip || null;

  // Handle customRoleId
  let resolvedCustomRole: any = null;
  if (body.customRoleId !== undefined) {
    const crId = body.customRoleId ? parseInt(body.customRoleId) : null;
    updateData.customRoleId = crId;
    if (crId) {
      const [cr] = await db.select().from(customRolesTable).where(eq(customRolesTable.id, crId));
      if (!cr) { res.status(400).json({ error: "Custom role not found" }); return; }
      updateData.role = cr.baseTemplate;
      resolvedCustomRole = cr;
    }
  }

  const [user] = await db.update(usersTable).set(updateData).where(eq(usersTable.id, params.data.id)).returning(userCols);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  if (rest.role === "parent" && studentIds !== undefined) {
    await db.update(studentsTable).set({ parentId: null }).where(eq(studentsTable.parentId, params.data.id));
    if (studentIds.length > 0) {
      await db.update(studentsTable).set({ parentId: params.data.id }).where(inArray(studentsTable.id, studentIds));
    }
  }

  // If no resolved custom role yet, fetch it
  if (!resolvedCustomRole && user.customRoleId) {
    const [cr] = await db.select().from(customRolesTable).where(eq(customRolesTable.id, user.customRoleId));
    resolvedCustomRole = cr ?? null;
  }

  res.json(serialize(user, resolvedCustomRole));
});

router.delete("/users/:id", requireAuth, requireRole(["admin"]), async (req: Request, res: Response): Promise<void> => {
  const params = GetUserParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const [user] = await db.delete(usersTable).where(eq(usersTable.id, params.data.id)).returning({ id: usersTable.id });
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  res.json({ message: "User deleted successfully" });
});

export default router;

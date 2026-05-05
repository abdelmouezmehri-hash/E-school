import { Router, type IRouter, type Request, type Response } from "express";
import { eq, sql, count } from "drizzle-orm";
import { db, customRolesTable, usersTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

// ── GET /custom-roles — list all (with user count) ───────────────────────────
router.get("/custom-roles", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const rows = await db
    .select({
      id: customRolesTable.id,
      name: customRolesTable.name,
      nameAr: customRolesTable.nameAr,
      baseTemplate: customRolesTable.baseTemplate,
      description: customRolesTable.description,
      permissions: customRolesTable.permissions,
      createdAt: customRolesTable.createdAt,
      userCount: sql<number>`CAST((select count(*) from ${usersTable} where ${usersTable.customRoleId} = ${customRolesTable.id}) AS INTEGER)`,
    })
    .from(customRolesTable)
    .orderBy(customRolesTable.createdAt);

  res.json(rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })));
});

// ── POST /custom-roles — admin creates a role ────────────────────────────────
router.post("/custom-roles", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  if (user.role !== "admin") { res.status(403).json({ error: "Admin only" }); return; }

  const { name, nameAr, baseTemplate, description, permissions } = req.body as any;
  if (!name?.trim()) { res.status(400).json({ error: "name is required" }); return; }
  if (!baseTemplate || !["teacher", "psychologist", "accountant", "photographer", "designer"].includes(baseTemplate)) {
    res.status(400).json({ error: "Invalid baseTemplate" }); return;
  }

  const parsedPermissions: string[] = Array.isArray(permissions)
    ? permissions.filter((p: any) => typeof p === "string")
    : [];

  const [role] = await db.insert(customRolesTable).values({
    name: name.trim(),
    nameAr: nameAr?.trim() || null,
    baseTemplate,
    description: description?.trim() || null,
    permissions: parsedPermissions,
  }).returning();

  res.status(201).json({ ...role, createdAt: role.createdAt.toISOString(), userCount: 0 });
});

// ── PUT /custom-roles/:id — admin updates ────────────────────────────────────
router.put("/custom-roles/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  if (user.role !== "admin") { res.status(403).json({ error: "Admin only" }); return; }

  const id = parseInt(req.params.id);
  const { name, nameAr, baseTemplate, description, permissions } = req.body as any;
  if (!name?.trim()) { res.status(400).json({ error: "name is required" }); return; }
  if (baseTemplate && !["teacher", "psychologist", "accountant", "photographer", "designer"].includes(baseTemplate)) {
    res.status(400).json({ error: "Invalid baseTemplate" }); return;
  }

  const updateData: any = { name: name.trim() };
  if (nameAr !== undefined) updateData.nameAr = nameAr?.trim() || null;
  if (baseTemplate) updateData.baseTemplate = baseTemplate;
  if (description !== undefined) updateData.description = description?.trim() || null;
  if (permissions !== undefined) {
    updateData.permissions = Array.isArray(permissions)
      ? permissions.filter((p: any) => typeof p === "string")
      : [];
  }

  const [updated] = await db.update(customRolesTable).set(updateData)
    .where(eq(customRolesTable.id, id)).returning();

  if (!updated) { res.status(404).json({ error: "Role not found" }); return; }

  // If baseTemplate changed, sync all users with this customRoleId to the new template
  if (baseTemplate) {
    await db.update(usersTable)
      .set({ role: baseTemplate as any })
      .where(eq(usersTable.customRoleId, id));
  }

  const [withCount] = await db.select({
    userCount: sql<number>`CAST((select count(*) from ${usersTable} where ${usersTable.customRoleId} = ${customRolesTable.id}) AS INTEGER)`,
  }).from(customRolesTable).where(eq(customRolesTable.id, id));

  res.json({ ...updated, createdAt: updated.createdAt.toISOString(), userCount: withCount?.userCount ?? 0 });
});

// ── DELETE /custom-roles/:id — admin deletes ─────────────────────────────────
router.delete("/custom-roles/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  if (user.role !== "admin") { res.status(403).json({ error: "Admin only" }); return; }

  const id = parseInt(req.params.id);

  // Check user count
  const [countRow] = await db
    .select({ total: count() })
    .from(usersTable)
    .where(eq(usersTable.customRoleId, id));

  if ((countRow?.total ?? 0) > 0) {
    res.status(409).json({ error: `Cannot delete: ${countRow!.total} user(s) assigned to this role. Reassign them first.` });
    return;
  }

  const [deleted] = await db.delete(customRolesTable).where(eq(customRolesTable.id, id)).returning({ id: customRolesTable.id });
  if (!deleted) { res.status(404).json({ error: "Role not found" }); return; }

  res.json({ message: "Role deleted" });
});

export default router;

import { Router, Request, Response } from "express";
import { db, branchesTable, studentsTable, usersTable, groupsTable } from "@workspace/db";
import { eq, count } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();

// GET /branches — list all branches with pupil counts + manager info
router.get("/branches", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const branches = await db.select().from(branchesTable).orderBy(branchesTable.name);

  const pupilCounts = await db
    .select({ branchId: studentsTable.branchId, count: count() })
    .from(studentsTable)
    .groupBy(studentsTable.branchId);

  const countMap: Record<number, number> = {};
  for (const row of pupilCounts) {
    if (row.branchId !== null) countMap[row.branchId] = Number(row.count);
  }

  // Resolve manager info for branches that have managerId set
  const managerIds = branches.map(b => (b as any).managerId).filter(Boolean) as number[];
  const managers: Record<number, { name: string; email: string }> = {};
  if (managerIds.length > 0) {
    const allUsers = await db
      .select({ id: usersTable.id, name: usersTable.name, email: usersTable.email })
      .from(usersTable);
    for (const u of allUsers) {
      if (managerIds.includes(u.id)) managers[u.id] = u;
    }
  }

  const result = branches.map(b => {
    const mid = (b as any).managerId as number | null;
    const mgr = mid ? managers[mid] : null;
    return {
      ...b,
      managerId: mid,
      managerName: mgr ? mgr.name : b.managerName,
      managerEmail: mgr?.email ?? null,
      pupilCount: countMap[b.id] ?? 0,
    };
  });

  res.json(result);
});

// GET /branches/:id — single branch
router.get("/branches/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  const [branch] = await db.select().from(branchesTable).where(eq(branchesTable.id, id));
  if (!branch) { res.status(404).json({ error: "Branch not found" }); return; }
  res.json(branch);
});

// POST /branches — create branch (admin only)
router.post("/branches", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  if (user.role !== "admin") { res.status(403).json({ error: "Admin only" }); return; }

  const { name, nameAr, address, addressAr, managerName, managerId, phone, invoicePrefix, isActive } = req.body as Record<string, unknown>;
  if (!name || typeof name !== "string" || !name.trim()) {
    res.status(400).json({ error: "Branch name is required" }); return;
  }

  let resolvedManagerName = (managerName as string | null) ?? null;
  const resolvedManagerId = managerId ? parseInt(managerId as string) : null;
  if (resolvedManagerId) {
    const [mgr] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, resolvedManagerId));
    if (!mgr) { res.status(400).json({ error: "Manager user not found" }); return; }
    resolvedManagerName = mgr.name;
  }

  const [branch] = await db.insert(branchesTable).values({
    name: (name as string).trim(),
    nameAr: (nameAr as string | null) ?? null,
    address: (address as string | null) ?? null,
    addressAr: (addressAr as string | null) ?? null,
    managerName: resolvedManagerName,
    managerId: resolvedManagerId,
    phone: (phone as string | null) ?? null,
    invoicePrefix: (invoicePrefix as string) || "INV",
    isActive: isActive !== false,
  }).returning();

  // Assign branchId to the manager user
  if (resolvedManagerId && branch) {
    await db.update(usersTable).set({ branchId: branch.id }).where(eq(usersTable.id, resolvedManagerId));
  }

  res.status(201).json(branch);
});

// PUT /branches/:id — update branch (admin only)
router.put("/branches/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  if (user.role !== "admin") { res.status(403).json({ error: "Admin only" }); return; }

  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const body = req.body as Record<string, unknown>;
  const updateData: Partial<typeof branchesTable.$inferInsert> = {};
  if (body.name !== undefined) updateData.name = body.name as string;
  if (body.nameAr !== undefined) updateData.nameAr = body.nameAr as string;
  if (body.address !== undefined) updateData.address = body.address as string;
  if (body.addressAr !== undefined) updateData.addressAr = body.addressAr as string;
  if (body.phone !== undefined) updateData.phone = body.phone as string;
  if (body.invoicePrefix !== undefined) updateData.invoicePrefix = body.invoicePrefix as string;
  if (body.isActive !== undefined) updateData.isActive = body.isActive as boolean;

  // Handle manager assignment/change
  if (body.managerId !== undefined) {
    const newManagerId = body.managerId ? parseInt(body.managerId as string) : null;
    (updateData as any).managerId = newManagerId;

    if (newManagerId) {
      const [mgr] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, newManagerId));
      if (!mgr) { res.status(400).json({ error: "Manager user not found" }); return; }
      updateData.managerName = mgr.name;
      await db.update(usersTable).set({ branchId: id }).where(eq(usersTable.id, newManagerId));
    } else {
      updateData.managerName = (body.managerName as string | null) ?? null;
    }
  } else if (body.managerName !== undefined) {
    updateData.managerName = body.managerName as string;
  }

  const [updated] = await db.update(branchesTable).set(updateData).where(eq(branchesTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Branch not found" }); return; }
  res.json(updated);
});

// DELETE /branches/:id (admin only)
router.delete("/branches/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  if (user.role !== "admin") { res.status(403).json({ error: "Admin only" }); return; }

  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const [{ count: pupilCount }] = await db.select({ count: count() }).from(studentsTable).where(eq(studentsTable.branchId, id));
  if (Number(pupilCount) > 0) {
    res.status(400).json({ error: `Cannot delete branch with ${pupilCount} enrolled pupil(s). Reassign them first.` }); return;
  }

  await db.delete(branchesTable).where(eq(branchesTable.id, id));
  res.status(204).send();
});

// GET /branches/:id/stats — detailed stats for one branch
router.get("/branches/:id/stats", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const [{ pupilCount }] = await db.select({ pupilCount: count() }).from(studentsTable).where(eq(studentsTable.branchId, id));
  const [{ staffCount }] = await db.select({ staffCount: count() }).from(usersTable).where(eq(usersTable.branchId, id));
  const [{ groupCount }] = await db.select({ groupCount: count() }).from(groupsTable).where(eq(groupsTable.branchId, id));

  res.json({
    branchId: id,
    pupilCount: Number(pupilCount),
    staffCount: Number(staffCount),
    groupCount: Number(groupCount),
  });
});

export default router;

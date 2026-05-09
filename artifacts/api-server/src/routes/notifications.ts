import { Router, type Request, type Response } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db, notificationsTable, usersTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";

const router = Router();

// ── Helper: create a notification for a user ─────────────────────────────────
export async function createNotification(
  userId: number,
  type: string,
  title: string,
  message?: string,
  link?: string
) {
  try {
    await db.insert(notificationsTable).values({ userId, type, title, message: message ?? null, link: link ?? null });
  } catch (err) {
    console.error("createNotification failed:", err);
  }
}

// ── Helper: notify all users matching a role ──────────────────────────────────
export async function notifyRole(
  role: string,
  type: string,
  title: string,
  message?: string,
  link?: string
) {
  try {
    const users = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.role, role as any));
    for (const u of users) {
      await createNotification(u.id, type, title, message, link);
    }
  } catch (err) {
    console.error("notifyRole failed:", err);
  }
}

// ── GET /api/notifications — last 20 for current user ────────────────────────
router.get("/notifications", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  const rows = await db
    .select()
    .from(notificationsTable)
    .where(eq(notificationsTable.userId, user.id))
    .orderBy(desc(notificationsTable.createdAt))
    .limit(20);
  res.json(rows);
});

// ── GET /api/notifications/unread-count ──────────────────────────────────────
router.get("/notifications/unread-count", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  const rows = await db
    .select({ id: notificationsTable.id })
    .from(notificationsTable)
    .where(and(eq(notificationsTable.userId, user.id), eq(notificationsTable.isRead, false)));
  res.json({ count: rows.length });
});

// ── PUT /api/notifications/read-all ──────────────────────────────────────────
router.put("/notifications/read-all", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  await db
    .update(notificationsTable)
    .set({ isRead: true })
    .where(and(eq(notificationsTable.userId, user.id), eq(notificationsTable.isRead, false)));
  res.json({ ok: true });
});

// ── PUT /api/notifications/:id/read ──────────────────────────────────────────
router.put("/notifications/:id/read", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db
    .update(notificationsTable)
    .set({ isRead: true })
    .where(and(eq(notificationsTable.id, id), eq(notificationsTable.userId, user.id)));
  res.json({ ok: true });
});

// ── DELETE /api/notifications/:id ────────────────────────────────────────────
router.delete("/notifications/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db
    .delete(notificationsTable)
    .where(and(eq(notificationsTable.id, id), eq(notificationsTable.userId, user.id)));
  res.json({ ok: true });
});

export default router;

import { type Request, type Response, type NextFunction } from "express";
import { eq, and, gt } from "drizzle-orm";
import { db, sessionsTable, usersTable, customRolesTable } from "@workspace/db";

// Extend user type to include resolved permissions
export type AuthUser = typeof usersTable.$inferSelect & {
  permissions: string[]; // empty for base-role users; populated for custom-role users
};

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
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

  (req as Request & { user?: AuthUser }).user = { ...session.user, permissions };
  next();
}

export async function requireRole(roles: string[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const user = (req as Request & { user?: AuthUser }).user;
    if (!user || !roles.includes(user.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    next();
  };
}

/**
 * Middleware for custom-role users: verifies the user's custom role includes
 * a specific permission key. Falls through for base-role users (they use requireRole).
 */
export async function requirePermission(key: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const user = (req as Request & { user?: AuthUser }).user;
    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    // Base-role users (no customRoleId) bypass permission check — use requireRole for them
    if (!user.customRoleId) {
      next();
      return;
    }
    if (!user.permissions.includes(key)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    next();
  };
}

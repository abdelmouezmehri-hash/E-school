import { randomBytes, timingSafeEqual } from "crypto";
import { type NextFunction, type Request, type Response } from "express";

const CSRF_COOKIE = "csrf_token";
const CSRF_HEADER = "x-csrf-token";
const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function csrfCookieOptions() {
  return {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
  };
}

export function ensureCsrfToken(req: Request, res: Response): string {
  const existing = req.cookies?.[CSRF_COOKIE];
  const token =
    typeof existing === "string" && existing.length >= 32
      ? existing
      : randomBytes(32).toString("hex");
  if (token !== existing) {
    res.cookie(CSRF_COOKIE, token, csrfCookieOptions());
  }
  return token;
}

function safeEquals(a: string, b: string): boolean {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);
  return aBuffer.length === bBuffer.length && timingSafeEqual(aBuffer, bBuffer);
}

export function requireCsrf(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  ensureCsrfToken(req, res);
  if (!MUTATING_METHODS.has(req.method) || req.path.startsWith("/public/")) {
    next();
    return;
  }

  const cookieToken = req.cookies?.[CSRF_COOKIE];
  const headerToken = req.get(CSRF_HEADER);
  if (
    typeof cookieToken !== "string" ||
    typeof headerToken !== "string" ||
    !safeEquals(cookieToken, headerToken)
  ) {
    res.status(403).json({ error: "Invalid CSRF token" });
    return;
  }

  next();
}

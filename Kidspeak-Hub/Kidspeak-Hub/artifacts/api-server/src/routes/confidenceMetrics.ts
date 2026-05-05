import { Router, type IRouter, type Request, type Response } from "express";
import { eq, and } from "drizzle-orm";
import { db, confidenceMetricsTable, usersTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

function validateMetrics(body: unknown): {
  studentId: number;
  eyeContact: number;
  voiceVolume: number;
  initiative: number;
  resilience: number;
  month: number;
  year: number;
} | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  const studentId = Number(b.studentId);
  const eyeContact = Number(b.eyeContact);
  const voiceVolume = Number(b.voiceVolume);
  const initiative = Number(b.initiative);
  const resilience = Number(b.resilience);
  const month = Number(b.month);
  const year = Number(b.year);

  if (!Number.isInteger(studentId) || studentId <= 0) return null;
  for (const v of [eyeContact, voiceVolume, initiative, resilience]) {
    if (!Number.isInteger(v) || v < 1 || v > 10) return null;
  }
  if (!Number.isInteger(month) || month < 1 || month > 12) return null;
  if (!Number.isInteger(year) || year < 2000 || year > 2100) return null;

  return { studentId, eyeContact, voiceVolume, initiative, resilience, month, year };
}

router.get("/confidence-metrics", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const studentId = req.query.studentId ? parseInt(req.query.studentId as string) : null;
  if (!studentId) {
    res.status(400).json({ error: "studentId is required" });
    return;
  }

  const rows = await db
    .select({
      id: confidenceMetricsTable.id,
      studentId: confidenceMetricsTable.studentId,
      eyeContact: confidenceMetricsTable.eyeContact,
      voiceVolume: confidenceMetricsTable.voiceVolume,
      initiative: confidenceMetricsTable.initiative,
      resilience: confidenceMetricsTable.resilience,
      month: confidenceMetricsTable.month,
      year: confidenceMetricsTable.year,
      recordedBy: confidenceMetricsTable.recordedBy,
      recorderName: usersTable.name,
      createdAt: confidenceMetricsTable.createdAt,
    })
    .from(confidenceMetricsTable)
    .leftJoin(usersTable, eq(confidenceMetricsTable.recordedBy, usersTable.id))
    .where(eq(confidenceMetricsTable.studentId, studentId))
    .orderBy(confidenceMetricsTable.year, confidenceMetricsTable.month);

  res.json(rows.map(r => ({ ...r, createdAt: r.createdAt.toISOString(), recorderName: r.recorderName ?? null })));
});

router.post("/confidence-metrics", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  if (!["admin", "psychologist"].includes(user.role)) {
    res.status(403).json({ error: "Only psychologists and admins can record confidence metrics." });
    return;
  }

  const data = validateMetrics(req.body);
  if (!data) {
    res.status(400).json({ error: "Invalid metrics data. Scores must be integers 1–10." });
    return;
  }

  const existing = await db
    .select({ id: confidenceMetricsTable.id })
    .from(confidenceMetricsTable)
    .where(
      and(
        eq(confidenceMetricsTable.studentId, data.studentId),
        eq(confidenceMetricsTable.month, data.month),
        eq(confidenceMetricsTable.year, data.year),
      )
    )
    .limit(1);

  let row;
  if (existing.length > 0) {
    [row] = await db
      .update(confidenceMetricsTable)
      .set({
        eyeContact: data.eyeContact,
        voiceVolume: data.voiceVolume,
        initiative: data.initiative,
        resilience: data.resilience,
        recordedBy: user.id,
      })
      .where(eq(confidenceMetricsTable.id, existing[0].id))
      .returning();
  } else {
    [row] = await db
      .insert(confidenceMetricsTable)
      .values({
        studentId: data.studentId,
        eyeContact: data.eyeContact,
        voiceVolume: data.voiceVolume,
        initiative: data.initiative,
        resilience: data.resilience,
        month: data.month,
        year: data.year,
        recordedBy: user.id,
      })
      .returning();
  }

  if (!row) {
    res.status(500).json({ error: "Failed to save metrics" });
    return;
  }

  res.status(201).json({ ...row, createdAt: row.createdAt.toISOString() });
});

export default router;

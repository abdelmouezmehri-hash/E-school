import { Router, type IRouter, type Request, type Response } from "express";
import { eq, and, desc } from "drizzle-orm";
import {
  db,
  classSessionsTable,
  sessionAttendanceTable,
  groupStudentsTable,
  groupsTable,
  levelsTable,
  studentsTable,
} from "@workspace/db";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

/**
 * GET /api/attendance/student/:studentId
 * Returns all class sessions for this student's group(s) with their attendance status,
 * plus level info so the frontend can calculate total expected sessions.
 * Accessible by: admin, teacher, parent (own children only), student themselves.
 */
router.get(
  "/attendance/student/:studentId",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const user = (req as any).user;
    const studentId = parseInt((req.params.studentId as string));
    if (!studentId) { res.status(400).json({ error: "Invalid studentId" }); return; }

    // Parents can only view their own children
    if (user.role === "parent") {
      const [student] = await db.select({ parentId: studentsTable.parentId })
        .from(studentsTable).where(eq(studentsTable.id, studentId));
      if (!student || student.parentId !== user.id) {
        res.status(403).json({ error: "Access denied" }); return;
      }
    }

    // Find all groups this student belongs to
    const groupRows = await db
      .select({ groupId: groupStudentsTable.groupId })
      .from(groupStudentsTable)
      .where(eq(groupStudentsTable.studentId, studentId));

    if (groupRows.length === 0) {
      res.json({ sessions: [], totalExpected: 0, levelName: null, sessionsPerWeek: 2 });
      return;
    }

    const groupId = groupRows[0].groupId; // use primary group

    // Get group + level info
    const [group] = await db.select().from(groupsTable).where(eq(groupsTable.id, groupId));
    let levelName: string | null = null;
    let durationWeeks = 8;
    let sessionsPerWeek = 2;

    if (group?.levelId) {
      const [level] = await db.select().from(levelsTable).where(eq(levelsTable.id, group.levelId));
      if (level) {
        levelName = level.name;
        durationWeeks = level.durationWeeks;
        sessionsPerWeek = level.sessionsPerWeek;
      }
    }

    const totalExpected = durationWeeks * sessionsPerWeek;

    // Get all sessions for this group ordered oldest → newest
    const allSessions = await db
      .select()
      .from(classSessionsTable)
      .where(eq(classSessionsTable.groupId, groupId))
      .orderBy(classSessionsTable.sessionDate);

    // Separate completed (or unset status) vs planned
    const completedSessions = allSessions.filter((s) => (s as any).status !== "planned");
    const plannedSessions = allSessions.filter((s) => (s as any).status === "planned");

    // For each completed session get this student's attendance
    const sessionData = await Promise.all(
      completedSessions.map(async (s) => {
        const [att] = await db
          .select({
            id: sessionAttendanceTable.id,
            status: sessionAttendanceTable.status,
            speakingScore: sessionAttendanceTable.speakingScore,
            confidenceScore: sessionAttendanceTable.confidenceScore,
            participationScore: sessionAttendanceTable.participationScore,
            initiativeScore: sessionAttendanceTable.initiativeScore,
            verbalFluency: sessionAttendanceTable.verbalFluency,
            verbalClarity: sessionAttendanceTable.verbalClarity,
            verbalVocabulary: sessionAttendanceTable.verbalVocabulary,
            nonverbalEyeContact: sessionAttendanceTable.nonverbalEyeContact,
            nonverbalBodyLanguage: sessionAttendanceTable.nonverbalBodyLanguage,
            nonverbalFacialExpressions: sessionAttendanceTable.nonverbalFacialExpressions,
            behavioralNotes: sessionAttendanceTable.behavioralNotes,
            curriculumProgress: sessionAttendanceTable.curriculumProgress,
          })
          .from(sessionAttendanceTable)
          .where(
            and(
              eq(sessionAttendanceTable.sessionId, s.id),
              eq(sessionAttendanceTable.studentId, studentId)
            )
          );
        return {
          sessionId: s.id,
          sessionDate: s.sessionDate,
          lessonTitle: s.lessonTitle,
          attendanceId: att?.id ?? null,
          status: att?.status ?? null, // null = not recorded
          speakingScore: att?.speakingScore ?? null,
          confidenceScore: att?.confidenceScore ?? null,
          participationScore: att?.participationScore ?? null,
          initiativeScore: att?.initiativeScore ?? null,
          verbalFluency: att?.verbalFluency ?? null,
          verbalClarity: att?.verbalClarity ?? null,
          verbalVocabulary: att?.verbalVocabulary ?? null,
          nonverbalEyeContact: att?.nonverbalEyeContact ?? null,
          nonverbalBodyLanguage: att?.nonverbalBodyLanguage ?? null,
          nonverbalFacialExpressions: att?.nonverbalFacialExpressions ?? null,
          behavioralNotes: att?.behavioralNotes ?? null,
          curriculumProgress: att?.curriculumProgress ?? null,
        };
      })
    );

    res.json({
      sessions: sessionData,
      totalExpected,
      levelName,
      durationWeeks,
      sessionsPerWeek,
      groupId,
      plannedSessionCount: plannedSessions.length,
      plannedSessions: plannedSessions.map((s) => ({
        sessionId: s.id,
        sessionDate: s.sessionDate,
        sessionTime: (s as any).sessionTime ?? null,
        sessionType: (s as any).sessionType ?? "regular",
        lessonTitle: s.lessonTitle,
      })),
    });
  }
);

/**
 * PUT /api/attendance/:attendanceId
 * Admin or teacher can override the status of a single attendance record.
 */
router.put(
  "/attendance/:attendanceId",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const user = (req as any).user;
    if (user.role !== "admin" && user.role !== "teacher") {
      res.status(403).json({ error: "Not authorized" }); return;
    }
    const attendanceId = parseInt((req.params.attendanceId as string));
    const { status } = req.body as { status: "present" | "absent" | "late" };
    if (!attendanceId || !status) {
      res.status(400).json({ error: "attendanceId and status required" }); return;
    }
    const validStatuses = ["present", "absent", "late"];
    if (!validStatuses.includes(status)) {
      res.status(400).json({ error: "Invalid status" }); return;
    }

    const [updated] = await db
      .update(sessionAttendanceTable)
      .set({ status })
      .where(eq(sessionAttendanceTable.id, attendanceId))
      .returning();

    if (!updated) { res.status(404).json({ error: "Attendance record not found" }); return; }
    res.json(updated);
  }
);

/**
 * POST /api/attendance/session/:sessionId/student/:studentId
 * Create or replace a single attendance record for a specific student in a session.
 * Used by the admin "override" feature on student profile.
 */
router.post(
  "/attendance/session/:sessionId/student/:studentId",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const user = (req as any).user;
    if (user.role !== "admin" && user.role !== "teacher") {
      res.status(403).json({ error: "Not authorized" }); return;
    }

    const sessionId = parseInt((req.params.sessionId as string));
    const studentId = parseInt((req.params.studentId as string));
    const { status } = req.body as { status: "present" | "absent" | "late" };

    if (!sessionId || !studentId || !status) {
      res.status(400).json({ error: "sessionId, studentId and status required" }); return;
    }

    // Delete existing, then insert fresh (upsert-style)
    await db.delete(sessionAttendanceTable).where(
      and(
        eq(sessionAttendanceTable.sessionId, sessionId),
        eq(sessionAttendanceTable.studentId, studentId)
      )
    );

    const [record] = await db.insert(sessionAttendanceTable).values({
      sessionId,
      studentId,
      status,
    }).returning();

    res.status(201).json(record);
  }
);

export default router;

import { Router, type IRouter, type Request, type Response } from "express";
import { eq, and, ne, desc, or } from "drizzle-orm";
import {
  db,
  groupsTable,
  groupStudentsTable,
  studentsTable,
  usersTable,
  levelsTable,
  evaluationsTable,
  classSessionsTable,
  sessionAttendanceTable,
  programsTable,
} from "@workspace/db";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

// ── Helpers ──────────────────────────────────────────────────────────────────

function parseRecurringDays(raw: string | null | undefined): number[] | null {
  if (!raw) return null;
  try { return JSON.parse(raw) as number[]; } catch { return null; }
}

function timeToMins(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}

async function checkTeacherConflict(
  teacherId: number,
  recurringDays: number[],
  sessionStartTime: string,
  sessionDurationMins: number,
  excludeGroupId?: number,
): Promise<string | null> {
  const others = await db.select().from(groupsTable)
    .where(
      excludeGroupId
        ? and(eq(groupsTable.teacherId, teacherId), ne(groupsTable.id, excludeGroupId))
        : eq(groupsTable.teacherId, teacherId),
    );

  for (const other of others) {
    if (!other.recurringDays || !other.sessionStartTime || !other.sessionDurationMins) continue;
    const otherDays = parseRecurringDays(other.recurringDays);
    if (!otherDays) continue;

    const daysOverlap = recurringDays.some((d) => otherDays.includes(d));
    if (!daysOverlap) continue;

    const startA = timeToMins(sessionStartTime);
    const endA = startA + sessionDurationMins;
    const startB = timeToMins(other.sessionStartTime);
    const endB = startB + other.sessionDurationMins;

    if (startA < endB && startB < endA) {
      return other.name;
    }
  }
  return null;
}

function serializeGroup(g: typeof groupsTable.$inferSelect & { teacherName?: string | null; levelName?: string | null; studentCount?: number }) {
  return {
    ...g,
    createdAt: g.createdAt.toISOString(),
    recurringDays: parseRecurringDays(g.recurringDays as unknown as string),
  };
}

// ── List groups ───────────────────────────────────────────────────────────────

router.get("/groups", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  let rows: typeof groupsTable.$inferSelect[];

  if (user.role === "admin") {
    rows = await db.select().from(groupsTable).orderBy(groupsTable.name);
  } else if (user.role === "branch_manager") {
    // Fetch all groups; branch-scoping applied below
    rows = await db.select().from(groupsTable).orderBy(groupsTable.name);
  } else if (user.role === "psychologist") {
    rows = await db.select().from(groupsTable)
      .where(or(eq(groupsTable.teacherId, user.id), eq(groupsTable.psychologistId, user.id)))
      .orderBy(groupsTable.name);
  } else {
    rows = await db.select().from(groupsTable)
      .where(eq(groupsTable.teacherId, user.id))
      .orderBy(groupsTable.name);
  }

  // Branch filter
  const branchIdParam = (req.query as any).branchId;
  if (user.role === "branch_manager" && user.branchId) {
    rows = rows.filter(g => (g as any).branchId === user.branchId);
  } else if (branchIdParam && user.role === "admin") {
    const bid = parseInt(branchIdParam);
    if (!isNaN(bid)) rows = rows.filter(g => (g as any).branchId === bid);
  }

  const enriched = await Promise.all(rows.map(async (g) => {
    const teacherRow = g.teacherId
      ? await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, g.teacherId)).then(r => r[0])
      : null;
    const levelRow = g.levelId
      ? await db.select({ name: levelsTable.name }).from(levelsTable).where(eq(levelsTable.id, g.levelId)).then(r => r[0])
      : null;
    const psychLevelRow = (g as any).psychologicalLevelId
      ? await db.select({ name: levelsTable.name }).from(levelsTable).where(eq(levelsTable.id, (g as any).psychologicalLevelId)).then(r => r[0])
      : null;
    const psychologistRow = (g as any).psychologistId
      ? await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, (g as any).psychologistId)).then(r => r[0])
      : null;
    const studentCount = await db.select({ studentId: groupStudentsTable.studentId })
      .from(groupStudentsTable).where(eq(groupStudentsTable.groupId, g.id));
    return {
      ...serializeGroup(g),
      teacherName: teacherRow?.name ?? null,
      levelName: levelRow?.name ?? null,
      psychologicalLevelName: psychLevelRow?.name ?? null,
      psychologistName: psychologistRow?.name ?? null,
      studentCount: studentCount.length,
    };
  }));

  res.json(enriched);
});

// ── Get single group with students ────────────────────────────────────────────

router.get("/groups/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid group ID" }); return; }

  const [group] = await db.select().from(groupsTable).where(eq(groupsTable.id, id));
  if (!group) { res.status(404).json({ error: "Group not found" }); return; }

  const teacherRow = group.teacherId
    ? await db.select({ name: usersTable.name, email: usersTable.email }).from(usersTable).where(eq(usersTable.id, group.teacherId)).then(r => r[0])
    : null;
  const levelRow = group.levelId
    ? await db.select().from(levelsTable).where(eq(levelsTable.id, group.levelId)).then(r => r[0])
    : null;
  const psychLevelRow = (group as any).psychologicalLevelId
    ? await db.select({ id: levelsTable.id, name: levelsTable.name, nameAr: levelsTable.nameAr }).from(levelsTable).where(eq(levelsTable.id, (group as any).psychologicalLevelId)).then(r => r[0])
    : null;
  const psychologistRow = (group as any).psychologistId
    ? await db.select({ id: usersTable.id, name: usersTable.name }).from(usersTable).where(eq(usersTable.id, (group as any).psychologistId)).then(r => r[0])
    : null;

  const gsRows = await db.select({ studentId: groupStudentsTable.studentId })
    .from(groupStudentsTable).where(eq(groupStudentsTable.groupId, id));

  const students = await Promise.all(gsRows.map(async ({ studentId }) => {
    const [student] = await db.select().from(studentsTable).where(eq(studentsTable.id, studentId));
    if (!student) return null;

    const evals = await db.select({
      speakingScore: evaluationsTable.speakingScore,
      confidenceScore: evaluationsTable.confidenceScore,
      participationScore: evaluationsTable.participationScore,
      weekNumber: evaluationsTable.weekNumber,
    }).from(evaluationsTable).where(eq(evaluationsTable.studentId, studentId))
      .orderBy(desc(evaluationsTable.weekNumber)).limit(3);

    const latestConf = evals[0]?.confidenceScore ?? null;
    const prevConf = evals[1]?.confidenceScore ?? null;
    const confDropping = latestConf !== null && prevConf !== null && latestConf < prevConf;

    const recentSessions = await db.select({ id: classSessionsTable.id })
      .from(classSessionsTable).where(eq(classSessionsTable.groupId, id))
      .orderBy(desc(classSessionsTable.sessionDate)).limit(3);

    let consecutiveAbsences = 0;
    let needsAttention = confDropping;
    for (const session of recentSessions) {
      const [attendance] = await db.select().from(sessionAttendanceTable)
        .where(and(eq(sessionAttendanceTable.sessionId, session.id), eq(sessionAttendanceTable.studentId, studentId)));
      if (!attendance || attendance.status === "absent") {
        consecutiveAbsences++;
        if (consecutiveAbsences >= 2) { needsAttention = true; break; }
      } else {
        break;
      }
    }

    return {
      id: student.id,
      name: student.name,
      profilePicture: student.profilePicture,
      dateOfBirth: student.dateOfBirth,
      behavioralFlags: student.behavioralFlags,
      createdAt: student.createdAt.toISOString(),
      latestSpeaking: evals[0]?.speakingScore ?? null,
      latestConfidence: evals[0]?.confidenceScore ?? null,
      latestParticipation: evals[0]?.participationScore ?? null,
      needsAttention,
    };
  }));

  // Completed sessions (have attendance or status != planned)
  const allSessionRows = await db.select().from(classSessionsTable)
    .where(eq(classSessionsTable.groupId, id))
    .orderBy(desc(classSessionsTable.sessionDate));

  const completedSessions = allSessionRows.filter((s) => (s as any).status !== "planned");
  const plannedSessions = allSessionRows.filter((s) => (s as any).status === "planned");

  const sessionsEnriched = await Promise.all(completedSessions.slice(0, 30).map(async (s) => {
    const attendance = await db.select({
      studentId: sessionAttendanceTable.studentId,
      status: sessionAttendanceTable.status,
      speakingScore: sessionAttendanceTable.speakingScore,
      confidenceScore: sessionAttendanceTable.confidenceScore,
      participationScore: sessionAttendanceTable.participationScore,
      behavioralNotes: sessionAttendanceTable.behavioralNotes,
      curriculumProgress: sessionAttendanceTable.curriculumProgress,
      verbalFluency: sessionAttendanceTable.verbalFluency,
      verbalClarity: sessionAttendanceTable.verbalClarity,
      verbalVocabulary: sessionAttendanceTable.verbalVocabulary,
      nonverbalEyeContact: sessionAttendanceTable.nonverbalEyeContact,
      nonverbalBodyLanguage: sessionAttendanceTable.nonverbalBodyLanguage,
      nonverbalFacialExpressions: sessionAttendanceTable.nonverbalFacialExpressions,
      reportScore: sessionAttendanceTable.reportScore,
    }).from(sessionAttendanceTable).where(eq(sessionAttendanceTable.sessionId, s.id));

    // Compute session-level score averages
    const scored = attendance.filter(a => a.status !== "absent" && a.speakingScore != null);
    const avgSpeaking = scored.length ? Math.round(scored.reduce((sum, a) => sum + (a.speakingScore ?? 0), 0) / scored.length * 10) / 10 : null;
    const avgConfidence = scored.length ? Math.round(scored.reduce((sum, a) => sum + (a.confidenceScore ?? 0), 0) / scored.length * 10) / 10 : null;
    const avgParticipation = scored.length ? Math.round(scored.reduce((sum, a) => sum + (a.participationScore ?? 0), 0) / scored.length * 10) / 10 : null;

    return {
      ...s,
      createdAt: s.createdAt.toISOString(),
      attendance,
      avgSpeaking,
      avgConfidence,
      avgParticipation,
    };
  }));

  // Enrich planned sessions with psychologist name if applicable
  const plannedEnriched = await Promise.all(plannedSessions.map(async (s) => {
    let psychologistName: string | null = null;
    if ((s as any).psychologistId) {
      const [psych] = await db.select({ name: usersTable.name })
        .from(usersTable).where(eq(usersTable.id, (s as any).psychologistId));
      psychologistName = psych?.name ?? null;
    }
    return {
      ...s,
      createdAt: s.createdAt.toISOString(),
      psychologistName,
    };
  }));

  res.json({
    ...serializeGroup(group),
    teacherName: teacherRow?.name ?? null,
    teacherEmail: (teacherRow as any)?.email ?? null,
    levelName: levelRow?.name ?? null,
    levelDurationWeeks: levelRow?.durationWeeks ?? null,
    psychologicalLevelName: psychLevelRow?.name ?? null,
    psychologicalLevelNameAr: psychLevelRow?.nameAr ?? null,
    psychologistName: psychologistRow?.name ?? null,
    students: students.filter(Boolean),
    sessions: sessionsEnriched,
    plannedSessions: plannedEnriched,
  });
});

// ── Create group ──────────────────────────────────────────────────────────────

router.post("/groups", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  if (user.role !== "admin" && user.role !== "teacher" && user.role !== "psychologist") {
    res.status(403).json({ error: "Not authorized" }); return;
  }

  const {
    name, teacherId, levelId, schedule, maxStudents, nextSessionGoal,
    startDate, recurringDays, sessionStartTime, sessionDurationMins,
    psychologicalLevelId, psychologistId,
  } = req.body as any;

  if (!name?.trim()) { res.status(400).json({ error: "Name is required" }); return; }

  // Psychologist can only create groups under psychological programs
  if (user.role === "psychologist" && levelId) {
    const level = await db.select({ programId: levelsTable.programId }).from(levelsTable).where(eq(levelsTable.id, levelId)).then(r => r[0]);
    if (level?.programId) {
      const program = await db.select({ type: programsTable.type }).from(programsTable).where(eq(programsTable.id, level.programId)).then(r => r[0]);
      if (program && program.type !== "psychological") {
        res.status(403).json({ error: "Psychologist can only create groups under psychological programs" }); return;
      }
    }
  }

  const effectiveTeacherId: number | null = teacherId ?? (user.role === "teacher" || user.role === "psychologist" ? user.id : null);
  const parsedDays: number[] | null = Array.isArray(recurringDays) ? recurringDays : null;
  const parsedDuration: number | null = sessionDurationMins ? parseInt(String(sessionDurationMins)) : null;

  // Conflict detection
  if (effectiveTeacherId && parsedDays && parsedDays.length > 0 && sessionStartTime && parsedDuration) {
    const conflictGroup = await checkTeacherConflict(effectiveTeacherId, parsedDays, sessionStartTime, parsedDuration);
    if (conflictGroup) {
      res.status(409).json({ error: `Teacher conflict: already assigned to "${conflictGroup}" at an overlapping time.` });
      return;
    }
  }

  const [group] = await db.insert(groupsTable).values({
    name: name.trim(),
    teacherId: effectiveTeacherId,
    levelId: levelId ?? null,
    psychologicalLevelId: psychologicalLevelId ?? null,
    psychologistId: psychologistId ?? null,
    schedule: schedule ?? null,
    maxStudents: maxStudents ?? 10,
    nextSessionGoal: nextSessionGoal ?? null,
    startDate: startDate ?? null,
    recurringDays: parsedDays ? JSON.stringify(parsedDays) : null,
    sessionStartTime: sessionStartTime ?? null,
    sessionDurationMins: parsedDuration,
  }).returning();

  res.status(201).json(serializeGroup(group));
});

// ── Update group ──────────────────────────────────────────────────────────────

router.put("/groups/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid group ID" }); return; }

  const {
    name, teacherId, levelId, schedule, maxStudents, nextSessionGoal,
    startDate, recurringDays, sessionStartTime, sessionDurationMins,
    psychologicalLevelId, psychologistId,
  } = req.body as any;

  const updateData: Record<string, unknown> = {};
  if (name !== undefined) updateData.name = name;
  if (teacherId !== undefined) updateData.teacherId = teacherId;
  if (levelId !== undefined) updateData.levelId = levelId;
  if (psychologicalLevelId !== undefined) updateData.psychologicalLevelId = psychologicalLevelId ?? null;
  if (psychologistId !== undefined) updateData.psychologistId = psychologistId ?? null;
  if (schedule !== undefined) updateData.schedule = schedule;
  if (maxStudents !== undefined) updateData.maxStudents = maxStudents;
  if (nextSessionGoal !== undefined) updateData.nextSessionGoal = nextSessionGoal;
  if (startDate !== undefined) updateData.startDate = startDate;
  if (recurringDays !== undefined) updateData.recurringDays = Array.isArray(recurringDays) ? JSON.stringify(recurringDays) : null;
  if (sessionStartTime !== undefined) updateData.sessionStartTime = sessionStartTime;
  if (sessionDurationMins !== undefined) updateData.sessionDurationMins = sessionDurationMins ? parseInt(String(sessionDurationMins)) : null;

  // Conflict detection: get effective values
  const [existing] = await db.select().from(groupsTable).where(eq(groupsTable.id, id));
  if (!existing) { res.status(404).json({ error: "Group not found" }); return; }

  const effectiveTeacherId = (teacherId !== undefined ? teacherId : existing.teacherId) as number | null;
  const effectiveDays = recurringDays !== undefined
    ? (Array.isArray(recurringDays) ? recurringDays : null)
    : parseRecurringDays(existing.recurringDays as unknown as string);
  const effectiveStartTime = sessionStartTime !== undefined ? sessionStartTime : existing.sessionStartTime;
  const effectiveDuration = sessionDurationMins !== undefined
    ? (sessionDurationMins ? parseInt(String(sessionDurationMins)) : null)
    : existing.sessionDurationMins;

  if (effectiveTeacherId && effectiveDays && effectiveDays.length > 0 && effectiveStartTime && effectiveDuration) {
    const conflictGroup = await checkTeacherConflict(effectiveTeacherId, effectiveDays, effectiveStartTime, effectiveDuration, id);
    if (conflictGroup) {
      res.status(409).json({ error: `Teacher conflict: already assigned to "${conflictGroup}" at an overlapping time.` });
      return;
    }
  }

  const [group] = await db.update(groupsTable).set(updateData).where(eq(groupsTable.id, id)).returning();
  if (!group) { res.status(404).json({ error: "Group not found" }); return; }

  res.json(serializeGroup(group));
});

// ── Delete group ──────────────────────────────────────────────────────────────

router.delete("/groups/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  if (user.role !== "admin") { res.status(403).json({ error: "Not authorized" }); return; }
  const id = parseInt(req.params.id);
  await db.delete(groupsTable).where(eq(groupsTable.id, id));
  res.json({ message: "Group deleted" });
});

// ── Add student to group ──────────────────────────────────────────────────────

router.post("/groups/:id/students", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const groupId = parseInt(req.params.id);
  const { studentId } = req.body as any;
  if (!groupId || !studentId) { res.status(400).json({ error: "groupId and studentId required" }); return; }

  await db.delete(groupStudentsTable).where(eq(groupStudentsTable.studentId, studentId));
  await db.insert(groupStudentsTable).values({ groupId, studentId }).onConflictDoNothing();
  res.status(201).json({ message: "Student added to group" });
});

// ── Remove student from group ─────────────────────────────────────────────────

router.delete("/groups/:id/students/:studentId", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const groupId = parseInt(req.params.id);
  const studentId = parseInt(req.params.studentId);
  await db.delete(groupStudentsTable).where(
    and(eq(groupStudentsTable.groupId, groupId), eq(groupStudentsTable.studentId, studentId))
  );
  res.json({ message: "Student removed from group" });
});

// ── Schedule future sessions for group (bulk + quick link) ────────────────────

router.post("/groups/:id/schedule-sessions", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  const groupId = parseInt(req.params.id);
  if (!groupId) { res.status(400).json({ error: "Invalid group ID" }); return; }

  const { sessionDate, sessionTime, sessionType, lessonTitle, notes, repeatWeeks, deliveredByPsychologist } = req.body as any;

  if (!sessionDate) { res.status(400).json({ error: "sessionDate is required" }); return; }

  const numWeeks = Math.min(Math.max(1, parseInt(String(repeatWeeks ?? 1)) || 1), 52);
  const type = sessionType ?? "regular";

  // For quick link: psychologist adds support session to a teacher's group
  const isPsychDelivery = deliveredByPsychologist === true || user.role === "psychologist";

  const created: any[] = [];
  const baseDate = new Date(sessionDate);

  for (let w = 0; w < numWeeks; w++) {
    const date = new Date(baseDate);
    date.setDate(date.getDate() + w * 7);
    const dateStr = date.toISOString().split("T")[0];

    const [session] = await db.insert(classSessionsTable).values({
      groupId,
      teacherId: isPsychDelivery ? null : user.id,
      psychologistId: isPsychDelivery ? user.id : null,
      sessionKind: isPsychDelivery ? "intervention" : "regular",
      sessionType: type,
      sessionDate: dateStr,
      sessionTime: sessionTime ?? null,
      lessonTitle: lessonTitle?.trim() || null,
      notes: notes?.trim() || null,
      status: "planned",
    } as any).returning();

    created.push({ ...session, createdAt: session.createdAt.toISOString() });
  }

  res.status(201).json({ created, count: created.length });
});

// ── Cancel (delete) a planned session ─────────────────────────────────────────

router.delete("/sessions/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid session ID" }); return; }

  // Only delete planned sessions (not completed ones with attendance)
  const [session] = await db.select().from(classSessionsTable).where(eq(classSessionsTable.id, id));
  if (!session) { res.status(404).json({ error: "Session not found" }); return; }
  if ((session as any).status !== "planned") {
    res.status(400).json({ error: "Only planned sessions can be cancelled" }); return;
  }

  await db.delete(classSessionsTable).where(eq(classSessionsTable.id, id));
  res.json({ message: "Session cancelled" });
});

// ── Create session for group ──────────────────────────────────────────────────

router.post("/groups/:id/sessions", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  const groupId = parseInt(req.params.id);
  const { sessionDate, lessonTitle, notes, sessionGoal, sessionOutcome, nextGoal, attendance, sessionKind, sessionMode } = req.body as any;

  if (!groupId || !sessionDate) { res.status(400).json({ error: "groupId and sessionDate required" }); return; }

  const isIntervention = user.role === "psychologist" || sessionKind === "intervention";
  const kind = isIntervention ? "intervention" : (sessionKind ?? "regular");

  const [session] = await db.insert(classSessionsTable).values({
    groupId,
    teacherId: isIntervention ? null : user.id,
    psychologistId: isIntervention ? user.id : null,
    sessionKind: kind,
    sessionMode: sessionMode ?? null,
    sessionDate,
    lessonTitle: lessonTitle ?? null,
    notes: notes ?? null,
    sessionGoal: sessionGoal ?? null,
    sessionOutcome: sessionOutcome ?? null,
    nextGoal: nextGoal ?? null,
  }).returning();

  // If no attendance provided, auto-create "present" records for all group students
  let attendanceList = attendance && Array.isArray(attendance) && attendance.length > 0
    ? attendance
    : null;
  if (!attendanceList) {
    const groupStudentRows = await db.select({ studentId: groupStudentsTable.studentId })
      .from(groupStudentsTable)
      .where(eq(groupStudentsTable.groupId, groupId));
    attendanceList = groupStudentRows.map((r) => ({ studentId: r.studentId, status: "present" }));
  }

  if (attendanceList && Array.isArray(attendanceList)) {
    for (const a of attendanceList) {
      if (!a.studentId || !a.status) continue;

      await db.insert(sessionAttendanceTable).values({
        sessionId: session.id,
        studentId: a.studentId,
        status: a.status,
        speakingScore: (a as any).speakingScore ?? null,
        confidenceScore: (a as any).confidenceScore ?? null,
        participationScore: (a as any).participationScore ?? null,
        behavioralNotes: (a as any).behavioralNotes ?? null,
        curriculumProgress: (a as any).curriculumProgress ?? null,
        verbalFluency: (a as any).verbalFluency ?? null,
        verbalClarity: (a as any).verbalClarity ?? null,
        verbalVocabulary: (a as any).verbalVocabulary ?? null,
        nonverbalEyeContact: (a as any).nonverbalEyeContact ?? null,
        nonverbalBodyLanguage: (a as any).nonverbalBodyLanguage ?? null,
        nonverbalFacialExpressions: (a as any).nonverbalFacialExpressions ?? null,
      }).onConflictDoNothing();

      if (
        a.status !== "absent" &&
        (a.speakingScore != null || a.confidenceScore != null || a.participationScore != null)
      ) {
        const speaking = a.speakingScore ?? 5;
        const confidence = a.confidenceScore ?? 5;
        const participation = a.participationScore ?? 5;
        const progress = Math.round(((speaking + confidence + participation) / 30) * 100 * 100) / 100;

        const [student] = await db.select({ enrollmentDate: studentsTable.enrollmentDate })
          .from(studentsTable).where(eq(studentsTable.id, a.studentId));
        let weekNumber = 1;
        if (student?.enrollmentDate) {
          const rawDate = student.enrollmentDate;
          const numericMs = Number(rawDate);
          const enroll = !isNaN(numericMs) ? new Date(numericMs) : new Date(rawDate);
          const sess = new Date(sessionDate);
          const computed = Math.max(1, Math.ceil((sess.getTime() - enroll.getTime()) / (7 * 24 * 3600 * 1000)));
          if (Number.isFinite(computed)) weekNumber = computed;
        }

        await db.insert(evaluationsTable).values({
          studentId: a.studentId,
          weekNumber,
          sessionDate,
          speakingScore: speaking,
          confidenceScore: confidence,
          participationScore: participation,
          progressScore: String(progress),
          teacherNotes: a.behavioralNotes ?? null,
        });
      }
    }
  }

  res.status(201).json({ ...session, createdAt: session.createdAt.toISOString() });
});

// ── Update session ────────────────────────────────────────────────────────────

router.put("/sessions/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params.id);
  const { lessonTitle, notes, sessionGoal, sessionOutcome, nextGoal, attendance } = req.body as any;
  const updateData: Record<string, unknown> = {};
  if (lessonTitle !== undefined) updateData.lessonTitle = lessonTitle;
  if (notes !== undefined) updateData.notes = notes;
  if (sessionGoal !== undefined) updateData.sessionGoal = sessionGoal;
  if (sessionOutcome !== undefined) updateData.sessionOutcome = sessionOutcome;
  if (nextGoal !== undefined) updateData.nextGoal = nextGoal;

  const [session] = await db.update(classSessionsTable).set(updateData).where(eq(classSessionsTable.id, id)).returning();
  if (!session) { res.status(404).json({ error: "Session not found" }); return; }

  if (attendance && Array.isArray(attendance)) {
    await db.delete(sessionAttendanceTable).where(eq(sessionAttendanceTable.sessionId, id));
    for (const a of attendance) {
      if (!a.studentId || !a.status) continue;
      await db.insert(sessionAttendanceTable).values({
        sessionId: id,
        studentId: a.studentId,
        status: a.status,
        speakingScore: a.speakingScore ?? null,
        confidenceScore: a.confidenceScore ?? null,
        participationScore: a.participationScore ?? null,
        behavioralNotes: a.behavioralNotes ?? null,
        curriculumProgress: a.curriculumProgress ?? null,
        verbalFluency: a.verbalFluency ?? null,
        verbalClarity: a.verbalClarity ?? null,
        verbalVocabulary: a.verbalVocabulary ?? null,
        nonverbalEyeContact: a.nonverbalEyeContact ?? null,
        nonverbalBodyLanguage: a.nonverbalBodyLanguage ?? null,
        nonverbalFacialExpressions: a.nonverbalFacialExpressions ?? null,
      });
    }
  }

  res.json({ ...session, createdAt: session.createdAt.toISOString() });
});

router.patch("/sessions/:id/report", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const sessionId = parseInt(req.params.id);
  const user = (req as any).user;
  const { sessionOutcome, nextGoal, reportStatus, studentReports } = req.body as {
    sessionOutcome?: string;
    nextGoal?: string;
    reportStatus?: "none" | "draft" | "published";
    studentReports?: Array<{ studentId: number; note?: string | null; score?: number | null }>;
  };

  const [session] = await db.select().from(classSessionsTable).where(eq(classSessionsTable.id, sessionId));
  if (!session) { res.status(404).json({ error: "Session not found" }); return; }

  const isOwner = (session as any).teacherId === user.id || (session as any).psychologistId === user.id;
  if (!isOwner && user.role !== "admin") { res.status(403).json({ error: "Forbidden" }); return; }

  // Validate reportStatus value
  const VALID_STATUSES = ["none", "draft", "published"];
  if (reportStatus !== undefined && !VALID_STATUSES.includes(reportStatus)) {
    res.status(400).json({ error: "Invalid reportStatus" });
    return;
  }

  const updateData: Record<string, unknown> = {};
  if (sessionOutcome !== undefined) updateData.sessionOutcome = sessionOutcome;
  if (nextGoal !== undefined) updateData.nextGoal = nextGoal;
  if (reportStatus !== undefined) updateData.reportStatus = reportStatus;

  let responseSession: typeof session = session;
  if (Object.keys(updateData).length > 0) {
    const [updated] = await db.update(classSessionsTable).set(updateData).where(eq(classSessionsTable.id, sessionId)).returning();
    if (!updated) { res.status(404).json({ error: "Session not found" }); return; }
    responseSession = updated;
  }

  if (studentReports && Array.isArray(studentReports)) {
    for (const sr of studentReports) {
      if (!sr.studentId || !Number.isInteger(sr.studentId)) continue;
      await db.update(sessionAttendanceTable)
        .set({ behavioralNotes: sr.note ?? null, reportScore: sr.score ?? null })
        .where(and(
          eq(sessionAttendanceTable.sessionId, sessionId),
          eq(sessionAttendanceTable.studentId, sr.studentId)
        ));
    }
  }

  res.json({ ...responseSession, createdAt: responseSession.createdAt.toISOString() });
});

export default router;

import { Router, type IRouter, type Request, type Response } from "express";
import { eq, ilike, or, sql, desc, and, count, inArray } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db, studentsTable, usersTable, levelsTable, evaluationsTable, paymentsTable, sessionAttendanceTable, classSessionsTable, observationsTable, messagesTable, groupStudentsTable, groupsTable, programsTable, supportSessionsTable, branchesTable, adhocSessionsTable, confidenceMetricsTable, performanceReportsTable } from "@workspace/db";
import { CreateStudentBody, UpdateStudentBody, GetStudentParams, ListStudentsQueryParams } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";

const RED_FLAG_TYPES = ["fear", "shyness"] as const;
const CONFIDENT_FLAG = "confident";
const SHY_FLAGS = ["shy", "fearful", "anxious", "withdrawn"];

const router: IRouter = Router();

function calcProgressScore(evals: { speakingScore: number; confidenceScore: number; participationScore: number }[]): number | null {
  if (evals.length < 2) return evals.length === 1 ? ((evals[0].speakingScore + evals[0].confidenceScore + evals[0].participationScore) / 3) * 10 : null;

  const first = (evals[0].speakingScore + evals[0].confidenceScore + evals[0].participationScore) / 3;
  const last = (evals[evals.length - 1].speakingScore + evals[evals.length - 1].confidenceScore + evals[evals.length - 1].participationScore) / 3;
  const improvement = ((last - first) / first) * 100;
  const baseScore = (last / 10) * 70;
  const trendBonus = Math.min(30, Math.max(0, improvement));
  return Math.min(100, Math.max(0, baseScore + trendBonus));
}

router.get("/students", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  const params = ListStudentsQueryParams.safeParse(req.query);

  // Parents see only their children; branch_manager sees only their branch
  const forceParentId = user.role === "parent" ? user.id : null;
  const forceBranchId = user.role === "branch_manager" ? (user.branchId ?? -1) : null;

  let students = await db
    .select({
      id: studentsTable.id,
      name: studentsTable.name,
      dateOfBirth: studentsTable.dateOfBirth,
      levelId: studentsTable.levelId,
      parentId: studentsTable.parentId,
      teacherId: studentsTable.teacherId,
      enrollmentDate: studentsTable.enrollmentDate,
      behavioralFlags: studentsTable.behavioralFlags,
      notes: studentsTable.notes,
      createdAt: studentsTable.createdAt,
      branchId: studentsTable.branchId,
    })
    .from(studentsTable)
    .where(
      forceParentId
        ? eq(studentsTable.parentId, forceParentId)
        : forceBranchId !== null
          ? eq(studentsTable.branchId, forceBranchId)
          : undefined
    )
    .orderBy(studentsTable.name);

  if (params.success) {
    const selectShape = {
      id: studentsTable.id,
      name: studentsTable.name,
      dateOfBirth: studentsTable.dateOfBirth,
      levelId: studentsTable.levelId,
      parentId: studentsTable.parentId,
      teacherId: studentsTable.teacherId,
      enrollmentDate: studentsTable.enrollmentDate,
      behavioralFlags: studentsTable.behavioralFlags,
      notes: studentsTable.notes,
      createdAt: studentsTable.createdAt,
      branchId: studentsTable.branchId,
    };
    if (params.data.levelId) {
      const levelCond = eq(studentsTable.levelId, params.data.levelId);
      students = await db.select(selectShape).from(studentsTable)
        .where(forceParentId ? and(levelCond, eq(studentsTable.parentId, forceParentId)) : levelCond)
        .orderBy(studentsTable.name);
    }
    if (params.data.parentId) {
      // Admin can filter by parentId; for parents, forceParentId already applied
      const pid = forceParentId ?? params.data.parentId;
      students = await db.select(selectShape).from(studentsTable)
        .where(eq(studentsTable.parentId, pid))
        .orderBy(studentsTable.name);
    }
    if (params.data.search) {
      const searchCond = ilike(studentsTable.name, `%${params.data.search}%`);
      students = await db.select(selectShape).from(studentsTable)
        .where(forceParentId ? and(searchCond, eq(studentsTable.parentId, forceParentId)) : searchCond)
        .orderBy(studentsTable.name);
    }
  }

  // branch_manager is always scoped to their branch (covers conditional query paths above)
  if (forceBranchId !== null) {
    students = students.filter(s => s.branchId === forceBranchId);
  }

  // Branch filter (admin/teacher global filter)
  const branchIdParam = req.query.branchId;
  if (branchIdParam && !forceParentId && !forceBranchId) {
    const bid = parseInt(branchIdParam as string);
    if (!isNaN(bid)) {
      students = students.filter(s => s.branchId === bid);
    }
  }

  const enriched = await Promise.all(
    students.map(async (student) => {
      let levelName: string | null = null;
      let parentName: string | null = null;
      let teacherName: string | null = null;
      let paymentStatus: string | null = null;
      let latestProgressScore: number | null = null;

      if (student.levelId) {
        const [level] = await db.select({ name: levelsTable.name }).from(levelsTable).where(eq(levelsTable.id, student.levelId));
        levelName = level?.name ?? null;
      }
      if (student.parentId) {
        const [parent] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, student.parentId));
        parentName = parent?.name ?? null;
      }
      if (student.teacherId) {
        const [teacher] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, student.teacherId));
        teacherName = teacher?.name ?? null;
      }

      const [latestPayment] = await db
        .select({ status: paymentsTable.status })
        .from(paymentsTable)
        .where(eq(paymentsTable.studentId, student.id))
        .orderBy(paymentsTable.createdAt)
        .limit(1);
      paymentStatus = latestPayment?.status ?? null;

      const evals = await db
        .select({ speakingScore: evaluationsTable.speakingScore, confidenceScore: evaluationsTable.confidenceScore, participationScore: evaluationsTable.participationScore })
        .from(evaluationsTable)
        .where(eq(evaluationsTable.studentId, student.id))
        .orderBy(evaluationsTable.weekNumber);
      latestProgressScore = calcProgressScore(evals);

      // Fetch current group membership (most recent)
      let currentGroupId: number | null = null;
      let currentGroupName: string | null = null;
      const [groupLink] = await db
        .select({ groupId: groupStudentsTable.groupId, groupName: groupsTable.name })
        .from(groupStudentsTable)
        .innerJoin(groupsTable, eq(groupsTable.id, groupStudentsTable.groupId))
        .where(eq(groupStudentsTable.studentId, student.id))
        .orderBy(desc(groupStudentsTable.joinedAt))
        .limit(1);
      if (groupLink) {
        currentGroupId = groupLink.groupId;
        currentGroupName = groupLink.groupName;
      }

      return {
        ...student,
        createdAt: student.createdAt.toISOString(),
        levelName,
        parentName,
        teacherName,
        paymentStatus,
        latestProgressScore,
        currentGroupId,
        currentGroupName,
      };
    })
  );

  res.json(enriched);
});

router.post("/students", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const parsed = CreateStudentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const body = req.body as Record<string, unknown>;

  const [student] = await db.insert(studentsTable).values({
    name: parsed.data.name,
    gender: (body.gender as string | null) ?? null,
    dateOfBirth: parsed.data.dateOfBirth ?? null,
    levelId: parsed.data.levelId ?? null,
    parentId: parsed.data.parentId ?? null,
    teacherId: parsed.data.teacherId ?? null,
    enrollmentDate: parsed.data.enrollmentDate,
    behavioralFlags: parsed.data.behavioralFlags ?? [],
    notes: parsed.data.notes ?? null,
    guardianRelationship: (body.guardianRelationship as string | null) ?? null,
    guardianName: (body.guardianName as string | null) ?? null,
    guardianPhone: (body.guardianPhone as string | null) ?? null,
    guardianPhone2: (body.guardianPhone2 as string | null) ?? null,
    guardianOccupation: (body.guardianOccupation as string | null) ?? null,
    medicalAlerts: (body.medicalAlerts as string | null) ?? null,
    referralSource: (body.referralSource as string | null) ?? null,
    branchId: body.branchId ? parseInt(body.branchId as string) : null,
  }).returning();

  if (!student) {
    res.status(500).json({ error: "Failed to create student" });
    return;
  }

  // Auto-create initial payment if amount specified
  const initialPaymentAmount = typeof body.initialPaymentAmount === "number" ? body.initialPaymentAmount : parseFloat(body.initialPaymentAmount as string || "0") || 0;
  const initialDiscount = typeof body.discount === "number" ? body.discount : parseFloat(body.discount as string || "0") || 0;
  const paymentMethod = (body.paymentMethod as string | null) ?? null;

  if (initialPaymentAmount > 0 || parsed.data.levelId) {
    try {
      let amountDue = 0;
      const levelId = parsed.data.levelId ?? null;
      if (levelId) {
        const [level] = await db.select({ price: levelsTable.price }).from(levelsTable).where(eq(levelsTable.id, levelId));
        if (level) amountDue = parseFloat(level.price as unknown as string);
      }
      if (amountDue > 0) {
        const discount = Math.min(Math.max(0, initialDiscount), amountDue);
        const netDue = amountDue - discount;
        const amountPaid = Math.min(initialPaymentAmount, netDue);
        const status = amountPaid >= netDue ? "paid" : amountPaid > 0 ? "partially_paid" : "pending";
        const today = new Date().toISOString().split("T")[0];
        await db.insert(paymentsTable).values({
          studentId: student.id,
          levelId,
          amountDue,
          discount,
          amountPaid,
          status,
          dueDate: today,
          notes: paymentMethod ? `Payment method: ${paymentMethod}` : null,
          paidAt: status === "paid" ? new Date() : null,
        } as any);
      }
    } catch (err) {
      console.error("Failed to create initial payment:", err);
    }
  }

  // Auto-create parent account if requested
  const createParentAccount = body.createParentAccount === true || body.createParentAccount === "true";
  const parentPassword = (body.parentPassword as string | null)?.trim();
  const guardianPhone = (body.guardianPhone as string | null)?.trim();
  const guardianName = (body.guardianName as string | null)?.trim();

  if (createParentAccount && guardianPhone && parentPassword && guardianName) {
    try {
      const fakeEmail = `${guardianPhone.replace(/[^0-9]/g, "")}@parent.kidspeak.local`;
      const passwordHash = await bcrypt.hash(parentPassword, 10);
      const [parentUser] = await db.insert(usersTable).values({
        name: guardianName,
        email: fakeEmail,
        phone: guardianPhone,
        passwordHash,
        role: "parent",
        status: "active",
      }).returning({ id: usersTable.id });
      if (parentUser) {
        await db.update(studentsTable).set({ parentId: parentUser.id }).where(eq(studentsTable.id, student.id));
      }
    } catch (err) {
      console.error("Failed to create parent account:", err);
    }
  }

  res.status(201).json({ ...student, createdAt: student.createdAt.toISOString() });
});

router.get("/students/behavioral-feed", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  if (!["admin", "psychologist"].includes(user.role)) {
    res.status(403).json({ error: "Access restricted to psychologist and admin." });
    return;
  }

  const flagCounts = await db
    .select({
      studentId: observationsTable.studentId,
      redFlagCount: count(observationsTable.id),
    })
    .from(observationsTable)
    .where(or(eq(observationsTable.observationType, "fear"), eq(observationsTable.observationType, "shyness")))
    .groupBy(observationsTable.studentId);

  if (flagCounts.length === 0) {
    res.json([]);
    return;
  }

  const countMap = new Map(flagCounts.map(r => [r.studentId, Number(r.redFlagCount)]));
  const studentIds = flagCounts.map(r => r.studentId);

  const students = await db
    .select({
      id: studentsTable.id,
      name: studentsTable.name,
      profilePicture: studentsTable.profilePicture,
      behavioralFlags: studentsTable.behavioralFlags,
      levelId: studentsTable.levelId,
      levelName: levelsTable.name,
    })
    .from(studentsTable)
    .leftJoin(levelsTable, eq(studentsTable.levelId, levelsTable.id))
    .where(or(...studentIds.map(id => eq(studentsTable.id, id))));

  const latestObs = await db
    .select({
      studentId: observationsTable.studentId,
      content: observationsTable.content,
      observationType: observationsTable.observationType,
      createdAt: observationsTable.createdAt,
    })
    .from(observationsTable)
    .where(or(eq(observationsTable.observationType, "fear"), eq(observationsTable.observationType, "shyness")))
    .orderBy(desc(observationsTable.createdAt));

  const latestObsMap = new Map<number, typeof latestObs[0]>();
  for (const obs of latestObs) {
    if (!latestObsMap.has(obs.studentId)) latestObsMap.set(obs.studentId, obs);
  }

  const result = students
    .map(s => ({
      ...s,
      redFlagCount: countMap.get(s.id) ?? 0,
      latestObservation: latestObsMap.has(s.id)
        ? { ...latestObsMap.get(s.id)!, createdAt: latestObsMap.get(s.id)!.createdAt.toISOString() }
        : null,
    }))
    .sort((a, b) => b.redFlagCount - a.redFlagCount);

  res.json(result);
});

router.get("/students/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const params = GetStudentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [student] = await db.select().from(studentsTable).where(eq(studentsTable.id, params.data.id));
  if (!student) {
    res.status(404).json({ error: "Student not found" });
    return;
  }

  let levelName: string | null = null;
  let parentName: string | null = null;
  let teacherName: string | null = null;
  let teacherBio: string | null = null;
  let teacherSpecialization: string | null = null;
  let teacherProfilePicture: string | null = null;

  if (student.levelId) {
    const [level] = await db.select({ name: levelsTable.name }).from(levelsTable).where(eq(levelsTable.id, student.levelId));
    levelName = level?.name ?? null;
  }
  if (student.parentId) {
    const [parent] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, student.parentId));
    parentName = parent?.name ?? null;
  }
  if (student.teacherId) {
    const [teacher] = await db.select({
      name: usersTable.name,
      bio: usersTable.bio,
      specialization: usersTable.specialization,
      profilePicture: usersTable.profilePicture,
    }).from(usersTable).where(eq(usersTable.id, student.teacherId));
    teacherName = teacher?.name ?? null;
    teacherBio = teacher?.bio ?? null;
    teacherSpecialization = teacher?.specialization ?? null;
    teacherProfilePicture = teacher?.profilePicture ?? null;
  }

  const evals = await db
    .select()
    .from(evaluationsTable)
    .where(eq(evaluationsTable.studentId, student.id))
    .orderBy(evaluationsTable.weekNumber);

  const payments = await db
    .select()
    .from(paymentsTable)
    .where(eq(paymentsTable.studentId, student.id))
    .orderBy(paymentsTable.dueDate);

  const [latestPayment] = payments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const paymentStatus = latestPayment?.status ?? null;
  const progressScore = calcProgressScore(evals.map(e => ({ speakingScore: e.speakingScore, confidenceScore: e.confidenceScore, participationScore: e.participationScore })));

  const formattedEvals = evals.map(e => ({
    ...e,
    progressScore: parseFloat(e.progressScore?.toString() ?? "0"),
    createdAt: e.createdAt.toISOString(),
  }));

  const formattedPayments = payments.map(p => ({
    ...p,
    amountDue: parseFloat(p.amountDue),
    amountPaid: parseFloat(p.amountPaid),
    paidAt: p.paidAt?.toISOString() ?? null,
    createdAt: p.createdAt.toISOString(),
  }));

  const requestingUser = (req as any).user as { role: string; id: number } | undefined;
  const canViewPayments = requestingUser && ["admin", "accountant", "parent"].includes(requestingUser.role);
  const canViewPrivateTip = requestingUser && (
    ["admin", "psychologist"].includes(requestingUser.role) ||
    (requestingUser.role === "teacher" && student.teacherId === requestingUser.id)
  );

  const responseBase: Record<string, unknown> = {
    ...student,
    createdAt: student.createdAt.toISOString(),
    levelName,
    parentName,
    teacherName,
    teacherBio,
    teacherSpecialization,
    teacherProfilePicture,
    paymentStatus,
    latestProgressScore: progressScore,
    evaluations: formattedEvals,
    payments: canViewPayments ? formattedPayments : [],
    progressScore,
  };

  if (!canViewPrivateTip) {
    delete responseBase.privateTip;
    delete responseBase.privateTipUpdatedBy;
  }

  res.json(responseBase);
});

router.put("/students/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const params = GetStudentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateStudentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const sessionUser = (req as any).user as { role: string; id: number; name: string; email: string };

  const [currentStudent] = await db
    .select({ id: studentsTable.id, name: studentsTable.name, behavioralFlags: studentsTable.behavioralFlags, parentId: studentsTable.parentId })
    .from(studentsTable)
    .where(eq(studentsTable.id, params.data.id));
  if (!currentStudent) {
    res.status(404).json({ error: "Student not found" });
    return;
  }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
  if (parsed.data.dateOfBirth !== undefined) updateData.dateOfBirth = parsed.data.dateOfBirth;
  if (parsed.data.levelId !== undefined) updateData.levelId = parsed.data.levelId;
  if (parsed.data.parentId !== undefined) updateData.parentId = parsed.data.parentId;
  if (parsed.data.teacherId !== undefined) updateData.teacherId = parsed.data.teacherId;
  if (parsed.data.enrollmentDate !== undefined) updateData.enrollmentDate = parsed.data.enrollmentDate;
  if (parsed.data.behavioralFlags !== undefined) updateData.behavioralFlags = parsed.data.behavioralFlags;
  if (parsed.data.notes !== undefined) updateData.notes = parsed.data.notes;

  const body = req.body as Record<string, unknown>;
  if (body.profilePicture !== undefined) updateData.profilePicture = body.profilePicture;
  if (body.gender !== undefined) updateData.gender = body.gender || null;
  if (body.guardianRelationship !== undefined) updateData.guardianRelationship = body.guardianRelationship || null;
  if (body.guardianName !== undefined) updateData.guardianName = body.guardianName || null;
  if (body.guardianPhone !== undefined) updateData.guardianPhone = body.guardianPhone || null;
  if (body.guardianPhone2 !== undefined) updateData.guardianPhone2 = body.guardianPhone2 || null;
  if (body.guardianOccupation !== undefined) updateData.guardianOccupation = body.guardianOccupation || null;
  if (body.medicalAlerts !== undefined) updateData.medicalAlerts = body.medicalAlerts || null;
  if (body.referralSource !== undefined) updateData.referralSource = body.referralSource || null;
  if (body.medicalIssues !== undefined) updateData.medicalIssues = body.medicalIssues;
  if (body.learningDisabilities !== undefined) updateData.learningDisabilities = body.learningDisabilities;
  if (body.supportInstructions !== undefined) updateData.supportInstructions = body.supportInstructions;
  if (body.preferredTeachingMethod !== undefined) updateData.preferredTeachingMethod = body.preferredTeachingMethod;

  if (body.privateTip !== undefined) {
    if (!["admin", "psychologist"].includes(sessionUser.role)) {
      res.status(403).json({ error: "Only psychologists and admins can update the private tip." });
      return;
    }
    updateData.privateTip = typeof body.privateTip === "string" ? body.privateTip : null;
    updateData.privateTipUpdatedBy = sessionUser.id;
  }

  updateData.lastUpdatedBy = sessionUser.name || sessionUser.email || String(sessionUser.id);
  updateData.lastUpdatedAt = new Date();

  const [student] = await db.update(studentsTable).set(updateData).where(eq(studentsTable.id, params.data.id)).returning();
  if (!student) {
    res.status(404).json({ error: "Student not found" });
    return;
  }

  const newFlags: string[] = Array.isArray(updateData.behavioralFlags) ? updateData.behavioralFlags as string[] : currentStudent.behavioralFlags;
  const oldFlags = currentStudent.behavioralFlags;
  const isNewlyConfident = newFlags.includes(CONFIDENT_FLAG) && !oldFlags.includes(CONFIDENT_FLAG);
  const wasShyOrFearful = oldFlags.some(f => SHY_FLAGS.includes(f));

  if (isNewlyConfident && wasShyOrFearful && currentStudent.parentId) {
    try {
      await db.insert(messagesTable).values({
        fromUserId: sessionUser.id,
        toUserId: currentStudent.parentId,
        subject: `🎉 Confidence Milestone — ${currentStudent.name}`,
        content: `Great news! ${currentStudent.name} has made remarkable progress and has been assessed as "Confident" by the school psychologist. This is a wonderful milestone in their journey!`,
        recipientType: "individual",
        isRead: false,
      });
    } catch (_) {}
  }

  res.json({ ...student, createdAt: student.createdAt.toISOString() });
});

router.delete("/students/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const params = GetStudentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const id = params.data.id;
  try {
    // Delete related records manually (in case FK cascade is not active)
    await db.delete(sessionAttendanceTable).where(eq(sessionAttendanceTable.studentId, id));
    await db.delete(evaluationsTable).where(eq(evaluationsTable.studentId, id));
    await db.delete(observationsTable).where(eq(observationsTable.studentId, id));
    await db.delete(paymentsTable).where(eq(paymentsTable.studentId, id));
    await db.delete(groupStudentsTable).where(eq(groupStudentsTable.studentId, id));
    await db.delete(adhocSessionsTable).where(eq(adhocSessionsTable.studentId, id));
    await db.delete(confidenceMetricsTable).where(eq(confidenceMetricsTable.studentId, id));
    await db.delete(performanceReportsTable).where(eq(performanceReportsTable.studentId, id));

    const [student] = await db.delete(studentsTable).where(eq(studentsTable.id, id)).returning({ id: studentsTable.id });
    if (!student) {
      res.status(404).json({ error: "Student not found" });
      return;
    }
    res.json({ message: "Student deleted successfully" });
  } catch (err: any) {
    console.error("Delete student error:", err);
    res.status(500).json({ error: "Failed to delete student: " + (err?.message ?? "unknown error") });
  }
});

router.get("/students/:id/progress", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const params = GetStudentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [student] = await db.select({ id: studentsTable.id, name: studentsTable.name }).from(studentsTable).where(eq(studentsTable.id, params.data.id));
  if (!student) {
    res.status(404).json({ error: "Student not found" });
    return;
  }

  const evals = await db
    .select()
    .from(evaluationsTable)
    .where(eq(evaluationsTable.studentId, params.data.id))
    .orderBy(evaluationsTable.weekNumber);

  const overallProgressScore = calcProgressScore(evals.map(e => ({ speakingScore: e.speakingScore, confidenceScore: e.confidenceScore, participationScore: e.participationScore })));

  const weeklyData = evals.map(e => ({
    weekNumber: e.weekNumber,
    sessionDate: e.sessionDate,
    speakingScore: e.speakingScore,
    confidenceScore: e.confidenceScore,
    participationScore: e.participationScore,
    progressScore: parseFloat(e.progressScore?.toString() ?? "0"),
  }));

  res.json({
    studentId: student.id,
    studentName: student.name,
    weeklyData,
    overallProgressScore,
  });
});

// GET /students/:id/journey — Learning Journey data for parent/admin
router.get("/students/:id/journey", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [student] = await db
    .select({ id: studentsTable.id, name: studentsTable.name, levelId: studentsTable.levelId, parentId: studentsTable.parentId })
    .from(studentsTable)
    .where(eq(studentsTable.id, id));

  if (!student) { res.status(404).json({ error: "Not found" }); return; }

  const user = (req as any).user;
  if (user.role === "parent" && student.parentId !== user.id) {
    res.status(403).json({ error: "Forbidden" }); return;
  }

  // Count all completed sessions for this student (attended only)
  const attendanceRows = await db
    .select({
      sessionId: sessionAttendanceTable.sessionId,
      speakingScore: sessionAttendanceTable.speakingScore,
      confidenceScore: sessionAttendanceTable.confidenceScore,
      participationScore: sessionAttendanceTable.participationScore,
      initiativeScore: sessionAttendanceTable.initiativeScore,
      sessionDate: classSessionsTable.sessionDate,
    })
    .from(sessionAttendanceTable)
    .innerJoin(classSessionsTable, eq(sessionAttendanceTable.sessionId, classSessionsTable.id))
    .where(and(eq(sessionAttendanceTable.studentId, id), eq(sessionAttendanceTable.status, "present")))
    .orderBy(classSessionsTable.sessionDate);

  const SESSIONS_PER_LEVEL = 16; // 8 weeks × 2 sessions
  const completedTotal = attendanceRows.length;
  const completedInLevel = completedTotal % SESSIONS_PER_LEVEL;
  const currentWeek = Math.floor(completedInLevel / 2) + 1;
  const currentSessionInWeek = (completedInLevel % 2) + 1;
  const percentComplete = Math.round((completedInLevel / SESSIONS_PER_LEVEL) * 100);

  // Skill averages from last 10 sessions with scores
  const scoredRows = attendanceRows
    .filter(r => r.speakingScore != null || r.confidenceScore != null || r.participationScore != null || r.initiativeScore != null)
    .slice(-10);

  const avg = (arr: (number | null)[]) => {
    const valid = arr.filter((v): v is number => v != null);
    return valid.length > 0 ? Math.round(valid.reduce((a, b) => a + b, 0) / valid.length) : null;
  };

  const skillAverages = {
    speaking: avg(scoredRows.map(r => r.speakingScore)),
    confidence: avg(scoredRows.map(r => r.confidenceScore)),
    participation: avg(scoredRows.map(r => r.participationScore)),
    initiative: avg(scoredRows.map(r => r.initiativeScore)),
  };

  // Recent sessions for timeline (last 6)
  const recentSessions = attendanceRows.slice(-6).reverse().map((r, i) => ({
    sessionDate: r.sessionDate,
    speakingScore: r.speakingScore,
    confidenceScore: r.confidenceScore,
    participationScore: r.participationScore,
    initiativeScore: r.initiativeScore,
  }));

  // Level name
  let levelName = null;
  if (student.levelId) {
    const [lvl] = await db.select({ name: levelsTable.name }).from(levelsTable).where(eq(levelsTable.id, student.levelId));
    levelName = lvl?.name ?? null;
  }

  res.json({
    studentId: student.id,
    studentName: student.name,
    levelId: student.levelId,
    levelName,
    completedTotal,
    completedInLevel,
    percentComplete,
    currentWeek: Math.min(currentWeek, 8),
    currentSessionInWeek,
    SESSIONS_PER_LEVEL,
    skillAverages,
    recentSessions,
  });
});

router.get("/:id/growth-sessions", requireAuth, async (req: Request, res: Response) => {
  const me = (req as any).user;
  const studentId = parseInt(req.params.id);
  if (isNaN(studentId)) return res.status(400).json({ error: "Invalid student id" });

  if (me.role === "parent") {
    const student = await db.query.studentsTable.findFirst({ where: eq(studentsTable.id, studentId) });
    if (!student || student.parentId !== me.id) return res.status(403).json({ error: "Forbidden" });
  } else if (!["admin", "psychologist"].includes(me.role)) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const psychologicalGroups = await db
    .select({ groupId: groupStudentsTable.groupId, groupName: groupsTable.name })
    .from(groupStudentsTable)
    .innerJoin(groupsTable, eq(groupsTable.id, groupStudentsTable.groupId))
    .innerJoin(levelsTable, eq(levelsTable.id, groupsTable.levelId))
    .innerJoin(programsTable, and(eq(programsTable.id, levelsTable.programId), eq(programsTable.type, "psychological")))
    .where(eq(groupStudentsTable.studentId, studentId));

  // Also find ALL groups this student belongs to (for support sessions)
  const allStudentGroups = await db
    .select({ groupId: groupStudentsTable.groupId, groupName: groupsTable.name })
    .from(groupStudentsTable)
    .innerJoin(groupsTable, eq(groupsTable.id, groupStudentsTable.groupId))
    .where(eq(groupStudentsTable.studentId, studentId));

  const allGroupIds = allStudentGroups.map((g) => g.groupId);
  const allGroupNameMap = Object.fromEntries(allStudentGroups.map((g) => [g.groupId, g.groupName]));

  // Class sessions from psychological groups (original logic)
  const classSessions: any[] = [];
  if (psychologicalGroups.length > 0) {
    const groupIds = psychologicalGroups.map((g) => g.groupId);
    const groupNameMap = Object.fromEntries(psychologicalGroups.map((g) => [g.groupId, g.groupName]));
    const rows = await db
      .select({
        id: classSessionsTable.id,
        groupId: classSessionsTable.groupId,
        sessionDate: classSessionsTable.sessionDate,
        durationMinutes: classSessionsTable.durationMinutes,
        notes: classSessionsTable.notes,
        status: sessionAttendanceTable.status,
      })
      .from(classSessionsTable)
      .leftJoin(
        sessionAttendanceTable,
        and(
          eq(sessionAttendanceTable.sessionId, classSessionsTable.id),
          eq(sessionAttendanceTable.studentId, studentId)
        )
      )
      .where(inArray(classSessionsTable.groupId, groupIds))
      .orderBy(desc(classSessionsTable.sessionDate));
    classSessions.push(...rows.map((s: any) => ({ ...s, groupName: groupNameMap[s.groupId] || "", sessionKind: "psychological" })));
  }

  // Group support sessions for this student across ALL their groups
  const supportSessions = allGroupIds.length > 0
    ? await db
        .select()
        .from(supportSessionsTable)
        .where(inArray(supportSessionsTable.groupId, allGroupIds))
        .orderBy(desc(supportSessionsTable.sessionDate))
    : [];

  const enrichedSupport = supportSessions.map((s) => ({
    id: s.id,
    groupId: s.groupId,
    sessionDate: s.sessionDate,
    durationMinutes: null,
    notes: s.teacherNote,
    title: s.topic,
    status: null,
    groupName: allGroupNameMap[s.groupId] || "",
    sessionKind: "group_support",
  }));

  return res.json([...classSessions, ...enrichedSupport]);
});

// ── GET /students/:id/communication-metrics ─ Averaged communication metrics for a student ──
router.get("/students/:id/communication-metrics", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const me = (req as any).user;
  const studentId = parseInt(req.params.id);
  if (isNaN(studentId)) { res.status(400).json({ error: "Invalid student id" }); return; }

  if (me.role === "parent") {
    const student = await db.query.studentsTable.findFirst({ where: eq(studentsTable.id, studentId) });
    if (!student || student.parentId !== me.id) { res.status(403).json({ error: "Forbidden" }); return; }
  } else if (!["admin", "psychologist", "teacher"].includes(me.role)) {
    res.status(403).json({ error: "Forbidden" }); return;
  }

  const rows = await db
    .select({
      verbalFluency: sessionAttendanceTable.verbalFluency,
      verbalClarity: sessionAttendanceTable.verbalClarity,
      verbalVocabulary: sessionAttendanceTable.verbalVocabulary,
      nonverbalEyeContact: sessionAttendanceTable.nonverbalEyeContact,
      nonverbalBodyLanguage: sessionAttendanceTable.nonverbalBodyLanguage,
      nonverbalFacialExpressions: sessionAttendanceTable.nonverbalFacialExpressions,
      sessionDate: classSessionsTable.sessionDate,
    })
    .from(sessionAttendanceTable)
    .innerJoin(classSessionsTable, eq(classSessionsTable.id, sessionAttendanceTable.sessionId))
    .where(eq(sessionAttendanceTable.studentId, studentId))
    .orderBy(desc(classSessionsTable.sessionDate));

  const withComm = rows.filter(r =>
    r.verbalFluency != null || r.verbalClarity != null || r.verbalVocabulary != null ||
    r.nonverbalEyeContact != null || r.nonverbalBodyLanguage != null || r.nonverbalFacialExpressions != null
  );

  const avg = (field: (r: typeof rows[0]) => number | null) => {
    const vals = withComm.map(field).filter(v => v != null) as number[];
    if (vals.length === 0) return null;
    return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
  };

  const averages = {
    verbalFluency: avg(r => r.verbalFluency),
    verbalClarity: avg(r => r.verbalClarity),
    verbalVocabulary: avg(r => r.verbalVocabulary),
    nonverbalEyeContact: avg(r => r.nonverbalEyeContact),
    nonverbalBodyLanguage: avg(r => r.nonverbalBodyLanguage),
    nonverbalFacialExpressions: avg(r => r.nonverbalFacialExpressions),
    sessionCount: withComm.length,
    history: withComm.slice(0, 10).map(r => ({
      date: r.sessionDate,
      verbalFluency: r.verbalFluency,
      verbalClarity: r.verbalClarity,
      verbalVocabulary: r.verbalVocabulary,
      nonverbalEyeContact: r.nonverbalEyeContact,
      nonverbalBodyLanguage: r.nonverbalBodyLanguage,
      nonverbalFacialExpressions: r.nonverbalFacialExpressions,
    })),
  };

  res.json(averages);
});

export default router;

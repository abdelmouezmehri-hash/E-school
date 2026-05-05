import { Router } from "express";
import { db, activityRequestsTable, activityConsentsTable, usersTable, groupStudentsTable, studentsTable, levelsTable, groupsTable } from "@workspace/db";
import { desc, eq, and, or, inArray } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();

// ── helpers ────────────────────────────────────────────────────────────────

async function getParentRelevantRequestIds(parentId: number): Promise<number[] | "all"> {
  const pupils = await db
    .select({ id: studentsTable.id, levelId: studentsTable.levelId, teacherId: studentsTable.teacherId })
    .from(studentsTable)
    .where(eq(studentsTable.parentId, parentId));

  if (pupils.length === 0) return "all";

  const pupilIds = pupils.map((p) => p.id);
  const levelIds = [...new Set(pupils.map((p) => p.levelId).filter(Boolean))] as number[];
  const teacherIds = [...new Set(pupils.map((p) => p.teacherId).filter(Boolean))] as number[];

  // pupilIds is guaranteed non-empty here — the early return above handles the empty case
  const groupRows = await db
    .selectDistinct({ groupId: groupStudentsTable.groupId })
    .from(groupStudentsTable)
    .where(inArray(groupStudentsTable.studentId, pupilIds));
  const groupIds = groupRows.map((r) => r.groupId);

  // Build a single SQL condition covering all relevant request types
  const conditions = [eq(activityRequestsTable.targetType, "all")];

  if (levelIds.length > 0) {
    // and() is non-null here: both eq() and inArray() always return SQL expressions
    conditions.push(
      and(
        eq(activityRequestsTable.targetType, "level"),
        inArray(activityRequestsTable.targetId, levelIds),
      )!,
    );
  }
  if (groupIds.length > 0) {
    // and() is non-null here: both eq() and inArray() always return SQL expressions
    conditions.push(
      and(
        eq(activityRequestsTable.targetType, "group"),
        inArray(activityRequestsTable.targetId, groupIds),
      )!,
    );
  }
  if (teacherIds.length > 0) {
    // and() is non-null here: both eq() and inArray() always return SQL expressions
    conditions.push(
      and(
        eq(activityRequestsTable.targetType, "teacher"),
        inArray(activityRequestsTable.targetId, teacherIds),
      )!,
    );
  }

  const relevant = await db
    .select({ id: activityRequestsTable.id })
    .from(activityRequestsTable)
    .where(or(...conditions));

  return relevant.map((r) => r.id);
}

async function resolveTargetLabel(targetType: string, targetId: number | null): Promise<string> {
  if (targetType === "all" || targetId === null) return "all";

  if (targetType === "level") {
    const [row] = await db
      .select({ name: levelsTable.name })
      .from(levelsTable)
      .where(eq(levelsTable.id, targetId));
    return row?.name ? `Level: ${row.name}` : `Level #${targetId}`;
  }
  if (targetType === "group") {
    const [row] = await db
      .select({ name: groupsTable.name })
      .from(groupsTable)
      .where(eq(groupsTable.id, targetId));
    return row?.name ? `Group: ${row.name}` : `Group #${targetId}`;
  }
  if (targetType === "teacher") {
    const [row] = await db
      .select({ name: usersTable.name })
      .from(usersTable)
      .where(eq(usersTable.id, targetId));
    return row?.name ? `Teacher: ${row.name}` : `Teacher #${targetId}`;
  }
  return "all";
}

// ── GET /api/requests/audience-options ─────────────────────────────────────

router.get("/requests/audience-options", requireAuth, async (req, res) => {
  const user = (req as any).user;
  if (user.role !== "admin") return res.status(403).json({ error: "Forbidden" });

  try {
    const [levels, groups, teachers] = await Promise.all([
      db.select({ id: levelsTable.id, name: levelsTable.name }).from(levelsTable).orderBy(levelsTable.name),
      db.select({ id: groupsTable.id, name: groupsTable.name }).from(groupsTable).orderBy(groupsTable.name),
      db
        .select({ id: usersTable.id, name: usersTable.name })
        .from(usersTable)
        .where(eq(usersTable.role, "teacher"))
        .orderBy(usersTable.name),
    ]);
    res.json({ levels, groups, teachers });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch audience options" });
  }
});

// ── GET /api/requests ───────────────────────────────────────────────────────

router.get("/requests", requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;

    const items = await db
      .select({
        id: activityRequestsTable.id,
        title: activityRequestsTable.title,
        titleAr: activityRequestsTable.titleAr,
        description: activityRequestsTable.description,
        descriptionAr: activityRequestsTable.descriptionAr,
        date: activityRequestsTable.date,
        requiredItems: activityRequestsTable.requiredItems,
        requiredItemsAr: activityRequestsTable.requiredItemsAr,
        cost: activityRequestsTable.cost,
        authorId: activityRequestsTable.authorId,
        authorName: usersTable.name,
        targetType: activityRequestsTable.targetType,
        targetId: activityRequestsTable.targetId,
        createdAt: activityRequestsTable.createdAt,
      })
      .from(activityRequestsTable)
      .leftJoin(usersTable, eq(activityRequestsTable.authorId, usersTable.id))
      .orderBy(desc(activityRequestsTable.createdAt));

    let filtered = items;
    if (user.role === "parent") {
      const relevant = await getParentRelevantRequestIds(user.id);
      if (relevant !== "all") {
        filtered = items.filter((i) => relevant.includes(i.id));
      }
    }

    const enriched = await Promise.all(
      filtered.map(async (item) => {
        const consents = await db
          .select({ status: activityConsentsTable.status, parentId: activityConsentsTable.parentId })
          .from(activityConsentsTable)
          .where(eq(activityConsentsTable.requestId, item.id));

        const approved = consents.filter((c) => c.status === "approved").length;
        const declined = consents.filter((c) => c.status === "declined").length;

        let myConsentStatus: string | null = null;
        if (user.role === "parent") {
          const mine = consents.find((c) => c.parentId === user.id);
          myConsentStatus = mine?.status ?? null;
        }

        const targetLabel = await resolveTargetLabel(item.targetType, item.targetId);

        return {
          ...item,
          approvedCount: approved,
          declinedCount: declined,
          totalResponses: consents.length,
          myConsentStatus,
          targetLabel,
        };
      })
    );

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch requests" });
  }
});

// ── GET /api/requests/:id/consents ─────────────────────────────────────────

router.get("/requests/:id/consents", requireAuth, async (req, res) => {
  const user = (req as any).user;
  if (user.role !== "admin") return res.status(403).json({ error: "Forbidden" });

  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  try {
    const consents = await db
      .select({
        id: activityConsentsTable.id,
        parentId: activityConsentsTable.parentId,
        parentName: usersTable.name,
        status: activityConsentsTable.status,
        respondedAt: activityConsentsTable.respondedAt,
      })
      .from(activityConsentsTable)
      .leftJoin(usersTable, eq(activityConsentsTable.parentId, usersTable.id))
      .where(eq(activityConsentsTable.requestId, id));

    res.json(consents);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch consents" });
  }
});

// ── POST /api/requests ──────────────────────────────────────────────────────

router.post("/requests", requireAuth, async (req, res) => {
  const user = (req as any).user;
  if (user.role !== "admin") return res.status(403).json({ error: "Forbidden" });

  const { title, titleAr, description, descriptionAr, date, requiredItems, requiredItemsAr, cost, targetType, targetId } = req.body;
  if (!title || !description || !date) return res.status(400).json({ error: "title, description, date are required" });

  const validTargetTypes = ["all", "level", "group", "teacher"];
  const resolvedTargetType = validTargetTypes.includes(targetType) ? targetType : "all";
  const resolvedTargetId = resolvedTargetType !== "all" && targetId ? parseInt(targetId) : null;

  const items = Array.isArray(requiredItems) ? requiredItems.filter((i: any) => typeof i === "string" && i.trim()) : [];
  const itemsAr = Array.isArray(requiredItemsAr) ? requiredItemsAr.filter((i: any) => typeof i === "string" && i.trim()) : [];

  try {
    const [item] = await db
      .insert(activityRequestsTable)
      .values({
        title,
        titleAr: titleAr?.trim() || null,
        description,
        descriptionAr: descriptionAr?.trim() || null,
        date,
        requiredItems: items,
        requiredItemsAr: itemsAr,
        cost: cost ? parseInt(cost) : null,
        authorId: user.id,
        targetType: resolvedTargetType,
        targetId: resolvedTargetId,
      })
      .returning();
    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ error: "Failed to create request" });
  }
});

// ── DELETE /api/requests/:id ────────────────────────────────────────────────

router.delete("/requests/:id", requireAuth, async (req, res) => {
  const user = (req as any).user;
  if (user.role !== "admin") return res.status(403).json({ error: "Forbidden" });

  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  try {
    await db.delete(activityRequestsTable).where(eq(activityRequestsTable.id, id));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete request" });
  }
});

// ── POST /api/requests/:id/consent ─────────────────────────────────────────

router.post("/requests/:id/consent", requireAuth, async (req, res) => {
  const user = (req as any).user;
  if (user.role !== "parent") return res.status(403).json({ error: "Only parents can submit consent" });

  const requestId = parseInt(req.params.id);
  if (isNaN(requestId)) return res.status(400).json({ error: "Invalid id" });

  const { status } = req.body;
  if (!["approved", "declined"].includes(status)) return res.status(400).json({ error: "status must be 'approved' or 'declined'" });

  try {
    await db
      .delete(activityConsentsTable)
      .where(and(eq(activityConsentsTable.requestId, requestId), eq(activityConsentsTable.parentId, user.id)));

    const [consent] = await db
      .insert(activityConsentsTable)
      .values({ requestId, parentId: user.id, status })
      .returning();

    res.status(201).json(consent);
  } catch (err) {
    res.status(500).json({ error: "Failed to submit consent" });
  }
});

export default router;

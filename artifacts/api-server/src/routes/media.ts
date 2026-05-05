import { Router, type IRouter, type Request, type Response } from "express";
import { db, mediaTable, studentsTable, groupsTable, usersTable, groupStudentsTable } from "@workspace/db";
import { eq, desc, inArray } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

function getCurrentUser(req: Request): { id: number; role: string } | null {
  return (req as any).user ?? null;
}

/** Resolves the set of group IDs and teacher IDs a parent's children belong to */
async function getParentContext(parentId: number) {
  const studentRows = await db
    .select({ id: studentsTable.id })
    .from(studentsTable)
    .where(eq(studentsTable.parentId, parentId));
  const childIds = studentRows.map(s => s.id);

  let childGroupIds: number[] = [];
  let childTeacherIds: number[] = [];

  if (childIds.length > 0) {
    const groupRows = await db
      .select({ groupId: groupStudentsTable.groupId })
      .from(groupStudentsTable)
      .where(inArray(groupStudentsTable.studentId, childIds));
    childGroupIds = [...new Set(groupRows.map(g => g.groupId))];

    if (childGroupIds.length > 0) {
      const teacherRows = await db
        .select({ teacherId: groupsTable.teacherId })
        .from(groupsTable)
        .where(inArray(groupsTable.id, childGroupIds));
      childTeacherIds = [...new Set(
        teacherRows.map(t => t.teacherId).filter((id): id is number => id != null)
      )];
    }
  }

  return { childIds, childGroupIds, childTeacherIds };
}

/**
 * GET /media
 * List media with filters: category, type, studentId, groupId
 * Parents see:
 *   - private/talkshow: their child's media
 *   - group: their child's group media
 *   - teacher_broadcast: from their child's teacher
 *   - global: always
 */
router.get("/media", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = getCurrentUser(req);
  if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }

  const { category, type, studentId, groupId } = req.query as Record<string, string>;

  try {
    let rows = await db.select().from(mediaTable).orderBy(desc(mediaTable.createdAt));

    // Role-based filtering for parents
    if (user.role === "parent") {
      const { childIds, childGroupIds, childTeacherIds } = await getParentContext(user.id);

      rows = rows.filter(m => {
        if (m.category === "global") return true;
        if (m.category === "teacher_broadcast") {
          return m.uploadedBy != null && childTeacherIds.includes(m.uploadedBy);
        }
        if (m.category === "private" || m.category === "talkshow") {
          return m.studentId != null && childIds.includes(m.studentId);
        }
        if (m.category === "group") {
          return m.groupId != null && childGroupIds.includes(m.groupId);
        }
        return false;
      });
    }

    // Apply query filters
    if (category) rows = rows.filter(m => m.category === category);
    if (type) rows = rows.filter(m => m.type === type);
    if (studentId) rows = rows.filter(m => m.studentId === parseInt(studentId));
    if (groupId) rows = rows.filter(m => m.groupId === parseInt(groupId));

    // Enrich with uploader name
    const enriched = await Promise.all(rows.map(async m => {
      let uploaderName = "";
      if (m.uploadedBy) {
        const [u] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, m.uploadedBy));
        uploaderName = u?.name ?? "";
      }
      return { ...m, createdAt: m.createdAt.toISOString(), uploaderName };
    }));

    res.json(enriched);
  } catch (err: any) {
    console.error("Error fetching media:", err);
    res.status(500).json({ error: "Failed to fetch media" });
  }
});

/**
 * GET /media/upload-context
 * Returns the groups and students the current user (teacher/admin) can upload for.
 */
router.get("/media/upload-context", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = getCurrentUser(req);
  if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }
  if (!["admin", "teacher"].includes(user.role)) {
    res.status(403).json({ error: "Forbidden" }); return;
  }

  try {
    let groups: { id: number; name: string }[] = [];
    let students: { id: number; name: string; groupId: number }[] = [];

    if (user.role === "teacher") {
      groups = await db
        .select({ id: groupsTable.id, name: groupsTable.name })
        .from(groupsTable)
        .where(eq(groupsTable.teacherId, user.id));

      if (groups.length > 0) {
        const groupIds = groups.map(g => g.id);
        students = await db
          .select({ id: studentsTable.id, name: studentsTable.name, groupId: groupStudentsTable.groupId })
          .from(groupStudentsTable)
          .innerJoin(studentsTable, eq(groupStudentsTable.studentId, studentsTable.id))
          .where(inArray(groupStudentsTable.groupId, groupIds));
      }
    } else {
      groups = await db.select({ id: groupsTable.id, name: groupsTable.name }).from(groupsTable);
      if (groups.length > 0) {
        const groupIds = groups.map(g => g.id);
        students = await db
          .select({ id: studentsTable.id, name: studentsTable.name, groupId: groupStudentsTable.groupId })
          .from(groupStudentsTable)
          .innerJoin(studentsTable, eq(groupStudentsTable.studentId, studentsTable.id))
          .where(inArray(groupStudentsTable.groupId, groupIds));
      }
    }

    // Deduplicate students across groups
    const seen = new Set<number>();
    const uniqueStudents = students.filter(s => {
      if (seen.has(s.id)) return false;
      seen.add(s.id);
      return true;
    });

    res.json({ groups, students: uniqueStudents });
  } catch (err) {
    console.error("Error fetching upload context:", err);
    res.status(500).json({ error: "Failed to fetch upload context" });
  }
});

/**
 * POST /media
 * Create a new media entry.
 * Body: { type, category, url, thumbnailUrl?, description?, studentId?, groupId? }
 *
 * Category rules:
 *   private / talkshow  → studentId required
 *   group               → groupId required
 *   teacher_broadcast   → no studentId/groupId (targets all students of uploader)
 *   global              → no studentId/groupId (school-wide)
 */
router.post("/media", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = getCurrentUser(req);
  if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }
  if (!["admin", "teacher"].includes(user.role)) {
    res.status(403).json({ error: "Only admins and teachers can upload media" });
    return;
  }

  const { type, category, url, thumbnailUrl, description, studentId, groupId } = req.body ?? {};

  const VALID_TYPES = ["photo", "video"];
  const VALID_CATEGORIES = ["group", "private", "talkshow", "teacher_broadcast", "global"];

  if (!type || !VALID_TYPES.includes(type)) {
    res.status(400).json({ error: "type must be 'photo' or 'video'" }); return;
  }
  if (!category || !VALID_CATEGORIES.includes(category)) {
    res.status(400).json({ error: `category must be one of: ${VALID_CATEGORIES.join(", ")}` }); return;
  }
  if (!url || typeof url !== "string") {
    res.status(400).json({ error: "url is required" }); return;
  }

  // Per-category required field checks
  if (category === "group" && !groupId) {
    res.status(400).json({ error: "groupId is required for group media" }); return;
  }
  if ((category === "private" || category === "talkshow") && !studentId) {
    res.status(400).json({ error: "studentId is required for private/talkshow media" }); return;
  }

  try {
    const [inserted] = await db.insert(mediaTable).values({
      type,
      category,
      url,
      thumbnailUrl: thumbnailUrl ?? null,
      description: description ?? null,
      studentId: studentId ? parseInt(studentId) : null,
      groupId: groupId ? parseInt(groupId) : null,
      uploadedBy: user.id,
    }).returning();

    res.status(201).json({ ...inserted, createdAt: inserted.createdAt.toISOString() });
  } catch (err: any) {
    console.error("Error creating media:", err);
    res.status(500).json({ error: "Failed to create media entry" });
  }
});

/**
 * GET /media/new-count
 * Count of new media in last 7 days relevant to the requesting user.
 */
router.get("/media/new-count", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = getCurrentUser(req);
  if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 7);

  try {
    const rows = await db.select().from(mediaTable);
    const recent = rows.filter(m => new Date(m.createdAt) > cutoff);

    if (user.role === "parent") {
      const { childIds, childGroupIds, childTeacherIds } = await getParentContext(user.id);

      const relevant = recent.filter(m => {
        if (m.category === "global") return true;
        if (m.category === "teacher_broadcast") {
          return m.uploadedBy != null && childTeacherIds.includes(m.uploadedBy);
        }
        if (m.category === "private" || m.category === "talkshow") {
          return m.studentId != null && childIds.includes(m.studentId);
        }
        if (m.category === "group") {
          return m.groupId != null && childGroupIds.includes(m.groupId);
        }
        return false;
      });

      res.json({ count: relevant.length });
    } else {
      res.json({ count: recent.length });
    }
  } catch (err: any) {
    console.error("Error fetching new-count:", err);
    res.status(500).json({ error: "Failed to fetch count" });
  }
});

/**
 * DELETE /media/:id
 */
router.delete("/media/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = getCurrentUser(req);
  if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }
  if (!["admin", "teacher"].includes(user.role)) {
    res.status(403).json({ error: "Forbidden" }); return;
  }

  const id = parseInt((req.params.id as string));
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  try {
    const [m] = await db.select().from(mediaTable).where(eq(mediaTable.id, id));
    if (!m) { res.status(404).json({ error: "Media not found" }); return; }
    if (user.role === "teacher" && m.uploadedBy !== user.id) {
      res.status(403).json({ error: "You can only delete your own uploads" }); return;
    }
    await db.delete(mediaTable).where(eq(mediaTable.id, id));
    res.json({ success: true });
  } catch (err: any) {
    console.error("Error deleting media:", err);
    res.status(500).json({ error: "Failed to delete media" });
  }
});

export default router;

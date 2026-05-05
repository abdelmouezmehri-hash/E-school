import { Router } from "express";
import {
  db,
  messagesTable,
  usersTable,
  groupsTable,
  groupStudentsTable,
  studentsTable,
  levelsTable,
  messageListsTable,
  messageListMembersTable,
} from "@workspace/db";
import { consultationsTable, schoolSettingsTable, branchesTable } from "@workspace/db";
import { desc, eq, and, or, inArray, isNotNull, ne, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { randomUUID } from "crypto";

const router = Router();

// ── Helper: get contact list for a user ─────────────────────────────────────
async function getContactsForUser(user: any): Promise<any[]> {
  const role = user.role;

  if (role === "admin") {
    const users = await db
      .select({ id: usersTable.id, name: usersTable.name, email: usersTable.email, role: usersTable.role })
      .from(usersTable)
      .where(ne(usersTable.id, user.id));
    return users;
  }

  if (role === "teacher") {
    // Teacher: admin + psychologists + parents of their students
    const myGroups = await db
      .select({ id: groupsTable.id })
      .from(groupsTable)
      .where(eq(groupsTable.teacherId, user.id));
    const groupIds = myGroups.map((g) => g.id);

    let parentIds: number[] = [];
    if (groupIds.length > 0) {
      const gsRows = await db
        .select({ studentId: groupStudentsTable.studentId })
        .from(groupStudentsTable)
        .where(inArray(groupStudentsTable.groupId, groupIds));
      const studentIds = gsRows.map((r) => r.studentId);
      if (studentIds.length > 0) {
        const students = await db
          .select({ parentId: studentsTable.parentId })
          .from(studentsTable)
          .where(and(inArray(studentsTable.id, studentIds), isNotNull(studentsTable.parentId)));
        parentIds = [...new Set(students.map((s) => s.parentId!))];
      }
    }

    const contacts: any[] = [];
    if (parentIds.length > 0) {
      const parents = await db
        .select({ id: usersTable.id, name: usersTable.name, email: usersTable.email, role: usersTable.role })
        .from(usersTable)
        .where(inArray(usersTable.id, parentIds));
      contacts.push(...parents);
    }
    // Admins
    const admins = await db
      .select({ id: usersTable.id, name: usersTable.name, email: usersTable.email, role: usersTable.role })
      .from(usersTable)
      .where(eq(usersTable.role, "admin"));
    for (const a of admins) {
      if (!contacts.find((c) => c.id === a.id)) contacts.push(a);
    }
    // Psychologists
    const psychs = await db
      .select({ id: usersTable.id, name: usersTable.name, email: usersTable.email, role: usersTable.role })
      .from(usersTable)
      .where(eq(usersTable.role, "psychologist"));
    for (const p of psychs) {
      if (!contacts.find((c) => c.id === p.id)) contacts.push(p);
    }
    return contacts;
  }

  if (role === "psychologist") {
    const contacts: any[] = [];

    const admins = await db
      .select({ id: usersTable.id, name: usersTable.name, email: usersTable.email, role: usersTable.role })
      .from(usersTable)
      .where(eq(usersTable.role, "admin"));
    contacts.push(...admins);

    const teachers = await db
      .select({ id: usersTable.id, name: usersTable.name, email: usersTable.email, role: usersTable.role })
      .from(usersTable)
      .where(eq(usersTable.role, "teacher"));
    for (const t of teachers) {
      if (!contacts.find((c) => c.id === t.id)) contacts.push(t);
    }

    // If parentContactPsychologist setting is enabled, show ALL parents.
    // Otherwise restrict to parents with active consultations.
    const [settings] = await db.select().from(schoolSettingsTable).limit(1);
    const openToAllParents = settings?.parentContactPsychologist !== false;

    if (openToAllParents) {
      const parents = await db
        .select({ id: usersTable.id, name: usersTable.name, email: usersTable.email, role: usersTable.role })
        .from(usersTable)
        .where(eq(usersTable.role, "parent"));
      for (const p of parents) {
        if (!contacts.find((c) => c.id === p.id)) contacts.push(p);
      }
    } else {
      const consultRows = await db
        .select({ parentId: consultationsTable.parentId })
        .from(consultationsTable)
        .where(eq(consultationsTable.psychologistId, user.id));
      const parentIds = [...new Set(consultRows.map((r) => r.parentId))];
      if (parentIds.length > 0) {
        const parents = await db
          .select({ id: usersTable.id, name: usersTable.name, email: usersTable.email, role: usersTable.role })
          .from(usersTable)
          .where(inArray(usersTable.id, parentIds));
        for (const p of parents) {
          if (!contacts.find((c) => c.id === p.id)) contacts.push(p);
        }
      }
    }
    return contacts;
  }

  if (role === "parent") {
    const contacts: any[] = [];

    // Load settings to check parent messaging permissions
    const [settings] = await db.select().from(schoolSettingsTable).limit(1);
    const canContactAdmin = settings?.parentContactAdmin !== false;
    const canContactTeacher = settings?.parentContactTeacher !== false;
    const canContactPsychologist = settings?.parentContactPsychologist !== false;
    const hideAdminName = settings?.parentHideAdminName !== false;

    if (canContactAdmin) {
      // If parent belongs to a branch that has a manager, contact that manager.
      // Otherwise fall back to the first available admin — always ONE "الإدارة" entry.
      let adminContact: any = null;

      if (user.branchId) {
        const [branch] = await db
          .select({ managerId: branchesTable.managerId })
          .from(branchesTable)
          .where(eq(branchesTable.id, user.branchId))
          .limit(1);
        if (branch?.managerId) {
          const [manager] = await db
            .select({ id: usersTable.id, name: usersTable.name, email: usersTable.email, role: usersTable.role })
            .from(usersTable)
            .where(eq(usersTable.id, branch.managerId))
            .limit(1);
          if (manager) adminContact = manager;
        }
      }

      if (!adminContact) {
        const [firstAdmin] = await db
          .select({ id: usersTable.id, name: usersTable.name, email: usersTable.email, role: usersTable.role })
          .from(usersTable)
          .where(eq(usersTable.role, "admin"))
          .limit(1);
        if (firstAdmin) adminContact = firstAdmin;
      }

      if (adminContact) {
        contacts.push({ ...adminContact, name: hideAdminName ? "الإدارة" : adminContact.name });
      }
    }

    if (canContactTeacher) {
      const myStudents = await db
        .select({ id: studentsTable.id })
        .from(studentsTable)
        .where(eq(studentsTable.parentId, user.id));
      const studentIds = myStudents.map((s) => s.id);
      if (studentIds.length > 0) {
        const gsRows = await db
          .select({ groupId: groupStudentsTable.groupId })
          .from(groupStudentsTable)
          .where(inArray(groupStudentsTable.studentId, studentIds));
        const groupIds = [...new Set(gsRows.map((r) => r.groupId))];
        if (groupIds.length > 0) {
          const groups = await db
            .select({ teacherId: groupsTable.teacherId })
            .from(groupsTable)
            .where(and(inArray(groupsTable.id, groupIds), isNotNull(groupsTable.teacherId)));
          const teacherIds = [...new Set(groups.map((g) => g.teacherId!))];
          if (teacherIds.length > 0) {
            const teachers = await db
              .select({ id: usersTable.id, name: usersTable.name, email: usersTable.email, role: usersTable.role })
              .from(usersTable)
              .where(inArray(usersTable.id, teacherIds));
            for (const t of teachers) {
              if (!contacts.find((c) => c.id === t.id)) contacts.push(t);
            }
          }
        }
      }
    }

    if (canContactPsychologist) {
      const psychs = await db
        .select({ id: usersTable.id, name: usersTable.name, email: usersTable.email, role: usersTable.role })
        .from(usersTable)
        .where(eq(usersTable.role, "psychologist"));
      for (const p of psychs) {
        if (!contacts.find((c) => c.id === p.id)) contacts.push(p);
      }
    }

    return contacts;
  }

  // Default (accountant, designer, etc): can only message admin
  const admins = await db
    .select({ id: usersTable.id, name: usersTable.name, email: usersTable.email, role: usersTable.role })
    .from(usersTable)
    .where(eq(usersTable.role, "admin"));
  return admins;
}

// ── GET /api/messages/unread-count ────────────────────────────────────────────
router.get("/messages/unread-count", requireAuth, async (req, res) => {
  const user = (req as any).user;
  try {
    const rows = await db
      .select({ id: messagesTable.id })
      .from(messagesTable)
      .where(and(eq(messagesTable.toUserId, user.id), eq(messagesTable.isRead, false)));
    return res.json({ count: rows.length });
  } catch {
    return res.json({ count: 0 });
  }
});

// ── GET /api/messages/contacts ───────────────────────────────────────────────
router.get("/messages/contacts", requireAuth, async (req, res) => {
  const user = (req as any).user;
  try {
    const contacts = await getContactsForUser(user);
    return res.json(contacts);
  } catch {
    return res.status(500).json({ error: "Failed to fetch contacts" });
  }
});

// ── GET /api/messages/groups ──────────────────────────────────────────────────
router.get("/messages/groups", requireAuth, async (req, res) => {
  const user = (req as any).user;
  try {
    let rows;
    if (user.role === "admin") {
      rows = await db.select({ id: groupsTable.id, name: groupsTable.name }).from(groupsTable);
    } else if (user.role === "teacher") {
      rows = await db
        .select({ id: groupsTable.id, name: groupsTable.name })
        .from(groupsTable)
        .where(eq(groupsTable.teacherId, user.id));
    } else {
      return res.json([]);
    }
    return res.json(rows);
  } catch {
    return res.status(500).json({ error: "Failed to fetch groups" });
  }
});

// ── GET /api/messages/conversations ── list of conversations (one per person) ─
router.get("/messages/conversations", requireAuth, async (req, res) => {
  const user = (req as any).user;
  try {
    // Get all messages involving me (sent or received)
    const allMsgs = await db
      .select({
        id: messagesTable.id,
        fromUserId: messagesTable.fromUserId,
        toUserId: messagesTable.toUserId,
        subject: messagesTable.subject,
        content: messagesTable.content,
        isRead: messagesTable.isRead,
        readAt: messagesTable.readAt,
        linkedStudentId: messagesTable.linkedStudentId,
        attachmentUrl: messagesTable.attachmentUrl,
        attachmentName: messagesTable.attachmentName,
        createdAt: messagesTable.createdAt,
      })
      .from(messagesTable)
      .where(
        or(
          eq(messagesTable.toUserId, user.id),
          eq(messagesTable.fromUserId, user.id)
        )
      )
      .orderBy(desc(messagesTable.createdAt));

    // Group by conversation partner
    const convMap = new Map<number, any>();
    for (const msg of allMsgs) {
      const partnerId = msg.fromUserId === user.id ? msg.toUserId! : msg.fromUserId!;
      if (!convMap.has(partnerId)) {
        convMap.set(partnerId, { latestMsg: msg, unreadCount: 0 });
      }
      // Count unread messages from partner
      if (msg.toUserId === user.id && !msg.isRead) {
        convMap.get(partnerId)!.unreadCount += 1;
      }
    }

    // Fetch partner user details
    const partnerIds = [...convMap.keys()];
    if (partnerIds.length === 0) return res.json([]);

    const partners = await db
      .select({ id: usersTable.id, name: usersTable.name, role: usersTable.role, email: usersTable.email })
      .from(usersTable)
      .where(inArray(usersTable.id, partnerIds));

    const conversations = partners.map((p) => {
      const conv = convMap.get(p.id)!;
      return {
        partnerId: p.id,
        partnerName: p.name,
        partnerRole: p.role,
        partnerEmail: p.email,
        latestMessage: conv.latestMsg,
        unreadCount: conv.unreadCount,
      };
    });

    // Sort by latest message
    conversations.sort(
      (a, b) =>
        new Date(b.latestMessage.createdAt).getTime() -
        new Date(a.latestMessage.createdAt).getTime()
    );

    return res.json(conversations);
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch conversations" });
  }
});

// ── GET /api/messages/thread/:userId ── full thread between me and another user
router.get("/messages/thread/:userId", requireAuth, async (req, res) => {
  const user = (req as any).user;
  const partnerId = parseInt((req.params.userId as string));
  if (isNaN(partnerId)) return res.status(400).json({ error: "Invalid userId" });

  try {
    const msgs = await db
      .select({
        id: messagesTable.id,
        fromUserId: messagesTable.fromUserId,
        toUserId: messagesTable.toUserId,
        subject: messagesTable.subject,
        content: messagesTable.content,
        isRead: messagesTable.isRead,
        readAt: messagesTable.readAt,
        linkedStudentId: messagesTable.linkedStudentId,
        attachmentUrl: messagesTable.attachmentUrl,
        attachmentName: messagesTable.attachmentName,
        attachmentType: messagesTable.attachmentType,
        replyToId: messagesTable.replyToId,
        createdAt: messagesTable.createdAt,
      })
      .from(messagesTable)
      .where(
        or(
          and(eq(messagesTable.fromUserId, user.id), eq(messagesTable.toUserId, partnerId)),
          and(eq(messagesTable.fromUserId, partnerId), eq(messagesTable.toUserId, user.id))
        )
      )
      .orderBy(messagesTable.createdAt);

    // Fetch linked student names
    const studentIds = [...new Set(msgs.filter((m) => m.linkedStudentId).map((m) => m.linkedStudentId!))];
    const studentNames: Record<number, string> = {};
    if (studentIds.length > 0) {
      const students = await db
        .select({ id: studentsTable.id, name: studentsTable.name })
        .from(studentsTable)
        .where(inArray(studentsTable.id, studentIds));
      for (const s of students) studentNames[s.id] = s.name;
    }

    const enriched = msgs.map((m) => ({
      ...m,
      linkedStudentName: m.linkedStudentId ? studentNames[m.linkedStudentId] ?? null : null,
    }));

    return res.json(enriched);
  } catch {
    return res.status(500).json({ error: "Failed to fetch thread" });
  }
});

// ── PATCH /api/messages/thread/:userId/read-all ── mark all as read from partner
router.patch("/messages/thread/:userId/read-all", requireAuth, async (req, res) => {
  const user = (req as any).user;
  const partnerId = parseInt((req.params.userId as string));
  if (isNaN(partnerId)) return res.status(400).json({ error: "Invalid userId" });

  try {
    await db
      .update(messagesTable)
      .set({ isRead: true, readAt: new Date() })
      .where(
        and(
          eq(messagesTable.toUserId, user.id),
          eq(messagesTable.fromUserId, partnerId),
          eq(messagesTable.isRead, false)
        )
      );
    return res.json({ success: true });
  } catch {
    return res.status(500).json({ error: "Failed to mark messages as read" });
  }
});

// ── GET /api/messages ── legacy inbox/sent ────────────────────────────────────
router.get("/messages", requireAuth, async (req, res) => {
  const user = (req as any).user;
  const folder = (req.query.folder as string) || "inbox";

  try {
    if (folder === "sent") {
      const rows = await db
        .select({
          id: messagesTable.id,
          subject: messagesTable.subject,
          content: messagesTable.content,
          isRead: messagesTable.isRead,
          createdAt: messagesTable.createdAt,
          fromUserId: messagesTable.fromUserId,
          toUserId: messagesTable.toUserId,
          recipientType: messagesTable.recipientType,
          recipientLabel: messagesTable.recipientLabel,
          recipientCount: messagesTable.recipientCount,
          batchId: messagesTable.batchId,
          toName: usersTable.name,
        })
        .from(messagesTable)
        .leftJoin(usersTable, eq(messagesTable.toUserId, usersTable.id))
        .where(eq(messagesTable.fromUserId, user.id))
        .orderBy(desc(messagesTable.createdAt));

      const seen = new Set<string>();
      const deduped = rows.filter((r) => {
        const key = r.batchId ?? `solo-${r.id}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      return res.json(deduped);
    }

    const rows = await db
      .select({
        id: messagesTable.id,
        subject: messagesTable.subject,
        content: messagesTable.content,
        isRead: messagesTable.isRead,
        createdAt: messagesTable.createdAt,
        fromUserId: messagesTable.fromUserId,
        toUserId: messagesTable.toUserId,
        recipientType: messagesTable.recipientType,
        recipientLabel: messagesTable.recipientLabel,
        recipientCount: messagesTable.recipientCount,
        batchId: messagesTable.batchId,
        fromName: usersTable.name,
      })
      .from(messagesTable)
      .leftJoin(usersTable, eq(messagesTable.fromUserId, usersTable.id))
      .where(eq(messagesTable.toUserId, user.id))
      .orderBy(desc(messagesTable.createdAt));

    return res.json(rows);
  } catch {
    return res.status(500).json({ error: "Failed to fetch messages" });
  }
});

// ── POST /api/messages ─────────────────────────────────────────────────────────
router.post("/messages", requireAuth, async (req, res) => {
  const user = (req as any).user;
  const {
    recipientType = "individual",
    toUserId,
    groupId,
    levelId,
    role: targetRole,
    subject,
    content,
    linkedStudentId,
    attachmentUrl,
    attachmentName,
    attachmentType,
    replyToId,
  } = req.body as any;

  if (!content?.trim()) {
    return res.status(400).json({ error: "content is required" });
  }

  const canSend = ["admin", "teacher", "parent", "psychologist"].includes(user.role);
  if (!canSend) return res.status(403).json({ error: "Not authorized to send messages" });

  if (user.role === "parent" && recipientType !== "individual") {
    return res.status(403).json({ error: "Parents can only message individuals" });
  }
  if (user.role === "psychologist" && !["individual"].includes(recipientType)) {
    return res.status(403).json({ error: "Psychologists can only message individuals" });
  }
  if (user.role === "teacher" && !["individual", "group"].includes(recipientType)) {
    return res.status(403).json({ error: "Teachers can only message individual or their group" });
  }

  try {
    let recipientIds: number[] = [];
    let recipientLabel = "";

    switch (recipientType) {
      case "individual": {
        if (!toUserId) return res.status(400).json({ error: "toUserId required for individual" });
        const tid = parseInt(toUserId);
        recipientIds = [tid];
        const [target] = await db
          .select({ name: usersTable.name })
          .from(usersTable)
          .where(eq(usersTable.id, tid));
        recipientLabel = target?.name ?? "Unknown";
        break;
      }

      case "group": {
        if (!groupId) return res.status(400).json({ error: "groupId required" });
        const gid = parseInt(groupId);
        if (user.role === "teacher") {
          const [grpCheck] = await db
            .select({ teacherId: groupsTable.teacherId })
            .from(groupsTable)
            .where(eq(groupsTable.id, gid));
          if (!grpCheck || grpCheck.teacherId !== user.id) {
            return res.status(403).json({ error: "You can only message your own groups" });
          }
        }
        const [grp] = await db.select({ name: groupsTable.name }).from(groupsTable).where(eq(groupsTable.id, gid));
        const gsRows = await db
          .select({ studentId: groupStudentsTable.studentId })
          .from(groupStudentsTable)
          .where(eq(groupStudentsTable.groupId, gid));
        const studentIds = gsRows.map((r) => r.studentId);
        if (studentIds.length > 0) {
          const students = await db
            .select({ parentId: studentsTable.parentId })
            .from(studentsTable)
            .where(and(inArray(studentsTable.id, studentIds), isNotNull(studentsTable.parentId)));
          recipientIds = [...new Set(students.map((s) => s.parentId!))];
        }
        recipientLabel = `${grp?.name ?? "Group"} — ${recipientIds.length} recipients`;
        break;
      }

      case "level": {
        if (!levelId) return res.status(400).json({ error: "levelId required" });
        const lid = parseInt(levelId);
        const [lv] = await db.select({ name: levelsTable.name }).from(levelsTable).where(eq(levelsTable.id, lid));
        const students = await db
          .select({ parentId: studentsTable.parentId })
          .from(studentsTable)
          .where(and(eq(studentsTable.levelId, lid), isNotNull(studentsTable.parentId)));
        recipientIds = [...new Set(students.map((s) => s.parentId!))];
        recipientLabel = `${lv?.name ?? "Level"} — ${recipientIds.length} recipients`;
        break;
      }

      case "role": {
        if (!targetRole) return res.status(400).json({ error: "role required" });
        const users = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.role, targetRole));
        recipientIds = users.map((u) => u.id);
        recipientLabel = `All ${targetRole}s — ${recipientIds.length} recipients`;
        break;
      }

      case "all_parents": {
        const users = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.role, "parent"));
        recipientIds = users.map((u) => u.id);
        recipientLabel = `All Parents — ${recipientIds.length} recipients`;
        break;
      }

      case "global": {
        const users = await db.select({ id: usersTable.id }).from(usersTable);
        recipientIds = users.map((u) => u.id).filter((id) => id !== user.id);
        recipientLabel = `Everyone — ${recipientIds.length} recipients`;
        break;
      }

      case "list": {
        const { listId } = req.body as any;
        if (!listId) return res.status(400).json({ error: "listId required" });
        const lid = parseInt(String(listId));
        if (user.role !== "admin") {
          return res.status(403).json({ error: "Only admins can broadcast to saved lists" });
        }
        const [lst] = await db
          .select({ id: messageListsTable.id, name: messageListsTable.name, ownerId: messageListsTable.ownerId })
          .from(messageListsTable)
          .where(eq(messageListsTable.id, lid));
        if (!lst) return res.status(404).json({ error: "List not found" });
        if (lst.ownerId !== user.id) {
          return res.status(403).json({ error: "You don't own this list" });
        }
        const members = await db
          .select({ userId: messageListMembersTable.userId })
          .from(messageListMembersTable)
          .where(eq(messageListMembersTable.listId, lid));
        recipientIds = [...new Set(members.map((m) => m.userId).filter((id) => id !== user.id))];
        recipientLabel = `${lst.name} — ${recipientIds.length} recipients`;
        break;
      }

      case "specific_students": {
        if (!Array.isArray(req.body.studentIds) || req.body.studentIds.length === 0) {
          return res.status(400).json({ error: "studentIds array required" });
        }
        const sids: number[] = req.body.studentIds.map((id: any) => parseInt(id)).filter((id: number) => !isNaN(id));
        if (sids.length === 0) return res.status(400).json({ error: "No valid student IDs" });
        const students = await db
          .select({ parentId: studentsTable.parentId, name: studentsTable.name })
          .from(studentsTable)
          .where(and(inArray(studentsTable.id, sids), isNotNull(studentsTable.parentId)));
        recipientIds = [...new Set(students.map((s) => s.parentId!))];
        recipientLabel = `${sids.length} specific student(s) — ${recipientIds.length} parent recipients`;
        break;
      }

      default:
        return res.status(400).json({ error: "Invalid recipientType" });
    }

    if (recipientIds.length === 0) {
      return res.status(400).json({ error: "No recipients found for this selection" });
    }

    const batchId = recipientIds.length > 1 ? randomUUID() : null;
    const recipientCount = recipientIds.length;
    const msgSubject = subject?.trim() || "(no subject)";

    const insertValues = recipientIds.map((rid) => ({
      fromUserId: user.id,
      toUserId: rid,
      subject: msgSubject,
      content: content.trim(),
      recipientType,
      recipientLabel,
      recipientCount,
      batchId,
      linkedStudentId: linkedStudentId ? parseInt(linkedStudentId) : null,
      attachmentUrl: attachmentUrl || null,
      attachmentName: attachmentName || null,
      attachmentType: attachmentType || null,
      replyToId: replyToId ? parseInt(replyToId) : null,
    }));

    await db.insert(messagesTable).values(insertValues);
    return res.status(201).json({ count: recipientIds.length, recipientLabel });
  } catch (err) {
    return res.status(500).json({ error: "Failed to send message" });
  }
});

// ── PATCH /api/messages/:id/read ───────────────────────────────────────────────
router.patch("/messages/:id/read", requireAuth, async (req, res) => {
  const id = parseInt((req.params.id as string));
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  try {
    await db.update(messagesTable).set({ isRead: true, readAt: new Date() }).where(eq(messagesTable.id, id));
    return res.json({ success: true });
  } catch {
    return res.status(500).json({ error: "Failed to mark as read" });
  }
});

// ── BUG 8: Saved Broadcast Lists ────────────────────────────────────────────
// All list management is admin-only and scoped per-owner.

router.get("/messages/lists", requireAuth, async (req, res) => {
  const user = (req as any).user;
  if (user.role !== "admin") return res.status(403).json({ error: "Not authorized" });
  try {
    const lists = await db
      .select({
        id: messageListsTable.id,
        name: messageListsTable.name,
        description: messageListsTable.description,
        createdAt: messageListsTable.createdAt,
        memberCount: sql<number>`(select count(*) from ${messageListMembersTable} where ${messageListMembersTable.listId} = ${messageListsTable.id})`,
      })
      .from(messageListsTable)
      .where(eq(messageListsTable.ownerId, user.id))
      .orderBy(desc(messageListsTable.createdAt));
    return res.json(lists);
  } catch {
    return res.status(500).json({ error: "Failed to load lists" });
  }
});

router.get("/messages/lists/:id", requireAuth, async (req, res) => {
  const user = (req as any).user;
  if (user.role !== "admin") return res.status(403).json({ error: "Not authorized" });
  const lid = parseInt((req.params.id as string));
  if (isNaN(lid)) return res.status(400).json({ error: "Invalid id" });
  try {
    const [list] = await db
      .select()
      .from(messageListsTable)
      .where(and(eq(messageListsTable.id, lid), eq(messageListsTable.ownerId, user.id)));
    if (!list) return res.status(404).json({ error: "List not found" });
    const members = await db
      .select({
        userId: messageListMembersTable.userId,
        name: usersTable.name,
        email: usersTable.email,
        role: usersTable.role,
      })
      .from(messageListMembersTable)
      .leftJoin(usersTable, eq(usersTable.id, messageListMembersTable.userId))
      .where(eq(messageListMembersTable.listId, lid));
    return res.json({ ...list, members });
  } catch {
    return res.status(500).json({ error: "Failed to load list" });
  }
});

router.post("/messages/lists", requireAuth, async (req, res) => {
  const user = (req as any).user;
  if (user.role !== "admin") return res.status(403).json({ error: "Not authorized" });
  const { name, description, memberIds } = req.body as any;
  if (!name?.trim()) return res.status(400).json({ error: "name required" });
  try {
    const [created] = await db
      .insert(messageListsTable)
      .values({ ownerId: user.id, name: name.trim(), description: description?.trim() || null })
      .returning();
    if (Array.isArray(memberIds) && memberIds.length > 0 && created) {
      const ids = [...new Set(memberIds.map((x: any) => parseInt(x)).filter((n: number) => !isNaN(n)))] as number[];
      if (ids.length > 0) {
        await db
          .insert(messageListMembersTable)
          .values(ids.map((uid) => ({ listId: created.id, userId: uid })));
      }
    }
    return res.status(201).json(created);
  } catch {
    return res.status(500).json({ error: "Failed to create list" });
  }
});

router.put("/messages/lists/:id", requireAuth, async (req, res) => {
  const user = (req as any).user;
  if (user.role !== "admin") return res.status(403).json({ error: "Not authorized" });
  const lid = parseInt((req.params.id as string));
  if (isNaN(lid)) return res.status(400).json({ error: "Invalid id" });
  const { name, description, memberIds } = req.body as any;
  try {
    const [list] = await db
      .select({ ownerId: messageListsTable.ownerId })
      .from(messageListsTable)
      .where(eq(messageListsTable.id, lid));
    if (!list) return res.status(404).json({ error: "List not found" });
    if (list.ownerId !== user.id) return res.status(403).json({ error: "Not your list" });

    const updates: Record<string, any> = {};
    if (typeof name === "string" && name.trim()) updates.name = name.trim();
    if (typeof description === "string") updates.description = description.trim() || null;
    if (Object.keys(updates).length > 0) {
      await db.update(messageListsTable).set(updates).where(eq(messageListsTable.id, lid));
    }

    if (Array.isArray(memberIds)) {
      await db.delete(messageListMembersTable).where(eq(messageListMembersTable.listId, lid));
      const ids = [...new Set(memberIds.map((x: any) => parseInt(x)).filter((n: number) => !isNaN(n)))] as number[];
      if (ids.length > 0) {
        await db
          .insert(messageListMembersTable)
          .values(ids.map((uid) => ({ listId: lid, userId: uid })));
      }
    }

    return res.json({ success: true });
  } catch {
    return res.status(500).json({ error: "Failed to update list" });
  }
});

router.delete("/messages/lists/:id", requireAuth, async (req, res) => {
  const user = (req as any).user;
  if (user.role !== "admin") return res.status(403).json({ error: "Not authorized" });
  const lid = parseInt((req.params.id as string));
  if (isNaN(lid)) return res.status(400).json({ error: "Invalid id" });
  try {
    const [list] = await db
      .select({ ownerId: messageListsTable.ownerId })
      .from(messageListsTable)
      .where(eq(messageListsTable.id, lid));
    if (!list) return res.status(404).json({ error: "List not found" });
    if (list.ownerId !== user.id) return res.status(403).json({ error: "Not your list" });
    await db.delete(messageListsTable).where(eq(messageListsTable.id, lid));
    return res.json({ success: true });
  } catch {
    return res.status(500).json({ error: "Failed to delete list" });
  }
});

// ── BUG 10: Read receipts for broadcasts ───────────────────────────────────
// Returns per-recipient read state for all messages in a batch.
router.get("/messages/broadcasts/:batchId/reads", requireAuth, async (req, res) => {
  const user = (req as any).user;
  const batchId = String(req.params.batchId);
  if (!batchId) return res.status(400).json({ error: "batchId required" });
  try {
    const rows = await db
      .select({
        id: messagesTable.id,
        toUserId: messagesTable.toUserId,
        isRead: messagesTable.isRead,
        readAt: messagesTable.readAt,
        recipientName: usersTable.name,
        recipientRole: usersTable.role,
        fromUserId: messagesTable.fromUserId,
      })
      .from(messagesTable)
      .leftJoin(usersTable, eq(usersTable.id, messagesTable.toUserId))
      .where(eq(messagesTable.batchId, batchId));

    if (rows.length === 0) return res.json({ recipients: [], totalRead: 0, totalRecipients: 0 });
    if (rows[0]!.fromUserId !== user.id && user.role !== "admin") {
      return res.status(403).json({ error: "Not authorized to view receipts for this broadcast" });
    }

    const recipients = rows.map((r) => ({
      userId: r.toUserId,
      name: r.recipientName ?? "Unknown",
      role: r.recipientRole ?? "—",
      isRead: !!r.isRead,
      readAt: r.readAt instanceof Date ? r.readAt.toISOString() : r.readAt,
    }));

    const totalRead = recipients.filter((r) => r.isRead).length;
    return res.json({ recipients, totalRead, totalRecipients: recipients.length });
  } catch {
    return res.status(500).json({ error: "Failed to load read receipts" });
  }
});


export default router;

import { eq } from "drizzle-orm";
import { db } from "../index";
import { studentsTable } from "../schema/students";
import { groupsTable } from "../schema/groups";
import { usersTable } from "../schema/users";

export async function getBranchIdFromStudent(studentId: number | null | undefined): Promise<number | null> {
  if (!studentId) return null;
  const [student] = await db
    .select({ branchId: studentsTable.branchId })
    .from(studentsTable)
    .where(eq(studentsTable.id, studentId));
  return student?.branchId ?? null;
}

export async function getBranchIdFromGroup(groupId: number | null | undefined): Promise<number | null> {
  if (!groupId) return null;
  const [group] = await db
    .select({ branchId: groupsTable.branchId })
    .from(groupsTable)
    .where(eq(groupsTable.id, groupId));
  return group?.branchId ?? null;
}

export async function getBranchIdFromUser(userId: number | null | undefined): Promise<number | null> {
  if (!userId) return null;
  const [user] = await db
    .select({ branchId: usersTable.branchId })
    .from(usersTable)
    .where(eq(usersTable.id, userId));
  return user?.branchId ?? null;
}

export function getBranchScope(userRole: string, userBranchId: number | null | undefined): number | null {
  if (userRole === "branch_manager") {
    return userBranchId ?? -1;
  }
  return null;
}

export function isBranchManager(user: { role?: string }): boolean {
  return user?.role === "branch_manager";
}

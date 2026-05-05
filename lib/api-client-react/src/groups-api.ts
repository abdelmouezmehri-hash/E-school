import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "./custom-fetch";

export type AttendanceStatus = "present" | "absent" | "late";

export interface GroupStudent {
  id: number;
  name: string;
  profilePicture: string | null;
  dateOfBirth: string | null;
  behavioralFlags: string[];
  createdAt: string;
  latestSpeaking: number | null;
  latestConfidence: number | null;
  latestParticipation: number | null;
  needsAttention: boolean;
}

export interface SessionAttendanceRecord {
  studentId: number;
  status: AttendanceStatus;
  speakingScore?: number | null;
  confidenceScore?: number | null;
  participationScore?: number | null;
  behavioralNotes?: string | null;
  curriculumProgress?: string | null;
  reportScore?: number | null;
}

export interface GroupSession {
  id: number;
  groupId: number;
  teacherId: number | null;
  psychologistId: number | null;
  sessionDate: string;
  sessionType: string | null;
  lessonTitle: string | null;
  notes: string | null;
  nextGoal: string | null;
  sessionOutcome: string | null;
  reportStatus: string;
  createdAt: string;
  attendance: SessionAttendanceRecord[];
}

export interface PlannedSession {
  id: number;
  groupId: number;
  teacherId: number | null;
  psychologistId: number | null;
  psychologistName: string | null;
  sessionDate: string;
  sessionTime: string | null;
  sessionType: string | null;
  sessionKind: string | null;
  lessonTitle: string | null;
  notes: string | null;
  status: string;
  createdAt: string;
}

export interface Group {
  id: number;
  name: string;
  teacherId: number | null;
  teacherName: string | null;
  levelId: number | null;
  levelName: string | null;
  schedule: string | null;
  maxStudents: number | null;
  nextSessionGoal: string | null;
  studentCount: number;
  startDate: string | null;
  recurringDays: number[] | null;
  sessionStartTime: string | null;
  sessionDurationMins: number | null;
  createdAt: string;
}

export interface GroupDetail extends Group {
  teacherEmail: string | null;
  levelDurationWeeks: number | null;
  students: GroupStudent[];
  sessions: GroupSession[];
  plannedSessions: PlannedSession[];
}

export interface CreateGroupBody {
  name: string;
  teacherId?: number;
  levelId?: number;
  schedule?: string;
  maxStudents?: number;
  nextSessionGoal?: string;
  startDate?: string;
  recurringDays?: number[];
  sessionStartTime?: string;
  sessionDurationMins?: number;
}

export interface UpdateGroupBody {
  name?: string;
  teacherId?: number;
  levelId?: number;
  schedule?: string;
  maxStudents?: number;
  nextSessionGoal?: string;
  startDate?: string;
  recurringDays?: number[];
  sessionStartTime?: string;
  sessionDurationMins?: number;
}

export interface CreateSessionBody {
  sessionDate: string;
  lessonTitle?: string;
  notes?: string;
  sessionGoal?: string;
  sessionOutcome?: string;
  nextGoal?: string;
  sessionMode?: "clinical" | "developmental" | "linguistic";
  attendance?: SessionAttendanceRecord[];
  sessionKind?: "regular" | "support" | "makeup" | "intervention";
}

export interface TeacherPayment {
  id: number;
  teacherId: number;
  amount: number;
  period: string;
  status: "pending" | "paid";
  note: string | null;
  createdAt: string;
  paidAt: string | null;
}

export interface TeacherEarnings {
  teacher: {
    id: number;
    name: string;
    email: string;
    paymentType: "per_session" | "monthly" | null;
    payPerSession: number;
    monthlySalary: number;
  };
  sessionCount: number;
  regularSessionCount?: number;
  interventionSessionCount?: number;
  adhocSessionCount?: number;
  totalEarned: number;
  totalPaid: number;
  totalPending: number;
  balance: number;
  payments: TeacherPayment[];
  sessions: Array<{ id: number; sessionDate: string; groupId: number }>;
}

// ── LIST GROUPS ──────────────────────────────────────────────────────────────

export const listGroupsQueryKey = () => ["/api/groups"] as const;

export const useListGroups = () =>
  useQuery({
    queryKey: listGroupsQueryKey(),
    queryFn: () => customFetch<Group[]>("/api/groups"),
  });

// ── GET GROUP ────────────────────────────────────────────────────────────────

export const getGroupQueryKey = (id: number) => [`/api/groups/${id}`] as const;

export const useGetGroup = (id: number, options?: { query?: { enabled?: boolean } }) =>
  useQuery({
    queryKey: getGroupQueryKey(id),
    queryFn: () => customFetch<GroupDetail>(`/api/groups/${id}`),
    enabled: options?.query?.enabled ?? true,
  });

// ── CREATE GROUP ─────────────────────────────────────────────────────────────

export const useCreateGroup = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateGroupBody) =>
      customFetch<Group>("/api/groups", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: listGroupsQueryKey() }),
  });
};

// ── UPDATE GROUP ─────────────────────────────────────────────────────────────

export const useUpdateGroup = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateGroupBody }) =>
      customFetch<Group>(`/api/groups/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    onSuccess: (_r, { id }) => {
      qc.invalidateQueries({ queryKey: listGroupsQueryKey() });
      qc.invalidateQueries({ queryKey: getGroupQueryKey(id) });
    },
  });
};

// ── DELETE GROUP ─────────────────────────────────────────────────────────────

export const useDeleteGroup = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      customFetch<{ message: string }>(`/api/groups/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: listGroupsQueryKey() }),
  });
};

// ── ADD STUDENT TO GROUP ─────────────────────────────────────────────────────

export const useAddStudentToGroup = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ groupId, studentId }: { groupId: number; studentId: number }) =>
      customFetch<{ message: string }>(`/api/groups/${groupId}/students`, {
        method: "POST",
        body: JSON.stringify({ studentId }),
      }),
    onSuccess: (_r, { groupId }) =>
      qc.invalidateQueries({ queryKey: getGroupQueryKey(groupId) }),
  });
};

// ── REMOVE STUDENT FROM GROUP ────────────────────────────────────────────────

export const useRemoveStudentFromGroup = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ groupId, studentId }: { groupId: number; studentId: number }) =>
      customFetch<{ message: string }>(`/api/groups/${groupId}/students/${studentId}`, {
        method: "DELETE",
      }),
    onSuccess: (_r, { groupId }) =>
      qc.invalidateQueries({ queryKey: getGroupQueryKey(groupId) }),
  });
};

// ── CREATE SESSION ───────────────────────────────────────────────────────────

export const useCreateSession = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ groupId, data }: { groupId: number; data: CreateSessionBody }) =>
      customFetch<GroupSession>(`/api/groups/${groupId}/sessions`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: (_r, { groupId }) =>
      qc.invalidateQueries({ queryKey: getGroupQueryKey(groupId) }),
  });
};

// ── SCHEDULE SESSIONS ────────────────────────────────────────────────────────

export interface ScheduleSessionsBody {
  sessionDate: string;
  sessionTime?: string;
  sessionType?: "regular" | "support" | "makeup" | "workshop";
  lessonTitle?: string;
  notes?: string;
  repeatWeeks?: number;
  deliveredByPsychologist?: boolean;
}

export const useScheduleSessions = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ groupId, data }: { groupId: number; data: ScheduleSessionsBody }) =>
      customFetch<{ created: PlannedSession[]; count: number }>(`/api/groups/${groupId}/schedule-sessions`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: (_r, { groupId }) =>
      qc.invalidateQueries({ queryKey: getGroupQueryKey(groupId) }),
  });
};

// ── CANCEL PLANNED SESSION ───────────────────────────────────────────────────

export const useCancelSession = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ sessionId, groupId }: { sessionId: number; groupId: number }) =>
      customFetch<{ message: string }>(`/api/sessions/${sessionId}`, {
        method: "DELETE",
      }),
    onSuccess: (_r, { groupId }) =>
      qc.invalidateQueries({ queryKey: getGroupQueryKey(groupId) }),
  });
};

// ── UPDATE SESSION REPORT ────────────────────────────────────────────────────

export interface UpdateSessionReportBody {
  sessionOutcome?: string;
  nextGoal?: string;
  reportStatus?: "none" | "draft" | "published";
  studentReports?: Array<{ studentId: number; note?: string | null; score?: number | null }>;
}

export const useUpdateSessionReport = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ sessionId, data }: { sessionId: number; data: UpdateSessionReportBody }) =>
      customFetch<GroupSession>(`/api/sessions/${sessionId}/report`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["groups"] });
    },
  });
};

// ── UPDATE STUDENT PROFILE FIELDS ────────────────────────────────────────────

export const useUpdateStudentProfile = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: {
        profilePicture?: string | null;
        medicalIssues?: string | null;
        learningDisabilities?: string | null;
        preferredTeachingMethod?: string | null;
        notes?: string | null;
      };
    }) =>
      customFetch<unknown>(`/api/students/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    onSuccess: (_r, { id }) => {
      qc.invalidateQueries({ queryKey: [`/api/students/${id}`] });
      qc.invalidateQueries({ queryKey: ["/api/students"] });
    },
  });
};

// ── MY EARNINGS ───────────────────────────────────────────────────────────────

export const myEarningsQueryKey = () => ["/api/earnings/my"] as const;

export const useGetMyEarnings = () =>
  useQuery({
    queryKey: myEarningsQueryKey(),
    queryFn: () => customFetch<TeacherEarnings>("/api/earnings/my"),
  });

// ── TEACHER EARNINGS (ADMIN) ──────────────────────────────────────────────────

export const teacherEarningsQueryKey = (teacherId: number) =>
  [`/api/earnings/teachers/${teacherId}`] as const;

export const useGetTeacherEarnings = (teacherId: number, options?: { query?: { enabled?: boolean } }) =>
  useQuery({
    queryKey: teacherEarningsQueryKey(teacherId),
    queryFn: () => customFetch<TeacherEarnings>(`/api/earnings/teachers/${teacherId}`),
    enabled: options?.query?.enabled ?? true,
  });

// ── LIST TEACHER PAYMENTS ─────────────────────────────────────────────────────

export const teacherPaymentsQueryKey = (teacherId?: number) =>
  teacherId ? [`/api/teacher-payments?teacherId=${teacherId}`] : ["/api/teacher-payments"] as const;

export const useListTeacherPayments = (teacherId?: number) =>
  useQuery({
    queryKey: teacherPaymentsQueryKey(teacherId),
    queryFn: () =>
      customFetch<TeacherPayment[]>(
        teacherId ? `/api/teacher-payments?teacherId=${teacherId}` : "/api/teacher-payments"
      ),
  });

// ── CREATE TEACHER PAYMENT ────────────────────────────────────────────────────

export const useCreateTeacherPayment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { teacherId: number; amount: number; period: string; status?: string; note?: string }) =>
      customFetch<TeacherPayment>("/api/teacher-payments", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/teacher-payments"] });
      qc.invalidateQueries({ queryKey: ["/api/earnings/my"] });
    },
  });
};

// ── MARK TEACHER PAYMENT PAID ─────────────────────────────────────────────────

export const useMarkTeacherPaymentPaid = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      customFetch<TeacherPayment>(`/api/teacher-payments/${id}/mark-paid`, {
        method: "PUT",
        body: JSON.stringify({}),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/teacher-payments"] });
      qc.invalidateQueries({ queryKey: ["/api/earnings/my"] });
    },
  });
};

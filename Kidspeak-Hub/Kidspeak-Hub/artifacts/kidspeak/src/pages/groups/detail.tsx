import { useState, useEffect } from "react";
import { useParams, Link, useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  useGetGroup,
  useGetMe,
  useCreateSession,
  useScheduleSessions,
  useCancelSession,
  useUpdateGroup,
  useAddStudentToGroup,
  useRemoveStudentFromGroup,
  useListStudents,
  type GroupStudent,
  type AttendanceStatus,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLanguage } from "@/contexts/language-context";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Users,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  CalendarClock,
  Target,
  ClipboardList,
  UserMinus,
  UserPlus,
  ChevronDown,
  ChevronUp,
  BrainCircuit,
  Trash2,
  Clock,
  Pencil,
  BookOpen,
  ArrowRight,
  BarChart2,
  Flag,
  CheckSquare,
} from "lucide-react";
import { format } from "date-fns";

function safeFmt(dateStr: string | null | undefined, fmt: string): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return String(dateStr);
  return format(d, fmt);
}

// ── Attendance Toggle ──────────────────────────────────────────────────────────
function AttendanceToggle({
  status,
  onChange,
  t,
}: {
  status: AttendanceStatus;
  onChange: (s: AttendanceStatus) => void;
  t: any;
}) {
  const statuses: AttendanceStatus[] = ["present", "absent", "late"];
  const colors: Record<AttendanceStatus, string> = {
    present: "bg-emerald-100 text-emerald-700 border-emerald-300",
    absent: "bg-red-100 text-red-700 border-red-300",
    late: "bg-amber-100 text-amber-700 border-amber-300",
  };
  return (
    <div className="flex gap-1">
      {statuses.map((s) => (
        <button
          key={s}
          onClick={() => onChange(s)}
          className={`px-2 py-0.5 rounded border text-xs font-medium transition-all ${
            status === s ? colors[s] : "bg-background text-muted-foreground border-border hover:bg-muted"
          }`}
        >
          {t.groups[s]}
        </button>
      ))}
    </div>
  );
}

// ── Student eval state ─────────────────────────────────────────────────────────
interface StudentEvalState {
  status: AttendanceStatus;
  speakingScore: number;
  confidenceScore: number;
  participationScore: number;
  behavioralNotes: string;
  curriculumProgress: string;
  expanded: boolean;
  commExpanded: boolean;
  verbalFluency: number;
  verbalClarity: number;
  verbalVocabulary: number;
  nonverbalEyeContact: number;
  nonverbalBodyLanguage: number;
  nonverbalFacialExpressions: number;
}

// ── Score Slider ───────────────────────────────────────────────────────────────
function ScoreSlider({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-xs font-bold w-5 text-end" style={{ color: "#1B2E8F" }}>{value}</span>
      </div>
      <Slider
        min={1}
        max={10}
        step={1}
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        className="w-full"
      />
    </div>
  );
}

// ── Session Card ───────────────────────────────────────────────────────────────
function SessionsTable({
  sessions,
  groupStudents,
  canEdit,
  onEdit,
  t,
  isAdmin,
  groupId,
  navigate,
}: {
  sessions: any[];
  groupStudents: any[];
  canEdit: boolean;
  onEdit: (session: any) => void;
  t: any;
  isAdmin: boolean;
  groupId: number;
  navigate: (path: string) => void;
}) {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const modeStyle = (mode: string) => {
    if (mode === "clinical") return "bg-violet-100 text-violet-700";
    if (mode === "developmental") return "bg-blue-100 text-blue-700";
    if (mode === "linguistic") return "bg-emerald-100 text-emerald-700";
    return "bg-gray-100 text-gray-600";
  };

  const modeLabel = (mode: string) => {
    if (mode === "clinical") return t.groups.sessionModes.clinical;
    if (mode === "developmental") return t.groups.sessionModes.developmental;
    if (mode === "linguistic") return t.groups.sessionModes.linguistic;
    return mode;
  };

  return (
    <div className="rounded-xl border overflow-hidden shadow-sm">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr style={{ backgroundColor: "#1B2E8F" }} className="text-white text-xs">
            <th className="py-2.5 px-3 font-semibold text-center w-10">#</th>
            <th className="py-2.5 px-3 font-semibold text-start">التاريخ</th>
            <th className="py-2.5 px-3 font-semibold text-start">عنوان الدرس</th>
            <th className="py-2.5 px-3 font-semibold text-center">النمط</th>
            <th className="py-2.5 px-3 font-semibold text-center">الحضور</th>
            <th className="py-2.5 px-3 font-semibold text-center">المعدّل</th>
            {!isAdmin && <th className="px-3 py-2 text-xs font-semibold text-muted-foreground text-right">تقرير</th>}
            {canEdit && <th className="w-8"></th>}
          </tr>
        </thead>
        {sessions.map((session: any, index: number) => {
          const sessionNum = sessions.length - index;
          const isExpanded = expandedId === session.id;
          const isIntervention = session.sessionKind === "intervention";
          const accentColor = isIntervention ? "#7c3aed" : "#F5A600";

          const presentCount = session.attendance.filter((a: any) => a.status === "present").length;
          const absentCount = session.attendance.filter((a: any) => a.status === "absent").length;
          const lateCount = session.attendance.filter((a: any) => a.status === "late").length;

          return (
            <tbody key={session.id} className="border-b last:border-b-0">
              <tr
                className={`cursor-pointer transition-colors ${isExpanded ? "bg-slate-50" : index % 2 === 0 ? "bg-white hover:bg-slate-50" : "bg-gray-50/60 hover:bg-slate-50"}`}
                onClick={() => setExpandedId(isExpanded ? null : session.id)}
              >
                <td className="py-3 px-3 text-center">
                  <span className="text-xs font-black" style={{ color: accentColor }}>
                    #{String(sessionNum).padStart(2, "0")}
                  </span>
                </td>

                <td className="py-3 px-3 whitespace-nowrap">
                  <span className="text-xs text-gray-500">
                    {safeFmt(session.sessionDate, "MMM d, yyyy")}
                  </span>
                </td>

                <td className="py-3 px-3 max-w-[180px]">
                  <span className="font-medium text-gray-800 text-sm block truncate">
                    {session.lessonTitle || <span className="text-gray-300 font-normal">—</span>}
                  </span>
                </td>

                <td className="py-3 px-3 text-center">
                  {session.sessionMode ? (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${modeStyle(session.sessionMode)}`}>
                      {modeLabel(session.sessionMode)}
                    </span>
                  ) : (
                    <span className="text-gray-300 text-xs">—</span>
                  )}
                </td>

                <td className="py-3 px-3">
                  <div className="flex items-center justify-center gap-1">
                    {presentCount > 0 && (
                      <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-bold">✓{presentCount}</span>
                    )}
                    {absentCount > 0 && (
                      <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-bold">✗{absentCount}</span>
                    )}
                    {lateCount > 0 && (
                      <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-bold">⏱{lateCount}</span>
                    )}
                  </div>
                </td>

                <td className="py-3 px-3">
                  <div className="flex items-center justify-center gap-1">
                    {session.avgSpeaking != null && (
                      <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold">S:{session.avgSpeaking}</span>
                    )}
                    {session.avgConfidence != null && (
                      <span className="text-[10px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded font-bold">C:{session.avgConfidence}</span>
                    )}
                    {session.avgParticipation != null && (
                      <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-bold">P:{session.avgParticipation}</span>
                    )}
                    {session.avgSpeaking == null && session.avgConfidence == null && session.avgParticipation == null && (
                      <span className="text-gray-300 text-xs">—</span>
                    )}
                  </div>
                </td>

                {!isAdmin && (
                  <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                    {(session as any).reportStatus === "published" ? (
                      <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-600">
                        ✓ مكتمل
                      </span>
                    ) : (
                      <button
                        onClick={() => navigate(`/groups/${groupId}/sessions/${session.id}/report`)}
                        className="inline-flex items-center gap-1 rounded-lg border border-dashed border-amber-300 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700 hover:bg-amber-400 hover:text-white hover:border-amber-400 transition-colors"
                      >
                        📝 تقرير
                      </button>
                    )}
                  </td>
                )}
                {canEdit && (
                  <td className="py-3 px-2" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => onEdit(session)}
                      className="p-1.5 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-700 transition-colors"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                  </td>
                )}
              </tr>

              {isExpanded && (
                <tr>
                  <td colSpan={canEdit ? 7 : (!isAdmin ? 7 : 6)} className="bg-slate-50 border-t px-4 py-3">
                    {(session.sessionGoal || session.sessionOutcome || session.notes || session.nextGoal) && (
                      <div className="grid grid-cols-2 gap-2 mb-3">
                        {session.sessionGoal && (
                          <div className="rounded-lg bg-blue-50 border border-blue-100 px-3 py-2">
                            <div className="flex items-center gap-1 mb-1">
                              <Target className="w-3 h-3 text-blue-600" />
                              <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wide">{t.groups.goalLabel}</span>
                            </div>
                            <p className="text-xs text-gray-700 leading-relaxed">{session.sessionGoal}</p>
                          </div>
                        )}
                        {session.sessionOutcome && (
                          <div className="rounded-lg bg-emerald-50 border border-emerald-100 px-3 py-2">
                            <div className="flex items-center gap-1 mb-1">
                              <CheckSquare className="w-3 h-3 text-emerald-600" />
                              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wide">{t.groups.outcomeLabel}</span>
                            </div>
                            <p className="text-xs text-gray-700 leading-relaxed">{session.sessionOutcome}</p>
                          </div>
                        )}
                        {session.nextGoal && (
                          <div className="rounded-lg border px-3 py-2" style={{ backgroundColor: "#FFF8E8", borderColor: "#F5A60040" }}>
                            <div className="flex items-center gap-1 mb-1">
                              <Flag className="w-3 h-3" style={{ color: "#F5A600" }} />
                              <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: "#b37800" }}>{t.groups.nextSessionGoalLabel}</span>
                            </div>
                            <p className="text-xs text-gray-700 leading-relaxed">{session.nextGoal}</p>
                          </div>
                        )}
                        {session.notes && (
                          <div className="rounded-lg bg-gray-100 border border-gray-200 px-3 py-2">
                            <p className="text-xs text-gray-500 italic">"{session.notes}"</p>
                          </div>
                        )}
                      </div>
                    )}

                    {session.attendance.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {session.attendance.map((a: any) => {
                          const student = groupStudents.find((s: any) => s.id === a.studentId);
                          if (!student) return null;
                          const cls = a.status === "absent"
                            ? "bg-red-50 border-red-200 text-red-700"
                            : a.status === "late"
                            ? "bg-amber-50 border-amber-200 text-amber-700"
                            : "bg-emerald-50 border-emerald-200 text-emerald-700";
                          return (
                            <div key={a.studentId} className={`rounded-lg border px-2.5 py-1.5 text-xs flex items-center gap-2 ${cls}`}>
                              <span className="font-semibold">{student.name}</span>
                              {a.status !== "absent" && a.speakingScore != null && (
                                <span className="opacity-60 font-mono">
                                  {a.speakingScore}/{a.confidenceScore}/{a.participationScore}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          );
        })}
      </table>
    </div>
  );
}

// ── Edit student state for edit dialog ────────────────────────────────────────
interface EditStudentState {
  status: AttendanceStatus;
  speakingScore: number;
  confidenceScore: number;
  participationScore: number;
  behavioralNotes: string;
  expanded: boolean;
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function GroupDetail() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const groupId = parseInt(id || "0");
  const { t, isRTL: isAr } = useLanguage();
  const { toast } = useToast();

  const { data: currentUser } = useGetMe();
  const { data: group, isLoading, refetch } = useGetGroup(groupId, { query: { enabled: !!groupId } });
  const { data: allStudents = [] } = useListStudents();
  const { mutate: createSession, isPending: isSavingSession } = useCreateSession();
  const { mutate: scheduleSessions, isPending: isScheduling } = useScheduleSessions();
  const { mutate: cancelSession, isPending: isCancelling } = useCancelSession();
  const { mutate: updateGroup } = useUpdateGroup();
  const { mutate: addStudent } = useAddStudentToGroup();
  const { mutate: removeStudent } = useRemoveStudentFromGroup();

  const isPsychologist = currentUser?.role === "psychologist";
  const isAdmin = currentUser?.role === "admin";
  const isTeacher = currentUser?.role === "teacher";
  const canAddRegularSession = isAdmin || isTeacher;
  const canEdit = isAdmin || isTeacher;

  useEffect(() => {
    if (isPsychologist) setSessionTab("psychological")
    else if (isTeacher) setSessionTab("academic")
  }, [isPsychologist, isTeacher])

  // ── Create Session State ──────────────────────────────────────────────────
  const [isSessionOpen, setIsSessionOpen] = useState(false);
  const [sessionMode, setSessionMode] = useState<"" | "clinical" | "developmental" | "linguistic">("");
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split("T")[0]);
  const [lessonTitle, setLessonTitle] = useState("");
  const [sessionNotes, setSessionNotes] = useState("");
  const [sessionGoal, setSessionGoal] = useState("");
  const [sessionOutcome, setSessionOutcome] = useState("");
  const [nextGoal, setNextGoal] = useState("");
  const [evalState, setEvalState] = useState<Record<number, StudentEvalState>>({});

  // ── Edit Session State ────────────────────────────────────────────────────
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editingSession, setEditingSession] = useState<any>(null);
  const [editLessonTitle, setEditLessonTitle] = useState("");
  const [editSessionGoal, setEditSessionGoal] = useState("");
  const [editSessionOutcome, setEditSessionOutcome] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editNextGoal, setEditNextGoal] = useState("");
  const [editAttendance, setEditAttendance] = useState<Record<number, EditStudentState>>({});

  // ── Schedule State ────────────────────────────────────────────────────────
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [schedDate, setSchedDate] = useState(new Date().toISOString().split("T")[0]);
  const [schedTime, setSchedTime] = useState("");
  const [schedType, setSchedType] = useState<"regular" | "support" | "makeup" | "workshop">("regular");
  const [schedTitle, setSchedTitle] = useState("");
  const [schedNotes, setSchedNotes] = useState("");
  const [schedRepeat, setSchedRepeat] = useState(1);

  // ── Intervention Session State ────────────────────────────────────────────
  const [isInterventionOpen, setIsInterventionOpen] = useState(false);
  const [interventionDate, setInterventionDate] = useState(new Date().toISOString().split("T")[0]);
  const [interventionNotes, setInterventionNotes] = useState("");
  const [isSavingIntervention, setIsSavingIntervention] = useState(false);
  const [interventionAttendance, setInterventionAttendance] = useState<Record<number, AttendanceStatus>>({});
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [nextGoalEdit, setNextGoalEdit] = useState("");
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [addStudentSearch, setAddStudentSearch] = useState("");
  const [showAllStudents, setShowAllStudents] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<number>>(new Set());
  const [isBulkAdding, setIsBulkAdding] = useState(false);

  // ── Session tab ──────────────────────────────────────────────────────────
  const [sessionTab, setSessionTab] = useState<"academic" | "psychological">("academic");

  // ── Support Sessions State ────────────────────────────────────────────────
  const qc = useQueryClient();
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [supportDate, setSupportDate] = useState(new Date().toISOString().split("T")[0]);
  const [supportTime, setSupportTime] = useState("");
  const [supportTopic, setSupportTopic] = useState("");
  const [supportTeacherNote, setSupportTeacherNote] = useState("");
  const [isSavingSupport, setIsSavingSupport] = useState(false);
  const [deletingSupport, setDeletingSupport] = useState<number | null>(null);

  const { data: supportSessions = [], refetch: refetchSupport } = useQuery<any[]>({
    queryKey: ["support-sessions-group", groupId],
    queryFn: () =>
      fetch(`/api/support-sessions/for-group/${groupId}`, { credentials: "include" }).then(r => r.ok ? r.json() : []),
    enabled: !!groupId,
  });

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleAddSupportSession = async () => {
    if (!supportTopic.trim() || !supportDate) return;
    setIsSavingSupport(true);
    try {
      const res = await fetch("/api/support-sessions", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId,
          sessionDate: supportDate,
          sessionTime: supportTime || null,
          topic: supportTopic.trim(),
          teacherNote: supportTeacherNote.trim() || null,
        }),
      });
      if (!res.ok) throw new Error();
      toast({ title: t.groups.groupSupportAdded });
      setIsSupportOpen(false);
      setSupportTopic("");
      setSupportTeacherNote("");
      setSupportTime("");
      refetchSupport();
    } catch {
      toast({ title: "Error", variant: "destructive" });
    } finally {
      setIsSavingSupport(false);
    }
  };

  const handleDeleteSupportSession = async (id: number) => {
    setDeletingSupport(id);
    try {
      const res = await fetch(`/api/support-sessions/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error();
      toast({ title: t.groups.groupSupportDeleted });
      refetchSupport();
    } catch {
      toast({ title: "Error", variant: "destructive" });
    } finally {
      setDeletingSupport(null);
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">{t.groups.loadingGroups}</div>;
  }
  if (!group) {
    return <div className="p-8 text-center text-destructive">Group not found</div>;
  }

  const levelWeeks = group.levelDurationWeeks ?? 8;
  const curriculumOptions = Array.from({ length: levelWeeks }, (_, i) => `Lesson ${i + 1} of ${levelWeeks}`);

  const groupStudentIds = new Set(group.students.map((s) => s.id));
  const searchLower = addStudentSearch.toLowerCase();
  const unassignedStudents = allStudents.filter(
    (s: any) => !groupStudentIds.has(s.id) && !s.currentGroupId && s.name.toLowerCase().includes(searchLower)
  );
  const inOtherGroupStudents = allStudents.filter(
    (s: any) => !groupStudentIds.has(s.id) && s.currentGroupId && s.name.toLowerCase().includes(searchLower)
  );
  const displayedStudents = showAllStudents
    ? [...unassignedStudents, ...inOtherGroupStudents]
    : unassignedStudents;

  const openIntervention = () => {
    const init: Record<number, AttendanceStatus> = {};
    group.students.forEach((s) => { init[s.id] = "present"; });
    setInterventionAttendance(init);
    setInterventionDate(new Date().toISOString().split("T")[0]);
    setInterventionNotes("");
    setIsInterventionOpen(true);
  };

  const handleSaveIntervention = async () => {
    setIsSavingIntervention(true);
    try {
      const attendance = Object.entries(interventionAttendance).map(([sid, status]) => ({
        studentId: parseInt(sid),
        status,
      }));
      const res = await fetch(`/api/groups/${groupId}/sessions`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionDate: interventionDate,
          sessionKind: "intervention",
          attendance,
          notes: interventionNotes.trim() || undefined,
        }),
      });
      if (res.ok) {
        toast({ title: t.groups.sessionAdded });
        setIsInterventionOpen(false);
        refetch();
      } else {
        const err = await res.json().catch(() => ({}));
        toast({ title: "Error", description: err.error || "Failed to save session.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Network error.", variant: "destructive" });
    } finally {
      setIsSavingIntervention(false);
    }
  };

  const initEvalState = () => {
    const init: Record<number, StudentEvalState> = {};
    group.students.forEach((s) => {
      init[s.id] = {
        status: "present",
        speakingScore: s.latestSpeaking ?? 5,
        confidenceScore: s.latestConfidence ?? 5,
        participationScore: s.latestParticipation ?? 5,
        behavioralNotes: "",
        curriculumProgress: "",
        expanded: false,
        commExpanded: false,
        verbalFluency: 5,
        verbalClarity: 5,
        verbalVocabulary: 5,
        nonverbalEyeContact: 5,
        nonverbalBodyLanguage: 5,
        nonverbalFacialExpressions: 5,
      };
    });
    setEvalState(init);
  };

  const updateStudentEval = (studentId: number, updates: Partial<StudentEvalState>) => {
    setEvalState((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], ...updates },
    }));
  };

  const handleAddSession = () => {
    const attendanceList = Object.entries(evalState).map(([sid, state]) => ({
      studentId: parseInt(sid),
      status: state.status,
      speakingScore: state.status !== "absent" ? state.speakingScore : undefined,
      confidenceScore: state.status !== "absent" ? state.confidenceScore : undefined,
      participationScore: state.status !== "absent" ? state.participationScore : undefined,
      behavioralNotes: state.behavioralNotes || undefined,
      curriculumProgress: state.curriculumProgress || undefined,
      ...(state.status !== "absent" && state.commExpanded ? {
        verbalFluency: state.verbalFluency,
        verbalClarity: state.verbalClarity,
        verbalVocabulary: state.verbalVocabulary,
        nonverbalEyeContact: state.nonverbalEyeContact,
        nonverbalBodyLanguage: state.nonverbalBodyLanguage,
        nonverbalFacialExpressions: state.nonverbalFacialExpressions,
      } : {}),
    }));

    createSession(
      {
        groupId,
        data: {
          sessionDate,
          lessonTitle: lessonTitle.trim() || undefined,
          notes: sessionNotes.trim() || undefined,
          sessionGoal: sessionGoal.trim() || undefined,
          sessionOutcome: sessionOutcome.trim() || undefined,
          nextGoal: nextGoal.trim() || undefined,
          sessionMode: sessionMode || undefined,
          attendance: attendanceList,
        },
      },
      {
        onSuccess: () => {
          toast({ title: t.groups.sessionAdded });
          setIsSessionOpen(false);
          setLessonTitle("");
          setSessionNotes("");
          setSessionGoal("");
          setSessionOutcome("");
          setNextGoal("");
          setSessionMode("");
          setEvalState({});
          refetch();
        },
        onError: () => toast({ title: "Error", description: "Failed to save session.", variant: "destructive" }),
      }
    );
  };

  // ── Open Edit Dialog ───────────────────────────────────────────────────────
  const openEdit = (session: any) => {
    setEditingSession(session);
    setEditLessonTitle(session.lessonTitle || "");
    setEditSessionGoal(session.sessionGoal || "");
    setEditSessionOutcome(session.sessionOutcome || "");
    setEditNotes(session.notes || "");
    setEditNextGoal(session.nextGoal || "");
    // Pre-fill attendance from session
    const init: Record<number, EditStudentState> = {};
    for (const a of session.attendance) {
      init[a.studentId] = {
        status: a.status,
        speakingScore: a.speakingScore ?? 5,
        confidenceScore: a.confidenceScore ?? 5,
        participationScore: a.participationScore ?? 5,
        behavioralNotes: a.behavioralNotes ?? "",
        expanded: false,
      };
    }
    // Students not in attendance yet
    group.students.forEach((s: any) => {
      if (!init[s.id]) {
        init[s.id] = { status: "present", speakingScore: 5, confidenceScore: 5, participationScore: 5, behavioralNotes: "", expanded: false };
      }
    });
    setEditAttendance(init);
    setIsEditOpen(true);
  };

  const updateEditAttendance = (studentId: number, updates: Partial<EditStudentState>) => {
    setEditAttendance(prev => ({ ...prev, [studentId]: { ...prev[studentId], ...updates } }));
  };

  const handleSaveEdit = async () => {
    if (!editingSession) return;
    setIsSavingEdit(true);
    try {
      const attendanceList = Object.entries(editAttendance).map(([sid, state]) => ({
        studentId: parseInt(sid),
        status: state.status,
        speakingScore: state.status !== "absent" ? state.speakingScore : null,
        confidenceScore: state.status !== "absent" ? state.confidenceScore : null,
        participationScore: state.status !== "absent" ? state.participationScore : null,
        behavioralNotes: state.behavioralNotes || null,
      }));

      const res = await fetch(`/api/sessions/${editingSession.id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lessonTitle: editLessonTitle.trim() || null,
          sessionGoal: editSessionGoal.trim() || null,
          sessionOutcome: editSessionOutcome.trim() || null,
          notes: editNotes.trim() || null,
          nextGoal: editNextGoal.trim() || null,
          attendance: attendanceList,
        }),
      });
      if (!res.ok) throw new Error();
      toast({ title: t.groups.groupUpdated });
      setIsEditOpen(false);
      refetch();
    } catch {
      toast({ title: "Error", description: "Failed to save edits.", variant: "destructive" });
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleSaveGoal = () => {
    updateGroup(
      { id: groupId, data: { nextSessionGoal: nextGoalEdit } },
      {
        onSuccess: () => {
          toast({ title: t.groups.groupUpdated });
          setIsEditingGoal(false);
          refetch();
        },
      }
    );
  };

  const handleAddStudent = (studentId: number) => {
    addStudent(
      { groupId, studentId },
      {
        onSuccess: () => { refetch(); setIsAddStudentOpen(false); setAddStudentSearch(""); },
        onError: () => toast({ title: "Error", description: "Failed to add student.", variant: "destructive" }),
      }
    );
  };

  const toggleSelectStudent = (id: number) => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleBulkAddStudents = async () => {
    if (selectedStudentIds.size === 0) return;
    setIsBulkAdding(true);
    const ids = Array.from(selectedStudentIds);
    let success = 0;
    for (const studentId of ids) {
      await new Promise<void>((resolve) =>
        addStudent({ groupId, studentId }, { onSuccess: () => { success++; resolve(); }, onError: () => resolve() })
      );
    }
    setIsBulkAdding(false);
    refetch();
    setIsAddStudentOpen(false);
    setAddStudentSearch("");
    setSelectedStudentIds(new Set());
    setShowAllStudents(false);
    toast({ title: `${success} student${success !== 1 ? "s" : ""} added to group.` });
  };

  const handleRemoveStudent = (studentId: number) => {
    removeStudent(
      { groupId, studentId },
      {
        onSuccess: () => { refetch(); },
        onError: () => toast({ title: "Error", description: "Failed to remove student.", variant: "destructive" }),
      }
    );
  };

  const openSchedule = () => {
    setSchedDate(new Date().toISOString().split("T")[0]);
    setSchedTime("");
    setSchedType(isPsychologist ? "support" : "regular");
    setSchedTitle("");
    setSchedNotes("");
    setSchedRepeat(1);
    setIsScheduleOpen(true);
  };

  const handleSchedule = () => {
    scheduleSessions(
      {
        groupId,
        data: {
          sessionDate: schedDate,
          sessionTime: schedTime || undefined,
          sessionType: schedType,
          lessonTitle: schedTitle || undefined,
          notes: schedNotes || undefined,
          repeatWeeks: schedRepeat,
          deliveredByPsychologist: isPsychologist,
        },
      },
      {
        onSuccess: (res) => {
          toast({
            title: schedRepeat > 1 ? t.groups.bulkScheduled.replace("{n}", String(res.count)) : t.groups.sessionScheduled,
          });
          setIsScheduleOpen(false);
          refetch();
        },
        onError: () => toast({ title: "Error", description: "Failed to schedule sessions.", variant: "destructive" }),
      }
    );
  };

  const handleCancelSession = (sessionId: number) => {
    cancelSession(
      { sessionId, groupId },
      {
        onSuccess: () => { toast({ title: t.groups.sessionCancelled }); refetch(); },
        onError: () => toast({ title: "Error", description: "Failed to cancel session.", variant: "destructive" }),
      }
    );
  };

  const flaggedStudents = group.students.filter((s) => s.needsAttention);

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-4">
        <Link href="/groups">
          <Button variant="ghost" size="icon" className="shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold tracking-tight truncate">{group.name}</h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {group.levelName && <Badge variant="outline">{group.levelName}</Badge>}
            {(group as any).psychologicalLevelName && (
              <Badge variant="outline" className="border-violet-300 text-violet-700 bg-violet-50 flex items-center gap-1">
                <BrainCircuit className="w-3 h-3" />
                {(group as any).psychologicalLevelName}
              </Badge>
            )}
            {group.schedule && (
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {group.schedule}
              </span>
            )}
            <span className="text-sm text-muted-foreground">
              <Users className="w-3.5 h-3.5 inline me-1" />
              {group.students.length} / {group.maxStudents}
            </span>
          </div>
        </div>
        <div className="flex gap-2 shrink-0 flex-wrap justify-end">
          {isPsychologist && (
            <>
              <Button
                variant="outline"
                className="font-semibold border-[#7c3aed] text-[#7c3aed] hover:bg-[#7c3aed]/10"
                onClick={() => { setSupportDate(new Date().toISOString().split("T")[0]); setSupportTime(""); setSupportTopic(""); setSupportTeacherNote(""); setIsSupportOpen(true); }}
              >
                <BrainCircuit className="w-4 h-4 me-2" />
                {t.groups.addGroupSupport}
              </Button>
              <Button
                variant="outline"
                className="font-semibold border-[#7c3aed] text-[#7c3aed] hover:bg-[#7c3aed]/10"
                onClick={openIntervention}
              >
                <Plus className="w-4 h-4 me-2" />
                {t.groups.addIntervention}
              </Button>
            </>
          )}
          {(isAdmin || isTeacher || isPsychologist) && (
            <Button
              variant="outline"
              className="font-semibold"
              style={{ borderColor: "#1B2E8F", color: "#1B2E8F" }}
              onClick={openSchedule}
            >
              <CalendarClock className="w-4 h-4 me-2" />
              {t.groups.scheduleSession}
            </Button>
          )}
          {canAddRegularSession && (
            <Button
              style={{ backgroundColor: "#F5A600", color: "#1B2E8F" }}
              className="font-semibold"
              onClick={() => { initEvalState(); setIsSessionOpen(true); }}
            >
              <Plus className="w-4 h-4 me-2" />
              {t.groups.addSession}
            </Button>
          )}
        </div>
      </div>

      {/* ── Main Grid ──────────────────────────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* ── Left: Students panel ─────────────────────────────────────────── */}
        <div className="lg:col-span-1 space-y-4">
          {/* Next Session Goal card */}
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="w-4 h-4" style={{ color: "#F5A600" }} />
                {t.groups.nextSessionGoal}
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => { setNextGoalEdit(group.nextSessionGoal || ""); setIsEditingGoal(true); }}
              >
                {t.groups.editSession || "Edit"}
              </Button>
            </CardHeader>
            <CardContent>
              {group.nextSessionGoal ? (
                <p className="text-sm">{group.nextSessionGoal}</p>
              ) : (
                <p className="text-sm text-muted-foreground italic">No goal set yet.</p>
              )}
            </CardContent>
          </Card>

          {/* Needs Attention */}
          {flaggedStudents.length > 0 && (
            <Card className="border-amber-200 bg-amber-50/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2 text-amber-700">
                  <AlertTriangle className="w-4 h-4" />
                  {t.groups.needsAttention}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {flaggedStudents.map((s) => (
                  <Link key={s.id} href={`/students/${s.id}`}>
                    <div className="flex items-center gap-2 p-2 rounded hover:bg-amber-100 cursor-pointer">
                      <div className="w-8 h-8 rounded-full bg-amber-200 flex items-center justify-center text-amber-800 font-semibold text-sm shrink-0">
                        {s.name[0]}
                      </div>
                      <span className="text-sm font-medium text-amber-900">{s.name}</span>
                    </div>
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}

          {/* All Students */}
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-4 h-4" style={{ color: "#1B2E8F" }} />
                {t.groups.students}
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => { setIsAddStudentOpen(true); setAddStudentSearch(""); }}
              >
                <UserPlus className="w-3.5 h-3.5 me-1" />
                {t.groups.addStudent}
              </Button>
            </CardHeader>
            <CardContent>
              {group.students.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t.groups.noStudents}</p>
              ) : (
                <div className="space-y-1.5">
                  {group.students.map((s) => (
                    <div key={s.id} className="flex items-center gap-2 group/row">
                      <div
                        className={`w-2 h-2 rounded-full shrink-0 ${s.needsAttention ? "bg-amber-400" : "bg-emerald-400"}`}
                      />
                      <Link href={`/students/${s.id}`} className="flex-1 min-w-0">
                        <span className="text-sm hover:underline cursor-pointer truncate block">{s.name}</span>
                      </Link>
                      <div className="flex items-center gap-1 opacity-0 group-hover/row:opacity-100 transition-opacity">
                        <span className="text-xs text-muted-foreground">
                          {s.latestConfidence !== null ? `C:${s.latestConfidence}` : ""}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-destructive"
                          onClick={() => handleRemoveStudent(s.id)}
                        >
                          <UserMinus className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Right: Session History ────────────────────────────────────────── */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 flex-wrap">
                <ClipboardList className="w-5 h-5" style={{ color: "#1B2E8F" }} />
                {t.groups.sessionHistory}
                <Badge className="ms-1 text-xs" style={{ backgroundColor: "#1B2E8F", color: "white" }}>
                  {group.sessions.length}
                </Badge>
              </CardTitle>
              {/* ── Tabs: only shown to admins when group has a psychological level ── */}
              {isAdmin && (group as any).psychologicalLevelName && (
                <div className="flex gap-1 mt-2">
                  <button
                    onClick={() => setSessionTab("academic")}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${sessionTab === "academic" ? "text-white" : "text-muted-foreground bg-muted hover:bg-muted/80"}`}
                    style={sessionTab === "academic" ? { backgroundColor: "#1B2E8F" } : {}}
                  >
                    <BookOpen className="w-3 h-3 inline me-1" />
                    {(t as any).groups?.academicSessions ?? "أكاديمية"}
                  </button>
                  <button
                    onClick={() => setSessionTab("psychological")}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${sessionTab === "psychological" ? "text-white" : "text-muted-foreground bg-muted hover:bg-muted/80"}`}
                    style={sessionTab === "psychological" ? { backgroundColor: "#7c3aed" } : {}}
                  >
                    <BrainCircuit className="w-3 h-3 inline me-1" />
                    {(t as any).groups?.psychSessions ?? "نفسية"}
                  </button>
                </div>
              )}
            </CardHeader>
            <CardContent>
              {(() => {
                const hasPsychLevel = !!(group as any).psychologicalLevelName;
                const visibleSessions = hasPsychLevel
                  ? group.sessions
                      .filter((s: any) =>
                        isAdmin
                          ? (sessionTab === "psychological" ? !!s.psychologistId : !s.psychologistId)
                          : isPsychologist
                            ? s.psychologistId === currentUser?.id
                            : !s.psychologistId
                      )
                      .filter((s: any) => isAdmin || s.sessionMode !== "clinical")
                  : group.sessions;

                if (visibleSessions.length === 0) return (
                  <div className="text-center py-12 text-muted-foreground">
                    <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p className="font-medium">{t.groups.noSessions}</p>
                    {sessionTab === "academic" && canAddRegularSession && (
                      <Button className="mt-4 font-semibold" style={{ backgroundColor: "#F5A600", color: "#1B2E8F" }}
                        onClick={() => { initEvalState(); setIsSessionOpen(true); }}>
                        <Plus className="w-4 h-4 me-2" />{t.groups.addSession}
                      </Button>
                    )}
                    {sessionTab === "psychological" && isPsychologist && (
                      <Button className="mt-4 font-semibold" style={{ backgroundColor: "#7c3aed", color: "white" }}
                        onClick={openIntervention}>
                        <Plus className="w-4 h-4 me-2" />{(t as any).groups?.addPsychSession ?? "إضافة حصة نفسية"}
                      </Button>
                    )}
                  </div>
                );

                return (
                  <>
                    {!isAdmin && (
                      <div className="flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700 mb-3">
                        <span>{isPsychologist ? "🧠" : "👨‍🏫"}</span>
                        أنت تشاهد <strong className="mx-1">حصصك فقط</strong>
                        <span className="font-normal text-blue-400 mr-1">
                          — {isPsychologist ? "الحصص التنمائية/المهارية" : "حصص اللغة الإنجليزية"}
                        </span>
                      </div>
                    )}
                    <SessionsTable
                      sessions={visibleSessions}
                      groupStudents={group.students}
                      canEdit={canEdit}
                      onEdit={openEdit}
                      t={t}
                      isAdmin={isAdmin}
                      groupId={groupId}
                      navigate={navigate}
                    />
                  </>
                );
              })()}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Upcoming Sessions Panel ─────────────────────────────────────────── */}
      {(group as any).plannedSessions && (group as any).plannedSessions.length > 0 && (
        <Card className="border-[#1B2E8F]/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarClock className="w-4 h-4" style={{ color: "#1B2E8F" }} />
              {t.groups.upcomingSessions}
              <Badge className="ms-1 text-xs" style={{ backgroundColor: "#1B2E8F", color: "white" }}>
                {(group as any).plannedSessions.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(group as any).plannedSessions.map((ps: any) => {
                const typeColors: Record<string, string> = {
                  support: "#7c3aed",
                  makeup: "#f59e0b",
                  workshop: "#0ea5e9",
                  regular: "#1B2E8F",
                };
                const typeColor = typeColors[ps.sessionType ?? "regular"] ?? "#1B2E8F";
                return (
                  <div
                    key={ps.id}
                    className="flex items-center gap-3 p-3 rounded-lg border"
                    style={{ borderColor: `${typeColor}30`, backgroundColor: `${typeColor}08` }}
                  >
                    <div className="shrink-0 flex flex-col items-center gap-0.5">
                      <span className="text-xs font-black" style={{ color: typeColor }}>
                        {safeFmt(ps.sessionDate, "d")}
                      </span>
                      <span className="text-[10px] text-muted-foreground uppercase">
                        {safeFmt(ps.sessionDate, "MMM")}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          className="text-[10px] font-semibold px-1.5 py-0"
                          style={{ backgroundColor: `${typeColor}20`, color: typeColor, border: `1px solid ${typeColor}40` }}
                        >
                          {t.groups.sessionTypes[ps.sessionType as keyof typeof t.groups.sessionTypes] ?? ps.sessionType}
                        </Badge>
                        {ps.sessionTime && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {ps.sessionTime}
                          </span>
                        )}
                        {ps.psychologistName && (
                          <span className="text-xs text-[#7c3aed] flex items-center gap-1">
                            <BrainCircuit className="w-3 h-3" />
                            {ps.psychologistName}
                          </span>
                        )}
                      </div>
                      {ps.lessonTitle && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{ps.lessonTitle}</p>
                      )}
                    </div>
                    {(isAdmin || isTeacher || (isPsychologist && ps.psychologistId === currentUser?.id)) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                        onClick={() => handleCancelSession(ps.id)}
                        disabled={isCancelling}
                        title={t.groups.cancelSession}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Psychological Support Sessions Panel ────────────────────────────── */}
      {(isPsychologist || isAdmin || isTeacher) && (supportSessions as any[]).length > 0 && (
        <Card style={{ borderColor: "#7c3aed30" }}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <BrainCircuit className="w-4 h-4" style={{ color: "#7c3aed" }} />
              <span style={{ color: "#7c3aed" }}>{t.groups.groupSupportSessions}</span>
              <span className="ms-1 text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: "#7c3aed", color: "white" }}>
                {(supportSessions as any[]).length}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(supportSessions as any[]).map((ss: any) => (
                <div
                  key={ss.id}
                  className="flex items-center gap-3 p-3 rounded-lg border"
                  style={{ borderColor: "#7c3aed30", backgroundColor: "#7c3aed08" }}
                >
                  <div className="shrink-0 flex flex-col items-center gap-0.5">
                    <span className="text-xs font-black" style={{ color: "#7c3aed" }}>
                      {safeFmt(ss.sessionDate, "d")}
                    </span>
                    <span className="text-[10px] text-muted-foreground uppercase">
                      {safeFmt(ss.sessionDate, "MMM")}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className="text-[10px] font-semibold px-1.5 py-0" style={{ backgroundColor: "#7c3aed20", color: "#7c3aed", border: "1px solid #7c3aed40" }}>
                        {t.groups.groupSupportBadge}
                      </Badge>
                      {ss.sessionTime && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {ss.sessionTime}
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-medium mt-0.5 text-gray-700">{ss.topic}</p>
                    {isTeacher && ss.teacherNote && (
                      <div className="mt-1.5 px-2.5 py-1.5 rounded-md text-xs text-muted-foreground italic" style={{ backgroundColor: "#7c3aed08", border: "1px solid #7c3aed15" }}>
                        "{ss.teacherNote}"
                      </div>
                    )}
                    {ss.psychologistName && (
                      <span className="text-[10px] text-[#7c3aed] flex items-center gap-1 mt-0.5">
                        <BrainCircuit className="w-3 h-3" />
                        {ss.psychologistName}
                      </span>
                    )}
                  </div>
                  {(isAdmin || isPsychologist) && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                      onClick={() => handleDeleteSupportSession(ss.id)}
                      disabled={deletingSupport === ss.id}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ══════ DIALOGS ══════════════════════════════════════════════════════ */}

      {/* Add Support Session Dialog */}
      <Dialog open={isSupportOpen} onOpenChange={setIsSupportOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2" style={{ color: "#7c3aed" }}>
              <BrainCircuit className="w-5 h-5" />
              {t.groups.addGroupSupport} — {group.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{t.groups.sessionDate}</label>
                <Input type="date" value={supportDate} onChange={e => setSupportDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{t.groups.groupSupportTime}</label>
                <Input type="time" value={supportTime} onChange={e => setSupportTime(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{t.groups.groupSupportTopic} *</label>
              <Input
                value={supportTopic}
                onChange={e => setSupportTopic(e.target.value)}
                placeholder={t.groups.groupSupportTopicPlaceholder}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[#7c3aed]">{t.groups.groupSupportTeacherNote}</label>
              <Textarea
                value={supportTeacherNote}
                onChange={e => setSupportTeacherNote(e.target.value)}
                placeholder={t.groups.groupSupportTeacherNotePlaceholder}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">🔒 Visible only to the teacher</p>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button
              onClick={handleAddSupportSession}
              disabled={isSavingSupport || !supportTopic.trim()}
              style={{ backgroundColor: "#7c3aed" }}
              className="text-white"
            >
              {isSavingSupport ? (
                <><Clock className="w-4 h-4 me-1.5 animate-spin" />Saving...</>
              ) : (
                <><BrainCircuit className="w-4 h-4 me-1.5" />{t.groups.addGroupSupport}</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Add Session Dialog ────────────────────────────────────────────── */}
      <Dialog open={isSessionOpen} onOpenChange={setIsSessionOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2" style={{ color: "#1B2E8F" }}>
              <BookOpen className="w-5 h-5" />
              {t.groups.addSession} — {group.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 max-h-[65vh] overflow-y-auto pe-1">
            {/* Date + Lesson Title */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{t.groups.sessionDate}</label>
                <Input type="date" value={sessionDate} onChange={(e) => setSessionDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{t.groups.lessonTitle}</label>
                <Input
                  placeholder="e.g. Unit 3 - Greetings"
                  value={lessonTitle}
                  onChange={(e) => setLessonTitle(e.target.value)}
                />
              </div>
            </div>

            {/* Session Goal — blue */}
            <div className="space-y-1.5 rounded-xl bg-blue-50 border border-blue-100 p-3">
              <label className="text-sm font-semibold text-blue-700 flex items-center gap-1.5">
                <Target className="w-4 h-4" />
                {t.groups.sessionGoalLabel}
              </label>
              <Textarea
                placeholder={t.groups.sessionGoalPlaceholder}
                value={sessionGoal}
                onChange={(e) => setSessionGoal(e.target.value)}
                rows={2}
                className="bg-white"
              />
            </div>

            {/* Session Outcome — green */}
            <div className="space-y-1.5 rounded-xl bg-emerald-50 border border-emerald-100 p-3">
              <label className="text-sm font-semibold text-emerald-700 flex items-center gap-1.5">
                <CheckSquare className="w-4 h-4" />
                {t.groups.sessionOutcomeLabel}
              </label>
              <Textarea
                placeholder={t.groups.sessionOutcomePlaceholder}
                value={sessionOutcome}
                onChange={(e) => setSessionOutcome(e.target.value)}
                rows={2}
                className="bg-white"
              />
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{t.groups.sessionNotes}</label>
              <Textarea
                placeholder="Additional notes..."
                value={sessionNotes}
                onChange={(e) => setSessionNotes(e.target.value)}
                rows={2}
              />
            </div>

            {/* Next Session Goal — yellow */}
            <div className="space-y-1.5 rounded-xl border p-3" style={{ backgroundColor: "#FFF8E8", borderColor: "#F5A60040" }}>
              <label className="text-sm font-semibold flex items-center gap-1.5" style={{ color: "#b37800" }}>
                <Flag className="w-4 h-4" style={{ color: "#F5A600" }} />
                {t.groups.nextSessionGoalLabel}
              </label>
              <Input
                placeholder="Goal for the next session..."
                value={nextGoal}
                onChange={(e) => setNextGoal(e.target.value)}
                className="bg-white"
              />
            </div>

            {/* Session Mode toggle */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {t.groups.sessionMode}
              </label>
              <div className="flex gap-2 flex-wrap">
                {(["", "clinical", "developmental", "linguistic"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setSessionMode(m)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                      sessionMode === m
                        ? m === "clinical"
                          ? "bg-violet-600 text-white border-violet-600"
                          : m === "developmental"
                          ? "bg-[#1B2E8F] text-white border-[#1B2E8F]"
                          : m === "linguistic"
                          ? "bg-emerald-600 text-white border-emerald-600"
                          : "bg-muted text-foreground border-border"
                        : "bg-background text-muted-foreground border-border hover:bg-muted"
                    }`}
                  >
                    {m === "" ? "Standard" : m === "clinical" ? t.groups.sessionModes.clinical : m === "developmental" ? t.groups.sessionModes.developmental : t.groups.sessionModes.linguistic}
                  </button>
                ))}
              </div>
              {sessionMode !== "" && (
                <p className="text-xs text-muted-foreground">
                  {sessionMode === "clinical" ? t.groups.sessionModes.clinicalHint : sessionMode === "developmental" ? t.groups.sessionModes.developmentalHint : t.groups.sessionModes.linguisticHint}
                </p>
              )}
            </div>

            {/* Per-student evaluation */}
            {group.students.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium">{t.groups.sessionEvaluation}</label>
                <div className="space-y-3">
                  {group.students.map((s) => {
                    const state = evalState[s.id] || {
                      status: "present" as AttendanceStatus,
                      speakingScore: 5, confidenceScore: 5, participationScore: 5,
                      behavioralNotes: "", curriculumProgress: "", expanded: false,
                    };
                    return (
                      <div key={s.id} className="border rounded-xl overflow-hidden">
                        <div className="flex items-center gap-3 px-3 py-2 bg-muted/20">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                            style={{ backgroundColor: "#1B2E8F" }}>
                            {s.name[0]}
                          </div>
                          <span className="text-sm font-medium flex-1 truncate">{s.name}</span>
                          <AttendanceToggle
                            status={state.status}
                            onChange={(status) => updateStudentEval(s.id, { status })}
                            t={t}
                          />
                          {state.status !== "absent" && (
                            <button
                              className="text-muted-foreground hover:text-foreground transition-colors"
                              onClick={() => updateStudentEval(s.id, { expanded: !state.expanded })}
                            >
                              {state.expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                          )}
                        </div>
                        {state.status !== "absent" && state.expanded && (
                          <div className="px-3 py-3 space-y-3 border-t bg-background">
                            <div className="space-y-2">
                              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t.groups.skillUpdates}</p>
                              <ScoreSlider label={t.groups.speaking} value={state.speakingScore} onChange={(v) => updateStudentEval(s.id, { speakingScore: v })} />
                              <ScoreSlider label={t.groups.confidence} value={state.confidenceScore} onChange={(v) => updateStudentEval(s.id, { confidenceScore: v })} />
                              <ScoreSlider label={t.groups.participation} value={state.participationScore} onChange={(v) => updateStudentEval(s.id, { participationScore: v })} />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t.groups.curriculumProgress}</label>
                              <Select
                                value={state.curriculumProgress || "__none__"}
                                onValueChange={(v) => updateStudentEval(s.id, { curriculumProgress: v === "__none__" ? "" : v })}
                              >
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue placeholder={t.groups.selectCurriculumProgress} />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="__none__">{t.groups.selectCurriculumProgress}</SelectItem>
                                  {curriculumOptions.map((opt) => (
                                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t.groups.behavioralNotes}</label>
                              <Textarea
                                rows={2}
                                className="text-xs"
                                placeholder={t.groups.behavioralNotesPlaceholder}
                                value={state.behavioralNotes}
                                onChange={(e) => updateStudentEval(s.id, { behavioralNotes: e.target.value })}
                              />
                            </div>
                            {/* Communication Metrics */}
                            <div className="border-t pt-2">
                              <button
                                type="button"
                                className="flex items-center gap-1.5 text-xs font-medium text-violet-600 hover:text-violet-700 transition-colors"
                                onClick={() => updateStudentEval(s.id, { commExpanded: !state.commExpanded })}
                              >
                                <span>{state.commExpanded ? "▾" : "▸"}</span>
                                {t.groups.communicationMetrics}
                              </button>
                              {state.commExpanded && (
                                <div className="mt-2 space-y-2">
                                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{t.groups.verbal}</p>
                                  <ScoreSlider label={t.groups.verbalFluency} value={state.verbalFluency} onChange={(v) => updateStudentEval(s.id, { verbalFluency: v })} />
                                  <ScoreSlider label={t.groups.verbalClarity} value={state.verbalClarity} onChange={(v) => updateStudentEval(s.id, { verbalClarity: v })} />
                                  <ScoreSlider label={t.groups.verbalVocabulary} value={state.verbalVocabulary} onChange={(v) => updateStudentEval(s.id, { verbalVocabulary: v })} />
                                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mt-2">{t.groups.nonVerbal}</p>
                                  <ScoreSlider label={t.groups.nonverbalEyeContact} value={state.nonverbalEyeContact} onChange={(v) => updateStudentEval(s.id, { nonverbalEyeContact: v })} />
                                  <ScoreSlider label={t.groups.nonverbalBodyLanguage} value={state.nonverbalBodyLanguage} onChange={(v) => updateStudentEval(s.id, { nonverbalBodyLanguage: v })} />
                                  <ScoreSlider label={t.groups.nonverbalFacialExpressions} value={state.nonverbalFacialExpressions} onChange={(v) => updateStudentEval(s.id, { nonverbalFacialExpressions: v })} />
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">{t.groups.cancel}</Button>
            </DialogClose>
            <Button
              style={{ backgroundColor: "#F5A600", color: "#1B2E8F" }}
              className="font-semibold"
              onClick={handleAddSession}
              disabled={isSavingSession || !sessionDate}
            >
              {isSavingSession ? t.groups.saving : t.groups.saveSession}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Session Dialog ───────────────────────────────────────────── */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2" style={{ color: "#1B2E8F" }}>
              <Pencil className="w-5 h-5" />
              {t.groups.editSession}
              {editingSession && (
                <span className="text-sm font-normal text-muted-foreground ms-2">
                  — {safeFmt(editingSession.sessionDate, "MMM d, yyyy")}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 max-h-[65vh] overflow-y-auto pe-1">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5 col-span-2">
                <label className="text-sm font-medium">{t.groups.lessonTitle}</label>
                <Input
                  value={editLessonTitle}
                  onChange={(e) => setEditLessonTitle(e.target.value)}
                  placeholder="e.g. Unit 3 - Greetings"
                />
              </div>
            </div>

            {/* Goal */}
            <div className="space-y-1.5 rounded-xl bg-blue-50 border border-blue-100 p-3">
              <label className="text-sm font-semibold text-blue-700 flex items-center gap-1.5">
                <Target className="w-4 h-4" />
                {t.groups.sessionGoalLabel}
              </label>
              <Textarea
                placeholder={t.groups.sessionGoalPlaceholder}
                value={editSessionGoal}
                onChange={(e) => setEditSessionGoal(e.target.value)}
                rows={2}
                className="bg-white"
              />
            </div>

            {/* Outcome */}
            <div className="space-y-1.5 rounded-xl bg-emerald-50 border border-emerald-100 p-3">
              <label className="text-sm font-semibold text-emerald-700 flex items-center gap-1.5">
                <CheckSquare className="w-4 h-4" />
                {t.groups.sessionOutcomeLabel}
              </label>
              <Textarea
                placeholder={t.groups.sessionOutcomePlaceholder}
                value={editSessionOutcome}
                onChange={(e) => setEditSessionOutcome(e.target.value)}
                rows={2}
                className="bg-white"
              />
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{t.groups.sessionNotes}</label>
              <Textarea
                rows={2}
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
              />
            </div>

            {/* Next Session Goal */}
            <div className="space-y-1.5 rounded-xl border p-3" style={{ backgroundColor: "#FFF8E8", borderColor: "#F5A60040" }}>
              <label className="text-sm font-semibold flex items-center gap-1.5" style={{ color: "#b37800" }}>
                <Flag className="w-4 h-4" style={{ color: "#F5A600" }} />
                {t.groups.nextSessionGoalLabel}
              </label>
              <Input
                value={editNextGoal}
                onChange={(e) => setEditNextGoal(e.target.value)}
                className="bg-white"
              />
            </div>

            {/* Attendance edit */}
            {group.students.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium">{t.groups.attendance}</label>
                <div className="space-y-3">
                  {group.students.map((s) => {
                    const state = editAttendance[s.id] || { status: "present" as AttendanceStatus, speakingScore: 5, confidenceScore: 5, participationScore: 5, behavioralNotes: "", expanded: false };
                    return (
                      <div key={s.id} className="border rounded-xl overflow-hidden">
                        <div className="flex items-center gap-3 px-3 py-2 bg-muted/20">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ backgroundColor: "#1B2E8F" }}>
                            {s.name[0]}
                          </div>
                          <span className="text-sm font-medium flex-1 truncate">{s.name}</span>
                          <AttendanceToggle
                            status={state.status}
                            onChange={(status) => updateEditAttendance(s.id, { status })}
                            t={t}
                          />
                          {state.status !== "absent" && (
                            <button
                              className="text-muted-foreground hover:text-foreground transition-colors"
                              onClick={() => updateEditAttendance(s.id, { expanded: !state.expanded })}
                            >
                              {state.expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                          )}
                        </div>
                        {state.status !== "absent" && state.expanded && (
                          <div className="px-3 py-3 space-y-3 border-t bg-background">
                            <ScoreSlider label={t.groups.speaking} value={state.speakingScore} onChange={(v) => updateEditAttendance(s.id, { speakingScore: v })} />
                            <ScoreSlider label={t.groups.confidence} value={state.confidenceScore} onChange={(v) => updateEditAttendance(s.id, { confidenceScore: v })} />
                            <ScoreSlider label={t.groups.participation} value={state.participationScore} onChange={(v) => updateEditAttendance(s.id, { participationScore: v })} />
                            <Textarea
                              rows={2}
                              className="text-xs"
                              placeholder={t.groups.behavioralNotesPlaceholder}
                              value={state.behavioralNotes}
                              onChange={(e) => updateEditAttendance(s.id, { behavioralNotes: e.target.value })}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">{t.groups.cancel}</Button>
            </DialogClose>
            <Button
              style={{ backgroundColor: "#1B2E8F", color: "white" }}
              className="font-semibold"
              onClick={handleSaveEdit}
              disabled={isSavingEdit}
            >
              {isSavingEdit ? t.groups.saving : t.groups.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Next Session Goal Dialog ─────────────────────────────────── */}
      <Dialog open={isEditingGoal} onOpenChange={setIsEditingGoal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t.groups.nextSessionGoal}</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Textarea
              rows={3}
              value={nextGoalEdit}
              onChange={(e) => setNextGoalEdit(e.target.value)}
              placeholder="What is the goal for the next session?"
            />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">{t.groups.cancel}</Button>
            </DialogClose>
            <Button
              style={{ backgroundColor: "#F5A600", color: "#1B2E8F" }}
              className="font-semibold"
              onClick={handleSaveGoal}
            >
              {t.groups.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Add Student Dialog ────────────────────────────────────────────── */}
      <Dialog open={isAddStudentOpen} onOpenChange={(open) => {
        setIsAddStudentOpen(open);
        if (!open) { setSelectedStudentIds(new Set()); setAddStudentSearch(""); setShowAllStudents(false); }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{isAr ? "إضافة تلاميذ إلى الفوج" : "Add Students to Group"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Input
              placeholder={isAr ? "ابحث عن تلميذ..." : "Search students..."}
              value={addStudentSearch}
              onChange={(e) => setAddStudentSearch(e.target.value)}
            />

            {/* Available / Show All toggle */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                {isAr
                  ? `${unassignedStudents.length} غير مسجل · ${inOtherGroupStudents.length} في فوج آخر`
                  : `${unassignedStudents.length} available · ${inOtherGroupStudents.length} in other groups`}
              </span>
              <button
                onClick={() => setShowAllStudents((v) => !v)}
                className="text-[#1B2E8F] font-medium hover:underline"
              >
                {showAllStudents
                  ? (isAr ? "إخفاء المسجلين في فوج" : "Hide assigned")
                  : (isAr ? "عرض الكل" : "Show all")}
              </button>
            </div>

            {/* Selection count bar */}
            {selectedStudentIds.size > 0 && (
              <div className="flex items-center justify-between rounded-lg bg-[#1B2E8F]/8 px-3 py-2 text-sm">
                <span className="font-medium text-[#1B2E8F]">
                  {selectedStudentIds.size} {isAr ? "محدد" : "selected"}
                </span>
                <button
                  onClick={() => setSelectedStudentIds(new Set())}
                  className="text-xs text-muted-foreground hover:text-destructive"
                >
                  {isAr ? "إلغاء التحديد" : "Clear"}
                </button>
              </div>
            )}

            <div className="max-h-64 overflow-y-auto space-y-1">
              {displayedStudents.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  {isAr ? "لا يوجد تلاميذ متاحون." : "No students available."}
                </p>
              ) : (
                <>
                  {/* Section header for "in other groups" when showing all */}
                  {showAllStudents && unassignedStudents.length > 0 && inOtherGroupStudents.length > 0 && (
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1 pt-1 pb-0.5 border-b">
                      {isAr ? "غير مسجلين في فوج" : "Unassigned"}
                    </p>
                  )}
                  {displayedStudents.map((s: any, idx: number) => {
                    const isInOtherGroup = !!s.currentGroupId;
                    const isSelected = selectedStudentIds.has(s.id);
                    const showDivider = showAllStudents && unassignedStudents.length > 0
                      && idx === unassignedStudents.length;
                    return (
                      <div key={s.id}>
                        {showDivider && (
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1 pt-2 pb-0.5 border-b mt-1">
                            {isAr ? "في فوج آخر" : "In another group"}
                          </p>
                        )}
                        <button
                          onClick={() => toggleSelectStudent(s.id)}
                          className={`w-full text-start px-3 py-2 rounded transition-colors flex items-center gap-2.5 ${
                            isSelected
                              ? "bg-[#1B2E8F]/10 border border-[#1B2E8F]/30"
                              : "hover:bg-muted"
                          }`}
                        >
                          {/* Checkbox */}
                          <div className={`w-4 h-4 rounded border-2 shrink-0 flex items-center justify-center transition-colors ${
                            isSelected ? "bg-[#1B2E8F] border-[#1B2E8F]" : "border-gray-300"
                          }`}>
                            {isSelected && (
                              <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 10 8">
                                <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            )}
                          </div>
                          {/* Avatar */}
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${
                            isInOtherGroup ? "bg-amber-100 text-amber-700" : "bg-primary/10 text-primary"
                          }`}>
                            {s.name[0]}
                          </div>
                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{s.name}</div>
                            <div className="text-xs text-muted-foreground truncate">
                              {isInOtherGroup
                                ? <span className="text-amber-600">⚠ {isAr ? `في فوج: ${s.currentGroupName}` : `In group: ${s.currentGroupName}`}</span>
                                : (s.levelName ?? "")}
                            </div>
                          </div>
                        </button>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <DialogClose asChild>
              <Button variant="outline">{t.groups.cancel}</Button>
            </DialogClose>
            <Button
              onClick={handleBulkAddStudents}
              disabled={selectedStudentIds.size === 0 || isBulkAdding}
              style={{ backgroundColor: "#1B2E8F" }}
              className="text-white"
            >
              {isBulkAdding
                ? (isAr ? "جارٍ الإضافة..." : "Adding...")
                : selectedStudentIds.size > 0
                  ? (isAr ? `إضافة (${selectedStudentIds.size})` : `Add Selected (${selectedStudentIds.size})`)
                  : (isAr ? "اختر تلاميذ" : "Select students")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Schedule Session Dialog ───────────────────────────────────────── */}
      <Dialog open={isScheduleOpen} onOpenChange={setIsScheduleOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2" style={{ color: "#1B2E8F" }}>
              <CalendarClock className="w-5 h-5" />
              {t.groups.scheduleSession} — {group.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 max-h-[70vh] overflow-y-auto pe-1">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{t.groups.sessionType}</label>
              <Select value={schedType} onValueChange={(v) => setSchedType(v as typeof schedType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="regular">{t.groups.sessionTypes.regular}</SelectItem>
                  <SelectItem value="support">{t.groups.sessionTypes.support}</SelectItem>
                  <SelectItem value="makeup">{t.groups.sessionTypes.makeup}</SelectItem>
                  <SelectItem value="workshop">{t.groups.sessionTypes.workshop}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{t.groups.sessionDate} *</label>
                <Input type="date" value={schedDate} onChange={(e) => setSchedDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{t.groups.sessionTime}</label>
                <Input type="time" value={schedTime} onChange={(e) => setSchedTime(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{t.groups.lessonTitle}</label>
              <Input placeholder="e.g. Unit 4 — Numbers" value={schedTitle} onChange={(e) => setSchedTitle(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{t.groups.sessionNotes}</label>
              <Textarea rows={2} placeholder="Any preparation notes…" value={schedNotes} onChange={(e) => setSchedNotes(e.target.value)} />
            </div>
            <div className="space-y-1.5 rounded-lg border p-3 bg-muted/20">
              <label className="text-sm font-medium flex items-center gap-2">
                <CalendarClock className="w-4 h-4 opacity-60" />
                {t.groups.repeatSession}
              </label>
              <div className="flex items-center gap-3">
                <Input
                  type="number" min={1} max={52} className="w-24"
                  value={schedRepeat}
                  onChange={(e) => setSchedRepeat(Math.min(52, Math.max(1, parseInt(e.target.value) || 1)))}
                />
                <span className="text-sm text-muted-foreground">{t.groups.repeatWeeks}</span>
              </div>
              <p className="text-xs text-muted-foreground">{t.groups.repeatHint}</p>
            </div>
            {isPsychologist && (
              <div className="rounded-lg p-3 text-xs bg-[#7c3aed]/5 border border-[#7c3aed]/20 text-[#7c3aed]">
                <strong>{t.groups.quickLink}:</strong> {t.groups.quickLinkHint}
              </div>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">{t.groups.cancel}</Button>
            </DialogClose>
            <Button
              style={{ backgroundColor: "#1B2E8F", color: "white" }}
              className="font-semibold"
              onClick={handleSchedule}
              disabled={isScheduling || !schedDate}
            >
              {isScheduling ? t.groups.saving : (schedRepeat > 1 ? `${t.groups.scheduleSession} (×${schedRepeat})` : t.groups.scheduleSession)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Intervention Session Dialog ───────────────────────────────────── */}
      <Dialog open={isInterventionOpen} onOpenChange={setIsInterventionOpen}>
        <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2" style={{ color: "#7c3aed" }}>
              <BrainCircuit className="w-5 h-5" />
              {t.groups.interventionSession} — {group.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-xs text-muted-foreground">{t.groups.interventionSessionHint}</p>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{t.groups.sessionDate} *</label>
              <Input type="date" value={interventionDate} onChange={(e) => setInterventionDate(e.target.value)} />
            </div>
            {group.students.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium">{t.groups.attendance}</label>
                <div className="space-y-2 rounded-lg border p-3">
                  {group.students.map((s) => (
                    <div key={s.id} className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium truncate">{s.name}</span>
                      <AttendanceToggle
                        status={interventionAttendance[s.id] ?? "present"}
                        onChange={(status) => setInterventionAttendance((prev) => ({ ...prev, [s.id]: status }))}
                        t={t}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{t.groups.sessionNotes}</label>
              <Textarea
                placeholder="Observations, recommendations, follow-up…"
                rows={3}
                value={interventionNotes}
                onChange={(e) => setInterventionNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">{t.groups.cancel}</Button>
            </DialogClose>
            <Button
              className="font-semibold"
              style={{ backgroundColor: "#7c3aed", color: "white" }}
              onClick={handleSaveIntervention}
              disabled={isSavingIntervention || !interventionDate}
            >
              {isSavingIntervention ? t.groups.saving : t.groups.saveSession}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

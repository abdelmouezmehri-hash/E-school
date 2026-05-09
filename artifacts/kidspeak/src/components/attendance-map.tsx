import { useState, useEffect, useCallback } from "react";
import { useGetMe } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/language-context";
import { CalendarCheck, CheckCircle2, XCircle, Clock, AlertTriangle } from "lucide-react";

export interface AttendanceSession {
  sessionId: number;
  sessionDate: string;
  lessonTitle?: string | null;
  attendanceId: number | null;
  status: "present" | "absent" | "late" | null;
}

interface PlannedSessionSlot {
  sessionId: number;
  sessionDate: string;
  sessionTime: string | null;
  sessionType: string;
  lessonTitle: string | null;
}

interface AttendanceData {
  sessions: AttendanceSession[];
  totalExpected: number;
  levelName: string | null;
  durationWeeks: number;
  sessionsPerWeek: number;
  groupId: number;
  plannedSessionCount?: number;
  plannedSessions?: PlannedSessionSlot[];
}

interface AttendanceMapProps {
  studentId: number;
  /** Compact mode: smaller squares, no session editing, used in parent dashboard cards */
  compact?: boolean;
}

const BRAND_BLUE = "#1B2E8F";
const BRAND_YELLOW = "#F5A600";

function statusColor(status: AttendanceSession["status"]): string {
  if (status === "present") return "#22c55e"; // green-500
  if (status === "late")    return "#f59e0b"; // amber-500
  if (status === "absent")  return "#ef4444"; // red-500
  return "#d1d5db";                           // gray-300 — future/pending
}

function statusBg(status: AttendanceSession["status"]): string {
  if (status === "present") return "bg-emerald-500";
  if (status === "late")    return "bg-amber-500";
  if (status === "absent")  return "bg-red-500";
  return "bg-gray-200 dark:bg-gray-700";
}

function statusLabel(status: AttendanceSession["status"], t: any): string {
  if (status === "present") return t.attendance.present;
  if (status === "late")    return t.attendance.late;
  if (status === "absent")  return t.attendance.absent;
  return t.attendance.upcoming;
}

export function AttendanceMap({ studentId, compact = false }: AttendanceMapProps) {
  const { t, isRTL } = useLanguage();
  const at = t.attendance;
  const { toast } = useToast();
  const { data: me } = useGetMe();

  const canEdit = (me as any)?.role === "admin" || (me as any)?.role === "teacher";

  const [data, setData] = useState<AttendanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/attendance/student/${studentId}`, { credentials: "include" });
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="space-y-2">
        <div className="flex gap-1 flex-wrap">
          {Array.from({ length: 16 }).map((_, i) => (
            <div key={i} className="w-7 h-7 rounded-md bg-gray-100 dark:bg-gray-800 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { sessions, totalExpected } = data;
  const plannedSlots = data.plannedSessions ?? [];

  // Build the full grid: past sessions → planned (dashed) → gray future slots
  const pastCount = sessions.length;
  const plannedCount = plannedSlots.length;
  const futureCount = Math.max(0, totalExpected - pastCount - plannedCount);

  // Stats
  const presentCount = sessions.filter(s => s.status === "present").length;
  const absentCount = sessions.filter(s => s.status === "absent").length;
  const lateCount = sessions.filter(s => s.status === "late").length;
  const recordedCount = sessions.filter(s => s.status !== null).length;
  const attendanceRate = recordedCount > 0
    ? Math.round(((presentCount + lateCount) / recordedCount) * 100)
    : null;

  const handleStatusChange = async (session: AttendanceSession, newStatus: "present" | "absent" | "late") => {
    setSaving(true);
    try {
      let res: Response;
      if (session.attendanceId) {
        // Update existing record
        res = await fetch(`/api/attendance/${session.attendanceId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ status: newStatus }),
        });
      } else {
        // Create new record
        res = await fetch(`/api/attendance/session/${session.sessionId}/student/${studentId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ status: newStatus }),
        });
      }
      if (res.ok) {
        toast({ title: at.saved });
        setEditingIdx(null);
        await load();
      } else {
        toast({ title: at.saveFailed, variant: "destructive" });
      }
    } finally {
      setSaving(false);
    }
  };

  const squareSize = compact ? "w-6 h-6" : "w-8 h-8";
  const gapSize = compact ? "gap-1" : "gap-1.5";

  return (
    <div className="space-y-3" dir={isRTL ? "rtl" : "ltr"}>
      {/* Stats row */}
      {!compact && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarCheck className="w-4 h-4" style={{ color: BRAND_BLUE }} />
            <span className="text-sm font-bold" style={{ color: BRAND_BLUE }}>
              {data.levelName ? `${data.levelName} — ` : ""}{at.attendanceMap}
            </span>
          </div>
          {attendanceRate !== null && (
            <div className="flex items-center gap-1.5">
              <span
                className="text-sm font-black"
                style={{ color: attendanceRate >= 80 ? "#22c55e" : attendanceRate >= 60 ? "#f59e0b" : "#ef4444" }}
              >
                {attendanceRate}%
              </span>
              <span className="text-xs text-muted-foreground">
                {presentCount + lateCount}/{recordedCount} {at.attended}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Compact stat */}
      {compact && attendanceRate !== null && (
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold" style={{ color: BRAND_BLUE }}>
            {at.attendanceRate}:
          </span>
          <span
            className="text-xs font-black"
            style={{ color: attendanceRate >= 80 ? "#22c55e" : attendanceRate >= 60 ? "#f59e0b" : "#ef4444" }}
          >
            {attendanceRate}%
          </span>
          <span className="text-xs text-muted-foreground">
            ({presentCount + lateCount}/{recordedCount})
          </span>
        </div>
      )}

      {/* Grid */}
      <div className={`flex flex-wrap ${gapSize}`}>
        {/* Past sessions */}
        {sessions.map((session, idx) => (
          <div key={session.sessionId} className="relative">
            <button
              className={`${squareSize} rounded-md transition-all duration-150 ring-0 focus:outline-none ${
                canEdit ? "hover:ring-2 hover:ring-offset-1 cursor-pointer" : "cursor-default"
              } ${editingIdx === idx ? "ring-2 ring-offset-1 ring-gray-400 scale-110" : ""}`}
              style={{
                backgroundColor: statusColor(session.status),
                boxShadow: hoveredIdx === idx ? "0 0 0 2px rgba(27,46,143,0.35)" : "none",
              }}
              title={`${session.sessionDate}${session.status ? ` — ${statusLabel(session.status, t)}` : ` — ${at.notRecorded}`}`}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              onClick={() => canEdit && setEditingIdx(editingIdx === idx ? null : idx)}
              disabled={saving}
            />
            {/* Edit popover */}
            {editingIdx === idx && canEdit && (
              <div
                className="absolute z-30 top-full mt-1 start-0 bg-popover border rounded-xl shadow-xl p-2 min-w-max flex flex-col gap-1"
                style={{ borderColor: "rgba(27,46,143,0.15)" }}
              >
                <p className="text-xs font-semibold text-muted-foreground px-1 pb-0.5 border-b mb-0.5">
                  {session.sessionDate}
                </p>
                {(["present", "late", "absent"] as const).map(s => (
                  <button
                    key={s}
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium w-full text-start transition-all hover:opacity-90 ${
                      session.status === s ? "opacity-100" : "opacity-60 hover:opacity-80"
                    }`}
                    style={{ backgroundColor: `${statusColor(s)}25`, color: statusColor(s) }}
                    onClick={() => handleStatusChange(session, s)}
                    disabled={saving}
                  >
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: statusColor(s) }}
                    />
                    {statusLabel(s, t)}
                    {session.status === s && <CheckCircle2 className="w-3 h-3 ms-auto" />}
                  </button>
                ))}
                <button
                  onClick={() => setEditingIdx(null)}
                  className="text-xs text-muted-foreground mt-1 text-center hover:underline"
                >
                  {at.cancel}
                </button>
              </div>
            )}
          </div>
        ))}

        {/* Planned sessions — dashed border with brand blue */}
        {plannedSlots.map((ps) => (
          <div
            key={`planned-${ps.sessionId}`}
            className={`${squareSize} rounded-md flex items-center justify-center`}
            style={{
              border: "2px dashed #1B2E8F",
              backgroundColor: "rgba(27,46,143,0.08)",
            }}
            title={`${at.plannedSession ?? "Scheduled"} — ${ps.sessionDate}${ps.sessionTime ? ` ${ps.sessionTime}` : ""}${ps.lessonTitle ? ` · ${ps.lessonTitle}` : ""}`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#1B2E8F] opacity-50" />
          </div>
        ))}

        {/* Future/pending sessions — gray */}
        {Array.from({ length: futureCount }).map((_, i) => (
          <div
            key={`future-${i}`}
            className={`${squareSize} rounded-md bg-gray-200 dark:bg-gray-700 opacity-50`}
            title={at.upcomingSession}
          />
        ))}

        {/* If no sessions at all */}
        {sessions.length === 0 && totalExpected === 0 && (
          <div className="text-xs text-muted-foreground italic py-2">{at.noSessions}</div>
        )}
      </div>

      {/* Legend */}
      {!compact && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1">
          {([
            { status: "present" as const, icon: CheckCircle2 },
            { status: "late" as const, icon: Clock },
            { status: "absent" as const, icon: XCircle },
            { status: null, icon: AlertTriangle },
          ] as const).map(({ status, icon: Icon }) => (
            <div key={status ?? "future"} className="flex items-center gap-1.5">
              <span
                className="w-3.5 h-3.5 rounded shrink-0"
                style={{ backgroundColor: statusColor(status) }}
              />
              <span className="text-xs text-muted-foreground">{statusLabel(status, t)}</span>
            </div>
          ))}
          {plannedCount > 0 && (
            <div className="flex items-center gap-1.5">
              <span
                className="w-3.5 h-3.5 rounded shrink-0"
                style={{ border: "2px dashed #1B2E8F", backgroundColor: "rgba(27,46,143,0.08)" }}
              />
              <span className="text-xs text-muted-foreground">{at.plannedSession ?? "Scheduled"}</span>
            </div>
          )}
          {canEdit && (
            <p className="text-xs text-muted-foreground opacity-60 ms-auto italic">{at.clickToEdit}</p>
          )}
        </div>
      )}

      {/* Compact legend */}
      {compact && (
        <div className="flex gap-3 flex-wrap">
          {(["present", "late", "absent", null] as const).map(status => (
            <div key={String(status)} className="flex items-center gap-1">
              <span
                className="w-2.5 h-2.5 rounded shrink-0"
                style={{ backgroundColor: statusColor(status) }}
              />
              <span className="text-xs text-muted-foreground">{statusLabel(status, t)}</span>
            </div>
          ))}
        </div>
      )}

      {/* No group enrolled */}
      {sessions.length === 0 && data.totalExpected === 0 && (
        <p className="text-xs text-muted-foreground italic">{at.noGroupEnrolled}</p>
      )}
    </div>
  );
}

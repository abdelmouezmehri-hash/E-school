import { useState } from "react";
import { Link } from "wouter";
import {
  useListGroups,
  useCreateGroup,
  useUpdateGroup,
  useDeleteGroup,
  useGetMe,
  useCreateSession,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLanguage } from "@/contexts/language-context";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Users,
  BookOpen,
  ChevronRight,
  Calendar,
  Target,
  Pencil,
  Trash2,
  UserCog,
  GraduationCap,
  AlertTriangle,
  CalendarDays,
  BrainCircuit,
  Sparkles,
  CalendarPlus,
  Eye,
  EyeOff,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import type { Group } from "@workspace/api-client-react";

// ── Day order for Algerian school week (Sat first) ───────────────────────────
const DAY_ORDER = [6, 0, 1, 2, 3, 4, 5];

// ── Helpers ──────────────────────────────────────────────────────────────────
function calcEndTime(startTime: string, durationMins: number): string {
  const [h, m] = startTime.split(":").map(Number);
  const total = h * 60 + (m || 0) + durationMins;
  const endH = Math.floor(total / 60) % 24;
  const endM = total % 60;
  return `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
}

function fmtDuration(mins: number | null): string {
  if (!mins) return "";
  if (mins % 60 === 0) return `${mins / 60}h`;
  return `${Math.floor(mins / 60)}h${mins % 60}`;
}

function buildScheduleSummary(
  recurringDays: number[] | null,
  sessionStartTime: string | null,
  sessionDayTimes: Record<string, string> | null,
  sessionDurationMins: number | null,
  dayNames: Record<string, string>,
): string | null {
  const hasDays = recurringDays && recurringDays.length > 0;
  const hasFallbackTime = !!sessionStartTime;
  const hasDayTimes =
    sessionDayTimes && Object.keys(sessionDayTimes).length > 0;

  if (!hasDays && !hasFallbackTime && !hasDayTimes) return null;

  const sorted = hasDays
    ? [...recurringDays!].sort(
        (a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b),
      )
    : [];

  const durPart = sessionDurationMins
    ? ` · ${fmtDuration(sessionDurationMins)}`
    : "";

  if (hasDays) {
    const perDayParts = sorted.map((d) => {
      const key = String(d);
      const name = dayNames[key] ?? key;
      const time = sessionDayTimes?.[key] ?? sessionStartTime ?? null;
      if (!time) return name;
      const end = sessionDurationMins
        ? calcEndTime(time, sessionDurationMins)
        : null;
      return `${name} @ ${time}${end ? `–${end}` : ""}`;
    });
    return perDayParts.join(" · ") + durPart;
  }

  if (hasFallbackTime) {
    const endTime = sessionDurationMins
      ? calcEndTime(sessionStartTime!, sessionDurationMins)
      : null;
    return `@ ${sessionStartTime}${endTime ? ` – ${endTime}` : ""}${durPart}`;
  }

  return null;
}

// ── Form state ───────────────────────────────────────────────────────────────
type FormState = {
  name: string;
  teacherId: string;
  levelId: string;
  startDate: string;
  recurringDays: number[];
  sessionDayTimes: Record<string, string>;
  sessionDurationMins: string;
  maxStudents: string;
  nextSessionGoal: string;
};

const EMPTY_FORM: FormState = {
  name: "",
  teacherId: "",
  levelId: "",
  startDate: "",
  recurringDays: [],
  sessionDayTimes: {},
  sessionDurationMins: "",
  maxStudents: "10",
  nextSessionGoal: "",
};

// ── Component ────────────────────────────────────────────────────────────────
export default function Groups() {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const { data: currentUser } = useGetMe();
  const { data: groups = [], isLoading, refetch } = useListGroups();
  const { mutate: createGroup, isPending: isCreating } = useCreateGroup();
  const { mutate: updateGroup, isPending: isUpdating } = useUpdateGroup();
  const { mutate: deleteGroup, isPending: isDeleting } = useDeleteGroup();

  const isAdmin = currentUser?.role === "admin";
  const isPsychologist = currentUser?.role === "psychologist";
  const isTeacher = currentUser?.role === "teacher";
  const isBranchManager = currentUser?.role === "branch_manager";
  const isReceptionist = (currentUser?.role as string) === "receptionist";
  const canManageGroups = isAdmin || isPsychologist;
  const canAddSession = isTeacher || isPsychologist || isAdmin;
  // Admin, branch_manager, and receptionist can toggle public visibility.
  const canToggleVisibility = isAdmin || isBranchManager || isReceptionist;

  const qc = useQueryClient();
  const [togglingId, setTogglingId] = useState<number | null>(null);

  // Toggle a group's is_public flag. Calls PATCH /groups/:id/visibility,
  // then re-fetches the list so the card reflects the new state.
  const toggleGroupVisibility = async (group: Group) => {
    const newValue = !(group as any).isPublic;
    setTogglingId(group.id);
    try {
      const res = await fetch(`/api/groups/${group.id}/visibility`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isPublic: newValue }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to update visibility");
      }
      toast({
        title: newValue
          ? language === "ar"
            ? "تم فتح الفوج"
            : "Group opened"
          : language === "ar"
            ? "تم إغلاق الفوج"
            : "Group closed",
        description: newValue
          ? language === "ar"
            ? "أصبح الفوج ظاهراً في الصفحة الرئيسية."
            : "Group now visible on the public landing page."
          : language === "ar"
            ? "لن يظهر الفوج في الصفحة الرئيسية."
            : "Group hidden from the public landing page.",
      });
      // Invalidate every cached groups query (with or without query params)
      qc.invalidateQueries({ queryKey: ["/api/groups"] });
      refetch();
    } catch (e: any) {
      toast({
        title: language === "ar" ? "تعذّر التحديث" : "Update failed",
        description: e?.message ?? "",
        variant: "destructive",
      });
    } finally {
      setTogglingId(null);
    }
  };

  const [teachers, setTeachers] = useState<Array<{ id: number; name: string }>>(
    [],
  );
  const [levels, setLevels] = useState<
    Array<{ id: number; name: string; program?: { type: string } | null }>
  >([]);
  const [allStudents, setAllStudents] = useState<
    Array<{ id: number; name: string }>
  >([]);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editGroup, setEditGroup] = useState<Group | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  // Quick-add session state (from group card button)
  const { mutate: createSession, isPending: isSavingQuickSession } =
    useCreateSession();
  const [quickSessionGroupId, setQuickSessionGroupId] = useState<number | null>(
    null,
  );
  const [quickSessionGroupName, setQuickSessionGroupName] = useState("");
  const [quickSessionForm, setQuickSessionForm] = useState({
    sessionDate: new Date().toISOString().split("T")[0],
    sessionTime: "",
    lessonTitle: "",
    sessionKind: "regular" as "regular" | "support" | "makeup" | "intervention",
  });

  const openQuickSession = (groupId: number, groupName: string) => {
    setQuickSessionGroupId(groupId);
    setQuickSessionGroupName(groupName);
    setQuickSessionForm({
      sessionDate: new Date().toISOString().split("T")[0],
      sessionTime: "",
      lessonTitle: "",
      sessionKind: isPsychologist ? "intervention" : "regular",
    });
  };

  const handleQuickSession = () => {
    if (!quickSessionGroupId) return;
    createSession(
      {
        groupId: quickSessionGroupId,
        data: {
          sessionDate: quickSessionForm.sessionDate,
          lessonTitle: quickSessionForm.lessonTitle.trim() || undefined,
          sessionKind: quickSessionForm.sessionKind,
        },
      },
      {
        onSuccess: () => {
          toast({ title: t.groups.sessionAdded });
          setQuickSessionGroupId(null);
          refetch();
          qc.invalidateQueries({ queryKey: ["/api/groups"] });
        },
        onError: () =>
          toast({
            title: "Error",
            description: "Failed to save session.",
            variant: "destructive",
          }),
      },
    );
  };

  // Adhoc (one-off) session state
  const [isAdhocOpen, setIsAdhocOpen] = useState(false);
  const [adhocForm, setAdhocForm] = useState({
    studentId: "",
    sessionDate: new Date().toISOString().split("T")[0],
    durationMinutes: "45",
    title: "",
    notes: "",
  });
  const [isSavingAdhoc, setIsSavingAdhoc] = useState(false);

  const loadDropdownData = async () => {
    try {
      const [tRes, lRes, sRes] = await Promise.all([
        fetch("/api/users?role=teacher", { credentials: "include" }),
        fetch("/api/levels", { credentials: "include" }),
        fetch("/api/students", { credentials: "include" }),
      ]);
      if (tRes.ok) setTeachers(await tRes.json());
      if (lRes.ok) {
        const allLevels = await lRes.json();
        // Psychologists only see levels belonging to psychological programs
        if (isPsychologist) {
          setLevels(
            allLevels.filter((l: any) => l.program?.type === "psychological"),
          );
        } else {
          setLevels(allLevels);
        }
      }
      if (sRes.ok) setAllStudents(await sRes.json());
    } catch {}
  };

  const openCreate = async () => {
    setForm(EMPTY_FORM);
    await loadDropdownData();
    setIsCreateOpen(true);
  };

  const openEdit = async (g: Group) => {
    const days: number[] = g.recurringDays ?? [];
    const savedDayTimes = ((g as any).sessionDayTimes ?? null) as Record<
      string,
      string
    > | null;
    const fallbackTime = g.sessionStartTime ?? "";
    const dayTimes: Record<string, string> = {};
    for (const d of days) {
      const k = String(d);
      dayTimes[k] = savedDayTimes?.[k] ?? fallbackTime;
    }
    setForm({
      name: g.name,
      teacherId: g.teacherId ? String(g.teacherId) : "",
      levelId: g.levelId ? String(g.levelId) : "",
      startDate: g.startDate ?? "",
      recurringDays: days,
      sessionDayTimes: dayTimes,
      sessionDurationMins: g.sessionDurationMins
        ? String(g.sessionDurationMins)
        : "",
      maxStudents: String(g.maxStudents ?? 10),
      nextSessionGoal: g.nextSessionGoal ?? "",
    });
    await loadDropdownData();
    setEditGroup(g);
  };

  const buildPayload = () => {
    const cleanedDayTimes: Record<string, string> = {};
    for (const d of form.recurringDays) {
      const t = form.sessionDayTimes[String(d)];
      if (t) cleanedDayTimes[String(d)] = t;
    }
    const hasDayTimes = Object.keys(cleanedDayTimes).length > 0;
    return {
      name: form.name.trim(),
      teacherId: form.teacherId ? parseInt(form.teacherId) : undefined,
      levelId: form.levelId ? parseInt(form.levelId) : undefined,
      startDate: form.startDate || undefined,
      recurringDays:
        form.recurringDays.length > 0 ? form.recurringDays : undefined,
      sessionDayTimes: hasDayTimes ? cleanedDayTimes : undefined,
      sessionDurationMins: form.sessionDurationMins
        ? parseInt(form.sessionDurationMins)
        : undefined,
      maxStudents: parseInt(form.maxStudents) || 10,
      nextSessionGoal: form.nextSessionGoal.trim() || undefined,
    } as any;
  };

  const handleCreate = () => {
    if (!form.name.trim()) return;
    createGroup(buildPayload(), {
      onSuccess: () => {
        toast({ title: t.groups.groupCreated });
        setIsCreateOpen(false);
        setForm(EMPTY_FORM);
        refetch();
        qc.invalidateQueries({ queryKey: ["/api/groups"] });
        qc.invalidateQueries({ queryKey: ["/api/dashboard"] });
      },
      onError: (err: any) => {
        const msg = err?.message || "Failed to create group.";
        const isConflict = msg.toLowerCase().includes("conflict");
        toast({
          title: isConflict ? "⚠ " + t.groups.conflictError : "Error",
          description: isConflict ? msg : msg,
          variant: "destructive",
        });
      },
    });
  };

  const handleEdit = () => {
    if (!editGroup || !form.name.trim()) return;
    updateGroup(
      { id: editGroup.id, data: buildPayload() },
      {
        onSuccess: () => {
          toast({ title: t.groups.groupUpdated });
          setEditGroup(null);
          refetch();
          qc.invalidateQueries({ queryKey: ["/api/groups"] });
          qc.invalidateQueries({ queryKey: ["/api/dashboard"] });
        },
        onError: (err: any) => {
          const msg = err?.message || "Failed to update group.";
          const isConflict = msg.toLowerCase().includes("conflict");
          toast({
            title: isConflict ? "⚠ " + t.groups.conflictError : "Error",
            description: isConflict ? msg : msg,
            variant: "destructive",
          });
        },
      },
    );
  };

  const handleDelete = () => {
    if (!deleteConfirmId) return;
    deleteGroup(deleteConfirmId, {
      onSuccess: () => {
        toast({ title: t.groups.deleteGroup });
        setDeleteConfirmId(null);
        refetch();
        qc.invalidateQueries({ queryKey: ["/api/groups"] });
        qc.invalidateQueries({ queryKey: ["/api/dashboard"] });
      },
      onError: () => {
        toast({
          title: "Error",
          description: "Failed to delete group.",
          variant: "destructive",
        });
        setDeleteConfirmId(null);
      },
    });
  };

  const openAdhoc = async () => {
    setAdhocForm({
      studentId: "",
      sessionDate: new Date().toISOString().split("T")[0],
      durationMinutes: "45",
      title: "",
      notes: "",
    });
    if (allStudents.length === 0) {
      try {
        const res = await fetch("/api/students", { credentials: "include" });
        if (res.ok) setAllStudents(await res.json());
      } catch {}
    }
    setIsAdhocOpen(true);
  };

  const handleSaveAdhoc = async () => {
    if (!adhocForm.studentId || !adhocForm.sessionDate) return;
    setIsSavingAdhoc(true);
    try {
      const res = await fetch("/api/adhoc-sessions", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: parseInt(adhocForm.studentId),
          sessionDate: adhocForm.sessionDate,
          durationMinutes: parseInt(adhocForm.durationMinutes) || 45,
          title: adhocForm.title.trim() || undefined,
          notes: adhocForm.notes.trim() || undefined,
        }),
      });
      if (res.ok) {
        toast({ title: t.groups.adhocSaved });
        setIsAdhocOpen(false);
      } else {
        const err = await res.json().catch(() => ({}));
        toast({
          title: "Error",
          description: err.error || "Failed to save session.",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Error",
        description: "Network error.",
        variant: "destructive",
      });
    } finally {
      setIsSavingAdhoc(false);
    }
  };

  // Toggle a day on/off — also initializes/removes its time entry
  const toggleDay = (day: number) => {
    setForm((f) => {
      const key = String(day);
      const isSelected = f.recurringDays.includes(day);
      if (isSelected) {
        const { [key]: _removed, ...restTimes } = f.sessionDayTimes;
        return {
          ...f,
          recurringDays: f.recurringDays.filter((d) => d !== day),
          sessionDayTimes: restTimes,
        };
      }
      return {
        ...f,
        recurringDays: [...f.recurringDays, day],
        sessionDayTimes: { ...f.sessionDayTimes, [key]: "" },
      };
    });
  };

  const setDayTime = (day: number, time: string) => {
    setForm((f) => ({
      ...f,
      sessionDayTimes: { ...f.sessionDayTimes, [String(day)]: time },
    }));
  };

  // ── Form fields ─────────────────────────────────────────────────────────────
  const GroupFormFields = () => (
    <div className="space-y-5 py-2">
      {/* Group Name */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium">{t.groups.groupName} *</label>
        <Input
          placeholder="e.g. Beginners A, Advanced Group 2…"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
        />
      </div>

      {/* Teacher (admin only) */}
      {isAdmin && (
        <div className="space-y-1.5">
          <label className="text-sm font-medium">{t.groups.teacher}</label>
          <Select
            value={form.teacherId || "none"}
            onValueChange={(v) =>
              setForm((f) => ({ ...f, teacherId: v === "none" ? "" : v }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder={t.groups.selectTeacher} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{t.groups.noTeacher}</SelectItem>
              {teachers.map((tc) => (
                <SelectItem key={tc.id} value={String(tc.id)}>
                  {tc.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Level */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium">{t.groups.level}</label>
        <Select
          value={form.levelId || "none"}
          onValueChange={(v) =>
            setForm((f) => ({ ...f, levelId: v === "none" ? "" : v }))
          }
        >
          <SelectTrigger>
            <SelectValue placeholder={t.groups.selectLevel} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">{t.groups.noLevel}</SelectItem>
            {levels.map((lv) => (
              <SelectItem key={lv.id} value={String(lv.id)}>
                {lv.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ── Scheduling Section ─────────────────────────────────── */}
      <div className="rounded-lg border border-dashed border-muted-foreground/30 p-4 space-y-4 bg-muted/20">
        <div
          className="flex items-center gap-2 text-sm font-semibold"
          style={{ color: "#1B2E8F" }}
        >
          <CalendarDays className="w-4 h-4" />
          {t.groups.scheduleSection}
        </div>

        {/* Start Date */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {t.groups.startDate}
          </label>
          <Input
            type="date"
            value={form.startDate}
            onChange={(e) =>
              setForm((f) => ({ ...f, startDate: e.target.value }))
            }
            className="w-full"
          />
        </div>

        {/* Recurring Days */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {t.groups.recurringDays}
          </label>
          <div className="flex flex-wrap gap-2">
            {DAY_ORDER.map((day) => {
              const isSelected = form.recurringDays.includes(day);
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDay(day)}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all border"
                  style={
                    isSelected
                      ? {
                          backgroundColor: "#1B2E8F",
                          color: "#fff",
                          borderColor: "#1B2E8F",
                        }
                      : {
                          backgroundColor: "transparent",
                          color: "#64748b",
                          borderColor: "#e2e8f0",
                        }
                  }
                >
                  {(t.groups.dayNames as Record<string, string>)[String(day)]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Per-day Start Times — one picker per selected day */}
        {form.recurringDays.length > 0 && (
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {t.groups.sessionStartTime}
            </label>
            <div className="space-y-2">
              {[...form.recurringDays]
                .sort((a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b))
                .map((day) => {
                  const key = String(day);
                  const time = form.sessionDayTimes[key] ?? "";
                  const endTime =
                    time && form.sessionDurationMins
                      ? calcEndTime(time, parseInt(form.sessionDurationMins))
                      : null;
                  return (
                    <div key={day} className="flex items-center gap-2">
                      <div
                        className="px-3 py-1.5 rounded-full text-xs font-semibold min-w-[90px] text-center"
                        style={{ backgroundColor: "#1B2E8F", color: "#fff" }}
                      >
                        {(t.groups.dayNames as Record<string, string>)[key]}
                      </div>
                      <Input
                        type="time"
                        value={time}
                        onChange={(e) => setDayTime(day, e.target.value)}
                        className="flex-1"
                      />
                      {endTime && (
                        <span
                          className="text-xs font-semibold whitespace-nowrap"
                          style={{ color: "#1B2E8F" }}
                        >
                          → {endTime}
                        </span>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Duration (shared across all days) */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {t.groups.sessionDurationMins}
          </label>
          <Select
            value={form.sessionDurationMins || "none"}
            onValueChange={(v) =>
              setForm((f) => ({
                ...f,
                sessionDurationMins: v === "none" ? "" : v,
              }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="—" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">—</SelectItem>
              <SelectItem value="60">
                {(t.groups.durationOptions as Record<string, string>)["60"]}
              </SelectItem>
              <SelectItem value="90">
                {(t.groups.durationOptions as Record<string, string>)["90"]}
              </SelectItem>
              <SelectItem value="120">
                {(t.groups.durationOptions as Record<string, string>)["120"]}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Max Students */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium">{t.groups.maxStudents}</label>
        <Input
          type="number"
          min={1}
          max={50}
          value={form.maxStudents}
          onChange={(e) =>
            setForm((f) => ({ ...f, maxStudents: e.target.value }))
          }
        />
      </div>
    </div>
  );

  // ── Render ───────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        {t.groups.loadingGroups}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {isAdmin
              ? t.groups.adminTitle
              : isPsychologist
                ? t.groups.psychologistTitle
                : t.groups.title}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {isAdmin
              ? t.groups.adminSubtitle
              : isPsychologist
                ? t.groups.psychologistSubtitle
                : t.groups.subtitle}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {isPsychologist && (
            <Button
              variant="outline"
              className="font-semibold border-violet-300 text-violet-700 hover:bg-violet-50"
              onClick={openAdhoc}
            >
              <Sparkles className="w-4 h-4 me-2" />
              {t.groups.oneOffSession}
            </Button>
          )}
          {(isAdmin || isPsychologist) && (
            <Button
              style={{ backgroundColor: "#F5A600", color: "#1B2E8F" }}
              className="font-semibold"
              onClick={openCreate}
            >
              <Plus className="w-4 h-4 me-2" />
              {t.groups.newGroup}
            </Button>
          )}
        </div>
      </div>

      {/* Stats row (admin only) */}
      {isAdmin && groups.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold" style={{ color: "#1B2E8F" }}>
                {groups.length}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {t.groups.adminTitle}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold" style={{ color: "#1B2E8F" }}>
                {groups.reduce((s, g) => s + g.studentCount, 0)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {t.groups.students}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold" style={{ color: "#1B2E8F" }}>
                {new Set(groups.map((g) => g.teacherId).filter(Boolean)).size}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {t.groups.teacher}s
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Group cards */}
      {groups.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>{t.groups.noGroups}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((group) => {
            const capacity = group.maxStudents || 10;
            const pct = Math.min(100, (group.studentCount / capacity) * 100);
            const isFull = group.studentCount >= capacity;
            const scheduleSummary = buildScheduleSummary(
              group.recurringDays,
              group.sessionStartTime,
              ((group as any).sessionDayTimes ?? null) as Record<
                string,
                string
              > | null,
              group.sessionDurationMins,
              t.groups.dayNames as Record<string, string>,
            );

            return (
              <Card
                key={group.id}
                className="hover:shadow-md transition-shadow border-l-4 relative group/card"
                style={{ borderLeftColor: "#1B2E8F" }}
              >
                {/* Admin edit/delete + visibility toggle controls */}
                {(isAdmin || canToggleVisibility) && (
                  <div className="absolute top-3 end-3 flex gap-1 opacity-0 group-hover/card:opacity-100 transition-opacity z-10">
                    {canToggleVisibility && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className={`h-7 w-7 ${(group as any).isPublic ? "text-emerald-600 hover:bg-emerald-50" : "text-muted-foreground hover:bg-muted"}`}
                        title={
                          (group as any).isPublic
                            ? language === "ar"
                              ? "مفتوح — اضغط للإغلاق"
                              : "Public — click to close"
                            : language === "ar"
                              ? "مغلق — اضغط للفتح"
                              : "Hidden — click to publish"
                        }
                        disabled={togglingId === group.id}
                        onClick={(e) => {
                          e.preventDefault();
                          toggleGroupVisibility(group);
                        }}
                      >
                        {(group as any).isPublic ? (
                          <Eye className="w-3.5 h-3.5" />
                        ) : (
                          <EyeOff className="w-3.5 h-3.5" />
                        )}
                      </Button>
                    )}
                    {isAdmin && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-primary/10"
                          onClick={(e) => {
                            e.preventDefault();
                            openEdit(group);
                          }}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          onClick={(e) => {
                            e.preventDefault();
                            setDeleteConfirmId(group.id);
                          }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                )}

                <Link href={`/groups/${group.id}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2 pe-8">
                      <CardTitle className="text-lg leading-tight">
                        {group.name}
                      </CardTitle>
                      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {group.levelName && (
                        <Badge variant="outline" className="text-xs">
                          <GraduationCap className="w-3 h-3 me-1" />
                          {group.levelName}
                        </Badge>
                      )}
                      {(group as any).psychologicalLevelName && (
                        <Badge
                          variant="outline"
                          className="text-xs border-violet-300 text-violet-700 bg-violet-50"
                        >
                          <BrainCircuit className="w-3 h-3 me-1" />
                          {(group as any).psychologicalLevelName}
                        </Badge>
                      )}
                      {(group as any).isPublic ? (
                        <Badge className="text-xs bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100">
                          <Eye className="w-3 h-3 me-1" />
                          {language === "ar" ? "مفتوح" : "Open"}
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-xs border-muted-foreground/30 text-muted-foreground"
                        >
                          <EyeOff className="w-3 h-3 me-1" />
                          {language === "ar" ? "مغلق" : "Closed"}
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 pt-0">
                    {/* Teacher */}
                    {group.teacherName ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <UserCog
                          className="w-4 h-4 shrink-0"
                          style={{ color: "#1B2E8F" }}
                        />
                        <span className="font-medium text-foreground">
                          {group.teacherName}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground italic">
                        <UserCog className="w-4 h-4 shrink-0" />
                        <span>{t.groups.noTeacher}</span>
                      </div>
                    )}

                    {/* Schedule summary */}
                    {scheduleSummary ? (
                      <div
                        className="rounded-md px-2.5 py-2 text-xs font-medium flex items-center gap-2"
                        style={{ backgroundColor: "#1B2E8F" + "0D" }}
                      >
                        <Calendar
                          className="w-3.5 h-3.5 shrink-0"
                          style={{ color: "#1B2E8F" }}
                        />
                        <span style={{ color: "#1B2E8F" }}>
                          {scheduleSummary}
                        </span>
                      </div>
                    ) : group.schedule ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="w-4 h-4 shrink-0" />
                        <span>{group.schedule}</span>
                      </div>
                    ) : null}

                    {/* Start date badge */}
                    {group.startDate && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <CalendarDays className="w-3.5 h-3.5 shrink-0" />
                        <span>
                          {t.groups.startDate}:{" "}
                          <span className="font-medium text-foreground">
                            {group.startDate}
                          </span>
                        </span>
                      </div>
                    )}

                    {/* Student count + capacity bar */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                          <Users className="w-4 h-4" />
                          {group.studentCount} / {capacity} {t.groups.students}
                        </span>
                        {isFull && (
                          <span className="text-xs font-medium text-amber-600 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            Full
                          </span>
                        )}
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: isFull ? "#F5A600" : "#1B2E8F",
                          }}
                        />
                      </div>
                    </div>

                    {/* Next session goal */}
                    {group.nextSessionGoal && (
                      <div className="flex items-start gap-2 text-sm">
                        <Target
                          className="w-4 h-4 mt-0.5 shrink-0"
                          style={{ color: "#F5A600" }}
                        />
                        <span className="text-muted-foreground line-clamp-2">
                          {group.nextSessionGoal}
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Link>

                {/* Add Session button — outside Link so it doesn't navigate */}
                {canAddSession && (
                  <div className="px-4 pb-4 pt-0">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full gap-2 text-xs font-semibold border-dashed hover:border-solid transition-all"
                      style={{ borderColor: "#1B2E8F", color: "#1B2E8F" }}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        openQuickSession(group.id, group.name);
                      }}
                    >
                      <CalendarPlus className="w-3.5 h-3.5" />
                      {language === "ar"
                        ? t.groups.addSessionQuickAr
                        : t.groups.addSessionQuick}
                    </Button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t.groups.createGroup}</DialogTitle>
          </DialogHeader>
          {GroupFormFields()}
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">{t.groups.cancel}</Button>
            </DialogClose>
            <Button
              style={{ backgroundColor: "#F5A600", color: "#1B2E8F" }}
              className="font-semibold"
              onClick={handleCreate}
              disabled={isCreating || !form.name.trim()}
            >
              {isCreating ? t.groups.saving : t.groups.createGroup}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog
        open={!!editGroup}
        onOpenChange={(o) => {
          if (!o) setEditGroup(null);
        }}
      >
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t.groups.editGroup}</DialogTitle>
          </DialogHeader>
          {GroupFormFields()}
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">{t.groups.cancel}</Button>
            </DialogClose>
            <Button
              style={{ backgroundColor: "#F5A600", color: "#1B2E8F" }}
              className="font-semibold"
              onClick={handleEdit}
              disabled={isUpdating || !form.name.trim()}
            >
              {isUpdating ? t.groups.saving : t.groups.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog
        open={!!deleteConfirmId}
        onOpenChange={(o) => {
          if (!o) setDeleteConfirmId(null);
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              {t.groups.deleteGroup}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t.groups.deleteConfirm}
          </p>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">{t.groups.cancel}</Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? t.groups.saving : t.groups.deleteGroup}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ad-hoc (One-off) Session Dialog — psychologist only */}
      <Dialog open={isAdhocOpen} onOpenChange={setIsAdhocOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle
              className="flex items-center gap-2"
              style={{ color: "#7c3aed" }}
            >
              <Sparkles className="w-5 h-5" />
              {t.groups.adhocSessionTitle}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Student */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                {t.groups.adhocStudent} *
              </label>
              <Select
                value={adhocForm.studentId || "none"}
                onValueChange={(v) =>
                  setAdhocForm((f) => ({
                    ...f,
                    studentId: v === "none" ? "" : v,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={t.groups.adhocSelectStudent} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    {t.groups.adhocSelectStudent}
                  </SelectItem>
                  {allStudents.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Session Date */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                {t.groups.sessionDate} *
              </label>
              <Input
                type="date"
                value={adhocForm.sessionDate}
                onChange={(e) =>
                  setAdhocForm((f) => ({ ...f, sessionDate: e.target.value }))
                }
              />
            </div>
            {/* Duration */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                {t.groups.adhocDuration}
              </label>
              <Select
                value={adhocForm.durationMinutes}
                onValueChange={(v) =>
                  setAdhocForm((f) => ({ ...f, durationMinutes: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["30", "45", "60", "90", "120"].map((d) => (
                    <SelectItem key={d} value={d}>
                      {d} min
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Title */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                {t.groups.adhocTitle}
              </label>
              <Input
                placeholder="e.g. Individual Assessment…"
                value={adhocForm.title}
                onChange={(e) =>
                  setAdhocForm((f) => ({ ...f, title: e.target.value }))
                }
              />
            </div>
            {/* Notes */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                {t.groups.adhocNotes}
              </label>
              <Textarea
                placeholder="Session observations, recommendations…"
                value={adhocForm.notes}
                onChange={(e) =>
                  setAdhocForm((f) => ({ ...f, notes: e.target.value }))
                }
                rows={3}
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
              onClick={handleSaveAdhoc}
              disabled={
                isSavingAdhoc || !adhocForm.studentId || !adhocForm.sessionDate
              }
            >
              {isSavingAdhoc ? t.groups.saving : t.groups.saveSession}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Quick Add Session Modal ───────────────────────────────────────────── */}
      <Dialog
        open={quickSessionGroupId !== null}
        onOpenChange={(open) => !open && setQuickSessionGroupId(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarPlus className="w-5 h-5" style={{ color: "#F5A600" }} />
              {language === "ar"
                ? t.groups.addSessionQuickAr
                : t.groups.addSessionQuick}
            </DialogTitle>
            {quickSessionGroupName && (
              <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
                <BookOpen
                  className="w-3.5 h-3.5 shrink-0"
                  style={{ color: "#1B2E8F" }}
                />
                <span className="font-medium" style={{ color: "#1B2E8F" }}>
                  {quickSessionGroupName}
                </span>
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {t.groups.addSessionQuickDesc}
            </p>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Date */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                {t.groups.sessionDate}
              </label>
              <Input
                type="date"
                value={quickSessionForm.sessionDate}
                onChange={(e) =>
                  setQuickSessionForm((f) => ({
                    ...f,
                    sessionDate: e.target.value,
                  }))
                }
              />
            </div>

            {/* Time (optional) */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                {t.groups.sessionTimeOptional}
              </label>
              <Input
                type="time"
                value={quickSessionForm.sessionTime}
                onChange={(e) =>
                  setQuickSessionForm((f) => ({
                    ...f,
                    sessionTime: e.target.value,
                  }))
                }
              />
            </div>

            {/* Topic / Title */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                {t.groups.sessionTopic}
              </label>
              <Input
                placeholder={t.groups.sessionTopicPlaceholder}
                value={quickSessionForm.lessonTitle}
                onChange={(e) =>
                  setQuickSessionForm((f) => ({
                    ...f,
                    lessonTitle: e.target.value,
                  }))
                }
              />
            </div>

            {/* Session Type */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                {t.groups.sessionType}
              </label>
              <Select
                value={quickSessionForm.sessionKind}
                onValueChange={(v) =>
                  setQuickSessionForm((f) => ({ ...f, sessionKind: v as any }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(isAdmin || isTeacher) && (
                    <>
                      <SelectItem value="regular">
                        {(t.groups.sessionTypes as any).regular}
                      </SelectItem>
                      <SelectItem value="support">
                        {(t.groups.sessionTypes as any).support}
                      </SelectItem>
                      <SelectItem value="makeup">
                        {(t.groups.sessionTypes as any).makeup}
                      </SelectItem>
                    </>
                  )}
                  {(isAdmin || isPsychologist) && (
                    <SelectItem value="intervention">
                      {(t.groups.sessionTypes as any).intervention}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Info chip */}
            <div
              className="rounded-lg px-3 py-2 text-xs flex items-center gap-2"
              style={{
                backgroundColor: "#F5A60015",
                border: "1px solid #F5A60040",
              }}
            >
              <Users
                className="w-3.5 h-3.5 shrink-0"
                style={{ color: "#F5A600" }}
              />
              <span style={{ color: "#b37a00" }}>
                {t.groups.addSessionQuickDesc}
              </span>
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">{t.groups.cancel}</Button>
            </DialogClose>
            <Button
              disabled={isSavingQuickSession || !quickSessionForm.sessionDate}
              onClick={handleQuickSession}
              style={{ backgroundColor: "#1B2E8F", color: "white" }}
              className="font-semibold gap-2"
            >
              <CalendarPlus className="w-4 h-4" />
              {isSavingQuickSession ? t.groups.saving : t.groups.saveSession}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

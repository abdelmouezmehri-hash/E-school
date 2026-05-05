import { useState } from "react";
import {
  useListLevels,
  useDeleteLevel,
  useListUsers,
  useGetMe,
  getListLevelsQueryKey,
} from "@workspace/api-client-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus,
  Users,
  Clock,
  CalendarDays,
  Banknote,
  Pencil,
  Trash2,
  GraduationCap,
  BookOpen,
  AlertTriangle,
  UserCheck,
  X,
  Search,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/language-context";

/* ─── plain fetch helper ─── */
async function apiFetch(url: string, options: RequestInit = {}) {
  const res = await fetch(url, { credentials: "include", ...options });
  const data = await res.json();
  if (!res.ok) throw data;
  return data;
}

/* ─── types ─── */
interface LevelWithMeta {
  id: number;
  name: string;
  nameAr?: string | null;
  description?: string | null;
  descriptionAr?: string | null;
  durationWeeks: number;
  sessionsPerWeek: number;
  price: number;
  studentCount: number;
  teachers?: { id: number; name: string }[];
  groups?: { groupId: number; maxStudents?: number }[];
  createdAt: string;
}

/* ─── helpers ─── */
function formatDZD(amount: number) {
  return new Intl.NumberFormat("ar-DZ", {
    style: "currency",
    currency: "DZD",
    minimumFractionDigits: 0,
  }).format(amount);
}

const BLANK = {
  name: "",
  nameAr: "",
  description: "",
  descriptionAr: "",
  durationWeeks: "12",
  sessionsPerWeek: "2",
  price: "0",
  defaultMaxStudents: "10",
  teacherIds: [] as number[],
};

/* ─── teacher multi-select ─── */
function TeacherPicker({
  teachers,
  selected,
  onChange,
  searchLabel,
  noOptions,
}: {
  teachers: { id: number; name: string }[];
  selected: number[];
  onChange: (ids: number[]) => void;
  searchLabel: string;
  noOptions: string;
}) {
  const [q, setQ] = useState("");
  const filtered = teachers.filter((t) =>
    t.name.toLowerCase().includes(q.toLowerCase())
  );
  const toggle = (id: number) =>
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute start-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
        <Input
          className="ps-8 h-9"
          placeholder={searchLabel}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      <div className="border rounded-lg max-h-40 overflow-y-auto divide-y">
        {filtered.length === 0 ? (
          <p className="text-center text-xs text-muted-foreground py-3">{noOptions}</p>
        ) : (
          filtered.map((t) => {
            const active = selected.includes(t.id);
            return (
              <button
                key={t.id}
                type="button"
                className={`w-full text-start px-3 py-2.5 text-sm flex items-center gap-2 transition-colors hover:bg-muted/50 ${active ? "font-medium" : ""}`}
                onClick={() => toggle(t.id)}
              >
                <div
                  className="w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors"
                  style={
                    active
                      ? { backgroundColor: "#1B2E8F", borderColor: "#1B2E8F" }
                      : { borderColor: "#9ca3af" }
                  }
                >
                  {active && <span className="text-white text-[10px] font-bold">✓</span>}
                </div>
                {t.name}
              </button>
            );
          })
        )}
      </div>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {selected.map((id) => {
            const t = teachers.find((x) => x.id === id);
            return t ? (
              <Badge key={id} variant="secondary" className="gap-1 text-xs">
                {t.name}
                <button type="button" onClick={() => toggle(id)} className="hover:text-destructive">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ) : null;
          })}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Main page
═══════════════════════════════════════════════════════════ */
export default function LevelsList() {
  const { t, language } = useLanguage();
  const getLang = (en: string | null | undefined, ar: string | null | undefined) =>
    language === "ar" ? (ar || en || "") : (en || ar || "");
  const { toast } = useToast();
  const lt = t.levels;
  const qc = useQueryClient();

  const { data: me } = useGetMe();
  const isAdmin = (me as any)?.role === "admin";

  const { data: levels = [], refetch, isLoading } = useListLevels();
  const { data: allUsers = [] } = useListUsers({});
  const teachers = (allUsers as any[]).filter((u: any) => u.role === "teacher");

  /* ── mutations ── */
  const levelsQueryKey = getListLevelsQueryKey();

  const { mutate: createLevelMutate, isPending: isCreating } = useMutation({
    mutationFn: (body: object) =>
      apiFetch("/api/levels", {
        method: "POST",
        body: JSON.stringify(body),
        headers: { "Content-Type": "application/json" },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: levelsQueryKey });
      refetch();
    },
  });

  const { mutate: updateLevelMutate, isPending: isUpdating } = useMutation({
    mutationFn: ({ id, body }: { id: number; body: object }) =>
      apiFetch(`/api/levels/${id}`, {
        method: "PUT",
        body: JSON.stringify(body),
        headers: { "Content-Type": "application/json" },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: levelsQueryKey });
      refetch();
    },
  });

  const { mutate: deleteLevel } = useDeleteLevel({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: levelsQueryKey });
        refetch();
      },
    },
  });

  /* ── modal state ── */
  const [mode, setMode] = useState<"create" | "edit" | null>(null);
  const [editTarget, setEditTarget] = useState<LevelWithMeta | null>(null);
  const [form, setForm] = useState({ ...BLANK });

  /* ── delete state ── */
  const [deleteTarget, setDeleteTarget] = useState<LevelWithMeta | null>(null);
  const [deleteBlocked, setDeleteBlocked] = useState(false);

  const openCreate = () => {
    setForm({ ...BLANK });
    setEditTarget(null);
    setMode("create");
  };

  const openEdit = (level: LevelWithMeta) => {
    setForm({
      name: level.name,
      nameAr: level.nameAr ?? "",
      description: level.description ?? "",
      descriptionAr: level.descriptionAr ?? "",
      durationWeeks: String(level.durationWeeks),
      sessionsPerWeek: String(level.sessionsPerWeek),
      price: String(level.price),
      defaultMaxStudents: String(level.groups?.[0]?.maxStudents ?? 10),
      teacherIds: (level.teachers ?? []).map((t) => t.id),
    });
    setEditTarget(level);
    setMode("edit");
  };

  const handleSave = () => {
    const body = {
      name: form.name.trim(),
      nameAr: form.nameAr?.trim() || null,
      description: form.description.trim() || null,
      descriptionAr: form.descriptionAr?.trim() || null,
      durationWeeks: parseInt(form.durationWeeks),
      sessionsPerWeek: parseInt(form.sessionsPerWeek),
      price: parseFloat(form.price),
      teacherIds: form.teacherIds,
      defaultMaxStudents: parseInt(form.defaultMaxStudents),
    };
    if (!body.name) {
      toast({ title: lt.nameRequired, variant: "destructive" });
      return;
    }

    if (mode === "create") {
      createLevelMutate(body, {
        onSuccess: () => {
          toast({ title: lt.created });
          setMode(null);
        },
        onError: () => toast({ title: lt.errorSaving, variant: "destructive" }),
      });
    } else if (editTarget) {
      updateLevelMutate(
        { id: editTarget.id, body },
        {
          onSuccess: () => {
            toast({ title: lt.updated });
            setMode(null);
          },
          onError: () => toast({ title: lt.errorSaving, variant: "destructive" }),
        }
      );
    }
  };

  const handleDeleteClick = (level: LevelWithMeta) => {
    setDeleteTarget(level);
    setDeleteBlocked((level.studentCount ?? 0) > 0);
  };

  const confirmDelete = () => {
    if (!deleteTarget || deleteBlocked) return;
    deleteLevel(
      { id: deleteTarget.id },
      {
        onSuccess: () => {
          toast({ title: lt.deleted });
          setDeleteTarget(null);
        },
        onError: () => toast({ title: lt.errorDeleting, variant: "destructive" }),
      }
    );
  };

  const autoSessions = (dw: string, spw: string) => {
    const d = parseInt(dw);
    const s = parseInt(spw);
    return !isNaN(d) && !isNaN(s) ? d * s : "—";
  };

  /* ═══ render ═══ */
  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{lt.title}</h1>
          <p className="text-muted-foreground text-sm mt-1">{lt.subtitle}</p>
        </div>
        {isAdmin && (
          <Button
            style={{ backgroundColor: "#F5A600", color: "#1B2E8F" }}
            className="font-semibold shrink-0"
            onClick={openCreate}
          >
            <Plus className="h-4 w-4 me-2" />
            {lt.addLevel}
          </Button>
        )}
      </div>

      {/* ── Level grid ── */}
      {isLoading ? (
        <div className="text-center py-16 text-muted-foreground">{lt.loading}</div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {(levels as LevelWithMeta[]).map((level) => {
            const sessions = level.durationWeeks * level.sessionsPerWeek;
            const teacherNames = (level.teachers ?? []).map((t) => t.name);

            return (
              <Card
                key={level.id}
                className="flex flex-col overflow-hidden border hover:shadow-md transition-shadow"
              >
                <CardHeader className="pb-3 pt-4 px-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-3 min-w-0">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                        style={{ backgroundColor: "#1B2E8F18" }}
                      >
                        <GraduationCap className="w-5 h-5" style={{ color: "#1B2E8F" }} />
                      </div>
                      <div className="min-w-0">
                        <CardTitle className="text-lg leading-tight">{getLang(level.name, level.nameAr)}</CardTitle>
                        {(level.description || level.descriptionAr) && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                            {getLang(level.description, level.descriptionAr)}
                          </p>
                        )}
                      </div>
                    </div>
                    {/* DZD price badge */}
                    <div
                      className="shrink-0 px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap"
                      style={{ backgroundColor: "#F5A60020", color: "#a37200" }}
                    >
                      {formatDZD(level.price)}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="flex-1 px-5 pb-4 space-y-4">
                  {/* Stats row */}
                  <div className="grid grid-cols-4 gap-1 text-center">
                    <div className="flex flex-col items-center gap-0.5">
                      <CalendarDays className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-xs font-bold">{level.durationWeeks}</span>
                      <span className="text-[10px] text-muted-foreground leading-tight">
                        {lt.weeks}
                      </span>
                    </div>
                    <div className="flex flex-col items-center gap-0.5 border-s border-e">
                      <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-xs font-bold">{level.sessionsPerWeek}</span>
                      <span className="text-[10px] text-muted-foreground leading-tight">
                        {lt.perWeek}
                      </span>
                    </div>
                    <div className="flex flex-col items-center gap-0.5 border-e">
                      <BookOpen className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-xs font-bold">{sessions}</span>
                      <span className="text-[10px] text-muted-foreground leading-tight">
                        {lt.sessions}
                      </span>
                    </div>
                    <div className="flex flex-col items-center gap-0.5">
                      <Users className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-xs font-bold">{level.studentCount}</span>
                      <span className="text-[10px] text-muted-foreground leading-tight">
                        {lt.students}
                      </span>
                    </div>
                  </div>

                  {/* Assigned teachers */}
                  {teacherNames.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                        <UserCheck className="w-3.5 h-3.5" />
                        {lt.assignedTeachers}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {teacherNames.map((name, i) => (
                          <Badge
                            key={i}
                            variant="secondary"
                            className="text-xs"
                            style={{ backgroundColor: "#1B2E8F12", color: "#1B2E8F" }}
                          >
                            {name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>

                {/* Admin action footer */}
                {isAdmin && (
                  <div className="border-t px-5 py-3 flex items-center justify-between bg-muted/20">
                    <span className="text-xs text-muted-foreground">
                      {lt.totalSessions}: <strong>{sessions}</strong>
                    </span>
                    <div className="flex gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 w-8 p-0"
                        onClick={() => openEdit(level)}
                        title={lt.edit}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 w-8 p-0 border-red-200 text-red-500 hover:bg-red-50"
                        onClick={() => handleDeleteClick(level)}
                        title={lt.delete}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}

          {/* Empty state */}
          {levels.length === 0 && (
            <div className="col-span-full text-center py-16 border rounded-xl bg-card/50 text-muted-foreground">
              <GraduationCap className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="font-medium">{lt.noLevels}</p>
              {isAdmin && (
                <Button
                  className="mt-4"
                  style={{ backgroundColor: "#F5A600", color: "#1B2E8F" }}
                  onClick={openCreate}
                >
                  <Plus className="w-4 h-4 me-2" />
                  {lt.addLevel}
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ═══ Create / Edit Dialog ═══ */}
      <Dialog open={!!mode} onOpenChange={(o) => { if (!o) setMode(null); }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {mode === "create" ? lt.createTitle : lt.editTitle}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Name EN + AR */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{lt.levelName} *</label>
                <Input
                  placeholder={lt.namePlaceholder}
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{(lt as any).nameAr ?? "الاسم بالعربية"} <span className="text-muted-foreground text-xs">(اختياري)</span></label>
                <Input
                  dir="rtl"
                  placeholder="مثال: مبتدئ ١"
                  value={form.nameAr ?? ""}
                  onChange={(e) => setForm((p) => ({ ...p, nameAr: e.target.value }))}
                />
              </div>
            </div>

            {/* Description EN + AR */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{lt.description}</label>
              <Textarea
                rows={2}
                placeholder={lt.descriptionPlaceholder}
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{(lt as any).descriptionAr ?? "الوصف بالعربية"} <span className="text-muted-foreground text-xs">(اختياري)</span></label>
              <Textarea
                dir="rtl"
                rows={2}
                placeholder="وصف المستوى بالعربية..."
                value={form.descriptionAr ?? ""}
                onChange={(e) => setForm((p) => ({ ...p, descriptionAr: e.target.value }))}
              />
            </div>

            {/* Duration + Sessions */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{lt.durationWeeks}</label>
                <Input
                  type="number"
                  min="1"
                  value={form.durationWeeks}
                  onChange={(e) => setForm((p) => ({ ...p, durationWeeks: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{lt.sessionsPerWeek}</label>
                <Input
                  type="number"
                  min="1"
                  value={form.sessionsPerWeek}
                  onChange={(e) => setForm((p) => ({ ...p, sessionsPerWeek: e.target.value }))}
                />
              </div>
            </div>

            {/* Auto session count hint */}
            <div className="rounded-lg border border-dashed p-3 bg-muted/20 flex items-center gap-2 text-xs text-muted-foreground">
              <BookOpen className="w-4 h-4 shrink-0" />
              {lt.autoSessions}:&nbsp;
              <strong>{autoSessions(form.durationWeeks, form.sessionsPerWeek)} {lt.sessionsTotal}</strong>
              <span className="text-[10px]">({lt.attendanceHint})</span>
            </div>

            {/* Price (DZD) */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium flex items-center gap-1">
                <Banknote className="w-4 h-4" style={{ color: "#F5A600" }} />
                {lt.price}
              </label>
              <div className="relative">
                <span className="absolute start-3 top-2.5 text-sm text-muted-foreground font-medium select-none">
                  د.ج
                </span>
                <Input
                  type="number"
                  min="0"
                  step="100"
                  className="ps-12"
                  placeholder="0"
                  value={form.price}
                  onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))}
                />
              </div>
              <p className="text-xs text-muted-foreground">{lt.priceHint}</p>
            </div>

            {/* Max students per group */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium flex items-center gap-1">
                <Users className="w-4 h-4" />
                {lt.maxStudents}
              </label>
              <Input
                type="number"
                min="1"
                max="50"
                value={form.defaultMaxStudents}
                onChange={(e) => setForm((p) => ({ ...p, defaultMaxStudents: e.target.value }))}
              />
            </div>

            {/* Teacher assignment */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium flex items-center gap-1">
                <UserCheck className="w-4 h-4" />
                {lt.assignTeachers}
              </label>
              <TeacherPicker
                teachers={teachers.map((u: any) => ({ id: u.id, name: u.name }))}
                selected={form.teacherIds}
                onChange={(ids) => setForm((p) => ({ ...p, teacherIds: ids }))}
                searchLabel={lt.searchTeachers}
                noOptions={lt.noTeachers}
              />
              {form.teacherIds.length > 0 && (
                <p className="text-xs text-muted-foreground">{lt.teacherGroupHint}</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">{lt.cancel}</Button>
            </DialogClose>
            <Button
              style={{ backgroundColor: "#1B2E8F", color: "white" }}
              className="font-semibold"
              onClick={handleSave}
              disabled={isCreating || isUpdating}
            >
              {isCreating || isUpdating ? lt.saving : lt.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ Delete Safety Dialog ═══ */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {deleteBlocked ? (
                <>
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                  {lt.deleteBlockedTitle}
                </>
              ) : (
                <>
                  <Trash2 className="w-5 h-5 text-red-500" />
                  {lt.deleteTitle}
                </>
              )}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="text-sm">
                {deleteBlocked ? (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800 space-y-1">
                    <p className="font-semibold">{lt.deleteBlockedWarning}</p>
                    <p>{lt.deleteBlockedCount.replace("{n}", String(deleteTarget?.studentCount ?? 0))}</p>
                    <p className="text-xs">{lt.deleteBlockedHint}</p>
                  </div>
                ) : (
                  <p>{lt.deleteConfirm.replace("{name}", deleteTarget?.name ?? "")}</p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{lt.cancel}</AlertDialogCancel>
            {!deleteBlocked && (
              <AlertDialogAction
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={confirmDelete}
              >
                {lt.delete}
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
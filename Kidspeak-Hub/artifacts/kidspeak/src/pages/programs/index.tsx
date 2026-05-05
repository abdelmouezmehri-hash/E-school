import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useGetMe, useListUsers } from "@workspace/api-client-react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  GraduationCap,
  BookOpen,
  Brain,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronUp,
  Layers,
  Users,
  Banknote,
  Clock,
  AlertTriangle,
  Stethoscope,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/language-context";
import { useQuery, useMutation } from "@tanstack/react-query";

/* ─── types ─── */
interface LinkedGroup { id: number; name: string; teacherName: string | null; }

interface LevelInProgram {
  id: number;
  name: string;
  nameAr?: string | null;
  description?: string | null;
  descriptionAr?: string | null;
  durationWeeks: number;
  sessionsPerWeek: number;
  price: number;
  sessionType?: string | null;
  studentCount: number;
  linkedGroups?: LinkedGroup[];
}

interface ProgramWithLevels {
  id: number;
  name: string;
  nameAr?: string | null;
  type: "language" | "psychological";
  description?: string | null;
  descriptionAr?: string | null;
  leadSpecialistId?: number | null;
  leadSpecialist?: { id: number; name: string; role: string } | null;
  levels: LevelInProgram[];
  levelCount: number;
  createdAt: string;
}

/* ─── helpers ─── */
async function apiFetch(url: string, opts: RequestInit = {}) {
  const r = await fetch(url, { credentials: "include", ...opts });
  const data = await r.json();
  if (!r.ok) throw data;
  return data;
}

function formatDZD(amount: number) {
  return new Intl.NumberFormat("ar-DZ", { style: "currency", currency: "DZD", minimumFractionDigits: 0 }).format(amount);
}

const SESSION_TYPES = ["learning_difficulties", "emotional_intelligence", "concentration_boost", "general"] as const;

/* ─── bilingual helper ─── */
function getLang(en: string | null | undefined, ar: string | null | undefined, language: string): string {
  if (language === "ar") return ar || en || "";
  return en || ar || "";
}

/* ─── Component ─── */
export default function ProgramsPage() {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: me } = useGetMe();
  const isAdmin = me?.role === "admin";

  /* Fetch programs */
  const { data: programs = [], isLoading } = useQuery<ProgramWithLevels[]>({
    queryKey: ["programs"],
    queryFn: () => apiFetch("/api/programs"),
  });

  /* Fetch psychologists for lead specialist picker */
  const { data: allUsers = [] } = useListUsers();
  const psychologists = (allUsers as any[]).filter((u: any) => u.role === "psychologist");

  /* Expanded cards state */
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const toggle = (id: number) => setExpanded(prev => {
    const n = new Set(prev);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  });

  /* ── Program dialog ── */
  const [progDialog, setProgDialog] = useState(false);
  const [editingProg, setEditingProg] = useState<ProgramWithLevels | null>(null);
  const [progForm, setProgForm] = useState({ name: "", nameAr: "", type: "language" as "language" | "psychological", description: "", descriptionAr: "", leadSpecialistId: "" });
  const [isSavingProg, setIsSavingProg] = useState(false);

  const openProgCreate = () => {
    setEditingProg(null);
    setProgForm({ name: "", nameAr: "", type: "language", description: "", descriptionAr: "", leadSpecialistId: "" });
    setProgDialog(true);
  };
  const openProgEdit = (p: ProgramWithLevels) => {
    setEditingProg(p);
    setProgForm({ name: p.name, nameAr: p.nameAr ?? "", type: p.type, description: p.description ?? "", descriptionAr: p.descriptionAr ?? "", leadSpecialistId: p.leadSpecialistId ? String(p.leadSpecialistId) : "" });
    setProgDialog(true);
  };

  const handleSaveProg = async () => {
    if (!progForm.name.trim()) { toast({ title: t.programs.nameRequired, variant: "destructive" }); return; }
    setIsSavingProg(true);
    try {
      const body = {
        name: progForm.name.trim(),
        nameAr: progForm.nameAr.trim() || null,
        type: progForm.type,
        description: progForm.description.trim() || null,
        descriptionAr: progForm.descriptionAr.trim() || null,
        leadSpecialistId: progForm.leadSpecialistId ? parseInt(progForm.leadSpecialistId) : null,
      };
      if (editingProg) {
        await apiFetch(`/api/programs/${editingProg.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        toast({ title: t.programs.updated });
      } else {
        await apiFetch("/api/programs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        toast({ title: t.programs.created });
      }
      qc.invalidateQueries({ queryKey: ["programs"] });
      setProgDialog(false);
    } catch {
      toast({ title: t.programs.errorSaving, variant: "destructive" });
    } finally {
      setIsSavingProg(false);
    }
  };

  /* ── Delete program ── */
  const [deleteProgTarget, setDeleteProgTarget] = useState<ProgramWithLevels | null>(null);
  const [deleteBlockedMsg, setDeleteBlockedMsg] = useState<string | null>(null);

  const handleDeleteProg = async () => {
    if (!deleteProgTarget) return;
    try {
      await apiFetch(`/api/programs/${deleteProgTarget.id}`, { method: "DELETE" });
      toast({ title: t.programs.deleted });
      qc.invalidateQueries({ queryKey: ["programs"] });
      setDeleteProgTarget(null);
    } catch (err: any) {
      if (err?.error === "has_levels") {
        setDeleteProgTarget(null);
        setDeleteBlockedMsg(t.programs.deleteBlockedMsg.replace("{n}", String(err.count)));
      } else {
        toast({ title: t.programs.errorDeleting, variant: "destructive" });
        setDeleteProgTarget(null);
      }
    }
  };

  /* ── Level dialog (for add/edit level within a program) ── */
  const [levelDialog, setLevelDialog] = useState(false);
  const [editingLevel, setEditingLevel] = useState<LevelInProgram | null>(null);
  const [levelProgId, setLevelProgId] = useState<number | null>(null);
  const [levelProgType, setLevelProgType] = useState<"language" | "psychological">("language");
  const [levelForm, setLevelForm] = useState({ name: "", nameAr: "", description: "", descriptionAr: "", durationWeeks: "12", sessionsPerWeek: "2", price: "0", sessionType: "" });
  const [isSavingLevel, setIsSavingLevel] = useState(false);

  const openLevelCreate = (prog: ProgramWithLevels) => {
    setEditingLevel(null);
    setLevelProgId(prog.id);
    setLevelProgType(prog.type);
    setLevelForm({ name: "", nameAr: "", description: "", descriptionAr: "", durationWeeks: "12", sessionsPerWeek: "2", price: "0", sessionType: prog.type === "psychological" ? "general" : "" });
    setLevelDialog(true);
  };
  const openLevelEdit = (level: LevelInProgram, prog: ProgramWithLevels) => {
    setEditingLevel(level);
    setLevelProgId(prog.id);
    setLevelProgType(prog.type);
    setLevelForm({
      name: level.name,
      nameAr: level.nameAr ?? "",
      description: level.description ?? "",
      descriptionAr: level.descriptionAr ?? "",
      durationWeeks: String(level.durationWeeks),
      sessionsPerWeek: String(level.sessionsPerWeek),
      price: String(level.price),
      sessionType: level.sessionType ?? "",
    });
    setLevelDialog(true);
  };

  const handleSaveLevel = async () => {
    if (!levelForm.name.trim()) { toast({ title: t.levels.nameRequired, variant: "destructive" }); return; }
    setIsSavingLevel(true);
    try {
      const body = {
        name: levelForm.name.trim(),
        nameAr: levelForm.nameAr.trim() || null,
        description: levelForm.description.trim() || null,
        descriptionAr: levelForm.descriptionAr.trim() || null,
        durationWeeks: parseInt(levelForm.durationWeeks) || 12,
        sessionsPerWeek: parseInt(levelForm.sessionsPerWeek) || 2,
        price: parseFloat(levelForm.price) || 0,
        programId: levelProgId,
        sessionType: levelForm.sessionType || null,
      };
      if (editingLevel) {
        await apiFetch(`/api/levels/${editingLevel.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        toast({ title: t.levels.updated });
      } else {
        await apiFetch("/api/levels", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        toast({ title: t.levels.created });
      }
      qc.invalidateQueries({ queryKey: ["programs"] });
      setLevelDialog(false);
    } catch {
      toast({ title: t.levels.errorSaving, variant: "destructive" });
    } finally {
      setIsSavingLevel(false);
    }
  };

  /* ── Assign group dialog ── */
  const [assignDialog, setAssignDialog] = useState(false);
  const [assignLevel, setAssignLevel] = useState<LevelInProgram | null>(null);
  const [assignProg, setAssignProg] = useState<ProgramWithLevels | null>(null);
  const [assignGroupId, setAssignGroupId] = useState<string>("");
  const [isAssigning, setIsAssigning] = useState(false);

  const { data: allGroups = [] } = useQuery<{ id: number; name: string; teacherName: string | null; psychologicalLevelId?: number | null }[]>({
    queryKey: ["groups"],
    queryFn: () => apiFetch("/api/groups"),
  });

  const openAssignDialog = (level: LevelInProgram, prog: ProgramWithLevels) => {
    setAssignLevel(level);
    setAssignProg(prog);
    setAssignGroupId("");
    setAssignDialog(true);
  };

  const handleAssignGroup = async () => {
    if (!assignGroupId || !assignLevel || !assignProg) return;
    setIsAssigning(true);
    try {
      await apiFetch(`/api/groups/${assignGroupId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          psychologicalLevelId: assignLevel.id,
          psychologistId: assignProg.leadSpecialistId ?? null,
        }),
      });
      qc.invalidateQueries({ queryKey: ["programs"] });
      qc.invalidateQueries({ queryKey: ["groups"] });
      setAssignDialog(false);
      toast({ title: language === "ar" ? "تم ربط المجموعة بالمستوى" : "Group linked to level" });
    } catch {
      toast({ title: language === "ar" ? "حدث خطأ" : "Error", variant: "destructive" });
    } finally {
      setIsAssigning(false);
    }
  };

  const handleUnassignGroup = async (groupId: number) => {
    try {
      await apiFetch(`/api/groups/${groupId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ psychologicalLevelId: null, psychologistId: null }),
      });
      qc.invalidateQueries({ queryKey: ["programs"] });
      qc.invalidateQueries({ queryKey: ["groups"] });
      toast({ title: language === "ar" ? "تم إلغاء الربط" : "Group unlinked" });
    } catch {
      toast({ title: language === "ar" ? "حدث خطأ" : "Error", variant: "destructive" });
    }
  };

  /* ── Delete level ── */
  const [deleteLevelTarget, setDeleteLevelTarget] = useState<LevelInProgram | null>(null);
  const [deleteLevelBlocked, setDeleteLevelBlocked] = useState<string | null>(null);

  const handleDeleteLevel = async () => {
    if (!deleteLevelTarget) return;
    try {
      await apiFetch(`/api/levels/${deleteLevelTarget.id}`, { method: "DELETE" });
      toast({ title: t.levels.deleted });
      qc.invalidateQueries({ queryKey: ["programs"] });
      setDeleteLevelTarget(null);
    } catch (err: any) {
      setDeleteLevelTarget(null);
      if (err?.error === "active_students") {
        setDeleteLevelBlocked(t.levels.deleteBlockedCount.replace("{n}", String(err.count)));
      } else {
        toast({ title: t.levels.errorDeleting, variant: "destructive" });
      }
    }
  };

  /* ── Category splitting ── */
  const langPrograms = programs.filter(p => p.type === "language");
  const psychPrograms = programs.filter(p => p.type === "psychological");

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">{t.programs.loading}</div>;
  }

  const renderProgram = (prog: ProgramWithLevels) => {
    const isExpanded = expanded.has(prog.id);
    const isPsych = prog.type === "psychological";

    return (
      <Card key={prog.id} className={`overflow-hidden border-2 transition-all ${isPsych ? "border-violet-200" : "border-blue-100"}`}>
        {/* Program Header */}
        <CardHeader
          className={`cursor-pointer select-none ${isPsych ? "bg-violet-50" : "bg-blue-50"}`}
          onClick={() => toggle(prog.id)}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className={`p-2 rounded-lg ${isPsych ? "bg-violet-100" : "bg-blue-100"}`}>
                {isPsych ? (
                  <Brain className="w-5 h-5" style={{ color: "#7c3aed" }} />
                ) : (
                  <BookOpen className="w-5 h-5" style={{ color: "#1B2E8F" }} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <CardTitle className="text-base">{getLang(prog.name, prog.nameAr, language)}</CardTitle>
                  <Badge variant="outline" className={`text-xs ${isPsych ? "border-violet-300 text-violet-700" : "border-blue-300 text-blue-700"}`}>
                    {isPsych ? t.programs.typePsychological : t.programs.typeLanguage}
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    {prog.levelCount} {t.programs.levels}
                  </Badge>
                </div>
                {(prog.description || prog.descriptionAr) && (
                  <p className="text-sm text-muted-foreground mt-1 truncate">{getLang(prog.description, prog.descriptionAr, language)}</p>
                )}
                {prog.leadSpecialist && (
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <Stethoscope className="w-3 h-3" />
                    {t.programs.leadSpecialist}: <span className="font-medium">{prog.leadSpecialist.name}</span>
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {isAdmin && (
                <>
                  <Button size="sm" variant="ghost" onClick={e => { e.stopPropagation(); openProgEdit(prog); }} className="h-8 w-8 p-0">
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={e => { e.stopPropagation(); setDeleteProgTarget(prog); }} className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </>
              )}
              <div className={`p-1 rounded ${isPsych ? "text-violet-600" : "text-blue-600"}`}>
                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </div>
          </div>
        </CardHeader>

        {/* Sub-levels */}
        {isExpanded && (
          <CardContent className="pt-4 space-y-3">
            {prog.levels.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">{t.programs.noLevels}</p>
            ) : (
              prog.levels.map(level => (
                <div key={level.id} className="flex items-start gap-3 p-3 rounded-lg border bg-muted/20 hover:bg-muted/40 transition-colors">
                  <div className="p-1.5 rounded bg-white border shrink-0">
                    <Layers className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0 grid grid-cols-2 gap-x-4 gap-y-1">
                    <div className="col-span-2">
                      <p className="font-medium text-sm">{getLang(level.name, level.nameAr, language)}</p>
                      {(level.description || level.descriptionAr) && <p className="text-xs text-muted-foreground">{getLang(level.description, level.descriptionAr, language)}</p>}
                    </div>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />{level.durationWeeks} {t.levels.weeks} · {level.sessionsPerWeek}{t.levels.perWeek}
                    </span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Banknote className="w-3 h-3" />{formatDZD(level.price)}
                    </span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Users className="w-3 h-3" />{level.studentCount} {t.levels.students}
                    </span>
                    {level.sessionType && (
                      <Badge variant="outline" className="text-xs w-fit">
                        {(t.programs.sessionTypes as any)[level.sessionType] ?? level.sessionType}
                      </Badge>
                    )}
                    {isPsych && (level.linkedGroups ?? []).length > 0 && (
                      <div className="col-span-2 flex flex-wrap gap-1.5 mt-1">
                        {(level.linkedGroups ?? []).map(g => (
                          <span key={g.id} className="inline-flex items-center gap-1 text-xs bg-violet-50 text-violet-700 border border-violet-200 rounded-full px-2 py-0.5 font-medium">
                            <Users className="w-2.5 h-2.5" />
                            {g.name}
                            {isAdmin && (
                              <button onClick={() => handleUnassignGroup(g.id)} className="ms-0.5 hover:text-red-500">✕</button>
                            )}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  {isAdmin && (
                    <div className="flex gap-1 shrink-0">
                      {isPsych && (
                        <Button size="sm" variant="ghost" onClick={() => openAssignDialog(level, prog)}
                          className="h-7 px-2 gap-1 text-violet-700 hover:bg-violet-50 text-xs font-medium">
                          <Users className="w-3 h-3" />
                          {language === "ar" ? "ربط" : "Link"}
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => openLevelEdit(level, prog)} className="h-7 w-7 p-0">
                        <Pencil className="w-3 h-3" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setDeleteLevelTarget(level)} className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10">
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </div>
              ))
            )}
            {isAdmin && (
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-2 gap-1.5"
                onClick={() => openLevelCreate(prog)}
                style={{ borderColor: isPsych ? "#7c3aed44" : "#1B2E8F44", color: isPsych ? "#7c3aed" : "#1B2E8F" }}
              >
                <Plus className="w-3.5 h-3.5" />
                {t.programs.addLevel}
              </Button>
            )}
          </CardContent>
        )}
      </Card>
    );
  };

  return (
    <div className="p-4 md:p-6 space-y-8 max-w-4xl mx-auto">
      {/* Page Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "#1B2E8F" }}>{t.programs.title}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t.programs.subtitle}</p>
        </div>
        {isAdmin && (
          <Button onClick={openProgCreate} style={{ backgroundColor: "#F5A600", color: "#1B2E8F" }} className="font-semibold shrink-0">
            <Plus className="w-4 h-4 me-2" />{t.programs.addProgram}
          </Button>
        )}
      </div>

      {programs.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <GraduationCap className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>{t.programs.noPrograms}</p>
        </div>
      )}

      {/* Language Programs */}
      {langPrograms.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <BookOpen className="w-5 h-5" style={{ color: "#1B2E8F" }} />
            <h2 className="text-lg font-semibold" style={{ color: "#1B2E8F" }}>{t.programs.languageCategory}</h2>
          </div>
          {langPrograms.map(renderProgram)}
        </section>
      )}

      {/* Growth & Support Programs */}
      {psychPrograms.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <Brain className="w-5 h-5" style={{ color: "#7c3aed" }} />
            <h2 className="text-lg font-semibold" style={{ color: "#7c3aed" }}>{t.programs.psychCategory}</h2>
          </div>
          {psychPrograms.map(renderProgram)}
        </section>
      )}

      {/* ── Program Create/Edit Dialog ── */}
      <Dialog open={progDialog} onOpenChange={setProgDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingProg ? t.programs.editTitle : t.programs.createTitle}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{t.programs.programName}</label>
                <Input placeholder={t.programs.namePlaceholder} value={progForm.name} onChange={e => setProgForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{(t.programs as any).nameAr ?? "الاسم بالعربية"} <span className="text-muted-foreground text-xs">(اختياري)</span></label>
                <Input dir="rtl" placeholder="مثال: برنامج كيدسبيك" value={progForm.nameAr} onChange={e => setProgForm(f => ({ ...f, nameAr: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{t.programs.type}</label>
              <Select value={progForm.type} onValueChange={v => setProgForm(f => ({ ...f, type: v as any }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="language">{t.programs.typeLanguage}</SelectItem>
                  <SelectItem value="psychological">{t.programs.typePsychological}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {progForm.type === "psychological" && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{t.programs.leadSpecialist}</label>
                <Select value={progForm.leadSpecialistId || "none"} onValueChange={v => setProgForm(f => ({ ...f, leadSpecialistId: v === "none" ? "" : v }))}>
                  <SelectTrigger><SelectValue placeholder={t.programs.selectSpecialist} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t.programs.noSpecialist}</SelectItem>
                    {psychologists.map((p: any) => (
                      <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{t.programs.description}</label>
              <Textarea placeholder={t.programs.descriptionPlaceholder} rows={2} value={progForm.description} onChange={e => setProgForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{(t.programs as any).descriptionAr ?? "الوصف بالعربية"} <span className="text-muted-foreground text-xs">(اختياري)</span></label>
              <Textarea dir="rtl" placeholder="وصف البرنامج بالعربية..." rows={2} value={progForm.descriptionAr} onChange={e => setProgForm(f => ({ ...f, descriptionAr: e.target.value }))} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <DialogClose asChild><Button variant="outline">{t.programs.cancel}</Button></DialogClose>
            <Button onClick={handleSaveProg} disabled={isSavingProg} style={{ backgroundColor: "#1B2E8F", color: "white" }}>
              {isSavingProg ? t.programs.saving : t.programs.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Level Create/Edit Dialog ── */}
      <Dialog open={levelDialog} onOpenChange={setLevelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingLevel ? t.levels.editTitle : t.levels.createTitle}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{t.levels.levelName}</label>
                <Input placeholder={t.levels.namePlaceholder} value={levelForm.name} onChange={e => setLevelForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{(t.levels as any).nameAr ?? "الاسم بالعربية"} <span className="text-muted-foreground text-xs">(اختياري)</span></label>
                <Input dir="rtl" placeholder="مثال: مبتدئ ١" value={levelForm.nameAr} onChange={e => setLevelForm(f => ({ ...f, nameAr: e.target.value }))} />
              </div>
            </div>
            {levelProgType === "psychological" && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{t.programs.sessionType}</label>
                <Select value={levelForm.sessionType || "general"} onValueChange={v => setLevelForm(f => ({ ...f, sessionType: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SESSION_TYPES.map(st => (
                      <SelectItem key={st} value={st}>{(t.programs.sessionTypes as any)[st]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{t.levels.durationWeeks}</label>
                <Input type="number" min={1} value={levelForm.durationWeeks} onChange={e => setLevelForm(f => ({ ...f, durationWeeks: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{t.levels.sessionsPerWeek}</label>
                <Input type="number" min={1} value={levelForm.sessionsPerWeek} onChange={e => setLevelForm(f => ({ ...f, sessionsPerWeek: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{t.levels.price}</label>
              <Input type="number" min={0} value={levelForm.price} onChange={e => setLevelForm(f => ({ ...f, price: e.target.value }))} />
              <p className="text-xs text-muted-foreground">{t.levels.priceHint}</p>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{t.levels.description}</label>
              <Textarea placeholder={t.levels.descriptionPlaceholder} rows={2} value={levelForm.description} onChange={e => setLevelForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{(t.levels as any).descriptionAr ?? "الوصف بالعربية"} <span className="text-muted-foreground text-xs">(اختياري)</span></label>
              <Textarea dir="rtl" placeholder="وصف المستوى بالعربية..." rows={2} value={levelForm.descriptionAr} onChange={e => setLevelForm(f => ({ ...f, descriptionAr: e.target.value }))} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <DialogClose asChild><Button variant="outline">{t.levels.cancel}</Button></DialogClose>
            <Button onClick={handleSaveLevel} disabled={isSavingLevel} style={{ backgroundColor: levelProgType === "psychological" ? "#7c3aed" : "#1B2E8F", color: "white" }}>
              {isSavingLevel ? t.levels.saving : t.levels.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Program confirm ── */}
      <AlertDialog open={!!deleteProgTarget} onOpenChange={() => setDeleteProgTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.programs.deleteTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {t.programs.deleteConfirm.replace("{name}", deleteProgTarget?.name ?? "")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.programs.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteProg} className="bg-destructive hover:bg-destructive/90">
              {t.programs.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Assign Group Dialog ── */}
      <Dialog open={assignDialog} onOpenChange={setAssignDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2" style={{ color: "#7c3aed" }}>
              <Users className="w-5 h-5" />
              {language === "ar" ? "ربط مجموعة بالمستوى" : "Link Group to Level"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {assignLevel && (
              <div className="rounded-lg bg-violet-50 px-3 py-2 text-sm text-violet-800 font-medium">
                {getLang(assignLevel.name, assignLevel.nameAr, language)}
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{language === "ar" ? "اختر مجموعة" : "Select Group"}</label>
              <Select value={assignGroupId} onValueChange={setAssignGroupId}>
                <SelectTrigger>
                  <SelectValue placeholder={language === "ar" ? "اختر مجموعة..." : "Choose a group..."} />
                </SelectTrigger>
                <SelectContent>
                  {(allGroups as any[])
                    .filter(g => !g.psychologicalLevelId || g.psychologicalLevelId === assignLevel?.id)
                    .map(g => (
                      <SelectItem key={g.id} value={String(g.id)}>
                        {g.name}{g.teacherName ? ` — ${g.teacherName}` : ""}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <DialogClose asChild><Button variant="outline">{language === "ar" ? "إلغاء" : "Cancel"}</Button></DialogClose>
            <Button onClick={handleAssignGroup} disabled={!assignGroupId || isAssigning}
              style={{ backgroundColor: "#7c3aed", color: "white" }}>
              {isAssigning ? (language === "ar" ? "جارٍ الربط..." : "Linking...") : (language === "ar" ? "ربط" : "Link")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Program blocked ── */}
      <AlertDialog open={!!deleteBlockedMsg} onOpenChange={() => setDeleteBlockedMsg(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              {t.programs.deleteBlockedTitle}
            </AlertDialogTitle>
            <AlertDialogDescription>{deleteBlockedMsg}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setDeleteBlockedMsg(null)}>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Delete Level confirm ── */}
      <AlertDialog open={!!deleteLevelTarget} onOpenChange={() => setDeleteLevelTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.levels.deleteTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {t.levels.deleteConfirm.replace("{name}", deleteLevelTarget?.name ?? "")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.levels.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteLevel} className="bg-destructive hover:bg-destructive/90">
              {t.levels.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Delete Level blocked ── */}
      <AlertDialog open={!!deleteLevelBlocked} onOpenChange={() => setDeleteLevelBlocked(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              {t.levels.deleteBlockedTitle}
            </AlertDialogTitle>
            <AlertDialogDescription>{deleteLevelBlocked}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setDeleteLevelBlocked(null)}>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

import { useState } from "react";
import {
  useListConsultations,
  useCompleteConsultation,
  useScheduleConsultation,
  type Consultation,
} from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { useLanguage } from "@/contexts/language-context";
import { useToast } from "@/hooks/use-toast";
import {
  MessageCircle,
  CheckCircle2,
  Clock,
  Star,
  FileText,
  CalendarPlus,
  BrainCircuit,
  Users,
  Plus,
  Loader2,
  Trash2,
} from "lucide-react";
import { format } from "date-fns";

function safeFmt(dateStr: string | null | undefined, fmt: string): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return String(dateStr);
  return format(d, fmt);
}

function StatusBadge({ status, t }: { status: Consultation["status"]; t: any }) {
  const cfg: Record<Consultation["status"], { cls: string; label: string }> = {
    pending: { cls: "bg-amber-100 text-amber-700 border-amber-200", label: t.consultations.statusPending },
    approved: { cls: "bg-emerald-100 text-emerald-700 border-emerald-200", label: t.consultations.statusApproved },
    rejected: { cls: "bg-red-100 text-red-700 border-red-200", label: t.consultations.statusRejected },
    completed: { cls: "bg-blue-100 text-blue-700 border-blue-200", label: t.consultations.statusCompleted },
  };
  const { cls, label } = cfg[status];
  return <Badge variant="outline" className={`text-xs ${cls}`}>{label}</Badge>;
}

export default function PsychologistConsultations() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const ct = t.consultations;

  const { data: consultations = [], isLoading, refetch } = useListConsultations();
  const { mutate: complete, isPending: isCompleting } = useCompleteConsultation();
  const { mutate: schedule, isPending: isScheduling } = useScheduleConsultation();

  // Fetch parent users for scheduling
  const { data: allUsers = [] } = useQuery<any[]>({
    queryKey: ["users-list"],
    queryFn: () => fetch("/api/users", { credentials: "include" }).then((r) => r.json()),
  });
  const parents = (allUsers as any[]).filter((u: any) => u.role === "parent");

  const { data: studentsData = [] } = useQuery<any[]>({
    queryKey: ["students"],
    queryFn: () => fetch("/api/students", { credentials: "include" }).then((r) => r.json()),
  });

  const [completeTarget, setCompleteTarget] = useState<Consultation | null>(null);
  const [summary, setSummary] = useState("");
  const [scheduleOpen, setScheduleOpen] = useState(false);

  // Schedule form state
  const [schedParentId, setSchedParentId] = useState("");
  const [schedStudentId, setSchedStudentId] = useState("");
  const [schedType, setSchedType] = useState<"free" | "paid">("free");
  const [schedDate, setSchedDate] = useState("");
  const [schedPrice, setSchedPrice] = useState("");
  const [schedNote, setSchedNote] = useState("");

  // ── Support a Group tab state ──
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const [suppDate, setSuppDate] = useState(new Date().toISOString().split("T")[0]);
  const [suppTime, setSuppTime] = useState("");
  const [suppTopic, setSuppTopic] = useState("");
  const [suppNote, setSuppNote] = useState("");
  const [isSavingSupp, setIsSavingSupp] = useState(false);
  const [deletingSupp, setDeletingSupp] = useState<number | null>(null);

  const { data: allGroups = [] } = useQuery<any[]>({
    queryKey: ["support-groups-picker"],
    queryFn: () => fetch("/api/support-sessions/groups", { credentials: "include" }).then(r => r.ok ? r.json() : []),
  });

  const { data: groupSupportSessions = [], refetch: refetchGroupSessions } = useQuery<any[]>({
    queryKey: ["support-sessions-group", selectedGroupId],
    queryFn: () =>
      fetch(`/api/support-sessions/for-group/${selectedGroupId}`, { credentials: "include" }).then(r => r.ok ? r.json() : []),
    enabled: !!selectedGroupId,
  });

  const handleAddGroupSupport = async () => {
    if (!selectedGroupId || !suppTopic.trim() || !suppDate) return;
    setIsSavingSupp(true);
    try {
      const res = await fetch("/api/support-sessions", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId: selectedGroupId,
          sessionDate: suppDate,
          sessionTime: suppTime || null,
          topic: suppTopic.trim(),
          teacherNote: suppNote.trim() || null,
        }),
      });
      if (!res.ok) throw new Error();
      toast({ title: ct.supportSessionScheduled });
      setIsSupportModalOpen(false);
      setSuppTopic(""); setSuppNote(""); setSuppTime("");
      refetchGroupSessions();
    } catch {
      toast({ title: "Error", variant: "destructive" });
    } finally {
      setIsSavingSupp(false);
    }
  };

  const handleDeleteGroupSupport = async (id: number) => {
    setDeletingSupp(id);
    try {
      const res = await fetch(`/api/support-sessions/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error();
      toast({ title: ct.supportSessionDeleted });
      refetchGroupSessions();
    } catch {
      toast({ title: "Error", variant: "destructive" });
    } finally {
      setDeletingSupp(null);
    }
  };

  const selectedGroup = (allGroups as any[]).find(g => g.id === selectedGroupId);

  const studentsForParent = schedParentId
    ? (studentsData as any[]).filter((s: any) => String(s.parentId) === schedParentId)
    : [];

  // Psychologist sees approved + completed consultations
  const myQueue = consultations.filter((c) => c.status === "approved" || c.status === "completed");
  const pending = myQueue.filter((c) => c.status === "approved");
  const completed = myQueue.filter((c) => c.status === "completed");

  const handleComplete = () => {
    if (!completeTarget) return;
    complete(
      { id: completeTarget.id, data: { psychologistSummary: summary.trim() || undefined } },
      {
        onSuccess: () => {
          toast({ title: ct.summarySubmitted });
          setCompleteTarget(null);
          setSummary("");
          refetch();
        },
        onError: () => toast({ title: "Error", variant: "destructive" }),
      }
    );
  };

  const handleSchedule = () => {
    if (!schedParentId || !schedDate) return;
    schedule(
      {
        parentId: parseInt(schedParentId),
        studentId: schedStudentId && schedStudentId !== "none" ? parseInt(schedStudentId) : undefined,
        type: schedType,
        scheduledDate: schedDate,
        adminDescription: schedNote.trim() || undefined,
        price: schedType === "paid" && schedPrice ? parseFloat(schedPrice) : undefined,
      },
      {
        onSuccess: () => {
          toast({ title: ct.scheduleSuccess });
          setScheduleOpen(false);
          setSchedParentId(""); setSchedStudentId(""); setSchedType("free");
          setSchedDate(""); setSchedPrice(""); setSchedNote("");
          refetch();
        },
        onError: () => toast({ title: "Error", variant: "destructive" }),
      }
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{ct.psychTitle}</h1>
          <p className="text-muted-foreground text-sm mt-1">{ct.psychSubtitle}</p>
        </div>
        <Button
          style={{ backgroundColor: "#F5A600", color: "#1B2E8F" }}
          className="font-semibold"
          onClick={() => setScheduleOpen(true)}
        >
          <CalendarPlus className="w-4 h-4 me-2" />
          {ct.scheduleSession}
        </Button>
      </div>

      <Tabs defaultValue="consultations">
        <TabsList className="mb-4">
          <TabsTrigger value="consultations" className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4" />
            {ct.psychTitle}
            {pending.length > 0 && (
              <span className="ms-1 text-xs font-bold px-1.5 py-0.5 rounded-full bg-[#1B2E8F] text-white">
                {pending.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="support-group" className="flex items-center gap-2">
            <BrainCircuit className="w-4 h-4" style={{ color: "#7c3aed" }} />
            {ct.supportGroupTab}
          </TabsTrigger>
        </TabsList>

        {/* ── Tab 1: Consultation Queue ── */}
        <TabsContent value="consultations" className="space-y-6">

      {/* Upcoming sessions */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Clock className="w-5 h-5" style={{ color: "#F5A600" }} />
          {ct.upcomingSessions} ({pending.length})
        </h2>

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">{ct.loading}</div>
        ) : pending.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <Clock className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p>{ct.noUpcoming}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pending.map((c) => (
              <Card key={c.id} className="border-emerald-200 bg-emerald-50/30">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                        {c.type === "free"
                          ? <Star className="w-5 h-5 text-emerald-600" />
                          : <MessageCircle className="w-5 h-5 text-emerald-600" />
                        }
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold">{c.parentName}</span>
                          <Badge variant="outline" className="text-xs">
                            {c.type === "free" ? ct.typeFree : ct.typePaid}
                          </Badge>
                          {c.initiatedBy === "psychologist" && (
                            <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                              {ct.scheduleSession}
                            </Badge>
                          )}
                        </div>
                        {c.studentName && (
                          <p className="text-sm text-muted-foreground">{ct.forStudent}: {c.studentName}</p>
                        )}
                        {c.scheduledDate && (
                          <p className="text-sm font-medium text-emerald-700 mt-1">
                            📅 {safeFmt(c.scheduledDate, "EEEE, MMMM d, yyyy")}
                          </p>
                        )}
                        {c.parentNotes && (
                          <p className="text-sm text-muted-foreground italic mt-1">"{c.parentNotes}"</p>
                        )}
                        {c.adminDescription && (
                          <p className="text-sm text-muted-foreground mt-1">
                            <span className="font-medium">{ct.adminNote}:</span> {c.adminDescription}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {ct.requestedOn}: {safeFmt(c.createdAt, "MMM d, yyyy")}
                        </p>
                      </div>
                    </div>
                    <Button
                      style={{ backgroundColor: "#1B2E8F", color: "white" }}
                      className="font-semibold shrink-0"
                      onClick={() => { setCompleteTarget(c); setSummary(""); }}
                    >
                      <FileText className="w-4 h-4 me-2" />
                      {ct.writeSummary}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Completed sessions */}
      {completed.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-blue-600" />
            {ct.completedSessions} ({completed.length})
          </h2>
          <div className="space-y-3">
            {completed.map((c) => (
              <Card key={c.id} className="opacity-80">
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold">{c.parentName}</span>
                        {c.studentName && (
                          <span className="text-sm text-muted-foreground">— {c.studentName}</span>
                        )}
                        <StatusBadge status={c.status} t={t} />
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {ct.completedOn}: {safeFmt(c.completedAt, "MMM d, yyyy")}
                      </p>
                      {c.psychologistSummary && (
                        <div className="mt-2 bg-blue-50 border border-blue-200 rounded p-3 text-sm text-blue-900">
                          {c.psychologistSummary}
                        </div>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="shrink-0"
                      onClick={() => { setCompleteTarget(c); setSummary(c.psychologistSummary ?? ""); }}
                    >
                      {t.studentProfile.editHealthInfo}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

        </TabsContent>

        {/* ── Tab 2: Support a Group ── */}
        <TabsContent value="support-group" className="space-y-5">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <p className="text-sm text-muted-foreground">{ct.supportGroupSubtitle}</p>
            </div>
            {selectedGroupId && (
              <Button
                style={{ backgroundColor: "#7c3aed" }}
                className="text-white font-semibold"
                onClick={() => { setSuppDate(new Date().toISOString().split("T")[0]); setSuppTime(""); setSuppTopic(""); setSuppNote(""); setIsSupportModalOpen(true); }}
              >
                <Plus className="w-4 h-4 me-2" />
                {ct.addSupportSession}
              </Button>
            )}
          </div>

          {/* Group picker */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{ct.allGroupsTitle}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {(allGroups as any[]).map(g => (
                <button
                  key={g.id}
                  onClick={() => setSelectedGroupId(selectedGroupId === g.id ? null : g.id)}
                  className="flex items-center gap-3 p-3 rounded-xl border-2 text-start transition-all hover:shadow-sm"
                  style={{
                    borderColor: selectedGroupId === g.id ? "#7c3aed" : "#e5e7eb",
                    backgroundColor: selectedGroupId === g.id ? "#7c3aed08" : "white",
                  }}
                >
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: selectedGroupId === g.id ? "#7c3aed" : "#f3f4f6" }}>
                    <Users className="w-4 h-4" style={{ color: selectedGroupId === g.id ? "white" : "#9ca3af" }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold truncate" style={{ color: selectedGroupId === g.id ? "#7c3aed" : "#111827" }}>{g.name}</p>
                    {g.teacherName && (
                      <p className="text-xs text-muted-foreground truncate">{ct.teacherLabel}: {g.teacherName}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Support sessions for selected group */}
          {selectedGroupId && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <BrainCircuit className="w-4 h-4" style={{ color: "#7c3aed" }} />
                <h3 className="font-semibold text-sm" style={{ color: "#7c3aed" }}>
                  {selectedGroup?.name} — {ct.groupLabel}
                </h3>
                <Badge className="text-[10px]" style={{ backgroundColor: "#7c3aed", color: "white" }}>
                  {(groupSupportSessions as any[]).length}
                </Badge>
              </div>

              {(groupSupportSessions as any[]).length === 0 ? (
                <div className="text-center py-10 rounded-xl border-2 border-dashed" style={{ borderColor: "#7c3aed30" }}>
                  <BrainCircuit className="w-8 h-8 mx-auto mb-2 opacity-20" style={{ color: "#7c3aed" }} />
                  <p className="text-sm text-muted-foreground">{ct.noSupportSessions}</p>
                  <Button
                    className="mt-3 text-white"
                    style={{ backgroundColor: "#7c3aed" }}
                    onClick={() => { setSuppDate(new Date().toISOString().split("T")[0]); setSuppTime(""); setSuppTopic(""); setSuppNote(""); setIsSupportModalOpen(true); }}
                  >
                    <Plus className="w-4 h-4 me-1.5" />
                    {ct.addSupportSession}
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {(groupSupportSessions as any[]).map((ss: any) => (
                    <div
                      key={ss.id}
                      className="flex items-center gap-3 p-3 rounded-xl border"
                      style={{ borderColor: "#7c3aed30", backgroundColor: "#7c3aed06" }}
                    >
                      <div className="shrink-0 flex flex-col items-center gap-0.5 w-8">
                        <span className="text-sm font-black" style={{ color: "#7c3aed" }}>
                          {safeFmt(ss.sessionDate, "d")}
                        </span>
                        <span className="text-[9px] text-muted-foreground uppercase leading-none">
                          {safeFmt(ss.sessionDate, "MMM")}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className="text-[10px] font-semibold" style={{ backgroundColor: "#7c3aed20", color: "#7c3aed", border: "1px solid #7c3aed40" }}>
                            {ct.psychSupportBadge}
                          </Badge>
                          {ss.sessionTime && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {ss.sessionTime}
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-semibold mt-0.5 text-gray-800">{ss.topic}</p>
                        {ss.teacherNote && (
                          <p className="text-[11px] text-muted-foreground italic mt-0.5">🔒 {ss.teacherNote}</p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                        onClick={() => handleDeleteGroupSupport(ss.id)}
                        disabled={deletingSupp === ss.id}
                      >
                        {deletingSupp === ss.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {!selectedGroupId && (
            <div className="text-center py-16 text-muted-foreground">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "linear-gradient(135deg, #7c3aed18, #7c3aed08)" }}>
                <BrainCircuit className="w-8 h-8 opacity-30" style={{ color: "#7c3aed" }} />
              </div>
              <p className="text-sm">{ct.selectGroupPrompt}</p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Add Support Session Dialog */}
      <Dialog open={isSupportModalOpen} onOpenChange={setIsSupportModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2" style={{ color: "#7c3aed" }}>
              <BrainCircuit className="w-5 h-5" />
              {ct.addSupportSession} — {selectedGroup?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{ct.scheduleDate}</label>
                <Input type="date" value={suppDate} onChange={e => setSuppDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{ct.supportTime}</label>
                <Input type="time" value={suppTime} onChange={e => setSuppTime(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{ct.supportTopic} *</label>
              <Input
                value={suppTopic}
                onChange={e => setSuppTopic(e.target.value)}
                placeholder={ct.supportTopicPlaceholder}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[#7c3aed]">{ct.supportTeacherNote}</label>
              <Textarea
                value={suppNote}
                onChange={e => setSuppNote(e.target.value)}
                placeholder={ct.supportTeacherNotePlaceholder}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">🔒 Visible only to the teacher of this group</p>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button
              onClick={handleAddGroupSupport}
              disabled={isSavingSupp || !suppTopic.trim()}
              style={{ backgroundColor: "#7c3aed" }}
              className="text-white"
            >
              {isSavingSupp ? <><Loader2 className="w-4 h-4 me-1.5 animate-spin" />Saving...</> : <><BrainCircuit className="w-4 h-4 me-1.5" />{ct.supportSessionScheduled}</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Complete / Summary Dialog */}
      <Dialog open={!!completeTarget} onOpenChange={(o) => { if (!o) setCompleteTarget(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{ct.summaryTitle}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {completeTarget && (
              <div className="bg-muted/30 rounded-lg p-3 text-sm space-y-1">
                <p><span className="font-medium">{ct.parent}:</span> {completeTarget.parentName}</p>
                {completeTarget.studentName && (
                  <p><span className="font-medium">{ct.forStudent}:</span> {completeTarget.studentName}</p>
                )}
                {completeTarget.parentNotes && (
                  <p className="italic text-muted-foreground">"{completeTarget.parentNotes}"</p>
                )}
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{ct.summaryLabel}</label>
              <Textarea
                rows={6}
                placeholder={ct.summaryPlaceholder}
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">{ct.summaryVisibility}</p>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">{t.groups.cancel}</Button>
            </DialogClose>
            <Button
              style={{ backgroundColor: "#1B2E8F", color: "white" }}
              className="font-semibold"
              onClick={handleComplete}
              disabled={isCompleting}
            >
              {isCompleting ? t.groups.saving : ct.submitSummary}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schedule Session Dialog */}
      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{ct.scheduleTitle}</DialogTitle>
            <p className="text-xs text-muted-foreground">{ct.scheduleSubtitle}</p>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{ct.scheduleParent}</label>
              <Select value={schedParentId} onValueChange={(v) => { setSchedParentId(v); setSchedStudentId(""); }}>
                <SelectTrigger>
                  <SelectValue placeholder={ct.scheduleSelectParent} />
                </SelectTrigger>
                <SelectContent>
                  {parents.map((p: any) => (
                    <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {studentsForParent.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{t.consultations.selectChild}</label>
                <Select value={schedStudentId} onValueChange={setSchedStudentId}>
                  <SelectTrigger>
                    <SelectValue placeholder={t.consultations.anyChild} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t.consultations.anyChild}</SelectItem>
                    {studentsForParent.map((s: any) => (
                      <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{ct.scheduleType}</label>
              <Select value={schedType} onValueChange={(v) => setSchedType(v as "free" | "paid")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">{ct.typeFree}</SelectItem>
                  <SelectItem value="paid">{ct.typePaid}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {schedType === "paid" && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{ct.schedulePrice}</label>
                <Input type="number" placeholder="0" value={schedPrice} onChange={(e) => setSchedPrice(e.target.value)} />
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{ct.scheduleDate}</label>
              <Input type="date" value={schedDate} onChange={(e) => setSchedDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{ct.scheduleNote}</label>
              <Textarea rows={2} placeholder={ct.scheduleNotePlaceholder} value={schedNote} onChange={(e) => setSchedNote(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">{t.groups.cancel}</Button>
            </DialogClose>
            <Button
              style={{ backgroundColor: "#F5A600", color: "#1B2E8F" }}
              className="font-semibold"
              onClick={handleSchedule}
              disabled={isScheduling || !schedParentId || !schedDate}
            >
              {isScheduling ? t.groups.saving : ct.scheduleSubmit}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

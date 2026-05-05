import { useState } from "react";
import {
  useListConsultations,
  useCreateConsultation,
  useApproveConsultation,
  useRejectConsultation,
  useScheduleConsultation,
  useCompleteConsultation,
  useGetMe,
  useListStudents,
  useListUsers,
} from "@workspace/api-client-react";
import { useLanguage } from "@/contexts/language-context";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/main";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Brain,
  Calendar,
  CheckCircle2,
  Clock,
  Plus,
  Star,
  MessageSquare,
  User,
  Loader2,
  BellRing,
  Shield,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { format } from "date-fns";

function safeFmt(dateStr: string | null | undefined, fmt: string): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return String(dateStr);
  return format(d, fmt);
}

type Consultation = {
  id: number;
  parentId: number;
  parentName: string | null;
  parentEmail: string | null;
  studentId: number | null;
  studentName: string | null;
  type: "free" | "paid";
  status: "pending" | "approved" | "rejected" | "completed";
  parentNotes: string | null;
  price: number | null;
  adminDescription: string | null;
  psychologistSummary: string | null;
  scheduledDate: string | null;
  initiatedBy: "parent" | "psychologist";
  psychologistId: number | null;
  createdAt: string;
  updatedAt: string;
  approvedAt: string | null;
  completedAt: string | null;
};

function StatusBadge({ status, t }: { status: Consultation["status"]; t: any }) {
  const map: Record<string, string> = {
    pending: "bg-amber-100 text-amber-700 border-amber-200",
    approved: "bg-blue-100 text-blue-700 border-blue-200",
    rejected: "bg-red-100 text-red-700 border-red-200",
    completed: "bg-emerald-100 text-emerald-700 border-emerald-200",
  };
  const labels: Record<string, string> = {
    pending: t.statusPending,
    approved: t.statusApproved,
    rejected: t.statusRejected,
    completed: t.statusCompleted,
  };
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border ${map[status] || ""}`}>
      {labels[status] || status}
    </span>
  );
}

// ─── PARENT VIEW ─────────────────────────────────────────────────────────────
function ParentView({ consultations, t, me }: { consultations: Consultation[]; t: any; me: any }) {
  const ct = t.consultations;
  const { toast } = useToast();
  const [requestOpen, setRequestOpen] = useState(false);
  const [requestType, setRequestType] = useState<"free" | "paid">("free");
  const [selectedStudentId, setSelectedStudentId] = useState<string>("none");
  const [notes, setNotes] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const { data: students = [] } = useListStudents({ parentId: me?.id });
  const { mutate: createConsultation, isPending: isCreating } = useCreateConsultation();

  const hasFreeConsultation = consultations.some((c) => c.type === "free");
  const scheduledInvitations = consultations.filter((c) => c.initiatedBy === "psychologist" && c.status === "approved");

  function handleSubmit() {
    createConsultation(
      {
        type: requestType,
        studentId: selectedStudentId !== "none" ? parseInt(selectedStudentId) : null,
        parentNotes: notes || undefined,
        scheduledDate: scheduledDate || undefined,
      },
      {
        onSuccess: () => {
          toast({ title: ct.requestSent });
          setRequestOpen(false);
          setNotes("");
          setScheduledDate("");
          setSelectedStudentId("none");
          queryClient.invalidateQueries({ queryKey: ["consultations"] });
        },
        onError: () => toast({ title: ct.alreadyRequested, variant: "destructive" }),
      }
    );
  }

  return (
    <div className="space-y-6">
      {/* Scheduled invitations banner */}
      {scheduledInvitations.length > 0 && (
        <div className="space-y-3">
          {scheduledInvitations.map((inv) => (
            <div
              key={inv.id}
              className="rounded-2xl p-5 flex items-start gap-4"
              style={{ background: "linear-gradient(135deg, #1B2E8F10, #F5A60015)", border: "1.5px solid #F5A60040" }}
            >
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: "#F5A60020" }}
              >
                <BellRing className="w-5 h-5" style={{ color: "#F5A600" }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-sm" style={{ color: "#1B2E8F" }}>{ct.scheduledInvitation}</span>
                  <Badge variant="outline" className="text-xs border-yellow-300 text-yellow-700 bg-yellow-50">
                    {inv.type === "free" ? ct.typeFree : ct.typePaid}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">{ct.scheduledByPsych}</p>
                {inv.scheduledDate && (
                  <div className="flex items-center gap-1.5 mt-2 text-sm font-medium" style={{ color: "#1B2E8F" }}>
                    <Calendar className="w-4 h-4" />
                    {safeFmt(inv.scheduledDate, "dd MMM yyyy")}
                  </div>
                )}
                {inv.adminDescription && (
                  <p className="mt-2 text-sm text-muted-foreground bg-white/70 rounded-lg px-3 py-2 border">
                    {inv.adminDescription}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Free consultation offer */}
      {!hasFreeConsultation && (
        <div
          className="rounded-2xl p-5 flex items-start gap-4"
          style={{ background: "linear-gradient(135deg, #1B2E8F08, #1B2E8F15)", border: "1px solid #1B2E8F20" }}
        >
          <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: "#1B2E8F15" }}>
            <Star className="w-5 h-5" style={{ color: "#1B2E8F" }} />
          </div>
          <div className="flex-1">
            <p className="font-bold text-sm" style={{ color: "#1B2E8F" }}>{ct.freeConsultationTitle}</p>
            <p className="text-sm text-muted-foreground mt-0.5">{ct.freeConsultationDesc}</p>
            <Button
              className="mt-3 text-white text-sm h-9 px-4"
              style={{ background: "#1B2E8F" }}
              onClick={() => { setRequestType("free"); setRequestOpen(true); }}
            >
              {ct.requestFree}
            </Button>
          </div>
        </div>
      )}

      {/* Action bar */}
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-base">{ct.title}</h2>
        <Button
          size="sm"
          className="text-white gap-1.5"
          style={{ background: "#F5A600" }}
          onClick={() => { setRequestType("paid"); setRequestOpen(true); }}
        >
          <Plus className="w-4 h-4" />
          {ct.requestPaid}
        </Button>
      </div>

      {/* Consultations list */}
      {consultations.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Brain className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">{ct.noConsultations}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {consultations.map((c) => (
            <ConsultationCard key={c.id} c={c} ct={ct} role="parent" />
          ))}
        </div>
      )}

      {/* Request Dialog */}
      <Dialog open={requestOpen} onOpenChange={setRequestOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5" style={{ color: "#1B2E8F" }} />
              {requestType === "free" ? ct.requestFree : ct.requestPaid}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>{ct.selectChild}</Label>
              <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                <SelectTrigger>
                  <SelectValue placeholder={ct.anyChild} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{ct.anyChild}</SelectItem>
                  {(students as any[]).map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{ct.notesLabel}</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={ct.notesPlaceholder}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">{t.cancel || "Cancel"}</Button>
            </DialogClose>
            <Button
              onClick={handleSubmit}
              disabled={isCreating}
              className="text-white"
              style={{ background: "#1B2E8F" }}
            >
              {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : ct.sendRequest}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── PSYCHOLOGIST VIEW ────────────────────────────────────────────────────────
function PsychologistView({ consultations, t }: { consultations: Consultation[]; t: any }) {
  const ct = t.consultations;
  const { toast } = useToast();
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [summaryOpenId, setSummaryOpenId] = useState<number | null>(null);
  const [summaryText, setSummaryText] = useState("");
  const [tab, setTab] = useState<"upcoming" | "completed">("upcoming");

  // Schedule form state
  const [schedParentId, setSchedParentId] = useState<string>("");
  const [schedStudentId, setSchedStudentId] = useState<string>("none");
  const [schedDate, setSchedDate] = useState("");
  const [schedType, setSchedType] = useState<"free" | "paid">("free");
  const [schedPrice, setSchedPrice] = useState("");
  const [schedNote, setSchedNote] = useState("");

  const { data: users = [] } = useListUsers({ role: "parent" });
  const parents = users as any[];

  const { data: students = [] } = useListStudents(
    schedParentId ? { parentId: parseInt(schedParentId) } : {}
  );

  const { mutate: scheduleConsultation, isPending: isScheduling } = useScheduleConsultation();
  const { mutate: completeConsultation, isPending: isCompleting } = useCompleteConsultation();

  const upcoming = consultations.filter((c) => c.status === "approved");
  const completed = consultations.filter((c) => c.status === "completed");

  const statsPending = consultations.filter((c) => c.status === "pending").length;
  const statsApproved = upcoming.length;
  const statsCompleted = completed.length;

  function handleSchedule() {
    if (!schedParentId || !schedDate) return;
    scheduleConsultation(
      {
        parentId: parseInt(schedParentId),
        studentId: schedStudentId !== "none" ? parseInt(schedStudentId) : undefined,
        type: schedType,
        scheduledDate: schedDate,
        adminDescription: schedNote || undefined,
        price: schedType === "paid" && schedPrice ? parseFloat(schedPrice) : undefined,
      },
      {
        onSuccess: () => {
          toast({ title: ct.scheduleSuccess });
          setScheduleOpen(false);
          setSchedParentId(""); setSchedDate(""); setSchedType("free");
          setSchedPrice(""); setSchedNote(""); setSchedStudentId("none");
          queryClient.invalidateQueries({ queryKey: ["consultations"] });
        },
        onError: () => toast({ title: "Failed to schedule.", variant: "destructive" }),
      }
    );
  }

  function handleComplete(id: number) {
    completeConsultation(
      { id, data: { psychologistSummary: summaryText || undefined } },
      {
        onSuccess: () => {
          toast({ title: ct.summarySubmitted });
          setSummaryOpenId(null);
          setSummaryText("");
          queryClient.invalidateQueries({ queryKey: ["consultations"] });
        },
        onError: () => toast({ title: "Failed to submit.", variant: "destructive" }),
      }
    );
  }

  const activeList = tab === "upcoming" ? upcoming : completed;

  return (
    <div className="space-y-6">
      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: ct.statPending, value: statsPending, color: "#F5A600" },
          { label: ct.statApproved, value: statsApproved, color: "#1B2E8F" },
          { label: ct.statCompleted, value: statsCompleted, color: "#16a34a" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border bg-card p-4 text-center">
            <div className="text-2xl font-black" style={{ color: stat.color }}>{stat.value}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Schedule button */}
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-base">{ct.psychTitle}</h2>
        <Button
          size="sm"
          className="text-white gap-1.5"
          style={{ background: "#F5A600" }}
          onClick={() => setScheduleOpen(true)}
        >
          <Plus className="w-4 h-4" />
          {ct.scheduleSession}
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-muted w-fit">
        {[
          { key: "upcoming", label: `${ct.upcomingSessions} (${upcoming.length})` },
          { key: "completed", label: `${ct.completedSessions} (${completed.length})` },
        ].map((tb) => (
          <button
            key={tb.key}
            onClick={() => setTab(tb.key as any)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
              tab === tb.key ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tb.label}
          </button>
        ))}
      </div>

      {/* Consultation list */}
      {activeList.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Brain className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">{tab === "upcoming" ? ct.noUpcoming : ct.noConsultations}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {activeList.map((c) => (
            <Card key={c.id} className="overflow-hidden">
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "#1B2E8F10" }}>
                    <User className="w-5 h-5" style={{ color: "#1B2E8F" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm">{c.parentName || ct.parent}</span>
                      <StatusBadge status={c.status} t={ct} />
                      <Badge variant="outline" className="text-xs">
                        {c.type === "free" ? ct.typeFree : ct.typePaid}
                      </Badge>
                    </div>
                    {c.studentName && (
                      <p className="text-xs text-muted-foreground mt-0.5">{ct.forStudent}: {c.studentName}</p>
                    )}
                    {c.scheduledDate && (
                      <div className="flex items-center gap-1.5 mt-2 text-sm font-medium" style={{ color: "#1B2E8F" }}>
                        <Calendar className="w-3.5 h-3.5" />
                        {safeFmt(c.scheduledDate, "dd MMM yyyy")}
                      </div>
                    )}
                    {c.parentNotes && (
                      <p className="mt-2 text-sm text-muted-foreground bg-muted/60 rounded-lg px-3 py-2">{c.parentNotes}</p>
                    )}
                    {c.psychologistSummary && (
                      <div className="mt-2 p-3 rounded-lg border-s-2" style={{ borderColor: "#16a34a", background: "#16a34a10" }}>
                        <p className="text-xs font-semibold text-emerald-700 mb-0.5">{ct.psychologistSummary}</p>
                        <p className="text-sm">{c.psychologistSummary}</p>
                      </div>
                    )}
                    {c.status === "approved" && (
                      <Button
                        size="sm"
                        className="mt-3 text-white gap-1.5"
                        style={{ background: "#1B2E8F" }}
                        onClick={() => { setSummaryOpenId(c.id); setSummaryText(""); }}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {ct.writeSummary}
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Schedule Dialog */}
      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" style={{ color: "#1B2E8F" }} />
              {ct.scheduleTitle}
            </DialogTitle>
            <p className="text-sm text-muted-foreground">{ct.scheduleSubtitle}</p>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>{ct.scheduleParent}</Label>
              <Select value={schedParentId} onValueChange={(v) => { setSchedParentId(v); setSchedStudentId("none"); }}>
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
            {schedParentId && (
              <div className="space-y-1.5">
                <Label>{ct.selectChild}</Label>
                <Select value={schedStudentId} onValueChange={setSchedStudentId}>
                  <SelectTrigger>
                    <SelectValue placeholder={ct.anyChild} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{ct.anyChild}</SelectItem>
                    {(students as any[]).map((s: any) => (
                      <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{ct.scheduleDate}</Label>
                <Input type="date" value={schedDate} onChange={(e) => setSchedDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>{ct.scheduleType}</Label>
                <Select value={schedType} onValueChange={(v) => setSchedType(v as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">{ct.typeFree}</SelectItem>
                    <SelectItem value="paid">{ct.typePaid}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {schedType === "paid" && (
              <div className="space-y-1.5">
                <Label>{ct.schedulePrice}</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={schedPrice}
                  onChange={(e) => setSchedPrice(e.target.value)}
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label>{ct.scheduleNote}</Label>
              <Textarea
                value={schedNote}
                onChange={(e) => setSchedNote(e.target.value)}
                placeholder={ct.scheduleNotePlaceholder}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">{t.cancel || "Cancel"}</Button>
            </DialogClose>
            <Button
              onClick={handleSchedule}
              disabled={isScheduling || !schedParentId || !schedDate}
              className="text-white"
              style={{ background: "#1B2E8F" }}
            >
              {isScheduling ? <Loader2 className="w-4 h-4 animate-spin" /> : ct.scheduleSubmit}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Summary Dialog */}
      <Dialog open={summaryOpenId !== null} onOpenChange={(o) => !o && setSummaryOpenId(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{ct.summaryTitle}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label>{ct.summaryLabel}</Label>
            <Textarea
              value={summaryText}
              onChange={(e) => setSummaryText(e.target.value)}
              placeholder={ct.summaryPlaceholder}
              rows={5}
            />
            <p className="text-xs text-muted-foreground">{ct.summaryVisibility}</p>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">{t.cancel || "Cancel"}</Button>
            </DialogClose>
            <Button
              onClick={() => summaryOpenId !== null && handleComplete(summaryOpenId)}
              disabled={isCompleting}
              className="text-white"
              style={{ background: "#16a34a" }}
            >
              {isCompleting ? <Loader2 className="w-4 h-4 animate-spin" /> : ct.submitSummary}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── ADMIN VIEW ────────────────────────────────────────────────────────────────
function AdminView({ consultations, t }: { consultations: Consultation[]; t: any }) {
  const ct = t.consultations;
  const { toast } = useToast();
  const [filter, setFilter] = useState<string>("all");
  const [approveOpenId, setApproveOpenId] = useState<number | null>(null);
  const [rejectOpenId, setRejectOpenId] = useState<number | null>(null);
  const [approvePrice, setApprovePrice] = useState("");
  const [approveDescription, setApproveDescription] = useState("");
  const [approveDate, setApproveDate] = useState("");
  const [rejectReason, setRejectReason] = useState("");

  const { mutate: approveConsultation, isPending: isApproving } = useApproveConsultation();
  const { mutate: rejectConsultation, isPending: isRejecting } = useRejectConsultation();

  const filtered =
    filter === "all" ? consultations : consultations.filter((c) => c.status === filter);

  const statPending = consultations.filter((c) => c.status === "pending").length;
  const statApproved = consultations.filter((c) => c.status === "approved").length;
  const statCompleted = consultations.filter((c) => c.status === "completed").length;
  const statRevenue = consultations
    .filter((c) => c.type === "paid" && c.status === "approved" && c.price)
    .reduce((acc, c) => acc + (c.price || 0), 0);

  function handleApprove() {
    if (approveOpenId === null) return;
    approveConsultation(
      {
        id: approveOpenId,
        data: {
          price: approvePrice ? parseFloat(approvePrice) : undefined,
          adminDescription: approveDescription || undefined,
          scheduledDate: approveDate || undefined,
        },
      },
      {
        onSuccess: () => {
          toast({ title: ct.approvedSuccess });
          setApproveOpenId(null);
          setApprovePrice(""); setApproveDescription(""); setApproveDate("");
          queryClient.invalidateQueries({ queryKey: ["consultations"] });
        },
        onError: () => toast({ title: "Failed.", variant: "destructive" }),
      }
    );
  }

  function handleReject() {
    if (rejectOpenId === null) return;
    rejectConsultation(
      { id: rejectOpenId, reason: rejectReason || undefined },
      {
        onSuccess: () => {
          toast({ title: ct.rejectedSuccess });
          setRejectOpenId(null);
          setRejectReason("");
          queryClient.invalidateQueries({ queryKey: ["consultations"] });
        },
        onError: () => toast({ title: "Failed.", variant: "destructive" }),
      }
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: ct.statPending, value: statPending, color: "#F5A600" },
          { label: ct.statApproved, value: statApproved, color: "#1B2E8F" },
          { label: ct.statCompleted, value: statCompleted, color: "#16a34a" },
          { label: ct.statPendingRevenue, value: `${statRevenue.toLocaleString()} DZD`, color: "#7c3aed" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border bg-card p-4 text-center">
            <div className="text-xl font-black" style={{ color: s.color }}>{s.value}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-base">{ct.adminTitle}</h2>
        <div className="flex gap-1 p-1 rounded-xl bg-muted">
          {["all", "pending", "approved", "completed"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                filter === f ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {f === "all" ? ct.filterAll : ct[`status${f.charAt(0).toUpperCase() + f.slice(1)}`]}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Brain className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">{ct.noConsultations}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((c) => (
            <Card key={c.id} className="overflow-hidden">
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "#1B2E8F10" }}>
                    <Shield className="w-5 h-5" style={{ color: "#1B2E8F" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm">{c.parentName || ct.parent}</span>
                      <StatusBadge status={c.status} t={ct} />
                      <Badge variant="outline" className="text-xs">
                        {c.type === "free" ? ct.typeFree : ct.typePaid}
                      </Badge>
                      {c.initiatedBy === "psychologist" && (
                        <Badge variant="outline" className="text-xs border-purple-200 text-purple-700 bg-purple-50">
                          {ct.scheduledInvitation}
                        </Badge>
                      )}
                    </div>
                    {c.studentName && (
                      <p className="text-xs text-muted-foreground mt-0.5">{ct.forStudent}: {c.studentName}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {ct.requestedOn}: {safeFmt(c.createdAt, "dd MMM yyyy")}
                      {c.price ? ` · ${c.price.toLocaleString()} DZD` : ""}
                      {c.scheduledDate ? ` · 📅 ${safeFmt(c.scheduledDate, "dd MMM yyyy")}` : ""}
                    </p>
                    {c.parentNotes && (
                      <p className="mt-2 text-sm text-muted-foreground bg-muted/60 rounded-lg px-3 py-1.5">{c.parentNotes}</p>
                    )}
                    {c.status === "pending" && (
                      <div className="flex gap-2 mt-3">
                        <Button
                          size="sm"
                          className="text-white gap-1.5"
                          style={{ background: "#1B2E8F" }}
                          onClick={() => { setApproveOpenId(c.id); setApprovePrice(c.price ? String(c.price) : ""); }}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {ct.approve}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 text-red-600 border-red-200 hover:bg-red-50"
                          onClick={() => setRejectOpenId(c.id)}
                        >
                          {ct.reject}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Approve Dialog */}
      <Dialog open={approveOpenId !== null} onOpenChange={(o) => !o && setApproveOpenId(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{ct.approveTitle}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>{ct.scheduledDate}</Label>
              <Input type="date" value={approveDate} onChange={(e) => setApproveDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>{ct.price} (DZD)</Label>
              <Input type="number" value={approvePrice} onChange={(e) => setApprovePrice(e.target.value)} placeholder="0" />
            </div>
            <div className="space-y-1.5">
              <Label>{ct.adminDescriptionLabel}</Label>
              <Textarea
                value={approveDescription}
                onChange={(e) => setApproveDescription(e.target.value)}
                placeholder={ct.adminDescriptionPlaceholder}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">{t.cancel || "Cancel"}</Button></DialogClose>
            <Button onClick={handleApprove} disabled={isApproving} className="text-white" style={{ background: "#1B2E8F" }}>
              {isApproving ? <Loader2 className="w-4 h-4 animate-spin" /> : ct.approve}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectOpenId !== null} onOpenChange={(o) => !o && setRejectOpenId(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{ct.rejectTitle}</DialogTitle>
            <p className="text-sm text-muted-foreground">{ct.rejectDescription}</p>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder={ct.rejectReasonPlaceholder}
              rows={3}
            />
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">{t.cancel || "Cancel"}</Button></DialogClose>
            <Button onClick={handleReject} disabled={isRejecting} variant="destructive">
              {isRejecting ? <Loader2 className="w-4 h-4 animate-spin" /> : ct.reject}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── CONSULTATION CARD (shared) ───────────────────────────────────────────────
function ConsultationCard({ c, ct, role }: { c: Consultation; ct: any; role: string }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "#1B2E8F10" }}>
            <MessageSquare className="w-5 h-5" style={{ color: "#1B2E8F" }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <StatusBadge status={c.status} t={ct} />
                <Badge variant="outline" className="text-xs">
                  {c.type === "free" ? ct.typeFree : ct.typePaid}
                </Badge>
                {c.initiatedBy === "psychologist" && (
                  <Badge variant="outline" className="text-xs border-yellow-300 text-yellow-700 bg-yellow-50">
                    {ct.scheduledInvitation}
                  </Badge>
                )}
              </div>
              <span className="text-xs text-muted-foreground">{safeFmt(c.createdAt, "dd MMM yyyy")}</span>
            </div>
            {c.studentName && (
              <p className="text-xs text-muted-foreground mt-0.5">{ct.forStudent}: {c.studentName}</p>
            )}
            {c.scheduledDate && (
              <div className="flex items-center gap-1.5 mt-1.5 text-sm font-medium" style={{ color: "#1B2E8F" }}>
                <Calendar className="w-3.5 h-3.5" />
                {safeFmt(c.scheduledDate, "dd MMM yyyy")}
                {c.price ? ` · ${c.price.toLocaleString()} DZD` : ""}
              </div>
            )}
            {c.status === "approved" && c.adminDescription && (
              <div
                className="mt-2 px-3 py-2 rounded-lg text-sm"
                style={{ background: "#1B2E8F0A", borderLeft: "3px solid #1B2E8F" }}
              >
                <p className="text-xs font-semibold mb-0.5" style={{ color: "#1B2E8F" }}>{ct.adminNote}</p>
                <p>{c.adminDescription}</p>
              </div>
            )}
            {c.psychologistSummary && (
              <>
                <button
                  className="flex items-center gap-1 mt-2 text-xs font-medium text-emerald-700"
                  onClick={() => setExpanded((x) => !x)}
                >
                  {ct.psychologistSummary}
                  {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
                {expanded && (
                  <div className="mt-1.5 p-3 rounded-lg text-sm" style={{ background: "#16a34a10", border: "1px solid #16a34a30" }}>
                    {c.psychologistSummary}
                  </div>
                )}
              </>
            )}
            {c.completedAt && (
              <p className="text-xs text-muted-foreground mt-1.5">
                {ct.completedOn}: {safeFmt(c.completedAt, "dd MMM yyyy")}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── ROOT PAGE ────────────────────────────────────────────────────────────────
export default function ConsultationsPage() {
  const { t } = useLanguage();
  const ct = t.consultations;
  const { data: me } = useGetMe();
  const { data: consultations = [], isLoading } = useListConsultations();
  const role = (me as any)?.role;

  const subtitle =
    role === "admin" ? ct.adminSubtitle :
    role === "psychologist" ? ct.psychSubtitle :
    ct.parentSubtitle;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Page header */}
      <div>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#1B2E8F" }}>
            <Brain className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black" style={{ color: "#1B2E8F" }}>
              {role === "admin" ? ct.adminTitle : role === "psychologist" ? ct.psychTitle : ct.title}
            </h1>
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : role === "parent" ? (
        <ParentView consultations={consultations as Consultation[]} t={t} me={me} />
      ) : role === "psychologist" ? (
        <PsychologistView consultations={consultations as Consultation[]} t={t} />
      ) : (
        <AdminView consultations={consultations as Consultation[]} t={t} />
      )}
    </div>
  );
}

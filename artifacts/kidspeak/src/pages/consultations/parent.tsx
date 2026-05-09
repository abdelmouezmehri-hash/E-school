import { useState } from "react";
import {
  useListConsultations,
  useCreateConsultation,
  useGetMe,
  useListStudents,
  type Consultation,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  Plus,
  CheckCircle2,
  Clock,
  XCircle,
  Star,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CalendarCheck,
} from "lucide-react";
import { format } from "date-fns";

function safeFmt(dateStr: string | null | undefined, fmt: string): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return String(dateStr);
  return format(d, fmt);
}

function StatusBadge({ status, t }: { status: Consultation["status"]; t: any }) {
  const cfg: Record<Consultation["status"], { icon: any; cls: string; label: string }> = {
    pending: { icon: Clock, cls: "bg-amber-100 text-amber-700 border-amber-200", label: t.consultations.statusPending },
    approved: { icon: CheckCircle2, cls: "bg-emerald-100 text-emerald-700 border-emerald-200", label: t.consultations.statusApproved },
    rejected: { icon: XCircle, cls: "bg-red-100 text-red-700 border-red-200", label: t.consultations.statusRejected },
    completed: { icon: Star, cls: "bg-blue-100 text-blue-700 border-blue-200", label: t.consultations.statusCompleted },
  };
  const { icon: Icon, cls, label } = cfg[status];
  return (
    <Badge variant="outline" className={`gap-1 text-xs ${cls}`}>
      <Icon className="w-3 h-3" />
      {label}
    </Badge>
  );
}

export default function ParentConsultations() {
  const { t, isRTL } = useLanguage();
  const { toast } = useToast();
  const ct = t.consultations;

  const { data: me } = useGetMe();
  const { data: consultations = [], isLoading, refetch } = useListConsultations();
  const { data: allStudents = [] } = useListStudents();
  const { mutate: createConsultation, isPending: isCreating } = useCreateConsultation();

  const [dialogType, setDialogType] = useState<"free" | "paid" | null>(null);
  const [parentNotes, setParentNotes] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const myStudents = allStudents.filter((s: any) => s.parentId === (me as any)?.id);
  const hasFreeRequest = consultations.some((c) => c.type === "free");

  const handleCreate = () => {
    if (!dialogType) return;
    createConsultation(
      {
        type: dialogType,
        studentId: selectedStudentId ? parseInt(selectedStudentId) : undefined,
        parentNotes: parentNotes.trim() || undefined,
      },
      {
        onSuccess: () => {
          toast({ title: ct.requestSent });
          setDialogType(null);
          setParentNotes("");
          setSelectedStudentId("");
          refetch();
        },
        onError: (err: any) => {
          toast({
            title: "Error",
            description: err?.error || ct.alreadyRequested,
            variant: "destructive",
          });
        },
      }
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{ct.title}</h1>
          <p className="text-muted-foreground text-sm mt-1">{ct.parentSubtitle}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {!hasFreeRequest && (
            <Button
              variant="outline"
              className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
              onClick={() => { setDialogType("free"); setParentNotes(""); setSelectedStudentId(""); }}
            >
              <Star className="w-4 h-4 me-2" />
              {ct.requestFree}
            </Button>
          )}
          <Button
            style={{ backgroundColor: "#F5A600", color: "#1B2E8F" }}
            className="font-semibold"
            onClick={() => { setDialogType("paid"); setParentNotes(""); setSelectedStudentId(""); }}
          >
            <Plus className="w-4 h-4 me-2" />
            {ct.requestPaid}
          </Button>
        </div>
      </div>

      {/* Free consultation banner if none requested yet */}
      {!hasFreeRequest && (
        <div className="rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 p-5 flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
            <Star className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-emerald-800">{ct.freeConsultationTitle}</h3>
            <p className="text-sm text-emerald-700 mt-1">{ct.freeConsultationDesc}</p>
          </div>
          <Button
            className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
            onClick={() => { setDialogType("free"); setParentNotes(""); setSelectedStudentId(""); }}
          >
            {ct.requestFree}
          </Button>
        </div>
      )}

      {/* Consultation list */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">{ct.loading}</div>
      ) : consultations.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p>{ct.noConsultations}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {consultations.map((c) => {
            const isExpanded = expandedId === c.id;
            const isPsychInitiated = (c as any).initiatedBy === "psychologist";
            return (
              <Card
                key={c.id}
                className={`transition-all ${
                  isPsychInitiated
                    ? "border-purple-200 shadow-purple-50 shadow-md"
                    : c.status === "approved"
                    ? "border-emerald-200 shadow-emerald-50 shadow-md"
                    : ""
                }`}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                          isPsychInitiated ? "bg-purple-100"
                          : c.type === "free" ? "bg-emerald-100" : "bg-blue-100"
                        }`}
                      >
                        {isPsychInitiated
                          ? <CalendarCheck className="w-5 h-5 text-purple-600" />
                          : c.type === "free"
                          ? <Star className="w-5 h-5 text-emerald-600" />
                          : <MessageCircle className="w-5 h-5 text-blue-600" />
                        }
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm">
                            {isPsychInitiated ? ct.scheduledInvitation : (c.type === "free" ? ct.typeFree : ct.typePaid)}
                          </span>
                          {isPsychInitiated && (
                            <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                              {ct.scheduledInvitation}
                            </Badge>
                          )}
                        </div>
                        {c.studentName && (
                          <div className="text-xs text-muted-foreground">{c.studentName}</div>
                        )}
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {safeFmt(c.createdAt, "MMM d, yyyy")}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!isPsychInitiated && <StatusBadge status={c.status} t={t} />}
                      {(c.adminDescription || c.price != null || c.psychologistSummary) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => setExpandedId(isExpanded ? null : c.id)}
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Psychologist-initiated invitation notice */}
                  {isPsychInitiated && (
                    <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                      <div className="flex items-start gap-2">
                        <CalendarCheck className="w-4 h-4 text-purple-600 mt-0.5 shrink-0" />
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-purple-800">{ct.scheduledByPsych}</p>
                          {c.price != null && c.price > 0 && (
                            <p className="text-sm text-purple-700">
                              {ct.price}: <strong>{t.currency.format(c.price)}</strong>
                            </p>
                          )}
                          {c.adminDescription && (
                            <p className="text-sm text-purple-700">{c.adminDescription}</p>
                          )}
                          {c.scheduledDate && (
                            <p className="text-sm text-purple-700">
                              📅 <strong>{safeFmt(c.scheduledDate, "EEEE, MMMM d, yyyy")}</strong>
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Approved notice (parent-initiated, approved by admin) */}
                  {!isPsychInitiated && c.status === "approved" && (
                    <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-emerald-800">{ct.approvedNotice}</p>
                          {c.price != null && c.price > 0 && (
                            <p className="text-sm text-emerald-700">
                              {ct.price}: <strong>{t.currency.format(c.price)}</strong>
                            </p>
                          )}
                          {c.adminDescription && (
                            <p className="text-sm text-emerald-700">{c.adminDescription}</p>
                          )}
                          {c.scheduledDate && (
                            <p className="text-sm text-emerald-700">
                              {ct.scheduledDate}: <strong>{safeFmt(c.scheduledDate, "MMMM d, yyyy")}</strong>
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Rejected notice */}
                  {c.status === "rejected" && c.adminDescription && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                      {c.adminDescription}
                    </div>
                  )}

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="mt-4 space-y-3 border-t pt-3">
                      {c.parentNotes && (
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">{ct.yourNotes}</p>
                          <p className="text-sm">{c.parentNotes}</p>
                        </div>
                      )}
                      {c.psychologistSummary && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700 mb-1">{ct.psychologistSummary}</p>
                          <p className="text-sm text-blue-900">{c.psychologistSummary}</p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Request Dialog */}
      <Dialog open={!!dialogType} onOpenChange={(open) => { if (!open) setDialogType(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {dialogType === "free" ? ct.requestFree : ct.requestPaid}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {dialogType === "free" && (
              <div className="text-sm text-muted-foreground bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                {ct.freeConsultationDesc}
              </div>
            )}
            {myStudents.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{ct.selectChild}</label>
                <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                  <SelectTrigger>
                    <SelectValue placeholder={ct.anyChild} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{ct.anyChild}</SelectItem>
                    {myStudents.map((s: any) => (
                      <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{ct.notesLabel}</label>
              <Textarea
                rows={3}
                placeholder={ct.notesPlaceholder}
                value={parentNotes}
                onChange={(e) => setParentNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">{t.groups.cancel}</Button>
            </DialogClose>
            <Button
              style={{ backgroundColor: "#F5A600", color: "#1B2E8F" }}
              className="font-semibold"
              onClick={handleCreate}
              disabled={isCreating}
            >
              {isCreating ? ct.sending : ct.sendRequest}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

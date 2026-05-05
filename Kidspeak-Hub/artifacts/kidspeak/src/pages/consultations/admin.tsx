import { useState } from "react";
import {
  useListConsultations,
  useApproveConsultation,
  useRejectConsultation,
  type Consultation,
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLanguage } from "@/contexts/language-context";
import { useToast } from "@/hooks/use-toast";
import {
  MessageCircle,
  CheckCircle2,
  XCircle,
  Clock,
  Star,
  DollarSign,
  Filter,
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

export default function AdminConsultations() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const ct = t.consultations;

  const { data: consultations = [], isLoading, refetch } = useListConsultations();
  const { mutate: approve, isPending: isApproving } = useApproveConsultation();
  const { mutate: reject, isPending: isRejecting } = useRejectConsultation();

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [approveTarget, setApproveTarget] = useState<Consultation | null>(null);
  const [rejectTarget, setRejectTarget] = useState<Consultation | null>(null);

  // Approve form state
  const [price, setPrice] = useState("");
  const [adminDescription, setAdminDescription] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");

  // Reject form state
  const [rejectReason, setRejectReason] = useState("");

  const filtered = consultations.filter((c) =>
    statusFilter === "all" ? true : c.status === statusFilter
  );

  const pendingCount = consultations.filter((c) => c.status === "pending").length;
  const approvedCount = consultations.filter((c) => c.status === "approved").length;
  const completedCount = consultations.filter((c) => c.status === "completed").length;
  const pendingRevenue = consultations
    .filter((c) => c.status === "approved" && c.price != null && c.type === "paid")
    .reduce((sum, c) => sum + (c.price ?? 0), 0);

  const handleApprove = () => {
    if (!approveTarget) return;
    approve(
      {
        id: approveTarget.id,
        data: {
          price: price ? parseFloat(price) : undefined,
          adminDescription: adminDescription.trim() || undefined,
          scheduledDate: scheduledDate || undefined,
        },
      },
      {
        onSuccess: () => {
          toast({ title: ct.approvedSuccess });
          setApproveTarget(null);
          setPrice("");
          setAdminDescription("");
          setScheduledDate("");
          refetch();
        },
        onError: () => toast({ title: "Error", variant: "destructive" }),
      }
    );
  };

  const handleReject = () => {
    if (!rejectTarget) return;
    reject(
      { id: rejectTarget.id, reason: rejectReason.trim() || undefined },
      {
        onSuccess: () => {
          toast({ title: ct.rejectedSuccess });
          setRejectTarget(null);
          setRejectReason("");
          refetch();
        },
        onError: () => toast({ title: "Error", variant: "destructive" }),
      }
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{ct.adminTitle}</h1>
        <p className="text-muted-foreground text-sm mt-1">{ct.adminSubtitle}</p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: ct.statPending, value: pendingCount, color: "amber" },
          { label: ct.statApproved, value: approvedCount, color: "emerald" },
          { label: ct.statCompleted, value: completedCount, color: "blue" },
          { label: ct.statPendingRevenue, value: t.currency.format(pendingRevenue), color: "yellow", wide: true },
        ].map(({ label, value, color, wide }) => (
          <Card key={label} className={`border-${color}-200 bg-${color}-50/50`}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className={`text-2xl font-bold text-${color}-700 ${wide ? "text-xl" : ""}`}>{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3 flex-wrap">
        <Filter className="w-4 h-4 text-muted-foreground" />
        {(["all", "pending", "approved", "completed", "rejected"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              statusFilter === s ? "text-white border-transparent" : "bg-transparent hover:bg-muted"
            }`}
            style={statusFilter === s ? { backgroundColor: "#1B2E8F" } : {}}
          >
            {s === "all" ? ct.filterAll : ct[`status${s.charAt(0).toUpperCase() + s.slice(1)}` as keyof typeof ct]}
          </button>
        ))}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">{ct.loading}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p>{ct.noConsultations}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((c) => (
            <Card key={c.id} className={c.status === "pending" ? "border-amber-200" : ""}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                        c.type === "free" ? "bg-emerald-100" : "bg-blue-100"
                      }`}
                    >
                      {c.type === "free"
                        ? <Star className="w-5 h-5 text-emerald-600" />
                        : <DollarSign className="w-5 h-5 text-blue-600" />
                      }
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold">{c.parentName}</span>
                        <StatusBadge status={c.status} t={t} />
                        <Badge variant="outline" className="text-xs">
                          {c.type === "free" ? ct.typeFree : ct.typePaid}
                        </Badge>
                      </div>
                      {c.studentName && (
                        <p className="text-sm text-muted-foreground">{ct.forStudent}: {c.studentName}</p>
                      )}
                      {c.parentNotes && (
                        <p className="text-sm text-muted-foreground italic mt-1 max-w-lg">"{c.parentNotes}"</p>
                      )}
                      <div className="flex gap-3 mt-1.5 text-xs text-muted-foreground flex-wrap">
                        <span>{safeFmt(c.createdAt, "MMM d, yyyy 'at' HH:mm")}</span>
                        {c.price != null && (
                          <span className="font-medium text-emerald-700">{t.currency.format(c.price)}</span>
                        )}
                        {c.scheduledDate && (
                          <span>{ct.scheduledDate}: {safeFmt(c.scheduledDate, "MMM d, yyyy")}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {c.status === "pending" && (
                    <div className="flex gap-2 shrink-0">
                      <Button
                        size="sm"
                        style={{ backgroundColor: "#F5A600", color: "#1B2E8F" }}
                        className="font-semibold"
                        onClick={() => {
                          setApproveTarget(c);
                          setPrice(c.price != null ? String(c.price) : "");
                          setAdminDescription(c.adminDescription ?? "");
                          setScheduledDate(c.scheduledDate ?? "");
                        }}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 me-1" />
                        {ct.approve}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-red-300 text-red-600 hover:bg-red-50"
                        onClick={() => { setRejectTarget(c); setRejectReason(""); }}
                      >
                        <XCircle className="w-3.5 h-3.5 me-1" />
                        {ct.reject}
                      </Button>
                    </div>
                  )}
                  {c.status === "approved" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setApproveTarget(c);
                        setPrice(c.price != null ? String(c.price) : "");
                        setAdminDescription(c.adminDescription ?? "");
                        setScheduledDate(c.scheduledDate ?? "");
                      }}
                    >
                      {ct.edit}
                    </Button>
                  )}
                </div>

                {c.adminDescription && c.status !== "pending" && (
                  <div className="mt-3 text-sm text-muted-foreground bg-muted/40 rounded px-3 py-2">
                    <span className="font-medium">{ct.adminNote}:</span> {c.adminDescription}
                  </div>
                )}
                {c.psychologistSummary && (
                  <div className="mt-3 text-sm bg-blue-50 text-blue-800 border border-blue-200 rounded px-3 py-2">
                    <span className="font-medium">{ct.psychologistSummary}:</span> {c.psychologistSummary}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Approve Dialog */}
      <Dialog open={!!approveTarget} onOpenChange={(o) => { if (!o) setApproveTarget(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{ct.approveTitle}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {approveTarget?.type === "paid" && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{ct.price} (DZD)</label>
                <Input
                  type="number"
                  min="0"
                  step="500"
                  placeholder="e.g. 5000"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{ct.scheduledDate}</label>
              <Input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{ct.adminDescriptionLabel}</label>
              <Textarea
                rows={3}
                placeholder={ct.adminDescriptionPlaceholder}
                value={adminDescription}
                onChange={(e) => setAdminDescription(e.target.value)}
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
              onClick={handleApprove}
              disabled={isApproving}
            >
              {isApproving ? t.groups.saving : ct.approve}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={!!rejectTarget} onOpenChange={(o) => { if (!o) setRejectTarget(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{ct.rejectTitle}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">{ct.rejectDescription}</p>
            <Textarea
              rows={3}
              placeholder={ct.rejectReasonPlaceholder}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">{t.groups.cancel}</Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={isRejecting}
            >
              {isRejecting ? t.groups.saving : ct.reject}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

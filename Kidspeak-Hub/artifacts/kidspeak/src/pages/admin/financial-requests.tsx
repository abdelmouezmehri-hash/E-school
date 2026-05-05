import { useState, useEffect } from "react";
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
  CheckCircle2,
  XCircle,
  Clock,
  Users,
  TrendingUp,
  AlertTriangle,
  Filter,
  RefreshCw,
  Hash,
  UserCircle2,
} from "lucide-react";
import { format } from "date-fns";

function safeFmt(dateStr: string | null | undefined, fmt: string): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return String(dateStr);
  return format(d, fmt);
}

interface PaymentRequest {
  id: number;
  staffId: number;
  staffName: string;
  staffRole: string;
  staffEmail: string;
  type: "payment_request" | "bonus_expense";
  amount: number;
  category: string | null;
  reason: string | null;
  status: "pending" | "approved" | "rejected";
  adminComment: string | null;
  referenceNumber: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  receiptConfirmedAt: string | null;
  createdAt: string;
}

function formatDZD(amount: number) {
  return new Intl.NumberFormat("ar-DZ", { style: "currency", currency: "DZD", minimumFractionDigits: 0 }).format(amount);
}

function StatusBadge({ status, t }: { status: PaymentRequest["status"]; t: any }) {
  const tp = t.paymentRequests;
  if (status === "pending") return <Badge className="bg-amber-100 text-amber-700 border-amber-200 gap-1"><Clock className="w-3 h-3" />{tp.statusPending}</Badge>;
  if (status === "approved") return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 gap-1"><CheckCircle2 className="w-3 h-3" />{tp.statusApproved}</Badge>;
  return <Badge className="bg-red-100 text-red-700 border-red-200 gap-1"><XCircle className="w-3 h-3" />{tp.statusRejected}</Badge>;
}

function RoleBadge({ role }: { role: string }) {
  const colors: Record<string, string> = {
    teacher: "bg-blue-100 text-blue-700",
    psychologist: "bg-violet-100 text-violet-700",
  };
  return (
    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${colors[role] ?? "bg-gray-100 text-gray-700"}`}>
      {role}
    </span>
  );
}

export default function AdminFinancialRequests() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const tp = t.paymentRequests;

  const [requests, setRequests] = useState<PaymentRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");

  // Approve dialog state
  const [approveTarget, setApproveTarget] = useState<PaymentRequest | null>(null);
  const [approvePeriod, setApprovePeriod] = useState("");
  const [approveComment, setApproveComment] = useState("");
  const [isSavingApprove, setIsSavingApprove] = useState(false);

  // Reject dialog state
  const [rejectTarget, setRejectTarget] = useState<PaymentRequest | null>(null);
  const [rejectComment, setRejectComment] = useState("");
  const [isSavingReject, setIsSavingReject] = useState(false);

  const loadRequests = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/staff-payment-requests", { credentials: "include" });
      if (res.ok) setRequests(await res.json());
    } finally { setIsLoading(false); }
  };

  useEffect(() => { loadRequests(); }, []);

  const handleApprove = async () => {
    if (!approveTarget) return;
    setIsSavingApprove(true);
    try {
      const res = await fetch(`/api/staff-payment-requests/${approveTarget.id}/approve`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ period: approvePeriod, adminComment: approveComment }),
      });
      if (res.ok) {
        toast({ title: tp.approveSuccess });
        setApproveTarget(null);
        setApprovePeriod("");
        setApproveComment("");
        loadRequests();
      } else {
        const err = await res.json().catch(() => ({}));
        toast({ title: "Error", description: err.error || "Failed", variant: "destructive" });
      }
    } finally { setIsSavingApprove(false); }
  };

  const handleReject = async () => {
    if (!rejectTarget) return;
    setIsSavingReject(true);
    try {
      const res = await fetch(`/api/staff-payment-requests/${rejectTarget.id}/reject`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminComment: rejectComment }),
      });
      if (res.ok) {
        toast({ title: tp.rejectSuccess });
        setRejectTarget(null);
        setRejectComment("");
        loadRequests();
      } else {
        const err = await res.json().catch(() => ({}));
        toast({ title: "Error", description: err.error || "Failed", variant: "destructive" });
      }
    } finally { setIsSavingReject(false); }
  };

  const filtered = filter === "all" ? requests : requests.filter((r) => r.status === filter);
  const pendingCount = requests.filter((r) => r.status === "pending").length;
  const totalApproved = requests.filter((r) => r.status === "approved").reduce((s, r) => s + r.amount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: "#1B2E8F" }}>
            {tp.adminTitle}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">{tp.adminSubtitle}</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadRequests} className="gap-2">
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </Button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-amber-500" />
              <span className="text-xs text-muted-foreground">{tp.statusPending}</span>
            </div>
            <p className="text-2xl font-bold text-amber-600">{pendingCount}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span className="text-xs text-muted-foreground">{tp.statusApproved}</span>
            </div>
            <p className="text-2xl font-bold text-emerald-600">{requests.filter((r) => r.status === "approved").length}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4" style={{ color: "#1B2E8F" }} />
              <span className="text-xs text-muted-foreground">Total Approved</span>
            </div>
            <p className="text-lg font-bold" style={{ color: "#1B2E8F" }}>{formatDZD(totalApproved)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        {(["pending", "approved", "rejected", "all"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition-all ${
              filter === f
                ? "border-transparent text-white"
                : "border-border text-muted-foreground bg-background hover:bg-muted"
            }`}
            style={filter === f ? {
              backgroundColor: f === "pending" ? "#f59e0b" : f === "approved" ? "#16a34a" : f === "rejected" ? "#dc2626" : "#1B2E8F",
            } : {}}
          >
            {f === "pending" ? tp.statusPending : f === "approved" ? tp.statusApproved : f === "rejected" ? tp.statusRejected : tp.allRequests}
            {f === "pending" && pendingCount > 0 && (
              <span className="ms-1.5 bg-white/30 rounded-full px-1.5 text-xs">{pendingCount}</span>
            )}
          </button>
        ))}
      </div>

      {/* Requests List */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">{tp.saving}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <AlertTriangle className="w-8 h-8 mx-auto mb-3 opacity-30" />
          <p>{tp.noRequests}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((req) => (
            <Card key={req.id} className={`border-l-4 transition-all ${
              req.status === "pending" ? "border-l-amber-400" : req.status === "approved" ? "border-l-emerald-500" : "border-l-red-400"
            }`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  {/* Left: Staff + Details */}
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <UserCircle2 className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="font-semibold text-sm">{req.staffName}</span>
                      <RoleBadge role={req.staffRole} />
                      <StatusBadge status={req.status} t={t} />
                    </div>

                    <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                      <span className="font-medium">
                        {req.type === "payment_request" ? tp.typePaymentRequest : tp.typeBonusExpense}
                        {req.category && (
                          <span className="ms-1 text-muted-foreground">
                            ({tp[`category${req.category.charAt(0).toUpperCase() + req.category.slice(1)}` as keyof typeof tp] ?? req.category})
                          </span>
                        )}
                      </span>
                      <span>{tp.requestedOn}: {safeFmt(req.createdAt, "MMM d, yyyy")}</span>
                      {req.referenceNumber && (
                        <span className="font-mono" style={{ color: "#1B2E8F" }}>
                          <Hash className="w-2.5 h-2.5 inline" />{req.referenceNumber}
                        </span>
                      )}
                    </div>

                    {req.reason && (
                      <p className="text-sm text-muted-foreground italic">"{req.reason}"</p>
                    )}

                    {req.adminComment && (
                      <div className="text-xs rounded px-2 py-1 bg-muted border">
                        <span className="font-semibold">{tp.adminComment}:</span> {req.adminComment}
                      </div>
                    )}

                    {req.status === "approved" && req.receiptConfirmedAt && (
                      <div className="text-xs text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        {tp.receiptConfirmed} — {safeFmt(req.receiptConfirmedAt, "MMM d, yyyy")}
                      </div>
                    )}

                    {req.status === "approved" && !req.receiptConfirmedAt && (
                      <div className="text-xs text-amber-600 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Awaiting staff receipt confirmation
                      </div>
                    )}
                  </div>

                  {/* Right: Amount + Actions */}
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span className="text-xl font-black" style={{ color: req.status === "rejected" ? "#dc2626" : "#1B2E8F" }}>
                      {formatDZD(req.amount)}
                    </span>
                    {req.status === "pending" && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="gap-1 font-semibold text-xs"
                          style={{ backgroundColor: "#16a34a", color: "white" }}
                          onClick={() => {
                            setApproveTarget(req);
                            setApprovePeriod(new Date().toLocaleDateString("en-GB", { month: "long", year: "numeric" }));
                            setApproveComment("");
                          }}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {tp.approveAndPay}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1 font-semibold text-xs border-red-300 text-red-600 hover:bg-red-50"
                          onClick={() => {
                            setRejectTarget(req);
                            setRejectComment("");
                          }}
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          {tp.reject}
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
      <Dialog open={!!approveTarget} onOpenChange={(o) => { if (!o) setApproveTarget(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-700">
              <CheckCircle2 className="w-5 h-5" />
              {tp.approveAndPay}
            </DialogTitle>
          </DialogHeader>
          {approveTarget && (
            <div className="space-y-4 py-2">
              <div className="rounded-lg bg-muted/50 p-3 space-y-1 text-sm">
                <p className="font-semibold">{approveTarget.staffName}</p>
                <p className="text-muted-foreground">{approveTarget.reason || (approveTarget.type === "payment_request" ? tp.typePaymentRequest : tp.typeBonusExpense)}</p>
                <p className="text-2xl font-black" style={{ color: "#1B2E8F" }}>{formatDZD(approveTarget.amount)}</p>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{tp.selectPeriod}</label>
                <Input
                  placeholder={tp.periodPlaceholder}
                  value={approvePeriod}
                  onChange={(e) => setApprovePeriod(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{tp.adminComment} <span className="text-muted-foreground text-xs">(optional)</span></label>
                <Textarea
                  placeholder="Any note for the staff member…"
                  value={approveComment}
                  onChange={(e) => setApproveComment(e.target.value)}
                  rows={2}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">{tp.cancel}</Button></DialogClose>
            <Button
              className="font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleApprove}
              disabled={isSavingApprove}
            >
              {isSavingApprove ? tp.saving : tp.approveAndPay}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={!!rejectTarget} onOpenChange={(o) => { if (!o) setRejectTarget(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-700">
              <XCircle className="w-5 h-5" />
              {tp.reject}
            </DialogTitle>
          </DialogHeader>
          {rejectTarget && (
            <div className="space-y-4 py-2">
              <div className="rounded-lg bg-red-50 border border-red-200 p-3 space-y-1 text-sm">
                <p className="font-semibold">{rejectTarget.staffName}</p>
                <p className="text-muted-foreground">{rejectTarget.reason || tp.typePaymentRequest}</p>
                <p className="text-xl font-bold text-red-600">{formatDZD(rejectTarget.amount)}</p>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{tp.rejectComment} *</label>
                <Textarea
                  placeholder={tp.rejectCommentPlaceholder}
                  value={rejectComment}
                  onChange={(e) => setRejectComment(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">{tp.cancel}</Button></DialogClose>
            <Button
              className="font-semibold bg-red-600 hover:bg-red-700 text-white"
              onClick={handleReject}
              disabled={isSavingReject || !rejectComment.trim()}
            >
              {isSavingReject ? tp.saving : tp.reject}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

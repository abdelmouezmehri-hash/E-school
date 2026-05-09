import { useState, useCallback } from "react";
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
  Send,
  Gift,
  Clock,
  CheckCircle2,
  XCircle,
  ThumbsUp,
  RefreshCw,
  Hash,
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
  if (status === "pending") return <Badge className="bg-amber-100 text-amber-700 border-amber-200 gap-1"><Clock className="w-3 h-3" />{t.paymentRequests.statusPending}</Badge>;
  if (status === "approved") return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 gap-1"><CheckCircle2 className="w-3 h-3" />{t.paymentRequests.statusApproved}</Badge>;
  return <Badge className="bg-red-100 text-red-700 border-red-200 gap-1"><XCircle className="w-3 h-3" />{t.paymentRequests.statusRejected}</Badge>;
}

interface Props {
  accentColor?: string;
  onRequestApproved?: () => void;
}

export function PaymentRequestsSection({ accentColor = "#1B2E8F", onRequestApproved }: Props) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const tp = t.paymentRequests;

  const [requests, setRequests] = useState<PaymentRequest[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const loadRequests = useCallback(async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      const res = await fetch("/api/staff-payment-requests/my", { credentials: "include" });
      if (res.ok) { setRequests(await res.json()); setIsLoaded(true); }
    } finally { setIsLoading(false); }
  }, [isLoading]);

  if (!isLoaded && !isLoading) { loadRequests(); }

  // Dialogs
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isBonusOpen, setIsBonusOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ amount: "", reason: "" });
  const [bonusForm, setBonusForm] = useState({ amount: "", category: "bonus", reason: "" });
  const [isSaving, setIsSaving] = useState(false);

  const submitRequest = async (type: string, payload: object) => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/staff-payment-requests", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, ...payload }),
      });
      if (res.ok) {
        toast({ title: tp.submitSuccess });
        setIsPaymentOpen(false);
        setIsBonusOpen(false);
        setPaymentForm({ amount: "", reason: "" });
        setBonusForm({ amount: "", category: "bonus", reason: "" });
        loadRequests();
      } else {
        const err = await res.json().catch(() => ({}));
        toast({ title: "Error", description: err.error || "Failed", variant: "destructive" });
      }
    } finally { setIsSaving(false); }
  };

  const confirmReceipt = async (id: number) => {
    const res = await fetch(`/api/staff-payment-requests/${id}/confirm-receipt`, {
      method: "PUT",
      credentials: "include",
    });
    if (res.ok) {
      toast({ title: tp.confirmReceiptSuccess });
      loadRequests();
      onRequestApproved?.();
    } else {
      const err = await res.json().catch(() => ({}));
      toast({ title: "Error", description: err.error || "Failed", variant: "destructive" });
    }
  };

  const pendingCount = requests.filter((r) => r.status === "pending").length;

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Send className="w-4 h-4" style={{ color: accentColor }} />
              {tp.myRequests}
              {pendingCount > 0 && (
                <span className="ms-1 px-1.5 py-0.5 text-xs font-bold rounded-full bg-amber-100 text-amber-700">{pendingCount}</span>
              )}
            </CardTitle>
            <div className="flex gap-2 flex-wrap">
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-xs font-semibold"
                style={{ borderColor: `${accentColor}55`, color: accentColor }}
                onClick={() => setIsPaymentOpen(true)}
              >
                <Send className="w-3.5 h-3.5" />
                {tp.submitPaymentRequest}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-xs font-semibold border-amber-300 text-amber-700 hover:bg-amber-50"
                onClick={() => setIsBonusOpen(true)}
              >
                <Gift className="w-3.5 h-3.5" />
                {tp.requestBonus}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-6 text-muted-foreground text-sm">{tp.saving}</div>
          ) : requests.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">{tp.noRequests}</p>
          ) : (
            <div className="space-y-2">
              {requests.map((req) => (
                <div
                  key={req.id}
                  className={`p-3 rounded-lg border transition-colors ${
                    req.status === "pending"
                      ? "bg-amber-50/50 border-amber-200"
                      : req.status === "approved"
                      ? "bg-emerald-50/50 border-emerald-200"
                      : "bg-red-50/30 border-red-200"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <StatusBadge status={req.status} t={t} />
                        <span className="text-xs text-muted-foreground">
                          {req.type === "payment_request" ? tp.typePaymentRequest : tp.typeBonusExpense}
                          {req.category && ` · ${tp[`category${req.category.charAt(0).toUpperCase() + req.category.slice(1)}` as keyof typeof tp] ?? req.category}`}
                        </span>
                      </div>
                      {req.reason && <p className="text-xs text-muted-foreground truncate">{req.reason}</p>}
                      <p className="text-xs text-muted-foreground">
                        {tp.requestedOn}: {safeFmt(req.createdAt, "MMM d, yyyy")}
                        {req.referenceNumber && (
                          <span className="ms-2 font-mono font-medium text-xs" style={{ color: accentColor }}>
                            <Hash className="w-2.5 h-2.5 inline" />{req.referenceNumber}
                          </span>
                        )}
                      </p>
                      {req.adminComment && (
                        <p className="text-xs italic text-muted-foreground mt-1">"{req.adminComment}"</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <span className="font-bold text-base" style={{ color: req.status === "rejected" ? "#dc2626" : accentColor }}>
                        {formatDZD(req.amount)}
                      </span>
                      {req.status === "approved" && !req.receiptConfirmedAt && (
                        <Button
                          size="sm"
                          className="gap-1 text-xs font-semibold"
                          style={{ backgroundColor: "#16a34a", color: "white" }}
                          onClick={() => confirmReceipt(req.id)}
                        >
                          <ThumbsUp className="w-3.5 h-3.5" />
                          {tp.confirmReceipt}
                        </Button>
                      )}
                      {req.receiptConfirmedAt && (
                        <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {tp.receiptConfirmed}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Submit Payment Request Dialog */}
      <Dialog open={isPaymentOpen} onOpenChange={setIsPaymentOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="w-5 h-5" style={{ color: accentColor }} />
              {tp.submitPaymentRequest}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{tp.amount} *</label>
              <Input
                type="number"
                placeholder={tp.amountPlaceholder}
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm((f) => ({ ...f, amount: e.target.value }))}
                min={0}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{tp.reason}</label>
              <Textarea
                placeholder={tp.reasonPlaceholder}
                value={paymentForm.reason}
                onChange={(e) => setPaymentForm((f) => ({ ...f, reason: e.target.value }))}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">{tp.cancel}</Button></DialogClose>
            <Button
              style={{ backgroundColor: accentColor, color: "white" }}
              className="font-semibold"
              disabled={isSaving || !paymentForm.amount || parseFloat(paymentForm.amount) <= 0}
              onClick={() => submitRequest("payment_request", { amount: paymentForm.amount, reason: paymentForm.reason })}
            >
              {isSaving ? tp.saving : tp.submitPaymentRequest}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Request Bonus / Expense Dialog */}
      <Dialog open={isBonusOpen} onOpenChange={setIsBonusOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gift className="w-5 h-5 text-amber-600" />
              {tp.requestBonus}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{tp.category} *</label>
              <Select
                value={bonusForm.category}
                onValueChange={(v) => setBonusForm((f) => ({ ...f, category: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bonus">{tp.categoryBonus}</SelectItem>
                  <SelectItem value="materials">{tp.categoryMaterials}</SelectItem>
                  <SelectItem value="transportation">{tp.categoryTransportation}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{tp.amount} *</label>
              <Input
                type="number"
                placeholder={tp.amountPlaceholder}
                value={bonusForm.amount}
                onChange={(e) => setBonusForm((f) => ({ ...f, amount: e.target.value }))}
                min={0}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{tp.reason} *</label>
              <Textarea
                placeholder={tp.reasonPlaceholder}
                value={bonusForm.reason}
                onChange={(e) => setBonusForm((f) => ({ ...f, reason: e.target.value }))}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">{tp.cancel}</Button></DialogClose>
            <Button
              className="font-semibold bg-amber-500 hover:bg-amber-600 text-white"
              disabled={isSaving || !bonusForm.amount || parseFloat(bonusForm.amount) <= 0 || !bonusForm.reason.trim()}
              onClick={() => submitRequest("bonus_expense", { amount: bonusForm.amount, category: bonusForm.category, reason: bonusForm.reason })}
            >
              {isSaving ? tp.saving : tp.requestBonus}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

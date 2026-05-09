import { useState } from "react";
import { PaymentRequestsSection } from "@/components/payment-requests-section";
import { Link } from "wouter";
import {
  useGetMyEarnings,
  useCreateTeacherPayment,
  useMarkTeacherPaymentPaid,
  type TeacherPayment,
} from "@workspace/api-client-react";
import { useGetMe } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
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
import { useLanguage } from "@/contexts/language-context";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  DollarSign,
  CheckCircle2,
  Clock,
  TrendingUp,
  Calendar,
  Plus,
} from "lucide-react";
import { format } from "date-fns";

function safeFmt(dateStr: string | null | undefined, fmt: string): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return String(dateStr);
  return format(d, fmt);
}

export default function TeacherEarnings() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { data: me } = useGetMe();
  const isAdmin = me?.role === "admin";

  const qc = useQueryClient();
  const { data: earnings, isLoading, refetch } = useGetMyEarnings();
  const { mutate: createPayment, isPending: isSavingPayment } = useCreateTeacherPayment();
  const { mutate: markPaid } = useMarkTeacherPaymentPaid();

  const [isAddPaymentOpen, setIsAddPaymentOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentPeriod, setPaymentPeriod] = useState("");
  const [paymentNote, setPaymentNote] = useState("");

  if (isLoading) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        {t.earnings.loadingEarnings}
      </div>
    );
  }

  if (!earnings) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Failed to load earnings data.
      </div>
    );
  }

  const payTypeLabel =
    earnings.teacher.paymentType === "per_session"
      ? `${t.earnings.perSession} — DZD ${earnings.teacher.payPerSession.toLocaleString()} / session`
      : earnings.teacher.paymentType === "monthly"
      ? `${t.earnings.monthly} — DZD ${earnings.teacher.monthlySalary.toLocaleString()} / month`
      : null;

  const handleAddPayment = () => {
    if (!paymentAmount || !paymentPeriod) return;
    createPayment(
      {
        teacherId: earnings.teacher.id,
        amount: parseFloat(paymentAmount),
        period: paymentPeriod,
        note: paymentNote || undefined,
        status: "pending",
      },
      {
        onSuccess: () => {
          toast({ title: "Payment recorded." });
          setIsAddPaymentOpen(false);
          setPaymentAmount("");
          setPaymentPeriod("");
          setPaymentNote("");
          refetch();
          qc.invalidateQueries({ queryKey: ["salaries/my"] });
        },
        onError: () =>
          toast({ title: "Error", description: "Failed to record payment.", variant: "destructive" }),
      }
    );
  };

  const handleMarkPaid = (id: number) => {
    markPaid(id, {
      onSuccess: () => {
        toast({ title: "Payment marked as paid." });
        refetch();
        qc.invalidateQueries({ queryKey: ["salaries/my"] });
      },
      onError: () =>
        toast({ title: "Error", description: "Failed to update payment.", variant: "destructive" }),
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/groups">
          <Button variant="ghost" size="icon" className="shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{t.earnings.title}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{t.earnings.subtitle}</p>
        </div>
        {isAdmin && (
          <Button
            style={{ backgroundColor: "#F5A600", color: "#1B2E8F" }}
            className="font-semibold shrink-0"
            onClick={() => setIsAddPaymentOpen(true)}
          >
            <Plus className="w-4 h-4 me-2" />
            {t.earnings.addPayment}
          </Button>
        )}
      </div>

      {/* Pay Rate Info */}
      {payTypeLabel ? (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg border bg-blue-50/50 text-sm text-blue-800">
          <DollarSign className="w-4 h-4 shrink-0" />
          <span>{payTypeLabel}</span>
        </div>
      ) : (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg border bg-amber-50 text-sm text-amber-800">
          <Clock className="w-4 h-4 shrink-0" />
          <span>{t.earnings.notConfigured}</span>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">{t.earnings.sessionsCompleted}</p>
                <p className="text-2xl font-bold">{earnings.sessionCount}</p>
              </div>
              <Calendar className="w-8 h-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">{t.earnings.totalEarned}</p>
                <p className="text-2xl font-bold">DZD {earnings.totalEarned.toLocaleString()}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">{t.earnings.totalPaid}</p>
                <p className="text-2xl font-bold text-emerald-600">DZD {earnings.totalPaid.toLocaleString()}</p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-emerald-400/30" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">{t.earnings.balance}</p>
                <p className={`text-2xl font-bold ${earnings.balance > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                  DZD {earnings.balance.toLocaleString()}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" style={{ color: "#1B2E8F" }} />
            {t.earnings.paymentHistory}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {earnings.payments.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <DollarSign className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p>{t.earnings.noPayments}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {earnings.payments.map((payment: TeacherPayment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between gap-4 px-4 py-3 border rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">DZD {payment.amount.toLocaleString()}</span>
                      <Badge
                        className={
                          payment.status === "paid"
                            ? "bg-emerald-100 text-emerald-700 border-emerald-200 text-xs"
                            : "bg-amber-100 text-amber-700 border-amber-200 text-xs"
                        }
                      >
                        {payment.status === "paid" ? t.earnings.paid : t.earnings.pending}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-3">
                      <span>{t.earnings.period}: {payment.period}</span>
                      {payment.paidAt && (
                        <span>
                          {t.earnings.paidOn}: {safeFmt(payment.paidAt, "MMM d, yyyy")}
                        </span>
                      )}
                      {payment.note && <span className="italic">{payment.note}</span>}
                    </div>
                  </div>
                  {isAdmin && payment.status === "pending" && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="shrink-0 text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                      onClick={() => handleMarkPaid(payment.id)}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 me-1" />
                      {t.earnings.markAsPaid}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Payment Dialog (Admin) */}
      <Dialog open={isAddPaymentOpen} onOpenChange={setIsAddPaymentOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t.earnings.addPayment}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{t.earnings.amount}</label>
              <Input
                type="number"
                placeholder="e.g. 5000"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{t.earnings.period}</label>
              <Input
                placeholder="e.g. April 2026"
                value={paymentPeriod}
                onChange={(e) => setPaymentPeriod(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{t.earnings.note} (optional)</label>
              <Textarea
                rows={2}
                placeholder="Optional note..."
                value={paymentNote}
                onChange={(e) => setPaymentNote(e.target.value)}
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
              onClick={handleAddPayment}
              disabled={isSavingPayment || !paymentAmount || !paymentPeriod}
            >
              {isSavingPayment ? t.groups.saving : t.earnings.savePayment}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Staff Payment Requests */}
      {!isAdmin && <PaymentRequestsSection accentColor="#1B2E8F" onRequestApproved={() => refetch()} />}
    </div>
  );
}

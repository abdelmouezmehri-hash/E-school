import { useState, useEffect } from "react";
import { PaymentRequestsSection } from "@/components/payment-requests-section";
import { Link } from "wouter";
import {
  useGetMyEarnings,
  useCreateTeacherPayment,
  useMarkTeacherPaymentPaid,
  useGetMe,
} from "@workspace/api-client-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
  Stethoscope,
  BrainCircuit,
  Users,
  Sparkles,
  Trash2,
} from "lucide-react";
import { format } from "date-fns";

function AdminProfitShareSection() {
  const { data, isLoading } = useQuery<any>({
    queryKey: ["admin-summary"],
    queryFn: () => fetch("/api/salaries/admin-summary", { credentials: "include" }).then(r => r.ok ? r.json() : null),
    staleTime: 30_000,
  });

  if (isLoading || !data) return null;
  if (data.profitSharePercent == null) return null;

  const fmt = (n: number) =>
    new Intl.NumberFormat("ar-DZ", { style: "currency", currency: "DZD", minimumFractionDigits: 0 }).format(n);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-emerald-600" />
          نسبة الأرباح
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg border bg-muted/10">
            <p className="text-xs text-muted-foreground mb-1">الراتب الأساسي</p>
            <p className="text-base font-bold text-blue-700">{fmt(data.baseSalary)}</p>
          </div>
          <div className="p-3 rounded-lg border bg-muted/10">
            <p className="text-xs text-muted-foreground mb-1">نسبة الأرباح</p>
            <p className="text-base font-bold text-purple-700">{data.profitSharePercent}%</p>
          </div>
          <div className="p-3 rounded-lg border bg-muted/10">
            <p className="text-xs text-muted-foreground mb-1">صافي الإيرادات (هذا الشهر)</p>
            <p className="text-sm font-semibold">{fmt(data.netRevenue)}</p>
          </div>
          <div className="p-3 rounded-lg border bg-emerald-50 border-emerald-200">
            <p className="text-xs text-muted-foreground mb-1">مبلغ الأرباح</p>
            <p className="text-base font-bold text-emerald-700">{fmt(data.profitShareAmount ?? 0)}</p>
          </div>
        </div>
        <div className="p-3 rounded-lg border bg-purple-50 border-purple-200 flex items-center justify-between">
          <span className="text-sm font-medium text-purple-800">إجمالي المستحقات (الراتب + الأرباح)</span>
          <span className="text-base font-bold text-purple-800">{fmt(data.totalEarnings)}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function SalarySection() {
  const { data, isLoading } = useQuery<any>({
    queryKey: ["salaries/my"],
    queryFn: () =>
      fetch("/api/salaries/my", { credentials: "include" }).then(r =>
        r.ok ? r.json() : { salaries: [], summary: {} }
      ),
    staleTime: 60_000,
  });
  const salaries: any[] = data?.salaries ?? [];

  const thisYear = new Date().getFullYear().toString();
  const yearSalaries = salaries.filter((s: any) => (s.paidAt ?? s.createdAt ?? "").startsWith(thisYear));
  const totalThisYear = yearSalaries.reduce((sum: number, s: any) => sum + Number(s.amount), 0);
  const last = salaries[0];
  const nextExpected = last?.paidAt
    ? (() => {
        const d = new Date(last.paidAt);
        d.setMonth(d.getMonth() + 1);
        return d.toLocaleDateString("ar-DZ", { month: "long", year: "numeric" });
      })()
    : null;

  if (isLoading) return null;
  if (salaries.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <DollarSign className="w-4 h-4" style={{ color: "#7c3aed" }} />
          راتبي
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg border bg-muted/10">
            <p className="text-xs text-muted-foreground mb-1">إجمالي هذه السنة</p>
            <p className="text-base font-bold" style={{ color: "#7c3aed" }}>
              {new Intl.NumberFormat("ar-DZ", { style: "currency", currency: "DZD", minimumFractionDigits: 0 }).format(totalThisYear)}
            </p>
          </div>
          {last && (
            <div className="p-3 rounded-lg border bg-muted/10">
              <p className="text-xs text-muted-foreground mb-1">آخر دفعة</p>
              <p className="text-sm font-semibold">{last.period}</p>
              <p className="text-xs text-muted-foreground">{last.paidAt ? new Date(last.paidAt).toLocaleDateString("ar-DZ", { day: "numeric", month: "short", year: "numeric" }) : "—"}</p>
            </div>
          )}
        </div>
        {nextExpected && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            الدفعة القادمة المتوقعة: {nextExpected}
          </p>
        )}

        {/* Salary list */}
        <div className="space-y-2">
          {salaries.slice(0, 6).map((s: any) => (
            <div key={s.id} className="flex items-center justify-between py-2 border-b last:border-0 text-sm">
              <div>
                <p className="font-medium">{s.period}</p>
                {s.note && <p className="text-xs text-muted-foreground">{s.note}</p>}
                {s.paidAt && <p className="text-xs text-muted-foreground">{new Date(s.paidAt).toLocaleDateString("ar-DZ", { day: "numeric", month: "short", year: "numeric" })}</p>}
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold">
                  {new Intl.NumberFormat("ar-DZ", { style: "currency", currency: "DZD", minimumFractionDigits: 0 }).format(Number(s.amount))}
                </span>
                <Badge className="bg-green-100 text-green-700 border-green-200 text-[10px]">مدفوع</Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function safeFmt(dateStr: string | null | undefined, fmt: string): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return String(dateStr);
  return format(d, fmt);
}

function formatDZD(amount: number) {
  return new Intl.NumberFormat("ar-DZ", { style: "currency", currency: "DZD", minimumFractionDigits: 0 }).format(amount);
}

export default function PsychologistEarnings() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { data: me } = useGetMe();
  const isAdmin = me?.role === "admin";

  const { data: earnings, isLoading, refetch } = useGetMyEarnings();
  const qc = useQueryClient();
  const { mutate: createPayment, isPending: isSavingPayment } = useCreateTeacherPayment();
  const { mutate: markPaid } = useMarkTeacherPaymentPaid();

  const [isAddPaymentOpen, setIsAddPaymentOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentPeriod, setPaymentPeriod] = useState("");
  const [paymentNote, setPaymentNote] = useState("");

  const [adhocSessions, setAdhocSessions] = useState<any[]>([]);
  const [deletingAdhocId, setDeletingAdhocId] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/adhoc-sessions/my", { credentials: "include" })
      .then(r => r.ok ? r.json() : [])
      .then(setAdhocSessions)
      .catch(() => {});
  }, [me?.id]);

  const handleDeleteAdhoc = async (id: number) => {
    setDeletingAdhocId(id);
    try {
      const r = await fetch(`/api/adhoc-sessions/${id}`, { method: "DELETE", credentials: "include" });
      if (r.ok) {
        setAdhocSessions(prev => prev.filter(s => s.id !== id));
        toast({ title: "Session deleted." });
      } else {
        toast({ title: "Failed to delete session.", variant: "destructive" });
      }
    } finally {
      setDeletingAdhocId(null);
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">{t.earnings.loadingEarnings}</div>;
  }

  if (!earnings) {
    return <div className="p-8 text-center text-muted-foreground">Failed to load earnings data.</div>;
  }

  const payTypeLabel =
    earnings.teacher.paymentType === "per_session"
      ? `${t.earnings.perSession} — ${formatDZD(earnings.teacher.payPerSession)} / ${t.earnings.sessionUnit ?? "session"}`
      : earnings.teacher.paymentType === "monthly"
      ? `${t.earnings.monthly} — ${formatDZD(earnings.teacher.monthlySalary)} / ${t.earnings.monthUnit ?? "month"}`
      : null;

  const handleAddPayment = () => {
    if (!paymentAmount || !paymentPeriod) return;
    createPayment(
      {
        teacherId: earnings.teacher.id,
        amount: parseFloat(paymentAmount),
        period: paymentPeriod,
        note: paymentNote || undefined,
      } as any,
      {
        onSuccess: () => {
          toast({ title: t.earnings.paymentAdded });
          setIsAddPaymentOpen(false);
          setPaymentAmount("");
          setPaymentPeriod("");
          setPaymentNote("");
          refetch();
          qc.invalidateQueries({ queryKey: ["salaries/my"] });
        },
        onError: () => toast({ title: t.earnings.paymentFailed, variant: "destructive" }),
      }
    );
  };

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/psychologist/sessions">
          <Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: "#7c3aed" }}>
            <Stethoscope className="w-6 h-6" />
            {t.psychEarnings.title}
          </h1>
          <p className="text-sm text-muted-foreground">{t.psychEarnings.subtitle}</p>
        </div>
      </div>

      {/* Pay rate badge */}
      {payTypeLabel && (
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border" style={{ borderColor: "#7c3aed44", color: "#7c3aed", background: "#7c3aed11" }}>
          <DollarSign className="w-4 h-4" />
          {payTypeLabel}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: t.psychEarnings.sessionsCompleted, value: earnings.sessionCount, icon: Calendar, color: "#7c3aed" },
          { label: t.psychEarnings.totalEarned, value: formatDZD(earnings.totalEarned), icon: TrendingUp, color: "#1B2E8F" },
          { label: t.psychEarnings.totalPaid, value: formatDZD(earnings.totalPaid), icon: CheckCircle2, color: "#16a34a" },
          { label: t.psychEarnings.balance, value: formatDZD(earnings.balance), icon: DollarSign, color: "#F5A600" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Icon className="w-4 h-4" style={{ color }} />
                <span className="text-xs text-muted-foreground">{label}</span>
              </div>
              <p className="text-lg font-bold" style={{ color }}>{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Session Type Breakdown */}
      {(earnings.regularSessionCount !== undefined || earnings.interventionSessionCount !== undefined || earnings.adhocSessionCount !== undefined) && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Group Sessions", value: earnings.regularSessionCount ?? 0, icon: Users, color: "#1B2E8F" },
            { label: "Interventions", value: earnings.interventionSessionCount ?? 0, icon: BrainCircuit, color: "#7c3aed" },
            { label: "One-off", value: earnings.adhocSessionCount ?? 0, icon: Sparkles, color: "#7c3aed" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="flex items-center gap-3 p-3 rounded-lg border bg-muted/10">
              <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: `${color}18` }}>
                <Icon className="w-4 h-4" style={{ color }} />
              </div>
              <div>
                <div className="text-lg font-bold" style={{ color }}>{value}</div>
                <div className="text-xs text-muted-foreground">{label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Payment History */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="w-4 h-4" />
              {t.psychEarnings.paymentHistory}
            </CardTitle>
            {isAdmin && (
              <Button size="sm" onClick={() => setIsAddPaymentOpen(true)} style={{ backgroundColor: "#7c3aed", color: "white" }}>
                <Plus className="w-3.5 h-3.5 me-1.5" />{t.psychEarnings.addPayment}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {earnings.payments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">{t.psychEarnings.noPayments}</p>
          ) : (
            <div className="space-y-2">
              {earnings.payments.map((p: any) => (
                <div key={p.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/10">
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium">{p.period}</p>
                    {p.note && <p className="text-xs text-muted-foreground">{p.note}</p>}
                    <p className="text-xs text-muted-foreground">
                      {safeFmt(p.paidAt ?? p.createdAt, "MMM d, yyyy")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{formatDZD(p.amount)}</span>
                    {p.status === "paid" ? (
                      <Badge className="bg-green-100 text-green-700 border-green-200">{t.status.paid}</Badge>
                    ) : (
                      <>
                        <Badge className="bg-amber-100 text-amber-700 border-amber-200">{t.status.pending}</Badge>
                        {isAdmin && (
                          <Button size="sm" variant="outline" onClick={() => markPaid({ id: p.id } as any, { onSuccess: () => { refetch(); qc.invalidateQueries({ queryKey: ["salaries/my"] }); } })}>
                            {t.psychEarnings.markPaid}
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Session log */}
      {earnings.sessions && earnings.sessions.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              {t.psychEarnings.sessionsTitle}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              {earnings.sessions.map((s: any) => (
                <div key={s.id} className="flex items-center justify-between text-sm py-2 border-b last:border-0">
                  <span className="text-muted-foreground">{s.sessionDate}</span>
                  <span className="text-muted-foreground text-xs">Group #{s.groupId}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ad-hoc Sessions */}
      {adhocSessions.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="w-4 h-4" style={{ color: "#7c3aed" }} />
              {t.groups.adhocSession}
              <Badge variant="secondary" className="ms-1">{adhocSessions.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {adhocSessions.map((s: any) => (
                <div key={s.id} className="flex items-start justify-between gap-3 py-2 border-b last:border-0">
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium">{s.studentName}</span>
                      {s.durationMinutes && (
                        <span className="text-xs text-muted-foreground">{s.durationMinutes} min</span>
                      )}
                    </div>
                    {s.title && <p className="text-xs text-muted-foreground">{s.title}</p>}
                    {s.notes && <p className="text-xs text-muted-foreground italic">{s.notes}</p>}
                    <p className="text-xs text-muted-foreground">{s.sessionDate}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                    disabled={deletingAdhocId === s.id}
                    onClick={() => handleDeleteAdhoc(s.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add payment dialog (admin only) */}
      <Dialog open={isAddPaymentOpen} onOpenChange={setIsAddPaymentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.psychEarnings.addPayment}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{t.earnings.amount}</label>
              <Input type="number" min={0} placeholder="0" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{t.earnings.period}</label>
              <Input placeholder={t.earnings.periodPlaceholder} value={paymentPeriod} onChange={e => setPaymentPeriod(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{t.earnings.note}</label>
              <Textarea rows={2} placeholder={t.earnings.notePlaceholder} value={paymentNote} onChange={e => setPaymentNote(e.target.value)} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <DialogClose asChild><Button variant="outline">{t.earnings.cancel}</Button></DialogClose>
            <Button onClick={handleAddPayment} disabled={isSavingPayment || !paymentAmount || !paymentPeriod} style={{ backgroundColor: "#7c3aed", color: "white" }}>
              {isSavingPayment ? t.earnings.saving : t.earnings.addPayment}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Staff Payment Requests */}
      {!isAdmin && <PaymentRequestsSection accentColor="#7c3aed" onRequestApproved={() => refetch()} />}

      {/* ── Salary History ── */}
      {isAdmin && <AdminProfitShareSection />}
      <SalarySection />
    </div>
  );
}

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useGetMe } from "@workspace/api-client-react";
import { Link } from "wouter";
import {
  GraduationCap, Calendar, Wallet, ChevronRight, BookOpen,
  Bell, Clock, MapPin, Users, CheckCircle2, AlertCircle,
  X, Star, CalendarDays, CreditCard,
} from "lucide-react";

// ── Palette ───────────────────────────────────────────────────────────────────
const NAVY   = "#1B2E8F";
const YELLOW = "#F5A600";
const TEAL   = "#5EC4A0";

// ── Helpers ───────────────────────────────────────────────────────────────────
const today = new Date().toISOString().slice(0, 10);

function todayAr() {
  return new Date().toLocaleDateString("ar-DZ", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
}

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("ar-DZ", {
      weekday: "short", month: "short", day: "numeric",
    });
  } catch { return iso; }
}

function fmtCurrency(n: number | string) {
  return Number(n).toLocaleString("fr-DZ");
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function Skel({ h = "h-4", w = "w-full", cls = "" }: { h?: string; w?: string; cls?: string }) {
  return <div className={`animate-pulse bg-slate-100 rounded-xl ${h} ${w} ${cls}`} />;
}

// ── Event type helpers ────────────────────────────────────────────────────────
function eventStyle(type: string) {
  switch (type) {
    case "session":      return { bg: "#EFF3FF", border: NAVY,   label: "حصة دراسية",  dot: NAVY };
    case "meeting":      return { bg: "#FFF7ED", border: YELLOW, label: "اجتماع",       dot: YELLOW };
    case "workshop":     return { bg: "#F0FDF4", border: "#10b981", label: "ورشة",      dot: "#10b981" };
    case "event":        return { bg: "#F0FDF4", border: "#10b981", label: "فعالية",    dot: "#10b981" };
    case "consultation": return { bg: "#F0FDFA", border: TEAL,   label: "استشارة",      dot: TEAL };
    default:             return { bg: "#F8FAFC", border: "#94a3b8", label: type,         dot: "#94a3b8" };
  }
}

// ── Student status badge ──────────────────────────────────────────────────────
function StatusBadge({ group }: { group?: string | null }) {
  if (group) {
    return (
      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full"
            style={{ backgroundColor: "#f0fdf4", color: "#059669" }}>
        نشط
      </span>
    );
  }
  return (
    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full"
          style={{ backgroundColor: "#fefce8", color: "#b45309" }}>
      بدون فوج
    </span>
  );
}

// ── Event detail modal ────────────────────────────────────────────────────────
function EventModal({ event, onClose }: { event: any; onClose: () => void }) {
  const st = eventStyle(event.type);
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
         style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
         onClick={onClose}>
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden"
           onClick={e => e.stopPropagation()}>
        {/* Color strip */}
        <div className="h-2" style={{ backgroundColor: st.border }} />
        <div className="p-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full mb-2 inline-block"
                    style={{ backgroundColor: st.bg, color: st.border }}>
                {st.label}
              </span>
              <h3 className="text-lg font-black text-slate-800 mt-1">{event.title}</h3>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm text-slate-600">
              <Calendar className="w-4 h-4 shrink-0" style={{ color: st.border }} />
              <span>{fmtDate(event.date)}</span>
            </div>
            {event.startTime && (
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <Clock className="w-4 h-4 shrink-0" style={{ color: st.border }} />
                <span>{event.startTime}</span>
              </div>
            )}
            {event.location && (
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <MapPin className="w-4 h-4 shrink-0" style={{ color: st.border }} />
                <span>{event.location}</span>
              </div>
            )}
            {event.subtitle && (
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <Users className="w-4 h-4 shrink-0" style={{ color: st.border }} />
                <span>{event.subtitle}</span>
              </div>
            )}
            {event.notes && (
              <div className="mt-3 p-3 rounded-xl text-sm text-slate-700 leading-relaxed"
                   style={{ backgroundColor: st.bg }}>
                {event.notes}
              </div>
            )}
            {event.isPaid && (
              <div className="flex items-center gap-2 text-sm font-semibold"
                   style={{ color: YELLOW }}>
                <CreditCard className="w-4 h-4" />
                <span>رسوم المشاركة: {fmtCurrency(event.price ?? 0)} دج</span>
              </div>
            )}
          </div>

          <button
            onClick={onClose}
            className="mt-5 w-full py-3 rounded-2xl text-sm font-bold"
            style={{ backgroundColor: `${NAVY}10`, color: NAVY }}
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ParentDashboard() {
  const { data: me } = useGetMe();
  const parentName = (me as any)?.name ?? "ولي الأمر";

  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);

  // ── Children ──────────────────────────────────────────────────────────────
  const { data: students, isLoading: studentsLoading } = useQuery<any[]>({
    queryKey: ["/api/students"],
    queryFn: () => fetch("/api/students", { credentials: "include" }).then(r => r.ok ? r.json() : []),
    staleTime: 60_000,
  });

  // ── Payments ──────────────────────────────────────────────────────────────
  const { data: payments, isLoading: paymentsLoading } = useQuery<any[]>({
    queryKey: ["/api/payments"],
    queryFn: () => fetch("/api/payments", { credentials: "include" }).then(r => r.ok ? r.json() : []),
    staleTime: 60_000,
  });

  // ── Schedule ──────────────────────────────────────────────────────────────
  const { data: scheduleRaw, isLoading: schedLoading } = useQuery<any[]>({
    queryKey: ["schedule/my"],
    queryFn: () => fetch("/api/schedule/my", { credentials: "include" }).then(r => r.ok ? r.json() : []),
    staleTime: 30_000,
  });

  // ── Derived data ──────────────────────────────────────────────────────────
  const schedule = scheduleRaw ?? [];

  // Next upcoming session per child name
  const nextSessionByChild = useMemo(() => {
    const upcoming = schedule
      .filter(s => s.date >= today && s.type === "session")
      .sort((a, b) => (a.date < b.date ? -1 : 1));

    const map: Record<string, any> = {};
    for (const s of upcoming) {
      const key = s.childName ?? s.subtitle ?? "";
      if (key && !map[key]) map[key] = s;
    }
    return map;
  }, [schedule]);

  // Upcoming non-session events (workshops, meetings, events, consultations)
  const upcomingEvents = useMemo(() => {
    return schedule
      .filter(s => s.date >= today && s.type !== "session")
      .sort((a, b) => (a.date < b.date ? -1 : 1))
      .slice(0, 8);
  }, [schedule]);

  // Payment aggregates
  const paymentTotals = useMemo(() => {
    const ps = payments ?? [];
    const netTotal  = ps.reduce((acc, p) => acc + (Number(p.netTotal)  || 0), 0);
    const amountPaid = ps.reduce((acc, p) => acc + (Number(p.amountPaid) || 0), 0);
    const balance   = ps.reduce((acc, p) => acc + (Number(p.balance)   || 0), 0);
    const hasOverdue = ps.some(p => p.status === "overdue");
    const progress  = netTotal > 0 ? Math.min(100, Math.round((amountPaid / netTotal) * 100)) : 0;
    return { netTotal, amountPaid, balance, hasOverdue, progress };
  }, [payments]);

  const hasAlert = paymentTotals.hasOverdue || paymentTotals.balance > 0;

  const children = students ?? [];

  return (
    <div
      className="space-y-5 pb-8"
      style={{ fontFamily: "'Noto Sans Arabic', system-ui, sans-serif" }}
      dir="rtl"
    >

      {/* ── WELCOME HEADER ──────────────────────────────────────────────────── */}
      <div
        className="rounded-3xl p-5 sm:p-6 relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${NAVY} 0%, #2d4db5 100%)`,
        }}
      >
        {/* Background decoration */}
        <div className="absolute top-0 left-0 w-48 h-48 rounded-full opacity-5"
             style={{ background: "white", transform: "translate(-30%, -30%)" }} />
        <div className="absolute bottom-0 right-4 w-32 h-32 rounded-full opacity-5"
             style={{ background: YELLOW, transform: "translateY(30%)" }} />

        <div className="relative">
          <p className="text-white/50 text-xs mb-1">{todayAr()}</p>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white leading-tight">
                أهلاً بك، {parentName} 👋
              </h1>
              <p className="text-white/60 text-sm mt-1">
                {studentsLoading ? "…" : `${children.length} ${children.length === 1 ? "طفل" : "أطفال"} مسجّل${children.length > 1 ? "ون" : ""}`}
              </p>
            </div>

            {/* Notification badge */}
            {hasAlert && (
              <div className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-bold"
                   style={{ backgroundColor: "rgba(245,166,0,0.2)", color: YELLOW, border: `1px solid ${YELLOW}40` }}>
                <Bell className="w-3.5 h-3.5" />
                {paymentTotals.hasOverdue ? "دفعة متأخرة" : "رصيد مستحق"}
              </div>
            )}
          </div>

          {/* Quick stat strip */}
          <div className="flex gap-3 mt-4 flex-wrap">
            {[
              { icon: Users,      val: children.length,         sub: "أطفال" },
              { icon: CalendarDays, val: upcomingEvents.length, sub: "أحداث قادمة" },
              { icon: BookOpen,   val: Object.keys(nextSessionByChild).length, sub: "حصص قادمة" },
            ].map((item, i) => {
              const Icon = item.icon;
              return (
                <div key={i} className="flex items-center gap-2 rounded-2xl px-3 py-2"
                     style={{ backgroundColor: "rgba(255,255,255,0.1)" }}>
                  <Icon className="w-3.5 h-3.5 text-white/60" />
                  <span className="text-white font-black text-sm">{item.val}</span>
                  <span className="text-white/50 text-xs">{item.sub}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── CHILDREN SECTION ────────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-black text-slate-800 flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                 style={{ backgroundColor: `${NAVY}15` }}>
              <GraduationCap className="w-4 h-4" style={{ color: NAVY }} />
            </div>
            أطفالي
          </h2>
          <Link href="/students">
            <span className="text-xs font-semibold flex items-center gap-1 cursor-pointer"
                  style={{ color: NAVY }}>
              التفاصيل <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </Link>
        </div>

        {studentsLoading ? (
          <div className="space-y-3">
            {[1, 2].map(i => <Skel key={i} h="h-28" />)}
          </div>
        ) : children.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-slate-100 shadow-sm">
            <GraduationCap className="w-10 h-10 text-slate-200 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-400">لا يوجد أطفال مسجّلون</p>
            <Link href="/students">
              <button className="mt-3 text-xs font-bold px-4 py-2 rounded-full"
                      style={{ backgroundColor: `${NAVY}15`, color: NAVY }}>
                طلب تسجيل
              </button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {children.map(child => {
              const nextSession = nextSessionByChild[child.name];
              const payStatus = child.paymentStatus;
              const payBadge = payStatus === "paid"
                ? { label: "مدفوع",    bg: "#f0fdf4",   text: "#059669", icon: CheckCircle2 }
                : payStatus === "overdue"
                ? { label: "متأخر",    bg: "#fef2f2",   text: "#dc2626", icon: AlertCircle }
                : payStatus === "partially_paid"
                ? { label: "جزئي",     bg: "#fefce8",   text: "#b45309", icon: AlertCircle }
                : { label: "قيد الانتظار", bg: "#f8fafc", text: "#64748b", icon: Clock };

              const PayIcon = payBadge.icon;

              return (
                <Link key={child.id} href={`/students/${child.id}`}>
                  <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 hover:shadow-md transition-all cursor-pointer">
                    <div className="flex items-start gap-3">
                      {/* Avatar */}
                      <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-base font-black text-white shrink-0"
                           style={{ background: `linear-gradient(135deg, ${NAVY}, #2d4db5)` }}>
                        {(child.name ?? "؟").charAt(0)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-black text-slate-800">{child.name}</span>
                          <StatusBadge group={child.currentGroupName} />
                        </div>

                        {/* Level + group */}
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-500">
                          {child.levelName && (
                            <span className="flex items-center gap-1">
                              <BookOpen className="w-3 h-3" />{child.levelName}
                            </span>
                          )}
                          {child.currentGroupName && (
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3" />{child.currentGroupName}
                            </span>
                          )}
                          {child.teacherName && (
                            <span className="flex items-center gap-1">
                              <GraduationCap className="w-3 h-3" />{child.teacherName}
                            </span>
                          )}
                        </div>

                        {/* Next session */}
                        {nextSession ? (
                          <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold"
                               style={{ color: NAVY }}>
                            <Calendar className="w-3 h-3" />
                            الحصة القادمة: {fmtDate(nextSession.date)}
                            {nextSession.startTime && ` — ${nextSession.startTime}`}
                          </div>
                        ) : (
                          <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-400">
                            <Calendar className="w-3 h-3" />
                            لا توجد حصص مجدولة
                          </div>
                        )}
                      </div>

                      {/* Payment badge */}
                      <div className="shrink-0 flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full"
                           style={{ backgroundColor: payBadge.bg, color: payBadge.text }}>
                        <PayIcon className="w-3 h-3" />
                        {payBadge.label}
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* ── PAYMENTS SECTION ────────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-black text-slate-800 flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                 style={{ backgroundColor: `${YELLOW}20` }}>
              <Wallet className="w-4 h-4" style={{ color: YELLOW }} />
            </div>
            المدفوعات
          </h2>
          <Link href="/payments">
            <span className="text-xs font-semibold flex items-center gap-1 cursor-pointer"
                  style={{ color: NAVY }}>
              كل المدفوعات <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </Link>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          {paymentsLoading ? (
            <div className="space-y-3"><Skel h="h-6" w="w-1/2" /><Skel h="h-3" /><Skel h="h-6" w="w-3/4" /></div>
          ) : (payments ?? []).length === 0 ? (
            <div className="py-6 text-center">
              <Wallet className="w-10 h-10 text-slate-200 mx-auto mb-2" />
              <p className="text-sm text-slate-400">لا توجد مدفوعات</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Totals row */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <p className="text-[11px] font-semibold text-slate-400 mb-0.5">الإجمالي</p>
                  <p className="text-base font-black text-slate-800">
                    {fmtCurrency(paymentTotals.netTotal)} <span className="text-xs font-normal text-slate-400">دج</span>
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-slate-400 mb-0.5">المدفوع</p>
                  <p className="text-base font-black" style={{ color: "#059669" }}>
                    {fmtCurrency(paymentTotals.amountPaid)} <span className="text-xs font-normal text-slate-400">دج</span>
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-slate-400 mb-0.5">المتبقي</p>
                  <p className={`text-base font-black ${paymentTotals.balance > 0 ? "text-red-500" : "text-slate-400"}`}>
                    {fmtCurrency(paymentTotals.balance)} <span className="text-xs font-normal text-slate-400">دج</span>
                  </p>
                </div>
              </div>

              {/* Progress bar */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-slate-500 font-semibold">نسبة السداد</span>
                  <span className="font-black" style={{ color: paymentTotals.progress === 100 ? "#059669" : NAVY }}>
                    {paymentTotals.progress}%
                  </span>
                </div>
                <div className="h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: "#f1f5f9" }}>
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${paymentTotals.progress}%`,
                      background: paymentTotals.progress === 100
                        ? "linear-gradient(90deg, #059669, #10b981)"
                        : `linear-gradient(90deg, ${NAVY}, #2d4db5)`,
                    }}
                  />
                </div>
              </div>

              {/* Per-student breakdown */}
              {(payments ?? []).length > 0 && (
                <div className="space-y-2 pt-1">
                  {(payments ?? []).slice(0, 4).map((p: any) => (
                    <div key={p.id} className="flex items-center justify-between text-sm py-1.5"
                         style={{ borderTop: "1px solid #f1f5f9" }}>
                      <div>
                        <span className="font-semibold text-slate-700">{p.studentName ?? "—"}</span>
                        {p.levelName && <span className="text-xs text-slate-400 mr-2">{p.levelName}</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          p.status === "paid"
                            ? "bg-green-50 text-green-600"
                            : p.status === "overdue"
                            ? "bg-red-50 text-red-600"
                            : p.status === "partially_paid"
                            ? "bg-amber-50 text-amber-600"
                            : "bg-slate-50 text-slate-500"
                        }`}>
                          {p.status === "paid" ? "مدفوع"
                            : p.status === "overdue" ? "متأخر"
                            : p.status === "partially_paid" ? "جزئي"
                            : "قيد الانتظار"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {paymentTotals.balance > 0 && (
                <div className="flex items-center gap-2 p-3 rounded-xl text-xs font-semibold"
                     style={{ backgroundColor: "#fef2f2", color: "#dc2626" }}>
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  يوجد رصيد مستحق بقيمة {fmtCurrency(paymentTotals.balance)} دج. يرجى التسوية مع الإدارة.
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ── EVENTS & WORKSHOPS ──────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-black text-slate-800 flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                 style={{ backgroundColor: "#10b98115" }}>
              <Star className="w-4 h-4 text-emerald-600" />
            </div>
            الأحداث والورشات
          </h2>
          <Link href="/schedule">
            <span className="text-xs font-semibold flex items-center gap-1 cursor-pointer"
                  style={{ color: NAVY }}>
              الكل <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </Link>
        </div>

        {schedLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => <Skel key={i} h="h-16" />)}
          </div>
        ) : upcomingEvents.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-slate-100 shadow-sm">
            <CalendarDays className="w-10 h-10 text-slate-200 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-400">لا توجد أحداث قادمة</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {upcomingEvents.map((ev, i) => {
              const st = eventStyle(ev.type);
              const isToday = ev.date === today;
              return (
                <button
                  key={i}
                  onClick={() => setSelectedEvent(ev)}
                  className="w-full text-right bg-white rounded-2xl p-4 shadow-sm border border-slate-100 hover:shadow-md transition-all flex items-start gap-3"
                  style={{ borderRight: `4px solid ${st.border}` }}
                >
                  {/* Date block */}
                  <div className="shrink-0 w-12 text-center rounded-xl py-2"
                       style={{ backgroundColor: isToday ? `${st.border}15` : "#f8fafc" }}>
                    <div className="text-lg font-black leading-none"
                         style={{ color: isToday ? st.border : "#334155" }}>
                      {new Date(ev.date + "T00:00:00").getDate()}
                    </div>
                    <div className="text-[10px] font-semibold text-slate-400 mt-0.5">
                      {new Date(ev.date + "T00:00:00").toLocaleDateString("ar-DZ", { month: "short" })}
                    </div>
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-bold text-slate-800 text-sm truncate">{ev.title}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: st.bg, color: st.border }}>
                        {st.label}
                      </span>
                      {isToday && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600">
                          اليوم
                        </span>
                      )}
                    </div>
                    {ev.subtitle && (
                      <p className="text-xs text-slate-500 truncate">{ev.subtitle}</p>
                    )}
                    {ev.startTime && (
                      <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" />{ev.startTime}
                      </p>
                    )}
                  </div>

                  <ChevronRight className="w-4 h-4 text-slate-300 shrink-0 mt-1" />
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* ── EVENT DETAIL MODAL ──────────────────────────────────────────────── */}
      {selectedEvent && (
        <EventModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />
      )}
    </div>
  );
}

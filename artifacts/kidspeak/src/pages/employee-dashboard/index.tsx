import { useQuery } from "@tanstack/react-query";
import { useGetMe } from "@workspace/api-client-react";
import { useLanguage } from "@/contexts/language-context";
import { Link } from "wouter";
import {
  CalendarDays, Users, Wallet, TrendingUp, Clock,
  CheckCircle2, XCircle, ChevronRight, BookOpen,
  Mic, Brain, Zap, Star, Calendar,
} from "lucide-react";

// ── Brand palette ──────────────────────────────────────────────────────────
const BRAND_BLUE   = "#1B2E8F";
const BRAND_YELLOW = "#F5A600";

// ── Session type styling ───────────────────────────────────────────────────
function sessionStyle(type: string) {
  switch (type) {
    case "session":      return { bg: "#EFF3FF", border: "#1B2E8F", text: "#1B2E8F", label: "حصة دراسية" };
    case "meeting":      return { bg: "#FFF7ED", border: "#F5A600", text: "#b45309", label: "اجتماع" };
    case "workshop":     return { bg: "#F0FDF4", border: "#10b981", text: "#059669", label: "ورشة" };
    case "event":        return { bg: "#F0FDF4", border: "#10b981", text: "#059669", label: "فعالية" };
    case "consultation": return { bg: "#F0FDFA", border: "#5EC4A0", text: "#0f766e", label: "استشارة" };
    default:             return { bg: "#F8FAFC", border: "#94a3b8", text: "#64748b", label: type };
  }
}

// ── Role label in Arabic ───────────────────────────────────────────────────
function roleAr(role: string) {
  const map: Record<string, string> = {
    teacher:       "أستاذ",
    psychologist:  "أخصائي نفسي",
    accountant:    "محاسب",
    admin:         "مدير",
    branch_manager:"مدير الفرع",
    designer:      "مصمم",
    photographer:  "مصوّر",
    marketer:      "مسوّق",
  };
  return map[role] ?? role;
}

// ── Today's date in Arabic ─────────────────────────────────────────────────
function todayAr() {
  return new Date().toLocaleDateString("ar-DZ", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
}

// ── Skeleton block ─────────────────────────────────────────────────────────
function Skeleton({ h = "h-4", w = "w-full" }: { h?: string; w?: string }) {
  return <div className={`animate-pulse bg-slate-100 rounded-lg ${h} ${w}`} />;
}

// ── Stat card ──────────────────────────────────────────────────────────────
function StatCard({
  icon: Icon, label, value, color, sub,
}: {
  icon: React.ElementType; label: string; value: string | number;
  color: string; sub?: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-5 flex items-start gap-4 shadow-sm border border-slate-100">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
           style={{ backgroundColor: `${color}18` }}>
        <Icon style={{ color, width: 20, height: 20 }} />
      </div>
      <div className="min-w-0">
        <div className="text-2xl font-black" style={{ color }}>{value}</div>
        <div className="text-xs font-semibold text-slate-500 mt-0.5">{label}</div>
        {sub && <div className="text-xs text-slate-400 mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
export default function EmployeeDashboard() {
  const { data: me } = useGetMe();
  const { isRTL } = useLanguage();

  const role = (me as any)?.role ?? "";
  const name = (me as any)?.name ?? (me as any)?.email ?? "";

  // ── Today's schedule ──────────────────────────────────────────────────────
  const { data: scheduleRaw, isLoading: schedLoading } = useQuery<any[]>({
    queryKey: ["schedule/my"],
    queryFn: () =>
      fetch("/api/schedule/my", { credentials: "include" })
        .then(r => r.ok ? r.json() : []),
    staleTime: 30_000,
  });

  const today = new Date().toISOString().slice(0, 10);
  const schedule = scheduleRaw ?? [];
  const todaySessions = schedule.filter(s => s.date === today);
  const thisMonthSessions = schedule.filter(s => {
    const ym = today.slice(0, 7);
    return (s.date ?? "").startsWith(ym);
  });

  // ── My groups + students ───────────────────────────────────────────────────
  const { data: groups, isLoading: groupsLoading } = useQuery<any[]>({
    queryKey: ["groups"],
    queryFn: () =>
      fetch("/api/groups", { credentials: "include" })
        .then(r => r.ok ? r.json() : []),
    staleTime: 60_000,
  });

  // Fetch detailed students list
  const { data: students, isLoading: studentsLoading } = useQuery<any[]>({
    queryKey: ["students"],
    queryFn: () =>
      fetch("/api/students", { credentials: "include" })
        .then(r => r.ok ? r.json() : []),
    staleTime: 60_000,
  });

  // For teachers: filter students whose teacherId == me.id
  // For psychologists: show all students they can see
  const myStudents = (students ?? []).filter(s => {
    if (role === "teacher") return s.teacherId === (me as any)?.id;
    return true; // psychologist sees all
  }).slice(0, 10); // cap at 10 for dashboard

  const totalStudents = myStudents.length;
  const totalGroups   = (groups ?? []).filter(g => {
    if (role === "teacher")      return g.teacherId === (me as any)?.id;
    if (role === "psychologist") return g.psychologistId === (me as any)?.id;
    return true;
  }).length;

  // ── Salary ────────────────────────────────────────────────────────────────
  const { data: salaries, isLoading: salaryLoading } = useQuery<any[]>({
    queryKey: ["salaries/my"],
    queryFn: () =>
      fetch("/api/salaries/my", { credentials: "include" })
        .then(r => r.ok ? r.json() : []),
    staleTime: 60_000,
  });

  const latestSalary = (salaries ?? []).sort(
    (a, b) => new Date(b.paidAt ?? b.createdAt).getTime() - new Date(a.paidAt ?? a.createdAt).getTime()
  )[0];

  // ── Attendance rate approx from schedule ──────────────────────────────────
  const completedSessions = thisMonthSessions.filter(s => s.status === "completed" || !s.status).length;
  const totalThisMonth = thisMonthSessions.length || 1;
  const attendanceRate = Math.round((completedSessions / totalThisMonth) * 100);

  return (
    <div className="space-y-6 pb-8" dir={isRTL ? "rtl" : "ltr"}>

      {/* ── GREETING HEADER ─────────────────────────────────────────────── */}
      <div className="rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
           style={{
             background: `linear-gradient(135deg, ${BRAND_BLUE} 0%, #2d4db5 100%)`,
           }}>
        <div>
          <p className="text-white/60 text-sm mb-1">{todayAr()}</p>
          <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight">
            مرحباً، {name} 👋
          </h1>
          <div className="mt-1.5 flex items-center gap-2">
            <span className="text-xs font-bold px-2.5 py-1 rounded-full text-white/90"
                  style={{ backgroundColor: "rgba(255,255,255,0.15)" }}>
              {roleAr(role)}
            </span>
          </div>
        </div>
        {/* Quick icon strip */}
        <div className="flex gap-3">
          {[
            { icon: BookOpen, label: `${thisMonthSessions.length} حصة`, sub: "هذا الشهر" },
            { icon: Users,    label: `${totalStudents} تلميذ`, sub: "إجمالي" },
          ].map((item, i) => {
            const Icon = item.icon;
            return (
              <div key={i} className="rounded-xl px-4 py-3 text-center"
                   style={{ backgroundColor: "rgba(255,255,255,0.12)" }}>
                <Icon className="w-4 h-4 text-white/70 mx-auto mb-1" />
                <div className="text-white font-black text-sm">{item.label}</div>
                <div className="text-white/50 text-[10px]">{item.sub}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── QUICK STATS ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          icon={CalendarDays} label="حصص هذا الشهر"
          value={schedLoading ? "…" : thisMonthSessions.length}
          color={BRAND_BLUE}
        />
        <StatCard
          icon={Users} label="إجمالي التلاميذ"
          value={studentsLoading ? "…" : totalStudents}
          color="#059669"
        />
        <StatCard
          icon={BookOpen} label="مجموعاتي"
          value={groupsLoading ? "…" : totalGroups}
          color="#7c3aed"
        />
        <StatCard
          icon={TrendingUp} label="متوسط الحضور"
          value={schedLoading ? "…" : `${attendanceRate}%`}
          color={BRAND_YELLOW}
          sub={`${completedSessions} من ${thisMonthSessions.length} حصة`}
        />
      </div>

      {/* ── TWO COLUMN LAYOUT ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* ── TODAY'S SESSIONS ──────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                   style={{ backgroundColor: `${BRAND_BLUE}15` }}>
                <CalendarDays className="w-4 h-4" style={{ color: BRAND_BLUE }} />
              </div>
              <h2 className="font-black text-slate-800">جدولتي اليوم</h2>
            </div>
            <Link href="/schedule">
              <span className="text-xs font-semibold flex items-center gap-1 cursor-pointer"
                    style={{ color: BRAND_BLUE }}>
                كل الجدول <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </Link>
          </div>

          <div className="px-4 pb-4 space-y-2 min-h-[160px]">
            {schedLoading ? (
              <div className="space-y-2 pt-2">
                {[1,2,3].map(i => <Skeleton key={i} h="h-16" />)}
              </div>
            ) : todaySessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Calendar className="w-10 h-10 text-slate-200 mb-3" />
                <p className="text-sm font-semibold text-slate-400">لا توجد حصص اليوم</p>
                <p className="text-xs text-slate-300 mt-1">استمتع بيومك! 🌟</p>
              </div>
            ) : (
              todaySessions.map((s, i) => {
                const st = sessionStyle(s.type);
                return (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-xl"
                       style={{ backgroundColor: st.bg, borderRight: `3px solid ${st.border}` }}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-slate-800 truncate">{s.title}</span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                              style={{ backgroundColor: st.border + "22", color: st.text }}>
                          {st.label}
                        </span>
                      </div>
                      {s.subtitle && (
                        <p className="text-xs text-slate-500 mt-0.5 truncate">{s.subtitle}</p>
                      )}
                      {s.startTime && (
                        <div className="flex items-center gap-1 mt-1 text-xs" style={{ color: st.text }}>
                          <Clock className="w-3 h-3" />
                          {s.startTime}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── MY STUDENTS ───────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                   style={{ backgroundColor: "#05966915" }}>
                <Users className="w-4 h-4 text-emerald-600" />
              </div>
              <h2 className="font-black text-slate-800">تلاميذي</h2>
            </div>
            <Link href="/students">
              <span className="text-xs font-semibold flex items-center gap-1 cursor-pointer"
                    style={{ color: BRAND_BLUE }}>
                الكل <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </Link>
          </div>

          <div className="px-4 pb-4 space-y-1.5 min-h-[160px]">
            {studentsLoading ? (
              <div className="space-y-2 pt-2">
                {[1,2,3,4].map(i => <Skeleton key={i} h="h-12" />)}
              </div>
            ) : myStudents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Users className="w-10 h-10 text-slate-200 mb-3" />
                <p className="text-sm font-semibold text-slate-400">لا يوجد تلاميذ</p>
              </div>
            ) : (
              myStudents.map(s => {
                const paid = s.paymentStatus;
                const statusConfig = paid === "paid"
                  ? { label: "مدفوع", bg: "#f0fdf4", text: "#059669", icon: CheckCircle2 }
                  : paid === "overdue"
                  ? { label: "متأخر", bg: "#fef2f2", text: "#dc2626", icon: XCircle }
                  : { label: "نشط", bg: "#eff6ff", text: "#1d4ed8", icon: Star };

                const StatusIcon = statusConfig.icon;

                return (
                  <Link key={s.id} href={`/students/${s.id}`}>
                    <div className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer">
                      {/* Avatar */}
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black text-white shrink-0"
                           style={{ backgroundColor: BRAND_BLUE }}>
                        {(s.name ?? "؟").charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-slate-800 truncate">{s.name}</div>
                        {s.currentGroupName && (
                          <div className="text-xs text-slate-400 truncate">{s.currentGroupName}</div>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full shrink-0"
                           style={{ backgroundColor: statusConfig.bg, color: statusConfig.text }}>
                        <StatusIcon className="w-3 h-3" />
                        {statusConfig.label}
                      </div>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ── SALARY SECTION ─────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                 style={{ backgroundColor: `${BRAND_YELLOW}20` }}>
              <Wallet className="w-4 h-4" style={{ color: BRAND_YELLOW }} />
            </div>
            <h2 className="font-black text-slate-800">مستحقاتي</h2>
          </div>
          <Link href="/my-profile">
            <span className="text-xs font-semibold flex items-center gap-1 cursor-pointer"
                  style={{ color: BRAND_BLUE }}>
              السجل الكامل <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </Link>
        </div>

        <div className="px-5 pb-5">
          {salaryLoading ? (
            <div className="space-y-2"><Skeleton h="h-20" /></div>
          ) : !latestSalary ? (
            <div className="py-6 text-center">
              <Wallet className="w-10 h-10 text-slate-200 mx-auto mb-3" />
              <p className="text-sm text-slate-400">لا توجد مدفوعات مسجلة</p>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center gap-5">
              {/* Latest salary */}
              <div className="flex-1 rounded-xl p-4 flex items-center gap-4"
                   style={{ background: `linear-gradient(135deg, ${BRAND_YELLOW}12, ${BRAND_YELLOW}06)`, border: `1px solid ${BRAND_YELLOW}30` }}>
                <div>
                  <p className="text-xs text-slate-500 mb-1">آخر راتب مستلم</p>
                  <p className="text-2xl font-black" style={{ color: BRAND_YELLOW }}>
                    {Number(latestSalary.amount).toLocaleString("fr-DZ")} <span className="text-sm font-semibold">دج</span>
                  </p>
                  <p className="text-xs text-slate-500 mt-1">{latestSalary.period ?? "—"}</p>
                </div>
                <div className="mr-auto shrink-0">
                  <span className="text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1"
                        style={{ backgroundColor: "#f0fdf4", color: "#059669" }}>
                    <CheckCircle2 className="w-3 h-3" /> مدفوع
                  </span>
                </div>
              </div>

              {/* Last 3 salaries mini list */}
              {(salaries ?? []).length > 1 && (
                <div className="flex-1 space-y-2">
                  <p className="text-xs font-semibold text-slate-400 mb-2">السجل الأخير</p>
                  {(salaries ?? []).slice(0, 3).map((sal: any, i: number) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="text-slate-600 font-medium">{sal.period ?? "—"}</span>
                      <span className="font-bold" style={{ color: BRAND_BLUE }}>
                        {Number(sal.amount).toLocaleString("fr-DZ")} دج
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── QUICK LINKS ────────────────────────────────────────────────────── */}
      <div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">وصول سريع</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            ...(role === "teacher" ? [
              { href: "/groups",          icon: BookOpen,     label: "مجموعاتي",      color: BRAND_BLUE },
              { href: "/evaluations",     icon: TrendingUp,   label: "التقييمات",     color: "#7c3aed" },
              { href: "/groups/earnings", icon: Wallet,       label: "أرباحي",        color: BRAND_YELLOW },
            ] : []),
            ...(role === "psychologist" ? [
              { href: "/psychologist/feed",         icon: Brain,      label: "حالات الأولوية", color: "#dc2626" },
              { href: "/behavioral",                icon: Zap,        label: "المتابعة السلوكية", color: "#7c3aed" },
              { href: "/psychologist/consultations",icon: Mic,        label: "الاستشارات",    color: BRAND_BLUE },
            ] : []),
            { href: "/schedule",    icon: CalendarDays, label: "جدولتي",        color: "#0891b2" },
            { href: "/inbox",       icon: Mic,          label: "الرسائل",       color: "#059669" },
          ].map((lnk, i) => {
            const Icon = lnk.icon;
            return (
              <Link key={i} href={lnk.href}>
                <div className="bg-white rounded-2xl p-4 flex flex-col items-center gap-2 shadow-sm border border-slate-100 hover:border-slate-200 hover:shadow-md transition-all cursor-pointer">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                       style={{ backgroundColor: `${lnk.color}15` }}>
                    <Icon style={{ color: lnk.color, width: 18, height: 18 }} />
                  </div>
                  <span className="text-xs font-semibold text-slate-700 text-center">{lnk.label}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

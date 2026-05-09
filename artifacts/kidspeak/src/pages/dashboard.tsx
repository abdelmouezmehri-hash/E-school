import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, GraduationCap, DollarSign, AlertCircle, LineChart as LineChartIcon, Palette, Building2, UserCheck, UserX, UserPlus, Bell, ClipboardList, CreditCard, CalendarDays } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/language-context";
import { useBranch } from "@/contexts/branch-context";

type AdminDashboardData = {
  totalStudents: number;
  activeStudents: number;
  stoppedStudents: number;
  graduatedStudents: number;
  pendingRegistrations: number;
  totalRevenue: number;
  pendingRevenue: number;
  totalLevels: number;
  totalTeachers: number;
  totalParents: number;
  averageProgressScore: number | null;
  recentEvaluationsCount: number;
  overduePaymentsCount: number;
  studentsByLevel: { levelId: number; levelName: string; count: number }[];
  revenueByMonth: { month: string; revenue: number }[];
};

export default function Dashboard() {
  const { data: dashboard, isLoading, error } = useQuery<AdminDashboardData>({
    queryKey: ["admin-dashboard"],
    queryFn: () =>
      fetch("/api/dashboard/admin", { credentials: "include" }).then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      }),
    refetchInterval: 60000,
  });
  const { t, isRTL } = useLanguage();
  const { branches, selectedBranchId, selectedBranch } = useBranch();

  const lbl = (en: string, ar: string) => isRTL ? ar : en;

  const { data: pendingData } = useQuery<{ count: number }>({
    queryKey: ["studio-pending"],
    queryFn: () =>
      fetch("/api/studio/projects/pending-approvals", { credentials: "include" })
        .then(r => r.ok ? r.json() : { count: 0 }),
    refetchInterval: 30000,
  });

  if (isLoading) {
    return <div className="p-8 flex items-center justify-center h-full text-muted-foreground">{t.dashboard.loadingDashboard}</div>;
  }

  if (error || !dashboard) {
    return <div className="p-8 flex items-center justify-center h-full text-destructive">{t.dashboard.failedToLoad}</div>;
  }

  const BRANCH_COLORS = ["#1B2E8F", "#7c3aed", "#0891b2", "#059669", "#d97706", "#dc2626"];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t.dashboard.title}</h1>
          {selectedBranch && (
            <div className="flex items-center gap-1.5 mt-1">
              <Building2 className="w-3.5 h-3.5" style={{ color: "#1B2E8F" }} />
              <span className="text-sm font-semibold" style={{ color: "#1B2E8F" }}>
                {isRTL && selectedBranch.nameAr ? selectedBranch.nameAr : selectedBranch.name}
              </span>
              <Badge variant="outline" className="text-xs text-muted-foreground border-muted">
                {lbl("filtered", "محدد")}
              </Badge>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Link href="/students">
            <Button variant="outline">{t.dashboard.viewStudents}</Button>
          </Link>
          <Link href="/payments">
            <Button>{t.dashboard.managePayments}</Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t.dashboard.totalRevenue}</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{t.currency.format(dashboard.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {t.currency.format(dashboard.pendingRevenue)} {t.dashboard.pending}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t.dashboard.totalStudents}</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard.totalStudents}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {t.dashboard.acrossLevels(dashboard.totalLevels)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t.dashboard.avgProgressScore}</CardTitle>
            <LineChartIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboard.averageProgressScore ? `${dashboard.averageProgressScore.toFixed(1)}%` : "N/A"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {t.dashboard.recentEvaluations(dashboard.recentEvaluationsCount)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-destructive">{t.dashboard.overduePayments}</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{dashboard.overduePaymentsCount}</div>
            <p className="text-xs text-muted-foreground mt-1">{t.dashboard.requiresAttention}</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Student Status Row ── */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-700">{lbl("Active Students", "التلاميذ النشطون")}</CardTitle>
            <UserCheck className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">{dashboard.activeStudents ?? 0}</div>
            <p className="text-xs text-muted-foreground mt-1">{lbl("Currently enrolled", "مسجلون حالياً")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-amber-700">{lbl("Stopped", "موقوفون")}</CardTitle>
            <UserX className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-700">{dashboard.stoppedStudents ?? 0}</div>
            <p className="text-xs text-muted-foreground mt-1">{lbl("Enrollment paused", "موقوف تسجيلهم")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium" style={{ color: "#1B2E8F" }}>{lbl("Graduated", "المتخرجون")}</CardTitle>
            <GraduationCap className="h-4 w-4" style={{ color: "#1B2E8F" }} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" style={{ color: "#1B2E8F" }}>{dashboard.graduatedStudents ?? 0}</div>
            <p className="text-xs text-muted-foreground mt-1">{lbl("Completed program", "أتموا البرنامج")}</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Smart Alerts ── */}
      {((dashboard.overduePaymentsCount > 0) || (dashboard.pendingRegistrations > 0)) && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-amber-800">
              <Bell className="w-4 h-4" />
              {lbl("Smart Alerts", "تنبيهات ذكية")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {dashboard.overduePaymentsCount > 0 && (
                <Link href="/payments">
                  <div className="flex items-center gap-3 p-2 rounded-lg bg-red-50 border border-red-100 hover:bg-red-100 transition-colors cursor-pointer">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                    <div className="flex-1 text-sm text-red-800">
                      {isRTL
                        ? `${dashboard.overduePaymentsCount} دفعة متأخرة تحتاج متابعة عاجلة`
                        : `${dashboard.overduePaymentsCount} overdue payment(s) require immediate attention`}
                    </div>
                    <Badge className="bg-red-100 text-red-700 border-red-200 text-xs shrink-0">
                      {lbl("View", "عرض")}
                    </Badge>
                  </div>
                </Link>
              )}
              {dashboard.pendingRegistrations > 0 && (
                <Link href="/registration-requests">
                  <div className="flex items-center gap-3 p-2 rounded-lg bg-amber-50 border border-amber-100 hover:bg-amber-100 transition-colors cursor-pointer">
                    <UserPlus className="w-4 h-4 text-amber-700 shrink-0" />
                    <div className="flex-1 text-sm text-amber-800">
                      {isRTL
                        ? `${dashboard.pendingRegistrations} طلب تسجيل جديد ينتظر الموافقة`
                        : `${dashboard.pendingRegistrations} new registration request(s) awaiting approval`}
                    </div>
                    <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs shrink-0">
                      {lbl("Review", "مراجعة")}
                    </Badge>
                  </div>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Quick Actions ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">{lbl("Quick Actions", "الإجراءات السريعة")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Link href="/students">
              <button className="w-full flex flex-col items-center gap-2 p-3 rounded-xl border hover:border-[#1B2E8F]/40 hover:bg-[#1B2E8F]/5 transition-all group">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#1B2E8F]/10 group-hover:bg-[#1B2E8F]/20">
                  <Users className="w-4 h-4" style={{ color: "#1B2E8F" }} />
                </div>
                <span className="text-xs font-medium text-center">{lbl("Students", "التلاميذ")}</span>
              </button>
            </Link>
            <Link href="/payments">
              <button className="w-full flex flex-col items-center gap-2 p-3 rounded-xl border hover:border-green-400 hover:bg-green-50 transition-all group">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-green-100 group-hover:bg-green-200">
                  <CreditCard className="w-4 h-4 text-green-700" />
                </div>
                <span className="text-xs font-medium text-center">{lbl("Payments", "الدفعات")}</span>
              </button>
            </Link>
            <Link href="/schedule">
              <button className="w-full flex flex-col items-center gap-2 p-3 rounded-xl border hover:border-purple-400 hover:bg-purple-50 transition-all group">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-purple-100 group-hover:bg-purple-200">
                  <CalendarDays className="w-4 h-4 text-purple-700" />
                </div>
                <span className="text-xs font-medium text-center">{lbl("Schedule", "الجدول")}</span>
              </button>
            </Link>
            <Link href="/registration-requests">
              <button className="w-full flex flex-col items-center gap-2 p-3 rounded-xl border hover:border-amber-400 hover:bg-amber-50 transition-all group">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-amber-100 group-hover:bg-amber-200">
                  <ClipboardList className="w-4 h-4 text-amber-700" />
                </div>
                <span className="text-xs font-medium text-center">{lbl("Registrations", "طلبات التسجيل")}</span>
              </button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Branch Statistics — shown when branches exist */}
      {branches.length > 0 && (
        <Card className="border-2" style={{ borderColor: "#1B2E8F20" }}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold" style={{ color: "#1B2E8F" }}>
              <Building2 className="w-4 h-4" />
              {lbl("Branch Overview", "نظرة عامة على الفروع")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
              {branches.map((branch, idx) => {
                const color = BRANCH_COLORS[idx % BRANCH_COLORS.length];
                const isSelected = selectedBranchId === branch.id;
                return (
                  <div
                    key={branch.id}
                    className={`relative rounded-xl p-3 border-2 transition-all ${isSelected ? "ring-2 ring-offset-1" : ""}`}
                    style={{ borderColor: `${color}30`, backgroundColor: `${color}08`, ...(isSelected ? { ringColor: color } : {}) }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-black" style={{ backgroundColor: color }}>
                        {(isRTL && branch.nameAr ? branch.nameAr : branch.name).charAt(0).toUpperCase()}
                      </div>
                      <span className="text-xs font-semibold truncate" style={{ color }}>
                        {isRTL && branch.nameAr ? branch.nameAr : branch.name}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-black" style={{ color }}>
                        {(branch as any).pupilCount ?? 0}
                      </span>
                      <span className="text-xs text-muted-foreground">{lbl("pupils", "تلميذ")}</span>
                    </div>
                    {branch.managerName && (
                      <p className="text-xs text-muted-foreground mt-1 truncate">{branch.managerName}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Studio Pending Approvals */}
      {(pendingData?.count ?? 0) > 0 && (
        <Link href="/studio">
          <Card className="border-violet-200 bg-violet-50 hover:bg-violet-100 transition-colors cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-violet-800">{t.studio.pendingApprovals}</CardTitle>
              <Palette className="h-4 w-4 text-violet-600" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="text-2xl font-bold text-violet-800">{pendingData?.count}</div>
                <Badge className="bg-violet-600 text-white text-xs">
                  {t.studio.statuses.review}
                </Badge>
              </div>
              <p className="text-xs text-violet-600 mt-1">
                {t.studio.approve} →
              </p>
            </CardContent>
          </Card>
        </Link>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        {/* Revenue Chart */}
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>{t.dashboard.revenueOverview}</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            {dashboard.revenueByMonth.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dashboard.revenueByMonth} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false}
                    tickFormatter={t.currency.tickFormat}
                    width={80}
                  />
                  <Tooltip 
                    cursor={{ fill: 'hsl(var(--muted))' }}
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                    formatter={(value: number) => [t.currency.format(value), t.dashboard.totalRevenue]}
                  />
                  <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={50} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">{t.dashboard.noRevenueData}</div>
            )}
          </CardContent>
        </Card>

        {/* Students by Level */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>{t.dashboard.studentsByLevel}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {dashboard.studentsByLevel.length > 0 ? (
                dashboard.studentsByLevel.map((level) => (
                  <div key={level.levelId} className="flex items-center">
                    <div className="flex items-center gap-2 flex-1">
                      <GraduationCap className="h-4 w-4 text-muted-foreground" />
                      <div className="text-sm font-medium">{level.levelName}</div>
                    </div>
                    <div className="text-sm text-muted-foreground">{level.count} {t.dashboard.students}</div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-muted-foreground py-4 text-center">{t.dashboard.noStudentsEnrolled}</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

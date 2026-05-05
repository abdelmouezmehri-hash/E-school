import { useGetAdminDashboard } from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, GraduationCap, DollarSign, AlertCircle, LineChart as LineChartIcon, Palette, Building2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/language-context";
import { useBranch } from "@/contexts/branch-context";

export default function Dashboard() {
  const { data: dashboard, isLoading, error } = useGetAdminDashboard();
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

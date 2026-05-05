import { useGetPerformanceDashboard } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Trophy, Star, AlertTriangle, UserMinus, Activity, GraduationCap } from "lucide-react";
import { Link } from "wouter";
import { useLanguage } from "@/contexts/language-context";

export default function PerformanceDashboard() {
  const { data: performance, isLoading } = useGetPerformanceDashboard();
  const { t } = useLanguage();

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">{t.performance.loadingMetrics}</div>;
  }

  if (!performance) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">{t.performance.title}</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="pb-2">
            <CardDescription className="text-primary font-medium">{t.performance.overallAvgScore}</CardDescription>
            <CardTitle className="text-4xl text-primary">
              {performance.overallAverageScore ? `${performance.overallAverageScore.toFixed(1)}%` : "N/A"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mt-2">{t.performance.acrossAllStudents}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium">{t.performance.avgSpeaking}</CardTitle>
            <Activity className="h-4 w-4" style={{ color: '#1B2E8F' }} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" style={{ color: '#1B2E8F' }}>
              {performance.scoreBreakdown.averageSpeaking ? `${performance.scoreBreakdown.averageSpeaking.toFixed(1)}/10` : "N/A"}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium">{t.performance.avgConfidence}</CardTitle>
            <Activity className="h-4 w-4" style={{ color: '#F5A600' }} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" style={{ color: '#F5A600' }}>
              {performance.scoreBreakdown.averageConfidence ? `${performance.scoreBreakdown.averageConfidence.toFixed(1)}/10` : "N/A"}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium">{t.performance.avgParticipation}</CardTitle>
            <Activity className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-500">
              {performance.scoreBreakdown.averageParticipation ? `${performance.scoreBreakdown.averageParticipation.toFixed(1)}/10` : "N/A"}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Top Performers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" style={{ color: '#F5A600' }} />
              {t.performance.topPerformers}
            </CardTitle>
            <CardDescription>{t.performance.topPerformersDesc}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {performance.topPerformers.length > 0 ? (
                performance.topPerformers.map((student, index) => (
                  <Link key={student.studentId} href={`/students/${student.studentId}`}>
                    <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer border border-transparent hover:border-border">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm
                          ${index === 0 ? 'bg-amber-100 text-amber-700' : 
                            index === 1 ? 'bg-slate-200 text-slate-700' : 
                            index === 2 ? 'bg-amber-900/10 text-amber-900' : 
                            'bg-muted text-muted-foreground'}`}
                        >
                          #{index + 1}
                        </div>
                        <div>
                          <div className="font-semibold">{student.studentName}</div>
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            <GraduationCap className="h-3 w-3" />
                            {student.levelName || t.performance.noLevel}
                          </div>
                        </div>
                      </div>
                      <div className="font-bold text-primary bg-primary/10 px-3 py-1 rounded">
                        {Math.round(student.progressScore)}%
                      </div>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="text-center py-6 text-muted-foreground">{t.performance.noPerformanceData}</div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Behavioral Analysis */}
        <Card>
          <CardHeader>
            <CardTitle>{t.performance.behavioralAnalysis}</CardTitle>
            <CardDescription>{t.performance.behavioralDesc}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg" style={{ backgroundColor: 'rgba(245,166,0,0.05)' }}>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full" style={{ backgroundColor: 'rgba(245,166,0,0.15)' }}>
                    <Star className="h-5 w-5 fill-current" style={{ color: '#F5A600' }} />
                  </div>
                  <div>
                    <div className="font-semibold">{t.performance.highPotential}</div>
                    <div className="text-sm text-muted-foreground">{t.performance.highPotentialDesc}</div>
                  </div>
                </div>
                <div className="text-2xl font-bold" style={{ color: '#F5A600' }}>{performance.behavioralFlagCounts.high_potential}</div>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg bg-orange-50/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 rounded-full">
                    <UserMinus className="h-5 w-5 text-orange-500" />
                  </div>
                  <div>
                    <div className="font-semibold text-orange-900">{t.performance.shyness}</div>
                    <div className="text-sm text-orange-700/80">{t.performance.shynessDesc}</div>
                  </div>
                </div>
                <div className="text-2xl font-bold text-orange-600">{performance.behavioralFlagCounts.shyness}</div>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg bg-red-50/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 rounded-full">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <div className="font-semibold text-red-900">{t.performance.fear}</div>
                    <div className="text-sm text-red-700/80">{t.performance.fearDesc}</div>
                  </div>
                </div>
                <div className="text-2xl font-bold text-red-700">{performance.behavioralFlagCounts.fear}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

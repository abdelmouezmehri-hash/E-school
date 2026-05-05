import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useLanguage } from "@/contexts/language-context";
import { useGetMe } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AlertTriangle, Brain, ChevronRight, ShieldAlert } from "lucide-react";
import { format } from "date-fns";

function safeFmt(dateStr: string | null | undefined, fmt: string): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return String(dateStr);
  return format(d, fmt);
}

type FeedStudent = {
  id: number;
  name: string;
  profilePicture: string | null;
  behavioralFlags: string[];
  levelId: number | null;
  levelName: string | null;
  redFlagCount: number;
  latestObservation: {
    studentId: number;
    content: string;
    observationType: string;
    createdAt: string;
  } | null;
};

const TYPE_COLORS: Record<string, string> = {
  fear: "bg-red-100 text-red-700 border-red-200",
  shyness: "bg-orange-100 text-orange-700 border-orange-200",
  participation: "bg-emerald-100 text-emerald-700 border-emerald-200",
  general: "bg-blue-100 text-blue-700 border-blue-200",
};

function urgencyColor(count: number) {
  if (count >= 5) return "bg-red-500";
  if (count >= 3) return "bg-orange-400";
  return "bg-amber-400";
}

export default function PsychologistFeed() {
  const { t } = useLanguage();
  const { data: user } = useGetMe();
  const [students, setStudents] = useState<FeedStudent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/students/behavioral-feed", { credentials: "include" })
      .then(r => r.ok ? r.json() : [])
      .then(data => setStudents(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2" style={{ color: "#1B2E8F" }}>
            <ShieldAlert className="w-6 h-6" />
            {t.behavioralFeed.title}
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            {t.behavioralFeed.subtitle}
          </p>
        </div>
        {students.length > 0 && (
          <div className="shrink-0 rounded-xl border-2 border-red-200 bg-red-50 px-4 py-3 text-center">
            <div className="text-2xl font-black text-red-600">{students.length}</div>
            <div className="text-xs text-red-500 font-medium mt-0.5">{t.behavioralFeed.redAlerts}</div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse h-36" />
          ))}
        </div>
      ) : students.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <Brain className="w-12 h-12 text-muted-foreground/40" />
            <p className="text-muted-foreground font-medium">{t.behavioralFeed.noAlerts}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {students.map((s, idx) => (
            <Card
              key={s.id}
              className="overflow-hidden border hover:shadow-md transition-shadow"
              style={{ borderLeftWidth: "4px", borderLeftColor: s.redFlagCount >= 5 ? "#ef4444" : s.redFlagCount >= 3 ? "#f97316" : "#f59e0b" }}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  {/* Rank badge */}
                  <div
                    className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white font-black text-sm"
                    style={{ backgroundColor: "#1B2E8F" }}
                  >
                    {idx + 1}
                  </div>

                  {/* Avatar */}
                  <Avatar className="h-11 w-11 shrink-0">
                    {s.profilePicture ? (
                      <img src={s.profilePicture} alt={s.name} className="rounded-full object-cover" />
                    ) : (
                      <AvatarFallback className="text-sm font-semibold" style={{ backgroundColor: "#1B2E8F", color: "white" }}>
                        {s.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    )}
                  </Avatar>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm truncate">{s.name}</span>
                      {s.levelName && (
                        <Badge variant="outline" className="text-[10px] shrink-0">{s.levelName}</Badge>
                      )}
                      {s.behavioralFlags.includes("confident") && (
                        <Badge className="text-[10px] bg-emerald-100 text-emerald-700 border-emerald-200 shrink-0">
                          ✨ Confident
                        </Badge>
                      )}
                    </div>

                    {s.latestObservation && (
                      <div className="mt-1 flex items-start gap-1.5">
                        <Badge
                          variant="outline"
                          className={`text-[10px] shrink-0 mt-0.5 ${TYPE_COLORS[s.latestObservation.observationType] ?? ""}`}
                        >
                          {t.behavioral.types[s.latestObservation.observationType as keyof typeof t.behavioral.types] ?? s.latestObservation.observationType}
                        </Badge>
                        <p className="text-xs text-muted-foreground line-clamp-1">{s.latestObservation.content}</p>
                      </div>
                    )}

                    {s.latestObservation && (
                      <div className="mt-0.5 text-[10px] text-muted-foreground">
                        {t.behavioralFeed.latestFlag}: {safeFmt(s.latestObservation.createdAt, "MMM d, yyyy")}
                      </div>
                    )}
                  </div>

                  {/* Alert count + action */}
                  <div className="shrink-0 flex flex-col items-end gap-2">
                    <div className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-white text-xs font-bold ${urgencyColor(s.redFlagCount)}`}>
                      <AlertTriangle className="w-3 h-3" />
                      {s.redFlagCount} {t.behavioralFeed.flagUnit}
                    </div>
                    <Link href={`/students/${s.id}`}>
                      <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 hover:bg-blue-50" style={{ color: "#1B2E8F" }}>
                        {t.behavioralFeed.viewProfile}
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

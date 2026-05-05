import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { useLanguage } from "@/contexts/language-context";
import { useQuery } from "@tanstack/react-query";

interface CommMetrics {
  averages: {
    verbalFluency: number | null;
    verbalClarity: number | null;
    verbalVocabulary: number | null;
    nonverbalEyeContact: number | null;
    nonverbalBodyLanguage: number | null;
    nonverbalFacialExpressions: number | null;
  };
  sessionCount: number;
}

interface Props {
  studentId: number;
  compact?: boolean;
}

export function CommunicationRadar({ studentId, compact = false }: Props) {
  const { t } = useLanguage();

  const { data, isLoading } = useQuery<CommMetrics>({
    queryKey: ["comm-metrics", studentId],
    queryFn: () =>
      fetch(`/api/students/${studentId}/communication-metrics`, { credentials: "include" }).then(
        (r) => (r.ok ? r.json() : Promise.reject())
      ),
    enabled: !!studentId,
  });

  if (isLoading) {
    return (
      <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
        …
      </div>
    );
  }

  const avgs = data?.averages;
  const hasData =
    avgs &&
    Object.values(avgs).some((v) => v !== null && v !== undefined);

  if (!hasData) {
    return (
      <div
        className={`flex flex-col items-center justify-center text-center text-muted-foreground ${compact ? "py-6" : "py-10"}`}
      >
        <span className="text-3xl mb-2">📊</span>
        <p className="text-sm max-w-xs">{t.behavioral.noMetricsYet ?? "No communication data yet."}</p>
      </div>
    );
  }

  const tG = t.groups;

  const radarData = [
    { subject: tG.verbalFluency, value: avgs!.verbalFluency ?? 0 },
    { subject: tG.verbalClarity, value: avgs!.verbalClarity ?? 0 },
    { subject: tG.verbalVocabulary, value: avgs!.verbalVocabulary ?? 0 },
    { subject: tG.nonverbalEyeContact, value: avgs!.nonverbalEyeContact ?? 0 },
    { subject: tG.nonverbalBodyLanguage, value: avgs!.nonverbalBodyLanguage ?? 0 },
    { subject: tG.nonverbalFacialExpressions, value: avgs!.nonverbalFacialExpressions ?? 0 },
  ];

  const verbalAvg =
    ((avgs!.verbalFluency ?? 0) +
      (avgs!.verbalClarity ?? 0) +
      (avgs!.verbalVocabulary ?? 0)) /
    3;
  const nonVerbalAvg =
    ((avgs!.nonverbalEyeContact ?? 0) +
      (avgs!.nonverbalBodyLanguage ?? 0) +
      (avgs!.nonverbalFacialExpressions ?? 0)) /
    3;

  return (
    <div className="space-y-3">
      {data?.sessionCount != null && data.sessionCount > 0 && (
        <p className="text-xs text-muted-foreground text-center">
          {(t.character.sessionCount ?? "Based on {n} sessions").replace("{n}", String(data.sessionCount))}
        </p>
      )}

      <ResponsiveContainer width="100%" height={compact ? 200 : 260}>
        <RadarChart data={radarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
          <PolarGrid stroke="#e2e8f0" />
          <PolarAngleAxis
            dataKey="subject"
            tick={{ fontSize: compact ? 9 : 11, fill: "#64748b" }}
          />
          <Radar
            name="Score"
            dataKey="value"
            stroke="#7c3aed"
            fill="#7c3aed"
            fillOpacity={0.25}
            strokeWidth={2}
          />
          <Tooltip
            formatter={(v: number) => [`${v.toFixed(1)} / 10`]}
            labelStyle={{ fontWeight: 600 }}
          />
        </RadarChart>
      </ResponsiveContainer>

      {/* Verbal vs Non-verbal scores */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border p-3 text-center space-y-1">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
            {tG.verbal}
          </p>
          <p className="text-2xl font-bold" style={{ color: "#1B2E8F" }}>
            {verbalAvg.toFixed(1)}
          </p>
          <p className="text-xs text-muted-foreground">/ 10</p>
        </div>
        <div className="rounded-lg border p-3 text-center space-y-1">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
            {tG.nonVerbal}
          </p>
          <p className="text-2xl font-bold" style={{ color: "#7c3aed" }}>
            {nonVerbalAvg.toFixed(1)}
          </p>
          <p className="text-xs text-muted-foreground">/ 10</p>
        </div>
      </div>
    </div>
  );
}

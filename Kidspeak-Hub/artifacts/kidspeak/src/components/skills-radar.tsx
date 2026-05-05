import { useStudentJourney } from "@workspace/api-client-react";
import { useLanguage } from "@/contexts/language-context";
import { Mic, Shield, Users, Lightbulb } from "lucide-react";

interface Props {
  studentId: number;
}

const SKILLS = [
  { key: "speaking" as const, icon: Mic, colorFrom: "#6366f1", colorTo: "#8b5cf6" },
  { key: "confidence" as const, icon: Shield, colorFrom: "#10b981", colorTo: "#34d399" },
  { key: "participation" as const, icon: Users, colorFrom: "#f59e0b", colorTo: "#fbbf24" },
  { key: "initiative" as const, icon: Lightbulb, colorFrom: "#ef4444", colorTo: "#f97316" },
];

function RadarBar({ label, value, icon: Icon, colorFrom, colorTo }: {
  label: string;
  value: number | null;
  icon: any;
  colorFrom: string;
  colorTo: string;
}) {
  const displayValue = value ?? 0;
  const pct = Math.round((displayValue / 10) * 100);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: `linear-gradient(135deg, ${colorFrom}, ${colorTo})` }}
          >
            <Icon className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-sm font-medium">{label}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-lg font-black" style={{ color: colorFrom }}>{value ?? "–"}</span>
          {value != null && <span className="text-xs text-muted-foreground">/10</span>}
        </div>
      </div>
      <div className="relative h-2.5 bg-muted rounded-full overflow-hidden">
        <div
          className="absolute inset-y-0 start-0 rounded-full transition-all duration-700"
          style={{
            width: `${pct}%`,
            background: `linear-gradient(90deg, ${colorFrom}, ${colorTo})`,
          }}
        />
      </div>
      {/* 10-dot indicator */}
      <div className="flex gap-1">
        {Array.from({ length: 10 }, (_, i) => (
          <div
            key={i}
            className="flex-1 h-1 rounded-full transition-all duration-500"
            style={{
              backgroundColor: i < displayValue ? colorFrom : "#e5e7eb",
              opacity: i < displayValue ? 1 : 0.4,
            }}
          />
        ))}
      </div>
    </div>
  );
}

export function SkillsRadar({ studentId }: Props) {
  const { t } = useLanguage();
  const { data: journey, isLoading } = useStudentJourney(studentId);
  const jt = t.journey;

  if (isLoading) {
    return (
      <div className="rounded-2xl border p-6 space-y-4 animate-pulse">
        <div className="h-5 bg-muted rounded w-40" />
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="space-y-1">
            <div className="h-4 bg-muted rounded w-32" />
            <div className="h-2.5 bg-muted rounded w-full" />
          </div>
        ))}
      </div>
    );
  }

  const skills = journey?.skillAverages;
  const hasData = skills && Object.values(skills).some((v) => v != null);

  return (
    <div className="rounded-2xl border bg-gradient-to-br from-white to-purple-50/20 p-6 space-y-5">
      <div>
        <h3 className="font-bold text-lg" style={{ color: "#1B2E8F" }}>{jt.skillsTitle}</h3>
        <p className="text-sm text-muted-foreground">{jt.skillsSubtitle}</p>
      </div>

      {!hasData ? (
        <div className="text-center py-8 text-muted-foreground text-sm">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
            <Mic className="w-6 h-6 opacity-30" />
          </div>
          <p>{jt.noSkillData}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {SKILLS.map(({ key, icon, colorFrom, colorTo }) => (
            <RadarBar
              key={key}
              label={jt.skills[key]}
              value={skills?.[key] ?? null}
              icon={icon}
              colorFrom={colorFrom}
              colorTo={colorTo}
            />
          ))}
        </div>
      )}

      {hasData && (
        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground">{jt.skillsNote}</p>
        </div>
      )}
    </div>
  );
}

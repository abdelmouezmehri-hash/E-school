import { useStudentJourney } from "@workspace/api-client-react";
import { useLanguage } from "@/contexts/language-context";
import { Star, Lock, Trophy, Flame, CheckCircle2, MapPin, Mic, Smile, Users, Zap, BrainCircuit } from "lucide-react";

interface SupportSession {
  id: number;
  sessionDate: string;
  sessionKind?: string;
  title?: string | null;
  notes?: string | null;
}

interface Props {
  studentId: number;
  supportSessions?: SupportSession[];
}

const LEVEL_NAMES = ["Starter", "Beginner", "Elementary", "Pre-Intermediate", "Intermediate", "Advanced"];
const LEVEL_COLORS = [
  { from: "#6366f1", to: "#8b5cf6", glow: "#6366f150" },
  { from: "#0ea5e9", to: "#1B2E8F", glow: "#0ea5e950" },
  { from: "#F5A600", to: "#f97316", glow: "#F5A60050" },
  { from: "#16a34a", to: "#059669", glow: "#16a34a50" },
  { from: "#e11d48", to: "#be123c", glow: "#e11d4850" },
  { from: "#7c3aed", to: "#5b21b6", glow: "#7c3aed50" },
];
const WEEKS_PER_LEVEL = 8;

export function LearningJourney({ studentId, supportSessions }: Props) {
  const { t, isRTL } = useLanguage();
  const { data: journey, isLoading } = useStudentJourney(studentId);
  const jt = t.journey;

  if (isLoading) {
    return (
      <div className="rounded-2xl border p-6 space-y-4 animate-pulse">
        <div className="h-5 bg-muted rounded w-48" />
        <div className="grid grid-cols-8 gap-1.5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-16 bg-muted rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!journey) return null;

  const {
    completedInLevel,
    percentComplete,
    currentWeek,
    currentSessionInWeek,
    levelName,
    levelId,
    SESSIONS_PER_LEVEL,
    skillAverages,
  } = journey;

  const TOTAL_LEVELS = LEVEL_COLORS.length;
  const currentLevelIdx = Math.max(0, Math.min((levelId ?? 1) - 1, TOTAL_LEVELS - 1));
  const levelColor = LEVEL_COLORS[currentLevelIdx];
  const sessionsPerWeek = Math.round(SESSIONS_PER_LEVEL / WEEKS_PER_LEVEL);
  const completedWeeks = Math.floor(completedInLevel / sessionsPerWeek);

  const hasSkillData = Object.values(skillAverages).some((v) => v !== null);

  const skills = [
    { key: "speaking", label: jt.skills?.speaking ?? "Speaking", icon: Mic, value: skillAverages.speaking },
    { key: "confidence", label: jt.skills?.confidence ?? "Confidence", icon: Smile, value: skillAverages.confidence },
    { key: "participation", label: jt.skills?.participation ?? "Participation", icon: Users, value: skillAverages.participation },
    { key: "initiative", label: jt.skills?.initiative ?? "Initiative", icon: Zap, value: skillAverages.initiative },
  ];

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: "linear-gradient(160deg, #08112b 0%, #1B2E8F 55%, #0f1e5c 100%)" }}
    >
      {/* ── Header ── */}
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: "rgba(245,166,0,0.2)" }}
              >
                <Trophy className="w-4 h-4 text-yellow-400" />
              </div>
              <h3 className="font-bold text-lg text-white">{jt.title}</h3>
            </div>
            <p className="text-xs text-blue-200/80 mt-0.5 ms-10">{jt.subtitle}</p>
          </div>
          <div className="text-end">
            <div className="text-3xl font-black" style={{ color: "#F5A600" }}>{percentComplete}%</div>
            <div className="text-xs text-blue-200/80">{levelName || jt.notStarted}</div>
          </div>
        </div>

        {/* Overall progress bar */}
        <div className="mt-4 space-y-1.5">
          <div className="w-full h-3 rounded-full" style={{ background: "rgba(255,255,255,0.08)" }}>
            <div
              className="h-full rounded-full transition-all duration-700 relative overflow-hidden"
              style={{
                width: `${(journey.completedTotal / (TOTAL_LEVELS * SESSIONS_PER_LEVEL)) * 100}%`,
                background: `linear-gradient(90deg, ${levelColor.from}, ${levelColor.to})`,
              }}
            >
              <div
                className="absolute inset-0 opacity-40"
                style={{
                  background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)",
                  animation: "shimmer 2s infinite",
                }}
              />
            </div>
          </div>
          <div className="flex justify-between text-xs text-blue-300/80">
            <span>{journey.completedTotal} / {TOTAL_LEVELS * SESSIONS_PER_LEVEL} {jt.sessions}</span>
            <span>{jt.level} {levelId} / {TOTAL_LEVELS}</span>
          </div>
        </div>
      </div>

      {/* ── Level tabs ── */}
      <div className="px-5 pb-4 flex gap-2 overflow-x-auto scrollbar-none">
        {Array.from({ length: TOTAL_LEVELS }, (_, i) => {
          const lvl = i + 1;
          const isCurrent = lvl === (levelId ?? 1);
          const isPast = lvl < (levelId ?? 1);
          const lc = LEVEL_COLORS[i];
          return (
            <div
              key={lvl}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all"
              style={{
                background: isCurrent
                  ? `linear-gradient(135deg, ${lc.from}, ${lc.to})`
                  : isPast
                  ? "rgba(255,255,255,0.12)"
                  : "rgba(255,255,255,0.05)",
                color: isCurrent ? "#fff" : isPast ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.35)",
                border: isCurrent ? "none" : "1px solid rgba(255,255,255,0.1)",
                boxShadow: isCurrent ? `0 2px 10px ${lc.glow}` : "none",
              }}
            >
              {isPast && <CheckCircle2 className="w-3 h-3" />}
              {isCurrent && <Flame className="w-3 h-3 text-yellow-200" />}
              {!isPast && !isCurrent && <Lock className="w-3 h-3" />}
              {LEVEL_NAMES[i] || `${jt.level} ${lvl}`}
            </div>
          );
        })}
      </div>

      {/* ── Game Map ── */}
      <div className="px-5 pb-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-blue-300/70 mb-4">{jt.weeklyPath}</p>
        <div className="relative">
          {/* Background track */}
          <svg
            className="absolute"
            style={{
              top: "28px",
              left: isRTL ? "auto" : "calc(3.5rem / 2)",
              right: isRTL ? "calc(3.5rem / 2)" : "auto",
              width: "calc(100% - 3.5rem)",
              height: "4px",
              overflow: "visible",
            }}
          >
            <defs>
              <linearGradient id="trackGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={levelColor.from} />
                <stop offset="100%" stopColor={levelColor.to} />
              </linearGradient>
              <filter id="glowFilter">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>
            <rect x="0" y="0" width="100%" height="4" rx="2" fill="rgba(255,255,255,0.08)" />
            {completedWeeks > 0 && (
              <rect
                x={isRTL ? `${100 - (completedWeeks / WEEKS_PER_LEVEL) * 100}%` : "0"}
                y="0"
                width={`${(completedWeeks / WEEKS_PER_LEVEL) * 100}%`}
                height="4"
                rx="2"
                fill="url(#trackGradient)"
                filter="url(#glowFilter)"
              />
            )}
          </svg>

          {/* Week nodes */}
          <div className="relative grid grid-cols-8 gap-0" style={{ zIndex: 2 }}>
            {Array.from({ length: WEEKS_PER_LEVEL }, (_, i) => {
              const week = i + 1;
              const isCompleted = week <= completedWeeks;
              const isCurrent = week === Math.min(currentWeek, WEEKS_PER_LEVEL);
              const isLocked = !isCompleted && !isCurrent;

              return (
                <div key={week} className="flex flex-col items-center gap-1.5">
                  <div className="relative flex items-center justify-center">
                    {isCurrent && (
                      <>
                        <div
                          className="absolute rounded-full animate-ping opacity-20"
                          style={{ width: "60px", height: "60px", background: "#F5A600" }}
                        />
                        <div
                          className="absolute rounded-full opacity-40"
                          style={{ width: "52px", height: "52px", border: "2px solid #F5A600" }}
                        />
                      </>
                    )}
                    <div
                      className="w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300"
                      style={{
                        background: isCompleted
                          ? `linear-gradient(135deg, ${levelColor.from}, ${levelColor.to})`
                          : isCurrent
                          ? "#F5A600"
                          : "rgba(255,255,255,0.06)",
                        border: isCompleted
                          ? "none"
                          : isCurrent
                          ? "2px solid rgba(255,255,255,0.6)"
                          : "1.5px solid rgba(255,255,255,0.12)",
                        boxShadow: isCurrent
                          ? "0 0 24px rgba(245,166,0,0.6), 0 0 8px rgba(245,166,0,0.4)"
                          : isCompleted
                          ? `0 0 14px ${levelColor.glow}`
                          : "none",
                      }}
                    >
                      {isCompleted && <Star className="w-5 h-5 text-white fill-white" />}
                      {isCurrent && <Flame className="w-5 h-5 text-white fill-white" />}
                      {isLocked && <Lock className="w-4 h-4" style={{ color: "rgba(255,255,255,0.2)" }} />}
                    </div>
                  </div>

                  {isCurrent && (
                    <div
                      className="flex items-center gap-0.5 px-2 py-0.5 rounded-full text-white font-bold"
                      style={{ background: "#F5A600", fontSize: "9px", letterSpacing: "0.03em" }}
                    >
                      <MapPin className="w-2.5 h-2.5" />
                      {jt.weekShort}{week}
                    </div>
                  )}

                  {!isCurrent && (
                    <span
                      className="text-xs font-semibold"
                      style={{ color: isCompleted ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.25)" }}
                    >
                      {jt.weekShort}{week}
                    </span>
                  )}

                  {/* Session dots */}
                  <div className="flex gap-1">
                    {Array.from({ length: sessionsPerWeek }, (_, s) => {
                      const sIdx = s + 1;
                      const sessionDone = isCompleted || (isCurrent && sIdx < currentSessionInWeek);
                      const sessionNow = isCurrent && sIdx === currentSessionInWeek;
                      return (
                        <div
                          key={sIdx}
                          className="rounded-full transition-all"
                          style={{
                            width: sessionNow ? "8px" : "6px",
                            height: sessionNow ? "8px" : "6px",
                            backgroundColor: sessionDone
                              ? levelColor.to
                              : sessionNow
                              ? "#F5A600"
                              : "rgba(255,255,255,0.12)",
                            boxShadow: sessionNow ? "0 0 6px rgba(245,166,0,0.7)" : "none",
                          }}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Skill Snapshot (only if data exists) ── */}
      {hasSkillData && (
        <div className="px-5 pb-5">
          <div
            className="rounded-xl p-4"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-300/70 mb-3">
              {jt.skillSnapshot}
            </p>
            <div className="grid grid-cols-2 gap-3">
              {skills.map(({ key, label, icon: Icon, value }) => (
                <div key={key} className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <Icon className="w-3 h-3 text-blue-300/70" />
                    <span className="text-xs text-blue-200/80">{label}</span>
                    <span className="ms-auto text-xs font-bold" style={{ color: value != null ? "#F5A600" : "rgba(255,255,255,0.2)" }}>
                      {value != null ? `${value}/10` : "—"}
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.08)" }}>
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: value != null ? `${(value / 10) * 100}%` : "0%",
                        background: `linear-gradient(90deg, ${levelColor.from}, ${levelColor.to})`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Current position footer ── */}
      <div className="mx-5 mb-5">
        <div
          className="rounded-2xl p-4 flex items-center gap-3"
          style={{
            background: "rgba(245,166,0,0.12)",
            border: "1px solid rgba(245,166,0,0.25)",
            backdropFilter: "blur(8px)",
          }}
        >
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "rgba(245,166,0,0.22)", boxShadow: "0 0 16px rgba(245,166,0,0.3)" }}
          >
            <Flame className="w-6 h-6 text-yellow-400 fill-yellow-400" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-white text-sm">{jt.currentPosition}</p>
            <p className="text-xs mt-0.5" style={{ color: "rgba(147,197,253,0.8)" }}>
              {levelName || `${jt.level} ${levelId}`}
              {" · "}
              {jt.week} {Math.min(currentWeek, WEEKS_PER_LEVEL)}
              {" · "}
              {jt.session} {currentSessionInWeek}
            </p>
          </div>
          <div className="text-end shrink-0">
            <div className="font-black text-yellow-400 text-xl">{completedInLevel}</div>
            <div className="text-xs" style={{ color: "rgba(147,197,253,0.8)" }}>/ {SESSIONS_PER_LEVEL} {jt.sessions}</div>
          </div>
        </div>
      </div>

      {/* ── Psychological Support Strip ── */}
      {supportSessions && supportSessions.length > 0 && (
        <div className="px-5 pb-5">
          <div
            className="rounded-xl p-3 space-y-2"
            style={{ background: "rgba(124,58,237,0.18)", border: "1px solid rgba(124,58,237,0.35)" }}
          >
            <div className="flex items-center gap-2">
              <BrainCircuit className="w-4 h-4" style={{ color: "#c4b5fd" }} />
              <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#c4b5fd" }}>
                {t.growthProgress?.title ?? "Psychological Support"}
              </span>
              <span
                className="ms-auto text-xs font-bold px-2 py-0.5 rounded-full"
                style={{ background: "rgba(124,58,237,0.4)", color: "#e9d5ff" }}
              >
                {supportSessions.length}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {supportSessions.slice(0, 12).map((s) => (
                <div
                  key={s.id}
                  className="group relative"
                  title={[s.title, s.sessionDate].filter(Boolean).join(" · ")}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold cursor-default transition-transform hover:scale-110"
                    style={{ background: "rgba(124,58,237,0.5)", color: "#e9d5ff", border: "1.5px solid rgba(192,132,252,0.5)" }}
                  >
                    {new Date(s.sessionDate).getDate()}
                  </div>
                </div>
              ))}
              {supportSessions.length > 12 && (
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{ background: "rgba(124,58,237,0.3)", color: "#c4b5fd" }}
                >
                  +{supportSessions.length - 12}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

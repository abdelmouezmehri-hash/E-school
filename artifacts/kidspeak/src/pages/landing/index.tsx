import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import {
  Phone, Mail, MapPin, Instagram, Facebook, Youtube,
  Star, Users, GraduationCap, BookOpen, Heart,
  ChevronDown, Menu, X, Clock, Layers, FileText,
  ArrowDown, Sparkles, MessageSquare, Award, Target,
  User as UserIcon, ShieldCheck, Smile,
} from "lucide-react";
import {
  DEFAULT_LANDING_SETTINGS,
  type LandingSettings,
} from "@/types/landing-settings";

// ── Light palette ─────────────────────────────────────────────────────────────
const NAVY        = "#0F1B4C";
const NAVY_DEEP   = "#0A1238";
const TEXT        = "#111827";
const TEXT_BODY   = "#4B5563";
const TEXT_MUTED  = "#6B7280";
const TEXT_DIM    = "#9CA3AF";
const BG          = "#FFFFFF";
const BG_ALT      = "#F9FAFB";
const CARD        = "#FFFFFF";
const BORDER      = "#E5E7EB";
const ORANGE      = "#F5A623";
const ORANGE_DEEP = "#E89812";
const TEAL        = "#0D9488";
const TEAL_LIGHT  = "#E6FFFA";

const ICON_MAP: Record<string, any> = {
  Users, Heart, FileText, BookOpen, GraduationCap, Award, Target,
  ShieldCheck, Smile, MessageSquare, Sparkles,
};

function Counter({ to, suffix = "" }: { to: number; suffix?: string }) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        let start = 0;
        const step = Math.max(1, Math.ceil(to / 60));
        const t = setInterval(() => {
          start += step;
          if (start >= to) { setVal(to); clearInterval(t); }
          else setVal(start);
        }, 25);
        obs.disconnect();
      }
    }, { threshold: 0.3 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [to]);
  return <span ref={ref}>{val.toLocaleString("ar-DZ")}{suffix}</span>;
}

function Stars({ n }: { n: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className="w-3.5 h-3.5"
              fill={i < n ? ORANGE : "none"}
              stroke={i < n ? ORANGE : "#D1D5DB"} />
      ))}
    </div>
  );
}

const AR_DAY_NAMES_SHORT = ["أحد", "إثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"];

function formatSchedule(g: any): string | null {
  if (g.sessionDayTimes && typeof g.sessionDayTimes === "object" && !Array.isArray(g.sessionDayTimes)) {
    const entries = Object.entries(g.sessionDayTimes as Record<string, string>);
    if (entries.length > 0) {
      return entries.map(([day, time]) => `${AR_DAY_NAMES_SHORT[Number(day)] ?? day} ${time}`).join(" • ");
    }
  }
  if (g.recurringDays) {
    let days: number[] = [];
    try {
      days = typeof g.recurringDays === "string" ? JSON.parse(g.recurringDays) : g.recurringDays;
    } catch { /* fallthrough */ }
    if (Array.isArray(days) && days.length > 0) {
      const dayLabels = days.map(d => AR_DAY_NAMES_SHORT[d] ?? String(d)).join("، ");
      return g.sessionStartTime ? `${dayLabels} • ${g.sessionStartTime}` : dayLabels;
    }
  }
  if (g.schedule) return String(g.schedule);
  return null;
}

function PublicGroupCard({ group, accent }: { group: any; accent: string }) {
  const max = group.maxStudents ?? 10;
  const enrolled = group.enrolledCount ?? 0;
  const remaining = group.spotsRemaining ?? Math.max(0, max - enrolled);
  const scheduleText = formatSchedule(group);
  return (
    <div className="rounded-xl px-3 py-2.5 space-y-2"
         style={{ background: BG_ALT, border: `1px solid ${BORDER}` }}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-bold" style={{ color: TEXT }}>{group.name}</span>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap"
              style={{ background: `${accent}15`, color: accent, border: `1px solid ${accent}40` }}>
          {enrolled}/{max} • متبقي {remaining}
        </span>
      </div>
      {scheduleText && (
        <div className="flex items-center gap-1.5 text-[11px]" style={{ color: TEXT_MUTED }}>
          <Clock className="w-3 h-3 shrink-0" />
          <span>{scheduleText}</span>
        </div>
      )}
      {group.teacherName && (
        <div className="flex items-center gap-2">
          {group.teacherPhoto ? (
            <img src={group.teacherPhoto} alt={group.teacherName}
                 className="w-6 h-6 rounded-full object-cover shrink-0"
                 style={{ border: `1px solid ${BORDER}` }} />
          ) : (
            <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                 style={{ background: BG_ALT, color: TEXT_DIM }}>
              <UserIcon className="w-3 h-3" />
            </div>
          )}
          <span className="text-[11px]" style={{ color: TEXT_BODY }}>
            الأستاذ: <span className="font-medium" style={{ color: TEXT }}>{group.teacherName}</span>
          </span>
        </div>
      )}
    </div>
  );
}

const LEVEL_ICONS  = [BookOpen, Layers, GraduationCap, Star];
const LEVEL_COLORS = [TEAL, ORANGE, "#7C6FCD", "#E85D75"];

function toEmbedUrl(url: string): string {
  if (url.includes("youtube.com/watch")) {
    const id = new URL(url).searchParams.get("v");
    return id ? `https://www.youtube.com/embed/${id}` : url;
  }
  if (url.includes("youtu.be/")) {
    const id = url.split("youtu.be/")[1]?.split(/[?&]/)[0];
    return id ? `https://www.youtube.com/embed/${id}` : url;
  }
  return url;
}

// ── Deep merge: preserves nested defaults when DB has partial data ──────────
function deepMerge<T extends object>(defaults: T, overrides: Partial<T>): T {
  const result = { ...defaults };
  for (const key of Object.keys(overrides) as (keyof T)[]) {
    const ov = overrides[key];
    const dv = defaults[key];
    if (
      ov !== null && typeof ov === "object" && !Array.isArray(ov) &&
      dv !== null && typeof dv === "object" && !Array.isArray(dv)
    ) {
      (result as any)[key] = deepMerge(dv as object, ov as object);
    } else if (ov !== undefined) {
      (result as any)[key] = ov;
    }
  }
  return result;
}
export default function Landing() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [school,   setSchool]   = useState<any>(null);
  const [levels,   setLevels]   = useState<any[]>([]);
  const [cms, setCms] = useState<LandingSettings>(DEFAULT_LANDING_SETTINGS);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    parentName: "", parentPhone: "", parentEmail: "",
    childName: "", childAge: "", preferredLevel: "", notes: "",
  });

  useEffect(() => {
    fetch("/api/public/settings").then(r => r.ok ? r.json() : null).then(setSchool).catch(() => {});
    fetch("/api/public/levels").then(r => r.ok ? r.json() : []).then(setLevels).catch(() => {});
    fetch("/api/public/cms/settings/landing_v3", { cache: "no-store" })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.data && typeof data.data === "object") {
          setCms(deepMerge(DEFAULT_LANDING_SETTINGS, data.data));
        }
      }).catch(() => {});
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    setMobileMenuOpen(false);
  };

  const handleSubmit = async () => {
    if (!form.parentName.trim() || !form.parentPhone.trim() || !form.childName.trim()) {
      toast({ title: "حقول مطلوبة", description: "يُرجى ملء اسم الولي ورقم الهاتف واسم الطفل.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const r = await fetch("/api/public/enquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!r.ok) throw new Error("submit failed");
      toast({ title: "تم استلام طلبك", description: "سنتواصل معك قريباً." });
      setForm({
        parentName: "", parentPhone: "", parentEmail: "",
        childName: "", childAge: "", preferredLevel: "", notes: "",
      });
    } catch {
      toast({ title: "تعذّر الإرسال", description: "يُرجى المحاولة مرة أخرى أو الاتصال بنا مباشرة.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const renderStat = (cfg: any, color: string, Icon: any) => {
    if (cfg.mode === "hidden") return null;
    return (
      <div className="rounded-2xl p-4 sm:p-6 text-center"
           style={{ background: CARD, border: `1px solid ${BORDER}`, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
        <div className="w-10 h-10 rounded-xl mx-auto flex items-center justify-center mb-2 sm:mb-3"
             style={{ backgroundColor: `${color}15` }}>
          <Icon style={{ color, width: 20, height: 20 }} />
        </div>
        <div className="text-2xl sm:text-3xl font-black mb-1" style={{ color }}>
          <Counter to={cfg.value} suffix={cfg.suffix ?? ""} />
        </div>
        <div className="text-[11px] sm:text-xs" style={{ color: TEXT_MUTED }}>{cfg.label}</div>
      </div>
    );
  };

  const visibleStatsCount = ["students","teachers","programs","satisfaction"]
    .filter(k => (cms.stats as any)[k]?.mode !== "hidden").length;

  const navItems = [
    { label: "البرامج",     id: "programs" },
    { label: "المنهج",      id: "method" },
    { label: "ما يميِّزنا",  id: "differentiators" },
    { label: "تواصل معنا", id: "register" },
  ];

  return (
    <div dir="rtl" style={{ background: BG, color: TEXT, minHeight: "100vh" }}>
      {/* HEADER — mobile-first */}
      <header className="sticky top-0 z-40 backdrop-blur-md"
              style={{ background: "rgba(255,255,255,0.97)",
                       borderBottom: "1px solid #E5E7EB",
                       boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between gap-3">
          <a href="#" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); }}
             className="flex items-center shrink-0 me-2 sm:me-4 py-1">
            <img
              src="/logo-wordmark.svg"
              alt="kidSpeak"
              className="block h-9 sm:h-10 w-auto select-none"
              draggable={false}
            />
          </a>

          <nav className="hidden md:flex items-center gap-1 flex-1 justify-center">
            {navItems.map(item => (
              <button key={item.id} onClick={() => scrollTo(item.id)}
                      className="px-3 py-2 text-sm font-medium rounded-md transition-colors"
                      style={{ color: "#374151" }}
                      onMouseEnter={e => (e.currentTarget.style.color = "#111827")}
                      onMouseLeave={e => (e.currentTarget.style.color = "#374151")}>
                {item.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-1 sm:gap-2 ms-2 sm:ms-4">
            <button onClick={() => navigate("/login")}
                    className="hidden sm:inline-flex items-center px-3.5 py-1.5 text-sm rounded-full font-semibold transition-colors"
                    style={{ color: "#374151" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "#F3F4F6")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
              دخول
            </button>
            <button onClick={() => scrollTo("register")}
                    className="px-4 sm:px-4 py-2 text-xs sm:text-sm font-bold rounded-full transition-transform active:scale-95"
                    style={{ backgroundColor: "#FFB500", color: "#0D1B2E",
                             boxShadow: "0 1px 2px rgba(255,181,0,0.25)" }}>
              {cms.hero.primaryCta}
            </button>
            <button className="md:hidden p-2 -me-1" onClick={() => setMobileMenuOpen(v => !v)} aria-label="Menu">
              {mobileMenuOpen
                ? <X className="w-5 h-5" style={{ color: TEXT }} />
                : <Menu className="w-5 h-5" style={{ color: TEXT }} />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden" style={{ borderTop: `1px solid ${BORDER}`, background: BG }}>
            <div className="px-4 py-2 flex flex-col">
              {navItems.map(item => (
                <button key={item.id} onClick={() => scrollTo(item.id)}
                        className="text-start px-3 py-3 text-sm"
                        style={{ color: TEXT_BODY, borderBottom: `1px solid ${BORDER}` }}>
                  {item.label}
                </button>
              ))}
              <button onClick={() => navigate("/login")}
                      className="text-start px-3 py-3 text-sm"
                      style={{ color: TEXT_BODY }}>
                دخول
              </button>
            </div>
          </div>
        )}
      </header>

      {/* HERO */}
      <section className="px-4 sm:px-6 pt-10 sm:pt-20 pb-12 sm:pb-20 relative overflow-hidden">
        <div className="absolute top-10 -end-10 w-48 sm:w-64 h-48 sm:h-64 rounded-full opacity-20 pointer-events-none"
             style={{ background: `radial-gradient(circle, ${ORANGE} 0%, transparent 70%)` }} />
        <div className="absolute bottom-0 -start-10 w-48 sm:w-72 h-48 sm:h-72 rounded-full opacity-10 pointer-events-none"
             style={{ background: `radial-gradient(circle, ${TEAL} 0%, transparent 70%)` }} />

        <div className="max-w-5xl mx-auto relative">
          <div className="text-center">
            <span className="inline-block text-[11px] sm:text-xs font-bold px-3 sm:px-4 py-1 sm:py-1.5 rounded-full mb-4 sm:mb-6"
                  style={{ backgroundColor: TEAL_LIGHT, color: TEAL, border: `1px solid ${TEAL}40` }}>
              {cms.hero.badge}
            </span>
            <h1 className="text-2xl sm:text-4xl md:text-5xl font-black leading-tight mb-4 sm:mb-6 max-w-3xl mx-auto"
                style={{ color: TEXT }}>
              {cms.hero.title}
            </h1>
            <p className="text-sm sm:text-lg max-w-2xl mx-auto mb-6 sm:mb-8 leading-relaxed px-2"
               style={{ color: TEXT_BODY }}>
              {cms.hero.subtitle}
            </p>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 max-w-md sm:max-w-none mx-auto">
              <button onClick={() => scrollTo("register")}
                      className="px-6 py-3 text-sm sm:text-base font-bold rounded-full transition-transform active:scale-95"
                      style={{ backgroundColor: ORANGE, color: NAVY,
                               boxShadow: `0 8px 24px ${ORANGE}40` }}>
                {cms.hero.primaryCta}
              </button>
              <button onClick={() => scrollTo("programs")}
                      className="px-6 py-3 text-sm sm:text-base font-bold rounded-full inline-flex items-center justify-center gap-2"
                      style={{ color: TEXT, border: `1.5px solid ${BORDER}` }}>
                {cms.hero.secondaryCta}
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          </div>

          {cms.hero.videoUrl && (
            <div className="mt-8 sm:mt-12 max-w-3xl mx-auto rounded-2xl overflow-hidden"
                 style={{ border: `1px solid ${BORDER}`, aspectRatio: "16 / 9", boxShadow: "0 8px 24px rgba(0,0,0,0.08)" }}>
              <iframe src={toEmbedUrl(cms.hero.videoUrl)} title="Kidspeak"
                      className="w-full h-full" frameBorder={0}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen />
            </div>
          )}
        </div>
      </section>

      {/* PAINS */}
      {cms.sections.pains && cms.pains.items.length > 0 && (
        <section id="pains" className="px-4 sm:px-6 py-12 sm:py-20" style={{ background: BG_ALT }}>
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-8 sm:mb-12">
              <h2 className="text-xl sm:text-3xl font-black mb-2 sm:mb-3" style={{ color: TEXT }}>
                {cms.pains.title}
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
              {cms.pains.items.map((item, i) => (
                <div key={i} className="rounded-2xl p-5 sm:p-6"
                     style={{ background: CARD, border: `1px solid ${BORDER}`,
                              boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 sm:mb-4"
                       style={{ backgroundColor: `${ORANGE}15`, color: ORANGE }}>
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <h3 className="text-base sm:text-lg font-bold mb-2 sm:mb-3" style={{ color: TEXT }}>
                    {item.title}
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: TEXT_MUTED }}>
                    {item.body}
                  </p>
                </div>
              ))}
            </div>
            <div className="text-center mt-8 sm:mt-10">
              <button onClick={() => scrollTo("method")}
                      className="inline-flex items-center gap-2 text-sm font-bold"
                      style={{ color: TEAL }}>
                نحلُّ هذه المشاكل — اقرأ كيف
                <ArrowDown className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>
      )}

      {/* METHOD */}
      {cms.sections.method && (
        <section id="method" className="px-4 sm:px-6 py-12 sm:py-20">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8 sm:mb-10">
              <span className="inline-block text-[11px] sm:text-xs font-bold px-3 sm:px-4 py-1 sm:py-1.5 rounded-full mb-3 sm:mb-4"
                    style={{ backgroundColor: TEAL_LIGHT, color: TEAL, border: `1px solid ${TEAL}40` }}>
                Speaking First
              </span>
              <h2 className="text-xl sm:text-3xl font-black mb-3 sm:mb-4" style={{ color: TEXT }}>
                {cms.method.title}
              </h2>
              <p className="text-sm sm:text-lg leading-relaxed max-w-3xl mx-auto"
                 style={{ color: TEXT_BODY }}>
                {cms.method.body}
              </p>
            </div>
            <div className="rounded-2xl p-5 sm:p-8 mt-6 sm:mt-8"
                 style={{ background: TEAL_LIGHT, border: `1px solid ${TEAL}30` }}>
              <ul className="space-y-3 sm:space-y-4">
                {cms.method.points.map((p, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center mt-0.5 shrink-0"
                         style={{ background: TEAL, color: "white" }}>
                      <span className="text-xs font-black">{i + 1}</span>
                    </div>
                    <span className="text-sm sm:text-base leading-relaxed" style={{ color: TEXT }}>
                      {p}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      )}

      {/* DIFFERENTIATORS */}
      {cms.sections.differentiators && cms.differentiators.items.length > 0 && (
        <section id="differentiators" className="px-4 sm:px-6 py-12 sm:py-20" style={{ background: BG_ALT }}>
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-8 sm:mb-12">
              <h2 className="text-xl sm:text-3xl font-black mb-2 sm:mb-3" style={{ color: TEXT }}>
                {cms.differentiators.title}
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
              {cms.differentiators.items.map((item, i) => {
                const Icon = ICON_MAP[item.icon] ?? Sparkles;
                const color = [TEAL, ORANGE, "#7C6FCD", "#E85D75"][i % 4];
                return (
                  <div key={i} className="rounded-2xl p-5 sm:p-6 flex gap-3 sm:gap-4"
                       style={{ background: CARD, border: `1px solid ${BORDER}`,
                                boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                    <div className="w-11 sm:w-12 h-11 sm:h-12 rounded-xl flex items-center justify-center shrink-0"
                         style={{ backgroundColor: `${color}15` }}>
                      <Icon style={{ color, width: 20, height: 20 }} />
                    </div>
                    <div>
                      <h3 className="text-base sm:text-lg font-bold mb-1.5 sm:mb-2" style={{ color: TEXT }}>
                        {item.title}
                      </h3>
                      <p className="text-sm leading-relaxed" style={{ color: TEXT_MUTED }}>
                        {item.body}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* STATS */}
      {cms.sections.stats && visibleStatsCount > 0 && (
        <section className="px-4 sm:px-6 py-10 sm:py-16">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-6 sm:mb-10">
              <h2 className="text-lg sm:text-2xl font-bold" style={{ color: TEXT }}>
                {cms.stats.title}
              </h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              {renderStat({ ...cms.stats.students,    label: cms.stats.students.label    }, "#E85D75", Heart)}
              {renderStat({ ...cms.stats.teachers,    label: cms.stats.teachers.label    }, "#7C6FCD", BookOpen)}
              {renderStat({ ...cms.stats.programs,    label: cms.stats.programs.label    }, ORANGE,    GraduationCap)}
              {renderStat({ ...cms.stats.satisfaction, label: cms.stats.satisfaction.label}, TEAL,     Users)}
            </div>
          </div>
        </section>
      )}

      {/* PROGRAMS */}
      {cms.sections.programs && (
        <section id="programs" className="px-4 sm:px-6 py-12 sm:py-20" style={{ background: BG_ALT }}>
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-8 sm:mb-12">
              <span className="inline-block text-[11px] sm:text-xs font-bold px-3 sm:px-4 py-1 sm:py-1.5 rounded-full mb-3 sm:mb-4"
                    style={{ backgroundColor: `${ORANGE}15`, color: ORANGE_DEEP, border: `1px solid ${ORANGE}40` }}>
                البرامج
              </span>
              <h2 className="text-xl sm:text-3xl font-black mb-2 sm:mb-3" style={{ color: TEXT }}>
                برامجنا التعليمية
              </h2>
              <p className="text-sm sm:text-base" style={{ color: TEXT_MUTED }}>
                مستويات مصمَّمة للأطفال من 7 إلى 13 سنة — من المبتدئ إلى المتقدِّم
              </p>
            </div>

            {levels.length === 0 ? (
              <div className="text-center text-sm" style={{ color: TEXT_DIM }}>
                البرامج قيد التحديث — تواصل معنا للاستفسار
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                {levels.map((lv: any, i: number) => {
                  const Icon  = LEVEL_ICONS[i % LEVEL_ICONS.length];
                  const color = LEVEL_COLORS[i % LEVEL_COLORS.length];
                  const availableGroups: any[] = lv.groups ?? [];
                  const desc = lv.landingDescription || lv.descriptionAr || lv.description;
                  return (
                    <div key={lv.id} className="rounded-2xl p-5 sm:p-6 flex flex-col gap-3"
                         style={{ background: CARD, border: `1px solid ${BORDER}`,
                                  boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                             style={{ backgroundColor: `${color}15` }}>
                          <Icon style={{ color, width: 20, height: 20 }} />
                        </div>
                        {lv.price && (
                          <div className="text-xs sm:text-sm font-bold px-2.5 sm:px-3 py-1 rounded-full"
                               style={{ backgroundColor: `${color}10`, color }}>
                            {Number(lv.price).toLocaleString("fr-DZ")} د.ج / حصة
                          </div>
                        )}
                      </div>
                      <h3 className="text-base sm:text-lg font-bold" style={{ color: TEXT }}>
                        {lv.nameAr || lv.name}
                      </h3>
                      {desc && (
                        <p className="text-sm leading-relaxed" style={{ color: TEXT_MUTED }}>
                          {desc}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-3 mt-1">
                        {lv.durationWeeks && (
                          <div className="flex items-center gap-1 text-xs" style={{ color: TEXT_DIM }}>
                            <Clock className="w-3.5 h-3.5" />{lv.durationWeeks} أسبوع
                          </div>
                        )}
                        {lv.sessionsPerWeek && (
                          <div className="flex items-center gap-1 text-xs" style={{ color: TEXT_DIM }}>
                            <BookOpen className="w-3.5 h-3.5" />{lv.sessionsPerWeek} حصة/أسبوع
                          </div>
                        )}
                      </div>

                      {availableGroups.length > 0 && (
                        <div className="mt-1 space-y-1.5">
                          <p className="text-xs font-semibold" style={{ color: TEXT_DIM }}>
                            الأفواج المتاحة ({availableGroups.length})
                          </p>
                          {availableGroups.map((g: any) => (
                            <PublicGroupCard key={g.id} group={g} accent={color} />
                          ))}
                        </div>
                      )}
                      {availableGroups.length === 0 && (
                        <p className="text-xs mt-1" style={{ color: TEXT_DIM }}>
                          لا توجد أفواج مفتوحة حالياً — سَجِّل اهتمامك وسنتواصل معك
                        </p>
                      )}
                      <button onClick={() => scrollTo("register")}
                              className="mt-2 w-full py-2.5 rounded-full text-sm font-bold transition-transform active:scale-95"
                              style={{ backgroundColor: `${color}10`, color, border: `1px solid ${color}40` }}>
                        سَجِّل في هذا المستوى
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      )}

      {/* TESTIMONIALS */}
      {cms.sections.testimonials && cms.testimonials.items.length > 0 && (
        <section className="px-4 sm:px-6 py-12 sm:py-20">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-8 sm:mb-12">
              <span className="inline-block text-[11px] sm:text-xs font-bold px-3 sm:px-4 py-1 sm:py-1.5 rounded-full mb-3 sm:mb-4"
                    style={{ backgroundColor: TEAL_LIGHT, color: TEAL, border: `1px solid ${TEAL}40` }}>
                آراء الأولياء
              </span>
              <h2 className="text-xl sm:text-3xl font-black" style={{ color: TEXT }}>
                {cms.testimonials.title}
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
              {cms.testimonials.items.map((tt, i) => (
                <div key={i} className="rounded-2xl p-5 sm:p-6 flex flex-col gap-3"
                     style={{ background: CARD, border: `1px solid ${BORDER}`,
                              boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                  <Stars n={tt.rating} />
                  <p className="text-sm leading-relaxed flex-1" style={{ color: TEXT_BODY }}>
                    "{tt.quote}"
                  </p>
                  <div className="pt-3" style={{ borderTop: `1px solid ${BORDER}` }}>
                    <div className="text-sm font-bold" style={{ color: TEXT }}>{tt.name}</div>
                    <div className="text-xs" style={{ color: TEXT_DIM }}>{tt.relation}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* GALLERY */}
      {cms.sections.gallery && cms.gallery.images.length > 0 && (
        <section className="px-4 sm:px-6 py-12 sm:py-20" style={{ background: BG_ALT }}>
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-6 sm:mb-10">
              <h2 className="text-xl sm:text-3xl font-black" style={{ color: TEXT }}>
                {cms.gallery.title}
              </h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
              {cms.gallery.images.map((src, i) => (
                <div key={i} className="rounded-xl overflow-hidden"
                     style={{ border: `1px solid ${BORDER}`, aspectRatio: "1 / 1" }}>
                  <img src={src} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA BANNER */}
      {cms.sections.ctaBanner && (
        <section className="px-4 sm:px-6 py-10 sm:py-16">
          <div className="max-w-4xl mx-auto rounded-2xl sm:rounded-3xl p-6 sm:p-12 text-center relative overflow-hidden"
               style={{ background: `linear-gradient(135deg, ${TEAL_LIGHT} 0%, #DCFCE7 100%)`,
                        border: `1px solid #86EFAC` }}>
            <div className="absolute -top-10 -end-10 w-40 h-40 rounded-full opacity-30 pointer-events-none"
                 style={{ background: `radial-gradient(circle, ${ORANGE} 0%, transparent 70%)` }} />
            <h2 className="text-xl sm:text-3xl font-black mb-2 sm:mb-3 relative" style={{ color: TEXT }}>
              {cms.ctaBanner.title}
            </h2>
            <p className="text-sm sm:text-base mb-5 sm:mb-6 max-w-xl mx-auto relative" style={{ color: TEXT_BODY }}>
              {cms.ctaBanner.subtitle}
            </p>
            <button onClick={() => scrollTo("register")}
                    className="px-6 sm:px-8 py-3 text-sm sm:text-base font-black rounded-full transition-transform active:scale-95 relative"
                    style={{ backgroundColor: ORANGE, color: NAVY,
                             boxShadow: `0 8px 24px ${ORANGE}40` }}>
              {cms.ctaBanner.buttonText}
            </button>
          </div>
        </section>
      )}

      {/* REGISTER FORM */}
      {cms.sections.register && (
        <section id="register" className="px-4 sm:px-6 py-12 sm:py-20" style={{ background: BG_ALT }}>
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-8 sm:mb-10">
              <span className="inline-block text-[11px] sm:text-xs font-bold px-3 sm:px-4 py-1 sm:py-1.5 rounded-full mb-3 sm:mb-4"
                    style={{ backgroundColor: `${ORANGE}15`, color: ORANGE_DEEP, border: `1px solid ${ORANGE}40` }}>
                التسجيل
              </span>
              <h2 className="text-xl sm:text-3xl font-black mb-2 sm:mb-3" style={{ color: TEXT }}>
                {cms.register.title}
              </h2>
              <p className="text-sm sm:text-base" style={{ color: TEXT_MUTED }}>
                {cms.register.subtitle}
              </p>
            </div>
            <div className="rounded-2xl sm:rounded-3xl p-5 sm:p-8 space-y-4"
                 style={{ background: CARD, border: `1px solid ${BORDER}`,
                          boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="اسم الولي *" value={form.parentName}
                       onChange={v => setForm(f => ({ ...f, parentName: v }))}
                       placeholder="مثال: أحمد بوعلي" />
                <Field label="رقم الهاتف *" value={form.parentPhone}
                       onChange={v => setForm(f => ({ ...f, parentPhone: v }))}
                       placeholder="0555 123 456" type="tel" />
              </div>
              <Field label="البريد الإلكتروني" value={form.parentEmail}
                     onChange={v => setForm(f => ({ ...f, parentEmail: v }))}
                     placeholder="example@email.com" type="email" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="اسم الطفل *" value={form.childName}
                       onChange={v => setForm(f => ({ ...f, childName: v }))}
                       placeholder="مثال: أميرة" />
                <Field label="سن الطفل" value={form.childAge}
                       onChange={v => setForm(f => ({ ...f, childAge: v }))}
                       placeholder="مثال: 8 سنوات" />
              </div>
              {levels.length > 0 && (
                <div>
                  <label className="block text-xs font-bold mb-1.5" style={{ color: TEXT_BODY }}>
                    المستوى المُفضَّل
                  </label>
                  <select value={form.preferredLevel}
                          onChange={e => setForm(f => ({ ...f, preferredLevel: e.target.value }))}
                          className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                          style={{ background: BG_ALT, border: `1px solid ${BORDER}`, color: TEXT }}>
                    <option value="">اختر مستوى…</option>
                    {levels.map((lv: any) => (
                      <option key={lv.id} value={lv.nameAr || lv.name}>
                        {lv.nameAr || lv.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-xs font-bold mb-1.5" style={{ color: TEXT_BODY }}>
                  ملاحظات إضافية
                </label>
                <textarea value={form.notes}
                          onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                          rows={3}
                          placeholder="أيُّ معلومات تريد مشاركتها"
                          className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none"
                          style={{ background: BG_ALT, border: `1px solid ${BORDER}`, color: TEXT }} />
              </div>
              <button onClick={handleSubmit} disabled={submitting}
                      className="w-full py-3.5 rounded-full text-sm sm:text-base font-black transition-transform active:scale-[0.98] disabled:opacity-50"
                      style={{ backgroundColor: ORANGE, color: NAVY,
                               boxShadow: `0 8px 24px ${ORANGE}40` }}>
                {submitting ? "جاري الإرسال…" : "إرسال الطلب"}
              </button>
            </div>
          </div>
        </section>
      )}

      {/* FOOTER */}
      <footer className="px-4 sm:px-6 py-10 sm:py-12" style={{ background: NAVY_DEEP }}>
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <img
              src="/logo-wordmark-white.svg"
              alt="kidSpeak"
              style={{
                height: 44,
                width: "auto",
                marginBottom: 16,
                display: "block",
                filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.15))",
              }}
            />
            <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.65)" }}>
              {cms.footer.tagline}
            </p>
          </div>
          <div>
            <h4 className="text-sm font-bold mb-3 text-white">روابط سريعة</h4>
            <ul className="space-y-2 text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
              <li><button onClick={() => scrollTo("programs")}>البرامج التعليمية</button></li>
              <li><button onClick={() => scrollTo("method")}>منهج التعليم</button></li>
              <li><button onClick={() => scrollTo("register")}>التسجيل</button></li>
              <li><button onClick={() => navigate("/login")}>دخول المنصة</button></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-bold mb-3 text-white">تواصل معنا</h4>
            <ul className="space-y-2 text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
              {school?.email && (
                <li className="flex items-center gap-2"><Mail className="w-3.5 h-3.5" /><span>{school.email}</span></li>
              )}
              {school?.phone && (
                <li className="flex items-center gap-2"><Phone className="w-3.5 h-3.5" /><span dir="ltr">{school.phone}</span></li>
              )}
              {school?.address && (
                <li className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5" /><span>{school.address}</span></li>
              )}
            </ul>
            <div className="flex gap-3 mt-4">
              {school?.instagram && (
                <a href={school.instagram} target="_blank" rel="noreferrer"
                   className="w-9 h-9 rounded-full flex items-center justify-center text-white"
                   style={{ background: "rgba(255,255,255,0.05)" }}>
                  <Instagram className="w-4 h-4" />
                </a>
              )}
              {school?.facebook && (
                <a href={school.facebook} target="_blank" rel="noreferrer"
                   className="w-9 h-9 rounded-full flex items-center justify-center text-white"
                   style={{ background: "rgba(255,255,255,0.05)" }}>
                  <Facebook className="w-4 h-4" />
                </a>
              )}
              {school?.youtube && (
                <a href={school.youtube} target="_blank" rel="noreferrer"
                   className="w-9 h-9 rounded-full flex items-center justify-center text-white"
                   style={{ background: "rgba(255,255,255,0.05)" }}>
                  <Youtube className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>
        </div>
        <div className="max-w-6xl mx-auto mt-8 pt-6 text-center text-xs"
             style={{ borderTop: "1px solid rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)" }}>
          © {new Date().getFullYear()} Kidspeak Language Center — جميع الحقوق محفوظة
        </div>
      </footer>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = "text" }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-bold mb-1.5" style={{ color: "#4B5563" }}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
             placeholder={placeholder}
             className="w-full px-4 py-3 rounded-xl text-sm outline-none"
             style={{ background: "#F9FAFB", border: "1px solid #E5E7EB", color: "#111827" }} />
    </div>
  );
}

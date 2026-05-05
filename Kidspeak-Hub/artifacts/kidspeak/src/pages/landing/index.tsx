import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import {
  Phone, Mail, MapPin, Instagram, Facebook, Youtube,
  Star, Users, GraduationCap, BookOpen, Heart,
  ChevronDown, Menu, X, Clock, Layers, FileText,
  ArrowDown, Sparkles, MessageSquare, Award, Target,
  User as UserIcon, PlayCircle, ShieldCheck, Smile,
} from "lucide-react";
import {
  DEFAULT_LANDING_SETTINGS,
  type LandingSettings,
} from "@/types/landing-settings";

// ── Palette ───────────────────────────────────────────────────────────────────
const NAVY        = "#0A1628";
const NAVY_DEEP   = "#070F1D";
const ORANGE      = "#F5A623";
const ORANGE_SOFT = "#FFD56B";
const TEAL        = "#5EC4A0";

// ── Map of icon names → lucide components (for differentiator cards) ─────────
const ICON_MAP: Record<string, any> = {
  Users, Heart, FileText, BookOpen, GraduationCap, Award, Target,
  ShieldCheck, Smile, MessageSquare, Sparkles,
};

// ── Animated counter ─────────────────────────────────────────────────────────
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

// ── Star rating ──────────────────────────────────────────────────────────────
function Stars({ n }: { n: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className="w-3.5 h-3.5" fill={i < n ? ORANGE : "none"} stroke={i < n ? ORANGE : "#555"} />
      ))}
    </div>
  );
}

// ── Day name maps (Arabic) ───────────────────────────────────────────────────
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

// Public-group card — used inside each level card in the programs section
function PublicGroupCard({ group, accent }: { group: any; accent: string }) {
  const max = group.maxStudents ?? 10;
  const enrolled = group.enrolledCount ?? 0;
  const remaining = group.spotsRemaining ?? Math.max(0, max - enrolled);
  const scheduleText = formatSchedule(group);
  return (
    <div
      className="rounded-xl px-3 py-2.5 space-y-2"
      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-bold">{group.name}</span>
        <span
          className="text-[10px] font-bold px-2 py-0.5 rounded-full"
          style={{ background: `${accent}20`, color: accent, border: `1px solid ${accent}40` }}
        >
          {enrolled}/{max} • متبقي {remaining}
        </span>
      </div>
      {scheduleText && (
        <div className="flex items-center gap-1.5 text-[11px]" style={{ color: "rgba(255,255,255,0.55)" }}>
          <Clock className="w-3 h-3 shrink-0" />
          <span>{scheduleText}</span>
        </div>
      )}
      {group.teacherName && (
        <div className="flex items-center gap-2">
          {group.teacherPhoto ? (
            <img src={group.teacherPhoto} alt={group.teacherName}
                 className="w-6 h-6 rounded-full object-cover shrink-0"
                 style={{ border: "1px solid rgba(255,255,255,0.15)" }} />
          ) : (
            <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                 style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }}>
              <UserIcon className="w-3 h-3" />
            </div>
          )}
          <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.7)" }}>
            الأستاذ: <span className="font-medium" style={{ color: "rgba(255,255,255,0.9)" }}>{group.teacherName}</span>
          </span>
        </div>
      )}
    </div>
  );
}

// ── Level icons ──────────────────────────────────────────────────────────────
const LEVEL_ICONS  = [BookOpen, Layers, GraduationCap, Star];
const LEVEL_COLORS = [TEAL, ORANGE, "#7C6FCD", "#E85D75"];

// ── Helper: convert YouTube watch URL → embed URL (idempotent) ───────────────
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

// ────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ────────────────────────────────────────────────────────────────────────────
export default function Landing() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [school,   setSchool]   = useState<any>(null);
  const [levels,   setLevels]   = useState<any[]>([]);
  const [cms, setCms] = useState<LandingSettings>(DEFAULT_LANDING_SETTINGS);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [form, setForm] = useState({
    parentName: "",
    parentPhone: "",
    parentEmail: "",
    childName: "",
    childAge: "",
    preferredLevel: "",
    notes: "",
  });

  // ── Fetch all CMS / public data ─────────────────────────────────────────
  useEffect(() => {
    fetch("/api/public/settings")
      .then(r => r.ok ? r.json() : null)
      .then(setSchool).catch(() => {});

    fetch("/api/public/levels")
      .then(r => r.ok ? r.json() : [])
      .then(setLevels).catch(() => {});

    fetch("/api/public/cms/settings/landing_v3")
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.valueJson) {
          try {
            const parsed = JSON.parse(data.valueJson);
            // Merge with defaults so any missing key falls back gracefully
            setCms({ ...DEFAULT_LANDING_SETTINGS, ...parsed });
          } catch { /* keep defaults */ }
        }
      }).catch(() => {});
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    setMobileMenuOpen(false);
  };

  // ── Submit enquiry ──────────────────────────────────────────────────────
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
      toast({ title: "تم استلام طلبك", description: "سَنتواصل معك قريباً." });
      setForm({
        parentName: "", parentPhone: "", parentEmail: "",
        childName: "", childAge: "", preferredLevel: "", notes: "",
      });
    } catch {
      toast({ title: "تَعَذَّر الإرسال", description: "يُرجى المحاولة مرة أخرى أو الاتصال بنا مباشرة.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  // ── Stat card ───────────────────────────────────────────────────────────
  const renderStat = (cfg: any, color: string, Icon: any) => {
    if (cfg.mode === "hidden") return null;
    return (
      <div className="rounded-2xl p-6 text-center"
           style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="w-10 h-10 rounded-xl mx-auto flex items-center justify-center mb-3"
             style={{ backgroundColor: `${color}20` }}>
          <Icon style={{ color, width: 20, height: 20 }} />
        </div>
        <div className="text-3xl font-black mb-1" style={{ color }}>
          <Counter to={cfg.value} suffix={cfg.suffix ?? ""} />
        </div>
        <div className="text-xs" style={{ color: "rgba(255,255,255,0.55)" }}>{cfg.label}</div>
      </div>
    );
  };

  const visibleStatsCount = ["students","teachers","programs","satisfaction"]
    .filter(k => (cms.stats as any)[k]?.mode !== "hidden").length;

  // ────────────────────────────────────────────────────────────────────────
  // RENDER
  // ────────────────────────────────────────────────────────────────────────
  return (
    <div dir="rtl" style={{ background: NAVY, color: "white", minHeight: "100vh" }}>
      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 backdrop-blur-md"
              style={{ background: "rgba(7,15,29,0.85)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <img src="/logo-full-dark.svg" alt="kidSpeak" className="h-8 w-auto"
                 onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
            <span className="text-lg font-black tracking-tight">
              <span className="text-white">kid</span><span style={{ color: ORANGE }}>Speak</span>
            </span>
          </div>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {[
              { label: "البرامج",       id: "programs" },
              { label: "المنهج",        id: "method" },
              { label: "ما يميِّزنا",    id: "differentiators" },
              { label: "تواصل معنا",   id: "register" },
            ].map(item => (
              <button key={item.id} onClick={() => scrollTo(item.id)}
                      className="px-3 py-2 text-sm hover:text-white rounded-md transition-colors"
                      style={{ color: "rgba(255,255,255,0.7)" }}>
                {item.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <button onClick={() => navigate("/login")}
                    className="hidden md:inline-block px-4 py-2 text-sm rounded-full font-bold"
                    style={{ color: "rgba(255,255,255,0.7)", border: "1px solid rgba(255,255,255,0.15)" }}>
              دخول
            </button>
            <button onClick={() => scrollTo("register")}
                    className="px-4 py-2 text-sm font-bold rounded-full"
                    style={{ backgroundColor: ORANGE, color: NAVY }}>
              {cms.hero.primaryCta}
            </button>
            <button className="md:hidden p-2" onClick={() => setMobileMenuOpen(v => !v)}>
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
            <div className="px-4 py-3 flex flex-col gap-1">
              {[
                { label: "البرامج",       id: "programs" },
                { label: "المنهج",        id: "method" },
                { label: "ما يميِّزنا",    id: "differentiators" },
                { label: "تواصل معنا",   id: "register" },
              ].map(item => (
                <button key={item.id} onClick={() => scrollTo(item.id)}
                        className="text-start px-3 py-2.5 text-sm rounded-md"
                        style={{ color: "rgba(255,255,255,0.7)" }}>
                  {item.label}
                </button>
              ))}
              <button onClick={() => navigate("/login")}
                      className="text-start px-3 py-2.5 text-sm rounded-md"
                      style={{ color: "rgba(255,255,255,0.7)" }}>
                دخول
              </button>
            </div>
          </div>
        )}
      </header>

      {/* ── HERO ────────────────────────────────────────────────────────── */}
      <section className="px-4 sm:px-6 pt-16 sm:pt-24 pb-16 relative overflow-hidden">
        {/* Soft glow accents */}
        <div className="absolute top-20 -end-20 w-64 h-64 rounded-full opacity-20"
             style={{ background: `radial-gradient(circle, ${ORANGE} 0%, transparent 70%)` }} />
        <div className="absolute bottom-0 -start-20 w-72 h-72 rounded-full opacity-10"
             style={{ background: `radial-gradient(circle, ${TEAL} 0%, transparent 70%)` }} />

        <div className="max-w-5xl mx-auto relative">
          <div className="text-center">
            <span className="inline-block text-xs font-bold px-4 py-1.5 rounded-full mb-6"
                  style={{ backgroundColor: `${TEAL}1A`, color: TEAL, border: `1px solid ${TEAL}40` }}>
              {cms.hero.badge}
            </span>
            <h1 className="text-3xl sm:text-5xl font-black leading-tight mb-6 max-w-3xl mx-auto">
              {cms.hero.title}
            </h1>
            <p className="text-base sm:text-lg max-w-2xl mx-auto mb-8 leading-relaxed"
               style={{ color: "rgba(255,255,255,0.65)" }}>
              {cms.hero.subtitle}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button onClick={() => scrollTo("register")}
                      className="px-6 py-3 text-base font-bold rounded-full transition-transform hover:scale-105"
                      style={{ backgroundColor: ORANGE, color: NAVY, boxShadow: `0 8px 24px ${ORANGE}40` }}>
                {cms.hero.primaryCta}
              </button>
              <button onClick={() => scrollTo("programs")}
                      className="px-6 py-3 text-base font-bold rounded-full inline-flex items-center gap-2"
                      style={{ color: "white", border: "1px solid rgba(255,255,255,0.2)" }}>
                {cms.hero.secondaryCta}
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Hero video — only if URL is set */}
          {cms.hero.videoUrl && (
            <div className="mt-12 max-w-3xl mx-auto rounded-2xl overflow-hidden"
                 style={{ border: "1px solid rgba(255,255,255,0.08)", aspectRatio: "16 / 9" }}>
              <iframe
                src={toEmbedUrl(cms.hero.videoUrl)}
                title="Kidspeak"
                className="w-full h-full"
                frameBorder={0}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}
        </div>
      </section>

      {/* ── PAINS ───────────────────────────────────────────────────────── */}
      {cms.sections.pains && cms.pains.items.length > 0 && (
        <section id="pains" className="px-4 sm:px-6 py-20" style={{ background: "rgba(255,255,255,0.02)" }}>
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-2xl sm:text-3xl font-black mb-3">{cms.pains.title}</h2>
            </div>
            <div className="grid md:grid-cols-3 gap-5">
              {cms.pains.items.map((item, i) => (
                <div key={i} className="rounded-2xl p-6"
                     style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                       style={{ backgroundColor: `${ORANGE}1A`, color: ORANGE }}>
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-bold mb-3">{item.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.55)" }}>
                    {item.body}
                  </p>
                </div>
              ))}
            </div>
            <div className="text-center mt-10">
              <button onClick={() => scrollTo("method")}
                      className="inline-flex items-center gap-2 text-sm font-bold"
                      style={{ color: TEAL }}>
                نَحُلُّ هذه المشاكل — اقرأ كيف
                <ArrowDown className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ── METHOD ──────────────────────────────────────────────────────── */}
      {cms.sections.method && (
        <section id="method" className="px-4 sm:px-6 py-20">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-10">
              <span className="inline-block text-xs font-bold px-4 py-1.5 rounded-full mb-4"
                    style={{ backgroundColor: `${TEAL}1A`, color: TEAL, border: `1px solid ${TEAL}40` }}>
                Speaking First
              </span>
              <h2 className="text-2xl sm:text-3xl font-black mb-4">{cms.method.title}</h2>
              <p className="text-base sm:text-lg leading-relaxed max-w-3xl mx-auto"
                 style={{ color: "rgba(255,255,255,0.7)" }}>
                {cms.method.body}
              </p>
            </div>
            <div className="rounded-2xl p-6 sm:p-8 mt-8"
                 style={{ background: "rgba(94,196,160,0.06)", border: `1px solid ${TEAL}30` }}>
              <ul className="space-y-4">
                {cms.method.points.map((p, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center mt-0.5 shrink-0"
                         style={{ background: TEAL, color: NAVY }}>
                      <span className="text-xs font-black">{i + 1}</span>
                    </div>
                    <span className="text-sm sm:text-base leading-relaxed"
                          style={{ color: "rgba(255,255,255,0.85)" }}>
                      {p}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      )}

      {/* ── DIFFERENTIATORS ─────────────────────────────────────────────── */}
      {cms.sections.differentiators && cms.differentiators.items.length > 0 && (
        <section id="differentiators" className="px-4 sm:px-6 py-20" style={{ background: "rgba(255,255,255,0.02)" }}>
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-2xl sm:text-3xl font-black mb-3">{cms.differentiators.title}</h2>
            </div>
            <div className="grid sm:grid-cols-2 gap-5">
              {cms.differentiators.items.map((item, i) => {
                const Icon = ICON_MAP[item.icon] ?? Sparkles;
                const color = [TEAL, ORANGE, "#7C6FCD", "#E85D75"][i % 4];
                return (
                  <div key={i} className="rounded-2xl p-6 flex gap-4"
                       style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                         style={{ backgroundColor: `${color}1A` }}>
                      <Icon style={{ color, width: 22, height: 22 }} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold mb-2">{item.title}</h3>
                      <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.55)" }}>
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

      {/* ── STATS ───────────────────────────────────────────────────────── */}
      {cms.sections.stats && visibleStatsCount > 0 && (
        <section className="px-4 sm:px-6 py-16">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-xl sm:text-2xl font-bold" style={{ color: "rgba(255,255,255,0.85)" }}>
                {cms.stats.title}
              </h2>
            </div>
            <div className={`grid gap-4`}
                 style={{ gridTemplateColumns: `repeat(${Math.min(visibleStatsCount, 4)}, minmax(0, 1fr))` }}>
              {renderStat({ ...cms.stats.students,    label: cms.stats.students.label    }, "#E85D75", Heart)}
              {renderStat({ ...cms.stats.teachers,    label: cms.stats.teachers.label    }, "#7C6FCD", BookOpen)}
              {renderStat({ ...cms.stats.programs,    label: cms.stats.programs.label    }, ORANGE,    GraduationCap)}
              {renderStat({ ...cms.stats.satisfaction, label: cms.stats.satisfaction.label}, TEAL,     Users)}
            </div>
          </div>
        </section>
      )}

      {/* ── PROGRAMS + AVAILABLE GROUPS ─────────────────────────────────── */}
      {cms.sections.programs && (
        <section id="programs" className="px-4 sm:px-6 py-20">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <span className="inline-block text-xs font-bold px-4 py-1.5 rounded-full mb-4"
                    style={{ backgroundColor: `${ORANGE}1A`, color: ORANGE, border: `1px solid ${ORANGE}40` }}>
                البرامج
              </span>
              <h2 className="text-2xl sm:text-3xl font-black mb-3">برامجنا التعليمية</h2>
              <p className="text-base" style={{ color: "rgba(255,255,255,0.55)" }}>
                مستويات مُصمَّمة للأطفال من 7 إلى 13 سنة — من المُبتدئ إلى المُتقدِّم
              </p>
            </div>

            {levels.length === 0 ? (
              <div className="text-center text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
                البرامج قيد التحديث — تواصل معنا للاستفسار
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {levels.map((lv: any, i: number) => {
                  const Icon  = LEVEL_ICONS[i % LEVEL_ICONS.length];
                  const color = LEVEL_COLORS[i % LEVEL_COLORS.length];
                  const availableGroups: any[] = lv.groups ?? [];
                  const desc = lv.landingDescription || lv.descriptionAr || lv.description;
                  return (
                    <div key={lv.id} className="rounded-2xl p-6 flex flex-col gap-3"
                         style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                             style={{ backgroundColor: `${color}20` }}>
                          <Icon style={{ color, width: 20, height: 20 }} />
                        </div>
                        {lv.price && (
                          <div className="text-sm font-bold px-3 py-1 rounded-full"
                               style={{ backgroundColor: `${color}15`, color }}>
                            {Number(lv.price).toLocaleString("fr-DZ")} د.ج / حصة
                          </div>
                        )}
                      </div>
                      <h3 className="text-lg font-bold">{lv.nameAr || lv.name}</h3>
                      {desc && (
                        <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.5)" }}>
                          {desc}
                        </p>
                      )}
                      <div className="flex gap-4 mt-1">
                        {lv.durationWeeks && (
                          <div className="flex items-center gap-1 text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                            <Clock className="w-3.5 h-3.5" />{lv.durationWeeks} أسبوع
                          </div>
                        )}
                        {lv.sessionsPerWeek && (
                          <div className="flex items-center gap-1 text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                            <BookOpen className="w-3.5 h-3.5" />{lv.sessionsPerWeek} حصة/أسبوع
                          </div>
                        )}
                      </div>

                      {availableGroups.length > 0 && (
                        <div className="mt-1 space-y-1.5">
                          <p className="text-xs font-semibold" style={{ color: "rgba(255,255,255,0.35)" }}>
                            الأفواج المتاحة ({availableGroups.length})
                          </p>
                          {availableGroups.map((g: any) => (
                            <PublicGroupCard key={g.id} group={g} accent={color} />
                          ))}
                        </div>
                      )}
                      {availableGroups.length === 0 && (
                        <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.3)" }}>
                          لا توجد أفواج مفتوحة حالياً — سَجِّل اهتمامك وسَنتواصل معك عند فتح فوج جديد
                        </p>
                      )}
                      <button
                        onClick={() => scrollTo("register")}
                        className="mt-2 w-full py-2.5 rounded-full text-sm font-bold transition-opacity"
                        style={{ backgroundColor: `${color}18`, color, border: `1px solid ${color}40` }}
                      >
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

      {/* ── TESTIMONIALS ────────────────────────────────────────────────── */}
      {cms.sections.testimonials && cms.testimonials.items.length > 0 && (
        <section className="px-4 sm:px-6 py-20" style={{ background: "rgba(255,255,255,0.02)" }}>
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <span className="inline-block text-xs font-bold px-4 py-1.5 rounded-full mb-4"
                    style={{ backgroundColor: `${TEAL}1A`, color: TEAL, border: `1px solid ${TEAL}40` }}>
                آراء الأولياء
              </span>
              <h2 className="text-2xl sm:text-3xl font-black">{cms.testimonials.title}</h2>
            </div>
            <div className="grid md:grid-cols-3 gap-5">
              {cms.testimonials.items.map((tt, i) => (
                <div key={i} className="rounded-2xl p-6 flex flex-col gap-3"
                     style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <Stars n={tt.rating} />
                  <p className="text-sm leading-relaxed flex-1" style={{ color: "rgba(255,255,255,0.7)" }}>
                    "{tt.quote}"
                  </p>
                  <div className="pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                    <div className="text-sm font-bold">{tt.name}</div>
                    <div className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>{tt.relation}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── GALLERY (only when images exist) ────────────────────────────── */}
      {cms.sections.gallery && cms.gallery.images.length > 0 && (
        <section className="px-4 sm:px-6 py-20">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-2xl sm:text-3xl font-black">{cms.gallery.title}</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {cms.gallery.images.map((src, i) => (
                <div key={i} className="rounded-xl overflow-hidden"
                     style={{ border: "1px solid rgba(255,255,255,0.08)", aspectRatio: "1 / 1" }}>
                  <img src={src} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── CTA BANNER ──────────────────────────────────────────────────── */}
      {cms.sections.ctaBanner && (
        <section className="px-4 sm:px-6 py-16">
          <div className="max-w-4xl mx-auto rounded-3xl p-8 sm:p-12 text-center relative overflow-hidden"
               style={{ background: `linear-gradient(135deg, ${NAVY_DEEP} 0%, ${NAVY} 100%)`,
                        border: `1px solid ${ORANGE}30` }}>
            <div className="absolute -top-10 -end-10 w-40 h-40 rounded-full opacity-30"
                 style={{ background: `radial-gradient(circle, ${ORANGE} 0%, transparent 70%)` }} />
            <h2 className="text-2xl sm:text-3xl font-black mb-3 relative">{cms.ctaBanner.title}</h2>
            <p className="text-base mb-6 max-w-xl mx-auto relative" style={{ color: "rgba(255,255,255,0.7)" }}>
              {cms.ctaBanner.subtitle}
            </p>
            <button onClick={() => scrollTo("register")}
                    className="px-8 py-3 text-base font-black rounded-full transition-transform hover:scale-105 relative"
                    style={{ backgroundColor: ORANGE, color: NAVY, boxShadow: `0 8px 24px ${ORANGE}40` }}>
              {cms.ctaBanner.buttonText}
            </button>
          </div>
        </section>
      )}

      {/* ── REGISTER FORM ───────────────────────────────────────────────── */}
      {cms.sections.register && (
        <section id="register" className="px-4 sm:px-6 py-20">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-10">
              <span className="inline-block text-xs font-bold px-4 py-1.5 rounded-full mb-4"
                    style={{ backgroundColor: `${ORANGE}1A`, color: ORANGE, border: `1px solid ${ORANGE}40` }}>
                التسجيل
              </span>
              <h2 className="text-2xl sm:text-3xl font-black mb-3">{cms.register.title}</h2>
              <p className="text-base" style={{ color: "rgba(255,255,255,0.55)" }}>{cms.register.subtitle}</p>
            </div>
            <div className="rounded-3xl p-6 sm:p-8 space-y-4"
                 style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="اسم الولي *" value={form.parentName}
                       onChange={v => setForm(f => ({ ...f, parentName: v }))}
                       placeholder="مثال: أحمد بوعلي" />
                <Field label="رقم الهاتف *" value={form.parentPhone}
                       onChange={v => setForm(f => ({ ...f, parentPhone: v }))}
                       placeholder="0555 123 456" />
              </div>
              <Field label="البريد الإلكتروني" value={form.parentEmail}
                     onChange={v => setForm(f => ({ ...f, parentEmail: v }))}
                     placeholder="example@email.com" type="email" />
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="اسم الطفل *" value={form.childName}
                       onChange={v => setForm(f => ({ ...f, childName: v }))}
                       placeholder="مثال: أميرة" />
                <Field label="سن الطفل" value={form.childAge}
                       onChange={v => setForm(f => ({ ...f, childAge: v }))}
                       placeholder="مثال: 8 سنوات" />
              </div>
              {levels.length > 0 && (
                <div>
                  <label className="block text-xs font-bold mb-1.5" style={{ color: "rgba(255,255,255,0.7)" }}>
                    المستوى المُفضَّل
                  </label>
                  <select value={form.preferredLevel}
                          onChange={e => setForm(f => ({ ...f, preferredLevel: e.target.value }))}
                          className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "white" }}>
                    <option value="" style={{ background: NAVY }}>اخترْ مستوى…</option>
                    {levels.map((lv: any) => (
                      <option key={lv.id} value={lv.nameAr || lv.name} style={{ background: NAVY }}>
                        {lv.nameAr || lv.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-xs font-bold mb-1.5" style={{ color: "rgba(255,255,255,0.7)" }}>
                  ملاحظات إضافية
                </label>
                <textarea value={form.notes}
                          onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                          rows={3}
                          placeholder="أيُّ معلومات تريد مشاركتها"
                          className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none"
                          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "white" }} />
              </div>
              <button onClick={handleSubmit} disabled={submitting}
                      className="w-full py-3.5 rounded-full text-base font-black transition-transform hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100"
                      style={{ backgroundColor: ORANGE, color: NAVY, boxShadow: `0 8px 24px ${ORANGE}40` }}>
                {submitting ? "جاري الإرسال…" : "إرسال الطلب"}
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ── FOOTER ──────────────────────────────────────────────────────── */}
      <footer className="px-4 sm:px-6 py-12" style={{ background: NAVY_DEEP, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-8">
          <div>
            <div className="text-2xl font-black mb-3">
              <span className="text-white">kid</span><span style={{ color: ORANGE }}>Speak</span>
            </div>
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>{cms.footer.tagline}</p>
          </div>
          <div>
            <h4 className="text-sm font-bold mb-3">روابط سريعة</h4>
            <ul className="space-y-2 text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
              <li><button onClick={() => scrollTo("programs")}>البرامج التعليمية</button></li>
              <li><button onClick={() => scrollTo("method")}>منهج التعليم</button></li>
              <li><button onClick={() => scrollTo("register")}>التسجيل</button></li>
              <li><button onClick={() => navigate("/login")}>دخول المنصة</button></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-bold mb-3">تواصل معنا</h4>
            <ul className="space-y-2 text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
              {school?.email && (
                <li className="flex items-center gap-2"><Mail className="w-3.5 h-3.5" /><span>{school.email}</span></li>
              )}
              {school?.phone && (
                <li className="flex items-center gap-2"><Phone className="w-3.5 h-3.5" /><span>{school.phone}</span></li>
              )}
              {school?.address && (
                <li className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5" /><span>{school.address}</span></li>
              )}
            </ul>
            <div className="flex gap-3 mt-4">
              {school?.instagram && (
                <a href={school.instagram} target="_blank" rel="noreferrer"
                   className="w-9 h-9 rounded-full flex items-center justify-center"
                   style={{ background: "rgba(255,255,255,0.05)" }}>
                  <Instagram className="w-4 h-4" />
                </a>
              )}
              {school?.facebook && (
                <a href={school.facebook} target="_blank" rel="noreferrer"
                   className="w-9 h-9 rounded-full flex items-center justify-center"
                   style={{ background: "rgba(255,255,255,0.05)" }}>
                  <Facebook className="w-4 h-4" />
                </a>
              )}
              {school?.youtube && (
                <a href={school.youtube} target="_blank" rel="noreferrer"
                   className="w-9 h-9 rounded-full flex items-center justify-center"
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

// ── Reusable form field ─────────────────────────────────────────────────────
function Field({ label, value, onChange, placeholder, type = "text" }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-bold mb-1.5" style={{ color: "rgba(255,255,255,0.7)" }}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
             placeholder={placeholder}
             className="w-full px-4 py-3 rounded-xl text-sm outline-none"
             style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "white" }} />
    </div>
  );
}

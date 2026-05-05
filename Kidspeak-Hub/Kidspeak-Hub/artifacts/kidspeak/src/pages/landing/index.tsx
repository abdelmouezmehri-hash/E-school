import { useState, useEffect, useRef } from "react";
import { useLanguage } from "@/contexts/language-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Globe, Phone, Mail, MapPin, Instagram, Facebook, Youtube,
  Check, ChevronDown, ArrowRight, Star, Shield, Zap, BookOpen,
  Mic, Eye, MessageCircle, Award, Users, BarChart3, Heart,
  GraduationCap, Brain, TrendingUp, AlertCircle, X, UserPlus,
  FlaskConical, ArrowRightCircle, Headphones, PenLine,
  Video, CalendarCheck, Smartphone, Timer, CheckCircle2, Lock,
} from "lucide-react";
import { useLocation } from "wouter";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from "recharts";

// ── Logo mark decoration ──────────────────────────────────────────────────────
// Mirrors the Kidspeak icon: filled amber circle + broadcast arcs
function KSMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 480 480" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="185" cy="265" r="160" fill="#F5A600" opacity="0.04" />
      <circle cx="185" cy="265" r="118" fill="#F5A600" opacity="0.07" />
      <circle cx="185" cy="265" r="78"  fill="#F5A600" opacity="0.13" />
      <circle cx="185" cy="265" r="48"  fill="#F5A600" opacity="0.22" />
      <path d="M 268 183 Q 322 265 268 347" stroke="#F5A600" strokeWidth="16" strokeLinecap="round" opacity="0.42" />
      <path d="M 308 147 Q 386 265 308 383" stroke="#F5A600" strokeWidth="13" strokeLinecap="round" opacity="0.28" />
      <path d="M 346 115 Q 450 265 346 415" stroke="#F5A600" strokeWidth="10" strokeLinecap="round" opacity="0.16" />
    </svg>
  );
}

// ── Animated counter ──────────────────────────────────────────────────────────
function Counter({ to, suffix = "" }: { to: number; suffix?: string }) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        let start = 0;
        const step = Math.ceil(to / 50);
        const t = setInterval(() => {
          start += step;
          if (start >= to) { setVal(to); clearInterval(t); } else setVal(start);
        }, 30);
        obs.disconnect();
      }
    });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [to]);
  return <span ref={ref}>{val}{suffix}</span>;
}

// ── Science methodology comparison chart ──────────────────────────────────────
const scienceData = [
  { month: 1,  tradGrammar: 18, tradSpeaking: 5,  ksSpeaking: 15, ksCommunication: 12 },
  { month: 2,  tradGrammar: 30, tradSpeaking: 6,  ksSpeaking: 28, ksCommunication: 24 },
  { month: 3,  tradGrammar: 42, tradSpeaking: 6,  ksSpeaking: 40, ksCommunication: 37 },
  { month: 4,  tradGrammar: 52, tradSpeaking: 7,  ksSpeaking: 53, ksCommunication: 50 },
  { month: 5,  tradGrammar: 60, tradSpeaking: 7,  ksSpeaking: 63, ksCommunication: 61 },
  { month: 6,  tradGrammar: 68, tradSpeaking: 8,  ksSpeaking: 72, ksCommunication: 70 },
  { month: 7,  tradGrammar: 74, tradSpeaking: 8,  ksSpeaking: 79, ksCommunication: 78 },
  { month: 8,  tradGrammar: 79, tradSpeaking: 8,  ksSpeaking: 84, ksCommunication: 83 },
  { month: 9,  tradGrammar: 82, tradSpeaking: 8,  ksSpeaking: 88, ksCommunication: 87 },
  { month: 10, tradGrammar: 85, tradSpeaking: 9,  ksSpeaking: 91, ksCommunication: 90 },
  { month: 11, tradGrammar: 86, tradSpeaking: 9,  ksSpeaking: 94, ksCommunication: 93 },
  { month: 12, tradGrammar: 87, tradSpeaking: 9,  ksSpeaking: 96, ksCommunication: 95 },
];

function ScienceChart({ isAr }: { isAr: boolean }) {
  const labels = {
    tradGrammar:     isAr ? "التعليم التقليدي — معرفة القواعد"  : "Conventional — Grammar Knowledge",
    tradSpeaking:    isAr ? "التعليم التقليدي — الثقة في الكلام" : "Conventional — Speaking Confidence",
    ksSpeaking:      isAr ? "كيدسبيك — الثقة في الكلام"         : "Kidspeak — Speaking Confidence",
    ksCommunication: isAr ? "كيدسبيك — القدرة التواصلية"        : "Kidspeak — Communication Ability",
    month:           isAr ? "الشهر" : "Month",
    score:           isAr ? "النتيجة (%)" : "Score (%)",
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-[#0a0f2e] border border-white/20 rounded-xl p-4 shadow-xl text-sm">
        <p className="text-white/60 font-semibold mb-2">{labels.month} {label}</p>
        {payload.map((entry: any, i: number) => (
          <div key={i} className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-white/80 text-xs">{entry.name}:</span>
            <span className="font-bold text-white text-xs">{entry.value}%</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div style={{ height: 320 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={scienceData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis
            dataKey="month"
            stroke="rgba(255,255,255,0.3)"
            tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 12 }}
            tickFormatter={(v) => `${isAr ? "ش" : "M"}${v}`}
            label={{ value: labels.month, position: "insideBottom", offset: -2, fill: "rgba(255,255,255,0.4)", fontSize: 11 }}
          />
          <YAxis
            stroke="rgba(255,255,255,0.3)"
            tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 11 }}
            tickFormatter={(v) => `${v}%`}
            domain={[0, 100]}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ paddingTop: "16px", fontSize: "11px" }}
            formatter={(value) => <span style={{ color: "rgba(255,255,255,0.6)", fontSize: "11px" }}>{value}</span>}
          />
          <Line type="monotone" dataKey="tradGrammar"     name={labels.tradGrammar}     stroke="#ef4444" strokeWidth={2} dot={false} strokeDasharray="6 3" />
          <Line type="monotone" dataKey="tradSpeaking"    name={labels.tradSpeaking}    stroke="#f87171" strokeWidth={2} dot={false} strokeDasharray="3 3" />
          <Line type="monotone" dataKey="ksSpeaking"      name={labels.ksSpeaking}      stroke="#F5A600" strokeWidth={3} dot={false} />
          <Line type="monotone" dataKey="ksCommunication" name={labels.ksCommunication} stroke="#60a5fa" strokeWidth={3} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Level card ─────────────────────────────────────────────────────────────────
interface Level { id: number; name: string; nameAr?: string | null; description?: string | null; descriptionAr?: string | null; price?: number; durationWeeks?: number; sessionsPerWeek?: number; }
// ── Main landing page ─────────────────────────────────────────────────────────
export default function LandingPage() {
  const { language, setLanguage, isRTL } = useLanguage();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const isAr = language === "ar";

  const [settings, setSettings]           = useState<any>(null);
  const [levels, setLevels]               = useState<Level[]>([]);
  const [cmsHero, setCmsHero]             = useState<any>(null);
  const [cmsTestimonials, setCmsTestimonials] = useState<any[]>([]);
  const [customPages, setCustomPages]     = useState<any[]>([]);
  const [cmsOpenDay, setCmsOpenDay]       = useState<any>(null);
  const [regSource, setRegSource]         = useState<string | null>(null);

  const [formData, setFormData] = useState({
    parentName: "", parentPhone: "", parentEmail: "",
    childName: "", childAge: "", preferredLevel: "", notes: "",
  });
  const [submitting, setSubmitting]   = useState(false);
  const [submitted, setSubmitted]     = useState(false);

  const [showRegModal, setShowRegModal]   = useState(false);
  const [regSubmitted, setRegSubmitted]   = useState(false);
  const [regSubmitting, setRegSubmitting] = useState(false);
  const [regForm, setRegForm] = useState({
    fullName: "", email: "", phone: "", whatsappPhone: "", address: "",
  });

  useEffect(() => {
    fetch("/api/public/settings")
      .then(r => r.ok ? r.json() : null)
      .then(s => s && setSettings(s))
      .catch(() => {});
    fetch("/api/public/levels")
      .then(r => r.ok ? r.json() : [])
      .then(setLevels)
      .catch(() => {});
    fetch("/api/public/cms/settings/hero")
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.data && Object.keys(d.data).length > 0) setCmsHero(d.data); })
      .catch(() => {});
    fetch("/api/public/cms/settings/testimonials")
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.data && Array.isArray(d.data) && d.data.length > 0) setCmsTestimonials(d.data); })
      .catch(() => {});
    fetch("/api/public/pages")
      .then(r => r.ok ? r.json() : [])
      .then(data => setCustomPages(Array.isArray(data) ? data : []))
      .catch(() => {});
    fetch("/api/public/cms/settings/open_day")
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.data && typeof d.data === "object" && !Array.isArray(d.data)) setCmsOpenDay(d.data); })
      .catch(() => {});
  }, []);

  const t = {
    en: {
      nav: { login: "Login", register: "Register", lang: "عربي" },
      hero: {
        badge: "Speaking-First Methodology",
        h1a: "Stop Studying English.",
        h1b: "Start Speaking It.",
        sub: "Kidspeak is Algeria's first school that teaches children English the natural way — through speaking, confidence, and joy.",
        cta1: "Register Your Child",
        cta2: "Login",
        scroll: "Discover the Method",
      },
      stats: { students: "Students Enrolled", sessions: "Sessions Completed", confidence: "Confidence Rate", levels: "Program Levels" },
      problem: {
        badge: "The Problem",
        title: "Most kids know English but are too afraid to speak.",
        sub: "Traditional schools teach grammar and vocabulary — but forget the most important skill: actually opening your mouth.",
        cards: [
          { icon: "😰", title: "Fear of mistakes", desc: "Kids study for years and still freeze when asked to speak." },
          { icon: "📚", title: "Grammar overload", desc: "Too much theory, not enough practice." },
          { icon: "🎯", title: "No real-world application", desc: "What's the point of knowing English if you can't use it?" },
        ],
      },
      method: {
        badge: "The Kidspeak Method",
        title: "Speaking-First. Always.",
        sub: "We follow the same path every human uses to learn their mother tongue.",
        steps: [
          { num: "01", icon: Mic,         label: "Hear",          desc: "Immersive listening to authentic English content.",         ar: "اسمع" },
          { num: "02", icon: Eye,         label: "Imitate",       desc: "Confident repetition without fear of judgment.",           ar: "قلّد" },
          { num: "03", icon: MessageCircle, label: "Speak",       desc: "Real conversations in a safe, encouraging space.",         ar: "تحدث" },
          { num: "04", icon: BookOpen,    label: "Read & Write",   desc: "Literacy builds naturally on a speaking foundation.",      ar: "اقرأ واكتب" },
        ],
      },
      usp: {
        badge: "Why Kidspeak?",
        title: "A system built for transformation.",
        cards: [
          { icon: Shield,     color: "#1B2E8F", title: "Confidence Compass",       desc: "Our psychologist Dr. Amina tracks each child's confidence weekly, breaking the fear barrier systematically." },
          { icon: Zap,        color: "#F5A600", title: "The Talk Show",            desc: "Every child becomes a star. Kids perform in real talk-show style productions to build public speaking confidence." },
          { icon: BarChart3,  color: "#0891b2", title: "Visual Learning Journey",  desc: "Parents see a real-time roadmap of their child's progress — from first word to fluent speaker." },
          { icon: Users,      color: "#059669", title: "Bilingual Parent Hub",     desc: "24/7 access to progress reports, session notes, evaluations and direct messaging with teachers." },
        ],
      },
      programs: {
        badge: "The Program",
        title: "4 Levels to Fluency",
        sub: "Each level is designed as an 8-week journey of transformation.",
        weeks: "weeks",
        sessions: "sessions/week",
        perMonth: "DZD / session",
        enrollBtn: "Enroll in This Level",
        defaultDesc: ["Foundation — Listening & Basic Sounds", "Discovery — Core Vocabulary & Phrases", "Expression — Real Conversations", "Mastery — Fluency & Public Speaking"],
      },
      transparency: {
        badge: "Kidspeak Transparency Window",
        title: "Your Child's World on Your Phone",
        sub: "Every parent deserves total visibility — not just a grade at the end of the term.",
        phone: {
          headline: "The Parent Dashboard",
          items: [
            { icon: "eye",      label: "Psychological Eyes",      desc: "See the behavioral notes Dr. Amina writes after every session." },
            { icon: "video",    label: "The Talk Show Archive",   desc: "Watch every video of your child speaking English from Day 1 to graduation." },
            { icon: "calendar", label: "Real-Time Attendance",    desc: "Track attendance and progress with total transparency." },
          ],
        },
        guarantees: {
          badge: "Kidspeak Triple Guarantee",
          title: "We Don't Just Teach. We Promise.",
          items: [
            { icon: "shield", tag: "NO SHYNESS",       title: "Fear-Free in 4 Sessions",          desc: "Within 4 sessions, your child will break the fear barrier. If not, we provide additional 1-on-1 support at no extra cost." },
            { icon: "mic",    tag: "NATURAL FLUENCY",  title: "Real Expression, Not Robots",      desc: "No robotic memorization. Your child will use English to express their real feelings and ideas — the way humans were meant to." },
            { icon: "brain",  tag: "BEYOND ENGLISH",   title: "A Sharper Mind Overall",           desc: "Better focus in other school subjects and stronger social leadership skills that last a lifetime." },
          ],
        },
        rule: {
          badge: "The 15-Minute Rule",
          title: "The Kidspeak 15-Minute Magic",
          desc: "In every session, your child is guaranteed at least 15 minutes of active, high-quality individual speaking time.",
          compare: "Compare this to the 30 seconds they get in traditional schools!",
          us: "15 min", them: "30 sec",
          usLabel: "Kidspeak — Per Child", themLabel: "Traditional School — Per Child",
        },
      },
      testimonials: {
        badge: "Parent Reviews",
        title: "What our parents say",
        items: [
          { name: "Nour's Mother",  text: "After just 3 months at Kidspeak, my daughter speaks English without hesitation. The confidence transformation is unbelievable.", stars: 5 },
          { name: "Yacine's Father", text: "I love the parent portal. I can see exactly what my son is working on and watch his progress every week.", stars: 5 },
          { name: "Amira's Mother", text: "The psychologist's involvement is what makes Kidspeak different. My shy daughter is now a star in class!", stars: 5 },
        ],
      },
      enroll: {
        badge: "Get Started",
        title: "Register Your Child Today",
        sub: "Fill in the form below and our team will contact you within 24 hours to arrange a free assessment session.",
        labels: {
          parentName: "Parent Name *", parentPhone: "Phone Number *", parentEmail: "Email Address",
          childName: "Child's Name *", childAge: "Child's Age", preferredLevel: "Preferred Level",
          notes: "Additional Notes", submit: "Send Registration",
        },
        ageOptions: ["5–6 years", "7–8 years", "9–10 years", "11–12 years", "13+ years"],
        success: "Your request has been received! We'll contact you within 24 hours.",
      },
      footer: { rights: "All rights reserved.", contact: "Contact Us" },
      reg: {
        title: "Join Kidspeak as a Parent",
        subtitle: "Submit your details and our team will review your request and send you login credentials within 24 hours.",
        fullName: "Full Name *", email: "Email Address *", phone: "Primary Phone Number *",
        whatsappPhone: "WhatsApp Number", address: "Home Address", submit: "Send Registration Request",
        successTitle: "Request Submitted! 🎉",
        successMsg: "Thank you! Your request has been sent to the administration. We will contact you shortly with your login credentials.",
        successBtn: "Close",
        placeholders: {
          fullName: "e.g. Ahmed Benali", email: "your@email.com",
          phone: "0555 123 456", whatsappPhone: "0555 123 456 (if different)", address: "Neighbourhood, City",
        },
      },
    },
    ar: {
      nav: { login: "دخول", register: "تسجيل", lang: "English" },
      hero: {
        badge: "منهج التحدث أولاً",
        h1a: "توقف عن دراسة الإنجليزية..",
        h1b: "ابدأ بالتحدث بها.",
        sub: "كيدسبيك أول مدرسة في الجزائر تُعلّم الأطفال الإنجليزية بالطريقة الطبيعية — عبر التحدث والثقة والمتعة.",
        cta1: "سجّل طفلك",
        cta2: "دخول",
        scroll: "اكتشف الطريقة",
      },
      stats: { students: "طالب مسجّل", sessions: "حصة مكتملة", confidence: "نسبة الثقة", levels: "مستويات البرنامج" },
      problem: {
        badge: "المشكلة",
        title: "معظم الأطفال يعرفون الإنجليزية لكنهم يخافون من التحدث بها.",
        sub: "المدارس التقليدية تُعلّم القواعد والمفردات — لكنها تنسى أهم مهارة: فتح الفم والكلام.",
        cards: [
          { icon: "😰", title: "الخوف من الأخطاء",       desc: "يدرس الأطفال لسنوات ويتجمدون عند طلب الكلام." },
          { icon: "📚", title: "حمل القواعد الزائد",      desc: "نظرية كثيرة وتطبيق قليل." },
          { icon: "🎯", title: "لا تطبيق في الواقع",      desc: "ما فائدة معرفة الإنجليزية إن لم تستطع استخدامها؟" },
        ],
      },
      method: {
        badge: "منهج كيدسبيك",
        title: "التحدث أولاً. دائماً.",
        sub: "نتبع نفس المسار الذي يستخدمه كل إنسان لتعلم لغته الأم.",
        steps: [
          { num: "01", icon: Mic,          label: "اسمع",       desc: "الاستماع المكثف إلى المحتوى الإنجليزي الأصيل.",           ar: "Hear" },
          { num: "02", icon: Eye,          label: "قلّد",       desc: "التكرار بثقة دون خوف من الحكم.",                         ar: "Imitate" },
          { num: "03", icon: MessageCircle, label: "تحدث",      desc: "محادثات حقيقية في بيئة آمنة وداعمة.",                    ar: "Speak" },
          { num: "04", icon: BookOpen,     label: "اقرأ واكتب", desc: "تبني محو الأمية بشكل طبيعي على أساس التحدث.",           ar: "Read & Write" },
        ],
      },
      usp: {
        badge: "لماذا كيدسبيك؟",
        title: "نظام مصمم للتحول.",
        cards: [
          { icon: Shield,    color: "#1B2E8F", title: "بوصلة الثقة",           desc: "الدكتورة أمينة تتابع ثقة كل طفل أسبوعياً وتكسر حاجز الخوف بمنهجية." },
          { icon: Zap,       color: "#F5A600", title: "برنامج النجوم",          desc: "كل طفل يصبح نجماً. يؤدي الأطفال عروضاً بأسلوب برامج حوارية لبناء ثقتهم." },
          { icon: BarChart3, color: "#0891b2", title: "خريطة التعلم المرئية",  desc: "يرى الوالدان خريطة مباشرة لتقدم طفلهما — من أول كلمة حتى الطلاقة." },
          { icon: Users,     color: "#059669", title: "بوابة الوالدين ثنائية اللغة", desc: "وصول على مدار الساعة لتقارير التقدم وملاحظات الجلسات والتقييمات." },
        ],
      },
      programs: {
        badge: "البرنامج",
        title: "٤ مستويات نحو الطلاقة",
        sub: "كل مستوى مصمم كرحلة تحول مدتها ٨ أسابيع.",
        weeks: "أسبوع",
        sessions: "حصص/أسبوع",
        perMonth: "دج / حصة",
        enrollBtn: "التسجيل في هذا المستوى",
        defaultDesc: ["الأساس — الاستماع والأصوات الأولى", "الاكتشاف — المفردات والعبارات الأساسية", "التعبير — محادثات حقيقية", "الإتقان — الطلاقة والخطابة العامة"],
      },
      transparency: {
        badge: "نافذة الشفافية المطلقة",
        title: "عالم طفلك في هاتفك",
        sub: "كل ولي أمر يستحق رؤية كاملة — لا مجرد نقطة في نهاية الفصل.",
        phone: {
          headline: "لوحة تحكم ولي الأمر",
          items: [
            { icon: "eye",      label: "عين الأخصائية",   desc: "شاهد الملاحظات السلوكية التي تكتبها الدكتورة أمينة بعد كل حصة." },
            { icon: "video",    label: "أرشيف النجوم",     desc: "شاهد كل فيديوهات طفلك وهو يتحدث الإنجليزية من اليوم الأول وحتى التخرج." },
            { icon: "calendar", label: "خريطة الانضباط",  desc: "تابع الحضور والتقدم بكل شفافية وفي الوقت الفعلي." },
          ],
        },
        guarantees: {
          badge: "وعود كيدسبيك الثلاثة",
          title: "لا نُعلِّم فحسب — نعد.",
          items: [
            { icon: "shield", tag: "لا خجل بعد اليوم", title: "تجاوز حاجز الخوف في ٤ حصص",    desc: "خلال ٤ حصص، سيكسر طفلك حاجز الخوف. وإن لم يحدث، نقدم دعمًا فرديًا إضافيًا مجانًا." },
            { icon: "mic",    tag: "طلاقة طبيعية",     title: "تعبير حقيقي، لا حفظ آلي",      desc: "لا حفظ آلي. سيستخدم طفلك الإنجليزية للتعبير عن مشاعره وأفكاره الحقيقية." },
            { icon: "brain",  tag: "أكثر من لغة",      title: "عقل أحدّ في كل المواد",         desc: "تحسّن في التركيز في بقية المواد الدراسية ومهارات القيادة الاجتماعية." },
          ],
        },
        rule: {
          badge: "قاعدة الـ ١٥ دقيقة",
          title: "سحر الـ ١٥ دقيقة في كيدسبيك",
          desc: "في كل حصة، نضمن لطفلك ١٥ دقيقة على الأقل من التحدث الفردي النشط عالي الجودة.",
          compare: "قارن هذا بـ ٣٠ ثانية فقط يحصل عليها في المدارس التقليدية!",
          us: "١٥ د", them: "٣٠ ث",
          usLabel: "كيدسبيك — لكل طفل", themLabel: "المدرسة التقليدية — لكل طفل",
        },
      },
      testimonials: {
        badge: "آراء الآباء",
        title: "ماذا يقول أولياء الأمور",
        items: [
          { name: "والدة نور",   text: "بعد ثلاثة أشهر فقط في كيدسبيك، ابنتي تتحدث الإنجليزية بلا تردد. التحول في الثقة لا يصدَّق.", stars: 5 },
          { name: "والد ياسين", text: "أحب بوابة الوالدين. أرى بالضبط ما يتعلمه ابني وأتابع تقدمه كل أسبوع.", stars: 5 },
          { name: "والدة أميرة", text: "مشاركة الأخصائية النفسية هي ما يجعل كيدسبيك مختلفة. ابنتي الخجولة أصبحت نجمة الفصل!", stars: 5 },
        ],
      },
      enroll: {
        badge: "ابدأ الآن",
        title: "سجّل طفلك اليوم",
        sub: "أملأ النموذج أدناه وسيتواصل معك فريقنا خلال ٢٤ ساعة لتحديد موعد جلسة تقييم مجانية.",
        labels: {
          parentName: "اسم ولي الأمر *", parentPhone: "رقم الهاتف *", parentEmail: "البريد الإلكتروني",
          childName: "اسم الطفل *", childAge: "عمر الطفل", preferredLevel: "المستوى المفضّل",
          notes: "ملاحظات إضافية", submit: "إرسال الطلب",
        },
        ageOptions: ["٥–٦ سنوات", "٧–٨ سنوات", "٩–١٠ سنوات", "١١–١٢ سنة", "١٣ سنة فأكثر"],
        success: "تم استلام طلبك! سنتواصل معك خلال ٢٤ ساعة.",
      },
      footer: { rights: "جميع الحقوق محفوظة.", contact: "اتصل بنا" },
      reg: {
        title: "انضم إلى كيدسبيك كوليّ أمر",
        subtitle: "أرسل بياناتك وسيراجع فريقنا طلبك ويرسل لك بيانات الدخول خلال ٢٤ ساعة.",
        fullName: "الاسم الكامل *", email: "البريد الإلكتروني *", phone: "رقم الهاتف الأساسي *",
        whatsappPhone: "رقم واتساب", address: "العنوان", submit: "إرسال طلب الانضمام",
        successTitle: "تم إرسال الطلب! 🎉",
        successMsg: "شكراً لك! لقد أُرسل طلبك إلى الإدارة. سنتواصل معك قريباً ونمنحك بيانات الدخول.",
        successBtn: "إغلاق",
        placeholders: {
          fullName: "مثال: أحمد بن علي", email: "بريدك@مثال.com",
          phone: "0555 123 456", whatsappPhone: "0555 123 456 (إن اختلف)", address: "الحي، المدينة",
        },
      },
    },
  };

  const txt = isAr ? t.ar : t.en;
  // Heading font: Bricolage Grotesque for EN (distinctive, editorial), Cairo for AR
  const hf = isAr ? "'Cairo', sans-serif" : "'Bricolage Grotesque', sans-serif";

  const handleRegSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regForm.fullName || !regForm.email || !regForm.phone) return;
    setRegSubmitting(true);
    try {
      const res = await fetch("/api/public/registration-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...regForm, ...(regSource ? { source: regSource } : {}) }),
      });
      const data = await res.json();
      if (res.ok) {
        setRegSubmitted(true);
      } else if (res.status === 409) {
        toast({ title: isAr ? "يوجد طلب بهذا البريد الإلكتروني مسبقاً." : "A request with this email already exists.", variant: "destructive" });
      } else {
        toast({ title: data.error || (isAr ? "حدث خطأ. حاول مجدداً." : "Error. Please try again."), variant: "destructive" });
      }
    } catch {
      toast({ title: isAr ? "خطأ في الشبكة. حاول مجدداً." : "Network error. Please try again.", variant: "destructive" });
    } finally {
      setRegSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.parentName || !formData.parentPhone || !formData.childName) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/public/enquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setSubmitted(true);
        setFormData({ parentName: "", parentPhone: "", parentEmail: "", childName: "", childAge: "", preferredLevel: "", notes: "" });
        toast({ title: txt.enroll.success });
      } else {
        toast({ title: "Error submitting. Please try again.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Network error. Please try again.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div
      dir={isRTL ? "rtl" : "ltr"}
      className="min-h-screen overflow-x-hidden"
      style={{ fontFamily: isAr ? "'Cairo', sans-serif" : "'Plus Jakarta Sans', sans-serif" }}
    >
      {/* ══════ NAV ══════════════════════════════════════════════════════════════ */}
      <nav
        className="fixed top-0 inset-x-0 z-50"
        style={{ background: "rgba(13,26,92,0.97)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(245,166,0,0.12)" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <a href="/" className="flex items-center gap-2.5 shrink-0">
            {settings?.logoWhiteUrl ? (
              <img src={`/api/storage/public-objects/${settings.logoWhiteUrl}`} alt="Kidspeak" className="h-9 object-contain" />
            ) : (
              <span className="font-black text-xl text-white tracking-tight" style={{ fontFamily: hf }}>
                kid<span style={{ color: "#F5A600" }}>speak</span>
              </span>
            )}
          </a>

          <div className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => setLanguage(isAr ? "en" : "ar")}
              className="flex items-center gap-1.5 text-white/60 hover:text-white text-xs px-2.5 py-1.5 rounded-lg hover:bg-white/8 transition-colors"
            >
              <Globe className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{txt.nav.lang}</span>
            </button>
            <button
              onClick={() => setLocation("/login")}
              className="text-white/70 hover:text-white text-sm px-3 py-1.5 rounded-lg hover:bg-white/8 transition-colors"
            >
              {txt.nav.login}
            </button>
            <button
              onClick={() => { setRegSource(null); setShowRegModal(true); setRegSubmitted(false); setRegForm({ fullName: "", email: "", phone: "", whatsappPhone: "", address: "" }); }}
              className="font-bold text-sm px-5 py-2 rounded-full transition-all hover:scale-105 active:scale-95"
              style={{ backgroundColor: "#F5A600", color: "#1B2E8F" }}
            >
              {txt.nav.register}
            </button>
          </div>
        </div>
      </nav>

      {/* ══════ OPEN DAY BANNER (conditional) ════════════════════════════════════ */}
      {cmsOpenDay?.enabled && (
        <section id="open-day" className="relative overflow-hidden pt-16" style={{ background: "linear-gradient(135deg, #080F3C 0%, #0D1A5C 60%, #080F3C 100%)" }}>
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute top-0 end-0 w-[500px] h-[500px] rounded-full opacity-8" style={{ background: "radial-gradient(circle, #F5A600, transparent)", transform: "translate(30%, -30%)" }} />
            {[
              { top: "15%", left: "8%",  bg: "#F5A600", size: 8 },
              { top: "25%", left: "90%", bg: "#F5A600", size: 6 },
              { top: "60%", left: "5%",  bg: "#1B2E8F", size: 10 },
              { top: "70%", left: "85%", bg: "#ffffff", size: 5 },
            ].map((dot, i) => (
              <div key={i} className="absolute rounded-full opacity-50" style={{ top: dot.top, left: dot.left, width: dot.size, height: dot.size, backgroundColor: dot.bg }} />
            ))}
          </div>

          <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-black mb-6 animate-pulse" style={{ backgroundColor: "#F5A600", color: "#1B2E8F" }}>
                <span className="w-2 h-2 rounded-full bg-[#1B2E8F] inline-block" />
                {isAr ? "🎉 اليوم المفتوح — الآن!" : "🎉 OPEN DAY — TODAY!"}
              </div>
              <h1 className="text-3xl sm:text-5xl font-black text-white mb-4 leading-tight" style={{ fontFamily: hf }}>
                {isAr ? (cmsOpenDay.greetingAr || "مرحباً بكم في اليوم المفتوح لكيدسبيك!") : (cmsOpenDay.greetingEn || "Welcome to Kidspeak Open Day!")}
              </h1>
              <p className="text-lg sm:text-xl text-white/75 max-w-2xl mx-auto leading-relaxed">
                {isAr ? "نحن اليوم لا نريك مدرسة، بل نريك مستقبل طفلك الواثق." : "Today, we don't just show you a school; we show you your child's future confidence."}
              </p>
            </div>

            <div className="flex flex-col lg:flex-row gap-6 items-stretch">
              <div className="flex-1 rounded-3xl p-8 text-center" style={{ background: "linear-gradient(135deg, #F5A600 0%, #e09300 100%)", boxShadow: "0 20px 60px rgba(245,166,0,0.4)" }}>
                <p className="text-[#1B2E8F] text-xs font-black uppercase tracking-widest mb-3">
                  {isAr ? "عرض اليوم المفتوح الحصري" : "OPEN DAY EXCLUSIVE"}
                </p>
                <div className="text-[#1B2E8F] font-black mb-2" style={{ fontSize: "clamp(3rem, 10vw, 5rem)", lineHeight: 1, fontFamily: hf }}>
                  {cmsOpenDay.discount ?? 20}%
                </div>
                <p className="text-[#1B2E8F] font-black text-xl mb-1">{isAr ? "خصم" : "OFF"}</p>
                <p className="text-[#1B2E8F]/80 text-sm font-semibold mb-6">
                  {isAr ? (cmsOpenDay.discountDescAr || "للتسجيلات المقدمة اليوم فقط!") : (cmsOpenDay.discountDescEn || "For registrations made today only!")}
                </p>
                <button
                  onClick={() => { setRegSource("open_day"); setShowRegModal(true); setRegSubmitted(false); setRegForm({ fullName: "", email: "", phone: "", whatsappPhone: "", address: "" }); }}
                  className="w-full py-4 rounded-2xl font-black text-base transition-all hover:scale-105 active:scale-95"
                  style={{ backgroundColor: "#1B2E8F", color: "white", boxShadow: "0 8px 20px rgba(27,46,143,0.4)" }}
                >
                  {isAr ? (cmsOpenDay.ctaTextAr || "احصل على خصمي الآن") : (cmsOpenDay.ctaTextEn || "Claim My Discount Now")} →
                </button>
              </div>

              <div className="flex-1 rounded-3xl overflow-hidden border-2 border-white/15 flex items-center justify-center min-h-[200px]"
                style={{ background: "rgba(255,255,255,0.04)" }}>
                <div className="text-center p-6">
                  <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white/20"
                    style={{ backgroundColor: "rgba(245,166,0,0.15)" }}>
                    <Video className="w-10 h-10 text-white/50" />
                  </div>
                  <p className="text-white/40 text-sm">{isAr ? "معرض الصور والفيديوهات" : "Gallery & Videos"}</p>
                </div>
              </div>
            </div>

            <p className="text-center text-white/35 text-xs mt-10">
              {isAr ? "↓ اكتشف المزيد عن كيدسبيك أدناه" : "↓ Discover more about Kidspeak below"}
            </p>
          </div>
        </section>
      )}

      {/* ══════ HERO ═════════════════════════════════════════════════════════════ */}
      <section
        className="relative min-h-screen flex items-center overflow-hidden"
        style={{ background: "#FFFBF0" }}
      >
        {/* Warm amber ambient — bottom-left */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 60% 50% at 8% 92%, rgba(245,166,0,0.12) 0%, transparent 65%)" }}
        />
        {/* Soft navy tint — top-right */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 50% 55% at 92% 8%, rgba(27,46,143,0.06) 0%, transparent 65%)" }}
        />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full pt-16">
          <div className="grid lg:grid-cols-[56fr_44fr] gap-10 lg:gap-20 items-center min-h-[calc(100vh-64px)] py-20 lg:py-0">

            {/* ── LEFT: copy ── */}
            <div className={isRTL ? "text-right" : ""}>
              {/* Badge */}
              <div
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold mb-8"
                style={{ backgroundColor: "#F5A600", color: "#1B2E8F" }}
              >
                <Zap className="w-4 h-4 shrink-0" />
                {isAr ? (cmsHero?.badgeAr || txt.hero.badge) : (cmsHero?.badgeEn || txt.hero.badge)}
              </div>

              {/* Headline */}
              <h1 className="mb-6" style={{ fontFamily: hf, lineHeight: 1.0 }}>
                {cmsHero ? (
                  <span className="block" style={{ fontSize: "clamp(2.8rem, 6.5vw, 5.5rem)", fontWeight: 900, color: "#0D1A5C" }}>
                    {isAr ? (cmsHero.h1Ar || txt.hero.h1a + " " + txt.hero.h1b) : (cmsHero.h1En || txt.hero.h1a + " " + txt.hero.h1b)}
                  </span>
                ) : isAr ? (
                  <>
                    <span className="block" style={{ fontSize: "clamp(2.5rem, 5.5vw, 4.8rem)", fontWeight: 800, color: "rgba(13,26,92,0.30)", lineHeight: 1.1 }}>{txt.hero.h1a}</span>
                    <span className="block" style={{ fontSize: "clamp(2.8rem, 6.5vw, 5.5rem)", fontWeight: 900, color: "#F5A600", lineHeight: 1.0 }}>{txt.hero.h1b}</span>
                  </>
                ) : (
                  <>
                    <span className="block" style={{ fontSize: "clamp(2.3rem, 5vw, 4.4rem)", fontWeight: 800, color: "rgba(13,26,92,0.28)", lineHeight: 1.1 }}>Stop Studying</span>
                    <span className="block" style={{ fontSize: "clamp(2.8rem, 6.5vw, 5.5rem)", fontWeight: 900, color: "#0D1A5C", lineHeight: 1.0 }}>English.</span>
                    <span className="block" style={{ fontSize: "clamp(2.8rem, 6.5vw, 5.5rem)", fontWeight: 900, color: "#F5A600", lineHeight: 1.0 }}>Start Speaking It.</span>
                  </>
                )}
              </h1>

              <p className="text-lg leading-relaxed mb-10 max-w-lg" style={{ color: "rgba(13,26,92,0.55)" }}>
                {isAr ? (cmsHero?.subtitleAr || txt.hero.sub) : (cmsHero?.subtitleEn || txt.hero.sub)}
              </p>

              {/* CTAs */}
              <div className="flex flex-wrap gap-4">
                <button
                  onClick={() => { setRegSource(null); setShowRegModal(true); setRegSubmitted(false); setRegForm({ fullName: "", email: "", phone: "", whatsappPhone: "", address: "" }); }}
                  className="group inline-flex items-center gap-2.5 font-black text-base rounded-full transition-all hover:scale-105 active:scale-95"
                  style={{ backgroundColor: "#F5A600", color: "#1B2E8F", padding: "15px 36px", boxShadow: "0 8px 28px rgba(245,166,0,0.32)" }}
                >
                  {txt.hero.cta1}
                  <ArrowRight className={`w-5 h-5 transition-transform group-hover:translate-x-1 ${isRTL ? "rotate-180" : ""}`} />
                </button>
                <button
                  onClick={() => setLocation("/login")}
                  className="inline-flex items-center gap-2 font-semibold text-base rounded-full border-2 transition-all hover:bg-[#1B2E8F]/5"
                  style={{ borderColor: "rgba(27,46,143,0.22)", color: "#1B2E8F", padding: "13px 30px" }}
                >
                  {txt.hero.cta2}
                </button>
              </div>

              <button
                onClick={() => scrollTo("problem")}
                className="mt-12 flex items-center gap-2 transition-colors text-sm"
                style={{ color: "rgba(13,26,92,0.30)" }}
              >
                <span>{txt.hero.scroll}</span>
                <ChevronDown className="w-4 h-4 animate-bounce" />
              </button>
            </div>

            {/* ── RIGHT: icon + floating cards (desktop only) ── */}
            <div className="hidden lg:flex items-center justify-center relative">
              <div className="relative w-[420px] h-[420px]">

                {/* Kidspeak icon — optimised for cream background */}
                <svg viewBox="0 0 480 480" className="absolute inset-0 w-full h-full" fill="none">
                  <circle cx="185" cy="265" r="165" fill="#1B2E8F" opacity="0.04" />
                  <circle cx="185" cy="265" r="122" fill="#1B2E8F" opacity="0.06" />
                  <circle cx="185" cy="265" r="82"  fill="#1B2E8F" opacity="0.09" />
                  <circle cx="185" cy="265" r="50"  fill="#F5A600" opacity="0.70" />
                  <circle cx="185" cy="265" r="18"  fill="#1B2E8F" opacity="0.55" />
                  <path d="M 268 183 Q 322 265 268 347" stroke="#F5A600" strokeWidth="18" strokeLinecap="round" opacity="0.85" />
                  <path d="M 308 147 Q 386 265 308 383" stroke="#F5A600" strokeWidth="14" strokeLinecap="round" opacity="0.50" />
                  <path d="M 346 115 Q 450 265 346 415" stroke="#F5A600" strokeWidth="10" strokeLinecap="round" opacity="0.26" />
                </svg>

                {/* Floating card — confidence */}
                <div
                  className="absolute top-8 right-[-16px] rounded-2xl px-4 py-3 text-center"
                  style={{ background: "white", border: "1px solid rgba(27,46,143,0.09)", boxShadow: "0 10px 28px rgba(27,46,143,0.10)", minWidth: "130px" }}
                >
                  <div className="font-black leading-none mb-0.5" style={{ fontSize: "2rem", color: "#F5A600", fontFamily: hf }}>
                    <Counter to={94} suffix="%" />
                  </div>
                  <p className="text-xs" style={{ color: "rgba(13,26,92,0.45)" }}>{txt.stats.confidence}</p>
                </div>

                {/* Floating card — students */}
                <div
                  className="absolute bottom-14 left-[-12px] rounded-2xl px-4 py-3 text-center"
                  style={{ background: "white", border: "1px solid rgba(27,46,143,0.09)", boxShadow: "0 10px 28px rgba(27,46,143,0.10)", minWidth: "130px" }}
                >
                  <div className="font-black leading-none mb-0.5" style={{ fontSize: "2rem", color: "#F5A600", fontFamily: hf }}>
                    <Counter to={120} suffix="+" />
                  </div>
                  <p className="text-xs" style={{ color: "rgba(13,26,92,0.45)" }}>{txt.stats.students}</p>
                </div>

                {/* Floating card — parent voice */}
                <div
                  className="absolute bottom-[-18px] right-[10px] rounded-2xl px-4 py-3 max-w-[190px]"
                  style={{ background: "#1B2E8F", boxShadow: "0 14px 36px rgba(27,46,143,0.22)" }}
                >
                  <p className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.88)" }}>
                    {isAr ? "\"طفلي بدأ يتكلم بثقة خلال شهرين!\"" : "\"My child started speaking confidently in just 2 months!\""}
                  </p>
                  <p className="text-xs mt-1.5 font-semibold" style={{ color: "rgba(255,255,255,0.40)" }}>
                    — {isAr ? "أم سارة" : "Sarah's Mom"}
                  </p>
                </div>

              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ══════ STATS STRIP ══════════════════════════════════════════════════════ */}
      <div style={{ background: "#F5A600" }}>
        <div className="max-w-4xl mx-auto px-4">
          <div className="grid grid-cols-2 sm:grid-cols-4">
            {[
              { num: 120,  suffix: "+", label: txt.stats.students },
              { num: 2400, suffix: "+", label: txt.stats.sessions },
              { num: 94,   suffix: "%", label: txt.stats.confidence },
              { num: 4,    suffix: "",  label: txt.stats.levels },
            ].map((s, i) => (
              <div key={i} className="text-center py-6 px-2 border-[#1B2E8F]/10" style={{ borderRight: i < 3 ? "1px solid rgba(27,46,143,0.12)" : "none" }}>
                <div className="font-black leading-none" style={{ fontSize: "clamp(1.8rem, 4vw, 2.6rem)", fontFamily: hf, color: "#1B2E8F" }}>
                  <Counter to={s.num} suffix={s.suffix} />
                </div>
                <p className="text-[#1B2E8F]/60 text-xs mt-1 font-semibold">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══════ PROBLEM ══════════════════════════════════════════════════════════ */}
      <section id="problem" className="py-24" style={{ background: "#080F3C" }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Editorial header — left-aligned, large */}
          <div className="mb-16">
            <span
              className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest px-3 py-1.5 rounded-full mb-8"
              style={{ backgroundColor: "rgba(239,68,68,0.12)", color: "#f87171", border: "1px solid rgba(239,68,68,0.2)" }}
            >
              <AlertCircle className="w-3.5 h-3.5" />
              {txt.problem.badge}
            </span>
            <h2
              className="text-white mb-6 max-w-3xl"
              style={{ fontFamily: hf, fontSize: "clamp(2rem, 5vw, 3.8rem)", fontWeight: 900, lineHeight: 1.05 }}
            >
              {txt.problem.title}
            </h2>
            <p className="text-white/50 text-lg max-w-xl">{txt.problem.sub}</p>
          </div>

          {/* Items — editorial horizontal list, NOT a card grid */}
          <div className="divide-y divide-white/[0.06]">
            {txt.problem.cards.map((c, i) => (
              <div key={i} className="flex items-start gap-6 lg:gap-10 py-8 group">
                <span
                  className="text-5xl lg:text-7xl font-black select-none opacity-[0.07] shrink-0 w-16 text-right"
                  style={{ fontFamily: hf, color: "#F5A600", lineHeight: 1 }}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="text-4xl shrink-0 mt-1">{c.icon}</span>
                <div className="flex-1">
                  <h3 className="text-xl font-black text-white mb-2" style={{ fontFamily: hf }}>
                    {c.title}
                  </h3>
                  <p className="text-white/45 leading-relaxed">{c.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════ REALITY OF TRADITIONAL LEARNING ══════════════════════════════════ */}
      <section id="reality" className="py-24 overflow-hidden" style={{ background: "linear-gradient(160deg, #080F3C 0%, #0D1A5C 100%)" }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="inline-flex items-center gap-2 bg-red-500/15 text-red-300 text-sm font-semibold px-4 py-1.5 rounded-full mb-5">
              <AlertCircle className="w-4 h-4" />
              {isAr ? "واقع التعليم التقليدي" : "The Reality of Traditional Learning"}
            </span>
            <h2 className="text-3xl sm:text-5xl font-black text-white leading-tight max-w-4xl mx-auto mb-6" style={{ fontFamily: hf }}>
              {isAr
                ? "يدرسون الإنجليزية لسنوات... ولا يستطيعون التحدث بجملة واحدة."
                : "They study English for years... and still can't say a single sentence with confidence."}
            </h2>
          </div>

          <div className="max-w-4xl mx-auto mb-16 rounded-2xl border border-white/8 bg-white/[0.04] p-8 md:p-12 text-center relative overflow-hidden">
            <div className="absolute -top-4 -start-4 opacity-[0.04] font-serif leading-none select-none text-white" style={{ fontSize: "120px" }}>"</div>
            <p className="text-xl md:text-2xl text-white/85 font-medium leading-relaxed relative z-10">
              {isAr
                ? "الأطفال يقضون مئات الساعات في الدراسة ويحصلون على درجات عالية في المدرسة... ومع ذلك لا يستطيعون قول جملة واحدة بثقة."
                : "Children spend hundreds of hours studying, earn top grades in school — yet they cannot hold a simple conversation in English."}
            </p>
            <div className="mt-6 inline-flex items-center gap-3 px-5 py-2.5 rounded-xl" style={{ backgroundColor: "#F5A600", color: "#1B2E8F" }}>
              <span className="text-2xl font-black">💬</span>
              <p className="font-black text-base">
                {isAr ? "الدرجات ليست اللغة. التحدث هو اللغة." : "Grades are not the language. Speaking is the language."}
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {/* Academic "Success" */}
            <div className="rounded-2xl border border-red-500/20 bg-red-500/[0.04] p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center shrink-0">
                  <GraduationCap className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <p className="font-bold text-white">{isAr ? "النجاح الأكاديمي" : "Academic \"Success\""}</p>
                  <p className="text-xs text-red-300">{isAr ? "ما تعلّمه المدارس التقليدية" : "What traditional schools measure"}</p>
                </div>
              </div>
              <div className="space-y-3">
                {(isAr
                  ? ["نتائج إملاء ممتازة ✓", "قواعد نحوية محفوظة ✓", "ترجمة من وإلى العربية ✓", "درجات مرتفعة في الاختبارات ✓"]
                  : ["Perfect spelling test scores ✓", "Grammar rules memorized ✓", "Translation exercises ✓", "High marks on written exams ✓"]
                ).map((item, i) => (
                  <div key={i} className="flex items-center gap-2.5 text-sm text-white/55">
                    <X className="w-4 h-4 text-red-400 shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
                <div className="mt-4 rounded-xl bg-red-500/10 border border-red-500/15 px-3 py-2.5">
                  <p className="text-red-300 text-xs font-semibold">
                    {isAr ? "❌ النتيجة: طفل يعرف الإنجليزية لكنه يخاف من التحدث بها" : "❌ Result: A child who \"knows\" English but is too afraid to speak it"}
                  </p>
                </div>
              </div>
            </div>

            {/* Real-World Communication */}
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04] p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
                  <Mic className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <p className="font-bold text-white">{isAr ? "التواصل الحقيقي" : "Real-World Communication"}</p>
                  <p className="text-xs text-emerald-300">{isAr ? "ما يعلّمه كيدسبيك" : "What Kidspeak builds"}</p>
                </div>
              </div>
              <div className="space-y-3">
                {(isAr
                  ? ["إجراء محادثات حقيقية بثقة", "طرح الأسئلة والإجابة عليها", "التعبير عن الأفكار بحرية", "الأداء أمام الجمهور دون خوف"]
                  : ["Hold real conversations with confidence", "Ask and answer questions naturally", "Express ideas and emotions freely", "Perform in front of an audience fearlessly"]
                ).map((item, i) => (
                  <div key={i} className="flex items-center gap-2.5 text-sm text-white/80">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
                <div className="mt-4 rounded-xl bg-emerald-500/10 border border-emerald-500/15 px-3 py-2.5">
                  <p className="text-emerald-300 text-xs font-semibold">
                    {isAr ? "✅ النتيجة: طفل يتحدث الإنجليزية بثقة وفرح" : "✅ Result: A child who speaks English with joy and confidence"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center mt-12">
            <button onClick={() => scrollTo("method")} className="inline-flex items-center gap-2 text-white/55 hover:text-white text-sm transition-colors">
              {isAr ? "اكتشف الطريقة الكيدسبيك" : "Discover the Kidspeak way"}
              <ChevronDown className="w-4 h-4 animate-bounce" />
            </button>
          </div>
        </div>
      </section>

      {/* ══════ SCIENCE BEHIND KIDSPEAK ══════════════════════════════════════════ */}
      <section id="science" className="py-24 relative overflow-hidden" style={{ background: "#060C2E" }}>
        <div className="absolute inset-0 pointer-events-none opacity-[0.03]"
          style={{ backgroundImage: "linear-gradient(#F5A600 1px, transparent 1px), linear-gradient(90deg, #F5A600 1px, transparent 1px)", backgroundSize: "60px 60px" }} />

        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold mb-6"
              style={{ backgroundColor: "rgba(245,166,0,0.1)", color: "#F5A600", border: "1px solid rgba(245,166,0,0.25)" }}
            >
              <FlaskConical className="w-4 h-4" />
              {isAr ? "مدعوم بالعلم" : "Evidence-Based"}
            </div>
            <h2 className="text-3xl sm:text-5xl font-black text-white mb-4 leading-tight" style={{ fontFamily: hf }}>
              {isAr ? "العلم خلف" : "The Science Behind"}{" "}
              <span style={{ color: "#F5A600" }}>Kidspeak</span>
            </h2>
            <p className="text-white/55 text-lg max-w-2xl mx-auto">
              {isAr
                ? "ليس مجرد طريقة — بل هو نهج مثبت علمياً ونفسياً يغير كيف يكتسب الأطفال اللغة للأبد."
                : "Not just a method — a scientifically and psychologically proven approach that permanently changes how children acquire language."}
            </p>
          </div>

          <div className="bg-white/[0.04] border border-white/8 rounded-3xl p-8 mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
              <div>
                <h3 className="text-xl font-black text-white mb-1" style={{ fontFamily: hf }}>
                  {isAr ? "مقارنة مسارات التعلم على مدى 12 شهراً" : "Learning Path Comparison Over 12 Months"}
                </h3>
                <p className="text-white/45 text-sm">
                  {isAr ? "مستوى الثقة في الكلام والقدرة التواصلية" : "Speaking confidence & communication ability progression"}
                </p>
              </div>
              <div className="flex gap-3 flex-wrap">
                <div className="px-4 py-2 rounded-full text-xs font-bold" style={{ backgroundColor: "rgba(245,166,0,0.12)", color: "#F5A600", border: "1px solid rgba(245,166,0,0.3)" }}>
                  {isAr ? "وقت الكلام في كيدسبيك: 80%" : "Speaking time at Kidspeak: 80%"}
                </div>
                <div className="px-4 py-2 rounded-full text-xs font-bold bg-red-500/10 text-red-400 border border-red-500/20">
                  {isAr ? "وقت الكلام في المدارس: 5%" : "Speaking time in schools: 5%"}
                </div>
              </div>
            </div>
            <ScienceChart isAr={isAr} />
            <div className="mt-6 grid sm:grid-cols-2 gap-4">
              <div className="flex items-start gap-3 bg-red-500/[0.04] border border-red-500/12 rounded-2xl p-4">
                <div className="w-3 h-3 rounded-full bg-red-400 mt-1 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-red-300 mb-1">{isAr ? "التعليم التقليدي" : "Conventional Learning"}</p>
                  <p className="text-xs text-white/35 leading-relaxed">
                    {isAr ? "معرفة قواعدية عالية — لكن الثقة في الكلام تبقى منخفضة جداً." : "High grammar knowledge — but speaking confidence stays very low throughout the year."}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 bg-[#F5A600]/[0.04] border border-[#F5A600]/15 rounded-2xl p-4">
                <div className="w-3 h-3 rounded-full mt-1 shrink-0" style={{ backgroundColor: "#F5A600" }} />
                <div>
                  <p className="text-sm font-semibold mb-1" style={{ color: "#F5A600" }}>{isAr ? "منهج كيدسبيك" : "Kidspeak Method"}</p>
                  <p className="text-xs text-white/35 leading-relaxed">
                    {isAr ? "منحنى صاعد حاد في الثقة والتواصل — الطفل يتكلم من الأسبوع الأول." : "Steep upward curve in confidence & communication — child speaks from week one."}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Brain & Language */}
            <div className="bg-white/[0.04] border border-white/8 rounded-3xl p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ backgroundColor: "rgba(27,46,143,0.3)" }}>
                  <Brain className="w-5 h-5 text-blue-300" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white" style={{ fontFamily: hf }}>{isAr ? "الجانب العصبي" : "The Brain & Language Path"}</h3>
                  <p className="text-xs text-white/35">{isAr ? "ترتيب الاكتساب الطبيعي" : "Natural acquisition order"}</p>
                </div>
              </div>
              <div className="mb-6">
                <p className="text-xs font-bold uppercase tracking-widest text-red-400 mb-3">
                  {isAr ? "الطريقة الخاطئة — المدارس التقليدية" : "The Wrong Way — Traditional Schools"}
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  {[
                    { icon: <PenLine className="w-4 h-4" />, label: isAr ? "اقرأ / اكتب" : "Read / Write" },
                    { icon: <Headphones className="w-4 h-4" />, label: isAr ? "استمع" : "Listen" },
                    { icon: <Mic className="w-4 h-4" />, label: isAr ? "تكلم" : "Speak" },
                  ].map((step, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2 text-red-300 text-sm font-medium">
                        {step.icon}{step.label}
                      </div>
                      {i < 2 && <ArrowRightCircle className={`w-4 h-4 text-red-500/40 shrink-0 ${isRTL ? "rotate-180" : ""}`} />}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "#F5A600" }}>
                  {isAr ? "الطريقة الصحيحة — منهج كيدسبيك" : "The Right Way — Kidspeak Method"}
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  {[
                    { icon: <Headphones className="w-4 h-4" />, label: isAr ? "استمع" : "Listen", h: false },
                    { icon: <Mic className="w-4 h-4" />, label: isAr ? "تكلم ← المحور" : "SPEAK ← Core", h: true },
                    { icon: <PenLine className="w-4 h-4" />, label: isAr ? "اقرأ / اكتب" : "Read / Write", h: false },
                  ].map((step, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium border ${step.h ? "font-black" : "bg-white/[0.05] border-white/10 text-white/65"}`}
                        style={step.h ? { backgroundColor: "#F5A600", borderColor: "#F5A600", color: "#1B2E8F" } : {}}>
                        {step.icon}{step.label}
                      </div>
                      {i < 2 && <ArrowRightCircle className={`w-4 h-4 shrink-0 ${isRTL ? "rotate-180" : ""}`} style={{ color: "rgba(245,166,0,0.45)" }} />}
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-xs text-white/35 leading-relaxed">
                  {isAr ? "تماماً كما تعلمت لغتك الأم — بالسماع والكلام أولاً، ثم القراءة والكتابة." : "Just like your mother tongue — listening and speaking first, reading and writing come naturally after."}
                </p>
              </div>
            </div>

            {/* Confidence Factor */}
            <div className="bg-white/[0.04] border border-white/8 rounded-3xl p-8 flex flex-col">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ backgroundColor: "rgba(245,166,0,0.15)" }}>
                  <Shield className="w-5 h-5" style={{ color: "#F5A600" }} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white" style={{ fontFamily: hf }}>{isAr ? "عامل الثقة" : "The Confidence Factor"}</h3>
                  <p className="text-xs text-white/35">{isAr ? "مدعوم بالبحث النفسي" : "Backed by psychological research"}</p>
                </div>
              </div>
              <div className="flex-1 flex flex-col items-center justify-center text-center py-6">
                <div className="text-8xl font-black leading-none mb-4" style={{ color: "#F5A600", fontFamily: hf }}>90%</div>
                <p className="text-white/75 text-lg font-semibold mb-3 max-w-xs">
                  {isAr ? "من فشل الأطفال في اللغة سببه القلق — وليس نقص الذكاء." : "of children's language failure is caused by anxiety — not lack of intelligence."}
                </p>
                <div className="w-12 h-0.5 rounded-full mb-4" style={{ backgroundColor: "#F5A600" }} />
                <p className="text-white/45 text-sm leading-relaxed max-w-sm">
                  {isAr ? "منهجنا المعتمد على الأخصائية النفسية يكسر حاجز القلق ويبني ثقة حقيقية." : "Our psychologist-led approach eliminates this anxiety barrier and builds genuine confidence — because a confident child learns exponentially faster."}
                </p>
              </div>
              <div className="mt-4 space-y-3">
                <p className="text-xs font-bold uppercase tracking-widest text-white/25 mb-2">
                  {isAr ? "احتفاظ المفردات النشطة" : "Active vocabulary retention"}
                </p>
                {[
                  { label: isAr ? "كيدسبيك — يستخدم الكلمات" : "Kidspeak — uses words", pct: 87, color: "#F5A600" },
                  { label: isAr ? "التعليم التقليدي — يحفظ الكلمات" : "Conventional — memorises words", pct: 23, color: "#ef4444" },
                ].map(row => (
                  <div key={row.label}>
                    <div className="flex justify-between text-xs text-white/50 mb-1">
                      <span>{row.label}</span>
                      <span className="font-bold" style={{ color: row.color }}>{row.pct}%</span>
                    </div>
                    <div className="h-2 bg-white/8 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${row.pct}%`, backgroundColor: row.color }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════ BEYOND LANGUAGE ══════════════════════════════════════════════════ */}
      <section id="beyond" className="py-24 relative overflow-hidden" style={{ background: "linear-gradient(160deg, #FFFBF0 0%, #FFF8E6 50%, #F5F0FF 100%)" }}>
        <div className="absolute top-0 start-0 w-96 h-96 rounded-full opacity-[0.05] pointer-events-none" style={{ background: "radial-gradient(circle, #1B2E8F, transparent)", transform: "translate(-30%, -30%)" }} />
        <div className="absolute bottom-0 end-0 w-80 h-80 rounded-full opacity-[0.05] pointer-events-none" style={{ background: "radial-gradient(circle, #F5A600, transparent)", transform: "translate(30%, 30%)" }} />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center mb-16">
            <span className="inline-block text-sm font-semibold px-4 py-1.5 rounded-full mb-5"
              style={{ backgroundColor: "rgba(27,46,143,0.08)", color: "#1B2E8F", border: "1px solid rgba(27,46,143,0.15)" }}>
              {isAr ? "أكثر من مجرد لغة" : "Beyond Language"}
            </span>
            <h2 className="text-3xl sm:text-4xl font-black leading-tight mb-4 text-gray-900" style={{ fontFamily: hf }}>
              {isAr ? <><span style={{ color: "#1B2E8F" }}>بناء عقل أقوى</span></> : <>Building a <span style={{ color: "#1B2E8F" }}>Stronger Mind</span></>}
            </h2>
            <div className="max-w-2xl mx-auto mt-6 p-6 rounded-2xl border-2 text-start"
              style={{ borderColor: "rgba(245,166,0,0.4)", backgroundColor: "#FFFBF0" }}>
              <p className="text-lg sm:text-xl font-black text-gray-900 mb-2 leading-snug" style={{ fontFamily: hf }}>
                {isAr ? "«الإنجليزية ليست سهلة، ولهذا السبب هي تغيّر الشخصية.»" : "\"English is Hard, and That's Why It's Transformative.\""}
              </p>
              <p className="text-sm text-gray-600 leading-relaxed">
                {isAr
                  ? "تعلّم التحدث بلغة ثانية هو تمرين معرفي حقيقي. فهو يُنمّي مهارات تُستخدم في جميع المواد الدراسية."
                  : "Learning to speak a second language is a real cognitive workout — one that builds skills used across every school subject, from Maths to History."}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
            {[
              { emoji: "🎤", color: "#1B2E8F", bg: "#EEF2FF", border: "rgba(27,46,143,0.15)", titleEn: "Public Speaking & Leadership", titleAr: "الإلقاء والقيادة", bodyEn: "If they can speak English with confidence, they will lead in their Arabic and History classes too.", bodyAr: "إذا استطاع طفلك التحدث بالإنجليزية بثقة، فإنه سيتصدّر في حصص اللغة العربية والتاريخ أيضاً.", tagEn: "Transfers to: Arabic · History · Social Studies", tagAr: "ينعكس على: العربية · التاريخ · الدراسات الاجتماعية" },
              { emoji: "🧠", color: "#0D4E8A", bg: "#EFF6FF", border: "rgba(13,78,138,0.15)", titleEn: "Cognitive Focus", titleAr: "التركيز المعرفي", bodyEn: "Our 'Speaking-First' method trains active listening and memory — directly boosting performance in Maths and Science.", bodyAr: "طريقتنا 'الكلام أولاً' تُدرّب الاستماع الفعّال والذاكرة — وهو ما يرفع مستوى أداء الطفل في الرياضيات والعلوم.", tagEn: "Transfers to: Maths · Science · Languages", tagAr: "ينعكس على: الرياضيات · العلوم · اللغات" },
              { emoji: "💪", color: "#16a34a", bg: "#F0FDF4", border: "rgba(22,163,74,0.15)", titleEn: "Emotional Resilience", titleAr: "المرونة النفسية", bodyEn: "Overcoming the fear of making mistakes in English teaches kids how to handle any challenge — including high-stakes exams.", bodyAr: "التغلّب على خوف الخطأ في الإنجليزية يُعلّم الطفل كيف يواجه أي تحدٍّ — بما في ذلك الامتحانات الكبرى.", tagEn: "Transfers to: Every exam · Every subject", tagAr: "ينعكس على: كل امتحان · كل مادة" },
            ].map((card, i) => (
              <div key={i} className="rounded-2xl p-6 border-2 flex flex-col gap-3 hover:shadow-lg transition-shadow"
                style={{ backgroundColor: card.bg, borderColor: card.border }}>
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{card.emoji}</span>
                  <h3 className="font-black text-base leading-tight text-gray-900" style={{ fontFamily: hf }}>
                    {isAr ? card.titleAr : card.titleEn}
                  </h3>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed flex-1">{isAr ? card.bodyAr : card.bodyEn}</p>
                <p className="text-xs font-semibold px-2.5 py-1 rounded-full w-fit"
                  style={{ color: card.color, backgroundColor: `${card.color}12`, border: `1px solid ${card.color}22` }}>
                  {isAr ? card.tagAr : card.tagEn}
                </p>
              </div>
            ))}
          </div>

          <div className="text-center">
            <button onClick={() => setLocation("/our-method")} className="inline-flex items-center gap-2 text-sm font-bold group" style={{ color: "#1B2E8F" }}>
              <span className="underline underline-offset-4 group-hover:no-underline">
                {isAr ? "اكتشف كيف نطبّق هذا في برنامجنا" : "See how we do this in our program"}
              </span>
              <span className={`transition-transform group-hover:translate-x-1 ${isRTL ? "rotate-180" : ""}`}>→</span>
            </button>
          </div>
        </div>
      </section>

      {/* ══════ METHOD — Editorial large-number layout ════════════════════════════ */}
      <section id="method" className="py-24" style={{ background: "#FFFBF0" }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <span className="inline-block text-sm font-semibold px-4 py-1.5 rounded-full mb-4"
              style={{ backgroundColor: "rgba(27,46,143,0.08)", color: "#1B2E8F" }}>
              {txt.method.badge}
            </span>
            <h2 className="text-3xl sm:text-5xl font-black text-gray-900 mb-4" style={{ fontFamily: hf }}>{txt.method.title}</h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">{txt.method.sub}</p>
          </div>

          {/* Editorial layout: giant step numbers + content */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-0 relative">
            {/* Connector line (desktop) */}
            <div className="hidden lg:block absolute top-[3.5rem] start-[12.5%] end-[12.5%] h-px" style={{ background: "linear-gradient(90deg, #F5A600, #1B2E8F)" }} />

            {txt.method.steps.map((step, i) => {
              const Icon = step.icon;
              const accentColors = ["#F5A600", "#e09300", "#1B2E8F", "#0D1A5C"];
              const ac = accentColors[i % accentColors.length];
              return (
                <div key={i} className="flex flex-col items-center text-center px-4 pb-8 group">
                  {/* Giant editorial step number */}
                  <div className="relative z-10 leading-none select-none mb-3"
                    style={{ fontFamily: hf, fontSize: "clamp(4rem, 8vw, 6.5rem)", fontWeight: 900, color: ac, opacity: 0.18 }}>
                    {step.num}
                  </div>
                  {/* Icon circle */}
                  <div className="relative z-10 w-14 h-14 rounded-2xl flex items-center justify-center mb-5 shadow-md group-hover:scale-110 transition-transform -mt-8"
                    style={{ backgroundColor: ac }}>
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  {/* Label */}
                  <h3 className="text-lg font-black text-gray-900 mb-2" style={{ fontFamily: hf }}>{step.label}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{step.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ══════ WHY KIDSPEAK (USP) ════════════════════════════════════════════════ */}
      <section id="usp" className="py-24" style={{ background: "#0D1A5C" }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="inline-block text-sm font-semibold px-4 py-1.5 rounded-full mb-4"
              style={{ backgroundColor: "rgba(245,166,0,0.12)", color: "#F5A600", border: "1px solid rgba(245,166,0,0.25)" }}>
              {txt.usp.badge}
            </span>
            <h2 className="text-3xl sm:text-5xl font-black text-white mb-4" style={{ fontFamily: hf }}>{txt.usp.title}</h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {txt.usp.cards.map((card, i) => {
              const Icon = card.icon;
              return (
                <div key={i} className="rounded-2xl p-6 border border-white/8 hover:border-white/16 transition-colors"
                  style={{ background: "rgba(255,255,255,0.04)" }}>
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5"
                    style={{ backgroundColor: `${card.color}22` }}>
                    <Icon className="w-6 h-6" style={{ color: card.color }} />
                  </div>
                  <h3 className="text-base font-black text-white mb-2" style={{ fontFamily: hf }}>{card.title}</h3>
                  <p className="text-white/45 text-sm leading-relaxed">{card.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ══════ PROGRAMS ═════════════════════════════════════════════════════════ */}
      <section id="programs" className="py-24" style={{ background: "#FFFBF0" }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="inline-block text-sm font-semibold px-4 py-1.5 rounded-full mb-4"
              style={{ backgroundColor: "rgba(27,46,143,0.08)", color: "#1B2E8F" }}>
              {txt.programs.badge}
            </span>
            <h2 className="text-3xl sm:text-5xl font-black text-gray-900 mb-4" style={{ fontFamily: hf }}>{txt.programs.title}</h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">{txt.programs.sub}</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {(levels.length > 0 ? levels : [1, 2, 3, 4].map((n) => ({ id: n, name: `Level ${n}` }))).map((level, i) => {
              const levelColors = ["#F5A600", "#e09300", "#1B2E8F", "#0D1A5C"];
              const color = levelColors[i % levelColors.length];
              const lv = level as Level;
              const displayName = (isAr && lv.nameAr) ? lv.nameAr : lv.name;
              const desc = (isAr && lv.descriptionAr) ? lv.descriptionAr : (lv.description || txt.programs.defaultDesc[i] || `Level ${i + 1}`);
              const price = lv.price;
              const weeks = lv.durationWeeks ?? 8;
              const spw = lv.sessionsPerWeek ?? 2;
              const isPopular = i === 1;
              return (
                <div key={level.id}
                  className={`relative rounded-3xl overflow-hidden border-2 transition-all hover:shadow-xl hover:-translate-y-1 bg-white ${isPopular ? "shadow-lg" : "shadow-sm"}`}
                  style={{ borderColor: isPopular ? color : "#e5e7eb" }}>
                  {/* Top accent line */}
                  <div className="h-1.5" style={{ backgroundColor: color }} />
                  {isPopular && (
                    <div className="text-center text-xs font-bold py-1.5 text-white" style={{ backgroundColor: color }}>
                      ⭐ {isAr ? "الأكثر شعبية" : "Most Popular"}
                    </div>
                  )}
                  <div className="p-6">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-sm mb-4" style={{ backgroundColor: color }}>
                      {i + 1}
                    </div>
                    <h3 className="text-lg font-black text-gray-900 mb-2" style={{ fontFamily: hf }}>{displayName}</h3>
                    <p className="text-gray-500 text-sm mb-4 leading-relaxed">{desc}</p>
                    <div className="space-y-2 mb-6">
                      <div className="flex items-center gap-2 text-sm">
                        <Check className="w-4 h-4 shrink-0" style={{ color }} />
                        <span className="text-gray-600">{weeks} {txt.programs.weeks}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Check className="w-4 h-4 shrink-0" style={{ color }} />
                        <span className="text-gray-600">{spw} {txt.programs.sessions}</span>
                      </div>
                      {price && (
                        <div className="flex items-center gap-2 text-sm">
                          <Check className="w-4 h-4 shrink-0" style={{ color }} />
                          <span className="font-bold" style={{ color }}>{price.toLocaleString()} {txt.programs.perMonth}</span>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => { setRegSource(null); setShowRegModal(true); setRegSubmitted(false); setRegForm({ fullName: "", email: "", phone: "", whatsappPhone: "", address: "" }); }}
                      className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
                      style={{ backgroundColor: isPopular ? color : `${color}18`, color: isPopular ? "white" : color }}
                    >
                      {txt.programs.enrollBtn}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ══════ TRANSPARENCY WINDOW ══════════════════════════════════════════════ */}
      <section id="transparency" className="py-24 relative overflow-hidden" style={{ background: "linear-gradient(180deg, #080F3C 0%, #0D1A5C 50%, #080F3C 100%)" }}>
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(245,166,0,0.06) 0%, transparent 70%)" }} />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

          <div className="text-center mb-20">
            <span className="inline-flex items-center gap-2 text-sm font-semibold px-5 py-2 rounded-full mb-5 border"
              style={{ backgroundColor: "rgba(245,166,0,0.1)", borderColor: "rgba(245,166,0,0.3)", color: "#F5A600" }}>
              <Lock className="w-3.5 h-3.5" />
              {txt.transparency.badge}
            </span>
            <h2 className="text-3xl sm:text-5xl font-black text-white mb-5 leading-tight" style={{ fontFamily: hf }}>
              {txt.transparency.title}
            </h2>
            <p className="text-lg text-blue-200/70 max-w-2xl mx-auto">{txt.transparency.sub}</p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 items-center mb-28">
            {/* Phone mockup */}
            <div className={`flex justify-center ${isRTL ? "lg:order-2" : ""}`}>
              <div className="relative w-72 sm:w-80">
                <div className="rounded-[2.5rem] border-4 p-1 shadow-2xl" style={{ borderColor: "rgba(245,166,0,0.45)", background: "linear-gradient(180deg, #1B2E8F, #060C2E)" }}>
                  <div className="rounded-[2rem] overflow-hidden bg-[#060C2E]">
                    <div className="flex items-center justify-between px-5 py-2 text-xs text-white/55 bg-black/30">
                      <span>9:41</span>
                      <div className="w-16 h-4 bg-black/50 rounded-full" />
                      <div className="flex gap-1">
                        <div className="w-3 h-2 bg-white/55 rounded-sm" />
                        <div className="w-1 h-2 bg-white/55 rounded-sm" />
                      </div>
                    </div>
                    <div className="px-4 py-3 flex items-center gap-2" style={{ background: "#1B2E8F" }}>
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-[#1B2E8F]" style={{ backgroundColor: "#F5A600" }}>K</div>
                      <span className="text-white font-semibold text-sm">{txt.transparency.phone.headline}</span>
                    </div>
                    <div className="p-3 space-y-2">
                      <div className="rounded-xl p-3" style={{ backgroundColor: "rgba(245,166,0,0.08)", border: "1px solid rgba(245,166,0,0.18)" }}>
                        <div className="flex items-center gap-2 mb-2">
                          <CalendarCheck className="w-4 h-4" style={{ color: "#F5A600" }} />
                          <span className="text-xs font-semibold text-white">{isAr ? "الحضور هذا الشهر" : "Attendance This Month"}</span>
                        </div>
                        <div className="flex gap-1">
                          {[1,1,1,1,1,1,1,0,1,1,1,1].map((v, i) => (
                            <div key={i} className="flex-1 h-2 rounded-full" style={{ backgroundColor: v ? "#F5A600" : "rgba(255,255,255,0.12)" }} />
                          ))}
                        </div>
                        <div className="text-end mt-1"><span className="text-[10px]" style={{ color: "#F5A600" }}>11/12 ✓</span></div>
                      </div>
                      <div className="rounded-xl p-3" style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                        <div className="flex items-center gap-2 mb-2">
                          <TrendingUp className="w-4 h-4 text-green-400" />
                          <span className="text-xs font-semibold text-white">{isAr ? "نقاط التقدم" : "Progress Score"}</span>
                        </div>
                        <div className="flex items-end gap-1 h-10">
                          {[3,4,4,5,6,7,7,8].map((h, i) => (
                            <div key={i} className="flex-1 rounded-t" style={{ height: `${h * 10}%`, backgroundColor: i === 7 ? "#F5A600" : "rgba(245,166,0,0.3)" }} />
                          ))}
                        </div>
                      </div>
                      <div className="rounded-xl p-3 flex items-center gap-3" style={{ backgroundColor: "rgba(27,46,143,0.5)", border: "1px solid rgba(100,130,255,0.18)" }}>
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: "rgba(245,166,0,0.18)" }}>
                          <Video className="w-5 h-5" style={{ color: "#F5A600" }} />
                        </div>
                        <div>
                          <p className="text-white text-xs font-semibold">{isAr ? "عرض النجوم — الأسبوع 6" : "Talk Show — Week 6"}</p>
                          <p className="text-white/40 text-[10px]">{isAr ? "شاهد الآن ▶" : "Watch now ▶"}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: features */}
            <div className={isRTL ? "lg:order-1" : ""}>
              <h3 className="text-2xl font-black text-white mb-8" style={{ fontFamily: hf }}>
                {txt.transparency.phone.headline}
              </h3>
              <div className="space-y-6">
                {txt.transparency.phone.items.map((item, i) => {
                  const icons = { eye: Eye, video: Video, calendar: CalendarCheck };
                  const ItemIcon = icons[item.icon as keyof typeof icons] || Eye;
                  const colors = ["#F5A600", "#60a5fa", "#34d399"];
                  return (
                    <div key={i} className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${colors[i]}18` }}>
                        <ItemIcon className="w-5 h-5" style={{ color: colors[i] }} />
                      </div>
                      <div>
                        <p className="font-black text-white mb-1" style={{ fontFamily: hf }}>{item.label}</p>
                        <p className="text-white/45 text-sm leading-relaxed">{item.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Guarantees */}
          <div className="text-center mb-12">
            <span className="inline-block text-xs font-black uppercase tracking-widest px-4 py-2 rounded-full mb-4"
              style={{ backgroundColor: "rgba(245,166,0,0.12)", color: "#F5A600", border: "1px solid rgba(245,166,0,0.25)" }}>
              {txt.transparency.guarantees.badge}
            </span>
            <h3 className="text-2xl sm:text-4xl font-black text-white" style={{ fontFamily: hf }}>
              {txt.transparency.guarantees.title}
            </h3>
          </div>
          <div className="grid md:grid-cols-3 gap-6 mb-20">
            {txt.transparency.guarantees.items.map((item, i) => {
              const colors = ["#F5A600", "#34d399", "#60a5fa"];
              return (
                <div key={i} className="rounded-2xl p-6 border border-white/8 text-center"
                  style={{ background: "rgba(255,255,255,0.04)" }}>
                  <span className="inline-block text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full mb-4"
                    style={{ backgroundColor: `${colors[i]}15`, color: colors[i], border: `1px solid ${colors[i]}30` }}>
                    {item.tag}
                  </span>
                  <h4 className="text-base font-black text-white mb-2" style={{ fontFamily: hf }}>{item.title}</h4>
                  <p className="text-white/45 text-sm leading-relaxed">{item.desc}</p>
                </div>
              );
            })}
          </div>

          {/* 15-min rule */}
          <div className="max-w-3xl mx-auto rounded-3xl p-8 border border-[#F5A600]/25 text-center"
            style={{ background: "rgba(245,166,0,0.06)" }}>
            <span className="inline-block text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full mb-4"
              style={{ backgroundColor: "rgba(245,166,0,0.15)", color: "#F5A600" }}>
              {txt.transparency.rule.badge}
            </span>
            <h4 className="text-2xl font-black text-white mb-3" style={{ fontFamily: hf }}>{txt.transparency.rule.title}</h4>
            <p className="text-white/55 text-base leading-relaxed mb-6">{txt.transparency.rule.desc}</p>
            <p className="text-white/40 text-sm mb-6">{txt.transparency.rule.compare}</p>
            <div className="flex items-center justify-center gap-8">
              <div className="text-center">
                <div className="text-4xl font-black mb-1" style={{ color: "#F5A600", fontFamily: hf }}>{txt.transparency.rule.us}</div>
                <p className="text-white/50 text-xs">{txt.transparency.rule.usLabel}</p>
              </div>
              <div className="text-white/20 text-2xl">vs</div>
              <div className="text-center">
                <div className="text-4xl font-black text-red-400 mb-1" style={{ fontFamily: hf }}>{txt.transparency.rule.them}</div>
                <p className="text-white/50 text-xs">{txt.transparency.rule.themLabel}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════ TESTIMONIALS — Editorial quote style ══════════════════════════════ */}
      <section id="testimonials" className="py-24 relative overflow-hidden" style={{ background: "#1B2E8F" }}>
        {/* Ambient KSMark decoration */}
        <div className="absolute -right-32 top-1/2 -translate-y-1/2 opacity-[0.04] pointer-events-none">
          <KSMark className="w-[600px] h-[600px]" />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-16">
            <span className="inline-block text-sm font-semibold px-4 py-1.5 rounded-full mb-6"
              style={{ backgroundColor: "rgba(245,166,0,0.15)", color: "#F5A600", border: "1px solid rgba(245,166,0,0.3)" }}>
              {txt.testimonials.badge}
            </span>
            <h2 className="text-3xl sm:text-5xl font-black text-white" style={{ fontFamily: hf }}>
              {txt.testimonials.title}
            </h2>
          </div>

          {/* Large decorative opening quote */}
          <div className="leading-none select-none mb-6 opacity-25" style={{ fontSize: "clamp(5rem, 12vw, 9rem)", color: "#F5A600", fontFamily: "Georgia, serif", lineHeight: 0.8 }}>
            &ldquo;
          </div>

          {/* Testimonials as editorial vertical flow */}
          <div className="space-y-0 divide-y divide-white/10">
            {(cmsTestimonials.length > 0 ? cmsTestimonials : txt.testimonials.items).map((item: any, i) => {
              const name = item.nameAr && isAr ? item.nameAr : item.name;
              const text = item.textAr && isAr ? item.textAr : item.text;
              const stars = item.stars ?? 5;
              return (
                <div key={i} className="py-10">
                  <p className="text-white/85 text-xl sm:text-2xl leading-relaxed mb-6 font-medium" style={{ fontFamily: isAr ? "'Cairo', sans-serif" : "inherit" }}>
                    {text}
                  </p>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-[#1B2E8F] font-black text-sm shrink-0"
                      style={{ backgroundColor: "#F5A600" }}>
                      {(name || "?")[0]}
                    </div>
                    <div>
                      <p className="font-bold text-white text-sm">{name}</p>
                      <div className="flex gap-0.5 mt-0.5">
                        {Array.from({ length: stars }).map((_, si) => (
                          <Star key={si} className="w-3.5 h-3.5 fill-[#F5A600] text-[#F5A600]" />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Trust badges */}
          <div className="mt-16 flex flex-wrap gap-4">
            {[
              { icon: Award,  text: isAr ? "شهادات رقمية بـ QR"  : "Smart QR Certificates",      color: "#F5A600" },
              { icon: Shield, text: isAr ? "دعم نفسي متخصص"       : "Psychological Support",       color: "#60a5fa" },
              { icon: Heart,  text: isAr ? "بيئة آمنة وحنون"      : "Safe & Caring Environment",  color: "#f87171" },
            ].map(({ icon: Icon, text, color }, i) => (
              <div key={i} className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-white/12"
                style={{ background: "rgba(255,255,255,0.06)" }}>
                <Icon className="w-4 h-4" style={{ color }} />
                <span className="text-sm font-medium text-white/75">{text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════ ENROLLMENT FORM — 2-col layout ════════════════════════════════════ */}
      <section id="enroll" className="py-0 overflow-hidden">
        <div className="grid lg:grid-cols-[42fr_58fr]">
          {/* Left: emotional copy on amber/navy */}
          <div className="py-20 px-8 lg:px-14 flex flex-col justify-center" style={{ background: "linear-gradient(160deg, #0D1A5C 0%, #1B2E8F 100%)" }}>
            <span className="inline-block text-xs font-black uppercase tracking-widest px-3 py-1.5 rounded-full mb-8 w-fit"
              style={{ backgroundColor: "#F5A600", color: "#1B2E8F" }}>
              {txt.enroll.badge}
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-4 leading-tight" style={{ fontFamily: hf }}>
              {txt.enroll.title}
            </h2>
            <p className="text-white/55 text-base leading-relaxed mb-10">{txt.enroll.sub}</p>

            {/* Quick promises */}
            <div className="space-y-4">
              {[
                { icon: "🎯", en: "Free assessment session included", ar: "جلسة تقييم مجانية مشمولة" },
                { icon: "⚡", en: "We call you back within 24 hours", ar: "نتصل بك خلال ٢٤ ساعة" },
                { icon: "🔒", en: "No commitment required", ar: "لا يوجد التزام مسبق" },
              ].map((p, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-2xl">{p.icon}</span>
                  <span className="text-white/75 text-sm">{isAr ? p.ar : p.en}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: form on white */}
          <div className="py-16 px-6 lg:px-14 flex items-center" style={{ background: "#FFFBF0" }}>
            <div className="w-full max-w-lg mx-auto">
              {submitted ? (
                <div className="rounded-3xl border-2 p-12 text-center" style={{ borderColor: "#F5A600", backgroundColor: "white" }}>
                  <div className="text-6xl mb-4">🎉</div>
                  <h3 className="text-2xl font-black mb-2" style={{ color: "#1B2E8F", fontFamily: hf }}>{isAr ? "تم الاستلام!" : "Received!"}</h3>
                  <p className="text-gray-500">{txt.enroll.success}</p>
                  <button className="mt-6 px-6 py-3 rounded-xl font-semibold text-[#1B2E8F]"
                    style={{ backgroundColor: "#F5A600" }}
                    onClick={() => setSubmitted(false)}>
                    {isAr ? "تسجيل طفل آخر" : "Register Another Child"}
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-gray-700">{txt.enroll.labels.parentName}</label>
                      <Input required value={formData.parentName} onChange={e => setFormData(f => ({ ...f, parentName: e.target.value }))} placeholder={isAr ? "أحمد بن علي" : "Ahmed Benali"} className="h-11" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-gray-700">{txt.enroll.labels.parentPhone}</label>
                      <Input required type="tel" value={formData.parentPhone} onChange={e => setFormData(f => ({ ...f, parentPhone: e.target.value }))} placeholder="0555 123 456" className="h-11" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-gray-700">{txt.enroll.labels.parentEmail}</label>
                      <Input type="email" value={formData.parentEmail} onChange={e => setFormData(f => ({ ...f, parentEmail: e.target.value }))} placeholder={isAr ? "بريدك@مثال.com" : "your@email.com"} className="h-11" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-gray-700">{txt.enroll.labels.childName}</label>
                      <Input required value={formData.childName} onChange={e => setFormData(f => ({ ...f, childName: e.target.value }))} placeholder={isAr ? "اسم الطفل" : "Child's name"} className="h-11" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-gray-700">{txt.enroll.labels.childAge}</label>
                      <Select value={formData.childAge} onValueChange={v => setFormData(f => ({ ...f, childAge: v }))}>
                        <SelectTrigger className="h-11"><SelectValue placeholder={isAr ? "اختر العمر" : "Select age"} /></SelectTrigger>
                        <SelectContent>{txt.enroll.ageOptions.map((o, i) => <SelectItem key={i} value={o}>{o}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-gray-700">{txt.enroll.labels.preferredLevel}</label>
                      <Select value={formData.preferredLevel} onValueChange={v => setFormData(f => ({ ...f, preferredLevel: v }))}>
                        <SelectTrigger className="h-11"><SelectValue placeholder={isAr ? "اختر المستوى" : "Select level"} /></SelectTrigger>
                        <SelectContent>
                          {(levels.length > 0 ? levels : [{ id: 1, name: "Level 1" }, { id: 2, name: "Level 2" }, { id: 3, name: "Level 3" }, { id: 4, name: "Level 4" }]).map(lv => (
                            <SelectItem key={lv.id} value={lv.name}>{lv.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-gray-700">{txt.enroll.labels.notes}</label>
                    <Textarea rows={3} value={formData.notes} onChange={e => setFormData(f => ({ ...f, notes: e.target.value }))}
                      placeholder={isAr ? "أي معلومات إضافية تودّ مشاركتها…" : "Any additional information…"} className="resize-none" />
                  </div>
                  <button type="submit" disabled={submitting}
                    className="w-full h-14 rounded-xl font-black text-lg transition-all hover:scale-[1.02] disabled:opacity-60"
                    style={{ backgroundColor: "#1B2E8F", color: "white" }}>
                    {submitting ? (isAr ? "جاري الإرسال…" : "Sending…") : txt.enroll.labels.submit}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ══════ FOOTER ═══════════════════════════════════════════════════════════ */}
      <footer style={{ background: "#060C2E" }} className="text-white py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-12 mb-12">
            {/* Brand */}
            <div>
              {settings?.logoWhiteUrl ? (
                <img src={`/api/storage/public-objects/${settings.logoWhiteUrl}`} alt="Kidspeak" className="h-10 mb-4 object-contain" />
              ) : (
                <div className="text-2xl font-black mb-4" style={{ fontFamily: hf }}>
                  kid<span style={{ color: "#F5A600" }}>speak</span>
                </div>
              )}
              <p className="text-white/40 text-sm leading-relaxed mb-4">
                {isAr ? settings?.sloganAr || "حيث يلتقي التقدم بالدقة." : settings?.slogan || "Where Progress Meets Precision."}
              </p>
              <div className="flex gap-3">
                {settings?.instagram && (
                  <a href={settings.instagram.startsWith("http") ? settings.instagram : `https://instagram.com/${settings.instagram}`}
                    target="_blank" rel="noreferrer"
                    className="w-9 h-9 bg-white/8 hover:bg-[#F5A600] rounded-lg flex items-center justify-center transition-colors">
                    <Instagram className="w-4 h-4" />
                  </a>
                )}
                {settings?.facebook && (
                  <a href={settings.facebook.startsWith("http") ? settings.facebook : `https://facebook.com/${settings.facebook}`}
                    target="_blank" rel="noreferrer"
                    className="w-9 h-9 bg-white/8 hover:bg-[#F5A600] rounded-lg flex items-center justify-center transition-colors">
                    <Facebook className="w-4 h-4" />
                  </a>
                )}
                {settings?.youtube && (
                  <a href={settings.youtube.startsWith("http") ? settings.youtube : `https://youtube.com/@${settings.youtube}`}
                    target="_blank" rel="noreferrer"
                    className="w-9 h-9 bg-white/8 hover:bg-[#F5A600] rounded-lg flex items-center justify-center transition-colors">
                    <Youtube className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>

            {/* Quick links */}
            <div>
              <h4 className="font-bold text-white mb-5 text-sm uppercase tracking-widest opacity-60">{isAr ? "روابط سريعة" : "Quick Links"}</h4>
              <nav className="space-y-3">
                {[
                  ...(cmsOpenDay?.enabled ? [{ label: isAr ? "🎉 اليوم المفتوح" : "🎉 Open Day", id: "open-day" }] : []),
                  { label: isAr ? "العلم خلف كيدسبيك" : "The Science",   id: "science" },
                  { label: isAr ? "أكثر من مجرد لغة"  : "Beyond Language", id: "beyond" },
                  { label: isAr ? "الطريقة"            : "The Method",    id: "method" },
                  { label: isAr ? "الميزات"            : "Features",      id: "usp" },
                  { label: isAr ? "البرامج"            : "Programs",      id: "programs" },
                  { label: isAr ? "نافذة الشفافية"     : "Transparency",  id: "transparency" },
                  { label: isAr ? "آراء الأهل"         : "Testimonials",  id: "testimonials" },
                  { label: isAr ? "التسجيل"            : "Register",      id: "enroll" },
                ].map(link => (
                  <button key={link.id} onClick={() => scrollTo(link.id)}
                    className="block text-white/40 hover:text-[#F5A600] text-sm transition-colors">
                    {link.label}
                  </button>
                ))}
                {customPages.filter(p => p.showInFooter && p.status === "published").map(p => (
                  <a key={p.id} href={`/p${p.slug}`} className="block text-white/40 hover:text-[#F5A600] text-sm transition-colors">
                    {isAr ? (p.titleAr || p.titleEn) : p.titleEn}
                  </a>
                ))}
              </nav>
            </div>

            {/* Contact */}
            <div>
              <h4 className="font-bold text-white mb-5 text-sm uppercase tracking-widest opacity-60">{txt.footer.contact}</h4>
              <div className="space-y-4">
                {settings?.address && (
                  <div className="flex items-start gap-3">
                    <MapPin className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "#F5A600" }} />
                    <span className="text-white/40 text-sm">{settings.address}</span>
                  </div>
                )}
                {settings?.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 shrink-0" style={{ color: "#F5A600" }} />
                    <a href={`tel:${settings.phone}`} className="text-white/40 hover:text-white text-sm transition-colors">{settings.phone}</a>
                  </div>
                )}
                {settings?.phone2 && (
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 shrink-0" style={{ color: "#F5A600" }} />
                    <a href={`tel:${settings.phone2}`} className="text-white/40 hover:text-white text-sm transition-colors">{settings.phone2}</a>
                  </div>
                )}
                {settings?.email && (
                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4 shrink-0" style={{ color: "#F5A600" }} />
                    <a href={`mailto:${settings.email}`} className="text-white/40 hover:text-white text-sm transition-colors">{settings.email}</a>
                  </div>
                )}
                {!settings?.address && !settings?.phone && !settings?.email && (
                  <p className="text-white/25 text-sm">{isAr ? "تواصل معنا عبر وسائل التواصل الاجتماعي" : "Contact us via social media"}</p>
                )}
              </div>
            </div>
          </div>

          <div className="border-t border-white/8 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-white/25 text-sm">
              © {new Date().getFullYear()} {settings?.schoolName ?? "Kidspeak Language Center"}. {txt.footer.rights}
            </p>
            <button onClick={() => setLocation("/login")} className="text-white/25 hover:text-white text-sm transition-colors">
              {txt.nav.login}
            </button>
          </div>
        </div>
      </footer>

      {/* ══════ PARENT REGISTRATION MODAL ════════════════════════════════════════ */}
      {showRegModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}
          onClick={e => { if (e.target === e.currentTarget) setShowRegModal(false); }}
        >
          <div
            dir={isRTL ? "rtl" : "ltr"}
            className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
            style={{ animation: "slideUp 0.3s ease" }}
          >
            <div className="relative px-6 pt-8 pb-6 text-center" style={{ background: "linear-gradient(135deg, #0D1A5C 0%, #1B2E8F 100%)" }}>
              <button onClick={() => setShowRegModal(false)}
                className="absolute top-4 end-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/15 hover:bg-white/25 transition-colors text-white">
                <X className="w-4 h-4" />
              </button>
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: "#F5A600" }}>
                <UserPlus className="w-7 h-7 text-white" />
              </div>
              {settings?.logoWhiteUrl ? (
                <img src={`/api/storage/public-objects/${settings.logoWhiteUrl}`} alt="Kidspeak" className="h-7 object-contain mx-auto mb-3" />
              ) : (
                <p className="text-white font-black text-xl tracking-tight mb-3" style={{ fontFamily: hf }}>
                  kid<span style={{ color: "#F5A600" }}>speak</span>
                </p>
              )}
              <h2 className="text-xl font-black text-white">{txt.reg.title}</h2>
              <p className="text-white/65 text-sm mt-1.5 leading-relaxed">{txt.reg.subtitle}</p>
            </div>

            <div className="px-6 py-6">
              {regSubmitted ? (
                <div className="text-center py-4">
                  <div className="text-5xl mb-4">🎉</div>
                  <h3 className="text-xl font-black mb-2" style={{ color: "#1B2E8F", fontFamily: hf }}>{txt.reg.successTitle}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed mb-6">{txt.reg.successMsg}</p>
                  <button onClick={() => setShowRegModal(false)}
                    className="px-6 py-3 rounded-xl font-bold text-white transition-all hover:opacity-90"
                    style={{ backgroundColor: "#1B2E8F" }}>
                    {txt.reg.successBtn}
                  </button>
                </div>
              ) : (
                <form onSubmit={handleRegSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-gray-700">{txt.reg.fullName}</label>
                    <Input required value={regForm.fullName} onChange={e => setRegForm(f => ({ ...f, fullName: e.target.value }))} placeholder={txt.reg.placeholders.fullName} className="h-11" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-gray-700">{txt.reg.email}</label>
                    <Input required type="email" value={regForm.email} onChange={e => setRegForm(f => ({ ...f, email: e.target.value }))} placeholder={txt.reg.placeholders.email} className="h-11" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-gray-700">{txt.reg.phone}</label>
                      <Input required type="tel" value={regForm.phone} onChange={e => setRegForm(f => ({ ...f, phone: e.target.value }))} placeholder={txt.reg.placeholders.phone} className="h-11" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-gray-700">{txt.reg.whatsappPhone}</label>
                      <Input type="tel" value={regForm.whatsappPhone} onChange={e => setRegForm(f => ({ ...f, whatsappPhone: e.target.value }))} placeholder={txt.reg.placeholders.whatsappPhone} className="h-11" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-gray-700">{txt.reg.address}</label>
                    <Input value={regForm.address} onChange={e => setRegForm(f => ({ ...f, address: e.target.value }))} placeholder={txt.reg.placeholders.address} className="h-11" />
                  </div>
                  <button type="submit" disabled={regSubmitting}
                    className="w-full h-12 rounded-xl font-bold text-white transition-all hover:opacity-90 disabled:opacity-60 mt-2"
                    style={{ backgroundColor: "#1B2E8F" }}>
                    {regSubmitting ? (isAr ? "جاري الإرسال…" : "Sending…") : txt.reg.submit}
                  </button>
                  <p className="text-center text-xs text-muted-foreground">
                    {isAr ? "هل لديك حساب بالفعل؟" : "Already have an account?"}{" "}
                    <button type="button" onClick={() => { setShowRegModal(false); setLocation("/login"); }}
                      className="font-semibold underline" style={{ color: "#1B2E8F" }}>
                      {isAr ? "سجّل الدخول" : "Log in"}
                    </button>
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(24px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>
    </div>
  );
}
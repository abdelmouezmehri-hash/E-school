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
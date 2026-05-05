import { useState, useEffect, useRef } from "react";
import { useParams } from "wouter";
import { useLanguage } from "@/contexts/language-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Globe, Star, CheckCircle2, ChevronRight, ChevronLeft, Play } from "lucide-react";
import { Link } from "wouter";

interface Benefit {
  icon: string;
  titleEn: string;
  titleAr: string;
  descEn: string;
  descAr: string;
}
interface Testimonial {
  name: string;
  role: string;
  text: string;
  rating: number;
}
interface CampaignData {
  id: number;
  name: string;
  nameAr: string;
  slug: string;
  ctaType: string;
  whatsappNumber: string | null;
  landingPageColor: string | null;
  heroTitleEn: string | null;
  heroTitleAr: string | null;
  heroSubtitleEn: string | null;
  heroSubtitleAr: string | null;
  heroImage: string | null;
  ctaTextEn: string | null;
  ctaTextAr: string | null;
  benefits: Benefit[] | null;
  testimonials: Testimonial[] | null;
  accentColor: string | null;
  videoUrl: string | null;
}

function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(s => (
        <Star key={s} className={`w-3.5 h-3.5 ${s <= rating ? "fill-amber-400 text-amber-400" : "text-slate-200"}`} />
      ))}
    </div>
  );
}

function isEmoji(s: string) {
  return /\p{Emoji}/u.test(s) && s.length <= 4;
}

export default function CampaignLandingPage() {
  const { slug } = useParams<{ slug: string }>();
  const { isRTL, language, setLanguage } = useLanguage();
  const { toast } = useToast();
  const formRef = useRef<HTMLDivElement>(null);

  const [campaign, setCampaign] = useState<CampaignData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    parentName: "", parentPhone: "", parentEmail: "",
    childName: "", childAge: "", notes: "",
  });
  const [attempted, setAttempted] = useState(false);
  const [tIdx, setTIdx] = useState(0);

  useEffect(() => {
    fetch(`/api/public/campaigns/${slug}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => setCampaign(d))
      .finally(() => setLoading(false));
  }, [slug]);

  const handleSubmit = async () => {
    setAttempted(true);
    if (!form.parentName || !form.parentPhone || !form.childName) {
      toast({ title: isRTL ? "الرجاء تعبئة الحقول المطلوبة" : "Please fill required fields", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const r = await fetch(`/api/campaigns/${slug}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, source: "form" }),
      });
      if (r.ok) setSubmitted(true);
      else throw new Error();
    } catch {
      toast({ title: isRTL ? "حدث خطأ، حاول مجدداً" : "Error, please try again", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const scrollToForm = () => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-3 border-t-transparent animate-spin" style={{ borderColor: "#1B2E8F", borderTopColor: "transparent" }} />
          <p className="text-slate-400 text-sm">{isRTL ? "جارٍ التحميل..." : "Loading..."}</p>
        </div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-center p-6">
        <div className="text-6xl">🔍</div>
        <h1 className="text-2xl font-black text-slate-700">{isRTL ? "الحملة غير موجودة" : "Campaign Not Found"}</h1>
        <p className="text-slate-400">{isRTL ? "هذه الحملة غير موجودة أو غير نشطة" : "This campaign doesn't exist or is no longer active"}</p>
        <Link href="/"><Button style={{ backgroundColor: "#1B2E8F", color: "white" }}>{isRTL ? "العودة للرئيسية" : "Go Home"}</Button></Link>
      </div>
    );
  }

  const primary    = campaign.landingPageColor ?? "#1B2E8F";
  const accent     = campaign.accentColor ?? "#F5A600";
  const heroTitle  = isRTL ? (campaign.heroTitleAr || campaign.nameAr) : (campaign.heroTitleEn || campaign.name);
  const heroSub    = isRTL ? (campaign.heroSubtitleAr || "") : (campaign.heroSubtitleEn || "");
  const ctaText    = isRTL ? (campaign.ctaTextAr || "سجّل الآن") : (campaign.ctaTextEn || "Register Now");
  const heroImg    = campaign.heroImage;
  const benefits   = campaign.benefits ?? [];
  const testis     = campaign.testimonials ?? [];
  const err = (f: string) => attempted && !form[f as keyof typeof form];

  if (submitted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-6 text-center"
        style={{ background: `linear-gradient(135deg, ${primary}10, white)` }}>
        <div className="w-24 h-24 rounded-full flex items-center justify-center text-5xl shadow-xl"
          style={{ background: `linear-gradient(135deg, ${primary}20, ${accent}30)` }}>✅</div>
        <div>
          <h1 className="text-3xl font-black mb-2" style={{ color: primary }}>
            {isRTL ? "تم التسجيل بنجاح!" : "Registration Successful!"}
          </h1>
          <p className="text-slate-500 max-w-sm mx-auto">
            {isRTL ? "شكراً لك! سنتواصل معك قريباً لتأكيد موعدك." : "Thank you! We'll contact you soon to confirm your appointment."}
          </p>
        </div>
        <div className="flex gap-3 items-center justify-center text-slate-300">
          <div className="w-12 h-px bg-slate-200" />
          <img src="/logo-dark.png" alt="Kidspeak" className="h-6 opacity-30"
            onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
          <div className="w-12 h-px bg-slate-200" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" dir={isRTL ? "rtl" : "ltr"}>

      {/* ── Sticky Nav ── */}
      <nav className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-slate-100 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <img src="/logo-dark.png" alt="Kidspeak" className="h-7"
              onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
            <span className="font-black text-sm hidden sm:block" style={{ color: primary }}>Kidspeak</span>
          </Link>
          <div className="flex items-center gap-3">
            <button onClick={() => setLanguage(isRTL ? "en" : "ar")}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors">
              <Globe className="w-3.5 h-3.5" />
              {isRTL ? "English" : "عربي"}
            </button>
            <Button size="sm" onClick={scrollToForm}
              className="text-xs font-bold h-8 rounded-full px-4 hidden sm:flex"
              style={{ backgroundColor: primary, color: "white" }}>
              {ctaText}
            </Button>
          </div>
        </div>
      </nav>

      {/* ── Hero Section ── */}
      <section className="relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${primary} 0%, ${primary}cc 100%)` }}>
        {/* Decorative circles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-20 -end-20 w-64 h-64 rounded-full opacity-10"
            style={{ background: `radial-gradient(circle, white, transparent)` }} />
          <div className="absolute -bottom-10 -start-10 w-48 h-48 rounded-full opacity-10"
            style={{ background: `radial-gradient(circle, white, transparent)` }} />
        </div>

        <div className="relative max-w-5xl mx-auto px-4 py-16 md:py-24 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold mb-6"
            style={{ backgroundColor: accent, color: primary }}>
            <span>✨</span>
            <span>{isRTL ? campaign.nameAr : campaign.name}</span>
          </div>

          {/* Hero image / emoji */}
          {heroImg && (
            <div className="mb-6 flex justify-center">
              {isEmoji(heroImg) ? (
                <div className="text-7xl md:text-9xl drop-shadow-lg leading-none">{heroImg}</div>
              ) : (
                <img src={heroImg} alt="" className="h-32 md:h-48 object-contain rounded-2xl shadow-2xl"
                  onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
              )}
            </div>
          )}

          {/* Title */}
          <h1 className="text-3xl md:text-5xl font-black text-white mb-4 leading-tight max-w-3xl mx-auto">
            {heroTitle}
          </h1>

          {/* Subtitle */}
          {heroSub && (
            <p className="text-white/80 text-lg md:text-xl max-w-xl mx-auto mb-8 leading-relaxed">
              {heroSub}
            </p>
          )}

          {/* CTA */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <Button onClick={scrollToForm}
              className="h-14 px-8 text-base font-black rounded-2xl shadow-xl hover:shadow-2xl transition-all hover:scale-105 text-sm"
              style={{ backgroundColor: accent, color: primary }}>
              {ctaText} {isRTL ? "←" : "→"}
            </Button>
          </div>

          {/* Trust indicators */}
          <div className="mt-8 flex items-center justify-center gap-6 text-white/60 text-xs">
            <div className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{isRTL ? "مجاني تماماً" : "100% Free"}</span>
            </div>
            <div className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{isRTL ? "بدون التزام" : "No Commitment"}</span>
            </div>
            <div className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{isRTL ? "رد سريع" : "Quick Response"}</span>
            </div>
          </div>
        </div>

        {/* Wave bottom */}
        <div className="absolute bottom-0 start-0 end-0">
          <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full" preserveAspectRatio="none">
            <path d="M0 60L60 50C120 40 240 20 360 15C480 10 600 20 720 27.5C840 35 960 40 1080 37.5C1200 35 1320 25 1380 20L1440 15V60H1380C1320 60 1200 60 1080 60C960 60 840 60 720 60C600 60 480 60 360 60C240 60 120 60 60 60H0Z" fill="white"/>
          </svg>
        </div>
      </section>

      {/* ── Video Section ── */}
      {campaign.videoUrl && (
        <section className="py-12 bg-white">
          <div className="max-w-3xl mx-auto px-4">
            <div className="rounded-3xl overflow-hidden shadow-2xl aspect-video">
              <iframe
                src={campaign.videoUrl}
                title="Campaign video"
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </section>
      )}

      {/* ── Benefits Grid ── */}
      {benefits.length > 0 && (
        <section className="py-16 bg-white">
          <div className="max-w-5xl mx-auto px-4">
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold mb-3"
                style={{ backgroundColor: `${primary}12`, color: primary }}>
                {isRTL ? "لماذا كيدسبيك؟" : "Why Kidspeak?"}
              </div>
              <h2 className="text-2xl md:text-3xl font-black text-slate-800">
                {isRTL ? "ما يميّزنا عن غيرنا" : "What Makes Us Different"}
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
              {benefits.map((b, i) => (
                <div key={i}
                  className="group p-6 rounded-2xl border border-slate-100 hover:border-transparent hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                  style={{ background: "white" }}>
                  <div className="text-4xl mb-3 group-hover:scale-110 transition-transform duration-200 inline-block">
                    {b.icon}
                  </div>
                  <h3 className="font-black text-slate-800 mb-1.5 text-base">
                    {isRTL ? b.titleAr : b.titleEn}
                  </h3>
                  <p className="text-slate-500 text-sm leading-relaxed">
                    {isRTL ? b.descAr : b.descEn}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Testimonials ── */}
      {testis.length > 0 && (
        <section className="py-16" style={{ background: `linear-gradient(135deg, ${primary}06, ${primary}03)` }}>
          <div className="max-w-5xl mx-auto px-4">
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold mb-3"
                style={{ backgroundColor: `${accent}20`, color: primary }}>
                {isRTL ? "ماذا قالوا عنا" : "What Parents Say"}
              </div>
              <h2 className="text-2xl md:text-3xl font-black text-slate-800">
                {isRTL ? "تقييمات أولياء الأمور" : "Parent Reviews"}
              </h2>
            </div>

            {/* Carousel for mobile, grid for desktop */}
            <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {testis.map((t, i) => (
                <div key={i} className="bg-white rounded-2xl p-6 shadow-md border border-slate-100">
                  <StarRow rating={t.rating} />
                  <p className="text-slate-600 text-sm leading-relaxed mt-3 mb-4 italic">"{t.text}"</p>
                  <div>
                    <p className="font-black text-slate-800 text-sm">{t.name}</p>
                    {t.role && <p className="text-xs text-slate-400">{t.role}</p>}
                  </div>
                </div>
              ))}
            </div>

            {/* Mobile: carousel */}
            <div className="md:hidden">
              <div className="bg-white rounded-2xl p-6 shadow-md border border-slate-100">
                <StarRow rating={testis[tIdx].rating} />
                <p className="text-slate-600 text-sm leading-relaxed mt-3 mb-4 italic">"{testis[tIdx].text}"</p>
                <div>
                  <p className="font-black text-slate-800 text-sm">{testis[tIdx].name}</p>
                  {testis[tIdx].role && <p className="text-xs text-slate-400">{testis[tIdx].role}</p>}
                </div>
              </div>
              {testis.length > 1 && (
                <div className="flex justify-center gap-3 mt-4">
                  <button onClick={() => setTIdx(i => (i - 1 + testis.length) % testis.length)}
                    className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center hover:bg-slate-50">
                    {isRTL ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                  </button>
                  <div className="flex gap-1 items-center">
                    {testis.map((_, i) => (
                      <button key={i} onClick={() => setTIdx(i)}
                        className="rounded-full transition-all"
                        style={{ width: i === tIdx ? 20 : 6, height: 6, backgroundColor: i === tIdx ? primary : "#cbd5e1" }} />
                    ))}
                  </div>
                  <button onClick={() => setTIdx(i => (i + 1) % testis.length)}
                    className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center hover:bg-slate-50">
                    {isRTL ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ── Registration Form ── */}
      <section ref={formRef} className="py-16 bg-white" id="register">
        <div className="max-w-lg mx-auto px-4">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold mb-3"
              style={{ backgroundColor: `${primary}12`, color: primary }}>
              {isRTL ? "التسجيل" : "Registration"}
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-slate-800">
              {isRTL ? "سجّل طفلك الآن" : "Register Your Child Now"}
            </h2>
            <p className="text-slate-500 text-sm mt-2">
              {isRTL ? "أملأ النموذج وسنتواصل معك خلال 24 ساعة" : "Fill the form and we'll contact you within 24 hours"}
            </p>
          </div>

          <div className="bg-white rounded-3xl shadow-2xl p-7 border border-slate-100">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className={`text-xs font-bold ${err("parentName") ? "text-red-500" : "text-slate-600"}`}>
                    {isRTL ? "اسم الولي *" : "Parent Name *"}
                  </label>
                  <Input value={form.parentName} onChange={e => setForm(p => ({ ...p, parentName: e.target.value }))}
                    className={`rounded-xl ${err("parentName") ? "border-red-400 focus-visible:ring-red-200" : ""}`} />
                </div>
                <div className="space-y-1">
                  <label className={`text-xs font-bold ${err("parentPhone") ? "text-red-500" : "text-slate-600"}`}>
                    {isRTL ? "رقم الهاتف *" : "Phone *"}
                  </label>
                  <Input value={form.parentPhone} onChange={e => setForm(p => ({ ...p, parentPhone: e.target.value }))}
                    dir="ltr" className={`rounded-xl ${err("parentPhone") ? "border-red-400 focus-visible:ring-red-200" : ""}`} />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600">{isRTL ? "البريد الإلكتروني" : "Email (optional)"}</label>
                <Input value={form.parentEmail} onChange={e => setForm(p => ({ ...p, parentEmail: e.target.value }))}
                  type="email" dir="ltr" className="rounded-xl" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className={`text-xs font-bold ${err("childName") ? "text-red-500" : "text-slate-600"}`}>
                    {isRTL ? "اسم الطفل *" : "Child Name *"}
                  </label>
                  <Input value={form.childName} onChange={e => setForm(p => ({ ...p, childName: e.target.value }))}
                    className={`rounded-xl ${err("childName") ? "border-red-400 focus-visible:ring-red-200" : ""}`} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600">{isRTL ? "العمر" : "Age"}</label>
                  <Input value={form.childAge} onChange={e => setForm(p => ({ ...p, childAge: e.target.value }))}
                    placeholder={isRTL ? "مثال: 7" : "e.g. 7"} className="rounded-xl" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600">{isRTL ? "ملاحظات" : "Notes (optional)"}</label>
                <Input value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                  placeholder={isRTL ? "أي ملاحظات إضافية..." : "Any additional notes..."} className="rounded-xl" />
              </div>

              <Button onClick={handleSubmit} disabled={submitting}
                className="w-full h-13 text-base font-black rounded-2xl mt-2 hover:opacity-90 transition-all hover:scale-[1.01] shadow-lg"
                style={{ backgroundColor: primary, color: "white" }}>
                {submitting
                  ? (isRTL ? "جارٍ الإرسال..." : "Submitting...")
                  : `${ctaText} ${isRTL ? "←" : "→"}`}
              </Button>

              <p className="text-center text-xs text-slate-400">
                {isRTL ? "بياناتك آمنة ولن تُشارك مع أحد" : "Your data is safe and will never be shared"}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t py-8">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <img src="/logo-dark.png" alt="Kidspeak" className="h-6 opacity-40"
            onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
          <p className="text-xs text-slate-400 text-center">
            © {new Date().getFullYear()} Kidspeak Language Center — Algeria
          </p>
          <button onClick={() => setLanguage(isRTL ? "en" : "ar")}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600">
            <Globe className="w-3.5 h-3.5" />
            {isRTL ? "Switch to English" : "التبديل للعربية"}
          </button>
        </div>
      </footer>
    </div>
  );
}

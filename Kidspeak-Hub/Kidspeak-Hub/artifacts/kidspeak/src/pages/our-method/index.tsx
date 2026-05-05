import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/language-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Mic, Brain, GraduationCap, Star, Heart, Zap, Users, BookOpen,
  MessageCircle, Eye, Shield, CheckCircle2,
} from "lucide-react";
import { SectionRenderer } from "@/components/section-renderer";

export default function OurMethodPage() {
  const { t, language, isRTL } = useLanguage();
  const [cmsContent, setCmsContent] = useState<any>(null);

  useEffect(() => {
    fetch("/api/public/cms/settings/our_method")
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.data?.sections) setCmsContent(d.data); })
      .catch(() => {});
  }, []);
  const isAr = language === "ar";

  const steps = [
    {
      icon: "👂",
      num: "01",
      label: isAr ? "اسمع" : "Listen",
      desc: isAr
        ? "يتعرض الأطفال لأصوات الإنجليزية الطبيعية وإيقاعاتها — الاستماع أولاً مثلما يتعلم الطفل لغته الأم."
        : "Children immerse in authentic English sounds and rhythms — listening first, just like learning a mother tongue.",
    },
    {
      icon: "🗣️",
      num: "02",
      label: isAr ? "قلّد" : "Imitate",
      desc: isAr
        ? "تكرار واثق بدون خوف من الأخطاء أو الحكم. الخطأ هو جزء من التعلم."
        : "Confident repetition without fear of mistakes or judgment. Errors are part of the journey.",
    },
    {
      icon: "💬",
      num: "03",
      label: isAr ? "تحدث" : "Speak",
      desc: isAr
        ? "محادثات حقيقية في بيئة آمنة ومشجعة. كل طفل يجد صوته."
        : "Real conversations in a safe, encouraging space. Every child finds their voice.",
    },
    {
      icon: "📚",
      num: "04",
      label: isAr ? "اقرأ واكتب" : "Read & Write",
      desc: isAr
        ? "القراءة والكتابة تنمو بشكل طبيعي على أساس راسخ من التحدث."
        : "Literacy builds naturally on the solid foundation of speaking.",
    },
  ];

  const psychPillars = [
    {
      emoji: "😰→😊",
      label: isAr ? "تخفيض الخوف" : "Fear Reduction",
      desc: isAr ? "من التجمد إلى الطلاقة" : "From freeze to fluency",
      color: "#7c3aed",
    },
    {
      emoji: "🤝",
      label: isAr ? "المبادرة الاجتماعية" : "Social Initiative",
      desc: isAr ? "بناء شجاعة التواصل" : "Building communication courage",
      color: "#7c3aed",
    },
    {
      emoji: "⭐",
      label: isAr ? "الثقة بالنفس" : "Self-Confidence",
      desc: isAr ? "كل طفل نجم" : "Every child is a star",
      color: "#7c3aed",
    },
  ];

  const levels = [
    {
      num: "01",
      color: "#F5A600",
      label: isAr ? "الأساس" : "Foundation",
      desc: isAr ? "الاستماع والأصوات الأولى — بناء أذن الإنجليزية" : "Listening & Basic Sounds — building the ear for English",
      weeks: 8,
    },
    {
      num: "02",
      color: "#f97316",
      label: isAr ? "الاستكشاف" : "Discovery",
      desc: isAr ? "المفردات الأساسية والعبارات — أولى المحادثات الحقيقية" : "Core Vocabulary & Phrases — first real conversations",
      weeks: 8,
    },
    {
      num: "03",
      color: "#7c3aed",
      label: isAr ? "التعبير" : "Expression",
      desc: isAr ? "محادثات حقيقية — التحدث بثقة" : "Real Conversations — speaking with confidence",
      weeks: 8,
    },
    {
      num: "04",
      color: "#1B2E8F",
      label: isAr ? "الإتقان" : "Mastery",
      desc: isAr ? "الطلاقة والتحدث أمام الجمهور — لحظة التوك شو" : "Fluency & Public Speaking — the talk show moment",
      weeks: 8,
    },
  ];

  const parentTips = [
    {
      icon: "🎉",
      tip: isAr ? "احتفل بكل كلمة إنجليزية يقولها طفلك — مهما كانت صغيرة." : "Celebrate every English word your child uses — no matter how small.",
    },
    {
      icon: "🚫",
      tip: isAr ? "لا تصحح أخطاءه أمام الآخرين — الأمان العاطفي هو الوقود الأول." : "Never correct mistakes in front of others — emotional safety is the first fuel.",
    },
    {
      icon: "📱",
      tip: isAr ? "شغّل محتوى إنجليزياً في البيت — أغاني، قصص، أفلام مناسبة للعمر." : "Play English content at home — songs, stories, age-appropriate shows.",
    },
    {
      icon: "💬",
      tip: isAr ? "اسأله 'ماذا تعلمت اليوم؟' — التحدث عن التعلم يرسّخه." : 'Ask "What did you learn today?" — talking about learning reinforces it.',
    },
  ];

  if (cmsContent?.sections?.length > 0) {
    return (
      <div dir={isRTL ? "rtl" : "ltr"} className="pb-10">
        {cmsContent.sections.map((section: any) => (
          <SectionRenderer key={section.id} section={section} language={language} />
        ))}
      </div>
    );
  }

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="max-w-4xl mx-auto space-y-8 pb-10">

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <div
        className="rounded-3xl p-8 md:p-12 text-white text-center relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #0f1c5c 0%, #1B2E8F 50%, #7c3aed 100%)" }}
      >
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: "radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)", backgroundSize: "60px 60px" }} />
        <div className="relative">
          <div className="text-6xl mb-4">🗣️</div>
          <h1 className="text-3xl md:text-4xl font-black mb-3">
            {isAr ? "منهج كيدسبيك" : "The Kidspeak Method"}
          </h1>
          <p className="text-white/75 text-lg max-w-2xl mx-auto leading-relaxed">
            {isAr
              ? "نؤمن بأن كل طفل يستطيع التحدث بالإنجليزية بثقة. إليك كيف نجعل ذلك يحدث."
              : "We believe every child can speak English with confidence. Here's exactly how we make it happen."}
          </p>
        </div>
      </div>

      {/* ── Philosophy quote ─────────────────────────────────────────────── */}
      <div
        className="rounded-2xl border-2 p-6 text-center"
        style={{ borderColor: "#F5A600", backgroundColor: "#FFF8E8" }}
      >
        <p className="text-xl font-bold text-gray-800 leading-relaxed italic">
          &ldquo;{isAr
            ? "الدرجات ليست اللغة. التحدث هو اللغة."
            : "Grades are not the language. Speaking is the language."}&rdquo;
        </p>
        <p className="text-sm mt-2 font-semibold" style={{ color: "#b37800" }}>— Kidspeak Philosophy</p>
      </div>

      {/* ── The Problem ──────────────────────────────────────────────────── */}
      <Card className="border-red-100">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-red-700">
            <span className="text-2xl">⚠️</span>
            {isAr ? "المشكلة" : "The Problem with Traditional Learning"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm leading-relaxed mb-4">
            {isAr
              ? "المدارس التقليدية تُعلّم القواعد والمفردات — لكنها تنسى المهارة الأهم: فتح الفم والتحدث. معظم الأطفال يدرسون الإنجليزية لسنوات ولا يزالون يجمدون حين يُطلب منهم الكلام."
              : "Traditional schools teach grammar and vocabulary for years — but forget the most important skill: actually speaking. Most students study English for years and still freeze when asked to say a single sentence."}
          </p>
          <div className="grid sm:grid-cols-3 gap-3">
            {[
              { icon: "😰", label: isAr ? "الخوف من الأخطاء" : "Fear of Mistakes", desc: isAr ? "سنوات من الدراسة والتجمد لا يزال موجوداً" : "Years of study, still afraid to speak" },
              { icon: "📚", label: isAr ? "اكتظاظ القواعد" : "Grammar Overload", desc: isAr ? "نظرية كثيرة وتطبيق قليل جداً" : "Too much theory, too little practice" },
              { icon: "🎯", label: isAr ? "لا تطبيق في الواقع" : "No Real-World Use", desc: isAr ? "ما فائدة اللغة إن لم تستطع استخدامها؟" : "What's the point if you can't use it?" },
            ].map((c, i) => (
              <div key={i} className="rounded-xl bg-red-50 border border-red-100 p-3 text-center">
                <div className="text-2xl mb-1">{c.icon}</div>
                <p className="font-semibold text-sm text-red-700">{c.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{c.desc}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Speaking-First — 4 Steps ─────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2" style={{ color: "#1B2E8F" }}>
            <Mic className="w-5 h-5" />
            {isAr ? "منهج التحدث أولاً — ٤ خطوات" : "Speaking-First Approach — 4 Steps"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
            {isAr
              ? "نتبع نفس المسار الذي يسلكه كل إنسان في تعلم لغته الأم — التحدث أولاً، القراءة والكتابة لاحقاً."
              : "We follow the same path every human uses to learn their mother tongue — speaking first, reading and writing come naturally after."}
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            {steps.map((step, i) => (
              <div
                key={i}
                className="flex items-start gap-4 p-4 rounded-xl border hover:shadow-sm transition-shadow"
                style={{ borderColor: "#1B2E8F20", backgroundColor: "#1B2E8F04" }}
              >
                <div className="shrink-0 text-center">
                  <div className="text-3xl mb-1">{step.icon}</div>
                  <span className="text-xs font-black" style={{ color: "#1B2E8F" }}>{step.num}</span>
                </div>
                <div>
                  <p className="font-bold" style={{ color: "#1B2E8F" }}>{step.label}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Psychological Support ────────────────────────────────────────── */}
      <Card style={{ borderColor: "#7c3aed30" }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2" style={{ color: "#7c3aed" }}>
            <Brain className="w-5 h-5" />
            {isAr ? "الدعم النفسي — ركيزة أساسية" : "Psychological Support — A Core Pillar"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
            {isAr
              ? "الخوف هو العائق الأول أمام تعلم اللغة. تعمل أخصائيتنا النفسية جنباً إلى جنب مع كل معلم لتخفيض القلق بشكل منهجي وبناء الثقة، حتى يشعر كل طفل بالأمان الكافي ليجرؤ على الكلام."
              : "Fear is the number one barrier to speaking a language. Our psychologist works alongside every teacher to systematically reduce anxiety and build confidence — ensuring every child feels safe enough to take the risk of speaking."}
          </p>
          <div className="grid sm:grid-cols-3 gap-4">
            {psychPillars.map((p, i) => (
              <div
                key={i}
                className="rounded-xl border p-4 text-center"
                style={{ borderColor: "#7c3aed25", backgroundColor: "#7c3aed06" }}
              >
                <div className="text-3xl mb-2">{p.emoji}</div>
                <p className="font-semibold text-sm" style={{ color: "#7c3aed" }}>{p.label}</p>
                <p className="text-xs text-muted-foreground mt-1">{p.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-xl p-4 flex items-center gap-3" style={{ backgroundColor: "#7c3aed08", border: "1px solid #7c3aed20" }}>
            <Shield className="w-5 h-5 shrink-0" style={{ color: "#7c3aed" }} />
            <p className="text-sm text-muted-foreground leading-relaxed">
              {isAr
                ? "كل جلسة يتم تقييم ثقة الطفل من قِبل الأخصائية باستخدام 6 مؤشرات: الطلاقة الكلامية، الوضوح، المفردات، التواصل البصري، لغة الجسد، وتعابير الوجه."
                : "Every session, our psychologist rates each child on 6 indicators: verbal fluency, clarity, vocabulary, eye contact, body language, and facial expressions."}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ── 4 Levels to Fluency ──────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2" style={{ color: "#1B2E8F" }}>
            <GraduationCap className="w-5 h-5" />
            {isAr ? "٤ مستويات نحو الطلاقة" : "The 4 Levels to Fluency"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 gap-4">
            {levels.map((level, i) => (
              <div
                key={i}
                className="flex items-start gap-4 p-4 rounded-xl border hover:shadow-sm transition-shadow relative overflow-hidden"
              >
                <div
                  className="absolute top-0 start-0 bottom-0 w-1 rounded-s-xl"
                  style={{ backgroundColor: level.color }}
                />
                <span className="text-3xl font-black shrink-0 ms-2" style={{ color: level.color }}>
                  {level.num}
                </span>
                <div>
                  <p className="font-bold" style={{ color: level.color }}>{level.label}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{level.desc}</p>
                  <p className="text-xs mt-1.5 font-medium opacity-60">{level.weeks} {isAr ? "أسبوعاً" : "weeks"}</p>
                </div>
              </div>
            ))}
          </div>
          <div
            className="mt-4 rounded-xl p-4 text-center"
            style={{ backgroundColor: "#1B2E8F08", border: "1px solid #1B2E8F15" }}
          >
            <p className="text-sm text-muted-foreground">
              {isAr
                ? "كل مستوى هو رحلة تحول من ٨ أسابيع. يتقدم طفلك بوتيرته الطبيعية."
                : "Each level is an 8-week journey of transformation. Your child progresses at their natural pace."}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ── The Talk Show ────────────────────────────────────────────────── */}
      <div
        className="rounded-2xl p-6 text-white flex items-start gap-5"
        style={{ background: "linear-gradient(135deg, #F5A600, #f97316)" }}
      >
        <div className="shrink-0 text-4xl">🎤</div>
        <div>
          <h3 className="text-lg font-black mb-1">
            {isAr ? "برنامج التوك شو" : "The Talk Show"}
          </h3>
          <p className="text-white/85 text-sm leading-relaxed">
            {isAr
              ? "في نهاية كل مستوى، يقدم كل طفل أمام الجمهور في أسلوب برامج التوك شو. هذا الحدث يحوّل الخوف من التحدث إلى فخر وثقة لا تُنسى."
              : "At the end of each level, every child performs in a real talk-show style production. This event transforms the fear of speaking into pride and unforgettable confidence."}
          </p>
        </div>
      </div>

      {/* ── Parent Tips ──────────────────────────────────────────────────── */}
      <Card style={{ borderColor: "#F5A600" }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2" style={{ color: "#b37800" }}>
            <Star className="w-5 h-5" />
            {isAr ? "أنت الدعم الأعظم لطفلك" : "You Are Your Child's Greatest Support"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
            {isAr
              ? "يمتد تأثير الدرس إلى البيت. إليك بعض النصائح البسيطة لتعزيز تقدم طفلك:"
              : "The lesson's impact extends to home. Here are simple tips to reinforce your child's progress:"}
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            {parentTips.map((tip, i) => (
              <div
                key={i}
                className="flex items-start gap-3 p-3 rounded-xl border"
                style={{ borderColor: "#F5A60030", backgroundColor: "#FFF8E8" }}
              >
                <span className="text-xl shrink-0">{tip.icon}</span>
                <p className="text-sm text-gray-700 leading-relaxed">{tip.tip}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Promise ──────────────────────────────────────────────────────── */}
      <div
        className="rounded-2xl p-8 text-center text-white"
        style={{ background: "linear-gradient(135deg, #1B2E8F, #2a3fa0)" }}
      >
        <div className="text-4xl mb-3">🌟</div>
        <h3 className="text-xl font-black mb-2">
          {isAr ? "وعد كيدسبيك" : "The Kidspeak Promise"}
        </h3>
        <p className="text-white/75 text-sm max-w-lg mx-auto leading-relaxed">
          {isAr
            ? "نعدك بأن طفلك سيتحدث بالإنجليزية بثقة — لا خوف، لا تردد، لا قواعد تحبسه. فقط كلام حقيقي، وابتسامة حقيقية."
            : "We promise your child will speak English with confidence — no fear, no hesitation, no grammar holding them back. Just real speech and a real smile."}
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-3 text-sm">
          {[
            { icon: CheckCircle2, label: isAr ? "منهج التحدث أولاً" : "Speaking-First Method" },
            { icon: Brain, label: isAr ? "دعم نفسي متخصص" : "Psychological Support" },
            { icon: Users, label: isAr ? "بوابة أولياء الأمور" : "Parent Hub" },
            { icon: Star, label: isAr ? "شهادات ذكية" : "Smart Certificates" },
          ].map(({ icon: Icon, label }, i) => (
            <div key={i} className="flex items-center gap-1.5 bg-white/15 rounded-full px-3 py-1.5">
              <Icon className="w-3.5 h-3.5" />
              <span>{label}</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

// Shared shape of /public/cms/settings/landing_v3 payload.
// Admin edits these from "إدارة المحتوى → صفحة الهبوط" (Phase 2).
// Frontend reads them in pages/landing/index.tsx.

export type StatMode = "manual" | "hidden";

export interface StatConfig {
  mode: StatMode;
  value: number;          // shown when mode = "manual"
  suffix?: string;         // optional, e.g. "+"
}

export interface LandingSettings {
  // ── Hero ──────────────────────────────────────────────────────────────────
  hero: {
    badge: string;          // small label above headline (e.g. "منهج التحدث أولاً")
    title: string;          // main headline
    subtitle: string;       // supporting paragraph
    primaryCta: string;     // text on big CTA button (default "سجّل الآن")
    secondaryCta: string;   // text on secondary button (default "تعرّف على البرامج")
    videoUrl: string | null; // YouTube/Vimeo embed URL — if null, video block hidden
  };

  // ── Section visibility flags ─────────────────────────────────────────────
  sections: {
    pains: boolean;          // "هل تواجه هذه المشاكل؟"
    method: boolean;         // "كيف نحلّها — منهج Speaking First"
    differentiators: boolean; // "ما الذي يميّزنا"
    stats: boolean;          // الإحصائيات
    programs: boolean;       // البرامج + الأفواج المفتوحة
    testimonials: boolean;
    gallery: boolean;        // معرض الصور
    ctaBanner: boolean;
    register: boolean;       // النموذج النهائي
  };

  // ── Pains (parent concerns) ──────────────────────────────────────────────
  pains: {
    title: string;
    items: { title: string; body: string }[];
  };

  // ── Method (Speaking First) ──────────────────────────────────────────────
  method: {
    title: string;
    body: string;             // paragraph explaining the approach
    points: string[];         // 3-5 bullet points
  };

  // ── Differentiators ──────────────────────────────────────────────────────
  differentiators: {
    title: string;
    items: { title: string; body: string; icon: string }[]; // icon name from lucide
  };

  // ── Stats (manual or hidden — no auto for now per Phase 1 decision) ──────
  stats: {
    title: string;
    students: StatConfig & { label: string };
    teachers: StatConfig & { label: string };
    programs: StatConfig & { label: string };
    satisfaction: StatConfig & { label: string };
  };

  // ── Testimonials (sample / fake names) ───────────────────────────────────
  testimonials: {
    title: string;
    items: { name: string; relation: string; quote: string; rating: number }[];
  };

  // ── Gallery (image URLs — empty array hides the section) ────────────────
  gallery: {
    title: string;
    images: string[];
  };

  // ── CTA banner ──────────────────────────────────────────────────────────
  ctaBanner: {
    title: string;
    subtitle: string;
    buttonText: string;
  };

  // ── Register form ───────────────────────────────────────────────────────
  register: {
    title: string;
    subtitle: string;
  };

  // ── Footer ──────────────────────────────────────────────────────────────
  footer: {
    tagline: string;
  };
}

// Defaults shipped with the build. These are written in Algerian-Arabic-friendly
// MSA and avoid attacking competitors directly (per the brand decision in
// Phase 1). The admin can override every field from the CMS UI in Phase 2.
export const DEFAULT_LANDING_SETTINGS: LandingSettings = {
  hero: {
    badge: "منهج التحدث أولاً — Speaking First",
    title: "نُعلِّم طفلك الإنجليزية بالطريقة التي تعلَّم بها لغته الأم",
    subtitle:
      "كيدسبيك مركز متخصّص للأطفال من 7 إلى 13 سنة. لا نبدأ بالحروف ولا بقواعد لغوية مُعقَّدة — نبدأ بالكلام مباشرة، حتى يبني طفلك الثقة قبل الإتقان، والمتعة قبل الحفظ.",
    primaryCta: "سجِّل الآن",
    secondaryCta: "تعرَّف على البرامج",
    videoUrl: null,
  },

  sections: {
    pains: true,
    method: true,
    differentiators: true,
    stats: true,
    programs: true,
    testimonials: true,
    gallery: false,
    ctaBanner: true,
    register: true,
  },

  pains: {
    title: "ربما تواجه واحدةً من هذه المخاوف",
    items: [
      {
        title: "طفلك يعرف الكلمات لكنه لا يستطيع التحدُّث",
        body: "يحفظ المفردات في المدرسة، يُجيب في الامتحان، لكن أمام موقف حقيقي يصمت. السبب أن التعليم التقليدي يبدأ من الكتابة لا من النطق.",
      },
      {
        title: "جرَّبتَ من قبل ولم تحصل على نتيجة",
        body: "سَجَّلتَه في دروس خصوصية أو في مركز، ومرَّت أشهر دون أن تشعر بفرق حقيقي. تعلَم أن المشكلة ليست في طفلك بل في الطريقة.",
      },
      {
        title: "تخشى أن تفوت سنوات الذهب اللغوية",
        body: "بين 7 و 13 سنة الدماغ يكتسب اللغات بسرعة هائلة. كلما تأخَّر طفلك، كلما صَعُب عليه التحدُّث بطلاقة لاحقاً.",
      },
    ],
  },

  method: {
    title: "كيف يعمل منهج Speaking First؟",
    body: "بدلاً من أن نُعَلِّم طفلك حروفاً ثم كلماتٍ ثم قواعد منفصلة، نُعَلِّمه أن يَبني جُملاً كاملة منذ الحصة الأولى. هكذا يَتعلَّم الإنسان لغته الأم: يَسمع، يَفهم، يَتكلَّم، ثم — وفقط بعد ذلك — يقرأ ويكتب.",
    points: [
      "كل أستاذ في كيدسبيك مُدَرَّبٌ على منهجنا الخاص ويَخدُم بنفس الفلسفة، ويَتابعه فريقُنا أسبوعياً",
      "الحصص تَفاعليّة، لا تَلقين: الطفل يَتكلَّم أكثر من الأستاذ",
      "أخصائية نفسية تُتابع تطوُّر الأطفال وتَحلُّ العوائق التي تَعرقل التَعلُّم (الخجل، التشتُّت، نقص الثقة)",
      "في نهاية كل مستوى: تقرير اجتياز رسمي يُوضِّح ما اكتسبه طفلك بدقَّة",
      "مجموعات صغيرة لكل طفل وقتٌ كافٍ للمشاركة الفعليَّة",
    ],
  },

  differentiators: {
    title: "ما الذي يَجعل كيدسبيك مختلفاً",
    items: [
      {
        title: "أساتذة على منهج موحَّد",
        body: "لا نُوظِّف لِمَلْءِ الفصول. كلّ أستاذ يَمُرّ بتدريب على منهجنا قبل أن يَدخل القسم، ويتلقَّى متابعة مستمرَّة من فريقنا التربوي.",
        icon: "Users",
      },
      {
        title: "متابعة نفسية متخصِّصة",
        body: "أخصائية نفسية تَتابع كلّ طفل بشكل دوري، وتَتدخَّل في حالات الخجل أو التشتُّت أو ضعف الثقة قبل أن تتحوَّل إلى عائق.",
        icon: "Heart",
      },
      {
        title: "تقرير اجتياز رسمي",
        body: "في نهاية كل مستوى، تستلم تقريراً مُفصَّلاً يُبيِّن ما اكتسبه طفلك من مهارات: النطق، الفهم، بناء الجُمَل، الثقة في التحدُّث.",
        icon: "FileText",
      },
      {
        title: "مجموعات صغيرة",
        body: "نَحتفِظ بعدد محدود من الأطفال في كل فوج، حتى يحظى كلٌّ منهم بوقت كافٍ للمشاركة والتحدُّث في كل حصة.",
        icon: "BookOpen",
      },
    ],
  },

  stats: {
    title: "أرقام كيدسبيك",
    students:    { mode: "manual", value: 48,  label: "تلميذ", suffix: "+" },
    teachers:    { mode: "manual", value: 8,   label: "أستاذ" },
    programs:    { mode: "manual", value: 4,   label: "برنامج تعليمي" },
    satisfaction:{ mode: "manual", value: 96,  label: "رضا الأولياء", suffix: "%" },
  },

  testimonials: {
    title: "ماذا يقول الأولياء",
    items: [
      {
        name: "والدة أميرة",
        relation: "ابنتها في المستوى الثاني",
        quote: "بعد ثلاثة أشهر في كيدسبيك، أصبحت ابنتي تتحدَّث الإنجليزية بثقة في البيت. شفافية تامَّة ونتائج حقيقية.",
        rating: 5,
      },
      {
        name: "والد ياسين",
        relation: "ابنه في المستوى الأول",
        quote: "ما يُميِّز كيدسبيك هو متابعة الأخصائية النفسية لكل طفل. ابني أصبح أكثر جرأة وثقة بنفسه.",
        rating: 5,
      },
      {
        name: "والدة نور",
        relation: "ابنتها في المستوى الثالث",
        quote: "التطبيق يُتيح لي متابعة تقدُّم ابنتي يومياً. شفافية تامَّة ونتائج ملموسة منذ الأسابيع الأولى.",
        rating: 5,
      },
    ],
  },

  gallery: {
    title: "من داخل كيدسبيك",
    images: [],
  },

  ctaBanner: {
    title: "ابدأ رحلة طفلك اليوم",
    subtitle: "سَجِّل اهتمامك الآن وسيتواصل معك فريقنا خلال 24 ساعة لِتَرتيب جلسة تَقييم مجَّانيَّة",
    buttonText: "سَجِّل الآن مجَّاناً",
  },

  register: {
    title: "سَجِّل طفلك الآن",
    subtitle: "أرسِلْ لنا طلبك وسنتواصل معك خلال 24 ساعة لِتَرتيب جلسة تَقييم مجَّانيَّة",
  },

  footer: {
    tagline: "مركز كيدسبيك لتَعليم اللغات — منهج التحدث أولاً",
  },
};

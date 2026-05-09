
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
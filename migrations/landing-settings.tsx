import { useState, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { useGetMe } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import {
  DEFAULT_LANDING_SETTINGS,
  type LandingSettings,
  type StatMode,
} from "@/types/landing-settings";
import {
  Save, ExternalLink, RotateCcw, Eye, EyeOff, AlertCircle,
  Plus, Trash2, GripVertical, ChevronDown, ChevronUp,
} from "lucide-react";

export default function AdminLandingSettings() {
  const [, navigate] = useLocation();
  const { data: currentUser } = useGetMe();
  const { toast } = useToast();

  const [settings, setSettings] = useState<LandingSettings>(DEFAULT_LANDING_SETTINGS);
  const [original, setOriginal] = useState<LandingSettings>(DEFAULT_LANDING_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const role = (currentUser as any)?.role;
  const canEdit = role === "admin" || role === "branch_manager";

  useEffect(() => {
    if (currentUser && !canEdit) {
      toast({
        title: "غير مسموح",
        description: "هذه الصفحة متاحة فقط للمدير ومدير الفرع.",
        variant: "destructive",
      });
      navigate("/dashboard");
    }
  }, [currentUser, canEdit, navigate, toast]);

  useEffect(() => {
    if (!canEdit) return;
    fetch("/api/admin/cms/settings/landing_v3", { credentials: "include" })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((res) => {
        if (res?.data) {
          const merged = deepMerge(DEFAULT_LANDING_SETTINGS, res.data);
          setSettings(merged);
          setOriginal(merged);
        }
        setLoading(false);
      })
      .catch((e) => {
        setError(`تعذّر تحميل الإعدادات: ${e.message}`);
        setLoading(false);
      });
  }, [canEdit]);

  const hasChanges = JSON.stringify(settings) !== JSON.stringify(original);

  const handleSave = async () => {
    setSaving(true);
    try {
      const r = await fetch("/api/admin/cms/settings/landing_v3", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(settings),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error((err as any).error || `HTTP ${r.status}`);
      }
      setOriginal(settings);
      toast({ title: "تم الحفظ ✓", description: "التغييرات ظاهرة الآن على الصفحة الرئيسية." });
    } catch (e: any) {
      toast({ title: "تعذّر الحفظ", description: e?.message ?? "حاول مرة أخرى.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    if (!confirm("سيتم إلغاء كل التعديلات غير المحفوظة. متابعة؟")) return;
    setSettings(original);
  };

  const handleResetDefaults = () => {
    if (!confirm("سيُعيد هذا كل النصوص إلى القيم الافتراضية. متابعة؟")) return;
    setSettings(DEFAULT_LANDING_SETTINGS);
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground">جاري التحميل…</div>;
  if (error) return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="rounded-lg p-4 bg-destructive/10 border border-destructive/30 text-destructive flex gap-2">
        <AlertCircle className="w-5 h-5 shrink-0" /><span>{error}</span>
      </div>
    </div>
  );

  // ── Section helpers ──────────────────────────────────────────────────────
  const setHero = (patch: Partial<LandingSettings["hero"]>) =>
    setSettings(s => ({ ...s, hero: { ...s.hero, ...patch } }));
  const setSection = (key: keyof LandingSettings["sections"], visible: boolean) =>
    setSettings(s => ({ ...s, sections: { ...s.sections, [key]: visible } }));
  const setStat = (
    key: "students" | "teachers" | "programs" | "satisfaction",
    patch: Partial<LandingSettings["stats"]["students"]>,
  ) => setSettings(s => ({ ...s, stats: { ...s.stats, [key]: { ...s.stats[key], ...patch } } }));
  const setStatsTitle = (title: string) =>
    setSettings(s => ({ ...s, stats: { ...s.stats, title } }));
  const setCtaBanner = (patch: Partial<LandingSettings["ctaBanner"]>) =>
    setSettings(s => ({ ...s, ctaBanner: { ...s.ctaBanner, ...patch } }));
  const setRegister = (patch: Partial<LandingSettings["register"]>) =>
    setSettings(s => ({ ...s, register: { ...s.register, ...patch } }));
  const setFooter = (patch: Partial<LandingSettings["footer"]>) =>
    setSettings(s => ({ ...s, footer: { ...s.footer, ...patch } }));

  // ── Pains helpers ────────────────────────────────────────────────────────
  const setPainsTitle = (title: string) =>
    setSettings(s => ({ ...s, pains: { ...s.pains, title } }));
  const setPainItem = (i: number, patch: Partial<{ title: string; body: string }>) =>
    setSettings(s => ({
      ...s, pains: {
        ...s.pains,
        items: s.pains.items.map((item, idx) => idx === i ? { ...item, ...patch } : item),
      },
    }));
  const addPainItem = () =>
    setSettings(s => ({
      ...s, pains: {
        ...s.pains, items: [...s.pains.items, { title: "عنوان المخاوف", body: "وصف المشكلة…" }],
      },
    }));
  const removePainItem = (i: number) =>
    setSettings(s => ({
      ...s, pains: { ...s.pains, items: s.pains.items.filter((_, idx) => idx !== i) },
    }));
  const movePainItem = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    setSettings(s => {
      const items = [...s.pains.items];
      [items[i], items[j]] = [items[j], items[i]];
      return { ...s, pains: { ...s.pains, items } };
    });
  };

  // ── Method helpers ───────────────────────────────────────────────────────
  const setMethodField = (patch: Partial<LandingSettings["method"]>) =>
    setSettings(s => ({ ...s, method: { ...s.method, ...patch } }));
  const setMethodPoint = (i: number, val: string) =>
    setSettings(s => ({
      ...s, method: {
        ...s.method, points: s.method.points.map((p, idx) => idx === i ? val : p),
      },
    }));
  const addMethodPoint = () =>
    setSettings(s => ({ ...s, method: { ...s.method, points: [...s.method.points, "نقطة جديدة…"] } }));
  const removeMethodPoint = (i: number) =>
    setSettings(s => ({ ...s, method: { ...s.method, points: s.method.points.filter((_, idx) => idx !== i) } }));

  // ── Differentiators helpers ──────────────────────────────────────────────
  const setDiffTitle = (title: string) =>
    setSettings(s => ({ ...s, differentiators: { ...s.differentiators, title } }));
  const setDiffItem = (i: number, patch: Partial<{ title: string; body: string; icon: string }>) =>
    setSettings(s => ({
      ...s, differentiators: {
        ...s.differentiators,
        items: s.differentiators.items.map((item, idx) => idx === i ? { ...item, ...patch } : item),
      },
    }));
  const addDiffItem = () =>
    setSettings(s => ({
      ...s, differentiators: {
        ...s.differentiators,
        items: [...s.differentiators.items, { title: "ميزة جديدة", body: "وصف الميزة…", icon: "Star" }],
      },
    }));
  const removeDiffItem = (i: number) =>
    setSettings(s => ({
      ...s, differentiators: {
        ...s.differentiators,
        items: s.differentiators.items.filter((_, idx) => idx !== i),
      },
    }));

  const sectionLabels: { key: keyof LandingSettings["sections"]; label: string }[] = [
    { key: "pains",           label: "قسم المخاوف (ربما تواجه…)" },
    { key: "method",          label: "قسم المنهج (Speaking First)" },
    { key: "differentiators", label: "قسم ما يميِّزنا" },
    { key: "stats",           label: "قسم الإحصائيات" },
    { key: "programs",        label: "قسم البرامج والأفواج" },
    { key: "testimonials",    label: "قسم آراء الأولياء" },
    { key: "gallery",         label: "قسم المعرض" },
    { key: "ctaBanner",       label: "بانر التحفيز للتسجيل" },
    { key: "register",        label: "نموذج التسجيل" },
  ];

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-8 space-y-6 pb-28">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black">إعدادات صفحة الهبوط</h1>
          <p className="text-sm text-muted-foreground mt-1">
            تعديل كل محتوى kidspeakdz.com — التغييرات تنعكس فور الحفظ.
          </p>
        </div>
        <a href="/" target="_blank" rel="noreferrer"
           className="inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-2 rounded-md border hover:bg-muted transition-colors">
          <ExternalLink className="w-4 h-4" />
          معاينة الصفحة
        </a>
      </div>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* 1. HERO                                                           */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <SectionCard title="القسم الترحيبي (Hero)" subtitle="أول ما يراه الزائر">
        <Field label="نص الـ badge (فوق العنوان)" value={settings.hero.badge}
               onChange={v => setHero({ badge: v })} />
        <Field label="العنوان الرئيسي" value={settings.hero.title}
               onChange={v => setHero({ title: v })} multiline rows={2} />
        <Field label="العنوان الفرعي" value={settings.hero.subtitle}
               onChange={v => setHero({ subtitle: v })} multiline rows={3} />
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="نص الزر الأساسي" value={settings.hero.primaryCta}
                 onChange={v => setHero({ primaryCta: v })} />
          <Field label="نص الزر الثانوي" value={settings.hero.secondaryCta}
                 onChange={v => setHero({ secondaryCta: v })} />
        </div>
        <Field label="رابط فيديو الـ Hero (YouTube — اختياري)"
               value={settings.hero.videoUrl ?? ""}
               onChange={v => setHero({ videoUrl: v.trim() ? v : null })}
               placeholder="https://youtube.com/watch?v=…" />
        {!settings.hero.videoUrl && (
          <p className="text-xs text-muted-foreground">اتركه فارغاً لإخفاء قسم الفيديو.</p>
        )}
      </SectionCard>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* 2. SECTION VISIBILITY                                             */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <SectionCard title="إظهار وإخفاء الأقسام" subtitle="9 أقسام — أخفِ ما لا تحتاجه">
        <div className="grid sm:grid-cols-2 gap-2">
          {sectionLabels.map(({ key, label }) => {
            const visible = settings.sections[key];
            return (
              <button key={key} type="button"
                onClick={() => setSection(key, !visible)}
                className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg border text-sm transition-colors text-start
                  ${visible
                    ? "bg-emerald-50 border-emerald-200 text-emerald-900 hover:bg-emerald-100"
                    : "bg-muted/40 border-muted text-muted-foreground hover:bg-muted/70"}`}>
                <span className="font-medium">{label}</span>
                {visible ? <Eye className="w-4 h-4 shrink-0" /> : <EyeOff className="w-4 h-4 shrink-0" />}
              </button>
            );
          })}
        </div>
      </SectionCard>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* 3. PAINS                                                          */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <SectionCard title="قسم المخاوف" subtitle="البطاقات التي تصف مشاكل الأولياء — يمكن إضافة أو حذف بطاقات">
        <Field label="عنوان القسم" value={settings.pains.title}
               onChange={setPainsTitle} />
        <div className="space-y-3">
          {settings.pains.items.map((item, i) => (
            <ArrayCard
              key={i}
              index={i}
              total={settings.pains.items.length}
              onMoveUp={() => movePainItem(i, -1)}
              onMoveDown={() => movePainItem(i, 1)}
              onDelete={() => removePainItem(i)}
            >
              <Field label="عنوان البطاقة" value={item.title}
                     onChange={v => setPainItem(i, { title: v })} />
              <Field label="وصف المشكلة" value={item.body}
                     onChange={v => setPainItem(i, { body: v })} multiline rows={3} />
            </ArrayCard>
          ))}
        </div>
        <AddButton onClick={addPainItem} label="إضافة مخاوف جديدة" />
      </SectionCard>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* 4. METHOD                                                         */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <SectionCard title="قسم المنهج (Speaking First)" subtitle="شرح الطريقة + نقاط قابلة للتعديل">
        <Field label="عنوان القسم" value={settings.method.title}
               onChange={v => setMethodField({ title: v })} />
        <Field label="فقرة شرح المنهج" value={settings.method.body}
               onChange={v => setMethodField({ body: v })} multiline rows={4} />
        <div className="space-y-2">
          <label className="block text-xs font-bold text-muted-foreground">نقاط المنهج (قائمة)</label>
          {settings.method.points.map((pt, i) => (
            <div key={i} className="flex gap-2 items-start">
              <span className="w-5 h-5 mt-2 text-xs font-bold text-muted-foreground shrink-0 text-center">
                {i + 1}
              </span>
              <textarea
                value={pt}
                rows={2}
                onChange={e => setMethodPoint(i, e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/30 resize-y"
              />
              <button type="button" onClick={() => removeMethodPoint(i)}
                      className="mt-1.5 p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors shrink-0"
                      title="حذف">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          <AddButton onClick={addMethodPoint} label="إضافة نقطة" />
        </div>
      </SectionCard>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* 5. DIFFERENTIATORS                                                */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <SectionCard title="قسم ما يميِّزنا" subtitle="بطاقات التميُّز — يمكن تعديل النص والأيقونة">
        <Field label="عنوان القسم" value={settings.differentiators.title}
               onChange={setDiffTitle} />
        <div className="space-y-3">
          {settings.differentiators.items.map((item, i) => (
            <ArrayCard
              key={i}
              index={i}
              total={settings.differentiators.items.length}
              onMoveUp={() => {
                setSettings(s => {
                  const items = [...s.differentiators.items];
                  [items[i], items[i - 1]] = [items[i - 1], items[i]];
                  return { ...s, differentiators: { ...s.differentiators, items } };
                });
              }}
              onMoveDown={() => {
                setSettings(s => {
                  const items = [...s.differentiators.items];
                  [items[i], items[i + 1]] = [items[i + 1], items[i]];
                  return { ...s, differentiators: { ...s.differentiators, items } };
                });
              }}
              onDelete={() => removeDiffItem(i)}
            >
              <div className="grid sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <Field label="عنوان البطاقة" value={item.title}
                         onChange={v => setDiffItem(i, { title: v })} />
                </div>
                <div>
                  <Field label="اسم الأيقونة (Lucide)" value={item.icon}
                         onChange={v => setDiffItem(i, { icon: v })}
                         placeholder="مثال: Users, Heart, Star" />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    اختر من{" "}
                    <a href="https://lucide.dev/icons" target="_blank" rel="noreferrer"
                       className="underline hover:text-primary">lucide.dev/icons</a>
                  </p>
                </div>
              </div>
              <Field label="وصف الميزة" value={item.body}
                     onChange={v => setDiffItem(i, { body: v })} multiline rows={3} />
            </ArrayCard>
          ))}
        </div>
        <AddButton onClick={addDiffItem} label="إضافة ميزة جديدة" />
      </SectionCard>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* 6. STATS                                                          */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <SectionCard title="الإحصائيات" subtitle="كل بطاقة: مخفية أو يدوية بقيمة معيّنة">
        <Field label="عنوان قسم الإحصائيات" value={settings.stats.title}
               onChange={setStatsTitle} />
        <div className="space-y-3">
          <StatRow label="التلاميذ"    stat={settings.stats.students}     onChange={p => setStat("students", p)} />
          <StatRow label="الأساتذة"   stat={settings.stats.teachers}     onChange={p => setStat("teachers", p)} />
          <StatRow label="البرامج"    stat={settings.stats.programs}     onChange={p => setStat("programs", p)} />
          <StatRow label="رضا الأولياء" stat={settings.stats.satisfaction} onChange={p => setStat("satisfaction", p)} />
        </div>
      </SectionCard>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* 7. CTA BANNER                                                     */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <SectionCard title="بانر التحفيز" subtitle="الشريط الأخضر قبل النموذج">
        <Field label="العنوان" value={settings.ctaBanner.title}
               onChange={v => setCtaBanner({ title: v })} />
        <Field label="الوصف" value={settings.ctaBanner.subtitle}
               onChange={v => setCtaBanner({ subtitle: v })} multiline rows={2} />
        <Field label="نص الزر" value={settings.ctaBanner.buttonText}
               onChange={v => setCtaBanner({ buttonText: v })} />
      </SectionCard>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* 8. REGISTER FORM                                                  */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <SectionCard title="نموذج التسجيل" subtitle="عنوان وشرح فوق الحقول">
        <Field label="العنوان" value={settings.register.title}
               onChange={v => setRegister({ title: v })} />
        <Field label="الشرح" value={settings.register.subtitle}
               onChange={v => setRegister({ subtitle: v })} multiline rows={2} />
      </SectionCard>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* 9. FOOTER                                                         */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <SectionCard title="الفوتر" subtitle="الجملة الصغيرة تحت الشعار">
        <Field label="نص الفوتر" value={settings.footer.tagline}
               onChange={v => setFooter({ tagline: v })} multiline rows={2} />
      </SectionCard>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* 10. TESTIMONIALS                                                  */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <SectionCard title="شهادات الأولياء" subtitle="إضافة أو تعديل أو حذف شهادات — تظهر في قسم آراء الأولياء">
        <Field label="عنوان القسم" value={settings.testimonials.title}
               onChange={v => setSettings(s => ({ ...s, testimonials: { ...s.testimonials, title: v } }))} />
        <div className="space-y-3">
          {settings.testimonials.items.map((item, i) => (
            <ArrayCard
              key={i}
              index={i}
              total={settings.testimonials.items.length}
              onMoveUp={() => setSettings(s => {
                const items = [...s.testimonials.items];
                [items[i], items[i - 1]] = [items[i - 1], items[i]];
                return { ...s, testimonials: { ...s.testimonials, items } };
              })}
              onMoveDown={() => setSettings(s => {
                const items = [...s.testimonials.items];
                [items[i], items[i + 1]] = [items[i + 1], items[i]];
                return { ...s, testimonials: { ...s.testimonials, items } };
              })}
              onDelete={() => setSettings(s => ({
                ...s,
                testimonials: {
                  ...s.testimonials,
                  items: s.testimonials.items.filter((_, idx) => idx !== i),
                },
              }))}
            >
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="اسم الولي" value={item.name}
                       onChange={v => setSettings(s => ({
                         ...s, testimonials: {
                           ...s.testimonials,
                           items: s.testimonials.items.map((t, idx) => idx === i ? { ...t, name: v } : t),
                         },
                       }))} />
                <Field label="الصفة (مثال: والدة أميرة)" value={item.relation}
                       onChange={v => setSettings(s => ({
                         ...s, testimonials: {
                           ...s.testimonials,
                           items: s.testimonials.items.map((t, idx) => idx === i ? { ...t, relation: v } : t),
                         },
                       }))} />
              </div>
              <Field label="نص الشهادة" value={item.quote}
                     onChange={v => setSettings(s => ({
                       ...s, testimonials: {
                         ...s.testimonials,
                         items: s.testimonials.items.map((t, idx) => idx === i ? { ...t, quote: v } : t),
                       },
                     }))} multiline rows={3} />
              {/* Star rating */}
              <div>
                <label className="block text-xs font-bold mb-1.5 text-muted-foreground">التقييم</label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button key={star} type="button"
                            onClick={() => setSettings(s => ({
                              ...s, testimonials: {
                                ...s.testimonials,
                                items: s.testimonials.items.map((t, idx) =>
                                  idx === i ? { ...t, rating: star } : t),
                              },
                            }))}
                            className={`text-xl transition-colors ${star <= item.rating ? "text-amber-400" : "text-muted-foreground/30 hover:text-amber-300"}`}>
                      ★
                    </button>
                  ))}
                  <span className="text-xs text-muted-foreground self-center mr-2">{item.rating}/5</span>
                </div>
              </div>
            </ArrayCard>
          ))}
        </div>
        <AddButton
          onClick={() => setSettings(s => ({
            ...s,
            testimonials: {
              ...s.testimonials,
              items: [
                ...s.testimonials.items,
                { name: "اسم الولي", relation: "علاقته بالطفل", quote: "نص الشهادة…", rating: 5 },
              ],
            },
          }))}
          label="إضافة شهادة جديدة"
        />
      </SectionCard>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* 11. GALLERY                                                       */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <SectionCard title="معرض الصور" subtitle="أضف روابط صور المركز — القسم يظهر تلقائياً عند وجود صورة واحدة على الأقل">
        <Field label="عنوان قسم المعرض" value={settings.gallery.title}
               onChange={v => setSettings(s => ({ ...s, gallery: { ...s.gallery, title: v } }))} />
        <div className="space-y-2">
          {settings.gallery.images.map((url, i) => (
            <div key={i} className="flex gap-2 items-center">
              <span className="w-6 text-xs font-bold text-muted-foreground text-center shrink-0">{i + 1}</span>
              <input
                type="url"
                value={url}
                placeholder="https://example.com/photo.jpg"
                onChange={e => setSettings(s => ({
                  ...s, gallery: {
                    ...s.gallery,
                    images: s.gallery.images.map((img, idx) => idx === i ? e.target.value : img),
                  },
                }))}
                className="flex-1 px-3 py-2 rounded-lg border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/30"
              />
              {/* preview thumbnail */}
              {url && (
                <img src={url} alt=""
                     className="w-10 h-10 rounded object-cover border shrink-0"
                     onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
              )}
              <button type="button"
                      onClick={() => setSettings(s => ({
                        ...s, gallery: {
                          ...s.gallery,
                          images: s.gallery.images.filter((_, idx) => idx !== i),
                        },
                      }))}
                      className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors shrink-0">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
        <AddButton
          onClick={() => setSettings(s => ({
            ...s, gallery: { ...s.gallery, images: [...s.gallery.images, ""] },
          }))}
          label="إضافة رابط صورة"
        />
        {settings.gallery.images.length === 0 && (
          <p className="text-xs text-muted-foreground">
            لا توجد صور — قسم المعرض مخفي تلقائياً. أضف رابط صورة واحدة لتفعيله.
          </p>
        )}
      </SectionCard>

      {/* ── Sticky bottom bar ───────────────────────────────────────────── */}
      <div className="fixed bottom-0 inset-x-0 z-30 border-t bg-background/95 backdrop-blur p-3 sm:p-4 shadow-lg">
        <div className="max-w-4xl mx-auto flex flex-wrap items-center gap-2 sm:gap-3 justify-between">
          <div className="text-sm">
            {hasChanges
              ? <span className="text-amber-700 font-medium">● تغييرات غير محفوظة</span>
              : <span className="text-muted-foreground">جميع التغييرات محفوظة</span>}
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={handleResetDefaults}
                    className="text-xs sm:text-sm px-3 py-2 rounded-md border hover:bg-muted text-muted-foreground inline-flex items-center gap-1.5"
                    title="استعادة كل النصوص للقيم الافتراضية">
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">استعادة الافتراضي</span>
              <span className="sm:hidden">افتراضي</span>
            </button>
            {hasChanges && (
              <button onClick={handleDiscard}
                      className="text-xs sm:text-sm px-3 py-2 rounded-md border hover:bg-muted text-muted-foreground">
                إلغاء
              </button>
            )}
            <button onClick={handleSave}
                    disabled={!hasChanges || saving}
                    className="text-sm px-4 py-2 rounded-md bg-primary text-primary-foreground font-bold inline-flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed">
              <Save className="w-4 h-4" />
              {saving ? "جاري الحفظ…" : "حفظ التغييرات"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Deep merge (preserves nested defaults) ─────────────────────────────────
function deepMerge<T extends object>(defaults: T, overrides: Partial<T>): T {
  const result = { ...defaults };
  for (const key of Object.keys(overrides) as (keyof T)[]) {
    const ov = overrides[key];
    const dv = defaults[key];
    if (
      ov !== null &&
      typeof ov === "object" &&
      !Array.isArray(ov) &&
      dv !== null &&
      typeof dv === "object" &&
      !Array.isArray(dv)
    ) {
      (result as any)[key] = deepMerge(dv as object, ov as object);
    } else if (ov !== undefined) {
      (result as any)[key] = ov;
    }
  }
  return result;
}

// ── ArrayCard — card wrapper with move up/down + delete ───────────────────
function ArrayCard({
  index, total, onMoveUp, onMoveDown, onDelete, children,
}: {
  index: number;
  total: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border bg-background p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-muted-foreground">#{index + 1}</span>
        <div className="flex items-center gap-1">
          <button type="button" onClick={onMoveUp} disabled={index === 0}
                  className="p-1 rounded hover:bg-muted disabled:opacity-30 transition-colors">
            <ChevronUp className="w-4 h-4" />
          </button>
          <button type="button" onClick={onMoveDown} disabled={index === total - 1}
                  className="p-1 rounded hover:bg-muted disabled:opacity-30 transition-colors">
            <ChevronDown className="w-4 h-4" />
          </button>
          <button type="button" onClick={onDelete}
                  className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      {children}
    </div>
  );
}

// ── AddButton ──────────────────────────────────────────────────────────────
function AddButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button type="button" onClick={onClick}
            className="w-full py-2.5 rounded-lg border border-dashed text-sm font-semibold text-muted-foreground hover:text-primary hover:border-primary transition-colors inline-flex items-center justify-center gap-2">
      <Plus className="w-4 h-4" />
      {label}
    </button>
  );
}

// ── SectionCard ───────────────────────────────────────────────────────────
function SectionCard({ title, subtitle, children }: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border bg-card p-4 sm:p-6 space-y-4">
      <div>
        <h2 className="text-lg sm:text-xl font-bold">{title}</h2>
        {subtitle && <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

// ── Field ──────────────────────────────────────────────────────────────────
function Field({ label, value, onChange, placeholder, multiline, rows = 2 }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  rows?: number;
}) {
  const cls = "w-full px-3 py-2 rounded-lg border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/30";
  return (
    <div>
      <label className="block text-xs font-bold mb-1.5 text-muted-foreground">{label}</label>
      {multiline
        ? <textarea value={value} rows={rows} placeholder={placeholder}
                    onChange={e => onChange(e.target.value)}
                    className={cls + " resize-y"} />
        : <input type="text" value={value} placeholder={placeholder}
                 onChange={e => onChange(e.target.value)}
                 className={cls} />}
    </div>
  );
}

// ── StatRow ────────────────────────────────────────────────────────────────
function StatRow({ label, stat, onChange }: {
  label: string;
  stat: { mode: StatMode; value: number; label: string; suffix?: string };
  onChange: (patch: Partial<typeof stat>) => void;
}) {
  return (
    <div className="rounded-lg border p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="font-bold text-sm">{label}</span>
        <div className="flex gap-1">
          <ModeButton active={stat.mode === "manual"} onClick={() => onChange({ mode: "manual" })}>ظاهر</ModeButton>
          <ModeButton active={stat.mode === "hidden"} onClick={() => onChange({ mode: "hidden" })}>مخفي</ModeButton>
        </div>
      </div>
      {stat.mode === "manual" && (
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="block text-[10px] font-bold mb-0.5 text-muted-foreground">القيمة</label>
            <input type="number" value={stat.value}
                   onChange={e => onChange({ value: Number(e.target.value) })}
                   className="w-full px-2 py-1.5 rounded border text-sm bg-background outline-none" />
          </div>
          <div>
            <label className="block text-[10px] font-bold mb-0.5 text-muted-foreground">اللاحقة</label>
            <input type="text" value={stat.suffix ?? ""} placeholder="+ , %"
                   onChange={e => onChange({ suffix: e.target.value || undefined })}
                   className="w-full px-2 py-1.5 rounded border text-sm bg-background outline-none" />
          </div>
          <div>
            <label className="block text-[10px] font-bold mb-0.5 text-muted-foreground">التسمية</label>
            <input type="text" value={stat.label}
                   onChange={e => onChange({ label: e.target.value })}
                   className="w-full px-2 py-1.5 rounded border text-sm bg-background outline-none" />
          </div>
        </div>
      )}
    </div>
  );
}

function ModeButton({ active, onClick, children }: {
  active: boolean; onClick: () => void; children: React.ReactNode;
}) {
  return (
    <button type="button" onClick={onClick}
            className={`text-xs font-semibold px-2.5 py-1 rounded transition-colors
              ${active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
      {children}
    </button>
  );
}

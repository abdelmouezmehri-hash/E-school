import { useState } from "react";
import { useLanguage } from "@/contexts/language-context";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CalendarDays, ClipboardList, Sun, Sparkles, Users, TrendingUp,
  Pause, Play, Eye, Edit2, Plus, Download, Megaphone, Target,
  Zap, Phone, Mail, MessageCircle, Trash2, CheckCircle2,
  X, UserCheck, Ban, ChevronDown, Link2, DollarSign,
  Receipt, PlusCircle, BarChart3, UserPlus, Star,
} from "lucide-react";
import { format } from "date-fns";
import {
  useListCampaigns, useCreateCampaign, useUpdateCampaign, useDeleteCampaign,
  useListLeads, useAddLead, useUpdateLead, useDeleteLead,
  useListStandaloneLeads, useAddStandaloneLead,
  useGetCampaignROI, useAddCampaignExpense, useDeleteCampaignExpense,
  useConvertLeadToStudent,
  useRequestEnrollment,
  customFetch,
  type Campaign, type Lead, type CampaignType, type LeadStatus,
  type CampaignBenefit, type CampaignTestimonial,
} from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";

// ── Constants ──────────────────────────────────────────────────────────────────
const BRAND_BLUE   = "#1B2E8F";
const BRAND_YELLOW = "#F5A600";

function safeFmt(d: string | null | undefined, fmt: string) {
  if (!d) return "—";
  const date = new Date(d);
  return isNaN(date.getTime()) ? String(d) : format(date, fmt);
}

function fmtDA(n: number) {
  return n.toLocaleString("fr-DZ", { maximumFractionDigits: 0 }) + " DA";
}

// ── Config maps ────────────────────────────────────────────────────────────────
const TYPE_CONFIG: Record<CampaignType, { icon: React.ElementType; label: string; labelAr: string; color: string }> = {
  open_day:           { icon: CalendarDays,  label: "Open Day",           labelAr: "يوم مفتوح",    color: "#7c3aed" },
  early_registration: { icon: ClipboardList, label: "Early Registration", labelAr: "تسجيل مبكر",   color: BRAND_BLUE },
  summer_school:      { icon: Sun,           label: "Summer School",      labelAr: "مدرسة صيفية",  color: "#ea580c" },
  custom:             { icon: Sparkles,      label: "Custom",             labelAr: "حملة مخصصة",   color: "#16a34a" },
};

const STATUS_CONFIG = {
  active: { label: "Active", labelAr: "نشطة",   color: "#16a34a", bg: "#f0fdf4", border: "#16a34a", dot: "#16a34a" },
  paused: { label: "Paused", labelAr: "موقوفة", color: "#b45309", bg: "#fffbeb", border: "#F5A600", dot: "#F5A600" },
  ended:  { label: "Ended",  labelAr: "منتهية", color: "#64748b", bg: "#f8fafc", border: "#cbd5e1", dot: "#94a3b8" },
};

const LEAD_STATUS_CONFIG: Record<LeadStatus, { label: string; labelAr: string; color: string; bg: string; icon: React.ElementType }> = {
  new:            { label: "New",            labelAr: "جديد",        color: BRAND_BLUE,  bg: `${BRAND_BLUE}12`, icon: Zap },
  contacted:      { label: "Contacted",      labelAr: "تم التواصل",  color: "#0891b2",   bg: "#ecfeff",        icon: Phone },
  interested:     { label: "Interested",     labelAr: "مهتم",        color: "#7c3aed",   bg: "#f5f3ff",        icon: CheckCircle2 },
  registered:     { label: "Registered",     labelAr: "مسجّل",        color: "#16a34a",   bg: "#f0fdf4",        icon: UserCheck },
  not_interested: { label: "Not Interested", labelAr: "غير مهتم",    color: "#94a3b8",   bg: "#f8fafc",        icon: Ban },
};

// ── StaffSelector component (shared) ──────────────────────────────────────────
function useStaffUsers() {
  const { data: users = [] } = useQuery<{ id: number; name: string; role: string }[]>({
    queryKey: ["users-list"],
    queryFn: () => fetch("/api/users", { credentials: "include" }).then(r => r.json()),
  });
  return users.filter(u => ["admin", "accountant"].includes(u.role));
}

const DEFAULT_BENEFITS: CampaignBenefit[] = [
  { icon: "🎓", titleEn: "Expert Teachers", titleAr: "أساتذة متخصصون", descEn: "Certified language instructors with years of experience", descAr: "مدرسون معتمدون بخبرة واسعة في تعليم اللغات" },
  { icon: "🌍", titleEn: "Bilingual Learning", titleAr: "تعلم ثنائي اللغة", descEn: "English and Arabic immersive curriculum", descAr: "منهج غامر بالعربية والإنجليزية" },
  { icon: "🎮", titleEn: "Fun Activities", titleAr: "أنشطة ممتعة", descEn: "Games, songs, and interactive lessons for kids", descAr: "ألعاب وأغاني ودروس تفاعلية للأطفال" },
  { icon: "📱", titleEn: "Digital Learning", titleAr: "تعلم رقمي", descEn: "Modern tools and technology in every classroom", descAr: "أدوات وتقنيات حديثة في كل فصل" },
  { icon: "👨‍👩‍👧", titleEn: "Family Support", titleAr: "دعم الأسرة", descEn: "Regular progress reports for parents", descAr: "تقارير دورية للآباء عن تقدم أبنائهم" },
  { icon: "🏆", titleEn: "Certified Results", titleAr: "نتائج معتمدة", descEn: "Internationally recognized certificates", descAr: "شهادات معترف بها دولياً" },
];

const EMPTY_BENEFIT: CampaignBenefit = { icon: "⭐", titleEn: "", titleAr: "", descEn: "", descAr: "" };
const EMPTY_TESTIMONIAL: CampaignTestimonial = { name: "", role: "", text: "", rating: 5 };

// ── CampaignFormModal ──────────────────────────────────────────────────────────
function CampaignFormModal({
  campaign, onClose, isRTL,
}: { campaign?: Campaign; onClose: () => void; isRTL: boolean }) {
  const { toast } = useToast();
  const createCampaign = useCreateCampaign();
  const updateCampaign = useUpdateCampaign();
  const salesUsers = useStaffUsers();
  const isEdit = !!campaign;

  const [form, setForm] = useState({
    name: campaign?.name ?? "",
    nameAr: campaign?.nameAr ?? "",
    type: (campaign?.type ?? "custom") as CampaignType,
    startDate: campaign?.startDate ?? "",
    endDate: campaign?.endDate ?? "",
    ctaType: (campaign?.ctaType ?? "form") as "whatsapp" | "form" | "call",
    whatsappNumber: campaign?.whatsappNumber ?? "",
    description: campaign?.description ?? "",
    assignedTo: campaign?.assignedTo ? String(campaign.assignedTo) : "",
    landingPageEnabled: campaign?.landingPageEnabled ?? false,
    landingPageTitle: campaign?.landingPageTitle ?? "",
    landingPageSubtitle: campaign?.landingPageSubtitle ?? "",
    landingPageColor: campaign?.landingPageColor ?? "#1B2E8F",
    heroTitleEn: campaign?.heroTitleEn ?? "",
    heroTitleAr: campaign?.heroTitleAr ?? "",
    heroSubtitleEn: campaign?.heroSubtitleEn ?? "",
    heroSubtitleAr: campaign?.heroSubtitleAr ?? "",
    heroImage: campaign?.heroImage ?? "🎓",
    ctaTextEn: campaign?.ctaTextEn ?? "Register Now",
    ctaTextAr: campaign?.ctaTextAr ?? "سجّل الآن",
    accentColor: campaign?.accentColor ?? "#F5A600",
    videoUrl: campaign?.videoUrl ?? "",
  });
  const [benefits, setBenefits] = useState<CampaignBenefit[]>(
    campaign?.benefits && campaign.benefits.length > 0 ? campaign.benefits : DEFAULT_BENEFITS
  );
  const [testimonials, setTestimonials] = useState<CampaignTestimonial[]>(
    campaign?.testimonials ?? []
  );
  const [attempted, setAttempted] = useState(false);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  const err = (field: string) => attempted && !form[field as keyof typeof form];

  const handleSave = async () => {
    setAttempted(true);
    if (!form.name || !form.nameAr || !form.startDate || !form.endDate) return;
    const body = {
      ...form,
      assignedTo: form.assignedTo ? parseInt(form.assignedTo) : undefined,
      whatsappNumber: form.whatsappNumber || undefined,
      description: form.description || undefined,
      landingPageTitle: form.landingPageTitle || undefined,
      landingPageSubtitle: form.landingPageSubtitle || undefined,
      heroTitleEn: form.heroTitleEn || undefined,
      heroTitleAr: form.heroTitleAr || undefined,
      heroSubtitleEn: form.heroSubtitleEn || undefined,
      heroSubtitleAr: form.heroSubtitleAr || undefined,
      heroImage: form.heroImage || undefined,
      ctaTextEn: form.ctaTextEn || undefined,
      ctaTextAr: form.ctaTextAr || undefined,
      videoUrl: form.videoUrl || undefined,
      benefits: benefits.filter(b => b.titleEn || b.titleAr),
      testimonials: testimonials.filter(t => t.name),
    };
    try {
      if (isEdit) {
        await updateCampaign.mutateAsync({ id: campaign.id, ...body });
        toast({ title: isRTL ? "تم تحديث الحملة ✓" : "Campaign updated ✓" });
      } else {
        await createCampaign.mutateAsync(body);
        toast({ title: isRTL ? "تم إنشاء الحملة ✓" : "Campaign created ✓" });
      }
      onClose();
    } catch {
      toast({ title: isRTL ? "حدث خطأ" : "An error occurred", variant: "destructive" });
    }
  };

  const isPending = createCampaign.isPending || updateCampaign.isPending;
  const landingUrl = campaign?.slug ? `kidspeakdz.com/p/${campaign.slug}` : null;

  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-2xl" dir={isRTL ? "rtl" : "ltr"}>
        <DialogHeader>
          <DialogTitle>{isRTL ? (isEdit ? "تعديل الحملة" : "حملة جديدة") : (isEdit ? "Edit Campaign" : "New Campaign")}</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid grid-cols-5 w-full mb-3">
            <TabsTrigger value="basic" className="text-xs">{isRTL ? "أساسي" : "Basic"}</TabsTrigger>
            <TabsTrigger value="hero" className="text-xs">{isRTL ? "البطل" : "Hero"}</TabsTrigger>
            <TabsTrigger value="benefits" className="text-xs">{isRTL ? "المزايا" : "Benefits"}</TabsTrigger>
            <TabsTrigger value="testimonials" className="text-xs">{isRTL ? "التقييمات" : "Reviews"}</TabsTrigger>
            <TabsTrigger value="design" className="text-xs">{isRTL ? "التصميم" : "Design"}</TabsTrigger>
          </TabsList>

          {/* ── BASIC tab ── */}
          <TabsContent value="basic">
            <div className="space-y-3 max-h-[60vh] overflow-y-auto px-1 py-1">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className={`text-xs font-semibold ${err("name") ? "text-red-500" : "text-slate-600"}`}>{isRTL ? "الاسم (EN)" : "Name (EN)"} *</label>
                  <Input value={form.name} onChange={set("name")} placeholder="Open Day Spring" className={err("name") ? "border-red-400" : ""} />
                </div>
                <div className="space-y-1">
                  <label className={`text-xs font-semibold ${err("nameAr") ? "text-red-500" : "text-slate-600"}`}>{isRTL ? "الاسم (AR)" : "Name (AR)"} *</label>
                  <Input value={form.nameAr} onChange={set("nameAr")} placeholder="يوم مفتوح ربيع" dir="rtl" className={err("nameAr") ? "border-red-400" : ""} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">{isRTL ? "النوع" : "Type"}</label>
                  <Select value={form.type} onValueChange={v => setForm(p => ({ ...p, type: v as CampaignType }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(TYPE_CONFIG) as CampaignType[]).map(t => (
                        <SelectItem key={t} value={t}>{isRTL ? TYPE_CONFIG[t].labelAr : TYPE_CONFIG[t].label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">{isRTL ? "نوع الدعوة" : "CTA Type"}</label>
                  <Select value={form.ctaType} onValueChange={v => setForm(p => ({ ...p, ctaType: v as any }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="form">{isRTL ? "نموذج تسجيل" : "Form"}</SelectItem>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      <SelectItem value="call">{isRTL ? "اتصال هاتفي" : "Call"}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {form.ctaType === "whatsapp" && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">{isRTL ? "رقم واتساب" : "WhatsApp Number"}</label>
                  <Input value={form.whatsappNumber} onChange={set("whatsappNumber")} placeholder="+213..." dir="ltr" />
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className={`text-xs font-semibold ${err("startDate") ? "text-red-500" : "text-slate-600"}`}>{isRTL ? "تاريخ البداية" : "Start Date"} *</label>
                  <Input type="date" value={form.startDate} onChange={set("startDate")} className={err("startDate") ? "border-red-400" : ""} />
                </div>
                <div className="space-y-1">
                  <label className={`text-xs font-semibold ${err("endDate") ? "text-red-500" : "text-slate-600"}`}>{isRTL ? "تاريخ النهاية" : "End Date"} *</label>
                  <Input type="date" value={form.endDate} onChange={set("endDate")} className={err("endDate") ? "border-red-400" : ""} />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">{isRTL ? "موظف المتابعة" : "Assigned To"}</label>
                <Select value={form.assignedTo || "none"} onValueChange={v => setForm(p => ({ ...p, assignedTo: v === "none" ? "" : v }))}>
                  <SelectTrigger><SelectValue placeholder={isRTL ? "اختر موظفاً" : "Select staff"} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{isRTL ? "بدون تعيين" : "Unassigned"}</SelectItem>
                    {salesUsers.map(u => <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="border-t pt-3">
                <div className="flex items-center gap-2 mb-3">
                  <button type="button" onClick={() => setForm(p => ({ ...p, landingPageEnabled: !p.landingPageEnabled }))}
                    className={`relative w-10 h-5 rounded-full transition-colors ${form.landingPageEnabled ? "bg-blue-600" : "bg-slate-300"}`}>
                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.landingPageEnabled ? "translate-x-5" : "translate-x-0.5"}`} />
                  </button>
                  <span className="text-xs font-semibold text-slate-700">{isRTL ? "تفعيل صفحة الهبوط" : "Enable Landing Page"}</span>
                </div>
                {landingUrl && (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border">
                    <span className="text-xs text-slate-500 truncate flex-1 font-mono">{landingUrl}</span>
                    <button onClick={() => navigator.clipboard.writeText(`https://${landingUrl}`)}
                      className="shrink-0 text-xs text-blue-600 hover:underline">{isRTL ? "نسخ" : "Copy"}</button>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* ── HERO tab ── */}
          <TabsContent value="hero">
            <div className="space-y-3 max-h-[60vh] overflow-y-auto px-1 py-1">
              <p className="text-xs text-slate-500">{isRTL ? "تخصيص قسم البطل في صفحة الهبوط" : "Customize the hero section of your landing page"}</p>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">{isRTL ? "رمز / صورة (emoji أو URL)" : "Image / Emoji"}</label>
                <Input value={form.heroImage} onChange={set("heroImage")} placeholder="🎓 or https://..." />
                <p className="text-xs text-slate-400">{isRTL ? "يمكن استخدام رمز تعبيري أو رابط صورة" : "Use an emoji like 🎓 or an image URL"}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">{isRTL ? "العنوان الرئيسي (EN)" : "Hero Title (EN)"}</label>
                  <Input value={form.heroTitleEn} onChange={set("heroTitleEn")} placeholder="Join Kidspeak This Summer!" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">{isRTL ? "العنوان الرئيسي (AR)" : "Hero Title (AR)"}</label>
                  <Input value={form.heroTitleAr} onChange={set("heroTitleAr")} placeholder="انضم إلى كيدسبيك هذا الصيف!" dir="rtl" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">{isRTL ? "العنوان الفرعي (EN)" : "Hero Subtitle (EN)"}</label>
                  <Textarea value={form.heroSubtitleEn} onChange={set("heroSubtitleEn")} placeholder="The best bilingual program for your child" rows={2} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">{isRTL ? "العنوان الفرعي (AR)" : "Hero Subtitle (AR)"}</label>
                  <Textarea value={form.heroSubtitleAr} onChange={set("heroSubtitleAr")} placeholder="أفضل برنامج ثنائي اللغة لطفلك" dir="rtl" rows={2} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">{isRTL ? "نص الزر (EN)" : "Button Text (EN)"}</label>
                  <Input value={form.ctaTextEn} onChange={set("ctaTextEn")} placeholder="Register Now →" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">{isRTL ? "نص الزر (AR)" : "Button Text (AR)"}</label>
                  <Input value={form.ctaTextAr} onChange={set("ctaTextAr")} placeholder="سجّل الآن ←" dir="rtl" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">{isRTL ? "رابط الفيديو (اختياري)" : "Video URL (optional)"}</label>
                <Input value={form.videoUrl} onChange={set("videoUrl")} placeholder="https://youtube.com/embed/..." dir="ltr" />
                <p className="text-xs text-slate-400">{isRTL ? "رابط تضمين يوتيوب" : "YouTube embed URL"}</p>
              </div>
            </div>
          </TabsContent>

          {/* ── BENEFITS tab ── */}
          <TabsContent value="benefits">
            <div className="space-y-3 max-h-[60vh] overflow-y-auto px-1 py-1">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500">{isRTL ? "أضف حتى 6 مزايا تظهر في صفحة الهبوط" : "Add up to 6 benefits shown on the landing page"}</p>
                {benefits.length < 6 && (
                  <Button size="sm" variant="outline" className="text-xs h-7 gap-1"
                    onClick={() => setBenefits(p => [...p, { ...EMPTY_BENEFIT }])}>
                    <Plus className="w-3 h-3" /> {isRTL ? "إضافة" : "Add"}
                  </Button>
                )}
              </div>
              {benefits.map((b, i) => (
                <div key={i} className="border rounded-xl p-3 space-y-2 relative">
                  <button onClick={() => setBenefits(p => p.filter((_, j) => j !== i))}
                    className="absolute top-2 end-2 text-slate-300 hover:text-red-400">
                    <X className="w-3.5 h-3.5" />
                  </button>
                  <div className="flex items-center gap-2">
                    <Input className="w-16 text-center text-lg" value={b.icon}
                      onChange={e => setBenefits(p => p.map((x, j) => j === i ? { ...x, icon: e.target.value } : x))}
                      placeholder="🎓" />
                    <span className="text-xs text-slate-400">{isRTL ? "الرمز" : "Icon (emoji)"}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input placeholder={isRTL ? "العنوان (EN)" : "Title (EN)"} value={b.titleEn}
                      onChange={e => setBenefits(p => p.map((x, j) => j === i ? { ...x, titleEn: e.target.value } : x))} />
                    <Input placeholder={isRTL ? "العنوان (AR)" : "Title (AR)"} value={b.titleAr} dir="rtl"
                      onChange={e => setBenefits(p => p.map((x, j) => j === i ? { ...x, titleAr: e.target.value } : x))} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input placeholder={isRTL ? "الوصف (EN)" : "Desc (EN)"} value={b.descEn}
                      onChange={e => setBenefits(p => p.map((x, j) => j === i ? { ...x, descEn: e.target.value } : x))} />
                    <Input placeholder={isRTL ? "الوصف (AR)" : "Desc (AR)"} value={b.descAr} dir="rtl"
                      onChange={e => setBenefits(p => p.map((x, j) => j === i ? { ...x, descAr: e.target.value } : x))} />
                  </div>
                </div>
              ))}
              {benefits.length === 0 && (
                <div className="text-center py-8 text-slate-400 text-sm border rounded-xl border-dashed">
                  {isRTL ? "لا توجد مزايا. أضف واحدة!" : "No benefits. Add one!"}
                </div>
              )}
            </div>
          </TabsContent>

          {/* ── TESTIMONIALS tab ── */}
          <TabsContent value="testimonials">
            <div className="space-y-3 max-h-[60vh] overflow-y-auto px-1 py-1">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500">{isRTL ? "أضف تقييمات أولياء الأمور" : "Add parent testimonials and reviews"}</p>
                {testimonials.length < 6 && (
                  <Button size="sm" variant="outline" className="text-xs h-7 gap-1"
                    onClick={() => setTestimonials(p => [...p, { ...EMPTY_TESTIMONIAL }])}>
                    <Plus className="w-3 h-3" /> {isRTL ? "إضافة" : "Add"}
                  </Button>
                )}
              </div>
              {testimonials.map((t, i) => (
                <div key={i} className="border rounded-xl p-3 space-y-2 relative">
                  <button onClick={() => setTestimonials(p => p.filter((_, j) => j !== i))}
                    className="absolute top-2 end-2 text-slate-300 hover:text-red-400">
                    <X className="w-3.5 h-3.5" />
                  </button>
                  <div className="grid grid-cols-2 gap-2">
                    <Input placeholder={isRTL ? "الاسم" : "Name"} value={t.name}
                      onChange={e => setTestimonials(p => p.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} />
                    <Input placeholder={isRTL ? "الدور (ولي أمر، ...)" : "Role (Parent, ...)"} value={t.role}
                      onChange={e => setTestimonials(p => p.map((x, j) => j === i ? { ...x, role: e.target.value } : x))} />
                  </div>
                  <Textarea placeholder={isRTL ? "نص التقييم..." : "Review text..."} value={t.text} rows={2}
                    onChange={e => setTestimonials(p => p.map((x, j) => j === i ? { ...x, text: e.target.value } : x))} />
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">{isRTL ? "التقييم:" : "Rating:"}</span>
                    {[1, 2, 3, 4, 5].map(s => (
                      <button key={s} onClick={() => setTestimonials(p => p.map((x, j) => j === i ? { ...x, rating: s } : x))}>
                        <Star className={`w-4 h-4 ${s <= t.rating ? "fill-amber-400 text-amber-400" : "text-slate-300"}`} />
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              {testimonials.length === 0 && (
                <div className="text-center py-8 text-slate-400 text-sm border rounded-xl border-dashed">
                  {isRTL ? "لا توجد تقييمات. أضف واحداً!" : "No reviews yet. Add one!"}
                </div>
              )}
            </div>
          </TabsContent>

          {/* ── DESIGN tab ── */}
          <TabsContent value="design">
            <div className="space-y-4 max-h-[60vh] overflow-y-auto px-1 py-1">
              <p className="text-xs text-slate-500">{isRTL ? "تخصيص ألوان صفحة الهبوط" : "Customize the color scheme of your landing page"}</p>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-600">{isRTL ? "اللون الرئيسي" : "Primary Color"}</label>
                <div className="flex items-center gap-3">
                  <input type="color" value={form.landingPageColor}
                    onChange={e => setForm(p => ({ ...p, landingPageColor: e.target.value }))}
                    className="w-10 h-10 rounded-lg cursor-pointer border border-slate-200" />
                  <div>
                    <p className="text-sm font-semibold" style={{ color: form.landingPageColor }}>{form.landingPageColor}</p>
                    <p className="text-xs text-slate-400">{isRTL ? "خلفية القسم الرئيسي" : "Hero background, buttons"}</p>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-600">{isRTL ? "اللون الثانوي (التمييز)" : "Accent Color"}</label>
                <div className="flex items-center gap-3">
                  <input type="color" value={form.accentColor}
                    onChange={e => setForm(p => ({ ...p, accentColor: e.target.value }))}
                    className="w-10 h-10 rounded-lg cursor-pointer border border-slate-200" />
                  <div>
                    <p className="text-sm font-semibold" style={{ color: form.accentColor }}>{form.accentColor}</p>
                    <p className="text-xs text-slate-400">{isRTL ? "الشارات، التمييزات" : "Badges, highlights"}</p>
                  </div>
                </div>
              </div>
              <div className="rounded-xl p-3 border space-y-2">
                <p className="text-xs font-semibold text-slate-600">{isRTL ? "معاينة الألوان" : "Color Preview"}</p>
                <div className="h-16 rounded-xl" style={{ background: `linear-gradient(135deg, ${form.landingPageColor}, ${form.landingPageColor}cc)` }}>
                  <div className="h-full flex items-center justify-center">
                    <span className="text-white font-black text-sm">{isRTL ? "قسم البطل" : "Hero Section"}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="flex-1 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                    style={{ backgroundColor: form.landingPageColor }}>{isRTL ? "الزر الرئيسي" : "Primary Btn"}</div>
                  <div className="flex-1 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
                    style={{ backgroundColor: form.accentColor, color: form.landingPageColor }}>{isRTL ? "شارة التمييز" : "Accent Badge"}</div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="gap-2 flex-row-reverse mt-2">
          <Button onClick={handleSave} disabled={isPending} style={{ backgroundColor: BRAND_BLUE, color: "white" }}>
            {isPending ? (isRTL ? "جارٍ الحفظ..." : "Saving...") : (isRTL ? "حفظ" : "Save")}
          </Button>
          <DialogClose asChild><Button variant="outline">{isRTL ? "إلغاء" : "Cancel"}</Button></DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── AddLeadModal ───────────────────────────────────────────────────────────────
function AddLeadModal({ campaignId, onClose, isRTL }: { campaignId: number | null; onClose: () => void; isRTL: boolean }) {
  const { toast } = useToast();
  const addLead = useAddLead(campaignId ?? 0);
  const addStandalone = useAddStandaloneLead();
  const [form, setForm] = useState({
    parentName: "", parentPhone: "", parentEmail: "",
    childName: "", childAge: "", preferredLevel: "",
    source: "call" as "whatsapp" | "form" | "call" | "other",
    notes: "",
  });
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  const { data: levels = [] } = useQuery<{ id: number; name: string; price: number; monthlyFee: number }[]>({
    queryKey: ["levels"],
    queryFn: () => customFetch("/api/levels"),
  });

  const handleSave = async () => {
    if (!form.parentName || !form.parentPhone || !form.childName) {
      toast({ title: isRTL ? "الحقول المطلوبة ناقصة" : "Required fields missing", variant: "destructive" });
      return;
    }
    const body = { ...form, parentEmail: form.parentEmail || undefined, notes: form.notes || undefined };
    try {
      if (campaignId) {
        await addLead.mutateAsync(body);
      } else {
        await addStandalone.mutateAsync(body);
      }
      toast({ title: isRTL ? "تم إضافة العميل ✓" : "Lead added ✓" });
      onClose();
    } catch {
      toast({ title: isRTL ? "حدث خطأ" : "Error", variant: "destructive" });
    }
  };

  const isPending = addLead.isPending || addStandalone.isPending;

  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-md" dir={isRTL ? "rtl" : "ltr"}>
        <DialogHeader>
          <DialogTitle>{isRTL ? "إضافة عميل" : "Add Lead"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold">{isRTL ? "اسم الولي *" : "Parent Name *"}</label>
              <Input value={form.parentName} onChange={set("parentName")} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold">{isRTL ? "رقم الهاتف *" : "Phone *"}</label>
              <Input value={form.parentPhone} onChange={set("parentPhone")} dir="ltr" />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold">{isRTL ? "البريد الإلكتروني" : "Email"}</label>
            <Input value={form.parentEmail} onChange={set("parentEmail")} type="email" dir="ltr" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold">{isRTL ? "اسم الطفل *" : "Child Name *"}</label>
              <Input value={form.childName} onChange={set("childName")} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold">{isRTL ? "العمر" : "Age"}</label>
              <Input value={form.childAge} onChange={set("childAge")} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold">{isRTL ? "المستوى المفضل" : "Preferred Level"}</label>
              <Select value={form.preferredLevel || "__none__"} onValueChange={v => setForm(p => ({ ...p, preferredLevel: v === "__none__" ? "" : v }))}>
                <SelectTrigger><SelectValue placeholder={isRTL ? "اختر مستوى" : "Select level"} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">{isRTL ? "غير محدد" : "Not specified"}</SelectItem>
                  {levels.map(l => (
                    <SelectItem key={l.id} value={l.name}>
                      {l.name} — {Number(l.monthlyFee ?? l.price ?? 0).toLocaleString()} DA
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold">{isRTL ? "المصدر" : "Source"}</label>
              <Select value={form.source} onValueChange={v => setForm(p => ({ ...p, source: v as any }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="call">{isRTL ? "اتصال" : "Call"}</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="form">{isRTL ? "نموذج" : "Form"}</SelectItem>
                  <SelectItem value="other">{isRTL ? "أخرى" : "Other"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold">{isRTL ? "ملاحظات" : "Notes"}</label>
            <Input value={form.notes} onChange={set("notes")} />
          </div>
        </div>
        <DialogFooter className="gap-2 flex-row-reverse">
          <Button onClick={handleSave} disabled={isPending} style={{ backgroundColor: BRAND_BLUE, color: "white" }}>
            {isPending ? (isRTL ? "جارٍ الإضافة..." : "Adding...") : (isRTL ? "إضافة" : "Add")}
          </Button>
          <DialogClose asChild><Button variant="outline">{isRTL ? "إلغاء" : "Cancel"}</Button></DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── ConvertLeadModal ───────────────────────────────────────────────────────────
function ConvertLeadModal({
  lead, onClose, isRTL,
}: { lead: Lead; onClose: () => void; isRTL: boolean }) {
  const { toast } = useToast();
  const convertLead = useConvertLeadToStudent(lead.campaignId ?? null);

  const { data: levels = [] } = useQuery<{ id: number; name: string; price: number }[]>({
    queryKey: ["levels"],
    queryFn: () => fetch("/api/levels", { credentials: "include" }).then(r => r.json()),
  });
  const { data: branches = [] } = useQuery<{ id: number; name: string }[]>({
    queryKey: ["branches"],
    queryFn: () => fetch("/api/branches", { credentials: "include" }).then(r => r.json()),
  });

  const [form, setForm] = useState({
    name: lead.childName,
    gender: "",
    dateOfBirth: "",
    levelId: "",
    branchId: "",
    guardianName: lead.parentName,
    guardianPhone: lead.parentPhone,
    guardianPhone2: "",
    notes: lead.notes ?? "",
    enrollmentDate: new Date().toISOString().split("T")[0],
  });

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  const selectedLevel = levels.find(l => l.id === parseInt(form.levelId));
  const expectedFee = selectedLevel ? (selectedLevel.price ?? 0) : null;

  const handleConvert = async () => {
    if (!form.name) {
      toast({ title: isRTL ? "اسم التلميذ مطلوب" : "Student name is required", variant: "destructive" });
      return;
    }
    try {
      await convertLead.mutateAsync({
        leadId: lead.id,
        name: form.name,
        gender: form.gender || undefined,
        dateOfBirth: form.dateOfBirth || undefined,
        levelId: form.levelId ? parseInt(form.levelId) : undefined,
        branchId: form.branchId ? parseInt(form.branchId) : undefined,
        guardianName: form.guardianName || undefined,
        guardianPhone: form.guardianPhone || undefined,
        guardianPhone2: form.guardianPhone2 || undefined,
        notes: form.notes || undefined,
        enrollmentDate: form.enrollmentDate,
      });
      toast({ title: isRTL ? "✅ تم إنشاء ملف التلميذ والفاتورة!" : "✅ Student created and invoice generated!" });
      onClose();
    } catch {
      toast({ title: isRTL ? "حدث خطأ" : "An error occurred", variant: "destructive" });
    }
  };

  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-lg" dir={isRTL ? "rtl" : "ltr"}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="w-5 h-5" style={{ color: "#16a34a" }} />
            {isRTL ? "تحويل العميل إلى تلميذ" : "Convert Lead to Student"}
          </DialogTitle>
          <p className="text-sm text-slate-500">
            {isRTL ? "سيُنشأ ملف تلميذ جديد وفاتورة تلقائياً" : "A student profile and invoice will be created automatically"}
          </p>
        </DialogHeader>

        <div className="space-y-3 py-2 max-h-[60vh] overflow-y-auto px-1">
          <div className="text-xs font-bold uppercase tracking-wide text-slate-400 mt-2">{isRTL ? "معلومات التلميذ" : "Student Info"}</div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold">{isRTL ? "الاسم الكامل *" : "Full Name *"}</label>
              <Input value={form.name} onChange={set("name")} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold">{isRTL ? "الجنس" : "Gender"}</label>
              <Select value={form.gender} onValueChange={v => setForm(p => ({ ...p, gender: v }))}>
                <SelectTrigger><SelectValue placeholder={isRTL ? "اختر" : "Select"} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">{isRTL ? "ذكر" : "Male"}</SelectItem>
                  <SelectItem value="female">{isRTL ? "أنثى" : "Female"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold">{isRTL ? "تاريخ الميلاد" : "Date of Birth"}</label>
              <Input type="date" value={form.dateOfBirth} onChange={set("dateOfBirth")} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold">{isRTL ? "تاريخ التسجيل" : "Enrollment Date"}</label>
              <Input type="date" value={form.enrollmentDate} onChange={set("enrollmentDate")} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold">{isRTL ? "المستوى" : "Level"}</label>
              <Select value={form.levelId} onValueChange={v => setForm(p => ({ ...p, levelId: v }))}>
                <SelectTrigger><SelectValue placeholder={isRTL ? "اختر مستوى" : "Select level"} /></SelectTrigger>
                <SelectContent>
                  {levels.map(l => <SelectItem key={l.id} value={String(l.id)}>{l.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold">{isRTL ? "الفرع" : "Branch"}</label>
              <Select value={form.branchId} onValueChange={v => setForm(p => ({ ...p, branchId: v }))}>
                <SelectTrigger><SelectValue placeholder={isRTL ? "اختر فرع" : "Select branch"} /></SelectTrigger>
                <SelectContent>
                  {branches.map(b => <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="text-xs font-bold uppercase tracking-wide text-slate-400 mt-2">{isRTL ? "معلومات الولي" : "Guardian Info"}</div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold">{isRTL ? "اسم الولي" : "Guardian Name"}</label>
              <Input value={form.guardianName} onChange={set("guardianName")} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold">{isRTL ? "رقم الهاتف" : "Phone"}</label>
              <Input value={form.guardianPhone} onChange={set("guardianPhone")} dir="ltr" />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold">{isRTL ? "رقم هاتف 2" : "Phone 2"}</label>
            <Input value={form.guardianPhone2} onChange={set("guardianPhone2")} dir="ltr" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold">{isRTL ? "ملاحظات" : "Notes"}</label>
            <Input value={form.notes} onChange={set("notes")} />
          </div>

          {expectedFee != null && expectedFee > 0 && (
            <div className="rounded-xl p-3 mt-2" style={{ backgroundColor: "#f0fdf4", border: "1px solid #86efac" }}>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-green-600 font-semibold">💳</span>
                <span className="text-green-700 font-medium">
                  {isRTL
                    ? `ستُنشأ فاتورة تلقائياً: ${expectedFee.toLocaleString()} DA`
                    : `Invoice will be created: ${expectedFee.toLocaleString()} DA`}
                </span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 flex-row-reverse">
          <Button
            onClick={handleConvert}
            disabled={convertLead.isPending}
            style={{ backgroundColor: "#16a34a", color: "white" }}
          >
            {convertLead.isPending
              ? (isRTL ? "جارٍ الإنشاء..." : "Creating...")
              : (isRTL ? "✓ إنشاء ملف التلميذ" : "✓ Create Student Profile")}
          </Button>
          <DialogClose asChild><Button variant="outline">{isRTL ? "إلغاء" : "Cancel"}</Button></DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── LeadRow ────────────────────────────────────────────────────────────────────
function LeadRow({ lead, isRTL }: { lead: Lead; isRTL: boolean }) {
  const { toast } = useToast();
  const updateLead = useUpdateLead(lead.campaignId ?? null);
  const deleteLead = useDeleteLead(lead.campaignId ?? null);
  const requestEnrollment = useRequestEnrollment(lead.campaignId ?? null);
  const statusConf = LEAD_STATUS_CONFIG[lead.status];
  const StatusIcon = statusConf.icon;
  const [showConvert, setShowConvert] = useState(false);

  const handleDelete = async () => {
    if (!confirm(isRTL ? "حذف هذا العميل؟" : "Delete this lead?")) return;
    await deleteLead.mutateAsync(lead.id);
    toast({ title: isRTL ? "تم الحذف" : "Deleted" });
  };

  const whatsappUrl = `https://wa.me/${lead.parentPhone.replace(/\D/g, "")}`;

  return (
    <div className="px-4 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-sm font-semibold text-slate-800">{lead.parentName}</span>
          <span className="text-xs text-slate-400">← {lead.childName}</span>
          {lead.childAge && <span className="text-xs text-slate-400">({lead.childAge})</span>}
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <a href={whatsappUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-green-600">
            <Phone className="w-3 h-3" />{lead.parentPhone}
          </a>
          {lead.parentEmail && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{lead.parentEmail}</span>}
          {lead.preferredLevel && <span>{lead.preferredLevel}</span>}
        </div>
        {lead.notes && <p className="text-xs text-slate-400 mt-0.5 truncate max-w-xs">{lead.notes}</p>}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <div
          className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold"
          style={{ backgroundColor: statusConf.bg, color: statusConf.color }}
        >
          <StatusIcon className="w-3 h-3" />
          {isRTL ? statusConf.labelAr : statusConf.label}
        </div>

        <Select value={lead.status} onValueChange={v => updateLead.mutate({ id: lead.id, status: v as LeadStatus })}>
          <SelectTrigger className="h-7 w-7 p-0 border-slate-200">
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(LEAD_STATUS_CONFIG) as LeadStatus[]).map(s => (
              <SelectItem key={s} value={s}>
                {isRTL ? LEAD_STATUS_CONFIG[s].labelAr : LEAD_STATUS_CONFIG[s].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <a href={whatsappUrl} target="_blank" rel="noreferrer">
          <Button size="sm" variant="outline" className="h-7 w-7 p-0 border-green-200 text-green-600 hover:bg-green-50">
            <MessageCircle className="w-3.5 h-3.5" />
          </Button>
        </a>

        {lead.status !== "registered" && lead.status !== "not_interested" && (
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2 text-xs gap-1 border-green-200 text-green-700 hover:bg-green-50"
            onClick={() => setShowConvert(true)}
            title={isRTL ? "تحويل إلى تلميذ" : "Convert to student"}
          >
            <UserCheck className="w-3.5 h-3.5" />
          </Button>
        )}

        {lead.status !== "registered" && lead.status !== "not_interested" && (
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2 text-xs gap-1 border-blue-200 text-blue-700 hover:bg-blue-50"
            title={isRTL ? "إرسال لقسم التلاميذ" : "Send to Students section"}
            disabled={requestEnrollment.isPending}
            onClick={async () => {
              try {
                await requestEnrollment.mutateAsync(lead.id);
                toast({ title: isRTL ? "✅ تم الإرسال لقسم التلاميذ" : "✅ Sent to Students section" });
              } catch (e: any) {
                if (e?.status === 409 || String(e?.message).includes("409")) {
                  toast({ title: isRTL ? "طلب موجود بالفعل" : "Request already exists" });
                } else {
                  toast({ title: isRTL ? "خطأ" : "Error", variant: "destructive" });
                }
              }
            }}
          >
            <UserPlus className="w-3.5 h-3.5" />
          </Button>
        )}

        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-slate-300 hover:text-red-400" onClick={handleDelete}>
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>

      {showConvert && (
        <ConvertLeadModal
          lead={lead}
          onClose={() => setShowConvert(false)}
          isRTL={isRTL}
        />
      )}
    </div>
  );
}

// ── ROI Tab content ────────────────────────────────────────────────────────────
function ROITab({ campaign, isRTL }: { campaign: Campaign; isRTL: boolean }) {
  const { toast } = useToast();
  const { data: roi, isLoading } = useGetCampaignROI(campaign.id);
  const addExpense = useAddCampaignExpense(campaign.id);
  const deleteExpense = useDeleteCampaignExpense(campaign.id);
  const [selectedLevel, setSelectedLevel] = useState("none");
  const [expForm, setExpForm] = useState({ description: "", amount: "", category: "other" });
  const [showAddExp, setShowAddExp] = useState(false);

  if (isLoading) return <div className="py-8 text-center text-sm text-slate-400">{isRTL ? "جارٍ التحميل..." : "Loading..."}</div>;
  if (!roi) return null;

  const selectedLevelData = roi.levels.find(l => String(l.id) === selectedLevel);
  const expectedRevenue = selectedLevelData ? selectedLevelData.price * roi.registeredCount : 0;
  const profit = expectedRevenue - roi.totalExpenses;
  const roi_pct = roi.totalExpenses > 0 ? Math.round((profit / roi.totalExpenses) * 100) : null;

  const handleAddExpense = async () => {
    if (!expForm.description || !expForm.amount) return;
    await addExpense.mutateAsync({ description: expForm.description, amount: parseFloat(expForm.amount), category: expForm.category });
    setExpForm({ description: "", amount: "", category: "other" });
    setShowAddExp(false);
    toast({ title: isRTL ? "تم إضافة المصروف ✓" : "Expense added ✓" });
  };

  return (
    <div className="p-4 space-y-4">
      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl p-3 text-center" style={{ background: `${BRAND_BLUE}08` }}>
          <p className="text-xs text-slate-400 mb-0.5">{isRTL ? "المسجلون" : "Registered"}</p>
          <p className="text-2xl font-black" style={{ color: BRAND_BLUE }}>{roi.registeredCount}</p>
        </div>
        <div className="rounded-xl p-3 text-center bg-red-50">
          <p className="text-xs text-slate-400 mb-0.5">{isRTL ? "المصاريف" : "Expenses"}</p>
          <p className="text-2xl font-black text-red-600">{fmtDA(roi.totalExpenses)}</p>
        </div>
      </div>

      {/* Level selector for revenue calc */}
      <div className="rounded-xl border p-3 space-y-2">
        <label className="text-xs font-semibold text-slate-600">{isRTL ? "اختر المستوى لحساب الإيراد المتوقع" : "Select level for expected revenue"}</label>
        <Select value={selectedLevel} onValueChange={setSelectedLevel}>
          <SelectTrigger>
            <SelectValue placeholder={isRTL ? "اختر مستوى..." : "Select level..."} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">{isRTL ? "لم يتم الاختيار" : "Not selected"}</SelectItem>
            {roi.levels.map(l => (
              <SelectItem key={l.id} value={String(l.id)}>
                {l.name} — {fmtDA(l.price)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selectedLevelData && (
          <div className="space-y-2 pt-1">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">{roi.registeredCount} × {fmtDA(selectedLevelData.price)}</span>
              <span className="font-bold text-green-700">{fmtDA(expectedRevenue)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">{isRTL ? "المصاريف" : "Expenses"}</span>
              <span className="font-bold text-red-600">− {fmtDA(roi.totalExpenses)}</span>
            </div>
            <div className="h-px bg-slate-100" />
            <div className="flex justify-between">
              <span className="font-bold text-sm">{isRTL ? "صافي الربح" : "Net Profit"}</span>
              <span className={`font-black text-base ${profit >= 0 ? "text-green-700" : "text-red-600"}`}>
                {profit >= 0 ? "+" : ""}{fmtDA(profit)}
              </span>
            </div>
            {roi_pct !== null && (
              <div className="flex justify-between text-xs text-slate-500">
                <span>ROI</span>
                <span className={`font-bold ${roi_pct >= 0 ? "text-green-600" : "text-red-500"}`}>
                  {roi_pct >= 0 ? "+" : ""}{roi_pct}%
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Expenses list */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wide">{isRTL ? "المصاريف" : "Expenses"}</h4>
          <Button size="sm" variant="outline" className="h-6 text-xs gap-1" onClick={() => setShowAddExp(v => !v)}>
            <PlusCircle className="w-3 h-3" />
            {isRTL ? "إضافة" : "Add"}
          </Button>
        </div>

        {showAddExp && (
          <div className="mb-3 p-3 rounded-xl border bg-slate-50 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <Input
                value={expForm.description}
                onChange={e => setExpForm(p => ({ ...p, description: e.target.value }))}
                placeholder={isRTL ? "الوصف" : "Description"}
                className="h-8 text-xs"
              />
              <Input
                value={expForm.amount}
                onChange={e => setExpForm(p => ({ ...p, amount: e.target.value }))}
                placeholder={isRTL ? "المبلغ (DA)" : "Amount (DA)"}
                type="number"
                dir="ltr"
                className="h-8 text-xs"
              />
            </div>
            <div className="flex gap-2">
              <Select value={expForm.category} onValueChange={v => setExpForm(p => ({ ...p, category: v }))}>
                <SelectTrigger className="h-8 text-xs flex-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ads">{isRTL ? "إعلانات" : "Ads"}</SelectItem>
                  <SelectItem value="print">{isRTL ? "طباعة" : "Print"}</SelectItem>
                  <SelectItem value="venue">{isRTL ? "مكان" : "Venue"}</SelectItem>
                  <SelectItem value="other">{isRTL ? "أخرى" : "Other"}</SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" className="h-8 text-xs" style={{ backgroundColor: BRAND_BLUE, color: "white" }} onClick={handleAddExpense} disabled={addExpense.isPending}>
                {isRTL ? "حفظ" : "Save"}
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          {roi.expenses.length === 0 && !showAddExp ? (
            <p className="text-xs text-slate-400 text-center py-3">{isRTL ? "لا توجد مصاريف" : "No expenses yet"}</p>
          ) : roi.expenses.map(e => (
            <div key={e.id} className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg bg-white border">
              <Receipt className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="flex-1 text-slate-700">{e.description}</span>
              <span className="font-semibold text-red-600 text-xs">{fmtDA(e.amount)}</span>
              <Button
                size="sm" variant="ghost"
                className="h-6 w-6 p-0 text-slate-300 hover:text-red-400"
                onClick={() => deleteExpense.mutate(e.id)}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── CampaignDetailPanel ────────────────────────────────────────────────────────
function CampaignDetailPanel({
  campaign, onClose, isRTL,
}: { campaign: Campaign; onClose: () => void; isRTL: boolean }) {
  const [showAddLead, setShowAddLead] = useState(false);
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "all">("all");
  const [detailTab, setDetailTab] = useState<"leads" | "roi">("leads");
  const { data: leads = [], isLoading } = useListLeads(campaign.id);

  const filtered = statusFilter === "all" ? leads : leads.filter(l => l.status === statusFilter);

  const exportCSV = () => {
    const rows = [
      ["Parent Name", "Phone", "Email", "Child Name", "Age", "Level", "Status", "Source", "Notes", "Date"],
      ...leads.map(l => [l.parentName, l.parentPhone, l.parentEmail ?? "", l.childName, l.childAge ?? "", l.preferredLevel ?? "", l.status, l.source, l.notes ?? "", safeFmt(l.createdAt, "yyyy-MM-dd")]),
    ];
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `leads-${campaign.slug}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const typeConf   = TYPE_CONFIG[campaign.type];
  const statusConf = STATUS_CONFIG[campaign.status];

  return (
    <div className="fixed inset-0 z-50 flex" dir={isRTL ? "rtl" : "ltr"}>
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative ms-auto w-full max-w-2xl bg-white shadow-2xl flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b bg-white" style={{ borderTop: `3px solid ${typeConf.color}` }}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold uppercase tracking-wide" style={{ color: typeConf.color }}>
                  {isRTL ? typeConf.labelAr : typeConf.label}
                </span>
                <div
                  className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold"
                  style={{ backgroundColor: statusConf.bg, color: statusConf.color }}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${campaign.status === "active" ? "animate-pulse" : ""}`} style={{ backgroundColor: statusConf.dot }} />
                  {isRTL ? statusConf.labelAr : statusConf.label}
                </div>
              </div>
              <h2 className="text-lg font-black text-slate-800">{isRTL ? campaign.nameAr : campaign.name}</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {safeFmt(campaign.startDate, "MMM d")} → {safeFmt(campaign.endDate, "MMM d, yyyy")}
              </p>
            </div>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-2 mt-3">
            {[
              { label: isRTL ? "إجمالي" : "Total",     value: campaign.leadsCount,      color: BRAND_BLUE },
              { label: isRTL ? "جدد" : "New",           value: campaign.newLeadsCount,   color: "#0891b2" },
              { label: isRTL ? "مسجّلون" : "Registered", value: campaign.registeredCount, color: "#16a34a" },
              { label: isRTL ? "تحويل" : "Conv.",        value: campaign.conversionRate != null ? `${campaign.conversionRate}%` : "—", color: BRAND_YELLOW },
            ].map(s => (
              <div key={s.label} className="bg-slate-50 rounded-xl p-2 text-center">
                <p className="text-xs text-slate-400 mb-0.5">{s.label}</p>
                <p className="text-lg font-black" style={{ color: s.color }}>{s.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Sub-tabs */}
        <div className="px-6 pt-3 pb-0 border-b flex gap-4 bg-white">
          {[
            { id: "leads", label: isRTL ? "العملاء" : "Leads", icon: Users },
            { id: "roi",   label: isRTL ? "الربحية" : "Profitability", icon: BarChart3 },
          ].map(t => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setDetailTab(t.id as any)}
                className={`pb-2.5 flex items-center gap-1.5 text-xs font-bold border-b-2 transition-colors ${detailTab === t.id ? "border-[#1B2E8F] text-[#1B2E8F]" : "border-transparent text-slate-400 hover:text-slate-600"}`}
              >
                <Icon className="w-3.5 h-3.5" />{t.label}
              </button>
            );
          })}
        </div>

        {/* Leads tab toolbar */}
        {detailTab === "leads" && (
          <div className="px-6 py-3 border-b flex items-center gap-2 bg-white">
            <div className="flex items-center gap-1 overflow-x-auto flex-1">
              {(["all", ...Object.keys(LEAD_STATUS_CONFIG)] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s as any)}
                  className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${statusFilter === s ? "shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
                  style={statusFilter === s
                    ? (s === "all"
                      ? { backgroundColor: BRAND_BLUE, color: "white" }
                      : { backgroundColor: LEAD_STATUS_CONFIG[s as LeadStatus].bg, color: LEAD_STATUS_CONFIG[s as LeadStatus].color })
                    : {}}
                >
                  {s === "all"
                    ? (isRTL ? "الكل" : "All")
                    : (isRTL ? LEAD_STATUS_CONFIG[s as LeadStatus].labelAr : LEAD_STATUS_CONFIG[s as LeadStatus].label)}
                  {s !== "all" && <span className="ml-1 opacity-60">{leads.filter(l => l.status === s).length}</span>}
                </button>
              ))}
            </div>
            <Button size="sm" variant="outline" className="gap-1 text-xs shrink-0" onClick={exportCSV}>
              <Download className="w-3.5 h-3.5" />{isRTL ? "تصدير" : "Export"}
            </Button>
            <Button size="sm" className="gap-1 text-xs shrink-0" style={{ backgroundColor: BRAND_BLUE, color: "white" }} onClick={() => setShowAddLead(true)}>
              <Plus className="w-3.5 h-3.5" />{isRTL ? "إضافة" : "Add"}
            </Button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {detailTab === "leads" ? (
            <div className="divide-y">
              {isLoading ? (
                <div className="py-12 text-center text-sm text-slate-400">{isRTL ? "جارٍ التحميل..." : "Loading..."}</div>
              ) : filtered.length === 0 ? (
                <div className="py-12 text-center text-sm text-slate-400">{isRTL ? "لا يوجد عملاء حتى الآن" : "No leads yet"}</div>
              ) : (
                filtered.map(lead => <LeadRow key={lead.id} lead={lead} isRTL={isRTL} />)
              )}
            </div>
          ) : (
            <ROITab campaign={campaign} isRTL={isRTL} />
          )}
        </div>

        {/* Landing page link footer */}
        {campaign.landingPageEnabled && campaign.slug && (
          <div className="px-6 py-3 border-t bg-blue-50">
            <div className="flex items-center gap-2 text-xs text-blue-700">
              <Link2 className="w-3.5 h-3.5 shrink-0" />
              <span className="font-semibold">{isRTL ? "رابط صفحة الهبوط:" : "Landing page:"}</span>
              <a href={`/lp/${campaign.slug}`} target="_blank" rel="noreferrer" className="underline truncate" dir="ltr">
                /lp/{campaign.slug}
              </a>
            </div>
          </div>
        )}

        {campaign.ctaType === "whatsapp" && campaign.whatsappNumber && (
          <div className="px-6 py-3 border-t bg-green-50">
            <div className="flex items-center gap-2 text-xs text-green-700">
              <MessageCircle className="w-3.5 h-3.5 shrink-0" />
              <span className="font-semibold">{isRTL ? "رابط واتساب:" : "WhatsApp link:"}</span>
              <a
                href={`https://wa.me/${campaign.whatsappNumber.replace(/\D/g, "")}?text=${encodeURIComponent(isRTL ? campaign.nameAr : campaign.name)}`}
                target="_blank" rel="noreferrer"
                className="underline truncate"
                dir="ltr"
              >
                wa.me/{campaign.whatsappNumber.replace(/\D/g, "")}
              </a>
            </div>
          </div>
        )}
      </div>

      {showAddLead && (
        <AddLeadModal campaignId={campaign.id} onClose={() => setShowAddLead(false)} isRTL={isRTL} />
      )}
    </div>
  );
}

// ── CampaignCard ───────────────────────────────────────────────────────────────
function CampaignCard({
  campaign, onView, onEdit, isRTL,
}: { campaign: Campaign; onView: () => void; onEdit: () => void; isRTL: boolean }) {
  const { toast } = useToast();
  const updateCampaign = useUpdateCampaign();
  const deleteCampaign = useDeleteCampaign();
  const typeConf   = TYPE_CONFIG[campaign.type];
  const statusConf = STATUS_CONFIG[campaign.status];
  const TypeIcon   = typeConf.icon;

  const handleToggle = async () => {
    const newStatus = campaign.status === "active" ? "paused" : "active";
    await updateCampaign.mutateAsync({ id: campaign.id, status: newStatus });
    toast({ title: newStatus === "active" ? (isRTL ? "تم استئناف الحملة ✓" : "Campaign resumed ✓") : (isRTL ? "تم إيقاف الحملة ✓" : "Campaign paused ✓") });
  };

  const handleDelete = async () => {
    if (!confirm(isRTL ? "حذف هذه الحملة وكل عملائها؟" : "Delete this campaign and all its leads?")) return;
    await deleteCampaign.mutateAsync(campaign.id);
    toast({ title: isRTL ? "تم الحذف" : "Deleted" });
  };

  return (
    <div
      className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden"
      style={{ border: "1px solid #f1f5f9", borderInlineStart: `4px solid ${statusConf.border}` }}
    >
      <div className="p-4 pb-3">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-semibold shrink-0" style={{ backgroundColor: `${typeConf.color}15`, color: typeConf.color }}>
            <TypeIcon className="w-3.5 h-3.5" />
            {isRTL ? typeConf.labelAr : typeConf.label}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {campaign.landingPageEnabled && (
              <a href={`/lp/${campaign.slug}`} target="_blank" rel="noreferrer" title={isRTL ? "صفحة الهبوط" : "Landing page"}>
                <div className="w-5 h-5 rounded-full flex items-center justify-center bg-blue-100">
                  <Link2 className="w-3 h-3 text-blue-600" />
                </div>
              </a>
            )}
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold"
              style={{ backgroundColor: statusConf.bg, color: statusConf.color }}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${campaign.status === "active" ? "animate-pulse" : ""}`} style={{ backgroundColor: statusConf.dot }} />
              {isRTL ? statusConf.labelAr : statusConf.label}
            </div>
          </div>
        </div>

        <h3 className="font-bold text-sm text-slate-800 leading-snug mb-2" dir="auto">
          {isRTL ? campaign.nameAr : campaign.name}
        </h3>
        <p className="text-xs text-slate-400 flex items-center gap-1.5 mb-4">
          <CalendarDays className="w-3 h-3 shrink-0" />
          {safeFmt(campaign.startDate, "MMM d")} → {safeFmt(campaign.endDate, "MMM d, yyyy")}
        </p>

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl p-3 text-center" style={{ background: `${BRAND_BLUE}08` }}>
            <div className="flex items-center justify-center gap-1 mb-1">
              <Users className="w-3 h-3" style={{ color: BRAND_BLUE }} />
              <span className="text-[10px] text-slate-400 uppercase tracking-wide font-medium">{isRTL ? "عملاء" : "Leads"}</span>
            </div>
            <p className="text-2xl font-black" style={{ color: BRAND_BLUE }}>{campaign.leadsCount}</p>
          </div>
          {campaign.status === "active" ? (
            <div className="rounded-xl p-3 text-center bg-green-50">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Zap className="w-3 h-3 text-green-600" />
                <span className="text-[10px] text-slate-400 uppercase tracking-wide font-medium">{isRTL ? "جدد" : "New"}</span>
              </div>
              <p className="text-2xl font-black text-green-600">{campaign.newLeadsCount}</p>
            </div>
          ) : (
            <div className="rounded-xl p-3 text-center" style={{ background: `${BRAND_YELLOW}12` }}>
              <div className="flex items-center justify-center gap-1 mb-1">
                <Target className="w-3 h-3" style={{ color: BRAND_YELLOW }} />
                <span className="text-[10px] text-slate-400 uppercase tracking-wide font-medium">{isRTL ? "تحويل" : "Conv."}</span>
              </div>
              <p className="text-2xl font-black" style={{ color: BRAND_YELLOW }}>
                {campaign.conversionRate != null ? `${campaign.conversionRate}%` : "—"}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="h-px bg-slate-100" />

      <div className="px-4 py-3 flex items-center gap-2">
        <Button size="sm" variant="outline" className="flex-1 h-8 text-xs font-semibold gap-1.5" onClick={onView}>
          <Eye className="w-3.5 h-3.5" />{isRTL ? "عرض العملاء" : "View Leads"}
        </Button>
        {campaign.status !== "ended" && (
          <Button
            size="sm" variant="outline"
            className="h-8 px-3 text-xs font-semibold gap-1"
            style={campaign.status === "active"
              ? { borderColor: "#fcd34d", color: "#92400e", background: "#fffbeb" }
              : { borderColor: "#86efac", color: "#166534", background: "#f0fdf4" }}
            onClick={handleToggle}
          >
            {campaign.status === "active"
              ? <><Pause className="w-3.5 h-3.5" />{isRTL ? "إيقاف" : "Pause"}</>
              : <><Play  className="w-3.5 h-3.5" />{isRTL ? "استئناف" : "Resume"}</>}
          </Button>
        )}
        <Button size="sm" variant="ghost" className="h-8 px-2.5 text-slate-400 hover:text-slate-700" onClick={onEdit}>
          <Edit2 className="w-3.5 h-3.5" />
        </Button>
        <Button size="sm" variant="ghost" className="h-8 px-2.5 text-slate-300 hover:text-red-400" onClick={handleDelete}>
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

// ── KanbanColumn ───────────────────────────────────────────────────────────────
function KanbanColumn({ status, campaigns, onView, onEdit, isRTL }: {
  status: "active" | "paused" | "ended";
  campaigns: Campaign[];
  onView: (c: Campaign) => void;
  onEdit: (c: Campaign) => void;
  isRTL: boolean;
}) {
  const conf = STATUS_CONFIG[status];
  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2.5 mb-4 px-1">
        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: conf.dot }} />
        <h2 className="text-xs font-bold text-slate-600 uppercase tracking-widest flex-1">
          {isRTL ? conf.labelAr : conf.label}
        </h2>
        <span className="text-xs font-black px-2 py-0.5 rounded-full" style={{ backgroundColor: `${conf.dot}20`, color: conf.color }}>
          {campaigns.length}
        </span>
      </div>
      <div className="h-0.5 rounded-full mb-4" style={{ backgroundColor: `${conf.border}30` }} />
      <div className="space-y-4">
        {campaigns.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-slate-100 py-10 text-center">
            <p className="text-xs text-slate-300 font-medium">
              {isRTL ? `لا توجد حملات ${conf.labelAr}` : `No ${conf.label.toLowerCase()} campaigns`}
            </p>
          </div>
        ) : campaigns.map(c => (
          <CampaignCard key={c.id} campaign={c} onView={() => onView(c)} onEdit={() => onEdit(c)} isRTL={isRTL} />
        ))}
      </div>
    </div>
  );
}

// ── Standalone Leads Tab ───────────────────────────────────────────────────────
function StandaloneLeadsTab({ isRTL }: { isRTL: boolean }) {
  const { data: leads = [], isLoading } = useListStandaloneLeads();
  const [showAdd, setShowAdd] = useState(false);
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "all">("all");

  const filtered = statusFilter === "all" ? leads : leads.filter(l => l.status === statusFilter);

  const exportCSV = () => {
    const rows = [
      ["Parent Name", "Phone", "Email", "Child Name", "Age", "Level", "Status", "Source", "Notes", "Date"],
      ...leads.map(l => [l.parentName, l.parentPhone, l.parentEmail ?? "", l.childName, l.childAge ?? "", l.preferredLevel ?? "", l.status, l.source, l.notes ?? "", safeFmt(l.createdAt, "yyyy-MM-dd")]),
    ];
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "standalone-leads.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b flex items-center justify-between">
        <div>
          <h3 className="font-bold text-slate-800">{isRTL ? "العملاء المستقلون" : "Standalone Leads"}</h3>
          <p className="text-xs text-slate-400 mt-0.5">{isRTL ? "عملاء غير مرتبطين بأي حملة" : "Leads not linked to any campaign"}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="gap-1 text-xs h-8" onClick={exportCSV}>
            <Download className="w-3.5 h-3.5" />{isRTL ? "تصدير" : "Export"}
          </Button>
          <Button size="sm" className="gap-1 text-xs h-8" style={{ backgroundColor: BRAND_BLUE, color: "white" }} onClick={() => setShowAdd(true)}>
            <Plus className="w-3.5 h-3.5" />{isRTL ? "إضافة عميل" : "Add Lead"}
          </Button>
        </div>
      </div>

      {/* Status filter */}
      <div className="px-5 py-2 border-b flex items-center gap-1 overflow-x-auto">
        {(["all", ...Object.keys(LEAD_STATUS_CONFIG)] as const).map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s as any)}
            className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${statusFilter === s ? "shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
            style={statusFilter === s
              ? (s === "all"
                ? { backgroundColor: BRAND_BLUE, color: "white" }
                : { backgroundColor: LEAD_STATUS_CONFIG[s as LeadStatus].bg, color: LEAD_STATUS_CONFIG[s as LeadStatus].color })
              : {}}
          >
            {s === "all"
              ? (isRTL ? `الكل (${leads.length})` : `All (${leads.length})`)
              : (isRTL ? LEAD_STATUS_CONFIG[s as LeadStatus].labelAr : LEAD_STATUS_CONFIG[s as LeadStatus].label)}
            {s !== "all" && <span className="ml-1 opacity-60">{leads.filter(l => l.status === s).length}</span>}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="divide-y">
        {isLoading ? (
          <div className="py-10 text-center text-sm text-slate-400">{isRTL ? "جارٍ التحميل..." : "Loading..."}</div>
        ) : filtered.length === 0 ? (
          <div className="py-14 text-center">
            <Users className="w-10 h-10 mx-auto text-slate-200 mb-3" />
            <p className="text-sm text-slate-400">{isRTL ? "لا يوجد عملاء مستقلون حتى الآن" : "No standalone leads yet"}</p>
          </div>
        ) : (
          filtered.map(lead => <LeadRow key={lead.id} lead={lead} isRTL={isRTL} />)
        )}
      </div>

      {showAdd && <AddLeadModal campaignId={null} onClose={() => setShowAdd(false)} isRTL={isRTL} />}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function MarketingHub() {
  const { isRTL } = useLanguage();
  const { data: campaigns = [], isLoading } = useListCampaigns();

  const [mainTab, setMainTab]           = useState<"campaigns" | "standalone">("campaigns");
  const [showCreate, setShowCreate]     = useState(false);
  const [editCampaign, setEditCampaign] = useState<Campaign | null>(null);
  const [viewCampaign, setViewCampaign] = useState<Campaign | null>(null);

  const active = campaigns.filter(c => c.status === "active");
  const paused = campaigns.filter(c => c.status === "paused");
  const ended  = campaigns.filter(c => c.status === "ended");

  const totalLeads = campaigns.reduce((s, c) => s + c.leadsCount, 0);
  const newLeads   = active.reduce((s, c) => s + c.newLeadsCount, 0);

  const STATS = [
    { label: isRTL ? "إجمالي الحملات" : "Total Campaigns", value: campaigns.length, icon: Megaphone,  color: BRAND_BLUE },
    { label: isRTL ? "الحملات النشطة" : "Active Now",       value: active.length,   icon: TrendingUp, color: "#16a34a" },
    { label: isRTL ? "إجمالي العملاء" : "Total Leads",       value: totalLeads,      icon: Users,      color: BRAND_BLUE },
    { label: isRTL ? "عملاء جدد"      : "New Leads",         value: newLeads,        icon: Zap,        color: BRAND_YELLOW },
  ];

  if (isLoading) {
    return <div className="p-8 text-center text-slate-400">{isRTL ? "جارٍ التحميل..." : "Loading..."}</div>;
  }

  return (
    <div className="space-y-6" dir={isRTL ? "rtl" : "ltr"}>
      {/* Hero */}
      <div className="rounded-2xl px-6 py-5" style={{ background: `linear-gradient(135deg, ${BRAND_BLUE} 0%, #0f1e5c 100%)` }}>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "rgba(245,166,0,0.2)", border: "1px solid rgba(245,166,0,0.3)" }}>
              <Megaphone className="w-6 h-6" style={{ color: BRAND_YELLOW }} />
            </div>
            <div>
              <h1 className="text-xl font-black text-white tracking-tight">{isRTL ? "مركز التسويق" : "Marketing Hub"}</h1>
              <p className="text-sm mt-0.5" style={{ color: "rgba(255,255,255,0.55)" }}>
                {isRTL ? "أطلق حملاتك، استقطب عملاء جدد، وتتبع النتائج" : "Launch campaigns, capture leads, and track conversions"}
              </p>
            </div>
          </div>
          <Button
            size="sm" className="gap-1.5 font-bold"
            style={{ backgroundColor: BRAND_YELLOW, color: BRAND_BLUE }}
            onClick={() => setShowCreate(true)}
          >
            <Plus className="w-4 h-4" />
            {isRTL ? "حملة جديدة" : "New Campaign"}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {STATS.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${color}15` }}>
                <Icon className="w-4 h-4" style={{ color }} />
              </div>
              <span className="text-xs text-slate-500 font-medium">{label}</span>
            </div>
            <p className="text-2xl font-black" style={{ color }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Main tab bar */}
      <div className="flex items-center gap-1 border-b border-slate-100">
        {[
          { id: "campaigns",  label: isRTL ? "الحملات" : "Campaigns",       icon: Megaphone },
          { id: "standalone", label: isRTL ? "العملاء المستقلون" : "Standalone Leads", icon: Users },
        ].map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setMainTab(t.id as any)}
              className={`px-4 py-2.5 flex items-center gap-2 text-sm font-bold border-b-2 -mb-px transition-colors ${mainTab === t.id ? "border-[#1B2E8F] text-[#1B2E8F]" : "border-transparent text-slate-400 hover:text-slate-600"}`}
            >
              <Icon className="w-4 h-4" />{t.label}
            </button>
          );
        })}
      </div>

      {/* Campaign Kanban */}
      {mainTab === "campaigns" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          <KanbanColumn status="active" campaigns={active} onView={setViewCampaign} onEdit={setEditCampaign} isRTL={isRTL} />
          <KanbanColumn status="paused" campaigns={paused} onView={setViewCampaign} onEdit={setEditCampaign} isRTL={isRTL} />
          <KanbanColumn status="ended"  campaigns={ended}  onView={setViewCampaign} onEdit={setEditCampaign} isRTL={isRTL} />
        </div>
      )}

      {/* Standalone leads */}
      {mainTab === "standalone" && <StandaloneLeadsTab isRTL={isRTL} />}

      {/* Modals */}
      {showCreate   && <CampaignFormModal onClose={() => setShowCreate(false)} isRTL={isRTL} />}
      {editCampaign && <CampaignFormModal campaign={editCampaign} onClose={() => setEditCampaign(null)} isRTL={isRTL} />}
      {viewCampaign && <CampaignDetailPanel campaign={viewCampaign} onClose={() => setViewCampaign(null)} isRTL={isRTL} />}
    </div>
  );
}

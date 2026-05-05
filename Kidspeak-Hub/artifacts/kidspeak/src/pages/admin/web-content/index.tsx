import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/language-context";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Globe, Plus, Pencil, Trash2, Eye, EyeOff, Save, ArrowUp, ArrowDown,
  Star, FileText, Layout, MessageSquare, Layers, ExternalLink, Wand2,
  Home, BookOpen, Image, Type, Zap, Grid3X3,
} from "lucide-react";

const BRAND_BLUE = "#1B2E8F";
const BRAND_YELLOW = "#F5A600";

type SectionType = "hero" | "features" | "text" | "cta" | "testimonials" | "stats" | "steps";

interface Section {
  id: string;
  type: SectionType;
  data: Record<string, any>;
}

interface PageContent {
  sections: Section[];
}

const SECTION_CONFIGS: Record<SectionType, { icon: React.ElementType; labelEn: string; labelAr: string; defaultData: Record<string, any> }> = {
  hero: {
    icon: Layout, labelEn: "Hero Banner", labelAr: "بانر رئيسي",
    defaultData: { titleEn: "Page Title", titleAr: "عنوان الصفحة", subtitleEn: "Subtitle here", subtitleAr: "وصف قصير", ctaTextEn: "Register Now", ctaTextAr: "سجّل الآن", ctaLink: "/", bgColor: "#1B2E8F" },
  },
  features: {
    icon: Grid3X3, labelEn: "Features Grid", labelAr: "شبكة الميزات",
    defaultData: {
      titleEn: "Our Features", titleAr: "مميزاتنا",
      items: [
        { icon: "🎯", titleEn: "Feature 1", titleAr: "الميزة 1", descEn: "Description", descAr: "وصف" },
        { icon: "⭐", titleEn: "Feature 2", titleAr: "الميزة 2", descEn: "Description", descAr: "وصف" },
        { icon: "🏆", titleEn: "Feature 3", titleAr: "الميزة 3", descEn: "Description", descAr: "وصف" },
      ],
    },
  },
  text: {
    icon: Type, labelEn: "Text Block", labelAr: "كتلة نصية",
    defaultData: { contentEn: "<p>Add your content here...</p>", contentAr: "<p>أضف محتواك هنا...</p>" },
  },
  cta: {
    icon: Zap, labelEn: "Call to Action", labelAr: "دعوة للتسجيل",
    defaultData: { titleEn: "Ready to start?", titleAr: "مستعد للبدء؟", subtitleEn: "Join us today", subtitleAr: "انضم إلينا اليوم", buttonTextEn: "Register Now", buttonTextAr: "سجّل الآن", buttonLink: "/", bgColor: "#1B2E8F" },
  },
  testimonials: {
    icon: MessageSquare, labelEn: "Testimonials", labelAr: "آراء",
    defaultData: {
      titleEn: "What Parents Say", titleAr: "ما يقوله الأهل",
      items: [
        { nameEn: "Parent Name", nameAr: "اسم الولي", textEn: "Great school!", textAr: "مدرسة رائعة!", stars: 5 },
      ],
    },
  },
  stats: {
    icon: Star, labelEn: "Stats", labelAr: "إحصائيات",
    defaultData: {
      items: [
        { value: "500+", labelEn: "Students", labelAr: "تلميذ" },
        { value: "5", labelEn: "Years", labelAr: "سنوات" },
        { value: "98%", labelEn: "Satisfaction", labelAr: "رضا" },
      ],
    },
  },
  steps: {
    icon: BookOpen, labelEn: "Steps / Method", labelAr: "الخطوات / المنهج",
    defaultData: {
      titleEn: "Our Method", titleAr: "منهجنا",
      items: [
        { num: "01", icon: "👂", labelEn: "Listen", labelAr: "اسمع", descEn: "Description", descAr: "وصف" },
        { num: "02", icon: "🗣️", labelEn: "Speak", labelAr: "تحدث", descEn: "Description", descAr: "وصف" },
      ],
    },
  },
};

function SectionEditor({ section, onChange, isRTL }: { section: Section; onChange: (data: Record<string, any>) => void; isRTL: boolean }) {
  const d = section.data;
  const set = (k: string, v: any) => onChange({ ...d, [k]: v });

  if (section.type === "hero") {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1"><label className="text-xs font-semibold">Title (EN)</label><Input value={d.titleEn ?? ""} onChange={e => set("titleEn", e.target.value)} /></div>
          <div className="space-y-1"><label className="text-xs font-semibold">العنوان (AR)</label><Input value={d.titleAr ?? ""} onChange={e => set("titleAr", e.target.value)} dir="rtl" /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1"><label className="text-xs font-semibold">Subtitle (EN)</label><Textarea value={d.subtitleEn ?? ""} onChange={e => set("subtitleEn", e.target.value)} rows={2} /></div>
          <div className="space-y-1"><label className="text-xs font-semibold">الوصف (AR)</label><Textarea value={d.subtitleAr ?? ""} onChange={e => set("subtitleAr", e.target.value)} rows={2} dir="rtl" /></div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1"><label className="text-xs font-semibold">CTA Text (EN)</label><Input value={d.ctaTextEn ?? ""} onChange={e => set("ctaTextEn", e.target.value)} /></div>
          <div className="space-y-1"><label className="text-xs font-semibold">نص الزر (AR)</label><Input value={d.ctaTextAr ?? ""} onChange={e => set("ctaTextAr", e.target.value)} dir="rtl" /></div>
          <div className="space-y-1"><label className="text-xs font-semibold">Link</label><Input value={d.ctaLink ?? "/"} onChange={e => set("ctaLink", e.target.value)} dir="ltr" /></div>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold">Background Color</label>
          <div className="flex gap-2 items-center">
            <input type="color" value={d.bgColor ?? "#1B2E8F"} onChange={e => set("bgColor", e.target.value)} className="h-9 w-14 rounded cursor-pointer" />
            <Input value={d.bgColor ?? "#1B2E8F"} onChange={e => set("bgColor", e.target.value)} className="w-32" dir="ltr" />
          </div>
        </div>
      </div>
    );
  }

  if (section.type === "features") {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1"><label className="text-xs font-semibold">Title (EN)</label><Input value={d.titleEn ?? ""} onChange={e => set("titleEn", e.target.value)} /></div>
          <div className="space-y-1"><label className="text-xs font-semibold">العنوان (AR)</label><Input value={d.titleAr ?? ""} onChange={e => set("titleAr", e.target.value)} dir="rtl" /></div>
        </div>
        <div className="space-y-2">
          {(d.items ?? []).map((item: any, i: number) => (
            <div key={i} className="p-3 rounded-xl border bg-slate-50 space-y-2">
              <div className="flex items-center gap-2">
                <Input value={item.icon ?? ""} onChange={e => { const items = [...d.items]; items[i] = { ...items[i], icon: e.target.value }; set("items", items); }} className="w-16 text-center text-lg" placeholder="🎯" />
                <div className="flex-1 grid grid-cols-2 gap-2">
                  <Input value={item.titleEn ?? ""} onChange={e => { const items = [...d.items]; items[i] = { ...items[i], titleEn: e.target.value }; set("items", items); }} placeholder="Title EN" />
                  <Input value={item.titleAr ?? ""} onChange={e => { const items = [...d.items]; items[i] = { ...items[i], titleAr: e.target.value }; set("items", items); }} placeholder="العنوان AR" dir="rtl" />
                </div>
                <Button size="sm" variant="ghost" className="text-red-400 h-8 w-8 p-0" onClick={() => { const items = d.items.filter((_: any, j: number) => j !== i); set("items", items); }}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Textarea value={item.descEn ?? ""} onChange={e => { const items = [...d.items]; items[i] = { ...items[i], descEn: e.target.value }; set("items", items); }} placeholder="Description EN" rows={2} />
                <Textarea value={item.descAr ?? ""} onChange={e => { const items = [...d.items]; items[i] = { ...items[i], descAr: e.target.value }; set("items", items); }} placeholder="الوصف AR" rows={2} dir="rtl" />
              </div>
            </div>
          ))}
          <Button size="sm" variant="outline" onClick={() => set("items", [...(d.items ?? []), { icon: "✨", titleEn: "", titleAr: "", descEn: "", descAr: "" }])}>
            <Plus className="w-3.5 h-3.5 me-1" /> Add Feature
          </Button>
        </div>
      </div>
    );
  }

  if (section.type === "text") {
    return (
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-semibold">Content (EN) — HTML</label>
          <Textarea value={d.contentEn ?? ""} onChange={e => set("contentEn", e.target.value)} rows={8} className="font-mono text-xs" dir="ltr" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold">المحتوى (AR) — HTML</label>
          <Textarea value={d.contentAr ?? ""} onChange={e => set("contentAr", e.target.value)} rows={8} className="font-mono text-xs" dir="rtl" />
        </div>
      </div>
    );
  }

  if (section.type === "cta") {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1"><label className="text-xs font-semibold">Title (EN)</label><Input value={d.titleEn ?? ""} onChange={e => set("titleEn", e.target.value)} /></div>
          <div className="space-y-1"><label className="text-xs font-semibold">العنوان (AR)</label><Input value={d.titleAr ?? ""} onChange={e => set("titleAr", e.target.value)} dir="rtl" /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1"><label className="text-xs font-semibold">Subtitle (EN)</label><Input value={d.subtitleEn ?? ""} onChange={e => set("subtitleEn", e.target.value)} /></div>
          <div className="space-y-1"><label className="text-xs font-semibold">الوصف (AR)</label><Input value={d.subtitleAr ?? ""} onChange={e => set("subtitleAr", e.target.value)} dir="rtl" /></div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1"><label className="text-xs font-semibold">Button (EN)</label><Input value={d.buttonTextEn ?? ""} onChange={e => set("buttonTextEn", e.target.value)} /></div>
          <div className="space-y-1"><label className="text-xs font-semibold">الزر (AR)</label><Input value={d.buttonTextAr ?? ""} onChange={e => set("buttonTextAr", e.target.value)} dir="rtl" /></div>
          <div className="space-y-1"><label className="text-xs font-semibold">Link</label><Input value={d.buttonLink ?? "/"} onChange={e => set("buttonLink", e.target.value)} dir="ltr" /></div>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold">Background Color</label>
          <div className="flex gap-2 items-center">
            <input type="color" value={d.bgColor ?? "#1B2E8F"} onChange={e => set("bgColor", e.target.value)} className="h-9 w-14 rounded cursor-pointer" />
            <Input value={d.bgColor ?? "#1B2E8F"} onChange={e => set("bgColor", e.target.value)} className="w-32" dir="ltr" />
          </div>
        </div>
      </div>
    );
  }

  if (section.type === "steps") {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1"><label className="text-xs font-semibold">Title (EN)</label><Input value={d.titleEn ?? ""} onChange={e => set("titleEn", e.target.value)} /></div>
          <div className="space-y-1"><label className="text-xs font-semibold">العنوان (AR)</label><Input value={d.titleAr ?? ""} onChange={e => set("titleAr", e.target.value)} dir="rtl" /></div>
        </div>
        <div className="space-y-2">
          {(d.items ?? []).map((item: any, i: number) => (
            <div key={i} className="p-3 rounded-xl border bg-slate-50 space-y-2">
              <div className="flex items-center gap-2">
                <Input value={item.num ?? ""} onChange={e => { const items = [...d.items]; items[i] = { ...items[i], num: e.target.value }; set("items", items); }} className="w-14 text-center font-bold" placeholder="01" />
                <Input value={item.icon ?? ""} onChange={e => { const items = [...d.items]; items[i] = { ...items[i], icon: e.target.value }; set("items", items); }} className="w-14 text-center text-lg" placeholder="👂" />
                <div className="flex-1 grid grid-cols-2 gap-2">
                  <Input value={item.labelEn ?? ""} onChange={e => { const items = [...d.items]; items[i] = { ...items[i], labelEn: e.target.value }; set("items", items); }} placeholder="Label EN" />
                  <Input value={item.labelAr ?? ""} onChange={e => { const items = [...d.items]; items[i] = { ...items[i], labelAr: e.target.value }; set("items", items); }} placeholder="التسمية AR" dir="rtl" />
                </div>
                <Button size="sm" variant="ghost" className="text-red-400 h-8 w-8 p-0" onClick={() => { const items = d.items.filter((_: any, j: number) => j !== i); set("items", items); }}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Textarea value={item.descEn ?? ""} onChange={e => { const items = [...d.items]; items[i] = { ...items[i], descEn: e.target.value }; set("items", items); }} placeholder="Description EN" rows={2} />
                <Textarea value={item.descAr ?? ""} onChange={e => { const items = [...d.items]; items[i] = { ...items[i], descAr: e.target.value }; set("items", items); }} placeholder="الوصف AR" rows={2} dir="rtl" />
              </div>
            </div>
          ))}
          <Button size="sm" variant="outline" onClick={() => set("items", [...(d.items ?? []), { num: String((d.items?.length ?? 0) + 1).padStart(2, "0"), icon: "✨", labelEn: "", labelAr: "", descEn: "", descAr: "" }])}>
            <Plus className="w-3.5 h-3.5 me-1" /> Add Step
          </Button>
        </div>
      </div>
    );
  }

  if (section.type === "stats") {
    return (
      <div className="space-y-2">
        {(d.items ?? []).map((item: any, i: number) => (
          <div key={i} className="flex items-center gap-2 p-2 rounded-lg border">
            <Input value={item.value ?? ""} onChange={e => { const items = [...d.items]; items[i] = { ...items[i], value: e.target.value }; set("items", items); }} className="w-20 font-bold text-center" placeholder="500+" />
            <Input value={item.labelEn ?? ""} onChange={e => { const items = [...d.items]; items[i] = { ...items[i], labelEn: e.target.value }; set("items", items); }} placeholder="Label EN" />
            <Input value={item.labelAr ?? ""} onChange={e => { const items = [...d.items]; items[i] = { ...items[i], labelAr: e.target.value }; set("items", items); }} placeholder="التسمية AR" dir="rtl" />
            <Button size="sm" variant="ghost" className="text-red-400 h-8 w-8 p-0" onClick={() => set("items", d.items.filter((_: any, j: number) => j !== i))}>
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        ))}
        <Button size="sm" variant="outline" onClick={() => set("items", [...(d.items ?? []), { value: "", labelEn: "", labelAr: "" }])}>
          <Plus className="w-3.5 h-3.5 me-1" /> Add Stat
        </Button>
      </div>
    );
  }

  return <div className="text-sm text-slate-400">Editor for {section.type} coming soon</div>;
}

function PageBuilderModal({
  pageId, titleEn, titleAr, initialContent, onSave, onClose, isRTL, initialSlug,
}: {
  pageId: number | "our_method" | "homepage";
  titleEn: string;
  titleAr: string;
  initialContent: PageContent;
  onSave: (content: PageContent) => Promise<void>;
  onClose: () => void;
  isRTL: boolean;
  initialSlug?: string;
}) {
  const { toast } = useToast();
  const [sections, setSections] = useState<Section[]>(initialContent.sections ?? []);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [pageSlug, setPageSlug] = useState(initialSlug ?? "");
  const [origSlug] = useState(initialSlug ?? "");

  const addSection = (type: SectionType) => {
    const newSection: Section = {
      id: Date.now().toString(),
      type,
      data: { ...SECTION_CONFIGS[type].defaultData },
    };
    setSections(p => [...p, newSection]);
    setEditingIdx(sections.length);
    setShowAddMenu(false);
  };

  const updateSection = (idx: number, data: Record<string, any>) => {
    setSections(p => p.map((s, i) => i === idx ? { ...s, data } : s));
  };

  const removeSection = (idx: number) => {
    setSections(p => p.filter((_, i) => i !== idx));
    if (editingIdx === idx) setEditingIdx(null);
  };

  const moveSection = (idx: number, dir: -1 | 1) => {
    const newSections = [...sections];
    const target = idx + dir;
    if (target < 0 || target >= newSections.length) return;
    [newSections[idx], newSections[target]] = [newSections[target], newSections[idx]];
    setSections(newSections);
    setEditingIdx(target);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({ sections });
      toast({ title: isRTL ? "تم الحفظ ✓" : "Saved ✓" });
      onClose();
    } catch {
      toast({ title: isRTL ? "خطأ في الحفظ" : "Save failed", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const generateWithAI = async () => {
    const apiKey = localStorage.getItem("ai_api_key");
    if (!apiKey || !aiPrompt) return;
    setGenerating(true);
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 2000,
          messages: [{
            role: "user",
            content: `Create a page content structure in JSON for a kids language school page about: "${aiPrompt}"

Return ONLY valid JSON (no markdown, no explanation):
{
  "sections": [
    { "id": "1", "type": "hero", "data": { "titleEn": "...", "titleAr": "...", "subtitleEn": "...", "subtitleAr": "...", "ctaTextEn": "Register Now", "ctaTextAr": "سجّل الآن", "ctaLink": "/", "bgColor": "#1B2E8F" } },
    { "id": "2", "type": "features", "data": { "titleEn": "...", "titleAr": "...", "items": [{ "icon": "🎯", "titleEn": "...", "titleAr": "...", "descEn": "...", "descAr": "..." }] } },
    { "id": "3", "type": "text", "data": { "contentEn": "<p>...</p>", "contentAr": "<p>...</p>" } },
    { "id": "4", "type": "cta", "data": { "titleEn": "...", "titleAr": "...", "subtitleEn": "...", "subtitleAr": "...", "buttonTextEn": "...", "buttonTextAr": "...", "buttonLink": "/", "bgColor": "#1B2E8F" } }
  ]
}`,
          }],
        }),
      });
      const data = await response.json();
      const text = data.content?.[0]?.text ?? "";
      const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
      setSections(parsed.sections ?? []);
      toast({ title: isRTL ? "تم توليد الصفحة ✓" : "Page generated ✓" });
    } catch {
      toast({ title: isRTL ? "فشل التوليد" : "Generation failed", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col" dir={isRTL ? "rtl" : "ltr"}>
      <div className="h-14 border-b flex items-center justify-between px-4 bg-white shadow-sm">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onClose} className="gap-1 text-slate-500">
            ← {isRTL ? "رجوع" : "Back"}
          </Button>
          <div className="h-4 w-px bg-slate-200" />
          <span className="font-bold text-sm" style={{ color: BRAND_BLUE }}>
            {isRTL ? titleAr : titleEn}
          </span>
          <Badge variant="outline" className="text-xs">{sections.length} {isRTL ? "قسم" : "sections"}</Badge>
          {typeof pageId === "number" && (
            <div className="flex items-center gap-1 text-xs text-slate-400">
              <span className="opacity-60">/p</span>
              <input
                className="border rounded px-1.5 py-0.5 text-xs font-mono w-32 focus:outline-none focus:border-blue-400"
                value={pageSlug}
                onChange={e => setPageSlug(e.target.value.replace(/[^a-z0-9-/]/g, ""))}
                onBlur={async () => {
                  if (pageSlug && pageSlug !== origSlug) {
                    await fetch(`/api/admin/pages/${pageId}`, {
                      method: "PUT",
                      headers: { "Content-Type": "application/json" },
                      credentials: "include",
                      body: JSON.stringify({ slug: pageSlug }),
                    });
                  }
                }}
              />
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 border rounded-lg px-2 py-1">
            <Wand2 className="w-3.5 h-3.5 text-purple-500" />
            <Input
              value={aiPrompt}
              onChange={e => setAiPrompt(e.target.value)}
              placeholder={isRTL ? "صف الصفحة... (AI)" : "Describe page... (AI)"}
              className="border-0 p-0 h-6 text-xs w-48 focus-visible:ring-0"
              onKeyDown={e => e.key === "Enter" && generateWithAI()}
            />
            <Button size="sm" variant="ghost" onClick={generateWithAI} disabled={generating || !aiPrompt} className="h-6 px-2 text-xs text-purple-600">
              {generating ? "..." : "✨"}
            </Button>
          </div>
          <Button onClick={handleSave} disabled={saving} size="sm" style={{ backgroundColor: BRAND_BLUE, color: "white" }}>
            <Save className="w-3.5 h-3.5 me-1" />
            {saving ? (isRTL ? "جارٍ..." : "Saving...") : (isRTL ? "حفظ" : "Save")}
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-64 border-e bg-slate-50 flex flex-col">
          <div className="p-3 border-b">
            <Button
              size="sm" className="w-full gap-1.5 text-xs"
              style={{ backgroundColor: BRAND_YELLOW, color: BRAND_BLUE }}
              onClick={() => setShowAddMenu(!showAddMenu)}
            >
              <Plus className="w-3.5 h-3.5" />
              {isRTL ? "إضافة قسم" : "Add Section"}
            </Button>
            {showAddMenu && (
              <div className="mt-2 space-y-1">
                {(Object.keys(SECTION_CONFIGS) as SectionType[]).map(type => {
                  const conf = SECTION_CONFIGS[type];
                  const Icon = conf.icon;
                  return (
                    <button
                      key={type}
                      onClick={() => addSection(type)}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium hover:bg-white text-slate-600 transition-colors text-start"
                    >
                      <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: BRAND_BLUE }} />
                      {isRTL ? conf.labelAr : conf.labelEn}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            {sections.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400">
                {isRTL ? "لا توجد أقسام بعد" : "No sections yet"}
              </div>
            ) : sections.map((section, idx) => {
              const conf = SECTION_CONFIGS[section.type];
              const Icon = conf.icon;
              return (
                <div
                  key={section.id}
                  onClick={() => setEditingIdx(idx)}
                  className={`flex items-center gap-2 p-2.5 rounded-xl cursor-pointer transition-all ${editingIdx === idx ? "shadow-sm" : "hover:bg-white"}`}
                  style={editingIdx === idx ? { backgroundColor: `${BRAND_BLUE}10`, border: `1.5px solid ${BRAND_BLUE}30` } : { border: "1.5px solid transparent" }}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: editingIdx === idx ? BRAND_BLUE : "#94a3b8" }} />
                  <span className="text-xs font-medium flex-1 truncate">{isRTL ? conf.labelAr : conf.labelEn}</span>
                  <div className="flex items-center gap-0.5" onClick={e => e.stopPropagation()}>
                    <button onClick={() => moveSection(idx, -1)} disabled={idx === 0} className="p-0.5 text-slate-300 hover:text-slate-600 disabled:opacity-30">
                      <ArrowUp className="w-3 h-3" />
                    </button>
                    <button onClick={() => moveSection(idx, 1)} disabled={idx === sections.length - 1} className="p-0.5 text-slate-300 hover:text-slate-600 disabled:opacity-30">
                      <ArrowDown className="w-3 h-3" />
                    </button>
                    <button onClick={() => removeSection(idx)} className="p-0.5 text-slate-300 hover:text-red-400">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {editingIdx === null ? (
            <div className="h-full flex flex-col items-center justify-center gap-4 text-center">
              <Layers className="w-12 h-12 opacity-20" style={{ color: BRAND_BLUE }} />
              <p className="text-slate-400 text-sm">{isRTL ? "اختر قسماً من القائمة لتعديله" : "Select a section from the list to edit"}</p>
            </div>
          ) : sections[editingIdx] ? (
            <div className="max-w-3xl mx-auto">
              <div className="flex items-center gap-2 mb-6">
                {(() => { const conf = SECTION_CONFIGS[sections[editingIdx].type]; const Icon = conf.icon; return <Icon className="w-5 h-5" style={{ color: BRAND_BLUE }} />; })()}
                <h2 className="font-bold text-lg" style={{ color: BRAND_BLUE }}>
                  {isRTL ? SECTION_CONFIGS[sections[editingIdx].type].labelAr : SECTION_CONFIGS[sections[editingIdx].type].labelEn}
                </h2>
              </div>
              <SectionEditor
                section={sections[editingIdx]}
                onChange={(data) => updateSection(editingIdx, data)}
                isRTL={isRTL}
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function parsePageContent(raw: string | null | undefined): PageContent {
  if (!raw) return { sections: [] };
  try {
    const parsed = JSON.parse(raw);
    if (parsed.sections) return parsed;
    return { sections: [{ id: "1", type: "text", data: { contentEn: raw, contentAr: raw } }] };
  } catch {
    if (raw.trim().startsWith("<")) {
      return { sections: [{ id: "1", type: "text", data: { contentEn: raw, contentAr: raw } }] };
    }
    return { sections: [] };
  }
}

export default function WebContentPage() {
  const { language, isRTL } = useLanguage();
  const { toast } = useToast();
  const isAr = language === "ar";

  const [hero, setHero] = useState({ h1En: "Stop Studying English. Start Speaking It.", h1Ar: "توقف عن دراسة الإنجليزية. ابدأ بالتحدث بها.", subtitleEn: "Kidspeak is Algeria's first school that teaches children English the natural way.", subtitleAr: "كيدسبيك أول مدرسة في الجزائر.", badgeEn: "Speaking-First Methodology", badgeAr: "منهج التحدث أولاً" });
  const [savingHero, setSavingHero] = useState(false);
  const [pages, setPages] = useState<any[]>([]);
  const [loadingPages, setLoadingPages] = useState(true);

  const [showCreatePage, setShowCreatePage] = useState(false);
  const [newPageForm, setNewPageForm] = useState({ titleEn: "", titleAr: "", slug: "" });
  const [creatingPage, setCreatingPage] = useState(false);

  const [builderState, setBuilderState] = useState<{
    open: boolean;
    pageId: number | "our_method" | "homepage";
    titleEn: string;
    titleAr: string;
    slug?: string;
    content: PageContent;
  } | null>(null);

  useEffect(() => {
    fetch("/api/public/cms/settings/hero").then(r => r.ok ? r.json() : null).then(d => { if (d?.data && Object.keys(d.data).length > 0) setHero(prev => ({ ...prev, ...d.data })); }).catch(() => {});
    fetch("/api/admin/pages", { credentials: "include" }).then(r => r.ok ? r.json() : []).then(setPages).catch(() => {}).finally(() => setLoadingPages(false));
  }, []);

  const saveHero = async () => {
    setSavingHero(true);
    try {
      await fetch("/api/admin/cms/settings/hero", { method: "PUT", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(hero) });
      toast({ title: isAr ? "تم الحفظ ✓" : "Saved ✓" });
    } catch { toast({ title: "Error", variant: "destructive" }); }
    finally { setSavingHero(false); }
  };

  const openBuilderForPage = async (page: any) => {
    const content = parsePageContent(page.contentEn);
    setBuilderState({ open: true, pageId: page.id, titleEn: page.titleEn, titleAr: page.titleAr, slug: page.slug, content });
  };

  const openBuilderForOurMethod = async () => {
    const r = await fetch("/api/public/cms/settings/our_method").then(res => res.ok ? res.json() : null);
    const content = r?.data ? r.data : { sections: [
      { id: "1", type: "hero", data: { titleEn: "Our Method", titleAr: "منهجنا", subtitleEn: "The Kidspeak speaking-first approach", subtitleAr: "منهج كيدسبيك القائم على التحدث أولاً", ctaTextEn: "Enroll Now", ctaTextAr: "سجّل الآن", ctaLink: "/", bgColor: "#1B2E8F" } },
      { id: "2", type: "steps", data: { titleEn: "Our 4 Steps", titleAr: "خطواتنا الأربع", items: [
        { num: "01", icon: "👂", labelEn: "Listen", labelAr: "اسمع", descEn: "Children immerse in authentic English sounds", descAr: "يتعرض الأطفال لأصوات الإنجليزية الطبيعية" },
        { num: "02", icon: "🗣️", labelEn: "Speak", labelAr: "تحدث", descEn: "Confident repetition without fear", descAr: "تكرار واثق بدون خوف" },
        { num: "03", icon: "💬", labelEn: "Converse", labelAr: "تحاور", descEn: "Real conversations in safe environment", descAr: "محادثات حقيقية في بيئة آمنة" },
        { num: "04", icon: "📚", labelEn: "Read & Write", labelAr: "اقرأ واكتب", descEn: "Literacy builds naturally", descAr: "القراءة والكتابة تنمو بشكل طبيعي" },
      ] } },
      { id: "3", type: "cta", data: { titleEn: "Ready to start?", titleAr: "مستعد للبدء؟", subtitleEn: "Give your child the gift of English", subtitleAr: "أعطِ طفلك هدية اللغة الإنجليزية", buttonTextEn: "Enroll Now", buttonTextAr: "سجّل الآن", buttonLink: "/", bgColor: "#7c3aed" } },
    ] };
    setBuilderState({ open: true, pageId: "our_method", titleEn: "Our Method Page", titleAr: "صفحة المنهج", content });
  };

  const savePageContent = async (content: PageContent) => {
    if (!builderState) return;
    const contentJson = JSON.stringify(content);
    if (builderState.pageId === "our_method") {
      await fetch("/api/admin/cms/settings/our_method", { method: "PUT", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(content) });
    } else {
      await fetch(`/api/admin/pages/${builderState.pageId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ contentEn: contentJson, contentAr: contentJson }) });
      const updated = await fetch("/api/admin/pages", { credentials: "include" }).then(r => r.json());
      setPages(updated);
    }
  };

  const createPage = () => {
    setNewPageForm({ titleEn: "", titleAr: "", slug: "" });
    setShowCreatePage(true);
  };

  const togglePageStatus = async (page: any) => {
    const newStatus = page.status === "published" ? "draft" : "published";
    await fetch(`/api/admin/pages/${page.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ status: newStatus }) });
    setPages(p => p.map(pg => pg.id === page.id ? { ...pg, status: newStatus } : pg));
  };

  const deletePage = async (id: number) => {
    if (!confirm(isAr ? "حذف هذه الصفحة؟" : "Delete this page?")) return;
    await fetch(`/api/admin/pages/${id}`, { method: "DELETE", credentials: "include" });
    setPages(p => p.filter(pg => pg.id !== id));
  };

  if (builderState?.open) {
    return (
      <PageBuilderModal
        pageId={builderState.pageId}
        titleEn={builderState.titleEn}
        titleAr={builderState.titleAr}
        initialContent={builderState.content}
        onSave={savePageContent}
        onClose={() => setBuilderState(null)}
        isRTL={isRTL}
        initialSlug={builderState.slug}
      />
    );
  }

  return (
    <div className="space-y-6" dir={isRTL ? "rtl" : "ltr"}>
      <div>
        <h1 className="text-2xl font-black" style={{ color: BRAND_BLUE }}>{isAr ? "إدارة محتوى الموقع" : "Website Content"}</h1>
        <p className="text-sm text-slate-400 mt-1">{isAr ? "تحكم كامل في محتوى صفحات الموقع" : "Full control over your website pages"}</p>
      </div>

      <Tabs defaultValue="pages">
        <TabsList>
          <TabsTrigger value="pages"><Layers className="w-3.5 h-3.5 me-1.5" />{isAr ? "الصفحات" : "Pages"}</TabsTrigger>
          <TabsTrigger value="homepage"><Home className="w-3.5 h-3.5 me-1.5" />{isAr ? "الصفحة الرئيسية" : "Homepage"}</TabsTrigger>
        </TabsList>

        <TabsContent value="pages" className="space-y-4 mt-4">
          <div>
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-3">{isAr ? "الصفحات الثابتة" : "Built-in Pages"}</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-3 p-4 rounded-xl border bg-white hover:shadow-sm transition-shadow">
                <div className="flex-1">
                  <span className="font-semibold text-sm">{isAr ? "صفحة منهجنا" : "Our Method Page"}</span>
                  <p className="text-xs text-slate-400">/our-method · {isAr ? "مرئية للأولياء" : "Visible to parents"}</p>
                </div>
                <Badge className="text-xs bg-emerald-100 text-emerald-700">{isAr ? "منشورة" : "Published"}</Badge>
                <Button size="sm" style={{ backgroundColor: BRAND_BLUE, color: "white" }} onClick={openBuilderForOurMethod}>
                  <Pencil className="w-3.5 h-3.5 me-1.5" />{isAr ? "تعديل" : "Edit"}
                </Button>
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wide">{isAr ? "الصفحات المخصصة" : "Custom Pages"}</h3>
              <Button size="sm" style={{ backgroundColor: BRAND_BLUE, color: "white" }} onClick={createPage}>
                <Plus className="w-3.5 h-3.5 me-1" />{isAr ? "صفحة جديدة" : "New Page"}
              </Button>
            </div>
            {loadingPages ? (
              <div className="text-sm text-slate-400 py-4">{isAr ? "جارٍ التحميل..." : "Loading..."}</div>
            ) : pages.length === 0 ? (
              <div className="text-center py-10 rounded-2xl border border-dashed text-slate-400 text-sm">{isAr ? "لا توجد صفحات مخصصة" : "No custom pages yet"}</div>
            ) : (
              <div className="space-y-2">
                {pages.map(page => (
                  <div key={page.id} className="flex items-center gap-3 p-4 rounded-xl border bg-white hover:shadow-sm transition-shadow">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{language === "ar" ? (page.titleAr || page.titleEn) : page.titleEn}</span>
                        <Badge className={`text-xs ${page.status === "published" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                          {page.status === "published" ? (isAr ? "منشورة" : "Published") : (isAr ? "مسودة" : "Draft")}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <code className="text-xs text-slate-400">{page.slug}</code>
                        {page.status === "published" && (
                          <a href={`/p${page.slug}`} target="_blank" rel="noopener noreferrer" className="text-slate-300 hover:text-blue-500">
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1.5">
                      <Button variant="ghost" size="sm" className="h-8" onClick={() => togglePageStatus(page)}>
                        {page.status === "published" ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </Button>
                      <Button size="sm" style={{ backgroundColor: BRAND_BLUE, color: "white" }} onClick={() => openBuilderForPage(page)}>
                        <Pencil className="w-3.5 h-3.5 me-1" />{isAr ? "تعديل" : "Edit"}
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 text-red-400 hover:text-red-600" onClick={() => deletePage(page.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="homepage" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle style={{ color: BRAND_BLUE }}>
                {isAr ? "البانر الرئيسي" : "Hero Banner"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><label className="text-xs font-semibold">Headline (EN)</label><Input value={hero.h1En} onChange={e => setHero(p => ({ ...p, h1En: e.target.value }))} /></div>
                <div className="space-y-1"><label className="text-xs font-semibold">العنوان (AR)</label><Input value={hero.h1Ar} onChange={e => setHero(p => ({ ...p, h1Ar: e.target.value }))} dir="rtl" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><label className="text-xs font-semibold">Subtitle (EN)</label><Textarea value={hero.subtitleEn} onChange={e => setHero(p => ({ ...p, subtitleEn: e.target.value }))} rows={2} /></div>
                <div className="space-y-1"><label className="text-xs font-semibold">الوصف (AR)</label><Textarea value={hero.subtitleAr} onChange={e => setHero(p => ({ ...p, subtitleAr: e.target.value }))} rows={2} dir="rtl" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><label className="text-xs font-semibold">Badge (EN)</label><Input value={hero.badgeEn} onChange={e => setHero(p => ({ ...p, badgeEn: e.target.value }))} /></div>
                <div className="space-y-1"><label className="text-xs font-semibold">الشارة (AR)</label><Input value={hero.badgeAr} onChange={e => setHero(p => ({ ...p, badgeAr: e.target.value }))} dir="rtl" /></div>
              </div>
              <Button onClick={saveHero} disabled={savingHero} style={{ backgroundColor: BRAND_BLUE, color: "white" }}>
                <Save className="w-3.5 h-3.5 me-1.5" />
                {savingHero ? (isAr ? "جارٍ الحفظ..." : "Saving...") : (isAr ? "حفظ" : "Save")}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {showCreatePage && (
        <Dialog open onOpenChange={o => !o && setShowCreatePage(false)}>
          <DialogContent className="max-w-md" dir={isRTL ? "rtl" : "ltr"}>
            <DialogHeader>
              <DialogTitle>{isAr ? "صفحة جديدة" : "New Page"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold">{isAr ? "العنوان (EN) *" : "Title (EN) *"}</label>
                <Input
                  value={newPageForm.titleEn}
                  onChange={e => {
                    const slug = "/" + e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
                    setNewPageForm(p => ({ ...p, titleEn: e.target.value, slug }));
                  }}
                  placeholder="Open Day Spring 2026"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold">{isAr ? "العنوان (AR)" : "Title (AR)"}</label>
                <Input
                  value={newPageForm.titleAr}
                  onChange={e => setNewPageForm(p => ({ ...p, titleAr: e.target.value }))}
                  placeholder="اليوم المفتوح ربيع 2026"
                  dir="rtl"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold">{isAr ? "رابط الصفحة (Slug) *" : "Page URL (Slug) *"}</label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 shrink-0">/p</span>
                  <Input
                    value={newPageForm.slug}
                    onChange={e => {
                      let slug = e.target.value;
                      if (!slug.startsWith("/")) slug = "/" + slug;
                      slug = slug.replace(/[^a-z0-9-/]/g, "");
                      setNewPageForm(p => ({ ...p, slug }));
                    }}
                    placeholder="/open-day-spring"
                    dir="ltr"
                    className="font-mono text-sm"
                  />
                </div>
                <p className="text-xs text-slate-400">{isAr ? "الرابط الكامل:" : "Full URL:"} <span className="font-mono">kidspeakdz.com/p{newPageForm.slug}</span></p>
              </div>
            </div>
            <DialogFooter className="gap-2 flex-row-reverse">
              <Button
                disabled={!newPageForm.titleEn || !newPageForm.slug || creatingPage}
                style={{ backgroundColor: BRAND_BLUE, color: "white" }}
                onClick={async () => {
                  setCreatingPage(true);
                  try {
                    const r = await fetch("/api/admin/pages", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      credentials: "include",
                      body: JSON.stringify({
                        titleEn: newPageForm.titleEn,
                        titleAr: newPageForm.titleAr || newPageForm.titleEn,
                        slug: newPageForm.slug,
                        contentEn: JSON.stringify({ sections: [] }),
                        contentAr: JSON.stringify({ sections: [] }),
                        status: "draft",
                        showInNavbar: false,
                        showInFooter: false,
                      }),
                    });
                    if (r.status === 409) {
                      toast({ title: isAr ? "هذا الرابط مستخدم بالفعل" : "This slug is already in use", variant: "destructive" });
                      return;
                    }
                    if (r.ok) {
                      const page = await r.json();
                      const updated = await fetch("/api/admin/pages", { credentials: "include" }).then(res => res.json());
                      setPages(updated);
                      setShowCreatePage(false);
                      setNewPageForm({ titleEn: "", titleAr: "", slug: "" });
                      openBuilderForPage(page);
                    }
                  } finally {
                    setCreatingPage(false);
                  }
                }}
              >
                {creatingPage ? (isAr ? "جارٍ الإنشاء..." : "Creating...") : (isAr ? "إنشاء وفتح المحرر" : "Create & Open Editor")}
              </Button>
              <DialogClose asChild><Button variant="outline">{isAr ? "إلغاء" : "Cancel"}</Button></DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

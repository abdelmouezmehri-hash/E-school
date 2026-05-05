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
  Home, BookOpen, Image, Type, Zap, Grid3X3, ToggleLeft, ToggleRight,
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

  // ── Landing v2 CMS ──────────────────────────────────────────────────────────
  const DEFAULT_LANDING = {
    hero: {
      title: "علِّم طفلك الإنجليزية بالطريقة الطبيعية",
      subtitle: "كيدسبيك أول مركز في الجزائر يعتمد منهج التحدث أولاً — حيث تبني الثقة قبل القواعد، والمتعة قبل الحفظ.",
      cta1: "سجّل الآن",
      cta2: "تعرّف على البرامج",
    },
    stats: [
      { label: "تلميذ",       value: 350, suffix: "+" },
      { label: "أستاذ",       value: 18,  suffix: "" },
      { label: "برنامج",      value: 4,   suffix: "" },
      { label: "رضا الأولياء", value: 97,  suffix: "%" },
    ],
    sections: { programs: true, testimonials: true, ctaBanner: true, footer: true },
    testimonials: [
      { name: "والدة نور",   text: "بعد ثلاثة أشهر في كيدسبيك، أصبحت ابنتي تتحدث الإنجليزية بلا خوف. التحول مذهل حقاً.", stars: 5 },
      { name: "والد ياسين", text: "ما يميز كيدسبيك هو متابعة الأخصائية النفسية لكل طفل. ابني أصبح أكثر جرأة وثقة بنفسه.", stars: 5 },
      { name: "والدة أميرة", text: "التطبيق يتيح لي متابعة تقدم ابنتي يومياً. شفافية تامة ونتائج حقيقية.", stars: 5 },
    ],
    seo: {
      metaTitle: "كيدسبيك — مركز تعليم اللغة الإنجليزية بالجزائر",
      metaDescription: "كيدسبيك أول مركز في الجزائر يعتمد منهج التحدث أولاً لتعليم الإنجليزية للأطفال.",
      keywords: "تعليم الإنجليزية, الجزائر, أطفال, كيدسبيك",
      ogImageUrl: "",
    },
    notifBanner: {
      enabled: false,
      text: "🎉 التسجيل مفتوح للفصل الدراسي الجديد!",
      bgColor: "#F5A600",
      textColor: "#1B2E8F",
    },
    contactInfo: {
      phone: "",
      email: "",
      whatsapp: "",
      address: "",
    },
  };
  const [landing, setLanding] = useState(DEFAULT_LANDING);
  const [aiWriting, setAiWriting] = useState<string | null>(null);
  const [savingLanding, setSavingLanding] = useState(false);

  // ── Programs display config ─────────────────────────────────────────────────
  const [programsDisplay, setProgramsDisplay] = useState<any[]>([]);
  const [loadingPrograms, setLoadingPrograms] = useState(true);
  const [savingPrograms, setSavingPrograms] = useState(false);

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
    fetch("/api/public/cms/settings/landing_v3").then(r => r.ok ? r.json() : null).then(d => {
      if (d?.data && typeof d.data === "object" && !Array.isArray(d.data)) {
        setLanding(prev => ({
          hero:         { ...prev.hero,         ...(d.data.hero         ?? {}) },
          stats:        d.data.stats             ?? prev.stats,
          sections:     { ...prev.sections,     ...(d.data.sections     ?? {}) },
          testimonials: d.data.testimonials      ?? prev.testimonials,
          seo:          { ...prev.seo,           ...(d.data.seo          ?? {}) },
          notifBanner:  { ...prev.notifBanner,   ...(d.data.notifBanner  ?? {}) },
          contactInfo:  { ...prev.contactInfo,   ...(d.data.contactInfo  ?? {}) },
        }));
      }
    }).catch(() => {});
    fetch("/api/admin/pages", { credentials: "include" }).then(r => r.ok ? r.json() : []).then(setPages).catch(() => {}).finally(() => setLoadingPages(false));
    fetch("/api/admin/programs-display", { credentials: "include" }).then(r => r.ok ? r.json() : []).then(setProgramsDisplay).catch(() => {}).finally(() => setLoadingPrograms(false));
  }, []);

  const saveLanding = async () => {
    setSavingLanding(true);
    try {
      await fetch("/api/admin/cms/settings/landing_v3", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        credentials: "include", body: JSON.stringify(landing),
      });
      toast({ title: isAr ? "تم الحفظ ✓" : "Saved ✓" });
    } catch { toast({ title: "Error", variant: "destructive" }); }
    finally { setSavingLanding(false); }
  };

  const savePrograms = async () => {
    setSavingPrograms(true);
    try {
      const payload = programsDisplay.map(p => ({
        levelId: p.id,
        visible: p.visible,
        landingDescription: p.landingDescription ?? "",
      }));
      await fetch("/api/admin/programs-display", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        credentials: "include", body: JSON.stringify(payload),
      });
      toast({ title: isAr ? "تم الحفظ ✓" : "Saved ✓" });
    } catch { toast({ title: "Error", variant: "destructive" }); }
    finally { setSavingPrograms(false); }
  };

  const aiWrite = async (fieldKey: string, systemContext: string, prompt: string) => {
    setAiWriting(fieldKey);
    try {
      const r = await fetch("/api/ai/chat", {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ messages: [{ role: "user", content: prompt }], systemContext }),
      });
      if (!r.ok) throw new Error("AI error");
      const data = await r.json();
      return data.message ?? "";
    } catch {
      toast({ title: "خطأ في الذكاء الاصطناعي", variant: "destructive" });
      return null;
    } finally {
      setAiWriting(null);
    }
  };

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

      <Tabs defaultValue="landing">
        <TabsList>
          <TabsTrigger value="landing"><Globe className="w-3.5 h-3.5 me-1.5" />{isAr ? "إدارة المحتوى" : "Landing Page"}</TabsTrigger>
          <TabsTrigger value="pages"><Layers className="w-3.5 h-3.5 me-1.5" />{isAr ? "الصفحات" : "Pages"}</TabsTrigger>
          <TabsTrigger value="programs"><BookOpen className="w-3.5 h-3.5 me-1.5" />{isAr ? "البرامج المعروضة" : "Programs Display"}</TabsTrigger>
          <TabsTrigger value="homepage"><Home className="w-3.5 h-3.5 me-1.5" />{isAr ? "الصفحة الرئيسية (قديم)" : "Homepage (Legacy)"}</TabsTrigger>
        </TabsList>

        {/* ── LANDING PAGE CMS TAB ────────────────────────────────────────── */}
        <TabsContent value="landing" className="mt-4 space-y-5" dir="rtl">
          {/* Hero */}
          <Card>
            <CardHeader><CardTitle style={{ color: BRAND_BLUE }}>القسم الرئيسي (Hero)</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-600">العنوان الرئيسي</label>
                  <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px] text-purple-600 gap-1" disabled={aiWriting === "heroTitle"}
                    onClick={async () => {
                      const r = await aiWrite("heroTitle", "أنت كاتب محتوى تسويقي.", `اكتب عنواناً تسويقياً جذاباً للصفحة الرئيسية لمركز كيدسبيك لتعليم الإنجليزية للأطفال في الجزائر. يجب أن يكون قصيراً ومؤثراً (أقل من 10 كلمات). أرجع النص فقط.`);
                      if (r) setLanding(p => ({ ...p, hero: { ...p.hero, title: r } }));
                    }}>
                    <Wand2 className="w-3 h-3" />{aiWriting === "heroTitle" ? "..." : "✨ كتابة بالذكاء الاصطناعي"}
                  </Button>
                </div>
                <Textarea
                  value={landing.hero.title}
                  onChange={e => setLanding(p => ({ ...p, hero: { ...p.hero, title: e.target.value } }))}
                  rows={2} dir="rtl"
                />
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-600">الوصف الفرعي</label>
                  <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px] text-purple-600 gap-1" disabled={aiWriting === "heroSubtitle"}
                    onClick={async () => {
                      const r = await aiWrite("heroSubtitle", "أنت كاتب محتوى تسويقي.", `اكتب وصفاً فرعياً مقنعاً (2-3 جمل) للصفحة الرئيسية لمركز كيدسبيك لتعليم الإنجليزية للأطفال في الجزائر بمنهج التحدث أولاً. أرجع النص فقط.`);
                      if (r) setLanding(p => ({ ...p, hero: { ...p.hero, subtitle: r } }));
                    }}>
                    <Wand2 className="w-3 h-3" />{aiWriting === "heroSubtitle" ? "..." : "✨ كتابة بالذكاء الاصطناعي"}
                  </Button>
                </div>
                <Textarea
                  value={landing.hero.subtitle}
                  onChange={e => setLanding(p => ({ ...p, hero: { ...p.hero, subtitle: e.target.value } }))}
                  rows={3} dir="rtl"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">نص الزر الأول</label>
                  <Input value={landing.hero.cta1}
                         onChange={e => setLanding(p => ({ ...p, hero: { ...p.hero, cta1: e.target.value } }))} dir="rtl" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">نص الزر الثاني</label>
                  <Input value={landing.hero.cta2}
                         onChange={e => setLanding(p => ({ ...p, hero: { ...p.hero, cta2: e.target.value } }))} dir="rtl" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats */}
          <Card>
            <CardHeader><CardTitle style={{ color: BRAND_BLUE }}>بطاقات الإحصائيات (٤ بطاقات)</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {landing.stats.map((stat, i) => (
                <div key={i} className="grid grid-cols-4 gap-2 items-center">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-500">الرقم</label>
                    <Input
                      type="number"
                      value={stat.value}
                      onChange={e => {
                        const stats = [...landing.stats];
                        stats[i] = { ...stats[i], value: parseInt(e.target.value) || 0 };
                        setLanding(p => ({ ...p, stats }));
                      }}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-500">اللاحقة</label>
                    <Input
                      value={stat.suffix}
                      onChange={e => {
                        const stats = [...landing.stats];
                        stats[i] = { ...stats[i], suffix: e.target.value };
                        setLanding(p => ({ ...p, stats }));
                      }}
                      placeholder="+ أو %" className="text-center"
                    />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <label className="text-xs font-semibold text-slate-500">التسمية</label>
                    <Input
                      value={stat.label}
                      onChange={e => {
                        const stats = [...landing.stats];
                        stats[i] = { ...stats[i], label: e.target.value };
                        setLanding(p => ({ ...p, stats }));
                      }}
                      dir="rtl"
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Section visibility */}
          <Card>
            <CardHeader><CardTitle style={{ color: BRAND_BLUE }}>إظهار / إخفاء الأقسام</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {[
                { key: "programs",     label: "قسم البرامج والمستويات" },
                { key: "testimonials", label: "قسم آراء الأولياء" },
                { key: "ctaBanner",    label: "بنر الدعوة للتسجيل" },
                { key: "footer",       label: "التذييل (Footer)" },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-3 cursor-pointer select-none">
                  <div
                    onClick={() => setLanding(p => ({ ...p, sections: { ...p.sections, [key]: !p.sections[key as keyof typeof p.sections] } }))}
                    className="relative w-10 h-5 rounded-full transition-colors cursor-pointer"
                    style={{ backgroundColor: landing.sections[key as keyof typeof landing.sections] ? BRAND_BLUE : "#d1d5db" }}
                  >
                    <div className="absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all shadow-sm"
                         style={{ left: landing.sections[key as keyof typeof landing.sections] ? "calc(100% - 18px)" : "2px" }} />
                  </div>
                  <span className="text-sm font-medium text-slate-700">{label}</span>
                </label>
              ))}
            </CardContent>
          </Card>

          {/* Testimonials */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle style={{ color: BRAND_BLUE }}>آراء الأولياء</CardTitle>
                <Button size="sm" style={{ backgroundColor: BRAND_BLUE, color: "white" }}
                        onClick={() => setLanding(p => ({ ...p, testimonials: [...p.testimonials, { name: "", text: "", stars: 5 }] }))}>
                  <Plus className="w-3.5 h-3.5 me-1" /> إضافة رأي
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {landing.testimonials.map((t, i) => (
                <div key={i} className="p-4 rounded-xl border border-slate-100 bg-slate-50 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {[1,2,3,4,5].map(s => (
                        <button key={s} onClick={() => {
                          const ts = [...landing.testimonials];
                          ts[i] = { ...ts[i], stars: s };
                          setLanding(p => ({ ...p, testimonials: ts }));
                        }}>
                          <Star className="w-4 h-4" fill={s <= t.stars ? BRAND_YELLOW : "none"} stroke={s <= t.stars ? BRAND_YELLOW : "#aaa"} />
                        </button>
                      ))}
                    </div>
                    <Button size="sm" variant="ghost" className="text-red-400 h-7 w-7 p-0"
                            onClick={() => setLanding(p => ({ ...p, testimonials: p.testimonials.filter((_, j) => j !== i) }))}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                  <Input
                    value={t.name} dir="rtl"
                    onChange={e => { const ts = [...landing.testimonials]; ts[i] = { ...ts[i], name: e.target.value }; setLanding(p => ({ ...p, testimonials: ts })); }}
                    placeholder="اسم الولي"
                  />
                  <Textarea
                    value={t.text} rows={2} dir="rtl"
                    onChange={e => { const ts = [...landing.testimonials]; ts[i] = { ...ts[i], text: e.target.value }; setLanding(p => ({ ...p, testimonials: ts })); }}
                    placeholder="نص الشهادة..."
                  />
                </div>
              ))}
              {landing.testimonials.length === 0 && (
                <p className="text-sm text-slate-400 text-center py-4">لا توجد شهادات. أضف واحدة باستخدام الزر أعلاه.</p>
              )}
            </CardContent>
          </Card>

          {/* ── SEO Section ── */}
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2" style={{ color: BRAND_BLUE }}>
              <Globe className="w-4 h-4" /> إعدادات SEO
            </CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-600">عنوان الصفحة (Meta Title)</label>
                  <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px] text-purple-600 gap-1" disabled={aiWriting === "seoTitle"}
                    onClick={async () => {
                      const r = await aiWrite("seoTitle", "أنت كاتب محتوى SEO.", `اكتب عنوان Meta Title مناسب لموقع كيدسبيك، مركز لتعليم الإنجليزية للأطفال في الجزائر. أرجع النص فقط.`);
                      if (r) setLanding(p => ({ ...p, seo: { ...p.seo, metaTitle: r } }));
                    }}>
                    <Wand2 className="w-3 h-3" />{aiWriting === "seoTitle" ? "..." : "✨ كتابة بالذكاء الاصطناعي"}
                  </Button>
                </div>
                <Input value={landing.seo.metaTitle} dir="rtl"
                  onChange={e => setLanding(p => ({ ...p, seo: { ...p.seo, metaTitle: e.target.value } }))}
                  placeholder="كيدسبيك — مركز تعليم اللغة الإنجليزية" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-600">وصف الصفحة (Meta Description)</label>
                  <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px] text-purple-600 gap-1" disabled={aiWriting === "seoDesc"}
                    onClick={async () => {
                      const r = await aiWrite("seoDesc", "أنت كاتب محتوى SEO.", `اكتب وصف Meta Description بعربية فصيحة مقنعة (150-160 حرف) لموقع كيدسبيك مركز تعليم الإنجليزية للأطفال في الجزائر. أرجع النص فقط.`);
                      if (r) setLanding(p => ({ ...p, seo: { ...p.seo, metaDescription: r } }));
                    }}>
                    <Wand2 className="w-3 h-3" />{aiWriting === "seoDesc" ? "..." : "✨ كتابة بالذكاء الاصطناعي"}
                  </Button>
                </div>
                <Textarea value={landing.seo.metaDescription} dir="rtl" rows={2}
                  onChange={e => setLanding(p => ({ ...p, seo: { ...p.seo, metaDescription: e.target.value } }))}
                  placeholder="أدخل وصفاً مختصراً للصفحة الرئيسية..." />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">الكلمات المفتاحية</label>
                <Input value={landing.seo.keywords} dir="rtl"
                  onChange={e => setLanding(p => ({ ...p, seo: { ...p.seo, keywords: e.target.value } }))}
                  placeholder="تعليم الإنجليزية, الجزائر, أطفال" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">رابط صورة OG (للمشاركة)</label>
                <Input value={landing.seo.ogImageUrl} dir="ltr"
                  onChange={e => setLanding(p => ({ ...p, seo: { ...p.seo, ogImageUrl: e.target.value } }))}
                  placeholder="https://..." />
              </div>
            </CardContent>
          </Card>

          {/* ── Notification Banner ── */}
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2" style={{ color: BRAND_BLUE }}>
              <FileText className="w-4 h-4" /> بانر الإشعارات
            </CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setLanding(p => ({ ...p, notifBanner: { ...p.notifBanner, enabled: !p.notifBanner.enabled } }))}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${landing.notifBanner.enabled ? "bg-green-500" : "bg-slate-300"}`}
                >
                  <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${landing.notifBanner.enabled ? "translate-x-4" : "translate-x-1"}`} />
                </button>
                <span className="text-sm font-medium">{landing.notifBanner.enabled ? "البانر مفعّل" : "البانر مخفي"}</span>
              </div>
              {landing.notifBanner.enabled && (
                <>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-600">نص الإشعار</label>
                      <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px] text-purple-600 gap-1" disabled={aiWriting === "notifText"}
                        onClick={async () => {
                          const r = await aiWrite("notifText", "أنت كاتب محتوى تسويقي.", `اكتب نصاً قصيراً (15-25 كلمة) لبانر إعلان في أعلى الصفحة عن فتح التسجيل لفصل دراسي جديد في مركز كيدسبيك. أرجع النص فقط.`);
                          if (r) setLanding(p => ({ ...p, notifBanner: { ...p.notifBanner, text: r } }));
                        }}>
                        <Wand2 className="w-3 h-3" />{aiWriting === "notifText" ? "..." : "✨ كتابة بالذكاء الاصطناعي"}
                      </Button>
                    </div>
                    <Input value={landing.notifBanner.text} dir="rtl"
                      onChange={e => setLanding(p => ({ ...p, notifBanner: { ...p.notifBanner, text: e.target.value } }))}
                      placeholder="🎉 التسجيل مفتوح الآن!" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-600">لون الخلفية</label>
                      <div className="flex items-center gap-2">
                        <input type="color" value={landing.notifBanner.bgColor}
                          onChange={e => setLanding(p => ({ ...p, notifBanner: { ...p.notifBanner, bgColor: e.target.value } }))}
                          className="w-8 h-8 rounded cursor-pointer border-0 p-0" />
                        <Input value={landing.notifBanner.bgColor} className="font-mono text-xs h-8"
                          onChange={e => setLanding(p => ({ ...p, notifBanner: { ...p.notifBanner, bgColor: e.target.value } }))} />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-600">لون النص</label>
                      <div className="flex items-center gap-2">
                        <input type="color" value={landing.notifBanner.textColor}
                          onChange={e => setLanding(p => ({ ...p, notifBanner: { ...p.notifBanner, textColor: e.target.value } }))}
                          className="w-8 h-8 rounded cursor-pointer border-0 p-0" />
                        <Input value={landing.notifBanner.textColor} className="font-mono text-xs h-8"
                          onChange={e => setLanding(p => ({ ...p, notifBanner: { ...p.notifBanner, textColor: e.target.value } }))} />
                      </div>
                    </div>
                  </div>
                  {/* Preview */}
                  <div className="p-3 rounded-lg text-sm font-semibold text-center"
                    style={{ backgroundColor: landing.notifBanner.bgColor, color: landing.notifBanner.textColor }}>
                    {landing.notifBanner.text || "نص الإشعار هنا..."}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* ── Contact Info ── */}
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2" style={{ color: BRAND_BLUE }}>
              <MessageSquare className="w-4 h-4" /> معلومات التواصل
            </CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">رقم الهاتف</label>
                <Input value={landing.contactInfo.phone} dir="ltr"
                  onChange={e => setLanding(p => ({ ...p, contactInfo: { ...p.contactInfo, phone: e.target.value } }))}
                  placeholder="+213 ..." />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">واتساب</label>
                <Input value={landing.contactInfo.whatsapp} dir="ltr"
                  onChange={e => setLanding(p => ({ ...p, contactInfo: { ...p.contactInfo, whatsapp: e.target.value } }))}
                  placeholder="+213 ..." />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">البريد الإلكتروني</label>
                <Input value={landing.contactInfo.email} dir="ltr"
                  onChange={e => setLanding(p => ({ ...p, contactInfo: { ...p.contactInfo, email: e.target.value } }))}
                  placeholder="contact@kidspeakdz.com" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">العنوان</label>
                <Input value={landing.contactInfo.address} dir="rtl"
                  onChange={e => setLanding(p => ({ ...p, contactInfo: { ...p.contactInfo, address: e.target.value } }))}
                  placeholder="شارع ..." />
              </div>
            </CardContent>
          </Card>

          <Button onClick={saveLanding} disabled={savingLanding} style={{ backgroundColor: BRAND_BLUE, color: "white" }}>
            <Save className="w-4 h-4 me-2" />
            {savingLanding ? "جارٍ الحفظ..." : "حفظ جميع التغييرات"}
          </Button>
        </TabsContent>

        {/* ── PROGRAMS DISPLAY TAB ─────────────────────────────────────────── */}
        <TabsContent value="programs" className="mt-4 space-y-5" dir="rtl">
          <Card>
            <CardHeader>
              <CardTitle style={{ color: BRAND_BLUE }}>البرامج المعروضة في الصفحة الرئيسية</CardTitle>
              <p className="text-xs text-slate-400 mt-1">اختر المستويات التي تظهر للزوار، وأضف وصفاً مخصصاً لكل منها.</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {loadingPrograms ? (
                <p className="text-sm text-slate-400">جارٍ التحميل...</p>
              ) : programsDisplay.length === 0 ? (
                <p className="text-sm text-slate-400">لا توجد مستويات في قاعدة البيانات بعد.</p>
              ) : (
                <div className="space-y-4">
                  {programsDisplay.map((prog, i) => (
                    <div key={prog.id}
                         className="rounded-xl border p-4 space-y-3"
                         style={{ borderColor: prog.visible ? "#1B2E8F22" : "#e5e7eb", background: prog.visible ? "#f0f4ff" : "#fafafa" }}>
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-bold text-slate-700">{prog.nameAr || prog.name}</p>
                          {prog.nameAr && prog.name && prog.nameAr !== prog.name && (
                            <p className="text-xs text-slate-400">{prog.name}</p>
                          )}
                          {prog.price > 0 && (
                            <p className="text-xs text-slate-400 mt-0.5">{Number(prog.price).toLocaleString("fr-DZ")} دج / حصة</p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => setProgramsDisplay(prev => prev.map(p => p.id === prog.id ? { ...p, visible: !p.visible } : p))}
                          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition-all"
                          style={{
                            backgroundColor: prog.visible ? "#1B2E8F15" : "#f3f4f6",
                            color: prog.visible ? "#1B2E8F" : "#9ca3af",
                            border: `1px solid ${prog.visible ? "#1B2E8F30" : "#e5e7eb"}`,
                          }}>
                          {prog.visible
                            ? <><ToggleRight className="w-4 h-4" /> ظاهر</>
                            : <><ToggleLeft className="w-4 h-4" /> مخفي</>}
                        </button>
                      </div>
                      {prog.visible && (
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-slate-500">وصف مخصص للصفحة الرئيسية (اختياري)</label>
                          <Textarea
                            value={prog.landingDescription ?? ""}
                            onChange={e => setProgramsDisplay(prev => prev.map(p => p.id === prog.id ? { ...p, landingDescription: e.target.value } : p))}
                            rows={2}
                            dir="rtl"
                            placeholder={prog.descriptionAr || prog.description || "اكتب وصفاً مخصصاً يظهر للزوار..."}
                            className="text-sm"
                          />
                          <p className="text-[10px] text-slate-400">إذا تركت الحقل فارغاً، سيُستخدم الوصف الافتراضي من قاعدة البيانات.</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <Button
                onClick={savePrograms}
                disabled={savingPrograms || loadingPrograms}
                style={{ backgroundColor: BRAND_BLUE, color: "white" }}>
                <Save className="w-4 h-4 me-2" />
                {savingPrograms ? "جارٍ الحفظ..." : "حفظ إعدادات البرامج"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

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

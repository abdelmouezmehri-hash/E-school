import { useState, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { useGetMe } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import {
  Sparkles, Save, Eye, Trash2, Plus, Globe, FileText,
  ChevronDown, ChevronUp, Copy, ExternalLink, Loader2,
} from "lucide-react";

type BuildMode = "section" | "page";

interface GeneratedItem {
  id: string;
  mode: BuildMode;
  title: string;
  prompt: string;
  html: string;
  slug?: string;
  hasForm: boolean;
  savedPageId?: number;
  createdAt: string;
}

export default function AdminAiBuilder() {
  const [, navigate] = useLocation();
  const { data: currentUser } = useGetMe();
  const { toast } = useToast();

  const [mode, setMode] = useState<BuildMode>("section");
  const [prompt, setPrompt] = useState("");
  const [pageTitle, setPageTitle] = useState("");
  const [pageSlug, setPageSlug] = useState("");
  const [includeForm, setIncludeForm] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [history, setHistory] = useState<GeneratedItem[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const previewRef = useRef<HTMLIFrameElement>(null);

  const role = (currentUser as any)?.role;
  const canUse = role === "admin" || role === "branch_manager";

  useEffect(() => {
    if (currentUser && !canUse) navigate("/dashboard");
  }, [currentUser, canUse, navigate]);

  // Auto-generate slug from title
  useEffect(() => {
    if (mode === "page" && pageTitle) {
      const slug = "/lp/" + pageTitle
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^\w-]/g, "")
        .slice(0, 50);
      setPageSlug(slug);
    }
  }, [pageTitle, mode]);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast({ title: "أدخل وصفاً أولاً", variant: "destructive" });
      return;
    }
    if (mode === "page" && !pageTitle.trim()) {
      toast({ title: "أدخل عنوان الصفحة", variant: "destructive" });
      return;
    }

    setGenerating(true);
    setPreview(null);

    try {
      const r = await fetch("/api/admin/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          mode,
          prompt: prompt.trim(),
          pageTitle: mode === "page" ? pageTitle.trim() : undefined,
          includeForm,
        }),
      });

      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error((err as any).error || `HTTP ${r.status}`);
      }

      const data = await r.json();
      const html: string = data.html;

      setPreview(html);

      const item: GeneratedItem = {
        id: Date.now().toString(),
        mode,
        title: mode === "page" ? pageTitle : prompt.slice(0, 60),
        prompt: prompt.trim(),
        html,
        slug: mode === "page" ? pageSlug : undefined,
        hasForm: includeForm && html.includes("form"),
        createdAt: new Date().toISOString(),
      };
      setHistory(h => [item, ...h]);
      setExpandedId(item.id);

    } catch (e: any) {
      toast({ title: "فشل التوليد", description: e?.message ?? "حاول مرة أخرى.", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const handleSavePage = async (item: GeneratedItem) => {
    if (!item.slug) return;
    setSavingId(item.id);
    try {
      const slug = item.slug.startsWith("/") ? item.slug : `/${item.slug}`;
      const r = await fetch("/api/admin/cms/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          titleAr: item.title,
          titleEn: item.title,
          slug,
          contentAr: item.html,
          contentEn: item.html,
          status: "published",
          showInNavbar: false,
          showInFooter: false,
        }),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error((err as any).error || `HTTP ${r.status}`);
      }
      const page = await r.json();
      setHistory(h => h.map(it => it.id === item.id ? { ...it, savedPageId: page.id } : it));
      toast({
        title: "تم نشر الصفحة ✓",
        description: `متاحة على: ${slug}`,
      });
    } catch (e: any) {
      toast({ title: "فشل النشر", description: e?.message, variant: "destructive" });
    } finally {
      setSavingId(null);
    }
  };

  const handleCopyHtml = (html: string) => {
    navigator.clipboard.writeText(html);
    toast({ title: "تم نسخ الكود ✓" });
  };

  const PROMPTS_SECTION = [
    "قسم عن فريق الأساتذة مع صور ونبذة مختصرة",
    "قسم أسئلة شائعة (FAQ) عن تعليم الإنجليزية للأطفال",
    "قسم مقارنة بين منهج Speaking First والمناهج التقليدية",
    "قسم شهادات أولياء أمور بتصميم بطاقات",
  ];

  const PROMPTS_PAGE = [
    "صفحة هبوط لحملة إعلانية — تسجيل مبكر لموسم صيف 2025",
    "صفحة هبوط لحملة على الفيسبوك — برنامج المستجدين الجدد",
    "صفحة هبوط — خصم 30% لأول 10 تسجيلات",
    "صفحة هبوط — برنامج المجموعات الصغيرة 1:4",
  ];

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-8 space-y-6 pb-10">

      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black flex items-center gap-2">
          <Sparkles className="w-7 h-7 text-amber-500" />
          مولّد المحتوى بالذكاء الاصطناعي
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          صِف ما تريد بالعربية → AI يبني تصميم + محتوى احترافي جاهز للنشر.
        </p>
      </div>

      {/* Mode toggle */}
      <div className="flex gap-2 p-1 bg-muted rounded-xl w-fit">
        <ModeTab active={mode === "section"} onClick={() => setMode("section")} icon={<FileText className="w-4 h-4" />}>
          قسم (Section)
        </ModeTab>
        <ModeTab active={mode === "page"} onClick={() => setMode("page")} icon={<Globe className="w-4 h-4" />}>
          صفحة كاملة (Landing Page)
        </ModeTab>
      </div>

      {/* Build form */}
      <section className="rounded-2xl border bg-card p-4 sm:p-6 space-y-4">

        {mode === "page" && (
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold mb-1.5 text-muted-foreground">عنوان الصفحة</label>
              <input type="text" value={pageTitle} placeholder="مثال: حملة صيف 2025"
                     onChange={e => setPageTitle(e.target.value)}
                     className="w-full px-3 py-2 rounded-lg border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1.5 text-muted-foreground">الرابط (Slug)</label>
              <input type="text" value={pageSlug}
                     onChange={e => setPageSlug(e.target.value)}
                     className="w-full px-3 py-2 rounded-lg border bg-background text-sm font-mono outline-none focus:ring-2 focus:ring-primary/30" />
              <p className="text-[10px] text-muted-foreground mt-1">
                kidspeakdz.com{pageSlug}
              </p>
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs font-bold mb-1.5 text-muted-foreground">
            {mode === "section" ? "صِف القسم الذي تريده" : "صِف الهدف من الصفحة"}
          </label>
          <textarea
            value={prompt}
            rows={4}
            placeholder={
              mode === "section"
                ? "مثال: قسم يعرض مزايا برامجنا في 3 بطاقات مع أيقونات وألوان مميزة..."
                : "مثال: صفحة هبوط لحملة إعلانية عن التسجيل المبكر لصيف 2025، مع عرض خاص ونموذج تسجيل..."
            }
            onChange={e => setPrompt(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border bg-background text-sm resize-y outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        {/* Quick prompts */}
        <div className="flex flex-wrap gap-1.5">
          {(mode === "section" ? PROMPTS_SECTION : PROMPTS_PAGE).map(p => (
            <button key={p} type="button" onClick={() => setPrompt(p)}
                    className="text-xs px-2.5 py-1 rounded-full border hover:bg-primary/5 hover:border-primary/40 transition-colors text-muted-foreground">
              {p.slice(0, 45)}…
            </button>
          ))}
        </div>

        {/* Include form toggle */}
        <label className="flex items-center gap-3 cursor-pointer select-none">
          <div onClick={() => setIncludeForm(v => !v)}
               className={`w-10 h-5 rounded-full transition-colors flex items-center px-0.5
                 ${includeForm ? "bg-primary" : "bg-muted"}`}>
            <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform
              ${includeForm ? "translate-x-5" : "translate-x-0"}`} />
          </div>
          <span className="text-sm font-medium">تضمين نموذج تسجيل (اسم، هاتف، اسم الطفل)</span>
        </label>
        {includeForm && (
          <p className="text-xs text-muted-foreground pr-12">
            ✓ بيانات النموذج تُحفظ تلقائياً في قسم <strong>طلبات التسجيل</strong> في لوحة التحكم.
          </p>
        )}

        <button onClick={handleGenerate} disabled={generating}
                className="w-full py-3 rounded-xl bg-gradient-to-l from-amber-500 to-orange-500 text-white font-black text-base inline-flex items-center justify-center gap-2 disabled:opacity-60 hover:opacity-90 transition-opacity shadow-md">
          {generating
            ? <><Loader2 className="w-5 h-5 animate-spin" /> جاري التوليد…</>
            : <><Sparkles className="w-5 h-5" /> توليد بالذكاء الاصطناعي</>}
        </button>
      </section>

      {/* Live preview */}
      {preview && (
        <section className="rounded-2xl border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
            <h3 className="font-bold text-sm flex items-center gap-1.5">
              <Eye className="w-4 h-4" /> معاينة
            </h3>
            <span className="text-xs text-muted-foreground">نتيجة آخر توليد</span>
          </div>
          <iframe
            ref={previewRef}
            srcDoc={`<!DOCTYPE html><html dir="rtl" lang="ar"><head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width,initial-scale=1">
              <script src="https://cdn.tailwindcss.com"></script>
              <style>body{margin:0;font-family:system-ui,sans-serif}</style>
            </head><body>${preview}</body></html>`}
            className="w-full border-0"
            style={{ height: 500 }}
            title="AI Preview"
          />
        </section>
      )}

      {/* History */}
      {history.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-bold">المحتوى المولَّد</h2>
          {history.map(item => (
            <div key={item.id} className="rounded-2xl border bg-card overflow-hidden">
              <button type="button"
                      onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                      className="w-full flex items-center justify-between gap-3 p-4 hover:bg-muted/30 transition-colors text-start">
                <div className="flex items-center gap-3 min-w-0">
                  {item.mode === "page"
                    ? <Globe className="w-4 h-4 text-blue-500 shrink-0" />
                    : <FileText className="w-4 h-4 text-emerald-500 shrink-0" />}
                  <div className="min-w-0">
                    <p className="font-bold text-sm truncate">{item.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.mode === "page" ? "صفحة" : "قسم"} •{" "}
                      {new Date(item.createdAt).toLocaleTimeString("ar-DZ")}
                      {item.hasForm && " • نموذج تسجيل ✓"}
                      {item.savedPageId && " • منشورة ✓"}
                    </p>
                  </div>
                </div>
                {expandedId === item.id ? <ChevronUp className="w-4 h-4 shrink-0" /> : <ChevronDown className="w-4 h-4 shrink-0" />}
              </button>

              {expandedId === item.id && (
                <div className="border-t">
                  {/* Mini preview */}
                  <iframe
                    srcDoc={`<!DOCTYPE html><html dir="rtl" lang="ar"><head>
                      <meta charset="UTF-8">
                      <meta name="viewport" content="width=device-width,initial-scale=1">
                      <script src="https://cdn.tailwindcss.com"></script>
                      <style>body{margin:0;font-family:system-ui,sans-serif}</style>
                    </head><body>${item.html}</body></html>`}
                    className="w-full border-0"
                    style={{ height: 350 }}
                    title={item.title}
                  />
                  {/* Actions */}
                  <div className="flex flex-wrap gap-2 p-3 border-t bg-muted/20">
                    <button onClick={() => handleCopyHtml(item.html)}
                            className="text-xs px-3 py-1.5 rounded-lg border bg-background hover:bg-muted inline-flex items-center gap-1.5 font-medium">
                      <Copy className="w-3.5 h-3.5" /> نسخ الكود
                    </button>

                    {item.mode === "page" && !item.savedPageId && (
                      <button onClick={() => handleSavePage(item)} disabled={savingId === item.id}
                              className="text-xs px-3 py-1.5 rounded-lg bg-primary text-primary-foreground font-bold inline-flex items-center gap-1.5 disabled:opacity-50">
                        {savingId === item.id
                          ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> جاري النشر…</>
                          : <><Save className="w-3.5 h-3.5" /> نشر الصفحة</>}
                      </button>
                    )}

                    {item.savedPageId && item.slug && (
                      <a href={item.slug} target="_blank" rel="noreferrer"
                         className="text-xs px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold inline-flex items-center gap-1.5">
                        <ExternalLink className="w-3.5 h-3.5" /> فتح الصفحة المنشورة
                      </a>
                    )}

                    <button onClick={() => setHistory(h => h.filter(it => it.id !== item.id))}
                            className="text-xs px-3 py-1.5 rounded-lg border hover:bg-destructive/10 hover:text-destructive inline-flex items-center gap-1.5 text-muted-foreground mr-auto">
                      <Trash2 className="w-3.5 h-3.5" /> حذف
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

function ModeTab({ active, onClick, icon, children }: {
  active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <button type="button" onClick={onClick}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold transition-colors
              ${active ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
      {icon}{children}
    </button>
  );
}

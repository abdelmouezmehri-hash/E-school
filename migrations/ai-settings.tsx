import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useGetMe } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { Save, Eye, EyeOff, Key, AlertCircle, CheckCircle2 } from "lucide-react";

interface AiToolsConfig {
  anthropicApiKey: string;
  defaultModel: string;
  maxTokens: number;
}

const DEFAULTS: AiToolsConfig = {
  anthropicApiKey: "",
  defaultModel: "claude-sonnet-4-20250514",
  maxTokens: 4000,
};

export default function AdminAiSettings() {
  const [, navigate] = useLocation();
  const { data: currentUser } = useGetMe();
  const { toast } = useToast();

  const [config, setConfig] = useState<AiToolsConfig>(DEFAULTS);
  const [original, setOriginal] = useState<AiToolsConfig>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<"ok" | "fail" | null>(null);
  const [showKey, setShowKey] = useState(false);

  const role = (currentUser as any)?.role;

  useEffect(() => {
    if (currentUser && role !== "admin") {
      navigate("/dashboard");
    }
  }, [currentUser, role, navigate]);

  useEffect(() => {
    if (role !== "admin") return;
    fetch("/api/admin/cms/settings/ai_tools_config", { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(res => {
        if (res?.data) {
          const merged = { ...DEFAULTS, ...res.data };
          setConfig(merged);
          setOriginal(merged);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [role]);

  const hasChanges = JSON.stringify(config) !== JSON.stringify(original);

  const handleSave = async () => {
    setSaving(true);
    setTestResult(null);
    try {
      const r = await fetch("/api/admin/cms/settings/ai_tools_config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(config),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setOriginal(config);
      toast({ title: "تم الحفظ ✓", description: "إعدادات الذكاء الاصطناعي محفوظة." });
    } catch (e: any) {
      toast({ title: "تعذّر الحفظ", description: e?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!config.anthropicApiKey.trim()) {
      toast({ title: "أدخل المفتاح أولاً", variant: "destructive" });
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const r = await fetch("/api/admin/ai/test-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ apiKey: config.anthropicApiKey }),
      });
      if (r.ok) {
        setTestResult("ok");
        toast({ title: "المفتاح صحيح ✓", description: "الاتصال بـ Anthropic API نجح." });
      } else {
        setTestResult("fail");
        toast({ title: "المفتاح غير صحيح", description: "تحقق من المفتاح وحاول مرة أخرى.", variant: "destructive" });
      }
    } catch {
      setTestResult("fail");
      toast({ title: "فشل الاختبار", description: "تعذّر الاتصال بالسيرفر.", variant: "destructive" });
    } finally {
      setTesting(false);
    }
  };

  const MODELS = [
    { value: "claude-sonnet-4-20250514", label: "Claude Sonnet 4 — موصى به (سريع + دقيق)" },
    { value: "claude-opus-4-6",          label: "Claude Opus 4 — أقوى (أبطأ + أغلى)" },
    { value: "claude-haiku-4-5-20251001",label: "Claude Haiku 4 — الأسرع والأرخص" },
  ];

  if (loading) return <div className="p-8 text-center text-muted-foreground">جاري التحميل…</div>;

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-8 space-y-6 pb-24">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black">إعدادات أدوات الذكاء الاصطناعي</h1>
        <p className="text-sm text-muted-foreground mt-1">
          مفاتيح الـ API وإعدادات النماذج المستخدمة في توليد الأقسام والصفحات.
        </p>
      </div>

      {/* Anthropic API Key */}
      <section className="rounded-2xl border bg-card p-4 sm:p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Key className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold">Anthropic API Key</h2>
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-bold text-muted-foreground">
            المفتاح (يبدأ بـ sk-ant-)
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type={showKey ? "text" : "password"}
                value={config.anthropicApiKey}
                onChange={e => setConfig(c => ({ ...c, anthropicApiKey: e.target.value }))}
                placeholder="sk-ant-api03-..."
                className="w-full px-3 py-2 pr-10 rounded-lg border bg-background text-sm font-mono outline-none focus:ring-2 focus:ring-primary/30"
              />
              <button type="button" onClick={() => setShowKey(v => !v)}
                      className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <button onClick={handleTest} disabled={testing}
                    className="px-4 py-2 rounded-lg border text-sm font-semibold hover:bg-muted disabled:opacity-50 inline-flex items-center gap-1.5 shrink-0">
              {testing ? "جاري الاختبار…" : "اختبار الاتصال"}
            </button>
          </div>

          {testResult === "ok" && (
            <div className="flex items-center gap-1.5 text-emerald-600 text-sm">
              <CheckCircle2 className="w-4 h-4" /> المفتاح صحيح والاتصال يعمل
            </div>
          )}
          {testResult === "fail" && (
            <div className="flex items-center gap-1.5 text-destructive text-sm">
              <AlertCircle className="w-4 h-4" /> المفتاح غير صحيح أو منتهي الصلاحية
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            احصل على مفتاحك من{" "}
            <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer"
               className="underline hover:text-primary">console.anthropic.com</a>
          </p>
        </div>
      </section>

      {/* Model Selection */}
      <section className="rounded-2xl border bg-card p-4 sm:p-6 space-y-4">
        <h2 className="text-lg font-bold">النموذج الافتراضي</h2>
        <div className="space-y-2">
          {MODELS.map(m => (
            <label key={m.value}
                   className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors
                     ${config.defaultModel === m.value
                       ? "bg-primary/5 border-primary/40"
                       : "hover:bg-muted/50"}`}>
              <input type="radio" name="model" value={m.value}
                     checked={config.defaultModel === m.value}
                     onChange={() => setConfig(c => ({ ...c, defaultModel: m.value }))}
                     className="accent-primary" />
              <span className="text-sm">{m.label}</span>
            </label>
          ))}
        </div>
      </section>

      {/* Max Tokens */}
      <section className="rounded-2xl border bg-card p-4 sm:p-6 space-y-3">
        <h2 className="text-lg font-bold">الحد الأقصى للتوليد</h2>
        <div>
          <label className="block text-xs font-bold mb-1.5 text-muted-foreground">
            Max Tokens — {config.maxTokens.toLocaleString()}
          </label>
          <input type="range" min={1000} max={8000} step={500}
                 value={config.maxTokens}
                 onChange={e => setConfig(c => ({ ...c, maxTokens: Number(e.target.value) }))}
                 className="w-full accent-primary" />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>1,000 (أقسام بسيطة)</span>
            <span>8,000 (صفحات كاملة)</span>
          </div>
        </div>
      </section>

      {/* Save bar */}
      <div className="fixed bottom-0 inset-x-0 z-30 border-t bg-background/95 backdrop-blur p-3 shadow-lg">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
          <span className="text-sm text-muted-foreground">
            {hasChanges ? <span className="text-amber-700 font-medium">● تغييرات غير محفوظة</span> : "جميع التغييرات محفوظة"}
          </span>
          <button onClick={handleSave} disabled={!hasChanges || saving}
                  className="px-5 py-2 rounded-lg bg-primary text-primary-foreground font-bold text-sm inline-flex items-center gap-2 disabled:opacity-50">
            <Save className="w-4 h-4" />
            {saving ? "جاري الحفظ…" : "حفظ"}
          </button>
        </div>
      </div>
    </div>
  );
}

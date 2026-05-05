import { Router } from "express";
import { db } from "@workspace/db";
import { cmsSettings, customPages } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth";

const router = Router();

// ── PUBLIC: read CMS settings ────────────────────────────────────────────────
router.get("/public/cms/settings/:key", async (req, res) => {
  try {
    const { key } = req.params;
    const [row] = await db.select().from(cmsSettings).where(eq(cmsSettings.key, key as string));
    if (!row) return res.json({ key, data: null });
    return res.json({ key, data: JSON.parse(row.valueJson) });
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch CMS setting" });
  }
});

// ── PUBLIC: list all CMS settings keys ───────────────────────────────────────
router.get("/public/cms/settings", async (_req, res) => {
  try {
    const rows = await db.select().from(cmsSettings);
    const result: Record<string, any> = {};
    for (const row of rows) {
      try { result[row.key] = JSON.parse(row.valueJson); } catch { result[row.key] = {}; }
    }
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch CMS settings" });
  }
});

// ── PUBLIC: list published custom pages ──────────────────────────────────────
router.get("/public/pages", async (_req, res) => {
  try {
    const pages = await db.select().from(customPages).where(eq(customPages.status, "published"));
    return res.json(pages);
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch pages" });
  }
});

// ── PUBLIC: get single published page by slug ─────────────────────────────────
router.get("/public/pages/:slug", async (req, res) => {
  try {
    const { slug } = req.params;
    const fullSlug = slug.startsWith("/") ? slug : `/${slug}`;
    const [page] = await db.select().from(customPages).where(eq(customPages.slug, fullSlug));
    if (!page) {
      // try without leading slash
      const [page2] = await db.select().from(customPages).where(eq(customPages.slug, `/${slug}`));
      if (!page2 || page2.status !== "published") return res.status(404).json({ error: "Page not found" });
      return res.json(page2);
    }
    if (page.status !== "published") return res.status(404).json({ error: "Page not found" });
    return res.json(page);
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch page" });
  }
});

// ── ADMIN: upsert a CMS setting ──────────────────────────────────────────────
router.put(
  "/admin/cms/settings/:key",
  requireAuth,
  async (req, res) => {
    try {
      const user = (req as any).user;
      const { key } = req.params;
      const isLandingKey = key === "landing_v3" || (typeof key === "string" && key.startsWith("landing_"));
      const isAiKey = key === "ai_tools_config";
      const allowedRoles = (isLandingKey || isAiKey) ? ["admin", "branch_manager"] : ["admin"];
      if (!allowedRoles.includes(user.role)) {
        return res.status(403).json({ error: "Not authorized" });
      }
      const valueJson = JSON.stringify(req.body);
      const existing = await db.select().from(cmsSettings).where(eq(cmsSettings.key, key as string));
      if (existing.length > 0) {
        await db.update(cmsSettings).set({ valueJson, updatedAt: new Date() }).where(eq(cmsSettings.key, key as string));
      } else {
        await db.insert(cmsSettings).values({ key: key as string, valueJson });
      }
      return res.json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: "Failed to save CMS setting" });
    }
  }
);

// ── ADMIN: read a CMS setting ─────────────────────────────────────────────────
router.get(
  "/admin/cms/settings/:key",
  requireAuth,
  async (req, res) => {
    try {
      const user = (req as any).user;
      const { key } = req.params;
      const isLandingKey = key === "landing_v3" || (typeof key === "string" && key.startsWith("landing_"));
      const isAiKey = key === "ai_tools_config";
      const allowedRoles = (isLandingKey || isAiKey) ? ["admin", "branch_manager"] : ["admin"];
      if (!allowedRoles.includes(user.role)) {
        return res.status(403).json({ error: "Not authorized" });
      }
      const [row] = await db.select().from(cmsSettings).where(eq(cmsSettings.key, key as string));
      if (!row) return res.json({ key, data: null });
      try {
        return res.json({ key, data: JSON.parse(row.valueJson) });
      } catch {
        return res.json({ key, data: null });
      }
    } catch (err) {
      return res.status(500).json({ error: "Failed to fetch CMS setting" });
    }
  }
);

// ── ADMIN: test Anthropic API key ─────────────────────────────────────────────
router.post("/admin/ai/test-key", requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    if (!["admin", "branch_manager"].includes(user.role)) {
      return res.status(403).json({ error: "Not authorized" });
    }
    const { apiKey } = req.body as { apiKey: string };
    if (!apiKey?.trim()) return res.status(400).json({ error: "apiKey required" });

    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey.trim(),
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 10,
        messages: [{ role: "user", content: "Hi" }],
      }),
    });
    if (r.ok) return res.json({ ok: true });
    return res.status(400).json({ ok: false, status: r.status });
  } catch (err) {
    return res.status(500).json({ error: "Test failed" });
  }
});

// ── ADMIN: generate HTML with AI ─────────────────────────────────────────────
router.post("/admin/ai/generate", requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    if (!["admin", "branch_manager"].includes(user.role)) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const { mode, prompt, pageTitle, includeForm } = req.body as {
      mode: "section" | "page";
      prompt: string;
      pageTitle?: string;
      includeForm?: boolean;
    };

    if (!prompt?.trim()) return res.status(400).json({ error: "prompt required" });

    // Get API key from DB
    const [configRow] = await db.select().from(cmsSettings).where(eq(cmsSettings.key, "ai_tools_config"));
    let apiKey = "";
    let model = "claude-sonnet-4-20250514";
    let maxTokens = 4000;
    if (configRow) {
      try {
        const cfg = JSON.parse(configRow.valueJson);
        apiKey = cfg.anthropicApiKey ?? "";
        model = cfg.defaultModel ?? model;
        maxTokens = cfg.maxTokens ?? maxTokens;
      } catch { /* use defaults */ }
    }

    if (!apiKey) {
      return res.status(400).json({
        error: "لم يتم ضبط مفتاح Anthropic API. اذهب إلى إعدادات الذكاء الاصطناعي وأضف المفتاح.",
      });
    }

    const BRAND = `
اسم الأكاديمية: كيدسبيك (KidSpeak)
الألوان الأساسية: أبيض #FFFFFF، أزرق داكن #0A1628، ذهبي/أصفر #F5A623
الشعار: kidSpeak (kid بالأزرق، Speak بالذهبي)
المنهج: Speaking First — نتعلم بالكلام أولاً لا بالحروف والقواعد
الجمهور: أولياء أمور أطفال 7-13 سنة في الجزائر
اللغة: عربية فصيحة مع مصطلحات تعليمية مفهومة
    `.trim();

    const FORM_FIELDS = includeForm ? `
نموذج التسجيل يجب أن يحتوي على الحقول التالية بالضبط (أسماء الـ name attribute مهمة):
- name="parentName"    → اسم الولي (مطلوب)
- name="parentPhone"   → رقم الهاتف (مطلوب)  
- name="parentEmail"   → البريد الإلكتروني (اختياري)
- name="childName"     → اسم الطفل (مطلوب)
- name="childAge"      → عمر الطفل (اختياري)
- name="notes"         → ملاحظات (اختياري)
زر الإرسال: type="submit"
لا تضع action أو method على الـ form — سيتم التعامل معه بـ JavaScript.
    `.trim() : "";

    const systemPrompt = mode === "section"
      ? `أنت مصمم ويب محترف متخصص في صفحات الهبوط العربية RTL.
مهمتك: بناء قسم HTML واحد (section) كامل جاهز للنشر المباشر.

هوية العلامة التجارية:
${BRAND}

قواعد صارمة:
- اكتب HTML نظيف مع Tailwind CSS classes فقط (لا CSS خارجي)
- الاتجاه RTL دائماً (dir="rtl")
- تصميم متجاوب (mobile-first)
- لا تكتب DOCTYPE أو html أو head أو body — فقط محتوى الـ section
- استخدم ألوان العلامة التجارية
- تصميم احترافي وجذاب يناسب أكاديمية لغات للأطفال
${FORM_FIELDS ? `\n${FORM_FIELDS}` : ""}
- أرجع HTML فقط بدون أي شرح أو markdown`
      : `أنت مصمم ويب محترف متخصص في صفحات الهبوط العربية RTL عالية التحويل.
مهمتك: بناء صفحة هبوط HTML كاملة جاهزة للنشر المباشر.

هوية العلامة التجارية:
${BRAND}

عنوان الصفحة: ${pageTitle ?? "صفحة هبوط"}

بنية الصفحة المطلوبة:
1. Header بسيط مع الشعار
2. Hero section مع عنوان قوي وزر CTA
3. قسم المزايا (3-4 نقاط)
4. قسم الإحصائيات أو الدليل الاجتماعي
${includeForm ? "5. نموذج التسجيل\n6. Footer" : "5. Footer"}

قواعد صارمة:
- اكتب HTML كامل من body فقط (لا DOCTYPE أو html أو head)
- Tailwind CSS classes فقط
- الاتجاه RTL (dir="rtl" على body)
- تصميم متجاوب mobile-first عالي الجودة
- استخدم ألوان العلامة التجارية
- تصميم يحفّز الزائر على التسجيل
${FORM_FIELDS ? `\n${FORM_FIELDS}` : ""}
- أرجع HTML فقط بدون أي شرح أو markdown`;

    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: [{ role: "user", content: prompt.trim() }],
      }),
    });

    if (!r.ok) {
      const errBody = await r.json().catch(() => ({}));
      return res.status(r.status).json({
        error: (errBody as any)?.error?.message ?? `Anthropic API error: ${r.status}`,
      });
    }

    const data = await r.json() as any;
    const html: string = data.content?.[0]?.text ?? "";

    if (!html) return res.status(500).json({ error: "لم يرجع الـ AI أي محتوى." });

    return res.json({ html });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message ?? "Generation failed" });
  }
});

// ── ADMIN: list all custom pages ─────────────────────────────────────────────
router.get("/admin/cms/pages", requireAuth, await requireRole(["admin"]), async (_req, res) => {
  try {
    const pages = await db.select().from(customPages).orderBy(customPages.createdAt);
    return res.json(pages);
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch pages" });
  }
});

// ── ADMIN: create a custom page ──────────────────────────────────────────────
router.post("/admin/cms/pages", requireAuth, await requireRole(["admin"]), async (req, res) => {
  try {
    const { titleEn, titleAr, slug, contentEn, contentAr, status, showInNavbar, showInFooter } = req.body;
    if (!titleEn || !slug) return res.status(400).json({ error: "Title and slug are required" });
    const existing = await db.select().from(customPages).where(eq(customPages.slug, slug));
    if (existing.length > 0) return res.status(409).json({ error: "A page with this slug already exists" });
    const cleanSlug = slug.startsWith("/") ? slug : `/${slug}`;
    const [page] = await db.insert(customPages).values({
      titleEn, titleAr: titleAr ?? "", slug: cleanSlug,
      contentEn: contentEn ?? "", contentAr: contentAr ?? "",
      status: status ?? "draft", showInNavbar: showInNavbar ?? false, showInFooter: showInFooter ?? false,
    }).returning();
    return res.status(201).json(page);
  } catch (err) {
    return res.status(500).json({ error: "Failed to create page" });
  }
});

// ── ADMIN: update a custom page ──────────────────────────────────────────────
router.put("/admin/cms/pages/:id", requireAuth, await requireRole(["admin"]), async (req, res) => {
  try {
    const id = parseInt((req.params.id as string));
    const { titleEn, titleAr, slug, contentEn, contentAr, status, showInNavbar, showInFooter } = req.body;
    if (!titleEn || !slug) return res.status(400).json({ error: "Title and slug are required" });
    const existing = await db.select().from(customPages).where(eq(customPages.slug, slug));
    if (existing.length > 0 && existing[0].id !== id) return res.status(409).json({ error: "Slug already exists" });
    const cleanSlug = slug.startsWith("/") ? slug : `/${slug}`;
    await db.update(customPages).set({
      titleEn, titleAr: titleAr ?? "", slug: cleanSlug,
      contentEn: contentEn ?? "", contentAr: contentAr ?? "",
      status: status ?? "draft", showInNavbar: showInNavbar ?? false, showInFooter: showInFooter ?? false,
      updatedAt: new Date(),
    }).where(eq(customPages.id, id));
    const [updated] = await db.select().from(customPages).where(eq(customPages.id, id));
    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ error: "Failed to update page" });
  }
});

// ── ADMIN: delete a custom page ──────────────────────────────────────────────
router.delete("/admin/cms/pages/:id", requireAuth, await requireRole(["admin"]), async (req, res) => {
  try {
    const id = parseInt((req.params.id as string));
    await db.delete(customPages).where(eq(customPages.id, id));
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: "Failed to delete page" });
  }
});

// ── ADMIN: /admin/pages aliases ───────────────────────────────────────────────
router.get("/admin/pages", requireAuth, await requireRole(["admin"]), async (_req, res) => {
  try {
    const pages = await db.select().from(customPages).orderBy(customPages.createdAt);
    return res.json(pages);
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch pages" });
  }
});

router.post("/admin/pages", requireAuth, await requireRole(["admin"]), async (req, res) => {
  try {
    const { titleEn, titleAr, slug, contentEn, contentAr, status, showInNavbar, showInFooter } = req.body;
    if (!titleEn || !slug) return res.status(400).json({ error: "titleEn and slug required" });
    const existing = await db.select().from(customPages).where(eq(customPages.slug, slug));
    if (existing.length > 0) return res.status(409).json({ error: "Slug already exists" });
    const cleanSlug = slug.startsWith("/") ? slug : `/${slug}`;
    const [page] = await db.insert(customPages).values({
      titleEn, titleAr: titleAr ?? titleEn, slug: cleanSlug,
      contentEn: contentEn ?? "", contentAr: contentAr ?? "",
      status: status ?? "draft", showInNavbar: showInNavbar ?? false, showInFooter: showInFooter ?? false,
    }).returning();
    return res.json(page);
  } catch (err) {
    return res.status(500).json({ error: "Failed to create page" });
  }
});

router.put("/admin/pages/:id", requireAuth, await requireRole(["admin"]), async (req, res) => {
  try {
    const id = parseInt((req.params.id as string));
    const updates: Record<string, any> = { updatedAt: new Date() };
    const { titleEn, titleAr, contentEn, contentAr, status, showInNavbar, showInFooter } = req.body;
    if (titleEn !== undefined) updates.titleEn = titleEn;
    if (titleAr !== undefined) updates.titleAr = titleAr;
    if (contentEn !== undefined) updates.contentEn = contentEn;
    if (contentAr !== undefined) updates.contentAr = contentAr;
    if (status !== undefined) updates.status = status;
    if (showInNavbar !== undefined) updates.showInNavbar = showInNavbar;
    if (showInFooter !== undefined) updates.showInFooter = showInFooter;
    const [updated] = await db.update(customPages).set(updates).where(eq(customPages.id, id)).returning();
    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ error: "Failed to update page" });
  }
});

router.delete("/admin/pages/:id", requireAuth, await requireRole(["admin"]), async (req, res) => {
  try {
    await db.delete(customPages).where(eq(customPages.id, parseInt((req.params.id as string))));
    return res.json({ message: "Deleted" });
  } catch (err) {
    return res.status(500).json({ error: "Failed to delete page" });
  }
});

export default router;

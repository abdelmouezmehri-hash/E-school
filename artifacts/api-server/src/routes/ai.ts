import { Router, type Request, type Response } from "express";
import OpenAI from "openai";
import { requireAuth } from "../middlewares/auth";

const router = Router();

function getOpenAIClient() {
  const baseURL = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
  const apiKey  = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
  if (!baseURL || !apiKey) return null;
  return new OpenAI({ baseURL, apiKey });
}

// ── POST /api/admin/ai/generate-page ─────────────────────────────────────────
// Generates HTML page content from a description prompt
router.post("/admin/ai/generate-page", requireAuth, async (req: Request, res: Response) => {
  const user = (req as any).user;
  if (!["admin"].includes(user.role)) return void res.status(403).json({ error: "Admin only" });

  const { prompt, language = "en" } = req.body;
  if (!prompt) return void res.status(400).json({ error: "prompt is required" });

  const openai = getOpenAIClient();
  if (!openai) {
    return void res.status(503).json({ error: "AI integration not configured" });
  }

  const isAr = language === "ar";
  const systemPrompt = isAr
    ? `أنت كاتب محتوى لموقع مدرسة لغات تعليمية في الجزائر اسمها Kidspeak. 
المدرسة تُعلّم الأطفال اللغة الإنجليزية بأسلوب التحدث أولاً.
اكتب محتوى HTML جميلاً وجذاباً للصفحة المطلوبة باللغة العربية.
استخدم وسوم HTML فقط: <h2>, <h3>, <p>, <ul>, <li>, <strong>, <em>.
لا تضع وسوم <html>, <head>, <body>, <style>.
اجعل المحتوى متدفقاً وطبيعياً وباللغة العربية الفصيحة البسيطة.`
    : `You are a content writer for Kidspeak Academy, a children's language school in Algeria.
The school teaches children English through a speaking-first methodology.
Write beautiful, engaging HTML content for the requested page in English.
Use only: <h2>, <h3>, <p>, <ul>, <li>, <strong>, <em>.
No <html>, <head>, <body>, or <style> tags.
Keep the tone warm, professional, and parent-friendly.`;

  const userMessage = isAr
    ? `اكتب محتوى HTML للصفحة التالية: ${prompt}`
    : `Write HTML content for the following page: ${prompt}`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-5-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user",   content: userMessage },
      ],
      max_tokens: 1200,
      temperature: 0.7,
    });

    const content = completion.choices[0]?.message?.content ?? "";
    res.json({ content });
  } catch (err: any) {
    console.error("AI generate-page error:", err);
    res.status(500).json({ error: "AI generation failed. Please try again." });
  }
});

export default router;

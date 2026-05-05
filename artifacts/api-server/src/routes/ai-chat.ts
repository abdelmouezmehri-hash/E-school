import { Router, type Request, type Response } from "express";
import { requireAuth } from "../middlewares/auth";
import { anthropic } from "@workspace/integrations-anthropic-ai";

const router = Router();

const SYSTEM_PROMPT = `أنت مساعد ذكي لإدارة مدرسة KidSpeak لتعليم اللغة الإنجليزية في الجزائر. تساعد الإداريين والأساتذة والموظفين في إدارة التلاميذ والمدفوعات والجداول والتقارير. تجيب دائماً بالعربية بشكل موجز ومفيد. إذا سُئلت عن بيانات حقيقية لا تعرفها، اقترح أين يمكن إيجادها في المنصة. لا تستخدم تنسيق markdown في إجاباتك.`;

// POST /ai/chat — stateless chat (history sent by client)
router.post("/ai/chat", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user as { role: string };
  const allowed = ["admin", "teacher", "psychologist", "accountant", "branch_manager"];
  if (!allowed.includes(user.role)) {
    res.status(403).json({ error: "غير مصرح لك بالوصول إلى المساعد الذكي" });
    return;
  }

  const { messages } = req.body as { messages: Array<{ role: "user" | "assistant"; content: string }> };
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: "messages array is required" });
    return;
  }

  const last10 = messages.slice(-10);

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 8192,
    system: SYSTEM_PROMPT,
    messages: last10,
  });

  const content = response.content[0];
  const text = content.type === "text" ? content.text : "";
  res.json({ reply: text });
});

export default router;

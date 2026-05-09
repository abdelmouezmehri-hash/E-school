import { useEffect, useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLogin, useGetMe } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/language-context";

const loginSchema = z.object({
  email: z.string().min(3),
  password: z.string().min(1),
});
type LoginFormValues = z.infer<typeof loginSchema>;

type Mode = "parent" | "staff";

function getRoleRedirect(role: string) {
  if (role === "admin") return "/dashboard";
  if (role === "teacher") return "/evaluations";
  if (role === "psychologist") return "/behavioral";
  if (role === "accountant") return "/payments";
  if (role === "receptionist") return "/admin/registration-requests";
  if (["designer", "photographer", "marketer"].includes(role)) return "/studio";
  return "/students";
}

const FEATURES = [
  { labelAr: "جدول حصص طفلك", labelEn: "Child's schedule", subAr: "مواعيد الجلسات والتذكيرات", subEn: "Session times and reminders", color: "#1D9E75", bg: "rgba(29,158,117,0.18)" },
  { labelAr: "تقييمات الأداء", labelEn: "Performance reports", subAr: "متابعة النمو والتطور", subEn: "Growth tracking", color: "#378ADD", bg: "rgba(55,138,221,0.18)" },
  { labelAr: "حالة المدفوعات", labelEn: "Payment status", subAr: "الفواتير والإيصالات", subEn: "Invoices and receipts", color: "#F5A800", bg: "rgba(245,168,0,0.15)" },
];

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { language, setLanguage, isRTL } = useLanguage();
  const [mode, setMode] = useState<Mode>("parent");

  const { data: user, isLoading: isCheckingAuth } = useGetMe();
  const { mutate: login, isPending } = useLogin();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema as any) as Resolver<LoginFormValues>,
    defaultValues: { email: "", password: "" },
  });

  useEffect(() => {
    if (user && !isCheckingAuth) {
      setLocation(getRoleRedirect(user.role));
    }
  }, [user, isCheckingAuth]);

  function onSubmit(data: LoginFormValues) {
    login({ data }, {
      onSuccess: (res) => {
        toast({ title: isRTL ? "مرحباً بك!" : "Welcome back!", description: isRTL ? "تم تسجيل الدخول بنجاح." : "Successfully logged in." });
        setLocation(getRoleRedirect(res.user.role));
      },
      onError: () => {
        toast({
          title: isRTL ? "فشل تسجيل الدخول" : "Login failed",
          description: isRTL ? "تحقق من بياناتك وحاول مرة أخرى." : "Please check your credentials and try again.",
          variant: "destructive",
        });
      },
    });
  }

  if (isCheckingAuth || user) return null;

  const ar = language === "ar";

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div
        className="w-full rounded-2xl overflow-hidden"
        style={{
          maxWidth: 780,
          minHeight: 540,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          border: "0.5px solid hsl(var(--border))",
          direction: ar ? "rtl" : "ltr",
        }}
      >
        {/* ── RIGHT (RTL) / LEFT (LTR): Brand panel (dark) ── */}
        <div
          className="flex flex-col justify-between"
          style={{ background: "#0d1520", padding: "2.5rem 2rem" }}
        >
          <div>
            <div
              style={{
                display: "inline-block",
                fontSize: 11, color: "#F5A800",
                background: "rgba(245,168,0,0.12)",
                padding: "3px 12px", borderRadius: 20,
                marginBottom: "1.2rem",
              }}
            >
              {ar ? "أكاديمية اللغة" : "Language Academy"}
            </div>

            <h2 style={{ fontSize: 22, fontWeight: 500, color: "#fff", lineHeight: 1.4, marginBottom: 6 }}>
              {ar
                ? <>{" تابع تقدم طفلك"}<br /><span style={{ color: "#F5A800" }}>بكل سهولة</span></>
                : <>{"Track your child's"}<br /><span style={{ color: "#F5A800" }}>progress easily</span></>}
            </h2>

            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", marginBottom: "2rem" }}>
              {ar ? "راقب الحصص، التقييمات، والمدفوعات من مكان واحد" : "Monitor sessions, evaluations, and payments in one place"}
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
              {FEATURES.map((f) => (
                <div key={f.labelAr} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 10, background: f.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: f.color }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "#fff", marginBottom: 2 }}>{ar ? f.labelAr : f.labelEn}</div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>{ar ? f.subAr : f.subEn}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", textAlign: "center" }}>
            kidspeakdz.com · © 2026 KidSpeak
          </div>
        </div>

        {/* ── Form panel ── */}
        <div
          className="bg-background flex flex-col items-center justify-center"
          style={{ padding: "2.5rem 2rem", position: "relative" }}
        >
          {/* Language toggle — top corner */}
          <button
            type="button"
            onClick={() => setLanguage(ar ? "en" : "ar")}
            style={{
              position: "absolute",
              top: 16,
              [ar ? "left" : "right"]: 16,
              fontSize: 11, fontWeight: 600,
              color: "hsl(var(--muted-foreground))",
              background: "transparent",
              border: "0.5px solid hsl(var(--border))",
              borderRadius: 6, padding: "3px 10px",
              cursor: "pointer",
            }}
          >
            {ar ? "EN" : "AR"}
          </button>

          {/* Logo */}
          <div style={{ marginBottom: "2rem" }}>
            <img
              src="/logo-color.svg"
              alt="kidSpeak"
              style={{ height: 110, width: "auto", objectFit: "contain" }}
            />
          </div>

          {/* Greeting */}
          <div style={{ fontSize: 20, fontWeight: 500, color: "hsl(var(--foreground))", marginBottom: 4, textAlign: "center" }}>
            {ar ? "مرحباً بك" : "Welcome back"}
          </div>
          <div style={{ fontSize: 13, color: "hsl(var(--muted-foreground))", marginBottom: "1.5rem", textAlign: "center" }}>
            {mode === "parent"
              ? (ar ? "سجّل دخولك لمتابعة تقدم طفلك" : "Sign in to track your child's progress")
              : (ar ? "ادخل ببريدك المهني" : "Sign in with your work email")}
          </div>

          {/* Mode tabs */}
          <div style={{
            display: "flex", gap: 6, width: "100%",
            background: "hsl(var(--muted))", borderRadius: 10, padding: 4,
            marginBottom: "1.5rem",
          }}>
            {(["parent", "staff"] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                style={{
                  flex: 1, textAlign: "center", fontSize: 13,
                  padding: "7px", borderRadius: 8, cursor: "pointer",
                  color: mode === m ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))",
                  background: mode === m ? "hsl(var(--background))" : "transparent",
                  fontWeight: mode === m ? 500 : 400,
                  border: mode === m ? "0.5px solid hsl(var(--border))" : "0.5px solid transparent",
                  transition: "all 0.15s",
                }}
              >
                {m === "parent" ? (ar ? "ولي الأمر" : "Parent") : (ar ? "الفريق" : "Staff")}
              </button>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={form.handleSubmit(onSubmit)} style={{ width: "100%" }}>
            {/* Email/Phone */}
            <div style={{ width: "100%", marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: "hsl(var(--muted-foreground))", marginBottom: 5, textAlign: ar ? "right" : "left" }}>
                {ar ? "رقم الهاتف أو البريد الإلكتروني" : "Phone or Email"}
              </div>
              <input
                {...form.register("email")}
                type="text"
                placeholder={mode === "parent" ? (ar ? "0551234567" : "name@example.com") : "name@kidspeak.com"}
                autoComplete="username"
                style={{
                  width: "100%", padding: "10px 14px",
                  border: "0.5px solid hsl(var(--border))",
                  borderRadius: 10, fontSize: 14,
                  color: "hsl(var(--foreground))",
                  background: "hsl(var(--muted) / 0.5)",
                  textAlign: ar ? "right" : "left",
                  outline: "none", fontFamily: "inherit",
                  direction: ar ? "rtl" : "ltr",
                }}
              />
              {form.formState.errors.email && (
                <p style={{ color: "hsl(var(--destructive))", fontSize: 11, marginTop: 4, textAlign: ar ? "right" : "left" }}>
                  {ar ? "يرجى إدخال البريد أو رقم الهاتف" : "Please enter your email or phone"}
                </p>
              )}
            </div>

            {/* Password */}
            <div style={{ width: "100%", marginBottom: 8 }}>
              <div style={{ fontSize: 12, color: "hsl(var(--muted-foreground))", marginBottom: 5, textAlign: ar ? "right" : "left" }}>
                {ar ? "كلمة المرور" : "Password"}
              </div>
              <input
                {...form.register("password")}
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                style={{
                  width: "100%", padding: "10px 14px",
                  border: "0.5px solid hsl(var(--border))",
                  borderRadius: 10, fontSize: 14,
                  color: "hsl(var(--foreground))",
                  background: "hsl(var(--muted) / 0.5)",
                  outline: "none", fontFamily: "inherit",
                }}
              />
              {form.formState.errors.password && (
                <p style={{ color: "hsl(var(--destructive))", fontSize: 11, marginTop: 4, textAlign: ar ? "right" : "left" }}>
                  {ar ? "كلمة المرور مطلوبة" : "Password is required"}
                </p>
              )}
            </div>

            {/* Forgot */}
            <div style={{ fontSize: 12, color: "#F5A800", textAlign: ar ? "right" : "left", marginBottom: "1rem", cursor: "pointer" }}>
              {ar ? "نسيت كلمة المرور؟" : "Forgot password?"}
            </div>

            {/* Login button */}
            <button
              type="submit"
              disabled={isPending}
              style={{
                width: "100%", padding: 11,
                background: "#F5A800", border: "none",
                borderRadius: 10, fontSize: 15,
                fontWeight: 500, color: "#fff",
                cursor: isPending ? "not-allowed" : "pointer",
                marginBottom: "1rem",
                opacity: isPending ? 0.7 : 1,
                fontFamily: "inherit",
                transition: "opacity 0.15s",
              }}
            >
              {isPending ? (ar ? "جارٍ الدخول..." : "Signing in...") : (ar ? "تسجيل الدخول" : "Sign In")}
            </button>

            {/* Divider */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "1rem", width: "100%" }}>
              <div style={{ flex: 1, height: "0.5px", background: "hsl(var(--border))" }} />
              <span style={{ fontSize: 12, color: "hsl(var(--muted-foreground))" }}>{ar ? "أو" : "or"}</span>
              <div style={{ flex: 1, height: "0.5px", background: "hsl(var(--border))" }} />
            </div>

            {/* Staff/Parent toggle button */}
            <button
              type="button"
              onClick={() => setMode(mode === "parent" ? "staff" : "parent")}
              style={{
                width: "100%", padding: 9,
                border: "0.5px solid hsl(var(--border))",
                borderRadius: 10, fontSize: 13,
                color: "hsl(var(--muted-foreground))",
                background: "transparent", cursor: "pointer",
                textAlign: "center", fontFamily: "inherit",
              }}
            >
              {mode === "parent"
                ? (ar ? "أنت موظف؟ — دخول الفريق" : "Are you staff? — Staff login")
                : (ar ? "أنت ولي أمر؟ — بوابة الأولياء" : "Are you a parent? — Parent portal")}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

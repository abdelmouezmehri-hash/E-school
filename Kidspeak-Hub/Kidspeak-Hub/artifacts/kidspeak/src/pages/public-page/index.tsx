import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useLanguage } from "@/contexts/language-context";
import { Link } from "wouter";
import { ArrowLeft, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";

function getLang(en: string, ar: string, lang: string) {
  return lang === "ar" ? (ar || en) : (en || ar);
}

export default function PublicPageRenderer() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const { language, setLanguage, isRTL } = useLanguage();
  const isAr = language === "ar";
  const [page, setPage] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/public/pages/${slug}`)
      .then(r => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then(data => { setPage(data); setNotFound(false); })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground text-sm">{isAr ? "جاري التحميل..." : "Loading..."}</div>
      </div>
    );
  }

  if (notFound || !page) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-center p-6">
        <div className="text-6xl">🔍</div>
        <h1 className="text-2xl font-black" style={{ color: "#1B2E8F" }}>{isAr ? "الصفحة غير موجودة" : "Page Not Found"}</h1>
        <p className="text-muted-foreground">{isAr ? "هذه الصفحة غير موجودة أو غير منشورة" : "This page doesn't exist or hasn't been published yet."}</p>
        <Link href="/">
          <Button style={{ backgroundColor: "#1B2E8F", color: "white" }}>
            <ArrowLeft className="w-4 h-4 me-2" />
            {isAr ? "العودة للرئيسية" : "Back to Home"}
          </Button>
        </Link>
      </div>
    );
  }

  const content = getLang(page.contentEn, page.contentAr, language);
  const title = getLang(page.titleEn, page.titleAr, language);
  const contentDir = language === "ar" && page.contentAr ? "rtl" : "ltr";

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="min-h-screen bg-white">
      {/* Top nav bar */}
      <nav className="border-b px-4 py-3 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur z-10" style={{ borderColor: "#1B2E8F15" }}>
        <Link href="/">
          <a className="flex items-center gap-2">
            <img src="/logo-dark.png" alt="Kidspeak" className="h-7" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
            <span className="font-black text-sm" style={{ color: "#1B2E8F" }}>kidspeak</span>
          </a>
        </Link>
        <button
          onClick={() => setLanguage(isAr ? "en" : "ar")}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-[#1B2E8F] transition-colors"
        >
          <Globe className="w-3.5 h-3.5" />
          {isAr ? "English" : "عربي"}
        </button>
      </nav>

      {/* Hero banner */}
      <div
        className="px-6 py-12 md:py-16 text-white text-center"
        style={{ background: "linear-gradient(135deg, #1B2E8F, #7c3aed)" }}
      >
        <h1 className="text-3xl md:text-4xl font-black mb-2">{title}</h1>
        <div className="flex items-center justify-center gap-2 text-white/60 text-sm">
          <Link href="/"><a className="hover:text-white transition-colors">{isAr ? "الرئيسية" : "Home"}</a></Link>
          <span>/</span>
          <span>{title}</span>
        </div>
      </div>

      {/* Page content */}
      <main className="max-w-3xl mx-auto px-4 py-10">
        <div
          className="prose prose-lg max-w-none"
          dir={contentDir}
          dangerouslySetInnerHTML={{ __html: content || `<p class="text-muted-foreground">${isAr ? "لا يوجد محتوى بعد." : "No content yet."}</p>` }}
          style={{ fontFamily: "inherit" }}
        />
      </main>

      {/* Footer */}
      <footer className="border-t py-6 text-center text-sm text-muted-foreground" style={{ borderColor: "#1B2E8F15" }}>
        © {new Date().getFullYear()} Kidspeak Academy · {isAr ? "جميع الحقوق محفوظة" : "All rights reserved"}
      </footer>
    </div>
  );
}

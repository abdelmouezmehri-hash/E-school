// @refresh reset
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Language, translations, Translations } from "@/lib/translations";

interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
  isRTL: boolean;
  pupilLabel: string;
  setPupilLabel: (en: string, ar: string) => void;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    return (localStorage.getItem("ks-language") as Language) || "en";
  });
  const [pupilLabelEn, setPupilLabelEn] = useState("Pupils");
  const [pupilLabelAr, setPupilLabelArState] = useState("التلاميذ");

  const isRTL = language === "ar";
  const t = translations[language] as Translations;

  const pupilLabel = language === "ar" ? pupilLabelAr : pupilLabelEn;

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("ks-language", lang);
  };

  const setPupilLabel = (en: string, ar: string) => {
    setPupilLabelEn(en || "Pupils");
    setPupilLabelArState(ar || "التلاميذ");
  };

  useEffect(() => {
    document.documentElement.dir = isRTL ? "rtl" : "ltr";
    document.documentElement.lang = language;
  }, [language, isRTL]);

  // Load school settings to get custom pupil label
  useEffect(() => {
    fetch("/api/settings", { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return;
        if (data.pupilLabel) setPupilLabelEn(data.pupilLabel);
        if (data.pupilLabelAr) setPupilLabelArState(data.pupilLabelAr);
      })
      .catch(() => {});
  }, []);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isRTL, pupilLabel, setPupilLabel }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}

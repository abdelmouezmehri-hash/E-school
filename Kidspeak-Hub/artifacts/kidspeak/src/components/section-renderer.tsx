export function SectionRenderer({ section, language }: { section: any; language: string }) {
  const isAr = language === "ar";
  const d = section.data;

  const t = (en: string | undefined, ar: string | undefined) => isAr ? (ar || en || "") : (en || ar || "");

  if (section.type === "hero") {
    return (
      <div className="px-4 py-14 text-center text-white" style={{ background: `linear-gradient(135deg, ${d.bgColor ?? "#1B2E8F"}, ${d.bgColor ?? "#1B2E8F"}cc)` }}>
        <h1 className="text-3xl md:text-4xl font-black mb-3">{t(d.titleEn, d.titleAr)}</h1>
        {(d.subtitleEn || d.subtitleAr) && <p className="text-white/75 text-lg max-w-xl mx-auto mb-6">{t(d.subtitleEn, d.subtitleAr)}</p>}
        {(d.ctaTextEn || d.ctaTextAr) && (
          <a href={d.ctaLink ?? "/"}>
            <button className="px-6 py-3 rounded-2xl font-bold text-sm" style={{ backgroundColor: "#F5A600", color: "#1B2E8F" }}>
              {t(d.ctaTextEn, d.ctaTextAr)}
            </button>
          </a>
        )}
      </div>
    );
  }

  if (section.type === "features") {
    return (
      <div className="py-12 px-4 max-w-4xl mx-auto">
        {(d.titleEn || d.titleAr) && <h2 className="text-2xl font-black text-center mb-8" style={{ color: "#1B2E8F" }}>{t(d.titleEn, d.titleAr)}</h2>}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {(d.items ?? []).map((item: any, i: number) => (
            <div key={i} className="text-center p-6 rounded-2xl border bg-white shadow-sm">
              <div className="text-3xl mb-3">{item.icon}</div>
              <h3 className="font-bold mb-2" style={{ color: "#1B2E8F" }}>{t(item.titleEn, item.titleAr)}</h3>
              <p className="text-sm text-slate-500">{t(item.descEn, item.descAr)}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (section.type === "steps") {
    return (
      <div className="py-12 px-4 max-w-4xl mx-auto">
        {(d.titleEn || d.titleAr) && <h2 className="text-2xl font-black text-center mb-8" style={{ color: "#1B2E8F" }}>{t(d.titleEn, d.titleAr)}</h2>}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {(d.items ?? []).map((item: any, i: number) => (
            <div key={i} className="flex gap-4 p-5 rounded-2xl border bg-white">
              <div className="text-2xl">{item.icon}</div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-black" style={{ color: "#F5A600" }}>{item.num}</span>
                  <h3 className="font-bold" style={{ color: "#1B2E8F" }}>{t(item.labelEn, item.labelAr)}</h3>
                </div>
                <p className="text-sm text-slate-500">{t(item.descEn, item.descAr)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (section.type === "text") {
    return (
      <div className="py-8 px-4 max-w-3xl mx-auto">
        <div className="prose prose-lg max-w-none" dir={isAr && d.contentAr ? "rtl" : "ltr"} dangerouslySetInnerHTML={{ __html: t(d.contentEn, d.contentAr) }} />
      </div>
    );
  }

  if (section.type === "cta") {
    return (
      <div className="py-12 px-4 text-center text-white" style={{ background: `linear-gradient(135deg, ${d.bgColor ?? "#1B2E8F"}, ${d.bgColor ?? "#1B2E8F"}cc)` }}>
        <h2 className="text-2xl font-black mb-2">{t(d.titleEn, d.titleAr)}</h2>
        {(d.subtitleEn || d.subtitleAr) && <p className="text-white/70 mb-6">{t(d.subtitleEn, d.subtitleAr)}</p>}
        {(d.buttonTextEn || d.buttonTextAr) && (
          <a href={d.buttonLink ?? "/"}>
            <button className="px-8 py-3 rounded-2xl font-bold" style={{ backgroundColor: "#F5A600", color: "#1B2E8F" }}>
              {t(d.buttonTextEn, d.buttonTextAr)}
            </button>
          </a>
        )}
      </div>
    );
  }

  if (section.type === "stats") {
    return (
      <div className="py-10 px-4 bg-slate-50">
        <div className="max-w-3xl mx-auto grid grid-cols-3 gap-6 text-center">
          {(d.items ?? []).map((item: any, i: number) => (
            <div key={i}>
              <p className="text-3xl font-black" style={{ color: "#1B2E8F" }}>{item.value}</p>
              <p className="text-sm text-slate-500 mt-1">{t(item.labelEn, item.labelAr)}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return null;
}

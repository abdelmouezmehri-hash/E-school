
      {/* ══════ NAV ══════════════════════════════════════════════════════════════ */}
      <nav
        className="fixed top-0 inset-x-0 z-50"
        style={{ background: "rgba(13,26,92,0.97)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(245,166,0,0.12)" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <a href="/" className="flex items-center gap-2.5 shrink-0">
            {settings?.logoWhiteUrl ? (
              <img src={`/api/storage/public-objects/${settings.logoWhiteUrl}`} alt="Kidspeak" className="h-9 object-contain" />
            ) : (
              <span className="font-black text-xl text-white tracking-tight" style={{ fontFamily: hf }}>
                kid<span style={{ color: "#F5A600" }}>speak</span>
              </span>
            )}
          </a>

          <div className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => setLanguage(isAr ? "en" : "ar")}
              className="flex items-center gap-1.5 text-white/60 hover:text-white text-xs px-2.5 py-1.5 rounded-lg hover:bg-white/8 transition-colors"
            >
              <Globe className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{txt.nav.lang}</span>
            </button>
            <button
              onClick={() => setLocation("/login")}
              className="text-white/70 hover:text-white text-sm px-3 py-1.5 rounded-lg hover:bg-white/8 transition-colors"
            >
              {txt.nav.login}
            </button>
            <button
              onClick={() => { setRegSource(null); setShowRegModal(true); setRegSubmitted(false); setRegForm({ fullName: "", email: "", phone: "", whatsappPhone: "", address: "" }); }}
              className="font-bold text-sm px-5 py-2 rounded-full transition-all hover:scale-105 active:scale-95"
              style={{ backgroundColor: "#F5A600", color: "#1B2E8F" }}
            >
              {txt.nav.register}
            </button>
          </div>
        </div>
      </nav>

      {/* ══════ OPEN DAY BANNER (conditional) ════════════════════════════════════ */}
      {cmsOpenDay?.enabled && (
        <section id="open-day" className="relative overflow-hidden pt-16" style={{ background: "linear-gradient(135deg, #080F3C 0%, #0D1A5C 60%, #080F3C 100%)" }}>
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute top-0 end-0 w-[500px] h-[500px] rounded-full opacity-8" style={{ background: "radial-gradient(circle, #F5A600, transparent)", transform: "translate(30%, -30%)" }} />
            {[
              { top: "15%", left: "8%",  bg: "#F5A600", size: 8 },
              { top: "25%", left: "90%", bg: "#F5A600", size: 6 },
              { top: "60%", left: "5%",  bg: "#1B2E8F", size: 10 },
              { top: "70%", left: "85%", bg: "#ffffff", size: 5 },
            ].map((dot, i) => (
              <div key={i} className="absolute rounded-full opacity-50" style={{ top: dot.top, left: dot.left, width: dot.size, height: dot.size, backgroundColor: dot.bg }} />
            ))}
          </div>

          <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-black mb-6 animate-pulse" style={{ backgroundColor: "#F5A600", color: "#1B2E8F" }}>
                <span className="w-2 h-2 rounded-full bg-[#1B2E8F] inline-block" />
                {isAr ? "🎉 اليوم المفتوح — الآن!" : "🎉 OPEN DAY — TODAY!"}
              </div>
              <h1 className="text-3xl sm:text-5xl font-black text-white mb-4 leading-tight" style={{ fontFamily: hf }}>
                {isAr ? (cmsOpenDay.greetingAr || "مرحباً بكم في اليوم المفتوح لكيدسبيك!") : (cmsOpenDay.greetingEn || "Welcome to Kidspeak Open Day!")}
              </h1>
              <p className="text-lg sm:text-xl text-white/75 max-w-2xl mx-auto leading-relaxed">
                {isAr ? "نحن اليوم لا نريك مدرسة، بل نريك مستقبل طفلك الواثق." : "Today, we don't just show you a school; we show you your child's future confidence."}
              </p>
            </div>

            <div className="flex flex-col lg:flex-row gap-6 items-stretch">
              <div className="flex-1 rounded-3xl p-8 text-center" style={{ background: "linear-gradient(135deg, #F5A600 0%, #e09300 100%)", boxShadow: "0 20px 60px rgba(245,166,0,0.4)" }}>
                <p className="text-[#1B2E8F] text-xs font-black uppercase tracking-widest mb-3">
                  {isAr ? "عرض اليوم المفتوح الحصري" : "OPEN DAY EXCLUSIVE"}
                </p>
                <div className="text-[#1B2E8F] font-black mb-2" style={{ fontSize: "clamp(3rem, 10vw, 5rem)", lineHeight: 1, fontFamily: hf }}>
                  {cmsOpenDay.discount ?? 20}%
                </div>
                <p className="text-[#1B2E8F] font-black text-xl mb-1">{isAr ? "خصم" : "OFF"}</p>
                <p className="text-[#1B2E8F]/80 text-sm font-semibold mb-6">
                  {isAr ? (cmsOpenDay.discountDescAr || "للتسجيلات المقدمة اليوم فقط!") : (cmsOpenDay.discountDescEn || "For registrations made today only!")}
                </p>
                <button
                  onClick={() => { setRegSource("open_day"); setShowRegModal(true); setRegSubmitted(false); setRegForm({ fullName: "", email: "", phone: "", whatsappPhone: "", address: "" }); }}
                  className="w-full py-4 rounded-2xl font-black text-base transition-all hover:scale-105 active:scale-95"
                  style={{ backgroundColor: "#1B2E8F", color: "white", boxShadow: "0 8px 20px rgba(27,46,143,0.4)" }}
                >
                  {isAr ? (cmsOpenDay.ctaTextAr || "احصل على خصمي الآن") : (cmsOpenDay.ctaTextEn || "Claim My Discount Now")} →
                </button>
              </div>

              <div className="flex-1 rounded-3xl overflow-hidden border-2 border-white/15 flex items-center justify-center min-h-[200px]"
                style={{ background: "rgba(255,255,255,0.04)" }}>
                <div className="text-center p-6">
                  <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white/20"
                    style={{ backgroundColor: "rgba(245,166,0,0.15)" }}>
                    <Video className="w-10 h-10 text-white/50" />
                  </div>
                  <p className="text-white/40 text-sm">{isAr ? "معرض الصور والفيديوهات" : "Gallery & Videos"}</p>
                </div>
              </div>
            </div>

            <p className="text-center text-white/35 text-xs mt-10">
              {isAr ? "↓ اكتشف المزيد عن كيدسبيك أدناه" : "↓ Discover more about Kidspeak below"}
            </p>
          </div>
        </section>
      )}

      {/* ══════ HERO ═════════════════════════════════════════════════════════════ */}
      <section
        className="relative min-h-screen flex items-center overflow-hidden"
        style={{ background: "#FFFBF0" }}
      >
        {/* Warm amber ambient — bottom-left */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 60% 50% at 8% 92%, rgba(245,166,0,0.12) 0%, transparent 65%)" }}
        />
        {/* Soft navy tint — top-right */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 50% 55% at 92% 8%, rgba(27,46,143,0.06) 0%, transparent 65%)" }}
        />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full pt-16">
          <div className="grid lg:grid-cols-[56fr_44fr] gap-10 lg:gap-20 items-center min-h-[calc(100vh-64px)] py-20 lg:py-0">

            {/* ── LEFT: copy ── */}
            <div className={isRTL ? "text-right" : ""}>
              {/* Badge */}
              <div
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold mb-8"
                style={{ backgroundColor: "#F5A600", color: "#1B2E8F" }}
              >
                <Zap className="w-4 h-4 shrink-0" />
                {isAr ? (cmsHero?.badgeAr || txt.hero.badge) : (cmsHero?.badgeEn || txt.hero.badge)}
              </div>

              {/* Headline */}
              <h1 className="mb-6" style={{ fontFamily: hf, lineHeight: 1.0 }}>
                {cmsHero ? (
                  <span className="block" style={{ fontSize: "clamp(2.8rem, 6.5vw, 5.5rem)", fontWeight: 900, color: "#0D1A5C" }}>
                    {isAr ? (cmsHero.h1Ar || txt.hero.h1a + " " + txt.hero.h1b) : (cmsHero.h1En || txt.hero.h1a + " " + txt.hero.h1b)}
                  </span>
                ) : isAr ? (
                  <>
                    <span className="block" style={{ fontSize: "clamp(2.5rem, 5.5vw, 4.8rem)", fontWeight: 800, color: "rgba(13,26,92,0.30)", lineHeight: 1.1 }}>{txt.hero.h1a}</span>
                    <span className="block" style={{ fontSize: "clamp(2.8rem, 6.5vw, 5.5rem)", fontWeight: 900, color: "#F5A600", lineHeight: 1.0 }}>{txt.hero.h1b}</span>
                  </>
                ) : (
                  <>
                    <span className="block" style={{ fontSize: "clamp(2.3rem, 5vw, 4.4rem)", fontWeight: 800, color: "rgba(13,26,92,0.28)", lineHeight: 1.1 }}>Stop Studying</span>
                    <span className="block" style={{ fontSize: "clamp(2.8rem, 6.5vw, 5.5rem)", fontWeight: 900, color: "#0D1A5C", lineHeight: 1.0 }}>English.</span>
                    <span className="block" style={{ fontSize: "clamp(2.8rem, 6.5vw, 5.5rem)", fontWeight: 900, color: "#F5A600", lineHeight: 1.0 }}>Start Speaking It.</span>
                  </>
                )}
              </h1>

              <p className="text-lg leading-relaxed mb-10 max-w-lg" style={{ color: "rgba(13,26,92,0.55)" }}>
                {isAr ? (cmsHero?.subtitleAr || txt.hero.sub) : (cmsHero?.subtitleEn || txt.hero.sub)}
              </p>

              {/* CTAs */}
              <div className="flex flex-wrap gap-4">
                <button
                  onClick={() => { setRegSource(null); setShowRegModal(true); setRegSubmitted(false); setRegForm({ fullName: "", email: "", phone: "", whatsappPhone: "", address: "" }); }}
                  className="group inline-flex items-center gap-2.5 font-black text-base rounded-full transition-all hover:scale-105 active:scale-95"
                  style={{ backgroundColor: "#F5A600", color: "#1B2E8F", padding: "15px 36px", boxShadow: "0 8px 28px rgba(245,166,0,0.32)" }}
                >
                  {txt.hero.cta1}
                  <ArrowRight className={`w-5 h-5 transition-transform group-hover:translate-x-1 ${isRTL ? "rotate-180" : ""}`} />
                </button>
                <button
                  onClick={() => setLocation("/login")}
                  className="inline-flex items-center gap-2 font-semibold text-base rounded-full border-2 transition-all hover:bg-[#1B2E8F]/5"
                  style={{ borderColor: "rgba(27,46,143,0.22)", color: "#1B2E8F", padding: "13px 30px" }}
                >
                  {txt.hero.cta2}
                </button>
              </div>

              <button
                onClick={() => scrollTo("problem")}
                className="mt-12 flex items-center gap-2 transition-colors text-sm"
                style={{ color: "rgba(13,26,92,0.30)" }}
              >
                <span>{txt.hero.scroll}</span>
                <ChevronDown className="w-4 h-4 animate-bounce" />
              </button>
            </div>

            {/* ── RIGHT: icon + floating cards (desktop only) ── */}
            <div className="hidden lg:flex items-center justify-center relative">
              <div className="relative w-[420px] h-[420px]">

                {/* Kidspeak icon — optimised for cream background */}
                <svg viewBox="0 0 480 480" className="absolute inset-0 w-full h-full" fill="none">
                  <circle cx="185" cy="265" r="165" fill="#1B2E8F" opacity="0.04" />
                  <circle cx="185" cy="265" r="122" fill="#1B2E8F" opacity="0.06" />
                  <circle cx="185" cy="265" r="82"  fill="#1B2E8F" opacity="0.09" />
                  <circle cx="185" cy="265" r="50"  fill="#F5A600" opacity="0.70" />
                  <circle cx="185" cy="265" r="18"  fill="#1B2E8F" opacity="0.55" />
                  <path d="M 268 183 Q 322 265 268 347" stroke="#F5A600" strokeWidth="18" strokeLinecap="round" opacity="0.85" />
                  <path d="M 308 147 Q 386 265 308 383" stroke="#F5A600" strokeWidth="14" strokeLinecap="round" opacity="0.50" />
                  <path d="M 346 115 Q 450 265 346 415" stroke="#F5A600" strokeWidth="10" strokeLinecap="round" opacity="0.26" />
                </svg>

                {/* Floating card — confidence */}
                <div
                  className="absolute top-8 right-[-16px] rounded-2xl px-4 py-3 text-center"
                  style={{ background: "white", border: "1px solid rgba(27,46,143,0.09)", boxShadow: "0 10px 28px rgba(27,46,143,0.10)", minWidth: "130px" }}
                >
                  <div className="font-black leading-none mb-0.5" style={{ fontSize: "2rem", color: "#F5A600", fontFamily: hf }}>
                    <Counter to={94} suffix="%" />
                  </div>
                  <p className="text-xs" style={{ color: "rgba(13,26,92,0.45)" }}>{txt.stats.confidence}</p>
                </div>

                {/* Floating card — students */}
                <div
                  className="absolute bottom-14 left-[-12px] rounded-2xl px-4 py-3 text-center"
                  style={{ background: "white", border: "1px solid rgba(27,46,143,0.09)", boxShadow: "0 10px 28px rgba(27,46,143,0.10)", minWidth: "130px" }}
                >
                  <div className="font-black leading-none mb-0.5" style={{ fontSize: "2rem", color: "#F5A600", fontFamily: hf }}>
                    <Counter to={120} suffix="+" />
                  </div>
                  <p className="text-xs" style={{ color: "rgba(13,26,92,0.45)" }}>{txt.stats.students}</p>
                </div>

                {/* Floating card — parent voice */}
                <div
                  className="absolute bottom-[-18px] right-[10px] rounded-2xl px-4 py-3 max-w-[190px]"
                  style={{ background: "#1B2E8F", boxShadow: "0 14px 36px rgba(27,46,143,0.22)" }}
                >
                  <p className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.88)" }}>
                    {isAr ? "\"طفلي بدأ يتكلم بثقة خلال شهرين!\"" : "\"My child started speaking confidently in just 2 months!\""}
                  </p>
                  <p className="text-xs mt-1.5 font-semibold" style={{ color: "rgba(255,255,255,0.40)" }}>
                    — {isAr ? "أم سارة" : "Sarah's Mom"}
                  </p>
                </div>

              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ══════ STATS STRIP ══════════════════════════════════════════════════════ */}
      <div style={{ background: "#F5A600" }}>
        <div className="max-w-4xl mx-auto px-4">
          <div className="grid grid-cols-2 sm:grid-cols-4">
            {[
              { num: 120,  suffix: "+", label: txt.stats.students },
              { num: 2400, suffix: "+", label: txt.stats.sessions },
              { num: 94,   suffix: "%", label: txt.stats.confidence },
              { num: 4,    suffix: "",  label: txt.stats.levels },
            ].map((s, i) => (
              <div key={i} className="text-center py-6 px-2 border-[#1B2E8F]/10" style={{ borderRight: i < 3 ? "1px solid rgba(27,46,143,0.12)" : "none" }}>
                <div className="font-black leading-none" style={{ fontSize: "clamp(1.8rem, 4vw, 2.6rem)", fontFamily: hf, color: "#1B2E8F" }}>
                  <Counter to={s.num} suffix={s.suffix} />
                </div>
                <p className="text-[#1B2E8F]/60 text-xs mt-1 font-semibold">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══════ PROBLEM ══════════════════════════════════════════════════════════ */}
      <section id="problem" className="py-24" style={{ background: "#080F3C" }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Editorial header — left-aligned, large */}
          <div className="mb-16">
            <span
              className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest px-3 py-1.5 rounded-full mb-8"
              style={{ backgroundColor: "rgba(239,68,68,0.12)", color: "#f87171", border: "1px solid rgba(239,68,68,0.2)" }}
            >
              <AlertCircle className="w-3.5 h-3.5" />
              {txt.problem.badge}
            </span>
            <h2
              className="text-white mb-6 max-w-3xl"
              style={{ fontFamily: hf, fontSize: "clamp(2rem, 5vw, 3.8rem)", fontWeight: 900, lineHeight: 1.05 }}
            >
              {txt.problem.title}
            </h2>
            <p className="text-white/50 text-lg max-w-xl">{txt.problem.sub}</p>
          </div>

          {/* Items — editorial horizontal list, NOT a card grid */}
          <div className="divide-y divide-white/[0.06]">
            {txt.problem.cards.map((c, i) => (
              <div key={i} className="flex items-start gap-6 lg:gap-10 py-8 group">
                <span
                  className="text-5xl lg:text-7xl font-black select-none opacity-[0.07] shrink-0 w-16 text-right"
                  style={{ fontFamily: hf, color: "#F5A600", lineHeight: 1 }}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="text-4xl shrink-0 mt-1">{c.icon}</span>
                <div className="flex-1">
                  <h3 className="text-xl font-black text-white mb-2" style={{ fontFamily: hf }}>
                    {c.title}
                  </h3>
                  <p className="text-white/45 leading-relaxed">{c.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════ REALITY OF TRADITIONAL LEARNING ══════════════════════════════════ */}
      <section id="reality" className="py-24 overflow-hidden" style={{ background: "linear-gradient(160deg, #080F3C 0%, #0D1A5C 100%)" }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="inline-flex items-center gap-2 bg-red-500/15 text-red-300 text-sm font-semibold px-4 py-1.5 rounded-full mb-5">
              <AlertCircle className="w-4 h-4" />
              {isAr ? "واقع التعليم التقليدي" : "The Reality of Traditional Learning"}
            </span>
            <h2 className="text-3xl sm:text-5xl font-black text-white leading-tight max-w-4xl mx-auto mb-6" style={{ fontFamily: hf }}>
              {isAr
                ? "يدرسون الإنجليزية لسنوات... ولا يستطيعون التحدث بجملة واحدة."
                : "They study English for years... and still can't say a single sentence with confidence."}
            </h2>
          </div>

          <div className="max-w-4xl mx-auto mb-16 rounded-2xl border border-white/8 bg-white/[0.04] p-8 md:p-12 text-center relative overflow-hidden">
            <div className="absolute -top-4 -start-4 opacity-[0.04] font-serif leading-none select-none text-white" style={{ fontSize: "120px" }}>"</div>
            <p className="text-xl md:text-2xl text-white/85 font-medium leading-relaxed relative z-10">
              {isAr
                ? "الأطفال يقضون مئات الساعات في الدراسة ويحصلون على درجات عالية في المدرسة... ومع ذلك لا يستطيعون قول جملة واحدة بثقة."
                : "Children spend hundreds of hours studying, earn top grades in school — yet they cannot hold a simple conversation in English."}
            </p>
            <div className="mt-6 inline-flex items-center gap-3 px-5 py-2.5 rounded-xl" style={{ backgroundColor: "#F5A600", color: "#1B2E8F" }}>
              <span className="text-2xl font-black">💬</span>
              <p className="font-black text-base">
                {isAr ? "الدرجات ليست اللغة. التحدث هو اللغة." : "Grades are not the language. Speaking is the language."}
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {/* Academic "Success" */}
            <div className="rounded-2xl border border-red-500/20 bg-red-500/[0.04] p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center shrink-0">
                  <GraduationCap className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <p className="font-bold text-white">{isAr ? "النجاح الأكاديمي" : "Academic \"Success\""}</p>
                  <p className="text-xs text-red-300">{isAr ? "ما تعلّمه المدارس التقليدية" : "What traditional schools measure"}</p>
                </div>
              </div>
              <div className="space-y-3">
                {(isAr
                  ? ["نتائج إملاء ممتازة ✓", "قواعد نحوية محفوظة ✓", "ترجمة من وإلى العربية ✓", "درجات مرتفعة في الاختبارات ✓"]
                  : ["Perfect spelling test scores ✓", "Grammar rules memorized ✓", "Translation exercises ✓", "High marks on written exams ✓"]
                ).map((item, i) => (
                  <div key={i} className="flex items-center gap-2.5 text-sm text-white/55">
                    <X className="w-4 h-4 text-red-400 shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
                <div className="mt-4 rounded-xl bg-red-500/10 border border-red-500/15 px-3 py-2.5">
                  <p className="text-red-300 text-xs font-semibold">
                    {isAr ? "❌ النتيجة: طفل يعرف الإنجليزية لكنه يخاف من التحدث بها" : "❌ Result: A child who \"knows\" English but is too afraid to speak it"}
                  </p>
                </div>
              </div>
            </div>

            {/* Real-World Communication */}
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04] p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
                  <Mic className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <p className="font-bold text-white">{isAr ? "التواصل الحقيقي" : "Real-World Communication"}</p>
                  <p className="text-xs text-emerald-300">{isAr ? "ما يعلّمه كيدسبيك" : "What Kidspeak builds"}</p>
                </div>
              </div>
              <div className="space-y-3">
                {(isAr
                  ? ["إجراء محادثات حقيقية بثقة", "طرح الأسئلة والإجابة عليها", "التعبير عن الأفكار بحرية", "الأداء أمام الجمهور دون خوف"]
                  : ["Hold real conversations with confidence", "Ask and answer questions naturally", "Express ideas and emotions freely", "Perform in front of an audience fearlessly"]
                ).map((item, i) => (
                  <div key={i} className="flex items-center gap-2.5 text-sm text-white/80">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
                <div className="mt-4 rounded-xl bg-emerald-500/10 border border-emerald-500/15 px-3 py-2.5">
                  <p className="text-emerald-300 text-xs font-semibold">
                    {isAr ? "✅ النتيجة: طفل يتحدث الإنجليزية بثقة وفرح" : "✅ Result: A child who speaks English with joy and confidence"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center mt-12">
            <button onClick={() => scrollTo("method")} className="inline-flex items-center gap-2 text-white/55 hover:text-white text-sm transition-colors">
              {isAr ? "اكتشف الطريقة الكيدسبيك" : "Discover the Kidspeak way"}
              <ChevronDown className="w-4 h-4 animate-bounce" />
            </button>
          </div>
        </div>
      </section>

      {/* ══════ SCIENCE BEHIND KIDSPEAK ══════════════════════════════════════════ */}
      <section id="science" className="py-24 relative overflow-hidden" style={{ background: "#060C2E" }}>
        <div className="absolute inset-0 pointer-events-none opacity-[0.03]"
          style={{ backgroundImage: "linear-gradient(#F5A600 1px, transparent 1px), linear-gradient(90deg, #F5A600 1px, transparent 1px)", backgroundSize: "60px 60px" }} />

        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold mb-6"
              style={{ backgroundColor: "rgba(245,166,0,0.1)", color: "#F5A600", border: "1px solid rgba(245,166,0,0.25)" }}
            >
              <FlaskConical className="w-4 h-4" />
              {isAr ? "مدعوم بالعلم" : "Evidence-Based"}
            </div>
            <h2 className="text-3xl sm:text-5xl font-black text-white mb-4 leading-tight" style={{ fontFamily: hf }}>
              {isAr ? "العلم خلف" : "The Science Behind"}{" "}
              <span style={{ color: "#F5A600" }}>Kidspeak</span>
            </h2>
            <p className="text-white/55 text-lg max-w-2xl mx-auto">
              {isAr
                ? "ليس مجرد طريقة — بل هو نهج مثبت علمياً ونفسياً يغير كيف يكتسب الأطفال اللغة للأبد."
                : "Not just a method — a scientifically and psychologically proven approach that permanently changes how children acquire language."}
            </p>
          </div>

          <div className="bg-white/[0.04] border border-white/8 rounded-3xl p-8 mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
              <div>
                <h3 className="text-xl font-black text-white mb-1" style={{ fontFamily: hf }}>
                  {isAr ? "مقارنة مسارات التعلم على مدى 12 شهراً" : "Learning Path Comparison Over 12 Months"}
                </h3>
                <p className="text-white/45 text-sm">
                  {isAr ? "مستوى الثقة في الكلام والقدرة التواصلية" : "Speaking confidence & communication ability progression"}
                </p>
              </div>
              <div className="flex gap-3 flex-wrap">
                <div className="px-4 py-2 rounded-full text-xs font-bold" style={{ backgroundColor: "rgba(245,166,0,0.12)", color: "#F5A600", border: "1px solid rgba(245,166,0,0.3)" }}>
                  {isAr ? "وقت الكلام في كيدسبيك: 80%" : "Speaking time at Kidspeak: 80%"}
                </div>
                <div className="px-4 py-2 rounded-full text-xs font-bold bg-red-500/10 text-red-400 border border-red-500/20">
                  {isAr ? "وقت الكلام في المدارس: 5%" : "Speaking time in schools: 5%"}
                </div>
              </div>
            </div>
            <ScienceChart isAr={isAr} />
            <div className="mt-6 grid sm:grid-cols-2 gap-4">
              <div className="flex items-start gap-3 bg-red-500/[0.04] border border-red-500/12 rounded-2xl p-4">
                <div className="w-3 h-3 rounded-full bg-red-400 mt-1 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-red-300 mb-1">{isAr ? "التعليم التقليدي" : "Conventional Learning"}</p>
                  <p className="text-xs text-white/35 leading-relaxed">
                    {isAr ? "معرفة قواعدية عالية — لكن الثقة في الكلام تبقى منخفضة جداً." : "High grammar knowledge — but speaking confidence stays very low throughout the year."}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 bg-[#F5A600]/[0.04] border border-[#F5A600]/15 rounded-2xl p-4">
                <div className="w-3 h-3 rounded-full mt-1 shrink-0" style={{ backgroundColor: "#F5A600" }} />
                <div>
                  <p className="text-sm font-semibold mb-1" style={{ color: "#F5A600" }}>{isAr ? "منهج كيدسبيك" : "Kidspeak Method"}</p>
                  <p className="text-xs text-white/35 leading-relaxed">
                    {isAr ? "منحنى صاعد حاد في الثقة والتواصل — الطفل يتكلم من الأسبوع الأول." : "Steep upward curve in confidence & communication — child speaks from week one."}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Brain & Language */}
            <div className="bg-white/[0.04] border border-white/8 rounded-3xl p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ backgroundColor: "rgba(27,46,143,0.3)" }}>
                  <Brain className="w-5 h-5 text-blue-300" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white" style={{ fontFamily: hf }}>{isAr ? "الجانب العصبي" : "The Brain & Language Path"}</h3>
                  <p className="text-xs text-white/35">{isAr ? "ترتيب الاكتساب الطبيعي" : "Natural acquisition order"}</p>
                </div>
              </div>
              <div className="mb-6">
                <p className="text-xs font-bold uppercase tracking-widest text-red-400 mb-3">
                  {isAr ? "الطريقة الخاطئة — المدارس التقليدية" : "The Wrong Way — Traditional Schools"}
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  {[
                    { icon: <PenLine className="w-4 h-4" />, label: isAr ? "اقرأ / اكتب" : "Read / Write" },
                    { icon: <Headphones className="w-4 h-4" />, label: isAr ? "استمع" : "Listen" },
                    { icon: <Mic className="w-4 h-4" />, label: isAr ? "تكلم" : "Speak" },
                  ].map((step, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2 text-red-300 text-sm font-medium">
                        {step.icon}{step.label}
                      </div>
                      {i < 2 && <ArrowRightCircle className={`w-4 h-4 text-red-500/40 shrink-0 ${isRTL ? "rotate-180" : ""}`} />}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "#F5A600" }}>
                  {isAr ? "الطريقة الصحيحة — منهج كيدسبيك" : "The Right Way — Kidspeak Method"}
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  {[
                    { icon: <Headphones className="w-4 h-4" />, label: isAr ? "استمع" : "Listen", h: false },
                    { icon: <Mic className="w-4 h-4" />, label: isAr ? "تكلم ← المحور" : "SPEAK ← Core", h: true },
                    { icon: <PenLine className="w-4 h-4" />, label: isAr ? "اقرأ / اكتب" : "Read / Write", h: false },
                  ].map((step, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium border ${step.h ? "font-black" : "bg-white/[0.05] border-white/10 text-white/65"}`}
                        style={step.h ? { backgroundColor: "#F5A600", borderColor: "#F5A600", color: "#1B2E8F" } : {}}>
                        {step.icon}{step.label}
                      </div>
                      {i < 2 && <ArrowRightCircle className={`w-4 h-4 shrink-0 ${isRTL ? "rotate-180" : ""}`} style={{ color: "rgba(245,166,0,0.45)" }} />}
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-xs text-white/35 leading-relaxed">
                  {isAr ? "تماماً كما تعلمت لغتك الأم — بالسماع والكلام أولاً، ثم القراءة والكتابة." : "Just like your mother tongue — listening and speaking first, reading and writing come naturally after."}
                </p>
              </div>
            </div>

            {/* Confidence Factor */}
            <div className="bg-white/[0.04] border border-white/8 rounded-3xl p-8 flex flex-col">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ backgroundColor: "rgba(245,166,0,0.15)" }}>
                  <Shield className="w-5 h-5" style={{ color: "#F5A600" }} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white" style={{ fontFamily: hf }}>{isAr ? "عامل الثقة" : "The Confidence Factor"}</h3>
                  <p className="text-xs text-white/35">{isAr ? "مدعوم بالبحث النفسي" : "Backed by psychological research"}</p>
                </div>
              </div>
              <div className="flex-1 flex flex-col items-center justify-center text-center py-6">
                <div className="text-8xl font-black leading-none mb-4" style={{ color: "#F5A600", fontFamily: hf }}>90%</div>
                <p className="text-white/75 text-lg font-semibold mb-3 max-w-xs">
                  {isAr ? "من فشل الأطفال في اللغة سببه القلق — وليس نقص الذكاء." : "of children's language failure is caused by anxiety — not lack of intelligence."}
                </p>
                <div className="w-12 h-0.5 rounded-full mb-4" style={{ backgroundColor: "#F5A600" }} />
                <p className="text-white/45 text-sm leading-relaxed max-w-sm">
                  {isAr ? "منهجنا المعتمد على الأخصائية النفسية يكسر حاجز القلق ويبني ثقة حقيقية." : "Our psychologist-led approach eliminates this anxiety barrier and builds genuine confidence — because a confident child learns exponentially faster."}
                </p>
              </div>
              <div className="mt-4 space-y-3">
                <p className="text-xs font-bold uppercase tracking-widest text-white/25 mb-2">
                  {isAr ? "احتفاظ المفردات النشطة" : "Active vocabulary retention"}
                </p>
                {[
                  { label: isAr ? "كيدسبيك — يستخدم الكلمات" : "Kidspeak — uses words", pct: 87, color: "#F5A600" },
                  { label: isAr ? "التعليم التقليدي — يحفظ الكلمات" : "Conventional — memorises words", pct: 23, color: "#ef4444" },
                ].map(row => (
                  <div key={row.label}>
                    <div className="flex justify-between text-xs text-white/50 mb-1">
                      <span>{row.label}</span>
                      <span className="font-bold" style={{ color: row.color }}>{row.pct}%</span>
                    </div>
                    <div className="h-2 bg-white/8 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${row.pct}%`, backgroundColor: row.color }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

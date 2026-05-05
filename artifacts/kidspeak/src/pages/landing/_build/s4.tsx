
      {/* ══════ BEYOND LANGUAGE ══════════════════════════════════════════════════ */}
      <section id="beyond" className="py-24 relative overflow-hidden" style={{ background: "linear-gradient(160deg, #FFFBF0 0%, #FFF8E6 50%, #F5F0FF 100%)" }}>
        <div className="absolute top-0 start-0 w-96 h-96 rounded-full opacity-[0.05] pointer-events-none" style={{ background: "radial-gradient(circle, #1B2E8F, transparent)", transform: "translate(-30%, -30%)" }} />
        <div className="absolute bottom-0 end-0 w-80 h-80 rounded-full opacity-[0.05] pointer-events-none" style={{ background: "radial-gradient(circle, #F5A600, transparent)", transform: "translate(30%, 30%)" }} />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center mb-16">
            <span className="inline-block text-sm font-semibold px-4 py-1.5 rounded-full mb-5"
              style={{ backgroundColor: "rgba(27,46,143,0.08)", color: "#1B2E8F", border: "1px solid rgba(27,46,143,0.15)" }}>
              {isAr ? "أكثر من مجرد لغة" : "Beyond Language"}
            </span>
            <h2 className="text-3xl sm:text-4xl font-black leading-tight mb-4 text-gray-900" style={{ fontFamily: hf }}>
              {isAr ? <><span style={{ color: "#1B2E8F" }}>بناء عقل أقوى</span></> : <>Building a <span style={{ color: "#1B2E8F" }}>Stronger Mind</span></>}
            </h2>
            <div className="max-w-2xl mx-auto mt-6 p-6 rounded-2xl border-2 text-start"
              style={{ borderColor: "rgba(245,166,0,0.4)", backgroundColor: "#FFFBF0" }}>
              <p className="text-lg sm:text-xl font-black text-gray-900 mb-2 leading-snug" style={{ fontFamily: hf }}>
                {isAr ? "«الإنجليزية ليست سهلة، ولهذا السبب هي تغيّر الشخصية.»" : "\"English is Hard, and That's Why It's Transformative.\""}
              </p>
              <p className="text-sm text-gray-600 leading-relaxed">
                {isAr
                  ? "تعلّم التحدث بلغة ثانية هو تمرين معرفي حقيقي. فهو يُنمّي مهارات تُستخدم في جميع المواد الدراسية."
                  : "Learning to speak a second language is a real cognitive workout — one that builds skills used across every school subject, from Maths to History."}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
            {[
              { emoji: "🎤", color: "#1B2E8F", bg: "#EEF2FF", border: "rgba(27,46,143,0.15)", titleEn: "Public Speaking & Leadership", titleAr: "الإلقاء والقيادة", bodyEn: "If they can speak English with confidence, they will lead in their Arabic and History classes too.", bodyAr: "إذا استطاع طفلك التحدث بالإنجليزية بثقة، فإنه سيتصدّر في حصص اللغة العربية والتاريخ أيضاً.", tagEn: "Transfers to: Arabic · History · Social Studies", tagAr: "ينعكس على: العربية · التاريخ · الدراسات الاجتماعية" },
              { emoji: "🧠", color: "#0D4E8A", bg: "#EFF6FF", border: "rgba(13,78,138,0.15)", titleEn: "Cognitive Focus", titleAr: "التركيز المعرفي", bodyEn: "Our 'Speaking-First' method trains active listening and memory — directly boosting performance in Maths and Science.", bodyAr: "طريقتنا 'الكلام أولاً' تُدرّب الاستماع الفعّال والذاكرة — وهو ما يرفع مستوى أداء الطفل في الرياضيات والعلوم.", tagEn: "Transfers to: Maths · Science · Languages", tagAr: "ينعكس على: الرياضيات · العلوم · اللغات" },
              { emoji: "💪", color: "#16a34a", bg: "#F0FDF4", border: "rgba(22,163,74,0.15)", titleEn: "Emotional Resilience", titleAr: "المرونة النفسية", bodyEn: "Overcoming the fear of making mistakes in English teaches kids how to handle any challenge — including high-stakes exams.", bodyAr: "التغلّب على خوف الخطأ في الإنجليزية يُعلّم الطفل كيف يواجه أي تحدٍّ — بما في ذلك الامتحانات الكبرى.", tagEn: "Transfers to: Every exam · Every subject", tagAr: "ينعكس على: كل امتحان · كل مادة" },
            ].map((card, i) => (
              <div key={i} className="rounded-2xl p-6 border-2 flex flex-col gap-3 hover:shadow-lg transition-shadow"
                style={{ backgroundColor: card.bg, borderColor: card.border }}>
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{card.emoji}</span>
                  <h3 className="font-black text-base leading-tight text-gray-900" style={{ fontFamily: hf }}>
                    {isAr ? card.titleAr : card.titleEn}
                  </h3>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed flex-1">{isAr ? card.bodyAr : card.bodyEn}</p>
                <p className="text-xs font-semibold px-2.5 py-1 rounded-full w-fit"
                  style={{ color: card.color, backgroundColor: `${card.color}12`, border: `1px solid ${card.color}22` }}>
                  {isAr ? card.tagAr : card.tagEn}
                </p>
              </div>
            ))}
          </div>

          <div className="text-center">
            <button onClick={() => setLocation("/our-method")} className="inline-flex items-center gap-2 text-sm font-bold group" style={{ color: "#1B2E8F" }}>
              <span className="underline underline-offset-4 group-hover:no-underline">
                {isAr ? "اكتشف كيف نطبّق هذا في برنامجنا" : "See how we do this in our program"}
              </span>
              <span className={`transition-transform group-hover:translate-x-1 ${isRTL ? "rotate-180" : ""}`}>→</span>
            </button>
          </div>
        </div>
      </section>

      {/* ══════ METHOD — Editorial large-number layout ════════════════════════════ */}
      <section id="method" className="py-24" style={{ background: "#FFFBF0" }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <span className="inline-block text-sm font-semibold px-4 py-1.5 rounded-full mb-4"
              style={{ backgroundColor: "rgba(27,46,143,0.08)", color: "#1B2E8F" }}>
              {txt.method.badge}
            </span>
            <h2 className="text-3xl sm:text-5xl font-black text-gray-900 mb-4" style={{ fontFamily: hf }}>{txt.method.title}</h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">{txt.method.sub}</p>
          </div>

          {/* Editorial layout: giant step numbers + content */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-0 relative">
            {/* Connector line (desktop) */}
            <div className="hidden lg:block absolute top-[3.5rem] start-[12.5%] end-[12.5%] h-px" style={{ background: "linear-gradient(90deg, #F5A600, #1B2E8F)" }} />

            {txt.method.steps.map((step, i) => {
              const Icon = step.icon;
              const accentColors = ["#F5A600", "#e09300", "#1B2E8F", "#0D1A5C"];
              const ac = accentColors[i % accentColors.length];
              return (
                <div key={i} className="flex flex-col items-center text-center px-4 pb-8 group">
                  {/* Giant editorial step number */}
                  <div className="relative z-10 leading-none select-none mb-3"
                    style={{ fontFamily: hf, fontSize: "clamp(4rem, 8vw, 6.5rem)", fontWeight: 900, color: ac, opacity: 0.18 }}>
                    {step.num}
                  </div>
                  {/* Icon circle */}
                  <div className="relative z-10 w-14 h-14 rounded-2xl flex items-center justify-center mb-5 shadow-md group-hover:scale-110 transition-transform -mt-8"
                    style={{ backgroundColor: ac }}>
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  {/* Label */}
                  <h3 className="text-lg font-black text-gray-900 mb-2" style={{ fontFamily: hf }}>{step.label}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{step.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ══════ WHY KIDSPEAK (USP) ════════════════════════════════════════════════ */}
      <section id="usp" className="py-24" style={{ background: "#0D1A5C" }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="inline-block text-sm font-semibold px-4 py-1.5 rounded-full mb-4"
              style={{ backgroundColor: "rgba(245,166,0,0.12)", color: "#F5A600", border: "1px solid rgba(245,166,0,0.25)" }}>
              {txt.usp.badge}
            </span>
            <h2 className="text-3xl sm:text-5xl font-black text-white mb-4" style={{ fontFamily: hf }}>{txt.usp.title}</h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {txt.usp.cards.map((card, i) => {
              const Icon = card.icon;
              return (
                <div key={i} className="rounded-2xl p-6 border border-white/8 hover:border-white/16 transition-colors"
                  style={{ background: "rgba(255,255,255,0.04)" }}>
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5"
                    style={{ backgroundColor: `${card.color}22` }}>
                    <Icon className="w-6 h-6" style={{ color: card.color }} />
                  </div>
                  <h3 className="text-base font-black text-white mb-2" style={{ fontFamily: hf }}>{card.title}</h3>
                  <p className="text-white/45 text-sm leading-relaxed">{card.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ══════ PROGRAMS ═════════════════════════════════════════════════════════ */}
      <section id="programs" className="py-24" style={{ background: "#FFFBF0" }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="inline-block text-sm font-semibold px-4 py-1.5 rounded-full mb-4"
              style={{ backgroundColor: "rgba(27,46,143,0.08)", color: "#1B2E8F" }}>
              {txt.programs.badge}
            </span>
            <h2 className="text-3xl sm:text-5xl font-black text-gray-900 mb-4" style={{ fontFamily: hf }}>{txt.programs.title}</h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">{txt.programs.sub}</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {(levels.length > 0 ? levels : [1, 2, 3, 4].map((n) => ({ id: n, name: `Level ${n}` }))).map((level, i) => {
              const levelColors = ["#F5A600", "#e09300", "#1B2E8F", "#0D1A5C"];
              const color = levelColors[i % levelColors.length];
              const lv = level as Level;
              const displayName = (isAr && lv.nameAr) ? lv.nameAr : lv.name;
              const desc = (isAr && lv.descriptionAr) ? lv.descriptionAr : (lv.description || txt.programs.defaultDesc[i] || `Level ${i + 1}`);
              const price = lv.price;
              const weeks = lv.durationWeeks ?? 8;
              const spw = lv.sessionsPerWeek ?? 2;
              const isPopular = i === 1;
              return (
                <div key={level.id}
                  className={`relative rounded-3xl overflow-hidden border-2 transition-all hover:shadow-xl hover:-translate-y-1 bg-white ${isPopular ? "shadow-lg" : "shadow-sm"}`}
                  style={{ borderColor: isPopular ? color : "#e5e7eb" }}>
                  {/* Top accent line */}
                  <div className="h-1.5" style={{ backgroundColor: color }} />
                  {isPopular && (
                    <div className="text-center text-xs font-bold py-1.5 text-white" style={{ backgroundColor: color }}>
                      ⭐ {isAr ? "الأكثر شعبية" : "Most Popular"}
                    </div>
                  )}
                  <div className="p-6">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-sm mb-4" style={{ backgroundColor: color }}>
                      {i + 1}
                    </div>
                    <h3 className="text-lg font-black text-gray-900 mb-2" style={{ fontFamily: hf }}>{displayName}</h3>
                    <p className="text-gray-500 text-sm mb-4 leading-relaxed">{desc}</p>
                    <div className="space-y-2 mb-6">
                      <div className="flex items-center gap-2 text-sm">
                        <Check className="w-4 h-4 shrink-0" style={{ color }} />
                        <span className="text-gray-600">{weeks} {txt.programs.weeks}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Check className="w-4 h-4 shrink-0" style={{ color }} />
                        <span className="text-gray-600">{spw} {txt.programs.sessions}</span>
                      </div>
                      {price && (
                        <div className="flex items-center gap-2 text-sm">
                          <Check className="w-4 h-4 shrink-0" style={{ color }} />
                          <span className="font-bold" style={{ color }}>{price.toLocaleString()} {txt.programs.perMonth}</span>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => { setRegSource(null); setShowRegModal(true); setRegSubmitted(false); setRegForm({ fullName: "", email: "", phone: "", whatsappPhone: "", address: "" }); }}
                      className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
                      style={{ backgroundColor: isPopular ? color : `${color}18`, color: isPopular ? "white" : color }}
                    >
                      {txt.programs.enrollBtn}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ══════ TRANSPARENCY WINDOW ══════════════════════════════════════════════ */}
      <section id="transparency" className="py-24 relative overflow-hidden" style={{ background: "linear-gradient(180deg, #080F3C 0%, #0D1A5C 50%, #080F3C 100%)" }}>
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(245,166,0,0.06) 0%, transparent 70%)" }} />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

          <div className="text-center mb-20">
            <span className="inline-flex items-center gap-2 text-sm font-semibold px-5 py-2 rounded-full mb-5 border"
              style={{ backgroundColor: "rgba(245,166,0,0.1)", borderColor: "rgba(245,166,0,0.3)", color: "#F5A600" }}>
              <Lock className="w-3.5 h-3.5" />
              {txt.transparency.badge}
            </span>
            <h2 className="text-3xl sm:text-5xl font-black text-white mb-5 leading-tight" style={{ fontFamily: hf }}>
              {txt.transparency.title}
            </h2>
            <p className="text-lg text-blue-200/70 max-w-2xl mx-auto">{txt.transparency.sub}</p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 items-center mb-28">
            {/* Phone mockup */}
            <div className={`flex justify-center ${isRTL ? "lg:order-2" : ""}`}>
              <div className="relative w-72 sm:w-80">
                <div className="rounded-[2.5rem] border-4 p-1 shadow-2xl" style={{ borderColor: "rgba(245,166,0,0.45)", background: "linear-gradient(180deg, #1B2E8F, #060C2E)" }}>
                  <div className="rounded-[2rem] overflow-hidden bg-[#060C2E]">
                    <div className="flex items-center justify-between px-5 py-2 text-xs text-white/55 bg-black/30">
                      <span>9:41</span>
                      <div className="w-16 h-4 bg-black/50 rounded-full" />
                      <div className="flex gap-1">
                        <div className="w-3 h-2 bg-white/55 rounded-sm" />
                        <div className="w-1 h-2 bg-white/55 rounded-sm" />
                      </div>
                    </div>
                    <div className="px-4 py-3 flex items-center gap-2" style={{ background: "#1B2E8F" }}>
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-[#1B2E8F]" style={{ backgroundColor: "#F5A600" }}>K</div>
                      <span className="text-white font-semibold text-sm">{txt.transparency.phone.headline}</span>
                    </div>
                    <div className="p-3 space-y-2">
                      <div className="rounded-xl p-3" style={{ backgroundColor: "rgba(245,166,0,0.08)", border: "1px solid rgba(245,166,0,0.18)" }}>
                        <div className="flex items-center gap-2 mb-2">
                          <CalendarCheck className="w-4 h-4" style={{ color: "#F5A600" }} />
                          <span className="text-xs font-semibold text-white">{isAr ? "الحضور هذا الشهر" : "Attendance This Month"}</span>
                        </div>
                        <div className="flex gap-1">
                          {[1,1,1,1,1,1,1,0,1,1,1,1].map((v, i) => (
                            <div key={i} className="flex-1 h-2 rounded-full" style={{ backgroundColor: v ? "#F5A600" : "rgba(255,255,255,0.12)" }} />
                          ))}
                        </div>
                        <div className="text-end mt-1"><span className="text-[10px]" style={{ color: "#F5A600" }}>11/12 ✓</span></div>
                      </div>
                      <div className="rounded-xl p-3" style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                        <div className="flex items-center gap-2 mb-2">
                          <TrendingUp className="w-4 h-4 text-green-400" />
                          <span className="text-xs font-semibold text-white">{isAr ? "نقاط التقدم" : "Progress Score"}</span>
                        </div>
                        <div className="flex items-end gap-1 h-10">
                          {[3,4,4,5,6,7,7,8].map((h, i) => (
                            <div key={i} className="flex-1 rounded-t" style={{ height: `${h * 10}%`, backgroundColor: i === 7 ? "#F5A600" : "rgba(245,166,0,0.3)" }} />
                          ))}
                        </div>
                      </div>
                      <div className="rounded-xl p-3 flex items-center gap-3" style={{ backgroundColor: "rgba(27,46,143,0.5)", border: "1px solid rgba(100,130,255,0.18)" }}>
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: "rgba(245,166,0,0.18)" }}>
                          <Video className="w-5 h-5" style={{ color: "#F5A600" }} />
                        </div>
                        <div>
                          <p className="text-white text-xs font-semibold">{isAr ? "عرض النجوم — الأسبوع 6" : "Talk Show — Week 6"}</p>
                          <p className="text-white/40 text-[10px]">{isAr ? "شاهد الآن ▶" : "Watch now ▶"}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: features */}
            <div className={isRTL ? "lg:order-1" : ""}>
              <h3 className="text-2xl font-black text-white mb-8" style={{ fontFamily: hf }}>
                {txt.transparency.phone.headline}
              </h3>
              <div className="space-y-6">
                {txt.transparency.phone.items.map((item, i) => {
                  const icons = { eye: Eye, video: Video, calendar: CalendarCheck };
                  const ItemIcon = icons[item.icon as keyof typeof icons] || Eye;
                  const colors = ["#F5A600", "#60a5fa", "#34d399"];
                  return (
                    <div key={i} className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${colors[i]}18` }}>
                        <ItemIcon className="w-5 h-5" style={{ color: colors[i] }} />
                      </div>
                      <div>
                        <p className="font-black text-white mb-1" style={{ fontFamily: hf }}>{item.label}</p>
                        <p className="text-white/45 text-sm leading-relaxed">{item.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Guarantees */}
          <div className="text-center mb-12">
            <span className="inline-block text-xs font-black uppercase tracking-widest px-4 py-2 rounded-full mb-4"
              style={{ backgroundColor: "rgba(245,166,0,0.12)", color: "#F5A600", border: "1px solid rgba(245,166,0,0.25)" }}>
              {txt.transparency.guarantees.badge}
            </span>
            <h3 className="text-2xl sm:text-4xl font-black text-white" style={{ fontFamily: hf }}>
              {txt.transparency.guarantees.title}
            </h3>
          </div>
          <div className="grid md:grid-cols-3 gap-6 mb-20">
            {txt.transparency.guarantees.items.map((item, i) => {
              const colors = ["#F5A600", "#34d399", "#60a5fa"];
              return (
                <div key={i} className="rounded-2xl p-6 border border-white/8 text-center"
                  style={{ background: "rgba(255,255,255,0.04)" }}>
                  <span className="inline-block text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full mb-4"
                    style={{ backgroundColor: `${colors[i]}15`, color: colors[i], border: `1px solid ${colors[i]}30` }}>
                    {item.tag}
                  </span>
                  <h4 className="text-base font-black text-white mb-2" style={{ fontFamily: hf }}>{item.title}</h4>
                  <p className="text-white/45 text-sm leading-relaxed">{item.desc}</p>
                </div>
              );
            })}
          </div>

          {/* 15-min rule */}
          <div className="max-w-3xl mx-auto rounded-3xl p-8 border border-[#F5A600]/25 text-center"
            style={{ background: "rgba(245,166,0,0.06)" }}>
            <span className="inline-block text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full mb-4"
              style={{ backgroundColor: "rgba(245,166,0,0.15)", color: "#F5A600" }}>
              {txt.transparency.rule.badge}
            </span>
            <h4 className="text-2xl font-black text-white mb-3" style={{ fontFamily: hf }}>{txt.transparency.rule.title}</h4>
            <p className="text-white/55 text-base leading-relaxed mb-6">{txt.transparency.rule.desc}</p>
            <p className="text-white/40 text-sm mb-6">{txt.transparency.rule.compare}</p>
            <div className="flex items-center justify-center gap-8">
              <div className="text-center">
                <div className="text-4xl font-black mb-1" style={{ color: "#F5A600", fontFamily: hf }}>{txt.transparency.rule.us}</div>
                <p className="text-white/50 text-xs">{txt.transparency.rule.usLabel}</p>
              </div>
              <div className="text-white/20 text-2xl">vs</div>
              <div className="text-center">
                <div className="text-4xl font-black text-red-400 mb-1" style={{ fontFamily: hf }}>{txt.transparency.rule.them}</div>
                <p className="text-white/50 text-xs">{txt.transparency.rule.themLabel}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════ TESTIMONIALS — Editorial quote style ══════════════════════════════ */}
      <section id="testimonials" className="py-24 relative overflow-hidden" style={{ background: "#1B2E8F" }}>
        {/* Ambient KSMark decoration */}
        <div className="absolute -right-32 top-1/2 -translate-y-1/2 opacity-[0.04] pointer-events-none">
          <KSMark className="w-[600px] h-[600px]" />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-16">
            <span className="inline-block text-sm font-semibold px-4 py-1.5 rounded-full mb-6"
              style={{ backgroundColor: "rgba(245,166,0,0.15)", color: "#F5A600", border: "1px solid rgba(245,166,0,0.3)" }}>
              {txt.testimonials.badge}
            </span>
            <h2 className="text-3xl sm:text-5xl font-black text-white" style={{ fontFamily: hf }}>
              {txt.testimonials.title}
            </h2>
          </div>

          {/* Large decorative opening quote */}
          <div className="leading-none select-none mb-6 opacity-25" style={{ fontSize: "clamp(5rem, 12vw, 9rem)", color: "#F5A600", fontFamily: "Georgia, serif", lineHeight: 0.8 }}>
            &ldquo;
          </div>

          {/* Testimonials as editorial vertical flow */}
          <div className="space-y-0 divide-y divide-white/10">
            {(cmsTestimonials.length > 0 ? cmsTestimonials : txt.testimonials.items).map((item: any, i) => {
              const name = item.nameAr && isAr ? item.nameAr : item.name;
              const text = item.textAr && isAr ? item.textAr : item.text;
              const stars = item.stars ?? 5;
              return (
                <div key={i} className="py-10">
                  <p className="text-white/85 text-xl sm:text-2xl leading-relaxed mb-6 font-medium" style={{ fontFamily: isAr ? "'Cairo', sans-serif" : "inherit" }}>
                    {text}
                  </p>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-[#1B2E8F] font-black text-sm shrink-0"
                      style={{ backgroundColor: "#F5A600" }}>
                      {(name || "?")[0]}
                    </div>
                    <div>
                      <p className="font-bold text-white text-sm">{name}</p>
                      <div className="flex gap-0.5 mt-0.5">
                        {Array.from({ length: stars }).map((_, si) => (
                          <Star key={si} className="w-3.5 h-3.5 fill-[#F5A600] text-[#F5A600]" />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Trust badges */}
          <div className="mt-16 flex flex-wrap gap-4">
            {[
              { icon: Award,  text: isAr ? "شهادات رقمية بـ QR"  : "Smart QR Certificates",      color: "#F5A600" },
              { icon: Shield, text: isAr ? "دعم نفسي متخصص"       : "Psychological Support",       color: "#60a5fa" },
              { icon: Heart,  text: isAr ? "بيئة آمنة وحنون"      : "Safe & Caring Environment",  color: "#f87171" },
            ].map(({ icon: Icon, text, color }, i) => (
              <div key={i} className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-white/12"
                style={{ background: "rgba(255,255,255,0.06)" }}>
                <Icon className="w-4 h-4" style={{ color }} />
                <span className="text-sm font-medium text-white/75">{text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════ ENROLLMENT FORM — 2-col layout ════════════════════════════════════ */}
      <section id="enroll" className="py-0 overflow-hidden">
        <div className="grid lg:grid-cols-[42fr_58fr]">
          {/* Left: emotional copy on amber/navy */}
          <div className="py-20 px-8 lg:px-14 flex flex-col justify-center" style={{ background: "linear-gradient(160deg, #0D1A5C 0%, #1B2E8F 100%)" }}>
            <span className="inline-block text-xs font-black uppercase tracking-widest px-3 py-1.5 rounded-full mb-8 w-fit"
              style={{ backgroundColor: "#F5A600", color: "#1B2E8F" }}>
              {txt.enroll.badge}
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-4 leading-tight" style={{ fontFamily: hf }}>
              {txt.enroll.title}
            </h2>
            <p className="text-white/55 text-base leading-relaxed mb-10">{txt.enroll.sub}</p>

            {/* Quick promises */}
            <div className="space-y-4">
              {[
                { icon: "🎯", en: "Free assessment session included", ar: "جلسة تقييم مجانية مشمولة" },
                { icon: "⚡", en: "We call you back within 24 hours", ar: "نتصل بك خلال ٢٤ ساعة" },
                { icon: "🔒", en: "No commitment required", ar: "لا يوجد التزام مسبق" },
              ].map((p, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-2xl">{p.icon}</span>
                  <span className="text-white/75 text-sm">{isAr ? p.ar : p.en}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: form on white */}
          <div className="py-16 px-6 lg:px-14 flex items-center" style={{ background: "#FFFBF0" }}>
            <div className="w-full max-w-lg mx-auto">
              {submitted ? (
                <div className="rounded-3xl border-2 p-12 text-center" style={{ borderColor: "#F5A600", backgroundColor: "white" }}>
                  <div className="text-6xl mb-4">🎉</div>
                  <h3 className="text-2xl font-black mb-2" style={{ color: "#1B2E8F", fontFamily: hf }}>{isAr ? "تم الاستلام!" : "Received!"}</h3>
                  <p className="text-gray-500">{txt.enroll.success}</p>
                  <button className="mt-6 px-6 py-3 rounded-xl font-semibold text-[#1B2E8F]"
                    style={{ backgroundColor: "#F5A600" }}
                    onClick={() => setSubmitted(false)}>
                    {isAr ? "تسجيل طفل آخر" : "Register Another Child"}
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-gray-700">{txt.enroll.labels.parentName}</label>
                      <Input required value={formData.parentName} onChange={e => setFormData(f => ({ ...f, parentName: e.target.value }))} placeholder={isAr ? "أحمد بن علي" : "Ahmed Benali"} className="h-11" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-gray-700">{txt.enroll.labels.parentPhone}</label>
                      <Input required type="tel" value={formData.parentPhone} onChange={e => setFormData(f => ({ ...f, parentPhone: e.target.value }))} placeholder="0555 123 456" className="h-11" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-gray-700">{txt.enroll.labels.parentEmail}</label>
                      <Input type="email" value={formData.parentEmail} onChange={e => setFormData(f => ({ ...f, parentEmail: e.target.value }))} placeholder={isAr ? "بريدك@مثال.com" : "your@email.com"} className="h-11" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-gray-700">{txt.enroll.labels.childName}</label>
                      <Input required value={formData.childName} onChange={e => setFormData(f => ({ ...f, childName: e.target.value }))} placeholder={isAr ? "اسم الطفل" : "Child's name"} className="h-11" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-gray-700">{txt.enroll.labels.childAge}</label>
                      <Select value={formData.childAge} onValueChange={v => setFormData(f => ({ ...f, childAge: v }))}>
                        <SelectTrigger className="h-11"><SelectValue placeholder={isAr ? "اختر العمر" : "Select age"} /></SelectTrigger>
                        <SelectContent>{txt.enroll.ageOptions.map((o, i) => <SelectItem key={i} value={o}>{o}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-gray-700">{txt.enroll.labels.preferredLevel}</label>
                      <Select value={formData.preferredLevel} onValueChange={v => setFormData(f => ({ ...f, preferredLevel: v }))}>
                        <SelectTrigger className="h-11"><SelectValue placeholder={isAr ? "اختر المستوى" : "Select level"} /></SelectTrigger>
                        <SelectContent>
                          {(levels.length > 0 ? levels : [{ id: 1, name: "Level 1" }, { id: 2, name: "Level 2" }, { id: 3, name: "Level 3" }, { id: 4, name: "Level 4" }]).map(lv => (
                            <SelectItem key={lv.id} value={lv.name}>{lv.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-gray-700">{txt.enroll.labels.notes}</label>
                    <Textarea rows={3} value={formData.notes} onChange={e => setFormData(f => ({ ...f, notes: e.target.value }))}
                      placeholder={isAr ? "أي معلومات إضافية تودّ مشاركتها…" : "Any additional information…"} className="resize-none" />
                  </div>
                  <button type="submit" disabled={submitting}
                    className="w-full h-14 rounded-xl font-black text-lg transition-all hover:scale-[1.02] disabled:opacity-60"
                    style={{ backgroundColor: "#1B2E8F", color: "white" }}>
                    {submitting ? (isAr ? "جاري الإرسال…" : "Sending…") : txt.enroll.labels.submit}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ══════ FOOTER ═══════════════════════════════════════════════════════════ */}
      <footer style={{ background: "#060C2E" }} className="text-white py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-12 mb-12">
            {/* Brand */}
            <div>
              {settings?.logoWhiteUrl ? (
                <img src={`/api/storage/public-objects/${settings.logoWhiteUrl}`} alt="Kidspeak" className="h-10 mb-4 object-contain" />
              ) : (
                <div className="text-2xl font-black mb-4" style={{ fontFamily: hf }}>
                  kid<span style={{ color: "#F5A600" }}>speak</span>
                </div>
              )}
              <p className="text-white/40 text-sm leading-relaxed mb-4">
                {isAr ? settings?.sloganAr || "حيث يلتقي التقدم بالدقة." : settings?.slogan || "Where Progress Meets Precision."}
              </p>
              <div className="flex gap-3">
                {settings?.instagram && (
                  <a href={settings.instagram.startsWith("http") ? settings.instagram : `https://instagram.com/${settings.instagram}`}
                    target="_blank" rel="noreferrer"
                    className="w-9 h-9 bg-white/8 hover:bg-[#F5A600] rounded-lg flex items-center justify-center transition-colors">
                    <Instagram className="w-4 h-4" />
                  </a>
                )}
                {settings?.facebook && (
                  <a href={settings.facebook.startsWith("http") ? settings.facebook : `https://facebook.com/${settings.facebook}`}
                    target="_blank" rel="noreferrer"
                    className="w-9 h-9 bg-white/8 hover:bg-[#F5A600] rounded-lg flex items-center justify-center transition-colors">
                    <Facebook className="w-4 h-4" />
                  </a>
                )}
                {settings?.youtube && (
                  <a href={settings.youtube.startsWith("http") ? settings.youtube : `https://youtube.com/@${settings.youtube}`}
                    target="_blank" rel="noreferrer"
                    className="w-9 h-9 bg-white/8 hover:bg-[#F5A600] rounded-lg flex items-center justify-center transition-colors">
                    <Youtube className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>

            {/* Quick links */}
            <div>
              <h4 className="font-bold text-white mb-5 text-sm uppercase tracking-widest opacity-60">{isAr ? "روابط سريعة" : "Quick Links"}</h4>
              <nav className="space-y-3">
                {[
                  ...(cmsOpenDay?.enabled ? [{ label: isAr ? "🎉 اليوم المفتوح" : "🎉 Open Day", id: "open-day" }] : []),
                  { label: isAr ? "العلم خلف كيدسبيك" : "The Science",   id: "science" },
                  { label: isAr ? "أكثر من مجرد لغة"  : "Beyond Language", id: "beyond" },
                  { label: isAr ? "الطريقة"            : "The Method",    id: "method" },
                  { label: isAr ? "الميزات"            : "Features",      id: "usp" },
                  { label: isAr ? "البرامج"            : "Programs",      id: "programs" },
                  { label: isAr ? "نافذة الشفافية"     : "Transparency",  id: "transparency" },
                  { label: isAr ? "آراء الأهل"         : "Testimonials",  id: "testimonials" },
                  { label: isAr ? "التسجيل"            : "Register",      id: "enroll" },
                ].map(link => (
                  <button key={link.id} onClick={() => scrollTo(link.id)}
                    className="block text-white/40 hover:text-[#F5A600] text-sm transition-colors">
                    {link.label}
                  </button>
                ))}
                {customPages.filter(p => p.showInFooter && p.status === "published").map(p => (
                  <a key={p.id} href={`/p${p.slug}`} className="block text-white/40 hover:text-[#F5A600] text-sm transition-colors">
                    {isAr ? (p.titleAr || p.titleEn) : p.titleEn}
                  </a>
                ))}
              </nav>
            </div>

            {/* Contact */}
            <div>
              <h4 className="font-bold text-white mb-5 text-sm uppercase tracking-widest opacity-60">{txt.footer.contact}</h4>
              <div className="space-y-4">
                {settings?.address && (
                  <div className="flex items-start gap-3">
                    <MapPin className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "#F5A600" }} />
                    <span className="text-white/40 text-sm">{settings.address}</span>
                  </div>
                )}
                {settings?.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 shrink-0" style={{ color: "#F5A600" }} />
                    <a href={`tel:${settings.phone}`} className="text-white/40 hover:text-white text-sm transition-colors">{settings.phone}</a>
                  </div>
                )}
                {settings?.phone2 && (
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 shrink-0" style={{ color: "#F5A600" }} />
                    <a href={`tel:${settings.phone2}`} className="text-white/40 hover:text-white text-sm transition-colors">{settings.phone2}</a>
                  </div>
                )}
                {settings?.email && (
                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4 shrink-0" style={{ color: "#F5A600" }} />
                    <a href={`mailto:${settings.email}`} className="text-white/40 hover:text-white text-sm transition-colors">{settings.email}</a>
                  </div>
                )}
                {!settings?.address && !settings?.phone && !settings?.email && (
                  <p className="text-white/25 text-sm">{isAr ? "تواصل معنا عبر وسائل التواصل الاجتماعي" : "Contact us via social media"}</p>
                )}
              </div>
            </div>
          </div>

          <div className="border-t border-white/8 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-white/25 text-sm">
              © {new Date().getFullYear()} {settings?.schoolName ?? "Kidspeak Language Center"}. {txt.footer.rights}
            </p>
            <button onClick={() => setLocation("/login")} className="text-white/25 hover:text-white text-sm transition-colors">
              {txt.nav.login}
            </button>
          </div>
        </div>
      </footer>

      {/* ══════ PARENT REGISTRATION MODAL ════════════════════════════════════════ */}
      {showRegModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}
          onClick={e => { if (e.target === e.currentTarget) setShowRegModal(false); }}
        >
          <div
            dir={isRTL ? "rtl" : "ltr"}
            className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
            style={{ animation: "slideUp 0.3s ease" }}
          >
            <div className="relative px-6 pt-8 pb-6 text-center" style={{ background: "linear-gradient(135deg, #0D1A5C 0%, #1B2E8F 100%)" }}>
              <button onClick={() => setShowRegModal(false)}
                className="absolute top-4 end-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/15 hover:bg-white/25 transition-colors text-white">
                <X className="w-4 h-4" />
              </button>
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: "#F5A600" }}>
                <UserPlus className="w-7 h-7 text-white" />
              </div>
              {settings?.logoWhiteUrl ? (
                <img src={`/api/storage/public-objects/${settings.logoWhiteUrl}`} alt="Kidspeak" className="h-7 object-contain mx-auto mb-3" />
              ) : (
                <p className="text-white font-black text-xl tracking-tight mb-3" style={{ fontFamily: hf }}>
                  kid<span style={{ color: "#F5A600" }}>speak</span>
                </p>
              )}
              <h2 className="text-xl font-black text-white">{txt.reg.title}</h2>
              <p className="text-white/65 text-sm mt-1.5 leading-relaxed">{txt.reg.subtitle}</p>
            </div>

            <div className="px-6 py-6">
              {regSubmitted ? (
                <div className="text-center py-4">
                  <div className="text-5xl mb-4">🎉</div>
                  <h3 className="text-xl font-black mb-2" style={{ color: "#1B2E8F", fontFamily: hf }}>{txt.reg.successTitle}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed mb-6">{txt.reg.successMsg}</p>
                  <button onClick={() => setShowRegModal(false)}
                    className="px-6 py-3 rounded-xl font-bold text-white transition-all hover:opacity-90"
                    style={{ backgroundColor: "#1B2E8F" }}>
                    {txt.reg.successBtn}
                  </button>
                </div>
              ) : (
                <form onSubmit={handleRegSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-gray-700">{txt.reg.fullName}</label>
                    <Input required value={regForm.fullName} onChange={e => setRegForm(f => ({ ...f, fullName: e.target.value }))} placeholder={txt.reg.placeholders.fullName} className="h-11" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-gray-700">{txt.reg.email}</label>
                    <Input required type="email" value={regForm.email} onChange={e => setRegForm(f => ({ ...f, email: e.target.value }))} placeholder={txt.reg.placeholders.email} className="h-11" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-gray-700">{txt.reg.phone}</label>
                      <Input required type="tel" value={regForm.phone} onChange={e => setRegForm(f => ({ ...f, phone: e.target.value }))} placeholder={txt.reg.placeholders.phone} className="h-11" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-gray-700">{txt.reg.whatsappPhone}</label>
                      <Input type="tel" value={regForm.whatsappPhone} onChange={e => setRegForm(f => ({ ...f, whatsappPhone: e.target.value }))} placeholder={txt.reg.placeholders.whatsappPhone} className="h-11" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-gray-700">{txt.reg.address}</label>
                    <Input value={regForm.address} onChange={e => setRegForm(f => ({ ...f, address: e.target.value }))} placeholder={txt.reg.placeholders.address} className="h-11" />
                  </div>
                  <button type="submit" disabled={regSubmitting}
                    className="w-full h-12 rounded-xl font-bold text-white transition-all hover:opacity-90 disabled:opacity-60 mt-2"
                    style={{ backgroundColor: "#1B2E8F" }}>
                    {regSubmitting ? (isAr ? "جاري الإرسال…" : "Sending…") : txt.reg.submit}
                  </button>
                  <p className="text-center text-xs text-muted-foreground">
                    {isAr ? "هل لديك حساب بالفعل؟" : "Already have an account?"}{" "}
                    <button type="button" onClick={() => { setShowRegModal(false); setLocation("/login"); }}
                      className="font-semibold underline" style={{ color: "#1B2E8F" }}>
                      {isAr ? "سجّل الدخول" : "Log in"}
                    </button>
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(24px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>
    </div>
  );
}
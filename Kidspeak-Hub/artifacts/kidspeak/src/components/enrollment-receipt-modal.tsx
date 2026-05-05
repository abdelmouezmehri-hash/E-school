import { useQuery } from "@tanstack/react-query";
import { useSettings } from "@workspace/api-client-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, X, GraduationCap, Users, UserCheck, Clock, CalendarDays } from "lucide-react";
import { format } from "date-fns";

const BRAND_BLUE   = "#1B2E8F";
const BRAND_YELLOW = "#F5A600";

// ── html escape ────────────────────────────────────────────────────────────────
function esc(s: string | null | undefined): string {
  if (!s) return "";
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// ── safe date format ───────────────────────────────────────────────────────────
function safeFmt(dateStr: string | null | undefined, locale: string): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleDateString(locale, { year: "numeric", month: "long", day: "numeric" });
  } catch { return String(dateStr); }
}

// ── currency ────────────────────────────────────────────────────────────────────
function fmtDZD(n: number): string {
  return (n ?? 0).toLocaleString("fr-DZ", { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + " د.ج";
}

// ── build A4 print HTML ────────────────────────────────────────────────────────
function buildPrintHtml(receipt: any, settings: any, isAr: boolean, scheduleStr: string | null): string {
  const dir  = isAr ? "rtl" : "ltr";
  const lbl  = (en: string, ar: string) => isAr ? ar : en;
  const loc  = isAr ? "ar-DZ" : "en-GB";

  const schoolName  = settings?.schoolName  ?? "Kidspeak Language Center";
  const schoolAddr  = settings?.address     ?? "";
  const schoolPhone = settings?.phone       ?? "";
  const logoFull    = settings?.logoUrl;
  const logoSrc     = logoFull ? `/api/storage/public-objects/${esc(logoFull)}` : null;

  const statusMap: Record<string, { en: string; ar: string; color: string }> = {
    paid:           { en: "Paid",           ar: "مدفوع",        color: "#16a34a" },
    partially_paid: { en: "Partially Paid", ar: "مدفوع جزئياً", color: "#d97706" },
    pending:        { en: "Pending",        ar: "قيد الانتظار", color: "#6b7280" },
    overdue:        { en: "Overdue",        ar: "متأخر",        color: "#dc2626" },
  };
  const st = statusMap[receipt.status] ?? { en: receipt.status, ar: receipt.status, color: "#6b7280" };

  const balanceColor = (receipt.balance ?? 0) > 0 ? "#dc2626" : "#16a34a";

  const issuedAt = safeFmt(receipt.issuedAt, loc);
  const dueDate  = safeFmt(receipt.dueDate,  loc);
  const paidAt   = safeFmt(receipt.paidAt,   loc);

  const levelLabel = receipt.levelName
    ? esc(`${receipt.levelName} — ${lbl("Tuition Fee", "رسوم التسجيل")}`)
    : lbl("Tuition Fee", "رسوم التسجيل");

  return `<!DOCTYPE html>
<html dir="${dir}" lang="${isAr ? "ar" : "en"}">
<head>
<meta charset="UTF-8">
<title>${lbl("Enrollment Receipt", "إيصال التسجيل")} — ${esc(receipt.receiptNumber)}</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap');
@page { size: A4 portrait; margin: 12mm 14mm; }
*, *::before, *::after { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
body {
  font-family: 'Cairo','Segoe UI',Tahoma,Arial,sans-serif;
  font-size: 11pt;
  color: #111;
  margin: 0; padding: 0;
  background: white;
  direction: ${dir};
}
.page { width: 100%; }

/* Header */
.hdr { display: flex; align-items: center; justify-content: space-between; padding: 10px 16px; border-bottom: 4px solid ${BRAND_YELLOW}; }
.hdr-name { font-weight: 900; font-size: 15pt; color: ${BRAND_BLUE}; }
.hdr-sub  { font-size: 8.5pt; color: #555; margin-top: 2px; }
.logo img { max-height: 54px; max-width: 140px; object-fit: contain; }
.logo-txt { font-weight: 900; font-size: 22pt; color: ${BRAND_BLUE}; }
.logo-txt span { color: ${BRAND_YELLOW}; }

/* Type bar */
.type-bar { display: flex; align-items: center; justify-content: space-between; background: #f8fafc; padding: 5px 16px; border-bottom: 2px solid #e2e8f0; margin-top: 8px; }
.type-bar-lbl { font-size: 7.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: ${BRAND_BLUE}; }
.rnum { background: ${BRAND_BLUE}; color: white; font-size: 8.5pt; font-weight: 700; padding: 2px 10px; border-radius: 20px; }
.rnum-lbl { font-size: 8pt; color: #555; font-weight: 500; margin-inline-end: 6px; }

/* Meta */
.meta { display: flex; justify-content: space-between; align-items: flex-start; padding: 10px 16px 6px; }
.meta-block { }
.meta-label { font-size: 7pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: ${BRAND_BLUE}; border-bottom: 2px solid ${BRAND_YELLOW}; padding-bottom: 2px; margin-bottom: 4px; }
.meta-value { font-weight: 600; font-size: 10pt; }
.meta-sub   { font-size: 8pt; color: #666; margin-top: 2px; }
.status-badge { display: inline-block; font-size: 8.5pt; font-weight: 700; padding: 2px 10px; border-radius: 20px; background: ${st.color}18; color: ${st.color}; border: 1px solid ${st.color}30; }

/* Section */
.sec { margin: 8px 0 4px; padding: 0 16px; }
.sec-hdr { font-size: 8pt; font-weight: 900; text-transform: uppercase; letter-spacing: 0.08em; color: ${BRAND_BLUE}; margin-bottom: 5px; }

/* Table */
.tbl { width: 100%; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; border-collapse: collapse; }
.th  { display: flex; padding: 6px 12px; background: ${BRAND_BLUE}; color: white; font-size: 7.5pt; font-weight: 700; text-transform: uppercase; }
.tr  { display: flex; padding: 7px 12px; border-bottom: 1px solid #f1f5f9; font-size: 9.5pt; background: white; }
.tr:last-child { border-bottom: none; }
.tr.alt { background: #f8fafc; }
.cl { flex: 1; color: #555; font-weight: 500; }
.cr { font-weight: 600; color: #111; text-align: end; }
.cr.green { color: #16a34a; }
.cr.red   { color: #dc2626; }
.cr.amber { color: #b45309; font-style: italic; }
.cr.bold  { font-weight: 900; }
.tr.balance { font-weight: 900; font-size: 10.5pt; color: ${balanceColor}; border-top: 2px solid #e2e8f0; background: #fafafa; }

/* Signature */
.sigs { display: flex; gap: 12px; padding: 6px 16px; margin-top: 8px; }
.sig  { flex: 1; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 12px; }
.sig-lbl  { font-size: 7.5pt; font-weight: 700; text-transform: uppercase; color: ${BRAND_BLUE}; margin-bottom: 30px; }
.sig-line { border-bottom: 2px dashed #ccc; }

/* Footer */
.footer { margin: 10px 16px 0; background: #f0f4ff; border: 1px solid #c7d2fe; border-radius: 8px; padding: 8px 16px; text-align: center; }
.footer-ar { font-size: 10pt; font-weight: 700; color: ${BRAND_BLUE}; direction: rtl; }
.footer-en { font-size: 8.5pt; font-weight: 500; color: #444; }
.footer-ct { font-size: 7.5pt; color: #888; margin-top: 2px; }

/* Notes */
.notes { margin: 8px 16px 0; font-size: 8.5pt; color: #555; font-style: italic; border-${isAr ? "right" : "left"}: 3px solid ${BRAND_YELLOW}; padding-${isAr ? "right" : "left"}: 10px; }
</style>
</head>
<body>
<div class="page">

  <div class="hdr">
    <div>
      <div class="hdr-name">${esc(schoolName)}</div>
      ${schoolAddr  ? `<div class="hdr-sub">${esc(schoolAddr)}</div>` : ""}
      ${schoolPhone ? `<div class="hdr-sub">📞 ${esc(schoolPhone)}</div>` : ""}
    </div>
    <div class="logo">
      ${logoSrc
        ? `<img src="${logoSrc}" alt="logo" />`
        : `<div class="logo-txt">kid<span>speak</span></div>`}
    </div>
  </div>

  <div class="type-bar">
    <span class="type-bar-lbl">${lbl("Enrollment Receipt", "إيصال التسجيل")}</span>
    <div>
      <span class="rnum-lbl">${lbl("Receipt No.", "رقم الإيصال")}</span>
      <span class="rnum">${esc(receipt.receiptNumber)}</span>
    </div>
  </div>

  <div class="meta">
    <div class="meta-block">
      <div class="meta-label">${lbl("Date Issued", "تاريخ الإصدار")}</div>
      <div class="meta-value">${issuedAt}</div>
      ${dueDate ? `<div class="meta-sub">${lbl("Due:", "تاريخ الاستحقاق:")} ${dueDate}</div>` : ""}
    </div>
    <div class="meta-block" style="text-align:end">
      <div class="meta-label">${lbl("Status", "الحالة")}</div>
      <span class="status-badge">${isAr ? st.ar : st.en}</span>
    </div>
  </div>

  <div class="sec">
    <div class="sec-hdr">📋 ${lbl("Enrollment Details", "تفاصيل التسجيل")}</div>
    <div class="tbl">
      <div class="th"><span class="cl">${lbl("Field", "الحقل")}</span><span class="cr">${lbl("Details", "التفاصيل")}</span></div>
      <div class="tr">      <span class="cl">${lbl("Pupil Name", "اسم التلميذ")}</span>            <span class="cr">${esc(receipt.studentName)}</span></div>
      ${receipt.parentName ? `<div class="tr alt"><span class="cl">${lbl("Parent / Guardian", "ولي الأمر")}</span><span class="cr">${esc(receipt.parentName)}</span></div>` : ""}
      <div class="tr ${receipt.parentName ? "" : "alt"}">  <span class="cl">${lbl("Level", "المستوى")}</span>              <span class="cr ${receipt.levelName ? "" : "amber"}">${receipt.levelName ? esc(receipt.levelName) : lbl("Pending", "قيد التعيين")}</span></div>
      <div class="tr alt"><span class="cl">${lbl("Assigned Group", "الفوج")}</span>        <span class="cr ${receipt.groupName   ? "" : "amber"}">${receipt.groupName   ? esc(receipt.groupName)   : lbl("Pending Assignment", "قيد التعيين")}</span></div>
      <div class="tr">      <span class="cl">${lbl("Teacher", "الأستاذ المسير")}</span>          <span class="cr ${receipt.teacherName ? "" : "amber"}">${receipt.teacherName ? esc(receipt.teacherName) : lbl("To be assigned", "سيتحدد لاحقاً")}</span></div>
      <div class="tr alt"><span class="cl">${lbl("Schedule", "التوقيت والأيام")}</span>       <span class="cr bold ${scheduleStr ? "" : "amber"}">${scheduleStr ? esc(scheduleStr) : lbl("Pending Class Schedule", "سيتحدد الجدول لاحقاً")}</span></div>
    </div>
  </div>

  <div class="sec">
    <div class="sec-hdr">💰 ${lbl("Financial Summary", "الملخص المالي")}</div>
    <div class="tbl">
      <div class="th"><span class="cl">${lbl("Item", "البند")}</span><span class="cr">${lbl("Amount (DZD)", "المبلغ (د.ج)")}</span></div>
      <div class="tr">      <span class="cl">${levelLabel}</span>    <span class="cr">${fmtDZD(receipt.amountDue)}</span></div>
      ${receipt.discount > 0 ? `<div class="tr alt"><span class="cl">${lbl("Discount", "تخفيض")}</span><span class="cr red">− ${fmtDZD(receipt.discount)}</span></div>` : ""}
      ${receipt.discount > 0 ? `<div class="tr"><span class="cl">${lbl("Net Total", "المجموع بعد التخفيض")}</span><span class="cr bold">${fmtDZD(receipt.netTotal)}</span></div>` : ""}
      <div class="tr alt"><span class="cl">${lbl("Amount Paid", "المبلغ المدفوع")}</span><span class="cr green">${fmtDZD(receipt.amountPaid)}</span></div>
      ${paidAt ? `<div class="tr"><span class="cl">${lbl("Payment Date", "تاريخ الدفع")}</span><span class="cr">${paidAt}</span></div>` : ""}
      <div class="tr balance"><span class="cl">${lbl("Remaining Balance", "الرصيد المتبقي")}</span><span class="cr bold">${fmtDZD(receipt.balance)}</span></div>
    </div>
  </div>

  <div class="sigs">
    <div class="sig">
      <div class="sig-lbl">${lbl("Parent Signature", "توقيع ولي الأمر")}</div>
      <div class="sig-line"></div>
    </div>
    <div class="sig">
      <div class="sig-lbl">${lbl("Authorized Signature & Stamp", "ختم وتوقيع الإدارة")}</div>
      <div class="sig-line"></div>
    </div>
  </div>

  <div class="footer">
    <div class="footer-ar">كيدسبيك — حيث تبدأ الطلاقة</div>
    <div class="footer-en">Kidspeak Language Center — Where Fluency Begins</div>
    ${(schoolAddr || schoolPhone) ? `<div class="footer-ct">${esc([schoolAddr, schoolPhone].filter(Boolean).join(" • "))}</div>` : ""}
  </div>

  ${receipt.notes ? `<div class="notes">${esc(receipt.notes)}</div>` : ""}

</div>
</body>
</html>`;
}

// ── print trigger ──────────────────────────────────────────────────────────────
function openPrintWindow(receipt: any, settings: any, isAr: boolean, scheduleStr: string | null) {
  const html = buildPrintHtml(receipt, settings, isAr, scheduleStr);
  const win = window.open("", "_blank", "width=794,height=1123,scrollbars=yes");
  if (!win) return;
  win.document.open();
  win.document.write(html);
  win.document.close();
  win.focus();
  // Wait for fonts/images to load before printing
  setTimeout(() => {
    win.print();
    // Don't auto-close so user can re-print if needed
  }, 800);
}

// ── row helper (modal preview) ─────────────────────────────────────────────────
function Row({ label, value, valueClass = "", pending = false }: { label: string; value: React.ReactNode; valueClass?: string; pending?: boolean }) {
  return (
    <div className="grid grid-cols-2 px-4 py-2 border-b border-gray-100 text-sm last:border-0">
      <span className="text-gray-500 font-medium">{label}</span>
      <span className={`font-semibold text-end ${pending ? "text-amber-700 italic" : "text-gray-900"} ${valueClass}`}>
        {value ?? "—"}
      </span>
    </div>
  );
}

// ── status badge ───────────────────────────────────────────────────────────────
function StatusBadge({ status, isAr }: { status: string; isAr: boolean }) {
  const map: Record<string, { en: string; ar: string; color: string }> = {
    paid:           { en: "Paid",           ar: "مدفوع",        color: "#16a34a" },
    partially_paid: { en: "Partially Paid", ar: "مدفوع جزئياً", color: "#d97706" },
    pending:        { en: "Pending",        ar: "قيد الانتظار", color: "#6b7280" },
    overdue:        { en: "Overdue",        ar: "متأخر",        color: "#dc2626" },
  };
  const e = map[status] ?? { en: status, ar: status, color: "#6b7280" };
  return (
    <span className="text-xs font-bold px-2.5 py-1 rounded-full"
      style={{ backgroundColor: e.color + "18", color: e.color, border: `1px solid ${e.color}30` }}>
      {isAr ? e.ar : e.en}
    </span>
  );
}

// ── the modal ──────────────────────────────────────────────────────────────────
interface EnrollmentReceiptModalProps {
  paymentId: number;
  onClose: () => void;
  isAr: boolean;
}

export function EnrollmentReceiptModal({ paymentId, onClose, isAr }: EnrollmentReceiptModalProps) {
  const { data: receipt, isLoading } = useQuery<any>({
    queryKey: ["enrollment-receipt", paymentId],
    queryFn: async () => {
      const res = await fetch(`/api/payments/${paymentId}/enrollment-receipt`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load receipt");
      return res.json();
    },
    enabled: paymentId > 0,
  });

  const { data: settings } = useSettings();

  const lbl = (en: string, ar: string) => isAr ? ar : en;
  const dir = isAr ? "rtl" : "ltr";

  const schoolName  = (settings as any)?.schoolName  ?? "Kidspeak Language Center";
  const logoWhite   = (settings as any)?.logoWhiteUrl;

  const scheduleStr = (() => {
    if (!receipt) return null;
    const parts: string[] = [];
    if (receipt.recurringDays)      parts.push(receipt.recurringDays);
    if (receipt.sessionStartTime)   parts.push(receipt.sessionStartTime);
    if (receipt.sessionDurationMins) parts.push(`(${receipt.sessionDurationMins} ${lbl("min", "دقيقة")})`);
    if (receipt.schedule && !parts.length) parts.push(receipt.schedule);
    return parts.length ? parts.join("  •  ") : null;
  })();

  const safeDate = (d: string | null | undefined) => {
    if (!d) return null;
    try {
      const dt = new Date(d);
      if (isNaN(dt.getTime())) return null;
      return format(dt, "MMMM d, yyyy");
    } catch { return null; }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="p-0 overflow-hidden w-full max-w-2xl flex flex-col"
        style={{ maxHeight: "90vh" }}
        dir={dir}
      >
        {/* ── Action bar ── */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30 shrink-0">
          <DialogTitle className="text-base font-semibold">
            {lbl("Enrollment Receipt", "إيصال التسجيل")}
          </DialogTitle>
          <div className="flex items-center gap-2">
            {!isLoading && receipt && (
              <Button
                size="sm"
                onClick={() => openPrintWindow(receipt, settings, isAr, scheduleStr)}
                style={{ backgroundColor: BRAND_BLUE, color: "white" }}
                className="font-semibold gap-1.5"
              >
                <Printer className="w-4 h-4" />
                {lbl("Print", "طباعة")}
              </Button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Scrollable content ── */}
        <div className="overflow-y-auto flex-1">
          {isLoading ? (
            <div className="py-16 text-center text-muted-foreground text-sm">
              {lbl("Generating receipt…", "جاري إنشاء الإيصال…")}
            </div>
          ) : !receipt ? (
            <div className="py-16 text-center text-destructive text-sm">
              {lbl("Failed to load receipt.", "تعذّر تحميل الإيصال.")}
            </div>
          ) : (
            <div className="bg-white text-black" style={{ fontFamily: "'Cairo','Segoe UI',Tahoma,Arial,sans-serif" }}>

              {/* ── Header ── */}
              <div className="flex items-center justify-between px-6 py-4"
                style={{ backgroundColor: BRAND_BLUE }}>
                <div>
                  <div className="text-white font-bold text-base leading-tight">{schoolName}</div>
                  <div className="text-sm mt-0.5" style={{ color: BRAND_YELLOW }}>
                    {lbl("Enrollment & Payment Receipt", "إيصال التسجيل والدفع")}
                  </div>
                </div>
                {logoWhite
                  ? <img src={`/api/storage/public-objects/${logoWhite}`} alt="Logo" className="h-10 w-auto object-contain" style={{ maxWidth: 140 }} />
                  : <div className="text-white font-black text-2xl">kid<span style={{ color: BRAND_YELLOW }}>speak</span></div>
                }
              </div>

              {/* ── Receipt type bar ── */}
              <div className="px-6 py-2.5 flex items-center justify-between"
                style={{ backgroundColor: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                <span className="text-xs font-bold uppercase tracking-widest" style={{ color: BRAND_BLUE }}>
                  {lbl("Enrollment Receipt", "إيصال التسجيل")}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 font-medium">{lbl("Receipt No.", "رقم الإيصال")}</span>
                  <span className="text-sm font-bold px-3 py-0.5 rounded-full" style={{ backgroundColor: BRAND_BLUE, color: "white" }}>
                    {receipt.receiptNumber}
                  </span>
                </div>
              </div>

              <div className="px-6 py-5 space-y-5">

                {/* ── Date + Status ── */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider mb-1.5 pb-1 border-b" style={{ color: BRAND_BLUE, borderColor: BRAND_YELLOW }}>
                      {lbl("Date Issued", "تاريخ الإصدار")}
                    </div>
                    <div className="font-semibold text-gray-800 text-sm">{safeDate(receipt.issuedAt) ?? "—"}</div>
                    {receipt.dueDate && (
                      <div className="text-xs text-gray-500 mt-1">
                        {lbl("Due:", "تاريخ الاستحقاق:")} {safeDate(receipt.dueDate)}
                      </div>
                    )}
                  </div>
                  <div className="text-end">
                    <div className="text-xs font-bold uppercase tracking-wider mb-1.5 pb-1 border-b" style={{ color: BRAND_BLUE, borderColor: BRAND_YELLOW }}>
                      {lbl("Status", "الحالة")}
                    </div>
                    <StatusBadge status={receipt.status} isAr={isAr} />
                  </div>
                </div>

                {/* ══ Section A: Enrollment Details ══ */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <GraduationCap className="w-4 h-4" style={{ color: BRAND_BLUE }} />
                    <h3 className="text-xs font-black uppercase tracking-wider" style={{ color: BRAND_BLUE }}>
                      {lbl("Enrollment Details", "تفاصيل التسجيل")}
                    </h3>
                  </div>
                  <div className="rounded-lg overflow-hidden border border-gray-200">
                    <div className="grid grid-cols-2 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white"
                      style={{ backgroundColor: BRAND_BLUE }}>
                      <span>{lbl("Field", "الحقل")}</span>
                      <span className="text-end">{lbl("Details", "التفاصيل")}</span>
                    </div>
                    <div className="divide-y divide-gray-100 bg-white">
                      <Row label={lbl("Pupil Name", "اسم التلميذ")} value={receipt.studentName} />
                      {receipt.parentName && (
                        <Row label={lbl("Parent / Guardian", "ولي الأمر")} value={receipt.parentName} />
                      )}
                      <Row label={lbl("Level", "المستوى")} value={receipt.levelName ?? lbl("—", "—")} pending={!receipt.levelName} />
                      <div className="grid grid-cols-2 px-4 py-2 border-b border-gray-100 text-sm">
                        <span className="text-gray-500 font-medium flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 shrink-0" style={{ color: BRAND_BLUE }} />
                          {lbl("Assigned Group", "الفوج")}
                        </span>
                        <span className={`font-semibold text-end ${receipt.groupName ? "text-gray-900" : "text-amber-700 italic"}`}>
                          {receipt.groupName ?? lbl("Pending Assignment", "قيد التعيين")}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 px-4 py-2 border-b border-gray-100 text-sm">
                        <span className="text-gray-500 font-medium flex items-center gap-1.5">
                          <UserCheck className="w-3.5 h-3.5 shrink-0" style={{ color: BRAND_BLUE }} />
                          {lbl("Teacher", "الأستاذ المسير")}
                        </span>
                        <span className={`font-semibold text-end ${receipt.teacherName ? "text-gray-900" : "text-amber-700 italic"}`}>
                          {receipt.teacherName ?? lbl("To be assigned", "سيتحدد لاحقاً")}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 px-4 py-2 text-sm">
                        <span className="text-gray-500 font-medium flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 shrink-0" style={{ color: BRAND_BLUE }} />
                          {lbl("Schedule", "التوقيت والأيام")}
                        </span>
                        {scheduleStr ? (
                          <span className="font-semibold text-gray-900 text-end text-xs leading-relaxed">{scheduleStr}</span>
                        ) : (
                          <span className="font-semibold text-end text-amber-700 italic text-xs">
                            {lbl("Pending Class Schedule", "سيتحدد الجدول لاحقاً")}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* ══ Section B: Financial Summary ══ */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <CalendarDays className="w-4 h-4" style={{ color: BRAND_BLUE }} />
                    <h3 className="text-xs font-black uppercase tracking-wider" style={{ color: BRAND_BLUE }}>
                      {lbl("Financial Summary", "الملخص المالي")}
                    </h3>
                  </div>
                  <div className="rounded-lg overflow-hidden border border-gray-200">
                    <div className="grid grid-cols-2 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white"
                      style={{ backgroundColor: BRAND_BLUE }}>
                      <span>{lbl("Item", "البند")}</span>
                      <span className="text-end">{lbl("Amount (DZD)", "المبلغ (د.ج)")}</span>
                    </div>
                    <div className="bg-gray-50 divide-y divide-gray-100">
                      <Row
                        label={receipt.levelName ? `${receipt.levelName} — ${lbl("Tuition Fee", "رسوم التسجيل")}` : lbl("Tuition Fee", "رسوم التسجيل")}
                        value={fmtDZD(receipt.amountDue)}
                      />
                      {receipt.discount > 0 && (
                        <Row label={lbl("Discount", "تخفيض")} value={"− " + fmtDZD(receipt.discount)} valueClass="text-red-600" />
                      )}
                      {receipt.discount > 0 && (
                        <Row label={lbl("Net Total", "المجموع بعد التخفيض")} value={fmtDZD(receipt.netTotal)} valueClass="font-black" />
                      )}
                      <Row label={lbl("Amount Paid", "المبلغ المدفوع")} value={fmtDZD(receipt.amountPaid)} valueClass="text-emerald-700" />
                      {receipt.paidAt && (
                        <Row label={lbl("Payment Date", "تاريخ الدفع")} value={safeDate(receipt.paidAt) ?? "—"} />
                      )}
                      <div className="grid grid-cols-2 px-4 py-3 text-sm font-black"
                        style={{ color: (receipt.balance ?? 0) > 0 ? "#dc2626" : "#16a34a" }}>
                        <span>{lbl("Remaining Balance", "الرصيد المتبقي")}</span>
                        <span className="text-end">{fmtDZD(receipt.balance)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ══ Signature & Stamp ══ */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-gray-200 p-3">
                    <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: BRAND_BLUE }}>
                      {lbl("Parent Signature", "توقيع ولي الأمر")}
                    </div>
                    <div className="border-b-2 border-dashed border-gray-300 mt-5 min-h-[32px]" />
                  </div>
                  <div className="rounded-lg border border-gray-200 p-3">
                    <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: BRAND_BLUE }}>
                      {lbl("Authorized Signature & Stamp", "ختم وتوقيع الإدارة")}
                    </div>
                    <div className="border-b-2 border-dashed border-gray-300 mt-5 min-h-[32px]" />
                  </div>
                </div>

                {/* ══ Footer ══ */}
                <div className="rounded-lg px-5 py-3 text-center space-y-0.5"
                  style={{ backgroundColor: "#f0f4ff", border: "1px solid #c7d2fe" }}>
                  <div className="text-sm font-bold" style={{ color: BRAND_BLUE, direction: "rtl" }}>
                    كيدسبيك — حيث تبدأ الطلاقة
                  </div>
                  <div className="text-sm font-medium text-gray-600">
                    Kidspeak Language Center — Where Fluency Begins
                  </div>
                  {((settings as any)?.address || (settings as any)?.phone) && (
                    <div className="text-xs text-gray-400">
                      {[(settings as any)?.address, (settings as any)?.phone].filter(Boolean).join("  •  ")}
                    </div>
                  )}
                </div>

                {receipt.notes && (
                  <div className="text-sm text-gray-500 italic border-s-2 ps-3" style={{ borderColor: BRAND_YELLOW }}>
                    {receipt.notes}
                  </div>
                )}

              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
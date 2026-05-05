import { useState } from "react";
import {
  useListPayments,
  useGetReceipt,
  useGetMe,
  useListExpenses,
  useCreateExpense,
  useDeleteExpense,
  useListTransactions,
  useAddTransaction,
  useDeleteTransaction,
  useGetTransactionReceipt,
  useGetDebtSummary,
  useListPaymentEdits,
  useUpdatePayment,
} from "@workspace/api-client-react";
import { EnrollmentReceiptModal } from "@/components/enrollment-receipt-modal";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";

function safeFmt(dateStr: string | null | undefined, fmt: string): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return String(dateStr);
  return format(d, fmt);
}
import {
  Search, Printer, X, ChevronDown, ChevronUp, Plus, Banknote, Building2,
  FileText, TrendingDown, AlertCircle, CalendarDays, Trash2, Receipt,
  Pencil, History,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ListPaymentsStatus } from "@workspace/api-client-react/src/generated/api.schemas";
import { useLanguage } from "@/contexts/language-context";

const BRAND_BLUE = "#1B2E8F";
const BRAND_YELLOW = "#F5A600";

const METHOD_ICONS: Record<string, React.ReactNode> = {
  cash: <Banknote className="w-3.5 h-3.5" />,
  bank_transfer: <Building2 className="w-3.5 h-3.5" />,
  cheque: <FileText className="w-3.5 h-3.5" />,
  online: <Receipt className="w-3.5 h-3.5" />,
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function getStatusColor(status: string) {
  switch (status) {
    case "paid": return "bg-emerald-500/15 text-emerald-700 border-emerald-500/20";
    case "partially_paid": return "bg-amber-500/15 text-amber-700 border-amber-500/20";
    case "overdue": return "bg-red-500/15 text-red-700 border-red-500/20";
    default: return "bg-slate-500/15 text-slate-700 border-slate-500/20";
  }
}

// ── Print helpers ─────────────────────────────────────────────────────────────

function injectPrintStyles() {
  const existing = document.getElementById("ks-invoice-print-style");
  if (existing) existing.remove();

  const style = document.createElement("style");
  style.id = "ks-invoice-print-style";
  style.innerHTML = `
    @media print {
      @page { size: A4 portrait; margin: 10mm 13mm; }
      html, body {
        height: auto !important; overflow: visible !important; background: white !important;
        font-family: 'Cairo', 'Segoe UI', Tahoma, Arial, sans-serif !important;
      }
      body > #root { display: none !important; }
      [data-radix-dialog-overlay] { display: none !important; background: none !important; }
      [data-radix-dialog-content] {
        position: static !important; transform: none !important;
        max-width: 100% !important; width: 100% !important;
        height: auto !important; border: none !important; box-shadow: none !important;
        border-radius: 0 !important; overflow: visible !important;
        padding: 0 !important; margin: 0 !important; top: 0 !important; left: 0 !important;
      }
      .invoice-print-hide { display: none !important; }
      .digital-only { display: none !important; }
      .print-only { display: flex !important; }
      * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    }
    .print-only { display: none; }
  `;
  document.head.appendChild(style);
  setTimeout(() => {
    window.print();
    setTimeout(() => {
      const el = document.getElementById("ks-invoice-print-style");
      if (el) document.head.removeChild(el);
    }, 600);
  }, 250);
}

// ── Transaction Receipt Modal ─────────────────────────────────────────────────

function TransactionReceiptModal({ txId, onClose, t, isRTL }: { txId: number; onClose: () => void; t: any; isRTL: boolean }) {
  const pt = t.payments;
  const { data: receipt, isLoading } = useGetTransactionReceipt(txId, { enabled: txId > 0 });

  const methodLabel = (m: string) => ({ cash: pt.paymentMethodCash, bank_transfer: pt.paymentMethodBankTransfer, cheque: pt.paymentMethodCheque, online: pt.paymentMethodOnline })[m] ?? m;
  const al = isRTL ? "text-start" : "text-end";
  const discount = (receipt as any)?.discount ?? 0;
  const netTotal = (receipt as any)?.netTotal ?? (receipt as any)?.amountDue ?? 0;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="p-0 overflow-hidden w-full max-w-2xl invoice-body" dir={isRTL ? "rtl" : "ltr"}>
        <div className="invoice-print-hide flex items-center justify-between px-5 py-3 border-b bg-muted/30">
          <DialogTitle className="text-base font-semibold">{pt.transactionReceipt}</DialogTitle>
          <div className="flex items-center gap-2">
            {!isLoading && receipt && (
              <Button size="sm" onClick={injectPrintStyles} style={{ backgroundColor: BRAND_BLUE, color: "white" }} className="font-semibold gap-1.5">
                <Printer className="w-4 h-4" />{pt.printReceipt}
              </Button>
            )}
            <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground"><X className="w-4 h-4" /></button>
          </div>
        </div>

        {isLoading ? (
          <div className="py-16 text-center text-muted-foreground">{pt.generatingReceipt}</div>
        ) : !receipt ? (
          <div className="py-16 text-center text-destructive">{pt.failedToLoadReceipt}</div>
        ) : (
          <div className="bg-white text-black" style={{ fontFamily: "'Cairo', 'Segoe UI', Tahoma, Arial, sans-serif" }}>

            {/* DIGITAL ONLY: Blue branded header */}
            <div className="digital-only flex items-center justify-between px-8 py-5" style={{ backgroundColor: BRAND_BLUE, minHeight: "80px" }}>
              <div>
                <div className="text-white font-bold text-base leading-tight">{pt.institutionName}</div>
                <div className="text-sm mt-0.5" style={{ color: BRAND_YELLOW }}>{pt.institutionTagline}</div>
              </div>
              <img src="/logo_white.png" alt="Kidspeak" className="h-10 w-auto object-contain" style={{ maxWidth: "160px" }} />
            </div>

            {/* PRINT ONLY: Professional white header */}
            <div className="print-only flex-row items-center justify-between px-8 py-5 border-b-4" style={{ borderColor: BRAND_YELLOW }}>
              <div>
                <div className="font-black text-xl leading-tight" style={{ color: BRAND_BLUE }}>{pt.institutionName}</div>
                <div className="text-sm text-gray-600 mt-0.5">{pt.schoolAddress}</div>
                <div className="text-sm text-gray-600">{pt.schoolPhone}</div>
              </div>
              <img src="/logo-full.png" alt="Kidspeak" className="h-16 w-auto object-contain" style={{ maxWidth: "180px" }} />
            </div>

            {/* Receipt label row */}
            <div className="px-8 py-3 flex items-center justify-between" style={{ backgroundColor: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
              <span className="text-xs font-bold uppercase tracking-widest" style={{ color: BRAND_BLUE }}>{pt.transactionReceipt}</span>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-500 font-medium">{pt.receiptNumber}</span>
                <span className="text-sm font-bold px-3 py-1 rounded-full" style={{ backgroundColor: BRAND_BLUE, color: "white" }}>{receipt.receiptNumber}</span>
              </div>
            </div>

            <div className="px-8 py-6 space-y-5">
              {/* Student info + Date */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider mb-2 pb-1 border-b" style={{ color: BRAND_BLUE, borderColor: BRAND_YELLOW }}>{pt.billTo}</div>
                  <div className="font-bold text-base text-gray-900">{receipt.studentName}</div>
                  {receipt.parentName && <div className="text-sm text-gray-600"><span className="font-medium">{pt.parentGuardian}: </span>{receipt.parentName}</div>}
                  {receipt.levelName && <div className="text-sm text-gray-600">Level: {receipt.levelName}</div>}
                </div>
                <div className={al}>
                  <div className="text-xs font-bold uppercase tracking-wider mb-2 pb-1 border-b" style={{ color: BRAND_BLUE, borderColor: BRAND_YELLOW }}>{pt.dateIssued}</div>
                  <div className="font-semibold text-gray-800">{safeFmt(receipt.issuedAt, "MMMM d, yyyy")}</div>
                  {receipt.transactionDate && <div className="text-xs text-gray-500 mt-1">{pt.transactionDate}: {safeFmt(receipt.transactionDate, "MMM d, yyyy")}</div>}
                </div>
              </div>

              {/* Financial table */}
              <div className="rounded-xl overflow-hidden border border-gray-200">
                <div className="grid grid-cols-2 px-5 py-3 text-xs font-bold uppercase tracking-wider text-white" style={{ backgroundColor: BRAND_BLUE }}>
                  <span>{pt.description}</span>
                  <span className={al}>{pt.amount}</span>
                </div>
                <div className="grid grid-cols-2 px-5 py-4 border-b border-gray-100 bg-white">
                  <div className="font-medium text-gray-900">{receipt.levelName ? `${receipt.levelName} — ${pt.enrollmentFee}` : pt.enrollmentFee}</div>
                  <div className={`font-semibold text-gray-900 ${al}`}>{t.currency.formatFixed(receipt.amountDue)}</div>
                </div>
                <div className="bg-gray-50 divide-y divide-gray-100">
                  <div className="grid grid-cols-2 px-5 py-2.5 text-sm">
                    <span className="text-gray-600 font-medium">{pt.originalPrice}</span>
                    <span className={al}>{t.currency.formatFixed(receipt.amountDue)}</span>
                  </div>
                  {discount > 0 && (
                    <div className="grid grid-cols-2 px-5 py-2.5 text-sm" style={{ color: "#dc2626" }}>
                      <span className="font-medium">↓ {pt.discount}</span>
                      <span className={`font-semibold ${al}`}>− {t.currency.formatFixed(discount)}</span>
                    </div>
                  )}
                  {discount > 0 && (
                    <div className="grid grid-cols-2 px-5 py-2.5 text-sm font-semibold" style={{ color: BRAND_BLUE, borderTop: `2px solid ${BRAND_YELLOW}` }}>
                      <span>{pt.netTotal}</span>
                      <span className={al}>{t.currency.formatFixed(netTotal)}</span>
                    </div>
                  )}
                  <div className="grid grid-cols-2 px-5 py-2.5 text-sm text-emerald-700 font-semibold">
                    <span>{pt.transactionAmount}</span>
                    <span className={al}>− {t.currency.formatFixed(receipt.transactionAmount)}</span>
                  </div>
                  <div className="grid grid-cols-2 px-5 py-2.5 text-sm text-gray-500">
                    <span>{pt.amountPaid} ({pt.transactionHistory})</span>
                    <span className={al}>{t.currency.formatFixed(receipt.totalPaid)}</span>
                  </div>
                  <div className="grid grid-cols-2 px-5 py-3 font-bold text-base" style={{ color: receipt.balance > 0 ? "#dc2626" : "#16a34a" }}>
                    <span>{pt.remainingBalance}</span>
                    <span className={al}>{t.currency.formatFixed(receipt.balance)}</span>
                  </div>
                </div>
              </div>

              {/* Payment method + Signature */}
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg p-4 border border-gray-200">
                  <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: BRAND_BLUE }}>{pt.paymentMethodTitle}</div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                    <Banknote className="w-4 h-4" style={{ color: BRAND_BLUE }} />
                    <span>{methodLabel(receipt.paymentMethod)}</span>
                  </div>
                </div>
                <div className="rounded-lg p-4 border border-gray-200 flex flex-col">
                  <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: BRAND_BLUE }}>{pt.authorizedSignature}</div>
                  <div className="flex-1 border-b-2 border-dashed border-gray-300 mt-3 min-h-[32px]" />
                </div>
              </div>

              {receipt.notes && (
                <div className="text-sm text-gray-500 italic border-s-2 ps-3" style={{ borderColor: BRAND_YELLOW }}>{receipt.notes}</div>
              )}

              {/* Footer */}
              <div className="rounded-xl px-6 py-4 text-center space-y-1" style={{ backgroundColor: "#f0f4ff", border: `1px solid #c7d2fe` }}>
                <div className="text-sm font-bold" style={{ color: BRAND_BLUE, direction: "rtl" }}>{pt.schoolSlogan}</div>
                <div className="text-sm font-medium text-gray-600">{pt.footerThankYouEn}</div>
                <div className="text-xs text-gray-400">{pt.footerContact}</div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Add Transaction Modal ─────────────────────────────────────────────────────

function AddTransactionModal({ paymentId, amountDue, amountPaid, currentDiscount, onClose, t }: {
  paymentId: number; amountDue: number; amountPaid: number; currentDiscount: number; onClose: () => void; t: any;
}) {
  const pt = t.payments;
  const { toast } = useToast();
  const { mutate: addTx, isPending } = useAddTransaction();

  const [form, setForm] = useState({
    amount: "",
    discount: currentDiscount > 0 ? String(currentDiscount) : "",
    paymentMethod: "cash" as "cash" | "bank_transfer" | "cheque" | "online",
    transactionDate: new Date().toISOString().split("T")[0],
    notes: "",
  });

  const discountVal = Math.max(0, parseFloat(form.discount) || 0);
  const netTotal = Math.max(0, amountDue - discountVal);
  const alreadyPaid = amountPaid;
  const remaining = Math.max(0, netTotal - alreadyPaid);

  // Auto-fill the remaining when user hasn't typed amount yet
  const handleDiscountChange = (val: string) => {
    const d = Math.max(0, parseFloat(val) || 0);
    const newNet = Math.max(0, amountDue - d);
    const newRem = Math.max(0, newNet - alreadyPaid);
    setForm(f => ({ ...f, discount: val, amount: f.amount || String(newRem > 0 ? newRem : "") }));
  };

  const handleSubmit = () => {
    const amt = parseFloat(form.amount);
    if (!amt || amt <= 0) {
      toast({ title: "Error", description: "Enter a valid amount.", variant: "destructive" });
      return;
    }
    const body: any = { amount: amt, paymentMethod: form.paymentMethod, transactionDate: form.transactionDate, notes: form.notes.trim() || undefined };
    if (form.discount !== "") body.discount = discountVal;
    addTx(
      { paymentId, data: body },
      {
        onSuccess: () => { toast({ title: pt.paymentAdded }); onClose(); },
        onError: () => toast({ title: "Error", description: "Failed to record payment.", variant: "destructive" }),
      }
    );
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" style={{ color: BRAND_YELLOW }} />
            {pt.addTransaction}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Live calculation breakdown */}
          <div className="rounded-lg p-3 space-y-1.5 text-sm" style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0" }}>
            <div className="flex justify-between">
              <span className="text-gray-500">{pt.originalPrice}</span>
              <span className="font-medium">{t.currency.formatFixed(amountDue)}</span>
            </div>
            {discountVal > 0 && (
              <div className="flex justify-between" style={{ color: "#dc2626" }}>
                <span>↓ {pt.discount}</span>
                <span className="font-semibold">− {t.currency.formatFixed(discountVal)}</span>
              </div>
            )}
            {discountVal > 0 && (
              <div className="flex justify-between font-semibold border-t pt-1" style={{ color: BRAND_BLUE, borderColor: "#e2e8f0" }}>
                <span>{pt.netTotal}</span>
                <span>{t.currency.formatFixed(netTotal)}</span>
              </div>
            )}
            {alreadyPaid > 0 && (
              <div className="flex justify-between text-gray-400 text-xs">
                <span>{pt.amountPaid}</span>
                <span>{t.currency.formatFixed(alreadyPaid)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold border-t pt-1.5" style={{ borderColor: "#e2e8f0", color: remaining > 0 ? "#dc2626" : "#16a34a" }}>
              <span>{pt.remainingBalance}</span>
              <span>{t.currency.formatFixed(remaining)}</span>
            </div>
          </div>

          {/* Discount field */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">{pt.discountOptional}</label>
            <Input
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={form.discount}
              onChange={(e) => handleDiscountChange(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">{pt.transactionAmount}</label>
            <Input
              type="number"
              min="1"
              step="0.01"
              placeholder="0.00"
              value={form.amount}
              onChange={(e) => setForm(f => ({ ...f, amount: e.target.value }))}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">{pt.paymentMethod}</label>
            <Select value={form.paymentMethod} onValueChange={(v) => setForm(f => ({ ...f, paymentMethod: v as any }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">{pt.paymentMethodCash}</SelectItem>
                <SelectItem value="bank_transfer">{pt.paymentMethodBankTransfer}</SelectItem>
                <SelectItem value="cheque">{pt.paymentMethodCheque}</SelectItem>
                <SelectItem value="online">{pt.paymentMethodOnline}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">{pt.transactionDate}</label>
            <Input type="date" value={form.transactionDate} onChange={(e) => setForm(f => ({ ...f, transactionDate: e.target.value }))} />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">{pt.transactionNotes}</label>
            <Input placeholder="..." value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">{t.status.pending !== "Pending" ? "إلغاء" : "Cancel"}</Button>
          </DialogClose>
          <Button disabled={isPending || !form.amount || !form.transactionDate} onClick={handleSubmit} style={{ backgroundColor: BRAND_BLUE, color: "white" }}>
            {isPending ? pt.savingPayment : pt.savePayment}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Transaction History Row ───────────────────────────────────────────────────

function TransactionRow({ tx, canManage, pt, t, onPrint, onEnrollmentReceipt }: {
  tx: any; canManage: boolean; pt: any; t: any;
  onPrint: (id: number) => void;
  onEnrollmentReceipt: (paymentId: number) => void;
}) {
  const { mutate: deleteTx, isPending } = useDeleteTransaction();

  const methodLabel: Record<string, string> = {
    cash: pt.paymentMethodCash,
    bank_transfer: pt.paymentMethodBankTransfer,
    cheque: pt.paymentMethodCheque,
    online: pt.paymentMethodOnline,
  };

  return (
    <div className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/30 transition-colors text-sm">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: "#dcfce7", color: "#166534" }}>
          {METHOD_ICONS[tx.paymentMethod] ?? <Receipt className="w-3.5 h-3.5" />}
        </div>
        <div className="min-w-0">
          <div className="font-semibold text-emerald-700">{t.currency.formatFixed(tx.amount)}</div>
          <div className="text-xs text-muted-foreground">{methodLabel[tx.paymentMethod] ?? tx.paymentMethod} • {safeFmt(tx.transactionDate, "MMM d, yyyy")}</div>
          {tx.notes && <div className="text-xs text-muted-foreground italic truncate">{tx.notes}</div>}
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0 ms-3">
        {/* Transaction receipt */}
        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1" onClick={() => onPrint(tx.id)}
          title={pt.printReceipt ?? "Print Receipt"}>
          <Printer className="w-3 h-3" />
        </Button>
        {/* Enrollment receipt */}
        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1.5 font-semibold"
          style={{ color: "#1B2E8F" }}
          onClick={() => onEnrollmentReceipt(tx.paymentId)}
          title="Print Enrollment Receipt / طباعة إيصال التسجيل"
        >
          <FileText className="w-3 h-3" />
          <span className="hidden sm:inline text-xs">{pt.enrollmentReceiptBtn ?? "Enrollment"}</span>
        </Button>
        {canManage && (
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-red-500 hover:text-red-700 hover:bg-red-50"
            disabled={isPending}
            onClick={() => deleteTx({ paymentId: tx.paymentId, txId: tx.id })}
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        )}
      </div>
    </div>
  );
}

// ── Edit Payment Modal ────────────────────────────────────────────────────────

function EditPaymentModal({ payment, onClose, t }: { payment: any; onClose: () => void; t: any }) {
  const pt = t.payments;
  const { toast } = useToast();
  const { mutate: updatePayment, isPending } = useUpdatePayment();

  const [form, setForm] = useState({
    amountDue: String(payment.amountDue ?? ""),
    discount: String(payment.discount ?? "0"),
    dueDate: payment.dueDate ?? "",
    notes: payment.notes ?? "",
  });

  const handleSubmit = () => {
    const amountDue = parseFloat(form.amountDue);
    if (isNaN(amountDue) || amountDue <= 0) {
      toast({ title: "خطأ", description: "أدخل مبلغ صحيح", variant: "destructive" });
      return;
    }
    updatePayment(
      {
        id: payment.id,
        data: {
          amountDue,
          discount: Math.max(0, parseFloat(form.discount) || 0),
          dueDate: form.dueDate || undefined,
          notes: form.notes.trim() || undefined,
        },
      },
      {
        onSuccess: () => {
          toast({ title: "تم الحفظ", description: "تم تعديل بيانات الدفعة بنجاح" });
          onClose();
        },
        onError: () => toast({ title: "خطأ", description: "فشل تعديل الدفعة", variant: "destructive" }),
      }
    );
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="w-4 h-4" style={{ color: BRAND_BLUE }} />
            تعديل الدفعة
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">{pt.originalPrice}</label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={form.amountDue}
              onChange={(e) => setForm(f => ({ ...f, amountDue: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">{pt.discount}</label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={form.discount}
              onChange={(e) => setForm(f => ({ ...f, discount: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">{pt.dueDate}</label>
            <Input
              type="date"
              value={form.dueDate}
              onChange={(e) => setForm(f => ({ ...f, dueDate: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">{pt.transactionNotes}</label>
            <Input
              placeholder="..."
              value={form.notes}
              onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">إلغاء</Button>
          </DialogClose>
          <Button
            disabled={isPending}
            onClick={handleSubmit}
            style={{ backgroundColor: BRAND_BLUE, color: "white" }}
          >
            {isPending ? "جاري الحفظ..." : "حفظ التعديلات"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Payment Card ──────────────────────────────────────────────────────────────

function PaymentCard({ payment, t, isRTL, canManage, onShowFullInvoice }: {
  payment: any; t: any; isRTL: boolean; canManage: boolean; onShowFullInvoice: (id: number) => void;
}) {
  const pt = t.payments;
  const { language } = useLanguage();
  const isAr = language === "ar";
  const [expanded, setExpanded] = useState(false);
  const [showAddTx, setShowAddTx] = useState(false);
  const [showEditPayment, setShowEditPayment] = useState(false);
  const [showEditsHistory, setShowEditsHistory] = useState(false);
  const [receiptTxId, setReceiptTxId] = useState<number | null>(null);
  const [enrollmentReceiptPaymentId, setEnrollmentReceiptPaymentId] = useState<number | null>(null);

  const { data: transactions = [], isLoading: txLoading } = useListTransactions(expanded ? payment.id : 0);
  const { data: edits = [], isLoading: editsLoading } = useListPaymentEdits(payment.id, { enabled: showEditsHistory });
  const discount = payment.discount ?? 0;
  const netTotal = Math.max(0, payment.amountDue - discount);
  const remaining = Math.max(0, netTotal - payment.amountPaid);
  const paidPct = Math.min(100, netTotal > 0 ? (payment.amountPaid / netTotal) * 100 : 0);

  return (
    <>
      <Card className="overflow-hidden transition-all hover:border-primary/20">
        {/* Main card row */}
        <div className="flex flex-col md:flex-row">
          {/* Left: student info */}
          <div className="p-5 flex-1 flex flex-col justify-center border-b md:border-b-0 md:border-e">
            <div className="flex justify-between items-start mb-1">
              <h3 className="font-semibold text-lg leading-tight">{payment.studentName}</h3>
              <Badge variant="outline" className={getStatusColor(payment.status)}>
                {t.status[payment.status as keyof typeof t.status] || payment.status}
              </Badge>
            </div>
            <div className="text-sm text-muted-foreground">
              {payment.levelName || pt.noLevel} • {pt.dueDate} {safeFmt(payment.dueDate, "MMM d, yyyy")}
            </div>
            {payment.notes && <div className="text-xs bg-muted/50 p-2 rounded mt-2 text-muted-foreground">{payment.notes}</div>}

            {/* Progress bar */}
            <div className="mt-3">
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${paidPct}%`, backgroundColor: paidPct >= 100 ? "#22c55e" : BRAND_BLUE }} />
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">{Math.round(paidPct)}% {pt.amountPaid.toLowerCase()}</div>
            </div>
          </div>

          {/* Right: amounts + actions */}
          <div className="p-5 md:w-[260px] flex flex-col justify-between bg-muted/10 shrink-0">
            <div className="space-y-1.5 mb-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{pt.originalPrice}</span>
                <span className="font-semibold">{t.currency.format(payment.amountDue)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-sm" style={{ color: "#dc2626" }}>
                  <span>↓ {pt.discount}</span>
                  <span className="font-semibold">− {t.currency.format(discount)}</span>
                </div>
              )}
              {discount > 0 && (
                <div className="flex justify-between text-sm font-semibold" style={{ color: BRAND_BLUE }}>
                  <span>{pt.netTotal}</span>
                  <span>{t.currency.format(netTotal)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{pt.amountPaid}</span>
                <span className="font-semibold text-emerald-600">{t.currency.format(payment.amountPaid)}</span>
              </div>
              <div className="flex justify-between text-sm pt-1.5 border-t font-bold" style={{ color: remaining > 0 ? "#dc2626" : "#16a34a" }}>
                <span>{pt.remainingBalance}</span>
                <span>{t.currency.format(remaining)}</span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              {canManage && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1 gap-1.5 text-xs font-semibold"
                    style={{ backgroundColor: BRAND_BLUE, color: "white" }}
                    onClick={() => setShowAddTx(true)}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {pt.addPayment}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1 text-xs"
                    title="تعديل الدفعة"
                    onClick={() => setShowEditPayment(true)}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                </div>
              )}
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1 text-xs gap-1" onClick={() => onShowFullInvoice(payment.id)}>
                  <FileText className="w-3 h-3" />
                  {pt.invoiceLabel.split(" / ")[0]}
                </Button>
                <Button variant="ghost" size="sm" className="flex-1 text-xs gap-1" onClick={() => setExpanded(e => !e)}>
                  {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  {pt.transactionHistory}
                </Button>
              </div>
              {/* Enrollment Receipt button — visible on every payment card */}
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs gap-1.5 font-semibold border-dashed"
                style={{ color: BRAND_BLUE, borderColor: BRAND_BLUE + "50" }}
                onClick={() => setEnrollmentReceiptPaymentId(payment.id)}
              >
                <Printer className="w-3.5 h-3.5" />
                {isAr ? "طباعة إيصال التسجيل" : "Print Enrollment Receipt"}
              </Button>
            </div>
          </div>
        </div>

        {/* Expandable transaction history */}
        {expanded && (
          <div className="border-t">
            <div className="px-4 py-2 flex items-center justify-between" style={{ backgroundColor: "#f8fafc" }}>
              <span className="text-xs font-bold uppercase tracking-wide" style={{ color: BRAND_BLUE }}>{pt.transactionHistory}</span>
              <span className="text-xs text-muted-foreground">{transactions.length} {t.nav?.groups ?? "entries"}</span>
            </div>
            {txLoading ? (
              <div className="py-4 text-center text-xs text-muted-foreground">{pt.loadingPayments}</div>
            ) : transactions.length === 0 ? (
              <div className="py-4 text-center text-xs text-muted-foreground">{pt.noTransactions}</div>
            ) : (
              <div className="divide-y">
                {transactions.map((tx: any) => (
                  <TransactionRow
                    key={tx.id} tx={tx} canManage={canManage} pt={pt} t={t}
                    onPrint={setReceiptTxId}
                    onEnrollmentReceipt={setEnrollmentReceiptPaymentId}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Collapsible edit history — admin/accountant only */}
        {canManage && (
          <div className="border-t">
            <button
              className="w-full px-4 py-2 flex items-center justify-between text-xs hover:bg-muted/30 transition-colors"
              onClick={() => setShowEditsHistory(v => !v)}
            >
              <span className="flex items-center gap-1.5 font-semibold" style={{ color: BRAND_BLUE }}>
                <History className="w-3.5 h-3.5" />
                سجل التعديلات
              </span>
              {showEditsHistory ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
            </button>
            {showEditsHistory && (
              <div className="px-4 pb-3 space-y-2">
                {editsLoading ? (
                  <div className="py-3 text-center text-xs text-muted-foreground">جاري التحميل...</div>
                ) : edits.length === 0 ? (
                  <div className="py-3 text-center text-xs text-muted-foreground">لا توجد تعديلات مسجّلة</div>
                ) : (
                  edits.map((edit: any) => (
                    <div key={edit.id} className="rounded-lg border p-3 text-xs space-y-1.5" style={{ backgroundColor: "#fafafa" }}>
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span className="font-semibold text-gray-700">{edit.editedBy?.name ?? "—"}</span>
                        <span>{safeFmt(edit.editedAt, "MMM d, yyyy • HH:mm")}</span>
                      </div>
                      <div className="space-y-1">
                        {Object.entries(edit.changes as Record<string, { old: unknown; new: unknown }>).map(([field, { old: oldVal, new: newVal }]) => (
                          <div key={field} className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-gray-500 capitalize">{field}:</span>
                            <span className="line-through text-red-400">{String(oldVal)}</span>
                            <span className="text-gray-400">→</span>
                            <span className="text-emerald-600 font-semibold">{String(newVal)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </Card>

      {showAddTx && (
        <AddTransactionModal
          paymentId={payment.id}
          amountDue={payment.amountDue}
          amountPaid={payment.amountPaid}
          currentDiscount={discount}
          onClose={() => setShowAddTx(false)}
          t={t}
        />
      )}

      {showEditPayment && (
        <EditPaymentModal
          payment={payment}
          onClose={() => setShowEditPayment(false)}
          t={t}
        />
      )}

      {receiptTxId !== null && (
        <TransactionReceiptModal txId={receiptTxId} onClose={() => setReceiptTxId(null)} t={t} isRTL={isRTL} />
      )}

      {enrollmentReceiptPaymentId !== null && (
        <EnrollmentReceiptModal
          paymentId={enrollmentReceiptPaymentId}
          onClose={() => setEnrollmentReceiptPaymentId(null)}
          isAr={isAr}
        />
      )}
    </>
  );
}

// ── Full Invoice Modal — Professional A4 ─────────────────────────────────────

function InvoiceModal({ paymentId, onClose, t, isRTL }: { paymentId: number; onClose: () => void; t: any; isRTL: boolean }) {
  const pt = t.payments;
  const { data: receipt, isLoading } = useGetReceipt(paymentId, { query: { enabled: true } });
  const al = isRTL ? "text-start" : "text-end";

  const statusStyle = (status: string) => {
    switch (status) {
      case "paid": return { backgroundColor: "#dcfce7", color: "#166534", border: "1px solid #bbf7d0" };
      case "partially_paid": return { backgroundColor: "#fef9c3", color: "#854d0e", border: "1px solid #fde68a" };
      case "overdue": return { backgroundColor: "#fee2e2", color: "#991b1b", border: "1px solid #fecaca" };
      default: return { backgroundColor: "#f1f5f9", color: "#475569", border: "1px solid #e2e8f0" };
    }
  };

  const discount = (receipt as any)?.discount ?? 0;
  const netTotal = (receipt as any)?.netTotal ?? ((receipt as any)?.amountDue ?? 0);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="p-0 overflow-hidden w-full max-w-3xl invoice-body" dir={isRTL ? "rtl" : "ltr"}>

        {/* Toolbar — hidden when printing */}
        <div className="invoice-print-hide flex items-center justify-between px-5 py-3 border-b bg-muted/30">
          <DialogTitle className="text-base font-semibold">{pt.paymentReceipt}</DialogTitle>
          <div className="flex items-center gap-2">
            {!isLoading && receipt && (
              <Button size="sm" onClick={injectPrintStyles} style={{ backgroundColor: BRAND_BLUE, color: "white" }} className="font-semibold gap-1.5">
                <Printer className="w-4 h-4" />{pt.printReceipt}
              </Button>
            )}
            <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground"><X className="w-4 h-4" /></button>
          </div>
        </div>

        {isLoading ? (
          <div className="py-16 text-center text-muted-foreground">{pt.generatingReceipt}</div>
        ) : !receipt ? (
          <div className="py-16 text-center text-destructive">{pt.failedToLoadReceipt}</div>
        ) : (
          <div className="bg-white text-black" style={{ fontFamily: "'Cairo', 'Segoe UI', Tahoma, Arial, sans-serif" }}>

            {/* ── DIGITAL ONLY: Branded blue header ── */}
            <div className="digital-only flex items-center justify-between px-8 py-5" style={{ backgroundColor: BRAND_BLUE, minHeight: "88px" }}>
              <div>
                <div className="text-white font-bold text-lg leading-tight">{pt.institutionName}</div>
                <div className="text-sm mt-0.5" style={{ color: BRAND_YELLOW }}>{pt.institutionTagline}</div>
              </div>
              <img src="/logo_white.png" alt="Kidspeak" className="h-12 w-auto object-contain" style={{ maxWidth: "180px" }} />
            </div>

            {/* ── PRINT ONLY: Clean white professional header ── */}
            <div className="print-only flex-row items-start justify-between px-8 py-6 border-b-4" style={{ borderColor: BRAND_YELLOW }}>
              <div style={{ flex: 1 }}>
                <div className="font-black text-2xl leading-tight" style={{ color: BRAND_BLUE }}>{pt.institutionName}</div>
                <div className="text-sm mt-1" style={{ color: "#6b7280" }}>{pt.schoolAddress}</div>
                <div className="text-sm" style={{ color: "#6b7280" }}>{pt.schoolPhone}</div>
                <div className="text-sm mt-0.5" style={{ color: "#6b7280" }}>contact@kidspeak.dz</div>
              </div>
              <img src="/logo-full.png" alt="Kidspeak" className="h-20 w-auto object-contain" style={{ maxWidth: "200px" }} />
            </div>

            {/* Invoice label / number row */}
            <div className="px-8 py-3 flex items-center justify-between" style={{ backgroundColor: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
              <span className="text-xs font-bold uppercase tracking-widest" style={{ color: BRAND_BLUE }}>{pt.invoiceLabel}</span>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-500 font-medium">{pt.receiptNumber}</span>
                <span className="text-sm font-bold px-3 py-1 rounded-full" style={{ backgroundColor: BRAND_BLUE, color: "white" }}>{receipt.receiptNumber}</span>
              </div>
            </div>

            <div className="px-8 py-6 space-y-6">

              {/* Bill To / Date / Status */}
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider mb-2 pb-1 border-b" style={{ color: BRAND_BLUE, borderColor: BRAND_YELLOW }}>{pt.billTo}</div>
                  <div className="font-bold text-lg text-gray-900">{receipt.studentName}</div>
                  {(receipt as any).parentName && <div className="text-sm text-gray-600 mt-0.5"><span className="font-medium">{pt.parentGuardian}: </span>{(receipt as any).parentName}</div>}
                  {receipt.levelName && <div className="text-sm text-gray-600 mt-0.5">Level / المستوى: <span className="font-medium">{receipt.levelName}</span></div>}
                </div>
                <div className={al}>
                  <div className="text-xs font-bold uppercase tracking-wider mb-2 pb-1 border-b" style={{ color: BRAND_BLUE, borderColor: BRAND_YELLOW }}>{pt.dateIssued}</div>
                  <div className="font-semibold text-gray-800">{safeFmt(receipt.issuedAt, "MMMM d, yyyy")}</div>
                  <div className="mt-2">
                    <span className="inline-block text-xs font-bold px-3 py-1 rounded-full" style={statusStyle(receipt.status)}>
                      {t.status[receipt.status as keyof typeof t.status] || receipt.status}
                    </span>
                  </div>
                  {receipt.dueDate && <div className="text-xs text-gray-500 mt-2">{pt.dueDate}: {safeFmt(receipt.dueDate, "MMM d, yyyy")}</div>}
                </div>
              </div>

              {/* Financial table */}
              <div className="rounded-xl overflow-hidden border border-gray-200">
                {/* Table header */}
                <div className="grid grid-cols-2 px-5 py-3 text-xs font-bold uppercase tracking-wider text-white" style={{ backgroundColor: BRAND_BLUE }}>
                  <span>{pt.description}</span>
                  <span className={al}>{pt.amount}</span>
                </div>
                {/* Service row */}
                <div className="grid grid-cols-2 px-5 py-4 border-b border-gray-100 bg-white">
                  <div>
                    <div className="font-semibold text-gray-900">{receipt.levelName ? `${receipt.levelName} — ${pt.enrollmentFee}` : pt.enrollmentFee}</div>
                    {receipt.notes && <div className="text-xs text-gray-400 mt-0.5 italic">{receipt.notes}</div>}
                  </div>
                  <div className={`font-semibold text-gray-900 ${al}`}>{t.currency.formatFixed(receipt.amountDue)}</div>
                </div>

                {/* Calculation sequence */}
                <div className="bg-gray-50 divide-y divide-gray-100">
                  {/* Original price */}
                  <div className="grid grid-cols-2 px-5 py-2.5 text-sm">
                    <span className="text-gray-600 font-medium">{pt.originalPrice} / المبلغ الأصلي</span>
                    <span className={al}>{t.currency.formatFixed(receipt.amountDue)}</span>
                  </div>

                  {/* Discount (only if > 0) */}
                  {discount > 0 && (
                    <div className="grid grid-cols-2 px-5 py-2.5 text-sm font-semibold" style={{ color: "#dc2626" }}>
                      <span>↓ {pt.discount} / التخفيض</span>
                      <span className={al}>− {t.currency.formatFixed(discount)}</span>
                    </div>
                  )}

                  {/* Net total (only if discount > 0) */}
                  {discount > 0 && (
                    <div className="grid grid-cols-2 px-5 py-2.5 text-sm font-bold" style={{ color: BRAND_BLUE, borderTop: `2px solid ${BRAND_YELLOW}` }}>
                      <span>{pt.netTotal} / الإجمالي الصافي</span>
                      <span className={al}>{t.currency.formatFixed(netTotal)}</span>
                    </div>
                  )}

                  {/* Amount paid */}
                  <div className="grid grid-cols-2 px-5 py-2.5 text-sm text-emerald-700 font-medium">
                    <span>{pt.amountPaid} / المبلغ المدفوع</span>
                    <span className={al}>− {t.currency.formatFixed(receipt.amountPaid)}</span>
                  </div>

                  {/* Remaining balance */}
                  <div className="grid grid-cols-2 px-5 py-3 font-black text-base" style={{ color: receipt.balance > 0 ? "#dc2626" : "#16a34a" }}>
                    <span>{pt.remainingBalance} / الرصيد المتبقي</span>
                    <span className={al}>{t.currency.formatFixed(receipt.balance)}</span>
                  </div>
                </div>
              </div>

              {/* Payment method + Signature section */}
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg p-4 border border-gray-200">
                  <div className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: BRAND_BLUE }}>
                    {pt.paymentMethodTitle} / طريقة الدفع
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { icon: <Banknote className="w-3.5 h-3.5" />, label: pt.paymentMethodCash },
                      { icon: <Building2 className="w-3.5 h-3.5" />, label: "CCP" },
                      { icon: <Receipt className="w-3.5 h-3.5" />, label: "Baridimob" },
                    ].map(({ icon, label }) => (
                      <span key={label} className="flex items-center gap-1 text-xs px-2 py-1 rounded-full border border-gray-200 text-gray-600">
                        {icon}{label}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="rounded-lg p-4 border border-gray-200 flex flex-col">
                  <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: BRAND_BLUE }}>
                    {pt.authorizedSignature}
                  </div>
                  <div className="text-xs text-gray-400 mb-2">ختم وتوقيع الإدارة</div>
                  <div className="flex-1 border-b-2 border-dashed border-gray-300 min-h-[36px]" />
                </div>
              </div>

              {/* Footer */}
              <div className="rounded-xl px-6 py-4 text-center" style={{ backgroundColor: "#f0f4ff", border: `1px solid #c7d2fe` }}>
                <div className="text-base font-black mb-1" style={{ color: BRAND_BLUE, direction: "rtl" }}>
                  {pt.schoolSlogan}
                </div>
                <div className="text-sm font-medium text-gray-600">{pt.footerThankYouEn}</div>
                <div className="text-xs text-gray-400 mt-1">{pt.footerContact}</div>
              </div>

            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Expenses Tab ──────────────────────────────────────────────────────────────

function ExpensesTab({ t, isRTL, canManage }: { t: any; isRTL: boolean; canManage: boolean }) {
  const pt = t.payments;
  const { toast } = useToast();
  const { data: expenses = [], isLoading, refetch } = useListExpenses({});
  const { mutate: createExpense, isPending: isCreating } = useCreateExpense();
  const { mutate: deleteExpense } = useDeleteExpense();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    category: "other" as "rent" | "utilities" | "salaries" | "materials" | "maintenance" | "other",
    description: "",
    amount: "",
    expenseDate: new Date().toISOString().split("T")[0],
    notes: "",
  });

  const categoryColors: Record<string, string> = {
    rent: "#7c3aed", utilities: "#0891b2", salaries: "#1B2E8F",
    materials: "#16a34a", maintenance: "#d97706", other: "#6b7280",
  };

  const totalExpenses = expenses.reduce((sum, e) => sum + parseFloat(String(e.amount)), 0);

  const handleCreate = () => {
    if (!form.description.trim() || !form.amount || !form.expenseDate) {
      toast({ title: "Error", description: "Description, amount, and date are required.", variant: "destructive" });
      return;
    }
    createExpense(
      { data: { category: form.category, description: form.description, amount: parseFloat(form.amount), expenseDate: form.expenseDate as any, notes: form.notes.trim() || undefined } },
      {
        onSuccess: () => {
          toast({ title: pt.expenseAdded });
          setShowForm(false);
          setForm({ category: "other", description: "", amount: "", expenseDate: new Date().toISOString().split("T")[0], notes: "" });
          refetch();
        },
        onError: () => toast({ title: "Error", description: "Failed to record expense.", variant: "destructive" }),
      }
    );
  };

  return (
    <div className="space-y-4">
      {/* Summary + Add button */}
      <div className="flex items-center justify-between">
        <div className="rounded-lg px-4 py-2.5 flex items-center gap-2" style={{ backgroundColor: "#fee2e220", border: "1px solid #fee2e2" }}>
          <TrendingDown className="w-4 h-4" style={{ color: "#dc2626" }} />
          <span className="text-sm font-medium text-gray-700">{pt.totalExpenses}:</span>
          <span className="text-lg font-bold" style={{ color: "#dc2626" }}>{t.currency.formatFixed(totalExpenses)}</span>
        </div>
        {canManage && (
          <Button onClick={() => setShowForm(true)} style={{ backgroundColor: BRAND_BLUE, color: "white" }} className="gap-2 font-semibold">
            <Plus className="w-4 h-4" />
            {pt.recordExpenseBtn}
          </Button>
        )}
      </div>

      {/* Add expense form dialog */}
      {showForm && (
        <Dialog open onOpenChange={(o) => !o && setShowForm(false)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <TrendingDown className="w-5 h-5" style={{ color: "#dc2626" }} />
                {pt.recordExpenseBtn}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-1">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{pt.expenseCategory}</label>
                <Select value={form.category} onValueChange={(v) => setForm(f => ({ ...f, category: v as any }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(pt.expenseCategories).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v as string}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{pt.expenseDescriptionLabel}</label>
                <Input placeholder="e.g. Office rent - January" value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">{pt.amount}</label>
                  <Input type="number" min="0" step="0.01" placeholder="0.00" value={form.amount} onChange={(e) => setForm(f => ({ ...f, amount: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">{pt.expenseDateLabel}</label>
                  <Input type="date" value={form.expenseDate} onChange={(e) => setForm(f => ({ ...f, expenseDate: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{pt.expenseNotesLabel}</label>
                <Input placeholder="..." value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
              <Button disabled={isCreating} onClick={handleCreate} style={{ backgroundColor: BRAND_BLUE, color: "white" }}>
                {isCreating ? pt.savingExpense : pt.saveExpense}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Expense list */}
      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">{pt.loadingPayments}</div>
      ) : expenses.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border rounded-lg bg-card/50">{pt.noExpensesYet}</div>
      ) : (
        <div className="grid gap-3">
          {expenses.map((expense: any) => (
            <Card key={expense.id} className="overflow-hidden">
              <CardContent className="p-0">
                <div className="flex items-center">
                  <div className="w-1.5 self-stretch" style={{ backgroundColor: categoryColors[expense.category] ?? "#6b7280" }} />
                  <div className="px-4 py-3 flex-1 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{expense.description}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: `${categoryColors[expense.category]}20`, color: categoryColors[expense.category] }}>
                          {(pt.expenseCategories as any)[expense.category] ?? expense.category}
                        </span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <CalendarDays className="w-3 h-3" />
                          {safeFmt(expense.expenseDate, "MMM d, yyyy")}
                        </span>
                      </div>
                      {expense.notes && <div className="text-xs text-muted-foreground mt-0.5 italic">{expense.notes}</div>}
                    </div>
                    <div className="shrink-0 text-end">
                      <div className="font-bold text-base" style={{ color: "#dc2626" }}>{t.currency.formatFixed(parseFloat(String(expense.amount)))}</div>
                    </div>
                    {canManage && (
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"
                        onClick={() => deleteExpense({ id: expense.id }, { onSuccess: () => { refetch(); } })}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Debt Dashboard Tab ────────────────────────────────────────────────────────

function DebtDashboardTab({ t, isRTL }: { t: any; isRTL: boolean }) {
  const pt = t.payments;
  const { data: debtData, isLoading } = useGetDebtSummary();

  if (isLoading) return <div className="text-center py-12 text-muted-foreground">{pt.loadingPayments}</div>;

  const { totalDebt = 0, students = [] } = debtData ?? {};

  return (
    <div className="space-y-5">
      {/* Total debt card */}
      <Card className="overflow-hidden border-0 shadow-md">
        <div className="px-6 py-5" style={{ background: `linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)` }}>
          <div className="flex items-center gap-3">
            <AlertCircle className="w-8 h-8 text-white opacity-90" />
            <div>
              <div className="text-white/80 text-sm font-medium">{pt.totalOutstandingDebt}</div>
              <div className="text-white text-3xl font-black tracking-tight">{t.currency.formatFixed(totalDebt)}</div>
            </div>
          </div>
          <div className="mt-3 text-white/70 text-xs">{students.length} {pt.studentsWithDebt}</div>
        </div>
      </Card>

      {/* Students with debt */}
      {students.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border rounded-lg bg-emerald-50/50">
          <div className="text-4xl mb-2">✓</div>
          <p className="font-medium text-emerald-700">{pt.noDebtsFound}</p>
        </div>
      ) : (
        <div className="space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">{pt.studentsWithDebt}</h3>
          {students.map((s: any, i: number) => (
            <Card key={s.studentId} className="overflow-hidden">
              <CardContent className="p-0">
                <div className="flex items-center gap-0">
                  <div className="px-3 py-3 text-center w-10 shrink-0">
                    <span className="text-sm font-bold text-muted-foreground">#{i + 1}</span>
                  </div>
                  <div className="border-l flex-1 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-semibold text-sm truncate">{s.studentName}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          {s.levelName && <span>{s.levelName} •</span>}
                          <span>{pt.debtSince} {safeFmt(s.oldestDueDate, "MMM d, yyyy")}</span>
                        </div>
                      </div>
                      <div className="shrink-0 text-end">
                        <div className="font-black text-base" style={{ color: "#dc2626" }}>{t.currency.formatFixed(s.balance)}</div>
                        <div className="text-xs text-muted-foreground">
                          {t.currency.formatFixed(s.amountPaid)} / {t.currency.formatFixed(s.amountDue)}
                        </div>
                      </div>
                    </div>
                    {/* Mini progress bar */}
                    <div className="mt-2 h-1 bg-muted rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-amber-400" style={{ width: `${Math.min(100, (s.amountPaid / s.amountDue) * 100)}%` }} />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function PaymentsList() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [invoicePaymentId, setInvoicePaymentId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("invoices");

  const { t, isRTL } = useLanguage();
  const pt = t.payments;
  const { data: currentUser } = useGetMe();
  const canManage = ["admin", "accountant"].includes(currentUser?.role ?? "");
  const isParentUser = currentUser?.role === "parent";

  const { data: payments = [], isLoading } = useListPayments({
    status: statusFilter !== "all" ? (statusFilter as ListPaymentsStatus) : undefined,
  });

  const filteredPayments = payments.filter((p) => {
    if (search) {
      const name = (p as any).studentName?.toLowerCase() ?? "";
      if (!name.includes(search.toLowerCase())) return false;
    }
    return true;
  });

  // Stats for header (discount-aware)
  const totalDue = payments.reduce((s, p) => s + Math.max(0, p.amountDue - ((p as any).discount ?? 0)), 0);
  const totalPaid = payments.reduce((s, p) => s + p.amountPaid, 0);
  const totalRemaining = Math.max(0, totalDue - totalPaid);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{pt.title}</h1>
        <p className="text-muted-foreground text-sm mt-1">{isRTL ? "نظام المحاسبة المدرسية" : "School Accounting System"}</p>
      </div>

      {/* Quick stats (invoices overview) */}
      {payments.length > 0 && !isParentUser && (
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-xl font-bold" style={{ color: BRAND_BLUE }}>{t.currency.formatFixed(totalDue)}</div>
              <div className="text-xs text-muted-foreground mt-1">{pt.netTotal}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-xl font-bold text-emerald-600">{t.currency.formatFixed(totalPaid)}</div>
              <div className="text-xs text-muted-foreground mt-1">{pt.amountPaid}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-xl font-bold" style={{ color: totalRemaining > 0 ? "#dc2626" : "#16a34a" }}>{t.currency.formatFixed(totalRemaining)}</div>
              <div className="text-xs text-muted-foreground mt-1">{pt.remainingBalance}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className={`grid w-full ${isParentUser ? "grid-cols-1" : "grid-cols-3"}`}>
          <TabsTrigger value="invoices" className="gap-1.5">
            <FileText className="w-3.5 h-3.5" />
            {pt.tabInvoices}
          </TabsTrigger>
          {!isParentUser && (
            <TabsTrigger value="expenses" className="gap-1.5">
              <TrendingDown className="w-3.5 h-3.5" />
              {pt.tabExpenses}
            </TabsTrigger>
          )}
          {!isParentUser && (
            <TabsTrigger value="debt" className="gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" />
              {pt.tabDebt}
            </TabsTrigger>
          )}
        </TabsList>

        {/* Invoices tab */}
        <TabsContent value="invoices" className="mt-4 space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute start-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input placeholder={pt.searchPlaceholder} className="ps-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder={pt.filterByStatus} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{pt.allStatuses}</SelectItem>
                <SelectItem value="paid">{t.status.paid}</SelectItem>
                <SelectItem value="partially_paid">{t.status.partially_paid}</SelectItem>
                <SelectItem value="pending">{t.status.pending}</SelectItem>
                <SelectItem value="overdue">{t.status.overdue}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">{pt.loadingPayments}</div>
          ) : filteredPayments.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground border rounded-lg bg-card/50">{pt.noPaymentsFound}</div>
          ) : (
            <div className="grid gap-4">
              {filteredPayments.map((payment) => (
                <PaymentCard
                  key={payment.id}
                  payment={payment}
                  t={t}
                  isRTL={isRTL}
                  canManage={canManage}
                  onShowFullInvoice={setInvoicePaymentId}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Expenses tab */}
        <TabsContent value="expenses" className="mt-4">
          <ExpensesTab t={t} isRTL={isRTL} canManage={canManage} />
        </TabsContent>

        {/* Debt dashboard tab */}
        <TabsContent value="debt" className="mt-4">
          <DebtDashboardTab t={t} isRTL={isRTL} />
        </TabsContent>
      </Tabs>

      {/* Full invoice modal */}
      {invoicePaymentId !== null && (
        <InvoiceModal paymentId={invoicePaymentId} onClose={() => setInvoicePaymentId(null)} t={t} isRTL={isRTL} />
      )}
    </div>
  );
}

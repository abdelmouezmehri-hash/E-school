// FILE: artifacts/kidspeak/src/pages/admin/marketing-hub/index.tsx
import { useState } from "react";
import { useLanguage } from "@/contexts/language-context";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  CalendarDays, ClipboardList, Sun, Sparkles, Users, TrendingUp,
  Pause, Play, Eye, Edit2, Plus, Download, Megaphone, Target,
  Zap, ArrowRight, Phone, Mail, MessageCircle, Trash2, CheckCircle2,
  Clock, X, UserCheck, Ban, ChevronDown, ChevronUp,
} from "lucide-react";
import { format } from "date-fns";
import {
  useListCampaigns, useCreateCampaign, useUpdateCampaign, useDeleteCampaign,
  useListLeads, useAddLead, useUpdateLead, useDeleteLead,
  type Campaign, type Lead, type CampaignType, type LeadStatus,
} from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";

// ── Constants ──────────────────────────────────────────────────────────────────
const BRAND_BLUE   = "#1B2E8F";
const BRAND_YELLOW = "#F5A600";

function safeFmt(d: string | null | undefined, fmt: string) {
  if (!d) return "—";
  const date = new Date(d);
  return isNaN(date.getTime()) ? String(d) : format(date, fmt);
}

// ── Config maps ────────────────────────────────────────────────────────────────
const TYPE_CONFIG: Record<CampaignType, { icon: React.ElementType; label: string; labelAr: string; color: string }> = {
  open_day:           { icon: CalendarDays,  label: "Open Day",           labelAr: "يوم مفتوح",    color: "#7c3aed" },
  early_registration: { icon: ClipboardList, label: "Early Registration", labelAr: "تسجيل مبكر",   color: BRAND_BLUE },
  summer_school:      { icon: Sun,           label: "Summer School",      labelAr: "مدرسة صيفية",  color: "#ea580c" },
  custom:             { icon: Sparkles,      label: "Custom",             labelAr: "حملة مخصصة",   color: "#16a34a" },
};

const STATUS_CONFIG = {
  active: { label: "Active", labelAr: "نشطة",   color: "#16a34a", bg: "#f0fdf4", border: "#16a34a", dot: "#16a34a" },
  paused: { label: "Paused", labelAr: "موقوفة", color: "#b45309", bg: "#fffbeb", border: "#F5A600", dot: "#F5A600" },
  ended:  { label: "Ended",  labelAr: "منتهية", color: "#64748b", bg: "#f8fafc", border: "#cbd5e1", dot: "#94a3b8" },
};

const LEAD_STATUS_CONFIG: Record<LeadStatus, { label: string; labelAr: string; color: string; bg: string; icon: React.ElementType }> = {
  new:            { label: "New",           labelAr: "جديد",         color: BRAND_BLUE,  bg: `${BRAND_BLUE}12`, icon: Zap },
  contacted:      { label: "Contacted",     labelAr: "تم التواصل",   color: "#0891b2",   bg: "#ecfeff",        icon: Phone },
  interested:     { label: "Interested",    labelAr: "مهتم",         color: "#7c3aed",   bg: "#f5f3ff",        icon: CheckCircle2 },
  registered:     { label: "Registered",    labelAr: "مسجّل",         color: "#16a34a",   bg: "#f0fdf4",        icon: UserCheck },
  not_interested: { label: "Not Interested",labelAr: "غير مهتم",     color: "#94a3b8",   bg: "#f8fafc",        icon: Ban },
};

// ── CampaignFormModal ──────────────────────────────────────────────────────────
function CampaignFormModal({
  campaign, onClose, isRTL,
}: { campaign?: Campaign; onClose: () => void; isRTL: boolean }) {
  const { toast } = useToast();
  const createCampaign = useCreateCampaign();
  const updateCampaign = useUpdateCampaign();
  const isEdit = !!campaign;

  const { data: users = [] } = useQuery<{ id: number; name: string; role: string }[]>({
    queryKey: ["users-list"],
    queryFn: () => fetch("/api/users", { credentials: "include" }).then(r => r.json()),
  });
  const salesUsers = users.filter(u => ["admin", "accountant"].includes(u.role));

  const [form, setForm] = useState({
    name: campaign?.name ?? "",
    nameAr: campaign?.nameAr ?? "",
    type: campaign?.type ?? "custom" as CampaignType,
    startDate: campaign?.startDate ?? "",
    endDate: campaign?.endDate ?? "",
    ctaType: campaign?.ctaType ?? "form" as "whatsapp" | "form" | "call",
    whatsappNumber: campaign?.whatsappNumber ?? "",
    description: campaign?.description ?? "",
    assignedTo: campaign?.assignedTo ? String(campaign.assignedTo) : "",
  });

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  const handleSave = async () => {
    if (!form.name || !form.nameAr || !form.startDate || !form.endDate) {
      toast({ title: isRTL ? "الحقول المطلوبة ناقصة" : "Required fields missing", variant: "destructive" });
      return;
    }
    const body = {
      ...form,
      assignedTo: form.assignedTo ? parseInt(form.assignedTo) : undefined,
      whatsappNumber: form.whatsappNumber || undefined,
      description: form.description || undefined,
    };
    try {
      if (isEdit) {
        await updateCampaign.mutateAsync({ id: campaign.id, ...body });
        toast({ title: isRTL ? "تم تحديث الحملة ✓" : "Campaign updated ✓" });
      } else {
        await createCampaign.mutateAsync(body);
        toast({ title: isRTL ? "تم إنشاء الحملة ✓" : "Campaign created ✓" });
      }
      onClose();
    } catch {
      toast({ title: isRTL ? "حدث خطأ" : "An error occurred", variant: "destructive" });
    }
  };

  const isPending = createCampaign.isPending || updateCampaign.isPending;

  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-lg" dir={isRTL ? "rtl" : "ltr"}>
        <DialogHeader>
          <DialogTitle>{isRTL ? (isEdit ? "تعديل الحملة" : "حملة جديدة") : (isEdit ? "Edit Campaign" : "New Campaign")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2 max-h-[65vh] overflow-y-auto px-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600">{isRTL ? "الاسم (EN)" : "Name (EN)"} *</label>
              <Input value={form.name} onChange={set("name")} placeholder="Open Day Spring" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600">{isRTL ? "الاسم (AR)" : "Name (AR)"} *</label>
              <Input value={form.nameAr} onChange={set("nameAr")} placeholder="يوم مفتوح ربيع" dir="rtl" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600">{isRTL ? "النوع" : "Type"}</label>
              <Select value={form.type} onValueChange={v => setForm(p => ({ ...p, type: v as CampaignType }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(TYPE_CONFIG) as CampaignType[]).map(t => (
                    <SelectItem key={t} value={t}>{isRTL ? TYPE_CONFIG[t].labelAr : TYPE_CONFIG[t].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600">{isRTL ? "نوع الدعوة" : "CTA Type"}</label>
              <Select value={form.ctaType} onValueChange={v => setForm(p => ({ ...p, ctaType: v as any }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="form">{isRTL ? "نموذج تسجيل" : "Form"}</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="call">{isRTL ? "اتصال هاتفي" : "Call"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {form.ctaType === "whatsapp" && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600">{isRTL ? "رقم واتساب" : "WhatsApp Number"}</label>
              <Input value={form.whatsappNumber} onChange={set("whatsappNumber")} placeholder="+213..." dir="ltr" />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600">{isRTL ? "تاريخ البداية" : "Start Date"} *</label>
              <Input type="date" value={form.startDate} onChange={set("startDate")} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600">{isRTL ? "تاريخ النهاية" : "End Date"} *</label>
              <Input type="date" value={form.endDate} onChange={set("endDate")} />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600">{isRTL ? "موظف المتابعة" : "Assigned To"}</label>
            <Select value={form.assignedTo} onValueChange={v => setForm(p => ({ ...p, assignedTo: v }))}>
              <SelectTrigger><SelectValue placeholder={isRTL ? "اختر موظفاً" : "Select staff"} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">{isRTL ? "بدون تعيين" : "Unassigned"}</SelectItem>
                {salesUsers.map(u => <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600">{isRTL ? "وصف الحملة" : "Description"}</label>
            <Input value={form.description} onChange={set("description")} placeholder={isRTL ? "اختياري" : "Optional"} />
          </div>
        </div>
        <DialogFooter className="gap-2 flex-row-reverse">
          <Button onClick={handleSave} disabled={isPending} style={{ backgroundColor: BRAND_BLUE, color: "white" }}>
            {isPending ? (isRTL ? "جارٍ الحفظ..." : "Saving...") : (isRTL ? "حفظ" : "Save")}
          </Button>
          <DialogClose asChild><Button variant="outline">{isRTL ? "إلغاء" : "Cancel"}</Button></DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── AddLeadModal ───────────────────────────────────────────────────────────────
function AddLeadModal({ campaignId, onClose, isRTL }: { campaignId: number; onClose: () => void; isRTL: boolean }) {
  const { toast } = useToast();
  const addLead = useAddLead(campaignId);
  const [form, setForm] = useState({
    parentName: "", parentPhone: "", parentEmail: "",
    childName: "", childAge: "", preferredLevel: "",
    source: "call" as "whatsapp" | "form" | "call" | "other",
    notes: "",
  });
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  const handleSave = async () => {
    if (!form.parentName || !form.parentPhone || !form.childName) {
      toast({ title: isRTL ? "الحقول المطلوبة ناقصة" : "Required fields missing", variant: "destructive" });
      return;
    }
    try {
      await addLead.mutateAsync({ ...form, parentEmail: form.parentEmail || undefined, notes: form.notes || undefined });
      toast({ title: isRTL ? "تم إضافة العميل ✓" : "Lead added ✓" });
      onClose();
    } catch {
      toast({ title: isRTL ? "حدث خطأ" : "Error", variant: "destructive" });
    }
  };

  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-md" dir={isRTL ? "rtl" : "ltr"}>
        <DialogHeader>
          <DialogTitle>{isRTL ? "إضافة عميل يدوياً" : "Add Lead Manually"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold">{isRTL ? "اسم الولي *" : "Parent Name *"}</label>
              <Input value={form.parentName} onChange={set("parentName")} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold">{isRTL ? "رقم الهاتف *" : "Phone *"}</label>
              <Input value={form.parentPhone} onChange={set("parentPhone")} dir="ltr" />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold">{isRTL ? "البريد الإلكتروني" : "Email"}</label>
            <Input value={form.parentEmail} onChange={set("parentEmail")} type="email" dir="ltr" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold">{isRTL ? "اسم الطفل *" : "Child Name *"}</label>
              <Input value={form.childName} onChange={set("childName")} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold">{isRTL ? "العمر" : "Age"}</label>
              <Input value={form.childAge} onChange={set("childAge")} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold">{isRTL ? "المستوى المفضل" : "Preferred Level"}</label>
              <Input value={form.preferredLevel} onChange={set("preferredLevel")} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold">{isRTL ? "المصدر" : "Source"}</label>
              <Select value={form.source} onValueChange={v => setForm(p => ({ ...p, source: v as any }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="call">{isRTL ? "اتصال" : "Call"}</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="form">{isRTL ? "نموذج" : "Form"}</SelectItem>
                  <SelectItem value="other">{isRTL ? "أخرى" : "Other"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold">{isRTL ? "ملاحظات" : "Notes"}</label>
            <Input value={form.notes} onChange={set("notes")} />
          </div>
        </div>
        <DialogFooter className="gap-2 flex-row-reverse">
          <Button onClick={handleSave} disabled={addLead.isPending} style={{ backgroundColor: BRAND_BLUE, color: "white" }}>
            {addLead.isPending ? (isRTL ? "جارٍ الإضافة..." : "Adding...") : (isRTL ? "إضافة" : "Add")}
          </Button>
          <DialogClose asChild><Button variant="outline">{isRTL ? "إلغاء" : "Cancel"}</Button></DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── LeadRow ────────────────────────────────────────────────────────────────────
function LeadRow({ lead, campaignId, isRTL }: { lead: Lead; campaignId: number; isRTL: boolean }) {
  const { toast } = useToast();
  const updateLead = useUpdateLead(campaignId);
  const deleteLead = useDeleteLead(campaignId);
  const statusConf = LEAD_STATUS_CONFIG[lead.status];
  const StatusIcon = statusConf.icon;

  const handleStatus = async (status: LeadStatus) => {
    await updateLead.mutateAsync({ id: lead.id, status });
  };

  const handleDelete = async () => {
    if (!confirm(isRTL ? "حذف هذا العميل؟" : "Delete this lead?")) return;
    await deleteLead.mutateAsync(lead.id);
    toast({ title: isRTL ? "تم الحذف" : "Deleted" });
  };

  const whatsappUrl = `https://wa.me/${lead.parentPhone.replace(/\D/g, "")}`;

  return (
    <div className="px-4 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-sm font-semibold text-slate-800">{lead.parentName}</span>
          <span className="text-xs text-slate-400">← {lead.childName}</span>
          {lead.childAge && <span className="text-xs text-slate-400">({lead.childAge})</span>}
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <a href={whatsappUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-green-600">
            <Phone className="w-3 h-3" />{lead.parentPhone}
          </a>
          {lead.parentEmail && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{lead.parentEmail}</span>}
          {lead.preferredLevel && <span>{lead.preferredLevel}</span>}
        </div>
        {lead.notes && <p className="text-xs text-slate-400 mt-0.5 truncate max-w-xs">{lead.notes}</p>}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <div
          className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold"
          style={{ backgroundColor: statusConf.bg, color: statusConf.color }}
        >
          <StatusIcon className="w-3 h-3" />
          {isRTL ? statusConf.labelAr : statusConf.label}
        </div>

        <Select value={lead.status} onValueChange={v => handleStatus(v as LeadStatus)}>
          <SelectTrigger className="h-7 w-7 p-0 border-slate-200">
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(LEAD_STATUS_CONFIG) as LeadStatus[]).map(s => (
              <SelectItem key={s} value={s}>
                {isRTL ? LEAD_STATUS_CONFIG[s].labelAr : LEAD_STATUS_CONFIG[s].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <a href={whatsappUrl} target="_blank" rel="noreferrer">
          <Button size="sm" variant="outline" className="h-7 w-7 p-0 border-green-200 text-green-600 hover:bg-green-50">
            <MessageCircle className="w-3.5 h-3.5" />
          </Button>
        </a>

        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-slate-300 hover:text-red-400" onClick={handleDelete}>
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

// ── CampaignDetailPanel ────────────────────────────────────────────────────────
function CampaignDetailPanel({
  campaign, onClose, isRTL,
}: { campaign: Campaign; onClose: () => void; isRTL: boolean }) {
  const [showAddLead, setShowAddLead] = useState(false);
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "all">("all");
  const { data: leads = [], isLoading } = useListLeads(campaign.id);

  const filtered = statusFilter === "all" ? leads : leads.filter(l => l.status === statusFilter);

  const exportCSV = () => {
    const rows = [
      ["Parent Name", "Phone", "Email", "Child Name", "Age", "Level", "Status", "Source", "Notes", "Date"],
      ...leads.map(l => [l.parentName, l.parentPhone, l.parentEmail ?? "", l.childName, l.childAge ?? "", l.preferredLevel ?? "", l.status, l.source, l.notes ?? "", safeFmt(l.createdAt, "yyyy-MM-dd")]),
    ];
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `leads-${campaign.slug}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const typeConf = TYPE_CONFIG[campaign.type];
  const statusConf = STATUS_CONFIG[campaign.status];

  return (
    <div className="fixed inset-0 z-50 flex" dir={isRTL ? "rtl" : "ltr"}>
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative ms-auto w-full max-w-2xl bg-white shadow-2xl flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b bg-white" style={{ borderTop: `3px solid ${typeConf.color}` }}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold uppercase tracking-wide" style={{ color: typeConf.color }}>
                  {isRTL ? typeConf.labelAr : typeConf.label}
                </span>
                <div
                  className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold"
                  style={{ backgroundColor: statusConf.bg, color: statusConf.color }}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${campaign.status === "active" ? "animate-pulse" : ""}`} style={{ backgroundColor: statusConf.dot }} />
                  {isRTL ? statusConf.labelAr : statusConf.label}
                </div>
              </div>
              <h2 className="text-lg font-black text-slate-800">{isRTL ? campaign.nameAr : campaign.name}</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {safeFmt(campaign.startDate, "MMM d")} → {safeFmt(campaign.endDate, "MMM d, yyyy")}
              </p>
            </div>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-4 gap-2 mt-3">
            {[
              { label: isRTL ? "إجمالي" : "Total", value: campaign.leadsCount, color: BRAND_BLUE },
              { label: isRTL ? "جدد" : "New", value: campaign.newLeadsCount, color: "#0891b2" },
              { label: isRTL ? "مسجّلون" : "Registered", value: campaign.registeredCount, color: "#16a34a" },
              { label: isRTL ? "تحويل" : "Conv.", value: campaign.conversionRate != null ? `${campaign.conversionRate}%` : "—", color: BRAND_YELLOW },
            ].map(s => (
              <div key={s.label} className="bg-slate-50 rounded-xl p-2 text-center">
                <p className="text-xs text-slate-400 mb-0.5">{s.label}</p>
                <p className="text-lg font-black" style={{ color: s.color }}>{s.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Toolbar */}
        <div className="px-6 py-3 border-b flex items-center gap-2 bg-white">
          <div className="flex items-center gap-1 overflow-x-auto flex-1">
            {(["all", ...Object.keys(LEAD_STATUS_CONFIG)] as const).map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s as any)}
                className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${statusFilter === s ? "shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
                style={statusFilter === s ? (s === "all" ? { backgroundColor: BRAND_BLUE, color: "white" } : { backgroundColor: LEAD_STATUS_CONFIG[s as LeadStatus].bg, color: LEAD_STATUS_CONFIG[s as LeadStatus].color }) : {}}
              >
                {s === "all" ? (isRTL ? "الكل" : "All") : (isRTL ? LEAD_STATUS_CONFIG[s as LeadStatus].labelAr : LEAD_STATUS_CONFIG[s as LeadStatus].label)}
                {s !== "all" && <span className="ml-1 opacity-60">{leads.filter(l => l.status === s).length}</span>}
              </button>
            ))}
          </div>
          <Button size="sm" variant="outline" className="gap-1 text-xs shrink-0" onClick={exportCSV}>
            <Download className="w-3.5 h-3.5" />
            {isRTL ? "تصدير" : "Export"}
          </Button>
          <Button size="sm" className="gap-1 text-xs shrink-0" style={{ backgroundColor: BRAND_BLUE, color: "white" }} onClick={() => setShowAddLead(true)}>
            <Plus className="w-3.5 h-3.5" />
            {isRTL ? "إضافة" : "Add"}
          </Button>
        </div>

        {/* Leads list */}
        <div className="flex-1 overflow-y-auto divide-y">
          {isLoading ? (
            <div className="py-12 text-center text-sm text-slate-400">{isRTL ? "جارٍ التحميل..." : "Loading..."}</div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-400">
              {isRTL ? "لا يوجد عملاء حتى الآن" : "No leads yet"}
            </div>
          ) : (
            filtered.map(lead => (
              <LeadRow key={lead.id} lead={lead} campaignId={campaign.id} isRTL={isRTL} />
            ))
          )}
        </div>

        {/* WhatsApp share link */}
        {campaign.ctaType === "whatsapp" && campaign.whatsappNumber && (
          <div className="px-6 py-3 border-t bg-green-50">
            <div className="flex items-center gap-2 text-xs text-green-700">
              <MessageCircle className="w-3.5 h-3.5 shrink-0" />
              <span className="font-semibold">{isRTL ? "رابط واتساب:" : "WhatsApp link:"}</span>
              <a
                href={`https://wa.me/${campaign.whatsappNumber.replace(/\D/g, "")}?text=${encodeURIComponent(isRTL ? campaign.nameAr : campaign.name)}`}
                target="_blank" rel="noreferrer"
                className="underline truncate"
                dir="ltr"
              >
                wa.me/{campaign.whatsappNumber.replace(/\D/g, "")}
              </a>
            </div>
          </div>
        )}
      </div>

      {showAddLead && (
        <AddLeadModal campaignId={campaign.id} onClose={() => setShowAddLead(false)} isRTL={isRTL} />
      )}
    </div>
  );
}

// ── CampaignCard ───────────────────────────────────────────────────────────────
function CampaignCard({
  campaign, onView, onEdit, isRTL,
}: { campaign: Campaign; onView: () => void; onEdit: () => void; isRTL: boolean }) {
  const { toast } = useToast();
  const updateCampaign = useUpdateCampaign();
  const deleteCampaign = useDeleteCampaign();
  const typeConf   = TYPE_CONFIG[campaign.type];
  const statusConf = STATUS_CONFIG[campaign.status];
  const TypeIcon   = typeConf.icon;

  const handleToggle = async () => {
    const newStatus = campaign.status === "active" ? "paused" : "active";
    await updateCampaign.mutateAsync({ id: campaign.id, status: newStatus });
    toast({ title: newStatus === "active" ? (isRTL ? "تم استئناف الحملة ✓" : "Campaign resumed ✓") : (isRTL ? "تم إيقاف الحملة ✓" : "Campaign paused ✓") });
  };

  const handleDelete = async () => {
    if (!confirm(isRTL ? "حذف هذه الحملة وكل عملائها؟" : "Delete this campaign and all its leads?")) return;
    await deleteCampaign.mutateAsync(campaign.id);
    toast({ title: isRTL ? "تم الحذف" : "Deleted" });
  };

  return (
    <div
      className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden"
      style={{ border: "1px solid #f1f5f9", borderInlineStart: `4px solid ${statusConf.border}` }}
    >
      <div className="p-4 pb-3">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div
            className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-semibold shrink-0"
            style={{ backgroundColor: `${typeConf.color}15`, color: typeConf.color }}
          >
            <TypeIcon className="w-3.5 h-3.5" />
            {isRTL ? typeConf.labelAr : typeConf.label}
          </div>
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold"
            style={{ backgroundColor: statusConf.bg, color: statusConf.color }}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${campaign.status === "active" ? "animate-pulse" : ""}`} style={{ backgroundColor: statusConf.dot }} />
            {isRTL ? statusConf.labelAr : statusConf.label}
          </div>
        </div>

        <h3 className="font-bold text-sm text-slate-800 leading-snug mb-2" dir="auto">
          {isRTL ? campaign.nameAr : campaign.name}
        </h3>
        <p className="text-xs text-slate-400 flex items-center gap-1.5 mb-4">
          <CalendarDays className="w-3 h-3 shrink-0" />
          {safeFmt(campaign.startDate, "MMM d")} → {safeFmt(campaign.endDate, "MMM d, yyyy")}
        </p>

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl p-3 text-center" style={{ background: `${BRAND_BLUE}08` }}>
            <div className="flex items-center justify-center gap-1 mb-1">
              <Users className="w-3 h-3" style={{ color: BRAND_BLUE }} />
              <span className="text-[10px] text-slate-400 uppercase tracking-wide font-medium">{isRTL ? "عملاء" : "Leads"}</span>
            </div>
            <p className="text-2xl font-black" style={{ color: BRAND_BLUE }}>{campaign.leadsCount}</p>
          </div>

          {campaign.status === "active" ? (
            <div className="rounded-xl p-3 text-center bg-green-50">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Zap className="w-3 h-3 text-green-600" />
                <span className="text-[10px] text-slate-400 uppercase tracking-wide font-medium">{isRTL ? "جدد" : "New"}</span>
              </div>
              <p className="text-2xl font-black text-green-600">{campaign.newLeadsCount}</p>
            </div>
          ) : campaign.conversionRate != null ? (
            <div className="rounded-xl p-3 text-center" style={{ background: `${BRAND_YELLOW}12` }}>
              <div className="flex items-center justify-center gap-1 mb-1">
                <Target className="w-3 h-3" style={{ color: BRAND_YELLOW }} />
                <span className="text-[10px] text-slate-400 uppercase tracking-wide font-medium">{isRTL ? "تحويل" : "Conv."}</span>
              </div>
              <p className="text-2xl font-black" style={{ color: BRAND_YELLOW }}>{campaign.conversionRate}%</p>
            </div>
          ) : (
            <div className="rounded-xl p-3 text-center bg-slate-50">
              <div className="flex items-center justify-center gap-1 mb-1">
                <TrendingUp className="w-3 h-3 text-slate-300" />
                <span className="text-[10px] text-slate-300 uppercase tracking-wide font-medium">{isRTL ? "معدل" : "Rate"}</span>
              </div>
              <p className="text-2xl font-black text-slate-300">—</p>
            </div>
          )}
        </div>
      </div>

      <div className="h-px bg-slate-100" />

      <div className="px-4 py-3 flex items-center gap-2">
        <Button size="sm" variant="outline" className="flex-1 h-8 text-xs font-semibold gap-1.5" onClick={onView}>
          <Eye className="w-3.5 h-3.5" />{isRTL ? "عرض العملاء" : "View Leads"}
        </Button>
        {campaign.status !== "ended" && (
          <Button
            size="sm" variant="outline"
            className="h-8 px-3 text-xs font-semibold gap-1"
            style={campaign.status === "active"
              ? { borderColor: "#fcd34d", color: "#92400e", background: "#fffbeb" }
              : { borderColor: "#86efac", color: "#166534", background: "#f0fdf4" }}
            onClick={handleToggle}
          >
            {campaign.status === "active"
              ? <><Pause className="w-3.5 h-3.5" />{isRTL ? "إيقاف" : "Pause"}</>
              : <><Play  className="w-3.5 h-3.5" />{isRTL ? "استئناف" : "Resume"}</>}
          </Button>
        )}
        <Button size="sm" variant="ghost" className="h-8 px-2.5 text-slate-400 hover:text-slate-700" onClick={onEdit}>
          <Edit2 className="w-3.5 h-3.5" />
        </Button>
        <Button size="sm" variant="ghost" className="h-8 px-2.5 text-slate-300 hover:text-red-400" onClick={handleDelete}>
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

// ── KanbanColumn ───────────────────────────────────────────────────────────────
function KanbanColumn({ status, campaigns, onView, onEdit, isRTL }: {
  status: "active" | "paused" | "ended";
  campaigns: Campaign[];
  onView: (c: Campaign) => void;
  onEdit: (c: Campaign) => void;
  isRTL: boolean;
}) {
  const conf = STATUS_CONFIG[status];
  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2.5 mb-4 px-1">
        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: conf.dot }} />
        <h2 className="text-xs font-bold text-slate-600 uppercase tracking-widest flex-1">
          {isRTL ? conf.labelAr : conf.label}
        </h2>
        <span className="text-xs font-black px-2 py-0.5 rounded-full" style={{ backgroundColor: `${conf.dot}20`, color: conf.color }}>
          {campaigns.length}
        </span>
      </div>
      <div className="h-0.5 rounded-full mb-4" style={{ backgroundColor: `${conf.border}30` }} />
      <div className="space-y-4">
        {campaigns.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-slate-100 py-10 text-center">
            <p className="text-xs text-slate-300 font-medium">
              {isRTL ? `لا توجد حملات ${conf.labelAr}` : `No ${conf.label.toLowerCase()} campaigns`}
            </p>
          </div>
        ) : campaigns.map(c => (
          <CampaignCard key={c.id} campaign={c} onView={() => onView(c)} onEdit={() => onEdit(c)} isRTL={isRTL} />
        ))}
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function MarketingHub() {
  const { isRTL } = useLanguage();
  const { data: campaigns = [], isLoading } = useListCampaigns();

  const [showCreate, setShowCreate]   = useState(false);
  const [editCampaign, setEditCampaign] = useState<Campaign | null>(null);
  const [viewCampaign, setViewCampaign] = useState<Campaign | null>(null);

  const active = campaigns.filter(c => c.status === "active");
  const paused = campaigns.filter(c => c.status === "paused");
  const ended  = campaigns.filter(c => c.status === "ended");

  const totalLeads   = campaigns.reduce((s, c) => s + c.leadsCount, 0);
  const todayNew     = active.reduce((s, c) => s + c.newLeadsCount, 0);

  if (isLoading) {
    return <div className="p-8 text-center text-slate-400">{isRTL ? "جارٍ التحميل..." : "Loading..."}</div>;
  }

  const STATS = [
    { label: isRTL ? "إجمالي الحملات" : "Total Campaigns", value: campaigns.length, icon: Megaphone,  color: BRAND_BLUE },
    { label: isRTL ? "الحملات النشطة" : "Active Now",       value: active.length,   icon: TrendingUp, color: "#16a34a" },
    { label: isRTL ? "إجمالي العملاء" : "Total Leads",       value: totalLeads,      icon: Users,      color: BRAND_BLUE },
    { label: isRTL ? "عملاء جدد"      : "New Leads",         value: todayNew,        icon: Zap,        color: BRAND_YELLOW },
  ];

  return (
    <div className="space-y-8" dir={isRTL ? "rtl" : "ltr"}>
      {/* Hero */}
      <div className="rounded-2xl px-6 py-5" style={{ background: `linear-gradient(135deg, ${BRAND_BLUE} 0%, #0f1e5c 100%)` }}>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "rgba(245,166,0,0.2)", border: "1px solid rgba(245,166,0,0.3)" }}>
              <Megaphone className="w-6 h-6" style={{ color: BRAND_YELLOW }} />
            </div>
            <div>
              <h1 className="text-xl font-black text-white tracking-tight">{isRTL ? "مركز التسويق" : "Marketing Hub"}</h1>
              <p className="text-sm mt-0.5" style={{ color: "rgba(255,255,255,0.55)" }}>
                {isRTL ? "أطلق حملاتك، استقطب عملاء جدد، وتتبع النتائج" : "Launch campaigns, capture leads, and track conversions"}
              </p>
            </div>
          </div>
          <Button
            size="sm" className="gap-1.5 font-bold"
            style={{ backgroundColor: BRAND_YELLOW, color: BRAND_BLUE }}
            onClick={() => setShowCreate(true)}
          >
            <Plus className="w-4 h-4" />
            {isRTL ? "حملة جديدة" : "New Campaign"}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {STATS.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${color}15` }}>
                <Icon className="w-4 h-4" style={{ color }} />
              </div>
              <span className="text-xs text-slate-500 font-medium">{label}</span>
            </div>
            <p className="text-2xl font-black" style={{ color }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Kanban */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        <KanbanColumn status="active" campaigns={active} onView={setViewCampaign} onEdit={setEditCampaign} isRTL={isRTL} />
        <KanbanColumn status="paused" campaigns={paused} onView={setViewCampaign} onEdit={setEditCampaign} isRTL={isRTL} />
        <KanbanColumn status="ended"  campaigns={ended}  onView={setViewCampaign} onEdit={setEditCampaign} isRTL={isRTL} />
      </div>

      {/* Modals */}
      {showCreate && <CampaignFormModal onClose={() => setShowCreate(false)} isRTL={isRTL} />}
      {editCampaign && <CampaignFormModal campaign={editCampaign} onClose={() => setEditCampaign(null)} isRTL={isRTL} />}
      {viewCampaign && <CampaignDetailPanel campaign={viewCampaign} onClose={() => setViewCampaign(null)} isRTL={isRTL} />}
    </div>
  );
}

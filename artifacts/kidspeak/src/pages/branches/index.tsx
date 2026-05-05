import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Building2, Plus, Phone, MapPin, User, Edit2, Trash2, Users, BookOpen, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useBranch, Branch } from "@/contexts/branch-context";
import { useLanguage } from "@/contexts/language-context";

const EMPTY_FORM = {
  name: "",
  nameAr: "",
  address: "",
  addressAr: "",
  managerId: "" as string,   // user id as string for select value
  phone: "",
  invoicePrefix: "",
};

export default function BranchesPage() {
  const { branches, refetch, isLoading } = useBranch();
  const { isRTL } = useLanguage();
  const { toast } = useToast();

  const [staffList, setStaffList] = useState<{ id: number; name: string; role: string }[]>([]);
  useEffect(() => {
    fetch("/api/users?role=branch_manager", { credentials: "include" })
      .then(r => r.ok ? r.json() : [])
      .then((data: any[]) => setStaffList(data))
      .catch(() => {});
  }, []);

  const [isOpen, setIsOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [isSaving, setIsSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Branch | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [branchStats, setBranchStats] = useState<Record<number, { pupilCount: number; staffCount: number; groupCount: number }>>({});

  const lbl = (en: string, ar: string) => isRTL ? ar : en;

  const openCreate = () => {
    setEditingBranch(null);
    setForm({ ...EMPTY_FORM });
    setIsOpen(true);
  };

  const openEdit = (branch: Branch) => {
    setEditingBranch(branch);
    setForm({
      name: branch.name,
      nameAr: branch.nameAr ?? "",
      address: branch.address ?? "",
      addressAr: branch.addressAr ?? "",
      managerId: branch.managerId ? String(branch.managerId) : "",
      phone: branch.phone ?? "",
      invoicePrefix: branch.invoicePrefix ?? "",
    });
    setIsOpen(true);
  };

  const fetchStats = async (branchId: number) => {
    if (branchStats[branchId]) return;
    try {
      const res = await fetch(`/api/branches/${branchId}/stats`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setBranchStats(prev => ({ ...prev, [branchId]: data }));
      }
    } catch {}
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast({ title: lbl("Branch name is required", "اسم الفرع مطلوب"), variant: "destructive" }); return;
    }
    setIsSaving(true);
    try {
      const url = editingBranch ? `/api/branches/${editingBranch.id}` : "/api/branches";
      const method = editingBranch ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: form.name.trim(),
          nameAr: form.nameAr.trim() || null,
          address: form.address.trim() || null,
          addressAr: form.addressAr.trim() || null,
          managerId: form.managerId ? parseInt(form.managerId) : null,
          phone: form.phone.trim() || null,
          invoicePrefix: form.invoicePrefix.trim().toUpperCase() || "INV",
        }),
      });
      if (res.ok) {
        toast({ title: editingBranch ? lbl("Branch updated!", "تم تحديث الفرع!") : lbl("Branch created!", "تم إنشاء الفرع!") });
        setIsOpen(false);
        refetch();
      } else {
        const err = await res.json();
        toast({ title: err.error || lbl("Failed to save", "فشل في الحفظ"), variant: "destructive" });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/branches/${deleteTarget.id}`, { method: "DELETE", credentials: "include" });
      if (res.ok || res.status === 204) {
        toast({ title: lbl("Branch deleted.", "تم حذف الفرع.") });
        setDeleteTarget(null);
        refetch();
      } else {
        const err = await res.json();
        toast({ title: err.error || lbl("Cannot delete branch", "لا يمكن حذف الفرع"), variant: "destructive" });
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const fieldCls = "space-y-1.5";
  const labelCls = "text-sm font-semibold";

  const BRANCH_COLORS = ["#1B2E8F", "#7c3aed", "#0891b2", "#059669", "#d97706", "#dc2626"];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-2" style={{ color: "#1B2E8F" }}>
            <Building2 className="w-8 h-8" />
            {lbl("Branches", "الفروع")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {lbl("Manage your school's branch locations.", "إدارة فروع المدرسة.")}
          </p>
        </div>
        <Button
          className="font-semibold"
          style={{ backgroundColor: "#F5A600", color: "#1B2E8F" }}
          onClick={openCreate}
        >
          <Plus className="w-4 h-4 me-2" />
          {lbl("New Branch", "فرع جديد")}
        </Button>
      </div>

      {/* Branch Stats Summary */}
      {branches.length > 0 && (
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          <Card className="border-2" style={{ borderColor: "#1B2E8F20" }}>
            <CardContent className="pt-4 pb-3">
              <div className="text-2xl font-black" style={{ color: "#1B2E8F" }}>{branches.length}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{lbl("Total Branches", "إجمالي الفروع")}</div>
            </CardContent>
          </Card>
          <Card className="border-2" style={{ borderColor: "#F5A60020" }}>
            <CardContent className="pt-4 pb-3">
              <div className="text-2xl font-black" style={{ color: "#F5A600" }}>
                {branches.reduce((sum, b) => sum + (b as any).pupilCount, 0)}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">{lbl("Assigned Pupils", "التلاميذ المسجلون")}</div>
            </CardContent>
          </Card>
          <Card className="border-2 border-emerald-200">
            <CardContent className="pt-4 pb-3">
              <div className="text-2xl font-black text-emerald-700">
                {branches.filter(b => b.isActive).length}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">{lbl("Active Branches", "الفروع النشطة")}</div>
            </CardContent>
          </Card>
          <Card className="border-2 border-violet-200">
            <CardContent className="pt-4 pb-3">
              <div className="text-2xl font-black text-violet-700">{branches.filter(b => !b.isActive).length}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{lbl("Inactive", "غير نشط")}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Branches Grid */}
      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">{lbl("Loading branches…", "تحميل الفروع…")}</div>
      ) : branches.length === 0 ? (
        <div className="py-20 text-center border-2 border-dashed rounded-2xl">
          <Building2 className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
          <h3 className="font-semibold text-muted-foreground">{lbl("No branches yet", "لا توجد فروع بعد")}</h3>
          <p className="text-sm text-muted-foreground mt-1">{lbl("Create your first branch to get started.", "أنشئ فرعك الأول للبدء.")}</p>
          <Button className="mt-4 font-semibold" style={{ backgroundColor: "#F5A600", color: "#1B2E8F" }} onClick={openCreate}>
            <Plus className="w-4 h-4 me-2" />
            {lbl("Create Branch", "إنشاء فرع")}
          </Button>
        </div>
      ) : (
        <div className="grid gap-5 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
          {branches.map((branch, idx) => {
            const color = BRANCH_COLORS[idx % BRANCH_COLORS.length];
            const stats = branchStats[branch.id];
            const pupilCount = (branch as any).pupilCount ?? 0;
            return (
              <Card
                key={branch.id}
                className="overflow-hidden hover:shadow-lg transition-all cursor-default border-2"
                style={{ borderColor: `${color}20` }}
                onMouseEnter={() => fetchStats(branch.id)}
              >
                {/* Color strip */}
                <div className="h-2 w-full" style={{ backgroundColor: color }} />
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-lg shadow-md" style={{ backgroundColor: color }}>
                        {(isRTL && branch.nameAr ? branch.nameAr : branch.name).charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-bold text-base leading-tight">
                          {isRTL && branch.nameAr ? branch.nameAr : branch.name}
                        </h3>
                        {isRTL && branch.nameAr && branch.name !== branch.nameAr && (
                          <p className="text-xs text-muted-foreground">{branch.name}</p>
                        )}
                        <Badge
                          variant="outline"
                          className={`text-xs mt-1 ${branch.isActive ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-600 border-red-200"}`}
                        >
                          {branch.isActive ? lbl("Active", "نشط") : lbl("Inactive", "غير نشط")}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => openEdit(branch)}>
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => setDeleteTarget(branch)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Branch details */}
                  <div className="mt-4 space-y-2">
                    {(branch.address || branch.addressAr) && (
                      <div className="flex items-start gap-2 text-sm">
                        <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                        <span className="text-muted-foreground text-xs leading-relaxed">
                          {isRTL && branch.addressAr ? branch.addressAr : branch.address}
                        </span>
                      </div>
                    )}
                    {branch.managerName && (
                      <div className="flex items-center gap-2 text-sm">
                        <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <span className="text-xs text-muted-foreground">{branch.managerName}</span>
                      </div>
                    )}
                    {branch.phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <a href={`tel:${branch.phone}`} className="text-xs hover:underline" style={{ color }} dir="ltr">{branch.phone}</a>
                      </div>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="mt-4 pt-4 border-t grid grid-cols-3 gap-2 text-center">
                    <div>
                      <div className="text-lg font-black" style={{ color }}>{pupilCount}</div>
                      <div className="text-xs text-muted-foreground">{lbl("Pupils", "تلاميذ")}</div>
                    </div>
                    <div>
                      <div className="text-lg font-black" style={{ color }}>{stats?.staffCount ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{lbl("Staff", "موظفون")}</div>
                    </div>
                    <div>
                      <div className="text-lg font-black" style={{ color }}>{stats?.groupCount ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{lbl("Groups", "مجموعات")}</div>
                    </div>
                  </div>

                  {/* Invoice prefix tag */}
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{lbl("Invoice prefix:", "بادئة الفاتورة:")}</span>
                    <code className="text-xs font-mono px-1.5 py-0.5 rounded" style={{ backgroundColor: `${color}15`, color }}>
                      {branch.invoicePrefix}-XXXXX
                    </code>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={isOpen} onOpenChange={o => { if (!o) setIsOpen(false); }}>
        <DialogContent className="max-w-lg" dir={isRTL ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-black" style={{ color: "#1B2E8F" }}>
              <Building2 className="w-5 h-5" />
              {editingBranch ? lbl("Edit Branch", "تعديل الفرع") : lbl("New Branch", "فرع جديد")}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className={fieldCls}>
                <label className={labelCls}>{lbl("Branch Name (EN)", "اسم الفرع (إنجليزي)")} <span className="text-red-500">*</span></label>
                <Input placeholder="e.g. Main Branch" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div className={fieldCls}>
                <label className={labelCls}>{lbl("Branch Name (AR)", "اسم الفرع (عربي)")}</label>
                <Input placeholder="مثال: الفرع الرئيسي" value={form.nameAr} onChange={e => setForm(p => ({ ...p, nameAr: e.target.value }))} dir="rtl" />
              </div>
            </div>

            <div className={fieldCls}>
              <label className={labelCls}>{lbl("Address (EN)", "العنوان (إنجليزي)")}</label>
              <Textarea rows={2} placeholder="e.g. 12 Rue Didouche, Algiers" value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} />
            </div>

            <div className={fieldCls}>
              <label className={labelCls}>{lbl("Address (AR)", "العنوان (عربي)")}</label>
              <Textarea rows={2} placeholder="مثال: 12 شارع ديدوش، الجزائر العاصمة" value={form.addressAr} onChange={e => setForm(p => ({ ...p, addressAr: e.target.value }))} dir="rtl" />
            </div>

            <div className={fieldCls}>
              <label className={labelCls}>{lbl("Branch Manager", "مسؤول الفرع")}</label>
              <select
                value={form.managerId}
                onChange={e => setForm(f => ({ ...f, managerId: e.target.value }))}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">{lbl("— No manager assigned —", "— بدون مسؤول —")}</option>
                {staffList.map(s => (
                  <option key={s.id} value={String(s.id)}>
                    {s.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                {lbl("Only users with 'Branch Manager' role appear here.", "يظهر هنا المستخدمون الذين لديهم دور مسؤول الفرع فقط.")}
              </p>
            </div>

            <div className={fieldCls}>
              <label className={labelCls}>{lbl("Phone", "الهاتف")}</label>
              <Input type="tel" placeholder="+213 XXX XXX XXX" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} dir="ltr" />
            </div>

            <div className={fieldCls}>
              <label className={labelCls}>{lbl("Invoice Prefix", "بادئة الفاتورة")}</label>
              <Input
                placeholder="e.g. ALG, ORA, ANN"
                maxLength={6}
                value={form.invoicePrefix}
                onChange={e => setForm(p => ({ ...p, invoicePrefix: e.target.value.toUpperCase() }))}
                className="font-mono uppercase"
              />
              <p className="text-xs text-muted-foreground">
                {lbl("Short code used in invoice numbers, e.g. ALG-00001", "الرمز المستخدم في أرقام الفواتير مثل ALG-00001")}
              </p>
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">{lbl("Cancel", "إلغاء")}</Button>
            </DialogClose>
            <Button
              className="font-semibold"
              style={{ backgroundColor: "#F5A600", color: "#1B2E8F" }}
              onClick={handleSave}
              disabled={isSaving || !form.name.trim()}
            >
              {isSaving ? lbl("Saving…", "جارٍ الحفظ…") : lbl("Save Branch", "حفظ الفرع")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={o => { if (!o) setDeleteTarget(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="w-5 h-5" />
              {lbl("Delete Branch", "حذف الفرع")}
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-3">
            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800">
                {lbl(
                  "All pupils, staff, and groups assigned to this branch will have their branch cleared. This cannot be undone.",
                  "سيتم إزالة الفرع من جميع التلاميذ والموظفين والمجموعات المرتبطة به. لا يمكن التراجع عن هذا الإجراء."
                )}
              </p>
            </div>
            {deleteTarget && (
              <p className="text-sm font-semibold text-red-700 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">
                {isRTL && deleteTarget.nameAr ? deleteTarget.nameAr : deleteTarget.name}
              </p>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">{lbl("Cancel", "إلغاء")}</Button></DialogClose>
            <Button variant="destructive" disabled={isDeleting} onClick={handleDelete}>
              {isDeleting ? lbl("Deleting…", "جارٍ الحذف…") : lbl("Delete Branch", "حذف الفرع")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

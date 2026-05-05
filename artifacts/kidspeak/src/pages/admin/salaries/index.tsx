import { useState } from "react";
import { useLanguage } from "@/contexts/language-context";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useListUsers } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, DollarSign, Users } from "lucide-react";
import { format } from "date-fns";

function fetchSalaries(): Promise<any[]> {
  return fetch("/api/salaries", { credentials: "include" }).then(r => r.json());
}

function postSalary(payload: any): Promise<any> {
  return fetch("/api/salaries", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).then(async r => {
    if (!r.ok) { const e = await r.json(); throw new Error(e.error || "Error"); }
    return r.json();
  });
}

function deleteSalary(id: number): Promise<void> {
  return fetch(`/api/salaries/${id}`, { method: "DELETE", credentials: "include" }).then(r => {
    if (!r.ok) throw new Error("Failed");
  });
}

function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["salaries"],                exact: false });
  qc.invalidateQueries({ queryKey: ["salaries/my"],             exact: false });
  qc.invalidateQueries({ queryKey: ["/api/dashboard/revenue"],  exact: false });
  qc.invalidateQueries({ queryKey: ["/api/expenses"],           exact: false });
  qc.invalidateQueries({ queryKey: ["/api/dashboard"],          exact: false });
  qc.invalidateQueries({ queryKey: ["admin-dashboard"],         exact: false });
  qc.invalidateQueries({ queryKey: ["/api/earnings/my"],        exact: false });
  qc.invalidateQueries({ queryKey: ["admin-summary"],           exact: false });
}

export default function AdminSalaries() {
  const { language } = useLanguage();
  const isRTL = language === "ar";
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: salaries = [], isLoading } = useQuery({ queryKey: ["salaries"], queryFn: fetchSalaries });
  const { data: users = [] } = useListUsers();
  const employees = (users as any[]).filter((u: any) =>
    ["teacher", "psychologist", "admin", "accountant", "branch_manager", "receptionist"].includes(u.role)
  );

  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState({
    employeeId: "",
    amount: "",
    period: "",
    paidAt: new Date().toISOString().split("T")[0],
    note: "",
    profitSharePercent: "",
  });
  const [filterEmpId, setFilterEmpId] = useState<string>("all");

  const selectedEmployee = employees.find((u: any) => String(u.id) === form.employeeId);
  const isAdminEmployee = selectedEmployee?.role === "admin";

  const addMutation = useMutation({
    mutationFn: postSalary,
    onSuccess: () => {
      invalidateAll(qc);
      toast({ title: isRTL ? "تم إضافة الراتب" : "Salary added" });
      setIsOpen(false);
      setForm({ employeeId: "", amount: "", period: "", paidAt: new Date().toISOString().split("T")[0], note: "", profitSharePercent: "" });
    },
    onError: (e: any) => toast({ title: e.message || "Error", variant: "destructive" }),
  });

  const delMutation = useMutation({
    mutationFn: deleteSalary,
    onSuccess: () => {
      invalidateAll(qc);
      toast({ title: isRTL ? "تم الحذف" : "Deleted" });
    },
  });

  const displayedSalaries = filterEmpId === "all"
    ? (salaries as any[])
    : (salaries as any[]).filter((s: any) => String(s.employeeId) === filterEmpId);

  const totalThisMonth = (salaries as any[]).reduce((sum: number, s: any) => {
    const now = new Date();
    const sDate = new Date(s.paidAt);
    if (sDate.getFullYear() === now.getFullYear() && sDate.getMonth() === now.getMonth()) {
      return sum + (s.amount ?? 0);
    }
    return sum;
  }, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.employeeId || !form.amount || !form.period || !form.paidAt) return;
    addMutation.mutate({
      employeeId: parseInt(form.employeeId),
      amount: parseFloat(form.amount),
      period: form.period,
      paidAt: form.paidAt,
      note: form.note || undefined,
      profitSharePercent: isAdminEmployee && form.profitSharePercent
        ? parseFloat(form.profitSharePercent)
        : null,
    });
  };

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6" dir={isRTL ? "rtl" : "ltr"}>
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">{isRTL ? "إدارة الرواتب" : "Salary Management"}</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {isRTL ? "تسجيل رواتب الموظفين وتتبع المدفوعات" : "Record employee salaries and track payments"}
          </p>
        </div>
        <Button onClick={() => setIsOpen(true)}>
          <Plus className="h-4 w-4 me-1.5" />
          {isRTL ? "إضافة راتب" : "Add salary"}
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <DollarSign className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground">{isRTL ? "رواتب هذا الشهر" : "This month payroll"}</div>
                <div className="text-lg font-bold text-emerald-700">{totalThisMonth.toLocaleString()} {isRTL ? "دج" : "DZD"}</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground">{isRTL ? "عدد الموظفين" : "Employees"}</div>
                <div className="text-lg font-bold">
                  {new Set((salaries as any[]).map((s: any) => s.employeeId)).size}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <DollarSign className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground">{isRTL ? "إجمالي المدفوعات" : "Total payments"}</div>
                <div className="text-lg font-bold">{(salaries as any[]).length}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter by employee */}
      <div className="flex items-center gap-3">
        <Select value={filterEmpId} onValueChange={setFilterEmpId}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder={isRTL ? "كل الموظفين" : "All employees"} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{isRTL ? "كل الموظفين" : "All employees"}</SelectItem>
            {employees.map((u: any) => (
              <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {filterEmpId !== "all" && (
          <Button variant="ghost" size="sm" onClick={() => setFilterEmpId("all")}>
            {isRTL ? "إلغاء" : "Clear"}
          </Button>
        )}
      </div>

      {/* Salary records */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">{isRTL ? "جاري التحميل..." : "Loading..."}</div>
      ) : displayedSalaries.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border rounded-lg bg-card/50">
          {isRTL ? "لا توجد سجلات رواتب" : "No salary records yet"}
        </div>
      ) : (
        <div className="space-y-3">
          {displayedSalaries.map((sal: any) => (
            <Card key={sal.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="py-3 px-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-emerald-500/15 flex items-center justify-center shrink-0">
                    <DollarSign className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-sm truncate">{sal.employeeName || `#${sal.employeeId}`}</div>
                    <div className="text-xs text-muted-foreground">{sal.period}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-end">
                    <div className="font-bold text-emerald-700">{sal.amount?.toLocaleString()} {isRTL ? "دج" : "DZD"}</div>
                    <div className="text-xs text-muted-foreground">
                      {sal.paidAt ? format(new Date(sal.paidAt), "dd/MM/yyyy") : "—"}
                    </div>
                  </div>
                  {sal.profitSharePercent != null && (
                    <Badge variant="outline" className="text-xs text-purple-700 border-purple-200 hidden sm:block">
                      {sal.profitSharePercent}%
                    </Badge>
                  )}
                  {sal.note && (
                    <Badge variant="outline" className="text-xs max-w-[120px] truncate hidden sm:block">
                      {sal.note}
                    </Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => delMutation.mutate(sal.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Salary Dialog */}
      <Dialog open={isOpen} onOpenChange={(v) => !v && setIsOpen(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{isRTL ? "إضافة راتب" : "Add salary payment"}</DialogTitle>
            <DialogDescription>
              {isRTL ? "سيتم تسجيل الراتب تلقائياً في المصاريف." : "Salary will be auto-added to expenses."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{isRTL ? "الموظف *" : "Employee *"}</label>
              <Select value={form.employeeId} onValueChange={(v) => setForm(f => ({ ...f, employeeId: v, profitSharePercent: "" }))}>
                <SelectTrigger>
                  <SelectValue placeholder={isRTL ? "اختر موظفاً..." : "Select employee..."} />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((u: any) => (
                    <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{isRTL ? "المبلغ (دج) *" : "Amount (DZD) *"}</label>
                <Input
                  type="number"
                  min="0"
                  value={form.amount}
                  onChange={(e) => setForm(f => ({ ...f, amount: e.target.value }))}
                  placeholder="25000"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{isRTL ? "تاريخ الدفع *" : "Pay date *"}</label>
                <Input
                  type="date"
                  value={form.paidAt}
                  onChange={(e) => setForm(f => ({ ...f, paidAt: e.target.value }))}
                  required
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{isRTL ? "الفترة (مثال: أبريل 2026) *" : "Period (e.g. April 2026) *"}</label>
              <Input
                value={form.period}
                onChange={(e) => setForm(f => ({ ...f, period: e.target.value }))}
                placeholder={isRTL ? "أبريل 2026" : "April 2026"}
                required
              />
            </div>
            {isAdminEmployee && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{isRTL ? "نسبة من الأرباح % (اختياري)" : "Profit share % (optional)"}</label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={form.profitSharePercent}
                  onChange={(e) => setForm(f => ({ ...f, profitSharePercent: e.target.value }))}
                  placeholder="5"
                />
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{isRTL ? "ملاحظة" : "Note"}</label>
              <Input
                value={form.note}
                onChange={(e) => setForm(f => ({ ...f, note: e.target.value }))}
                placeholder={isRTL ? "اختياري..." : "Optional..."}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                {isRTL ? "إلغاء" : "Cancel"}
              </Button>
              <Button
                type="submit"
                disabled={addMutation.isPending || !form.employeeId || !form.amount || !form.period || !form.paidAt}
              >
                {addMutation.isPending ? (isRTL ? "جاري الحفظ..." : "Saving...") : (isRTL ? "إضافة" : "Add")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

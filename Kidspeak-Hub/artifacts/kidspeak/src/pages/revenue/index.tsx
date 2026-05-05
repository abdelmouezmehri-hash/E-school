import { useState } from "react";
import {
  useGetRevenueDashboard, useListExpenses, useCreateExpense,
  useListExpenseTemplates, useCreateExpenseTemplate, useUpdateExpenseTemplate,
  useDeleteExpenseTemplate, useGenerateExpenses,
  type ExpenseTemplate,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";

function safeFmt(dateStr: string | null | undefined, fmt: string): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return String(dateStr);
  return format(d, fmt);
}
import { Plus, ArrowUpRight, ArrowDownRight, TrendingUp, TrendingDown, Receipt as ReceiptIcon, Minus, Equal, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell as PieCell } from "recharts";
import { useLanguage } from "@/contexts/language-context";

const BRAND_BLUE = "#1B2E8F";
const BRAND_YELLOW = "#F5A600";

const expenseSchema = z.object({
  category: z.enum(["rent", "utilities", "salaries", "materials", "maintenance", "other"]),
  description: z.string().min(1, "Description is required"),
  amount: z.coerce.number().min(0.01),
  expenseDate: z.string().min(1, "Date is required"),
  notes: z.string().optional(),
});

type ExpenseFormValues = z.infer<typeof expenseSchema>;

export default function RevenueDashboard() {
  const [month, setMonth] = useState(format(new Date(), "yyyy-MM"));
  const [isExpenseOpen, setIsExpenseOpen] = useState(false);
  const { toast } = useToast();
  const { t, isRTL } = useLanguage();

  const { data: dashboard, isLoading: isLoadingDash } = useGetRevenueDashboard({ month });
  const { data: expenses = [], refetch: refetchExpenses } = useListExpenses({ month });
  const { mutate: createExpense, isPending: isCreatingExpense } = useCreateExpense();

  const { data: templates = [] } = useListExpenseTemplates();
  const { mutate: createTemplate, isPending: isCreatingTemplate } = useCreateExpenseTemplate();
  const { mutate: updateTemplate, isPending: isUpdatingTemplate } = useUpdateExpenseTemplate();
  const { mutate: deleteTemplate } = useDeleteExpenseTemplate();
  const { mutate: generateExpenses, isPending: isGenerating } = useGenerateExpenses();

  const [isTemplateOpen, setIsTemplateOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ExpenseTemplate | null>(null);
  const [templateForm, setTemplateForm] = useState({ name: "", category: "other", defaultAmount: "" });
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [generateAmounts, setGenerateAmounts] = useState<Record<number, { amount: number; checked: boolean }>>({});

  const generatedTemplateIds = new Set(
    (expenses as any[]).filter(e => e.templateId != null).map((e: any) => e.templateId as number)
  );
  const activeTemplates = templates.filter(t => t.isActive);

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      category: "other",
      description: "",
      amount: 0,
      expenseDate: new Date().toISOString().split('T')[0],
      notes: "",
    }
  });

  const onSubmitExpense = (data: ExpenseFormValues) => {
    createExpense({ data }, {
      onSuccess: () => {
        toast({ title: t.revenue.expenseLog });
        setIsExpenseOpen(false);
        form.reset();
        refetchExpenses();
      },
      onError: (error) => {
        toast({ title: "Error", description: error.error, variant: "destructive" });
      }
    });
  };

  const openGenerateDialog = () => {
    const initial: Record<number, { amount: number; checked: boolean }> = {};
    activeTemplates.forEach(t => {
      initial[t.id] = { amount: t.defaultAmount, checked: true };
    });
    setGenerateAmounts(initial);
    setIsGenerateOpen(true);
  };

  const handleGenerate = () => {
    const amounts = activeTemplates
      .filter(t => !generatedTemplateIds.has(t.id) && generateAmounts[t.id]?.checked !== false)
      .map(t => ({ templateId: t.id, amount: generateAmounts[t.id]?.amount ?? t.defaultAmount }));
    if (amounts.length === 0) { setIsGenerateOpen(false); return; }
    generateExpenses({ month, amounts }, {
      onSuccess: (result) => {
        toast({ title: isRTL ? `تم توليد ${result.created.length} مصروف` : `Generated ${result.created.length} expense(s)` });
        setIsGenerateOpen(false);
      },
      onError: () => toast({ title: "Error", variant: "destructive" }),
    });
  };

  const handleSaveTemplate = () => {
    if (!templateForm.name || !templateForm.defaultAmount) return;
    const payload = {
      name: templateForm.name,
      category: templateForm.category,
      defaultAmount: parseFloat(templateForm.defaultAmount),
    };
    if (editingTemplate) {
      updateTemplate({ id: editingTemplate.id, data: payload }, {
        onSuccess: () => { setIsTemplateOpen(false); setEditingTemplate(null); setTemplateForm({ name: "", category: "other", defaultAmount: "" }); },
      });
    } else {
      createTemplate(payload, {
        onSuccess: () => { setIsTemplateOpen(false); setTemplateForm({ name: "", category: "other", defaultAmount: "" }); },
      });
    }
  };

  if (isLoadingDash) {
    return <div className="p-8 text-center text-muted-foreground">{t.revenue.loadingFinancial}</div>;
  }

  if (!dashboard) return null;

  const STATUS_COLORS = {
    paid: 'hsl(142.1 76.2% 36.3%)',
    partially_paid: 'hsl(38 92% 50%)',
    pending: 'hsl(215 16.3% 46.9%)',
    overdue: 'hsl(0 84.2% 60.2%)',
  };

  const statusData = [
    { name: t.status.paid, value: dashboard.paymentStatusBreakdown.paid, color: STATUS_COLORS.paid },
    { name: t.status.partially_paid, value: dashboard.paymentStatusBreakdown.partially_paid, color: STATUS_COLORS.partially_paid },
    { name: t.status.pending, value: dashboard.paymentStatusBreakdown.pending, color: STATUS_COLORS.pending },
    { name: t.status.overdue, value: dashboard.paymentStatusBreakdown.overdue, color: STATUS_COLORS.overdue },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight">{t.revenue.title}</h1>
        <div className="flex items-center gap-4">
          <Input 
            type="month" 
            value={month} 
            onChange={(e) => setMonth(e.target.value)}
            className="w-40"
          />
          {activeTemplates.length > 0 && (
            <Button
              variant="outline"
              onClick={openGenerateDialog}
              className="gap-1.5 font-semibold"
              style={{ borderColor: "#1B2E8F50", color: "#1B2E8F" }}
            >
              {isRTL ? `توليد مصاريف ${month}` : `Generate ${month}`}
            </Button>
          )}
          <Dialog open={isExpenseOpen} onOpenChange={setIsExpenseOpen}>
            <DialogTrigger asChild>
              <Button variant="secondary"><Plus className="w-4 h-4 me-2" /> {t.revenue.recordExpense}</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t.revenue.recordNewExpense}</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmitExpense)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="category" render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t.revenue.category}</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="rent">{t.revenue.categories.rent}</SelectItem>
                            <SelectItem value="utilities">{t.revenue.categories.utilities}</SelectItem>
                            <SelectItem value="salaries">{t.revenue.categories.salaries}</SelectItem>
                            <SelectItem value="materials">{t.revenue.categories.materials}</SelectItem>
                            <SelectItem value="maintenance">{t.revenue.categories.maintenance}</SelectItem>
                            <SelectItem value="other">{t.revenue.categories.other}</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="amount" render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t.revenue.amount}</FormLabel>
                        <FormControl><Input type="number" min="0" step="0.01" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  <FormField control={form.control} name="description" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.revenue.description}</FormLabel>
                      <FormControl><Input placeholder="..." {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="expenseDate" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.revenue.date}</FormLabel>
                      <FormControl><Input type="date" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <Button type="submit" className="w-full" disabled={isCreatingExpense}>
                    {isCreatingExpense ? t.revenue.saving : t.revenue.saveExpense}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Quick stat cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t.revenue.totalCollected}</CardDescription>
            <CardTitle className="text-2xl flex items-center gap-2 text-emerald-700">
              {t.currency.format(dashboard.totalCollected)}
              <ArrowUpRight className="w-4 h-4" />
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t.revenue.totalDue}</CardDescription>
            <CardTitle className="text-2xl text-amber-600">
              {t.currency.format(dashboard.totalDue)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t.revenue.totalExpenses}</CardDescription>
            <CardTitle className="text-2xl flex items-center gap-2 text-destructive">
              {t.currency.format(dashboard.totalExpenses)}
              <ArrowDownRight className="w-4 h-4" />
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Profit & Loss Statement */}
      {(() => {
        const net = dashboard.netRevenue;
        const isProfit = net >= 0;
        return (
          <Card className="overflow-hidden shadow-md border-0">
            <div className="px-6 py-3 flex items-center gap-2" style={{ backgroundColor: BRAND_BLUE }}>
              {isProfit
                ? <TrendingUp className="w-4 h-4" style={{ color: BRAND_YELLOW }} />
                : <TrendingDown className="w-4 h-4" style={{ color: "#fca5a5" }} />
              }
              <span className="text-white font-bold text-sm uppercase tracking-wider">{t.revenue.plStatement}</span>
              <span className="ms-auto text-white/60 text-xs">{t.revenue.plSubtitle}</span>
            </div>
            <CardContent className="p-0">
              <div className="grid md:grid-cols-3 divide-y md:divide-y-0 md:divide-x">
                {/* Income line */}
                <div className="flex items-center gap-4 px-6 py-5">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-emerald-100">
                    <ArrowUpRight className="w-5 h-5 text-emerald-700" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t.revenue.totalIncome}</div>
                    <div className="text-2xl font-black text-emerald-700">{t.currency.formatFixed(dashboard.totalCollected)}</div>
                  </div>
                </div>

                {/* Expenses line */}
                <div className="flex items-center gap-4 px-6 py-5">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-red-100">
                    <Minus className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t.revenue.expensesDeducted}</div>
                    <div className="text-2xl font-black text-red-600">{t.currency.formatFixed(dashboard.totalExpenses)}</div>
                  </div>
                </div>

                {/* Net result */}
                <div className={`flex items-center gap-4 px-6 py-5 ${isProfit ? "bg-emerald-50/50" : "bg-red-50/50"}`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isProfit ? "bg-emerald-600" : "bg-red-600"}`}>
                    <Equal className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{isProfit ? t.revenue.netProfit : t.revenue.netLoss}</div>
                      <span className="text-[10px] font-black px-1.5 py-0.5 rounded tracking-widest" style={{ backgroundColor: isProfit ? "#16a34a" : "#dc2626", color: "white" }}>
                        {isProfit ? t.revenue.profitBadge : t.revenue.lossBadge}
                      </span>
                    </div>
                    <div className="text-3xl font-black" style={{ color: isProfit ? "#16a34a" : "#dc2626" }}>
                      {isProfit ? "" : "−"}{t.currency.formatFixed(Math.abs(net))}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })()}

      {/* ─── Fixed Expense Templates ─── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">{isRTL ? "المصاريف الثابتة (القوالب)" : "Fixed Expense Templates"}</CardTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={() => { setEditingTemplate(null); setTemplateForm({ name: "", category: "other", defaultAmount: "" }); setIsTemplateOpen(true); }}
              className="gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              {isRTL ? "إضافة قالب" : "Add Template"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {templates.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              {isRTL ? "لا توجد قوالب بعد. أضف مصروفاً ثابتاً للبدء." : "No templates yet. Add a fixed expense to start."}
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="text-start pb-2 font-medium">{isRTL ? "الاسم" : "Name"}</th>
                  <th className="text-start pb-2 font-medium">{isRTL ? "الفئة" : "Category"}</th>
                  <th className="text-start pb-2 font-medium">{isRTL ? "المبلغ الافتراضي" : "Default Amount"}</th>
                  <th className="text-start pb-2 font-medium">{isRTL ? "الحالة" : "Status"}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {templates.map(tmpl => (
                  <tr key={tmpl.id} className="border-b last:border-0">
                    <td className="py-2.5">{tmpl.name}</td>
                    <td className="py-2.5 text-muted-foreground">{t.revenue.categories[tmpl.category as keyof typeof t.revenue.categories]}</td>
                    <td className="py-2.5 font-medium">{tmpl.defaultAmount.toLocaleString()} {isRTL ? "دج" : "DZD"}</td>
                    <td className="py-2.5">
                      <button
                        onClick={() => updateTemplate({ id: tmpl.id, data: { isActive: !tmpl.isActive } })}
                        className={`text-xs px-2 py-0.5 rounded-full font-medium transition-colors ${
                          tmpl.isActive
                            ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                            : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                        }`}
                      >
                        {tmpl.isActive ? (isRTL ? "نشط" : "Active") : (isRTL ? "معطّل" : "Inactive")}
                      </button>
                    </td>
                    <td className="py-2.5">
                      <div className="flex gap-1 justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => {
                            setEditingTemplate(tmpl);
                            setTemplateForm({ name: tmpl.name, category: tmpl.category, defaultAmount: String(tmpl.defaultAmount) });
                            setIsTemplateOpen(true);
                          }}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                          onClick={() => deleteTemplate(tmpl.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* ─── Add/Edit Template Dialog ─── */}
      <Dialog open={isTemplateOpen} onOpenChange={open => { setIsTemplateOpen(open); if (!open) { setEditingTemplate(null); setTemplateForm({ name: "", category: "other", defaultAmount: "" }); } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? (isRTL ? "تعديل القالب" : "Edit Template") : (isRTL ? "إضافة قالب" : "Add Template")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{isRTL ? "الاسم" : "Name"}</label>
              <Input
                placeholder={isRTL ? "مثال: إيجار المقر" : "e.g. Rent"}
                value={templateForm.name}
                onChange={e => setTemplateForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{isRTL ? "الفئة" : "Category"}</label>
                <Select value={templateForm.category} onValueChange={v => setTemplateForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rent">{t.revenue.categories.rent}</SelectItem>
                    <SelectItem value="utilities">{t.revenue.categories.utilities}</SelectItem>
                    <SelectItem value="salaries">{t.revenue.categories.salaries}</SelectItem>
                    <SelectItem value="materials">{t.revenue.categories.materials}</SelectItem>
                    <SelectItem value="maintenance">{t.revenue.categories.maintenance}</SelectItem>
                    <SelectItem value="other">{t.revenue.categories.other}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{isRTL ? "المبلغ الافتراضي (دج)" : "Default Amount (DZD)"}</label>
                <Input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={templateForm.defaultAmount}
                  onChange={e => setTemplateForm(f => ({ ...f, defaultAmount: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">{isRTL ? "إلغاء" : "Cancel"}</Button>
            </DialogClose>
            <Button
              style={{ backgroundColor: "#1B2E8F", color: "white" }}
              className="font-semibold"
              onClick={handleSaveTemplate}
              disabled={isCreatingTemplate || isUpdatingTemplate || !templateForm.name || !templateForm.defaultAmount}
            >
              {isCreatingTemplate || isUpdatingTemplate ? (isRTL ? "جارٍ الحفظ..." : "Saving...") : (isRTL ? "حفظ" : "Save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Generate Expenses Dialog ─── */}
      <Dialog open={isGenerateOpen} onOpenChange={setIsGenerateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {isRTL ? `توليد مصاريف ${month}` : `Generate Expenses for ${month}`}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2 max-h-80 overflow-y-auto">
            {activeTemplates.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                {isRTL ? "لا توجد قوالب نشطة" : "No active templates"}
              </p>
            ) : activeTemplates.map(tmpl => {
              const alreadyGenerated = generatedTemplateIds.has(tmpl.id);
              const entry = generateAmounts[tmpl.id] ?? { amount: tmpl.defaultAmount, checked: true };
              return (
                <div
                  key={tmpl.id}
                  className={`flex items-center gap-3 p-2 rounded-lg border ${alreadyGenerated ? "opacity-50 bg-muted/30" : "bg-background"}`}
                >
                  <input
                    type="checkbox"
                    className="w-4 h-4 accent-blue-700"
                    checked={!alreadyGenerated && entry.checked}
                    disabled={alreadyGenerated}
                    onChange={e => setGenerateAmounts(prev => ({
                      ...prev,
                      [tmpl.id]: { ...entry, checked: e.target.checked },
                    }))}
                  />
                  <span className="flex-1 text-sm font-medium">{tmpl.name}</span>
                  {alreadyGenerated ? (
                    <span className="text-xs text-emerald-600 font-medium shrink-0">مولَّد ✓</span>
                  ) : (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Input
                        type="number"
                        min="0"
                        className="w-28 h-7 text-sm"
                        value={entry.amount}
                        onChange={e => setGenerateAmounts(prev => ({
                          ...prev,
                          [tmpl.id]: { ...entry, amount: parseFloat(e.target.value) || 0 },
                        }))}
                      />
                      <span className="text-xs text-muted-foreground">دج</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="border-t pt-3 flex justify-between items-center text-sm font-semibold">
            <span>{isRTL ? "المجموع" : "Total"}</span>
            <span style={{ color: "#1B2E8F" }}>
              {activeTemplates
                .filter(t => !generatedTemplateIds.has(t.id) && (generateAmounts[t.id]?.checked !== false))
                .reduce((sum, t) => sum + (generateAmounts[t.id]?.amount ?? t.defaultAmount), 0)
                .toLocaleString()} {isRTL ? "دج" : "DZD"}
            </span>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={isGenerating}>{isRTL ? "إلغاء" : "Cancel"}</Button>
            </DialogClose>
            <Button
              style={{ backgroundColor: "#1B2E8F", color: "white" }}
              className="font-semibold"
              onClick={handleGenerate}
              disabled={isGenerating}
            >
              {isGenerating ? (isRTL ? "جارٍ التوليد..." : "Generating...") : (isRTL ? "تأكيد التوليد" : "Confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t.revenue.revenueByLevel}</CardTitle>
            <CardDescription>{t.revenue.collectedVsDue}</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            {dashboard.revenueByLevel.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dashboard.revenueByLevel} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="levelName" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={t.currency.tickFormat} width={80} />
                  <Tooltip 
                    cursor={{ fill: 'hsl(var(--muted))' }}
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                    formatter={(value: number) => [t.currency.format(value), ""]}
                  />
                  <Legend />
                  <Bar dataKey="collected" name={t.revenue.collected} fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  <Bar dataKey="due" name={t.revenue.due} fill="hsl(38 92% 50%)" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">{t.revenue.noRevenueThisMonth}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t.revenue.paymentStatus}</CardTitle>
            <CardDescription>{t.revenue.invoiceBreakdown}</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] flex items-center justify-center">
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <PieCell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => [value, ""]}
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                  />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-muted-foreground">{t.revenue.noInvoicesThisMonth}</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Expenses List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{t.revenue.expenseLog}</CardTitle>
            <CardDescription>{t.revenue.expensesFor(safeFmt(month + "-01", "MMMM yyyy"))}</CardDescription>
          </div>
          <ReceiptIcon className="h-5 w-5 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {expenses.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground bg-muted/20 rounded-lg">
              {t.revenue.noExpensesThisMonth}
            </div>
          ) : (
            <div className="space-y-4">
              {expenses.map(expense => (
                <div key={expense.id} className="flex justify-between items-center p-4 border rounded-lg hover:bg-muted/10 transition-colors">
                  <div>
                    <div className="font-semibold">{expense.description}</div>
                    <div className="text-sm text-muted-foreground flex gap-2 items-center mt-1">
                      <span className="capitalize">
                        {t.revenue.categories[expense.category as keyof typeof t.revenue.categories] || expense.category}
                      </span>
                      <span>•</span>
                      <span>{safeFmt(expense.expenseDate, "MMM d, yyyy")}</span>
                    </div>
                  </div>
                  <div className="font-bold text-destructive">
                    -{t.currency.formatFixed(expense.amount)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

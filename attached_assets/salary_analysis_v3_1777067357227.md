# تحليل شامل لنظام الرواتب — التناقضات والقصور

## ما تم إصلاحه بالفعل ✅
1. حذف الراتب يحذف الآن المصروف المقابل
2. `invalidateAll()` تُحدِّث كل الـ queries بعد إضافة/حذف راتب
3. ميزة نسبة الأرباح للمدير أُضيفت

---

## التناقض الأكبر — نظامان منفصلان تماماً ❌

### المشكلة المعمارية:
المشروع يحتوي على **نظامَي دفع مختلفَين**:

**النظام القديم (Earnings):**
- جدول: `teacherPaymentsTable`
- API: `/api/earnings/teacher/:id`
- يُستخدم في: أرقام مستحقاتي العلوية (`إجمالي المدفوع`, `الرصيد المتبقي`)

**النظام الجديد (Salaries):**
- جدول: `salariesTable`
- API: `/api/salaries/my`
- يُستخدم في: قسم "راتبي" أسفل صفحة مستحقاتي

**النتيجة:** 
- `إجمالي المدفوع = 0` ← يقرأ من `teacherPaymentsTable` (لا يعرف بالرواتب)
- `راتبي = 50,000` ← يقرأ من `salariesTable` (النظام الجديد)
- `الرصيد المتبقي = 0` ← خاطئ لأن `balance = totalEarned - totalPaid` وtotalPaid لا يشمل الرواتب

---

## التناقض الثاني — صفحة المداخيل لا تُظهر الراتب ❌

**المشكلة:**
صفحة المداخيل (revenue) تفلتر المصاريف حسب الشهر:
```
WHERE expenseDate >= "2026-04-01" AND expenseDate <= "2026-04-30"
```

الراتب يُسجَّل كمصروف بـ `expenseDate = paidAt`

إذا كان paidAt = "2025-04-25" والمستخدم يعرض أبريل 2026 → **الراتب لا يظهر**

**الدليل:**
- صفحة المدفوعات تُظهر الراتب بتاريخ "Apr 25, 2025"
- صفحة المداخيل (أبريل 2026) تُظهر إجمالي المصاريف = 30,000 (الإيجار فقط)
- لو كان paidAt = 2026-04-25 لظهر في الصفحة

---

## الإصلاحات المطلوبة

### إصلاح 1 — ربط النظامَين في earnings API
**File:** `artifacts/api-server/src/routes/earnings.ts`

المطلوب: عند حساب `totalPaid` و `balance`، أضف مبالغ الرواتب من `salariesTable`:

```ts
// Add this after fetching allPayments:
const salaryRows = await db
  .select({ amount: salariesTable.amount })
  .from(salariesTable)
  .where(eq(salariesTable.employeeId, teacherId));

const totalSalaryPaid = salaryRows.reduce((sum, s) => sum + Number(s.amount), 0);

// Then update totalPaid:
const totalPaid = allPayments
  .filter((p) => p.status === "paid")
  .reduce((sum, p) => sum + parseFloat(String(p.amount)), 0) + totalSalaryPaid;

// balance remains:
balance: totalEarned - totalPaid
```

هذا يجعل `إجمالي المدفوع` يشمل الرواتب + مدفوعات النظام القديم

---

### إصلاح 2 — التأكد من صحة تاريخ الراتب عند التسجيل
**File:** `artifacts/kidspeak/src/pages/admin/salaries/index.tsx`

**المشكلة:** إذا أدخل المشرف تاريخاً خاطئاً (مثلاً 2025 بدل 2026)، يُسجَّل المصروف بتاريخ خاطئ ولا يظهر في صفحة المداخيل للشهر الصحيح.

**الإصلاح:** 
1. في نموذج إضافة راتب، اجعل `paidAt` الافتراضي = تاريخ اليوم
2. أضف تحقق: إذا كان paidAt في مستقبل بعيد أو ماضٍ بعيد (أكثر من سنة) → أظهر تحذير

---

### إصلاح 3 — مزامنة invalidation في earnings mutations أيضاً
**Files:** `artifacts/kidspeak/src/pages/groups/earnings.tsx` و `psychologist/earnings.tsx`

عند إضافة دفعة من صفحة مستحقاتي (النظام القديم)، يجب إضافة:
```ts
qc.invalidateQueries({ queryKey: ["salaries/my"] });
```

---

## ملاحظة مهمة للمستقبل
كل ميزة مالية جديدة يجب أن:
1. تُحدِّث `totalPaid` في earnings API إذا أضافت مبلغاً مدفوعاً
2. تُبطِّل `["/api/dashboard/revenue"]` و `["/api/expenses"]` و `["/api/dashboard"]`
3. **لا تنشئ نظام دفع ثالث منفصل**

---

## الملخص
| المشكلة | السبب | الإصلاح |
|---------|-------|---------|
| إجمالي المدفوع = 0 رغم وجود راتب | earnings API لا يقرأ salariesTable | أضف salaries إلى totalPaid في earnings.ts |
| الراتب لا يظهر في سجل المصاريف | paidAt تاريخ خاطئ (2025 بدل 2026) | اضبط التاريخ الافتراضي في النموذج |
| الرصيد المتبقي خاطئ | balance = totalEarned - totalPaid وtotalPaid ناقص | نفس إصلاح رقم 1 |

---

## بعد الإصلاح
1. شغّل `npm run build` — يجب صفر أخطاء
2. اختبر: أضف راتب → تحقق أن `إجمالي المدفوع` في مستحقاتي تحدّث
3. اختبر: أضف راتب بتاريخ أبريل 2026 → تحقق أنه يظهر في سجل المصاريف
4. Commit وpush إلى main

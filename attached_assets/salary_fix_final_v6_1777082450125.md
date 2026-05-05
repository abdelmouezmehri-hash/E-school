# إصلاح نهائي — الرواتب والمصاريف والتحديث التلقائي

## المشاكل الثلاث الجذرية

---

### مشكلة 1 — invalidateAll تستخدم query keys خاطئة

**الكود الحالي في `artifacts/kidspeak/src/pages/admin/salaries/index.tsx`:**
```ts
function invalidateAll(qc) {
  qc.invalidateQueries({ queryKey: ["/api/dashboard/revenue"] }); // ❌ ناقص params
  qc.invalidateQueries({ queryKey: ["/api/expenses"] });           // ❌ ناقص params
}
```

**المشكلة:**
- صفحة المداخيل تستخدم: `["/api/dashboard/revenue", { month: "2026-04" }]`
- صفحة المصاريف تستخدم: `["/api/expenses", { month: "2026-04" }]`
- React Query يعتبر هذه مختلفة عن `["/api/dashboard/revenue"]` بدون params

**الإصلاح — استبدل invalidateAll كاملاً بهذا:**
```ts
function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  // exact: false = يُبطل أي key يبدأ بهذا المفتاح بغض النظر عن الـ params
  qc.invalidateQueries({ queryKey: ["/api/dashboard/revenue"], exact: false });
  qc.invalidateQueries({ queryKey: ["/api/expenses"], exact: false });
  qc.invalidateQueries({ queryKey: ["/api/dashboard"], exact: false });
  qc.invalidateQueries({ queryKey: ["salaries"], exact: false });
  qc.invalidateQueries({ queryKey: ["salaries/my"], exact: false });
  qc.invalidateQueries({ queryKey: ["/api/earnings/my"], exact: false });
  qc.invalidateQueries({ queryKey: ["admin-summary"], exact: false });
}
```

---

### مشكلة 2 — حذف راتب لا يُحدِّث المصاريف في الواجهة

**المشكلة:**
الـ cascade delete في قاعدة البيانات يعمل ✅ (يحذف المصروف من DB)
لكن الـ invalidateAll تُستدعى بعد DELETE مباشرة → نفس مشكلة الـ params أعلاه.

**الإصلاح:** نفس إصلاح مشكلة 1 — بمجرد إضافة `exact: false` ستُحل تلقائياً.

---

### مشكلة 3 — مستحقاتي لا تتحدث بعد إضافة/حذف راتب

**المشكلة:**
`invalidateAll` لا تُبطل `["/api/earnings/my"]` (query key صفحة مستحقاتي).

**الإصلاح:** موجود في مشكلة 1 — أضفنا `["/api/earnings/my"]` لـ invalidateAll.

---

### مشكلة 4 — صفحة مستحقاتي غير متاحة للمدير وباقي الموظفين

**المشكلة:**
صفحة مستحقاتي الجميلة (psychologist/earnings.tsx) موجودة فقط للأخصائية والمعلم.
المدير وباقي الموظفين ليس لديهم رابط لها في القائمة الجانبية.

**الإصلاح:**
1. في `artifacts/kidspeak/src/components/layout.tsx` أو ملف الـ sidebar:
   أضف رابط "مستحقاتي" لكل دور موظف (admin, teacher, psychologist, receptionist, etc.)

2. في `artifacts/kidspeak/src/App.tsx`:
   تأكد أن route `/earnings` مرتبط بـ earnings.tsx ويعمل لكل الأدوار

3. في `artifacts/kidspeak/src/pages/psychologist/earnings.tsx`:
   الصفحة تقرأ `me.role` لتقرر نوع الحساب — تأكد أن المدير يظهر له قسم "راتبي" أسفل الصفحة

---

## منطق مستحقاتي للموظف العادي (abdelmouez مثلاً)

**الحالة المطلوبة:**
- الراتب الشهري: 30,000 دج
- تم تسديد: 20,000 دج
- المتبقي: 10,000 دج

**كيف يعمل النظام الحالي:**
```
totalEarned = شهور × monthlySalary (من usersTable)
totalPaid   = مجموع salariesTable للموظف
balance     = totalEarned - totalPaid
```

**المشكلة:**
إذا كان `monthlySalary` في usersTable = 30,000
وعدد الأشهر منذ الانضمام = 4
→ `totalEarned = 4 × 30,000 = 120,000` ← ليس 30,000!

**الإصلاح في `artifacts/api-server/src/routes/earnings.ts`:**
اجعل `totalEarned` للشهر الحالي فقط (وليس كل الأشهر):
```ts
// بدل:
const elapsedMonths = differenceInMonths(now, joinedAt) + 1;
totalEarned = elapsedMonths * monthlySalary;

// استخدم:
// totalEarned = مجموع ما يُستحق لهذا الشهر فقط
totalEarned = monthlySalary; // راتب شهر واحد = ما يستحقه الآن
```

أو الأفضل: اجعل العرض يُظهر **راتب الشهر الحالي** بشكل واضح بدل إجمالي كل الأشهر.

---

## ملخص الملفات المطلوب تعديلها

| الملف | التعديل |
|-------|---------|
| `kidspeak/pages/admin/salaries/index.tsx` | `invalidateAll` بـ `exact: false` + إضافة `["/api/earnings/my"]` |
| `api-server/routes/earnings.ts` | تصحيح منطق `totalEarned` للموظف الشهري |
| `kidspeak/components/layout.tsx` (sidebar) | إضافة رابط مستحقاتي لكل الأدوار |
| `kidspeak/App.tsx` | تأكد route `/earnings` يعمل لكل الأدوار |

---

## بعد الإصلاح — اختبر
1. أضف راتب → تحقق أن `إجمالي المصاريف` في صفحة المداخيل تحدّث فوراً
2. احذف راتب → تحقق أن المصروف اختفى من سجل المصاريف فوراً
3. أضف راتب 20,000 لـ abdelmouez → افتح مستحقاتي → `إجمالي المدفوع = 20,000`
4. Commit وpush إلى main

# إصلاح منطق حساب المدفوعات والديون

## المشكلة
هناك خطآن في منطق الحساب في ملف `artifacts/api-server/src/routes/payments.ts`:

### الخطأ 1 — الخصم يُطرح مرتين
المستخدم يُدخل `amountDue` بوصفه المبلغ النهائي المستحق (بعد الخصم في ذهنه)،
لكن النظام يطرح الخصم مرة ثانية عند حساب `netTotal`:
```
netTotal = amountDue - discount  ← خطأ: يُطرح مرتين
```

### الخطأ 2 — جدول الديون يتجاهل الخصم
في endpoint `/debt-summary`، المعادلة:
```
balance = amountDue - amountPaid  ← الخصم غائب تماماً
```

---

## الحل المطلوب

في ملف `artifacts/api-server/src/routes/payments.ts`:

### 1. دالة `enrichPayment` — أضف حقل `netTotal` صريح

عدّل الدالة لتُرجع `netTotal` محسوبة بشكل صحيح:
```ts
async function enrichPayment(payment: typeof paymentsTable.$inferSelect) {
  // ... existing JOIN query ...

  const amountDue = parseFloat(payment.amountDue);
  const discount = parseFloat(payment.discount ?? "0");
  const amountPaid = parseFloat(payment.amountPaid);
  const netTotal = Math.max(0, amountDue - discount);
  const balance = Math.max(0, netTotal - amountPaid);

  return {
    ...payment,
    amountDue,
    discount,
    netTotal,       // ← أضف هذا الحقل
    balance,        // ← أضف هذا الحقل
    amountPaid,
    paidAt: payment.paidAt?.toISOString() ?? null,
    createdAt: payment.createdAt.toISOString(),
    studentName: row?.studentName ?? "",
    levelName: row?.levelName ?? null,
    parentName: row?.parentName ?? null,
  };
}
```

### 2. إصلاح `/debt-summary` — احسب الخصم في SQL

ابحث عن هذا الكود في `/debt-summary`:
```ts
balance: sql<number>`CAST(SUM(CAST(${paymentsTable.amountDue} AS REAL) - CAST(${paymentsTable.amountPaid} AS REAL)) AS REAL)`,
```

وعدّله ليصبح:
```ts
balance: sql<number>`CAST(SUM(
  CAST(${paymentsTable.amountDue} AS REAL)
  - COALESCE(CAST(${paymentsTable.discount} AS REAL), 0)
  - CAST(${paymentsTable.amountPaid} AS REAL)
) AS REAL)`,
```

أيضاً عدّل `totalDue` ليحسب الصافي:
```ts
totalDue: sql<number>`CAST(SUM(CAST(${paymentsTable.amountDue} AS REAL) - COALESCE(CAST(${paymentsTable.discount} AS REAL), 0)) AS REAL)`,
```

وعدّل شرط WHERE:
```ts
.where(
  sql`(CAST(${paymentsTable.amountDue} AS REAL) - COALESCE(CAST(${paymentsTable.discount} AS REAL), 0) - CAST(${paymentsTable.amountPaid} AS REAL)) > 0`,
)
```

وشرط HAVING:
```ts
.having(
  sql`SUM(CAST(${paymentsTable.amountDue} AS REAL) - COALESCE(CAST(${paymentsTable.discount} AS REAL), 0) - CAST(${paymentsTable.amountPaid} AS REAL)) > 0`,
)
```

### 3. إصلاح منطق تحديث الحالة عند إضافة دفعة جديدة

في `POST /payments/:id/transactions`، تأكد أن منطق الحالة يستخدم `netTotal`:
```ts
const due = parseFloat(payment.amountDue);
const newDiscount = ...; // existing logic
const netTotal = Math.max(0, due - newDiscount);
const newStatus = newPaid >= netTotal ? "paid" : newPaid > 0 ? "partially_paid" : "pending";
```
هذا الجزء موجود بالفعل بشكل صحيح، لكن تأكد من تطبيقه في جميع مكان.

---

## ملاحظة مهمة للواجهة الأمامية

في الفاتورة (receipt/invoice component)، تأكد أن الأرقام المعروضة تستخدم:
- **المبلغ الأصلي**: `amountDue`
- **الخصم**: `discount`
- **الصافي المستحق**: `netTotal = amountDue - discount`
- **المدفوع**: `amountPaid`
- **المتبقي (الدين)**: `balance = netTotal - amountPaid`

لا تعرض `amountDue` مباشرة كـ"إجمالي مستحق" — بل استخدم `netTotal`.

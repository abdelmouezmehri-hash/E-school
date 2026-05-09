# تقرير تشخيصي دقيق — KidSpeak Hub v6
**بناءً على فحص الكود الفعلي**

---

## 🔍 السبب الجذري لمشكلة الجدول الفارغ

### المشكلة الحقيقية:
صفحة `/schedule` تجلب البيانات من جدول `class_sessions` ✅
لكن هذا الجدول **فارغ** لأن الحصص لا تُضاف إليه تلقائياً عند إنشاء الأفواج.

### ما يحدث حالياً:
```
إنشاء فوج (groups table) ← يُخزن فقط الأيام والأوقات كـ JSON
جدول class_sessions ← فارغ ← الجدول يعرض لا شيء
```

### ما يجب أن يحدث:
```
إنشاء فوج → يولّد تلقائياً حصص في class_sessions للأسابيع القادمة
```

---

## Fix 01 — توليد الحصص تلقائياً عند إنشاء/تعديل الفوج

في `POST /groups` و `PUT /groups/:id`، بعد حفظ الفوج، أضف هذا الكود:

```typescript
// artifacts/api-server/src/routes/groups.ts
// بعد إنشاء أو تعديل الفوج:

async function generateClassSessions(groupId: number, group: any) {
  // احذف الحصص المستقبلية الموجودة لهذا الفوج
  const today = new Date().toISOString().split("T")[0];
  await db.delete(classSessionsTable)
    .where(
      and(
        eq(classSessionsTable.groupId, groupId),
        gte(classSessionsTable.sessionDate, today)
      )
    );

  // أنشئ حصص لـ 12 أسبوع قادماً
  const recurringDays: number[] = JSON.parse(group.recurringDays ?? "[]");
  const dayTimes: Record<string, string> = group.sessionDayTimes ?? {};
  const fallbackTime = group.sessionStartTime ?? "09:00";

  const sessions = [];
  const startDate = new Date();
  
  for (let week = 0; week < 12; week++) {
    for (const dayNum of recurringDays) {
      const sessionDate = new Date(startDate);
      const diff = (dayNum - startDate.getDay() + 7) % 7;
      sessionDate.setDate(startDate.getDate() + week * 7 + diff);
      
      const dateStr = sessionDate.toISOString().split("T")[0];
      const timeStr = dayTimes[String(dayNum)] ?? fallbackTime;
      
      sessions.push({
        groupId,
        teacherId: group.teacherId ?? null,
        psychologistId: group.psychologistId ?? null,
        sessionDate: dateStr,
        sessionTime: timeStr,
        sessionType: "group",
        status: "scheduled",
        createdAt: new Date(),
      });
    }
  }

  if (sessions.length > 0) {
    await db.insert(classSessionsTable).values(sessions);
  }
}

// استدعِ الدالة بعد كل INSERT أو UPDATE للفوج:
await generateClassSessions(newGroup.id, newGroup);
```

---

## Fix 02 — الحصص تظهر للولي في جدوله

الكود الموجود في `schedule.ts` يجلب حصص الولي عبر `classSessionsTable` لكنه يحتاج ربط بالأفواج:

```typescript
// في GET /schedule/my للـ parent:
// بعد جلب classSessionsTable، أضف group name عبر JOIN:

const sessions = await db
  .select({
    id: classSessionsTable.id,
    date: classSessionsTable.sessionDate,
    time: classSessionsTable.sessionTime,
    groupName: groupsTable.name,
    teacherName: usersTable.name,
    studentName: studentsTable.name,
  })
  .from(classSessionsTable)
  .innerJoin(groupsTable, eq(classSessionsTable.groupId, groupsTable.id))
  .innerJoin(groupStudentsTable, eq(groupStudentsTable.groupId, groupsTable.id))
  .innerJoin(studentsTable, eq(groupStudentsTable.studentId, studentsTable.id))
  .leftJoin(usersTable, eq(classSessionsTable.teacherId, usersTable.id))
  .where(
    and(
      eq(studentsTable.parentId, user.id),
      gte(classSessionsTable.sessionDate, startStr),
      lte(classSessionsTable.sessionDate, endStr)
    )
  );
```

---

## Fix 03 — إجمالي المكتسب متصل بالنظام المالي

**الوضع الحالي:** `/salaries/my` يجلب فقط صفوف salaries ✅ لكن صفحة earnings لا تعرض `totalEarned` و`balance` بشكل صحيح.

**أضف للـ endpoint:**
```typescript
// GET /salaries/my — أضف summary في الـ response:
const totalEarned = rows.reduce((sum, r) => sum + parseFloat(r.amount ?? "0"), 0);
const totalPaid = rows.reduce((sum, r) => sum + (r.paidAt ? parseFloat(r.amount ?? "0") : 0), 0);
const balance = totalEarned - totalPaid;

res.json({ 
  salaries: rows, 
  summary: { totalEarned, totalPaid, balance } 
});
```

**في صفحة earnings.tsx:**
```typescript
// استخدم data.summary بدل حساب يدوي
const { totalEarned, totalPaid, balance } = data?.summary ?? { totalEarned: 0, totalPaid: 0, balance: 0 };
```

---

## Fix 04 — dashboard pending يطرح الخصم

**في `dashboard.ts` السطر الموجود:**
```typescript
pending: sql<number>`CAST(SUM(CAST(${paymentsTable.amountDue} AS REAL) - CAST(${paymentsTable.amountPaid} AS REAL)) AS REAL)`,
```

**الصحيح:**
```typescript
pending: sql<number>`CAST(SUM(
  CAST(${paymentsTable.amountDue} AS REAL) 
  - COALESCE(CAST(${paymentsTable.discount} AS REAL), 0)
  - CAST(${paymentsTable.amountPaid} AS REAL)
) AS REAL)`,
```

---

## Fix 05 — React Query invalidation شامل بعد كل mutation

في كل ملف يحتوي على mutation (إضافة، تعديل، حذف)، أضف بعد `onSuccess`:

```typescript
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ["/api/students"] });
  queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
  queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
  queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
  queryClient.invalidateQueries({ queryKey: ["/api/salaries"] });
  queryClient.invalidateQueries({ queryKey: ["/api/schedule"] });
  queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
},
```

طبّق هذا في جميع mutations في: students, groups, payments, salaries, events pages.

---

## ملخص الأولويات

| # | المشكلة | الأثر | الحل |
|---|---|---|---|
| 1 | حصص الأفواج لا تُولَّد في class_sessions | الجدول فارغ للجميع | generateClassSessions() عند إنشاء فوج |
| 2 | الولي لا يرى حصص طفله | جدول الولي فارغ | JOIN عبر group_students |
| 3 | pending revenue لا يطرح الخصم | أرقام خاطئة في الداشبورد | إضافة discount في SQL |
| 4 | mutations لا تُحدِّث البيانات فوراً | المستخدم يرى بيانات قديمة | invalidateQueries شامل |
| 5 | summary في /salaries/my غير مكتمل | إجمالي المكتسب خاطئ | إضافة summary object |

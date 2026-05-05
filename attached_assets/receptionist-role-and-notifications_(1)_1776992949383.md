# New Role: مساعدة إدارية + نظام الإشعارات

---

## Part 1 — New Role: "مساعدة إدارية" (receptionist)

### 1. Add the role to the system
Add a new user role called `receptionist` to the users table and auth system, alongside the existing roles (admin, teacher, psychologist, parent).

### 2. Sidebar menu for receptionist:

**التسجيل:**
- طلبات التسجيل (قبول/رفض طلبات التسويق)
- إضافة تلميذ جديد
- التلاميذ (عرض + تعديل بيانات فقط، بدون حذف)

**المالية:**
- تسجيل دفعة (استلام أموال فقط)
- طباعة فاتورة / إيصال
- لوحة الديون (عرض فقط — من لم يدفع)
- ⛔ لا تظهر: النظرة المالية العامة، الأرباح، إجمالي الإيرادات، رواتب الموظفين

**الأفواج والتنظيم:**
- الأفواج (عرض + تعديل الجداول)
- جداول الأساتذة (عرض فقط)
- الأحداث والفعاليات (إنشاء + تعديل + حذف)
- إدارة الغرف والمواعيد

**التواصل:**
- الرسائل (مراسلة الأساتذة والأولياء)
- الإشعارات

### 3. Permissions — what receptionist CAN do:
- View and edit student profiles
- Accept or reject marketing registration requests
- Add new students and link them to parents
- Record payments and print invoices/receipts
- View debt board (who hasn't paid) — read only
- View and edit cohort/group schedules
- View teacher schedules
- Create, edit, delete events and activities
- Send messages to teachers and parents
- View and manage notifications

### 4. Permissions — what receptionist CANNOT do:
- View revenue overview, total profits, or financial charts
- View or manage employee salaries
- Delete students permanently
- Access system settings or user management
- View performance reports or behavioral tracking
- Change program prices or discount settings

### 5. Route guards
Add route-level permission checks so that if a receptionist tries to access `/revenue`, `/salaries`, `/users`, or `/settings`, they are redirected to their dashboard with an "غير مصرح" message.

### 6. Sidebar design
Use the same sidebar design as the other roles (dark navy #0D1B2E, gold #F5A800) with the sections listed above.

---

## Part 2 — Notification System (نظام الإشعارات)

### A) Notification bell in header
Add a bell icon (🔔) in the top header bar for ALL roles. Shows a red badge with unread count. Clicking opens a dropdown panel with recent notifications.

### B) Notification types — generate automatically:

**For Admin:**
- New registration request from marketing
- Overdue payment (student hasn't paid after due date)
- New message received
- Event created or modified
- Student attendance below 70% this week
- New salary request from employee

**For Receptionist:**
- New registration request
- Payment received confirmation
- Overdue payment reminder
- New message from teacher or parent
- Upcoming event in 24 hours

**For Teacher:**
- New student added to their group
- Session schedule changed
- New message received
- Event they are invited to
- Salary payment received

**For Psychologist:**
- New consultation request
- New student assigned
- Event invitation
- Salary payment received

**For Parent:**
- Payment due reminder (3 days before due date)
- Payment received confirmation
- New message from school
- Upcoming session for their child (day before)
- Event invitation

### C) Notification data model
Create a `notifications` table:
```sql
id, userId, type, title, message, isRead, link, createdAt
```
- `userId`: who receives the notification
- `type`: payment_due | new_registration | message | event | salary | attendance
- `title`: short title (shown in dropdown)
- `message`: full description
- `isRead`: boolean, default false
- `link`: route to navigate to when clicked (e.g. /payments, /students)

### D) API endpoints
- `GET /api/notifications` — get current user's notifications (last 20)
- `PUT /api/notifications/:id/read` — mark one as read
- `PUT /api/notifications/read-all` — mark all as read
- `DELETE /api/notifications/:id` — delete one notification

### E) Auto-generate notifications
Trigger notification creation automatically when:
1. A new marketing registration comes in → notify admin + receptionist
2. A payment is recorded → notify the parent with confirmation
3. A payment is overdue (dueDate < today) → notify admin + receptionist daily
4. A salary is added → notify the employee
5. An event invitation is sent → notify all invited users
6. A message is sent → notify the recipient

### F) Notification dropdown UI
- Max height 380px, scrollable
- Each item: icon (colored by type) + title + time ago (e.g. "منذ 5 دقائق")
- Unread items have a light gold background
- "تحديد الكل كمقروء" button at the top
- Clicking a notification marks it as read AND navigates to the relevant page
- Empty state: "لا توجد إشعارات جديدة" with a small icon

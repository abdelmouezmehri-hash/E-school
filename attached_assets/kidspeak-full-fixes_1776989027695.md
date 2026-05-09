# KidSpeak — Fixes & Upgrades (Complete Batch)

---

## Fix 01 — Salary not showing in employee "مستحقاتي"

The salary records added by admin in the salary management page are NOT appearing in the employee's own "مستحقاتي" / earnings page at `/psychologist/earnings` or any staff earnings page.

**Fix:**
1. In the earnings page for each staff role (teacher, psychologist), add a "راتبي" section that fetches salaries from the salaries table WHERE `employeeId = currentUser.id`
2. Display each salary entry as a card with: month label, amount, payment date, status, and notes
3. Show a summary at the top: total received this year, last payment date, next expected payment
4. The endpoint `GET /api/salaries/my` should return only the logged-in employee's salary records — create this endpoint if it doesn't exist, secured by `requireAuth`
5. When a salary is saved by admin, automatically add it as an expense entry in the expenses system with category "رواتب" so it appears in إجمالي المصاريف in the financial overview page

---

## Fix 02 — "مدفوعات متأخرة" (overdue payments) logic

The overdue payments counter on the admin dashboard shows 0 even when there are unpaid/partially paid invoices past their due date.

**Fix:**
1. A payment is "overdue" when: `status` is `pending` OR `partially_paid` AND `dueDate < today`
2. Fix the dashboard query to count payments where `dueDate < CURRENT_DATE` AND `status IN ('pending', 'partially_paid')`
3. The dashboard card "مدفوعات متأخرة" must show the correct count and clicking it navigates to the payments page filtered by overdue status
4. Also add overdue filtering option in the payments page filter dropdown

---

## Fix 03 — Expenses list not refreshing after delete

When an expense is deleted, it disappears visually but then reappears after navigation or refresh. The list is stale.

**Fix:**
1. After every `DELETE /api/expenses/:id` call, immediately invalidate and refetch the expenses list using React Query's `invalidateQueries(['expenses'])` or equivalent
2. Also fix the expenses total shown in the payments page header — it must recalculate after any add/delete operation
3. Apply the same refetch pattern to ALL delete operations across the entire app (students, users, payments, salaries, expenses, events)

---

## Fix 04 — Events creation error "Unexpected token '<', '<!DOCTYPE'... is not valid JSON"

When creating a new event in `/schedule`, the form submission returns an HTML page instead of JSON. The API endpoint for creating events is broken or missing.

**Fix:**
1. Check that `POST /api/events` or `POST /api/schedule/events` endpoint exists and is properly registered in the Express router
2. The endpoint is likely missing from the router or has a path mismatch — verify the frontend is calling the correct URL
3. Make sure the endpoint returns `Content-Type: application/json` and not an HTML error page
4. After fixing, test that: creating an event works, invited users see it in their schedule, and the event appears on the calendar

---

## Fix 05 — Major Dashboard & AI Upgrade

### A) Admin Dashboard upgrades:
1. Add real-time KPI cards: total active students, total stopped students, total graduated students, monthly revenue vs target, attendance rate this week
2. Add a "الإشعارات الذكية" smart alerts section that shows: overdue payments, students with attendance below 70%, upcoming events this week, pending registration requests
3. Add quick action buttons: "إضافة تلميذ", "تسجيل دفعة", "إنشاء فعالية", "إرسال إشعار"
4. Revenue chart should show last 6 months comparison, not just current month

### B) Claude AI Integration — "المساعد الذكي"
Add a floating AI assistant button (bottom right corner) available on all pages for admin and staff. When clicked, opens a chat panel powered by Claude AI.

The assistant can:
- Answer questions about students: "كم عدد التلاميذ المتأخرين في الدفع؟"
- Help write parent messages and reports
- Suggest follow-up actions for overdue payments
- Summarize weekly performance
- Answer general admin questions in Arabic

Implementation:
- Add a floating button with a sparkle ✨ icon, fixed bottom-right
- Opens a side panel with chat interface
- Use Anthropic API: POST to `https://api.anthropic.com/v1/messages` with model `claude-sonnet-4-20250514`, max_tokens: 1000
- System prompt: "أنت مساعد ذكي لإدارة مدرسة KidSpeak. تساعد الإداريين والأساتذة في إدارة التلاميذ والمدفوعات والجداول. تجيب دائماً بالعربية بشكل موجز ومفيد."
- Show loading state while waiting for response
- Keep last 10 messages in conversation history

### C) Staff schedule page upgrades:
1. Add week/month toggle view
2. Color-coded events: blue=sessions, orange=meetings, green=workshops, purple=consultations
3. Click any event to see full details in a modal
4. Add "طباعة الجدول" print button
5. Show total hours per week at the top

---

## Fix 06 — إدارة محتوى الموقع (Web Content Management Upgrade)

Upgrade the existing page at `/admin/web-content` with the following additions:

### A) SEO Section
Add a new collapsible section "تحسين محركات البحث (SEO)":
- Page Title field
- Meta Description field
- Keywords field
- OG Image URL field (social media share image)

### B) Visual Identity Section
Add a new collapsible section "الهوية البصرية":
- Primary Color — color picker (currently #F5A623)
- Secondary Color — color picker (currently #0A1628)
- Button Color — color picker
- Logo URL field
- Site Name field

### C) Top Notification Banner Section
Add a new collapsible section "شريط الإشعار العلوي":
- Toggle on/off
- Banner text field (e.g. "التسجيل مفتوح الآن لموسم 2026!")
- Background color picker
- Optional button text and link

### D) Programs Display Section
Add a new collapsible section "البرامج في الصفحة الرئيسية":
- Admin selects which programs from the database appear on the landing page (multi-select)
- Programs can be reordered via drag and drop
- Each program shows: name, short description field, image URL, and a toggle for registration button visibility

### E) Contact Info Section
Add a new collapsible section "معلومات التواصل":
- Phone number
- Email
- Address
- Working hours
- Social media links: Facebook, Instagram, WhatsApp

### F) Claude AI Content Writer Button
In every major text field on this page (Hero Title, Subtitle, Meta Description, program descriptions), add a small ✨ button next to the field label.

When clicked:
- Opens a small popover asking the admin for a brief description of what they want
- Sends the request to Anthropic API:

```javascript
const response = await fetch("https://api.anthropic.com/v1/messages", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1000,
    messages: [{ role: "user", content: userPrompt }],
    system: "أنت خبير في كتابة محتوى تسويقي باللغة العربية لمراكز تعليم الأطفال. اكتب نصوصاً قصيرة وجذابة ومقنعة تناسب أولياء الأمور الجزائريين. لا تستخدم تنسيق markdown."
  })
});
```

- Shows the result with two buttons: "قبول" (fills the field automatically) and "إعادة المحاولة"

### G) UX Improvements
1. **Auto-save**: Save automatically every 30 seconds with a small "تم الحفظ تلقائياً ✓" toast notification
2. **Live Preview**: Add a "معاينة الصفحة" button that opens a side panel showing how the landing page will look with current unsaved changes
3. **Version History**: Keep last 5 saved versions with ability to restore any previous version
4. **Collapsible Sections**: Make every section collapsible with expand/collapse toggle to make the page easier to navigate

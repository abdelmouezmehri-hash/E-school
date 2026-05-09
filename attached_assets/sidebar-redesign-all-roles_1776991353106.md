# Sidebar Redesign — Apply to All Roles

Redesign the sidebar navigation for ALL user roles (admin, teacher, psychologist, parent) using the official KidSpeak brand identity.

---

## Brand Colors
- Dark navy background: `#0D1B2E`
- Gold/Yellow accent: `#F5A800`
- White text: `#FFFFFF`
- Muted text: `rgba(255,255,255,0.6)`
- Section labels: `rgba(255,255,255,0.25)`
- Active item bg: `rgba(245,168,0,0.15)`
- Active item border: `rgba(245,168,0,0.25)`
- User card bg: `rgba(255,255,255,0.04)`
- Divider: `rgba(255,255,255,0.07)`

---

## Logo Section (top of sidebar)

Replace the current logo with this structure:
- An inline SVG icon on the right: a yellow circle with two yellow wifi-style arcs coming from the top-right (matching the KidSpeak brand icon)
- Beside it: the text logo — `kid` in white bold + `Speak` in `#F5A800` bold, same font-size (~16px), font-weight 800
- Below the text: a subtitle `أكاديمية اللغة` in small muted text
- Wrap in a padded container with a bottom divider `rgba(255,255,255,0.07)`

SVG icon code:
```svg
<svg width="32" height="32" viewBox="0 0 32 32" fill="none">
  <circle cx="12" cy="18" r="8" fill="#F5A800"/>
  <path d="M18 13 Q21 10 24 13" stroke="#F5A800" stroke-width="2.2" stroke-linecap="round" fill="none"/>
  <path d="M20 10 Q24 6 28 10" stroke="#F5A800" stroke-width="2.2" stroke-linecap="round" fill="none"/>
</svg>
```

---

## Menu Structure per Role

### All roles — shared style rules:
- Sidebar background: `#0D1B2E`
- Section label: 9px, uppercase, letter-spacing 1.8px, color `rgba(255,255,255,0.25)`
- Inactive menu item: padding 9px 11px, border-radius 9px, icon + label, text color `rgba(255,255,255,0.6)`
- Active menu item: same padding, background `rgba(245,168,0,0.15)`, border `0.5px solid rgba(245,168,0,0.25)`, text color `#F5A800`, font-weight 500
- Hover state: background `rgba(255,255,255,0.05)`
- Each item has a small SVG icon (16x16) on the right side (RTL layout)

---

### Admin sidebar sections:
**الرئيسية:** لوحة التحكم

**الأكاديمية:**
- الأفواج
- البرامج
- التلاميذ
- التقييمات
- الأداء
- المتابعة السلوكية

**المالية:**
- المداخيل
- المدفوعات
- الرواتب
- الطلبات المالية

**التواصل:**
- الرسائل
- الجدول

**النظام:**
- المستخدمون
- إدارة المحتوى

---

### Teacher sidebar sections:
**الرئيسية:** لوحة المتابعة

**صفي:**
- تلاميذي
- حضصي
- جدولتي

**التقييم:**
- التقييمات
- الأداء
- المتابعة السلوكية

**أخرى:**
- مستحقاتي
- صندوق الأفكار

---

### Psychologist sidebar sections:
**الرئيسية:** لوحة المتابعة

**عملي:**
- حصصي
- الاستشارات
- جدولتي

**التلاميذ:**
- تلاميذي
- المتابعة السلوكية

**أخرى:**
- مستحقاتي
- قائمة الأولويات
- صندوق الأفكار

---

### Parent sidebar sections:
**الرئيسية:** لوحة المتابعة

**أطفالي:**
- أطفالي
- منهجنا
- جدولتي

**المدرسة:**
- معرض الصور والفيديو
- أخبار المدرسة
- طلبات النشاطات

---

## User Card (bottom of sidebar)

Fixed at the bottom of every sidebar for all roles:
```
[Avatar circle with initials] Name
                               Role badge (small muted text)
─────────────────────────────────────
[logout icon]  تسجيل الخروج  (red-tinted)
```

Style:
- Container: `background: rgba(255,255,255,0.04)`, `border: 0.5px solid rgba(255,255,255,0.08)`, `border-radius: 11px`, margin 6px 8px 10px
- Avatar: 30px circle, `background: rgba(245,168,0,0.2)`, `border: 1.5px solid rgba(245,168,0,0.3)`, initials in `#F5A800`
- Name: white 12px font-weight 500
- Role: `rgba(255,255,255,0.3)` 10px
- Logout: `rgba(240,100,100,0.7)` with a logout SVG icon

---

## Implementation Notes
1. Apply this sidebar to ALL layout files — the main Layout component and any role-specific layout wrappers
2. The active menu item should be determined by the current route (`useLocation()`)
3. Make sure the sidebar is consistent on all pages — no page should show the old sidebar after this change
4. Keep the sidebar width at 215px
5. Sidebar should be scrollable if menu items overflow

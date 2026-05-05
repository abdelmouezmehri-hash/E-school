# Session Role Filtering & Post-Session Reports — Design Spec

**Date:** 2026-04-19  
**Status:** Approved

---

## Overview

Three improvements to the group detail page:

1. **Role-based session filtering** — each user sees only their own sessions
2. **Teacher/specialist can edit** their sessions
3. **Post-session report page** — dedicated page for filling in a report after each session

---

## 1. Role-Based Session Filtering

### Rules

| Role | Sessions shown |
|------|---------------|
| Teacher (`teacher`) | `classSessionsTable` rows where `teacherId = currentUser.id` |
| Specialist (`psychologist`) | `classSessionsTable` rows where `psychologistId = currentUser.id` |
| Admin | All sessions |

- Clinical sessions (`sessionMode = 'clinical'`) are **not used** in this school — exclude them for all roles.
- `adhocSessionsTable` (individual student sessions) is separate and not shown on the group detail page.
- A notice banner is shown on the group page: "أنت تشاهد حصصك فقط"

### UI Changes — Group Detail Page

- Sessions table auto-filters based on logged-in user role (no manual toggle needed)
- Each session row shows a **📝 تقرير** button (yellow/dashed = pending, green = done)
- Each session row shows an **✏️ edit** button (only for the session owner)
- Font changed to **Tajawal** throughout the app

---

## 2. Post-Session Report Page

### Route
`/groups/:groupId/sessions/:sessionId/report`

### Access
Only the session owner (teacher or specialist) can create/edit the report.

### Fields

| Field | Type | Required |
|-------|------|----------|
| ما تحقق (`achieved`) | Long text | Yes |
| ملاحظات لكل طالب (`studentNotes`) | Per-student: note (text) + score (1–5) | Note optional, score required for present students |
| الهدف القادم (`nextGoal`) | Long text | Yes |

### Per-Student Data
For each student in the session:
- `note` — free text (optional for absent students)
- `score` — integer 1–5 (required for present students, skipped for absent)

### Report States
- **مسودة (draft)** — saved but not finalized
- **مكتمل (published)** — finalized, shown as green ✓ in session list

### Database
The existing `classSessionsTable` already has `sessionGoal`, `sessionOutcome`, `nextGoal` fields. We will:
- Use `sessionOutcome` for **ما تحقق**
- Use `nextGoal` for **الهدف القادم**
- Use `sessionAttendanceTable.behavioralNotes` for per-student notes
- Use a new `postSessionScore` integer column (1–5) on `sessionAttendanceTable` for per-student scores
- Add a `reportStatus` enum column (`draft | published`) to `classSessionsTable`

### UI — Report Page Layout
- Top bar: session info (date, lesson title, type, attendance count)
- Left: form sections (ما تحقق, per-student notes+score, الهدف القادم)
- Right: sticky summary card showing completion status + Save / Save as Draft buttons

---

## 3. Specialist Report

Identical page and fields as the teacher report, scoped to `classSessionsTable` rows where `psychologistId = currentUser.id`.

The same `/groups/:groupId/sessions/:sessionId/report` route handles both roles — the UI adapts based on who is viewing.

---

## 4. Font Change

- Change the global font from current default to **Tajawal** (Google Fonts)
- Applied app-wide via the root CSS / Tailwind config

---

## Out of Scope

- Clinical sessions (`sessionMode = 'clinical'`) — not used
- Admin editing sessions of other users
- Report approval/review workflow
- Exporting reports to PDF
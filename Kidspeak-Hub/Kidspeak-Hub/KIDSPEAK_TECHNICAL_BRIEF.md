# Kidspeak LMS — Technical Brief
### For Senior Developer Handoff | Reconstruction-Grade Documentation

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [System Architecture](#2-system-architecture)
3. [Monorepo Structure](#3-monorepo-structure)
4. [Database Schema](#4-database-schema)
5. [User Roles & Permissions Matrix](#5-user-roles--permissions-matrix)
6. [Authentication & Session Management](#6-authentication--session-management)
7. [Core Logic](#7-core-logic)
8. [API Route Inventory](#8-api-route-inventory)
9. [Branding & UI Specification](#9-branding--ui-specification)
10. [Bilingual (RTL/LTR) Architecture](#10-bilingual-rtlltr-architecture)
11. [Media & File Storage](#11-media--file-storage)
12. [CMS Architecture](#12-cms-architecture)
13. [Frontend Page Inventory](#13-frontend-page-inventory)
14. [Environment & Deployment Configuration](#14-environment--deployment-configuration)

---

## 1. Project Overview

**Product Name:** Kidspeak Language Management System (Kidspeak LMS)
**Client:** Kidspeak Language Center — a children's English school in Algeria
**Purpose:** A fully bilingual (Arabic / English) LMS that handles both:
- **Educational tracking** — enrolment, classes, attendance, evaluations, progress reports, psychological support
- **Financial management** — tuition payments, invoicing, teacher payroll, expense tracking, revenue reporting

**Deployed URL:** Served via Replit infrastructure on a `.replit.app` domain
**Currency:** Algerian Dinar (DZD / د.ج) — all prices stored as `NUMERIC(10,2)`

---

## 2. System Architecture

### 2.1 High-Level Stack

| Layer | Technology | Version / Notes |
|---|---|---|
| Frontend SPA | React + Vite | React 18, Vite 6 |
| UI Components | shadcn/ui (Radix UI primitives) | Full set of Radix primitives |
| Styling | Tailwind CSS v4 | Logical properties for RTL/LTR |
| Rich Text Editor | TipTap v3 | Used in CMS page editor |
| Charts & Radar | Recharts v2 | RadarChart for Psychological Compass |
| Animations | Framer Motion | Page transitions and UI micro-animations |
| Routing | Wouter v3 | Lightweight client-side router |
| Data Fetching | TanStack React Query | Centralised cache, mutations |
| Form Handling | React Hook Form + Zod | With `@hookform/resolvers` |
| Backend API | Express v5 | Node.js, compiled with esbuild |
| ORM | Drizzle ORM | `drizzle-orm` + `drizzle-zod` |
| Database | PostgreSQL 16 | Hosted on Replit's managed PG (`heliumdb`) |
| File Storage | Replit Object Storage | Google Cloud Storage backend; private + public buckets |
| Password Hashing | bcryptjs | Salt rounds: 10 |
| Logging | Pino + pino-http | Structured JSON logging |
| Schema Validation (API) | Manual inline validation | **No zod in API server** (esbuild constraint) |
| Schema Validation (lib) | Drizzle-Zod | `createInsertSchema` in `lib/db` |
| Shared Zod Schemas | `@workspace/api-zod` | Separate lib consumed by frontend |

### 2.2 Module Connection Diagram

```
Browser
  │
  └── React SPA (artifacts/kidspeak)
        │
        ├── @workspace/api-client-react  ← typed fetch hooks wrapping TanStack Query
        │       └── @workspace/api-spec  ← shared TypeScript types / API response shapes
        │
        └── REST API calls (credentials: "include", same-origin cookies)
              │
              └── Express API Server (artifacts/api-server)
                    │
                    ├── middlewares/auth.ts  ← requireAuth / requireRole (async)
                    │
                    ├── Routes (see §8)
                    │
                    └── Drizzle ORM
                          │
                          └── PostgreSQL (DATABASE_URL env var)
                                │
                                └── 38 tables (see §4)

File Uploads:
  Browser → POST /storage/uploads/request-url (signed URL)
          → PUT {signedUrl} (direct upload to Replit Object Storage)
          → API reads via /storage/objects/* (private) or /storage/public-objects/* (public)
```

### 2.3 API Server Constraints

- The API server bundle is compiled with **esbuild** into a single `dist/index.mjs` file
- **`zod` cannot be imported inside `artifacts/api-server/src/`** — it causes build failures
- All request validation in the API server must use **manual inline validation** (plain JavaScript type-checking)
- Zod schemas live exclusively in `lib/api-zod/` and are consumed only by the frontend

---

## 3. Monorepo Structure

```
workspace/                          ← pnpm workspace root
├── pnpm-workspace.yaml
├── package.json                    ← root devDeps (TypeScript, Prettier)
│
├── artifacts/
│   ├── api-server/                 ← Express API (PORT env var, defaults to 8080 in dev)
│   │   ├── src/
│   │   │   ├── index.ts            ← Express app bootstrap, middleware setup
│   │   │   ├── middlewares/
│   │   │   │   └── auth.ts         ← requireAuth, requireRole(roles[])
│   │   │   └── routes/             ← one file per domain (see §8)
│   │   ├── build.mjs               ← esbuild script
│   │   └── package.json
│   │
│   ├── kidspeak/                   ← React SPA (Vite dev server)
│   │   ├── src/
│   │   │   ├── main.tsx            ← React root, QueryClient, Router, LanguageProvider
│   │   │   ├── App.tsx             ← Route declarations (wouter <Switch>)
│   │   │   ├── contexts/
│   │   │   │   └── language-context.tsx  ← useLanguage() provider
│   │   │   ├── components/
│   │   │   │   ├── ui/             ← shadcn/ui components
│   │   │   │   ├── layout/         ← Sidebar, Topbar, RoleGuard
│   │   │   │   └── enrollment-receipt-modal.tsx
│   │   │   ├── pages/              ← one folder per route (see §13)
│   │   │   └── lib/
│   │   │       ├── translations.ts ← t() lookup table (EN + AR strings)
│   │   │       └── utils.ts        ← cn(), date helpers, formatters
│   │   └── package.json
│   │
│   └── mockup-sandbox/             ← Isolated Vite instance for canvas component previews
│
└── lib/
    ├── db/                         ← Drizzle schema + migrations
    │   ├── src/
    │   │   ├── index.ts            ← exports { db } Drizzle client + all table refs
    │   │   └── schema/             ← one .ts file per table group (see §4)
    │   └── package.json
    │
    ├── api-zod/                    ← Zod request/response schemas (frontend-only)
    ├── api-spec/                   ← Shared TypeScript types
    ├── api-client-react/           ← Typed React Query hooks
    └── object-storage-web/         ← ObjectUploader component + useUpload hook
```

---

## 4. Database Schema

All tables use **serial integer primary keys** unless noted. All monetary values use `NUMERIC(10,2)`. All timestamps use `TIMESTAMP WITH TIME ZONE` unless noted.

### 4.1 Core Identity Tables

#### `users`
The central identity table for all 8 staff/parent roles.

| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `name` | text NOT NULL | |
| `email` | text NOT NULL UNIQUE | Login credential |
| `password_hash` | text NOT NULL | bcryptjs, 10 rounds |
| `role` | text NOT NULL | Enum: `admin`, `teacher`, `parent`, `psychologist`, `accountant`, `photographer`, `designer`, `marketer` |
| `phone` | text | Primary phone |
| `phone2` | text | Secondary phone |
| `profile_picture` | text | Object storage path |
| `bio` | text | Rich-text biography |
| `specialization` | text | e.g. "Child Psychology" |
| `emergency_contact1_name` | text | |
| `emergency_contact1_relation` | text | |
| `emergency_contact1_phone` | text | |
| `emergency_contact2_name` | text | |
| `emergency_contact2_relation` | text | |
| `emergency_contact2_phone` | text | |
| `ccp_number` | text | Algerian postal account number (for payroll) |
| `ccp_key` | text | CCP key |
| `rip` | text | Bank RIP (for transfers) |
| `status` | text NOT NULL | `active` \| `inactive` (default `active`) |
| `payment_type` | text | `per_session` \| `monthly` (staff payroll model) |
| `pay_per_session` | numeric | DZD per session (when `payment_type = per_session`) |
| `monthly_salary` | numeric | DZD/month (when `payment_type = monthly`) |
| `custom_role_id` | integer | FK → `custom_roles.id` (nullable) |
| `created_at` | timestamptz NOT NULL | default now() |

**Unique constraint:** `email`

#### `sessions`
Stores active authentication tokens (cookie-based sessions).

| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `user_id` | integer | FK → `users.id` ON DELETE CASCADE |
| `token` | text UNIQUE | 32-byte random hex (`crypto.randomBytes(32)`) |
| `expires_at` | timestamptz | 7 days from login |
| `created_at` | timestamptz | default now() |

#### `custom_roles`
Admin-defined named roles that extend base roles (e.g. "Senior Teacher").

| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `name` | text NOT NULL | Display name (EN) |
| `name_ar` | text | Display name (AR) |
| `base_template` | text NOT NULL | One of the 8 core roles (inherits permissions) |
| `description` | text | |
| `created_at` | timestamptz NOT NULL | |

---

### 4.2 Academic Hierarchy Tables

#### `programs`
Top-level academic programmes (e.g. "Kidspeak Language Program").

| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `name` | text NOT NULL | English name |
| `name_ar` | text | Arabic name |
| `type` | `program_type` enum NOT NULL | `language` \| `psychological` |
| `description` | text | English description |
| `description_ar` | text | Arabic description |
| `lead_specialist_id` | integer | FK → `users.id` ON DELETE SET NULL |
| `created_at` | timestamptz NOT NULL | |

#### `levels`
Curriculum levels within a programme (e.g. "المستوى الأول").

| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `program_id` | integer | FK → `programs.id` ON DELETE SET NULL |
| `name` | text NOT NULL | English/primary name (can be Arabic text) |
| `name_ar` | text | Explicit Arabic override |
| `description` | text | English description |
| `description_ar` | text | Arabic description |
| `duration_weeks` | integer NOT NULL | Programme duration |
| `sessions_per_week` | integer NOT NULL | e.g. 2 |
| `price` | numeric NOT NULL | Monthly tuition in DZD |
| `session_type` | text | e.g. "group" |
| `created_at` | timestamptz NOT NULL | |

**Public API filter:** `/api/public/levels` only returns levels where `program_id IS NOT NULL`.

#### `groups`
A cohort of students assigned to a teacher at a specific level.

| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `name` | text NOT NULL | |
| `teacher_id` | integer | FK → `users.id` |
| `level_id` | integer | FK → `levels.id` |
| `schedule` | text | Human-readable schedule string |
| `max_students` | integer | default 10 |
| `next_session_goal` | text | Goal for upcoming session |
| `start_date` | text | Freeform date string |
| `recurring_days` | text | e.g. `"Sunday,Wednesday"` |
| `session_start_time` | text | e.g. `"10:00"` (HH:MM) |
| `session_duration_mins` | integer | Session length in minutes |
| `created_at` | timestamptz NOT NULL | |

#### `group_students`
Many-to-many join table: which students are in which group.

| Column | Type | Notes |
|---|---|---|
| `group_id` | integer NOT NULL | FK → `groups.id` ON DELETE CASCADE |
| `student_id` | integer NOT NULL | FK → `students.id` ON DELETE CASCADE |
| `joined_at` | timestamptz NOT NULL | default now() |

**Primary key:** composite `(group_id, student_id)`

---

### 4.3 Pupil (Student) Tables

#### `students`
Core pupil record. Note: internally called "students" in DB and API; the UI label is configurable ("Pupils" by default in EN, "تلاميذ" in AR).

| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `name` | text NOT NULL | Full name |
| `date_of_birth` | date | |
| `level_id` | integer | FK → `levels.id` |
| `parent_id` | integer | FK → `users.id` (parent role user) |
| `teacher_id` | integer | FK → `users.id` (assigned teacher) |
| `enrollment_date` | date NOT NULL | |
| `behavioral_flags` | text[] NOT NULL | Array of flag strings; default `{}` |
| `notes` | text | General teacher notes |
| `profile_picture` | text | Object storage path |
| `medical_issues` | text | Medical notes (admin/teacher visible) |
| `learning_disabilities` | text | |
| `support_instructions` | text | Psychologist support notes |
| `preferred_teaching_method` | text | |
| `private_tip` | text | Psychologist's private tip (role-gated) |
| `private_tip_updated_by` | integer | FK → `users.id` ON DELETE SET NULL |
| `last_updated_by` | text | Name string of last editor |
| `last_updated_at` | timestamptz | |
| `created_at` | timestamptz NOT NULL | |

#### `observations`
Structured behavioural observations logged against a pupil.

| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `student_id` | integer NOT NULL | FK → `students.id` ON DELETE CASCADE |
| `author_id` | integer NOT NULL | FK → `users.id` |
| `content` | text NOT NULL | Observation text |
| `observation_type` | text NOT NULL | `fear` \| `shyness` \| `participation` \| `general` |
| `created_at` | timestamptz NOT NULL | |

---

### 4.4 Session & Attendance Tables

#### `class_sessions`
A scheduled or completed class for a group.

| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `group_id` | integer NOT NULL | FK → `groups.id` ON DELETE CASCADE |
| `teacher_id` | integer | FK → `users.id` |
| `psychologist_id` | integer | FK → `users.id` (for intervention sessions) |
| `session_kind` | text | `regular` \| `makeup` \| `workshop` (default `regular`) |
| `session_type` | text | `regular` \| `support` \| `makeup` \| `workshop` (default `regular`) |
| `session_mode` | text | `clinical` \| `developmental` (psychologist mode) |
| `session_date` | date NOT NULL | |
| `session_time` | text | HH:MM (e.g. `"10:00"`) |
| `lesson_title` | text | e.g. "Week 3 — Talk Show Live!" |
| `notes` | text | Session notes |
| `session_goal` | text | Pre-session goal |
| `session_outcome` | text | Post-session outcome |
| `next_goal` | text | Goal for next session |
| `status` | text | `planned` \| `completed` (default `completed`) |
| `created_at` | timestamptz NOT NULL | |

#### `session_attendance`
Per-pupil attendance record for a class session, including granular speaking/communication scores.

| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `session_id` | integer NOT NULL | FK → `class_sessions.id` ON DELETE CASCADE |
| `student_id` | integer NOT NULL | FK → `students.id` ON DELETE CASCADE |
| `status` | `attendance_status` enum | `present` \| `absent` \| `late` (default `present`) |
| `speaking_score` | integer | 1–10 |
| `confidence_score` | integer | 1–10 |
| `participation_score` | integer | 1–10 |
| `initiative_score` | integer | 1–10 |
| `behavioral_notes` | text | |
| `curriculum_progress` | text | |
| **Verbal Communication** | | |
| `verbal_fluency` | integer | 1–10 |
| `verbal_clarity` | integer | 1–10 |
| `verbal_vocabulary` | integer | 1–10 |
| **Non-Verbal Communication** | | |
| `nonverbal_eye_contact` | integer | 1–10 |
| `nonverbal_body_language` | integer | 1–10 |
| `nonverbal_facial_expressions` | integer | 1–10 |
| `created_at` | timestamptz NOT NULL | |

#### `adhoc_sessions`
One-to-one psychologist sessions with a pupil (outside the group class schedule).

| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `psychologist_id` | integer NOT NULL | FK → `users.id` ON DELETE CASCADE |
| `student_id` | integer NOT NULL | FK → `students.id` ON DELETE CASCADE |
| `session_date` | date NOT NULL | |
| `duration_minutes` | integer | |
| `title` | text | |
| `notes` | text | |
| `created_at` | timestamptz NOT NULL | |

#### `support_sessions`
Psychologist-led group support sessions (attached to a group).

| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `psychologist_id` | integer NOT NULL | FK → `users.id` ON DELETE CASCADE |
| `group_id` | integer NOT NULL | FK → `groups.id` ON DELETE CASCADE |
| `session_date` | text NOT NULL | |
| `session_time` | text | |
| `topic` | text NOT NULL | |
| `teacher_note` | text | |
| `status` | text NOT NULL | `scheduled` \| `completed` (default `scheduled`) |
| `rate_amount` | numeric | Psychologist rate for this session |
| `created_at` | timestamptz NOT NULL | |
| `updated_at` | timestamptz NOT NULL | |

---

### 4.5 Evaluation & Progress Tables

#### `evaluations`
Weekly summary evaluation per pupil. Created by teachers.

| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `student_id` | integer NOT NULL | FK → `students.id` ON DELETE CASCADE |
| `week_number` | integer NOT NULL | 1-based week within the level |
| `session_date` | date NOT NULL | Date of the evaluation session |
| `speaking_score` | integer NOT NULL | 1–10 |
| `confidence_score` | integer NOT NULL | 1–10 |
| `participation_score` | integer NOT NULL | 1–10 |
| `progress_score` | numeric(5,2) NOT NULL | **Auto-computed** (see §7.1) |
| `teacher_notes` | text | Teacher's narrative notes |
| `created_at` | timestamptz NOT NULL | |

#### `confidence_metrics`
Monthly "Psychological Compass" radar data per pupil. Created by psychologists.

| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `student_id` | integer NOT NULL | FK → `students.id` ON DELETE CASCADE |
| `eye_contact` | smallint NOT NULL | 1–10 (default 5) |
| `voice_volume` | smallint NOT NULL | 1–10 (default 5) |
| `initiative` | smallint NOT NULL | 1–10 (default 5) |
| `resilience` | smallint NOT NULL | 1–10 (default 5) |
| `month` | smallint NOT NULL | 1–12 |
| `year` | smallint NOT NULL | e.g. 2026 |
| `recorded_by` | integer | FK → `users.id` ON DELETE SET NULL |
| `created_at` | timestamptz NOT NULL | |

**Upsert logic:** POST to `/api/confidence-metrics` checks for existing `(student_id, month, year)` — if found, updates; otherwise inserts.

#### `performance_reports`
Composite formal progress report with both teacher and psychologist sections.

| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `student_id` | integer NOT NULL | FK → `students.id` ON DELETE CASCADE |
| `period` | text NOT NULL | e.g. "April 2026" |
| `report_date` | date NOT NULL | |
| `status` | text | `draft` \| `published` (default `draft`) |
| **Teacher Section** | | |
| `teacher_id` | integer | FK → `users.id` |
| `teacher_vocab_score` | integer | |
| `teacher_structure_score` | integer | |
| `teacher_fluency_score` | integer | |
| `teacher_vocab_notes` | text | |
| `teacher_structure_notes` | text | |
| `teacher_fluency_notes` | text | |
| `teacher_summary` | text | |
| **Psychologist Section** | | |
| `psychologist_id` | integer | FK → `users.id` |
| `fear_reduction_score` | integer | |
| `social_initiative_score` | integer | |
| `self_confidence_score` | integer | |
| `psychologist_notes` | text | |
| `psychologist_summary` | text | |
| `created_at` | timestamp | |
| `updated_at` | timestamp | |

---

### 4.6 Financial Tables

#### `payments`
A single tuition invoice record per pupil per billing period.

| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `student_id` | integer NOT NULL | FK → `students.id` ON DELETE CASCADE |
| `level_id` | integer | FK → `levels.id` (nullable) |
| `amount_due` | numeric(10,2) NOT NULL | Base amount before discount |
| `discount` | numeric(10,2) NOT NULL | Discount amount (default 0) |
| `amount_paid` | numeric(10,2) NOT NULL | Running total paid (default 0) |
| `status` | text NOT NULL | `pending` \| `partially_paid` \| `paid` \| `overdue` |
| `due_date` | date NOT NULL | |
| `paid_at` | timestamptz | Set when fully paid |
| `notes` | text | |
| `created_at` | timestamptz NOT NULL | |

**Receipt number format:** `ENR-{id.padStart(5, '0')}` (e.g. `ENR-00018`)

#### `payment_transactions`
Individual payment instalments against a payment record.

| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `payment_id` | integer NOT NULL | FK → `payments.id` ON DELETE CASCADE |
| `amount` | numeric(10,2) NOT NULL | Amount of this transaction |
| `payment_method` | text NOT NULL | `cash` \| `bank_transfer` \| `cheque` \| `online` |
| `transaction_date` | date NOT NULL | |
| `notes` | text | |
| `created_at` | timestamptz NOT NULL | |

**Transaction receipt format:** `TXN-{id.padStart(5, '0')}`

#### `expenses`
School operational expenses.

| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `category` | text NOT NULL | `rent` \| `utilities` \| `salaries` \| `materials` \| `maintenance` \| `other` |
| `description` | text NOT NULL | |
| `amount` | numeric(10,2) NOT NULL | |
| `expense_date` | date NOT NULL | |
| `notes` | text | |
| `created_at` | timestamptz NOT NULL | |

#### `teacher_payments`
Payroll disbursement records per teacher/psychologist.

| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `teacher_id` | integer NOT NULL | FK → `users.id` ON DELETE CASCADE |
| `amount` | numeric(10,2) NOT NULL | |
| `period` | text NOT NULL | e.g. "April 2026" |
| `status` | `teacher_payment_status` enum | `pending` \| `paid` |
| `note` | text | |
| `paid_at` | timestamptz | |
| `created_at` | timestamptz NOT NULL | |

#### `staff_payment_requests`
Staff-initiated payment requests or bonus/expense claims.

| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `staff_id` | integer NOT NULL | FK → `users.id` ON DELETE CASCADE |
| `type` | `payment_request_type` enum | `payment_request` \| `bonus_expense` |
| `amount` | numeric(10,2) NOT NULL | |
| `category` | `bonus_category` enum | `bonus` \| `materials` \| `transportation` |
| `reason` | text | |
| `status` | `payment_request_status` enum | `pending` \| `approved` \| `rejected` |
| `admin_comment` | text | |
| `reference_number` | text | |
| `linked_payment_id` | integer | Optional link to a `payments` row |
| `approved_at` | timestamptz | |
| `rejected_at` | timestamptz | |
| `receipt_confirmed_at` | timestamptz | |
| `created_at` | timestamptz NOT NULL | |

---

### 4.7 Communication & Engagement Tables

#### `messages`
Internal messaging system with broadcast capabilities.

| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `from_user_id` | integer | FK → `users.id` ON DELETE SET NULL |
| `to_user_id` | integer | FK → `users.id` ON DELETE CASCADE |
| `subject` | text NOT NULL | |
| `content` | text NOT NULL | |
| `is_read` | boolean NOT NULL | default false |
| `read_at` | timestamptz | |
| `recipient_type` | text NOT NULL | `individual` \| `group` \| `level` \| `role` \| `all_parents` \| `global` |
| `recipient_label` | text | Human-readable audience label |
| `recipient_count` | integer | Number of recipients in a broadcast |
| `batch_id` | text | UUID string grouping a broadcast send |
| `reply_to_id` | integer | Thread parent message id |
| `linked_student_id` | integer | FK → `students.id` ON DELETE SET NULL |
| `attachment_url` | text | Object storage path |
| `attachment_name` | text | |
| `attachment_type` | text | MIME type |
| `created_at` | timestamptz NOT NULL | |

#### `school_news`
News articles and announcements published by admin/staff.

| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `title` | text NOT NULL | English title |
| `title_ar` | text | Arabic title |
| `content` | text NOT NULL | Rich text (HTML) — English |
| `content_ar` | text | Rich text (HTML) — Arabic |
| `image_url` | text | Header image path |
| `category` | `news_category` enum | `school_update` \| `educational_tip` \| `event_gallery` |
| `author_id` | integer | FK → `users.id` ON DELETE SET NULL |
| `created_at` | timestamptz NOT NULL | |

#### `activity_requests`
Requests for field trips, events, or external activities. Parents respond with consent.

| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `title` | text NOT NULL | English |
| `title_ar` | text | Arabic |
| `description` | text NOT NULL | English |
| `description_ar` | text | Arabic |
| `date` | text NOT NULL | Event date string |
| `required_items` | text[] NOT NULL | Array of required items (EN) |
| `required_items_ar` | text[] NOT NULL | Array of required items (AR) |
| `cost` | integer | Cost in DZD (nullable = free) |
| `author_id` | integer | FK → `users.id` ON DELETE SET NULL |
| `target_type` | text NOT NULL | `all` \| `level` \| `group` \| `teacher` |
| `target_id` | integer | FK to level/group/teacher (nullable when target_type = `all`) |
| `created_at` | timestamptz NOT NULL | |

#### `activity_consents`
Parent's consent response to an activity request.

| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `request_id` | integer NOT NULL | FK → `activity_requests.id` ON DELETE CASCADE |
| `parent_id` | integer NOT NULL | FK → `users.id` ON DELETE CASCADE |
| `status` | text NOT NULL | `approved` \| `rejected` |
| `responded_at` | timestamptz NOT NULL | |

#### `ideas`
Idea Box — staff submit ideas for system/school improvements.

| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `title` | text NOT NULL | |
| `description` | text NOT NULL | |
| `category` | text NOT NULL | `marketing_idea` \| `educational_activity` \| `system_improvement` \| `event_suggestion` |
| `status` | text NOT NULL | `under_review` \| `approved` \| `done` \| `archived` |
| `attachment_url` | text | |
| `attachment_type` | text | |
| `submitted_by` | integer NOT NULL | FK → `users.id` ON DELETE CASCADE |
| `admin_feedback` | text | Admin's response (EN) |
| `admin_feedback_ar` | text | Admin's response (AR) |
| `reviewed_by` | integer | FK → `users.id` ON DELETE SET NULL |
| `created_at` | timestamptz NOT NULL | |
| `updated_at` | timestamptz NOT NULL | |

#### `consultations`
Psychological consultation bookings between psychologist and parent.

| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `parent_id` | integer NOT NULL | FK → `users.id` ON DELETE CASCADE |
| `student_id` | integer | FK → `students.id` ON DELETE SET NULL |
| `type` | text NOT NULL | `free` \| `paid` |
| `status` | text NOT NULL | `pending` \| `approved` \| `rejected` \| `completed` |
| `parent_notes` | text | Parent's initial notes |
| `price` | numeric(10,2) | Paid consultation fee |
| `admin_description` | text | Admin adds context |
| `psychologist_summary` | text | Post-consultation summary |
| `scheduled_date` | date | |
| `initiated_by` | text NOT NULL | `parent` \| `psychologist` |
| `psychologist_id` | integer | FK → `users.id` ON DELETE SET NULL |
| `created_at` | timestamptz NOT NULL | |
| `updated_at` | timestamptz NOT NULL | |
| `approved_at` | timestamptz | |
| `completed_at` | timestamptz | |

**Business rule:** Each parent is limited to one free consultation (`type = 'free'`). A second request is blocked at API level.

---

### 4.8 Media & Creative Tables

#### `media`
Photos and videos uploaded by photographer/teacher for pupils/groups.

| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `type` | text NOT NULL | `photo` \| `video` |
| `category` | text NOT NULL | `group` \| `private` \| `talkshow` \| `teacher_broadcast` \| `global` |
| `url` | text NOT NULL | Object storage path or external URL |
| `thumbnail_url` | text | Thumbnail path |
| `description` | text | |
| `student_id` | integer | FK → `students.id` ON DELETE CASCADE |
| `group_id` | integer | FK → `groups.id` ON DELETE CASCADE |
| `uploaded_by` | integer | FK → `users.id` ON DELETE SET NULL |
| `created_at` | timestamp NOT NULL | |

**Access control:** Parents can only see media for their own children. `category = 'private'` is visible to the linked student's parent only.

#### `creative_asset_vault`
Creative Studio — stores approved design assets, event photos, and Talk Show videos.

| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `title` | text NOT NULL | |
| `description` | text | |
| `file_url` | text NOT NULL | Object storage path or YouTube URL |
| `file_type` | text NOT NULL | `image` \| `video` |
| `category` | text NOT NULL | `logo` \| `banner` \| `social_post` \| `event_photo` \| `talk_show` \| `other` |
| `uploaded_by` | integer | FK → `users.id` ON DELETE SET NULL |
| `created_at` | timestamptz NOT NULL | |

**Media Lab routes:** `event_photo` and `talk_show` categories appear in the public Media Lab section (`GET /api/studio/media-lab`). All other categories are the internal Creative Studio asset library.

#### `creative_projects`
Design/marketing task briefs assigned to designers/photographers/marketers.

| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `title` | text NOT NULL | |
| `description` | text | |
| `deadline` | text | |
| `status` | text NOT NULL | `todo` \| `in_progress` \| `review` \| `done` |
| `task_type` | text | `graphic_design` \| `photo_editing` \| `video_production` \| `social_content` |
| `budget` | numeric(10,2) | Project budget in DZD |
| `earning_status` | text | `pending` \| `paid` |
| `earning_paid_at` | timestamptz | |
| `earning_paid_by` | integer | FK → `users.id` ON DELETE SET NULL |
| `assigned_to` | integer | FK → `users.id` ON DELETE SET NULL |
| `created_by` | integer | FK → `users.id` ON DELETE SET NULL |
| `published_news_id` | integer | Link to a `school_news` row if published |
| `created_at` | timestamptz NOT NULL | |
| `updated_at` | timestamptz NOT NULL | |

#### `project_files`
Files uploaded to a creative project.

| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `project_id` | integer NOT NULL | FK → `creative_projects.id` ON DELETE CASCADE |
| `uploaded_by` | integer | FK → `users.id` ON DELETE SET NULL |
| `file_name` | text NOT NULL | |
| `file_url` | text NOT NULL | Object storage path |
| `file_type` | text NOT NULL | `image` \| `video` \| `document` |
| `created_at` | timestamptz NOT NULL | |

#### `project_comments`
Approval/revision comments on creative projects.

| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `project_id` | integer NOT NULL | FK → `creative_projects.id` ON DELETE CASCADE |
| `author_id` | integer | FK → `users.id` ON DELETE SET NULL |
| `content` | text NOT NULL | |
| `is_approval` | boolean NOT NULL | default false |
| `is_revision` | boolean NOT NULL | default false |
| `created_at` | timestamptz NOT NULL | |

---

### 4.9 Public-Facing & Admin Tables

#### `registration_requests`
Landing page registration/enquiry form submissions.

| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `full_name` | text NOT NULL | |
| `email` | text NOT NULL | |
| `phone` | text NOT NULL | |
| `whatsapp_phone` | text | |
| `address` | text | |
| `source` | text | `open_day` if registered during Open Day campaign |
| `status` | text NOT NULL | `pending` \| `approved` \| `rejected` |
| `created_at` | timestamptz NOT NULL | |

#### `public_enquiries`
More detailed enquiry form (child details included).

| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `parent_name` | text | |
| `parent_phone` | text | |
| `parent_email` | text | |
| `child_name` | text | |
| `child_age` | text | |
| `preferred_level` | text | |
| `notes` | text | |
| `status` | text | `new` \| `contacted` \| `enrolled` (default `new`) |
| `created_at` | timestamptz NOT NULL | |

#### `enrollment_requests`
Logged-in parent requesting enrollment for a new child.

| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `parent_id` | integer NOT NULL | FK → `users.id` ON DELETE CASCADE |
| `student_name` | text NOT NULL | |
| `date_of_birth` | date | |
| `notes` | text | |
| `status` | text NOT NULL | `pending` \| `approved` \| `rejected` |
| `admin_notes` | text | |
| `created_at` | timestamptz NOT NULL | |
| `updated_at` | timestamptz NOT NULL | |

#### `school_settings`
Singleton settings row (always id=1). Controls all school branding and configuration.

| Column | Type | Default | Notes |
|---|---|---|---|
| `school_name` | text | "Kidspeak Language Center" | |
| `slogan` | text | "Where Progress Meets Precision." | EN |
| `slogan_ar` | text | "حيث يلتقي التقدم بالدقة." | AR |
| `registration_id` | text | | Official registration number |
| `address` | text | | |
| `phone` / `phone2` | text | | |
| `email` | text | "contact@kidspeak.dz" | |
| `website` / `instagram` / `facebook` / `youtube` / `tiktok` | text | | Social links |
| `logo_url` | text | | Full-colour logo object storage path |
| `logo_white_url` | text | | White logo for dark backgrounds |
| `logo_print_url` | text | | High-res print logo |
| `favicon_url` | text | | |
| `signature_url` | text | | Director's signature for reports |
| `invoice_footer_en` | text | "Thank you for trusting Kidspeak…" | |
| `invoice_footer_ar` | text | "شكراً لثقتكم…" | |
| `currency` | text | "DZD" | |
| `currency_symbol_ar` | text | "د.ج" | |
| `invoice_prefix` | text | "RCP-" | |
| `primary_color` | text | "#1B2E8F" | Deep Blue |
| `secondary_color` | text | "#F5A600" | Yellow |
| `pupil_label` | text | "Pupils" | Configurable noun for pupils |
| `pupil_label_ar` | text | "تلاميذ" | |
| `welcome_announcement` | text | | Shown on dashboard |
| `working_days` / `working_hours_start` / `working_hours_end` | text | | |

#### `cms_settings`
Key-value store for landing page CMS sections. Values are JSON blobs.

| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `key` | text NOT NULL UNIQUE | e.g. `hero`, `open_day`, `testimonials` |
| `value_json` | text NOT NULL | JSON-encoded blob (default `{}`) |
| `updated_at` | timestamp | |

**Known keys in use:**
- `hero` — landing page hero section content
- `open_day` — Open Day banner (`enabled`, `greetingEn`, `greetingAr`, `discount`, `discountDescEn`, `discountDescAr`, `ctaTextEn`, `ctaTextAr`)
- `testimonials` — testimonial carousel content

#### `custom_pages`
Admin-created dynamic pages (e.g. "About Us", "FAQ").

| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `title_en` | text NOT NULL | |
| `title_ar` | text NOT NULL | |
| `slug` | text NOT NULL UNIQUE | URL path, e.g. `/about-us` |
| `content_en` | text NOT NULL | Rich text HTML (EN) |
| `content_ar` | text NOT NULL | Rich text HTML (AR) |
| `status` | text NOT NULL | `draft` \| `published` |
| `show_in_navbar` | boolean NOT NULL | |
| `show_in_footer` | boolean NOT NULL | |
| `created_at` / `updated_at` | timestamp | |

---

### 4.10 Entity Relationship Summary

```
programs (1) ──< levels (n)
levels   (1) ──< groups (n) ──< group_students >── students
                 groups (1) ──< class_sessions (n) ──< session_attendance
                                                        ↑
                                                    students
students (1) ──< evaluations (n)
students (1) ──< confidence_metrics (n)
students (1) ──< payments (n) ──< payment_transactions (n)
students (1) ──< observations (n)
students (1) ──< performance_reports (n)
students (1) ──< media (n)
students (1) ──< adhoc_sessions (n)
users    (1) ──< messages (n)           [via to_user_id]
users    (1) ──< staff_payment_requests (n)
users    (1) ──< teacher_payments (n)
users    (1) ──< consultations (n)      [via parent_id]
users    (1) ──< creative_projects (n)  [via assigned_to]
users    (1) ──< ideas (n)              [via submitted_by]
```

---

## 5. User Roles & Permissions Matrix

8 roles are defined: `admin`, `teacher`, `parent`, `psychologist`, `accountant`, `photographer`, `designer`, `marketer`.

| Feature / Module | admin | teacher | parent | psychologist | accountant | photographer | designer | marketer |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **Dashboard** | ✅ full | ✅ own data | ✅ children | ✅ own data | ✅ financial | ✅ limited | ✅ limited | ✅ limited |
| **User Management** (CRUD) | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Programs** (CRUD) | ✅ | 👁 read | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Levels** (CRUD) | ✅ | 👁 read | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Groups** (CRUD) | ✅ | 👁 own | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Students** (view list) | ✅ | ✅ own groups | ✅ own children | ✅ all | ❌ | ❌ | ❌ | ❌ |
| **Student Profile** (edit) | ✅ full | ✅ limited | ❌ | ✅ psych fields | ❌ | ❌ | ❌ | ❌ |
| **Private Tip** (read/write) | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Sessions** (log/view) | ✅ | ✅ own | ❌ | ✅ own | ❌ | ❌ | ❌ | ❌ |
| **Attendance** (record) | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Evaluations** (CRUD) | ✅ | ✅ | 👁 own children | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Confidence Metrics** (CRUD) | ✅ | ❌ | 👁 own children | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Performance Reports** | ✅ | ✅ | 👁 own children | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Observations** (CRUD) | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Payments** (view) | ✅ | ❌ | ✅ own children | ❌ | ✅ | ❌ | ❌ | ❌ |
| **Payments** (create/edit) | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| **Enrollment Receipt** | ✅ | ❌ | ✅ own children | ❌ | ✅ | ❌ | ❌ | ❌ |
| **Expenses** (CRUD) | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| **Revenue Reports** | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| **Teacher Payroll** | ✅ | 👁 own | ❌ | 👁 own | ✅ | ❌ | ❌ | ❌ |
| **News** (publish) | ✅ | ✅ | 👁 read | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Activity Requests** (create) | ✅ | ✅ | 👁 consent | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Messages** (send) | ✅ broadcast | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Inbox** (receive) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Idea Box** (submit) | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Idea Box** (review/feedback) | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Consultations** (request) | ✅ | ❌ | ✅ | ✅ initiate | ❌ | ❌ | ❌ | ❌ |
| **Psychological Portal** | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Media Gallery** (upload) | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| **Media Gallery** (view) | ✅ | ✅ | ✅ own children | ✅ | ❌ | ✅ | ❌ | ❌ |
| **Creative Studio** | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| **CMS / Web Content** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **School Settings** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Enrollment Requests** | ✅ | ❌ | ✅ submit | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Staff Payment Requests** | ✅ approve | ✅ submit own | ❌ | ✅ submit own | ✅ submit own | ✅ submit own | ✅ submit own | ✅ submit own |

---

## 6. Authentication & Session Management

### 6.1 Flow

1. Client POSTs `{ email, password }` to `POST /api/auth/login`
2. Server fetches user by email, runs `bcrypt.compare(password, passwordHash)`
3. Checks `user.status !== 'inactive'`
4. Generates `token = crypto.randomBytes(32).toString('hex')` (64-character hex)
5. Inserts row into `sessions` with `expires_at = now() + 7 days`
6. Sets `session_token` **HttpOnly cookie** (`secure: true` in production, `sameSite: 'lax'`)
7. Returns `{ user, message }` (passwordHash stripped)

### 6.2 Request Authentication

Every protected route passes through `requireAuth` middleware:

```
Cookie: session_token={token}
  → DB: SELECT users.* FROM sessions
        JOIN users ON sessions.user_id = users.id
        WHERE sessions.token = ? AND sessions.expires_at > now()
  → Attaches user object to req.user
  → 401 if not found / expired
```

### 6.3 Role Enforcement

```typescript
// Usage in route file:
await requireRole(["admin", "accountant"])

// Implementation: checks req.user.role against allowed array
// Returns 403 if role not permitted
// Note: requireRole is async — always called with await
```

### 6.4 Password Management

- Hashing: `bcrypt.hash(password, 10)` (10 salt rounds)
- Change password: `POST /api/auth/change-password` (requires `currentPassword` + `newPassword` min 8 chars)
- Logout: `POST /api/auth/logout` deletes the session row and clears cookie

---

## 7. Core Logic

### 7.1 Speaking-First Evaluation Logic

The evaluation system is built around three "Speaking-First" pillars: **Speaking**, **Confidence**, and **Participation** — reflecting the school's pedagogy that verbal output comes first.

**Weekly Evaluation Flow:**
1. Teacher navigates to Evaluations → selects student + week number
2. Enters three scores (each 1–10): `speaking_score`, `confidence_score`, `participation_score`
3. Optionally fills `teacher_notes`
4. On create/update, the API **auto-computes** `progress_score`:

```typescript
function calcProgressScore(speaking: number, confidence: number, participation: number): number {
  return Math.round(((speaking + confidence + participation) / 30) * 100 * 10) / 10;
  // Max possible: (10+10+10)/30 * 100 = 100.0
  // Formula: percentage of maximum, rounded to 1 decimal place
}
```

**Example:** Speaking=9, Confidence=9, Participation=9 → `(27/30)*100 = 90.0%`

**Per-Session Granular Scores (session_attendance):**
In addition to weekly evaluations, each session attendance record captures:
- **Verbal metrics:** `verbal_fluency`, `verbal_clarity`, `verbal_vocabulary` (1–10 each)
- **Non-verbal metrics:** `nonverbal_eye_contact`, `nonverbal_body_language`, `nonverbal_facial_expressions` (1–10 each)
- `speaking_score`, `confidence_score`, `participation_score`, `initiative_score` (1–10 each)

These session-level scores are used to plot attendance trends in the student profile chart.

**Frontend display:** The student profile shows a Recharts `LineChart` plotting `progress_score` across weeks, colour-coded as green (≥ 70), amber (≥ 50), red (< 50).

---

### 7.2 Psychological Compass (Radar) Logic

The Psychological Compass is a monthly radar chart showing four behavioural/emotional dimensions for a pupil, recorded by the psychologist.

**Four Dimensions (each 1–10):**
| Dimension | Field | Description |
|---|---|---|
| Eye Contact | `eye_contact` | Maintains visual engagement |
| Voice Volume | `voice_volume` | Speaks with appropriate volume/projection |
| Initiative | `initiative` | Self-starts conversations or contributions |
| Resilience | `resilience` | Handles mistakes/challenges without withdrawal |

**Upsert Logic (POST `/api/confidence-metrics`):**
```
1. Validate all four scores are integers 1–10
2. Query: SELECT id FROM confidence_metrics
          WHERE student_id = ? AND month = ? AND year = ?
3. If found → UPDATE (overwrites previous scores for that month)
   If not found → INSERT new row
4. Returns the saved row
```

This ensures one canonical radar snapshot per pupil per calendar month.

**Frontend display:** A Recharts `RadarChart` with a `PolarGrid`, four `PolarAngleAxis` labels, and a filled `Radar` polygon — rendered in Psychologist Violet (`#7c3aed`) on the student profile's Psychological tab. Clicking a month in the timeline re-renders the radar for that period.

**Access:** Only `admin` and `psychologist` roles can write. All authenticated roles who can see the student profile can read.

---

### 7.3 Automated Invoicing System

**Payment Record Lifecycle:**

```
CREATE payment (status: 'pending')
  → amountDue set to level.price (e.g. 16,000 DZD)
  → discount field stores any applied discount (e.g. 2,400 DZD for 15% Open Day)
  → dueDate set by accountant/admin

ADD transaction (POST /api/payments/:id/transactions)
  → Creates payment_transaction row
  → API recalculates: amountPaid = SUM(transactions.amount)
  → Auto-updates payment.status:
      amountPaid == 0              → 'pending'
      0 < amountPaid < amountDue  → 'partially_paid'
      amountPaid >= amountDue     → 'paid' (sets paid_at = now())
      dueDate < today AND not paid → 'overdue'

RECEIPT GENERATION (GET /api/payments/:id/enrollment-receipt)
  → Fetches payment + student + level + group + teacher
  → Falls back: if payment.levelId is null → uses student.levelId
  → Falls back: if payment has no teacherName → uses student.teacherId
  → Returns enriched receipt object with receiptNumber: `ENR-{id.padStart(5,'0')}`
```

**Invoice (Full Invoice Modal):**
- Triggered by accountant/admin from Payments page
- Receipt number format: `RCP-{payment.id.padStart(5,'0')}`
- Shows: school logo, school address, receipt number, date issued, due date, status badge, pupil name, parent name, level, group, teacher, schedule, amount breakdown (due, discount, paid, balance), payment method, invoice footer from `school_settings`
- **Currency formatting:** `amount.toLocaleString('fr-DZ')` + " د.ج" (Algerian locale, no decimals for whole amounts)

**Transaction Receipt:**
- Per-instalment receipt number: `TXN-{transaction.id.padStart(5,'0')}`

---

### 7.4 Session-Based Earnings Logic

**Teacher payroll uses two models** (configured per user in `users.payment_type`):

**Model A — Per Session (`per_session`):**
```
totalEarned = sessionCount × payPerSession (DZD)
```

**Model B — Monthly Salary (`monthly`):**
```
uniqueMonths = distinct YYYY-MM strings from all session dates
totalEarned = uniqueMonths.size × monthlySalary (DZD)
```

**Session aggregation for psychologists** counts four types:
1. `regularSessions` — class_sessions where `teacher_id = psychologist.id` (rare)
2. `interventionSessions` — class_sessions where `psychologist_id = psychologist.id`
3. `adhocSessions` — adhoc_sessions where `psychologist_id = psychologist.id`
4. `groupSupportSessions` — support_sessions where `psychologist_id = psychologist.id`

**Planned sessions are excluded** (`status != 'planned'` filter applied to class_sessions).

**Balance calculation:**
```
balance = totalEarned - totalPaid
totalPaid = SUM(teacher_payments WHERE status = 'paid')
totalPending = SUM(teacher_payments WHERE status = 'pending')
```

**Endpoint:** `GET /api/earnings/my` (teacher/psychologist sees own), `GET /api/earnings/teachers/:id` (admin sees any)

---

## 8. API Route Inventory

**Base URL:** `http://localhost:{PORT}` (PORT from env, 8080 in dev)
**Auth cookie:** `session_token` (HttpOnly, 7-day TTL)

### 8.1 Public Routes (no authentication)

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/auth/login` | Login, returns user + sets cookie |
| `POST` | `/api/auth/logout` | Clears session |
| `GET` | `/api/auth/me` | Get current session user |
| `GET` | `/api/public/levels` | Levels with `program_id IS NOT NULL` (price as float, includes nameAr) |
| `GET` | `/api/public/settings` | School name, logo, phone, address, social links |
| `GET` | `/api/public/cms/settings/:key` | CMS section data by key |
| `GET` | `/api/public/cms/settings` | All CMS sections |
| `GET` | `/api/public/pages` | Published custom pages list |
| `GET` | `/api/public/pages/:slug` | Single published page |
| `POST` | `/api/public/enquiries` | Submit public enquiry form |
| `POST` | `/api/public/registration-requests` | Submit landing page registration form |
| `GET` | `/api/studio/media-lab` | Public Media Lab (event_photo + talk_show assets) |

### 8.2 Protected Routes (requireAuth)

| Method | Path | Allowed Roles | Description |
|---|---|---|---|
| `PATCH` | `/api/auth/me` | any | Update own profile |
| `POST` | `/api/auth/change-password` | any | Change own password |
| `GET` | `/api/users` | admin | List all users |
| `POST` | `/api/users` | admin | Create user |
| `PUT` | `/api/users/:id` | admin | Update user |
| `DELETE` | `/api/users/:id` | admin | Delete user |
| `GET` | `/api/programs` | admin, teacher | List programs |
| `POST` | `/api/programs` | admin | Create program |
| `PUT` | `/api/programs/:id` | admin | Update program |
| `DELETE` | `/api/programs/:id` | admin | Delete program |
| `GET` | `/api/levels` | admin, teacher | List all levels |
| `POST` | `/api/levels` | admin | Create level |
| `PUT` | `/api/levels/:id` | admin | Update level |
| `DELETE` | `/api/levels/:id` | admin | Delete level |
| `GET` | `/api/groups` | admin, teacher | List groups |
| `POST` | `/api/groups` | admin | Create group |
| `PUT` | `/api/groups/:id` | admin, teacher | Update group |
| `DELETE` | `/api/groups/:id` | admin | Delete group |
| `POST` | `/api/groups/:id/students` | admin | Add student to group |
| `DELETE` | `/api/groups/:groupId/students/:studentId` | admin | Remove student from group |
| `GET` | `/api/students` | admin, teacher, psychologist | List students |
| `POST` | `/api/students` | admin | Create student |
| `GET` | `/api/students/:id` | admin, teacher, psychologist, parent (own) | Get student profile |
| `PUT` | `/api/students/:id` | admin, teacher, psychologist | Update student |
| `DELETE` | `/api/students/:id` | admin | Delete student |
| `GET` | `/api/sessions` | admin, teacher, psychologist | List class sessions |
| `POST` | `/api/sessions` | admin, teacher | Create session |
| `PUT` | `/api/sessions/:id` | admin, teacher | Update session |
| `DELETE` | `/api/sessions/:id` | admin, teacher | Delete session |
| `GET` | `/api/sessions/:id/attendance` | admin, teacher | Get attendance for session |
| `POST` | `/api/sessions/:id/attendance` | admin, teacher | Record attendance |
| `GET` | `/api/evaluations` | admin, teacher, parent (own) | List evaluations |
| `POST` | `/api/evaluations` | admin, teacher | Create evaluation |
| `PUT` | `/api/evaluations/:id` | admin, teacher | Update evaluation |
| `DELETE` | `/api/evaluations/:id` | admin, teacher | Delete evaluation |
| `GET` | `/api/confidence-metrics` | admin, psychologist, teacher, parent | Get radar data |
| `POST` | `/api/confidence-metrics` | admin, psychologist | Upsert radar data |
| `GET` | `/api/payments` | admin, accountant, parent | List payments |
| `POST` | `/api/payments` | admin, accountant | Create payment |
| `PUT` | `/api/payments/:id` | admin, accountant | Update payment |
| `DELETE` | `/api/payments/:id` | admin, accountant | Delete payment |
| `GET` | `/api/payments/:id/enrollment-receipt` | admin, accountant, parent | Enrollment receipt data |
| `POST` | `/api/payments/:id/transactions` | admin, accountant | Add transaction |
| `DELETE` | `/api/payments/:id/transactions/:txId` | admin, accountant | Remove transaction |
| `GET` | `/api/earnings/my` | teacher, psychologist, admin | Own earnings |
| `GET` | `/api/earnings/teachers/:id` | admin | Any teacher's earnings |
| `GET` | `/api/teacher-payments` | admin | Payroll records |
| `POST` | `/api/teacher-payments` | admin | Create payroll entry |
| `PUT` | `/api/teacher-payments/:id/mark-paid` | admin | Mark payroll as paid |
| `GET` | `/api/expenses` | admin, accountant | List expenses |
| `POST` | `/api/expenses` | admin, accountant | Create expense |
| `PUT` | `/api/expenses/:id` | admin, accountant | Update expense |
| `DELETE` | `/api/expenses/:id` | admin, accountant | Delete expense |
| `GET` | `/api/revenue` | admin, accountant | Revenue overview |
| `GET` | `/api/news` | all | List news |
| `POST` | `/api/news` | admin, teacher | Create news |
| `PUT` | `/api/news/:id` | admin, teacher | Update news |
| `DELETE` | `/api/news/:id` | admin | Delete news |
| `GET` | `/api/requests` | all | List activity requests |
| `POST` | `/api/requests` | admin, teacher | Create activity request |
| `POST` | `/api/requests/:id/consent` | parent | Submit consent |
| `GET` | `/api/ideas` | all | List ideas (filtered by role) |
| `POST` | `/api/ideas` | all staff except parent | Submit idea |
| `PUT` | `/api/ideas/:id` | admin | Review/update idea |
| `GET` | `/api/messages` | any | Own inbox messages |
| `POST` | `/api/messages` | any | Send message (broadcast or individual) |
| `PUT` | `/api/messages/:id/read` | any | Mark message as read |
| `GET` | `/api/messages/unread-count` | any | Unread count (polled every 30s) |
| `GET` | `/api/consultations` | admin, psychologist, parent | List consultations |
| `POST` | `/api/consultations` | parent (free type), admin (any) | Request consultation |
| `PUT` | `/api/consultations/:id` | admin, psychologist | Update consultation |
| `GET` | `/api/observations` | admin, psychologist, teacher | List observations |
| `POST` | `/api/observations` | admin, psychologist, teacher | Create observation |
| `PUT` | `/api/admin/cms/settings/:key` | admin | Upsert CMS section |
| `GET/POST/PUT/DELETE` | `/api/admin/cms/pages/*` | admin | Custom page CRUD |
| `GET` | `/api/settings` | admin | Get school settings |
| `PUT` | `/api/settings` | admin | Update school settings |
| `POST` | `/api/storage/uploads/request-url` | any authenticated | Get signed upload URL |
| `GET` | `/api/storage/objects/*` | any authenticated | Serve private file |
| `GET` | `/api/storage/public-objects/*` | unauthenticated | Serve public file |
| `GET` | `/api/studio/projects` | studio roles | List creative projects |
| `POST` | `/api/studio/projects` | admin, studio roles | Create project |
| `GET` | `/api/studio/vault` | studio roles | List asset vault |
| `POST` | `/api/studio/vault` | studio roles | Upload to vault |
| `GET` | `/api/studio/media-lab` | public | Event photos + talk show videos |
| `POST` | `/api/studio/media-lab` | studio roles | Upload to media lab |
| `GET` | `/api/performance-reports` | admin, teacher, psychologist, parent | List reports |
| `POST` | `/api/performance-reports` | admin, teacher, psychologist | Create report |
| `PUT` | `/api/performance-reports/:id` | admin, teacher, psychologist | Update report |
| `GET` | `/api/dashboard` | any | Role-filtered dashboard stats |
| `GET` | `/api/enrollment-requests` | admin, parent | List enrollment requests |
| `POST` | `/api/enrollment-requests` | parent | Submit enrollment request |
| `PUT` | `/api/enrollment-requests/:id` | admin | Process enrollment request |
| `GET` | `/api/staff-payment-requests` | admin, self | List payment requests |
| `POST` | `/api/staff-payment-requests` | any staff | Submit payment request |
| `PUT` | `/api/staff-payment-requests/:id` | admin | Approve/reject |
| `GET/POST/PUT` | `/api/adhoc-sessions` | admin, psychologist | Ad-hoc session CRUD |
| `GET/POST/PUT` | `/api/support-sessions` | admin, psychologist | Group support session CRUD |

---

## 9. Branding & UI Specification

### 9.1 Colour Palette

| Token | Hex | Usage |
|---|---|---|
| **Deep Blue** | `#1B2E8F` | Primary brand colour: nav, buttons, headers, chart fill, receipt headers |
| **Yellow / Gold** | `#F5A600` | Accent: CTA buttons, badges, highlights, section dividers |
| **Psychologist Violet** | `#7c3aed` | Exclusive to psychological data: radar chart, psych portal cards, `observation_type` badges |
| White | `#FFFFFF` | Backgrounds, card surfaces |
| Light Gray | `#F8FAFC` | Page backgrounds, alternate row fills |
| Success Green | `#16a34a` | Paid status, present attendance badge |
| Amber | `#D97706` | Partially paid, late badge |
| Error Red | `#DC2626` | Overdue, absent badge |
| Muted Gray | `#6B7280` | Pending status, secondary text |

These values are stored in `school_settings.primary_color` and `school_settings.secondary_color` so they are configurable at runtime (frontend reads them via `useSettings()` hook).

### 9.2 Typography

| Use | Specification |
|---|---|
| Primary font stack | `"Cairo", "Segoe UI", Tahoma, Arial, sans-serif` |
| UI components | System default (Tailwind's sans stack) |
| Receipts/Invoices | Cairo (specified inline for Arabic/French digit support) |
| Font sizes | Tailwind scale (text-xs through text-3xl) |
| Font weights | Tailwind (font-medium, font-semibold, font-bold, font-black) |
| Headings | `font-black` (900 weight) |

### 9.3 Component Library

Built on **shadcn/ui** which wraps **Radix UI** primitives:
- `Button`, `Card`, `Dialog`, `Select`, `Tabs`, `Badge`, `Table`, `Input`, `Textarea`
- `Sheet` (slide-over panels), `Popover`, `DropdownMenu`, `Accordion`
- `Toast` (Sonner — `sonner` package, not shadcn toast)
- `AlertDialog` for destructive confirmations
- `ScrollArea` for long lists

### 9.4 Icon Library

**Lucide React** (`lucide-react`) for all system icons.
**React Icons** (`react-icons`) for brand logos (social media icons).

### 9.5 Currency Display

- **Locale:** `fr-DZ` (French as spoken in Algeria)
- **Symbol:** `د.ج` (Arabic dinar symbol, stored in `school_settings.currency_symbol_ar`)
- **Format helper:**
  ```typescript
  function fmtDZD(amount: number): string {
    return amount.toLocaleString("fr-DZ", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }) + " د.ج";
  }
  ```

---

## 10. Bilingual (RTL/LTR) Architecture

### 10.1 Language Context

**Provider:** `artifacts/kidspeak/src/contexts/language-context.tsx`
**Hook:** `useLanguage()` — available anywhere inside `<LanguageProvider>`

**Returns:**
```typescript
{
  language: "en" | "ar",
  setLanguage: (lang: "en" | "ar") => void,
  t: (key: string) => string,          // translation lookup
  isRTL: boolean,                       // true when language === "ar"
  pupilLabel: string,                   // configurable noun from school_settings
  setPupilLabel: (label: string) => void
}
```

**RTL Application:**
```typescript
useEffect(() => {
  document.documentElement.dir = isRTL ? "rtl" : "ltr";
}, [language, isRTL]);
```
This sets `dir="rtl"` on `<html>`, which activates Tailwind's logical properties globally.

### 10.2 Bilingual Translation Approach

Two patterns are used:

**Pattern A — Inline dual-field (preferred for data from DB):**
```typescript
const isAr = language === "ar";
const displayName = isAr && level.nameAr ? level.nameAr : level.name;
```

**Pattern B — t() function (for static UI labels):**
```typescript
const { t } = useLanguage();
<label>{t("pupil_name")}</label>  // looks up translations.ts
```

**`translations.ts`** is a flat key-value object with `{ en: string, ar: string }` pairs. **Never add domain data (level names, news content) to this file** — it is only for static UI strings.

**Helper shorthand:**
```typescript
const lbl = (en: string, ar: string) => isAr ? ar : en;
// Usage: lbl("Receipt No.", "رقم الإيصال")
```

### 10.3 Database Bilingual Strategy

Every admin-created content table has parallel `_ar` columns:

| Table | EN columns | AR columns |
|---|---|---|
| `programs` | `name`, `description` | `name_ar`, `description_ar` |
| `levels` | `name`, `description` | `name_ar`, `description_ar` |
| `school_news` | `title`, `content` | `title_ar`, `content_ar` |
| `activity_requests` | `title`, `description`, `required_items` | `title_ar`, `description_ar`, `required_items_ar` |
| `ideas` | `admin_feedback` | `admin_feedback_ar` |
| `custom_pages` | `title_en`, `content_en` | `title_ar`, `content_ar` |
| `school_settings` | `slogan`, `invoice_footer_en`, `pupil_label` | `slogan_ar`, `invoice_footer_ar`, `pupil_label_ar` |
| `custom_roles` | `name` | `name_ar` |

**Fallback rule:** If `name_ar` is null or empty, display `name` regardless of language.

### 10.4 RTL Tailwind Classes

Use **logical property** utilities instead of directional ones:

| Avoid | Use Instead |
|---|---|
| `ml-*`, `mr-*` | `ms-*` (margin-start), `me-*` (margin-end) |
| `pl-*`, `pr-*` | `ps-*` (padding-start), `pe-*` (padding-end) |
| `left-*`, `right-*` | `start-*`, `end-*` |
| `text-left`, `text-right` | `text-start`, `text-end` |
| `border-l`, `border-r` | `border-s`, `border-e` |

**Modal/Dialog direction:**
```tsx
<DialogContent dir={isAr ? "rtl" : "ltr"}>
```

### 10.5 Language Toggle

Located in the top navigation bar. A single `🌐 عربي / English` button calls `setLanguage()`, which:
1. Updates React context state
2. Sets `document.documentElement.dir`
3. All components re-render with the new language (no page reload)

---

## 11. Media & File Storage

### 11.1 Replit Object Storage

**Backend:** Google Cloud Storage via `@google-cloud/storage` package.
**Configuration:** `DEFAULT_OBJECT_STORAGE_BUCKET_ID`, `PRIVATE_OBJECT_DIR`, `PUBLIC_OBJECT_SEARCH_PATHS` environment secrets.

**Two access tiers:**
| Tier | Route | Auth | Usage |
|---|---|---|---|
| **Private** | `GET /api/storage/objects/*` | Required | Profile photos, report attachments, private pupil media |
| **Public** | `GET /api/storage/public-objects/*` | None | Logo, white logo, favicon, news images |

**Upload Flow:**
```
1. Client calls POST /api/storage/uploads/request-url
   → Body: { name, size, contentType }
   → Returns: { uploadURL (signed GCS URL), objectPath, metadata }
2. Client PUTs file directly to uploadURL (browser → GCS, no server proxy)
3. Client stores objectPath string in the relevant DB column
4. Client renders: /api/storage/public-objects/{objectPath} or /api/storage/objects/{objectPath}
```

**Frontend helper:** `ObjectUploader` component from `lib/object-storage-web` wraps this in a drag-and-drop UI. `useUpload()` hook provides programmatic access.

### 11.2 YouTube / External Video Embeds

Talk Show videos and Media Lab videos support **YouTube URLs** stored directly in `creative_asset_vault.file_url`. The frontend detects YouTube URLs and renders them as `<iframe>` embeds rather than as direct `<video>` tags.

**Detection pattern (inferred from usage):**
```typescript
const isYouTube = (url: string) => url.includes("youtube.com") || url.includes("youtu.be");
// Render as: <iframe src={url} allow="accelerometer; autoplay; ...">
// vs: <video src={url} controls>
```

### 11.3 Media Categories

| Category | Table | Visible To |
|---|---|---|
| `group` | `media` | Teacher, admin, photographer |
| `private` | `media` | Linked student's parent + admin |
| `talkshow` | `media` | Parent (own child), teacher, admin |
| `teacher_broadcast` | `media` | All parents in the group |
| `global` | `media` | All authenticated users |
| `event_photo` | `creative_asset_vault` | Public (via media lab) |
| `talk_show` | `creative_asset_vault` | Public (via media lab) |

---

## 12. CMS Architecture

### 12.1 Landing Page Sections

The landing page (`artifacts/kidspeak/src/pages/landing/index.tsx`) is driven by a combination of:
1. **Static React sections** — hardcoded sections with copy that can be edited in code
2. **`school_settings`** — school name, logo, phone, social links (fetched via `useSettings()`)
3. **`cms_settings`** — dynamic CMS blobs for configurable sections
4. **`/api/public/levels`** — real programme/level cards with live prices

**Section order:**
```
Hero (CMS: open_day + hero)
  → #problem → #reality → #science → #beyond → #method
  → #usp → #programs (live from DB) → #transparency
  → #testimonials (CMS) → #enroll (registration form)
```

### 12.2 Open Day Campaign

**CMS Key:** `open_day`

**JSON blob structure:**
```json
{
  "enabled": true,
  "greetingEn": "Welcome to Kidspeak Open Day!",
  "greetingAr": "مرحباً بكم في اليوم المفتوح لكيدسبيك!",
  "discount": 15,
  "discountDescEn": "For registrations made today only!",
  "discountDescAr": "للتسجيلات المقدمة اليوم فقط!",
  "ctaTextEn": "Claim My Discount Now",
  "ctaTextAr": "احصل على خصمي الآن"
}
```

**When `enabled: true`:**
- A full-screen hero section replaces the standard hero
- Shows live badge: "🖐 OPEN DAY — TODAY!"
- Displays the discount percentage prominently
- All registrations from this session get `source = "open_day"` tag in `registration_requests`
- Managed via Admin → Web Content → Open Day tab

**Toggling:** `PUT /api/admin/cms/settings/open_day` with the updated JSON blob. Admin can flip `enabled` without code changes.

### 12.3 Custom Pages

Admin creates arbitrary pages via Admin → Web Content → Custom Pages:
- Stored in `custom_pages` table with bilingual title/content
- `slug` becomes the URL path (e.g. `/about`, `/faq`)
- `status = 'published'` makes them accessible at `/p/:slug` in the SPA
- `show_in_navbar` / `show_in_footer` controls nav link appearance
- Content is rich text HTML rendered via TipTap in the editor, displayed as `dangerouslySetInnerHTML` in the public page view

### 12.4 Settings-Driven School Identity

`useSettings()` hook (from `@workspace/api-client-react`) fetches `GET /api/public/settings` and provides:
- `schoolName`, `slogan`, `sloganAr`
- `logoUrl`, `logoWhiteUrl`, `logoPrintUrl`, `faviconUrl`
- `phone`, `address`, `email`
- `instagram`, `facebook`, `youtube`, `tiktok`, `website`
- `invoiceFooterEn`, `invoiceFooterAr`
- `currency`, `currencySymbolAr`
- `pupilLabel`, `pupilLabelAr`
- `primaryColor`, `secondaryColor`

This is used across landing page, receipt modals, and report print views to ensure all school identity elements are live-configurable.

---

## 13. Frontend Page Inventory

All pages are SPA routes declared in `App.tsx` using Wouter's `<Switch>` / `<Route>`.

| Route | Component | Roles | Description |
|---|---|---|---|
| `/` | `landing/index.tsx` | Public | Marketing landing page |
| `/login` | `login.tsx` | Public | Login form |
| `/dashboard` | `dashboard.tsx` | All | Role-filtered dashboard with stats |
| `/students` | `students/index.tsx` | admin, teacher, psychologist | Pupil list + add/edit |
| `/students/:id` | `students/profile.tsx` | admin, teacher, psychologist, parent | Full pupil profile with tabs |
| `/groups` | `groups/index.tsx` | admin, teacher | Group management |
| `/evaluations` | `evaluations/index.tsx` | admin, teacher, parent | Weekly evaluations |
| `/performance` | `performance/index.tsx` | admin, teacher, psychologist, parent | Performance reports |
| `/psychologist` | `psychologist/index.tsx` | admin, psychologist | Psychological sessions + compass |
| `/behavioral` | `behavioral/index.tsx` | admin, teacher, psychologist | Behavioural tracking |
| `/payments` | `payments/index.tsx` | admin, accountant, parent | Invoices + transactions + receipts |
| `/revenue` | `revenue/index.tsx` | admin, accountant | Revenue + expense + payroll |
| `/users` | `users/index.tsx` | admin | User management |
| `/programs` | `programs/index.tsx` | admin | Programme/level management |
| `/levels` | `levels/index.tsx` | admin | Level details + teacher assignment |
| `/news` | `news/index.tsx` | all | News articles + announcements |
| `/requests` | `requests/index.tsx` | admin, teacher, parent | Activity requests + consent |
| `/idea-box` | `idea-box/index.tsx` | all staff | Idea submission + admin review |
| `/inbox` | `inbox/index.tsx` | all | Internal messaging |
| `/gallery` | `gallery/index.tsx` | admin, teacher, photographer, parent | Media gallery |
| `/studio` | `studio/index.tsx` | admin, designer, photographer, marketer | Creative project management |
| `/consultations` | `consultations/index.tsx` | admin, psychologist, parent | Consultation booking |
| `/settings` | `settings/index.tsx` | admin | School settings + CMS |
| `/admin` | `admin/` (subpages) | admin | Web content, custom roles |
| `/my-profile` | `my-profile/index.tsx` | all | Own profile edit + password change |
| `/p/:slug` | `public-page/index.tsx` | Public | Dynamic custom page renderer |
| `*` | `not-found.tsx` | all | 404 page |

---

## 14. Environment & Deployment Configuration

### 14.1 Required Environment Secrets

| Variable | Used By | Description |
|---|---|---|
| `DATABASE_URL` | API server | PostgreSQL connection string |
| `SESSION_SECRET` | API server | Express session signing secret |
| `DEFAULT_OBJECT_STORAGE_BUCKET_ID` | API server | Replit Object Storage bucket |
| `PRIVATE_OBJECT_DIR` | API server | Path prefix for private objects |
| `PUBLIC_OBJECT_SEARCH_PATHS` | API server | Path prefix for public objects |

### 14.2 Workflow Configuration

| Workflow | Command | Port |
|---|---|---|
| `API Server` | `pnpm --filter @workspace/api-server run dev` | `PORT` env var (8080 in dev) |
| `Kidspeak Web` | `pnpm --filter @workspace/kidspeak run dev` | `PORT` env var |
| `Mockup Sandbox` | `pnpm --filter @workspace/mockup-sandbox run dev` | `PORT` env var |

**API dev script:** `export NODE_ENV=development && pnpm run build && pnpm run start`  
(builds with esbuild, then runs the compiled bundle — **there is no hot-reload in the API server**)

### 14.3 Database Management

- **ORM:** Drizzle ORM with `drizzle-kit`
- **Migration command:** `pnpm --filter @workspace/db run push` (uses `drizzle-kit push` — schema-first, no migration files)
- **Schema location:** `lib/db/src/schema/*.ts` (one file per domain)
- **DB entry point:** `lib/db/src/index.ts` exports `{ db }` Drizzle client + all table references

### 14.4 Vite Proxy Configuration

The Kidspeak SPA dev server proxies `/api/*` to the API server, so all API calls use a relative `/api/` path (no hardcoded host). In production, both are served from the same domain via Replit's path-based routing.

### 14.5 Demo Credentials

| Role | Email | Password |
|---|---|---|
| Admin | admin@kidspeak.com | admin123 |
| Teacher | sarah@kidspeak.com | admin123 |
| Teacher | michael@kidspeak.com | admin123 |
| Parent (existing) | emma.parent@kidspeak.com | admin123 |
| Parent (demo) | parent.demo@kidspeak.dz | kidspeak2025 |
| Psychologist | amina@kidspeak.com | admin123 |
| Accountant | karim@kidspeak.com | admin123 |
| Designer | designer@kidspeak.com | admin123 |
| Marketer | marketer@kidspeak.com | admin123 |
| Photographer | youcef@kidspeak.com | admin123 |

**Demo parent's children:**
- **Amina Benali** (id=17) — Week 3, 6 sessions (all present), progress score 92%, confidence radar recorded, Talk Show video in vault, tuition paid
- **Karim Benali** (id=18) — New enrollment, payment pending 16,000 DZD

---

*Document generated: April 11, 2026*
*Kidspeak LMS — Built with React + Express + Drizzle ORM + PostgreSQL on Replit*

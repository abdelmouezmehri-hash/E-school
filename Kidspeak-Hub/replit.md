# Kidspeak LMS

## Overview

Kidspeak is a comprehensive Language Learning Management System designed for children's English speaking schools. It unifies educational progress tracking and school financial management into a single platform. The system supports various user roles, from administrators and teachers to parents and psychologists, providing tailored functionalities for each. Its core purpose is to streamline school operations, enhance student progress monitoring, and improve communication between staff and parents.

## User Preferences

- I prefer simple language.
- I want iterative development.
- Ask before making major changes.
- I prefer detailed explanations.
- Do not make changes to the folder `artifacts/kidspeak/public/`.
- Do not make changes to the files in `lib/api-client-react/src/`.
- Do not make changes to `artifacts/kidspeak/src/lib/translations.ts`.
- Do not make changes to `artifacts/kidspeak/src/contexts/language-context.tsx`.
- Do not make changes to `artifacts/kidspeak/public/logo-accent.png`.
- Do not make changes to `artifacts/kidspeak/public/logo-full.png`.
- Do not make changes to `artifacts/kidspeak/public/icon.png`.
- Manual hooks only: Do NOT run codegen for new routes.

## System Architecture

**Monorepo Structure**: The project utilizes a pnpm monorepo with separate packages for the frontend (`artifacts/kidspeak`), backend (`artifacts/api-server`), and shared libraries (`lib/`).

**Frontend**:
-   **Technology**: React with Vite for fast development and Tailwind CSS for styling.
-   **Branding**: Uses a consistent color scheme (`#1B2E8F` Deep Blue and `#F5A600` Bright Yellow) and specific logo assets for light and dark contexts.
-   **Internationalization (i18n)**: Supports English and Arabic with dynamic language switching, RTL layout adjustments (`document.documentElement.dir = "rtl"`), and customizable terminology (e.g., "Students" vs. "Pupils"). Currency formatting is also localized.
-   **UI/UX**: Features dashboards tailored to different user roles, enhanced student cards with progress overlays, and a gamified "Learning Journey" interface with a dark-themed, star-path design for student progress visualization.

**Backend**:
-   **API Framework**: Express 5 serves as the RESTful API server.
-   **Database**: PostgreSQL is used with Drizzle ORM for database interactions and schema management.
-   **Validation**: Zod is employed for robust data validation.
-   **Authentication**: Session-based (cookie) authentication secured with bcryptjs for password hashing.
-   **API Design**: OpenAPI specification is used for API definition, with Orval for client-side API code generation (though client hooks are often manually created).

**Performance Report System** (Holistic Assessment):
-   **DB table**: `performance_reports` with `period`, `reportDate`, `status` (draft/published), linguistic scores (vocab/structure/fluency + notes, 1–10), behavioral scores (fearReduction/socialInitiative/selfConfidence + notes, 1–10), `teacherSummary`, `psychologistSummary`, `teacherId`, `psychologistId` FKs.
-   **API**: `GET /api/performance-reports/student/:studentId`, `POST /api/performance-reports`, `PUT /api/performance-reports/:id`.
-   **Student Profile "Report" tab**: Available to all roles. Teachers fill the blue Linguistic section; psychologists fill the violet Behavioral section; parents see only published reports (draft shows "being prepared" message). Each report card shows a Recharts RadarChart with 6-axis skill profile plus score pills.
-   **Student Profile "Method" tab** (parent only): Explains the Kidspeak philosophy — Speaking-First approach (4 steps: Listen/Imitate/Speak/Read+Write), Psychological Support section (fear reduction/social initiative/confidence), 4 Levels to Fluency, encouragement panel. Fully bilingual EN/AR.
-   **Landing Page "Reality" section**: Dark gradient section between Problem and Method. Includes philosophy quote panel, comparison cards (Academic "Success" ❌ vs Real-World Communication ✅), bilingual inline content.
-   **Translations**: Full EN + AR translation keys added for `report` and `method` namespaces.

**Behavioral Analysis Lab** (Psychologist Module upgrade):
-   **Session Mode**: Each class session can be tagged as `clinical` (psychological intervention) or `developmental` (skill-building). Mode badge visible on session cards.
-   **Communication Metrics**: 6 per-student metrics recorded during sessions: verbalFluency, verbalClarity, verbalVocabulary, nonverbalEyeContact, nonverbalBodyLanguage, nonverbalFacialExpressions (1–10 scale sliders, collapsible section in session dialog).
-   **CommunicationRadar component**: RadarChart (Recharts) averaging all 6 metrics across sessions. Displayed on student profile Overview tab (for staff) and "My Child's Character" tab (for parents).
-   **Learning Difficulties Multi-Select**: Health tab now uses tagged pill-buttons instead of free-text for learning difficulties (8 options: dyslexia, ADHD, speechDelay, dyscalculia, dysgraphia, processingDisorder, autism, anxiety).
-   **Support Instructions**: New field on student profile Health tab — confidential notes for teachers on how to accommodate the student.
-   **Parent "My Child's Character" Tab**: Dedicated parent-facing tab with gradient hero, CommunicationRadar, and parent-friendly learning profile cards with emojis and encouraging language (bilingual EN/AR).
-   **DB schema**: `sessionMode` text on `class_sessions`; 6 comm metric int columns on `session_attendance`; `supportInstructions` text on `students`.

**Messaging Hub** (WhatsApp-style threaded messaging):
-   **Conversation View**: 2-panel layout — left: conversation list sorted by latest message; right: threaded chat view grouped by day with date separators.
-   **Message Bubbles**: My messages (right, blue `#1B2E8F`), partner messages (left, gray). Each message shows timestamp. Sent messages show single ✓ (sent) or double ✓✓ (read) as read receipts.
-   **Expanded Contact Matrix**: Admin↔everyone; Teacher↔admin+psychologist+parents-of-students; Psychologist↔admin+all-teachers+parents-of-consultations; Parent↔admin+child's-teacher(s).
-   **Pupil-Linked Messages**: Teacher/parent can link a specific student to a message. Student name chip appears on the message bubble.
-   **File Attachments**: Paperclip button triggers file upload (images, PDF, doc) via presigned URL storage. Attachment chip shown in bubble with download link.
-   **Broadcasts** (admin): Separate "Broadcast" dialog supporting group, level, role, specific_students, all_parents, or global distribution. The `specific_students` type lets admin pick individual students by checkbox — messages are sent to their registered parent accounts.
-   **Specific Students Picker**: Checkbox list with live search and group-name subtitle. Selection counter bar with Clear button. API: `recipientType: "specific_students"` with `studentIds: number[]` body field.
-   **New Conversation Flow**: Yellow "+ New" button opens contact search dialog to start a thread with any authorized contact.
-   **Auto Mark Read**: Opening a thread marks all unread messages from that partner as read, with `readAt` timestamp.
-   **DB additions on `messages`**: `readAt` timestamp, `replyToId` int, `linkedStudentId` int FK, `attachmentUrl`/`attachmentName`/`attachmentType` text.
-   **New API endpoints**: `GET /api/messages/conversations`, `GET /api/messages/thread/:userId`, `PATCH /api/messages/thread/:userId/read-all`.

**Parent Registration & Approval Workflow**:
-   **Landing Page Modal**: "Register" and "Register Your Child" buttons on the landing page open a beautiful bilingual (EN/AR) modal dialog ("Join Kidspeak as a Parent"). Collects: Full Name, Email, Primary Phone, WhatsApp Phone, Address. Submits to `POST /api/public/registration-requests` (no auth required). Duplicate email check with 409 response. Success state shows the message: "Your request has been sent to the administration."
-   **DB table**: `registration_requests` — id, fullName, email, phone, whatsappPhone, address, status (pending/approved/rejected), createdAt.
-   **Admin Dashboard Page**: `/admin/registration-requests` — filterable by status (Pending/Approved/Rejected/All). Each card shows parent info with Approve & Activate / Reject buttons.
-   **Approve & Activate flow**: Admin modal sets Login Email, Display Name, and Temporary Password → calls `POST /api/admin/registration-requests/:id/approve` → creates Parent user account (active) and marks request as approved.
-   **Reject flow**: `DELETE /api/admin/registration-requests/:id` marks status as "rejected" (soft delete).
-   **Auth security**: Login endpoint now checks `user.status === "inactive"` and returns 403 if account is inactive.
-   **Sidebar**: Admin sidebar has a new "Registration Requests" / "طلبات الانضمام" link via `ClipboardList` icon.
-   **API routes**: `POST /api/public/registration-requests`, `GET /api/admin/registration-requests`, `POST /api/admin/registration-requests/:id/approve`, `DELETE /api/admin/registration-requests/:id`.

**Marketing Hub — v2 Features** (spec: agent_prompt_v2):
-   **Part A — Standalone Leads**: `campaignId` is now nullable on `leads` table. A new "Standalone Leads" tab on the Marketing Hub shows leads not linked to any campaign. Full CRUD (add/update/delete/export CSV). API: `GET /api/leads`, `POST /api/leads`.
-   **Part B — Campaign ROI**: New `campaign_expenses` table (id, campaignId, description, amount, category). Each campaign detail panel has a second "Profitability" tab showing registered leads, expenses list (add/delete), level selector (from `levelsTable.price`), expected revenue calculation, and net profit + ROI %. API: `GET /api/campaigns/:id/roi`, `POST /api/campaigns/:id/expenses`, `DELETE /api/campaigns/expenses/:id`.
-   **Part C — Campaign Landing Pages**: `campaigns` table extended with `landingPageEnabled` (bool), `landingPageTitle`, `landingPageSubtitle`, `landingPageColor`. Each campaign can generate a public landing page at `/lp/:slug`. Landing page has hero, registration form, and submits to `POST /api/campaigns/:slug/submit`. Campaign cards show a link icon. Campaign form modal has a "Landing Page" toggle section with title/subtitle/color settings.
-   **Part D — AI Page Generator**: New "AI Page Generator" tab on the Web Content page. Uses Replit AI integrations (OpenAI proxy) to generate bilingual HTML page content from a text prompt. Output preview + raw HTML view + "Create Page with This" button to open the page editor pre-filled. Quick prompts for common page types.
-   **New API routes**: `/api/leads` (GET/POST standalone), `/api/campaigns/:id/roi`, `/api/campaigns/:id/expenses`, `/api/campaigns/expenses/:id`, `/api/public/campaigns/:slug` (public campaign data), `/api/campaigns/:slug/submit` (public form submit), `/api/admin/ai/generate-page`.
-   **DB changes pushed**: nullable `campaign_id` on `leads`, new `campaign_expenses` table, new columns on `campaigns` (landingPageEnabled, landingPageTitle, landingPageSubtitle, landingPageColor).

**Core Features**:
-   **User Roles**: Differentiated access and functionality for Admin, Teacher, Parent, Psychologist, Accountant, Photographer/Videographer, Designer, and Marketer. Custom roles are also supported.
-   **Educational Tracking**: Configurable levels, weekly evaluations (Speaking, Confidence, Participation), behavioral flags (Fear, Shyness, High Potential), and a Smart Progress Score with trend charts.
-   **Enrollment Workflow**: Streamlined parent-initiated enrollment requests with admin approval/rejection.
-   **Consultations**: Supports parent-initiated and psychologist-initiated consultation scheduling with approval workflows, pricing, and distinct UI presentation for scheduled invitations.
-   **Group & Session Management**: Flexible scheduling of various session types (`regular`, `support`, `makeup`, `workshop`), with attendance tracking and a visual "Upcoming Sessions" panel. Sessions can be scheduled for bulk repetition. Planned sessions do not count towards teacher earnings until completed.
-   **Smart Multi-Select Add-Student Modal**: The "Add Students to Group" modal now uses checkboxes for multi-selection. Students are split into two pools — "Unassigned" (not in any group) shown by default, and "In Another Group" revealed via "Show all" toggle. Students already assigned elsewhere show an amber ⚠ badge with the group name. A selection-count bar shows how many are selected with a "Clear" button. The "Add Selected (N)" button does sequential bulk adds. `GET /api/students` now returns `currentGroupId` and `currentGroupName` for each student to power this feature.
-   **Enrollment Receipt Pending Labels**: When a student hasn't been assigned to a group or teacher yet, the receipt now shows "Pending Assignment (قيد التعيين)" and "To be assigned (سيتحدد لاحقاً)" in italic amber text instead of blank dashes.
-   **Financial Management**: Student billing per level, payment status tracking (Paid, Partially Paid, Overdue, Pending), a comprehensive revenue dashboard, digital receipts/invoices, and an expense log.
-   **Staff Payment Workflow**: Teachers and psychologists can submit payment requests or bonus/expense claims, which are reviewed and approved/rejected by admins, with a full lifecycle from pending to receipt confirmation.
-   **Community Hub**: Features a News Center with categorized content, and Activity Requests & Consent system for parental approval of school activities.
-   **Kidspeak Creative Engine**: A fully-featured creative task management system for the school's creative staff (designers, photographers, marketers). Features include: 5-tab dashboard (Pipeline with kanban/list, Portfolio of approved work, My Earnings per task with DZD budget tracking and in_wallet/paid status, Asset Vault for shared brand files, Admin Global Pipeline overview), task types (graphic_design, video_editing, photography, copywriting, social_media), revision request flow from admin, publish-to-news integration. DB tables: `creativeProjectsTable` (extended with taskType, budget, earningStatus, earningPaidAt, earningPaidBy), `projectCommentsTable` (extended with isRevision), `creativeAssetVaultTable`.

**Technical Implementations**:
-   **Monorepo Tool**: `pnpm workspaces`.
-   **Package Manager**: `pnpm`.
-   **Build Tool**: `esbuild` for CJS bundle.
-   **Charts**: `Recharts` for displaying progress and revenue charts.

## External Dependencies

-   **PostgreSQL**: Relational database for all application data.
-   **Drizzle ORM**: Object-Relational Mapper for PostgreSQL.
-   **Orval**: Used for API client code generation from OpenAPI specifications.
-   **Recharts**: JavaScript charting library for React.
-   **bcryptjs**: Library for hashing passwords.
-   **Zod**: TypeScript-first schema declaration and validation library.
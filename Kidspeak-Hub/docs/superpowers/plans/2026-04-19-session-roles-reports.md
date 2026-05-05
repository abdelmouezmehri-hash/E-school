# Session Role Filtering & Post-Session Reports Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Filter group sessions by user role (teacher sees English sessions, specialist sees developmental sessions), add a post-session report page with per-student notes and scoring, and switch app font to Tajawal.

**Architecture:** Client-side session filtering in existing group detail page using already-available `currentUser.role` + `teacherId`/`psychologistId` fields; new PATCH endpoint for report-only updates that preserves existing attendance scores; new React page at `/groups/:groupId/sessions/:sessionId/report`.

**Tech Stack:** React 18 + Wouter, TanStack React Query, Express v5, Drizzle ORM + PostgreSQL, Tailwind CSS v4, Google Fonts (Tajawal).

---

## File Map

| Action | File |
|--------|------|
| Modify | `artifacts/kidspeak/index.html` |
| Modify | `artifacts/kidspeak/src/index.css` |
| Modify | `lib/db/src/schema/classSessions.ts` |
| Modify | `artifacts/api-server/src/routes/groups.ts` |
| Modify | `lib/api-client-react/src/groups-api.ts` |
| Modify | `artifacts/kidspeak/src/pages/groups/detail.tsx` |
| Modify | `artifacts/kidspeak/src/App.tsx` |
| **Create** | `artifacts/kidspeak/src/pages/groups/session-report.tsx` |

---

## Task 1: Font — Switch to Tajawal

**Files:**
- Modify: `artifacts/kidspeak/index.html`
- Modify: `artifacts/kidspeak/src/index.css:127`

- [ ] **Step 1: Add Tajawal Google Fonts link to index.html**

Find `</head>` in `artifacts/kidspeak/index.html` and insert before it:
```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&display=swap" rel="stylesheet" />
```

- [ ] **Step 2: Change --app-font-sans in index.css**

In `artifacts/kidspeak/src/index.css` line 127, replace:
```css
--app-font-sans: 'Inter', sans-serif;
```
with:
```css
--app-font-sans: 'Tajawal', sans-serif;
```

- [ ] **Step 3: Commit**
```bash
git add artifacts/kidspeak/index.html artifacts/kidspeak/src/index.css
git commit -m "feat: switch app font to Tajawal"
```

---

## Task 2: DB — Add reportStatus + reportScore columns

**Files:**
- Modify: `lib/db/src/schema/classSessions.ts`

- [ ] **Step 1: Add reportStatus to classSessionsTable**

In `lib/db/src/schema/classSessions.ts`, after the `status` line, add:
```typescript
  reportStatus: text("report_status").default("none"), // none|draft|published
```

Full context around the change:
```typescript
  status: text("status").default("completed"), // planned|completed
  reportStatus: text("report_status").default("none"), // none|draft|published  ← ADD
  createdAt: timestamp("created_at").notNull().defaultNow(),
```

- [ ] **Step 2: Add reportScore to sessionAttendanceTable**

In the same file, in `sessionAttendanceTable`, after `nonverbalFacialExpressions`, add:
```typescript
  reportScore: integer("report_score"), // 1-5, set by teacher/specialist in post-session report
```

Full context:
```typescript
  nonverbalFacialExpressions: integer("nonverbal_facial_expressions"), // 1–10
  reportScore: integer("report_score"), // 1-5  ← ADD
  createdAt: timestamp("created_at").notNull().defaultNow(),
```

- [ ] **Step 3: Push schema to database**

```bash
cd "lib/db" && npm run push:prod
```
For local dev: `npm run push:dev` instead.
Expected: Schema pushed successfully, 2 new columns added.

- [ ] **Step 4: Commit**
```bash
git add lib/db/src/schema/classSessions.ts
git commit -m "feat: add reportStatus and reportScore columns to sessions schema"
```

---

## Task 3: Backend — PATCH /sessions/:id/report endpoint

**Files:**
- Modify: `artifacts/api-server/src/routes/groups.ts`

- [ ] **Step 1: Verify `and` is imported from drizzle-orm**

At the top of `artifacts/api-server/src/routes/groups.ts`, find the drizzle-orm import and ensure `and` is included:
```typescript
import { eq, desc, or, and } from "drizzle-orm";
```
If `and` is missing, add it.

- [ ] **Step 2: Add PATCH /sessions/:id/report after line 614**

After the closing `});` of the `router.put("/sessions/:id", ...)` block (line 614), add:

```typescript
router.patch("/sessions/:id/report", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const sessionId = parseInt(req.params.id);
  const user = (req as any).user;
  const { sessionOutcome, nextGoal, reportStatus, studentReports } = req.body as {
    sessionOutcome?: string;
    nextGoal?: string;
    reportStatus?: "none" | "draft" | "published";
    studentReports?: Array<{ studentId: number; note?: string | null; score?: number | null }>;
  };

  const [session] = await db.select().from(classSessionsTable).where(eq(classSessionsTable.id, sessionId));
  if (!session) { res.status(404).json({ error: "Session not found" }); return; }

  const isOwner = (session as any).teacherId === user.id || (session as any).psychologistId === user.id;
  if (!isOwner && user.role !== "admin") { res.status(403).json({ error: "Forbidden" }); return; }

  const updateData: Record<string, unknown> = {};
  if (sessionOutcome !== undefined) updateData.sessionOutcome = sessionOutcome;
  if (nextGoal !== undefined) updateData.nextGoal = nextGoal;
  if (reportStatus !== undefined) updateData.reportStatus = reportStatus;

  const [updated] = await db.update(classSessionsTable).set(updateData).where(eq(classSessionsTable.id, sessionId)).returning();

  if (studentReports && Array.isArray(studentReports)) {
    for (const sr of studentReports) {
      await db.update(sessionAttendanceTable)
        .set({ behavioralNotes: sr.note ?? null, reportScore: sr.score ?? null })
        .where(and(
          eq(sessionAttendanceTable.sessionId, sessionId),
          eq(sessionAttendanceTable.studentId, sr.studentId)
        ));
    }
  }

  res.json({ ...updated, createdAt: updated.createdAt.toISOString() });
});
```

- [ ] **Step 3: Include reportScore in the attendance select inside GET /groups/:id**

Find the `db.select({...}).from(sessionAttendanceTable)` block inside the `sessionsEnriched` Promise.all (around line 220). Add `reportScore` to the select object:
```typescript
  reportScore: sessionAttendanceTable.reportScore,   // ADD this line
```

The full select object after the change:
```typescript
const attendance = await db.select({
  studentId: sessionAttendanceTable.studentId,
  status: sessionAttendanceTable.status,
  speakingScore: sessionAttendanceTable.speakingScore,
  confidenceScore: sessionAttendanceTable.confidenceScore,
  participationScore: sessionAttendanceTable.participationScore,
  behavioralNotes: sessionAttendanceTable.behavioralNotes,
  curriculumProgress: sessionAttendanceTable.curriculumProgress,
  verbalFluency: sessionAttendanceTable.verbalFluency,
  verbalClarity: sessionAttendanceTable.verbalClarity,
  verbalVocabulary: sessionAttendanceTable.verbalVocabulary,
  nonverbalEyeContact: sessionAttendanceTable.nonverbalEyeContact,
  nonverbalBodyLanguage: sessionAttendanceTable.nonverbalBodyLanguage,
  nonverbalFacialExpressions: sessionAttendanceTable.nonverbalFacialExpressions,
  reportScore: sessionAttendanceTable.reportScore,   // ← NEW
}).from(sessionAttendanceTable).where(eq(sessionAttendanceTable.sessionId, s.id));
```

- [ ] **Step 4: Commit**
```bash
git add artifacts/api-server/src/routes/groups.ts
git commit -m "feat: add PATCH /sessions/:id/report endpoint and include reportScore in GET response"
```

---

## Task 4: API Client — types + useUpdateSessionReport hook

**Files:**
- Modify: `lib/api-client-react/src/groups-api.ts`

- [ ] **Step 1: Add reportScore to SessionAttendanceRecord interface (~line 19)**

```typescript
interface SessionAttendanceRecord {
  studentId: number
  status: AttendanceStatus
  speakingScore?: number | null
  confidenceScore?: number | null
  participationScore?: number | null
  behavioralNotes?: string | null
  curriculumProgress?: string | null
  reportScore?: number | null   // ← ADD
}
```

- [ ] **Step 2: Add reportStatus and sessionOutcome to GroupSession interface (~line 29)**

```typescript
interface GroupSession {
  id: number
  groupId: number
  teacherId: number | null
  psychologistId: number | null
  sessionDate: string
  sessionType: string
  lessonTitle: string | null
  notes: string | null
  nextGoal: string | null
  sessionOutcome: string | null   // ← ADD if missing
  reportStatus: string            // ← ADD — 'none' | 'draft' | 'published'
  createdAt: string
  attendance: SessionAttendanceRecord[]
}
```

- [ ] **Step 3: Add useUpdateSessionReport hook**

After the `useCancelSession` hook (around line 296), add:

```typescript
interface UpdateSessionReportBody {
  sessionOutcome?: string
  nextGoal?: string
  reportStatus?: "none" | "draft" | "published"
  studentReports?: Array<{ studentId: number; note?: string | null; score?: number | null }>
}

export const useUpdateSessionReport = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ sessionId, data }: { sessionId: number; data: UpdateSessionReportBody }) => {
      const res = await fetch(`/api/sessions/${sessionId}/report`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error(await res.text())
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups"] })
    },
  })
}
```

- [ ] **Step 4: Verify useMutation and useQueryClient are imported**

At top of `groups-api.ts`, the import should include:
```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
```
Add missing items if needed.

- [ ] **Step 5: Commit**
```bash
git add lib/api-client-react/src/groups-api.ts
git commit -m "feat: add reportStatus/reportScore types and useUpdateSessionReport hook"
```

---

## Task 5: Frontend — Group detail page: filtering + report button

**Files:**
- Modify: `artifacts/kidspeak/src/pages/groups/detail.tsx`

Note: this file is large (~1250 lines). Make surgical changes only.

- [ ] **Step 1: Verify useLocation is imported from wouter**

Near the top imports in `detail.tsx`, check for:
```typescript
import { useLocation } from "wouter"
```
Add if missing. Inside the component, add:
```typescript
const [, navigate] = useLocation()
```

- [ ] **Step 2: Auto-set sessionTab based on user role**

Find the block at line ~354 where role flags are set:
```typescript
const isPsychologist = currentUser?.role === "psychologist";
const isAdmin = currentUser?.role === "admin";
const isTeacher = currentUser?.role === "teacher";
```

After these lines, add a useEffect to auto-select the correct tab:
```typescript
useEffect(() => {
  if (isPsychologist) setSessionTab("psychological")
  else if (isTeacher) setSessionTab("academic")
}, [isPsychologist, isTeacher])
```

- [ ] **Step 3: Update session filter to use role + user id**

Find the `.filter()` on sessions in the sessions table (around line 1024):
```typescript
sessionTab === "psychological" ? !!s.psychologistId : !s.psychologistId
```

Replace this filter condition with:
```typescript
isAdmin
  ? (sessionTab === "psychological" ? !!s.psychologistId : !s.psychologistId)
  : isPsychologist
    ? s.psychologistId === currentUser?.id
    : s.teacherId === currentUser?.id
```

Also chain an additional filter to exclude clinical sessions for non-admins:
```typescript
.filter((s: any) =>
  isAdmin
    ? (sessionTab === "psychological" ? !!s.psychologistId : !s.psychologistId)
    : isPsychologist
      ? s.psychologistId === currentUser?.id
      : s.teacherId === currentUser?.id
)
.filter((s: any) => !isAdmin ? s.sessionMode !== "clinical" : true)
```

- [ ] **Step 4: Hide tab switcher for non-admin users**

Find the tab filter UI (the div containing "أكاديمية" / "نفسية" tabs, near the sessions table header). Wrap it with:
```tsx
{isAdmin && (
  // existing tab filter JSX
)}
```

- [ ] **Step 5: Add role notice banner above the sessions table**

Find the sessions table card/section start, and insert before the table:
```tsx
{!isAdmin && (
  <div className="flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700 mb-3">
    <span>{isPsychologist ? "🧠" : "👨‍🏫"}</span>
    أنت تشاهد <strong className="mx-1">حصصك فقط</strong>
    <span className="font-normal text-blue-400 mr-1">
      — {isPsychologist ? "الحصص التنمائية/المهارية" : "حصص اللغة الإنجليزية"}
    </span>
  </div>
)}
```

- [ ] **Step 6: Add report button column to sessions table**

In the `<thead>` row, add a `<th>` for the report column (after the attendance column, before any actions column):
```tsx
{!isAdmin && <th className="px-3 py-2 text-xs font-semibold text-muted-foreground text-right">تقرير</th>}
```

In the session row `<tr>`, add a `<td>` for the report button:
```tsx
{!isAdmin && (
  <td className="px-3 py-2">
    {(s as any).reportStatus === "published" ? (
      <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-600">
        ✓ مكتمل
      </span>
    ) : (
      <button
        onClick={() => navigate(`/groups/${group?.id}/sessions/${s.id}/report`)}
        className="inline-flex items-center gap-1 rounded-lg border border-dashed border-amber-300 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700 hover:bg-amber-400 hover:text-white hover:border-amber-400 transition-colors"
      >
        📝 تقرير
      </button>
    )}
  </td>
)}
```

- [ ] **Step 7: Verify the page works**

1. Log in as teacher → sessions filtered to their own, banner shows, 📝 تقرير buttons visible
2. Log in as psychologist → sessions filtered to their own, banner shows
3. Log in as admin → all sessions visible, tab switcher shown, no report buttons

- [ ] **Step 8: Commit**
```bash
git add artifacts/kidspeak/src/pages/groups/detail.tsx
git commit -m "feat: role-based session filtering, notice banner, and report button on group detail"
```

---

## Task 6: Frontend — Session report page

**Files:**
- Create: `artifacts/kidspeak/src/pages/groups/session-report.tsx`

- [ ] **Step 1: Create the file**

```tsx
import { useState, useEffect } from "react"
import { useParams, useLocation } from "wouter"
import { useGetGroup, useUpdateSessionReport, useGetMe } from "@workspace/api-client-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"

export default function SessionReportPage() {
  const { groupId, sessionId } = useParams<{ groupId: string; sessionId: string }>()
  const [, navigate] = useLocation()
  const { toast } = useToast()
  const { data: group } = useGetGroup(Number(groupId))
  const { data: currentUser } = useGetMe()
  const updateReport = useUpdateSessionReport()

  const session = group?.sessions?.find((s: any) => s.id === Number(sessionId))
  const students = group?.students ?? []
  const attendance = session?.attendance ?? []

  const [achieved, setAchieved] = useState("")
  const [nextGoal, setNextGoal] = useState("")
  const [studentNotes, setStudentNotes] = useState<Record<number, { note: string; score: number | null }>>({})

  // Populate form when session data loads
  useEffect(() => {
    if (!session) return
    setAchieved(session.sessionOutcome ?? "")
    setNextGoal(session.nextGoal ?? "")
    const initial: Record<number, { note: string; score: number | null }> = {}
    attendance.forEach((a: any) => {
      initial[a.studentId] = { note: a.behavioralNotes ?? "", score: a.reportScore ?? null }
    })
    setStudentNotes(initial)
  }, [session?.id])

  const getStudentName = (studentId: number) =>
    students.find((s: any) => s.id === studentId)?.name ?? `طالب ${studentId}`

  const handleSave = async (status: "draft" | "published") => {
    try {
      await updateReport.mutateAsync({
        sessionId: Number(sessionId),
        data: {
          sessionOutcome: achieved,
          nextGoal,
          reportStatus: status,
          studentReports: attendance.map((a: any) => ({
            studentId: a.studentId,
            note: studentNotes[a.studentId]?.note || null,
            score: studentNotes[a.studentId]?.score ?? null,
          })),
        },
      })
      toast({ title: status === "published" ? "تم حفظ التقرير ✓" : "تم الحفظ كمسودة" })
      if (status === "published") navigate(`/groups/${groupId}`)
    } catch {
      toast({ title: "حدث خطأ أثناء الحفظ", variant: "destructive" })
    }
  }

  const isPsychologist = currentUser?.role === "psychologist"
  const presentCount = attendance.filter((a: any) => a.status !== "absent").length
  const absentCount = attendance.filter((a: any) => a.status === "absent").length
  const filledCount = attendance.filter((a: any) =>
    a.status !== "absent" && (studentNotes[a.studentId]?.note || studentNotes[a.studentId]?.score)
  ).length

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-muted-foreground">
        جاري التحميل...
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-5" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between rounded-xl border bg-white p-5 shadow-sm">
        <div>
          <h1 className="text-xl font-extrabold text-[#1B2E8F]">
            تقرير الحصة #{session.id}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isPsychologist ? "الأخصائية" : "الأستاذ"} · {group?.name}
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate(`/groups/${groupId}`)}>
          ← رجوع للفوج
        </Button>
      </div>

      {/* Session info bar */}
      <div className="flex flex-wrap items-center gap-6 rounded-xl bg-[#1B2E8F] px-6 py-4 text-white">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-white/50">التاريخ</span>
          <span className="text-sm font-bold">{session.sessionDate}</span>
        </div>
        <div className="w-px h-8 bg-white/15" />
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-white/50">عنوان الدرس</span>
          <span className="text-sm font-bold">{session.lessonTitle || "—"}</span>
        </div>
        <div className="w-px h-8 bg-white/15" />
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-white/50">الحضور</span>
          <span className="text-sm font-bold">✓ {presentCount} &nbsp; ✗ {absentCount}</span>
        </div>
        <div className="w-px h-8 bg-white/15" />
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-white/50">حالة التقرير</span>
          <span className={`text-sm font-bold ${session.reportStatus === "published" ? "text-emerald-300" : "text-amber-300"}`}>
            {session.reportStatus === "published" ? "✓ مكتمل" : session.reportStatus === "draft" ? "مسودة" : "لم يُملأ بعد"}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_280px] gap-5">
        <div className="space-y-5">

          {/* ما تحقق */}
          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <h2 className="text-sm font-extrabold text-[#1B2E8F] mb-3 flex items-center gap-2">
              ✅ ما تحقق في هذه الحصة
            </h2>
            <Textarea
              value={achieved}
              onChange={(e) => setAchieved(e.target.value)}
              placeholder="اكتب ما تم إنجازه في هذه الحصة... مثال: تمكّن الطلاب من نطق الكلمات الجديدة وتمرّنوا على الحوار."
              className="min-h-[90px] resize-none text-sm"
            />
          </div>

          {/* ملاحظات الطلاب */}
          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <h2 className="text-sm font-extrabold text-[#1B2E8F] mb-4 flex items-center gap-2">
              👨‍🎓 ملاحظات لكل طالب
            </h2>
            <div className="space-y-3">
              {attendance.map((a: any) => {
                const name = getStudentName(a.studentId)
                const isAbsent = a.status === "absent"
                const noteVal = studentNotes[a.studentId]?.note ?? ""
                const scoreVal = studentNotes[a.studentId]?.score ?? null

                const setNote = (val: string) =>
                  setStudentNotes(prev => ({ ...prev, [a.studentId]: { ...prev[a.studentId], note: val } }))
                const setScore = (val: number) =>
                  setStudentNotes(prev => ({ ...prev, [a.studentId]: { ...prev[a.studentId], score: scoreVal === val ? null : val } }))

                return (
                  <div key={a.studentId} className="rounded-xl border border-border/50 p-4 hover:border-blue-200 transition-colors">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white text-sm font-extrabold flex-shrink-0">
                        {name[0]}
                      </div>
                      <span className="font-bold text-sm">{name}</span>
                      <span className={`ms-auto rounded-lg px-2 py-0.5 text-xs font-bold ${isAbsent ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"}`}>
                        {isAbsent ? "✗ غائب" : "✓ حاضر"}
                      </span>
                    </div>

                    {isAbsent ? (
                      <input
                        className="w-full rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm outline-none focus:border-blue-400 transition-colors"
                        placeholder="ملاحظة اختيارية للغائب..."
                        value={noteVal}
                        onChange={(e) => setNote(e.target.value)}
                      />
                    ) : (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-bold text-muted-foreground mb-1.5 block">ملاحظة</label>
                          <input
                            className="w-full rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm outline-none focus:border-blue-400 transition-colors"
                            placeholder="ملاحظة خاصة بالطالب..."
                            value={noteVal}
                            onChange={(e) => setNote(e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-muted-foreground mb-1.5 block">التقييم (من 5)</label>
                          <div className="flex gap-1.5">
                            {[1, 2, 3, 4, 5].map(n => (
                              <button
                                key={n}
                                onClick={() => setScore(n)}
                                className={`h-8 w-8 rounded-lg border text-sm font-bold transition-all ${
                                  scoreVal === n
                                    ? n <= 2
                                      ? "bg-red-500 border-red-500 text-white"
                                      : n === 3
                                        ? "bg-amber-500 border-amber-500 text-white"
                                        : "bg-emerald-500 border-emerald-500 text-white"
                                    : "border-border bg-white text-muted-foreground hover:border-blue-300 hover:text-blue-600"
                                }`}
                              >
                                {n}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* الهدف القادم */}
          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <h2 className="text-sm font-extrabold text-[#1B2E8F] mb-3 flex items-center gap-2">
              🎯 هدف الحصة القادمة
            </h2>
            <Textarea
              value={nextGoal}
              onChange={(e) => setNextGoal(e.target.value)}
              placeholder="ما الذي ستركز عليه في الحصة القادمة؟"
              className="min-h-[80px] resize-none text-sm"
            />
          </div>
        </div>

        {/* Summary sidebar */}
        <div>
          <div className="rounded-xl border bg-white p-5 shadow-sm sticky top-6">
            <h2 className="text-sm font-extrabold text-[#1B2E8F] mb-4 flex items-center gap-2">
              📊 ملخص التقرير
            </h2>
            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">ما تحقق</span>
                <span className={`font-bold ${achieved ? "text-emerald-600" : "text-amber-500"}`}>
                  {achieved ? "✓ مكتوب" : "لم يُكتب بعد"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">ملاحظات الطلاب</span>
                <span className="font-bold">{filledCount} / {presentCount} مكتمل</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">الهدف القادم</span>
                <span className={`font-bold ${nextGoal ? "text-emerald-600" : "text-amber-500"}`}>
                  {nextGoal ? "✓ مكتوب" : "لم يُكتب بعد"}
                </span>
              </div>
            </div>

            <Button
              className="w-full mt-5 bg-[#1B2E8F] hover:bg-[#162878] font-bold"
              onClick={() => handleSave("published")}
              disabled={updateReport.isPending || !achieved || !nextGoal}
            >
              {updateReport.isPending ? "جاري الحفظ..." : "💾 حفظ التقرير"}
            </Button>
            <Button
              variant="outline"
              className="w-full mt-2 text-sm font-semibold"
              onClick={() => handleSave("draft")}
              disabled={updateReport.isPending}
            >
              حفظ كمسودة
            </Button>
            <p className="text-xs text-muted-foreground text-center mt-3">
              يمكن تعديل التقرير في أي وقت بعد الحفظ
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**
```bash
git add artifacts/kidspeak/src/pages/groups/session-report.tsx
git commit -m "feat: add session report page with per-student notes, scoring, and goal fields"
```

---

## Task 7: Routing — Register new page

**Files:**
- Modify: `artifacts/kidspeak/src/App.tsx`

- [ ] **Step 1: Add import**

After the `import GroupDetail from "@/pages/groups/detail"` line, add:
```typescript
import SessionReportPage from "@/pages/groups/session-report"
```

- [ ] **Step 2: Add route in the Switch**

Find the route for GroupDetail:
```tsx
<Route path="/groups/:id" component={GroupDetail} />
```

Add the new route **before** it (more specific routes must come first in Wouter):
```tsx
<Route path="/groups/:groupId/sessions/:sessionId/report" component={SessionReportPage} />
<Route path="/groups/:id" component={GroupDetail} />
```

- [ ] **Step 3: End-to-end test**

1. Start dev server
2. Log in as teacher, go to a group
3. Verify only teacher's sessions are shown with the blue banner
4. Click 📝 تقرير on a session
5. Fill in "ما تحقق", add notes and scores for each student, fill "الهدف القادم"
6. Click "حفظ التقرير"
7. Verify redirect back to group page with ✓ مكتمل on that session
8. Log in as psychologist, verify they see only their sessions with the same report flow

- [ ] **Step 4: Final commit**
```bash
git add artifacts/kidspeak/src/App.tsx
git commit -m "feat: register session report route"
```
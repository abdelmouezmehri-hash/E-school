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
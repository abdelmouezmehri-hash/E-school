import { useState } from "react";
import { Link } from "wouter";
import {
  useListStudents, useListLevels, useGetMe,
  useListEnrollmentRequests, useCreateEnrollmentRequest, useApproveEnrollmentRequest, useRejectEnrollmentRequest,
  useDeleteStudent,
  useListMarketingEnrollmentRequests, useApproveMarketingEnrollment, useRejectMarketingEnrollment,
  type MarketingEnrollmentRequest,
} from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Search, Plus, Star, AlertTriangle, UserMinus, Clock, CheckCircle2, XCircle, FileText, ChevronDown, ChevronUp, Trash2, User, Phone, Stethoscope, CreditCard, Users, UserPlus } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { AttendanceMap } from "@/components/attendance-map";
import { useToast } from "@/hooks/use-toast";
import { StudentWithDetailsPaymentStatus } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "@/contexts/language-context";
import { useBranch } from "@/contexts/branch-context";
import { format, differenceInYears } from "date-fns";

function safeFmt(dateStr: string | null | undefined, fmt: string): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return String(dateStr);
  return format(d, fmt);
}

const TODAY = new Date().toISOString().split("T")[0];

const EMPTY_CREATE_FORM = {
  name: "",
  gender: "",
  dateOfBirth: "",
  enrollmentDate: TODAY,
  levelId: "",
  branchId: "",
  behavioralFlags: [] as string[],
  guardianRelationship: "",
  guardianName: "",
  guardianPhone: "",
  guardianPhone2: "",
  guardianOccupation: "",
  medicalAlerts: "",
  referralSource: "",
  notes: "",
  initialPaymentAmount: "",
  discount: "",
  paymentMethod: "cash",
  createParentAccount: false,
  parentPassword: "",
};

export default function StudentsList() {
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createTab, setCreateTab] = useState("basic");
  const [createForm, setCreateForm] = useState({ ...EMPTY_CREATE_FORM });
  const [createError, setCreateError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [enrollOpen, setEnrollOpen] = useState(false);
  const [showRequests, setShowRequests] = useState(false);
  const [showAllRequests, setShowAllRequests] = useState(false);
  const { toast } = useToast();
  const { t, language, isRTL } = useLanguage();
  const { data: me } = useGetMe();
  const ert = t.enrollmentRequests;

  const isParent = (me as any)?.role === "parent";
  const isAdmin = (me as any)?.role === "admin";

  const { branches, selectedBranchId } = useBranch();

  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleteName, setDeleteName] = useState("");
  const { mutate: deleteStudent, isPending: isDeleting } = useDeleteStudent();
  const queryClientInstance = useQueryClient();

  const { data: students = [], isLoading } = useListStudents({
    search: search || undefined,
    levelId: levelFilter !== "all" ? parseInt(levelFilter) : undefined,
    parentId: isParent ? (me as any)?.id : undefined,
  });

  const { data: levels = [] } = useListLevels();
  const { data: enrollmentRequests = [], refetch: refetchEnrollments } = useListEnrollmentRequests();
  const { mutate: createEnrollment, isPending: isEnrolling } = useCreateEnrollmentRequest();
  const { mutate: approveEnrollment, isPending: isApproving } = useApproveEnrollmentRequest();
  const { mutate: rejectEnrollment, isPending: isRejecting } = useRejectEnrollmentRequest();

  const { data: marketingRequests = [] } = useListMarketingEnrollmentRequests();
  const approveMarketing = useApproveMarketingEnrollment();
  const rejectMarketing = useRejectMarketingEnrollment();
  const pendingMarketingCount = marketingRequests.filter((r: MarketingEnrollmentRequest) => r.status === "pending").length;
  const [approveRequest, setApproveRequest] = useState<MarketingEnrollmentRequest | null>(null);
  const [approveForm, setApproveForm] = useState({ name: "", gender: "", dateOfBirth: "", levelId: "", branchId: "", enrollmentDate: new Date().toISOString().split("T")[0], price: "", notes: "" });
  const [pendingMarketingApprovalId, setPendingMarketingApprovalId] = useState<number | null>(null);

  const [enrollName, setEnrollName] = useState("");
  const [enrollDob, setEnrollDob] = useState("");
  const [enrollNotes, setEnrollNotes] = useState("");

  const [actionTarget, setActionTarget] = useState<{ id: number; action: "approve" | "reject" } | null>(null);
  const [actionNotes, setActionNotes] = useState("");
  const [actionLevel, setActionLevel] = useState<string>("");

  const pendingRequests = enrollmentRequests.filter((r: any) => r.status === "pending");

  const selectedLevel = levels.find((l: any) => l.id.toString() === createForm.levelId) as any;
  const levelPrice: number | null = selectedLevel?.price ?? null;
  const amountPaidNum = parseFloat(createForm.initialPaymentAmount) || 0;
  const discountNum   = parseFloat(createForm.discount) || 0;
  const netTotal      = levelPrice !== null ? Math.max(0, levelPrice - discountNum) : null;
  const balance       = netTotal !== null ? Math.max(0, netTotal - amountPaidNum) : null;

  const calcAge = (dob: string) => {
    if (!dob) return null;
    return differenceInYears(new Date(), new Date(dob));
  };

  const lbl = (en: string, ar: string) => isRTL ? ar : en;

  const toggleFlag = (flag: string) => {
    setCreateForm(prev => ({
      ...prev,
      behavioralFlags: prev.behavioralFlags.includes(flag)
        ? prev.behavioralFlags.filter(f => f !== flag)
        : [...prev.behavioralFlags, flag],
    }));
  };

  const handleComprehensiveSubmit = async () => {
    if (!createForm.name.trim()) {
      setCreateError(lbl("Full name is required.", "الاسم الكامل مطلوب."));
      setCreateTab("basic");
      return;
    }
    if (!createForm.enrollmentDate) {
      setCreateError(lbl("Enrollment date is required.", "تاريخ التسجيل مطلوب."));
      setCreateTab("basic");
      return;
    }
    setCreateError("");
    setIsSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: createForm.name.trim(),
        enrollmentDate: createForm.enrollmentDate,
        behavioralFlags: createForm.behavioralFlags,
      };
      if (createForm.gender) payload.gender = createForm.gender;
      if (createForm.dateOfBirth) payload.dateOfBirth = createForm.dateOfBirth;
      if (createForm.levelId) payload.levelId = parseInt(createForm.levelId);
      if (createForm.notes) payload.notes = createForm.notes;
      if (createForm.guardianRelationship) payload.guardianRelationship = createForm.guardianRelationship;
      if (createForm.guardianName) payload.guardianName = createForm.guardianName;
      if (createForm.guardianPhone) payload.guardianPhone = createForm.guardianPhone;
      if (createForm.guardianPhone2) payload.guardianPhone2 = createForm.guardianPhone2;
      if (createForm.guardianOccupation) payload.guardianOccupation = createForm.guardianOccupation;
      if (createForm.medicalAlerts) payload.medicalAlerts = createForm.medicalAlerts;
      if (createForm.referralSource) payload.referralSource = createForm.referralSource;
      if (createForm.initialPaymentAmount) payload.initialPaymentAmount = parseFloat(createForm.initialPaymentAmount);
      if (createForm.discount) payload.discount = parseFloat(createForm.discount);
      if (createForm.paymentMethod) payload.paymentMethod = createForm.paymentMethod;
      if (createForm.branchId) payload.branchId = parseInt(createForm.branchId);
      if (createForm.createParentAccount) {
        payload.createParentAccount = true;
        payload.parentPassword = createForm.parentPassword;
      }
      // If opened from a marketing enrollment request, pass the request ID
      if (pendingMarketingApprovalId) {
        payload.marketingRequestId = pendingMarketingApprovalId;
      }

      const res = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        toast({ title: lbl("Pupil enrolled successfully!", "تم تسجيل التلميذ بنجاح!") });
        setIsCreateOpen(false);
        setCreateTab("basic");
        setCreateForm({ ...EMPTY_CREATE_FORM });
        if (pendingMarketingApprovalId) {
          queryClientInstance.invalidateQueries({ queryKey: ["marketing-enrollment-requests"] });
        }
        setPendingMarketingApprovalId(null);
        queryClientInstance.invalidateQueries({ queryKey: ["/api/students"] });
      } else {
        const err = await res.json();
        setCreateError(err.error || lbl("Failed to create pupil", "فشل في إنشاء التلميذ"));
      }
    } catch {
      setCreateError(lbl("Network error. Please try again.", "خطأ في الشبكة. حاول مرة أخرى."));
    } finally {
      setIsSaving(false);
    }
  };

  const handleEnrollSubmit = () => {
    if (!enrollName.trim()) return;
    createEnrollment(
      { studentName: enrollName.trim(), dateOfBirth: enrollDob || undefined, notes: enrollNotes.trim() || undefined },
      {
        onSuccess: () => {
          setEnrollOpen(false);
          setEnrollName(""); setEnrollDob(""); setEnrollNotes("");
          refetchEnrollments();
          toast({ title: ert.submitted });
        },
        onError: () => toast({ title: "Error", variant: "destructive" }),
      }
    );
  };

  const handleAction = () => {
    if (!actionTarget) return;
    if (actionTarget.action === "approve") {
      approveEnrollment(
        { id: actionTarget.id, adminNotes: actionNotes.trim() || undefined, levelId: actionLevel && actionLevel !== "none" ? parseInt(actionLevel) : undefined },
        {
          onSuccess: () => {
            queryClientInstance.invalidateQueries({ queryKey: ["enrollment-requests"] });
            queryClientInstance.invalidateQueries({ queryKey: ["/api/students"] });
            queryClientInstance.invalidateQueries({ queryKey: ["/api/dashboard"] });
            refetchEnrollments();
            toast({ title: ert.approveSuccess });
            setActionTarget(null); setActionNotes(""); setActionLevel("");
          },
          onError: () => toast({ title: "Error", variant: "destructive" }),
        }
      );
    } else {
      rejectEnrollment(
        { id: actionTarget.id, adminNotes: actionNotes.trim() || undefined },
        {
          onSuccess: () => {
            queryClientInstance.invalidateQueries({ queryKey: ["enrollment-requests"] });
            refetchEnrollments();
            toast({ title: ert.rejectSuccess });
            setActionTarget(null); setActionNotes("");
          },
          onError: () => toast({ title: "Error", variant: "destructive" }),
        }
      );
    }
  };

  const getPaymentBadgeColor = (status?: StudentWithDetailsPaymentStatus | null) => {
    switch (status) {
      case "paid": return "bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/25 border-emerald-500/20";
      case "partially_paid": return "bg-amber-500/15 text-amber-700 hover:bg-amber-500/25 border-amber-500/20";
      case "overdue": return "bg-red-500/15 text-red-700 hover:bg-red-500/25 border-red-500/20";
      default: return "bg-slate-500/15 text-slate-700 hover:bg-slate-500/25 border-slate-500/20";
    }
  };

  const getStatusLabel = (status?: string | null) => {
    if (!status) return t.status.unknown;
    return t.status[status as keyof typeof t.status] || status;
  };

  const getFlagLabel = (flag: string) => {
    switch (flag) {
      case "high_potential": return t.students.highPotential;
      case "fear": return t.students.fear;
      case "shyness": return t.students.shyness;
      default: return flag;
    }
  };

  const enrollStatusColor = (status: string) => {
    if (status === "approved") return "bg-emerald-100 text-emerald-700 border-emerald-200";
    if (status === "rejected") return "bg-red-100 text-red-700 border-red-200";
    return "bg-amber-100 text-amber-700 border-amber-200";
  };

  const enrollStatusLabel = (status: string) => {
    if (status === "approved") return ert.statusApproved;
    if (status === "rejected") return ert.statusRejected;
    return ert.statusPending;
  };

  const fieldCls = "space-y-1.5";
  const labelCls = "text-sm font-semibold";
  const requiredStar = <span className="text-red-500 ms-0.5">*</span>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">{isParent ? t.students.myChildren : t.students.title}</h1>
        <div className="flex gap-2 flex-wrap">
          {isParent && (
            <Button
              style={{ backgroundColor: "#F5A600", color: "#1B2E8F" }}
              className="font-semibold"
              onClick={() => setEnrollOpen(true)}
            >
              <Plus className="h-4 w-4 me-2" />
              {ert.requestButton}
            </Button>
          )}
          {isAdmin && (
            <Button
              style={{ backgroundColor: "#1B2E8F", color: "white" }}
              className="font-semibold"
              onClick={() => { setIsCreateOpen(true); setCreateTab("basic"); setCreateForm({ ...EMPTY_CREATE_FORM, branchId: selectedBranchId ? selectedBranchId.toString() : "" }); setCreateError(""); }}
            >
              <Plus className="h-4 w-4 me-2" />
              {t.students.addStudent}
            </Button>
          )}
        </div>
      </div>

      {/* Admin: Enrollment applications panel */}
      {isAdmin && (
        <div className="rounded-2xl border-2 overflow-hidden" style={{ borderColor: pendingRequests.length > 0 ? "#F5A600" : "#e5e7eb" }}>
          <button
            className="w-full flex items-center justify-between px-5 py-4 font-semibold text-sm hover:bg-muted/30 transition-colors"
            style={{ color: "#1B2E8F" }}
            onClick={() => setShowRequests(!showRequests)}
          >
            <span className="flex items-center gap-2">
              <Clock className="w-4 h-4" style={{ color: pendingRequests.length > 0 ? "#F5A600" : "#6b7280" }} />
              {ert.title}
              {pendingRequests.length > 0 && (
                <span className="rounded-full px-2 py-0.5 text-xs text-white font-bold" style={{ backgroundColor: "#F5A600" }}>
                  {pendingRequests.length} {ert.statusPending}
                </span>
              )}
              {enrollmentRequests.length > 0 && pendingRequests.length === 0 && (
                <span className="rounded-full px-2 py-0.5 text-xs bg-muted text-muted-foreground font-medium">
                  {enrollmentRequests.length}
                </span>
              )}
            </span>
            {showRequests ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {showRequests && (
            <div className="divide-y border-t">
              {(showAllRequests ? enrollmentRequests : pendingRequests).length === 0 ? (
                <div className="px-5 py-8 text-center text-sm text-muted-foreground">
                  {showAllRequests ? ert.noRequests : (isRTL ? "لا توجد طلبات معلقة" : "No pending requests")}
                </div>
              ) : (
                (showAllRequests ? (enrollmentRequests as any[]) : pendingRequests).map((req: any) => (
                  <div key={req.id} className={`px-5 py-4 flex items-start justify-between gap-4 flex-wrap ${req.status === "pending" ? "bg-amber-50/30" : "bg-muted/10"}`}>
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${req.status === "pending" ? "bg-amber-100" : req.status === "approved" ? "bg-emerald-100" : "bg-red-100"}`}>
                        <FileText className={`w-5 h-5 ${req.status === "pending" ? "text-amber-700" : req.status === "approved" ? "text-emerald-700" : "text-red-500"}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-sm">{req.studentName}</p>
                          <Badge variant="outline" className={`text-xs ${enrollStatusColor(req.status)}`}>{enrollStatusLabel(req.status)}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{ert.submittedOn}: {safeFmt(req.createdAt, "MMM d, yyyy")}</p>
                        {req.parentName && <p className="text-xs text-muted-foreground">Parent: {req.parentName}</p>}
                        {req.dateOfBirth && <p className="text-xs text-muted-foreground">DOB: {req.dateOfBirth}</p>}
                        {req.notes && <p className="text-xs italic text-muted-foreground mt-1">"{req.notes}"</p>}
                        {req.adminNotes && <p className="text-xs italic text-muted-foreground mt-1">Note: "{req.adminNotes}"</p>}
                      </div>
                    </div>
                    {req.status === "pending" && (
                      <div className="flex gap-2 shrink-0">
                        <Button size="sm" className="h-8 text-xs font-semibold" style={{ backgroundColor: "#16a34a", color: "white" }}
                          onClick={() => { setActionTarget({ id: req.id, action: "approve" }); setActionNotes(""); setActionLevel(""); }}>
                          <CheckCircle2 className="w-3.5 h-3.5 me-1" />{ert.approve}
                        </Button>
                        <Button size="sm" variant="outline" className="h-8 text-xs font-semibold border-red-200 text-red-600 hover:bg-red-50"
                          onClick={() => { setActionTarget({ id: req.id, action: "reject" }); setActionNotes(""); }}>
                          <XCircle className="w-3.5 h-3.5 me-1" />{ert.reject}
                        </Button>
                      </div>
                    )}
                  </div>
                ))
              )}
              {enrollmentRequests.length !== pendingRequests.length && (
                <button
                  onClick={() => setShowAllRequests(!showAllRequests)}
                  className="w-full py-2 text-xs text-muted-foreground hover:text-foreground text-center border-t bg-muted/20 font-medium"
                >
                  {showAllRequests
                    ? (isRTL ? "عرض النشطة فقط ▲" : "Pending only ▲")
                    : (isRTL
                        ? `عرض السجل (${enrollmentRequests.length - pendingRequests.length}) ▼`
                        : `Show history (${enrollmentRequests.length - pendingRequests.length}) ▼`)}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Marketing Enrollment Requests ── */}
      {isAdmin && (
        <div className="rounded-2xl border-2 overflow-hidden mt-4" style={{ borderColor: pendingMarketingCount > 0 ? "#1B2E8F" : "#e5e7eb" }}>
          <div className="px-5 py-3 flex items-center justify-between" style={{ backgroundColor: pendingMarketingCount > 0 ? "#1B2E8F08" : "#f9fafb" }}>
            <div className="flex items-center gap-2">
              <UserPlus className="w-4 h-4" style={{ color: pendingMarketingCount > 0 ? "#1B2E8F" : "#6b7280" }} />
              <span className="font-bold text-sm" style={{ color: pendingMarketingCount > 0 ? "#1B2E8F" : "#374151" }}>
                {isRTL ? "طلبات التسجيل من التسويق" : "Marketing Registration Requests"}
              </span>
              {pendingMarketingCount > 0 && (
                <Badge style={{ backgroundColor: "#1B2E8F", color: "white" }} className="text-xs">
                  {pendingMarketingCount} {isRTL ? "جديد" : "new"}
                </Badge>
              )}
            </div>
          </div>

          {marketingRequests.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-400">
              {isRTL ? "لا توجد طلبات تسجيل من التسويق" : "No marketing registration requests"}
            </div>
          ) : (
            <div className="divide-y">
              {(marketingRequests as MarketingEnrollmentRequest[]).map(req => (
                <div
                  key={req.id}
                  className={`px-5 py-4 flex items-start justify-between gap-4 flex-wrap ${
                    req.status === "pending" ? "bg-blue-50/30" : req.status === "approved" ? "bg-emerald-50/20" : "bg-red-50/10"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                      req.status === "pending" ? "bg-blue-100" : req.status === "approved" ? "bg-emerald-100" : "bg-red-100"
                    }`}>
                      {req.status === "pending" ? (
                        <Clock className="w-5 h-5 text-blue-700" />
                      ) : req.status === "approved" ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-700" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-500" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm">{req.childName}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          req.status === "pending" ? "bg-blue-100 text-blue-700" :
                          req.status === "approved" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-500"
                        }`}>
                          {req.status === "pending" ? (isRTL ? "في الانتظار" : "Pending") :
                           req.status === "approved" ? (isRTL ? "مقبول" : "Approved") : (isRTL ? "مرفوض" : "Rejected")}
                        </span>
                        {req.campaignName && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                            {isRTL ? (req.campaignNameAr ?? req.campaignName) : req.campaignName}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {isRTL ? "الولي:" : "Parent:"} {req.parentName} · {req.parentPhone}
                        {req.childAge && ` · ${isRTL ? "العمر:" : "Age:"} ${req.childAge}`}
                        {req.preferredLevel && ` · ${isRTL ? "المستوى:" : "Level:"} ${req.preferredLevel}`}
                      </p>
                      {req.notes && <p className="text-xs text-muted-foreground mt-0.5 italic">"{req.notes}"</p>}
                      {req.adminNotes && <p className="text-xs text-amber-600 mt-0.5">{isRTL ? "ملاحظة:" : "Note:"} {req.adminNotes}</p>}
                    </div>
                  </div>

                  {req.status === "pending" && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        style={{ backgroundColor: "#1B2E8F", color: "white" }}
                        onClick={() => {
                          // Open the comprehensive registration modal pre-filled with marketing request data
                          setPendingMarketingApprovalId(req.id);
                          setCreateForm({
                            ...EMPTY_CREATE_FORM,
                            name: req.childName,
                            levelId: req.levelId ? String(req.levelId) : "",
                            branchId: req.branchId ? String(req.branchId) : "",
                            guardianName: req.parentName,
                            guardianPhone: req.parentPhone,
                            referralSource: "marketing",
                          });
                          setCreateTab("basic");
                          setCreateError("");
                          setIsCreateOpen(true);
                        }}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 me-1" />
                        {isRTL ? "قبول وتسجيل" : "Approve & Register"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-red-200 text-red-500 hover:bg-red-50"
                        onClick={async () => {
                          if (confirm(isRTL ? "رفض هذا الطلب؟" : "Reject this request?")) {
                            await rejectMarketing.mutateAsync({ id: req.id });
                            toast({ title: isRTL ? "تم الرفض" : "Rejected" });
                          }
                        }}
                      >
                        <XCircle className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}


      {/* Parent: enrollment requests history */}
      {isParent && enrollmentRequests.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{ert.title}</h2>
          <div className="space-y-2">
            {enrollmentRequests.map((req: any) => (
              <div key={req.id} className="rounded-xl border overflow-hidden">
                <div className="flex items-center justify-between p-3 bg-muted/20">
                  <div>
                    <p className="text-sm font-semibold">{req.studentName}</p>
                    <p className="text-xs text-muted-foreground">{safeFmt(req.createdAt, "MMM d, yyyy")}</p>
                    {req.adminNotes && <p className="text-xs italic text-muted-foreground mt-0.5">"{req.adminNotes}"</p>}
                  </div>
                  <Badge variant="outline" className={`text-xs ${enrollStatusColor(req.status)}`}>{enrollStatusLabel(req.status)}</Badge>
                </div>
                {req.status === "approved" && (
                  <div className="px-3 py-2.5 bg-amber-50 border-t border-amber-200 flex items-start gap-2">
                    <span className="text-amber-600 shrink-0 mt-0.5">💳</span>
                    <p className="text-xs text-amber-800 font-medium">{ert.approvedPaymentNotice}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search + filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute start-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input placeholder={t.students.searchPlaceholder} className="ps-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={levelFilter} onValueChange={setLevelFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder={t.students.allLevels} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.students.allLevels}</SelectItem>
            {levels.map((level: any) => (
              <SelectItem key={level.id} value={level.id.toString()}>{level.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder={isRTL ? "كل الحالات" : "All statuses"} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{isRTL ? "كل الحالات" : "All statuses"}</SelectItem>
            <SelectItem value="active">{isRTL ? "يدرس حالياً" : "Active"}</SelectItem>
            <SelectItem value="stopped">{isRTL ? "توقف" : "Stopped"}</SelectItem>
            <SelectItem value="graduated">{isRTL ? "تخرج" : "Graduated"}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Student grid */}
      {(() => {
        const displayedStudents = (selectedBranchId
          ? (students as any[]).filter(s => s.branchId === selectedBranchId)
          : (students as any[])
        ).filter(s => statusFilter === "all" || (s.status ?? "active") === statusFilter);

        return isLoading ? (
          <div className="py-12 text-center text-muted-foreground">{t.students.loadingStudents}</div>
        ) : displayedStudents.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground border rounded-lg bg-card/50">{t.students.noStudentsFound}</div>
        ) : (
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
            {displayedStudents.map((student) => {
            const initials = student.name.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase();
            const progressScore = student.latestProgressScore !== undefined && student.latestProgressScore !== null
              ? Math.round(student.latestProgressScore) : null;
            const progressColor = progressScore === null ? "#9ca3af"
              : progressScore >= 80 ? "#16a34a"
              : progressScore >= 60 ? "#F5A600"
              : "#dc2626";

            return (
              <Link key={student.id} href={`/students/${student.id}`}>
                <Card className="hover-elevate cursor-pointer transition-all overflow-hidden group hover:shadow-lg">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      <div className="relative shrink-0">
                        <div
                          className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-black text-lg shadow-md group-hover:scale-105 transition-transform"
                          style={{ background: "#1B2E8F" }}
                        >
                          {initials}
                        </div>
                        {progressScore !== null && (
                          <div
                            className="absolute -bottom-1.5 -end-1.5 rounded-full text-white text-xs font-black px-1.5 py-0.5 shadow-md border-2 border-white"
                            style={{ backgroundColor: progressColor, minWidth: "28px", textAlign: "center" }}
                          >
                            {progressScore}%
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-base leading-tight truncate">{student.name}</h3>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: "#1B2E8F15", color: "#1B2E8F" }}>
                            {student.levelName || t.students.noLevelAssigned}
                          </span>
                          {(() => {
                            const sb = (student as any).branchId ? branches.find(b => b.id === (student as any).branchId) : null;
                            if (!sb) return null;
                            return (
                              <span className="text-xs px-1.5 py-0.5 rounded-full font-medium border" style={{ borderColor: "#F5A60040", color: "#b37a00", backgroundColor: "#F5A60010" }}>
                                🏫 {isRTL && sb.nameAr ? sb.nameAr : sb.name}
                              </span>
                            );
                          })()}
                        </div>
                        <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                          {(() => {
                            const st = (student as any).status ?? "active";
                            const statusMap: Record<string, { label: string; labelAr: string; cls: string }> = {
                              active: { label: "Active", labelAr: "يدرس حالياً", cls: "bg-emerald-500/15 text-emerald-700 border-emerald-500/20" },
                              stopped: { label: "Stopped", labelAr: "توقف", cls: "bg-amber-500/15 text-amber-700 border-amber-500/20" },
                              graduated: { label: "Graduated", labelAr: "تخرج", cls: "bg-blue-500/15 text-blue-700 border-blue-500/20" },
                            };
                            const info = statusMap[st] ?? statusMap.active;
                            return (
                              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${info.cls}`}>
                                {isRTL ? info.labelAr : info.label}
                              </span>
                            );
                          })()}
                          {!isParent && (
                            <Badge variant="outline" className={getPaymentBadgeColor(student.paymentStatus)}>
                              {getStatusLabel(student.paymentStatus)}
                            </Badge>
                          )}
                        </div>
                        {isParent && student.paymentStatus === "pending" && (
                          <div className="mt-2">
                            <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-300 gap-1">
                              💳 {t.students.pendingPaymentBadge}
                            </Badge>
                          </div>
                        )}
                      </div>
                    </div>

                    {isParent && (() => {
                      const completed = (student as any).completedSessions ?? 0;
                      const total = (student as any).totalSessions ?? 0;
                      if (total <= 0) return null;
                      const sessionPct = Math.min(100, Math.round((completed / total) * 100));
                      const barColor =
                        sessionPct >= 80 ? "#16a34a" :
                        sessionPct >= 50 ? "#1B2E8F" :
                        "#F5A600";
                      return (
                        <div className="mt-4 space-y-1">
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span className="font-semibold">
                              {isRTL ? "الحصص المكتملة" : "Sessions completed"}
                            </span>
                            <span style={{ color: barColor }} className="font-bold">
                              {completed} / {total}
                              <span className="ms-1 opacity-70">({sessionPct}%)</span>
                            </span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-700"
                              style={{ width: `${sessionPct}%`, backgroundColor: barColor }}
                            />
                          </div>
                        </div>
                      );
                    })()}

                    {isParent && (
                      <div className="mt-4 pt-4 border-t space-y-2" onClick={e => e.preventDefault()}>
                        <AttendanceMap studentId={student.id} compact />
                      </div>
                    )}

                    {student.behavioralFlags && student.behavioralFlags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t">
                        {student.behavioralFlags.map((flag: string) => (
                          <span key={flag} className="inline-flex items-center text-xs font-medium gap-1">
                            {flag === "high_potential" && <Star className="w-3 h-3 fill-current" style={{ color: "#F5A600" }} />}
                            {flag === "fear" && <AlertTriangle className="w-3 h-3 text-red-500" />}
                            {flag === "shyness" && <UserMinus className="w-3 h-3 text-orange-400" />}
                            {getFlagLabel(flag)}
                          </span>
                        ))}
                      </div>
                    )}

                    {isAdmin && (
                      <div className="pt-3 mt-2 border-t flex justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 gap-1.5 text-xs"
                          onClick={(e) => {
                            e.preventDefault(); e.stopPropagation();
                            setDeleteId(student.id);
                            setDeleteName(student.name);
                          }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />{t.students.deletePupil}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            );
            })}
          </div>
        );
      })()}

      {/* ─────────────────────────────────────────────────────────────────
          ADMIN: Comprehensive Multi-Tab Enrollment Modal
      ───────────────────────────────────────────────────────────────── */}
      <Dialog open={isCreateOpen} onOpenChange={(o) => { if (!o) { setIsCreateOpen(false); setCreateError(""); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir={isRTL ? "rtl" : "ltr"}>
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg,#1B2E8F,#2b42b5)" }}>
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-xl font-black" style={{ color: "#1B2E8F" }}>
                  {lbl("New Pupil Enrollment", "نافذة التسجيل الشاملة")}
                </DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {lbl("Fill in all sections to complete the enrollment.", "أكمل جميع الأقسام لاستكمال التسجيل.")}
                </p>
              </div>
            </div>
          </DialogHeader>

          <Tabs value={createTab} onValueChange={setCreateTab} className="mt-2">
            <TabsList className="grid w-full grid-cols-4 h-auto gap-1 bg-muted/40 p-1 rounded-xl">
              <TabsTrigger value="basic" className="flex flex-col items-center gap-0.5 py-2 text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <User className="w-3.5 h-3.5" />
                {lbl("Basic Info", "البيانات الأساسية")}
              </TabsTrigger>
              <TabsTrigger value="guardian" className="flex flex-col items-center gap-0.5 py-2 text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <Users className="w-3.5 h-3.5" />
                {lbl("Guardian", "معلومات الولي")}
              </TabsTrigger>
              <TabsTrigger value="medical" className="flex flex-col items-center gap-0.5 py-2 text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <Stethoscope className="w-3.5 h-3.5" />
                {lbl("Medical", "الحالة الصحية")}
              </TabsTrigger>
              <TabsTrigger value="financial" className="flex flex-col items-center gap-0.5 py-2 text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <CreditCard className="w-3.5 h-3.5" />
                {lbl("Payment", "الدفع الأولي")}
              </TabsTrigger>
            </TabsList>

            {/* ── TAB 1: BASIC INFO ── */}
            <TabsContent value="basic" className="space-y-4 pt-4">
              <div className={fieldCls}>
                <label className={labelCls}>{lbl("Full Name", "الاسم الكامل")} {requiredStar}</label>
                <Input
                  placeholder={lbl("e.g. Youcef Benali", "مثال: يوسف بن علي")}
                  value={createForm.name}
                  onChange={e => setCreateForm(p => ({ ...p, name: e.target.value }))}
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className={fieldCls}>
                  <label className={labelCls}>{lbl("Gender", "الجنس")}</label>
                  <Select value={createForm.gender} onValueChange={v => setCreateForm(p => ({ ...p, gender: v }))}>
                    <SelectTrigger><SelectValue placeholder={lbl("Select…", "اختر…")} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">{lbl("Male", "ذكر")}</SelectItem>
                      <SelectItem value="female">{lbl("Female", "أنثى")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className={fieldCls}>
                  <label className={labelCls}>
                    {lbl("Date of Birth", "تاريخ الميلاد")}
                    {createForm.dateOfBirth && (
                      <span className="ms-2 font-normal text-muted-foreground">
                        ({calcAge(createForm.dateOfBirth)} {lbl("yrs", "سنة")})
                      </span>
                    )}
                  </label>
                  <Input
                    type="date"
                    value={createForm.dateOfBirth}
                    max={TODAY}
                    onChange={e => setCreateForm(p => ({ ...p, dateOfBirth: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className={fieldCls}>
                  <label className={labelCls}>{lbl("Enrollment Date", "تاريخ التسجيل")} {requiredStar}</label>
                  <Input
                    type="date"
                    value={createForm.enrollmentDate}
                    onChange={e => setCreateForm(p => ({ ...p, enrollmentDate: e.target.value }))}
                  />
                </div>

                <div className={fieldCls}>
                  <label className={labelCls}>{lbl("Level", "المستوى")} <span className="font-normal text-muted-foreground">{lbl("(optional)", "(اختياري)")}</span></label>
                  <Select value={createForm.levelId} onValueChange={v => setCreateForm(p => ({ ...p, levelId: v }))}>
                    <SelectTrigger><SelectValue placeholder={lbl("No level", "بدون مستوى")} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{lbl("No level", "بدون مستوى")}</SelectItem>
                      {levels.map((l: any) => (
                        <SelectItem key={l.id} value={l.id.toString()}>
                          {isRTL && l.nameAr ? l.nameAr : l.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className={fieldCls}>
                <label className={labelCls}>{lbl("Behavioral Flags", "الملاحظات السلوكية")}</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {[
                    { key: "high_potential", en: "⭐ High Potential", ar: "⭐ موهوب" },
                    { key: "fear",           en: "⚠ Fear",           ar: "⚠ خوف" },
                    { key: "shyness",        en: "🙈 Shyness",       ar: "🙈 خجل" },
                  ].map(({ key, en, ar }) => {
                    const selected = createForm.behavioralFlags.includes(key);
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => toggleFlag(key)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                          selected ? "text-white border-transparent" : "border-border bg-background text-muted-foreground hover:bg-muted"
                        }`}
                        style={selected ? { backgroundColor: key === "high_potential" ? "#F5A600" : key === "fear" ? "#dc2626" : "#f97316" } : undefined}
                      >
                        {isRTL ? ar : en}
                      </button>
                    );
                  })}
                </div>
              </div>

              {branches.length > 0 && (
                <div className={fieldCls}>
                  <label className={labelCls}>
                    <span className="flex items-center gap-1">🏫 {lbl("Branch", "الفرع")}</span>
                  </label>
                  <Select
                    value={createForm.branchId || "none"}
                    onValueChange={v => setCreateForm(p => ({ ...p, branchId: v === "none" ? "" : v }))}
                  >
                    <SelectTrigger><SelectValue placeholder={lbl("No branch", "بدون فرع")} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{lbl("No branch", "بدون فرع")}</SelectItem>
                      {branches.map(b => (
                        <SelectItem key={b.id} value={b.id.toString()}>
                          {isRTL && b.nameAr ? b.nameAr : b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <Button type="button" onClick={() => setCreateTab("guardian")} style={{ backgroundColor: "#1B2E8F", color: "white" }}>
                  {lbl("Next: Guardian →", "التالي: الولي ←")}
                </Button>
              </div>
            </TabsContent>

            {/* ── TAB 2: GUARDIAN INFO ── */}
            <TabsContent value="guardian" className="space-y-4 pt-4">
              <div className="rounded-xl p-3 border" style={{ background: "#1B2E8F08", borderColor: "#1B2E8F20" }}>
                <p className="text-xs font-semibold" style={{ color: "#1B2E8F" }}>
                  {lbl("Guardian / Wali Information", "معلومات الولي أو المشرف")}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {lbl("This info is saved to the pupil's profile for quick contact.", "تُحفظ هذه المعلومات في بروفايل التلميذ لسهولة التواصل.")}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className={fieldCls}>
                  <label className={labelCls}>{lbl("Relationship", "صلة القرابة")}</label>
                  <Select value={createForm.guardianRelationship} onValueChange={v => setCreateForm(p => ({ ...p, guardianRelationship: v }))}>
                    <SelectTrigger><SelectValue placeholder={lbl("Select…", "اختر…")} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="father">{lbl("Father / الأب", "الأب")}</SelectItem>
                      <SelectItem value="mother">{lbl("Mother / الأم", "الأم")}</SelectItem>
                      <SelectItem value="other">{lbl("Other / آخر", "آخر")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className={fieldCls}>
                  <label className={labelCls}>{lbl("Guardian Full Name", "اسم الولي الكامل")}</label>
                  <Input
                    placeholder={lbl("e.g. Ahmed Benali", "مثال: أحمد بن علي")}
                    value={createForm.guardianName}
                    onChange={e => setCreateForm(p => ({ ...p, guardianName: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className={fieldCls}>
                  <label className={labelCls}>
                    <Phone className="w-3 h-3 inline me-1" />
                    {lbl("Primary Phone", "رقم الهاتف الرئيسي")}
                  </label>
                  <Input
                    type="tel"
                    placeholder="+213 XXX XXX XXX"
                    value={createForm.guardianPhone}
                    onChange={e => setCreateForm(p => ({ ...p, guardianPhone: e.target.value }))}
                  />
                </div>

                <div className={fieldCls}>
                  <label className={labelCls}>
                    <Phone className="w-3 h-3 inline me-1 text-emerald-600" />
                    {lbl("WhatsApp / Secondary", "واتساب / هاتف ثانوي")}
                  </label>
                  <Input
                    type="tel"
                    placeholder="+213 XXX XXX XXX"
                    value={createForm.guardianPhone2}
                    onChange={e => setCreateForm(p => ({ ...p, guardianPhone2: e.target.value }))}
                  />
                </div>
              </div>

              <div className={fieldCls}>
                <label className={labelCls}>{lbl("Guardian Occupation", "مهنة الولي")}</label>
                <Input
                  placeholder={lbl("e.g. Engineer, Teacher, Doctor…", "مثال: مهندس، معلم، طبيب…")}
                  value={createForm.guardianOccupation}
                  onChange={e => setCreateForm(p => ({ ...p, guardianOccupation: e.target.value }))}
                />
              </div>

              {/* Create parent account toggle */}
              <div className="rounded-xl border p-4 space-y-3" style={{ background: "#7c3aed08", borderColor: "#7c3aed30" }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <UserPlus className="w-4 h-4" style={{ color: "#7c3aed" }} />
                    <div>
                      <p className="text-sm font-semibold" style={{ color: "#7c3aed" }}>{lbl("Create Parent Account", "إنشاء حساب الولي")}</p>
                      <p className="text-xs text-muted-foreground">{lbl("Login with phone number", "تسجيل الدخول برقم الهاتف")}</p>
                    </div>
                  </div>
                  <Switch
                    checked={createForm.createParentAccount}
                    onCheckedChange={v => setCreateForm(p => ({ ...p, createParentAccount: v }))}
                    disabled={!createForm.guardianPhone || !createForm.guardianName}
                  />
                </div>
                {createForm.createParentAccount && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{lbl("Account Password", "كلمة المرور")}</label>
                    <input
                      type="password"
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      placeholder={lbl("Min 6 characters", "6 أحرف على الأقل")}
                      value={createForm.parentPassword}
                      onChange={e => setCreateForm(p => ({ ...p, parentPassword: e.target.value }))}
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-between pt-2">
                <Button type="button" variant="outline" onClick={() => setCreateTab("basic")}>
                  {lbl("← Back", "→ رجوع")}
                </Button>
                <Button type="button" onClick={() => setCreateTab("medical")} style={{ backgroundColor: "#1B2E8F", color: "white" }}>
                  {lbl("Next: Medical →", "التالي: الصحة ←")}
                </Button>
              </div>
            </TabsContent>

            {/* ── TAB 3: MEDICAL & BACKGROUND ── */}
            <TabsContent value="medical" className="space-y-4 pt-4">
              <div className={fieldCls}>
                <label className={labelCls}>
                  🚨 {lbl("Medical Alerts", "تنبيهات طبية")}
                </label>
                <p className="text-xs text-muted-foreground">{lbl("Allergies, chronic conditions, or emergency health notes.", "الحساسيات، الأمراض المزمنة، أو ملاحظات الطوارئ الصحية.")}</p>
                <Textarea
                  rows={3}
                  placeholder={lbl("e.g. Allergic to penicillin, asthma, diabetes…", "مثال: حساسية من البنسلين، ربو، سكري…")}
                  value={createForm.medicalAlerts}
                  onChange={e => setCreateForm(p => ({ ...p, medicalAlerts: e.target.value }))}
                />
              </div>

              <div className={fieldCls}>
                <label className={labelCls}>{lbl("Referral Source", "كيف وجدونا؟")}</label>
                <p className="text-xs text-muted-foreground">{lbl("How did the family find Kidspeak?", "كيف تعرّفت العائلة على كيدسبيك؟")}</p>
                <Select value={createForm.referralSource} onValueChange={v => setCreateForm(p => ({ ...p, referralSource: v }))}>
                  <SelectTrigger><SelectValue placeholder={lbl("Select source…", "اختر المصدر…")} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="friend">{lbl("Friend / Family Referral", "توصية صديق أو عائلة")}</SelectItem>
                    <SelectItem value="social_media">{lbl("Social Media", "وسائل التواصل الاجتماعي")}</SelectItem>
                    <SelectItem value="google">{lbl("Google Search", "بحث جوجل")}</SelectItem>
                    <SelectItem value="open_day">{lbl("Open Day Event", "يوم مفتوح")}</SelectItem>
                    <SelectItem value="flyer">{lbl("Flyer / Banner", "منشور / لافتة")}</SelectItem>
                    <SelectItem value="other">{lbl("Other", "أخرى")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className={fieldCls}>
                <label className={labelCls}>{lbl("General Notes", "ملاحظات عامة")}</label>
                <Textarea
                  rows={3}
                  placeholder={lbl("Any other notes about this pupil…", "أي ملاحظات أخرى حول هذا التلميذ…")}
                  value={createForm.notes}
                  onChange={e => setCreateForm(p => ({ ...p, notes: e.target.value }))}
                />
              </div>

              <div className="flex justify-between pt-2">
                <Button type="button" variant="outline" onClick={() => setCreateTab("guardian")}>
                  {lbl("← Back", "→ رجوع")}
                </Button>
                <Button type="button" onClick={() => setCreateTab("financial")} style={{ backgroundColor: "#1B2E8F", color: "white" }}>
                  {lbl("Next: Payment →", "التالي: الدفع ←")}
                </Button>
              </div>
            </TabsContent>

            {/* ── TAB 4: INITIAL PAYMENT ── */}
            <TabsContent value="financial" className="space-y-4 pt-4">
              {levelPrice !== null ? (
                <div className="rounded-xl border p-4 space-y-3" style={{ background: "linear-gradient(135deg,#1B2E8F08,#F5A60005)", borderColor: "#1B2E8F20" }}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-muted-foreground">{lbl("Level Tuition Fee", "رسوم المستوى")}</span>
                    <span className="text-lg font-black" style={{ color: "#1B2E8F" }}>
                      {levelPrice.toLocaleString("fr-DZ")} <span className="text-sm">د.ج</span>
                    </span>
                  </div>
                  {discountNum > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-red-600">{lbl("Discount", "التخفيض")}</span>
                      <span className="text-base font-bold text-red-600">
                        − {discountNum.toLocaleString("fr-DZ")} <span className="text-sm">د.ج</span>
                      </span>
                    </div>
                  )}
                  {discountNum > 0 && netTotal !== null && (
                    <div className="flex items-center justify-between border-t pt-2">
                      <span className="text-sm font-semibold text-muted-foreground">{lbl("Net Total", "المجموع بعد التخفيض")}</span>
                      <span className="text-base font-black" style={{ color: "#1B2E8F" }}>
                        {netTotal.toLocaleString("fr-DZ")} <span className="text-sm">د.ج</span>
                      </span>
                    </div>
                  )}
                  {amountPaidNum > 0 && (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-emerald-700">{lbl("Amount Paid Today", "المبلغ المدفوع اليوم")}</span>
                        <span className="text-lg font-black text-emerald-700">
                          {amountPaidNum.toLocaleString("fr-DZ")} <span className="text-sm">د.ج</span>
                        </span>
                      </div>
                      <div className="h-px bg-border" />
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold" style={{ color: balance === 0 ? "#16a34a" : "#dc2626" }}>
                          {balance === 0 ? lbl("✅ Fully Paid", "✅ مدفوع بالكامل") : lbl("Remaining Balance", "الرصيد المتبقي")}
                        </span>
                        {balance !== null && balance > 0 && (
                          <span className="text-lg font-black text-red-600">
                            {balance.toLocaleString("fr-DZ")} <span className="text-sm">د.ج</span>
                          </span>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground">
                  {lbl("Select a level in the Basic Info tab to see the tuition fee.", "اختر مستوى في تبويب البيانات الأساسية لرؤية رسوم التسجيل.")}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className={fieldCls}>
                  <label className={labelCls}>
                    {lbl("Amount Paid Today (DZD)", "المبلغ المدفوع اليوم (د.ج)")}
                  </label>
                  <Input
                    type="number"
                    min={0}
                    max={netTotal ?? levelPrice ?? undefined}
                    placeholder="0"
                    value={createForm.initialPaymentAmount}
                    onChange={e => {
                      const raw = e.target.value;
                      const max = netTotal ?? levelPrice;
                      const num = parseFloat(raw);
                      if (max !== null && !isNaN(num) && num > max) {
                        setCreateForm(p => ({ ...p, initialPaymentAmount: String(max) }));
                      } else {
                        setCreateForm(p => ({ ...p, initialPaymentAmount: raw }));
                      }
                    }}
                  />
                  <p className="text-xs text-muted-foreground">
                    {lbl("Leave as 0 if no payment yet.", "اتركه 0 إذا لم يتم تحصيل دفعة بعد.")}
                  </p>
                </div>
                <div className={fieldCls}>
                  <label className={labelCls}>
                    {lbl("Discount (DZD)", "التخفيض (د.ج)")}
                    <span className="ms-1 font-normal text-muted-foreground">{lbl("(optional)", "(اختياري)")}</span>
                  </label>
                  <Input
                    type="number"
                    min={0}
                    max={levelPrice ?? undefined}
                    placeholder="0"
                    value={createForm.discount}
                    onChange={e => setCreateForm(p => ({ ...p, discount: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground">
                    {lbl("Deducted from tuition fee.", "يُخصم من رسوم المستوى.")}
                  </p>
                </div>
              </div>

              <div className={fieldCls}>
                <label className={labelCls}>{lbl("Payment Method", "طريقة الدفع")}</label>
                <Select value={createForm.paymentMethod} onValueChange={v => setCreateForm(p => ({ ...p, paymentMethod: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">{lbl("Cash / نقداً", "نقداً")}</SelectItem>
                    <SelectItem value="bank_transfer">{lbl("Bank Transfer / تحويل بنكي", "تحويل بنكي")}</SelectItem>
                    <SelectItem value="cheque">{lbl("Cheque / شيك", "شيك")}</SelectItem>
                    <SelectItem value="ccp">{lbl("CCP / بريد", "بريد الجزائر")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-between pt-2">
                <Button type="button" variant="outline" onClick={() => setCreateTab("medical")}>
                  {lbl("← Back", "→ رجوع")}
                </Button>
              </div>
            </TabsContent>
          </Tabs>

          {createError && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700 flex items-center gap-2 mt-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {createError}
            </div>
          )}

          <DialogFooter className="mt-4 pt-4 border-t flex-col sm:flex-row gap-2">
            <DialogClose asChild>
              <Button variant="outline" className="w-full sm:w-auto">{lbl("Cancel", "إلغاء")}</Button>
            </DialogClose>
            <Button
              className="w-full sm:w-auto font-semibold"
              style={{ backgroundColor: "#F5A600", color: "#1B2E8F" }}
              onClick={handleComprehensiveSubmit}
              disabled={isSaving || !createForm.name.trim()}
            >
              {isSaving ? lbl("Enrolling…", "جارٍ التسجيل…") : lbl("✓ Complete Enrollment", "✓ إتمام التسجيل")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Parent: Enrollment Request Dialog */}
      <Dialog open={enrollOpen} onOpenChange={setEnrollOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{ert.requestTitle}</DialogTitle>
            <p className="text-xs text-muted-foreground">{ert.subtitle}</p>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{ert.childName}</label>
              <Input placeholder={ert.childNamePlaceholder} value={enrollName} onChange={e => setEnrollName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{ert.dateOfBirthOptional}</label>
              <Input type="date" value={enrollDob} onChange={e => setEnrollDob(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{ert.notes}</label>
              <Textarea rows={3} placeholder={ert.notesPlaceholder} value={enrollNotes} onChange={e => setEnrollNotes(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">{t.groups.cancel}</Button></DialogClose>
            <Button
              style={{ backgroundColor: "#F5A600", color: "#1B2E8F" }}
              className="font-semibold"
              onClick={handleEnrollSubmit}
              disabled={isEnrolling || !enrollName.trim()}
            >
              {isEnrolling ? ert.submitting : ert.submit}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Admin: Approve/Reject Dialog */}
      <Dialog open={!!actionTarget} onOpenChange={(o) => { if (!o) setActionTarget(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {actionTarget?.action === "approve" ? ert.approveTitle : ert.rejectTitle}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {actionTarget?.action === "approve" && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{ert.selectLevel}</label>
                <Select value={actionLevel} onValueChange={setActionLevel}>
                  <SelectTrigger><SelectValue placeholder={ert.noLevel} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{ert.noLevel}</SelectItem>
                    {levels.map((level: any) => (
                      <SelectItem key={level.id} value={level.id.toString()}>{level.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{ert.adminNotesLabel}</label>
              <Textarea rows={2} placeholder={ert.adminNotesPlaceholder} value={actionNotes} onChange={e => setActionNotes(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">{t.groups.cancel}</Button></DialogClose>
            <Button
              style={actionTarget?.action === "approve" ? { backgroundColor: "#16a34a", color: "white" } : { backgroundColor: "#dc2626", color: "white" }}
              className="font-semibold"
              onClick={handleAction}
              disabled={isApproving || isRejecting}
            >
              {actionTarget?.action === "approve" ? ert.approve : ert.reject}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="w-5 h-5" />
              {t.students.deletePupil}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">{t.students.deletePupilConfirm}</p>
          {deleteName && (
            <p className="text-sm font-semibold rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-red-700">{deleteName}</p>
          )}
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">{t.groups.cancel}</Button></DialogClose>
            <Button
              variant="destructive"
              disabled={isDeleting}
              onClick={() => {
                if (deleteId === null) return;
                deleteStudent({ id: deleteId }, {
                  onSuccess: () => {
                    toast({ title: t.students.deletePupilSuccess });
                    queryClientInstance.invalidateQueries({ queryKey: ["/api/students"] });
                    setDeleteId(null);
                  },
                  onError: () => toast({ title: "Failed to delete pupil", variant: "destructive" }),
                });
              }}
            >
              {isDeleting ? "Deleting…" : t.students.deletePupil}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

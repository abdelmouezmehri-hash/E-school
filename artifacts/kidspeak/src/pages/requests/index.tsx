import { useState, useEffect } from "react";
import {
  useListRequests,
  useCreateRequest,
  useDeleteRequest,
  useSubmitConsent,
  useRequestConsents,
  useGetMe,
} from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { useLanguage } from "@/contexts/language-context";
import { useToast } from "@/hooks/use-toast";
import {
  MapPin,
  Plus,
  Trash2,
  Calendar,
  Package,
  CheckCircle,
  XCircle,
  Clock,
  Users,
  DollarSign,
  Target,
  GraduationCap,
  BookOpen,
  UserCheck,
  Globe,
} from "lucide-react";
import { format } from "date-fns";

function getLang(en: string, ar: string | null, lang: string) {
  if (lang === "ar" && ar) return ar;
  return en;
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return format(d, "MMM dd, yyyy");
  } catch {
    return dateStr;
  }
}

type TargetType = "all" | "level" | "group" | "teacher";

interface AudienceOptions {
  levels: Array<{ id: number; name: string }>;
  groups: Array<{ id: number; name: string }>;
  teachers: Array<{ id: number; name: string }>;
}

function TargetBadge({
  targetType,
  targetLabel,
  rt,
}: {
  targetType: string;
  targetLabel: string;
  rt: any;
}) {
  const lang = targetType === "all" ? "all" : targetType;
  const variants: Record<string, { bg: string; text: string; border: string }> =
    {
      all: {
        bg: "bg-slate-50",
        text: "text-slate-700",
        border: "border-slate-200",
      },
      level: {
        bg: "bg-amber-50",
        text: "text-amber-700",
        border: "border-amber-200",
      },
      group: {
        bg: "bg-blue-50",
        text: "text-blue-700",
        border: "border-blue-200",
      },
      teacher: {
        bg: "bg-purple-50",
        text: "text-purple-700",
        border: "border-purple-200",
      },
    };
  const v = variants[lang] || variants.all;

  if (targetType === "all") {
    return (
      <Badge
        variant="outline"
        className={`${v.bg} ${v.text} ${v.border} border font-medium text-xs flex items-center gap-1 w-fit`}
      >
        <Globe className="w-3 h-3" />
        {targetLabel && targetLabel !== "all" && (
          <span className="capitalize">{targetLabel}</span>
        )}
      </Badge>
    );
  }

  const icon =
    targetType === "level" ? (
      <BookOpen className="w-3 h-3" />
    ) : targetType === "group" ? (
      <Users className="w-3 h-3" />
    ) : (
      <UserCheck className="w-3 h-3" />
    );

  return (
    <Badge
      variant="outline"
      className={`${v.bg} ${v.text} ${v.border} border font-medium text-xs flex items-center gap-1 w-fit`}
    >
      {icon}
      <span className="capitalize">{targetLabel}</span>
    </Badge>
  );
}

export default function RequestsPage() {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const rt = t.requests;

  const { data: me } = useGetMe();
  const isAdmin = (me as any)?.role === "admin";
  const isTeacher = (me as any)?.role === "teacher";
  const isStaff = isAdmin || isTeacher;
  const isParent = (me as any)?.role === "parent";
  const userId = (me as any)?.id;

  const { data: requests = [], isLoading, refetch } = useListRequests();
  const { mutate: create, isPending: isCreating } = useCreateRequest();
  const { mutate: deleteReq } = useDeleteRequest();
  const { mutate: submitConsent } = useSubmitConsent();

  // Create form state
  const [open, setOpen] = useState(false);
  const [reqTitle, setReqTitle] = useState("");
  const [reqTitleAr, setReqTitleAr] = useState("");
  const [desc, setDesc] = useState("");
  const [descAr, setDescAr] = useState("");
  const [date, setDate] = useState("");
  const [itemsText, setItemsText] = useState("");
  const [itemsTextAr, setItemsTextAr] = useState("");
  const [cost, setCost] = useState("");
  const [targetType, setTargetType] = useState<TargetType>(
    isTeacher ? "group" : "all",
  );
  const [targetId, setTargetId] = useState<string>("");
  const [audienceOptions, setAudienceOptions] = useState<AudienceOptions>({
    levels: [],
    groups: [],
    teachers: [],
  });
  const [audienceLoading, setAudienceLoading] = useState(false);

  // Consent dialog
  const [consentDialog, setConsentDialog] = useState<{
    id: number;
    title: string;
    targetLabel: string;
  } | null>(null);

  // Load audience options when modal opens (staff: admin or teacher)
  useEffect(() => {
    if (!open || !isStaff) return;
    setAudienceLoading(true);
    fetch("/api/requests/audience-options", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => setAudienceOptions(data))
      .catch(() => {})
      .finally(() => setAudienceLoading(false));
  }, [open, isStaff]);

  // Reset targetId when targetType changes
  useEffect(() => {
    setTargetId("");
  }, [targetType]);

  const resetForm = () => {
    setReqTitle("");
    setReqTitleAr("");
    setDesc("");
    setDescAr("");
    setDate("");
    setItemsText("");
    setItemsTextAr("");
    setCost("");
    setTargetType(isTeacher ? "group" : "all");
    setTargetId("");
  };

  const handleCreate = () => {
    if (!reqTitle.trim() || !desc.trim() || !date) return;
    const needsId = targetType !== "all";
    if (needsId && !targetId) return;

    const items = itemsText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    const itemsAr = itemsTextAr
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    // Use raw fetch to pass targetType/targetId since orval hook may not have them
    fetch("/api/requests", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: reqTitle.trim(),
        titleAr: reqTitleAr.trim() || undefined,
        description: desc.trim(),
        descriptionAr: descAr.trim() || undefined,
        date,
        requiredItems: items,
        requiredItemsAr: itemsAr,
        cost: cost ? parseInt(cost) : undefined,
        targetType,
        targetId: targetId ? parseInt(targetId) : undefined,
      }),
    })
      .then(async (r) => {
        if (!r.ok) throw new Error();
        toast({ title: rt.created });
        setOpen(false);
        resetForm();
        refetch();
      })
      .catch(() => toast({ title: rt.createdError, variant: "destructive" }));
  };

  const handleConsent = (
    requestId: number,
    status: "approved" | "declined",
  ) => {
    submitConsent(
      { id: requestId, data: { status } },
      {
        onSuccess: () => {
          toast({ title: status === "approved" ? rt.approved : rt.declined });
          refetch();
        },
      },
    );
  };

  // Count unseen (no consent yet) activities for parents
  const unseenCount = isParent
    ? (requests as any[]).filter((r) => !(r as any).myConsentStatus).length
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight">{rt.title}</h1>
            {isParent && unseenCount > 0 && (
              <span
                className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold text-white"
                style={{ backgroundColor: "#F5A600", color: "#1B2E8F" }}
              >
                {unseenCount}
              </span>
            )}
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            {isStaff ? rt.adminSubtitle : rt.subtitle}
          </p>
        </div>
        {isStaff && (
          <Button
            style={{ backgroundColor: "#F5A600", color: "#1B2E8F" }}
            className="font-semibold"
            onClick={() => setOpen(true)}
          >
            <Plus className="w-4 h-4 me-2" />
            {rt.addRequest}
          </Button>
        )}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">
          {rt.loading}
        </div>
      ) : (requests as any[]).length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <MapPin className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p>{rt.empty}</p>
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
          {(requests as any[]).map((req) => {
            const isPast = new Date(req.date) < new Date();
            const hasResponded = !!req.myConsentStatus;
            const isNew = isParent && !hasResponded && !isPast;

            return (
              <Card
                key={req.id}
                className="overflow-hidden hover:shadow-lg transition-all"
              >
                {/* Top accent bar */}
                <div
                  className="h-1.5 w-full"
                  style={{
                    background: "linear-gradient(90deg, #1B2E8F, #F5A600)",
                  }}
                />
                <CardContent className="p-5 space-y-4">
                  {/* Title + date + NEW badge */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="relative">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                          style={{ backgroundColor: "#1B2E8F15" }}
                        >
                          <MapPin
                            className="w-5 h-5"
                            style={{ color: "#1B2E8F" }}
                          />
                        </div>
                        {isNew && (
                          <span
                            className="absolute -top-1 -end-1 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center text-white"
                            style={{
                              backgroundColor: "#F5A600",
                              color: "#1B2E8F",
                            }}
                          >
                            {rt.newActivityBadge}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-base leading-snug">
                          {getLang(req.title, req.titleAr, language)}
                        </h3>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {req.date}
                          </span>
                          {req.cost ? (
                            <span className="flex items-center gap-1">
                              <DollarSign className="w-3 h-3" />
                              {req.cost.toLocaleString()} د.ج
                            </span>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-emerald-700 border-emerald-300 bg-emerald-50 text-xs"
                            >
                              {rt.free}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    {(isAdmin || (isTeacher && req.authorId === userId)) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0 text-red-400 hover:text-red-600 hover:bg-red-50 h-8 w-8"
                        onClick={() =>
                          deleteReq(req.id, { onSuccess: () => refetch() })
                        }
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>

                  {/* Description */}
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {getLang(req.description, req.descriptionAr, language)}
                  </p>

                  {/* Required items */}
                  {req.requiredItems && req.requiredItems.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                        <Package className="w-3 h-3" />
                        {rt.requiredItems}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {(language === "ar" && req.requiredItemsAr?.length > 0
                          ? req.requiredItemsAr
                          : req.requiredItems
                        ).map((item: string, i: number) => (
                          <span
                            key={i}
                            className="text-xs px-2.5 py-1 rounded-full border font-medium"
                            style={{
                              backgroundColor: "#F5A60010",
                              borderColor: "#F5A60040",
                              color: "#1B2E8F",
                            }}
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* Staff: target audience + consent stats — admin sees all, teacher sees their own */}
                  {(isAdmin || (isTeacher && req.authorId === userId)) && (
                    <div className="space-y-2 pt-3 border-t">
                      {/* Target audience */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          {rt.targetLabel}:
                        </span>
                        <TargetBadge
                          targetType={req.targetType || "all"}
                          targetLabel={req.targetLabel || rt.targetAll}
                          rt={rt}
                        />
                      </div>
                      {/* Consent stats */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 text-sm">
                          <span className="flex items-center gap-1 text-emerald-700">
                            <CheckCircle className="w-4 h-4" />
                            {req.approvedCount}
                          </span>
                          <span className="flex items-center gap-1 text-red-600">
                            <XCircle className="w-4 h-4" />
                            {req.declinedCount}
                          </span>
                          <span className="text-muted-foreground text-xs flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {req.totalResponses}{" "}
                            {req.totalResponses === 1
                              ? "response"
                              : "responses"}
                          </span>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs"
                          onClick={() =>
                            setConsentDialog({
                              id: req.id,
                              title: req.title,
                              targetLabel: req.targetLabel || "all",
                            })
                          }
                        >
                          {rt.viewConsents}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Parent: consent status or buttons */}
                  {isParent && hasResponded && (
                    <div className="pt-3 border-t flex items-center justify-between">
                      <Badge
                        variant="outline"
                        className={
                          req.myConsentStatus === "approved"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-300 text-xs"
                            : "bg-red-50 text-red-700 border-red-300 text-xs"
                        }
                      >
                        {req.myConsentStatus === "approved" ? (
                          <>
                            <CheckCircle className="w-3 h-3 me-1" />
                            {rt.youApproved}
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3 h-3 me-1" />
                            {rt.youDeclined}
                          </>
                        )}
                      </Badge>
                    </div>
                  )}

                  {isParent && !hasResponded && !isPast && (
                    <div className="flex gap-2 pt-3 border-t">
                      <Button
                        className="flex-1 font-semibold h-9"
                        style={{ backgroundColor: "#16a34a", color: "white" }}
                        onClick={() => handleConsent(req.id, "approved")}
                      >
                        <CheckCircle className="w-4 h-4 me-1.5" />
                        {rt.approve}
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1 font-semibold h-9 border-red-200 text-red-600 hover:bg-red-50"
                        onClick={() => handleConsent(req.id, "declined")}
                      >
                        <XCircle className="w-4 h-4 me-1.5" />
                        {rt.decline}
                      </Button>
                    </div>
                  )}

                  {isParent && isPast && !hasResponded && (
                    <div className="pt-3 border-t">
                      <Badge
                        variant="outline"
                        className="text-muted-foreground text-xs"
                      >
                        <Clock className="w-3 h-3 me-1" />
                        Activity passed
                      </Badge>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">
              {rt.addRequest}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Title */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Title (English)
              </label>
              <Input
                placeholder="e.g. Museum Visit, Field Trip, etc."
                value={reqTitle}
                onChange={(e) => setReqTitle(e.target.value)}
                className="h-10"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                العنوان (عربي)
              </label>
              <Input
                placeholder="مثلاً: زيارة المتحف، رحلة ميدانية، إلخ"
                value={reqTitleAr}
                onChange={(e) => setReqTitleAr(e.target.value)}
                className="h-10"
                dir="rtl"
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Description (English)
              </label>
              <Textarea
                placeholder="Describe the activity..."
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                الوصف (عربي)
              </label>
              <Textarea
                placeholder="اوصف النشاط..."
                value={descAr}
                onChange={(e) => setDescAr(e.target.value)}
                rows={3}
                dir="rtl"
              />
            </div>

            {/* Date + Cost row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Date
                </label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="h-10"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Cost (د.ج) — optional
                </label>
                <Input
                  type="number"
                  placeholder="0"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  className="h-10"
                />
              </div>
            </div>

            {/* Required items */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Required Items (English) — one per line
              </label>
              <Textarea
                placeholder="e.g.&#10;Water bottle&#10;Hat&#10;Comfortable shoes"
                value={itemsText}
                onChange={(e) => setItemsText(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                الأشياء المطلوبة (عربي) — واحد في كل سطر
              </label>
              <Textarea
                placeholder="مثلاً:&#10;زجاجة ماء&#10;قبعة&#10;أحذية مريحة"
                value={itemsTextAr}
                onChange={(e) => setItemsTextAr(e.target.value)}
                rows={3}
                dir="rtl"
              />
            </div>

            {/* Target type selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Audience Type
              </label>
              <Select
                value={targetType}
                onValueChange={(v) => setTargetType(v as TargetType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {isAdmin && (
                    <SelectItem value="all">
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-muted-foreground" />
                        {rt.targetTypeAll}
                      </div>
                    </SelectItem>
                  )}
                  <SelectItem value="level">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-[#F5A600]" />
                      {rt.targetTypeLevel}
                    </div>
                  </SelectItem>
                  <SelectItem value="group">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-[#1B2E8F]" />
                      {rt.targetTypeGroup}
                    </div>
                  </SelectItem>
                  <SelectItem value="teacher">
                    <div className="flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-purple-600" />
                      {rt.targetTypeTeacher}
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Audience picker (when not "all") */}
            {targetType !== "all" && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Select {targetType}
                </label>
                {audienceLoading ? (
                  <div className="text-sm text-muted-foreground py-2">
                    Loading options...
                  </div>
                ) : (
                  <Select value={targetId} onValueChange={setTargetId}>
                    <SelectTrigger>
                      <SelectValue placeholder={`Pick a ${targetType}`} />
                    </SelectTrigger>
                    <SelectContent>
                      {targetType === "level" &&
                        audienceOptions.levels.map((lv) => (
                          <SelectItem key={lv.id} value={String(lv.id)}>
                            {lv.name}
                          </SelectItem>
                        ))}
                      {targetType === "group" &&
                        audienceOptions.groups.map((gr) => (
                          <SelectItem key={gr.id} value={String(gr.id)}>
                            {gr.name}
                          </SelectItem>
                        ))}
                      {targetType === "teacher" &&
                        audienceOptions.teachers.map((tc) => (
                          <SelectItem key={tc.id} value={String(tc.id)}>
                            {tc.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="flex items-center gap-2">
            <DialogClose asChild>
              <Button variant="outline">{rt.cancel}</Button>
            </DialogClose>
            <Button
              style={{ backgroundColor: "#F5A600", color: "#1B2E8F" }}
              onClick={handleCreate}
              disabled={isCreating}
            >
              {isCreating ? rt.creating : rt.create}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Consent dialog */}
      {consentDialog && (
        <ConsentDialog
          requestId={consentDialog.id}
          requestTitle={consentDialog.title}
          targetLabel={consentDialog.targetLabel}
          onClose={() => setConsentDialog(null)}
          rt={rt}
        />
      )}
    </div>
  );
}

function ConsentDialog({
  requestId,
  requestTitle,
  targetLabel,
  onClose,
  rt,
}: {
  requestId: number;
  requestTitle: string;
  targetLabel: string;
  onClose: () => void;
  rt: any;
}) {
  const { data: consents = [] } = useRequestConsents({ id: requestId });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {rt.consentResponses || "Consent Responses"}
          </DialogTitle>
          <div className="text-sm text-muted-foreground">
            {requestTitle} — {targetLabel}
          </div>
        </DialogHeader>

        {(consents as any[]).length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-2 opacity-20" />
            <p>{rt.noResponsesYet || "No responses yet"}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {(consents as any[]).map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between py-2 px-3 rounded-lg border bg-card"
              >
                <span className="font-medium">{c.parentName}</span>
                <Badge
                  variant="outline"
                  className={
                    c.status === "approved"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                      : "bg-red-50 text-red-700 border-red-300"
                  }
                >
                  {c.status === "approved" ? (
                    <CheckCircle className="w-3 h-3 me-1" />
                  ) : (
                    <XCircle className="w-3 h-3 me-1" />
                  )}
                  {c.status === "approved" ? rt.approved : rt.declined}
                </Badge>
              </div>
            ))}
          </div>
        )}

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">{rt.close || "Close"}</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

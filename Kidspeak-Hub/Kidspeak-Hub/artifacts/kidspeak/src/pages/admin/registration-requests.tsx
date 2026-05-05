import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/language-context";
import { Phone, Mail, MapPin, User, Check, X, Clock, Users } from "lucide-react";

/* ═══════════════════════════════════════════════════════════
   Types
═══════════════════════════════════════════════════════════ */
interface RegRequest {
  id: number;
  fullName: string;
  email: string;
  phone: string;
  whatsappPhone: string | null;
  address: string | null;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
}

/* ═══════════════════════════════════════════════════════════
   API helpers
═══════════════════════════════════════════════════════════ */
const fetchRequests = (): Promise<RegRequest[]> =>
  fetch("/api/admin/registration-requests", { credentials: "include" }).then(r => r.json());

const approveRequest = (id: number, body: { loginEmail: string; password: string; displayName: string }) =>
  fetch(`/api/admin/registration-requests/${id}/approve`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).then(async r => {
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || "Failed to approve");
    return data;
  });

const rejectRequest = (id: number) =>
  fetch(`/api/admin/registration-requests/${id}`, {
    method: "DELETE",
    credentials: "include",
  }).then(r => r.json());

/* ═══════════════════════════════════════════════════════════
   Status badge
═══════════════════════════════════════════════════════════ */
function StatusBadge({ status }: { status: RegRequest["status"] }) {
  if (status === "pending") return <Badge variant="outline" className="gap-1 text-amber-600 border-amber-300 bg-amber-50"><Clock className="w-3 h-3" />Pending</Badge>;
  if (status === "approved") return <Badge variant="outline" className="gap-1 text-green-700 border-green-300 bg-green-50"><Check className="w-3 h-3" />Approved</Badge>;
  return <Badge variant="outline" className="gap-1 text-red-600 border-red-300 bg-red-50"><X className="w-3 h-3" />Rejected</Badge>;
}

/* ═══════════════════════════════════════════════════════════
   Approve modal
═══════════════════════════════════════════════════════════ */
interface ApproveModalProps {
  request: RegRequest | null;
  onClose: () => void;
  onDone: () => void;
}

function ApproveModal({ request, onClose, onDone }: ApproveModalProps) {
  const { toast } = useToast();
  const [loginEmail, setLoginEmail] = useState(request?.email ?? "");
  const [displayName, setDisplayName] = useState(request?.fullName ?? "");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);

  if (!request) return null;

  const handleSave = async () => {
    if (!loginEmail || !password) {
      toast({ title: "Please fill in all required fields.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await approveRequest(request.id, { loginEmail, password, displayName });
      toast({ title: "Parent account created successfully! 🎉" });
      onDone();
    } catch (err: any) {
      toast({ title: err.message || "Failed to approve", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: "#F5A600" }}>
              <User className="w-4 h-4 text-white" />
            </div>
            Activate Parent Account
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-xl p-4 bg-blue-50 border border-blue-100 text-sm">
            <p className="font-semibold text-[#1B2E8F]">{request.fullName}</p>
            <p className="text-muted-foreground">{request.email} · {request.phone}</p>
            {request.address && <p className="text-muted-foreground">{request.address}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Display Name</label>
            <Input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Full name shown in the app" />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Login Email *</label>
            <Input
              type="email"
              value={loginEmail}
              onChange={e => setLoginEmail(e.target.value)}
              placeholder="parent@example.com"
            />
            <p className="text-xs text-muted-foreground">This is what the parent will use to log in. Defaults to their registration email.</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Temporary Password *</label>
            <Input
              type="text"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Set a temporary password (min 6 chars)"
            />
            <p className="text-xs text-muted-foreground">Share this with the parent. Remind them to keep it safe.</p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button
            onClick={handleSave}
            disabled={saving || !loginEmail || !password}
            style={{ backgroundColor: "#1B2E8F" }}
          >
            {saving ? "Creating Account…" : "Activate & Create Account"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ═══════════════════════════════════════════════════════════
   Main Page
═══════════════════════════════════════════════════════════ */
export default function RegistrationRequestsPage() {
  const { t, language } = useLanguage();
  const isAr = language === "ar";
  const { toast } = useToast();
  const qc = useQueryClient();

  const [approving, setApproving] = useState<RegRequest | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected" | "open_day">("pending");

  const { data: requests = [], isLoading } = useQuery<RegRequest[]>({
    queryKey: ["registration-requests"],
    queryFn: fetchRequests,
    refetchInterval: 30000,
  });

  const rejectMutation = useMutation({
    mutationFn: rejectRequest,
    onSuccess: () => {
      toast({ title: "Request rejected." });
      qc.invalidateQueries({ queryKey: ["registration-requests"] });
    },
    onError: () => {
      toast({ title: "Failed to reject request.", variant: "destructive" });
    },
  });

  const filtered = filter === "all"
    ? requests
    : filter === "open_day"
      ? requests.filter((r: any) => r.source === "open_day")
      : requests.filter(r => r.status === filter);
  const pendingCount = requests.filter(r => r.status === "pending").length;
  const openDayCount = (requests as any[]).filter(r => r.source === "open_day").length;

  const handleApproved = () => {
    setApproving(null);
    qc.invalidateQueries({ queryKey: ["registration-requests"] });
  };

  return (
    <div className="space-y-6" dir={isAr ? "rtl" : "ltr"}>
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {isAr ? "طلبات الانضمام" : "Registration Requests"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isAr
              ? "راجع طلبات تسجيل الأهالي الجدد وفعّل حساباتهم"
              : "Review parent registration requests and activate their accounts"}
          </p>
        </div>
        {pendingCount > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl" style={{ backgroundColor: "#FFF7E6", border: "1.5px solid #F5A600" }}>
            <Clock className="w-4 h-4" style={{ color: "#F5A600" }} />
            <span className="font-semibold text-sm" style={{ color: "#1B2E8F" }}>
              {pendingCount} {isAr ? "طلب بانتظار المراجعة" : "pending request(s)"}
            </span>
          </div>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {(["pending", "approved", "rejected", "all"] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${filter === f
              ? "text-white"
              : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
            style={filter === f ? { backgroundColor: "#1B2E8F" } : {}}
          >
            {f === "all" ? (isAr ? "الكل" : "All") :
             f === "pending" ? (isAr ? "معلّق" : "Pending") :
             f === "approved" ? (isAr ? "مفعّل" : "Approved") :
             (isAr ? "مرفوض" : "Rejected")}
            {f !== "all" && (
              <span className="ms-1.5 text-xs opacity-70">
                ({requests.filter(r => r.status === f).length})
              </span>
            )}
          </button>
        ))}
        {openDayCount > 0 && (
          <button
            onClick={() => setFilter("open_day")}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${filter === "open_day" ? "text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
            style={filter === "open_day" ? { backgroundColor: "#F5A600", color: "#1B2E8F" } : {}}
          >
            🎉 {isAr ? "يوم مفتوح" : "Open Day Leads"}
            <span className="ms-1.5 text-xs opacity-80">({openDayCount})</span>
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-[#1B2E8F] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            {isAr ? "جاري التحميل…" : "Loading…"}
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">
            {filter === "pending"
              ? (isAr ? "لا توجد طلبات معلّقة" : "No pending requests")
              : (isAr ? "لا توجد طلبات" : "No requests found")}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map(req => (
            <Card key={req.id} className="overflow-hidden">
              <CardHeader className="pb-3" style={{ background: "linear-gradient(135deg, #1B2E8F08 0%, #F5A60008 100%)" }}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: "#1B2E8F" }}>
                      <User className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <CardTitle className="text-base leading-tight">{req.fullName}</CardTitle>
                        {req.source === "open_day" && (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full" style={{ backgroundColor: "#F5A60020", color: "#b45309", border: "1px solid #F5A60050" }}>
                            🎉 {isAr ? "يوم مفتوح" : "Open Day Lead"}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(req.createdAt).toLocaleDateString(isAr ? "ar-DZ" : "en-GB", { day: "numeric", month: "long", year: "numeric" })}
                      </p>
                    </div>
                  </div>
                  <StatusBadge status={req.status} />
                </div>
              </CardHeader>

              <CardContent className="space-y-2.5 pt-3">
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="truncate">{req.email}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span>{req.phone}</span>
                  {req.whatsappPhone && req.whatsappPhone !== req.phone && (
                    <span className="text-xs text-muted-foreground">· WhatsApp: {req.whatsappPhone}</span>
                  )}
                </div>
                {req.address && (
                  <div className="flex items-start gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">{req.address}</span>
                  </div>
                )}

                {req.status === "pending" && (
                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      className="flex-1 gap-1"
                      style={{ backgroundColor: "#1B2E8F" }}
                      onClick={() => setApproving(req)}
                    >
                      <Check className="w-4 h-4" />
                      {isAr ? "تفعيل الحساب" : "Approve & Activate"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 border-red-200 hover:bg-red-50"
                      disabled={rejectMutation.isPending}
                      onClick={() => {
                        if (confirm(isAr ? "هل أنت متأكد من رفض هذا الطلب؟" : "Reject this request?")) {
                          rejectMutation.mutate(req.id);
                        }
                      }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ApproveModal
        request={approving}
        onClose={() => setApproving(null)}
        onDone={handleApproved}
      />
    </div>
  );
}

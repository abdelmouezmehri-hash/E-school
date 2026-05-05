import { useState, useRef } from "react";
import { useGetMe } from "@workspace/api-client-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useLanguage } from "@/contexts/language-context";
import { useToast } from "@/hooks/use-toast";
import { useMediaUpload } from "@/hooks/use-media-upload";
import {
  Lightbulb, Plus, Paperclip, CheckCircle, Clock, Archive, Loader2,
  ChevronDown, FileText, ImageIcon, Sparkles, User, Calendar,
  MessageSquare, Megaphone, BookOpen, Cpu, PartyPopper, LayoutGrid, List,
} from "lucide-react";
import { format } from "date-fns";

function safeFmt(dateStr: string | null | undefined, fmt: string): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return String(dateStr);
  return format(d, fmt);
}

// ── Types ──────────────────────────────────────────────────────────────────

interface Idea {
  id: number;
  title: string;
  description: string;
  category: string;
  status: string;
  attachmentUrl: string | null;
  attachmentType: string | null;
  adminFeedback: string | null;
  submittedBy: number;
  submitterName: string | null;
  submitterRole: string | null;
  createdAt: string;
  updatedAt: string;
}

const CATEGORIES = ["marketing_idea", "educational_activity", "system_improvement", "event_suggestion"] as const;

const STATUS_CONFIG: Record<string, { color: string; bg: string; border: string; icon: React.FC<any> }> = {
  under_review: { color: "#b45309", bg: "#fef3c730", border: "#f59e0b40", icon: Clock },
  approved:     { color: "#15803d", bg: "#dcfce730", border: "#86efac40", icon: CheckCircle },
  done:         { color: "#1d4ed8", bg: "#dbeafe30", border: "#93c5fd40", icon: PartyPopper },
  archived:     { color: "#6b7280", bg: "#f3f4f630", border: "#d1d5db40", icon: Archive },
};

const CATEGORY_ICONS: Record<string, React.FC<any>> = {
  marketing_idea: Megaphone,
  educational_activity: BookOpen,
  system_improvement: Cpu,
  event_suggestion: PartyPopper,
};

const CATEGORY_COLORS: Record<string, string> = {
  marketing_idea: "#7c3aed",
  educational_activity: "#1B2E8F",
  system_improvement: "#0e7490",
  event_suggestion: "#b45309",
};

// ── API helpers ────────────────────────────────────────────────────────────

const apiFetch = (url: string, opts: RequestInit = {}) =>
  fetch(url, { credentials: "include", ...opts });

// ── Idea Card ──────────────────────────────────────────────────────────────

function IdeaCard({ idea, isAdmin, s, onUpdate }: { idea: Idea; isAdmin: boolean; s: any; onUpdate: () => void }) {
  const { toast } = useToast();
  const { language } = useLanguage();
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [feedbackText, setFeedbackText] = useState(idea.adminFeedback || "");
  const [feedbackTextAr, setFeedbackTextAr] = useState((idea as any).adminFeedbackAr || "");
  const [statusVal, setStatusVal] = useState(idea.status);
  const [saving, setSaving] = useState(false);

  const cfg = STATUS_CONFIG[idea.status] || STATUS_CONFIG.under_review;
  const StatusIcon = cfg.icon;
  const catIcon = CATEGORY_ICONS[idea.category] || Lightbulb;
  const CatIcon = catIcon;
  const catColor = CATEGORY_COLORS[idea.category] || "#1B2E8F";

  async function handleUpdate() {
    setSaving(true);
    try {
      const res = await apiFetch(`/api/ideas/${idea.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: statusVal, adminFeedback: feedbackText, adminFeedbackAr: feedbackTextAr }),
      });
      if (!res.ok) throw new Error();
      toast({ title: s.updated });
      qc.invalidateQueries({ queryKey: ["ideas"] });
      qc.invalidateQueries({ queryKey: ["ideas-count"] });
      onUpdate();
    } catch {
      toast({ title: "Error", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="overflow-hidden hover:shadow-md transition-all border-0 shadow-sm">
      {/* Category color strip */}
      <div className="h-1 w-full" style={{ backgroundColor: catColor }} />
      <CardContent className="p-4 space-y-3">
        {/* Header row */}
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
            style={{ backgroundColor: `${catColor}18` }}>
            <CatIcon className="w-4 h-4" style={{ color: catColor }} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-gray-900 leading-snug truncate">{idea.title}</h3>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              {/* Category badge */}
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md uppercase tracking-wide"
                style={{ color: catColor, backgroundColor: `${catColor}15` }}>
                {(s.categories as any)[idea.category]}
              </span>
              {/* Status badge */}
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full border"
                style={{ color: cfg.color, backgroundColor: cfg.bg, borderColor: cfg.border }}>
                <StatusIcon className="w-2.5 h-2.5" />
                {(s.statuses as any)[idea.status]}
              </span>
            </div>
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors shrink-0"
          >
            <ChevronDown className={`w-4 h-4 transition-transform ${expanded ? "rotate-180" : ""}`} />
          </button>
        </div>

        {/* Description (always visible, truncated) */}
        <p className={`text-sm text-muted-foreground leading-relaxed ${!expanded ? "line-clamp-2" : ""}`}>
          {idea.description}
        </p>

        {/* Expanded details */}
        {expanded && (
          <div className="space-y-3 pt-1">
            {/* Submitter + date */}
            <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
              {isAdmin && idea.submitterName && (
                <span className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  {idea.submitterName}
                  <span className="capitalize opacity-60">({idea.submitterRole})</span>
                </span>
              )}
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {safeFmt(idea.createdAt, "MMM d, yyyy")}
              </span>
            </div>

            {/* Attachment */}
            {idea.attachmentUrl && (
              <a
                href={idea.attachmentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border hover:opacity-80"
                style={{ color: "#1B2E8F", borderColor: "#1B2E8F30", backgroundColor: "#1B2E8F08" }}
              >
                {idea.attachmentType?.startsWith("image") ? <ImageIcon className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
                View Attachment
              </a>
            )}

            {/* Admin feedback (read-only for non-admin) */}
            {!isAdmin && ((idea.adminFeedback) || (idea as any).adminFeedbackAr) && (
              <div className="p-3 rounded-xl border-l-4" style={{ borderColor: "#F5A600", backgroundColor: "#FFF7E6" }}>
                <p className="text-xs font-semibold text-amber-700 mb-1 flex items-center gap-1">
                  <MessageSquare className="w-3 h-3" />
                  {s.adminFeedbackLabel}
                </p>
                <p className="text-sm text-gray-700">
                  {language === "ar" ? ((idea as any).adminFeedbackAr || idea.adminFeedback) : (idea.adminFeedback || (idea as any).adminFeedbackAr)}
                </p>
              </div>
            )}

            {/* Admin actions */}
            {isAdmin && (
              <div className="space-y-3 pt-2 border-t">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Status</label>
                    <Select value={statusVal} onValueChange={setStatusVal}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {["under_review", "approved", "done", "archived"].map(st => (
                          <SelectItem key={st} value={st} className="text-xs">
                            {(s.statuses as any)[st]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <Button
                      size="sm"
                      className="w-full h-8 text-xs"
                      style={{ backgroundColor: "#1B2E8F" }}
                      onClick={handleUpdate}
                      disabled={saving}
                    >
                      {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : s.updateStatus}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">{s.adminFeedbackLabel} (EN)</label>
                    <Textarea
                      value={feedbackText}
                      onChange={e => setFeedbackText(e.target.value)}
                      rows={2}
                      className="text-sm"
                      placeholder={s.adminFeedbackPlaceholder}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">{s.adminFeedbackLabel} (العربية) <span className="text-muted-foreground normal-case">(اختياري)</span></label>
                    <Textarea
                      dir="rtl"
                      value={feedbackTextAr}
                      onChange={e => setFeedbackTextAr(e.target.value)}
                      rows={2}
                      className="text-sm"
                      placeholder="ملاحظة للمقترح..."
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Submit Idea Dialog ─────────────────────────────────────────────────────

function SubmitIdeaDialog({ open, onClose, s, isParent }: { open: boolean; onClose: () => void; s: any; isParent?: boolean }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { uploadFile, isUploading, progress } = useMediaUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({ title: "", description: "", category: "" });
  const [attachment, setAttachment] = useState<{ url: string; type: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setForm({ title: "", description: "", category: "" });
    setAttachment(null);
  };

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const result = await uploadFile(file);
    if (result) setAttachment({ url: result.url, type: file.type });
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSubmit() {
    if (!form.title.trim() || !form.description.trim() || !form.category) return;
    setSubmitting(true);
    try {
      const res = await apiFetch("/api/ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description.trim(),
          category: form.category,
          attachmentUrl: attachment?.url || null,
          attachmentType: attachment?.type || null,
        }),
      });
      if (!res.ok) throw new Error();
      toast({ title: s.submitted });
      qc.invalidateQueries({ queryKey: ["ideas"] });
      qc.invalidateQueries({ queryKey: ["ideas-count"] });
      onClose();
      reset();
    } catch {
      toast({ title: "Error", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  const catIcons = {
    marketing_idea: Megaphone,
    educational_activity: BookOpen,
    system_improvement: Cpu,
    event_suggestion: PartyPopper,
  };

  const visibleCategories = isParent
    ? CATEGORIES.filter(c => c !== "marketing_idea")
    : CATEGORIES;

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) { onClose(); reset(); } }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#1B2E8F]">
            <Lightbulb className="w-5 h-5 text-[#F5A600]" />
            {s.formTitle}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto pe-1">
          {/* Category */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold">{s.categoryLabel} *</label>
            <div className="grid grid-cols-2 gap-2">
              {visibleCategories.map(cat => {
                const Icon = catIcons[cat];
                const color = CATEGORY_COLORS[cat];
                const selected = form.category === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setForm(f => ({ ...f, category: cat }))}
                    className="flex items-center gap-2 p-2.5 rounded-xl border-2 text-start transition-all text-xs font-semibold"
                    style={{
                      borderColor: selected ? color : "#e5e7eb",
                      backgroundColor: selected ? `${color}10` : "transparent",
                      color: selected ? color : "#6b7280",
                    }}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    {(s.categories as any)[cat]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold">{s.ideaTitle}</label>
            <Input
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder={s.ideaTitlePlaceholder}
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold">{s.descriptionLabel}</label>
            <Textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={4}
              placeholder={s.descriptionPlaceholder}
            />
          </div>

          {/* Attachment */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold">{s.attachmentLabel}</label>
            <p className="text-xs text-muted-foreground">{s.attachmentHelp}</p>
            <div className="flex items-center gap-2">
              <input ref={fileInputRef} type="file" accept="image/*,.pdf,.doc,.docx" className="hidden" onChange={handleFileChange} />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="text-xs"
              >
                {isUploading ? (
                  <><Loader2 className="w-3 h-3 me-1.5 animate-spin" />{s.uploadingAttachment} {progress}%</>
                ) : (
                  <><Paperclip className="w-3 h-3 me-1.5" />{s.uploadAttachment}</>
                )}
              </Button>
              {attachment && (
                <span className="text-xs text-emerald-600 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  Attached
                  <button onClick={() => setAttachment(null)} className="text-red-400 hover:text-red-600 ms-1">×</button>
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-2 justify-end pt-2 border-t">
          <Button variant="outline" onClick={() => { onClose(); reset(); }}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || !form.title.trim() || !form.description.trim() || !form.category}
            style={{ backgroundColor: "#1B2E8F" }}
            className="text-white"
          >
            {submitting ? (
              <><Loader2 className="w-4 h-4 me-1.5 animate-spin" />{s.submitting}</>
            ) : (
              <><Sparkles className="w-4 h-4 me-1.5" />{s.submit}</>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function IdeaBoxPage() {
  const { t } = useLanguage();
  const s = (t as any).ideaBox;
  const { data: me } = useGetMe();
  const isAdmin = (me as any)?.role === "admin";

  const [showSubmit, setShowSubmit] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");

  const qc = useQueryClient();

  const { data: ideas = [], isLoading } = useQuery<Idea[]>({
    queryKey: ["ideas"],
    queryFn: () => apiFetch("/api/ideas").then(r => r.json()),
    refetchInterval: 60000,
  });

  // Filter ideas
  const filtered = (ideas as Idea[]).filter(idea => {
    if (filterStatus !== "all" && idea.status !== filterStatus) return false;
    if (filterCategory !== "all" && idea.category !== filterCategory) return false;
    return true;
  });

  const underReviewCount = (ideas as Idea[]).filter(i => i.status === "under_review").length;
  const approvedCount = (ideas as Idea[]).filter(i => i.status === "approved" || i.status === "done").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, #1B2E8F, #2541b2)" }}>
              <Lightbulb className="w-5 h-5 text-[#F5A600]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900">{s.title}</h1>
              <p className="text-muted-foreground text-sm mt-0.5">{isAdmin ? s.adminSubtitle : s.subtitle}</p>
            </div>
          </div>
        </div>
        <Button
          onClick={() => setShowSubmit(true)}
          style={{ backgroundColor: "#F5A600", color: "#1B2E8F" }}
          className="font-bold shadow-sm"
        >
          <Plus className="w-4 h-4 me-1.5" />
          {s.newIdea}
        </Button>
      </div>

      {/* Stats bar (admin) */}
      {isAdmin && ideas.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { key: "all", label: "Total Ideas", count: ideas.length, color: "#1B2E8F" },
            { key: "under_review", label: s.statuses.under_review, count: underReviewCount, color: "#d97706" },
            { key: "approved", label: s.statuses.approved, count: (ideas as Idea[]).filter(i => i.status === "approved").length, color: "#16a34a" },
            { key: "done", label: s.statuses.done, count: (ideas as Idea[]).filter(i => i.status === "done").length, color: "#1d4ed8" },
          ].map(stat => (
            <button
              key={stat.key}
              onClick={() => setFilterStatus(filterStatus === stat.key ? "all" : stat.key)}
              className="p-3 rounded-xl border-2 text-start transition-all hover:shadow-sm"
              style={{
                borderColor: filterStatus === stat.key ? stat.color : "#e5e7eb",
                backgroundColor: filterStatus === stat.key ? `${stat.color}08` : "white",
              }}
            >
              <p className="text-2xl font-bold" style={{ color: stat.color }}>{stat.count}</p>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{stat.label}</p>
            </button>
          ))}
        </div>
      )}

      {/* Filters + view toggle */}
      <div className="flex items-center gap-2 flex-wrap">
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="h-8 text-xs w-48">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">All Categories</SelectItem>
            {CATEGORIES.map(cat => (
              <SelectItem key={cat} value={cat} className="text-xs">{(s.categories as any)[cat]}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {isAdmin && (
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="h-8 text-xs w-44">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All Statuses</SelectItem>
              {["under_review", "approved", "done", "archived"].map(st => (
                <SelectItem key={st} value={st} className="text-xs">{(s.statuses as any)[st]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <div className="ms-auto flex items-center gap-1">
          <button
            onClick={() => setViewMode("grid")}
            className={`p-1.5 rounded ${viewMode === "grid" ? "bg-[#1B2E8F] text-white" : "text-gray-400 hover:bg-gray-100"}`}
          >
            <LayoutGrid size={15} />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`p-1.5 rounded ${viewMode === "list" ? "bg-[#1B2E8F] text-white" : "text-gray-400 hover:bg-gray-100"}`}
          >
            <List size={15} />
          </button>
        </div>
      </div>

      {/* Approved idea notification for non-admins */}
      {!isAdmin && approvedCount > 0 && (
        <div className="flex items-center gap-3 p-3 rounded-xl border-2 border-emerald-200 bg-emerald-50">
          <PartyPopper className="w-5 h-5 text-emerald-600 shrink-0" />
          <p className="text-sm font-semibold text-emerald-800">{s.ideaApprovedNotice}</p>
        </div>
      )}

      {/* Ideas list */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin text-[#1B2E8F]" size={28} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "linear-gradient(135deg, #1B2E8F10, #F5A60010)" }}>
            <Lightbulb className="w-8 h-8 opacity-30 text-[#1B2E8F]" />
          </div>
          <p className="font-medium">{ideas.length === 0 ? (isAdmin ? s.empty : s.myIdeasEmpty) : "No ideas match your filters."}</p>
          {!isAdmin && ideas.length === 0 && (
            <Button
              onClick={() => setShowSubmit(true)}
              className="mt-4"
              style={{ backgroundColor: "#F5A600", color: "#1B2E8F" }}
            >
              <Lightbulb className="w-4 h-4 me-1.5" />
              {s.newIdea}
            </Button>
          )}
        </div>
      ) : (
        <div className={viewMode === "grid" ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" : "flex flex-col gap-3"}>
          {filtered.map(idea => (
            <IdeaCard
              key={idea.id}
              idea={idea}
              isAdmin={isAdmin}
              s={s}
              onUpdate={() => qc.invalidateQueries({ queryKey: ["ideas"] })}
            />
          ))}
        </div>
      )}

      {/* Submit Dialog */}
      <SubmitIdeaDialog open={showSubmit} onClose={() => setShowSubmit(false)} s={s} isParent={(me as any)?.role === "parent"} />
    </div>
  );
}

import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { useLanguage } from "@/contexts/language-context";
import { useGetMe } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useMediaUpload } from "@/hooks/use-media-upload";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Upload,
  MessageSquare,
  CheckCircle2,
  Send,
  Eye,
  FileText,
  Newspaper,
  Clock,
  Trash2,
  ExternalLink,
  Loader2,
  RotateCcw,
  Layers,
  Video,
  Camera,
  PenLine,
  Share2,
  Banknote,
  Wallet,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ProjectFile {
  id: number;
  projectId: number;
  uploadedBy: number | null;
  fileName: string;
  fileUrl: string;
  fileType: string;
  createdAt: string;
}

interface ProjectComment {
  id: number;
  authorId: number | null;
  authorName: string | null;
  content: string;
  isApproval: boolean;
  isRevision: boolean;
  createdAt: string;
}

interface Project {
  id: number;
  title: string;
  description: string | null;
  deadline: string | null;
  status: string;
  taskType: string | null;
  budget: number | null;
  earningStatus: string | null;
  earningPaidAt: string | null;
  earningPaidByName: string | null;
  assignedTo: number | null;
  assigneeName: string | null;
  assigneeRole: string | null;
  creatorName: string | null;
  publishedNewsId: number | null;
  createdAt: string;
  files: ProjectFile[];
  comments: ProjectComment[];
}

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  todo: "bg-slate-100 text-slate-700 border-slate-200",
  in_progress: "bg-blue-100 text-blue-700 border-blue-200",
  review: "bg-yellow-100 text-yellow-700 border-yellow-200",
  approved: "bg-violet-100 text-violet-700 border-violet-200",
  completed: "bg-green-100 text-green-700 border-green-200",
};

const TASK_TYPE_ICONS: Record<string, any> = {
  graphic_design: Layers,
  video_editing: Video,
  photography: Camera,
  copywriting: PenLine,
  social_media: Share2,
};

const TASK_TYPE_COLORS: Record<string, string> = {
  graphic_design: "bg-blue-50 text-blue-700 border-blue-200",
  video_editing: "bg-purple-50 text-purple-700 border-purple-200",
  photography: "bg-amber-50 text-amber-700 border-amber-200",
  copywriting: "bg-teal-50 text-teal-700 border-teal-200",
  social_media: "bg-pink-50 text-pink-700 border-pink-200",
};

const EARNING_STATUS_COLORS: Record<string, string> = {
  pending: "bg-gray-100 text-gray-600 border-gray-200",
  in_wallet: "bg-blue-100 text-blue-700 border-blue-200",
  paid: "bg-green-100 text-green-700 border-green-200",
};

// ── Helper ────────────────────────────────────────────────────────────────────

async function apiFetch(url: string, opts: RequestInit = {}) {
  const res = await fetch(url, { credentials: "include", ...opts });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Request failed");
  }
  return res.json();
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function StudioProjectPage() {
  const [, params] = useRoute("/studio/:id");
  const [, navigate] = useLocation();
  const { t } = useLanguage();
  const { data: me } = useGetMe();
  const { toast } = useToast();
  const qc = useQueryClient();
  const s = t.studio;

  const projectId = params?.id ? parseInt(params.id) : null;

  const [comment, setComment] = useState("");
  const [showApprove, setShowApprove] = useState(false);
  const [approveComment, setApproveComment] = useState("");
  const [showRevision, setShowRevision] = useState(false);
  const [revisionComment, setRevisionComment] = useState("");
  const [showPublish, setShowPublish] = useState(false);
  const [publishForm, setPublishForm] = useState({ title: "", content: "", imageUrl: "" });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadFile, isUploading, progress } = useMediaUpload();

  const { data: project, isLoading } = useQuery<Project>({
    queryKey: ["studio-project", projectId],
    queryFn: () => apiFetch(`/api/studio/projects/${projectId}`),
    enabled: !!projectId,
    refetchInterval: 8000,
  });

  const addFileMutation = useMutation({
    mutationFn: (data: any) => apiFetch(`/api/studio/projects/${projectId}/files`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["studio-project", projectId] });
      qc.invalidateQueries({ queryKey: ["studio-projects"] });
    },
    onError: (e: any) => toast({ title: e.message, variant: "destructive" }),
  });

  const deleteFileMutation = useMutation({
    mutationFn: (id: number) => apiFetch(`/api/studio/files/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["studio-project", projectId] });
      qc.invalidateQueries({ queryKey: ["studio-projects"] });
    },
    onError: (e: any) => toast({ title: e.message, variant: "destructive" }),
  });

  const addCommentMutation = useMutation({
    mutationFn: (data: any) => apiFetch(`/api/studio/projects/${projectId}/comments`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["studio-project", projectId] });
      qc.invalidateQueries({ queryKey: ["studio-projects"] });
      qc.invalidateQueries({ queryKey: ["studio-pending"] });
      qc.invalidateQueries({ queryKey: ["studio-earnings"] });
      setComment("");
      setShowApprove(false);
      setApproveComment("");
      setShowRevision(false);
      setRevisionComment("");
    },
    onError: (e: any) => toast({ title: e.message, variant: "destructive" }),
  });

  const submitForReviewMutation = useMutation({
    mutationFn: () => apiFetch(`/api/studio/projects/${projectId}`, {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "review" }),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["studio-project", projectId] });
      qc.invalidateQueries({ queryKey: ["studio-projects"] });
      qc.invalidateQueries({ queryKey: ["studio-pending"] });
      toast({ title: s.submittedForReview });
    },
    onError: (e: any) => toast({ title: e.message, variant: "destructive" }),
  });

  const publishMutation = useMutation({
    mutationFn: (data: any) => apiFetch(`/api/studio/projects/${projectId}/publish`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["studio-project", projectId] });
      qc.invalidateQueries({ queryKey: ["studio-projects"] });
      toast({ title: s.published });
      setShowPublish(false);
    },
    onError: (e: any) => toast({ title: e.message, variant: "destructive" }),
  });

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const result = await uploadFile(file);
    if (result) {
      const fileType = file.type.startsWith("image/") ? "image" : "pdf";
      await addFileMutation.mutateAsync({ fileName: file.name, fileUrl: result.url, fileType });
      toast({ title: s.uploadFile + " ✓" });
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  if (isLoading || !project) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <Loader2 className="animate-spin text-[#1B2E8F]" size={28} />
      </div>
    );
  }

  const isAdmin = me?.role === "admin";
  const isMarketer = me?.role === "marketer";
  const isAssignee = project.assignedTo === me?.id;
  const isCreative = ["designer", "marketer", "photographer"].includes(me?.role ?? "");
  const canEdit = isAdmin || isAssignee;
  const canUpload = isAdmin || isAssignee || isCreative;
  const canApprove = isAdmin && project.status === "review";
  const canRequestRevision = isAdmin && project.status === "review";
  const canPublish = (isAdmin || isMarketer) && project.status === "approved" && !project.publishedNewsId;
  const canSubmitReview = isAssignee && project.status === "in_progress";
  const canComment = isAdmin || isAssignee || isCreative;

  const getStatusLabel = (status: string) => (s.statuses as any)[status] ?? status;
  const TTypeIcon = project.taskType ? (TASK_TYPE_ICONS[project.taskType] ?? Layers) : null;
  const earningStatusLabel = project.earningStatus === "in_wallet" ? s.earningStatusInWallet : project.earningStatus === "paid" ? s.earningStatusPaid : null;

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      {/* Back */}
      <button
        onClick={() => navigate("/studio")}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-[#1B2E8F] mb-5 transition-colors"
      >
        <ArrowLeft size={16} />
        {s.title}
      </button>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-[#1B2E8F]">{project.title}</h1>
            <Badge className={`text-sm border ${STATUS_COLORS[project.status] ?? ""}`} variant="outline">
              {getStatusLabel(project.status)}
            </Badge>
            {project.publishedNewsId && (
              <Badge className="text-sm bg-green-100 text-green-700 border-green-200" variant="outline">
                {s.publishedBadge}
              </Badge>
            )}
          </div>

          {/* Task Type + Budget Row */}
          <div className="flex items-center gap-3 mt-2.5 flex-wrap">
            {project.taskType && TTypeIcon && (
              <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-medium ${TASK_TYPE_COLORS[project.taskType] ?? ""}`}>
                <TTypeIcon size={12} />
                {(s.taskTypes as any)[project.taskType] ?? project.taskType}
              </span>
            )}
            {project.budget != null && (
              <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border border-yellow-200 bg-yellow-50 text-yellow-700 font-medium">
                <Banknote size={12} />
                {project.budget.toLocaleString("fr-DZ")} د.ج
              </span>
            )}
            {project.earningStatus && earningStatusLabel && (
              <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-medium ${EARNING_STATUS_COLORS[project.earningStatus] ?? ""}`}>
                <Wallet size={12} />
                {earningStatusLabel}
                {project.earningPaidAt && ` — ${new Date(project.earningPaidAt).toLocaleDateString()}`}
              </span>
            )}
          </div>

          {project.description && (
            <p className="text-sm text-gray-600 mt-2">{project.description}</p>
          )}
          <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
            {project.assigneeName && (
              <span>{s.assignTo}: <span className="text-gray-600 font-medium">{project.assigneeName}</span></span>
            )}
            {project.deadline && (
              <span className="flex items-center gap-1">
                <Clock size={11} />
                {new Date(project.deadline).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 shrink-0">
          {canSubmitReview && (
            <Button
              onClick={() => submitForReviewMutation.mutate()}
              disabled={submitForReviewMutation.isPending}
              className="bg-yellow-500 text-white hover:bg-yellow-600"
              size="sm"
            >
              <Eye size={14} className="me-1.5" />
              {s.submitForReview}
            </Button>
          )}
          {canApprove && (
            <Button
              onClick={() => setShowApprove(true)}
              className="bg-violet-600 text-white hover:bg-violet-700"
              size="sm"
            >
              <CheckCircle2 size={14} className="me-1.5" />
              {s.approve}
            </Button>
          )}
          {canRequestRevision && (
            <Button
              onClick={() => setShowRevision(true)}
              className="bg-orange-500 text-white hover:bg-orange-600"
              size="sm"
              variant="outline"
            >
              <RotateCcw size={14} className="me-1.5" />
              {s.requestRevision}
            </Button>
          )}
          {canPublish && (
            <Button
              onClick={() => {
                setPublishForm({ title: project.title, content: project.description || "", imageUrl: "" });
                setShowPublish(true);
              }}
              className="bg-green-600 text-white hover:bg-green-700"
              size="sm"
            >
              <Newspaper size={14} className="me-1.5" />
              {s.publishToNews}
            </Button>
          )}
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Files Panel */}
        <div className="lg:col-span-3">
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">{s.files}</h2>
              {canUpload && (
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,.pdf"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading || addFileMutation.isPending}
                  >
                    {isUploading ? (
                      <><Loader2 size={14} className="me-1.5 animate-spin" />{progress}%</>
                    ) : (
                      <><Upload size={14} className="me-1.5" />{s.uploadFile}</>
                    )}
                  </Button>
                </div>
              )}
            </div>

            {project.files.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">{s.noFiles}</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {project.files.map((file) => (
                  <FileCard
                    key={file.id}
                    file={file}
                    canDelete={canEdit}
                    onDelete={() => deleteFileMutation.mutate(file.id)}
                    s={s}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Comments Panel */}
        <div className="lg:col-span-2">
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <MessageSquare size={16} />
              {s.comments}
            </h2>

            <div className="space-y-3 max-h-80 overflow-y-auto mb-4">
              {project.comments.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">{s.noFiles}</p>
              ) : (
                project.comments.map((c) => (
                  <div
                    key={c.id}
                    className={`p-3 rounded-lg text-sm ${
                      c.isApproval
                        ? "bg-green-50 border border-green-200"
                        : c.isRevision
                        ? "bg-orange-50 border border-orange-200"
                        : "bg-gray-50 border border-gray-100"
                    }`}
                  >
                    {c.isApproval && (
                      <div className="flex items-center gap-1.5 text-green-700 font-medium text-xs mb-1">
                        <CheckCircle2 size={12} />
                        {s.approvedBadge}
                      </div>
                    )}
                    {c.isRevision && (
                      <div className="flex items-center gap-1.5 text-orange-600 font-medium text-xs mb-1">
                        <RotateCcw size={12} />
                        {s.revisionBadge}
                      </div>
                    )}
                    <p className="text-gray-800">{c.content}</p>
                    <div className="flex items-center justify-between mt-1.5 text-xs text-gray-400">
                      <span>{c.authorName}</span>
                      <span>{new Date(c.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {canComment && (
              <div className="flex gap-2">
                <Input
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  placeholder={s.addComment}
                  className="flex-1 text-sm"
                  onKeyDown={e => e.key === "Enter" && comment.trim() && addCommentMutation.mutate({ content: comment, isApproval: false })}
                />
                <Button
                  size="sm"
                  onClick={() => addCommentMutation.mutate({ content: comment, isApproval: false })}
                  disabled={!comment.trim() || addCommentMutation.isPending}
                  className="bg-[#1B2E8F] hover:bg-[#152370]"
                >
                  <Send size={14} />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Approve Dialog */}
      <Dialog open={showApprove} onOpenChange={setShowApprove}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-violet-700">{s.approve}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600 mb-3">{s.approveConfirm}</p>
          <div>
            <Label className="text-sm">{s.addComment}</Label>
            <Textarea
              value={approveComment}
              onChange={e => setApproveComment(e.target.value)}
              placeholder={s.approvedBadge + "!"}
              rows={2}
              className="mt-1"
            />
          </div>
          <div className="flex gap-2 justify-end mt-3">
            <Button variant="outline" onClick={() => setShowApprove(false)}>{s.cancel}</Button>
            <Button
              onClick={() => addCommentMutation.mutate({ content: approveComment || s.approvedBadge, isApproval: true })}
              disabled={addCommentMutation.isPending}
              className="bg-violet-600 text-white hover:bg-violet-700"
            >
              <CheckCircle2 size={14} className="me-1.5" />
              {s.approve}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Revision Dialog */}
      <Dialog open={showRevision} onOpenChange={setShowRevision}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-orange-600">{s.requestRevision}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600 mb-3">{s.revisionRequested}</p>
          <div>
            <Label className="text-sm">{s.addComment} *</Label>
            <Textarea
              value={revisionComment}
              onChange={e => setRevisionComment(e.target.value)}
              placeholder="What needs to be revised?"
              rows={3}
              className="mt-1"
            />
          </div>
          <div className="flex gap-2 justify-end mt-3">
            <Button variant="outline" onClick={() => setShowRevision(false)}>{s.cancel}</Button>
            <Button
              onClick={() => addCommentMutation.mutate({ content: revisionComment || s.requestRevision, isRevision: true })}
              disabled={addCommentMutation.isPending}
              className="bg-orange-500 text-white hover:bg-orange-600"
            >
              <RotateCcw size={14} className="me-1.5" />
              {s.requestRevision}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Publish Dialog */}
      <Dialog open={showPublish} onOpenChange={setShowPublish}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-green-700">{s.publishTitle}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{s.publishNewsTitle}</Label>
              <Input value={publishForm.title} onChange={e => setPublishForm(f => ({ ...f, title: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label>{s.publishContent}</Label>
              <Textarea value={publishForm.content} onChange={e => setPublishForm(f => ({ ...f, content: e.target.value }))} rows={3} className="mt-1" />
            </div>
            <div>
              <Label>{s.publishImageUrl}</Label>
              <Input value={publishForm.imageUrl} onChange={e => setPublishForm(f => ({ ...f, imageUrl: e.target.value }))} placeholder="https://..." className="mt-1" />
            </div>
          </div>
          <div className="flex gap-2 justify-end mt-4">
            <Button variant="outline" onClick={() => setShowPublish(false)}>{s.cancel}</Button>
            <Button
              onClick={() => publishMutation.mutate({ newsTitle: publishForm.title || project.title, newsContent: publishForm.content || project.description, imageUrl: publishForm.imageUrl || null })}
              disabled={publishMutation.isPending || !publishForm.title.trim()}
              className="bg-green-600 text-white hover:bg-green-700"
            >
              <Newspaper size={14} className="me-1.5" />
              {s.publishBtn}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── File Card ─────────────────────────────────────────────────────────────────

function FileCard({ file, canDelete, onDelete, s }: {
  file: ProjectFile;
  canDelete: boolean;
  onDelete: () => void;
  s: any;
}) {
  const isImage = file.fileType === "image" || file.fileUrl.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i);

  return (
    <div className="group relative border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
      {isImage ? (
        <div className="aspect-square">
          <img
            src={file.fileUrl}
            alt={file.fileName}
            className="w-full h-full object-cover"
            onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        </div>
      ) : (
        <div className="aspect-square flex items-center justify-center">
          <FileText size={32} className="text-gray-400" />
        </div>
      )}

      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
        <a
          href={file.fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="p-1.5 rounded-full bg-white/20 text-white hover:bg-white/30"
          title={s.viewFile}
        >
          <ExternalLink size={14} />
        </a>
        {canDelete && (
          <button
            onClick={onDelete}
            className="p-1.5 rounded-full bg-red-500/80 text-white hover:bg-red-600"
            title={s.deleteProject}
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>

      <div className="p-2 border-t border-gray-200">
        <p className="text-xs text-gray-600 truncate" title={file.fileName}>{file.fileName}</p>
      </div>
    </div>
  );
}

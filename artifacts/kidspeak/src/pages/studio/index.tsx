import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LayoutGrid,
  List,
  Plus,
  Pencil,
  Trash2,
  Clock,
  CheckCircle2,
  Eye,
  AlertCircle,
  ChevronRight,
  Wallet,
  ImageIcon,
  Upload,
  Download,
  ExternalLink,
  Loader2,
  Layers,
  Users,
  BarChart3,
  Zap,
  FileImage,
  Video,
  Camera,
  PenLine,
  Share2,
  Banknote,
  FlaskConical,
  Tv2,
  Globe,
  Link as LinkIcon,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

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
  files: any[];
  comments: any[];
}

interface EarningProject {
  id: number;
  title: string;
  taskType: string | null;
  budget: number;
  earningStatus: string;
  earningPaidAt: string | null;
  earningPaidByName: string | null;
  assigneeName: string | null;
  assigneeRole: string | null;
  status: string;
  updatedAt: string | null;
}

interface EarningsData {
  projects: EarningProject[];
  totalEarned: number;
  totalPaid: number;
  inWallet: number;
}

interface VaultItem {
  id: number;
  title: string;
  description: string | null;
  fileUrl: string;
  fileType: string;
  category: string;
  uploadedBy: number | null;
  uploaderName: string | null;
  createdAt: string;
}

interface Assignee {
  id: number;
  name: string;
  role: string;
}

interface MediaLabItem {
  id: number;
  title: string;
  description: string | null;
  fileUrl: string;
  fileType: string;
  category: string; // "event_photo" | "talk_show"
  uploadedBy: number | null;
  uploaderName: string | null;
  createdAt: string;
}

interface PipelineStaff {
  id: number;
  name: string;
  role: string;
  tasks: { id: number; title: string; status: string; taskType: string | null; deadline: string | null }[];
}

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_ORDER = ["todo", "in_progress", "review", "approved", "completed"];

const STATUS_COLORS: Record<string, string> = {
  todo: "bg-slate-100 text-slate-700 border-slate-200",
  in_progress: "bg-blue-100 text-blue-700 border-blue-200",
  review: "bg-yellow-100 text-yellow-700 border-yellow-200",
  approved: "bg-violet-100 text-violet-700 border-violet-200",
  completed: "bg-green-100 text-green-700 border-green-200",
};

const STATUS_ICONS: Record<string, any> = {
  todo: AlertCircle,
  in_progress: Clock,
  review: Eye,
  approved: CheckCircle2,
  completed: CheckCircle2,
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

const VAULT_CATEGORIES = ["logo", "template", "photo", "brand", "other"];

// ── Helper ────────────────────────────────────────────────────────────────────

async function apiFetch(url: string, opts: RequestInit = {}) {
  const res = await fetch(url, { credentials: "include", ...opts });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Request failed");
  }
  return res.json();
}

function fmtCurrency(n: number) {
  return n.toLocaleString("fr-DZ") + " د.ج";
}

// ── Main Page ─────────────────────────────────────────────────────────────────

const TABS = ["missions", "portfolio", "earnings", "media-lab", "vault", "all-missions"] as const;
type Tab = typeof TABS[number];

export default function StudioPage() {
  const { t, isRTL } = useLanguage();
  const { data: me } = useGetMe();
  const { toast } = useToast();
  const qc = useQueryClient();
  const s = t.studio;

  const isAdmin = me?.role === "admin";
  const isMarketer = me?.role === "marketer";

  const [activeTab, setActiveTab] = useState<Tab>("missions");
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  const [showCreate, setShowCreate] = useState(false);
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [deleteProject, setDeleteProject] = useState<Project | null>(null);

  const emptyForm = { title: "", description: "", deadline: "", assignedTo: "", taskType: "graphic_design", budget: "" };
  const [form, setForm] = useState(emptyForm);

  // Queries
  const { data: projects = [], isLoading } = useQuery<Project[]>({
    queryKey: ["studio-projects"],
    queryFn: () => apiFetch("/api/studio/projects"),
  });

  const { data: assignees = [] } = useQuery<Assignee[]>({
    queryKey: ["studio-assignees"],
    queryFn: () => apiFetch("/api/studio/assignees"),
    enabled: isAdmin,
  });

  const { data: earnings } = useQuery<EarningsData>({
    queryKey: ["studio-earnings"],
    queryFn: () => apiFetch("/api/studio/earnings"),
    enabled: activeTab === "earnings",
  });

  const { data: vault = [], isLoading: vaultLoading } = useQuery<VaultItem[]>({
    queryKey: ["studio-vault"],
    queryFn: () => apiFetch("/api/studio/vault"),
    enabled: activeTab === "vault",
  });

  const { data: mediaLab = [], isLoading: mediaLabLoading } = useQuery<MediaLabItem[]>({
    queryKey: ["studio-media-lab"],
    queryFn: () => apiFetch("/api/studio/media-lab"),
    enabled: activeTab === "media-lab",
  });

  const { data: pipeline = [] } = useQuery<PipelineStaff[]>({
    queryKey: ["studio-pipeline"],
    queryFn: () => apiFetch("/api/studio/pipeline"),
    enabled: isAdmin && activeTab === "all-missions",
  });

  // Mutations — Projects
  const createMutation = useMutation({
    mutationFn: (data: any) => apiFetch("/api/studio/projects", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["studio-projects"] });
      qc.invalidateQueries({ queryKey: ["studio-pending"] });
      toast({ title: s.projectCreated });
      setShowCreate(false);
      setForm(emptyForm);
    },
    onError: (e: any) => toast({ title: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: any) => apiFetch(`/api/studio/projects/${id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["studio-projects"] });
      toast({ title: s.projectUpdated });
      setEditProject(null);
      setForm(emptyForm);
    },
    onError: (e: any) => toast({ title: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiFetch(`/api/studio/projects/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["studio-projects"] });
      toast({ title: s.projectDeleted });
      setDeleteProject(null);
    },
    onError: (e: any) => toast({ title: e.message, variant: "destructive" }),
  });

  // Mutation — Update Status (creative roles)
  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      apiFetch(`/api/studio/projects/${id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["studio-projects"] });
      toast({ title: isRTL ? "تم تحديث حالة المهمة" : "Task status updated" });
    },
    onError: (e: any) => toast({ title: e.message, variant: "destructive" }),
  });

  // Mutation — Mark Paid
  const markPaidMutation = useMutation({
    mutationFn: (projectId: number) => apiFetch(`/api/studio/earnings/${projectId}/pay`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["studio-earnings"] });
      toast({ title: s.markAsPaid + " ✓" });
    },
    onError: (e: any) => toast({ title: e.message, variant: "destructive" }),
  });

  // Form helpers
  function openCreate() {
    setForm(emptyForm);
    setShowCreate(true);
  }

  function openEdit(p: Project) {
    setForm({
      title: p.title,
      description: p.description || "",
      deadline: p.deadline || "",
      assignedTo: p.assignedTo ? String(p.assignedTo) : "",
      taskType: p.taskType || "graphic_design",
      budget: p.budget ? String(p.budget) : "",
    });
    setEditProject(p);
  }

  function handleSave(isEdit: boolean) {
    if (!form.title.trim()) return;
    const payload = {
      title: form.title,
      description: form.description || null,
      deadline: form.deadline || null,
      assignedTo: form.assignedTo || null,
      taskType: form.taskType,
      budget: form.budget ? parseFloat(form.budget) : null,
    };
    if (isEdit && editProject) {
      updateMutation.mutate({ id: editProject.id, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  // Stats
  const activeTasks = projects.filter(p => !["completed", "approved"].includes(p.status)).length;
  const assetsCreated = projects.filter(p => p.files.length > 0).length;
  const pendingReviews = projects.filter(p => p.status === "review").length;

  const getStatusLabel = (status: string) => (s.statuses as any)[status] ?? status;
  const getTaskTypeLabel = (tt: string | null) => tt ? ((s.taskTypes as any)[tt] ?? tt) : "";

  const isDesigner = me?.role === "designer";
  const isCreative = ["designer", "marketer", "photographer"].includes(me?.role ?? "");

  // Tab visibility
  const tabs = [
    { key: "missions" as Tab, label: s.tabMissions },
    { key: "portfolio" as Tab, label: s.tabPortfolio },
    { key: "earnings" as Tab, label: s.tabEarnings },
    { key: "media-lab" as Tab, label: s.tabMediaLab },
    { key: "vault" as Tab, label: s.tabVault },
    ...(isAdmin ? [{ key: "all-missions" as Tab, label: s.tabAllMissions }] : []),
  ];

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* ── Header ── */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-[#1B2E8F] flex items-center justify-center">
            <Zap size={20} className="text-[#F5A600]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#1B2E8F]">{s.title}</h1>
            <p className="text-xs text-gray-400">{s.engineSubtitle}</p>
          </div>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard icon={<Clock size={18} className="text-blue-600" />} label={s.statsActiveTasks} value={activeTasks} color="blue" />
        <StatCard icon={<ImageIcon size={18} className="text-violet-600" />} label={s.statsAssetsCreated} value={assetsCreated} color="violet" />
        <StatCard icon={<Wallet size={18} className="text-[#F5A600]" />} label={s.statsMyEarnings} value={earnings ? fmtCurrency(isAdmin ? earnings.totalEarned : earnings.inWallet) : "—"} color="yellow" />
        <StatCard icon={<Eye size={18} className="text-amber-600" />} label={s.statsPendingReviews} value={pendingReviews} color="amber" />
      </div>

      {/* ── Creative Task Dashboard (non-admin creative roles only) ── */}
      {isCreative && !isAdmin && (
        <CreativeTaskDashboard
          projects={projects}
          isLoading={isLoading}
          isRTL={isRTL}
          onStatusUpdate={(id: number, status: string) => statusMutation.mutate({ id, status })}
          statusPending={statusMutation.isPending}
          getStatusLabel={getStatusLabel}
          getTaskTypeLabel={getTaskTypeLabel}
          s={s}
        />
      )}

      {/* ── Tabs ── */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-5 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.key
                ? "bg-[#1B2E8F] text-white shadow"
                : "text-gray-600 hover:bg-gray-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Missions Tab ── */}
      {activeTab === "missions" && (
        <PipelineTab
          projects={projects}
          isLoading={isLoading}
          isAdmin={isAdmin}
          assignees={assignees}
          viewMode={viewMode}
          setViewMode={setViewMode}
          onNewTask={openCreate}
          onEdit={openEdit}
          onDelete={(p: Project) => setDeleteProject(p)}
          getStatusLabel={getStatusLabel}
          getTaskTypeLabel={getTaskTypeLabel}
          s={s}
        />
      )}

      {/* ── Portfolio Tab ── */}
      {activeTab === "portfolio" && (
        <PortfolioTab projects={projects} s={s} getTaskTypeLabel={getTaskTypeLabel} />
      )}

      {/* ── Earnings Tab ── */}
      {activeTab === "earnings" && (
        <EarningsTab
          earnings={earnings}
          isAdmin={isAdmin}
          onMarkPaid={(id: number) => markPaidMutation.mutate(id)}
          markPaidPending={markPaidMutation.isPending}
          s={s}
        />
      )}

      {/* ── Media Lab Tab ── */}
      {activeTab === "media-lab" && (
        <MediaLabTab
          items={mediaLab}
          isLoading={mediaLabLoading}
          s={s}
          isRTL={isRTL}
          onRefresh={() => qc.invalidateQueries({ queryKey: ["studio-media-lab"] })}
        />
      )}

      {/* ── Vault Tab ── */}
      {activeTab === "vault" && (
        <VaultTab
          vault={vault}
          isLoading={vaultLoading}
          isDesigner={isDesigner}
          isAdmin={isAdmin}
          s={s}
          onRefresh={() => qc.invalidateQueries({ queryKey: ["studio-vault"] })}
        />
      )}

      {/* ── All Missions Tab (Admin) ── */}
      {activeTab === "all-missions" && isAdmin && (
        <GlobalPipelineTab pipeline={pipeline} getStatusLabel={getStatusLabel} getTaskTypeLabel={getTaskTypeLabel} s={s} />
      )}

      {/* ── Create / Edit Mission Dialog ── */}
      <Dialog open={showCreate || !!editProject} onOpenChange={(o) => { if (!o) { setShowCreate(false); setEditProject(null); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-[#1B2E8F] flex items-center gap-2">
              <Zap size={18} className="text-[#F5A600]" />
              {editProject ? s.editProject : s.newMission}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Mission Title */}
            <div>
              <Label className="text-sm font-semibold">{s.projectTitle} *</Label>
              <Input
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                className="mt-1"
                placeholder={s.projectTitle}
              />
            </div>

            {/* Mission Brief */}
            <div>
              <Label className="text-sm font-semibold">{s.missionBrief}</Label>
              <Textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={3}
                className="mt-1"
                placeholder="Detailed instructions for the creator..."
              />
            </div>

            {/* Type + Reward */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm font-semibold">{s.taskTypeLabel}</Label>
                <Select value={form.taskType} onValueChange={v => setForm(f => ({ ...f, taskType: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["graphic_design", "video_editing", "photography", "copywriting", "social_media"].map(tt => (
                      <SelectItem key={tt} value={tt}>{(s.taskTypes as any)[tt]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-semibold">{s.missionRewardLabel}</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.budget}
                  onChange={e => setForm(f => ({ ...f, budget: e.target.value }))}
                  className="mt-1"
                  placeholder="0 د.ج"
                />
              </div>
            </div>

            {/* Deadline */}
            <div>
              <Label className="text-sm font-semibold">{s.deadline}</Label>
              <Input
                type="date"
                value={form.deadline}
                onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))}
                className="mt-1"
              />
            </div>

            {/* Assign Creator */}
            {isAdmin && assignees.length > 0 && (
              <div>
                <Label className="text-sm font-semibold">{s.assignTo}</Label>
                <Select value={form.assignedTo || "none"} onValueChange={v => setForm(f => ({ ...f, assignedTo: v === "none" ? "" : v }))}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder={s.unassigned} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{s.unassigned}</SelectItem>
                    {assignees.map(a => (
                      <SelectItem key={a.id} value={String(a.id)}>
                        {a.name} <span className="text-gray-400 capitalize">({a.role})</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <div className="flex gap-2 justify-end mt-4 pt-2 border-t">
            <Button variant="outline" onClick={() => { setShowCreate(false); setEditProject(null); }}>{s.cancel}</Button>
            <Button
              onClick={() => handleSave(!!editProject)}
              disabled={!form.title.trim() || createMutation.isPending || updateMutation.isPending}
              style={{ backgroundColor: "#1B2E8F" }}
              className="hover:bg-[#152370] text-white"
            >
              <Zap size={14} className="me-1.5 text-[#F5A600]" />
              {s.save}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirm Dialog ── */}
      <Dialog open={!!deleteProject} onOpenChange={o => { if (!o) setDeleteProject(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-red-600">{s.deleteProject}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">{s.deleteConfirm}</p>
          <div className="flex gap-2 justify-end mt-3">
            <Button variant="outline" onClick={() => setDeleteProject(null)}>{s.cancel}</Button>
            <Button
              variant="destructive"
              onClick={() => deleteProject && deleteMutation.mutate(deleteProject.id)}
              disabled={deleteMutation.isPending}
            >
              <Trash2 size={14} className="me-1.5" />
              {s.deleteProject}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Creative Task Dashboard ────────────────────────────────────────────────────

const CREATIVE_STATUS_TABS = [
  { key: "all",        labelAr: "الكل",           labelEn: "All" },
  { key: "todo",       labelAr: "للتنفيذ",         labelEn: "To Do" },
  { key: "in_progress",labelAr: "قيد التنفيذ",     labelEn: "In Progress" },
  { key: "review",     labelAr: "في المراجعة",     labelEn: "In Review" },
  { key: "approved",   labelAr: "معتمد",           labelEn: "Approved" },
  { key: "completed",  labelAr: "منشور",           labelEn: "Published" },
] as const;

function CreativeTaskDashboard({ projects, isLoading, isRTL, onStatusUpdate, statusPending, getStatusLabel, getTaskTypeLabel, s }: any) {
  const [filter, setFilter] = useState<string>("all");

  const filtered: Project[] = filter === "all"
    ? projects
    : projects.filter((p: Project) => p.status === filter);

  const todoCount = projects.filter((p: Project) => p.status === "todo").length;
  const inProgressCount = projects.filter((p: Project) => p.status === "in_progress").length;
  const reviewCount = projects.filter((p: Project) => p.status === "review").length;

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="font-semibold text-gray-800">{isRTL ? "مهامي" : "My Tasks"}</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {isRTL
              ? `${todoCount} للتنفيذ · ${inProgressCount} قيد التنفيذ · ${reviewCount} بانتظار المراجعة`
              : `${todoCount} to do · ${inProgressCount} in progress · ${reviewCount} in review`}
          </p>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1 mb-3">
        {CREATIVE_STATUS_TABS.map(tab => {
          const count = tab.key === "all"
            ? projects.length
            : projects.filter((p: Project) => p.status === tab.key).length;
          return (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                filter === tab.key
                  ? "bg-[#1B2E8F] text-white border-[#1B2E8F] shadow-sm"
                  : "bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              {isRTL ? tab.labelAr : tab.labelEn}
              <span className={`text-[10px] rounded-full px-1.5 py-0.5 min-w-[18px] text-center ${
                filter === tab.key ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Task List */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="animate-spin text-[#1B2E8F]" size={22} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="border-2 border-dashed border-gray-200 rounded-xl py-8 text-center text-gray-400">
          <Zap size={28} className="mx-auto mb-2 opacity-20" />
          <p className="text-sm">{isRTL ? "لا توجد مهام في هذه الفئة" : "No tasks in this category"}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((p: Project) => {
            const TaskIcon = TASK_TYPE_ICONS[p.taskType ?? ""] ?? Layers;
            const StatusIcon = STATUS_ICONS[p.status] ?? AlertCircle;
            const canStart = p.status === "todo";
            const canSubmit = p.status === "in_progress";
            const isOverdue = p.deadline && new Date(p.deadline) < new Date() && !["approved", "completed"].includes(p.status);

            return (
              <div
                key={p.id}
                className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-3 hover:border-[#1B2E8F]/20 hover:shadow-sm transition-all"
              >
                {/* Type icon */}
                <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${TASK_TYPE_COLORS[p.taskType ?? ""] ?? "bg-gray-100 text-gray-500 border-gray-200"} border`}>
                  <TaskIcon size={14} />
                </div>

                {/* Title + meta */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{p.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {p.taskType && (
                      <span className="text-[10px] text-gray-400">{getTaskTypeLabel(p.taskType)}</span>
                    )}
                    {p.deadline && (
                      <span className={`text-[10px] flex items-center gap-0.5 ${isOverdue ? "text-red-500" : "text-gray-400"}`}>
                        <Clock size={9} />
                        {new Date(p.deadline).toLocaleDateString(isRTL ? "ar-DZ" : "en-GB")}
                      </span>
                    )}
                  </div>
                </div>

                {/* Status badge */}
                <span className={`flex-shrink-0 flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg border font-medium ${STATUS_COLORS[p.status]}`}>
                  <StatusIcon size={10} />
                  {getStatusLabel(p.status)}
                </span>

                {/* Action button */}
                {canStart && (
                  <Button
                    size="sm"
                    onClick={() => onStatusUpdate(p.id, "in_progress")}
                    disabled={statusPending}
                    className="flex-shrink-0 h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white px-2.5"
                  >
                    {statusPending ? <Loader2 size={11} className="animate-spin" /> : (isRTL ? "ابدأ العمل" : "Start")}
                  </Button>
                )}
                {canSubmit && (
                  <Button
                    size="sm"
                    onClick={() => onStatusUpdate(p.id, "review")}
                    disabled={statusPending}
                    className="flex-shrink-0 h-7 text-xs bg-yellow-500 hover:bg-yellow-600 text-white px-2.5"
                  >
                    {statusPending ? <Loader2 size={11} className="animate-spin" /> : (isRTL ? "أرسل للمراجعة" : "Submit")}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Stat Card ─────────────────────────────────────────────────────────────────

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number | string; color: string }) {
  const colors: Record<string, string> = {
    blue: "bg-blue-50 border-blue-100",
    violet: "bg-violet-50 border-violet-100",
    yellow: "bg-yellow-50 border-yellow-100",
    amber: "bg-amber-50 border-amber-100",
  };
  return (
    <div className={`rounded-xl border p-4 ${colors[color] ?? "bg-gray-50 border-gray-100"}`}>
      <div className="flex items-center gap-2 mb-2">{icon}</div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-xs text-gray-500 mt-0.5">{label}</div>
    </div>
  );
}

// ── Pipeline Tab ──────────────────────────────────────────────────────────────

function PipelineTab({ projects, isLoading, isAdmin, assignees, viewMode, setViewMode, onNewTask, onEdit, onDelete, getStatusLabel, getTaskTypeLabel, s }: any) {
  const projectsByStatus = STATUS_ORDER.reduce((acc, st) => {
    acc[st] = projects.filter((p: Project) => p.status === st);
    return acc;
  }, {} as Record<string, Project[]>);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-semibold text-gray-800">{isAdmin ? s.allProjects : s.myMissions}</h2>
          <p className="text-xs text-gray-400 mt-0.5">{isAdmin ? s.globalPipelineSubtitle : s.engineSubtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode("kanban")}
            className={`p-1.5 rounded ${viewMode === "kanban" ? "bg-[#1B2E8F] text-white" : "text-gray-400 hover:bg-gray-100"}`}
          >
            <LayoutGrid size={16} />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`p-1.5 rounded ${viewMode === "list" ? "bg-[#1B2E8F] text-white" : "text-gray-400 hover:bg-gray-100"}`}
          >
            <List size={16} />
          </button>
          {isAdmin && (
            <Button size="sm" className="bg-[#F5A600] hover:bg-[#d48f00] text-[#1B2E8F] font-semibold ms-1" onClick={onNewTask}>
              <Plus size={14} className="me-1" />
              {s.newMission}
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin text-[#1B2E8F]" size={28} /></div>
      ) : projects.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Layers size={40} className="mx-auto mb-3 opacity-30" />
          <p>{s.noProjects}</p>
        </div>
      ) : viewMode === "kanban" ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {STATUS_ORDER.map(status => (
            <div key={status} className="bg-gray-50 rounded-xl p-3">
              <div className="flex items-center justify-between mb-3">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${STATUS_COLORS[status]}`}>
                  {getStatusLabel(status)}
                </span>
                <span className="text-xs text-gray-400">{projectsByStatus[status]?.length ?? 0}</span>
              </div>
              <div className="space-y-2">
                {(projectsByStatus[status] ?? []).map((p: Project) => (
                  <TaskCard key={p.id} project={p} isAdmin={isAdmin} onEdit={onEdit} onDelete={onDelete} getTaskTypeLabel={getTaskTypeLabel} s={s} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {projects.map((p: Project) => (
            <TaskRow key={p.id} project={p} isAdmin={isAdmin} onEdit={onEdit} onDelete={onDelete} getStatusLabel={getStatusLabel} getTaskTypeLabel={getTaskTypeLabel} s={s} />
          ))}
        </div>
      )}
    </div>
  );
}

function TaskCard({ project: p, isAdmin, onEdit, onDelete, getTaskTypeLabel, s }: any) {
  const TTypeIcon = TASK_TYPE_ICONS[p.taskType] ?? Layers;
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-1 mb-2">
        <Link href={`/studio/${p.id}`} className="text-sm font-medium text-gray-800 hover:text-[#1B2E8F] line-clamp-2 flex-1">{p.title}</Link>
        {isAdmin && (
          <div className="flex gap-1 shrink-0">
            <button onClick={() => onEdit(p)} className="p-0.5 text-gray-400 hover:text-[#1B2E8F]"><Pencil size={11} /></button>
            <button onClick={() => onDelete(p)} className="p-0.5 text-gray-400 hover:text-red-500"><Trash2 size={11} /></button>
          </div>
        )}
      </div>
      {p.taskType && (
        <div className={`flex items-center gap-1 text-xs px-1.5 py-0.5 rounded border w-fit mb-2 ${TASK_TYPE_COLORS[p.taskType] ?? ""}`}>
          <TTypeIcon size={10} />
          {getTaskTypeLabel(p.taskType)}
        </div>
      )}
      {p.budget && (
        <div className="text-xs text-gray-500 flex items-center gap-1">
          <Banknote size={10} />
          {p.budget.toLocaleString("fr-DZ")} د.ج
        </div>
      )}
      {p.assigneeName && <p className="text-xs text-gray-400 mt-1.5">{p.assigneeName}</p>}
      {p.deadline && (
        <p className="text-xs text-gray-400 flex items-center gap-0.5 mt-1">
          <Clock size={10} />
          {new Date(p.deadline).toLocaleDateString()}
        </p>
      )}
    </div>
  );
}

function TaskRow({ project: p, isAdmin, onEdit, onDelete, getStatusLabel, getTaskTypeLabel, s }: any) {
  const TTypeIcon = TASK_TYPE_ICONS[p.taskType] ?? Layers;
  return (
    <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-center gap-4 hover:border-[#1B2E8F]/20 transition-colors">
      <Link href={`/studio/${p.id}`} className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-gray-800 hover:text-[#1B2E8F] truncate">{p.title}</span>
          <Badge className={`text-xs border ${STATUS_COLORS[p.status] ?? ""}`} variant="outline">{getStatusLabel(p.status)}</Badge>
          {p.taskType && (
            <Badge className={`text-xs border ${TASK_TYPE_COLORS[p.taskType] ?? ""}`} variant="outline">
              <TTypeIcon size={10} className="me-1" />
              {getTaskTypeLabel(p.taskType)}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
          {p.assigneeName && <span>{p.assigneeName}</span>}
          {p.deadline && <span className="flex items-center gap-0.5"><Clock size={10} />{new Date(p.deadline).toLocaleDateString()}</span>}
          {p.budget && <span className="flex items-center gap-0.5"><Banknote size={10} />{p.budget.toLocaleString("fr-DZ")} د.ج</span>}
        </div>
      </Link>
      {isAdmin && (
        <div className="flex gap-1 shrink-0">
          <button onClick={() => onEdit(p)} className="p-1.5 rounded text-gray-400 hover:text-[#1B2E8F] hover:bg-blue-50"><Pencil size={14} /></button>
          <button onClick={() => onDelete(p)} className="p-1.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50"><Trash2 size={14} /></button>
        </div>
      )}
      <Link href={`/studio/${p.id}`}>
        <ChevronRight size={16} className="text-gray-300" />
      </Link>
    </div>
  );
}

// ── Portfolio Tab ─────────────────────────────────────────────────────────────

function PortfolioTab({ projects, s, getTaskTypeLabel }: any) {
  const approved = projects.filter((p: Project) => ["approved", "completed"].includes(p.status));
  const allFiles = approved.flatMap((p: Project) => p.files.map((f: any) => ({ ...f, projectTitle: p.title, projectId: p.id, taskType: p.taskType })));

  if (approved.length === 0) {
    return (
      <div className="text-center py-20 text-gray-400">
        <CheckCircle2 size={44} className="mx-auto mb-3 opacity-25" />
        <p className="font-medium">{s.portfolioTitle}</p>
        <p className="text-sm mt-1">{s.portfolioEmpty}</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="font-semibold text-gray-800 mb-4">{s.portfolioTitle} <span className="text-gray-400 text-sm font-normal">({approved.length})</span></h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {approved.map((p: Project) => (
          <Link key={p.id} href={`/studio/${p.id}`}>
            <div className="group rounded-xl border border-gray-200 overflow-hidden hover:border-[#1B2E8F]/40 hover:shadow-md transition-all bg-white">
              {p.files[0] && p.files[0].fileType === "image" ? (
                <div className="aspect-video bg-gray-100">
                  <img src={p.files[0].fileUrl} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                </div>
              ) : (
                <div className="aspect-video bg-gradient-to-br from-[#1B2E8F]/5 to-[#F5A600]/10 flex items-center justify-center">
                  {TASK_TYPE_ICONS[p.taskType ?? ""] ? (() => { const Icon = TASK_TYPE_ICONS[p.taskType ?? ""]; return <Icon size={32} className="text-[#1B2E8F]/30" />; })() : <ImageIcon size={32} className="text-gray-300" />}
                </div>
              )}
              <div className="p-3">
                <p className="text-sm font-medium text-gray-800 truncate">{p.title}</p>
                <div className="flex items-center justify-between mt-1.5">
                  <span className={`text-xs px-1.5 py-0.5 rounded border ${STATUS_COLORS[p.status]}`}>{(s.statuses as any)[p.status]}</span>
                  {p.taskType && <span className="text-xs text-gray-400">{getTaskTypeLabel(p.taskType)}</span>}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

// ── Earnings Tab ──────────────────────────────────────────────────────────────

function EarningsTab({ earnings, isAdmin, onMarkPaid, markPaidPending, s }: any) {
  if (!earnings) {
    return <div className="flex justify-center py-16"><Loader2 className="animate-spin text-[#1B2E8F]" size={24} /></div>;
  }

  const { projects, totalEarned, totalPaid, inWallet } = earnings as EarningsData;

  return (
    <div>
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-gradient-to-br from-[#1B2E8F] to-[#2541b2] rounded-xl p-4 text-white">
          <p className="text-xs text-blue-200 mb-1">{s.totalEarned}</p>
          <p className="text-xl font-bold">{fmtCurrency(totalEarned)}</p>
        </div>
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-1">{s.inWallet}</p>
          <p className="text-xl font-bold text-blue-700">{fmtCurrency(inWallet)}</p>
        </div>
        <div className="bg-green-50 border border-green-100 rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-1">{s.totalPaidOut}</p>
          <p className="text-xl font-bold text-green-700">{fmtCurrency(totalPaid)}</p>
        </div>
      </div>

      <h2 className="font-semibold text-gray-800 mb-3">{s.earningsTitle}</h2>

      {projects.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Wallet size={40} className="mx-auto mb-2 opacity-25" />
          <p>{s.earningsEmpty}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {projects.map((p: EarningProject) => {
            const TTypeIcon = TASK_TYPE_ICONS[p.taskType ?? ""] ?? Layers;
            const earningLabel = p.earningStatus === "in_wallet" ? s.earningStatusInWallet : p.earningStatus === "paid" ? s.earningStatusPaid : s.earningStatusPending;
            return (
              <div key={p.id} className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link href={`/studio/${p.id}`} className="font-medium text-gray-800 hover:text-[#1B2E8F]">{p.title}</Link>
                    {p.taskType && (
                      <span className={`text-xs px-1.5 py-0.5 rounded border flex items-center gap-1 ${TASK_TYPE_COLORS[p.taskType] ?? ""}`}>
                        <TTypeIcon size={10} />
                        {(s.taskTypes as any)[p.taskType] ?? p.taskType}
                      </span>
                    )}
                    {isAdmin && p.assigneeName && (
                      <span className="text-xs text-gray-400">{p.assigneeName}</span>
                    )}
                  </div>
                  {p.earningPaidAt && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      {s.markAsPaid}: {new Date(p.earningPaidAt).toLocaleDateString()}
                      {p.earningPaidByName && ` — ${p.earningPaidByName}`}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-bold text-gray-800">{fmtCurrency(p.budget)}</span>
                  <span className={`text-xs px-2 py-1 rounded-full border ${EARNING_STATUS_COLORS[p.earningStatus] ?? ""}`}>
                    {earningLabel}
                  </span>
                  {isAdmin && p.earningStatus === "in_wallet" && (
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700 text-white text-xs h-7"
                      onClick={() => onMarkPaid(p.id)}
                      disabled={markPaidPending}
                    >
                      <Banknote size={12} className="me-1" />
                      {s.markAsPaid}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Media Lab Tab ─────────────────────────────────────────────────────────────

function MediaLabTab({ items, isLoading, s, isRTL, onRefresh }: any) {
  const { data: me } = useGetMe();
  const { toast } = useToast();
  const qc = useQueryClient();
  const { uploadFile, isUploading: isUploadingPhoto, progress: photoProgress } = useMediaUpload();
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [showTalkShow, setShowTalkShow] = useState(false);
  const [talkShowForm, setTalkShowForm] = useState({ title: "", url: "", description: "" });

  const isAdmin = me?.role === "admin";
  const eventPhotos = (items as MediaLabItem[]).filter(i => i.category === "event_photo");
  const talkShows = (items as MediaLabItem[]).filter(i => i.category === "talk_show");

  const postMediaLab = async (body: any) => {
    const res = await fetch("/api/studio/media-lab", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || "Upload failed"); }
    return res.json();
  };

  const deleteMediaLabItem = async (id: number) => {
    const res = await fetch(`/api/studio/media-lab/${id}`, { method: "DELETE", credentials: "include" });
    if (!res.ok) throw new Error("Delete failed");
    return res.json();
  };

  const addPhotoMutation = useMutation({
    mutationFn: (data: any) => postMediaLab(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["studio-media-lab"] });
      toast({ title: s.photoUploaded });
    },
    onError: (e: any) => toast({ title: e.message, variant: "destructive" }),
  });

  const addTalkShowMutation = useMutation({
    mutationFn: (data: any) => postMediaLab(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["studio-media-lab"] });
      toast({ title: s.talkShowAdded });
      setShowTalkShow(false);
      setTalkShowForm({ title: "", url: "", description: "" });
    },
    onError: (e: any) => toast({ title: e.message, variant: "destructive" }),
  });

  const deleteItemMutation = useMutation({
    mutationFn: (id: number) => deleteMediaLabItem(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["studio-media-lab"] });
      toast({ title: s.mediaItemDeleted });
    },
    onError: (e: any) => toast({ title: e.message, variant: "destructive" }),
  });

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const result = await uploadFile(file);
    if (result) {
      await addPhotoMutation.mutateAsync({
        title: file.name.replace(/\.[^/.]+$/, "") || "Event Photo",
        fileUrl: result.url,
        fileType: "image",
        category: "event_photo",
      });
    }
    if (photoInputRef.current) photoInputRef.current.value = "";
  }

  function handleAddTalkShow() {
    if (!talkShowForm.title.trim() || !talkShowForm.url.trim()) return;
    addTalkShowMutation.mutate({
      title: talkShowForm.title.trim(),
      description: talkShowForm.description || null,
      fileUrl: talkShowForm.url.trim(),
      fileType: "video",
      category: "talk_show",
    });
  }

  if (isLoading) return <div className="flex justify-center py-16"><Loader2 className="animate-spin text-[#1B2E8F]" size={24} /></div>;

  return (
    <div className="space-y-8">

      {/* ── Event Photos ── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center">
              <Camera size={18} className="text-amber-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-800">{s.eventPhotos}</h2>
              <p className="text-xs text-gray-400">{s.eventPhotosSubtitle}</p>
            </div>
          </div>
          <div>
            <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
            <Button
              size="sm"
              onClick={() => photoInputRef.current?.click()}
              disabled={isUploadingPhoto || addPhotoMutation.isPending}
              style={{ backgroundColor: "#F5A600" }}
              className="text-[#1B2E8F] font-semibold hover:opacity-90"
            >
              {isUploadingPhoto ? (
                <><Loader2 size={14} className="me-1.5 animate-spin" />{photoProgress}%</>
              ) : (
                <><Upload size={14} className="me-1.5" />{s.uploadEventPhoto}</>
              )}
            </Button>
          </div>
        </div>

        {eventPhotos.length === 0 ? (
          <div className="border-2 border-dashed border-gray-200 rounded-xl py-12 text-center text-gray-400">
            <Camera size={36} className="mx-auto mb-2 opacity-25" />
            <p className="text-sm">{s.eventPhotosEmpty}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {eventPhotos.map((item: MediaLabItem) => (
              <div key={item.id} className="group relative rounded-xl overflow-hidden border border-gray-200 bg-gray-50 aspect-square">
                <img
                  src={item.fileUrl}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={e => { (e.target as HTMLImageElement).src = ""; }}
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                  <a
                    href={item.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-full bg-white/20 text-white hover:bg-white/30"
                    title={s.downloadAsset}
                  >
                    <Download size={14} />
                  </a>
                  {(isAdmin || item.uploadedBy === me?.id) && (
                    <button
                      onClick={() => deleteItemMutation.mutate(item.id)}
                      className="p-2 rounded-full bg-red-500/80 text-white hover:bg-red-600"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 p-2">
                  <p className="text-white text-[10px] truncate">{item.title}</p>
                  {item.uploaderName && <p className="text-white/60 text-[9px]">{item.uploaderName}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Talk Show Portal ── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#1B2E8F" }}>
              <Tv2 size={18} className="text-[#F5A600]" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-800">{s.talkShowPortal}</h2>
              <p className="text-xs text-gray-400">{s.talkShowPortalSubtitle}</p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => setShowTalkShow(true)}
            className="bg-[#1B2E8F] hover:bg-[#152370] text-white"
          >
            <Plus size={14} className="me-1.5" />
            {s.addTalkShow}
          </Button>
        </div>

        {talkShows.length === 0 ? (
          <div className="border-2 border-dashed border-[#1B2E8F]/20 rounded-xl py-12 text-center text-gray-400" style={{ background: "linear-gradient(135deg, #f0f4ff 0%, #fff7e6 100%)" }}>
            <Tv2 size={36} className="mx-auto mb-2 opacity-25 text-[#1B2E8F]" />
            <p className="text-sm font-medium text-[#1B2E8F]/60">{s.talkShowEmpty}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {talkShows.map((item: MediaLabItem) => (
              <div key={item.id} className="group bg-white border border-gray-200 rounded-xl overflow-hidden hover:border-[#1B2E8F]/30 hover:shadow-md transition-all">
                <div className="aspect-video bg-gradient-to-br from-[#1B2E8F] to-[#2541b2] flex items-center justify-center relative">
                  <Tv2 size={36} className="text-[#F5A600] opacity-80" />
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <a
                      href={item.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F5A600] text-[#1B2E8F] text-xs font-bold"
                    >
                      <Globe size={13} />
                      {s.viewFile}
                    </a>
                    {(isAdmin) && (
                      <button
                        onClick={() => deleteItemMutation.mutate(item.id)}
                        className="p-1.5 rounded-lg bg-red-500 text-white hover:bg-red-600"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
                <div className="p-3">
                  <p className="font-semibold text-gray-900 truncate">{item.title}</p>
                  {item.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{item.description}</p>}
                  <div className="flex items-center justify-between mt-2">
                    {item.uploaderName && <span className="text-[10px] text-gray-400">{item.uploaderName}</span>}
                    <a
                      href={item.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-[#1B2E8F] hover:underline flex items-center gap-0.5"
                    >
                      <LinkIcon size={10} />
                      {item.fileUrl.length > 30 ? item.fileUrl.substring(0, 30) + "…" : item.fileUrl}
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Add Talk Show Dialog ── */}
      <Dialog open={showTalkShow} onOpenChange={o => { if (!o) setShowTalkShow(false); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-[#1B2E8F] flex items-center gap-2">
              <Tv2 size={16} className="text-[#F5A600]" />
              {s.addTalkShow}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-sm font-semibold">{s.talkShowTitle} *</Label>
              <Input
                value={talkShowForm.title}
                onChange={e => setTalkShowForm(f => ({ ...f, title: e.target.value }))}
                className="mt-1"
                placeholder="Kidspeak Talk Show — Episode 1"
              />
            </div>
            <div>
              <Label className="text-sm font-semibold">{s.talkShowUrl} *</Label>
              <Input
                value={talkShowForm.url}
                onChange={e => setTalkShowForm(f => ({ ...f, url: e.target.value }))}
                className="mt-1"
                placeholder="https://www.youtube.com/watch?v=..."
              />
            </div>
            <div>
              <Label className="text-sm">{s.description}</Label>
              <Textarea
                value={talkShowForm.description}
                onChange={e => setTalkShowForm(f => ({ ...f, description: e.target.value }))}
                rows={2}
                className="mt-1"
                placeholder="Brief description of the episode..."
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end mt-3">
            <Button variant="outline" onClick={() => setShowTalkShow(false)}>{s.cancel}</Button>
            <Button
              onClick={handleAddTalkShow}
              disabled={!talkShowForm.title.trim() || !talkShowForm.url.trim() || addTalkShowMutation.isPending}
              className="bg-[#1B2E8F] hover:bg-[#152370] text-white"
            >
              {s.save}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Vault Tab ─────────────────────────────────────────────────────────────────

function VaultTab({ vault, isLoading, isDesigner, isAdmin, s, onRefresh }: any) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { uploadFile, isUploading, progress } = useMediaUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadForm, setUploadForm] = useState({ title: "", description: "", category: "other" });
  const [pendingFile, setPendingFile] = useState<{ url: string; type: string } | null>(null);

  const canUploadVault = isAdmin || isDesigner;

  const uploadVaultMutation = useMutation({
    mutationFn: (data: any) => apiFetch("/api/studio/vault", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["studio-vault"] });
      toast({ title: s.assetUploaded });
      setShowUpload(false);
      setUploadForm({ title: "", description: "", category: "other" });
      setPendingFile(null);
    },
    onError: (e: any) => toast({ title: e.message, variant: "destructive" }),
  });

  const deleteVaultMutation = useMutation({
    mutationFn: (id: number) => apiFetch(`/api/studio/vault/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["studio-vault"] });
      toast({ title: s.assetDeleted });
    },
    onError: (e: any) => toast({ title: e.message, variant: "destructive" }),
  });

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const result = await uploadFile(file);
    if (result) {
      const fileType = file.type.startsWith("image/") ? "image" : "pdf";
      setPendingFile({ url: result.url, type: fileType });
      if (!uploadForm.title) setUploadForm(f => ({ ...f, title: file.name.replace(/\.[^/.]+$/, "") }));
      setShowUpload(true);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleSaveVault() {
    if (!uploadForm.title.trim() || !pendingFile) return;
    uploadVaultMutation.mutate({
      title: uploadForm.title,
      description: uploadForm.description || null,
      fileUrl: pendingFile.url,
      fileType: pendingFile.type,
      category: uploadForm.category,
    });
  }

  if (isLoading) return <div className="flex justify-center py-16"><Loader2 className="animate-spin text-[#1B2E8F]" size={24} /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-semibold text-gray-800">{s.vaultTitle}</h2>
          <p className="text-xs text-gray-400">{s.vaultDesignerNote}</p>
        </div>
        <div className="flex items-center gap-2">
          {!canUploadVault && (
            <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-1 rounded-lg">
              {s.vaultDesignerOnlyUpload}
            </span>
          )}
          {canUploadVault && (
            <>
              <input ref={fileInputRef} type="file" accept="image/*,.pdf" className="hidden" onChange={handleFileChange} />
              <Button
                size="sm"
                className="bg-[#1B2E8F] hover:bg-[#152370]"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                {isUploading ? (
                  <><Loader2 size={14} className="me-1.5 animate-spin" />{progress}%</>
                ) : (
                  <><Upload size={14} className="me-1.5" />{s.uploadToVault}</>
                )}
              </Button>
            </>
          )}
        </div>
      </div>

      {vault.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Layers size={40} className="mx-auto mb-2 opacity-25" />
          <p>{s.vaultEmpty}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {vault.map((item: VaultItem) => (
            <VaultCard key={item.id} item={item} isAdmin={isAdmin} onDelete={() => deleteVaultMutation.mutate(item.id)} s={s} />
          ))}
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog open={showUpload} onOpenChange={o => { if (!o) { setShowUpload(false); setPendingFile(null); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-[#1B2E8F]">{s.uploadToVault}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-sm">{s.projectTitle} *</Label>
              <Input value={uploadForm.title} onChange={e => setUploadForm(f => ({ ...f, title: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label className="text-sm">{s.description}</Label>
              <Textarea value={uploadForm.description} onChange={e => setUploadForm(f => ({ ...f, description: e.target.value }))} rows={2} className="mt-1" />
            </div>
            <div>
              <Label className="text-sm">{s.vaultCategory}</Label>
              <Select value={uploadForm.category} onValueChange={v => setUploadForm(f => ({ ...f, category: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {VAULT_CATEGORIES.map(c => (
                    <SelectItem key={c} value={c}>{(s.vaultCategories as any)[c] ?? c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2 justify-end mt-3">
            <Button variant="outline" onClick={() => { setShowUpload(false); setPendingFile(null); }}>{s.cancel}</Button>
            <Button
              onClick={handleSaveVault}
              disabled={!uploadForm.title.trim() || uploadVaultMutation.isPending}
              className="bg-[#1B2E8F] hover:bg-[#152370]"
            >
              {s.save}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function VaultCard({ item, isAdmin, onDelete, s }: { item: VaultItem; isAdmin: boolean; onDelete: () => void; s: any }) {
  const isImage = item.fileType === "image" || item.fileUrl.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i);
  return (
    <div className="group bg-white border border-gray-200 rounded-xl overflow-hidden hover:border-[#1B2E8F]/30 hover:shadow-md transition-all">
      <div className="aspect-square relative">
        {isImage ? (
          <img src={item.fileUrl} alt={item.title} className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-50">
            <FileImage size={32} className="text-gray-300" />
          </div>
        )}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <a href={item.fileUrl} target="_blank" rel="noopener noreferrer" className="p-2 rounded-full bg-white/20 text-white hover:bg-white/30" title={s.downloadAsset}>
            <Download size={14} />
          </a>
          {isAdmin && (
            <button onClick={onDelete} className="p-2 rounded-full bg-red-500/80 text-white hover:bg-red-600" title={s.deleteAsset}>
              <Trash2 size={14} />
            </button>
          )}
        </div>
        {item.category && item.category !== "other" && (
          <div className="absolute top-1.5 start-1.5">
            <span className="text-[10px] bg-white/90 px-1.5 py-0.5 rounded-full text-gray-600 border border-gray-200">
              {(s.vaultCategories as any)[item.category] ?? item.category}
            </span>
          </div>
        )}
      </div>
      <div className="p-2.5">
        <p className="text-xs font-medium text-gray-800 truncate">{item.title}</p>
        {item.uploaderName && <p className="text-[10px] text-gray-400 mt-0.5">{item.uploaderName}</p>}
      </div>
    </div>
  );
}

// ── Global Pipeline Tab (Admin) ───────────────────────────────────────────────

function GlobalPipelineTab({ pipeline, getStatusLabel, getTaskTypeLabel, s }: any) {
  if (pipeline.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <Users size={40} className="mx-auto mb-2 opacity-25" />
        <p>{s.noAssignedStaff}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <h2 className="font-semibold text-gray-800">{s.globalPipelineTitle}</h2>
        <p className="text-xs text-gray-400">{s.globalPipelineSubtitle}</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {pipeline.map((staff: PipelineStaff) => {
          const activeTasks = staff.tasks.filter(t => !["completed", "approved"].includes(t.status));
          const doneTasks = staff.tasks.filter(t => ["completed", "approved"].includes(t.status));
          return (
            <div key={staff.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-semibold text-gray-900">{staff.name}</p>
                  <p className="text-xs text-gray-400 capitalize">{staff.role}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-100">
                    {activeTasks.length} active
                  </span>
                  <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full border border-green-100">
                    {doneTasks.length} done
                  </span>
                </div>
              </div>
              {staff.tasks.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-3">{s.noProjects}</p>
              ) : (
                <div className="space-y-1.5">
                  {staff.tasks.map((task: any) => {
                    const TTypeIcon = TASK_TYPE_ICONS[task.taskType] ?? Layers;
                    return (
                      <Link key={task.id} href={`/studio/${task.id}`}>
                        <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 group">
                          <TTypeIcon size={12} className="text-gray-400 shrink-0" />
                          <span className="text-sm text-gray-700 group-hover:text-[#1B2E8F] flex-1 truncate">{task.title}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded border shrink-0 ${STATUS_COLORS[task.status] ?? ""}`}>
                            {getStatusLabel(task.status)}
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

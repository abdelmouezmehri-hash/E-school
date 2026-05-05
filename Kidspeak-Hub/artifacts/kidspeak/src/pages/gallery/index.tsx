import { useState, useCallback, useEffect } from "react";
import { useLanguage } from "@/contexts/language-context";
import { useGetMe } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Image, Video, Mic2, X, Trash2, Expand, Play, Plus,
  Download, Share2, Crown, Sparkles, Filter, LayoutGrid,
  ExternalLink, Bell,
} from "lucide-react";
import { format } from "date-fns";

function safeFmt(dateStr: string | null | undefined, fmt: string): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return String(dateStr);
  return format(d, fmt);
}
import { getVideoEmbedUrl } from "@/hooks/use-media-upload";
import MediaUploadDialog from "./upload-dialog";
import { Link } from "wouter";

interface MediaItem {
  id: number;
  type: "photo" | "video";
  category: "group" | "private" | "talkshow" | "teacher_broadcast" | "global";
  url: string;
  thumbnailUrl?: string | null;
  description?: string | null;
  studentId?: number | null;
  groupId?: number | null;
  uploadedBy?: number | null;
  uploaderName?: string;
  createdAt: string;
}

const BRAND_BLUE = "#1B2E8F";
const BRAND_YELLOW = "#F5A600";

/* ─────────── Lightbox ─────────── */
function Lightbox({ src, alt, onClose }: { src: string; alt?: string; onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center" onClick={onClose}>
      <button className="absolute top-4 end-4 text-white/80 hover:text-white" onClick={onClose}>
        <X className="w-8 h-8" />
      </button>
      <img
        src={src}
        alt={alt ?? "Full size"}
        className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg shadow-2xl"
        onClick={e => e.stopPropagation()}
      />
      {alt && <p className="mt-4 text-white/70 text-sm max-w-lg text-center px-4">{alt}</p>}
    </div>
  );
}

/* ─────────── Video Player ─────────── */
function VideoPlayer({ url, title }: { url: string; title?: string }) {
  const embedUrl = getVideoEmbedUrl(url);
  if (embedUrl) {
    return (
      <iframe
        src={embedUrl}
        title={title ?? "Video"}
        className="w-full aspect-video rounded-xl"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    );
  }
  return <video controls src={url} className="w-full aspect-video rounded-xl bg-black" />;
}

/* ─────────── Share / Download helpers ─────────── */
function ShareButton({ url, gt }: { url: string; gt: any }) {
  const { toast } = useToast();
  const isEmbed = !!getVideoEmbedUrl(url);

  if (isEmbed) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer">
        <button
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all hover:opacity-90"
          style={{ background: "rgba(255,255,255,0.18)" }}
        >
          <ExternalLink className="w-3.5 h-3.5" />
          {gt.openVideo}
        </button>
      </a>
    );
  }

  function handleCopy() {
    navigator.clipboard.writeText(url).then(() => {
      toast({ title: gt.linkCopied });
    }).catch(() => {});
  }

  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={handleCopy}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all hover:opacity-90"
        style={{ background: "rgba(255,255,255,0.18)" }}
      >
        <Share2 className="w-3.5 h-3.5" />
        {gt.shareLink}
      </button>
      <a href={url} download>
        <button
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all hover:opacity-90"
          style={{ background: "rgba(245,166,0,0.3)", border: "1px solid rgba(245,166,0,0.5)" }}
        >
          <Download className="w-3.5 h-3.5" />
          {gt.download}
        </button>
      </a>
    </div>
  );
}

/* ─────────── Photo Grid ─────────── */
function PhotoGrid({
  items, canDelete, onDelete, gt,
}: { items: MediaItem[]; canDelete: boolean; onDelete: (id: number) => void; gt: any }) {
  const [lightbox, setLightbox] = useState<MediaItem | null>(null);

  if (items.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground border rounded-xl bg-card/50">
        <Image className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p>{gt.noPhotos}</p>
      </div>
    );
  }

  return (
    <>
      {lightbox && (
        <Lightbox
          src={lightbox.url}
          alt={lightbox.description ?? undefined}
          onClose={() => setLightbox(null)}
        />
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {items.map(item => (
          <div key={item.id} className="group relative aspect-square rounded-xl overflow-hidden bg-muted shadow-sm hover:shadow-md transition-shadow">
            <img
              src={item.url}
              alt={item.description ?? "Photo"}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/45 transition-all flex flex-col justify-between p-2 opacity-0 group-hover:opacity-100">
              <div className="flex justify-end gap-1">
                <button
                  onClick={() => setLightbox(item)}
                  className="p-1.5 bg-white/20 hover:bg-white/40 rounded-lg text-white backdrop-blur-sm"
                  title={gt.viewFull}
                >
                  <Expand className="w-3.5 h-3.5" />
                </button>
                {canDelete && (
                  <button
                    onClick={() => onDelete(item.id)}
                    className="p-1.5 bg-red-500/70 hover:bg-red-600/90 rounded-lg text-white backdrop-blur-sm"
                    title={gt.deleteMedia}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              {item.description && (
                <p
                  dir="auto"
                  className="text-xs text-white font-medium line-clamp-2 bg-black/40 rounded px-1.5 py-1 backdrop-blur-sm"
                >
                  {item.description}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

/* ─────────── Video Grid ─────────── */
function VideoGrid({
  items, canDelete, onDelete, gt,
}: { items: MediaItem[]; canDelete: boolean; onDelete: (id: number) => void; gt: any }) {
  const [playing, setPlaying] = useState<number | null>(null);

  if (items.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground border rounded-xl bg-card/50">
        <Video className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p>{gt.noVideos}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map(item => (
        <div key={item.id} className="rounded-xl overflow-hidden border bg-card shadow-sm hover:shadow-md transition-shadow">
          {playing === item.id ? (
            <VideoPlayer url={item.url} title={item.description ?? undefined} />
          ) : (
            <div
              className="relative aspect-video bg-gradient-to-br from-slate-800 to-slate-900 cursor-pointer group"
              onClick={() => setPlaying(item.id)}
            >
              {item.thumbnailUrl ? (
                <img src={item.thumbnailUrl} className="w-full h-full object-cover" alt="" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Video className="w-10 h-10 text-slate-400" />
                </div>
              )}
              <div className="absolute inset-0 flex items-center justify-center group-hover:bg-black/20 transition-all">
                <div className="w-12 h-12 rounded-full bg-white/20 group-hover:bg-white/40 flex items-center justify-center backdrop-blur-sm transition-all">
                  <Play className="w-5 h-5 text-white ms-0.5" />
                </div>
              </div>
            </div>
          )}
          <div className="p-3 flex justify-between items-start gap-2">
            <div className="min-w-0 flex-1">
              {item.description && (
                <p dir="auto" className="text-sm font-medium truncate">{item.description}</p>
              )}
              <p className="text-xs text-muted-foreground mt-0.5">
                {safeFmt(item.createdAt, "MMM d, yyyy")}
              </p>
            </div>
            {canDelete && (
              <button
                onClick={() => onDelete(item.id)}
                className="p-1.5 rounded-lg hover:bg-red-50 hover:text-red-600 text-muted-foreground transition-colors shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─────────── Talk Show Section — PREMIUM ─────────── */
function TalkShowSection({
  items, canDelete, onDelete, gt,
}: { items: MediaItem[]; canDelete: boolean; onDelete: (id: number) => void; gt: any }) {
  if (items.length === 0) {
    return (
      <div className="space-y-4">
        {/* Premium empty state */}
        <div
          className="rounded-2xl p-8 text-center"
          style={{ background: "linear-gradient(135deg, #1B2E8F 0%, #0f1f6e 100%)" }}
        >
          <Crown className="w-12 h-12 mx-auto mb-3 text-yellow-400" />
          <p className="text-yellow-400 font-bold text-lg">{gt.premiumBadge}</p>
          <p className="text-white/60 text-sm mt-1">{gt.premiumTagline}</p>
          <p className="text-white/40 text-sm mt-4">{gt.noTalkShow}</p>
        </div>
      </div>
    );
  }

  const featured = items[0];
  const rest = items.slice(1);

  return (
    <div className="space-y-6">
      {/* Premium header banner */}
      <div
        className="rounded-2xl px-6 py-4 flex items-center justify-between"
        style={{ background: "linear-gradient(135deg, #1B2E8F 0%, #0f1f6e 100%)", border: "1px solid rgba(245,166,0,0.25)" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(245,166,0,0.2)" }}
          >
            <Crown className="w-5 h-5 text-yellow-400" />
          </div>
          <div>
            <p className="font-black text-yellow-400 tracking-wide uppercase text-sm">{gt.premiumBadge}</p>
            <p className="text-white/60 text-xs">{gt.premiumTagline}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-yellow-400" />
          <span className="text-yellow-400 font-bold text-sm">{items.length}</span>
        </div>
      </div>

      {/* Featured episode */}
      <div
        className="rounded-2xl overflow-hidden shadow-xl"
        style={{ background: "linear-gradient(160deg, #08112b 0%, #1B2E8F 55%, #0f1e5c 100%)" }}
      >
        {/* Featured label bar */}
        <div className="px-5 pt-4 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-yellow-400" />
            <span
              className="text-xs font-black uppercase tracking-widest"
              style={{ color: BRAND_YELLOW }}
            >
              {gt.featured}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ShareButton url={featured.url} gt={gt} />
            {canDelete && (
              <button
                onClick={() => onDelete(featured.id)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Video player */}
        <div className="px-5">
          <VideoPlayer url={featured.url} title={featured.description ?? "Talk Show"} />
        </div>

        {/* Caption */}
        {featured.description && (
          <div className="px-5 pb-5 pt-4">
            <p dir="auto" className="text-white font-semibold text-base">{featured.description}</p>
            <p className="text-white/40 text-xs mt-1">{safeFmt(featured.createdAt, "MMMM d, yyyy")}</p>
          </div>
        )}
      </div>

      {/* Rest of episodes */}
      {rest.length > 0 && (
        <>
          <h3 className="font-bold text-sm text-muted-foreground uppercase tracking-wider">
            {gt.talkShow} — {rest.length > 0 ? `+${rest.length}` : ""}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {rest.map(item => (
              <div
                key={item.id}
                className="rounded-xl overflow-hidden border shadow-sm hover:shadow-md transition-shadow"
                style={{ borderColor: "rgba(27,46,143,0.2)" }}
              >
                <VideoPlayer url={item.url} title={item.description ?? undefined} />
                <div
                  className="p-3 flex justify-between items-start"
                  style={{ background: "linear-gradient(135deg, #1B2E8F08, transparent)" }}
                >
                  <div className="flex-1 min-w-0">
                    {item.description && (
                      <p dir="auto" className="text-sm font-semibold truncate">{item.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {safeFmt(item.createdAt, "MMM d, yyyy")}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 ms-2 shrink-0">
                    <ShareButton url={item.url} gt={gt} />
                    {canDelete && (
                      <button
                        onClick={() => onDelete(item.id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 hover:text-red-600 text-muted-foreground"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ─────────── Admin Management Panel ─────────── */
function AdminManagementPanel({
  items, onDelete, gt,
}: { items: MediaItem[]; onDelete: (id: number) => void; gt: any }) {
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [catFilter, setCatFilter] = useState<string>("all");

  const filtered = items.filter(m => {
    if (typeFilter === "photo" && m.type !== "photo") return false;
    if (typeFilter === "video" && m.type !== "video") return false;
    if (catFilter !== "all" && m.category !== catFilter) return false;
    return true;
  });

  const photos = items.filter(m => m.type === "photo").length;
  const videos = items.filter(m => m.type === "video").length;
  const talkshow = items.filter(m => m.category === "talkshow").length;
  const [lightbox, setLightbox] = useState<MediaItem | null>(null);

  return (
    <div className="space-y-5">
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: gt.photos, value: photos, icon: Image, color: "#1B2E8F" },
          { label: gt.videos, value: videos, icon: Video, color: "#7c3aed" },
          { label: gt.talkShow, value: talkshow, icon: Mic2, color: "#F5A600" },
        ].map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="rounded-xl border bg-card p-4 text-center">
              <Icon className="w-5 h-5 mx-auto mb-1.5" style={{ color: s.color }} />
              <div className="text-xl font-black" style={{ color: s.color }}>{s.value}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
            </div>
          );
        })}
      </div>

      {/* Filter toolbar */}
      <div className="flex flex-wrap gap-2 items-center">
        <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
        <div className="flex gap-1 p-1 rounded-xl bg-muted">
          {[
            { key: "all", label: gt.filterAll },
            { key: "photo", label: gt.filterPhotos },
            { key: "video", label: gt.filterVideos },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setTypeFilter(f.key)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                typeFilter === f.key ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex gap-1 p-1 rounded-xl bg-muted">
          {[
            { key: "all", label: gt.filterAll },
            { key: "group", label: gt.groupMedia },
            { key: "private", label: gt.privateMedia },
            { key: "talkshow", label: gt.filterTalkShow },
            { key: "teacher_broadcast", label: gt.filterBroadcast },
            { key: "global", label: gt.filterGlobal },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setCatFilter(f.key)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                catFilter === f.key ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <span className="text-xs text-muted-foreground ms-auto">
          {filtered.length} {gt.totalItems}
        </span>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <Lightbox src={lightbox.url} alt={lightbox.description ?? undefined} onClose={() => setLightbox(null)} />
      )}

      {/* Items grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border rounded-xl bg-card/50">
          <LayoutGrid className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">{gt.noMedia}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map(item => (
            <div key={item.id} className="rounded-xl overflow-hidden border bg-card shadow-sm group">
              {/* Thumbnail */}
              {item.type === "photo" ? (
                <div
                  className="aspect-square overflow-hidden cursor-pointer"
                  onClick={() => setLightbox(item)}
                >
                  <img
                    src={item.url}
                    alt={item.description ?? ""}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                </div>
              ) : (
                <div className="aspect-video bg-slate-800 flex items-center justify-center relative">
                  {item.thumbnailUrl ? (
                    <img src={item.thumbnailUrl} className="w-full h-full object-cover" alt="" />
                  ) : (
                    <Video className="w-8 h-8 text-slate-400" />
                  )}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                      <Play className="w-4 h-4 text-white ms-0.5" />
                    </div>
                  </div>
                </div>
              )}
              {/* Meta */}
              <div className="p-2.5">
                {item.description && (
                  <p dir="auto" className="text-xs font-medium truncate">{item.description}</p>
                )}
                <div className="flex items-center justify-between mt-1 gap-1">
                  <div className="flex items-center gap-1 min-w-0">
                    <Badge variant="outline" className="text-xs px-1.5 py-0 shrink-0">
                      {item.category === "group" ? "G" : item.category === "private" ? "P" : item.category === "talkshow" ? "TS" : item.category === "teacher_broadcast" ? "TB" : "ALL"}
                    </Badge>
                    {item.uploaderName && (
                      <span className="text-xs text-muted-foreground truncate">{item.uploaderName}</span>
                    )}
                  </div>
                  <button
                    onClick={() => onDelete(item.id)}
                    className="p-1 rounded hover:bg-red-50 hover:text-red-600 text-muted-foreground transition-colors shrink-0"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {safeFmt(item.createdAt, "MMM d")}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────── Main Gallery Page ─────────── */
export default function GalleryPage() {
  const { t, isRTL } = useLanguage();
  const gt = t.gallery;
  const { data: user } = useGetMe();
  const { toast } = useToast();

  const role = (user as any)?.role;
  const isTeacherOrAdmin = role === "admin" || role === "teacher";
  const isAdmin = role === "admin";
  const canDelete = isTeacherOrAdmin;

  const [activeTab, setActiveTab] = useState(isAdmin ? "management" : "photos");
  const [showUpload, setShowUpload] = useState(false);
  const [allMedia, setAllMedia] = useState<MediaItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [newCount, setNewCount] = useState(0);

  const loadMedia = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/media", { credentials: "include" });
      if (res.ok) setAllMedia(await res.json());
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadMedia(); }, [loadMedia]);

  // Fetch new media count for parent notification banner
  useEffect(() => {
    if (role !== "parent") return;
    fetch("/api/media/new-count", { credentials: "include" })
      .then(r => r.ok ? r.json() : { count: 0 })
      .then(d => setNewCount(d.count ?? 0))
      .catch(() => {});
  }, [role]);

  const photos = allMedia.filter(m => m.type === "photo");
  const videos = allMedia.filter(m => m.type === "video" && m.category !== "talkshow");
  const talkShow = allMedia.filter(m => m.category === "talkshow");

  const handleDelete = async (id: number) => {
    if (!confirm(gt.confirmDelete)) return;
    const res = await fetch(`/api/media/${id}`, { method: "DELETE", credentials: "include" });
    if (res.ok) {
      setAllMedia(prev => prev.filter(i => i.id !== id));
      toast({ title: gt.deleteMedia });
    }
  };

  const handleUploadSuccess = () => {
    setShowUpload(false);
    loadMedia();
    // Reset the new count after parent views the gallery
    if (role === "parent") setNewCount(0);
  };

  // Tabs config based on role
  const tabs = [
    ...(isAdmin ? [{ key: "management", label: gt.managementTitle, icon: LayoutGrid }] : []),
    { key: "photos", label: gt.photos, icon: Image },
    { key: "videos", label: gt.videos, icon: Video },
    { key: "talkshow", label: gt.talkShow, icon: Mic2 },
  ];

  return (
    <div className="space-y-6" dir={isRTL ? "rtl" : "ltr"}>
      {/* Parent: New media notification banner */}
      {role === "parent" && newCount > 0 && (
        <div
          className="rounded-xl p-4 flex items-center gap-3"
          style={{ background: "linear-gradient(135deg, #1B2E8F08, #F5A60012)", border: "1.5px solid #F5A60035" }}
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 relative"
            style={{ background: "#F5A60020" }}
          >
            <Bell className="w-5 h-5" style={{ color: BRAND_YELLOW }} />
            <span
              className="absolute -top-1.5 -end-1.5 w-5 h-5 rounded-full flex items-center justify-center text-white font-black"
              style={{ background: "#ef4444", fontSize: "10px" }}
            >
              {newCount > 9 ? "9+" : newCount}
            </span>
          </div>
          <div className="flex-1">
            <p className="font-bold text-sm" style={{ color: BRAND_BLUE }}>{gt.newMedia}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{gt.newMediaDesc}</p>
          </div>
          <Button
            size="sm"
            className="text-white shrink-0"
            style={{ background: BRAND_BLUE }}
            onClick={() => { setActiveTab("photos"); setNewCount(0); }}
          >
            {gt.viewGallery}
          </Button>
        </div>
      )}

      {/* Header */}
      <div
        className="rounded-2xl overflow-hidden shadow-md"
        style={{ background: `linear-gradient(135deg, ${BRAND_BLUE} 0%, #0f1f6e 100%)` }}
      >
        <div className="px-6 py-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img
              src="/logo_white.png"
              alt="Kidspeak"
              className="h-9 w-auto object-contain"
            />
            <div>
              <h1 className="text-white font-black text-lg leading-tight">{gt.title}</h1>
              <p className="text-xs font-medium mt-0.5" style={{ color: BRAND_YELLOW }}>
                Kidspeak Language Center
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {isTeacherOrAdmin && (
              <Button
                onClick={() => setShowUpload(true)}
                className="gap-2 font-semibold"
                style={{ backgroundColor: BRAND_YELLOW, color: "#1a1a1a" }}
              >
                <Plus className="w-4 h-4" />
                {gt.addMedia}
              </Button>
            )}
          </div>
        </div>

        {/* Tab bar */}
        <div className="px-6 pb-0 flex gap-1 overflow-x-auto scrollbar-none">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-all shrink-0 ${
                activeTab === key
                  ? "bg-white text-gray-900"
                  : "text-white/70 hover:text-white hover:bg-white/10"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
              {key !== "management" && (
                <span
                  className={`ms-1 text-xs px-1.5 py-0.5 rounded-full font-bold ${
                    activeTab === key ? "text-gray-900" : "text-white/60"
                  }`}
                  style={activeTab === key ? { backgroundColor: BRAND_YELLOW } : {}}
                >
                  {key === "photos" ? photos.length : key === "videos" ? videos.length : talkShow.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-square rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : (
        <div>
          {activeTab === "management" && isAdmin && (
            <AdminManagementPanel items={allMedia} onDelete={handleDelete} gt={gt} />
          )}
          {activeTab === "photos" && (
            <PhotoGrid items={photos} canDelete={canDelete} onDelete={handleDelete} gt={gt} />
          )}
          {activeTab === "videos" && (
            <VideoGrid items={videos} canDelete={canDelete} onDelete={handleDelete} gt={gt} />
          )}
          {activeTab === "talkshow" && (
            <TalkShowSection items={talkShow} canDelete={canDelete} onDelete={handleDelete} gt={gt} />
          )}
        </div>
      )}

      {/* Upload Dialog */}
      {showUpload && (
        <MediaUploadDialog
          onClose={() => setShowUpload(false)}
          onSuccess={handleUploadSuccess}
          t={t}
        />
      )}
    </div>
  );
}

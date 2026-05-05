import { useState, useRef, useCallback, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useMediaUpload, getYouTubeVideoId, getYouTubeThumbnailUrl } from "@/hooks/use-media-upload";
import {
  Upload, Image, Video, Youtube, X, Loader2, CloudUpload,
  Lock, Check, AlertCircle, Mic2, Users, User, Globe, Radio,
} from "lucide-react";
import { useLanguage } from "@/contexts/language-context";

interface MediaUploadDialogProps {
  onClose: () => void;
  onSuccess: () => void;
  t: any;
  defaultCategory?: "group" | "private" | "talkshow";
  defaultGroupId?: number;
  defaultStudentId?: number;
}

const BRAND_BLUE = "#1B2E8F";
const BRAND_YELLOW = "#F5A600";
const TALKSHOW_COLOR = "#7c3aed";

type MediaMode = "photo" | "video" | "talkshow";
type AudienceType = "student" | "group" | "all_students" | "all_parents";

interface UploadContext {
  groups: { id: number; name: string }[];
  students: { id: number; name: string; groupId: number }[];
}

/* ── YouTube URL live preview ── */
function YouTubePreview({ url }: { url: string }) {
  const id = getYouTubeVideoId(url);
  if (!url) return null;
  if (!id) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
        <AlertCircle className="w-4 h-4 shrink-0" />
        <span>Not a valid YouTube link. Paste the full URL from your browser or share link.</span>
      </div>
    );
  }
  const thumb = `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
  return (
    <div className="rounded-xl overflow-hidden border-2 border-emerald-200 bg-emerald-50">
      <div className="relative aspect-video bg-black">
        <img src={thumb} alt="YouTube thumbnail" className="w-full h-full object-cover"
          onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg" style={{ backgroundColor: "#FF0000" }}>
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white ms-0.5"><path d="M8 5v14l11-7z" /></svg>
          </div>
        </div>
        <div className="absolute top-2 start-2 flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-600 text-white text-xs font-semibold">
          <Check className="w-3 h-3" /> YouTube detected
        </div>
      </div>
      <div className="px-3 py-2 flex items-center gap-2">
        <Youtube className="w-4 h-4 text-red-600 shrink-0" />
        <p className="text-xs text-emerald-800 font-medium truncate">
          Video ID: <span className="font-mono">{id}</span> — thumbnail loaded automatically
        </p>
      </div>
    </div>
  );
}

/* ── Audience option card ── */
function AudienceCard({
  value, current, onClick, icon: Icon, label, desc, accentColor,
}: {
  value: AudienceType; current: AudienceType; onClick: () => void;
  icon: React.ElementType; label: string; desc: string; accentColor: string;
}) {
  const active = value === current;
  return (
    <button
      onClick={onClick}
      className={`flex items-start gap-2.5 rounded-xl border p-3 text-start transition-all w-full ${
        active ? "border-transparent shadow-sm" : "hover:bg-muted/40"
      }`}
      style={active ? { backgroundColor: accentColor + "12", borderColor: accentColor + "60" } : {}}
    >
      <div
        className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
        style={{ backgroundColor: active ? accentColor : "#e2e8f0" }}
      >
        <Icon className="w-3.5 h-3.5" style={{ color: active ? "white" : "#64748b" }} />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold leading-tight" style={{ color: active ? accentColor : undefined }}>
          {label}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{desc}</p>
      </div>
      <div className={`ms-auto shrink-0 mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
        active ? "border-transparent" : "border-muted-foreground/30"
      }`} style={active ? { backgroundColor: accentColor } : {}}>
        {active && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
      </div>
    </button>
  );
}

export default function MediaUploadDialog({
  onClose, onSuccess, t,
  defaultCategory, defaultGroupId, defaultStudentId,
}: MediaUploadDialogProps) {
  const gt = t.gallery;
  const { isRTL } = useLanguage();
  const { toast } = useToast();

  /* Upload context — teacher-scoped groups + students */
  const { data: ctx } = useQuery<UploadContext>({
    queryKey: ["/api/media/upload-context"],
    queryFn: () => fetch("/api/media/upload-context", { credentials: "include" }).then(r => r.json()),
  });
  const groups = ctx?.groups ?? [];
  const allStudents = ctx?.students ?? [];

  /* Media type */
  const [mode, setMode] = useState<MediaMode>(
    defaultCategory === "talkshow" ? "talkshow" : "photo"
  );

  /* Target audience — Talk Show always defaults to "student" */
  const defaultAudience = (): AudienceType => {
    if (defaultCategory === "talkshow" || defaultCategory === "private") return "student";
    if (defaultCategory === "group") return "group";
    return "student";
  };
  const [audience, setAudience] = useState<AudienceType>(defaultAudience());

  /* Group / student selection */
  const [groupId, setGroupId] = useState<string>(defaultGroupId ? String(defaultGroupId) : "");
  const [studentId, setStudentId] = useState<string>(defaultStudentId ? String(defaultStudentId) : "");

  /* Filter group for student dropdown */
  const [filterGroupId, setFilterGroupId] = useState<string>("");

  /* Description */
  const [description, setDescription] = useState("");

  /* Photo */
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* Video — YouTube only */
  const [youtubeUrl, setYoutubeUrl] = useState("");

  const [isSaving, setIsSaving] = useState(false);
  const { uploadFile, isUploading, progress } = useMediaUpload();

  /* When mode switches to talkshow, force audience to student */
  useEffect(() => {
    if (mode === "talkshow") setAudience("student");
    setYoutubeUrl("");
  }, [mode]);

  /* When audience changes, reset specific selection */
  useEffect(() => {
    if (audience !== "group") setGroupId("");
    if (audience !== "student") setStudentId("");
    setFilterGroupId("");
  }, [audience]);

  /* Students filtered by optional group filter */
  const studentsToShow = filterGroupId
    ? allStudents.filter(s => s.groupId === parseInt(filterGroupId))
    : allStudents;

  const handleFile = (f: File) => {
    setFile(f);
    const reader = new FileReader();
    reader.onload = e => setPreview(e.target?.result as string);
    reader.readAsDataURL(f);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f && f.type.startsWith("image/")) handleFile(f);
  }, []);

  /* Derive API category from mode + audience */
  const getCategory = (): string => {
    if (mode === "talkshow") return "talkshow";
    if (audience === "group") return "group";
    if (audience === "all_students") return "teacher_broadcast";
    if (audience === "all_parents") return "global";
    return "private"; // student
  };

  const handleSubmit = async () => {
    const category = getCategory();

    /* Validation */
    if (audience === "student" && !studentId && !defaultStudentId) {
      toast({ title: "Please select a student / اختر طالبًا", variant: "destructive" }); return;
    }
    if (audience === "group" && !groupId && !defaultGroupId) {
      toast({ title: "Please select a group / اختر الفوج", variant: "destructive" }); return;
    }

    setIsSaving(true);
    try {
      let url = "";
      let thumbnailUrl: string | null = null;

      if (mode === "photo") {
        if (!file) {
          toast({ title: "Please select a photo / اختر صورة", variant: "destructive" });
          setIsSaving(false); return;
        }
        const result = await uploadFile(file);
        if (!result) { setIsSaving(false); return; }
        url = result.url;
      } else {
        const ytId = getYouTubeVideoId(youtubeUrl);
        if (!ytId) {
          toast({ title: "Please enter a valid YouTube link", variant: "destructive" });
          setIsSaving(false); return;
        }
        url = `https://www.youtube.com/watch?v=${ytId}`;
        thumbnailUrl = getYouTubeThumbnailUrl(youtubeUrl);
      }

      const body: Record<string, any> = {
        type: mode === "photo" ? "photo" : "video",
        category,
        url,
        thumbnailUrl,
        description: description || null,
        studentId: (audience === "student")
          ? parseInt(studentId || String(defaultStudentId ?? "0")) || null
          : null,
        groupId: (audience === "group")
          ? parseInt(groupId || String(defaultGroupId ?? "0")) || null
          : null,
      };

      const res = await fetch("/api/media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });

      if (res.ok) {
        toast({ title: gt.uploadSuccess });
        onSuccess();
      } else {
        const err = await res.json();
        toast({ title: gt.uploadFailed, description: err.error, variant: "destructive" });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const busy = isUploading || isSaving;
  const ytId = getYouTubeVideoId(youtubeUrl);
  const videoReady = (mode === "video" || mode === "talkshow") && ytId !== null;
  const canSubmit = !busy && (mode === "photo" ? !!file : videoReady);
  const accentColor = mode === "talkshow" ? TALKSHOW_COLOR : BRAND_BLUE;

  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" dir={isRTL ? "rtl" : "ltr"}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" style={{ color: BRAND_BLUE }} />
            {gt.addMedia}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* ── Media type toggle: Photo | Video | Talk Show ── */}
          <div className="flex rounded-xl overflow-hidden border">
            {([
              { key: "photo", label: gt.photos, Icon: Image },
              { key: "video", label: gt.videos, Icon: Video },
              { key: "talkshow", label: gt.talkShow, Icon: Mic2 },
            ] as const).map(({ key, label, Icon }, i) => (
              <button
                key={key}
                onClick={() => setMode(key)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium transition-all ${
                  i === 1 ? "border-x" : ""
                } ${mode === key ? "text-white" : "text-muted-foreground hover:bg-muted"}`}
                style={mode === key ? { backgroundColor: key === "talkshow" ? TALKSHOW_COLOR : BRAND_BLUE } : {}}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>

          {/* Talk Show branding banner */}
          {mode === "talkshow" && (
            <div className="flex items-center gap-3 rounded-xl p-3"
              style={{ background: `${TALKSHOW_COLOR}10`, border: `1px solid ${TALKSHOW_COLOR}30` }}>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: TALKSHOW_COLOR }}>
                <Mic2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: TALKSHOW_COLOR }}>{gt.premiumBadge}</p>
                <p className="text-xs text-muted-foreground">{gt.premiumTagline}</p>
              </div>
              <Badge className="ms-auto text-xs" style={{ backgroundColor: TALKSHOW_COLOR, color: "white" }}>Talk Show</Badge>
            </div>
          )}

          {/* ── Target Audience Selector ─────────────────────────────────── */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4" style={{ color: accentColor }} />
              <label className="text-sm font-semibold">{gt.targetAudience} / الجمهور المستهدف</label>
              {mode === "talkshow" && (
                <Badge variant="secondary" className="text-[10px] ms-auto">Student required</Badge>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <AudienceCard
                value="student" current={audience}
                onClick={() => setAudience("student")}
                icon={User} label={gt.audienceStudent} desc={gt.audienceStudentDesc}
                accentColor={accentColor}
              />
              <AudienceCard
                value="group" current={audience}
                onClick={() => { if (mode !== "talkshow") setAudience("group"); }}
                icon={Users} label={gt.audienceGroup} desc={gt.audienceGroupDesc}
                accentColor={BRAND_BLUE}
              />
              <AudienceCard
                value="all_students" current={audience}
                onClick={() => { if (mode !== "talkshow") setAudience("all_students"); }}
                icon={Radio} label={gt.audienceAllStudents} desc={gt.audienceAllStudentsDesc}
                accentColor={BRAND_YELLOW}
              />
              <AudienceCard
                value="all_parents" current={audience}
                onClick={() => { if (mode !== "talkshow") setAudience("all_parents"); }}
                icon={Globe} label={gt.audienceAllParents} desc={gt.audienceAllParentsDesc}
                accentColor="#059669"
              />
            </div>

            {/* Disabled hint for talkshow */}
            {mode === "talkshow" && (
              <p className="text-xs text-muted-foreground ps-1">
                Talk Show performances are always linked to a specific student.
              </p>
            )}
          </div>

          {/* ── Dynamic field: student dropdown ── */}
          {audience === "student" && !defaultStudentId && (
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" style={{ color: accentColor }} />
                {mode === "talkshow" ? "Participating Student / الطالب المشارك" : gt.audienceStudentPlaceholder}
                <Badge variant="secondary" className="text-[10px] ms-1">Required</Badge>
              </label>
              {/* Optional group filter */}
              {groups.length > 1 && (
                <Select
                  value={filterGroupId || "__all"}
                  onValueChange={val => { setFilterGroupId(val === "__all" ? "" : val); setStudentId(""); }}
                >
                  <SelectTrigger className="mb-2 text-sm">
                    <SelectValue placeholder="Filter by group / فلترة حسب الفوج" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all">All groups / جميع الأفواج</SelectItem>
                    {groups.map(g => (
                      <SelectItem key={g.id} value={String(g.id)}>{g.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Select value={studentId} onValueChange={setStudentId}>
                <SelectTrigger>
                  <SelectValue placeholder={gt.audienceStudentPlaceholder} />
                </SelectTrigger>
                <SelectContent>
                  {studentsToShow.length === 0
                    ? <SelectItem value="__none" disabled>No students found</SelectItem>
                    : studentsToShow.map(s => (
                      <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                    ))
                  }
                </SelectContent>
              </Select>
            </div>
          )}

          {/* ── Dynamic field: group dropdown ── */}
          {audience === "group" && !defaultGroupId && (
            <div className="space-y-1">
              <label className="text-sm font-medium flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" style={{ color: BRAND_BLUE }} />
                {gt.audienceGroupPlaceholder}
                <Badge variant="secondary" className="text-[10px] ms-1">Required</Badge>
              </label>
              <Select value={groupId} onValueChange={setGroupId}>
                <SelectTrigger>
                  <SelectValue placeholder={gt.audienceGroupPlaceholder} />
                </SelectTrigger>
                <SelectContent>
                  {groups.length === 0
                    ? <SelectItem value="__none" disabled>No groups assigned</SelectItem>
                    : groups.map(g => (
                      <SelectItem key={g.id} value={String(g.id)}>{g.name}</SelectItem>
                    ))
                  }
                </SelectContent>
              </Select>
            </div>
          )}

          {/* ── Broadcast info notes ── */}
          {audience === "all_students" && (
            <div className="flex items-start gap-2.5 rounded-xl p-3 text-sm"
              style={{ backgroundColor: `${BRAND_YELLOW}10`, border: `1px solid ${BRAND_YELLOW}30` }}>
              <Radio className="w-4 h-4 shrink-0 mt-0.5" style={{ color: BRAND_YELLOW }} />
              <p className="text-xs text-muted-foreground leading-relaxed">{gt.broadcastNote}</p>
            </div>
          )}
          {audience === "all_parents" && (
            <div className="flex items-start gap-2.5 rounded-xl p-3 text-sm"
              style={{ backgroundColor: "#05966910", border: "1px solid #05966930" }}>
              <Globe className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
              <p className="text-xs text-muted-foreground leading-relaxed">{gt.globalNote}</p>
            </div>
          )}

          {/* ── PHOTO: drag & drop ── */}
          {mode === "photo" && (
            <div>
              {file ? (
                <div className="relative rounded-xl overflow-hidden border">
                  <img src={preview!} className="w-full max-h-48 object-cover" alt="Preview" />
                  <button onClick={() => { setFile(null); setPreview(null); }}
                    className="absolute top-2 end-2 p-1.5 rounded-full bg-black/50 text-white hover:bg-black/70">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div
                  onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                    isDragging ? "border-blue-500 bg-blue-50" : "border-muted-foreground/30 hover:border-muted-foreground/60 hover:bg-muted/30"
                  }`}
                >
                  <CloudUpload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm font-medium text-muted-foreground">{gt.dragDropHint}</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">{gt.maxFileSize}</p>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                    onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
                </div>
              )}
            </div>
          )}

          {/* ── VIDEO / TALK SHOW: YouTube link ── */}
          {(mode === "video" || mode === "talkshow") && (
            <div className="space-y-3">
              <div className="flex items-start gap-3 rounded-xl p-3"
                style={{
                  background: mode === "talkshow" ? `${TALKSHOW_COLOR}0A` : "linear-gradient(135deg, #1B2E8F0A, #1B2E8F05)",
                  border: `1px solid ${mode === "talkshow" ? TALKSHOW_COLOR : BRAND_BLUE}20`,
                }}>
                <Youtube className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-semibold" style={{ color: mode === "talkshow" ? TALKSHOW_COLOR : BRAND_BLUE }}>
                    YouTube link required
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Upload your {mode === "talkshow" ? "Talk Show performance" : "video"} to YouTube first, then paste the link here.
                  </p>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <Lock className="w-3 h-3 shrink-0" style={{ color: BRAND_YELLOW }} />
                    <p className="text-xs font-medium" style={{ color: BRAND_YELLOW }}>
                      Tip: Set the video to <strong>Unlisted</strong> on YouTube so only people with the link can view it.
                    </p>
                  </div>
                </div>
              </div>
              <div className="relative">
                <Youtube className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-red-500" />
                <Input
                  className="ps-9 font-mono text-sm"
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={youtubeUrl}
                  onChange={e => setYoutubeUrl(e.target.value.trim())}
                />
                {youtubeUrl && (
                  <button onClick={() => setYoutubeUrl("")}
                    className="absolute end-2 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-muted text-muted-foreground">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <YouTubePreview url={youtubeUrl} />
            </div>
          )}

          {/* Caption */}
          <Textarea
            placeholder={gt.addCaption}
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="resize-none" rows={2} dir="auto"
          />

          {/* Upload progress */}
          {isUploading && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{gt.uploading}</span>
                <span>{progress}%</span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-300"
                  style={{ width: `${progress}%`, backgroundColor: accentColor }} />
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3 pt-1">
            <Button variant="outline" className="flex-1" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button
              className="flex-1 gap-2"
              onClick={handleSubmit}
              disabled={!canSubmit}
              style={{ backgroundColor: accentColor, color: "white" }}
            >
              {busy ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> {gt.uploading}</>
              ) : mode === "talkshow" ? (
                <><Mic2 className="w-4 h-4" /> Add to Talk Show</>
              ) : mode === "video" ? (
                <><Youtube className="w-4 h-4" /> Add Video</>
              ) : (
                <><Upload className="w-4 h-4" /> {gt.uploadPhoto}</>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

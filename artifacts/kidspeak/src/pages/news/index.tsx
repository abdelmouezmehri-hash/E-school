import { useState } from "react";
import { useListNews, useCreateNews, useDeleteNews, useGetMe, useSettings, type NewsCategory } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/language-context";
import { useToast } from "@/hooks/use-toast";
import { Megaphone, Plus, Trash2, Calendar, Lightbulb, Image, BookOpen } from "lucide-react";
import { format } from "date-fns";

function safeFmt(dateStr: string | null | undefined, fmt: string): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return String(dateStr);
  return format(d, fmt);
}

const CATEGORIES: { value: NewsCategory | "all"; icon: React.ElementType; color: string; bg: string }[] = [
  { value: "all", icon: Megaphone, color: "#1B2E8F", bg: "#1B2E8F15" },
  { value: "school_update", icon: Megaphone, color: "#1B2E8F", bg: "#1B2E8F15" },
  { value: "educational_tip", icon: Lightbulb, color: "#F5A600", bg: "#F5A60015" },
  { value: "event_gallery", icon: Image, color: "#16a34a", bg: "#16a34a15" },
];

function getCategoryStyle(category: NewsCategory) {
  const map: Record<NewsCategory, { icon: React.ElementType; color: string; bg: string; label?: string }> = {
    school_update: { icon: Megaphone, color: "#1B2E8F", bg: "#1B2E8F15" },
    educational_tip: { icon: Lightbulb, color: "#F5A600", bg: "#FFF8E1" },
    event_gallery: { icon: Image, color: "#16a34a", bg: "#F0FDF4" },
  };
  return map[category] || map.school_update;
}

function getLang(en: string | null | undefined, ar: string | null | undefined, language: string): string {
  if (language === "ar") return ar || en || "";
  return en || ar || "";
}

export default function NewsPage() {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const nt = t.news;

  const { data: me } = useGetMe();
  const isAdmin = (me as any)?.role === "admin";
  const isParent = (me as any)?.role === "parent";

  const { data: settings } = useSettings();
  const [bannerDismissed, setBannerDismissed] = useState(false);

  const [activeCategory, setActiveCategory] = useState<NewsCategory | null>(null);
  const { data: items = [], isLoading } = useListNews(activeCategory);
  const { mutate: create, isPending: isCreating } = useCreateNews();
  const { mutate: deleteItem } = useDeleteNews();

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [titleAr, setTitleAr] = useState("");
  const [content, setContent] = useState("");
  const [contentAr, setContentAr] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [category, setCategory] = useState<NewsCategory>("school_update");
  const [expanded, setExpanded] = useState<number | null>(null);

  const handleCreate = () => {
    if (!title.trim() || !content.trim()) return;
    create(
      {
        title: title.trim(),
        titleAr: titleAr.trim() || undefined,
        content: content.trim(),
        contentAr: contentAr.trim() || undefined,
        imageUrl: imageUrl.trim() || undefined,
        category,
      },
      {
        onSuccess: () => {
          toast({ title: nt.posted });
          setOpen(false);
          setTitle(""); setTitleAr(""); setContent(""); setContentAr(""); setImageUrl(""); setCategory("school_update");
        },
        onError: () => toast({ title: "Error", variant: "destructive" }),
      }
    );
  };

  const categoryTabs = [
    { value: null, label: nt.catAll },
    { value: "school_update" as NewsCategory, label: nt.catSchoolUpdate },
    { value: "educational_tip" as NewsCategory, label: nt.catEducationalTip },
    { value: "event_gallery" as NewsCategory, label: nt.catEventGallery },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Announcement Banner (parents only) */}
      {isParent && settings?.welcomeAnnouncement && !bannerDismissed && (
        <div
          className="flex items-start gap-3 rounded-xl px-4 py-3 text-sm"
          style={{ backgroundColor: "#F5A600" + "1A", border: "1px solid #F5A60050" }}
        >
          <Megaphone className="w-5 h-5 mt-0.5 shrink-0" style={{ color: "#F5A600" }} />
          <p className="flex-1 font-medium" style={{ color: "#1B2E8F" }}>
            {settings.welcomeAnnouncement}
          </p>
          <button
            onClick={() => setBannerDismissed(true)}
            className="shrink-0 text-xs text-muted-foreground hover:text-foreground leading-none"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{nt.title}</h1>
          <p className="text-muted-foreground text-sm mt-1">{nt.subtitle}</p>
        </div>
        {isAdmin && (
          <Button
            style={{ backgroundColor: "#F5A600", color: "#1B2E8F" }}
            className="font-semibold"
            onClick={() => setOpen(true)}
          >
            <Plus className="w-4 h-4 me-2" />
            {nt.post}
          </Button>
        )}
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 flex-wrap">
        {categoryTabs.map((tab) => {
          const isActive = activeCategory === tab.value;
          return (
            <button
              key={String(tab.value)}
              onClick={() => setActiveCategory(tab.value)}
              className={`px-4 py-2 rounded-full text-sm font-semibold border transition-all ${
                isActive
                  ? "border-transparent text-white shadow-sm"
                  : "bg-white border-border text-muted-foreground hover:border-primary/30"
              }`}
              style={isActive ? { backgroundColor: "#1B2E8F" } : {}}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">{nt.loading}</div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p>{nt.empty}</p>
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => {
            const style = getCategoryStyle(item.category || "school_update");
            const Icon = style.icon;
            const isExpanded = expanded === item.id;
            const shortContent = item.content.length > 120 ? item.content.slice(0, 120) + "..." : item.content;

            return (
              <Card key={item.id} className="overflow-hidden hover:shadow-lg transition-all group flex flex-col">
                {item.imageUrl && item.category === "event_gallery" && (
                  <div className="h-40 overflow-hidden bg-muted">
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                  </div>
                )}
                <CardContent className="p-5 flex flex-col flex-1">
                  <div className="flex items-start gap-3 flex-1">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                      style={{ backgroundColor: style.bg }}
                    >
                      <Icon className="w-4 h-4" style={{ color: style.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span
                          className="text-xs font-semibold px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: style.bg, color: style.color }}
                        >
                          {item.category === "school_update" ? nt.catSchoolUpdate
                            : item.category === "educational_tip" ? nt.catEducationalTip
                            : nt.catEventGallery}
                        </span>
                      </div>
                      <h3 className="font-bold text-base leading-snug">{getLang(item.title, item.titleAr, language)}</h3>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {safeFmt(item.createdAt, "MMM d, yyyy")}
                        </span>
                        {item.authorName && <span>· {item.authorName}</span>}
                      </div>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
                        {isExpanded ? getLang(item.content, item.contentAr, language) : getLang(item.content, item.contentAr, language).slice(0, 120) + (getLang(item.content, item.contentAr, language).length > 120 ? "..." : "")}
                      </p>
                      {getLang(item.content, item.contentAr, language).length > 120 && (
                        <button
                          className="text-xs font-semibold mt-1"
                          style={{ color: "#1B2E8F" }}
                          onClick={(e) => { e.stopPropagation(); setExpanded(isExpanded ? null : item.id); }}
                        >
                          {isExpanded ? "↑" : nt.readMore}
                        </button>
                      )}
                    </div>
                  </div>
                  {isAdmin && (
                    <div className="mt-3 pt-3 border-t flex justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-400 hover:text-red-600 hover:bg-red-50 h-8"
                        onClick={() => deleteItem(item.id)}
                      >
                        <Trash2 className="w-3 h-3 me-1" />
                        {(t.groups as any).delete || "Delete"}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Post Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{nt.postTitle}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 max-h-[70vh] overflow-y-auto pe-1">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{nt.categoryLabel}</label>
              <Select value={category} onValueChange={(v) => setCategory(v as NewsCategory)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="school_update">{nt.catSchoolUpdate}</SelectItem>
                  <SelectItem value="educational_tip">{nt.catEducationalTip}</SelectItem>
                  <SelectItem value="event_gallery">{nt.catEventGallery}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{nt.titleLabel}</label>
                <Input placeholder={nt.titlePlaceholder} value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{(nt as any).titleArLabel ?? "العنوان بالعربية"} <span className="text-muted-foreground text-xs">(اختياري)</span></label>
                <Input dir="rtl" placeholder="مثال: إعلان المدرسة" value={titleAr} onChange={(e) => setTitleAr(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{nt.contentLabel}</label>
              <Textarea rows={3} placeholder={nt.contentPlaceholder} value={content} onChange={(e) => setContent(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{(nt as any).contentArLabel ?? "المحتوى بالعربية"} <span className="text-muted-foreground text-xs">(اختياري)</span></label>
              <Textarea dir="rtl" rows={3} placeholder="اكتب المحتوى بالعربية..." value={contentAr} onChange={(e) => setContentAr(e.target.value)} />
            </div>
            {(category === "event_gallery" || imageUrl) && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{nt.imageUrlLabel}</label>
                <Input placeholder={nt.imageUrlPlaceholder} value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
              </div>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">{t.groups.cancel}</Button>
            </DialogClose>
            <Button
              style={{ backgroundColor: "#F5A600", color: "#1B2E8F" }}
              className="font-semibold"
              onClick={handleCreate}
              disabled={isCreating || !title.trim() || !content.trim()}
            >
              {isCreating ? t.groups.saving : nt.publish}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

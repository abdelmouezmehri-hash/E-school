import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  useConversations,
  useMessageThread,
  useMarkThreadRead,
  useSendMessage,
  useContacts,
  useMessageGroups,
  useGetMe,
  type Conversation,
  type Message,
  type ContactUser,
} from "@workspace/api-client-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useLanguage } from "@/contexts/language-context";
import { useToast } from "@/hooks/use-toast";
import {
  MessageSquare,
  Send,
  Users,
  ArrowLeft,
  Paperclip,
  Link2,
  Check,
  CheckCheck,
  Radio,
  Search,
  ChevronsUpDown,
  X,
  Plus,
} from "lucide-react";
import { format, formatDistanceToNowStrict, isToday, isYesterday } from "date-fns";

function safeFmt(dateStr: string | null | undefined, fmt: string): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return String(dateStr);
  return format(d, fmt);
}
import { ar, enUS } from "date-fns/locale";

// ── Role label colours ────────────────────────────────────────────────────────
const ROLE_COLORS: Record<string, string> = {
  admin: "#1B2E8F",
  teacher: "#0891b2",
  psychologist: "#7c3aed",
  parent: "#059669",
  accountant: "#d97706",
  photographer: "#db2777",
  designer: "#ea580c",
  marketer: "#65a30d",
};

const STAFF_ROLES = ["teacher", "psychologist", "accountant", "photographer", "designer", "admin", "marketer"];
const ROLE_OPTIONS = ["teacher", "psychologist", "accountant", "photographer", "designer", "marketer"];

type BroadcastType =
  | "individual_parent"
  | "individual_staff"
  | "group"
  | "level"
  | "role"
  | "all_parents"
  | "global"
  | "specific_students";

interface LevelOption { id: number; name: string; }

// ── Avatar initials ───────────────────────────────────────────────────────────
function Avatar({ name, role, size = "md" }: { name: string; role: string; size?: "sm" | "md" | "lg" }) {
  const color = ROLE_COLORS[role] ?? "#1B2E8F";
  const initials = name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  const sz = size === "sm" ? "w-8 h-8 text-xs" : size === "lg" ? "w-12 h-12 text-base" : "w-10 h-10 text-sm";
  return (
    <div
      className={`${sz} rounded-full flex items-center justify-center shrink-0 font-bold text-white`}
      style={{ backgroundColor: color }}
    >
      {initials}
    </div>
  );
}

// ── Relative time ─────────────────────────────────────────────────────────────
function relTime(dt: string, locale: Locale) {
  const d = new Date(dt);
  if (isToday(d)) return format(d, "HH:mm");
  if (isYesterday(d)) return locale === ar ? "أمس" : "Yesterday";
  return formatDistanceToNowStrict(d, { addSuffix: true, locale });
}

// ── Date separator label ──────────────────────────────────────────────────────
function dateSep(dt: string, locale: Locale) {
  const d = new Date(dt);
  if (isToday(d)) return locale === ar ? "اليوم" : "Today";
  if (isYesterday(d)) return locale === ar ? "أمس" : "Yesterday";
  return format(d, "d MMMM yyyy", { locale });
}

// ── Attachment chip ───────────────────────────────────────────────────────────
function AttachmentChip({ name, url }: { name: string | null; url: string }) {
  const label = name ?? "Attachment";
  return (
    <a
      href={`/api/storage/objects/${url}`}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-white/20 text-xs hover:bg-white/30 transition-colors"
    >
      <Paperclip className="w-3 h-3" />
      {label}
    </a>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
export default function InboxPage() {
  const { t, language, isRTL } = useLanguage();
  const { toast } = useToast();
  const mt = t.messages as any;
  const locale = language === "ar" ? ar : enUS;

  const { data: me } = useGetMe();
  const myId = (me as any)?.id as number | undefined;
  const myRole = (me as any)?.role as string | undefined;
  const isAdmin = myRole === "admin";
  const isTeacher = myRole === "teacher";
  const isParent = myRole === "parent";
  const isPsych = myRole === "psychologist";
  const canSend = isAdmin || isTeacher || isParent || isPsych;
  const canBroadcast = isAdmin || isTeacher;

  // ── Data ────────────────────────────────────────────────────────────────────
  const { data: conversations = [], refetch: refetchConvs } = useConversations();
  const { data: contacts = [] } = useContacts();
  const { data: groupOptions = [] } = useMessageGroups();

  const { mutate: send, isPending: isSending } = useSendMessage();
  const { mutate: markThreadRead } = useMarkThreadRead();

  // ── My students (for pupil-link) ────────────────────────────────────────────
  const [myStudents, setMyStudents] = useState<{ id: number; name: string; levelName?: string; currentGroupName?: string | null }[]>([]);
  const [allStudentsForBroadcast, setAllStudentsForBroadcast] = useState<{ id: number; name: string; levelName?: string; currentGroupName?: string | null }[]>([]);
  useEffect(() => {
    fetch("/api/students", { credentials: "include" })
      .then((r) => r.ok ? r.json() : [])
      .then((rows: any[]) => {
        const mapped = rows.map((s: any) => ({ id: s.id, name: s.name, levelName: s.levelName, currentGroupName: s.currentGroupName }));
        setAllStudentsForBroadcast(mapped);
        if (isParent && myId) {
          setMyStudents(rows.filter((s: any) => s.parentId === myId));
        } else {
          setMyStudents(mapped);
        }
      })
      .catch(() => {});
  }, [isParent, myId]);

  // ── Levels for broadcast ────────────────────────────────────────────────────
  const [levels, setLevels] = useState<LevelOption[]>([]);
  useEffect(() => {
    if (!isAdmin) return;
    fetch("/api/levels", { credentials: "include" })
      .then((r) => r.ok ? r.json() : [])
      .then(setLevels)
      .catch(() => {});
  }, [isAdmin]);

  // ── View state ──────────────────────────────────────────────────────────────
  const [activePartnerId, setActivePartnerId] = useState<number | null>(null);
  const [activePartner, setActivePartner] = useState<{ id: number; name: string; role: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileView, setMobileView] = useState<"list" | "thread">("list");

  // ── Thread data ─────────────────────────────────────────────────────────────
  const { data: thread = [], refetch: refetchThread } = useMessageThread(activePartnerId);
  const threadEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (thread.length > 0) {
      threadEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [thread]);

  // Mark thread as read when opening
  useEffect(() => {
    if (activePartnerId) {
      markThreadRead(activePartnerId);
    }
  }, [activePartnerId]);

  // ── Compose state (thread) ───────────────────────────────────────────────────
  const [msgContent, setMsgContent] = useState("");
  const [linkedStudentId, setLinkedStudentId] = useState<number | null>(null);
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);
  const [attachmentName, setAttachmentName] = useState<string | null>(null);
  const [attachmentType, setAttachmentType] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [studentPickerOpen, setStudentPickerOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── New conversation picker ──────────────────────────────────────────────────
  const [newConvOpen, setNewConvOpen] = useState(false);
  const [newConvSearch, setNewConvSearch] = useState("");

  // ── Broadcast dialog ─────────────────────────────────────────────────────────
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [bType, setBType] = useState<BroadcastType>("group");
  const [bGroupId, setBGroupId] = useState("");
  const [bLevelId, setBLevelId] = useState("");
  const [bRole, setBRole] = useState("");
  const [bSubject, setBSubject] = useState("");
  const [bContent, setBContent] = useState("");
  const [bStudentIds, setBStudentIds] = useState<Set<number>>(new Set());
  const [bStudentSearch, setBStudentSearch] = useState("");

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const roleLabel = useCallback((r: string): string => {
    return mt.roleLabels?.[r] ?? r;
  }, [mt]);

  // Contacts not already in conversations (for new conversation picker)
  const freshContacts = useMemo(() => {
    const convPartnerIds = new Set(conversations.map((c) => c.partnerId));
    return contacts.filter((c) => !convPartnerIds.has(c.id));
  }, [contacts, conversations]);

  // Filter conversations by search
  const filteredConvs = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const q = searchQuery.toLowerCase();
    return conversations.filter((c) =>
      c.partnerName.toLowerCase().includes(q) ||
      c.latestMessage.content.toLowerCase().includes(q)
    );
  }, [conversations, searchQuery]);

  // ── Open a thread ─────────────────────────────────────────────────────────────
  const openThread = useCallback((partnerId: number, partnerName: string, partnerRole: string) => {
    setActivePartnerId(partnerId);
    setActivePartner({ id: partnerId, name: partnerName, role: partnerRole });
    setMsgContent("");
    setLinkedStudentId(null);
    setAttachmentUrl(null);
    setAttachmentName(null);
    setAttachmentType(null);
    setMobileView("thread");
  }, []);

  // ── File upload ───────────────────────────────────────────────────────────────
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const metaRes = await fetch("/api/storage/uploads/request-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
      });
      if (!metaRes.ok) throw new Error("Failed to get upload URL");
      const { uploadURL, objectPath } = await metaRes.json();
      await fetch(uploadURL, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
      setAttachmentUrl(objectPath);
      setAttachmentName(file.name);
      setAttachmentType(file.type);
    } catch {
      toast({ title: mt.uploadFailed ?? "Upload failed", variant: "destructive" });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // ── Send thread message ───────────────────────────────────────────────────────
  const handleSendThread = () => {
    if (!activePartnerId || !msgContent.trim()) return;
    send(
      {
        recipientType: "individual",
        toUserId: activePartnerId,
        content: msgContent.trim(),
        linkedStudentId: linkedStudentId ?? null,
        attachmentUrl: attachmentUrl ?? null,
        attachmentName: attachmentName ?? null,
        attachmentType: attachmentType ?? null,
      },
      {
        onSuccess: () => {
          setMsgContent("");
          setLinkedStudentId(null);
          setAttachmentUrl(null);
          setAttachmentName(null);
          setAttachmentType(null);
          refetchThread();
          refetchConvs();
        },
        onError: () => toast({ title: mt.errorSending ?? "Error sending message", variant: "destructive" }),
      }
    );
  };

  // ── Send broadcast ────────────────────────────────────────────────────────────
  const handleSendBroadcast = () => {
    const apiType = bType === "individual_parent" || bType === "individual_staff" ? "individual" : bType;
    const payload: any = { recipientType: apiType, subject: bSubject, content: bContent };
    if (bType === "group") payload.groupId = parseInt(bGroupId);
    else if (bType === "level") payload.levelId = parseInt(bLevelId);
    else if (bType === "role") payload.role = bRole;
    else if (bType === "specific_students") payload.studentIds = Array.from(bStudentIds);

    send(payload, {
      onSuccess: (res: any) => {
        const count = res?.count ?? 1;
        toast({ title: count > 1 ? (mt.broadcastSent ?? "Sent!").replace("{count}", String(count)) : mt.messageSent });
        setBroadcastOpen(false);
        setBType("group"); setBGroupId(""); setBLevelId(""); setBRole(""); setBSubject(""); setBContent("");
        setBStudentIds(new Set()); setBStudentSearch("");
        refetchConvs();
      },
      onError: () => toast({ title: "Error sending", variant: "destructive" }),
    });
  };

  // ── Thread: date groups ───────────────────────────────────────────────────────
  type DayGroup = { label: string; messages: Message[] };
  const dayGroups = useMemo((): DayGroup[] => {
    const groups: DayGroup[] = [];
    let lastLabel = "";
    for (const msg of thread) {
      const label = dateSep(msg.createdAt, locale);
      if (label !== lastLabel) {
        groups.push({ label, messages: [] });
        lastLabel = label;
      }
      groups[groups.length - 1].messages.push(msg);
    }
    return groups;
  }, [thread, locale]);

  // ── Unread count ───────────────────────────────────────────────────────────────
  const totalUnread = conversations.reduce((s, c) => s + c.unreadCount, 0);

  // ── Linked student name ────────────────────────────────────────────────────────
  const linkedStudentName = useMemo(() => {
    if (!linkedStudentId) return null;
    return myStudents.find((s) => s.id === linkedStudentId)?.name ?? null;
  }, [linkedStudentId, myStudents]);

  // ══════════════════════════════════════════════════════════════════════════════
  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      {/* ── Page title (mobile only) ─────────────────────────────────────────── */}
      <div className={`flex items-center justify-between mb-4 ${mobileView === "thread" ? "lg:flex" : "flex"}`}>
        {mobileView === "thread" && (
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden -ms-1"
            onClick={() => { setMobileView("list"); setActivePartnerId(null); setActivePartner(null); }}
          >
            <ArrowLeft className={`w-4 h-4 me-1 ${isRTL ? "rotate-180" : ""}`} />
            {mt.back ?? "Back"}
          </Button>
        )}
        {mobileView === "list" && (
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              {mt.title}
              {totalUnread > 0 && (
                <Badge style={{ backgroundColor: "#F5A600", color: "#1B2E8F" }} className="font-bold">
                  {totalUnread}
                </Badge>
              )}
            </h1>
          </div>
        )}
        <div className="flex gap-2 ms-auto">
          {canBroadcast && mobileView === "list" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBroadcastOpen(true)}
            >
              <Radio className="w-4 h-4 me-1.5" />
              {mt.broadcast ?? "Broadcast"}
            </Button>
          )}
          {canSend && mobileView === "list" && (
            <Button
              style={{ backgroundColor: "#F5A600", color: "#1B2E8F" }}
              size="sm"
              className="font-semibold"
              onClick={() => setNewConvOpen(true)}
            >
              <Plus className="w-4 h-4 me-1" />
              {mt.newConversation ?? "New"}
            </Button>
          )}
        </div>
      </div>

      {/* ── Main 2-panel layout ────────────────────────────────────────────────── */}
      <div className="flex-1 flex gap-0 overflow-hidden rounded-xl border shadow-sm bg-background min-h-0">

        {/* ──── Left: Conversations list ─────────────────────────────────────── */}
        <div className={`w-full lg:w-80 xl:w-96 shrink-0 flex flex-col border-e bg-muted/20 ${mobileView === "thread" ? "hidden lg:flex" : "flex"}`}>
          {/* Search */}
          <div className="p-3 border-b">
            <div className="relative">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={mt.searchConversations ?? "Search…"}
                className="ps-9 h-9 text-sm bg-background"
              />
            </div>
          </div>

          {/* Conversation items */}
          <div className="flex-1 overflow-y-auto">
            {filteredConvs.length === 0 && freshContacts.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground px-4">
                <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p className="text-sm">{mt.noConversations ?? "No conversations yet."}</p>
              </div>
            ) : null}

            {filteredConvs.map((conv) => {
              const isActive = activePartnerId === conv.partnerId;
              const isMe = conv.latestMessage.fromUserId === myId;
              return (
                <button
                  key={conv.partnerId}
                  className={`w-full text-start px-4 py-3 border-b hover:bg-muted/50 transition-colors flex items-start gap-3 ${isActive ? "bg-[#1B2E8F]/5 border-s-2 border-s-[#1B2E8F]" : ""}`}
                  onClick={() => openThread(conv.partnerId, conv.partnerName, conv.partnerRole)}
                >
                  <Avatar name={conv.partnerName} role={conv.partnerRole} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-semibold text-sm truncate">{conv.partnerName}</span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {relTime(conv.latestMessage.createdAt, locale)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-1 mt-0.5">
                      <p className={`text-xs truncate ${conv.unreadCount > 0 ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                        {isMe && <span className="opacity-60">{mt.you ?? "You"}: </span>}
                        {conv.latestMessage.content}
                      </p>
                      {conv.unreadCount > 0 && (
                        <span
                          className="shrink-0 text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center text-white"
                          style={{ backgroundColor: "#1B2E8F" }}
                        >
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                    <span
                      className="text-xs px-1.5 py-0.5 rounded font-medium mt-0.5 inline-block"
                      style={{ backgroundColor: `${ROLE_COLORS[conv.partnerRole] ?? "#1B2E8F"}22`, color: ROLE_COLORS[conv.partnerRole] ?? "#1B2E8F" }}
                    >
                      {roleLabel(conv.partnerRole)}
                    </span>
                  </div>
                </button>
              );
            })}

            {/* Fresh contacts section (no prior conversation) */}
            {freshContacts.length > 0 && !searchQuery && (
              <div>
                <p className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b bg-muted/30">
                  {mt.directMessages ?? "Direct Messages"}
                </p>
                {freshContacts.map((c) => (
                  <button
                    key={c.id}
                    className="w-full text-start px-4 py-3 border-b hover:bg-muted/50 transition-colors flex items-center gap-3"
                    onClick={() => openThread(c.id, c.name, c.role)}
                  >
                    <Avatar name={c.name} role={c.role} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{c.name}</p>
                      <span
                        className="text-xs px-1.5 py-0.5 rounded font-medium"
                        style={{ backgroundColor: `${ROLE_COLORS[c.role] ?? "#1B2E8F"}22`, color: ROLE_COLORS[c.role] ?? "#1B2E8F" }}
                      >
                        {roleLabel(c.role)}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ──── Right: Thread view ───────────────────────────────────────────── */}
        <div className={`flex-1 flex flex-col min-w-0 ${mobileView === "list" ? "hidden lg:flex" : "flex"}`}>
          {activePartner ? (
            <>
              {/* Thread header */}
              <div className="px-4 py-3 border-b flex items-center gap-3 bg-muted/10">
                <Avatar name={activePartner.name} role={activePartner.role} size="sm" />
                <div>
                  <p className="font-semibold text-sm">{activePartner.name}</p>
                  <span
                    className="text-xs px-1.5 py-0.5 rounded font-medium"
                    style={{ backgroundColor: `${ROLE_COLORS[activePartner.role] ?? "#1B2E8F"}22`, color: ROLE_COLORS[activePartner.role] ?? "#1B2E8F" }}
                  >
                    {roleLabel(activePartner.role)}
                  </span>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
                {dayGroups.length === 0 && (
                  <div className="text-center text-muted-foreground text-sm py-8">
                    {mt.startConversation ?? "Send the first message"}
                  </div>
                )}

                {dayGroups.map((group) => (
                  <div key={group.label}>
                    {/* Date separator */}
                    <div className="flex items-center gap-3 my-3">
                      <div className="flex-1 h-px bg-border" />
                      <span className="text-xs text-muted-foreground font-medium px-2">{group.label}</span>
                      <div className="flex-1 h-px bg-border" />
                    </div>

                    {/* Messages in this day */}
                    <div className="space-y-2">
                      {group.messages.map((msg) => {
                        const isMine = msg.fromUserId === myId;
                        return (
                          <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                            <div className={`max-w-[75%] flex flex-col ${isMine ? "items-end" : "items-start"}`}>
                              {/* Student link chip */}
                              {msg.linkedStudentName && (
                                <div
                                  className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full mb-1 font-medium"
                                  style={{ backgroundColor: "#7c3aed22", color: "#7c3aed" }}
                                >
                                  <Link2 className="w-3 h-3" />
                                  {msg.linkedStudentName}
                                </div>
                              )}

                              {/* Bubble */}
                              <div
                                className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                                  isMine
                                    ? "bg-[#1B2E8F] text-white rounded-br-sm"
                                    : "bg-muted text-foreground rounded-bl-sm"
                                }`}
                              >
                                {msg.content}

                                {/* Attachment */}
                                {msg.attachmentUrl && (
                                  <div className="mt-1.5">
                                    <AttachmentChip name={msg.attachmentName} url={msg.attachmentUrl} />
                                  </div>
                                )}
                              </div>

                              {/* Time + read receipt */}
                              <div className="flex items-center gap-1 mt-0.5">
                                <span className="text-xs text-muted-foreground">
                                  {safeFmt(msg.createdAt, "HH:mm")}
                                </span>
                                {isMine && (
                                  msg.isRead
                                    ? <CheckCheck className="w-3.5 h-3.5 text-[#1B2E8F]" />
                                    : <Check className="w-3.5 h-3.5 text-muted-foreground" />
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
                <div ref={threadEndRef} />
              </div>

              {/* Compose bar */}
              {canSend && (
                <div className="border-t bg-background px-3 py-3">
                  {/* Attachment preview */}
                  {attachmentUrl && (
                    <div className="flex items-center gap-2 mb-2 px-1">
                      <Paperclip className="w-4 h-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground flex-1 truncate">{attachmentName}</span>
                      <button onClick={() => { setAttachmentUrl(null); setAttachmentName(null); setAttachmentType(null); }}>
                        <X className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                      </button>
                    </div>
                  )}

                  {/* Student link preview */}
                  {linkedStudentId && linkedStudentName && (
                    <div className="flex items-center gap-2 mb-2 px-1">
                      <Link2 className="w-4 h-4" style={{ color: "#7c3aed" }} />
                      <span className="text-xs font-medium" style={{ color: "#7c3aed" }}>{linkedStudentName}</span>
                      <button onClick={() => setLinkedStudentId(null)}>
                        <X className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
                      </button>
                    </div>
                  )}

                  <div className="flex items-end gap-2">
                    {/* Attachment button */}
                    <button
                      className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      title={mt.attachFile ?? "Attach file"}
                    >
                      <Paperclip className="w-5 h-5" />
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      accept="image/*,.pdf,.doc,.docx"
                      onChange={handleFileSelect}
                    />

                    {/* Student link button (teachers + parents only) */}
                    {(isTeacher || isParent || isAdmin) && myStudents.length > 0 && (
                      <Popover open={studentPickerOpen} onOpenChange={setStudentPickerOpen}>
                        <PopoverTrigger asChild>
                          <button
                            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
                            title={mt.linkStudent ?? "Link student"}
                          >
                            <Link2 className="w-5 h-5" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="p-0 w-56" align="start">
                          <Command>
                            <CommandInput placeholder={mt.searchStudent ?? "Search student…"} />
                            <CommandList>
                              <CommandEmpty>{mt.noStudent ?? "No student found."}</CommandEmpty>
                              <CommandGroup>
                                {myStudents.map((s) => (
                                  <CommandItem
                                    key={s.id}
                                    value={s.name}
                                    onSelect={() => {
                                      setLinkedStudentId(s.id);
                                      setStudentPickerOpen(false);
                                    }}
                                    className="flex items-center gap-2"
                                  >
                                    <Check className={`w-4 h-4 ${linkedStudentId === s.id ? "opacity-100" : "opacity-0"}`} />
                                    {s.name}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    )}

                    {/* Text input */}
                    <Textarea
                      rows={1}
                      value={msgContent}
                      onChange={(e) => setMsgContent(e.target.value)}
                      placeholder={mt.typeMessage ?? "Type a message…"}
                      className="flex-1 resize-none min-h-[2.5rem] max-h-32 text-sm py-2"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSendThread();
                        }
                      }}
                    />

                    {/* Send */}
                    <Button
                      size="sm"
                      disabled={isSending || isUploading || !msgContent.trim()}
                      onClick={handleSendThread}
                      style={{ backgroundColor: "#1B2E8F", color: "#fff" }}
                      className="shrink-0 h-10 w-10 p-0 rounded-xl"
                    >
                      <Send className={`w-4 h-4 ${isRTL ? "rotate-180" : ""}`} />
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Empty state — no thread selected */
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-4">
              <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
                <MessageSquare className="w-10 h-10 opacity-30" />
              </div>
              <div className="text-center">
                <p className="font-medium">{mt.selectConversation ?? "Select a conversation"}</p>
                <p className="text-sm mt-1">{mt.selectConversationHint ?? "Choose from the list, or start a new one."}</p>
              </div>
              {canSend && (
                <Button
                  onClick={() => setNewConvOpen(true)}
                  style={{ backgroundColor: "#1B2E8F", color: "#fff" }}
                  size="sm"
                >
                  <Plus className="w-4 h-4 me-1.5" />
                  {mt.newConversation ?? "New Conversation"}
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── New Conversation Dialog ────────────────────────────────────────────── */}
      <Dialog open={newConvOpen} onOpenChange={setNewConvOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{mt.startNewConversation ?? "Start a Conversation"}</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Input
              placeholder={mt.searchContact ?? "Search contacts…"}
              value={newConvSearch}
              onChange={(e) => setNewConvSearch(e.target.value)}
              className="mb-3"
            />
            <div className="space-y-1 max-h-72 overflow-y-auto">
              {contacts
                .filter((c) =>
                  !newConvSearch ||
                  c.name.toLowerCase().includes(newConvSearch.toLowerCase())
                )
                .map((c) => (
                  <button
                    key={c.id}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted transition-colors text-start"
                    onClick={() => {
                      openThread(c.id, c.name, c.role);
                      setNewConvOpen(false);
                      setNewConvSearch("");
                    }}
                  >
                    <Avatar name={c.name} role={c.role} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{c.name}</p>
                      <span
                        className="text-xs px-1.5 py-0.5 rounded font-medium"
                        style={{ backgroundColor: `${ROLE_COLORS[c.role] ?? "#1B2E8F"}22`, color: ROLE_COLORS[c.role] ?? "#1B2E8F" }}
                      >
                        {roleLabel(c.role)}
                      </span>
                    </div>
                  </button>
                ))}
              {contacts.filter((c) =>
                !newConvSearch ||
                c.name.toLowerCase().includes(newConvSearch.toLowerCase())
              ).length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">{mt.noContactFound ?? "No contacts found."}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">{t.groups?.cancel ?? "Cancel"}</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Broadcast Dialog ───────────────────────────────────────────────────── */}
      <Dialog open={broadcastOpen} onOpenChange={setBroadcastOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Radio className="w-5 h-5" style={{ color: "#F5A600" }} />
              {mt.broadcastTitle ?? "Send Broadcast"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Broadcast type */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{mt.broadcastTo ?? "Broadcast to"}</label>
              <div className="flex flex-wrap gap-2">
                {(isAdmin
                  ? (["group", "level", "role", "specific_students", "all_parents", "global"] as BroadcastType[])
                  : (["group"] as BroadcastType[])
                ).map((bt) => (
                  <button
                    key={bt}
                    onClick={() => setBType(bt)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                      bType === bt
                        ? "bg-[#1B2E8F] text-white border-[#1B2E8F]"
                        : "border-border text-muted-foreground hover:border-[#1B2E8F] hover:text-[#1B2E8F]"
                    }`}
                  >
                    {bt === "specific_students"
                      ? (language === "ar" ? "تلاميذ بأعيانهم" : "Specific Students")
                      : ((mt.recipientTypes as any)?.[bt] ?? bt)}
                  </button>
                ))}
              </div>
            </div>

            {/* Group picker */}
            {bType === "group" && (
              <Select value={bGroupId} onValueChange={setBGroupId}>
                <SelectTrigger><SelectValue placeholder={mt.selectGroup} /></SelectTrigger>
                <SelectContent>
                  {groupOptions.map((g) => (
                    <SelectItem key={g.id} value={String(g.id)}>{g.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Level picker */}
            {bType === "level" && (
              <Select value={bLevelId} onValueChange={setBLevelId}>
                <SelectTrigger><SelectValue placeholder={mt.selectLevel} /></SelectTrigger>
                <SelectContent>
                  {levels.map((lv) => (
                    <SelectItem key={lv.id} value={String(lv.id)}>{lv.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Role picker */}
            {bType === "role" && (
              <Select value={bRole} onValueChange={setBRole}>
                <SelectTrigger><SelectValue placeholder={mt.selectRole} /></SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((r) => (
                    <SelectItem key={r} value={r}>{roleLabel(r)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Specific students picker */}
            {bType === "specific_students" && (
              <div className="space-y-2">
                <Input
                  placeholder={language === "ar" ? "ابحث عن تلميذ..." : "Search students..."}
                  value={bStudentSearch}
                  onChange={(e) => setBStudentSearch(e.target.value)}
                />
                {bStudentIds.size > 0 && (
                  <div className="flex items-center justify-between rounded-lg bg-[#1B2E8F]/8 px-3 py-2 text-sm">
                    <span className="font-medium text-[#1B2E8F]">
                      {bStudentIds.size} {language === "ar" ? "تلميذ محدد" : "student(s) selected"}
                    </span>
                    <button onClick={() => setBStudentIds(new Set())} className="text-xs text-muted-foreground hover:text-destructive">
                      {language === "ar" ? "إلغاء" : "Clear"}
                    </button>
                  </div>
                )}
                <div className="max-h-52 overflow-y-auto space-y-0.5 border rounded-md p-1">
                  {allStudentsForBroadcast
                    .filter((s) => s.name.toLowerCase().includes(bStudentSearch.toLowerCase()))
                    .map((s) => {
                      const isSel = bStudentIds.has(s.id);
                      return (
                        <button
                          key={s.id}
                          onClick={() => setBStudentIds((prev) => {
                            const next = new Set(prev);
                            if (next.has(s.id)) next.delete(s.id); else next.add(s.id);
                            return next;
                          })}
                          className={`w-full text-start px-2.5 py-1.5 rounded text-sm flex items-center gap-2 transition-colors ${isSel ? "bg-[#1B2E8F]/10" : "hover:bg-muted"}`}
                        >
                          <div className={`w-3.5 h-3.5 rounded border-2 shrink-0 flex items-center justify-center ${isSel ? "bg-[#1B2E8F] border-[#1B2E8F]" : "border-gray-300"}`}>
                            {isSel && <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 10 8"><path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                          </div>
                          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-semibold shrink-0">{s.name[0]}</div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{s.name}</div>
                            {s.currentGroupName && <div className="text-xs text-muted-foreground truncate">{s.currentGroupName}</div>}
                          </div>
                        </button>
                      );
                    })}
                </div>
              </div>
            )}

            {/* All parents / global notice */}
            {(bType === "all_parents" || bType === "global") && (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                {bType === "all_parents"
                  ? language === "ar" ? "ستُرسل إلى جميع أولياء الأمور المسجلين." : "Will be sent to all registered parents."
                  : language === "ar" ? "ستُرسل إلى جميع المستخدمين." : "Will be sent to all users — parents and staff."
                }
              </div>
            )}

            {/* Subject */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{mt.subjectLabel}</label>
              <Input
                placeholder={mt.subjectPlaceholder}
                value={bSubject}
                onChange={(e) => setBSubject(e.target.value)}
              />
            </div>

            {/* Content */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{mt.contentLabel}</label>
              <Textarea
                rows={4}
                placeholder={mt.contentPlaceholder}
                value={bContent}
                onChange={(e) => setBContent(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <DialogClose asChild>
              <Button variant="outline">{t.groups?.cancel ?? "Cancel"}</Button>
            </DialogClose>
            <Button
              style={{ backgroundColor: "#1B2E8F", color: "#fff" }}
              disabled={
                isSending ||
                !bContent.trim() ||
                (bType === "group" && !bGroupId) ||
                (bType === "level" && !bLevelId) ||
                (bType === "role" && !bRole)
              }
              onClick={handleSendBroadcast}
            >
              <Send className="w-4 h-4 me-2" />
              {mt.send}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

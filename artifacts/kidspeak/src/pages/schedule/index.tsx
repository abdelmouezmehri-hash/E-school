import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "@/contexts/language-context";
import { useToast } from "@/hooks/use-toast";
import { useGetMe, useListUsers } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ChevronLeft, ChevronRight, Plus, CalendarDays, Users, MapPin,
  Clock, BookOpen, HeartHandshake, Megaphone, Calendar, Trash2, Pencil, Printer,
} from "lucide-react";
import { format, addDays, startOfWeek, isSameDay, parseISO, isToday } from "date-fns";
import { arDZ } from "date-fns/locale";

// ── API helpers ────────────────────────────────────────────────────────────────
function fetchSchedule(): Promise<any[]> {
  return fetch("/api/schedule/my", { credentials: "include" }).then(r => r.json());
}
function fetchEvents(): Promise<any[]> {
  return fetch("/api/events", { credentials: "include" }).then(r => r.json());
}
function postEvent(body: any): Promise<any> {
  return fetch("/api/events", {
    method: "POST", credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).then(async r => { if (!r.ok) { const e = await r.json(); throw new Error(e.error); } return r.json(); });
}
function deleteEvent(id: number): Promise<void> {
  return fetch(`/api/events/${id}`, { method: "DELETE", credentials: "include" }).then(r => {
    if (!r.ok) throw new Error("Failed to delete");
  });
}
function postInvitations(eventId: number, userIds: number[]): Promise<any> {
  return fetch(`/api/events/${eventId}/invitations`, {
    method: "POST", credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userIds }),
  }).then(r => r.json());
}
function removeInvitation(eventId: number, userId: number): Promise<any> {
  return fetch(`/api/events/${eventId}/invitations/${userId}`, { method: "DELETE", credentials: "include" })
    .then(r => r.json());
}

// ── Color helpers ─────────────────────────────────────────────────────────────
const COLOR_MAP: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  blue:   { bg: "bg-blue-50",   border: "border-blue-300",  text: "text-blue-800",   badge: "bg-blue-100 text-blue-800" },
  orange: { bg: "bg-orange-50", border: "border-orange-300",text: "text-orange-800", badge: "bg-orange-100 text-orange-800" },
  green:  { bg: "bg-green-50",  border: "border-green-300", text: "text-green-800",  badge: "bg-green-100 text-green-800" },
  purple: { bg: "bg-purple-50", border: "border-purple-300",text: "text-purple-800", badge: "bg-purple-100 text-purple-800" },
  teal:   { bg: "bg-teal-50",   border: "border-teal-300",  text: "text-teal-800",   badge: "bg-teal-100 text-teal-800" },
  gray:   { bg: "bg-gray-50",   border: "border-gray-300",  text: "text-gray-800",   badge: "bg-gray-100 text-gray-800" },
};

const TYPE_LABELS: Record<string, { en: string; ar: string; icon: any }> = {
  session:       { en: "Class Session", ar: "حصة دراسية", icon: BookOpen },
  consultation:  { en: "Consultation",  ar: "استشارة",    icon: HeartHandshake },
  meeting:       { en: "Meeting",       ar: "اجتماع",      icon: Users },
  workshop:      { en: "Workshop",      ar: "ورشة عمل",    icon: Megaphone },
  school_event:  { en: "School Event",  ar: "فعالية مدرسية", icon: Calendar },
  other:         { en: "Event",         ar: "فعالية",      icon: CalendarDays },
};

// ── Week helpers ──────────────────────────────────────────────────────────────
function getWeekDays(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}
function toDateStr(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

// ── Event card (within the calendar cell) ─────────────────────────────────────
function EventChip({ item, isRTL, onClick }: { item: any; isRTL: boolean; onClick: () => void }) {
  const c = COLOR_MAP[item.color] ?? COLOR_MAP.gray;
  const typeInfo = TYPE_LABELS[item.type] ?? TYPE_LABELS.other;
  const Icon = typeInfo.icon;
  return (
    <button
      onClick={onClick}
      className={`w-full text-start rounded-md border px-2 py-1.5 mb-1 hover:shadow-sm transition-shadow ${c.bg} ${c.border}`}
    >
      <div className={`flex items-center gap-1 ${c.text}`}>
        <Icon className="w-3 h-3 shrink-0" />
        <span className="text-xs font-semibold truncate">{item.title}</span>
      </div>
      {item.startTime && (
        <div className="text-[10px] text-muted-foreground mt-0.5">{item.startTime}</div>
      )}
      {item.subtitle && (
        <div className="text-[10px] text-muted-foreground truncate">{item.subtitle}</div>
      )}
    </button>
  );
}

// ── Detail dialog ─────────────────────────────────────────────────────────────
function DetailDialog({ item, isRTL, onClose }: { item: any; isRTL: boolean; onClose: () => void }) {
  if (!item) return null;
  const c = COLOR_MAP[item.color] ?? COLOR_MAP.gray;
  const typeInfo = TYPE_LABELS[item.type] ?? TYPE_LABELS.other;
  const Icon = typeInfo.icon;

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className={`p-1.5 rounded-md ${c.badge}`}>
              <Icon className="w-4 h-4" />
            </div>
            <Badge className={c.badge}>{isRTL ? typeInfo.ar : typeInfo.en}</Badge>
          </div>
          <DialogTitle className="text-lg">{item.title}</DialogTitle>
          {item.subtitle && <DialogDescription>{item.subtitle}</DialogDescription>}
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="flex items-center gap-2 text-sm">
            <CalendarDays className="w-4 h-4 text-muted-foreground" />
            <span>{item.date ? format(parseISO(item.date), "EEEE, dd MMMM yyyy") : "—"}</span>
          </div>
          {(item.startTime || item.endTime) && (
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span>
                {item.startTime ?? "—"}{item.endTime ? ` → ${item.endTime}` : ""}
                {item.durationMinutes ? ` (${item.durationMinutes} ${isRTL ? "دقيقة" : "min"})` : ""}
              </span>
            </div>
          )}
          {item.location && (
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              <span>{item.location}</span>
            </div>
          )}
          {item.childName && (
            <div className="text-sm"><span className="font-medium">{isRTL ? "الطفل: " : "Child: "}</span>{item.childName}</div>
          )}
          {item.description && <p className="text-sm text-muted-foreground">{item.description}</p>}
          {item.notes && <p className="text-sm text-muted-foreground">{item.notes}</p>}
          {item.status && (
            <Badge variant="outline" className="text-xs">{item.status}</Badge>
          )}
          {item.isPaid && (
            <div className="text-sm font-medium text-emerald-700">
              {isRTL ? "مدفوع" : "Paid"}{item.price ? ` — ${item.price.toLocaleString()} ${isRTL ? "دج" : "DZD"}` : ""}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{isRTL ? "إغلاق" : "Close"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Admin Event Form ──────────────────────────────────────────────────────────
function CreateEventDialog({ isRTL, users, onClose, onCreated }: {
  isRTL: boolean; users: any[]; onClose: () => void; onCreated: () => void;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [form, setForm] = useState({
    type: "meeting", title: "", description: "", date: "", startTime: "", endTime: "",
    location: "", isPaid: false, price: "",
  });
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [userSearch, setUserSearch] = useState("");

  const mut = useMutation({
    mutationFn: () => postEvent({ ...form, isPaid: form.isPaid, price: form.price || undefined, inviteeIds: selectedUserIds }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["schedule"] });
      qc.invalidateQueries({ queryKey: ["events"] });
      toast({ title: isRTL ? "تم إنشاء الفعالية" : "Event created" });
      onCreated();
    },
    onError: (e: any) => toast({ title: e.message, variant: "destructive" }),
  });

  const filteredUsers = users.filter(u =>
    u.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email?.toLowerCase().includes(userSearch.toLowerCase())
  );

  const toggleUser = (id: number) => {
    setSelectedUserIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isRTL ? "إنشاء فعالية جديدة" : "Create New Event"}</DialogTitle>
          <DialogDescription>
            {isRTL ? "أضف فعالية وادعُ المستخدمين للمشاركة" : "Add an event and invite users to participate"}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{isRTL ? "النوع *" : "Type *"}</label>
              <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="meeting">{isRTL ? "اجتماع" : "Meeting"}</SelectItem>
                  <SelectItem value="workshop">{isRTL ? "ورشة عمل" : "Workshop"}</SelectItem>
                  <SelectItem value="school_event">{isRTL ? "فعالية مدرسية" : "School Event"}</SelectItem>
                  <SelectItem value="other">{isRTL ? "أخرى" : "Other"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{isRTL ? "التاريخ *" : "Date *"}</label>
              <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">{isRTL ? "العنوان *" : "Title *"}</label>
            <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder={isRTL ? "عنوان الفعالية..." : "Event title..."} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{isRTL ? "وقت البداية" : "Start time"}</label>
              <Input type="time" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{isRTL ? "وقت الانتهاء" : "End time"}</label>
              <Input type="time" value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">{isRTL ? "الموقع" : "Location"}</label>
            <Input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder={isRTL ? "القاعة / الرابط..." : "Room / link..."} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">{isRTL ? "الوصف" : "Description"}</label>
            <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} placeholder={isRTL ? "تفاصيل اختيارية..." : "Optional details..."} />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="isPaid" checked={form.isPaid} onCheckedChange={v => setForm(f => ({ ...f, isPaid: !!v }))} />
            <label htmlFor="isPaid" className="text-sm">{isRTL ? "فعالية مدفوعة" : "Paid event"}</label>
            {form.isPaid && (
              <Input type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                placeholder={isRTL ? "السعر (دج)" : "Price (DZD)"} className="w-32 ms-2" />
            )}
          </div>

          {/* Invite users */}
          <div className="space-y-2">
            <label className="text-sm font-medium">{isRTL ? "دعوة مستخدمين" : "Invite users"}</label>
            <Input
              placeholder={isRTL ? "بحث بالاسم أو البريد..." : "Search by name or email..."}
              value={userSearch}
              onChange={e => setUserSearch(e.target.value)}
            />
            <div className="border rounded-md max-h-40 overflow-y-auto divide-y">
              {filteredUsers.slice(0, 30).map((u: any) => (
                <label key={u.id} className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-muted/50">
                  <Checkbox checked={selectedUserIds.includes(u.id)} onCheckedChange={() => toggleUser(u.id)} />
                  <div>
                    <div className="text-sm font-medium">{u.name}</div>
                    <div className="text-xs text-muted-foreground">{u.role}</div>
                  </div>
                </label>
              ))}
              {filteredUsers.length === 0 && (
                <div className="text-xs text-muted-foreground text-center py-3">{isRTL ? "لا توجد نتائج" : "No results"}</div>
              )}
            </div>
            {selectedUserIds.length > 0 && (
              <div className="text-xs text-muted-foreground">{selectedUserIds.length} {isRTL ? "مستخدم محدد" : "users selected"}</div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{isRTL ? "إلغاء" : "Cancel"}</Button>
          <Button onClick={() => mut.mutate()} disabled={mut.isPending || !form.title || !form.date}>
            {mut.isPending ? (isRTL ? "جاري الإنشاء..." : "Creating...") : (isRTL ? "إنشاء" : "Create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Admin Events Management list ───────────────────────────────────────────────
function AdminEventsPanel({ isRTL, users }: { isRTL: boolean; users: any[] }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [inviteEvent, setInviteEvent] = useState<any | null>(null);
  const [inviteSearch, setInviteSearch] = useState("");
  const [inviteSelected, setInviteSelected] = useState<number[]>([]);

  const { data: events = [] } = useQuery({ queryKey: ["events"], queryFn: fetchEvents });

  const delMut = useMutation({
    mutationFn: (id: number) => deleteEvent(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["events"] }); qc.invalidateQueries({ queryKey: ["schedule"] }); toast({ title: isRTL ? "تم الحذف" : "Deleted" }); },
  });

  const inviteMut = useMutation({
    mutationFn: () => postInvitations(inviteEvent!.id, inviteSelected),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["events"] }); qc.invalidateQueries({ queryKey: ["schedule"] }); toast({ title: isRTL ? "تمت الدعوة" : "Invited" }); setInviteEvent(null); setInviteSelected([]); },
  });

  const removeInviteMut = useMutation({
    mutationFn: ({ eventId, userId }: { eventId: number; userId: number }) => removeInvitation(eventId, userId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["events"] }); toast({ title: isRTL ? "تمت إزالة الدعوة" : "Invitation removed" }); },
  });

  const colorMap: Record<string, string> = { meeting: "orange", workshop: "green", school_event: "purple", other: "gray" };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">{isRTL ? "إدارة الفعاليات" : "Event Management"}</h2>
          <p className="text-sm text-muted-foreground">{isRTL ? "أنشئ الفعاليات وادعُ المستخدمين" : "Create events and invite users"}</p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus className="w-4 h-4 me-1.5" />
          {isRTL ? "فعالية جديدة" : "New Event"}
        </Button>
      </div>

      {(events as any[]).length === 0 ? (
        <div className="text-center py-10 text-muted-foreground border rounded-lg bg-card/50">
          {isRTL ? "لا توجد فعاليات بعد" : "No events yet"}
        </div>
      ) : (
        <div className="space-y-3">
          {(events as any[]).map((ev: any) => {
            const c = COLOR_MAP[colorMap[ev.type] ?? "gray"];
            const typeInfo = TYPE_LABELS[ev.type] ?? TYPE_LABELS.other;
            const Icon = typeInfo.icon;
            return (
              <Card key={ev.id} className={`border ${c.border}`}>
                <CardContent className="py-3 px-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className={`p-1.5 rounded-md mt-0.5 ${c.badge}`}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="font-semibold text-sm">{ev.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {ev.date} {ev.startTime ? `· ${ev.startTime}` : ""} {ev.location ? `· ${ev.location}` : ""}
                        </div>
                        {ev.description && <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{ev.description}</div>}
                        {(ev.invitees || []).length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {(ev.invitees as any[]).map((inv: any) => (
                              <span key={inv.userId} className="inline-flex items-center gap-1 text-[10px] bg-muted rounded-full px-2 py-0.5">
                                {inv.userName ?? `#${inv.userId}`}
                                <button
                                  onClick={() => removeInviteMut.mutate({ eventId: ev.id, userId: inv.userId })}
                                  className="hover:text-destructive ml-0.5"
                                >×</button>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setInviteEvent(ev); setInviteSearch(""); setInviteSelected([]); }}>
                        <Users className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-destructive" onClick={() => delMut.mutate(ev.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {creating && (
        <CreateEventDialog isRTL={isRTL} users={users} onClose={() => setCreating(false)} onCreated={() => setCreating(false)} />
      )}

      {inviteEvent && (
        <Dialog open onOpenChange={(v) => !v && setInviteEvent(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>{isRTL ? "دعوة مستخدمين" : "Invite Users"}</DialogTitle>
              <DialogDescription>{inviteEvent.title}</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <Input
                placeholder={isRTL ? "بحث..." : "Search..."}
                value={inviteSearch}
                onChange={e => setInviteSearch(e.target.value)}
              />
              <div className="border rounded-md max-h-48 overflow-y-auto divide-y">
                {users.filter(u =>
                  u.name?.toLowerCase().includes(inviteSearch.toLowerCase()) &&
                  !(inviteEvent.invitees || []).some((inv: any) => inv.userId === u.id)
                ).slice(0, 30).map((u: any) => (
                  <label key={u.id} className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-muted/50">
                    <Checkbox checked={inviteSelected.includes(u.id)} onCheckedChange={() => setInviteSelected(prev => prev.includes(u.id) ? prev.filter(x => x !== u.id) : [...prev, u.id])} />
                    <div>
                      <div className="text-sm font-medium">{u.name}</div>
                      <div className="text-xs text-muted-foreground">{u.role}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setInviteEvent(null)}>{isRTL ? "إلغاء" : "Cancel"}</Button>
              <Button onClick={() => inviteMut.mutate()} disabled={inviteSelected.length === 0 || inviteMut.isPending}>
                {inviteMut.isPending ? (isRTL ? "جاري الدعوة..." : "Inviting...") : (isRTL ? "دعوة" : "Invite")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// ── Legend ─────────────────────────────────────────────────────────────────────
function Legend({ isRTL }: { isRTL: boolean }) {
  const items = [
    { color: "blue",   labelEn: "Session",      labelAr: "حصة دراسية" },
    { color: "teal",   labelEn: "Consultation", labelAr: "استشارة" },
    { color: "orange", labelEn: "Meeting",      labelAr: "اجتماع" },
    { color: "green",  labelEn: "Workshop",     labelAr: "ورشة عمل" },
    { color: "purple", labelEn: "School Event", labelAr: "فعالية مدرسية" },
  ];
  return (
    <div className="flex flex-wrap gap-3">
      {items.map(i => {
        const c = COLOR_MAP[i.color];
        return (
          <span key={i.color} className={`inline-flex items-center gap-1.5 text-xs rounded-full px-2.5 py-1 ${c.badge}`}>
            <span className={`w-2 h-2 rounded-full ${c.bg} border ${c.border}`} />
            {isRTL ? i.labelAr : i.labelEn}
          </span>
        );
      })}
    </div>
  );
}

// ── Main schedule page ─────────────────────────────────────────────────────────
export default function SchedulePage() {
  const { language } = useLanguage();
  const isRTL = language === "ar";
  const { data: me } = useGetMe();
  const role = (me as any)?.role ?? "";
  const isAdmin = role === "admin";

  const { data: scheduleItems = [], isLoading } = useQuery({
    queryKey: ["schedule"],
    queryFn: fetchSchedule,
    enabled: !!role,
  });

  const { data: users = [] } = useListUsers();
  const allUsers = (users as any[]).filter(u => u.role !== "parent");

  // Week navigation
  const today = new Date();
  const [weekOffset, setWeekOffset] = useState(0);
  const weekStart = useMemo(() => {
    const base = startOfWeek(addDays(today, weekOffset * 7), { weekStartsOn: 0 }); // Sunday
    return base;
  }, [weekOffset]);
  const weekDays = useMemo(() => getWeekDays(weekStart), [weekStart]);

  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [showAdmin, setShowAdmin] = useState(false);

  // Group items by date string
  const itemsByDate = useMemo(() => {
    const map: Record<string, any[]> = {};
    for (const item of (scheduleItems as any[])) {
      if (!map[item.date]) map[item.date] = [];
      map[item.date].push(item);
    }
    return map;
  }, [scheduleItems]);

  const weekLabel = useMemo(() => {
    const s = format(weekStart, "dd MMM");
    const e = format(addDays(weekStart, 6), "dd MMM yyyy");
    return `${s} – ${e}`;
  }, [weekStart]);

  const totalThisWeek = weekDays.reduce((s, d) => s + (itemsByDate[toDateStr(d)]?.length ?? 0), 0);

  const dayNames = isRTL
    ? ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"]
    : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6" dir={isRTL ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-[#1B2E8F]" />
            {isRTL ? "جدولتي" : "My Schedule"}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isRTL ? "عرض أسبوعي لجميع مواعيدك وفعالياتك" : "Weekly view of all your sessions and events"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="w-4 h-4 me-1.5" />
            {isRTL ? "طباعة" : "Print"}
          </Button>
          {isAdmin && (
            <Button variant="outline" onClick={() => setShowAdmin(v => !v)}>
              <Pencil className="w-4 h-4 me-1.5" />
              {isRTL ? "إدارة الفعاليات" : "Manage Events"}
            </Button>
          )}
        </div>
      </div>

      {/* Legend */}
      <Legend isRTL={isRTL} />

      {/* Week navigation */}
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" onClick={() => setWeekOffset(o => o - 1)}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1 text-center">
          <span className="font-semibold text-sm">{weekLabel}</span>
          {weekOffset === 0 && (
            <Badge variant="secondary" className="ms-2 text-xs">{isRTL ? "هذا الأسبوع" : "This week"}</Badge>
          )}
        </div>
        <Button variant="outline" size="icon" onClick={() => setWeekOffset(o => o + 1)}>
          <ChevronRight className="w-4 h-4" />
        </Button>
        {weekOffset !== 0 && (
          <Button variant="ghost" size="sm" onClick={() => setWeekOffset(0)} className="text-xs">
            {isRTL ? "اليوم" : "Today"}
          </Button>
        )}
      </div>

      {/* Stats strip */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <CalendarDays className="w-4 h-4" />
        <span>{isRTL ? `${totalThisWeek} فعالية هذا الأسبوع` : `${totalThisWeek} items this week`}</span>
      </div>

      {/* Weekly grid */}
      {isLoading ? (
        <div className="text-center py-16 text-muted-foreground">{isRTL ? "جاري التحميل..." : "Loading..."}</div>
      ) : (
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map((day, idx) => {
            const dateStr = toDateStr(day);
            const dayItems = itemsByDate[dateStr] ?? [];
            const isToday_ = isToday(day);
            return (
              <div key={dateStr} className={`rounded-xl border min-h-[120px] flex flex-col ${isToday_ ? "border-[#1B2E8F] bg-[#1B2E8F]/[0.03]" : "border-border bg-card"}`}>
                {/* Day header */}
                <div className={`px-2 pt-2 pb-1 text-center rounded-t-xl ${isToday_ ? "bg-[#1B2E8F] text-white" : ""}`}>
                  <div className={`text-[10px] font-medium ${isToday_ ? "text-blue-100" : "text-muted-foreground"}`}>
                    {dayNames[idx]}
                  </div>
                  <div className={`text-sm font-bold ${isToday_ ? "text-white" : ""}`}>
                    {format(day, "d")}
                  </div>
                </div>
                {/* Events */}
                <div className="px-1.5 py-1.5 flex-1 space-y-0.5">
                  {dayItems.length === 0 ? (
                    <div className="text-[10px] text-muted-foreground/50 text-center py-2">—</div>
                  ) : (
                    dayItems.map(item => (
                      <EventChip key={item.id} item={item} isRTL={isRTL} onClick={() => setSelectedItem(item)} />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upcoming list (next 14 days) */}
      {!isLoading && (() => {
        const upcoming = (scheduleItems as any[]).filter(item => {
          const d = new Date(item.date);
          const diff = (d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
          return diff >= 0 && diff <= 14;
        }).sort((a, b) => a.date.localeCompare(b.date));
        if (upcoming.length === 0) return null;
        return (
          <div className="space-y-3">
            <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              {isRTL ? "القادم خلال ١٤ يوماً" : "Upcoming in 14 days"}
            </h2>
            <div className="space-y-2">
              {upcoming.map(item => {
                const c = COLOR_MAP[item.color] ?? COLOR_MAP.gray;
                const typeInfo = TYPE_LABELS[item.type] ?? TYPE_LABELS.other;
                const Icon = typeInfo.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => setSelectedItem(item)}
                    className={`w-full text-start flex items-center gap-3 p-3 rounded-lg border hover:shadow-sm transition-shadow ${c.bg} ${c.border}`}
                  >
                    <div className={`p-1.5 rounded-md shrink-0 ${c.badge}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`font-semibold text-sm ${c.text}`}>{item.title}</div>
                      {item.subtitle && <div className="text-xs text-muted-foreground truncate">{item.subtitle}</div>}
                    </div>
                    <div className="text-xs text-muted-foreground shrink-0">
                      {format(parseISO(item.date), "EEE dd MMM")}
                      {item.startTime && ` · ${item.startTime}`}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Admin panel */}
      {isAdmin && showAdmin && (
        <div className="border-t pt-6">
          <AdminEventsPanel isRTL={isRTL} users={allUsers} />
        </div>
      )}

      {/* Detail dialog */}
      {selectedItem && (
        <DetailDialog item={selectedItem} isRTL={isRTL} onClose={() => setSelectedItem(null)} />
      )}
    </div>
  );
}

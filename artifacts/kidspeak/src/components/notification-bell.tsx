import { useState, useRef, useEffect } from "react";
import { Bell, Check, Trash2, CreditCard, UserPlus, MessageCircle, Calendar, DollarSign, AlertCircle, Info } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

type Notification = {
  id: number;
  userId: number;
  type: string;
  title: string;
  message?: string | null;
  isRead: boolean;
  link?: string | null;
  createdAt: string;
};

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: "include", ...options });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return "الآن";
  if (diff < 3600) return `منذ ${Math.floor(diff / 60)} دقيقة`;
  if (diff < 86400) return `منذ ${Math.floor(diff / 3600)} ساعة`;
  return `منذ ${Math.floor(diff / 86400)} يوم`;
}

const TYPE_ICONS: Record<string, { Icon: React.ElementType; color: string }> = {
  payment_received: { Icon: CreditCard,    color: "#22c55e" },
  payment_due:      { Icon: AlertCircle,   color: "#f59e0b" },
  new_registration: { Icon: UserPlus,      color: "#3b82f6" },
  message:          { Icon: MessageCircle, color: "#8b5cf6" },
  event:            { Icon: Calendar,      color: "#06b6d4" },
  salary:           { Icon: DollarSign,    color: "#22c55e" },
  attendance:       { Icon: AlertCircle,   color: "#ef4444" },
  general:          { Icon: Info,          color: "#94a3b8" },
};

function getTypeStyle(type: string) {
  return TYPE_ICONS[type] ?? TYPE_ICONS.general;
}

export function NotificationBell({ isMobile = false }: { isMobile?: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const qc = useQueryClient();

  const { data: countData } = useQuery({
    queryKey: ["notifications-count"],
    queryFn: () => apiFetch<{ count: number }>("/api/notifications/unread-count"),
    refetchInterval: 30_000,
  });

  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ["notifications"],
    queryFn: () => apiFetch<Notification[]>("/api/notifications"),
    enabled: open,
    refetchInterval: open ? 15_000 : false,
  });

  const readOne = useMutation({
    mutationFn: (id: number) => apiFetch(`/api/notifications/${id}/read`, { method: "PUT" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["notifications-count"] });
    },
  });

  const readAll = useMutation({
    mutationFn: () => apiFetch("/api/notifications/read-all", { method: "PUT" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["notifications-count"] });
    },
  });

  const deleteOne = useMutation({
    mutationFn: (id: number) => apiFetch(`/api/notifications/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["notifications-count"] });
    },
  });

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const unread = countData?.count ?? 0;

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          background: "rgba(255,255,255,0.07)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 8,
          width: isMobile ? 36 : 34,
          height: isMobile ? 36 : 34,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          position: "relative",
          flexShrink: 0,
        }}
        title="الإشعارات"
      >
        <Bell size={isMobile ? 18 : 16} color="rgba(255,255,255,0.7)" />
        {unread > 0 && (
          <span style={{
            position: "absolute",
            top: -5,
            right: -5,
            background: "#ef4444",
            color: "#fff",
            borderRadius: 10,
            fontSize: 10,
            fontWeight: 700,
            minWidth: 16,
            height: 16,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "0 3px",
            lineHeight: 1,
          }}>
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: "absolute",
          top: "calc(100% + 8px)",
          left: isMobile ? "auto" : 0,
          right: isMobile ? 0 : "auto",
          width: 320,
          maxHeight: 380,
          background: "#1a2744",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 12,
          boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          direction: "rtl",
        }}>
          {/* Header */}
          <div style={{
            padding: "10px 14px",
            borderBottom: "1px solid rgba(255,255,255,0.07)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}>
            <span style={{ color: "#fff", fontSize: 13, fontWeight: 600 }}>
              الإشعارات{" "}
              {unread > 0 && <span style={{ color: "#F5A800", fontSize: 11 }}>({unread} جديد)</span>}
            </span>
            {unread > 0 && (
              <button
                onClick={() => readAll.mutate()}
                style={{ background: "none", border: "none", color: "#F5A800", fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
              >
                <Check size={12} />
                تحديد الكل كمقروء
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ overflowY: "auto", flex: 1 }}>
            {notifications.length === 0 ? (
              <div style={{ padding: "32px 16px", textAlign: "center" }}>
                <Bell size={28} color="rgba(255,255,255,0.15)" style={{ marginBottom: 8 }} />
                <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 13, margin: 0 }}>لا توجد إشعارات جديدة</p>
              </div>
            ) : (
              notifications.map(n => {
                const { Icon, color } = getTypeStyle(n.type);
                return (
                  <div
                    key={n.id}
                    onClick={() => {
                      if (!n.isRead) readOne.mutate(n.id);
                      if (n.link) { window.location.href = n.link; setOpen(false); }
                    }}
                    style={{
                      padding: "10px 14px",
                      borderBottom: "1px solid rgba(255,255,255,0.04)",
                      background: n.isRead ? "transparent" : "rgba(245,168,0,0.06)",
                      cursor: n.link ? "pointer" : "default",
                      display: "flex",
                      gap: 10,
                      alignItems: "flex-start",
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = n.isRead ? "transparent" : "rgba(245,168,0,0.06)"; }}
                  >
                    <div style={{
                      width: 30, height: 30, borderRadius: 8,
                      background: `${color}20`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0, marginTop: 1,
                    }}>
                      <Icon size={14} color={color} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{
                        margin: 0, fontSize: 12.5,
                        color: n.isRead ? "rgba(255,255,255,0.6)" : "#fff",
                        fontWeight: n.isRead ? 400 : 600,
                        lineHeight: 1.4,
                      }}>
                        {n.title}
                      </p>
                      {n.message && (
                        <p style={{ margin: "2px 0 0", fontSize: 11, color: "rgba(255,255,255,0.4)", lineHeight: 1.4 }}>
                          {n.message}
                        </p>
                      )}
                      <p style={{ margin: "4px 0 0", fontSize: 10, color: "rgba(255,255,255,0.25)" }}>
                        {timeAgo(n.createdAt)}
                      </p>
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); deleteOne.mutate(n.id); }}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.2)", padding: 2, flexShrink: 0, marginTop: 2 }}
                      title="حذف"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

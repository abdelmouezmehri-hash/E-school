import {
  LayoutDashboard, Users, BookOpen, GraduationCap, BarChart2,
  Activity, DollarSign, Languages, LogOut, ChevronDown,
  Brain, Stethoscope, MessageSquare, Bell, Image, Lightbulb
} from "lucide-react";

const SB_BG           = "#0D1B2E";
const SB_GOLD         = "#F5A800";
const SB_ACTIVE_BG    = "rgba(245,168,0,0.15)";
const SB_ACTIVE_BORDER= "rgba(245,168,0,0.25)";
const SB_TEXT_MUTED   = "rgba(255,255,255,0.6)";
const SB_SECTION_LABEL= "rgba(255,255,255,0.25)";
const SB_DIVIDER      = "rgba(255,255,255,0.07)";
const SB_HOVER_BG     = "rgba(255,255,255,0.05)";
const SB_USER_CARD_BG = "rgba(255,255,255,0.04)";

const navGroups = [
  {
    items: [{ icon: LayoutDashboard, label: "لوحة التحكم", active: true }],
  },
  {
    label: "الأكاديمية",
    items: [
      { icon: Users,          label: "الأفواج" },
      { icon: BookOpen,       label: "البرامج" },
      { icon: GraduationCap,  label: "التلاميذ" },
      { icon: BarChart2,      label: "التقييمات" },
      { icon: Activity,       label: "الأداء" },
      { icon: Brain,          label: "المتابعة السلوكية" },
    ],
  },
  {
    label: "المالية",
    items: [
      { icon: DollarSign, label: "المداخيل" },
    ],
  },
];

export default function SidebarCurrent() {
  return (
    <div style={{ width: 240, height: 600, backgroundColor: SB_BG, display: "flex", flexDirection: "column", fontFamily: "system-ui, sans-serif", direction: "rtl" }}>
      {/* Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 16px", borderBottom: `1px solid ${SB_DIVIDER}` }}>
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" style={{ flexShrink: 0 }}>
          <circle cx="12" cy="18" r="8" fill={SB_GOLD} />
          <path d="M18 13 Q21 10 24 13" stroke={SB_GOLD} strokeWidth="2.2" strokeLinecap="round" fill="none" />
          <path d="M20 10 Q24 6 28 10" stroke={SB_GOLD} strokeWidth="2.2" strokeLinecap="round" fill="none" />
        </svg>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, lineHeight: 1.15 }}>
            <span style={{ color: "#fff" }}>kid</span>
            <span style={{ color: SB_GOLD }}>Speak</span>
          </div>
          <div style={{ fontSize: 10, color: SB_SECTION_LABEL, marginTop: 2 }}>أكاديمية اللغة</div>
        </div>
      </div>

      {/* Nav */}
      <div style={{ flex: 1, overflowY: "auto", padding: "8px 8px 4px" }}>
        {navGroups.map((group, gi) => (
          <div key={gi}>
            {group.label && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 12px 4px", fontSize: 9, letterSpacing: "1.5px", textTransform: "uppercase", color: SB_SECTION_LABEL }}>
                <span style={{ flex: 1 }}>{group.label}</span>
                <ChevronDown style={{ width: 11, height: 11, color: SB_SECTION_LABEL }} />
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {group.items.map((item, ii) => {
                const Icon = item.icon;
                const isActive = (item as any).active;
                return (
                  <div key={ii} style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "8px 11px", borderRadius: 8, cursor: "pointer",
                    backgroundColor: isActive ? SB_ACTIVE_BG : "transparent",
                    border: `0.5px solid ${isActive ? SB_ACTIVE_BORDER : "transparent"}`,
                    color: isActive ? SB_GOLD : SB_TEXT_MUTED,
                  }}>
                    <Icon style={{ width: 15, height: 15, flexShrink: 0 }} />
                    <span style={{ fontSize: 13, fontWeight: isActive ? 600 : 400, color: isActive ? SB_GOLD : "#fff" }}>{item.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Lang toggle */}
      <div style={{ padding: "6px 8px 0", borderTop: `1px solid ${SB_DIVIDER}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 11px", borderRadius: 8, color: SB_TEXT_MUTED, fontSize: 12, cursor: "pointer" }}>
          <Languages style={{ width: 14, height: 14 }} />
          <span>English</span>
        </div>
      </div>

      {/* User card */}
      <div style={{ margin: "6px 8px 10px", background: SB_USER_CARD_BG, border: "0.5px solid rgba(255,255,255,0.08)", borderRadius: 11, padding: "10px 12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <div style={{ width: 30, height: 30, borderRadius: "50%", flexShrink: 0, background: "rgba(245,168,0,0.2)", border: "1.5px solid rgba(245,168,0,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: SB_GOLD, fontWeight: 600, fontSize: 12 }}>A</span>
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ color: "#fff", fontSize: 12, fontWeight: 500 }}>Admin</div>
            <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 10, marginTop: 1 }}>مدير</div>
          </div>
        </div>
        <div style={{ borderTop: `0.5px solid ${SB_DIVIDER}`, paddingTop: 8, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: "rgba(240,100,100,0.8)", fontSize: 12, cursor: "pointer" }}>
            <LogOut style={{ width: 13, height: 13 }} />
            <span>تسجيل الخروج</span>
          </div>
          <Bell style={{ width: 15, height: 15, color: SB_TEXT_MUTED, cursor: "pointer" }} />
        </div>
      </div>
    </div>
  );
}

import { Link, useLocation } from "wouter";
import { useGetMe, useLogout } from "@workspace/api-client-react";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  LineChart,
  CreditCard,
  DollarSign,
  Settings,
  LogOut,
  Menu,
  Languages,
  Brain,
  UserCog,
  BookOpen,
  Wallet,
  MessageCircle,
  Megaphone,
  Inbox,
  MapPin,
  GalleryHorizontalEnd,
  UserCircle,
  ShieldAlert,
  FileText,
  Palette,
  Lightbulb,
  ClipboardList,
  Globe,
  Building2,
  ChevronDown,
  Check,
} from "lucide-react";
import { useBranch } from "@/contexts/branch-context";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/language-context";

type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
  permission: string;
  badge?: number;
};

type NavGroup = {
  label?: string;
  divider?: boolean;
  items: NavItem[];
};

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { data: user } = useGetMe();
  const { mutate: logout } = useLogout();
  const { toast } = useToast();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [newMediaCount, setNewMediaCount] = useState(0);
  const [unreadMsgCount, setUnreadMsgCount] = useState(0);
  const [newIdeaCount, setNewIdeaCount] = useState(0);
  // All labeled groups start open; indices 0–6 cover all adminNavGroups
  const [openGroups, setOpenGroups] = useState<Set<number>>(
    () => new Set([0, 1, 2, 3, 4, 5, 6])
  );
  const { language, setLanguage, t, isRTL, pupilLabel } = useLanguage();
  const { branches, selectedBranchId, setSelectedBranchId } = useBranch();
  const role = user?.role ?? "";

  // Fetch new media count for parents, admins, photographers, designers, marketers
  useEffect(() => {
    if (!user) return;
    if (!["parent", "admin", "teacher", "photographer", "designer", "marketer"].includes(user.role)) return;
    fetch("/api/media/new-count", { credentials: "include" })
      .then(r => r.ok ? r.json() : { count: 0 })
      .then(data => setNewMediaCount(data.count ?? 0))
      .catch(() => {});
  }, [user]);

  // Fetch new idea count (admin: pending ideas; others: approved ideas)
  useEffect(() => {
    if (!user) return;
    const fetchCount = () => {
      fetch("/api/ideas/new-count", { credentials: "include" })
        .then(r => r.ok ? r.json() : { count: 0 })
        .then(data => setNewIdeaCount(data.count ?? 0))
        .catch(() => {});
    };
    fetchCount();
    const interval = setInterval(fetchCount, 60000);
    return () => clearInterval(interval);
  }, [user]);

  // Fetch unread message count for roles that have an inbox
  useEffect(() => {
    if (!user) return;
    if (!["parent", "admin", "teacher", "branch_manager"].includes(user.role)) return;
    const fetchUnread = () => {
      fetch("/api/messages/unread-count", { credentials: "include" })
        .then(r => r.ok ? r.json() : { count: 0 })
        .then(data => setUnreadMsgCount(data.count ?? 0))
        .catch(() => {});
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, [user]);

  // Auto-open the group that contains the current route (on navigation)
  useEffect(() => {
    if (role !== "admin") return;
    const groupPaths: Record<number, string[]> = {
      1: ["/groups", "/programs", "/students", "/evaluations", "/performance", "/behavioral"],
      2: ["/revenue", "/payments", "/admin/financial-requests"],
      3: ["/inbox", "/admin/consultations", "/news", "/requests"],
      4: ["/users", "/branches", "/admin/registration-requests", "/admin/marketing-hub", "/admin/web-content", "/settings"],
      5: ["/gallery", "/studio"],
      6: ["/idea-box", "/my-profile"],
    };
    Object.entries(groupPaths).forEach(([idx, paths]) => {
      if (paths.some(href => location === href || location.startsWith(href + "/"))) {
        setOpenGroups(prev => new Set([...prev, Number(idx)]));
      }
    });
  }, [location, role]);

  if (!user) return <>{children}</>;

  const isCustomRoleUser = !!(user as any).customRoleId;
  const userPermissions: string[] = (user as any).permissions ?? [];

  function canSee(permissionKey: string): boolean {
    if (!isCustomRoleUser) return true;
    return userPermissions.includes(permissionKey);
  }

  function toggleGroup(idx: number) {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }

  // ── Admin: grouped navigation ──────────────────────────────────────────────
  const adminNavGroups: NavGroup[] = [
    {
      // Standalone — no header
      items: [
        { href: "/dashboard", label: t.nav.dashboard, icon: LayoutDashboard, permission: "dashboard" },
      ],
    },
    {
      label: isRTL ? "الأكاديمية" : "Academic",
      items: [
        { href: "/groups",      label: t.nav.groups,      icon: BookOpen,            permission: "groups" },
        { href: "/programs",    label: t.nav.programs,    icon: GraduationCap,       permission: "programs" },
        { href: "/students",    label: pupilLabel,         icon: Users,               permission: "students" },
        { href: "/evaluations", label: t.nav.evaluations, icon: LineChart,            permission: "evaluations" },
        { href: "/performance", label: t.nav.performance, icon: LineChart,            permission: "performance" },
        { href: "/behavioral",  label: t.nav.behavioral,  icon: Brain,               permission: "behavioral" },
      ],
    },
    {
      label: isRTL ? "المالية" : "Finance",
      items: [
        { href: "/revenue",                    label: t.nav.revenue,               icon: DollarSign, permission: "revenue" },
        { href: "/payments",                   label: t.nav.payments,              icon: CreditCard, permission: "payments" },
        { href: "/admin/financial-requests",   label: t.nav.staffFinancialRequests, icon: FileText,  permission: "financial_requests" },
      ],
    },
    {
      label: isRTL ? "التواصل" : "Communication",
      items: [
        { href: "/inbox",               label: t.nav.inbox,         icon: Inbox,          badge: unreadMsgCount > 0 ? unreadMsgCount : undefined, permission: "inbox" },
        { href: "/admin/consultations", label: t.nav.consultations, icon: MessageCircle,  permission: "consultations" },
        { href: "/news",                label: t.nav.news,          icon: Megaphone,      permission: "news" },
        { href: "/requests",            label: t.nav.requests,      icon: MapPin,         permission: "requests" },
      ],
    },
    {
      label: isRTL ? "الإدارة" : "Administration",
      items: [
        { href: "/users",                        label: t.nav.users,               icon: UserCog,     permission: "users" },
        { href: "/branches",                     label: isRTL ? "الفروع" : "Branches", icon: Building2, permission: "branches" },
        { href: "/admin/registration-requests",  label: t.nav.registrationRequests, icon: ClipboardList, permission: "registration_requests" },
        { href: "/admin/marketing-hub",          label: isRTL ? "مركز التسويق" : "Marketing Hub", icon: Megaphone, permission: "marketing_hub" },
        { href: "/admin/web-content",            label: language === "ar" ? "إدارة المحتوى" : "Web Content", icon: Globe, permission: "web_content" },
        { href: "/settings",                     label: t.nav.settings,            icon: Settings,    permission: "settings" },
      ],
    },
    {
      label: isRTL ? "الإبداع والوسائط" : "Creative & Media",
      items: [
        { href: "/gallery", label: t.nav.gallery, icon: GalleryHorizontalEnd, permission: "gallery" },
        { href: "/studio",  label: t.nav.studio,  icon: Palette,              permission: "studio" },
      ],
    },
    {
      // Idea Box + My Profile — divider before them
      divider: true,
      items: [
        { href: "/idea-box",   label: t.nav.ideaBox,   icon: Lightbulb,  badge: newIdeaCount > 0 ? newIdeaCount : undefined, permission: "idea_box" },
        { href: "/my-profile", label: t.nav.myProfile, icon: UserCircle, permission: "my_profile" },
      ],
    },
  ];

  // ── Non-admin: flat navigation ─────────────────────────────────────────────
  const navItems: NavItem[] = [
    // Accountant
    ...(role === "accountant" ? [
      { href: "/dashboard", label: t.nav.dashboard, icon: LayoutDashboard, permission: "dashboard" },
      { href: "/payments",  label: t.nav.payments,  icon: CreditCard,      permission: "payments" },
      { href: "/revenue",   label: t.nav.revenue,   icon: DollarSign,      permission: "revenue" },
      { href: "/students",  label: pupilLabel,       icon: Users,           permission: "students" },
    ] : []),
    // Psychologist
    ...(role === "psychologist" ? [
      { href: "/psychologist/feed",         label: t.nav.priorityQueue,  icon: ShieldAlert,    permission: "psychologist_feed" },
      { href: "/behavioral",                label: t.nav.behavioral,     icon: Brain,          permission: "behavioral" },
      { href: "/psychologist/sessions",     label: t.nav.mySessions,     icon: BookOpen,       permission: "psychologist_sessions" },
      { href: "/psychologist/earnings",     label: t.nav.myEarnings,     icon: Wallet,         permission: "psychologist_earnings" },
      { href: "/students",                  label: pupilLabel,            icon: Users,          permission: "students" },
      { href: "/psychologist/consultations",label: t.nav.consultations,  icon: MessageCircle,  permission: "consultations" },
    ] : []),
    // Teacher
    ...(role === "teacher" ? [
      { href: "/groups",         label: t.nav.myGroups,    icon: BookOpen,            permission: "groups" },
      { href: "/groups/earnings",label: t.nav.myEarnings,  icon: Wallet,              permission: "groups" },
      { href: "/evaluations",    label: t.nav.evaluations, icon: LineChart,            permission: "evaluations" },
      { href: "/students",       label: pupilLabel,         icon: Users,               permission: "students" },
      { href: "/gallery",        label: t.nav.gallery,     icon: GalleryHorizontalEnd, permission: "gallery" },
      { href: "/inbox",          label: t.nav.inbox,       icon: Inbox, badge: unreadMsgCount > 0 ? unreadMsgCount : undefined, permission: "inbox" },
    ] : []),
    // Parent
    ...(role === "parent" ? [
      { href: "/students",    label: t.nav.myChildren, icon: Users,               permission: "students" },
      { href: "/our-method",  label: language === "ar" ? "منهجنا" : "Our Method", icon: Lightbulb, permission: "" },
      { href: "/gallery",     label: t.nav.gallery,    icon: GalleryHorizontalEnd, badge: newMediaCount > 0 ? newMediaCount : undefined, permission: "gallery" },
      { href: "/news",        label: t.nav.news,       icon: Megaphone,           permission: "news" },
      { href: "/requests",    label: t.nav.requests,   icon: MapPin,              permission: "requests" },
      { href: "/inbox",       label: t.nav.inbox,      icon: Inbox, badge: unreadMsgCount > 0 ? unreadMsgCount : undefined, permission: "inbox" },
      { href: "/payments",    label: t.nav.payments,   icon: CreditCard,          permission: "payments" },
      { href: "/consultations",label: t.nav.consultations, icon: MessageCircle,   permission: "consultations" },
    ] : []),
    // Creative roles
    ...((role === "photographer" || role === "designer" || role === "marketer") ? [
      { href: "/dashboard", label: t.nav.dashboard, icon: LayoutDashboard,         permission: "dashboard" },
      { href: "/gallery",   label: t.nav.gallery,   icon: GalleryHorizontalEnd, badge: newMediaCount > 0 ? newMediaCount : undefined, permission: "gallery" },
      { href: "/studio",    label: t.nav.studio,    icon: Palette,                 permission: "studio" },
    ] : []),
    // Branch Manager
    ...(role === "branch_manager" ? [
      { href: "/dashboard",   label: t.nav.dashboard,   icon: LayoutDashboard,      permission: "dashboard" },
      { href: "/students",    label: pupilLabel,         icon: Users,                permission: "students" },
      { href: "/groups",      label: t.nav.groups,      icon: BookOpen,             permission: "groups" },
      { href: "/evaluations", label: t.nav.evaluations, icon: LineChart,             permission: "evaluations" },
      { href: "/payments",    label: t.nav.payments,    icon: CreditCard,           permission: "payments" },
      { href: "/revenue",     label: t.nav.revenue,     icon: DollarSign,           permission: "revenue" },
      { href: "/users",       label: t.nav.users,       icon: UserCog,              permission: "users" },
      { href: "/news",        label: t.nav.news,        icon: Megaphone,            permission: "news" },
      { href: "/inbox",       label: t.nav.inbox,       icon: Inbox, badge: unreadMsgCount > 0 ? unreadMsgCount : undefined, permission: "inbox" },
      { href: "/gallery",     label: t.nav.gallery,     icon: GalleryHorizontalEnd, permission: "gallery" },
    ] : []),
    // Idea Box — universal for non-admin (admin has it in groups)
    { href: "/idea-box", label: t.nav.ideaBox, icon: Lightbulb, badge: newIdeaCount > 0 ? newIdeaCount : undefined, permission: "idea_box" },
    // My Profile — all staff except parents
    ...(role !== "parent" ? [{ href: "/my-profile", label: t.nav.myProfile, icon: UserCircle, permission: "my_profile" }] : []),
  ].filter(item => canSee(item.permission ?? ""));

  const handleLogout = () => {
    logout(undefined, {
      onSuccess: () => {
        window.location.href = "/";
      },
      onError: (error) => {
        toast({
          title: t.nav.logout,
          description: error.error || "An error occurred",
          variant: "destructive",
        });
      }
    });
  };

  const toggleLanguage = () => setLanguage(language === "en" ? "ar" : "en");

  // ── Shared nav item renderer ───────────────────────────────────────────────
  function NavItemRow({ item, onNavClick, mobile = false }: { item: NavItem; onNavClick?: () => void; mobile?: boolean }) {
    const Icon = item.icon;
    const isActive = location === item.href || location.startsWith(item.href + "/");
    return (
      <Link key={item.href} href={item.href}>
        <div
          onClick={onNavClick}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all cursor-pointer text-sm font-medium ${
            isActive
              ? mobile
                ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                : "text-[#1B2E8F] font-semibold shadow-sm"
              : mobile
                ? "text-muted-foreground hover:bg-muted hover:text-foreground"
                : "text-white/75 hover:bg-white/10 hover:text-white"
          }`}
          style={(!mobile && isActive) ? { backgroundColor: "#F5A600" } : {}}
        >
          <Icon className="h-4 w-4 shrink-0" />
          <span className="flex-1">{item.label}</span>
          {item.badge != null && (
            <span
              className="text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center"
              style={{
                background: isActive ? (mobile ? "#fff" : "#1B2E8F") : "#ef4444",
                color: isActive && mobile ? "#1B2E8F" : "#fff",
                fontSize: "10px",
              }}
            >
              {item.badge > 9 ? "9+" : item.badge}
            </span>
          )}
        </div>
      </Link>
    );
  }

  // ── Sidebar group header (collapsible) ────────────────────────────────────
  function GroupHeader({
    label,
    isOpen,
    onToggle,
    mobile = false,
  }: {
    label: string;
    isOpen: boolean;
    onToggle: () => void;
    mobile?: boolean;
  }) {
    return (
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-3 pt-4 pb-1 group"
      >
        <span
          className={`text-[10px] font-bold uppercase tracking-widest flex-1 text-start transition-colors ${
            mobile
              ? "text-muted-foreground/60 group-hover:text-muted-foreground"
              : "text-white/35 group-hover:text-white/60"
          }`}
        >
          {label}
        </span>
        <ChevronDown
          className={`w-3 h-3 shrink-0 transition-transform duration-200 ${
            mobile ? "text-muted-foreground/50" : "text-white/30"
          } ${isOpen ? "rotate-0" : "-rotate-90"}`}
        />
      </button>
    );
  }

  const SidebarContent = ({ onNavClick }: { onNavClick?: () => void }) => (
    <>
      {/* Logo */}
      <div className="px-5 pt-4 pb-5">
        <img
          src="/logo_white.png"
          alt="Kidspeak"
          className="h-11 w-auto max-w-full object-contain"
          style={{ imageRendering: "auto" }}
        />
      </div>

      {/* Divider under logo */}
      <div className="h-px mx-3 mb-3" style={{ backgroundColor: "rgba(255,255,255,0.1)" }} />

      {/* Branch Switcher — admin only */}
      {role === "admin" && branches.length > 0 && (
        <div className="px-3 mb-2">
          <div className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-1 flex items-center gap-1">
            <Building2 className="w-3 h-3" />
            {isRTL ? "الفرع الحالي" : "Branch Filter"}
          </div>
          <select
            value={selectedBranchId?.toString() ?? "all"}
            onChange={e => setSelectedBranchId(e.target.value === "all" ? null : parseInt(e.target.value))}
            className="w-full rounded-lg px-2.5 py-1.5 text-xs font-semibold border border-white/20 bg-white/10 text-white focus:outline-none focus:ring-1 focus:ring-[#F5A600] cursor-pointer"
          >
            <option value="all" className="bg-[#1B2E8F] text-white">
              {isRTL ? "🏫 كل الفروع" : "🏫 All Branches"}
            </option>
            {branches.map(b => (
              <option key={b.id} value={b.id.toString()} className="bg-[#1B2E8F] text-white">
                {isRTL && b.nameAr ? b.nameAr : b.name}
                {selectedBranchId === b.id ? " ✓" : ""}
              </option>
            ))}
          </select>
          {selectedBranchId !== null && (
            <button
              onClick={() => setSelectedBranchId(null)}
              className="mt-1 w-full text-xs text-[#F5A600] hover:text-white text-center transition-colors"
            >
              {isRTL ? "× مسح الفلتر" : "× Clear filter"}
            </button>
          )}
        </div>
      )}

      {/* Nav */}
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {role === "admin" ? (
          // Grouped + collapsible navigation for admin
          adminNavGroups.map((group, groupIdx) => {
            const visibleItems = group.items.filter(item => canSee(item.permission ?? ""));
            if (visibleItems.length === 0) return null;
            const isOpen = openGroups.has(groupIdx);
            return (
              <div key={groupIdx}>
                {group.divider && (
                  <div className="h-px mx-1 mt-3 mb-1" style={{ backgroundColor: "rgba(255,255,255,0.1)" }} />
                )}
                {group.label && (
                  <GroupHeader
                    label={group.label}
                    isOpen={isOpen}
                    onToggle={() => toggleGroup(groupIdx)}
                  />
                )}
                {/* Animated collapse using CSS grid trick */}
                <div
                  className="grid transition-[grid-template-rows] duration-200 ease-in-out"
                  style={{ gridTemplateRows: (!group.label || isOpen) ? "1fr" : "0fr" }}
                >
                  <div className="overflow-hidden">
                    <div className="space-y-0.5">
                      {visibleItems.map(item => (
                        <NavItemRow key={item.href} item={item} onNavClick={onNavClick} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          // Flat navigation for all other roles
          <div className="space-y-0.5">
            {navItems.map(item => (
              <NavItemRow key={item.href} item={item} onNavClick={onNavClick} />
            ))}
          </div>
        )}
      </div>

      {/* Bottom section */}
      <div className="mt-auto pt-4 border-t border-white/10 px-2">
        <button
          onClick={toggleLanguage}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors text-sm mb-1"
        >
          <Languages className="h-4 w-4 shrink-0" />
          <span>{t.language.toggle}</span>
        </button>

        <div className="flex items-center gap-3 px-3 py-2 mb-1">
          <Avatar className="h-8 w-8 shrink-0" style={{ backgroundColor: "rgba(245,166,0,0.25)" }}>
            <AvatarFallback className="text-sm font-bold" style={{ color: "#F5A600", backgroundColor: "transparent" }}>
              {user.name?.charAt(0) ?? "?"}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-medium text-white truncate">{user.name}</span>
            <span className="text-xs text-white/50 capitalize">{user.role}</span>
          </div>
        </div>

        <Button
          variant="ghost"
          className="w-full justify-start text-white/60 hover:text-white hover:bg-white/10 text-sm"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4 mr-2 rtl:mr-0 rtl:ml-2" />
          {t.nav.logout}
        </Button>
      </div>
    </>
  );

  const MobileContent = ({ onNavClick }: { onNavClick?: () => void }) => (
    <>
      <div className="px-1 pb-6">
        <img src="/logo-full.png" alt="Kidspeak" className="h-8 w-auto" />
      </div>
      <div className="flex-1 overflow-y-auto pb-2">
        {role === "admin" ? (
          adminNavGroups.map((group, groupIdx) => {
            const visibleItems = group.items.filter(item => canSee(item.permission ?? ""));
            if (visibleItems.length === 0) return null;
            const isOpen = openGroups.has(groupIdx);
            return (
              <div key={groupIdx}>
                {group.divider && <div className="h-px mx-1 mt-3 mb-1 bg-border" />}
                {group.label && (
                  <GroupHeader
                    label={group.label}
                    isOpen={isOpen}
                    onToggle={() => toggleGroup(groupIdx)}
                    mobile
                  />
                )}
                <div
                  className="grid transition-[grid-template-rows] duration-200 ease-in-out"
                  style={{ gridTemplateRows: (!group.label || isOpen) ? "1fr" : "0fr" }}
                >
                  <div className="overflow-hidden">
                    <div className="space-y-0.5">
                      {visibleItems.map(item => (
                        <NavItemRow key={item.href} item={item} onNavClick={onNavClick} mobile />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="space-y-0.5">
            {navItems.map(item => (
              <NavItemRow key={item.href} item={item} onNavClick={onNavClick} mobile />
            ))}
          </div>
        )}
      </div>
      <div className="mt-auto pt-4 border-t">
        <button
          onClick={toggleLanguage}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors text-sm mb-2"
        >
          <Languages className="h-4 w-4" />
          <span>{t.language.toggle}</span>
        </button>
        <div className="flex items-center gap-3 px-1 mb-3">
          <Avatar className="h-8 w-8 bg-primary/10 text-primary shrink-0">
            <AvatarFallback>{user.name?.charAt(0) ?? "?"}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-medium truncate">{user.name}</span>
            <span className="text-xs text-muted-foreground capitalize">{user.role}</span>
          </div>
        </div>
        <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-foreground" onClick={handleLogout}>
          <LogOut className="h-4 w-4 mr-2 rtl:mr-0 rtl:ml-2" />
          {t.nav.logout}
        </Button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <aside
        className="hidden md:flex flex-col w-60 h-screen sticky top-0 py-5"
        style={{ backgroundColor: "hsl(229, 72%, 17%)" }}
      >
        <SidebarContent />
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between p-4 border-b bg-card sticky top-0 z-10">
          <img src="/logo-full.png" alt="Kidspeak" className="h-7 w-auto" />
          <div className="flex items-center gap-2">
            <button
              onClick={toggleLanguage}
              className="text-xs font-semibold px-2 py-1 rounded border text-primary border-primary/30 hover:bg-primary/5 transition-colors"
            >
              {t.language.toggle}
            </button>
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side={isRTL ? "right" : "left"} className="w-64 p-5 flex flex-col">
                <MobileContent onNavClick={() => setIsMobileMenuOpen(false)} />
              </SheetContent>
            </Sheet>
          </div>
        </header>

        <main className="flex-1 p-6 md:p-8 max-w-6xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}

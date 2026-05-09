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
  Sparkles, Settings2,
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
        { href: "/admin/landing-settings",      label: isRTL ? "إعدادات صفحة الهبوط" : "Landing settings", icon: Globe, permission: "web_content" },
        { href: "/admin/ai-settings",  label: isRTL ? "إعدادات الذكاء الاصطناعي" : "AI Settings",   icon: Settings2, permission: "web_content" },
        { href: "/admin/ai-builder",   label: isRTL ? "مولّد المحتوى (AI)" : "AI Builder",          icon: Sparkles,  permission: "web_content" },
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
      { href: "/requests",    label: t.nav.requests,    icon: MapPin,        permission: "requests" },
      { href: "/students",       label: pupilLabel,         icon: Users,               permission: "students" },
      { href: "/gallery",        label: t.nav.gallery,     icon: GalleryHorizontalEnd, permission: "gallery" },
      { href: "/inbox",          label: t.nav.inbox,       icon: Inbox, badge: unreadMsgCount > 0 ? unreadMsgCount : undefined, permission: "inbox" },
      { href: "/news",           label: t.nav.news,        icon: Megaphone,            permission: "news" },
      { href: "/behavioral",     label: t.nav.behavioral,  icon: Brain,                permission: "behavioral" },
      { href: "/performance",    label: t.nav.performance, icon: LineChart,            permission: "performance" },
    ] : []),
    // Parent
    ...(role === "parent" ? [
      { href: "/students",    label: t.nav.myChildren, icon: Users,               permission: "students" },
      { href: "/gallery",     label: t.nav.gallery,    icon: GalleryHorizontalEnd, badge: newMediaCount > 0 ? newMediaCount : undefined, permission: "gallery" },
      { href: "/news",        label: t.nav.news,       icon: Megaphone,           permission: "news" },
      { href: "/requests",    label: t.nav.requests,   icon: MapPin,              permission: "requests" },
      { href: "/inbox",       label: t.nav.inbox,      icon: Inbox, badge: unreadMsgCount > 0 ? unreadMsgCount : undefined, permission: "inbox" },
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
          description: (error as any)?.error || (error as any)?.message || "An error occurred",
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
      <div className="px-4 pt-4 pb-0">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="450 1310 2280 660"
          style={{ display: "block", width: "100%", height: "auto", maxHeight: "52px", objectFit: "contain" }}
          aria-label="Kidspeak"
        >
          <path d="M0 0 C1.26408361 3.79225083 0.58084742 5.67039789 -0.33935547 9.55102539 C-0.49366028 10.21149368 -0.64796509 10.87196198 -0.8069458 11.55244446 C-1.31923629 13.73610128 -1.84304643 15.91681624 -2.3671875 18.09765625 C-2.72557812 19.61300451 -3.08332715 21.12850465 -3.44046021 22.64414978 C-4.19059625 25.82034944 -4.94599008 28.99523437 -5.70556641 32.16918945 C-6.68019515 36.24205062 -7.64562669 40.31701775 -8.60763359 44.39287663 C-9.52422905 48.2744102 -10.4455985 52.15480587 -11.3671875 56.03515625 C-11.6312118 57.1497758 -11.6312118 57.1497758 -11.90056992 58.28691292 C-12.39835223 60.3847072 -12.89954306 62.48165561 -13.40185547 64.57836914 C-13.82940628 66.37015343 -13.82940628 66.37015343 -14.26559448 68.19813538 C-15 71 -15 71 -16 73 C-16.55042969 72.84144531 -17.10085938 72.68289063 -17.66796875 72.51953125 C-20.77095498 71.64877077 -23.88335622 70.82068363 -27 70 C-27.70850098 69.81244141 -28.41700195 69.62488281 -29.14697266 69.43164062 C-62.81228497 60.63639099 -121.52605428 47.09278204 -154 65 C-157.50299484 68.10067068 -160.7606367 71.59851903 -161.23828125 76.390625 C-161.39634011 82.48005068 -161.33503752 86.33983467 -157 91 C-140.39838332 107.1748399 -108.93941652 110.66784029 -87.125 115.5625 C-55.11861949 122.76534562 -16.89907871 133.30205834 2.375 162.44921875 C15.8517853 184.25645105 17.90206955 212.3875658 12.54345703 237.10595703 C6.60621823 261.10015842 -8.7956109 278.93783672 -29.64794922 291.53930664 C-91.19148266 327.28137107 -179.48058356 317.14148054 -245.5703125 300.09765625 C-253.95141426 297.83914885 -262.04892021 295.48790203 -270 292 C-267.94980204 283.77598109 -265.89831337 275.55228568 -263.84520149 267.3289938 C-262.89177817 263.5100943 -261.93879049 259.69108722 -260.98681641 255.87182617 C-260.06714219 252.18221977 -259.14630012 248.49290659 -258.2246666 244.80378914 C-257.87422432 243.4001803 -257.52419447 241.99646842 -257.17459488 240.59264946 C-256.68277354 238.61804654 -256.18945254 236.64382372 -255.69580078 234.66967773 C-255.41600372 233.54826889 -255.13620667 232.42686005 -254.84793091 231.27146912 C-253.95555372 227.8285183 -252.99048447 224.41584436 -252 221 C-246.88676406 222.07274492 -241.85537687 223.28926643 -236.82421875 224.69921875 C-222.78940216 228.62638765 -208.73873932 232.06018016 -194.4375 234.875 C-193.71847504 235.01988861 -192.99945007 235.16477722 -192.25863647 235.3140564 C-173.76291194 239.01605938 -155.28740449 240.35996061 -136.44091797 240.31567383 C-133.60476411 240.31247719 -130.76962286 240.33624561 -127.93359375 240.36132812 C-107.13780196 240.76108641 -107.13780196 240.76108641 -89 232 C-84.96551061 227.44826838 -83.76293033 222.98062114 -84 217 C-85.75697397 211.0262885 -89.84110111 208.07287446 -95 205 C-110.32927195 196.96017205 -127.77125355 193.2966729 -144.44140625 189.09765625 C-145.97751808 188.70978943 -145.97751808 188.70978943 -147.54466248 188.31408691 C-152.72539877 187.00763446 -157.90865579 185.71319772 -163.09741211 184.43896484 C-178.11126002 180.71367635 -192.36050997 176.23572994 -206.1875 169.1875 C-207.45110352 168.54639282 -207.45110352 168.54639282 -208.74023438 167.89233398 C-230.72685695 156.50580364 -248.68382668 140.21309855 -256.62109375 116.11425781 C-264.65342387 89.90418715 -262.74951112 61.71966835 -250.1875 37.3125 C-247.01689781 31.72736229 -243.220318 26.8279772 -239 22 C-238.48050781 21.39671875 -237.96101563 20.7934375 -237.42578125 20.171875 C-188.56401944 -32.50528886 -59.71855357 -26.2675864 0 0 Z" fill="#FFFFFF" transform="translate(1569,1510)"/>
          <path d="M0 0 C25.2951823 22.42036476 32.94758059 56.77271362 35.30493164 89.21289062 C35.65396008 95.55247644 35.69760853 101.89050157 35.68652344 108.23828125 C35.68558685 108.93726532 35.68465027 109.63624939 35.6836853 110.35641479 C35.58142328 145.76879728 30.27314707 183.60471727 5.49902344 210.73828125 C4.8403125 211.46660156 4.18160156 212.19492188 3.50292969 212.9453125 C-18.78477492 236.39897348 -52.65218803 242.61372093 -83.59082031 243.6796875 C-111.04231424 244.22450203 -111.04231424 244.22450203 -121.50097656 240.73828125 C-121.50097656 271.75828125 -121.50097656 302.77828125 -121.50097656 334.73828125 C-151.53097656 334.73828125 -181.56097656 334.73828125 -212.50097656 334.73828125 C-212.50097656 220.22828125 -212.50097656 105.71828125 -212.50097656 -12.26171875 C-185.77097656 -12.26171875 -159.04097656 -12.26171875 -131.50097656 -12.26171875 C-130.51097656 -6.32171875 -129.52097656 -0.38171875 -128.50097656 5.73828125 C-126.14972656 4.54203125 -123.79847656 3.34578125 -121.37597656 2.11328125 C-85.03369243 -16.05970766 -34.63966906 -29.11805623 0 0 Z M-97.87597656 58.86328125 C-99.12121094 59.07210938 -100.36644531 59.2809375 -101.64941406 59.49609375 C-108.77730017 61.32110807 -115.61163995 64.15478002 -122.50097656 66.73828125 C-122.50097656 101.71828125 -122.50097656 136.69828125 -122.50097656 172.73828125 C-110.95843671 176.06096662 -110.95843671 176.06096662 -99.50097656 177.73828125 C-98.37369141 177.815625 -98.37369141 177.815625 -97.22363281 177.89453125 C-87.86563916 178.2493367 -78.47052102 176.64061195 -71.17675781 170.44921875 C-57.24731483 156.22754969 -58.18464996 132.28748535 -58.26660156 113.77026367 C-58.33992323 86.75827953 -58.33992323 86.75827953 -70.50097656 63.73828125 C-78.739059 56.9329088 -87.75465291 57.07716531 -97.87597656 58.86328125 Z" fill="#FFB500" transform="translate(1819.5009765625,1580.26171875)"/>
          <path d="M0 0 C30.03 0 60.06 0 91 0 C91 111.54 91 223.08 91 338 C64.6 338 38.2 338 11 338 C8.03 333.05 5.06 328.1 2 323 C-1.62714051 324.4508562 -5.07212337 325.99491301 -8.56835938 327.71606445 C-36.5346311 341.36089864 -69.28656414 348.03247207 -99.75 338.9375 C-120.18467773 331.43533443 -134.89624201 315.97798547 -144.15625 296.58984375 C-160.89190006 259.81926284 -162.97259981 212.3340851 -155 173 C-154.74259033 171.71391846 -154.74259033 171.71391846 -154.47998047 170.40185547 C-148.94006774 143.79146145 -136.88240376 118.18232222 -113.55859375 102.65234375 C-88.85982079 86.90434337 -60.85219953 82.74390555 -32.0625 82.6875 C-30.95932434 82.68212219 -30.95932434 82.68212219 -29.8338623 82.67663574 C-27.67152027 82.67096157 -25.50992752 82.68197361 -23.34765625 82.69921875 C-22.09992432 82.70783936 -20.85219238 82.71645996 -19.56665039 82.7253418 C-13.01235318 83.11954572 -6.50854223 84.13219437 0 85 C0 56.95 0 28.9 0 0 Z M-54.125 159.0625 C-68.69875302 176.95540619 -65.07149656 210.28231669 -62.91821289 231.74682617 C-62.21378341 238.03200163 -61.23373189 244.05386864 -59 250 C-58.73574219 250.72058594 -58.47148438 251.44117188 -58.19921875 252.18359375 C-55.23474621 259.09199011 -49.82363133 264.14032119 -42.875 267 C-30.82998913 270.320628 -15.10836203 266.18650213 -4.125 260.8125 C-1.2218576 259.30749131 -1.2218576 259.30749131 0 258 C0 153 0 153 0 153 C-20.90148338 145.64015793 -42.92656706 147.44828365 -54.125 159.0625 Z" fill="#FFFFFF" transform="translate(1189,1481)"/>
          <path d="M0 0 C30.69 0 61.38 0 93 0 C92.89816406 7.65703125 92.79632812 15.3140625 92.69140625 23.203125 C92.66034552 28.07057835 92.63373573 32.9372507 92.62304688 37.8046875 C92.60567976 45.52166868 92.57236149 53.23615352 92.44116211 60.95214844 C92.33634079 67.1776082 92.3054807 73.39954739 92.32465935 79.62581635 C92.31919552 81.99411314 92.28762581 84.36250593 92.22885323 86.73007965 C91.46155285 100.39730278 91.46155285 100.39730278 97.27682495 112.13122559 C102.24532884 116.5375169 107.73731119 119.78433077 114 122 C121.48764254 115.39697346 128.65535009 108.47699155 135.73577881 101.44146729 C137.1515401 100.0357059 138.57204903 98.63473102 139.99267578 97.23388672 C145.32828646 91.90588882 150.26861553 86.42866123 154.94750977 80.51391602 C157.10593255 77.87025247 159.39335702 75.40499024 161.75 72.9375 C166.13739733 68.16560463 170.0082855 63.12169074 173.8125 57.875 C174.62122559 56.76499634 174.62122559 56.76499634 175.44628906 55.63256836 C179.02822648 50.61707778 182.11920269 45.44694638 185 40 C185.66 40 186.32 40 187 40 C187.25579834 40.51272461 187.51159668 41.02544922 187.77514648 41.55371094 C195.25218906 56.43117681 203.54427345 68.81760423 215 81 C215.78890625 81.88558594 215.78890625 81.88558594 216.59375 82.7890625 C224.70066866 91.51640861 235.44149821 98.62813067 246 104 C243.5137247 121.61462841 213.65574216 145.61059829 200.515625 155.984375 C198.06538026 157.94761458 195.75209988 160.00463228 193.4375 162.125 C189.50375683 165.68817316 185.30837088 168.65053352 180.87109375 171.5546875 C179.94490234 172.27011719 179.94490234 172.27011719 179 173 C179 173.66 179 174.32 179 175 C180.96394804 176.68469918 182.93791988 178.2552513 185 179.8125 C186.29798802 180.80975091 187.59482 181.80850791 188.890625 182.80859375 C189.56931641 183.33179199 190.24800781 183.85499023 190.94726562 184.39404297 C193.60121299 186.47035907 196.19698567 188.61231797 198.79345703 190.75976562 C216.30939594 205.22014145 233.89225603 218.73102168 256 225 C256.763125 225.22300781 257.52625 225.44601562 258.3125 225.67578125 C266.31609599 227.72357632 274.94166845 228.10462983 283 229 C283 260.35 283 291.7 283 324 C246.42482493 327.65751751 210.81032629 315.86527505 182.36132812 292.66357422 C179.63930066 290.39657956 176.9523659 288.09045341 174.26953125 285.77734375 C170.9847978 282.96002659 167.60252564 280.28193225 164.1875 277.625 C159.07356393 273.64439568 154.01963687 269.59891789 149 265.5 C144.0377555 261.45008576 139.04845768 257.44194641 134 253.5 C128.95153522 249.55804805 123.9624927 245.5496178 119 241.5 C113.76241645 237.22788723 108.50009813 232.9910735 103.1875 228.8125 C102.31641602 228.12607422 102.31641602 228.12607422 101.42773438 227.42578125 C98.99878211 225.52208628 96.56953319 223.71302213 94 222 C93.67 254.34 93.34 286.68 93 320 C62.31 320 31.62 320 0 320 C0 214.4 0 108.8 0 0 Z" fill="#FFFFFF" transform="translate(600,1499)"/>
          <path d="M0 0 C28.71 0 57.42 0 87 0 C86.92136719 10.38855469 86.84273437 20.77710938 86.76171875 31.48046875 C86.74089091 38.07496051 86.72336788 44.6691891 86.72070312 51.26367188 C86.71586512 61.72347541 86.6978164 72.18202234 86.59204102 82.64135742 C86.51504978 90.26059683 86.48430961 97.87842228 86.50781661 105.49803811 C86.51867053 109.52881468 86.507246 113.55660685 86.44031334 117.58690453 C85.29967145 136.39068382 85.29967145 136.39068382 92.55937672 152.79765034 C96.29584744 156.2600055 100.3443146 158.89647608 105 161 C105.27529541 160.410979 105.55059082 159.82195801 105.83422852 159.21508789 C106.94931603 157.09630486 108.14482007 155.41100828 109.65234375 153.55859375 C126.71335097 132.18445476 137.41677547 109.51760992 144 83 C154.81424715 83.50059526 165.62833136 84.00456446 176.4422226 84.51279354 C181.46401091 84.74870131 186.4858472 84.98346423 191.5078125 85.21557617 C196.35790342 85.43978698 201.2078427 85.66705027 206.05769348 85.89639473 C207.90431177 85.98318868 209.75098135 86.06889873 211.59770203 86.15348625 C214.19223355 86.27251559 216.78655286 86.39546287 219.38085938 86.51928711 C220.1375592 86.55309479 220.89425903 86.58690247 221.67388916 86.62173462 C226.49157666 86.85685999 231.21994015 87.35099161 236 88 C233.5225723 112.63815459 218.67661697 136.94032618 205 157 C204.57509277 157.6290625 204.15018555 158.258125 203.71240234 158.90625 C191.37557707 177.05698143 176.77137284 193.81746725 161.86328125 209.890625 C159.96305296 211.85975474 159.96305296 211.85975474 159 214 C159.56460938 214.24492188 160.12921875 214.48984375 160.7109375 214.7421875 C163.41292072 216.226895 165.37295 218.01966335 167.625 220.125 C172.58408888 224.65819915 177.67663866 228.90226693 183 233 C183.55316895 233.43103027 184.10633789 233.86206055 184.67626953 234.30615234 C201.32422364 247.21634888 213.96406987 252.70376882 236 254 C236 282.71 236 311.42 236 341 C213.15126068 345.56974786 194.08967586 342.50935118 174 331 C173.33081543 330.62069336 172.66163086 330.24138672 171.97216797 329.85058594 C161.67337076 323.93525284 152.7769678 316.96746856 144 309 C143.09507812 308.19304687 142.19015625 307.38609375 141.2578125 306.5546875 C138.82744355 304.3817408 136.41282771 302.19238664 134 300 C132.37550266 298.54110676 130.7504932 297.08278358 129.125 295.625 C124.88090572 291.80664559 120.67024919 287.95268592 116.46582031 284.09082031 C112.48400223 280.43634502 108.47678024 276.81143518 104.453125 273.203125 C102.73014671 271.65573686 101.01179472 270.10318943 99.296875 268.546875 C98.41515625 267.74765625 97.5334375 266.9484375 96.625 266.125 C95.83351563 265.40570312 95.04203125 264.68640625 94.2265625 263.9453125 C92.23055945 262.20143615 90.12039738 260.59029804 88 259 C87.67 285.07 87.34 311.14 87 338 C58.29 338 29.58 338 0 338 C0 226.46 0 114.92 0 0 Z" fill="#FFB500" transform="translate(2404,1481)"/>
          <path d="M0 0 C1.17920517 -0.00151062 1.17920517 -0.00151062 2.38223267 -0.00305176 C36.59806191 0.0263868 74.45297216 3.91414853 99.875 29.25 C100.57367187 29.92546875 101.27234375 30.6009375 101.9921875 31.296875 C116.8888207 46.71518018 122.00650775 68.71920638 122.03271484 89.58422852 C122.52432217 171.83899927 123.37363863 175.57694899 125.875 180.25 C128.75915883 181.69207941 131.29221528 181.34394887 134.5 181.3125 C135.68851563 181.30347656 136.87703125 181.29445313 138.1015625 181.28515625 C139.01679688 181.27355469 139.93203125 181.26195312 140.875 181.25 C141.78897574 189.42949514 142.70177454 197.60912038 143.61306 205.78891563 C147.875 244.25 147.875 244.25 147.875 246.25 C122.76575473 258.76854613 95.85431231 264.72734463 68.2734375 256.46484375 C56.62891016 252.30225984 48.09538495 245.2937406 40.875 235.25 C10.77388453 254.28014846 -20.79332519 265.52102724 -55.125 258.25 C-69.22220995 254.81497417 -79.81708997 248.35479851 -90.125 238.25 C-107.83757261 220.28720895 -109.54455634 197.72730505 -109.33984375 176.67578125 C-108.97913801 161.18335755 -104.54285482 146.93611541 -94.125 135.25 C-68.99190475 107.50038542 -23.3232094 105.8169657 8.9375 102.5 C19.45065288 101.45914747 26.09472125 101.07447143 32.875 101.25 C32.14152936 90.99516788 32.14152936 90.99516788 26.80859375 82.609375 C5.30022862 67.48834255 -33.6920084 76.09160199 -57.390625 80.1640625 C-79.125 85.25 -79.125 85.25 -83.125 85.25 C-86.93407585 68.17827144 -90.62069197 51.08729538 -94.0625 33.9375 C-97.125 18.25 -97.125 18.25 -97.125 15.25 C-75.32837236 7.49246008 -52.08638008 3.58905648 -29.125 1.25 C-17.61472965 0.12724458 -8.8282755 0.00790013 0 0 Z M-11.125 159.25 C-16.58558092 165.16562933 -17.46954828 170.30040734 -17.4375 178.0625 C-17.49126029 186.23718842 -16.83338494 192.33033554 -12.67285156 196.81542969 C-6.21214486 202.32015553 -0.34940771 201.83864208 7.875 201.25 C17.19777436 199.42914563 26.57819812 195.66772498 32.875 188.25 C33.21557617 184.23754883 33.21557617 184.23754883 33.0625 168.0625 C32.875 148.25 32.875 148.25 32.875 148.25 C19.14550903 148.25 -0.2843873 150.07717387 -11.125 159.25 Z" fill="#FFB500" transform="translate(2239.125,1563.75)"/>
          <path d="M0 0 C21.23897005 18.86710537 27.74786768 48.86132477 29.93359375 75.98828125 C30.43359375 95.48828125 30.43359375 95.48828125 29.30859375 123.05078125 C7.08477198 125.16406406 -15.14637935 126.96142978 -37.41577148 128.51629639 C-67.52603513 130.64686789 -75.11472404 131.15230567 -82.70678711 131.61254883 C-117.69140625 132.05078125 -117.69140625 132.05078125 -117.69140625 132.05078125 C-116.30345625 147.2395721 -113.92561053 151.35451838 -109.06640625 155.30078125 C-90.88893128 167.68839382 -65.8455404 166.07007724 -45.00390625 163.92578125 C-21.22388645 161.43040373 -1.43166816 157.68553828 18.30859375 154.05078125 C28.30859375 219.05078125 28.30859375 219.05078125 28.30859375 219.05078125 C-21.5094329 239.13672582 -98.91941435 246.33439285 -149.61328125 225.04296875 C-175.69140625 209.05078125 -175.69140625 209.05078125 -212.59375 117.48730469 C-213.72303498 77.74776622 -206.37469381 39.66937381 -179.69140625 9.05078125 C-138.02145222 -35.84713966 -43.85045571 -36.32541651 0 0 Z M-106.69140625 46.05078125 C-113.99614024 57.04612691 -117.21944738 68.95392261 -117.69140625 82.05078125 C-98.34365197 81.29516495 -79.01957418 80.18909684 -59.69140625 79.05078125 C-60.72819848 59.7603017 -63.32754809 49.65286098 -70.69140625 43.05078125 C-81.15397715 36.47430811 -97.92629188 36.57498193 -106.69140625 46.05078125 Z" fill="#FFB500" transform="translate(2085.69140625,1587.94921875)"/>
          <path d="M0 0 C23.87888195 -0.8749514 46.67097887 7.70770842 64.68359375 23.15625 C83.40999031 37.670765 92.94555683 60.28882807 95.99609375 80.90625 C98.67361755 105.62185427 93.69052836 130.62411051 78.109375 150.50390625 C61.37504162 171.16233583 38.82538898 183.80148545 12.37109375 186.90625 C5.01171875 187.3125 5.01171875 187.3125 5.01171875 187.3125 C-17.41778833 188.03994347 -41.22386561 179.88787543 -57.75390625 164.59375 C-79.95385696 144.08186817 -88.71539774 121.8671035 -90.2265625 102.40625 C-90.94350485 72.45427735 -82.83200037 49.66352059 -66.31640625 31.15625 C-47.31294831 10.78438733 -24.21066174 1.63309691 0 0 Z" fill="#FFB500" transform="translate(905.31640625,1393.84375)"/>
          <path d="M0 0 C0 79.2 0 158.4 0 240 C-30.03 240 -60.06 240 -91 240 C-91 174 -91 108 -91 40 C-83.08 39.01 -75.16 38.02 -67 37 C-42.4288705 30.97027497 -21.32856768 19.21688904 -3.01171875 1.8359375 C-1 0 -1 0 0 0 Z" fill="#FFFFFF" transform="translate(1005,1579)"/>
          <path d="M0 0 C0.86657227 0.35674805 1.73314453 0.71349609 2.62597656 1.08105469 C21.92395297 9.18832156 38.34999742 20.00869318 53.5 34.5 C80.93611426 60.57010882 95.98430492 97.15910481 96.89526367 131.99511719 C96.99057759 141.60305988 96.85249448 143.9119961 94.7109375 147.484375 C91.56085589 150.35618085 88.70010521 151.76478605 84.5 152.5 C80.56200076 151.80132272 78.33522489 151.33522489 75.5 148.5 C74.1875 135.5625 74.1875 135.5625 74.1875 135.5625 C71.31978145 106.08175394 61.42292636 80.39674089 42.5 57.5 C36.61757438 50.44687233 32.31203109 46.3557451 27.5 42.5 C12.24741998 30.40100111 -2.69273858 22.29663818 -19.35839844 16.83105469 C-29.5 10.5 -29.5 10.5 -26.96484375 0.68359375 C-18.27842959 -6.9700408 -9.87652171 -4.1175027 0 0 Z" fill="#FFB500" transform="translate(997.5,1329.5)"/>
          <path d="M0 0 C23.3216567 12.24921877 39.94267337 31.87829718 48 57 C50.6484375 89.35546875 50.6484375 89.35546875 44 95 C40.02726432 95.49659196 37.84320943 95.47988536 34.34375 93.48828125 C31 82.75 31 82.75 31 82.75 C29.57860632 64.77119221 23.05662957 48.55220385 11 35 C-0.18190633 22.75085147 -12.45528559 16.89655822 -25.23046875 12.17578125 C-31.5 8.25 -31.5 8.25 -31 -1 C-22.17271802 -11.33373429 -10.23819344 -4.82195974 0 0 Z" fill="#FFB500" transform="translate(997,1378)"/>
        </svg>
        {/* Tagline under logo */}
        <div style={{ marginTop: "8px", display: "flex", alignItems: "center", gap: "5px", padding: "0 2px" }}>
          <div style={{ flex: 1, height: "1px", background: "rgba(245,168,0,0.3)" }} />
          <div style={{ width: "3px", height: "3px", borderRadius: "50%", background: "rgba(245,168,0,0.55)", flexShrink: 0 }} />
          <span style={{ fontSize: "8px", fontWeight: 700, letterSpacing: "1.6px", color: "rgba(245,168,0,0.65)", whiteSpace: "nowrap", direction: "rtl" }}>لنتكلم أولاً</span>
          <div style={{ width: "3px", height: "3px", borderRadius: "50%", background: "rgba(245,168,0,0.55)", flexShrink: 0 }} />
          <div style={{ flex: 1, height: "1px", background: "rgba(245,168,0,0.3)" }} />
        </div>
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
      <div className="px-1 pb-4">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="450 1310 2280 660"
          style={{ height: "32px", width: "auto", display: "block" }}
          aria-label="Kidspeak"
        >
          <path d="M0 0 C1.26408361 3.79225083 0.58084742 5.67039789 -0.33935547 9.55102539 C-0.8069458 11.55244446 -1.31923629 13.73610128 -2.3671875 18.09765625 C-3.44046021 22.64414978 -5.70556641 32.16918945 -8.60763359 44.39287663 C-11.3671875 56.03515625 -14.26559448 68.19813538 -16 73 C-20.77095498 71.64877077 -27 70 -29.14697266 69.43164062 C-62.81228497 60.63639099 -121.52605428 47.09278204 -154 65 C-161.23828125 76.390625 -161.23828125 76.390625 -157 91 C-140.39838332 107.1748399 -108.93941652 110.66784029 -87.125 115.5625 C-55.11861949 122.76534562 -16.89907871 133.30205834 2.375 162.44921875 C17.90206955 212.3875658 12.54345703 237.10595703 -29.64794922 291.53930664 C-91.19148266 327.28137107 -179.48058356 317.14148054 -270 292 C-265.89831337 275.55228568 -260.98681641 255.87182617 -258.2246666 244.80378914 C-252 221 -252 221 -236.82421875 224.69921875 C-222.78940216 228.62638765 -194.4375 234.875 -136.44091797 240.31567383 C-107.13780196 240.76108641 -89 232 -84 217 C-85.75697397 211.0262885 -95 205 -144.44140625 189.09765625 C-163.09741211 184.43896484 -178.11126002 180.71367635 -208.74023438 167.89233398 C-248.68382668 140.21309855 -256.62109375 116.11425781 -250.1875 37.3125 C-188.56401944 -32.50528886 -59.71855357 -26.2675864 0 0 Z" fill="#002786" transform="translate(1569,1510)"/>
          <path d="M0 0 C25.2951823 22.42036476 35.30493164 89.21289062 35.68652344 108.23828125 C35.58142328 145.76879728 30.27314707 183.60471727 5.49902344 210.73828125 C-18.78477492 236.39897348 -52.65218803 242.61372093 -83.59082031 243.6796875 C-111.04231424 244.22450203 -121.50097656 240.73828125 -121.50097656 240.73828125 C-121.50097656 334.73828125 -212.50097656 334.73828125 -212.50097656 -12.26171875 C-185.77097656 -12.26171875 -131.50097656 -12.26171875 -128.50097656 5.73828125 C-85.03369243 -16.05970766 -34.63966906 -29.11805623 0 0 Z M-97.87597656 58.86328125 C-108.77730017 61.32110807 -122.50097656 66.73828125 -122.50097656 172.73828125 C-110.95843671 176.06096662 -99.50097656 177.73828125 -97.22363281 177.89453125 C-78.47052102 176.64061195 -58.26660156 113.77026367 -70.50097656 63.73828125 C-78.739059 56.9329088 -87.75465291 57.07716531 -97.87597656 58.86328125 Z" fill="#FFB500" transform="translate(1819.5009765625,1580.26171875)"/>
          <path d="M0 0 C91 0 91 338 91 338 C64.6 338 11 338 2 323 C-36.5346311 341.36089864 -69.28656414 348.03247207 -99.75 338.9375 C-120.18467773 331.43533443 -144.15625 296.58984375 -155 173 C-148.94006774 143.79146145 -113.55859375 102.65234375 -32.0625 82.6875 C-13.01235318 83.11954572 0 85 0 85 C0 56.95 0 0 0 0 Z M-54.125 159.0625 C-65.07149656 210.28231669 -62.91821289 231.74682617 -59 250 C-55.23474621 259.09199011 -42.875 267 -42.875 267 C-30.82998913 270.320628 0 258 0 258 C0 153 0 153 -5.859375 150.72338867 C-20.90148338 145.64015793 -42.92656706 147.44828365 -54.125 159.0625 Z" fill="#002786" transform="translate(1189,1481)"/>
          <path d="M0 0 C93 0 93 0 93 0 C92.44116211 60.95214844 97.27682495 112.13122559 114 122 C128.65535009 108.47699155 154.94750977 80.51391602 185 40 C187 40 215 81 224.70066866 91.51640861 C246 104 246 104 C243.5137247 121.61462841 200.515625 155.984375 179 173 C180.96394804 176.68469918 190.94726562 184.39404297 216.30939594 205.22014145 C256 225 266.31609599 227.72357632 283 229 C283 260.35 283 291.7 283 324 C210.81032629 315.86527505 182.36132812 292.66357422 164.1875 277.625 C134 253.5 119 241.5 94 222 C93.67 254.34 93 320 93 320 C62.31 320 0 320 0 320 C0 214.4 0 108.8 0 0 Z" fill="#002786" transform="translate(600,1499)"/>
          <path d="M0 0 C87 0 87 0 87 0 C86.44031334 117.58690453 92.55937672 152.79765034 105 161 C109.65234375 153.55859375 137.41677547 109.51760992 144 83 C154.81424715 83.50059526 236 88 236 88 C218.67661697 136.94032618 161.86328125 209.890625 159 214 C183 233 236 254 236 254 C236 282.71 236 311.42 236 341 C194.08967586 342.50935118 174 331 144 309 C116.46582031 284.09082031 88 259 88 259 C87.67 285.07 87 338 87 338 C58.29 338 0 338 0 338 C0 226.46 0 114.92 0 0 Z" fill="#FFB500" transform="translate(2404,1481)"/>
          <path d="M0 0 C36.59806191 0.0263868 74.45297216 3.91414853 99.875 29.25 C116.8888207 46.71518018 122.03271484 89.58422852 125.875 180.25 C140.875 181.25 147.875 246.25 68.2734375 256.46484375 C56.62891016 252.30225984 40.875 235.25 39.46069336 236.14868164 C10.77388453 254.28014846 -20.79332519 265.52102724 -55.125 258.25 C-79.81708997 248.35479851 -109.33984375 176.67578125 -94.125 135.25 C-68.99190475 107.50038542 8.9375 102.5 32.875 101.25 C32.14152936 90.99516788 26.80859375 82.609375 5.30022862 67.48834255 C-33.6920084 76.09160199 -83.125 85.25 -97.125 15.25 C-75.32837236 7.49246008 -52.08638008 3.58905648 0 0 Z M-11.125 159.25 C-17.4375 178.0625 -12.67285156 196.81542969 7.875 201.25 C26.57819812 195.66772498 32.875 188.25 32.875 148.25 C19.14550903 148.25 -0.2843873 150.07717387 -11.125 159.25 Z" fill="#FFB500" transform="translate(2239.125,1563.75)"/>
          <path d="M0 0 C27.74786768 48.86132477 29.30859375 123.05078125 29.30859375 123.05078125 C7.08477198 125.16406406 -59.93893433 130.11076736 -117.69140625 132.05078125 C-113.92561053 151.35451838 -45.00390625 163.92578125 18.30859375 154.05078125 C28.30859375 219.05078125 -149.61328125 225.04296875 -175.69140625 209.05078125 C-213.72303498 77.74776622 -206.37469381 39.66937381 -179.69140625 9.05078125 C-138.02145222 -35.84713966 -43.85045571 -36.32541651 0 0 Z M-106.69140625 46.05078125 C-117.69140625 82.05078125 -59.69140625 79.05078125 -70.69140625 43.05078125 C-81.15397715 36.47430811 -97.92629188 36.57498193 -106.69140625 46.05078125 Z" fill="#FFB500" transform="translate(2085.69140625,1587.94921875)"/>
          <path d="M0 0 C46.67097887 7.70770842 66.50390625 24.5390625 92.94555683 60.28882807 C95.99609375 80.90625 78.109375 150.50390625 5.01171875 187.3125 C-17.41778833 188.03994347 -57.75390625 164.59375 -79.95385696 144.08186817 C-90.2265625 102.40625 -82.83200037 49.66352059 -64.1171875 28.671875 C-47.31294831 10.78438733 -24.21066174 1.63309691 0 0 Z" fill="#FFB500" transform="translate(905.31640625,1393.84375)"/>
          <path d="M0 0 C0 79.2 0 158.4 0 240 C-30.03 240 -91 240 -91 240 C-91 174 -91 108 -91 40 C-67 37 -42.4288705 30.97027497 -3.01171875 1.8359375 Z" fill="#002786" transform="translate(1005,1579)"/>
          <path d="M0 0 C21.92395297 9.18832156 53.5 34.5 96.89526367 131.99511719 C96.99057759 141.60305988 84.5 152.5 84.5 152.5 C78.33522489 151.33522489 75.5 148.5 74.1875 135.5625 C71.31978145 106.08175394 42.5 57.5 27.5 42.5 C12.24741998 30.40100111 -19.35839844 16.83105469 -29.5 10.5 C-26.96484375 0.68359375 0 0 0 0 Z" fill="#FFB500" transform="translate(997.5,1329.5)"/>
          <path d="M0 0 C39.94267337 31.87829718 50.6484375 89.35546875 44 95 C40.02726432 95.49659196 34.34375 93.48828125 31 82.75 C23.05662957 48.55220385 9.203125 32.91796875 -0.18190633 22.75085147 C-25.23046875 12.17578125 -31.5 8.25 -31 -1 C-22.17271802 -11.33373429 -10.23819344 -4.82195974 0 0 Z" fill="#FFB500" transform="translate(997,1378)"/>
        </svg>
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
          <img src="/logo-full.png" alt="Kidspeak" className="h-7 w-auto" style={{ display: "none" }} />
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="450 1310 2280 660"
            style={{ height: "28px", width: "auto", display: "block" }}
            aria-label="Kidspeak"
          >
            <path d="M0 0 C1.26408361 3.79225083 0.58084742 5.67039789 -0.33935547 9.55102539 C-0.8069458 11.55244446 -1.31923629 13.73610128 -2.3671875 18.09765625 C-3.44046021 22.64414978 -5.70556641 32.16918945 -8.60763359 44.39287663 C-11.3671875 56.03515625 -14.26559448 68.19813538 -16 73 C-20.77095498 71.64877077 -27 70 -29.14697266 69.43164062 C-62.81228497 60.63639099 -121.52605428 47.09278204 -154 65 C-161.23828125 76.390625 -161.23828125 76.390625 -157 91 C-140.39838332 107.1748399 -108.93941652 110.66784029 -87.125 115.5625 C-55.11861949 122.76534562 -16.89907871 133.30205834 2.375 162.44921875 C17.90206955 212.3875658 12.54345703 237.10595703 -29.64794922 291.53930664 C-91.19148266 327.28137107 -179.48058356 317.14148054 -270 292 C-265.89831337 275.55228568 -260.98681641 255.87182617 -258.2246666 244.80378914 C-252 221 -252 221 -236.82421875 224.69921875 C-222.78940216 228.62638765 -194.4375 234.875 -136.44091797 240.31567383 C-107.13780196 240.76108641 -89 232 -84 217 C-85.75697397 211.0262885 -95 205 -144.44140625 189.09765625 C-163.09741211 184.43896484 -178.11126002 180.71367635 -208.74023438 167.89233398 C-248.68382668 140.21309855 -256.62109375 116.11425781 -250.1875 37.3125 C-188.56401944 -32.50528886 -59.71855357 -26.2675864 0 0 Z" fill="#002786" transform="translate(1569,1510)"/>
            <path d="M0 0 C25.2951823 22.42036476 35.30493164 89.21289062 35.68652344 108.23828125 C35.58142328 145.76879728 30.27314707 183.60471727 5.49902344 210.73828125 C-18.78477492 236.39897348 -52.65218803 242.61372093 -83.59082031 243.6796875 C-111.04231424 244.22450203 -121.50097656 240.73828125 -121.50097656 240.73828125 C-121.50097656 334.73828125 -212.50097656 334.73828125 -212.50097656 -12.26171875 C-185.77097656 -12.26171875 -131.50097656 -12.26171875 -128.50097656 5.73828125 C-85.03369243 -16.05970766 -34.63966906 -29.11805623 0 0 Z M-97.87597656 58.86328125 C-108.77730017 61.32110807 -122.50097656 66.73828125 -122.50097656 172.73828125 C-110.95843671 176.06096662 -99.50097656 177.73828125 -97.22363281 177.89453125 C-78.47052102 176.64061195 -58.26660156 113.77026367 -70.50097656 63.73828125 C-78.739059 56.9329088 -87.75465291 57.07716531 -97.87597656 58.86328125 Z" fill="#FFB500" transform="translate(1819.5009765625,1580.26171875)"/>
            <path d="M0 0 C91 0 91 338 91 338 C64.6 338 11 338 2 323 C-36.5346311 341.36089864 -69.28656414 348.03247207 -99.75 338.9375 C-120.18467773 331.43533443 -144.15625 296.58984375 -155 173 C-148.94006774 143.79146145 -113.55859375 102.65234375 -32.0625 82.6875 C-13.01235318 83.11954572 0 85 0 85 C0 56.95 0 0 0 0 Z M-54.125 159.0625 C-65.07149656 210.28231669 -62.91821289 231.74682617 -59 250 C-55.23474621 259.09199011 -42.875 267 -42.875 267 C-30.82998913 270.320628 0 258 0 258 C0 153 0 153 -5.859375 150.72338867 C-20.90148338 145.64015793 -42.92656706 147.44828365 -54.125 159.0625 Z" fill="#002786" transform="translate(1189,1481)"/>
            <path d="M0 0 C93 0 93 0 93 0 C92.44116211 60.95214844 97.27682495 112.13122559 114 122 C128.65535009 108.47699155 154.94750977 80.51391602 173.8125 57.875 C179.02822648 50.61707778 185 40 185 40 C187 40 195.25218906 56.43117681 215 81 C224.70066866 91.51640861 246 104 246 104 C243.5137247 121.61462841 200.515625 155.984375 193.4375 162.125 C180.87109375 171.5546875 179 173 179 173 C180.96394804 176.68469918 185 179.8125 185 179.8125 C190.94726562 184.39404297 216.30939594 205.22014145 256 225 C266.31609599 227.72357632 283 229 283 229 C283 260.35 283 291.7 283 324 C210.81032629 315.86527505 182.36132812 292.66357422 164.1875 277.625 C159.07356393 273.64439568 134 253.5 119 241.5 C108.50009813 232.9910735 94 222 94 222 C93.67 254.34 93.34 286.68 93 320 C62.31 320 0 320 0 320 C0 214.4 0 108.8 0 0 Z" fill="#002786" transform="translate(600,1499)"/>
            <path d="M0 0 C87 0 87 0 87 0 C86.44031334 117.58690453 92.55937672 152.79765034 105 161 C109.65234375 153.55859375 137.41677547 109.51760992 144 83 C154.81424715 83.50059526 236 88 236 88 C218.67661697 136.94032618 205 157 161.86328125 209.890625 C159 214 159 214 183 233 C201.32422364 247.21634888 236 254 236 254 C236 282.71 236 311.42 236 341 C194.08967586 342.50935118 174 331 144 309 C134 300 129.125 295.625 116.46582031 284.09082031 C108.47678024 276.81143518 99.296875 268.546875 94.2265625 263.9453125 C88 259 88 259 87 338 C58.29 338 0 338 0 338 C0 226.46 0 114.92 0 0 Z" fill="#FFB500" transform="translate(2404,1481)"/>
            <path d="M0 0 C36.59806191 0.0263868 74.45297216 3.91414853 99.875 29.25 C116.8888207 46.71518018 122.03271484 89.58422852 122.03271484 89.58422852 C125.875 180.25 125.875 180.25 140.875 181.25 C147.875 246.25 147.875 246.25 68.2734375 256.46484375 C56.62891016 252.30225984 40.875 235.25 40.875 235.25 C10.77388453 254.28014846 -20.79332519 265.52102724 -55.125 258.25 C-79.81708997 248.35479851 -92.28515625 236.19921875 -109.33984375 176.67578125 C-104.54285482 146.93611541 -94.125 135.25 -92.578125 133.421875 C-68.99190475 107.50038542 8.9375 102.5 32.875 101.25 C32.14152936 90.99516788 26.80859375 82.609375 26.80859375 82.609375 C5.30022862 67.48834255 -33.6920084 76.09160199 -83.125 85.25 C-90.62069197 51.08729538 -97.125 15.25 -97.125 15.25 C-75.32837236 7.49246008 -52.08638008 3.58905648 0 0 Z M-11.125 159.25 C-17.4375 178.0625 -17.4375 178.0625 -12.67285156 196.81542969 C-6.21214486 202.32015553 7.875 201.25 7.875 201.25 C26.57819812 195.66772498 32.875 188.25 32.875 148.25 C19.14550903 148.25 -0.2843873 150.07717387 -11.125 159.25 Z" fill="#FFB500" transform="translate(2239.125,1563.75)"/>
            <path d="M0 0 C27.74786768 48.86132477 30.43359375 95.48828125 29.30859375 123.05078125 C7.08477198 125.16406406 -59.93893433 130.11076736 -82.70678711 131.61254883 C-108.92382812 132.09960938 -117.69140625 132.05078125 -117.69140625 132.05078125 C-113.92561053 151.35451838 -109.06640625 155.30078125 -45.00390625 163.92578125 C-21.22388645 161.43040373 18.30859375 154.05078125 18.30859375 154.05078125 C28.30859375 219.05078125 28.30859375 219.05078125 -149.61328125 225.04296875 C-175.69140625 209.05078125 -212.59375 117.48730469 -179.69140625 9.05078125 C-138.02145222 -35.84713966 -43.85045571 -36.32541651 0 0 Z M-106.69140625 46.05078125 C-117.21944738 68.95392261 -117.69140625 82.05078125 -59.69140625 79.05078125 C-60.72819848 59.7603017 -70.69140625 43.05078125 -106.69140625 46.05078125 Z" fill="#FFB500" transform="translate(2085.69140625,1587.94921875)"/>
            <path d="M0 0 C46.67097887 7.70770842 64.68359375 23.15625 66.50390625 24.5390625 C92.94555683 60.28882807 95.99609375 80.90625 78.109375 150.50390625 C61.37504162 171.16233583 38.82538898 183.80148545 5.01171875 187.3125 C-17.41778833 188.03994347 -57.75390625 164.59375 -57.75390625 164.59375 C-88.71539774 121.8671035 -90.2265625 102.40625 -90.4375 97.21875 C-82.83200037 49.66352059 -66.31640625 31.15625 -64.1171875 28.671875 C-47.31294831 10.78438733 -24.21066174 1.63309691 0 0 Z" fill="#FFB500" transform="translate(905.31640625,1393.84375)"/>
            <path d="M0 0 C0 79.2 0 158.4 0 240 C-30.03 240 -91 240 -91 240 C-91 174 -91 108 -91 40 C-67 37 -42.4288705 30.97027497 -3.01171875 1.8359375 Z" fill="#002786" transform="translate(1005,1579)"/>
            <path d="M0 0 C21.92395297 9.18832156 53.5 34.5 55.53125 36.375 C95.98430492 97.15910481 96.89526367 131.99511719 94.7109375 147.484375 C91.56085589 150.35618085 84.5 152.5 84.5 152.5 C78.33522489 151.33522489 75.5 148.5 74.1875 135.5625 C71.31978145 106.08175394 42.5 57.5 27.5 42.5 C12.24741998 30.40100111 -19.35839844 16.83105469 -19.35839844 16.83105469 C-29.5 10.5 -26.96484375 0.68359375 0 0 Z" fill="#FFB500" transform="translate(997.5,1329.5)"/>
            <path d="M0 0 C39.94267337 31.87829718 48 57 50.6484375 89.35546875 C47.40035434 93.60894595 44 95 44 95 C40.02726432 95.49659196 34.34375 93.48828125 31 82.75 C23.05662957 48.55220385 11 35 9.203125 32.91796875 C-0.18190633 22.75085147 -25.23046875 12.17578125 -31.5 8.25 C-31.96388933 2.43385573 -31 -1 0 0 Z" fill="#FFB500" transform="translate(997,1378)"/>
          </svg>
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

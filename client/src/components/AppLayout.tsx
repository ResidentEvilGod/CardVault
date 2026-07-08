import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Crown,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  Package,
  Scroll,
  Settings,
  ShoppingBag,
  Sparkles,
  Star,
  Tag,
  User,
  Wand2,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";

interface NavItem {
  path: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  requiresAuth?: boolean;
  adminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { path: "/scan", label: "Scan Card", icon: Wand2, requiresAuth: true },
  { path: "/binder", label: "My Binder", icon: BookOpen, requiresAuth: true },
  { path: "/sell-assistant", label: "Sell Assistant", icon: Tag, requiresAuth: true },
  { path: "/sales-activity", label: "Sales Activity", icon: ShoppingBag, requiresAuth: true },
  { path: "/listing-templates", label: "Templates", icon: Scroll, requiresAuth: true },
  { path: "/credits", label: "Credits & Plans", icon: Zap, requiresAuth: true },
  { path: "/purchase-history", label: "Purchase History", icon: Package, requiresAuth: true },
  { path: "/user-profile", label: "Profile", icon: User, requiresAuth: true },
  { path: "/settings", label: "Settings", icon: Settings, requiresAuth: true },
  { path: "/help-center", label: "Help Center", icon: HelpCircle },
  { path: "/admin", label: "Admin", icon: Crown, requiresAuth: true, adminOnly: true },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, isAuthenticated, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { data: balance } = trpc.credits.balance.useQuery(undefined, { enabled: isAuthenticated });

  // Auto-collapse on small screens
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    if (mq.matches) setCollapsed(true);
    const handler = (e: MediaQueryListEvent) => { if (e.matches) setCollapsed(true); };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Close mobile menu on navigation
  useEffect(() => { setMobileOpen(false); }, [location]);

  const isHome = location === "/";
  if (isHome) return <>{children}</>;

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b" style={{ borderColor: "oklch(0.28 0.06 55 / 0.5)" }}>
        <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: "linear-gradient(135deg, oklch(0.72 0.18 55), oklch(0.55 0.25 290))" }}>
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        {!collapsed && (
          <span className="font-display text-sm font-bold text-gradient-gold leading-tight">
            CardVault
          </span>
        )}
      </div>

      {/* Credits badge */}
      {isAuthenticated && !collapsed && (
        <div className="mx-3 my-3 p-2 rounded-lg" style={{
          background: "oklch(0.18 0.04 55 / 0.5)",
          border: "1px solid oklch(0.78 0.16 75 / 0.2)"
        }}>
          <div className="flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "var(--gold)" }} />
            <div className="min-w-0">
              <div className="text-xs font-heading text-muted-foreground">Scan Credits</div>
              <div className="font-heading text-sm font-bold" style={{ color: "var(--gold)" }}>
                {balance?.subscriptionStatus === "active" ? "∞ Unlimited" : `${balance?.scanCredits ?? 0} remaining`}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto py-2 px-2">
        {NAV_ITEMS.map((item) => {
          if (item.adminOnly && user?.role !== "admin") return null;
          if (item.requiresAuth && !isAuthenticated) return null;

          const isActive = location === item.path || location.startsWith(item.path + "/");
          const Icon = item.icon;

          return (
            <Link key={item.path} href={item.path}>
              <div className={`nav-item mb-0.5 ${isActive ? "active" : ""} ${collapsed ? "justify-center px-2" : ""}`}
                title={collapsed ? item.label : undefined}>
                <Icon className="w-4 h-4 flex-shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </div>
            </Link>
          );
        })}

        {!isAuthenticated && (
          <button onClick={() => startLogin()} className="nav-item w-full mb-0.5">
            <Star className="w-4 h-4 flex-shrink-0" />
            {!collapsed && <span>Sign In</span>}
          </button>
        )}
      </nav>

      {/* User section */}
      {isAuthenticated && (
        <div className="border-t p-2" style={{ borderColor: "oklch(0.28 0.06 55 / 0.5)" }}>
          {!collapsed && (
            <div className="px-2 py-1.5 mb-1 rounded-md" style={{ background: "oklch(0.18 0.03 50)" }}>
              <div className="text-xs font-heading text-muted-foreground truncate">{user?.name ?? "Adventurer"}</div>
              {user?.role === "admin" && (
                <div className="text-xs" style={{ color: "var(--gold)" }}>Admin</div>
              )}
            </div>
          )}
          <button
            onClick={() => logout()}
            className={`nav-item w-full ${collapsed ? "justify-center px-2" : ""}`}
            title={collapsed ? "Sign Out" : undefined}
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {!collapsed && <span>Sign Out</span>}
          </button>
        </div>
      )}
    </>
  );

  return (
    <div className="flex min-h-screen bg-background">
      {/* Mobile overlay backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 sm:hidden"
          onClick={() => setMobileOpen(false)}
          style={{ background: "oklch(0 0 0 / 0.65)" }}
        />
      )}

      {/* Mobile sidebar drawer */}
      <aside
        className="fixed inset-y-0 left-0 flex flex-col border-r z-50 sm:hidden transition-transform duration-300"
        style={{
          width: "220px",
          transform: mobileOpen ? "translateX(0)" : "translateX(-100%)",
          borderColor: "oklch(0.28 0.06 55)",
          background: "linear-gradient(180deg, oklch(0.13 0.025 50), oklch(0.11 0.02 50))",
          boxShadow: "4px 0 24px oklch(0 0 0 / 0.5)",
        }}
      >
        {sidebarContent}
      </aside>

      {/* Desktop sidebar */}
      <aside
        className="hidden sm:flex flex-col border-r transition-all duration-300 relative z-20"
        style={{
          width: collapsed ? "64px" : "220px",
          borderColor: "oklch(0.28 0.06 55)",
          background: "linear-gradient(180deg, oklch(0.13 0.025 50), oklch(0.11 0.02 50))",
          boxShadow: "4px 0 24px oklch(0 0 0 / 0.3)",
        }}
      >
        {sidebarContent}

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center border z-30 transition-all duration-200 hover:scale-110"
          style={{
            background: "oklch(0.18 0.04 55)",
            borderColor: "oklch(0.45 0.10 60)",
            color: "var(--gold)",
          }}
        >
          {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </button>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto min-w-0">
        {/* Top bar */}
        <header
          className="sticky top-0 z-10 flex items-center justify-between px-4 sm:px-6 py-3 border-b"
          style={{
            background: "oklch(0.12 0.02 50 / 0.95)",
            borderColor: "oklch(0.28 0.06 55 / 0.5)",
            backdropFilter: "blur(12px)",
          }}
        >
          <div className="flex items-center gap-2">
            {/* Mobile hamburger */}
            <button
              className="sm:hidden p-1.5 rounded-md mr-1"
              style={{ color: "var(--gold)" }}
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <LayoutDashboard className="w-4 h-4 text-muted-foreground hidden sm:block" />
            <span className="font-heading text-sm text-muted-foreground tracking-wider uppercase">
              {NAV_ITEMS.find(n => location === n.path || location.startsWith(n.path + "/"))?.label ?? "CardVault"}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <Link href="/scan">
                <button className="btn-fantasy text-xs py-1.5 px-3 sm:px-4">
                  <Wand2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Scan Card</span>
                  <span className="sm:hidden">Scan</span>
                </button>
              </Link>
            ) : (
              <button onClick={() => startLogin()} className="btn-fantasy text-xs py-1.5 px-3 sm:px-4">
                <Star className="w-3.5 h-3.5" />
                Sign In
              </button>
            )}
          </div>
        </header>

        <div className="p-4 sm:p-6">
          {children}
        </div>
      </main>
    </div>
  );
}

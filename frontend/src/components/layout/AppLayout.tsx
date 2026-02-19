import { Link, Outlet, useLocation } from "react-router-dom";
import { LayoutDashboard, Repeat, CreditCard, XCircle, CalendarDays, Share2, Users, LogOut, Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

const navItems = [
  { to: "/", label: "대시보드", icon: LayoutDashboard },
  { to: "/subscriptions", label: "구독 관리", icon: Repeat },
  { to: "/cards", label: "결제수단", icon: CreditCard },
  { to: "/calendar", label: "캘린더", icon: CalendarDays },
  { to: "/sharing", label: "구독 공유", icon: Share2 },
  { to: "/organizations", label: "조직 관리", icon: Users },
  { to: "/cancellations", label: "해지 내역", icon: XCircle },
];

export function AppLayout() {
  const location = useLocation();
  const { user, logout } = useAuth();

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r bg-card p-6">
        <h1 className="text-2xl font-bold text-primary mb-2">SubTrak</h1>
        {user && (
          <p className="text-xs text-muted-foreground mb-6 truncate">{user.name} ({user.email})</p>
        )}
        <nav className="flex flex-col gap-1 flex-1">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive(item.to)
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          ))}
        </nav>
        {user?.is_admin && (
          <Link
            to="/admin"
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors mt-2 border-t pt-3",
              isActive("/admin")
                ? "bg-yellow-500 text-white"
                : "text-yellow-600 hover:bg-yellow-50"
            )}
          >
            <Crown className="h-5 w-5" />
            관리자
          </Link>
        )}
        <Button variant="ghost" size="sm" onClick={logout} className="mt-4 justify-start text-muted-foreground">
          <LogOut className="mr-2 h-4 w-4" />로그아웃
        </Button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto pb-20 md:pb-0">
        <div className="container mx-auto p-6">
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Tabs (show first 5) */}
      <nav className="fixed bottom-0 left-0 right-0 flex md:hidden border-t bg-card">
        {navItems.slice(0, 5).map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 py-3 text-xs",
              isActive(item.to) ? "text-primary" : "text-muted-foreground"
            )}
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}

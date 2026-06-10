import { Link, useRouterState } from "@tanstack/react-router";
import { LogIn, LayoutDashboard, FileBarChart, ClipboardCheck, Users, type LucideIcon, X } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useUI } from "@/lib/ui-context";
import { useAuth } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/obra-utils";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  requiresAuth: boolean;
  requiresAdmin?: boolean;
}

const items: NavItem[] = [
  { label: "Login", to: "/auth", icon: LogIn, requiresAuth: false },
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard, requiresAuth: true },
  { label: "Relatórios", to: "/relatorios", icon: FileBarChart, requiresAuth: true },
  { label: "Checklist Fiscal", to: "/checklist", icon: ClipboardCheck, requiresAuth: true },
  { label: "Usuários", to: "/admin/usuarios", icon: Users, requiresAuth: true, requiresAdmin: true },
];

export function AppSidebar() {
  const { sidebarOpen, setSidebarOpen } = useUI();
  const { isAuthenticated, isAdmin, role } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const visibleItems = items.filter((item) => !item.requiresAdmin || isAdmin);

  return (
    <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
      <SheetContent
        side="left"
        className="w-72 border-r-0 bg-sidebar p-0 text-sidebar-foreground [&>button]:hidden"
      >
        <SheetHeader className="flex flex-row items-center justify-between border-b border-sidebar-border px-5 py-5">
          <SheetTitle className="text-2xl font-bold tracking-tight text-sidebar-primary">
            Menu
          </SheetTitle>
          <button
            onClick={() => setSidebarOpen(false)}
            aria-label="Fechar menu"
            className="rounded-md p-1 text-sidebar-foreground/70 transition hover:bg-sidebar-accent hover:text-sidebar-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </SheetHeader>

        <nav className="flex flex-col gap-1 p-3">
          {visibleItems.map((item) => {
            const enabled = !item.requiresAuth || isAuthenticated;
            const active = pathname === item.to;
            const Icon = item.icon;

            if (!enabled) {
              return (
                <div
                  key={item.to}
                  aria-disabled
                  className="flex cursor-not-allowed items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium opacity-40"
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                </div>
              );
            }

            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all duration-200",
                  active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                )}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto border-t border-sidebar-border p-5 text-xs text-sidebar-foreground/60">
          {isAuthenticated && role ? (
            <p>
              Conectado como
              <br />
              <span className="font-semibold text-sidebar-foreground">{ROLE_LABELS[role]}</span>
            </p>
          ) : (
            <p>Faça login para liberar todos os recursos da plataforma.</p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

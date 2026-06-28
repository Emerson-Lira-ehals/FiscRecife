import { type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Home } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { AppSidebar } from "@/components/AppSidebar";
import { OfflineBanner } from "@/components/OfflineIndicator";

function BackToHomeButton() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (pathname === "/") return null;
  return (
    <Link
      to="/"
      aria-label="Voltar à página inicial"
      className="fixed bottom-5 left-5 z-40 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground shadow-[var(--shadow-lift)] transition hover:border-primary/40 hover:text-primary"
    >
      <Home className="h-4 w-4" />
      <span className="hidden sm:inline">Voltar à Página Inicial</span>
    </Link>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <OfflineBanner />
      <AppHeader />
      <AppSidebar />
      <main className="flex-1">{children}</main>
      <footer className="border-t border-border bg-card py-6 text-center text-xs text-muted-foreground">
        FiscRecife · Plataforma de transparência e monitoramento de obras públicas
      </footer>
      <BackToHomeButton />
    </div>
  );
}

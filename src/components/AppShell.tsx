import { type ReactNode } from "react";
import { AppHeader } from "@/components/AppHeader";
import { AppSidebar } from "@/components/AppSidebar";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <AppHeader />
      <AppSidebar />
      <main className="flex-1">{children}</main>
      <footer className="border-t border-border bg-card py-6 text-center text-xs text-muted-foreground">
        FiscRecife · Plataforma de transparência e monitoramento de obras públicas
      </footer>
    </div>
  );
}

import { Link } from "@tanstack/react-router";
import { Menu, Search, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useUI } from "@/lib/ui-context";
import { ROLE_LABELS } from "@/lib/obra-utils";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo.png";

export function AppHeader() {
  const { setSidebarOpen, search, setSearch } = useUI();
  const { isAuthenticated, role, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-card/90 backdrop-blur">
      <div className="flex h-16 items-center gap-3 px-3 sm:px-5">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Abrir menu"
          onClick={() => setSidebarOpen(true)}
          className="shrink-0"
        >
          <Menu className="h-5 w-5" />
        </Button>

        <Link to="/" className="flex items-center gap-2 shrink-0">
          <img src={logo} alt="Recife Obras" className="h-9 w-9 object-contain" width={36} height={36} />
          <span className="hidden text-lg font-bold tracking-tight text-foreground sm:inline">
            Recife<span className="text-primary">Obras</span>
          </span>
        </Link>

        <div className="relative mx-auto w-full max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquisar obra pelo nome..."
            className="h-10 w-full rounded-full border border-input bg-background pl-9 pr-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          {isAuthenticated && role ? (
            <>
              <span className="hidden rounded-full bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground md:inline">
                Perfil: {ROLE_LABELS[role]}
              </span>
              <Button variant="ghost" size="icon" aria-label="Sair" onClick={() => signOut()}>
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <Button asChild size="sm">
              <Link to="/auth">Login</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}

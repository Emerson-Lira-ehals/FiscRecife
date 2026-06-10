import { Link } from "@tanstack/react-router";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

export function AuthRequired({
  children,
  adminOnly = false,
}: {
  children: React.ReactNode;
  adminOnly?: boolean;
}) {
  const { isAuthenticated, isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-muted-foreground">
        Carregando...
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="max-w-sm rounded-2xl border border-border bg-card p-8 text-center shadow-[var(--shadow-card)]">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Lock className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">Acesso restrito</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Faça login com seu perfil institucional para acessar esta área.
          </p>
          <Button asChild className="mt-5 w-full">
            <Link to="/auth">Entrar</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (adminOnly && !isAdmin) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="max-w-sm rounded-2xl border border-border bg-card p-8 text-center shadow-[var(--shadow-card)]">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-danger/10 text-danger">
            <Lock className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">Permissão insuficiente</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Esta área é exclusiva do Administrador Master.
          </p>
          <Button asChild className="mt-5 w-full">
            <Link to="/">Voltar</Link>
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

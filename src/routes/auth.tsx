import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye, EyeOff, ShieldCheck, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { ROLE_LABELS, type AppRole } from "@/lib/obra-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — FiscRecife" },
      { name: "description", content: "Acesse a plataforma FiscRecife com seu perfil institucional." },
    ],
  }),
  component: AuthPage,
});

const ROLES: AppRole[] = ["admin", "prefeitura", "fiscal", "gestor"];

const DEMO: Partial<Record<AppRole, string>> = {
  admin: "admin@recifeobraviva.com",
  fiscal: "fiscal@recife.gov.br",
  gestor: "gestor@recife.gov.br",
  agente: "agente@recife.gov.br",
};

function AuthPage() {
  const navigate = useNavigate();
  const { signIn, isAuthenticated } = useAuth();
  const [role, setRole] = useState<AppRole | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) navigate({ to: "/" });
  }, [isAuthenticated, navigate]);

  const canSubmit = role && email.trim() && password.trim() && !loading;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!role || !canSubmit) return;
    setError(null);
    setLoading(true);
    const { error } = await signIn(email.trim(), password, role);
    setLoading(false);
    if (error) {
      setError(error);
      return;
    }
    navigate({ to: "/" });
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-elevated)] sm:p-8">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Acessar plataforma</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Seu perfil é validado com segurança no sistema.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <Label className="mb-2 block">Quem você é?</Label>
            <div className="grid grid-cols-1 gap-2">
              {ROLES.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => {
                    setRole(r);
                    setError(null);
                  }}
                  className={cn(
                    "rounded-lg border px-4 py-3 text-left text-sm font-medium transition",
                    role === r
                      ? "border-primary bg-accent text-accent-foreground ring-2 ring-primary/20"
                      : "border-border bg-background hover:border-primary/40",
                  )}
                >
                  {ROLE_LABELS[r]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="email" className="mb-1.5 block">
              E-mail
            </Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu.email@recife.gov.br"
            />
          </div>

          <div>
            <Label htmlFor="password" className="mb-1.5 block">
              Senha
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={show ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                aria-label={show ? "Ocultar senha" : "Mostrar senha"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {error && (
            <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
          )}

          <Button type="submit" disabled={!canSubmit} className="w-full">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirmar
          </Button>
        </form>

        <div className="mt-6 rounded-lg border border-dashed border-border bg-muted/50 p-3 text-xs text-muted-foreground">
          <p className="mb-1 font-semibold text-foreground">Contas de demonstração</p>
          {ROLES.filter((r) => DEMO[r]).map((r) => {
            const senha = r === "admin" ? "Devsembug@2026" : "recife2026";
            return (
              <button
                key={r}
                type="button"
                onClick={() => {
                  setRole(r);
                  setEmail(DEMO[r] ?? "");
                  setPassword(senha);
                  setError(null);
                }}
                className="block w-full text-left hover:text-primary"
              >
                {ROLE_LABELS[r]}: {DEMO[r]} ({senha})
              </button>
            );
          })}
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          <Link to="/" className="hover:text-primary">
            Voltar ao catálogo de obras
          </Link>
        </p>
      </div>
    </div>
  );
}

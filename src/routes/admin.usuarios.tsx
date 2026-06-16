import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Users, Plus, Loader2, KeyRound, UserCheck, UserX, Search } from "lucide-react";
import { toast } from "sonner";
import { AuthRequired } from "@/components/AuthRequired";
import {
  fetchUsuarios,
  setUsuarioAtivo,
  setUsuarioRole,
  type UsuarioRow,
  type AppRole,
} from "@/lib/queries";
import {
  adminCreateUser,
  adminSetPassword,
} from "@/lib/admin-users.functions";
import { ROLE_LABELS, formatDate } from "@/lib/obra-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/usuarios")({
  head: () => ({ meta: [{ title: "Usuários — Administração — FiscRecife" }] }),
  component: () => (
    <AuthRequired adminOnly>
      <UsuariosAdmin />
    </AuthRequired>
  ),
});

const ROLE_OPTS: AppRole[] = ["admin", "prefeitura", "fiscal", "gestor", "agente"];
const ALL = "todos";

function UsuariosAdmin() {
  const qc = useQueryClient();
  const usersQ = useQuery({ queryKey: ["usuarios"], queryFn: fetchUsuarios });
  const users = usersQ.data ?? [];

  const [nameFilter, setNameFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>(ALL);
  const [statusFilter, setStatusFilter] = useState<string>(ALL);

  const [createOpen, setCreateOpen] = useState(false);
  const [pwUser, setPwUser] = useState<UsuarioRow | null>(null);

  const filtered = useMemo(
    () =>
      users.filter((u) => {
        if (nameFilter && !`${u.nome} ${u.email}`.toLowerCase().includes(nameFilter.toLowerCase()))
          return false;
        if (roleFilter !== ALL && u.role !== roleFilter) return false;
        if (statusFilter !== ALL && String(u.ativo) !== statusFilter) return false;
        return true;
      }),
    [users, nameFilter, roleFilter, statusFilter],
  );

  const invalidate = () => qc.invalidateQueries({ queryKey: ["usuarios"] });

  const ativoMut = useMutation({
    mutationFn: ({ id, ativo }: { id: string; ativo: boolean }) => setUsuarioAtivo(id, ativo),
    onSuccess: (_d, v) => {
      invalidate();
      toast.success(v.ativo ? "Usuário reativado." : "Usuário desativado.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const roleMut = useMutation({
    mutationFn: ({ id, role }: { id: string; role: AppRole }) => setUsuarioRole(id, role),
    onSuccess: () => {
      invalidate();
      toast.success("Função alterada.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-foreground">
            <Users className="h-6 w-6 text-primary" /> Usuários
          </h1>
          <p className="text-sm text-muted-foreground">
            Administração → Usuários · gestão de acesso e perfis da plataforma.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-1 h-4 w-4" /> Novo usuário
        </Button>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={nameFilter}
            onChange={(e) => setNameFilter(e.target.value)}
            placeholder="Buscar por nome ou e-mail"
            className="pl-9"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Perfil" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos os perfis</SelectItem>
            {ROLE_OPTS.map((r) => (
              <SelectItem key={r} value={r}>
                {ROLE_LABELS[r]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos os status</SelectItem>
            <SelectItem value="true">Ativos</SelectItem>
            <SelectItem value="false">Inativos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-card)]">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">E-mail</th>
                <th className="px-4 py-3">Função</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Criado em</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {usersQ.isLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    Carregando...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    Nenhum usuário encontrado.
                  </td>
                </tr>
              ) : (
                filtered.map((u) => (
                  <tr key={u.id} className="border-t border-border">
                    <td className="px-4 py-3 font-medium text-foreground">{u.nome || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                    <td className="px-4 py-3">
                      <Select
                        value={u.role ?? undefined}
                        onValueChange={(v) => roleMut.mutate({ id: u.id, role: v as AppRole })}
                      >
                        <SelectTrigger className="h-8 w-44">
                          <SelectValue placeholder="Sem função" />
                        </SelectTrigger>
                        <SelectContent>
                          {ROLE_OPTS.map((r) => (
                            <SelectItem key={r} value={r}>
                              {ROLE_LABELS[r]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
                          u.ativo
                            ? "bg-success/15 text-success"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        {u.ativo ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(u.criado_em)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setPwUser(u)}
                          title="Alterar senha"
                        >
                          <KeyRound className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant={u.ativo ? "outline" : "default"}
                          onClick={() => ativoMut.mutate({ id: u.id, ativo: !u.ativo })}
                          title={u.ativo ? "Desativar" : "Reativar"}
                        >
                          {u.ativo ? (
                            <UserX className="h-4 w-4" />
                          ) : (
                            <UserCheck className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <CreateUserDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={invalidate} />
      <PasswordDialog user={pwUser} onClose={() => setPwUser(null)} />
    </div>
  );
}

function CreateUserDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: () => void;
}) {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<AppRole>("fiscal");

  const mut = useMutation({
    mutationFn: () => adminCreateUser({ data: { nome, email, password, role } }),
    onSuccess: () => {
      toast.success("Usuário criado.");
      onCreated();
      onOpenChange(false);
      setNome("");
      setEmail("");
      setPassword("");
      setRole("fiscal");
    },
    onError: (e: Error) => toast.error(e.message || "Não foi possível criar."),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo usuário</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="mb-1.5 block text-xs">Nome</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>
          <div>
            <Label className="mb-1.5 block text-xs">E-mail</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <Label className="mb-1.5 block text-xs">Senha</Label>
            <Input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
            />
          </div>
          <div>
            <Label className="mb-1.5 block text-xs">Função</Label>
            <Select value={role} onValueChange={(v) => setRole(v as AppRole)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button
            disabled={mut.isPending || !nome || !email || password.length < 6}
            onClick={() => mut.mutate()}
          >
            {mut.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
            Criar usuário
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PasswordDialog({ user, onClose }: { user: UsuarioRow | null; onClose: () => void }) {
  const [password, setPassword] = useState("");
  const mut = useMutation({
    mutationFn: () => adminSetPassword({ data: { userId: user!.id, password } }),
    onSuccess: () => {
      toast.success("Senha alterada.");
      setPassword("");
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={!!user} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Alterar senha · {user?.nome}</DialogTitle>
        </DialogHeader>
        <div>
          <Label className="mb-1.5 block text-xs">Nova senha</Label>
          <Input
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mínimo 6 caracteres"
          />
        </div>
        <DialogFooter>
          <Button disabled={mut.isPending || password.length < 6} onClick={() => mut.mutate()}>
            {mut.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
            Salvar senha
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

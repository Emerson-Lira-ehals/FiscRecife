import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  Line,
  LineChart,
  Bar,
  BarChart,
  Pie,
  PieChart,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Activity,
  CalendarDays,
  Clock,
  Pencil,
  Save,
  TrendingUp,
  Wallet,
  X,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import {
  fetchObras,
  fetchProgresso,
  fetchFinanceiro,
  fetchOrcamento,
  fetchEtapas,
  fetchAuditoria,
  logAuditoria,
} from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { AuthRequired } from "@/components/AuthRequired";
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  daysBetween,
} from "@/lib/obra-utils";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Recife Obras" }] }),
  component: () => (
    <AuthRequired>
      <Dashboard />
    </AuthRequired>
  ),
});

const PIE_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
];

function Dashboard() {
  const qc = useQueryClient();
  const { role, user, profile } = useAuth();
  const obrasQ = useQuery({ queryKey: ["obras"], queryFn: fetchObras });
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const obras = obrasQ.data ?? [];
  const obraId = selectedId ?? obras[0]?.id ?? null;
  const obra = obras.find((o) => o.id === obraId) ?? null;

  if (obrasQ.isLoading) {
    return <div className="px-4 py-16 text-center text-sm text-muted-foreground">Carregando...</div>;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Dashboard analítico</h1>
          <p className="text-sm text-muted-foreground">
            Indicadores de desempenho e evolução das obras.
          </p>
        </div>
        <div className="w-full sm:w-72">
          <Label className="mb-1.5 block text-xs">Obra</Label>
          <Select value={obraId ?? undefined} onValueChange={setSelectedId}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione uma obra" />
            </SelectTrigger>
            <SelectContent>
              {obras.map((o) => (
                <SelectItem key={o.id} value={o.id}>
                  {o.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {obra && (
        <DashboardContent
          key={obra.id}
          obra={obra}
          isGestor={role === "gestor"}
          userId={user?.id ?? null}
          userName={profile?.nome ?? "Gestor"}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["obras"] });
            qc.invalidateQueries({ queryKey: ["obra", obra.id] });
          }}
        />
      )}
    </div>
  );
}

function DashboardContent({
  obra,
  isGestor,
  userId,
  userName,
  onSaved,
}: {
  obra: Awaited<ReturnType<typeof fetchObras>>[number];
  isGestor: boolean;
  userId: string | null;
  userName: string;
  onSaved: () => void;
}) {
  const qc = useQueryClient();
  const progressoQ = useQuery({ queryKey: ["progresso", obra.id], queryFn: () => fetchProgresso(obra.id) });
  const financeiroQ = useQuery({ queryKey: ["financeiro", obra.id], queryFn: () => fetchFinanceiro(obra.id) });
  const orcamentoQ = useQuery({ queryKey: ["orcamento", obra.id], queryFn: () => fetchOrcamento(obra.id) });
  const etapasQ = useQuery({ queryKey: ["etapas", obra.id], queryFn: () => fetchEtapas(obra.id) });
  const auditoriaQ = useQuery({ queryKey: ["auditoria", obra.id], queryFn: () => fetchAuditoria(obra.id) });

  const [editing, setEditing] = useState(false);
  const [pct, setPct] = useState(String(obra.percentual_concluido));
  const [exec, setExec] = useState(String(obra.valor_executado));

  const diasExec = daysBetween(obra.data_inicio, new Date().toISOString());
  const diasRest = daysBetween(new Date().toISOString(), obra.data_prevista);
  const desvio = obra.valor_executado - (obra.valor_previsto * obra.percentual_concluido) / 100;

  const spi = obra.percentual_planejado > 0 ? obra.percentual_concluido / obra.percentual_planejado : 1;
  const earned = (obra.percentual_concluido / 100) * obra.valor_previsto;
  const cpi = obra.valor_executado > 0 ? earned / obra.valor_executado : 1;

  const progressoData = useMemo(
    () =>
      (progressoQ.data ?? []).map((p) => ({
        data: formatDate(p.data),
        Planejado: p.percentual_planejado,
        Executado: p.percentual_executado,
      })),
    [progressoQ.data],
  );

  const financeiroData = useMemo(
    () =>
      (financeiroQ.data ?? []).map((f) => ({
        mes: f.mes,
        Previsto: f.valor_previsto,
        Realizado: f.valor_realizado,
      })),
    [financeiroQ.data],
  );

  const orcamentoData = useMemo(
    () => (orcamentoQ.data ?? []).map((o) => ({ name: o.categoria, value: o.valor })),
    [orcamentoQ.data],
  );

  const saveMut = useMutation({
    mutationFn: async () => {
      const novoPct = Math.max(0, Math.min(100, Number(pct) || 0));
      const novoExec = Math.max(0, Number(exec) || 0);
      const { error } = await supabase
        .from("obras")
        .update({
          percentual_concluido: novoPct,
          valor_executado: novoExec,
          data_atualizada: new Date().toISOString().slice(0, 10),
        })
        .eq("id", obra.id);
      if (error) throw new Error(error.message);
      await logAuditoria(
        obra.id,
        `Atualizou indicadores: ${novoPct}% concluído, executado ${formatCurrency(novoExec)}`,
        "obras",
        userId,
        userName,
      );
    },
    onSuccess: () => {
      setEditing(false);
      qc.invalidateQueries({ queryKey: ["auditoria", obra.id] });
      onSaved();
      toast.success("Indicadores atualizados.");
    },
    onError: () => toast.error("Não foi possível salvar."),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
        <div className="flex items-center gap-3">
          <StatusBadge status={obra.status} />
          <span className="text-sm font-medium text-foreground">{obra.nome}</span>
        </div>
        {isGestor &&
          (editing ? (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setEditing(false)}>
                <X className="mr-1 h-4 w-4" /> Cancelar
              </Button>
              <Button size="sm" disabled={saveMut.isPending} onClick={() => saveMut.mutate()}>
                {saveMut.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
                Salvar
              </Button>
            </div>
          ) : (
            <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
              <Pencil className="mr-1 h-4 w-4" /> Editar Dashboard
            </Button>
          ))}
      </div>

      {editing && (
        <div className="grid grid-cols-1 gap-4 rounded-xl border border-primary/30 bg-accent/40 p-4 sm:grid-cols-2">
          <div>
            <Label className="mb-1.5 block text-xs">Percentual concluído (%)</Label>
            <Input type="number" min={0} max={100} value={pct} onChange={(e) => setPct(e.target.value)} />
          </div>
          <div>
            <Label className="mb-1.5 block text-xs">Valor executado (R$)</Label>
            <Input type="number" min={0} value={exec} onChange={(e) => setExec(e.target.value)} />
          </div>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi icon={Activity} label="Concluído" value={`${obra.percentual_concluido}%`} />
        <Kpi icon={CalendarDays} label="Dias em execução" value={String(Math.max(diasExec, 0))} />
        <Kpi icon={Clock} label="Dias restantes" value={String(Math.max(diasRest, 0))} />
        <Kpi icon={Wallet} label="Valor previsto" value={formatCurrency(obra.valor_previsto)} />
        <Kpi icon={Wallet} label="Valor executado" value={formatCurrency(obra.valor_executado)} />
        <Kpi
          icon={TrendingUp}
          label="Desvio financeiro"
          value={formatCurrency(desvio)}
          tone={desvio > 0 ? "danger" : "success"}
        />
        <Kpi icon={Activity} label="Fiscalizações" value={String(auditoriaQ.data?.length ?? 0)} />
        <Kpi
          icon={TrendingUp}
          label="Saldo"
          value={formatCurrency(obra.valor_previsto - obra.valor_executado)}
        />
      </div>

      {/* Indicadores SPI/CPI */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Semaforo label="SPI (prazo)" value={spi} help="Índice de desempenho de prazo" />
        <Semaforo label="CPI (custo)" value={cpi} help="Índice de desempenho de custo" />
        <Semaforo
          label="Execução vs Planejado"
          value={obra.percentual_planejado > 0 ? obra.percentual_concluido / obra.percentual_planejado : 1}
          help={`${obra.percentual_concluido}% de ${obra.percentual_planejado}% planejado`}
        />
      </div>

      {/* Evolução física */}
      <ChartCard title="Evolução física (planejado vs executado)">
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={progressoData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="data" fontSize={11} tick={{ fill: "var(--muted-foreground)" }} />
            <YAxis fontSize={11} tick={{ fill: "var(--muted-foreground)" }} unit="%" />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="Planejado" stroke="var(--chart-3)" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="Executado" stroke="var(--chart-1)" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Evolução financeira */}
        <ChartCard title="Evolução financeira (R$ por mês)">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={financeiroData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="mes" fontSize={11} tick={{ fill: "var(--muted-foreground)" }} />
              <YAxis fontSize={11} tick={{ fill: "var(--muted-foreground)" }} tickFormatter={(v) => `${v / 1000}k`} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Legend />
              <Bar dataKey="Previsto" fill="var(--chart-3)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Realizado" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Distribuição orçamentária */}
        <ChartCard title="Distribuição orçamentária">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={orcamentoData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                {orcamentoData.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Cronograma / Gantt simplificado */}
      <ChartCard title="Cronograma de etapas">
        <div className="space-y-2">
          {(etapasQ.data ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">Sem etapas cadastradas.</p>
          )}
          {(etapasQ.data ?? []).map((e) => (
            <div key={e.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-border p-3 text-sm">
              <span
                className={`h-2.5 w-2.5 shrink-0 rounded-full ${e.concluida ? "bg-success" : "bg-warning"}`}
              />
              <span className="min-w-[140px] flex-1 font-medium text-foreground">{e.etapa}</span>
              <span className="text-xs text-muted-foreground">
                Previsto: {formatDate(e.data_prevista_inicio)} → {formatDate(e.data_prevista_fim)}
              </span>
              <span className="text-xs text-muted-foreground">
                Real: {formatDate(e.data_real_inicio)} → {formatDate(e.data_real_fim)}
              </span>
              <span
                className={`ml-auto rounded-full px-2 py-0.5 text-xs font-medium ${
                  e.concluida ? "bg-success/15 text-success" : "bg-warning/15 text-warning"
                }`}
              >
                {e.concluida ? "Concluída" : "Em andamento"}
              </span>
            </div>
          ))}
        </div>
      </ChartCard>

      {/* Histórico de atualizações */}
      <ChartCard title="Histórico de atualizações">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-2 pr-4">Data</th>
                <th className="py-2 pr-4">Usuário</th>
                <th className="py-2">Alteração</th>
              </tr>
            </thead>
            <tbody>
              {(auditoriaQ.data ?? []).length === 0 && (
                <tr>
                  <td colSpan={3} className="py-4 text-muted-foreground">
                    Nenhum registro de auditoria.
                  </td>
                </tr>
              )}
              {(auditoriaQ.data ?? []).map((a) => (
                <tr key={a.id} className="border-b border-border/60">
                  <td className="py-2 pr-4 text-muted-foreground">{formatDateTime(a.data_hora)}</td>
                  <td className="py-2 pr-4 font-medium text-foreground">{a.usuario_nome}</td>
                  <td className="py-2 text-foreground">{a.acao}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  tone = "default",
}: {
  icon: typeof Activity;
  label: string;
  value: string;
  tone?: "default" | "success" | "danger";
}) {
  const toneClass = tone === "danger" ? "text-danger" : tone === "success" ? "text-success" : "text-foreground";
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
      <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-0.5 text-lg font-bold ${toneClass}`}>{value}</p>
    </div>
  );
}

function Semaforo({ label, value, help }: { label: string; value: number; help: string }) {
  const tone = value >= 0.95 ? "success" : value >= 0.85 ? "warning" : "danger";
  const bg = tone === "success" ? "bg-success" : tone === "warning" ? "bg-warning" : "bg-danger";
  const text = tone === "success" ? "text-success" : tone === "warning" ? "text-warning" : "text-danger";
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <span className={`h-3 w-3 rounded-full ${bg}`} />
      </div>
      <p className={`mt-1 text-2xl font-bold ${text}`}>{value.toFixed(2)}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{help}</p>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <h2 className="mb-4 text-base font-semibold tracking-tight text-foreground">{title}</h2>
      {children}
    </section>
  );
}

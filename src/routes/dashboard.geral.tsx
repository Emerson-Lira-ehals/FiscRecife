import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  AlertTriangle,
  Building2,
  CheckCircle2,
  PauseCircle,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { AuthRequired } from "@/components/AuthRequired";
import { fetchObras, fetchOrcamentoTodos } from "@/lib/queries";
import { formatCurrency, STATUS_LABELS } from "@/lib/obra-utils";
import type { Obra, ObraStatus } from "@/lib/obra-utils";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/dashboard/geral")({
  head: () => ({
    meta: [
      { title: "FiscRecife — Dashboard Geral" },
      {
        name: "description",
        content:
          "Visão consolidada de todas as obras públicas do Recife: status, execução financeira e distribuição de gastos por setor.",
      },
    ],
  }),
  component: () => (
    <AuthRequired>
      <DashboardGeral />
    </AuthRequired>
  ),
});

const STATUS_COLORS: Record<ObraStatus, string> = {
  planejamento: "var(--chart-4)",
  licitacao: "var(--chart-5)",
  em_andamento: "var(--chart-1)",
  atrasada: "var(--chart-3)",
  paralisada: "var(--chart-6)",
  concluida: "var(--chart-2)",
  cancelada: "var(--muted-foreground)",
};

const SETOR_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
];

function DashboardGeral() {
  const { data: obras, isLoading } = useQuery({ queryKey: ["obras"], queryFn: fetchObras });
  const { data: setores } = useQuery({
    queryKey: ["orcamento-todos"],
    queryFn: fetchOrcamentoTodos,
  });

  const m = useMemo(() => computeMetrics(obras ?? []), [obras]);

  const statusData = useMemo(
    () =>
      m.statusEntries.map(([status, count]) => ({
        name: STATUS_LABELS[status],
        value: count,
        color: STATUS_COLORS[status],
      })),
    [m.statusEntries],
  );

  const setorTotal = (setores ?? []).reduce((s, x) => s + x.valor, 0);
  const setorData = (setores ?? []).map((x) => ({ name: x.categoria, value: x.valor }));

  const financeiroData = [
    { name: "Previsto", value: m.totalPrevisto },
    { name: "Gasto", value: m.totalGasto },
  ];

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <Skeleton className="mb-6 h-10 w-64" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="mt-6 h-80 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-6">
        <p className="text-xs font-medium text-muted-foreground">Visão consolidada</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground">Dashboard Geral</h1>
        <p className="text-sm text-muted-foreground">
          Desempenho de todas as {m.total} obra(s) cadastradas no sistema.
        </p>
      </div>

      {/* Indicadores rápidos */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard icon={Building2} label="Total de obras" value={String(m.total)} tone="primary" />
        <KpiCard icon={Activity} label="Em andamento" value={String(m.emAndamento)} tone="primary" />
        <KpiCard icon={CheckCircle2} label="Concluídas" value={String(m.concluidas)} tone="success" />
        <KpiCard icon={PauseCircle} label="Paralisadas" value={String(m.paralisadas)} tone="danger" />
        <KpiCard icon={AlertTriangle} label="Com pendências" value={String(m.comProblemas)} tone="warning" />
        <KpiCard icon={Wallet} label="Total previsto" value={formatCurrency(m.totalPrevisto)} tone="primary" />
        <KpiCard icon={Wallet} label="Total gasto" value={formatCurrency(m.totalGasto)} tone="warning" />
        <KpiCard
          icon={TrendingUp}
          label="Execução média"
          value={`${m.execMedia}%`}
          tone="success"
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Status das obras */}
        <ChartCard title="Status das obras" subtitle="Distribuição por situação atual">
          {statusData.length === 0 ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={statusData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={95}
                  label={(e: { name: string; value: number; percent?: number }) =>
                    `${e.value} (${Math.round((e.percent ?? 0) * 100)}%)`
                  }
                >
                  {statusData.map((d, i) => (
                    <Cell key={i} fill={d.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => [`${v} obra(s)`, "Quantidade"]} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Financeiro geral */}
        <ChartCard title="Financeiro geral" subtitle="Previsto x Gasto (todas as obras)">
          <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <MiniStat label="Previsto" value={formatCurrency(m.totalPrevisto)} tone="muted" />
            <MiniStat label="Gasto" value={formatCurrency(m.totalGasto)} tone="warning" />
            <MiniStat label="Diferença" value={formatCurrency(m.diferenca)} tone="success" />
            <MiniStat label="Execução" value={`${m.execFinanceira}%`} tone="primary" />
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={financeiroData}>
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={(v: number) => `${(v / 1_000_000).toFixed(0)}M`} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                <Cell fill="var(--chart-4)" />
                <Cell fill="var(--chart-3)" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Gastos por setor */}
        <ChartCard
          title="Distribuição dos gastos por setor"
          subtitle="Percentual considerando todas as obras"
        >
          {setorData.length === 0 ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={setorData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={95}
                  label={(e: { percent?: number }) => `${Math.round((e.percent ?? 0) * 100)}%`}
                >
                  {setorData.map((_, i) => (
                    <Cell key={i} fill={SETOR_COLORS[i % SETOR_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v: number, n: string) => [
                    `${formatCurrency(v)} (${setorTotal ? Math.round((v / setorTotal) * 100) : 0}%)`,
                    n,
                  ]}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Lista resumida por setor */}
        <ChartCard title="Resumo por setor" subtitle="Valor total alocado em cada setor">
          {setorData.length === 0 ? (
            <EmptyChart />
          ) : (
            <ul className="divide-y divide-border">
              {(setores ?? []).map((s, i) => (
                <li key={s.categoria} className="flex items-center justify-between py-2.5 text-sm">
                  <span className="flex items-center gap-2 text-foreground">
                    <span
                      className="inline-block h-3 w-3 rounded-sm"
                      style={{ background: SETOR_COLORS[i % SETOR_COLORS.length] }}
                    />
                    {s.categoria}
                  </span>
                  <span className="font-semibold tabular-nums text-foreground">
                    {formatCurrency(s.valor)}
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      {setorTotal ? Math.round((s.valor / setorTotal) * 100) : 0}%
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </ChartCard>
      </div>
    </div>
  );
}

function computeMetrics(obras: Obra[]) {
  const total = obras.length;
  const counts = new Map<ObraStatus, number>();
  let totalPrevisto = 0;
  let totalGasto = 0;
  let somaExec = 0;
  for (const o of obras) {
    counts.set(o.status, (counts.get(o.status) ?? 0) + 1);
    totalPrevisto += Number(o.valor_previsto ?? 0);
    totalGasto += Number(o.valor_executado ?? 0);
    somaExec += Number(o.percentual_concluido ?? 0);
  }
  const statusEntries = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  const diferenca = totalPrevisto - totalGasto;
  return {
    total,
    statusEntries,
    emAndamento: counts.get("em_andamento") ?? 0,
    concluidas: counts.get("concluida") ?? 0,
    paralisadas: counts.get("paralisada") ?? 0,
    comProblemas: (counts.get("atrasada") ?? 0) + (counts.get("cancelada") ?? 0),
    totalPrevisto,
    totalGasto,
    diferenca,
    execMedia: total ? Math.round(somaExec / total) : 0,
    execFinanceira: totalPrevisto ? Math.round((totalGasto / totalPrevisto) * 100) : 0,
  };
}

const TONES = {
  primary: "text-primary",
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
  muted: "text-muted-foreground",
} as const;

function KpiCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Building2;
  label: string;
  value: string;
  tone: keyof typeof TONES;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-soft)]">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <Icon className={`h-4 w-4 ${TONES[tone]}`} />
      </div>
      <p className={`mt-1 text-xl font-bold tabular-nums ${TONES[tone]}`}>{value}</p>
    </div>
  );
}

function MiniStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: keyof typeof TONES;
}) {
  return (
    <div className="rounded-lg border border-border bg-secondary/40 px-3 py-2">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className={`text-sm font-bold tabular-nums ${TONES[tone]}`}>{value}</p>
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-card)] sm:p-5">
      <h2 className="text-base font-semibold tracking-tight text-foreground">{title}</h2>
      <p className="mb-3 text-xs text-muted-foreground">{subtitle}</p>
      {children}
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
      Sem dados disponíveis.
    </div>
  );
}

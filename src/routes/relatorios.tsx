import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { AlertTriangle, CheckCircle2, FileBarChart } from "lucide-react";
import { fetchObras } from "@/lib/queries";
import { AuthRequired } from "@/components/AuthRequired";
import { StatusBadge } from "@/components/StatusBadge";
import {
  formatCurrency,
  STATUS_LABELS,
  type ObraStatus,
} from "@/lib/obra-utils";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/relatorios")({
  head: () => ({ meta: [{ title: "Relatórios — Recife Obras" }] }),
  component: () => (
    <AuthRequired>
      <Relatorios />
    </AuthRequired>
  ),
});

const STATUS_COLOR: Record<ObraStatus, string> = {
  planejamento: "var(--muted-foreground)",
  em_andamento: "var(--chart-1)",
  atrasada: "var(--chart-3)",
  paralisada: "var(--chart-5)",
  concluida: "var(--chart-2)",
};

const ALL = "todos";

function Relatorios() {
  const obrasQ = useQuery({ queryKey: ["obras"], queryFn: fetchObras });
  const obras = obrasQ.data ?? [];

  const [status, setStatus] = useState<string>(ALL);
  const [bairro, setBairro] = useState<string>(ALL);
  const [empreiteira, setEmpreiteira] = useState<string>(ALL);

  const bairros = useMemo(() => Array.from(new Set(obras.map((o) => o.bairro))).sort(), [obras]);
  const empreiteiras = useMemo(
    () => Array.from(new Set(obras.map((o) => o.empreiteira))).sort(),
    [obras],
  );

  const filtered = obras.filter(
    (o) =>
      (status === ALL || o.status === status) &&
      (bairro === ALL || o.bairro === bairro) &&
      (empreiteira === ALL || o.empreiteira === empreiteira),
  );

  const totalPrevisto = filtered.reduce((s, o) => s + o.valor_previsto, 0);
  const totalExecutado = filtered.reduce((s, o) => s + o.valor_executado, 0);

  const statusData = useMemo(() => {
    const counts: Record<string, number> = {};
    filtered.forEach((o) => {
      counts[o.status] = (counts[o.status] ?? 0) + 1;
    });
    return (Object.keys(STATUS_LABELS) as ObraStatus[])
      .map((s) => ({ status: s, name: STATUS_LABELS[s], total: counts[s] ?? 0 }))
      .filter((d) => d.total > 0);
  }, [filtered]);

  const atrasadas = filtered.filter((o) => o.status === "atrasada" || o.status === "paralisada");
  const concluidas = filtered.filter((o) => o.status === "concluida");

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-foreground">
          <FileBarChart className="h-6 w-6 text-primary" /> Relatórios
        </h1>
        <p className="text-sm text-muted-foreground">
          Visualize e filtre os indicadores das obras públicas.
        </p>
      </div>

      {/* Filtros */}
      <div className="mb-6 grid grid-cols-1 gap-4 rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-card)] sm:grid-cols-3">
        <FilterSelect label="Status" value={status} onChange={setStatus} options={
          (Object.keys(STATUS_LABELS) as ObraStatus[]).map((s) => ({ value: s, label: STATUS_LABELS[s] }))
        } />
        <FilterSelect label="Bairro" value={bairro} onChange={setBairro} options={bairros.map((b) => ({ value: b, label: b }))} />
        <FilterSelect label="Empreiteira" value={empreiteira} onChange={setEmpreiteira} options={empreiteiras.map((e) => ({ value: e, label: e }))} />
      </div>

      {/* Totais */}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Total label="Obras" value={String(filtered.length)} />
        <Total label="Investimento previsto" value={formatCurrency(totalPrevisto)} />
        <Total label="Investimento executado" value={formatCurrency(totalExecutado)} />
        <Total
          label="% Executado"
          value={`${totalPrevisto > 0 ? Math.round((totalExecutado / totalPrevisto) * 100) : 0}%`}
        />
      </div>

      <section className="mb-6 rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
        <h2 className="mb-4 text-base font-semibold tracking-tight text-foreground">Obras por status</h2>
        {statusData.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem dados para os filtros selecionados.</p>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={statusData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" fontSize={11} tick={{ fill: "var(--muted-foreground)" }} />
              <YAxis allowDecimals={false} fontSize={11} tick={{ fill: "var(--muted-foreground)" }} />
              <Tooltip />
              <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                {statusData.map((d) => (
                  <Cell key={d.status} fill={STATUS_COLOR[d.status]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ListCard
          title="Obras atrasadas ou paralisadas"
          icon={AlertTriangle}
          tone="warning"
          obras={atrasadas}
        />
        <ListCard title="Obras concluídas" icon={CheckCircle2} tone="success" obras={concluidas} />
      </div>

      <section className="mt-6 rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
        <h2 className="mb-4 text-base font-semibold tracking-tight text-foreground">
          Detalhamento ({filtered.length})
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-2 pr-4">Obra</th>
                <th className="py-2 pr-4">Bairro</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Concluído</th>
                <th className="py-2">Previsto</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => (
                <tr key={o.id} className="border-b border-border/60">
                  <td className="py-2 pr-4">
                    <Link to="/obras/$id" params={{ id: o.id }} className="font-medium text-primary hover:underline">
                      {o.nome}
                    </Link>
                  </td>
                  <td className="py-2 pr-4 text-muted-foreground">{o.bairro}</td>
                  <td className="py-2 pr-4">
                    <StatusBadge status={o.status} />
                  </td>
                  <td className="py-2 pr-4 text-foreground">{o.percentual_concluido}%</td>
                  <td className="py-2 text-foreground">{formatCurrency(o.valor_previsto)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <Label className="mb-1.5 block text-xs">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Todos</SelectItem>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function Total({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-lg font-bold text-foreground">{value}</p>
    </div>
  );
}

function ListCard({
  title,
  icon: Icon,
  tone,
  obras,
}: {
  title: string;
  icon: typeof AlertTriangle;
  tone: "warning" | "success";
  obras: Awaited<ReturnType<typeof fetchObras>>;
}) {
  const toneClass = tone === "warning" ? "text-warning" : "text-success";
  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <h2 className={`mb-4 flex items-center gap-2 text-base font-semibold tracking-tight ${toneClass}`}>
        <Icon className="h-5 w-5" /> {title}
      </h2>
      {obras.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma obra nesta categoria.</p>
      ) : (
        <ul className="space-y-2">
          {obras.map((o) => (
            <li key={o.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
              <Link to="/obras/$id" params={{ id: o.id }} className="text-sm font-medium text-foreground hover:text-primary">
                {o.nome}
              </Link>
              <span className="shrink-0 text-xs text-muted-foreground">{o.percentual_concluido}%</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

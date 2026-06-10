import type { Database } from "@/integrations/supabase/types";

export type Obra = Database["public"]["Tables"]["obras"]["Row"];
export type ObraStatus = Database["public"]["Enums"]["obra_status"];
export type AppRole = Database["public"]["Enums"]["app_role"];

import obra1 from "@/assets/obra1.jpg";
import obra2 from "@/assets/obra2.jpg";
import obra3 from "@/assets/obra3.jpg";
import obra4 from "@/assets/obra4.jpg";
import obra5 from "@/assets/obra5.jpg";
import obra6 from "@/assets/obra6.jpg";
import obra7 from "@/assets/obra7.jpg";
import obra8 from "@/assets/obra8.jpg";

const imageMap: Record<string, string> = {
  obra1, obra2, obra3, obra4, obra5, obra6, obra7, obra8,
};

const PLACEHOLDER =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='400' height='250'><rect width='100%' height='100%' fill='#e2e8f0'/><text x='50%' y='50%' fill='#64748b' font-family='sans-serif' font-size='16' text-anchor='middle' dominant-baseline='middle'>Sem foto</text></svg>`,
  );

/** Resolve a stored photo reference (asset key, full URL, or storage signed url) to a displayable src. */
export function resolveFoto(ref: string | null | undefined): string {
  if (!ref) return PLACEHOLDER;
  if (imageMap[ref]) return imageMap[ref];
  if (ref.startsWith("http") || ref.startsWith("data:") || ref.startsWith("/")) return ref;
  return PLACEHOLDER;
}

export const ROLE_LABELS: Record<AppRole, string> = {
  admin: "Administrador Master",
  prefeitura: "Prefeitura",
  fiscal: "Fiscal de Obra",
  gestor: "Gestor/Responsável da Obra",
  agente: "Agente da Prefeitura",
};

export const STATUS_LABELS: Record<ObraStatus, string> = {
  planejamento: "Planejada",
  licitacao: "Licitação",
  em_andamento: "Em andamento",
  atrasada: "Atrasada",
  paralisada: "Paralisada",
  concluida: "Concluída",
  cancelada: "Cancelada",
};

export const STATUS_CLASSES: Record<ObraStatus, string> = {
  planejamento: "bg-secondary text-secondary-foreground",
  licitacao: "bg-primary/5 text-primary border border-primary/20",
  em_andamento: "bg-primary/10 text-primary border border-primary/20",
  atrasada: "bg-warning/15 text-warning border border-warning/30",
  paralisada: "bg-danger/10 text-danger border border-danger/30",
  concluida: "bg-success/15 text-success border border-success/30",
  cancelada: "bg-muted text-muted-foreground border border-border",
};

export const STATUS_DOT: Record<ObraStatus, string> = {
  planejamento: "bg-muted-foreground",
  licitacao: "bg-primary/60",
  em_andamento: "bg-primary",
  atrasada: "bg-warning",
  paralisada: "bg-danger",
  concluida: "bg-success",
  cancelada: "bg-muted-foreground",
};

export function formatCurrency(value: number | null | undefined): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value ?? 0);
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function daysBetween(a: string | null, b: string | null): number {
  if (!a || !b) return 0;
  const da = new Date(a).getTime();
  const db = new Date(b).getTime();
  return Math.round((db - da) / (1000 * 60 * 60 * 24));
}

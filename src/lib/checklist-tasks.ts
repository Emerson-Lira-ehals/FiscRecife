import * as XLSX from "xlsx";

/**
 * Fluxo de validação:
 * - "pending"     : não iniciada
 * - "responsavel" : marcada pelo Responsável da Obra (AMARELO) → entra no "Previsto"
 * - "validated"   : validada pelo Fiscal (VERDE) → entra no "Válido" (e também no "Previsto")
 */
export type TaskStatus = "pending" | "responsavel" | "validated";

export interface Progress {
  total: number;
  /** Folhas validadas pelo fiscal (verde). */
  validado: number;
  /** Folhas marcadas só pelo responsável (amarelo). */
  responsavel: number;
  /** Validado + responsável (amarelo + verde). */
  previsto: number;
  /** % oficial: somente validadas pelo fiscal. */
  validadoPct: number;
  /** % previsto: validadas + marcadas pelo responsável. */
  previstoPct: number;
  /** % marcada pelo responsável (sem validação). */
  responsavelPct: number;
}

export interface Task {
  id: string;
  idt: string; // hierarquia, ex: "1.1.2"
  name: string;
  parentId: string | null;
  level: number;
  isLeaf: boolean;
  status: TaskStatus;
  responsible?: string;
  notes?: string;
  updatedAt?: string;
  updatedBy?: string;
}

/** Compara IDTs numéricos hierárquicos: "1.2" < "1.10" */
export function compareIdt(a: string, b: string): number {
  const pa = a.split(".").map((n) => parseInt(n, 10) || 0);
  const pb = b.split(".").map((n) => parseInt(n, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const da = pa[i] ?? 0;
    const db = pb[i] ?? 0;
    if (da !== db) return da - db;
  }
  return 0;
}

function parentIdtOf(idt: string): string | null {
  const parts = idt.split(".");
  if (parts.length <= 1) return null;
  return parts.slice(0, -1).join(".");
}

/**
 * Constrói a hierarquia a partir de linhas {idt, name}.
 * - ordena por IDT
 * - define level (nível) e parentId
 * - marca isLeaf = false apenas em nós que possuem filhos
 */
export function buildHierarchy(
  rows: Array<{ idt: string; name: string; status?: TaskStatus; responsible?: string; notes?: string }>,
): Task[] {
  const clean = rows
    .filter((r) => r.idt && r.name)
    .map((r) => ({ ...r, idt: String(r.idt).trim(), name: String(r.name).trim() }));

  clean.sort((a, b) => compareIdt(a.idt, b.idt));

  const idtSet = new Set(clean.map((r) => r.idt));
  // um nó é folha se nenhum outro idt o tem como prefixo direto
  const hasChild = new Set<string>();
  for (const r of clean) {
    const p = parentIdtOf(r.idt);
    if (p && idtSet.has(p)) hasChild.add(p);
  }

  return clean.map((r) => {
    const parentIdt = parentIdtOf(r.idt);
    return {
      id: r.idt,
      idt: r.idt,
      name: r.name,
      parentId: parentIdt && idtSet.has(parentIdt) ? parentIdt : null,
      level: r.idt.split(".").length - 1,
      isLeaf: !hasChild.has(r.idt),
      status: r.status ?? "pending",
      responsible: r.responsible,
      notes: r.notes,
    };
  });
}

function computeProgress(leaves: Task[]): Progress {
  const total = leaves.length;
  const validado = leaves.filter((t) => t.status === "validated").length;
  const responsavel = leaves.filter((t) => t.status === "responsavel").length;
  const previsto = validado + responsavel;
  const pct = (n: number) => (total === 0 ? 0 : Math.round((n / total) * 100));
  return {
    total,
    validado,
    responsavel,
    previsto,
    validadoPct: pct(validado),
    previstoPct: pct(previsto),
    responsavelPct: pct(responsavel),
  };
}

/** Percentual da macro: amarelo = responsável, verde = validado pelo fiscal. */
export function macroProgress(tasks: Task[], macroIdt: string): Progress {
  const leaves = tasks.filter(
    (t) => t.isLeaf && (t.idt === macroIdt || t.idt.startsWith(macroIdt + ".")),
  );
  return computeProgress(leaves);
}

/** Avanço físico global (todas as folhas). */
export function globalProgress(tasks: Task[]): Progress {
  return computeProgress(tasks.filter((t) => t.isLeaf));
}

const IDT_KEYS = ["idt", "edt", "wbs", "outline number", "outlinenumber", "número de tópico", "estrutura"];
const NAME_KEYS = ["nome", "tarefa", "name", "atividade", "descrição", "descricao", "task name"];

function pickKey(headers: string[], candidates: string[]): string | null {
  const lower = headers.map((h) => h.toLowerCase().trim());
  for (const c of candidates) {
    const idx = lower.indexOf(c);
    if (idx >= 0) return headers[idx];
  }
  // match parcial
  for (let i = 0; i < lower.length; i++) {
    if (candidates.some((c) => lower[i].includes(c))) return headers[i];
  }
  return null;
}

/** Lê um arquivo .xlsx/.xls/.csv e devolve linhas {idt, name}. Lança erro amigável se inválido. */
export async function parseSpreadsheet(file: File): Promise<Array<{ idt: string; name: string }>> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) throw new Error("Planilha vazia ou ilegível.");
  const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
  if (json.length === 0) throw new Error("Nenhuma linha encontrada na planilha.");

  const headers = Object.keys(json[0]);
  const idtKey = pickKey(headers, IDT_KEYS);
  const nameKey = pickKey(headers, NAME_KEYS);

  if (!idtKey || !nameKey) {
    throw new Error(
      "Não encontramos colunas de IDT e Nome. Use cabeçalhos como 'IDT', 'EDT' ou 'WBS' e 'Nome' / 'Tarefa'.",
    );
  }

  const rows = json
    .map((r) => ({ idt: String(r[idtKey] ?? "").trim(), name: String(r[nameKey] ?? "").trim() }))
    .filter((r) => r.idt && r.name);

  if (rows.length === 0) throw new Error("Nenhuma atividade válida foi encontrada na planilha.");
  return rows;
}

const today = () => new Date().toISOString().slice(0, 10);

/** Dados de exemplo para demonstração. */
export const SAMPLE_TASKS: Task[] = buildHierarchy([
  { idt: "1", name: "Serviços Preliminares" },
  { idt: "1.1", name: "Mobilização", status: "validated", responsible: "Construtora Alfa", notes: "Concluída e validada." },
  { idt: "1.2", name: "Instalações provisórias", status: "fiscal", responsible: "Construtora Alfa" },
  { idt: "1.3", name: "Tapumes", status: "pending" },
  { idt: "2", name: "Fundação" },
  { idt: "2.1", name: "Escavação", status: "validated", responsible: "Equipe de Campo" },
  { idt: "2.2", name: "Lastro", status: "fiscal", responsible: "Equipe de Campo" },
  { idt: "2.3", name: "Sapatas", status: "pending" },
  { idt: "2.4", name: "Blocos", status: "pending" },
  { idt: "3", name: "Estrutura" },
  { idt: "3.1", name: "Fôrmas", status: "fiscal" },
  { idt: "3.2", name: "Armadura", status: "pending" },
  { idt: "3.3", name: "Pilares", status: "pending" },
  { idt: "3.4", name: "Lajes", status: "pending" },
  { idt: "4", name: "Alvenaria e Vedações" },
  { idt: "4.1", name: "Marcação", status: "pending" },
  { idt: "4.2", name: "Paredes", status: "pending" },
]).map((t) =>
  t.status === "fiscal" || t.status === "validated"
    ? { ...t, updatedAt: today(), updatedBy: t.status === "fiscal" ? "Fiscal" : "Responsável" }
    : t,
);

/** Regra de toggle por perfil. */
export function nextStatus(current: TaskStatus, profile: "fiscal" | "responsavel"): TaskStatus {
  if (profile === "fiscal") {
    if (current === "pending") return "fiscal";
    if (current === "fiscal") return "pending";
    return "fiscal"; // validated -> fiscal
  }
  // responsável
  if (current === "pending") return "validated";
  if (current === "fiscal") return "validated";
  return "pending"; // validated -> pending
}

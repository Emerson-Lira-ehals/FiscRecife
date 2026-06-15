import * as XLSX from "xlsx";

/** Atividade pronta para inserir em obra_atividades. */
export interface NovaAtividade {
  macroetapa: string;
  nome: string;
  ordem: number;
  peso: number;
  duracao_dias: number | null;
  data_planejada_inicio: string | null;
  data_planejada_fim: string | null;
  status: "nao_iniciada";
}

export interface MacroPreview {
  nome: string;
  idt: string;
  micros: NovaAtividade[];
}

export interface ImportResult {
  macros: MacroPreview[];
  flat: NovaAtividade[];
  totalMicros: number;
  totalMacros: number;
}

interface RawRow {
  idt: string;
  nome: string;
  inicio: string | null;
  fim: string | null;
  duracao: number | null;
  summary?: boolean | null;
}

export class ImportError extends Error {}

const norm = (s: unknown) =>
  String(s ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

/** Converte vários formatos de data para YYYY-MM-DD. */
function toISODate(v: unknown): string | null {
  if (v == null || v === "") return null;
  if (v instanceof Date && !Number.isNaN(v.getTime())) {
    return v.toISOString().slice(0, 10);
  }
  const s = String(v).trim();
  // dd/mm/yyyy
  const br = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (br) {
    const [, d, m, y] = br;
    const year = y.length === 2 ? `20${y}` : y;
    return `${year}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  // ISO / yyyy-mm-dd / datetime
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const parsed = new Date(s);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  return null;
}

/** Localiza a coluna cujo cabeçalho corresponde a um dos aliases. */
function findCol(headers: string[], aliases: string[]): number {
  for (let i = 0; i < headers.length; i++) {
    const h = norm(headers[i]);
    if (aliases.some((a) => h === a || h.includes(a))) return i;
  }
  return -1;
}

function parseXlsx(buf: ArrayBuffer): RawRow[] {
  const wb = XLSX.read(buf, { type: "array", cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  if (!ws) throw new ImportError("A planilha está vazia.");
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, blankrows: false });
  if (rows.length < 2) throw new ImportError("A planilha não contém dados suficientes.");

  // Encontra a linha de cabeçalho (que contém IDT e Nome/Tarefa)
  let headerIdx = -1;
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const r = (rows[i] || []).map((c) => norm(c));
    if (r.some((c) => c === "idt" || c.includes("idt")) && r.some((c) => c.includes("nome") || c.includes("tarefa"))) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx < 0) {
    throw new ImportError('Cabeçalho não encontrado. A planilha precisa ter as colunas "IDT" e "Nome da Tarefa".');
  }

  const headers = (rows[headerIdx] as unknown[]).map((c) => String(c ?? ""));
  const cIdt = findCol(headers, ["idt", "id", "wbs", "edt"]);
  const cNome = findCol(headers, ["nome da tarefa", "nome", "tarefa", "atividade"]);
  const cIni = findCol(headers, ["inicio", "início", "start"]);
  const cFim = findCol(headers, ["termino", "término", "fim", "finish", "conclusao"]);
  const cDur = findCol(headers, ["duracao", "duração", "duration"]);

  if (cIdt < 0 || cNome < 0) {
    throw new ImportError('Colunas "IDT" e "Nome da Tarefa" são obrigatórias.');
  }

  const out: RawRow[] = [];
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const r = rows[i] as unknown[];
    if (!r) continue;
    const idt = String(r[cIdt] ?? "").trim();
    const nome = String(r[cNome] ?? "").trim().replace(/^\s+/, "");
    if (!idt || !nome) continue;
    const dur = cDur >= 0 ? Number(String(r[cDur] ?? "").replace(/[^\d.]/g, "")) : NaN;
    out.push({
      idt,
      nome,
      inicio: cIni >= 0 ? toISODate(r[cIni]) : null,
      fim: cFim >= 0 ? toISODate(r[cFim]) : null,
      duracao: Number.isFinite(dur) && dur > 0 ? dur : null,
    });
  }
  if (out.length === 0) throw new ImportError("Nenhuma tarefa válida encontrada na planilha.");
  return out;
}

function parseMsProjectXml(text: string): RawRow[] {
  const doc = new DOMParser().parseFromString(text, "application/xml");
  if (doc.querySelector("parsererror")) throw new ImportError("Arquivo XML inválido.");
  const tasks = Array.from(doc.getElementsByTagName("Task"));
  if (tasks.length === 0) throw new ImportError("Nenhuma tarefa encontrada no arquivo do MS Project.");
  const get = (t: Element, tag: string) => t.getElementsByTagName(tag)[0]?.textContent?.trim() ?? "";

  const out: RawRow[] = [];
  for (const t of tasks) {
    const nome = get(t, "Name");
    const idt = get(t, "OutlineNumber") || get(t, "WBS");
    if (!nome || !idt) continue;
    const summary = get(t, "Summary") === "1";
    out.push({
      idt,
      nome,
      inicio: toISODate(get(t, "Start")),
      fim: toISODate(get(t, "Finish")),
      duracao: null,
      summary,
    });
  }
  if (out.length === 0) throw new ImportError("Nenhuma tarefa válida encontrada no arquivo.");
  return out;
}

/** Ordena IDTs hierárquicos numericamente (1, 1.2, 1.10, 2 ...). */
function compareIdt(a: string, b: string): number {
  const pa = a.split(".").map((n) => parseInt(n, 10) || 0);
  const pb = b.split(".").map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}

/** Interpreta a hierarquia do IDT: folhas = micro etapas (marcáveis); nós com filhos = macro etapas. */
function buildResult(rows: RawRow[]): ImportResult {
  const byIdt = new Map<string, RawRow>();
  rows.forEach((r) => byIdt.set(r.idt, r));

  const isLeaf = (r: RawRow): boolean => {
    if (r.summary === true) return false;
    if (r.summary === false) return true;
    // Sem flag explícita: é folha se ninguém tem IDT começando com "idt."
    const prefix = r.idt + ".";
    return !rows.some((o) => o !== r && o.idt.startsWith(prefix));
  };

  const macroName = (idt: string): string => {
    const top = idt.split(".")[0];
    return byIdt.get(top)?.nome ?? "Geral";
  };

  const leaves = rows.filter(isLeaf).sort((a, b) => compareIdt(a.idt, b.idt));
  if (leaves.length === 0) {
    throw new ImportError("Não foi possível identificar micro etapas (tarefas folha) no planejamento.");
  }
  const peso = 100 / leaves.length;

  const macroMap = new Map<string, MacroPreview>();
  const flat: NovaAtividade[] = [];

  leaves.forEach((leaf, idx) => {
    const macro = macroName(leaf.idt);
    const atividade: NovaAtividade = {
      macroetapa: macro,
      nome: leaf.nome,
      ordem: idx + 1,
      peso,
      duracao_dias: leaf.duracao,
      data_planejada_inicio: leaf.inicio,
      data_planejada_fim: leaf.fim,
      status: "nao_iniciada",
    };
    flat.push(atividade);
    const topIdt = leaf.idt.split(".")[0];
    if (!macroMap.has(macro)) macroMap.set(macro, { nome: macro, idt: topIdt, micros: [] });
    macroMap.get(macro)!.micros.push(atividade);
  });

  const macros = Array.from(macroMap.values()).sort((a, b) => compareIdt(a.idt, b.idt));
  return { macros, flat, totalMicros: leaves.length, totalMacros: macros.length };
}

/** Lê um arquivo de planejamento (.xlsx ou XML do MS Project) e devolve a estrutura de checklist. */
export async function parseCronograma(file: File): Promise<ImportResult> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".mpp")) {
    throw new ImportError(
      "Arquivos .mpp (binário do Microsoft Project) não podem ser lidos diretamente. Abra no Project e use “Salvar como → XML (*.xml)”, ou exporte para Excel (.xlsx).",
    );
  }
  if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
    const buf = await file.arrayBuffer();
    return buildResult(parseXlsx(buf));
  }
  if (name.endsWith(".xml")) {
    const text = await file.text();
    return buildResult(parseMsProjectXml(text));
  }
  throw new ImportError("Formato não suportado. Envie um arquivo .xlsx ou XML do MS Project.");
}

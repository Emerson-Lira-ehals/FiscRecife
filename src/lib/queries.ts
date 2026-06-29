import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Obra = Database["public"]["Tables"]["obras"]["Row"];
export type ObraFoto = Database["public"]["Tables"]["obra_fotos"]["Row"];
export type Comunicado = Database["public"]["Tables"]["comunicados"]["Row"];
export type Comentario = Database["public"]["Tables"]["comentarios"]["Row"];
export type ObraProgresso = Database["public"]["Tables"]["obra_progresso"]["Row"];
export type ObraFinanceiro = Database["public"]["Tables"]["obra_financeiro"]["Row"];
export type ObraOrcamento = Database["public"]["Tables"]["obra_orcamento"]["Row"];
export type ObraEtapa = Database["public"]["Tables"]["obra_etapas"]["Row"];
export type Auditoria = Database["public"]["Tables"]["auditoria"]["Row"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type ObraAtividade = Database["public"]["Tables"]["obra_atividades"]["Row"];
export type AtividadeStatus = Database["public"]["Enums"]["atividade_status"];

function check<T>(data: T | null, error: { message: string } | null): T {
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as T;
}

export async function fetchObras(): Promise<Obra[]> {
  const { data, error } = await supabase.from("obras").select("*").order("nome");
  return check<Obra[]>(data, error);
}

export async function fetchObra(id: string): Promise<Obra | null> {
  const { data, error } = await supabase.from("obras").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function fetchFotos(obraId: string): Promise<ObraFoto[]> {
  const { data, error } = await supabase
    .from("obra_fotos")
    .select("*")
    .eq("obra_id", obraId)
    .order("data_upload", { ascending: false });
  return check<ObraFoto[]>(data, error);
}

export async function fetchComunicados(obraId: string): Promise<Comunicado[]> {
  const { data, error } = await supabase
    .from("comunicados")
    .select("*")
    .eq("obra_id", obraId)
    .order("data_publicacao", { ascending: false });
  return check<Comunicado[]>(data, error);
}

export async function fetchComentarios(obraId: string): Promise<Comentario[]> {
  const { data, error } = await supabase
    .from("comentarios")
    .select("*")
    .eq("obra_id", obraId)
    .order("data_comentario", { ascending: false });
  return check<Comentario[]>(data, error);
}

export async function fetchProgresso(obraId: string): Promise<ObraProgresso[]> {
  const { data, error } = await supabase
    .from("obra_progresso")
    .select("*")
    .eq("obra_id", obraId)
    .order("data");
  return check<ObraProgresso[]>(data, error);
}

export async function fetchFinanceiro(obraId: string): Promise<ObraFinanceiro[]> {
  const { data, error } = await supabase
    .from("obra_financeiro")
    .select("*")
    .eq("obra_id", obraId)
    .order("ordem");
  return check<ObraFinanceiro[]>(data, error);
}

export async function fetchOrcamento(obraId: string): Promise<ObraOrcamento[]> {
  const { data, error } = await supabase
    .from("obra_orcamento")
    .select("*")
    .eq("obra_id", obraId);
  return check<ObraOrcamento[]>(data, error);
}

export async function fetchEtapas(obraId: string): Promise<ObraEtapa[]> {
  const { data, error } = await supabase
    .from("obra_etapas")
    .select("*")
    .eq("obra_id", obraId)
    .order("ordem");
  return check<ObraEtapa[]>(data, error);
}

export async function fetchAuditoria(obraId: string): Promise<Auditoria[]> {
  const { data, error } = await supabase
    .from("auditoria")
    .select("*")
    .eq("obra_id", obraId)
    .order("data_hora", { ascending: false })
    .limit(50);
  return check<Auditoria[]>(data, error);
}

export async function fetchProfilesByIds(ids: string[]): Promise<Record<string, Profile>> {
  if (ids.length === 0) return {};
  const { data, error } = await supabase.from("profiles").select("*").in("id", ids);
  if (error) throw new Error(error.message);
  const map: Record<string, Profile> = {};
  (data ?? []).forEach((p) => {
    map[p.id] = p;
  });
  return map;
}

export async function fetchChecklists() {
  const { data, error } = await supabase
    .from("checklist_fiscal")
    .select("*")
    .order("data_inspecao", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function logAuditoria(
  obraId: string | null,
  acao: string,
  entidade: string,
  usuarioId: string | null,
  usuarioNome: string,
) {
  await supabase.from("auditoria").insert({
    obra_id: obraId,
    acao,
    entidade,
    usuario_id: usuarioId,
    usuario_nome: usuarioNome,
  });
}

export type AppRole = Database["public"]["Enums"]["app_role"];

export interface UsuarioRow {
  id: string;
  nome: string;
  email: string;
  ativo: boolean;
  criado_em: string;
  role: AppRole | null;
}

export async function fetchUsuarios(): Promise<UsuarioRow[]> {
  const [{ data: profiles, error: e1 }, { data: roles, error: e2 }] = await Promise.all([
    supabase.from("profiles").select("id, nome, email, ativo, criado_em").order("criado_em"),
    supabase.from("user_roles").select("user_id, role"),
  ]);
  if (e1) throw new Error(e1.message);
  if (e2) throw new Error(e2.message);
  const roleMap: Record<string, AppRole> = {};
  (roles ?? []).forEach((r) => {
    roleMap[r.user_id] = r.role as AppRole;
  });
  return (profiles ?? []).map((p) => ({
    id: p.id,
    nome: p.nome,
    email: p.email,
    ativo: (p as { ativo?: boolean }).ativo ?? true,
    criado_em: p.criado_em,
    role: roleMap[p.id] ?? null,
  }));
}

export async function setUsuarioAtivo(userId: string, ativo: boolean) {
  const { error } = await supabase.from("profiles").update({ ativo }).eq("id", userId);
  if (error) throw new Error(error.message);
}

export async function setUsuarioRole(userId: string, role: AppRole) {
  await supabase.from("user_roles").delete().eq("user_id", userId);
  const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
  if (error) throw new Error(error.message);
}

// ---- Cronograma de atividades / avanço físico automático ----

export async function fetchAtividades(obraId: string): Promise<ObraAtividade[]> {
  const { data, error } = await supabase
    .from("obra_atividades")
    .select("*")
    .eq("obra_id", obraId)
    .order("ordem");
  return check<ObraAtividade[]>(data, error);
}

/** Faz upload de uma evidência para o bucket privado e devolve o caminho armazenado. */
export async function uploadEvidencia(obraId: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop() || "bin";
  const path = `${obraId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("fiscalizacao").upload(path, file, {
    upsert: false,
  });
  if (error) throw new Error(error.message);
  return path;
}

/** Gera uma URL assinada temporária para visualizar uma evidência privada. */
export async function signedEvidenciaUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from("fiscalizacao")
    .createSignedUrl(path, 3600);
  if (error) return null;
  return data?.signedUrl ?? null;
}

export interface CriarAtividadeVinculadaInput {
  obraId: string;
  macroetapa: string;
  nome: string;
  usuarioId: string | null;
  usuarioNome: string;
}

/**
 * Cria uma atividade no cronograma (obra_atividades) vinculada a um item da
 * checklist fiscal, permitindo anexar evidências pela mesma base de dados da
 * etapa inicial. Peso 0 para não interferir no avanço físico automático.
 */
export async function criarAtividadeVinculada(
  input: CriarAtividadeVinculadaInput,
): Promise<ObraAtividade> {
  const { data: last } = await supabase
    .from("obra_atividades")
    .select("ordem")
    .eq("obra_id", input.obraId)
    .order("ordem", { ascending: false })
    .limit(1);
  const nextOrdem = (last?.[0]?.ordem ?? 0) + 1;

  const { data, error } = await supabase
    .from("obra_atividades")
    .insert({
      obra_id: input.obraId,
      macroetapa: input.macroetapa || "Checklist",
      nome: input.nome.trim(),
      ordem: nextOrdem,
      peso: 0,
      status: "nao_iniciada",
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);

  await logAuditoria(
    input.obraId,
    "Vinculou atividade da checklist ao cronograma",
    "obra_atividades",
    input.usuarioId,
    input.usuarioNome,
  );
  return data as ObraAtividade;
}

export interface EnviarAtividadeInput {
  atividadeId: string;
  obraId: string;
  comentario: string;
  fotoPath: string;
  docPath?: string | null;
  gps?: string | null;
  usuarioId: string;
  usuarioNome: string;
}

/** Gestor envia a atividade para validação (evidência: foto + comentário obrigatórios). */
export async function enviarAtividadeParaValidacao(input: EnviarAtividadeInput) {
  const { error } = await supabase
    .from("obra_atividades")
    .update({
      status: "aguardando_validacao",
      evidencia_comentario: input.comentario.trim(),
      evidencia_foto: input.fotoPath,
      evidencia_doc: input.docPath ?? null,
      evidencia_gps: input.gps ?? null,
      enviado_por: input.usuarioId,
      enviado_em: new Date().toISOString(),
      data_real_inicio: new Date().toISOString().slice(0, 10),
      justificativa: null,
    })
    .eq("id", input.atividadeId);
  if (error) throw new Error(error.message);
  await logAuditoria(
    input.obraId,
    "Enviou atividade para validação",
    "obra_atividades",
    input.usuarioId,
    input.usuarioNome,
  );
}

export interface ValidarAtividadeInput {
  atividadeId: string;
  obraId: string;
  aprovar: boolean;
  justificativa?: string;
  usuarioId: string;
  usuarioNome: string;
}

/** Fiscal aprova ou reprova a atividade. Reprovação exige justificativa. */
export async function validarAtividade(input: ValidarAtividadeInput) {
  const aprovado = input.aprovar;
  const { error } = await supabase
    .from("obra_atividades")
    .update({
      status: aprovado ? "concluida" : "rejeitada",
      validado_por: input.usuarioId,
      validado_em: new Date().toISOString(),
      justificativa: aprovado ? null : (input.justificativa ?? "").trim(),
      data_real_fim: aprovado ? new Date().toISOString().slice(0, 10) : null,
    })
    .eq("id", input.atividadeId);
  if (error) throw new Error(error.message);
  await logAuditoria(
    input.obraId,
    aprovado ? "Aprovou atividade" : "Reprovou atividade",
    "obra_atividades",
    input.usuarioId,
    input.usuarioNome,
  );
}

// ---- Importação de cronograma (.xlsx / XML MS Project) ----

import type { NovaAtividade } from "@/lib/cronograma-import";

export interface ImportarCronogramaInput {
  obraId: string;
  atividades: NovaAtividade[];
  substituir: boolean;
  usuarioId: string;
  usuarioNome: string;
}

/**
 * Persiste o checklist gerado a partir do planejamento importado.
 * Se `substituir` for verdadeiro, remove o cronograma atual da obra antes de inserir.
 */
export async function importarCronograma(input: ImportarCronogramaInput) {
  if (input.atividades.length === 0) throw new Error("Nenhuma atividade para importar.");

  if (input.substituir) {
    const { error: delErr } = await supabase
      .from("obra_atividades")
      .delete()
      .eq("obra_id", input.obraId);
    if (delErr) throw new Error(delErr.message);
  }

  const rows = input.atividades.map((a) => ({
    obra_id: input.obraId,
    macroetapa: a.macroetapa,
    nome: a.nome,
    ordem: a.ordem,
    peso: a.peso,
    duracao_dias: a.duracao_dias,
    data_planejada_inicio: a.data_planejada_inicio,
    data_planejada_fim: a.data_planejada_fim,
    status: a.status,
  }));

  const { error } = await supabase.from("obra_atividades").insert(rows);
  if (error) throw new Error(error.message);

  await logAuditoria(
    input.obraId,
    `Importou cronograma (${rows.length} micro etapas)`,
    "obra_atividades",
    input.usuarioId,
    input.usuarioNome,
  );
}



// ---- Dashboard Geral: orçamento consolidado de todas as obras ----

export interface SetorTotal {
  categoria: string;
  valor: number;
}

/** Soma os valores de orçamento agrupados por setor/categoria considerando TODAS as obras. */
export async function fetchOrcamentoTodos(): Promise<SetorTotal[]> {
  const { data, error } = await supabase.from("obra_orcamento").select("categoria, valor");
  if (error) throw new Error(error.message);
  const map = new Map<string, number>();
  (data ?? []).forEach((r) => {
    const cat = (r.categoria ?? "Outros") as string;
    map.set(cat, (map.get(cat) ?? 0) + Number(r.valor ?? 0));
  });
  return Array.from(map.entries())
    .map(([categoria, valor]) => ({ categoria, valor }))
    .sort((a, b) => b.valor - a.valor);
}

// ---- Cadastro de nova obra (perfil Prefeitura) ----

export interface NovaObraInput {
  nome: string;
  endereco: string;
  bairro: string;
  cep: string;
  municipio: string;
  estado: string;
  empreiteira: string;
  orgao_responsavel: string;
  descricao: string;
  status: Database["public"]["Enums"]["obra_status"];
  valor_previsto: number;
  valor_executado: number;
  data_inicio: string | null;
  data_prevista: string | null;
}

/** Faz upload de uma foto de obra para o bucket privado e devolve o caminho armazenado. */
export async function uploadObraFoto(file: File): Promise<string> {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("obras-fotos").upload(path, file, {
    upsert: false,
    contentType: file.type || undefined,
  });
  if (error) throw new Error(error.message);
  return path;
}

/** Gera uma URL assinada de longa duração para exibir uma foto privada de obra. */
export async function signedObraFotoUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from("obras-fotos")
    .createSignedUrl(path, 60 * 60 * 24 * 7);
  if (error) return null;
  return data?.signedUrl ?? null;
}

/** Cria a obra, registra fotos adicionais e devolve a obra criada. */
export async function createObra(
  input: NovaObraInput,
  fotoPaths: string[],
  usuario: { id: string | null; nome: string },
): Promise<Obra> {
  const principal = fotoPaths[0] ?? null;
  const { data, error } = await supabase
    .from("obras")
    .insert({
      nome: input.nome.trim(),
      endereco: input.endereco.trim(),
      bairro: input.bairro.trim(),
      cep: input.cep.trim(),
      municipio: input.municipio.trim(),
      estado: input.estado.trim(),
      empreiteira: input.empreiteira.trim(),
      orgao_responsavel: input.orgao_responsavel.trim(),
      descricao: input.descricao.trim(),
      status: input.status,
      valor_previsto: input.valor_previsto,
      valor_executado: input.valor_executado,
      data_inicio: input.data_inicio,
      data_prevista: input.data_prevista,
      foto_principal: principal,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  const obra = data as Obra;

  const extras = fotoPaths.slice(1);
  if (extras.length > 0) {
    const rows = extras.map((url, i) => ({
      obra_id: obra.id,
      url,
      legenda: `${input.nome.trim()} — foto ${i + 2}`,
    }));
    await supabase.from("obra_fotos").insert(rows);
  }

  await logAuditoria(obra.id, "Cadastrou nova obra", "obras", usuario.id, usuario.nome);
  return obra;
}

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

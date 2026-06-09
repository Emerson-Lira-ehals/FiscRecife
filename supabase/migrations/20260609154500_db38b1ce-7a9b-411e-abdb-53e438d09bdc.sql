-- Grant Data API access to all public tables (missing from initial migration)

-- Publicly readable tables (transparency catalog): anon + authenticated read; authenticated writes are gated by RLS
GRANT SELECT ON public.obras TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.obras TO authenticated;
GRANT ALL ON public.obras TO service_role;

GRANT SELECT ON public.obra_fotos TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.obra_fotos TO authenticated;
GRANT ALL ON public.obra_fotos TO service_role;

GRANT SELECT ON public.comunicados TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.comunicados TO authenticated;
GRANT ALL ON public.comunicados TO service_role;

GRANT SELECT ON public.comentarios TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.comentarios TO authenticated;
GRANT ALL ON public.comentarios TO service_role;

GRANT SELECT ON public.obra_progresso TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.obra_progresso TO authenticated;
GRANT ALL ON public.obra_progresso TO service_role;

GRANT SELECT ON public.obra_financeiro TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.obra_financeiro TO authenticated;
GRANT ALL ON public.obra_financeiro TO service_role;

GRANT SELECT ON public.obra_orcamento TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.obra_orcamento TO authenticated;
GRANT ALL ON public.obra_orcamento TO service_role;

GRANT SELECT ON public.obra_etapas TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.obra_etapas TO authenticated;
GRANT ALL ON public.obra_etapas TO service_role;

GRANT SELECT ON public.auditoria TO anon, authenticated;
GRANT INSERT ON public.auditoria TO authenticated;
GRANT ALL ON public.auditoria TO service_role;

GRANT SELECT ON public.profiles TO anon, authenticated;
GRANT UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

-- Auth-only table; read by the signed-in user and the has_role security-definer function
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

-- Checklist is auth-only (no anon)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.checklist_fiscal TO authenticated;
GRANT ALL ON public.checklist_fiscal TO service_role;
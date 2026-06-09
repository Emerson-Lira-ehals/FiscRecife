
-- ============ ENUM DE PAPÉIS ============
CREATE TYPE public.app_role AS ENUM ('fiscal', 'gestor', 'agente');
CREATE TYPE public.obra_status AS ENUM ('planejamento', 'em_andamento', 'atrasada', 'paralisada', 'concluida');

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Perfis visíveis para todos" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Usuário edita próprio perfil" ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ============ USER ROLES ============
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuário vê próprios papéis" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- ============ TRIGGER NOVO USUÁRIO ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nome', ''), COALESCE(NEW.email, ''));

  IF NEW.raw_user_meta_data->>'role' IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, (NEW.raw_user_meta_data->>'role')::app_role)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ UTIL updated_at ============
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- ============ OBRAS ============
CREATE TABLE public.obras (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  endereco TEXT NOT NULL DEFAULT '',
  bairro TEXT NOT NULL DEFAULT '',
  empreiteira TEXT NOT NULL DEFAULT '',
  orgao_responsavel TEXT NOT NULL DEFAULT '',
  data_inicio DATE,
  data_prevista DATE,
  data_atualizada DATE,
  status obra_status NOT NULL DEFAULT 'planejamento',
  percentual_concluido NUMERIC NOT NULL DEFAULT 0,
  percentual_planejado NUMERIC NOT NULL DEFAULT 0,
  valor_previsto NUMERIC NOT NULL DEFAULT 0,
  valor_executado NUMERIC NOT NULL DEFAULT 0,
  foto_principal TEXT,
  descricao TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.obras TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.obras TO authenticated;
GRANT ALL ON public.obras TO service_role;
ALTER TABLE public.obras ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Obras visíveis para todos" ON public.obras FOR SELECT USING (true);
CREATE POLICY "Gestor cria obras" ON public.obras FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'gestor'));
CREATE POLICY "Gestor edita obras" ON public.obras FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'gestor')) WITH CHECK (public.has_role(auth.uid(), 'gestor'));
CREATE POLICY "Gestor remove obras" ON public.obras FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'gestor'));
CREATE TRIGGER trg_obras_updated BEFORE UPDATE ON public.obras FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ FOTOS ============
CREATE TABLE public.obra_fotos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  obra_id UUID NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'real',
  legenda TEXT NOT NULL DEFAULT '',
  data_upload TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.obra_fotos TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.obra_fotos TO authenticated;
GRANT ALL ON public.obra_fotos TO service_role;
ALTER TABLE public.obra_fotos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Fotos visíveis para todos" ON public.obra_fotos FOR SELECT USING (true);
CREATE POLICY "Gestor gerencia fotos" ON public.obra_fotos FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'gestor')) WITH CHECK (public.has_role(auth.uid(), 'gestor'));

-- ============ COMUNICADOS ============
CREATE TABLE public.comunicados (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  obra_id UUID NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mensagem TEXT NOT NULL,
  data_publicacao TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.comunicados TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comunicados TO authenticated;
GRANT ALL ON public.comunicados TO service_role;
ALTER TABLE public.comunicados ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Comunicados visíveis para todos" ON public.comunicados FOR SELECT USING (true);
CREATE POLICY "Gestor ou agente cria comunicado" ON public.comunicados FOR INSERT TO authenticated WITH CHECK (auth.uid() = usuario_id AND (public.has_role(auth.uid(), 'gestor') OR public.has_role(auth.uid(), 'agente')));
CREATE POLICY "Autor remove comunicado" ON public.comunicados FOR DELETE TO authenticated USING (auth.uid() = usuario_id);

-- ============ COMENTÁRIOS ============
CREATE TABLE public.comentarios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  obra_id UUID NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  comentario TEXT NOT NULL,
  data_comentario TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.comentarios TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comentarios TO authenticated;
GRANT ALL ON public.comentarios TO service_role;
ALTER TABLE public.comentarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Comentários visíveis para todos" ON public.comentarios FOR SELECT USING (true);
CREATE POLICY "Autenticado comenta" ON public.comentarios FOR INSERT TO authenticated WITH CHECK (auth.uid() = usuario_id);
CREATE POLICY "Autor remove comentário" ON public.comentarios FOR DELETE TO authenticated USING (auth.uid() = usuario_id);

-- ============ CHECKLIST FISCAL ============
CREATE TABLE public.checklist_fiscal (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  obra_id UUID NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
  fiscal_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data_inspecao DATE NOT NULL DEFAULT CURRENT_DATE,
  resultado JSONB NOT NULL DEFAULT '{}'::jsonb,
  fotos JSONB NOT NULL DEFAULT '[]'::jsonb,
  documentos JSONB NOT NULL DEFAULT '[]'::jsonb,
  observacao_geral TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.checklist_fiscal TO authenticated;
GRANT ALL ON public.checklist_fiscal TO service_role;
ALTER TABLE public.checklist_fiscal ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Fiscal vê próprias inspeções" ON public.checklist_fiscal FOR SELECT TO authenticated USING (auth.uid() = fiscal_id OR public.has_role(auth.uid(), 'gestor') OR public.has_role(auth.uid(), 'agente'));
CREATE POLICY "Fiscal cria inspeção" ON public.checklist_fiscal FOR INSERT TO authenticated WITH CHECK (auth.uid() = fiscal_id);
CREATE POLICY "Fiscal edita própria inspeção" ON public.checklist_fiscal FOR UPDATE TO authenticated USING (auth.uid() = fiscal_id) WITH CHECK (auth.uid() = fiscal_id);

-- ============ EVOLUÇÃO FÍSICA ============
CREATE TABLE public.obra_progresso (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  obra_id UUID NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  percentual_planejado NUMERIC NOT NULL DEFAULT 0,
  percentual_executado NUMERIC NOT NULL DEFAULT 0
);
GRANT SELECT ON public.obra_progresso TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.obra_progresso TO authenticated;
GRANT ALL ON public.obra_progresso TO service_role;
ALTER TABLE public.obra_progresso ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Progresso visível para todos" ON public.obra_progresso FOR SELECT USING (true);
CREATE POLICY "Gestor gerencia progresso" ON public.obra_progresso FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'gestor')) WITH CHECK (public.has_role(auth.uid(), 'gestor'));

-- ============ EVOLUÇÃO FINANCEIRA ============
CREATE TABLE public.obra_financeiro (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  obra_id UUID NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
  mes TEXT NOT NULL,
  ordem INTEGER NOT NULL DEFAULT 0,
  valor_previsto NUMERIC NOT NULL DEFAULT 0,
  valor_realizado NUMERIC NOT NULL DEFAULT 0
);
GRANT SELECT ON public.obra_financeiro TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.obra_financeiro TO authenticated;
GRANT ALL ON public.obra_financeiro TO service_role;
ALTER TABLE public.obra_financeiro ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Financeiro visível para todos" ON public.obra_financeiro FOR SELECT USING (true);
CREATE POLICY "Gestor gerencia financeiro" ON public.obra_financeiro FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'gestor')) WITH CHECK (public.has_role(auth.uid(), 'gestor'));

-- ============ ORÇAMENTO (PIZZA) ============
CREATE TABLE public.obra_orcamento (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  obra_id UUID NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
  categoria TEXT NOT NULL,
  valor NUMERIC NOT NULL DEFAULT 0
);
GRANT SELECT ON public.obra_orcamento TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.obra_orcamento TO authenticated;
GRANT ALL ON public.obra_orcamento TO service_role;
ALTER TABLE public.obra_orcamento ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Orçamento visível para todos" ON public.obra_orcamento FOR SELECT USING (true);
CREATE POLICY "Gestor gerencia orçamento" ON public.obra_orcamento FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'gestor')) WITH CHECK (public.has_role(auth.uid(), 'gestor'));

-- ============ ETAPAS (GANTT) ============
CREATE TABLE public.obra_etapas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  obra_id UUID NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
  etapa TEXT NOT NULL,
  ordem INTEGER NOT NULL DEFAULT 0,
  data_prevista_inicio DATE,
  data_prevista_fim DATE,
  data_real_inicio DATE,
  data_real_fim DATE,
  concluida BOOLEAN NOT NULL DEFAULT false
);
GRANT SELECT ON public.obra_etapas TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.obra_etapas TO authenticated;
GRANT ALL ON public.obra_etapas TO service_role;
ALTER TABLE public.obra_etapas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Etapas visíveis para todos" ON public.obra_etapas FOR SELECT USING (true);
CREATE POLICY "Gestor gerencia etapas" ON public.obra_etapas FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'gestor')) WITH CHECK (public.has_role(auth.uid(), 'gestor'));

-- ============ AUDITORIA ============
CREATE TABLE public.auditoria (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  usuario_nome TEXT NOT NULL DEFAULT '',
  obra_id UUID REFERENCES public.obras(id) ON DELETE CASCADE,
  acao TEXT NOT NULL,
  entidade TEXT NOT NULL DEFAULT '',
  data_hora TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.auditoria TO anon;
GRANT SELECT, INSERT ON public.auditoria TO authenticated;
GRANT ALL ON public.auditoria TO service_role;
ALTER TABLE public.auditoria ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auditoria visível para todos" ON public.auditoria FOR SELECT USING (true);
CREATE POLICY "Autenticado registra auditoria" ON public.auditoria FOR INSERT TO authenticated WITH CHECK (auth.uid() = usuario_id);

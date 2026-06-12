-- Enum de status de atividade
DO $$ BEGIN
  CREATE TYPE public.atividade_status AS ENUM (
    'nao_iniciada', 'em_execucao', 'aguardando_validacao', 'concluida', 'rejeitada'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Tabela de atividades do cronograma (macroetapa -> atividade -> subatividade)
CREATE TABLE IF NOT EXISTS public.obra_atividades (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  obra_id UUID NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
  macroetapa TEXT NOT NULL DEFAULT 'Geral',
  nome TEXT NOT NULL,
  ordem INTEGER NOT NULL DEFAULT 0,
  peso NUMERIC(6,3) NOT NULL DEFAULT 0,
  valor NUMERIC(14,2),
  duracao_dias INTEGER,
  percentual_planejado NUMERIC(5,2) NOT NULL DEFAULT 0,
  data_planejada_inicio DATE,
  data_planejada_fim DATE,
  data_real_inicio DATE,
  data_real_fim DATE,
  status public.atividade_status NOT NULL DEFAULT 'nao_iniciada',
  responsavel_id UUID,
  evidencia_foto TEXT,
  evidencia_comentario TEXT,
  evidencia_doc TEXT,
  evidencia_gps TEXT,
  enviado_por UUID,
  enviado_em TIMESTAMPTZ,
  validado_por UUID,
  validado_em TIMESTAMPTZ,
  justificativa TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.obra_atividades TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.obra_atividades TO authenticated;
GRANT ALL ON public.obra_atividades TO service_role;

ALTER TABLE public.obra_atividades ENABLE ROW LEVEL SECURITY;

-- Leitura pública (transparência)
CREATE POLICY "Atividades visiveis a todos"
  ON public.obra_atividades FOR SELECT
  USING (true);

-- Criar/remover atividades: admin, prefeitura, gestor
CREATE POLICY "Gestao cria atividades"
  ON public.obra_atividades FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role_secure(auth.uid(), 'admin')
    OR public.has_role_secure(auth.uid(), 'prefeitura')
    OR public.has_role_secure(auth.uid(), 'gestor')
  );

CREATE POLICY "Gestao remove atividades"
  ON public.obra_atividades FOR DELETE TO authenticated
  USING (
    public.has_role_secure(auth.uid(), 'admin')
    OR public.has_role_secure(auth.uid(), 'prefeitura')
    OR public.has_role_secure(auth.uid(), 'gestor')
  );

-- Atualizar atividades: admin, prefeitura, gestor (envio) e fiscal (validação)
CREATE POLICY "Gestao e fiscal atualizam atividades"
  ON public.obra_atividades FOR UPDATE TO authenticated
  USING (
    public.has_role_secure(auth.uid(), 'admin')
    OR public.has_role_secure(auth.uid(), 'prefeitura')
    OR public.has_role_secure(auth.uid(), 'gestor')
    OR public.has_role_secure(auth.uid(), 'fiscal')
  )
  WITH CHECK (
    public.has_role_secure(auth.uid(), 'admin')
    OR public.has_role_secure(auth.uid(), 'prefeitura')
    OR public.has_role_secure(auth.uid(), 'gestor')
    OR public.has_role_secure(auth.uid(), 'fiscal')
  );

CREATE INDEX IF NOT EXISTS idx_obra_atividades_obra ON public.obra_atividades(obra_id);

CREATE TRIGGER trg_obra_atividades_updated
  BEFORE UPDATE ON public.obra_atividades
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Recalcula o avanço físico da obra a partir das atividades aprovadas (soma dos pesos)
CREATE OR REPLACE FUNCTION public.recalc_avanco_obra(_obra_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _concluido NUMERIC;
  _planejado NUMERIC;
  _total_peso NUMERIC;
BEGIN
  SELECT COALESCE(SUM(peso),0) INTO _total_peso
    FROM public.obra_atividades WHERE obra_id = _obra_id;

  IF _total_peso = 0 THEN
    RETURN; -- sem cronograma: mantém valor atual
  END IF;

  SELECT COALESCE(SUM(peso),0) INTO _concluido
    FROM public.obra_atividades
    WHERE obra_id = _obra_id AND status = 'concluida';

  SELECT COALESCE(SUM(peso),0) INTO _planejado
    FROM public.obra_atividades
    WHERE obra_id = _obra_id AND data_planejada_fim IS NOT NULL AND data_planejada_fim <= CURRENT_DATE;

  UPDATE public.obras
    SET percentual_concluido = ROUND((_concluido / _total_peso) * 100),
        percentual_planejado = ROUND((_planejado / _total_peso) * 100),
        data_atualizada = now()
    WHERE id = _obra_id;
END;
$$;

-- Trigger que dispara recálculo após qualquer mudança em atividade
CREATE OR REPLACE FUNCTION public.trg_recalc_avanco()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'DELETE') THEN
    PERFORM public.recalc_avanco_obra(OLD.obra_id);
    RETURN OLD;
  ELSE
    PERFORM public.recalc_avanco_obra(NEW.obra_id);
    RETURN NEW;
  END IF;
END;
$$;

CREATE TRIGGER trg_atividade_recalc
  AFTER INSERT OR UPDATE OR DELETE ON public.obra_atividades
  FOR EACH ROW EXECUTE FUNCTION public.trg_recalc_avanco();
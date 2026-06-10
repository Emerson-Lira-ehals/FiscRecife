-- New role values
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'admin';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'prefeitura';

-- New obra status values
ALTER TYPE public.obra_status ADD VALUE IF NOT EXISTS 'licitacao';
ALTER TYPE public.obra_status ADD VALUE IF NOT EXISTS 'cancelada';

-- User active/inactive status
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ativo boolean NOT NULL DEFAULT true;

-- Advanced obra fields
ALTER TABLE public.obras ADD COLUMN IF NOT EXISTS cep text NOT NULL DEFAULT '';
ALTER TABLE public.obras ADD COLUMN IF NOT EXISTS latitude numeric;
ALTER TABLE public.obras ADD COLUMN IF NOT EXISTS longitude numeric;
ALTER TABLE public.obras ADD COLUMN IF NOT EXISTS fiscal_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.obras ADD COLUMN IF NOT EXISTS gestor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.obras ADD COLUMN IF NOT EXISTS data_inicio_prevista date;
ALTER TABLE public.obras ADD COLUMN IF NOT EXISTS data_inicio_real date;
ALTER TABLE public.obras ADD COLUMN IF NOT EXISTS data_termino_prevista date;
ALTER TABLE public.obras ADD COLUMN IF NOT EXISTS data_termino_estimada date;
ALTER TABLE public.obras ADD COLUMN IF NOT EXISTS data_termino_real date;

-- 1) Impedir que usuários comuns alterem o campo "ativo" do próprio perfil.
-- A política de auto-edição continua existindo, mas um gatilho garante que
-- somente admin/prefeitura possam mudar o status ativo da conta.
CREATE OR REPLACE FUNCTION public.protect_profile_ativo()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.ativo IS DISTINCT FROM OLD.ativo THEN
    IF NOT public.can_manage_users(auth.uid()) THEN
      RAISE EXCEPTION 'Apenas administradores ou a prefeitura podem alterar o status da conta';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.protect_profile_ativo() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_protect_profile_ativo ON public.profiles;
CREATE TRIGGER trg_protect_profile_ativo
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_ativo();

-- 2) Restringir INSERT na auditoria a papéis institucionais (e somente em nome de si mesmo)
DROP POLICY IF EXISTS "Autenticado registra auditoria" ON public.auditoria;
CREATE POLICY "Equipe registra auditoria"
  ON public.auditoria
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = usuario_id
    AND (
      public.has_role_secure(auth.uid(), 'admin'::app_role)
      OR public.has_role_secure(auth.uid(), 'prefeitura'::app_role)
      OR public.has_role_secure(auth.uid(), 'gestor'::app_role)
      OR public.has_role_secure(auth.uid(), 'fiscal'::app_role)
      OR public.has_role_secure(auth.uid(), 'agente'::app_role)
    )
  );

-- 3) Restringir escrita no bucket de armazenamento "obras-fotos" a gestor/prefeitura/admin
DROP POLICY IF EXISTS "obras-fotos upload autenticado" ON storage.objects;
DROP POLICY IF EXISTS "obras-fotos update autenticado" ON storage.objects;
DROP POLICY IF EXISTS "obras-fotos delete autenticado" ON storage.objects;

CREATE POLICY "obras-fotos upload equipe"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'obras-fotos'
    AND (
      public.has_role_secure(auth.uid(), 'gestor'::app_role)
      OR public.has_role_secure(auth.uid(), 'prefeitura'::app_role)
      OR public.is_admin(auth.uid())
    )
  );

CREATE POLICY "obras-fotos update equipe"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'obras-fotos'
    AND (
      public.has_role_secure(auth.uid(), 'gestor'::app_role)
      OR public.has_role_secure(auth.uid(), 'prefeitura'::app_role)
      OR public.is_admin(auth.uid())
    )
  )
  WITH CHECK (
    bucket_id = 'obras-fotos'
    AND (
      public.has_role_secure(auth.uid(), 'gestor'::app_role)
      OR public.has_role_secure(auth.uid(), 'prefeitura'::app_role)
      OR public.is_admin(auth.uid())
    )
  );

CREATE POLICY "obras-fotos delete equipe"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'obras-fotos'
    AND (
      public.has_role_secure(auth.uid(), 'gestor'::app_role)
      OR public.has_role_secure(auth.uid(), 'prefeitura'::app_role)
      OR public.is_admin(auth.uid())
    )
  );

-- 1) Helper: usuários que podem gerenciar outros usuários (admin ou prefeitura)
CREATE OR REPLACE FUNCTION public.can_manage_users(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin','prefeitura')
  )
$$;

-- 2) Prefeitura passa a ter os mesmos poderes de gestão de usuários do admin
CREATE POLICY "Prefeitura edita perfis" ON public.profiles
  FOR UPDATE TO authenticated
  USING (public.can_manage_users(auth.uid()))
  WITH CHECK (public.can_manage_users(auth.uid()));

CREATE POLICY "Prefeitura ve papeis" ON public.user_roles
  FOR SELECT TO authenticated
  USING (public.can_manage_users(auth.uid()));

CREATE POLICY "Prefeitura cria papeis" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_users(auth.uid()));

CREATE POLICY "Prefeitura altera papeis" ON public.user_roles
  FOR UPDATE TO authenticated
  USING (public.can_manage_users(auth.uid()))
  WITH CHECK (public.can_manage_users(auth.uid()));

CREATE POLICY "Prefeitura remove papeis" ON public.user_roles
  FOR DELETE TO authenticated
  USING (public.can_manage_users(auth.uid()));

-- 3) Fotos de obra: prefeitura e admin podem gerenciar (gestor já podia)
CREATE POLICY "Prefeitura e admin gerenciam fotos" ON public.obra_fotos
  FOR ALL TO authenticated
  USING (public.has_role_secure(auth.uid(),'prefeitura') OR public.is_admin(auth.uid()))
  WITH CHECK (public.has_role_secure(auth.uid(),'prefeitura') OR public.is_admin(auth.uid()));

-- 4) Storage: bucket privado obras-fotos (leitura assinada + upload por autenticados)
CREATE POLICY "obras-fotos leitura"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'obras-fotos');

CREATE POLICY "obras-fotos upload autenticado"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'obras-fotos');

CREATE POLICY "obras-fotos update autenticado"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'obras-fotos')
  WITH CHECK (bucket_id = 'obras-fotos');

CREATE POLICY "obras-fotos delete autenticado"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'obras-fotos');
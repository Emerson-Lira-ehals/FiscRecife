-- Recursion-safe admin check (SECURITY DEFINER bypasses RLS on user_roles)
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'admin')
$$;

-- Generic role check, SECURITY DEFINER, for use inside policies without recursion
CREATE OR REPLACE FUNCTION public.has_role_secure(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- OBRAS: admin full access
CREATE POLICY "Admin cria obras" ON public.obras
  FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admin edita obras" ON public.obras
  FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admin remove obras" ON public.obras
  FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

-- OBRAS: prefeitura can create/edit
CREATE POLICY "Prefeitura cria obras" ON public.obras
  FOR INSERT TO authenticated WITH CHECK (public.has_role_secure(auth.uid(), 'prefeitura'));
CREATE POLICY "Prefeitura edita obras" ON public.obras
  FOR UPDATE TO authenticated USING (public.has_role_secure(auth.uid(), 'prefeitura')) WITH CHECK (public.has_role_secure(auth.uid(), 'prefeitura'));

-- PROFILES: admin can update any profile (activate/deactivate, edit)
CREATE POLICY "Admin edita perfis" ON public.profiles
  FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- USER_ROLES: admin manages roles
CREATE POLICY "Admin vê papéis" ON public.user_roles
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admin cria papéis" ON public.user_roles
  FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admin altera papéis" ON public.user_roles
  FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admin remove papéis" ON public.user_roles
  FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));
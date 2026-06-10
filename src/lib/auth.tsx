import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "@/lib/obra-utils";

interface Profile {
  id: string;
  nome: string;
  email: string;
  ativo: boolean;
}

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: AppRole | null;
  loading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  /** True for admins (full access) or when the user holds the given role. */
  can: (role: AppRole) => boolean;
  signIn: (
    email: string,
    password: string,
    expectedRole: AppRole,
  ) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function loadRoleAndProfile(userId: string) {
  const [{ data: roles }, { data: profile }] = await Promise.all([
    supabase.from("user_roles").select("role").eq("user_id", userId),
    supabase.from("profiles").select("id, nome, email, ativo").eq("id", userId).maybeSingle(),
  ]);
  const role = (roles && roles.length > 0 ? roles[0].role : null) as AppRole | null;
  return { role, profile: (profile as Profile | null) ?? null };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      if (newSession?.user) {
        // defer supabase calls outside the callback
        setTimeout(() => {
          loadRoleAndProfile(newSession.user.id).then(({ role, profile }) => {
            setRole(role);
            setProfile(profile);
          });
        }, 0);
      } else {
        setRole(null);
        setProfile(null);
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) {
        loadRoleAndProfile(data.session.user.id).then(({ role, profile }) => {
          setRole(role);
          setProfile(profile);
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const signIn = useCallback(
    async (email: string, password: string, expectedRole: AppRole) => {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error || !data.user) {
        return { error: "Senha ou usuário inválido(s), por favor tente novamente." };
      }
      const { role } = await loadRoleAndProfile(data.user.id);
      if (role !== expectedRole) {
        await supabase.auth.signOut();
        return { error: "Senha ou usuário inválido(s), por favor tente novamente." };
      }
      return { error: null };
    },
    [],
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setRole(null);
    setProfile(null);
  }, []);

  const isAdmin = role === "admin";
  const can = useCallback(
    (r: AppRole) => role === "admin" || role === r,
    [role],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      profile,
      role,
      loading,
      isAuthenticated: !!user && !!role,
      isAdmin,
      can,
      signIn,
      signOut,
    }),
    [user, session, profile, role, loading, isAdmin, can, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

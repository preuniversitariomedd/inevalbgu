import { supabase } from "@/integrations/supabase/client";

export async function getCurrentSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function getCurrentProfile() {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", u.user.id)
    .maybeSingle();
  const { data: roles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", u.user.id);
  return {
    user: u.user,
    profile,
    roles: (roles ?? []).map((r) => r.role as "estudiante" | "administrador"),
    esAdmin: (roles ?? []).some((r) => r.role === "administrador"),
  };
}

import { createFileRoute, Outlet, redirect, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LogOut, GraduationCap, Shield } from "lucide-react";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    // Si primera_vez = true, forzar cambio de contraseña.
    const { data: profile } = await supabase
      .from("profiles")
      .select("primera_vez, bloqueado")
      .eq("id", data.user.id)
      .maybeSingle();
    if (profile?.bloqueado) {
      await supabase.auth.signOut();
      throw redirect({ to: "/auth" });
    }
    if (profile?.primera_vez && typeof window !== "undefined") {
      if (window.location.pathname !== "/cambiar-password") {
        throw redirect({ to: "/cambiar-password" });
      }
    }
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user.id);
    return {
      user: data.user,
      profile,
      esAdmin: (roles ?? []).some((r) => r.role === "administrador"),
    };
  },
  component: AuthedLayout,
});

function AuthedLayout() {
  const ctx = Route.useRouteContext() as { user: { email?: string }; esAdmin: boolean };
  const router = useRouter();
  const [cedula, setCedula] = useState<string>("");

  useEffect(() => {
    void supabase
      .from("profiles")
      .select("cedula")
      .eq("id", (ctx.user as { id: string }).id)
      .maybeSingle()
      .then(({ data }) => setCedula(data?.cedula ?? ""));
  }, [ctx.user]);

  async function logout() {
    await supabase.auth.signOut();
    router.navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
          <Link to="/" className="flex items-center gap-2 font-extrabold">
            <GraduationCap className="h-5 w-5 text-primary" />
            <span>INEVAL_UEDE</span>
          </Link>
          <div className="flex items-center gap-3 text-sm">
            {ctx.esAdmin && (
              <Link
                to="/admin"
                className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 font-semibold text-accent-foreground hover:opacity-90"
              >
                <Shield className="h-4 w-4" /> Admin
              </Link>
            )}
            {cedula && <span className="hidden text-muted-foreground sm:inline">CI {cedula}</span>}
            <button
              onClick={logout}
              className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 font-medium hover:bg-secondary"
            >
              <LogOut className="h-4 w-4" /> Salir
            </button>
          </div>
        </div>
      </nav>
      <Outlet />
    </div>
  );
}

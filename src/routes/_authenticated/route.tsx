import { createFileRoute, Outlet, redirect, Link, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { obtenerBrandingFn } from "@/lib/admin.functions";
import { usePresencia } from "@/lib/usePresencia";
import { LogOut, GraduationCap, Shield } from "lucide-react";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
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
    const rs = (roles ?? []).map((r) => r.role);
    return {
      user: data.user,
      profile,
      esAdmin: rs.includes("administrador"),
      esDocente: rs.includes("docente"),
      esStaff: rs.includes("administrador") || rs.includes("docente"),
    };
  },
  component: AuthedLayout,
});

function AuthedLayout() {
  const ctx = Route.useRouteContext() as {
    user: { id: string; email?: string };
    esAdmin: boolean;
    esDocente: boolean;
    esStaff: boolean;
  };
  const router = useRouter();
  const [cedula, setCedula] = useState<string>("");
  const { data: branding } = useQuery({
    queryKey: ["branding"],
    queryFn: () => obtenerBrandingFn(),
    staleTime: 60_000,
  });

  useEffect(() => {
    void supabase
      .from("profiles")
      .select("cedula")
      .eq("id", ctx.user.id)
      .maybeSingle()
      .then(({ data }) => setCedula(data?.cedula ?? ""));
  }, [ctx.user.id]);

  async function logout() {
    await supabase.auth.signOut();
    router.navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-secondary/30">
      <nav className="sticky top-0 z-30 border-b bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
          <Link to="/" className="flex items-center gap-2.5 font-extrabold">
            <div className="relative grid h-10 w-10 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-primary via-primary to-accent text-primary-foreground shadow-soft ring-2 ring-primary/20">
              {branding?.logo_url ? (
                <img src={branding.logo_url} alt="Logo" className="h-full w-full object-cover" />
              ) : (
                <GraduationCap className="h-5 w-5" />
              )}
            </div>
            <span className="hidden sm:inline">{branding?.titulo || "INEVAL_UEDE"}</span>
          </Link>
          <div className="flex items-center gap-2 text-sm">
            {ctx.esStaff && (
              <Link
                to="/admin"
                className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-accent to-primary px-3 py-1.5 font-semibold text-primary-foreground shadow-soft hover:opacity-90"
              >
                <Shield className="h-4 w-4" />
                <span className="hidden sm:inline">{ctx.esAdmin ? "Admin" : "Docente"}</span>
              </Link>
            )}
            {cedula && <span className="hidden text-muted-foreground sm:inline">CI {cedula}</span>}
            <button
              onClick={logout}
              className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-medium hover:bg-secondary"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>
      </nav>
      <Outlet />
    </div>
  );
}

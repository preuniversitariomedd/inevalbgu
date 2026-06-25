import { createFileRoute, Outlet, redirect, Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Users, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  ssr: false,
  beforeLoad: async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) throw redirect({ to: "/auth" });
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", u.user.id);
    if (!(roles ?? []).some((r) => r.role === "administrador")) {
      throw redirect({ to: "/" });
    }
  },
  component: AdminLayout,
});

function AdminLayout() {
  return (
    <div className="mx-auto max-w-6xl px-5 py-6">
      <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Volver a la app
      </Link>
      <header className="mt-3 flex items-center gap-3">
        <div className="rounded-xl bg-accent p-2 text-accent-foreground">
          <Users className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold">Panel de administración</h1>
          <p className="text-sm text-muted-foreground">Gestiona estudiantes, monitorea conexiones y revisa estadísticas.</p>
        </div>
      </header>
      <nav className="mt-5 flex gap-2 border-b">
        <Link to="/admin" className="border-b-2 border-primary px-3 py-2 text-sm font-semibold">
          Estudiantes
        </Link>
        <Link to="/tutor" className="border-b-2 border-transparent px-3 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground">
          Tutor IA
        </Link>
      </nav>
      <div className="mt-5">
        <Outlet />
      </div>
    </div>
  );
}

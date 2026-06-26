import { createFileRoute, Outlet, redirect, Link, useLocation } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Users, ArrowLeft, Layers, Shield, Image as ImageIcon, MessageCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  ssr: false,
  beforeLoad: async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) throw redirect({ to: "/auth" });
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", u.user.id);
    const rs = (roles ?? []).map((r) => r.role);
    const esAdmin = rs.includes("administrador");
    const esDocente = rs.includes("docente");
    if (!esAdmin && !esDocente) throw redirect({ to: "/" });
    return { esAdmin, esDocente };
  },
  component: AdminLayout,
});

type Ctx = { esAdmin: boolean; esDocente: boolean };

function AdminLayout() {
  const ctx = Route.useRouteContext() as Ctx;
  const { pathname } = useLocation();

  const tabs = [
    { to: "/admin", label: "Estudiantes", icon: Users, show: true },
    { to: "/admin/grupos", label: "Grupos", icon: Layers, show: true },
    { to: "/admin/roles", label: "Roles", icon: Shield, show: ctx.esAdmin },
    { to: "/admin/branding", label: "Branding", icon: ImageIcon, show: ctx.esAdmin },
    { to: "/tutor", label: "Tutor IA", icon: MessageCircle, show: true },
  ];

  return (
    <div className="mx-auto max-w-6xl px-5 py-6">
      <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Volver a la app
      </Link>
      <header className="mt-3 flex items-center gap-3">
        <div className="rounded-2xl bg-gradient-to-br from-primary to-accent p-2.5 text-primary-foreground shadow-soft">
          <Users className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold">Panel de {ctx.esAdmin ? "administración" : "docencia"}</h1>
          <p className="text-sm text-muted-foreground">
            {ctx.esAdmin
              ? "Control total: estudiantes, grupos, roles, branding y tutor IA."
              : "Gestiona estudiantes, verifica avances y revisa estadísticas."}
          </p>
        </div>
      </header>
      <nav className="mt-5 flex gap-1 overflow-x-auto border-b">
        {tabs.filter((t) => t.show).map(({ to, label, icon: Icon }) => {
          const active = pathname === to || (to !== "/admin" && pathname.startsWith(to));
          return (
            <Link
              key={to}
              to={to}
              className={`inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2 text-sm font-semibold transition ${
                active
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" /> {label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-5">
        <Outlet />
      </div>
    </div>
  );
}

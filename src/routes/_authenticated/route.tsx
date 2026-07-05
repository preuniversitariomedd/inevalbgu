import { createFileRoute, Outlet, redirect, Link, useRouter } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { obtenerBrandingFn } from "@/lib/admin.functions";
import { usePresencia } from "@/lib/usePresencia";
import { LogOut, GraduationCap, Shield, PartyPopper, MessageCircle, Camera, Sparkles } from "lucide-react";
import { useMensajesNoLeidos } from "@/components/chat/ChatShell";
import { miAvatarUrlFn, subirAvatarFn } from "@/lib/mensajes.functions";
import { toast } from "sonner";

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
  const bienvenidaShown = useRef(false);
  const { data: branding } = useQuery({
    queryKey: ["branding"],
    queryFn: () => obtenerBrandingFn(),
    staleTime: 60_000,
  });
  usePresencia(true);


  useEffect(() => {
    void supabase
      .from("profiles")
      .select("cedula, nombres")
      .eq("id", ctx.user.id)
      .maybeSingle()
      .then(({ data }) => {
        setCedula(data?.cedula ?? "");
        if (data?.nombres && !bienvenidaShown.current) {
          const key = `welcome:${ctx.user.id}`;
          if (typeof sessionStorage !== "undefined" && !sessionStorage.getItem(key)) {
            const nombre = data.nombres.split(" ")[0];
            toast.success(`¡Bienvenido, ${nombre}! 🎓`, {
              description: "Listo para practicar. ¡Que tengas una gran sesión!",
              icon: <PartyPopper className="h-5 w-5" />,
              duration: 5000,
            });
            sessionStorage.setItem(key, "1");
            bienvenidaShown.current = true;
          }
        }
      });
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
            <Link
              to="/tutor"
              className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-fuchsia-500 via-purple-500 to-cyan-500 px-3 py-1.5 font-semibold text-white shadow-soft hover:opacity-90"
              title="Mr. Victor · Tutor virtual"
            >
              <Sparkles className="h-4 w-4" />
              <span className="hidden sm:inline">Mr. Victor</span>
            </Link>
            <MensajesLink />
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
            <AvatarSelector />
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

function MensajesLink() {
  const q = useMensajesNoLeidos(true);
  const total = (q.data as any)?.total ?? 0;
  return (
    <Link
      to="/mensajes"
      className="relative inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-medium hover:bg-secondary"
    >
      <MessageCircle className="h-4 w-4" />
      <span className="hidden sm:inline">Mensajes</span>
      {total > 0 && (
        <span className="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full bg-gradient-to-r from-fuchsia-500 to-cyan-500 px-1 text-[10px] font-bold text-white shadow">
          {total > 99 ? "99+" : total}
        </span>
      )}
    </Link>
  );
}

function AvatarSelector() {
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const q = useQuery({ queryKey: ["mi-avatar"], queryFn: () => miAvatarUrlFn(), staleTime: 60_000 });
  const url = (q.data as any)?.url as string | null | undefined;
  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!/image\/(png|jpe?g|webp)/i.test(f.type)) return toast.error("Solo jpg, png o webp.");
    if (f.size > 3 * 1024 * 1024) return toast.error("Máximo 3 MB.");
    const b64 = await new Promise<string>((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result as string);
      r.onerror = rej;
      r.readAsDataURL(f);
    });
    try {
      await subirAvatarFn({ data: { base64: b64, mime: f.type } });
      toast.success("Foto actualizada.");
      qc.invalidateQueries({ queryKey: ["mi-avatar"] });
      qc.invalidateQueries({ queryKey: ["mensajes", "convs"] });
    } catch (err: any) {
      toast.error(err.message ?? "Error al subir.");
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  }
  return (
    <>
      <button
        onClick={() => inputRef.current?.click()}
        title="Cambiar mi foto"
        className="relative grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-fuchsia-400 to-cyan-400 text-white shadow-soft ring-2 ring-primary/20 transition hover:scale-105"
      >
        {url ? (
          <img src={url} alt="Mi foto" className="h-full w-full object-cover" />
        ) : (
          <Camera className="h-4 w-4" />
        )}
      </button>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onPick} />
    </>
  );
}

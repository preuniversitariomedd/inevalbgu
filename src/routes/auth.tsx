import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { validarCedulaEcuatoriana, cedulaToEmail } from "@/lib/cedula";
import { crearAdminInicialFn, existeAdminFn } from "@/lib/admin.functions";
import { toast } from "sonner";
import { GraduationCap, ShieldPlus } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Iniciar sesión — INEVAL_UEDE" }] }),
  component: AuthPage,
});

function AuthPage() {
  const router = useRouter();
  const [cedula, setCedula] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [hayAdmin, setHayAdmin] = useState<boolean | null>(null);
  const [setupOpen, setSetupOpen] = useState(false);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.navigate({ to: "/", replace: true });
    });
    void existeAdminFn().then((r) => setHayAdmin(r.existe));
  }, [router]);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    const v = validarCedulaEcuatoriana(cedula);
    if (!v.valida) return toast.error(v.error!);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: cedulaToEmail(cedula),
      password,
    });
    setLoading(false);
    if (error) return toast.error("Cédula o contraseña incorrecta.");
    router.navigate({ to: "/", replace: true });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-hero px-5 py-10">
      <div className="w-full max-w-md">
        <div className="mb-5 text-center text-primary-foreground">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-sm font-medium backdrop-blur">
            <GraduationCap className="h-4 w-4" /> INEVAL · 1ro BGU · Matemática
          </div>
          <h1 className="mt-4 text-4xl font-extrabold">INEVAL_UEDE</h1>
        </div>

        <form onSubmit={login} className="rounded-2xl bg-card p-7 shadow-strong">
          <h2 className="text-xl font-extrabold">Inicia sesión</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Usa tu número de cédula y la contraseña que te entregó tu docente.
          </p>
          <label className="mt-5 block text-sm font-semibold">Cédula o documento</label>
          <input
            inputMode="text"
            maxLength={20}
            value={cedula}
            onChange={(e) => setCedula(e.target.value.replace(/[^A-Za-z0-9-]/g, "").toUpperCase())}
            className="mt-1 w-full rounded-md border px-3 py-2"
            placeholder="10 dígitos (Ecuador) o documento extranjero"
            required
          />
          <label className="mt-3 block text-sm font-semibold">Contraseña</label>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-md border px-3 py-2"
            required
          />
          <button
            disabled={loading}
            className="mt-6 w-full rounded-xl bg-primary px-5 py-2.5 font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? "Ingresando..." : "Entrar"}
          </button>
        </form>

        {hayAdmin === false && (
          <div className="mt-5 rounded-2xl border bg-card/95 p-5 text-sm shadow-soft">
            <div className="flex items-center gap-2 font-bold">
              <ShieldPlus className="h-5 w-5 text-accent" />
              Configuración inicial
            </div>
            <p className="mt-2 text-muted-foreground">
              No existe ninguna cuenta de administrador. Crea la primera para empezar a registrar estudiantes.
            </p>
            {!setupOpen ? (
              <button
                onClick={() => setSetupOpen(true)}
                className="mt-3 rounded-md bg-accent px-4 py-2 font-semibold text-accent-foreground hover:opacity-90"
              >
                Crear administrador inicial
              </button>
            ) : (
              <SetupAdmin
                onDone={() => {
                  setHayAdmin(true);
                  setSetupOpen(false);
                }}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SetupAdmin({ onDone }: { onDone: () => void }) {
  const [cedula, setCedula] = useState("");
  const [nombres, setNombres] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const v = validarCedulaEcuatoriana(cedula);
    if (!v.valida) return toast.error(v.error!);
    if (password.length < 8) return toast.error("Contraseña mínimo 8 caracteres.");
    setLoading(true);
    try {
      await crearAdminInicialFn({ data: { cedula, nombres, password } });
      toast.success("Administrador creado. Ya puedes iniciar sesión.");
      onDone();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error al crear admin");
    } finally {
      setLoading(false);
    }
  }
  return (
    <form onSubmit={submit} className="mt-3 space-y-2">
      <input
        inputMode="text"
        maxLength={20}
        placeholder="Cédula (10 dígitos) o documento extranjero"
        value={cedula}
        onChange={(e) => setCedula(e.target.value.replace(/[^A-Za-z0-9-]/g, "").toUpperCase())}
        className="w-full rounded-md border px-3 py-2 text-sm"
        required
      />
      <input
        placeholder="Nombres completos"
        value={nombres}
        onChange={(e) => setNombres(e.target.value)}
        className="w-full rounded-md border px-3 py-2 text-sm"
        required
      />
      <input
        type="password"
        placeholder="Contraseña (mín. 8)"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full rounded-md border px-3 py-2 text-sm"
        required
      />
      <button
        disabled={loading}
        className="w-full rounded-md bg-primary px-4 py-2 font-semibold text-primary-foreground disabled:opacity-50"
      >
        {loading ? "Creando..." : "Crear administrador"}
      </button>
    </form>
  );
}

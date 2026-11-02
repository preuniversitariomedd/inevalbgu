import { pageMeta } from "@/lib/page-meta";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { validarCedulaEcuatoriana, cedulaToEmail } from "@/lib/cedula";
import { crearAdminInicialFn, existeAdminFn } from "@/lib/admin.functions";
import { toast } from "sonner";
import { diagnosticarLoginFn, resetConPinFn } from "@/lib/pin.functions";
import { GraduationCap, ShieldPlus } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [...pageMeta("Iniciar sesión — INEVAL_UEDE","Iniciar sesión en la plataforma educativa INEVAL_UEDE."),{ title: "Iniciar sesión — INEVAL_UEDE" }] }),
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
    if (error) {
      const red = error.status === 0 || /fetch|network|connect/i.test(error.message);
      const d = red ? { estado: "servicio" as const } : await diagnosticarLoginFn({ data: { cedula } }).catch(() => ({ estado: "servicio" as const }));
      setLoading(false);
      if (d.estado === "no_existe") return toast.error("La cédula no está registrada. Verifica los números o pide al administrador que te registre.");
      if (d.estado === "bloqueado") return toast.error("Tu cuenta está desactivada. Contacta al administrador.");
      if (d.estado === "servicio") return toast.error("El servicio se está reactivando. Espera unos segundos e intenta de nuevo.");
      return toast.error(
        "tienePin" in d && d.tienePin
          ? "La contraseña es incorrecta. Puedes restablecerla con tu PIN de 4 dígitos."
          : "La contraseña es incorrecta. Si no la recuerdas, pide al administrador que la reinicie.",
      );
    }
    setLoading(false);
    router.navigate({ to: "/", replace: true });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-hero px-5 py-10">
      <div className="w-full max-w-md">
        <div className="mb-5 text-center text-primary-foreground">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-sm font-medium backdrop-blur">
            <GraduationCap className="h-4 w-4" /> INEVAL · Básica Superior &amp; Bachillerato · Matemática
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

        <RecuperarConPin cedulaInicial={cedula} />

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

function RecuperarConPin({ cedulaInicial }: { cedulaInicial: string }) {
  const [open, setOpen] = useState(false);
  const [cedula, setCedula] = useState("");
  const [pin, setPin] = useState("");
  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\d{4}$/.test(pin)) return toast.error("El PIN debe tener 4 dígitos.");
    if (p1.length < 8) return toast.error("La nueva contraseña debe tener mínimo 8 caracteres.");
    if (p1 !== p2) return toast.error("Las contraseñas no coinciden.");
    setLoading(true);
    try {
      const r = await resetConPinFn({ data: { cedula, pin, nueva: p1 } });
      if (!r.ok) return toast.error(r.error);
      toast.success("Contraseña restablecida. Ya puedes ingresar con tu nueva contraseña.");
      setOpen(false);
      setPin(""); setP1(""); setP2("");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "No se pudo restablecer.");
    } finally {
      setLoading(false);
    }
  }

  if (!open)
    return (
      <button
        type="button"
        onClick={() => { setCedula(cedulaInicial); setOpen(true); }}
        className="mt-4 w-full text-center text-sm font-semibold text-primary-foreground underline underline-offset-4"
      >
        ¿Olvidaste tu contraseña? Restablécela con tu PIN
      </button>
    );

  return (
    <form onSubmit={submit} className="mt-4 space-y-2 rounded-2xl bg-card p-5 shadow-soft">
      <h3 className="font-extrabold">Restablecer con PIN de 4 dígitos</h3>
      <input inputMode="numeric" maxLength={10} placeholder="Cédula" value={cedula}
        onChange={(e) => setCedula(e.target.value.replace(/\D/g, ""))}
        className="w-full rounded-md border px-3 py-2 text-sm" required />
      <input type="password" inputMode="numeric" maxLength={4} placeholder="PIN (4 dígitos)" value={pin}
        onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
        className="w-full rounded-md border px-3 py-2 text-sm tracking-widest" required />
      <input type="password" autoComplete="new-password" placeholder="Nueva contraseña (mín. 8)" value={p1}
        onChange={(e) => setP1(e.target.value)} className="w-full rounded-md border px-3 py-2 text-sm" required />
      <input type="password" autoComplete="new-password" placeholder="Repite la nueva contraseña" value={p2}
        onChange={(e) => setP2(e.target.value)} className="w-full rounded-md border px-3 py-2 text-sm" required />
      <div className="flex gap-2">
        <button type="button" onClick={() => setOpen(false)} className="flex-1 rounded-md border px-4 py-2 text-sm font-semibold">Cancelar</button>
        <button disabled={loading} className="flex-1 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">
          {loading ? "Verificando..." : "Restablecer"}
        </button>
      </div>
    </form>
  );
}

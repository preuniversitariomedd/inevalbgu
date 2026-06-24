import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { KeyRound } from "lucide-react";

export const Route = createFileRoute("/_authenticated/cambiar-password")({
  head: () => ({ meta: [{ title: "Cambia tu contraseña — INEVAL_UEDE" }] }),
  component: CambiarPassword,
});

function CambiarPassword() {
  const router = useRouter();
  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (p1.length < 8) return toast.error("Mínimo 8 caracteres.");
    if (p1 !== p2) return toast.error("Las contraseñas no coinciden.");
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: p1 });
    if (error) {
      setLoading(false);
      return toast.error(error.message);
    }
    const { data: u } = await supabase.auth.getUser();
    if (u.user) {
      await supabase.from("profiles").update({ primera_vez: false }).eq("id", u.user.id);
    }
    toast.success("Contraseña actualizada.");
    router.navigate({ to: "/", replace: true });
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-5 py-10">
      <form
        onSubmit={submit}
        className="w-full max-w-md rounded-2xl border bg-gradient-card p-8 shadow-strong"
      >
        <div className="flex items-center gap-2 text-primary">
          <KeyRound className="h-6 w-6" />
          <h1 className="text-2xl font-extrabold">Cambia tu contraseña</h1>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Por seguridad, debes reemplazar la contraseña temporal antes de continuar. Mínimo 8 caracteres.
        </p>
        <label className="mt-5 block text-sm font-semibold">Nueva contraseña</label>
        <input
          type="password"
          autoComplete="new-password"
          value={p1}
          onChange={(e) => setP1(e.target.value)}
          className="mt-1 w-full rounded-md border px-3 py-2"
          required
        />
        <label className="mt-3 block text-sm font-semibold">Confirma la contraseña</label>
        <input
          type="password"
          autoComplete="new-password"
          value={p2}
          onChange={(e) => setP2(e.target.value)}
          className="mt-1 w-full rounded-md border px-3 py-2"
          required
        />
        <button
          disabled={loading}
          className="mt-6 w-full rounded-xl bg-primary px-5 py-2.5 font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? "Guardando..." : "Guardar nueva contraseña"}
        </button>
      </form>
    </div>
  );
}

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound, X } from "lucide-react";
import { toast } from "sonner";
import { establecerPinFn, tienePinFn } from "@/lib/pin.functions";

/** Botón del encabezado para crear/cambiar el PIN de recuperación; se abre solo si falta. */
export function PinSeguridad() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["mi-pin"], queryFn: () => tienePinFn(), staleTime: 300_000 });
  const tiene = q.data?.tienePin;
  const [open, setOpen] = useState<boolean | null>(null);
  const [pin, setPin] = useState("");
  const [pin2, setPin2] = useState("");
  const [loading, setLoading] = useState(false);
  const visible = open ?? (q.isSuccess && !tiene);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\d{4}$/.test(pin)) return toast.error("El PIN debe tener exactamente 4 dígitos.");
    if (pin !== pin2) return toast.error("Los PIN no coinciden.");
    setLoading(true);
    try {
      await establecerPinFn({ data: { pin } });
      toast.success("PIN guardado. Úsalo si algún día olvidas tu contraseña.");
      setPin(""); setPin2(""); setOpen(false);
      qc.invalidateQueries({ queryKey: ["mi-pin"] });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "No se pudo guardar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title={tiene ? "Cambiar PIN de recuperación" : "Crear PIN de recuperación"}
        className="relative grid h-9 w-9 place-items-center rounded-full border hover:bg-secondary"
      >
        <KeyRound className="h-4 w-4" />
        {q.isSuccess && !tiene && <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-destructive" />}
      </button>
      {visible && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-background/70 p-4 backdrop-blur-sm">
          <form onSubmit={guardar} className="relative w-full max-w-sm space-y-3 rounded-2xl border bg-card p-6 shadow-xl">
            <button type="button" onClick={() => setOpen(false)} className="absolute right-3 top-3 rounded-full p-1 hover:bg-secondary">
              <X className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-extrabold">{tiene ? "Cambiar PIN" : "Crea tu PIN de seguridad"}</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Con tu cédula y este PIN de 4 dígitos podrás restablecer tu contraseña tú mismo si no puedes ingresar. No lo compartas.
            </p>
            <input type="password" inputMode="numeric" maxLength={4} placeholder="PIN (4 dígitos)" value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              className="w-full rounded-md border bg-background px-3 py-2 text-center text-lg tracking-[0.5em]" required />
            <input type="password" inputMode="numeric" maxLength={4} placeholder="Repite el PIN" value={pin2}
              onChange={(e) => setPin2(e.target.value.replace(/\D/g, ""))}
              className="w-full rounded-md border bg-background px-3 py-2 text-center text-lg tracking-[0.5em]" required />
            <button disabled={loading} className="w-full rounded-md bg-primary px-4 py-2 font-semibold text-primary-foreground disabled:opacity-50">
              {loading ? "Guardando..." : "Guardar PIN"}
            </button>
          </form>
        </div>
      )}
    </>
  );
}

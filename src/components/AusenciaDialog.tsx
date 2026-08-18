import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { HeartHandshake, X, Clock } from "lucide-react";
import { ultimaAusenciaFn } from "@/lib/presencia.functions";

function formatoAusencia(horas: number) {
  const dias = Math.floor(horas / 24);
  const rest = Math.round(horas - dias * 24);
  if (dias >= 1) return `${dias} ${dias === 1 ? "día" : "días"}${rest > 0 ? ` y ${rest} h` : ""}`;
  return `${Math.round(horas)} horas`;
}

/** Ventana flotante que saluda al estudiante que lleva más de 72 h sin conectarse. */
export function AusenciaDialog() {
  const [abierto, setAbierto] = useState(false);
  const { data } = useQuery({
    queryKey: ["ausencia"],
    queryFn: () => ultimaAusenciaFn(),
    staleTime: 5 * 60_000,
  });

  useEffect(() => {
    const horas = (data as any)?.horas ?? 0;
    if (horas < 72) return;
    if (typeof sessionStorage === "undefined") return;
    if (sessionStorage.getItem("ausencia-avisada")) return;
    sessionStorage.setItem("ausencia-avisada", "1");
    setAbierto(true);
  }, [data]);

  if (!abierto) return null;
  const horas = (data as any)?.horas ?? 0;
  const ultima = (data as any)?.ultima as string | null;

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-background/70 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border bg-gradient-card p-6 shadow-strong">
        <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-gradient-to-br from-fuchsia-400/40 to-cyan-400/40 blur-2xl" />
        <button
          onClick={() => setAbierto(false)}
          className="absolute right-3 top-3 rounded-full border p-1.5 hover:bg-secondary"
          aria-label="Cerrar"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="relative">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-fuchsia-500 to-cyan-500 text-white shadow-soft">
            <HeartHandshake className="h-7 w-7" />
          </div>
          <h2 className="mt-4 text-2xl font-extrabold">¡Te extrañábamos!</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Llevas <strong className="text-foreground">{formatoAusencia(horas)}</strong> sin conectarte
            {ultima && (
              <>
                {" "}
                (última vez el{" "}
                {new Date(ultima).toLocaleString("es-EC", { dateStyle: "medium", timeStyle: "short" })})
              </>
            )}
            . Retomar hoy 15 minutos de práctica te ayuda a recuperar el ritmo.
          </p>
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-secondary/60 px-3 py-2 text-xs text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>La constancia diaria mejora tu puntaje INEVAL.</span>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link
              to="/practicar"
              onClick={() => setAbierto(false)}
              className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              Practicar ahora
            </Link>
            <Link
              to="/biblioteca"
              onClick={() => setAbierto(false)}
              className="rounded-full border px-4 py-2 text-sm font-semibold hover:bg-secondary"
            >
              Ver biblioteca
            </Link>
            <button
              onClick={() => setAbierto(false)}
              className="rounded-full px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary"
            >
              Más tarde
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

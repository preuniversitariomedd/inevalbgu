import { ShieldAlert, AlertTriangle, Maximize, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NOMBRE_INFRACCION, MAX_AVISOS } from "@/lib/antifraude";
import type { useExamGuard } from "@/hooks/use-exam-guard";

type Guard = ReturnType<typeof useExamGuard>;

export function ReglasEvaluacion({ titulo, guard, onIniciar, onCancelar }: { titulo: string; guard: Guard; onIniciar: () => void; onCancelar: () => void }) {
  if (guard.bloqueadoHasta) {
    return (
      <div className="mx-auto max-w-xl px-5 py-10">
        <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-6 text-center">
          <Lock className="mx-auto h-10 w-10 text-destructive" />
          <h2 className="mt-3 text-xl font-extrabold">Evaluación bloqueada</h2>
          <p className="mt-2 text-sm">Tu última evaluación se cerró por infracciones. No puedes volver a esta evaluación durante 24 horas. Podrás ingresar de nuevo el {new Date(guard.bloqueadoHasta).toLocaleString("es-EC")}.</p>
          <Button className="mt-5" variant="outline" onClick={onCancelar}>Volver</Button>
        </div>
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-xl px-5 py-10">
      <div className="rounded-2xl border bg-card p-6 shadow-soft">
        <ShieldAlert className="h-10 w-10 text-primary" />
        <h2 className="mt-3 text-2xl font-extrabold">{titulo}: reglas</h2>
        <ul className="mt-4 space-y-2 text-sm">
          <li>• La evaluación se hace en <strong>pantalla completa</strong>.</li>
          <li>• No cambies de pestaña ni de aplicación, ni salgas de la ventana.</li>
          <li>• Copiar, pegar y el clic derecho están prohibidos.</li>
          <li>• Recibirás {MAX_AVISOS} avisos. A la <strong>cuarta infracción</strong> la prueba se cierra, se califica con lo que respondiste y no podrás volver a entrar durante 24 horas.</li>
          <li>• Recargar la página no borra tus infracciones.</li>
          <li>• Tras un cierre por infracciones, <strong>no podrás volver a esta evaluación durante 24 horas</strong>.</li>
          <li>• En Conocimiento y Razonamiento la regla aplica por cada <strong>ronda de 10 preguntas</strong>. La nota del cierre es el porcentaje de aciertos de esa ronda, sobre 10.</li>
        </ul>
        <div className="mt-6 flex gap-2">
          <Button variant="outline" onClick={onCancelar}>Cancelar</Button>
          <Button className="flex-1" disabled={guard.iniciando} onClick={async () => { if (await guard.iniciar()) onIniciar(); }}>
            <Maximize className="h-4 w-4" /> {guard.iniciando ? "Preparando…" : "Iniciar Evaluación"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function AvisoExamen({ guard, resultado }: { guard: Guard; resultado?: string }) {
  const a = guard.aviso;
  if (!a) return null;
  const ultima = a.numero >= MAX_AVISOS && !a.cerrado;
  const rojo = ultima || a.cerrado;
  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-background/80 p-4 backdrop-blur-sm" role="alertdialog">
      <div className={`w-full max-w-md rounded-2xl border-2 p-6 shadow-soft ${rojo ? "border-destructive bg-destructive/10" : "border-accent bg-card"}`}>
        <AlertTriangle className={`h-10 w-10 ${rojo ? "text-destructive" : "text-accent-foreground"}`} />
        <h2 className={`mt-3 text-xl font-extrabold ${rojo ? "text-destructive" : ""}`}>
          {a.cerrado ? "Prueba cerrada" : ultima ? "ÚLTIMA ADVERTENCIA" : `Infracción ${a.numero} de ${MAX_AVISOS}`}
        </h2>
        <p className="mt-2 text-sm">Detectamos: <strong>{NOMBRE_INFRACCION[a.tipo]}</strong>.</p>
        {a.cerrado ? (<>
          <p className="mt-2 text-sm">Cometiste 4 infracciones. Tu prueba se calificó con las respuestas registradas hasta ahora.{resultado ? <> Nota: <strong>{resultado}</strong>.</> : null}</p>
          <p className="mt-2 text-sm font-semibold text-destructive">No podrás volver a esta evaluación durante 24 horas.</p>
          <p className="mt-1 text-xs text-muted-foreground">En Conocimiento y Razonamiento la regla aplica por cada ronda de 10 preguntas; la nota del cierre es el porcentaje de aciertos de esa ronda, sobre 10.</p>
        </>) : ultima ? (
          <p className="mt-2 text-sm font-semibold text-destructive">Infracción 3 de 3. La próxima infracción cerrará tu prueba.</p>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">Vuelve a la evaluación y mantén la pantalla completa.</p>
        )}
        <Button className="mt-5 w-full" variant={rojo ? "destructive" : "default"} onClick={guard.cerrarAviso}>
          {a.cerrado ? "Ver mi nota" : "Volver a la evaluación"}
        </Button>
      </div>
    </div>
  );
}

import { useState } from "react";
import { Check, X } from "lucide-react";
import type { Pregunta } from "@/data/tipos";
import { cn } from "@/lib/utils";

interface Props {
  pregunta: Pregunta;
  mostrarFeedback?: boolean; // false en simulacro
  onResponder: (correcta: boolean, indice: number) => void;
  onSiguiente: () => void;
  esUltima?: boolean;
}

export function PreguntaCard({ pregunta, mostrarFeedback = true, onResponder, onSiguiente, esUltima }: Props) {
  const [seleccion, setSeleccion] = useState<number | null>(null);
  const [confirmada, setConfirmada] = useState(false);

  function confirmar() {
    if (seleccion === null) return;
    const ok = seleccion === pregunta.respuestaCorrecta;
    setConfirmada(true);
    onResponder(ok, seleccion);
  }

  function siguiente() {
    setSeleccion(null);
    setConfirmada(false);
    onSiguiente();
  }

  const correcta = seleccion === pregunta.respuestaCorrecta;

  return (
    <div className="rounded-2xl border bg-gradient-card p-5 shadow-soft sm:p-7">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-full bg-secondary px-2.5 py-1 font-semibold text-secondary-foreground">{pregunta.tema}</span>
        <span className="rounded-full bg-accent px-2.5 py-1 font-medium text-accent-foreground">{pregunta.subtema}</span>
        <span className="rounded-full border px-2.5 py-1 font-medium">{pregunta.nivel}</span>
      </div>

      <p className="mt-4 whitespace-pre-line text-base font-medium leading-relaxed sm:text-lg">
        {pregunta.enunciado}
      </p>

      <div className="mt-5 grid gap-2.5">
        {pregunta.opciones.map((op, i) => {
          const seleccionada = seleccion === i;
          const esCorrectaResp = i === pregunta.respuestaCorrecta;
          let cls = "border-border bg-card hover:border-primary/60 hover:bg-secondary/40";
          if (confirmada && mostrarFeedback) {
            if (esCorrectaResp) cls = "border-success bg-success/10";
            else if (seleccionada) cls = "border-destructive bg-destructive/10";
            else cls = "border-border bg-card opacity-60";
          } else if (seleccionada) {
            cls = "border-primary bg-primary/10";
          }
          return (
            <button
              key={i}
              disabled={confirmada}
              onClick={() => setSeleccion(i)}
              className={cn(
                "flex items-start gap-3 rounded-xl border-2 px-4 py-3 text-left text-sm font-medium transition sm:text-base",
                cls,
                "disabled:cursor-not-allowed"
              )}
            >
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold">
                {String.fromCharCode(65 + i)}
              </span>
              <span className="font-math">{op}</span>
              {confirmada && mostrarFeedback && esCorrectaResp && <Check className="ml-auto h-5 w-5 text-success" />}
              {confirmada && mostrarFeedback && seleccionada && !esCorrectaResp && <X className="ml-auto h-5 w-5 text-destructive" />}
            </button>
          );
        })}
      </div>

      {confirmada && mostrarFeedback && (
        <div className={cn(
          "mt-5 rounded-xl border-2 p-4 animate-pop",
          correcta ? "border-success bg-success/10" : "border-destructive bg-destructive/10"
        )}>
          <div className="flex items-center gap-2 font-bold">
            {correcta ? <><Check className="h-5 w-5 text-success" /> ¡Correcto!</> : <><X className="h-5 w-5 text-destructive" /> Incorrecto</>}
          </div>
          <p className="mt-2 text-sm leading-relaxed">{pregunta.explicacion}</p>
        </div>
      )}

      <div className="mt-5 flex justify-end gap-2">
        {!confirmada ? (
          <button
            onClick={confirmar}
            disabled={seleccion === null}
            className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft transition hover:bg-primary/90 disabled:opacity-40"
          >
            Confirmar respuesta
          </button>
        ) : (
          <button
            onClick={siguiente}
            className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft transition hover:bg-primary/90"
          >
            {esUltima ? "Ver resultado" : "Siguiente pregunta →"}
          </button>
        )}
        {/* Simulacro: hay que avanzar sin confirmar feedback */}
        {!mostrarFeedback && !confirmada && (
          <button
            onClick={() => { confirmar(); setTimeout(siguiente, 50); }}
            disabled={seleccion === null}
            className="hidden"
          >Avanzar</button>
        )}
      </div>
    </div>
  );
}

import { Info } from "lucide-react";

export function GuiaNiveles() {
  return (
    <div className="mt-4 flex items-start gap-2 rounded-2xl border border-primary/40 bg-primary/5 p-4 text-sm">
      <Info className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
      <div>
        <p className="font-bold">¿Cómo funcionan los niveles?</p>
        <p className="mt-1">Cada nivel se supera acumulando preguntas correctas a lo largo de varias <strong>rondas de 10 preguntas</strong>.</p>
        <p className="mt-1">Al terminar una ronda, tus aciertos se suman automáticamente a tu meta. Terminar una ronda <strong>no reinicia tu avance ni significa que ya acabaste el nivel</strong>: continúa haciendo rondas hasta llenar tu barra de avance.</p>
      </div>
    </div>
  );
}

export function EstadoNivel({ correctas, intentadas, meta, nivel }: { correctas: number; intentadas: number; meta: number; nivel: number }) {
  const falta = Math.max(0, meta - correctas);
  return (
    <p className="text-sm">
      Llevas <strong>{correctas}</strong> preguntas correctas de <strong>{Math.max(intentadas, correctas)}</strong> intentadas.{" "}
      {falta > 0
        ? <>Para obtener el pase{nivel < 3 ? ` al Nivel ${nivel + 1}` : ""} debes contestar correctamente <strong>{meta}</strong> (te faltan {falta}).</>
        : <>¡Ya alcanzaste la meta de este nivel!</>}
    </p>
  );
}

export function BarraNivel({ correctas, meta, nivel }: { correctas: number; meta: number; nivel: number }) {
  const pct = Math.min(100, Math.round((correctas / Math.max(1, meta)) * 100));
  const falta = Math.max(0, meta - correctas);
  return (
    <div className="mt-3">
      <div className="flex justify-between text-xs font-semibold"><span>Avance</span><span>{pct} %</span></div>
      <div className="mt-1 h-3 overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        {falta > 0
          ? nivel < 3 ? `Te faltan ${falta} aciertos para desbloquear el Nivel ${nivel + 1}.` : `Te faltan ${falta} aciertos para aprobar este nivel.`
          : nivel < 3 ? "¡Nivel aprobado! Siguiente nivel desbloqueado." : "¡Nivel aprobado!"}
      </p>
    </div>
  );
}

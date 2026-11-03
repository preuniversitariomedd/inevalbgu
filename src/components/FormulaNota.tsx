import { PESOS_DEFAULT } from '@/lib/grupo-config';
export function FormulaNota({ compacta = false }: { compacta?: boolean }) {
  return <div className={compacta ? 'flex flex-wrap justify-center gap-3 text-xs font-semibold text-muted-foreground' : 'my-3 space-y-2 border-l-2 border-primary bg-secondary/40 p-3 text-sm'}>
    {!compacta && <p className="font-semibold">Ponderación oficial · Nota sobre 10</p>}
    <div className="flex flex-wrap gap-x-4 gap-y-1"><span>{PESOS_DEFAULT.conocimiento}% Conocimiento</span><span>{PESOS_DEFAULT.razonamiento}% Razonamiento</span><span>{PESOS_DEFAULT.simulacro}% Simulacro</span></div>
    {!compacta && <p className="text-xs text-muted-foreground">Conocimiento: hasta 4 puntos; Razonamiento y Simulacro: hasta 3 cada uno. Un apartado desactivado no aporta puntos y sus porcentajes no se redistribuyen.</p>}
  </div>;
}

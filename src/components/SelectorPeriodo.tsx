import { etiquetaPeriodo, type Periodo } from '@/lib/periodos';
import { CalendarDays } from 'lucide-react';
export function SelectorPeriodo({ periodos, value, onChange }: { periodos: Periodo[]; value: string; onChange: (id: string) => void }) {
  return <label className="flex min-w-0 flex-wrap items-center gap-2 text-sm font-semibold"><CalendarDays className="h-4 w-4" /> Período
    <select aria-label="Período de calificación" className="max-w-full min-w-0 rounded-md border bg-background px-2 py-2 font-normal" value={value} onChange={e => onChange(e.target.value)}>
      <option value="">Todo el historial</option>
      {periodos.map(p => <option key={p.id} value={p.id}>{etiquetaPeriodo(p)}</option>)}
    </select>
  </label>;
}

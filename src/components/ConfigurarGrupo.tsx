import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { leerConfiguracionGrupoFn, guardarConfiguracionGrupoFn } from '@/lib/grupo-config.functions';
import { MODULOS, PARTES, validarPesos, type Modulos, type Pesos, type Modulo, type Parte } from '@/lib/grupo-config';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Settings2, ArrowLeft, Save } from 'lucide-react';
import { toast } from 'sonner';
export function ConfigurarGrupo({ grupoId, nombre }: { grupoId: string; nombre: string }) {
  const [open, setOpen] = useState(false);
  return <><Button variant="outline" size="sm" onClick={() => setOpen(true)}><Settings2 className="h-4 w-4"/>Accesos y nota</Button><Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl"><DialogHeader><DialogTitle>Accesos y nota · {nombre}</DialogTitle></DialogHeader>{open && <Editor key={grupoId} grupoId={grupoId} cerrar={() => setOpen(false)}/>}</DialogContent></Dialog></>;
}
function Editor({ grupoId, cerrar }: { grupoId: string; cerrar: () => void }) {
  const leer = useServerFn(leerConfiguracionGrupoFn);
  const q = useQuery({ queryKey: ['config-grupo', grupoId], queryFn: () => leer({ data: { grupoId } }) });
  if (!q.data) return <p role="status">{q.error ? 'No se pudo cargar la configuración.' : 'Cargando…'}</p>;
  return <Formulario grupoId={grupoId} inicial={q.data} cerrar={cerrar}/>;
}
function Formulario({ grupoId, inicial, cerrar }: { grupoId: string; inicial: { modulos: Modulos; ponderaciones: Pesos }; cerrar: () => void }) {
  const [modulos, setModulos] = useState(inicial.modulos);
  const [pesos, setPesos] = useState(inicial.ponderaciones);
  const [paso, setPaso] = useState(1);
  const [saving, setSaving] = useState(false);
  const guardar = useServerFn(guardarConfiguracionGrupoFn);
  const qc = useQueryClient();
  const activos = (Object.keys(PARTES) as Parte[]).filter(k => k === 'plataforma' || modulos[k]);
  const total = Object.values(pesos).reduce((a,b) => a+b,0);
  async function save() {
    try { validarPesos(modulos, pesos); setSaving(true); await guardar({ data: { grupoId, modulos, ponderaciones: pesos } }); await qc.invalidateQueries(); toast.success('Accesos y porcentajes guardados.'); cerrar(); }
    catch(e) { toast.error(e instanceof Error ? e.message : 'No se pudo guardar.'); } finally { setSaving(false); }
  }
  return <div className="space-y-4">{paso === 1 ? <><h3 className="font-semibold">Apartados activos</h3><div className="grid gap-3 sm:grid-cols-2">{(Object.entries(MODULOS) as [Modulo,string][]).map(([k,label]) => <label key={k} className="flex items-center gap-2"><Checkbox checked={modulos[k]} onCheckedChange={v => { const enabled = v === true; setModulos(m => ({ ...m, [k]: enabled })); if (k in PARTES && !enabled) setPesos(p => ({ ...p, [k]: 0 })); }}/>{label}</label>)}</div><p className="text-xs text-muted-foreground">Si un estudiante pertenece a varios grupos, un apartado desactivado en cualquiera de ellos permanece bloqueado.</p><Button onClick={() => setPaso(2)}>Continuar: calcular nota final</Button></> : <><h3 className="font-semibold">¿Cómo calcular la nota final sobre 10?</h3><div className="space-y-3">{activos.map(k => <label key={k} className="flex items-center justify-between gap-3"><span>{PARTES[k]}</span><span className="flex items-center gap-2"><Input aria-label={`Porcentaje ${PARTES[k]}`} className="w-24" type="number" min="0" max="100" step="1" value={pesos[k]} onChange={e => setPesos(p => ({ ...p, [k]: Number(e.target.value) }))}/>%</span></label>)}</div><p className={total === 100 ? 'font-semibold text-primary' : 'font-semibold text-destructive'}>Total: {total}% / 100%</p><p className="text-xs text-muted-foreground">Prácticas se califica por el porcentaje de respuestas correctas. Los apartados sin evaluación propia no añaden puntos; su uso cuenta como tiempo real en plataforma. Conocimiento y Razonamiento conservan sus metas por nivel.</p><div className="flex justify-between gap-2"><Button variant="outline" onClick={() => setPaso(1)}><ArrowLeft className="h-4 w-4"/>Accesos</Button><Button disabled={saving || total !== 100} onClick={save}><Save className="h-4 w-4"/>{saving ? 'Guardando…' : 'Guardar accesos y nota'}</Button></div></>}</div>;
}
import { FormulaNota } from './FormulaNota';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { leerConfiguracionGrupoFn, guardarConfiguracionGrupoFn } from '@/lib/grupo-config.functions';
import { MODULOS, PESOS_DEFAULT, type Modulos, type Pesos, type Modulo } from '@/lib/grupo-config';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Settings2, Save } from 'lucide-react';
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
  const [saving, setSaving] = useState(false);
  const guardar = useServerFn(guardarConfiguracionGrupoFn);
  const qc = useQueryClient();
  async function save() {
    setSaving(true);
    try { await guardar({ data: { grupoId, modulos, ponderaciones: PESOS_DEFAULT } }); await qc.invalidateQueries({ queryKey: ['mis-accesos'] }); await qc.invalidateQueries({ queryKey: ['config-grupo', grupoId] }); toast.success('Accesos guardados; se mantiene la fórmula oficial 40/30/30.'); cerrar(); }
    catch(e) { toast.error(e instanceof Error ? e.message : 'No se pudo guardar.'); } finally { setSaving(false); }
  }
  return <div className="space-y-4"><h3 className="font-semibold">Apartados activos</h3><div className="grid gap-3 sm:grid-cols-2">{(Object.entries(MODULOS) as [Modulo,string][]).map(([k,label]) => <label key={k} className="flex items-center gap-2"><Checkbox checked={modulos[k]} onCheckedChange={v => setModulos(m => ({ ...m, [k]: v === true }))}/>{label}</label>)}</div><FormulaNota/><p className="text-xs text-muted-foreground">Un apartado desactivado en cualquiera de los grupos del estudiante permanece bloqueado.</p><Button disabled={saving} onClick={save}><Save className="h-4 w-4"/>{saving ? 'Guardando…' : 'Guardar accesos'}</Button></div>;
}

import { useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { prepararReinicioFn, reiniciarEstudiantesFn, listarRespaldosFn, descargarRespaldoFn } from '@/lib/reinicio.functions';
import { CONFIRMACION_REINICIO } from '@/lib/reinicio-reglas';
import { descargarRespaldo } from '@/lib/descargar-respaldo';
import { CONSULTA_MANUAL } from '@/lib/consulta-politicas';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Checkbox } from './ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { RotateCcw, Download, Loader2, Archive } from 'lucide-react';
import { toast } from 'sonner';

export function ReiniciarEstudiantes() {
  const [open,setOpen] = useState(false);
  const [historial,setHistorial] = useState(false);
  const [paso,setPaso] = useState(1);
  const [texto,setTexto] = useState('');
  const [guardado,setGuardado] = useState(false);
  const [blob,setBlob] = useState<Blob | null>(null);
  const [descargado,setDescargado] = useState(false);
  const qc = useQueryClient();
  const preparar = useServerFn(prepararReinicioFn), reiniciar = useServerFn(reiniciarEstudiantesFn);
  const listar = useServerFn(listarRespaldosFn), leer = useServerFn(descargarRespaldoFn);
  const q = useQuery({ queryKey:['respaldos-academicos'], queryFn:()=>listar(), enabled:historial, ...CONSULTA_MANUAL });
  const [copia,setCopia] = useState<{id:string;blob:Blob}|null>(null);
  const recuperar = useMutation({ mutationFn:(id:string)=>leer({data:{id}}), onSuccess:b=>setCopia({id:b.id,blob:new Blob([JSON.stringify(b,null,2)],{type:'application/json;charset=utf-8'})}) });
  const prep = useMutation({ mutationFn:()=>preparar(), onSuccess:b=>{setBlob(new Blob([JSON.stringify(b.archivo,null,2)],{type:'application/json;charset=utf-8'})); void qc.invalidateQueries({queryKey:['respaldos-academicos']});} });
  const reset = useMutation({ mutationFn:()=> {
    if (!prep.data) throw new Error('Prepara el respaldo primero.');
    return reiniciar({data:{respaldoId:prep.data.id,huella:prep.data.huella,confirmacion:texto,descargado:descargado && guardado}});
  }, onSuccess:async()=>{ setOpen(false); toast.success('Notas y avances reiniciados; respaldo histórico conservado.'); for(const k of ['calificaciones','calificacion','progreso','respaldos-academicos','periodos']) await qc.invalidateQueries({queryKey:[k]}); } });
  const busy = prep.isPending || reset.isPending;
  function abrir(){setPaso(1);setTexto('');setGuardado(false);setDescargado(false);setBlob(null);prep.reset();reset.reset();setOpen(true);}
  return <>
    <div className="flex flex-wrap gap-2">
      <Button variant="destructive" onClick={abrir}><RotateCcw className="h-4 w-4"/>Reiniciar notas y avances de estudiantes</Button>
      <Button variant="outline" onClick={()=>setHistorial(true)}><Archive className="h-4 w-4"/>Respaldos anteriores</Button>
    </div>
    <Dialog open={open} onOpenChange={v=>{if(!busy)setOpen(v);}}><DialogContent className="max-h-[85vh] overflow-y-auto"><DialogHeader><DialogTitle>{paso===1?'1 de 2 · Respaldo antes del reinicio':'2 de 2 · Confirmar reinicio'}</DialogTitle></DialogHeader>
      <p className="text-sm">Afecta a todos los estudiantes, no solo al grupo o período seleccionado. Las cuentas, grupos, archivos compartidos y conversaciones se conservan. El respaldo anterior queda disponible solo para administradores.</p>
      <p className="text-sm text-muted-foreground">Se borran notas, avances y todos los períodos de calificación. Si algún estudiante está conectado, verá un aviso de "Reinicio de notas" y su avance también se borra; su actividad más reciente queda guardada en una copia final automática dentro de Respaldos anteriores.</p>
      {paso===1 ? <><p className="text-sm">Se respaldan respuestas, simulacros, avances, conexiones, encuestas y actividad en tareas, biblioteca y competencias. Los avances antiguos de Sistemas guardados únicamente en un dispositivo no se pueden incluir.</p>
        {!blob ? <Button disabled={busy} onClick={()=>prep.mutate()}>{prep.isPending?<Loader2 className="h-4 w-4 animate-spin"/>:<Archive className="h-4 w-4"/>}Preparar respaldo JSON</Button> : <><p className="text-sm font-semibold">{prep.data?.total} estudiantes · Respaldo preparado</p><Button onClick={()=>{if(!blob || !prep.data)return;descargarRespaldo(blob,`respaldo-academico-${prep.data.id}.json`);setDescargado(true);setPaso(2);}}><Download className="h-4 w-4"/>Descargar respaldo y continuar</Button></>}
      </> : <><label className="flex items-start gap-2 text-sm"><Checkbox checked={guardado} onCheckedChange={v=>setGuardado(v===true)}/>Confirmo que guardé el archivo de respaldo en mi dispositivo.</label><label className="space-y-2 text-sm"><span>Escribe <strong>{CONFIRMACION_REINICIO}</strong></span><Input aria-label="Confirmación de reinicio" value={texto} onChange={e=>setTexto(e.target.value)}/></label><Button variant="destructive" disabled={busy || !guardado || texto!==CONFIRMACION_REINICIO} onClick={()=>reset.mutate()}>{reset.isPending?<Loader2 className="h-4 w-4 animate-spin"/>:<RotateCcw className="h-4 w-4"/>}Confirmar reinicio de todos los estudiantes</Button></>}
      {(prep.error || reset.error) && <p role="alert" className="text-sm text-destructive">{(prep.error || reset.error)?.message}</p>}
      <Button variant="ghost" disabled={busy} onClick={()=>setOpen(false)}>Cancelar</Button>
    </DialogContent></Dialog>
    <Dialog open={historial} onOpenChange={setHistorial}><DialogContent className="max-h-[85vh] overflow-y-auto"><DialogHeader><DialogTitle>Respaldos académicos anteriores</DialogTitle></DialogHeader>
      {q.isFetching && <p>Cargando…</p>}{q.error && <p role="alert" className="text-sm text-destructive">{q.error.message}</p>}
      {(q.data??[]).map(b=><div key={b.id} className="flex flex-wrap items-center justify-between gap-2 border-b py-3 text-sm"><span>{new Date(b.creado_en).toLocaleString('es-EC')} · {b.reiniciado_en?'Reiniciado':'Sin reinicio'}</span>{copia?.id===b.id?<Button variant="outline" size="sm" onClick={()=>descargarRespaldo(copia.blob,`respaldo-academico-${b.id}.json`)}><Download className="h-4 w-4"/>Descargar JSON</Button>:<Button variant="outline" size="sm" disabled={recuperar.isPending} onClick={()=>recuperar.mutate(b.id)}>Preparar descarga</Button>}</div>)}
      {recuperar.error && <p role="alert" className="text-destructive">{recuperar.error.message}</p>}
      {q.data?.length===0 && <p className="text-sm text-muted-foreground">Sin respaldos anteriores.</p>}
    </DialogContent></Dialog>
  </>;
}
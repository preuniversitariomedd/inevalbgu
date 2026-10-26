import { useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { informeCursoFn } from '@/lib/curso-informe.functions';
import { prepararInforme, descargarInforme } from '@/lib/curso-export';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Download, FileText, FileSpreadsheet, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
export function ExportarCurso({ grupoId, nombre }: { grupoId:string; nombre:string }) {
  const [open,setOpen] = useState(false);
  const [busy,setBusy] = useState(false);
  const [formato,setFormato] = useState<'pdf'|'excel'>('excel');
  const [archivo,setArchivo] = useState<{ blob:Blob; nombre:string }|null>(null);
  const obtener = useServerFn(informeCursoFn);
  async function preparar() {
    setBusy(true); setArchivo(null);
    try { const informe = await obtener({ data:{ grupoId } }); const blob = await prepararInforme(informe,formato); setArchivo({ blob,nombre:`curso-${nombre.replace(/[^a-zA-Z0-9áéíóúñ-]/g,'_')}.${formato === 'excel' ? 'xlsx':'pdf'}` }); }
    catch(e) { toast.error(e instanceof Error ? e.message:'No se pudo preparar el informe.'); } finally { setBusy(false); }
  }
  return <><Button variant="outline" size="sm" onClick={() => { setOpen(true); setArchivo(null); }}><Download className="h-4 w-4"/>Informe completo</Button><Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogHeader><DialogTitle>Informe completo · {nombre}</DialogTitle></DialogHeader><p className="text-sm text-muted-foreground">Todos los datos guardados de los miembros actuales: fichas, notas históricas y por período, respuestas, sesiones, tiempos, alertas, encuestas, tareas, biblioteca, competencias y tutor personal.</p><p className="text-xs text-muted-foreground">Sin contraseñas, PIN ni mensajes privados entre usuarios. Los adjuntos incluyen sus datos, no los archivos originales. Documento confidencial.</p><div className="flex gap-2"><Button variant={formato === 'excel' ? 'default':'outline'} disabled={busy} onClick={() => { setFormato('excel');setArchivo(null); }}><FileSpreadsheet className="h-4 w-4"/>Excel</Button><Button variant={formato === 'pdf' ? 'default':'outline'} disabled={busy} onClick={() => { setFormato('pdf');setArchivo(null); }}><FileText className="h-4 w-4"/>PDF</Button></div>{archivo ? <Button onClick={() => descargarInforme(archivo.blob,archivo.nombre)}><Download className="h-4 w-4"/>Descargar {formato === 'excel' ? 'Excel':'PDF'}</Button> : <Button disabled={busy} onClick={preparar}>{busy && <Loader2 className="h-4 w-4 animate-spin"/>}{busy ? 'Preparando informe…':'Preparar informe'}</Button>}</DialogContent></Dialog></>;
}
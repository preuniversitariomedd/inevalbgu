import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { leerVisibilidadFn, guardarVisibilidadFn } from '@/lib/visibilidad.functions';
import { APARTADOS_GLOBALES, type ApartadoGlobal } from '@/lib/visibilidad';
export function VisibilidadApartados() {
  const leer = useServerFn(leerVisibilidadFn);
  const guardar = useServerFn(guardarVisibilidadFn);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['visibilidad-global'], queryFn: () => leer(), staleTime: Infinity, refetchInterval: false, refetchOnWindowFocus: false });
  const mut = useMutation({ mutationFn: (data: { apartado: ApartadoGlobal; visible: boolean }) => guardar({ data }), onSuccess: async () => { await Promise.all([qc.invalidateQueries({ queryKey: ['visibilidad-global'] }), qc.invalidateQueries({ queryKey: ['mis-accesos'] })]); toast.success('Visibilidad actualizada para todos los estudiantes.'); }, onError: (e: Error) => toast.error(e.message) });
  return <section className="space-y-3 border-b pb-5"><h2 className="text-lg font-bold">Apartados visibles para todos los estudiantes</h2>{!q.data ? <p role="status">{q.error ? 'No se pudo cargar la visibilidad.' : 'Cargando…'}</p> : <ul className="divide-y">{(Object.entries(APARTADOS_GLOBALES) as [ApartadoGlobal, string][]).map(([apartado, nombre]) => { const visible = q.data[apartado] !== false; const label = `${visible ? 'Ocultar' : 'Mostrar'} ${nombre}`; return <li key={apartado} className="flex items-center justify-between gap-3 py-3"><span className="font-medium">{nombre}</span><div className="flex items-center gap-3"><span className="text-sm text-muted-foreground">{visible ? 'Visible' : 'Oculto'}</span><Button size="icon" variant="outline" title={label} aria-label={label} aria-pressed={visible} disabled={mut.isPending} onClick={() => mut.mutate({ apartado, visible: !visible })}>{mut.isPending && mut.variables?.apartado === apartado ? <Loader2 className="h-4 w-4 animate-spin"/> : visible ? <Eye className="h-4 w-4"/> : <EyeOff className="h-4 w-4"/>}</Button></div></li>; })}</ul>}</section>;
}
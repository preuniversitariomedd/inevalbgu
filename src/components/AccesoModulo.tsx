import { createContext, useContext, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { useLocation, Link } from '@tanstack/react-router';
import { misAccesosFn } from '@/lib/grupo-config.functions';
import { MODULOS, MODULOS_DEFAULT, moduloDeRuta, type Modulos } from '@/lib/grupo-config';
import { LockKeyhole } from 'lucide-react';
const AccesosContext = createContext<Modulos>(MODULOS_DEFAULT);
export function useAccesos() { return useContext(AccesosContext); }
export function AccesoModulo({ children, soloContexto = false }: { children: ReactNode; soloContexto?: boolean }) {
  const fetchAccesos = useServerFn(misAccesosFn);
  const q = useQuery({ queryKey: ['mis-accesos'], queryFn: () => fetchAccesos(), refetchInterval: 15000, refetchOnWindowFocus: true });
  const { pathname } = useLocation();
  const modulo = moduloDeRuta(pathname);
  if (!q.data) return <p role="status" className="mx-auto max-w-5xl p-6">{q.error ? 'No se pudo verificar el acceso. Intenta nuevamente.' : 'Cargando accesos…'}</p>;
  const bloqueado = !soloContexto && modulo && !q.data.modulos[modulo];
  return <AccesosContext.Provider value={q.data.modulos}>{bloqueado ? <main className="mx-auto max-w-5xl space-y-3 px-5 py-12"><LockKeyhole className="h-8 w-8 text-muted-foreground"/><h1 className="text-2xl font-bold">{MODULOS[modulo]} no está habilitado</h1><p className="text-muted-foreground">Consulta con tu administrador los apartados asignados a tu grupo.</p><Link to="/" className="text-primary underline">Volver al inicio</Link></main> : children}</AccesosContext.Provider>;
}
export function ContenidoModulo({ children }: { children: ReactNode }) {
  const modulos = useAccesos();
  const { pathname } = useLocation();
  const modulo = moduloDeRuta(pathname);
  if (modulo && !modulos[modulo]) return <main className="mx-auto max-w-5xl space-y-3 px-5 py-12"><LockKeyhole className="h-8 w-8 text-muted-foreground"/><h1 className="text-2xl font-bold">{MODULOS[modulo]} no está habilitado</h1><Link to="/" className="text-primary underline">Volver al inicio</Link></main>;
  return children;
}
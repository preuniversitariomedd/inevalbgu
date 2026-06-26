import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  crearEstudianteFn,
  editarEstudianteFn,
  eliminarEstudianteFn,
  listarEstudiantesFn,
  resetPasswordEstudianteFn,
  toggleBloqueoEstudianteFn,
  listarGruposFn,
  asignarEstudiantesAGrupoFn,
} from "@/lib/admin.functions";
import { validarCedulaEcuatoriana } from "@/lib/cedula";
import { calcularEdad } from "@/lib/edad";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  UserPlus,
  Pencil,
  Trash2,
  KeyRound,
  Lock,
  LockOpen,
  Search,
  Copy,
  Loader2,
  Eye,
  Users,
  X,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({ meta: [{ title: "Estudiantes — Admin" }] }),
  component: AdminEstudiantes,
});

type Genero = "masculino" | "femenino" | "otro";
type Estudiante = {
  id: string;
  cedula: string;
  nombres: string;
  institucion: string;
  fecha_nacimiento: string;
  genero: Genero | null;
  primera_vez: boolean;
  bloqueado: boolean;
  created_at: string;
  grupos: { id: string; nombre: string }[];
};

type FormData = {
  cedula: string;
  nombres: string;
  institucion: string;
  fechaNacimiento: string;
  genero: Genero | "";
};

const FORM_INICIAL: FormData = {
  cedula: "",
  nombres: "",
  institucion: "",
  fechaNacimiento: "",
  genero: "",
};

function AdminEstudiantes() {
  const qc = useQueryClient();
  const listar = useServerFn(listarEstudiantesFn);
  const listarGrupos = useServerFn(listarGruposFn);
  const crear = useServerFn(crearEstudianteFn);
  const editar = useServerFn(editarEstudianteFn);
  const eliminar = useServerFn(eliminarEstudianteFn);
  const resetear = useServerFn(resetPasswordEstudianteFn);
  const toggleBloqueo = useServerFn(toggleBloqueoEstudianteFn);
  const asignarGrupo = useServerFn(asignarEstudiantesAGrupoFn);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "estudiantes"],
    queryFn: () => listar(),
  });
  const { data: grupos } = useQuery({
    queryKey: ["admin", "grupos"],
    queryFn: () => listarGrupos(),
  });

  const [busqueda, setBusqueda] = useState("");
  const [filtroGeneros, setFiltroGeneros] = useState<Genero[]>([]);
  const [filtroGrupos, setFiltroGrupos] = useState<string[]>([]);
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set());
  const [dialogoAbierto, setDialogoAbierto] = useState(false);
  const [modoEdicion, setModoEdicion] = useState<Estudiante | null>(null);
  const [form, setForm] = useState<FormData>(FORM_INICIAL);
  const [errores, setErrores] = useState<Partial<Record<keyof FormData, string>>>({});
  const [credencial, setCredencial] = useState<{ cedula: string; password: string } | null>(null);
  const [confirmarEliminar, setConfirmarEliminar] = useState<Estudiante | null>(null);
  const [confirmarReset, setConfirmarReset] = useState<Estudiante | null>(null);
  const [asignarOpen, setAsignarOpen] = useState(false);
  const [grupoElegido, setGrupoElegido] = useState<string>("");

  const estudiantes = useMemo<Estudiante[]>(() => (data as Estudiante[] | undefined) ?? [], [data]);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return estudiantes.filter((e) => {
      if (q && !(e.cedula.includes(q) || e.nombres.toLowerCase().includes(q) || e.institucion.toLowerCase().includes(q))) return false;
      if (filtroGeneros.length && (!e.genero || !filtroGeneros.includes(e.genero))) return false;
      if (filtroGrupos.length && !e.grupos.some((g) => filtroGrupos.includes(g.id))) return false;
      return true;
    });
  }, [estudiantes, busqueda, filtroGeneros, filtroGrupos]);

  function invalidar() {
    void qc.invalidateQueries({ queryKey: ["admin", "estudiantes"] });
  }
  function toggleGenero(g: Genero) {
    setFiltroGeneros((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]));
  }
  function toggleGrupo(id: string) {
    setFiltroGrupos((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }
  function toggleSel(id: string) {
    setSeleccion((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function toggleSelAll() {
    if (seleccion.size === filtrados.length) setSeleccion(new Set());
    else setSeleccion(new Set(filtrados.map((e) => e.id)));
  }

  function validarForm(): boolean {
    const e: Partial<Record<keyof FormData, string>> = {};
    const v = validarCedulaEcuatoriana(form.cedula);
    if (!v.valida) e.cedula = v.error;
    if (form.nombres.trim().length < 2) e.nombres = "Mínimo 2 caracteres.";
    if (form.institucion.trim().length < 1) e.institucion = "Obligatorio.";
    if (!form.genero) e.genero = "Selecciona un género.";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.fechaNacimiento)) {
      e.fechaNacimiento = "Fecha inválida.";
    } else {
      const f = new Date(form.fechaNacimiento + "T00:00:00");
      if (f > new Date()) e.fechaNacimiento = "No puede ser una fecha futura.";
      const edad = calcularEdad(form.fechaNacimiento).anios;
      if (edad < 10 || edad > 80) e.fechaNacimiento = "Edad fuera de rango razonable.";
    }
    setErrores(e);
    return Object.keys(e).length === 0;
  }

  const crearMut = useMutation({
    mutationFn: async (d: FormData) =>
      crear({
        data: {
          cedula: d.cedula,
          nombres: d.nombres.trim(),
          institucion: d.institucion.trim(),
          fechaNacimiento: d.fechaNacimiento,
          genero: d.genero as Genero,
        },
      }),
    onSuccess: (res) => {
      toast.success("Estudiante creado.");
      setCredencial({ cedula: res.cedula, password: res.passwordTemporal });
      setDialogoAbierto(false);
      setForm(FORM_INICIAL);
      invalidar();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const editarMut = useMutation({
    mutationFn: async (d: FormData & { userId: string }) =>
      editar({
        data: {
          userId: d.userId,
          nombres: d.nombres.trim(),
          institucion: d.institucion.trim(),
          fechaNacimiento: d.fechaNacimiento,
          genero: d.genero as Genero,
        },
      }),
    onSuccess: () => {
      toast.success("Cambios guardados.");
      setDialogoAbierto(false);
      setModoEdicion(null);
      setForm(FORM_INICIAL);
      invalidar();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const eliminarMut = useMutation({
    mutationFn: async (userId: string) => eliminar({ data: { userId } }),
    onSuccess: () => {
      toast.success("Estudiante eliminado.");
      setConfirmarEliminar(null);
      invalidar();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const resetMut = useMutation({
    mutationFn: async (userId: string) => resetear({ data: { userId } }),
    onSuccess: (res, userId) => {
      const est = estudiantes.find((e) => e.id === userId);
      toast.success("Contraseña reiniciada.");
      setCredencial({ cedula: est?.cedula ?? "", password: res.passwordTemporal });
      setConfirmarReset(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const bloquearMut = useMutation({
    mutationFn: async (p: { userId: string; bloqueado: boolean }) =>
      toggleBloqueo({ data: p }),
    onSuccess: (_d, vars) => {
      toast.success(vars.bloqueado ? "Estudiante bloqueado." : "Estudiante desbloqueado.");
      invalidar();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const asignarMut = useMutation({
    mutationFn: async () =>
      asignarGrupo({ data: { grupoId: grupoElegido, userIds: Array.from(seleccion) } }),
    onSuccess: (res) => {
      toast.success(`Asignados ${res.total} estudiantes al grupo.`);
      setAsignarOpen(false);
      setSeleccion(new Set());
      setGrupoElegido("");
      invalidar();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function abrirCrear() {
    setModoEdicion(null);
    setForm(FORM_INICIAL);
    setErrores({});
    setDialogoAbierto(true);
  }

  function abrirEditar(e: Estudiante) {
    setModoEdicion(e);
    setForm({
      cedula: e.cedula,
      nombres: e.nombres,
      institucion: e.institucion,
      fechaNacimiento: e.fecha_nacimiento,
      genero: (e.genero ?? "") as Genero | "",
    });
    setErrores({});
    setDialogoAbierto(true);
  }

  function enviarForm(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validarForm()) return;
    if (modoEdicion) editarMut.mutate({ ...form, userId: modoEdicion.id });
    else crearMut.mutate(form);
  }

  return (
    <div className="space-y-5">
      {/* Filtros */}
      <div className="flex flex-col gap-3 rounded-2xl border bg-card p-4 shadow-soft sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por cédula, nombre, institución…"
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(["masculino", "femenino", "otro"] as Genero[]).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => toggleGenero(g)}
                className={`rounded-full border px-3 py-1 text-xs font-medium capitalize transition ${
                  filtroGeneros.includes(g)
                    ? "border-primary bg-primary text-primary-foreground"
                    : "bg-background hover:bg-muted"
                }`}
              >
                {g === "masculino" ? "♂ Hombres" : g === "femenino" ? "♀ Mujeres" : "Otro"}
              </button>
            ))}
            {(grupos ?? []).map((g: any) => (
              <button
                key={g.id}
                type="button"
                onClick={() => toggleGrupo(g.id)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                  filtroGrupos.includes(g.id)
                    ? "border-accent bg-accent text-accent-foreground"
                    : "bg-background hover:bg-muted"
                }`}
              >
                {g.nombre}
              </button>
            ))}
            {(filtroGeneros.length > 0 || filtroGrupos.length > 0) && (
              <button
                type="button"
                onClick={() => {
                  setFiltroGeneros([]);
                  setFiltroGrupos([]);
                }}
                className="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs text-muted-foreground hover:bg-muted"
              >
                <X className="h-3 w-3" /> Limpiar
              </button>
            )}
          </div>
        </div>
        <Button onClick={abrirCrear}>
          <UserPlus className="h-4 w-4" /> Nuevo estudiante
        </Button>
      </div>

      {/* Barra de acciones masivas */}
      {seleccion.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-primary/5 px-4 py-3">
          <span className="text-sm font-semibold">{seleccion.size} seleccionados</span>
          <Button size="sm" variant="outline" onClick={() => setAsignarOpen(true)}>
            <Users className="h-4 w-4" /> Asignar a grupo
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSeleccion(new Set())}>
            Limpiar selección
          </Button>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border bg-card shadow-soft">
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 p-10 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Cargando estudiantes…
          </div>
        ) : filtrados.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            {estudiantes.length === 0
              ? "Aún no hay estudiantes registrados."
              : "Sin resultados para los filtros aplicados."}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={seleccion.size === filtrados.length && filtrados.length > 0}
                    onCheckedChange={toggleSelAll}
                  />
                </TableHead>
                <TableHead>Cédula</TableHead>
                <TableHead>Nombres</TableHead>
                <TableHead>Género</TableHead>
                <TableHead>Institución</TableHead>
                <TableHead>Grupos</TableHead>
                <TableHead>Edad</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtrados.map((e) => {
                const edad = calcularEdad(e.fecha_nacimiento);
                return (
                  <TableRow key={e.id} data-state={seleccion.has(e.id) ? "selected" : undefined}>
                    <TableCell>
                      <Checkbox checked={seleccion.has(e.id)} onCheckedChange={() => toggleSel(e.id)} />
                    </TableCell>
                    <TableCell className="font-mono text-xs">{e.cedula}</TableCell>
                    <TableCell className="font-medium">{e.nombres}</TableCell>
                    <TableCell className="text-xs capitalize text-muted-foreground">
                      {e.genero ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{e.institucion}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {e.grupos.length === 0 ? (
                          <span className="text-xs text-muted-foreground">—</span>
                        ) : (
                          e.grupos.map((g) => (
                            <Badge key={g.id} variant="outline" className="text-[10px]">
                              {g.nombre}
                            </Badge>
                          ))
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">{edad.texto}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {e.bloqueado ? (
                          <Badge variant="destructive">Bloqueado</Badge>
                        ) : (
                          <Badge variant="secondary">Activo</Badge>
                        )}
                        {e.primera_vez && <Badge variant="outline">Pwd temporal</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button asChild size="icon" variant="ghost" title="Vista estudiante">
                          <Link to="/admin/estudiante/$id" params={{ id: e.id }}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button size="icon" variant="ghost" title="Editar" onClick={() => abrirEditar(e)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Reiniciar contraseña"
                          onClick={() => setConfirmarReset(e)}
                        >
                          <KeyRound className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          title={e.bloqueado ? "Desbloquear" : "Bloquear"}
                          onClick={() =>
                            bloquearMut.mutate({ userId: e.id, bloqueado: !e.bloqueado })
                          }
                        >
                          {e.bloqueado ? <LockOpen className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Eliminar"
                          onClick={() => setConfirmarEliminar(e)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Diálogo crear / editar */}
      <Dialog open={dialogoAbierto} onOpenChange={setDialogoAbierto}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{modoEdicion ? "Editar estudiante" : "Nuevo estudiante"}</DialogTitle>
            <DialogDescription>
              {modoEdicion
                ? "Actualiza los datos. La cédula no se puede cambiar."
                : "Se creará con la contraseña temporal 123*789*h y se forzará el cambio al primer ingreso."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={enviarForm} className="space-y-3">
            <div>
              <Label htmlFor="cedula">Cédula (10 dígitos)</Label>
              <Input
                id="cedula"
                inputMode="numeric"
                maxLength={10}
                disabled={!!modoEdicion}
                value={form.cedula}
                onChange={(e) => setForm({ ...form, cedula: e.target.value.replace(/\D/g, "") })}
              />
              {errores.cedula && <p className="mt-1 text-xs text-destructive">{errores.cedula}</p>}
            </div>
            <div>
              <Label htmlFor="nombres">Nombres y apellidos</Label>
              <Input
                id="nombres"
                value={form.nombres}
                onChange={(e) => setForm({ ...form, nombres: e.target.value })}
              />
              {errores.nombres && <p className="mt-1 text-xs text-destructive">{errores.nombres}</p>}
            </div>
            <div>
              <Label htmlFor="institucion">Institución educativa</Label>
              <Input
                id="institucion"
                value={form.institucion}
                onChange={(e) => setForm({ ...form, institucion: e.target.value })}
              />
              {errores.institucion && (
                <p className="mt-1 text-xs text-destructive">{errores.institucion}</p>
              )}
            </div>
            <div>
              <Label htmlFor="genero">Género</Label>
              <Select
                value={form.genero}
                onValueChange={(v) => setForm({ ...form, genero: v as Genero })}
              >
                <SelectTrigger id="genero">
                  <SelectValue placeholder="Selecciona…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="masculino">Masculino</SelectItem>
                  <SelectItem value="femenino">Femenino</SelectItem>
                  <SelectItem value="otro">Otro</SelectItem>
                </SelectContent>
              </Select>
              {errores.genero && <p className="mt-1 text-xs text-destructive">{errores.genero}</p>}
            </div>
            <div>
              <Label htmlFor="fecha">Fecha de nacimiento</Label>
              <Input
                id="fecha"
                type="date"
                value={form.fechaNacimiento}
                onChange={(e) => setForm({ ...form, fechaNacimiento: e.target.value })}
              />
              {form.fechaNacimiento && /^\d{4}-\d{2}-\d{2}$/.test(form.fechaNacimiento) && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Edad actual: {calcularEdad(form.fechaNacimiento).texto}
                </p>
              )}
              {errores.fechaNacimiento && (
                <p className="mt-1 text-xs text-destructive">{errores.fechaNacimiento}</p>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogoAbierto(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={crearMut.isPending || editarMut.isPending}>
                {(crearMut.isPending || editarMut.isPending) && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                {modoEdicion ? "Guardar cambios" : "Crear estudiante"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Asignar a grupo */}
      <Dialog open={asignarOpen} onOpenChange={setAsignarOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Asignar {seleccion.size} estudiantes a un grupo</DialogTitle>
            <DialogDescription>
              Los estudiantes pueden pertenecer a varios grupos al mismo tiempo.
            </DialogDescription>
          </DialogHeader>
          <Select value={grupoElegido} onValueChange={setGrupoElegido}>
            <SelectTrigger>
              <SelectValue placeholder={(grupos?.length ?? 0) === 0 ? "Aún no hay grupos" : "Elige un grupo…"} />
            </SelectTrigger>
            <SelectContent>
              {(grupos ?? []).map((g: any) => (
                <SelectItem key={g.id} value={g.id}>
                  {g.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAsignarOpen(false)}>
              Cancelar
            </Button>
            <Button
              disabled={!grupoElegido || asignarMut.isPending}
              onClick={() => asignarMut.mutate()}
            >
              {asignarMut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Asignar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Credencial generada */}
      <Dialog open={!!credencial} onOpenChange={(o) => !o && setCredencial(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Credenciales del estudiante</DialogTitle>
            <DialogDescription>
              Comparte estos datos con el estudiante. Deberá cambiar la contraseña al ingresar.
            </DialogDescription>
          </DialogHeader>
          {credencial && (
            <div className="space-y-2 rounded-lg bg-muted p-4 font-mono text-sm">
              <div className="flex items-center justify-between">
                <span>Cédula: <b>{credencial.cedula}</b></span>
                <Button size="sm" variant="ghost"
                  onClick={() => {
                    void navigator.clipboard.writeText(credencial.cedula);
                    toast.success("Cédula copiada.");
                  }}>
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="flex items-center justify-between">
                <span>Contraseña: <b>{credencial.password}</b></span>
                <Button size="sm" variant="ghost"
                  onClick={() => {
                    void navigator.clipboard.writeText(credencial.password);
                    toast.success("Contraseña copiada.");
                  }}>
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setCredencial(null)}>Entendido</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmarEliminar} onOpenChange={(o) => !o && setConfirmarEliminar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar estudiante?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará la cuenta de <b>{confirmarEliminar?.nombres}</b> ({confirmarEliminar?.cedula}).
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => confirmarEliminar && eliminarMut.mutate(confirmarEliminar.id)}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!confirmarReset} onOpenChange={(o) => !o && setConfirmarReset(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Reiniciar contraseña?</AlertDialogTitle>
            <AlertDialogDescription>
              Se asignará la contraseña temporal <b>123*789*h</b> a{" "}
              <b>{confirmarReset?.nombres}</b>. El estudiante deberá cambiarla al ingresar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmarReset && resetMut.mutate(confirmarReset.id)}>
              Reiniciar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

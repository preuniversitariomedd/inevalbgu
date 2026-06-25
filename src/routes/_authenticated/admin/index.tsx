import { createFileRoute } from "@tanstack/react-router";
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
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({ meta: [{ title: "Estudiantes — Admin" }] }),
  component: AdminEstudiantes,
});

type Estudiante = {
  id: string;
  cedula: string;
  nombres: string;
  institucion: string;
  fecha_nacimiento: string;
  primera_vez: boolean;
  bloqueado: boolean;
  created_at: string;
};

type FormData = {
  cedula: string;
  nombres: string;
  institucion: string;
  fechaNacimiento: string;
};

const FORM_INICIAL: FormData = {
  cedula: "",
  nombres: "",
  institucion: "",
  fechaNacimiento: "",
};

function AdminEstudiantes() {
  const qc = useQueryClient();
  const listar = useServerFn(listarEstudiantesFn);
  const crear = useServerFn(crearEstudianteFn);
  const editar = useServerFn(editarEstudianteFn);
  const eliminar = useServerFn(eliminarEstudianteFn);
  const resetear = useServerFn(resetPasswordEstudianteFn);
  const toggleBloqueo = useServerFn(toggleBloqueoEstudianteFn);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "estudiantes"],
    queryFn: () => listar(),
  });

  const [busqueda, setBusqueda] = useState("");
  const [dialogoAbierto, setDialogoAbierto] = useState(false);
  const [modoEdicion, setModoEdicion] = useState<Estudiante | null>(null);
  const [form, setForm] = useState<FormData>(FORM_INICIAL);
  const [errores, setErrores] = useState<Partial<Record<keyof FormData, string>>>({});
  const [credencial, setCredencial] = useState<{ cedula: string; password: string } | null>(null);
  const [confirmarEliminar, setConfirmarEliminar] = useState<Estudiante | null>(null);
  const [confirmarReset, setConfirmarReset] = useState<Estudiante | null>(null);

  const estudiantes = useMemo<Estudiante[]>(() => (data as Estudiante[] | undefined) ?? [], [data]);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return estudiantes;
    return estudiantes.filter(
      (e) =>
        e.cedula.includes(q) ||
        e.nombres.toLowerCase().includes(q) ||
        e.institucion.toLowerCase().includes(q),
    );
  }, [estudiantes, busqueda]);

  function invalidar() {
    void qc.invalidateQueries({ queryKey: ["admin", "estudiantes"] });
  }

  function validarForm(): boolean {
    const e: Partial<Record<keyof FormData, string>> = {};
    const v = validarCedulaEcuatoriana(form.cedula);
    if (!v.valida) e.cedula = v.error;
    if (form.nombres.trim().length < 2) e.nombres = "Mínimo 2 caracteres.";
    if (form.institucion.trim().length < 1) e.institucion = "Obligatorio.";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.fechaNacimiento)) {
      e.fechaNacimiento = "Fecha inválida.";
    } else {
      const f = new Date(form.fechaNacimiento + "T00:00:00");
      const hoy = new Date();
      if (f > hoy) e.fechaNacimiento = "No puede ser una fecha futura.";
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
    });
    setErrores({});
    setDialogoAbierto(true);
  }

  function enviarForm(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validarForm()) return;
    if (modoEdicion) {
      editarMut.mutate({ ...form, userId: modoEdicion.id });
    } else {
      crearMut.mutate(form);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por cédula, nombre o institución…"
            className="pl-9"
          />
        </div>
        <Button onClick={abrirCrear}>
          <UserPlus className="h-4 w-4" /> Nuevo estudiante
        </Button>
      </div>

      <div className="overflow-hidden rounded-2xl border bg-card shadow-soft">
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 p-10 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Cargando estudiantes…
          </div>
        ) : filtrados.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            {busqueda ? "Sin resultados para la búsqueda." : "Aún no hay estudiantes registrados."}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cédula</TableHead>
                <TableHead>Nombres</TableHead>
                <TableHead>Institución</TableHead>
                <TableHead>Edad</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtrados.map((e) => {
                const edad = calcularEdad(e.fecha_nacimiento);
                return (
                  <TableRow key={e.id}>
                    <TableCell className="font-mono text-xs">{e.cedula}</TableCell>
                    <TableCell className="font-medium">{e.nombres}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{e.institucion}</TableCell>
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

      {/* Diálogo credencial generada */}
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
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    void navigator.clipboard.writeText(credencial.cedula);
                    toast.success("Cédula copiada.");
                  }}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="flex items-center justify-between">
                <span>Contraseña: <b>{credencial.password}</b></span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    void navigator.clipboard.writeText(credencial.password);
                    toast.success("Contraseña copiada.");
                  }}
                >
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

      {/* Confirmar eliminar */}
      <AlertDialog
        open={!!confirmarEliminar}
        onOpenChange={(o) => !o && setConfirmarEliminar(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar estudiante?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará la cuenta de <b>{confirmarEliminar?.nombres}</b> ({confirmarEliminar?.cedula}).
              Todo su progreso quedará huérfano en estadísticas y esta acción no se puede deshacer.
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

      {/* Confirmar reset */}
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
            <AlertDialogAction
              onClick={() => confirmarReset && resetMut.mutate(confirmarReset.id)}
            >
              Reiniciar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

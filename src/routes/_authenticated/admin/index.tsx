import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({ meta: [{ title: "Estudiantes — Admin" }] }),
  component: () => (
    <div className="rounded-2xl border bg-gradient-card p-8 text-center shadow-soft">
      <h2 className="text-lg font-bold">Próximamente</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        La gestión de estudiantes (crear, editar, reiniciar contraseña, eliminar) llegará en la siguiente entrega.
      </p>
    </div>
  ),
});

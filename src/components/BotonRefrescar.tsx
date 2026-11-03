import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function BotonRefrescar({ cargando, onClick, texto = "Actualizar" }: { cargando: boolean; onClick: () => void; texto?: string }) {
  return (
    <Button type="button" variant="outline" size="sm" disabled={cargando} onClick={onClick}>
      <RefreshCw className={`h-4 w-4 ${cargando ? "animate-spin motion-reduce:animate-none" : ""}`} />
      {cargando ? "Actualizando…" : texto}
    </Button>
  );
}

import { pageMeta } from "@/lib/page-meta";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, Database, Search } from "lucide-react";
import { BANCO_PREGUNTAS } from "@/data";
import { AREAS } from "@/data/tipos";

export const Route = createFileRoute("/_authenticated/banco")({
  head: () => ({ meta: [...pageMeta("Banco de preguntas — INEVAL_UEDE","Banco de preguntas en la plataforma educativa INEVAL_UEDE."),{ title: "Banco de preguntas — INEVAL_UEDE" }] }),
  component: Banco,
});

type NivelF = "Todos" | "Básico" | "Intermedio" | "Avanzado";

function Banco() {
  const [area, setArea] = useState<string>("Todas");
  const [nivel, setNivel] = useState<NivelF>("Todos");
  const [q, setQ] = useState("");

  const filtradas = useMemo(() => {
    return BANCO_PREGUNTAS.filter((p) =>
      (area === "Todas" || p.area === area) &&
      (nivel === "Todos" || p.nivel === nivel) &&
      (q.trim() === "" || p.enunciado.toLowerCase().includes(q.toLowerCase()) || p.subtema.toLowerCase().includes(q.toLowerCase()))
    );
  }, [area, nivel, q]);

  const total = BANCO_PREGUNTAS.length;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-5 py-8">
        <Link to="/" className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Inicio</Link>
        <div className="mt-4 flex items-start gap-3">
          <div className="rounded-xl bg-primary/10 p-3 text-primary"><Database className="h-7 w-7" /></div>
          <div>
            <h1 className="text-3xl font-extrabold sm:text-4xl">Banco de preguntas</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Más de <strong>{total >= 1000 ? "1000" : total}</strong> preguntas disponibles. Filtra por área y nivel para explorar el banco completo.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <select value={area} onChange={(e) => setArea(e.target.value)} className="rounded-xl border bg-card px-3 py-2 text-sm font-medium">
            <option value="Todas">Todas las áreas</option>
            {AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          <select value={nivel} onChange={(e) => setNivel(e.target.value as NivelF)} className="rounded-xl border bg-card px-3 py-2 text-sm font-medium">
            {(["Todos","Básico","Intermedio","Avanzado"] as NivelF[]).map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar..." className="w-full rounded-xl border bg-card pl-9 pr-3 py-2 text-sm" />
          </div>
        </div>

        <p className="mt-4 text-sm font-semibold">{filtradas.length} preguntas coinciden</p>
        <div className="mt-3 space-y-2">
          {filtradas.slice(0, 100).map((p) => (
            <details key={p.id} className="rounded-xl border bg-gradient-card p-4 shadow-soft">
              <summary className="cursor-pointer text-sm font-medium">
                <span className="mr-2 rounded-full bg-secondary px-2 py-0.5 text-xs">{p.area.split(" ")[0]}</span>
                <span className="mr-2 rounded-full border px-2 py-0.5 text-xs">{p.nivel}</span>
                {p.enunciado}
              </summary>
              <ol className="mt-3 list-[upper-alpha] space-y-1 pl-6 text-sm">
                {p.opciones.map((o, i) => (
                  <li key={i} className={i === p.respuestaCorrecta ? "font-bold text-success" : ""}>{o}</li>
                ))}
              </ol>
              <p className="mt-2 rounded-lg bg-primary/5 p-2 text-xs leading-relaxed">{p.explicacion}</p>
            </details>
          ))}
          {filtradas.length > 100 && (
            <p className="pt-2 text-center text-xs text-muted-foreground">Mostrando 100 de {filtradas.length}. Afina los filtros para ver más.</p>
          )}
        </div>
      </div>
    </div>
  );
}

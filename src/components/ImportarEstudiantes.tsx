import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { FileSpreadsheet, Upload, CheckCircle2, AlertTriangle, XCircle, Loader2, Info } from "lucide-react";
import { crearEstudianteFn } from "@/lib/admin.functions";
import { validarCedulaEcuatoriana } from "@/lib/cedula";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

type Campo = "cedula" | "nombres" | "apellidos" | "fecha" | "genero" | "institucion";
const CAMPOS: { id: Campo; label: string; req: boolean; ayuda: string; claves: string[] }[] = [
  { id: "cedula", label: "Cédula", req: true, ayuda: "9 o 10 dígitos. Si Excel quitó el 0 inicial, lo agrego automáticamente.", claves: ["cedula", "cédula", "ci", "documento", "identificacion", "identificación", "dni"] },
  { id: "nombres", label: "Nombres (o nombre completo)", req: true, ayuda: "Puede ser solo nombres o el nombre completo.", claves: ["nombre", "nombres", "estudiante", "alumno", "apellidos y nombres", "nombres y apellidos"] },
  { id: "apellidos", label: "Apellidos (opcional)", req: false, ayuda: "Si viene en otra columna, la uno con los nombres.", claves: ["apellido", "apellidos"] },
  { id: "fecha", label: "Fecha de nacimiento", req: true, ayuda: "Acepto 15/03/2010, 2010-03-15 o fechas de Excel.", claves: ["fecha", "nacimiento", "f. nac", "fecha_nacimiento", "nac"] },
  { id: "genero", label: "Género", req: true, ayuda: "M, H, masculino, hombre / F, mujer, femenino / otro.", claves: ["genero", "género", "sexo"] },
  { id: "institucion", label: "Institución (opcional)", req: false, ayuda: "Si no existe, uso la institución por defecto que escribas abajo.", claves: ["institucion", "institución", "colegio", "unidad educativa", "escuela"] },
];

const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

function parseFecha(v: unknown): string | null {
  if (v == null || v === "") return null;
  if (typeof v === "number" && v > 1000 && v < 80000) {
    const d = new Date(Date.UTC(1899, 11, 30) + v * 86400000);
    return d.toISOString().slice(0, 10);
  }
  if (v instanceof Date && !isNaN(+v)) return v.toISOString().slice(0, 10);
  const s = String(v).trim();
  let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (m) return `${m[1]}-${m[2]!.padStart(2, "0")}-${m[3]!.padStart(2, "0")}`;
  m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/);
  if (m) {
    let y = m[3]!; if (y.length === 2) y = (Number(y) > 50 ? "19" : "20") + y;
    const d = Number(m[1]), mo = Number(m[2]);
    if (mo > 12 || d > 31) return null;
    return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }
  return null;
}
function parseGenero(v: unknown): "masculino" | "femenino" | "otro" | null {
  const s = norm(String(v ?? ""));
  if (!s) return null;
  if (["m", "h", "masculino", "hombre", "varon", "male"].includes(s)) return "masculino";
  if (["f", "mujer", "femenino", "female"].includes(s)) return "femenino";
  if (s.startsWith("otr")) return "otro";
  return null;
}

interface Fila { n: number; cedula: string; nombres: string; fecha: string | null; genero: ReturnType<typeof parseGenero>; institucion: string; errores: string[]; avisos: string[]; estado?: "ok" | "error"; msg?: string }

async function leerArchivo(file: File): Promise<string[][]> {
  const ext = file.name.toLowerCase().split(".").pop();
  if (ext === "docx") {
    const mammoth = await import("mammoth");
    const { value: html } = await mammoth.convertToHtml({ arrayBuffer: await file.arrayBuffer() });
    const doc = new DOMParser().parseFromString(html, "text/html");
    const filas = [...doc.querySelectorAll("tr")].map((tr) => [...tr.querySelectorAll("td,th")].map((c) => c.textContent?.trim() ?? ""));
    if (filas.length) return filas;
    // Sin tabla: cada línea separada por tabulación, coma o punto y coma
    return doc.body.innerText.split("\n").map((l) => l.split(/\t|;|,/).map((x) => x.trim())).filter((r) => r.some(Boolean));
  }
  const XLSX = await import("xlsx");
  const wb = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: false });
  const ws = wb.Sheets[wb.SheetNames[0]!]!;
  return (XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: "" }) as unknown[][]).map((r) => r.map((c) => (typeof c === "number" ? (c as any) : String(c ?? "")))) as string[][];
}

export function ImportarEstudiantes({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const crear = useServerFn(crearEstudianteFn);
  const qc = useQueryClient();
  const [paso, setPaso] = useState(1);
  const [archivo, setArchivo] = useState("");
  const [tabla, setTabla] = useState<string[][]>([]);
  const [filaEnc, setFilaEnc] = useState(0);
  const [mapa, setMapa] = useState<Record<Campo, number>>({ cedula: -1, nombres: -1, apellidos: -1, fecha: -1, genero: -1, institucion: -1 });
  const [instDef, setInstDef] = useState("");
  const [filas, setFilas] = useState<Fila[]>([]);
  const [progreso, setProgreso] = useState(0);
  const [corriendo, setCorriendo] = useState(false);
  const [error, setError] = useState("");

  function reiniciar() { setPaso(1); setTabla([]); setFilas([]); setProgreso(0); setError(""); setArchivo(""); }

  async function cargar(file: File) {
    setError("");
    try {
      const t = (await leerArchivo(file)).filter((r) => r.some((c) => String(c).trim()));
      if (t.length < 2) { setError("No encontré datos. Asegúrate de que la lista esté en una tabla con una fila de títulos."); return; }
      // Detectar fila de encabezado: la que más coincide con nombres de campos
      let mejor = 0, puntos = -1;
      t.slice(0, 10).forEach((r, i) => {
        const p = r.filter((c) => CAMPOS.some((f) => f.claves.some((k) => norm(String(c)).includes(norm(k))))).length;
        if (p > puntos) { puntos = p; mejor = i; }
      });
      const enc = t[mejor]!.map((c) => norm(String(c)));
      const m = { cedula: -1, nombres: -1, apellidos: -1, fecha: -1, genero: -1, institucion: -1 } as Record<Campo, number>;
      for (const f of [...CAMPOS].sort((a) => (a.id === "apellidos" ? -1 : 1))) {
        const i = enc.findIndex((h, idx) => !Object.values(m).includes(idx) && f.claves.some((k) => (f.id === "nombres" ? h.includes(norm(k)) && !(m.apellidos === -1 && h === "apellidos") : h.includes(norm(k)))));
        if (i >= 0) m[f.id] = i;
      }
      // Si "nombres" y "apellidos" quedaron en la misma columna combinada
      if (m.apellidos >= 0 && enc[m.apellidos]!.includes("nombre")) { m.nombres = m.apellidos; m.apellidos = -1; }
      setArchivo(file.name); setTabla(t); setFilaEnc(mejor); setMapa(m); setPaso(2);
    } catch (e) { setError("No pude leer el archivo: " + (e as Error).message); }
  }

  const encabezados = tabla[filaEnc] ?? [];
  const faltan = CAMPOS.filter((c) => c.req && mapa[c.id] < 0);

  function revisar() {
    const vistas = new Set<string>();
    const res: Fila[] = tabla.slice(filaEnc + 1).map((r, i) => {
      const get = (c: Campo) => (mapa[c] >= 0 ? r[mapa[c]] : "");
      let ced = String(get("cedula") ?? "").replace(/\D/g, "");
      const avisos: string[] = [], errores: string[] = [];
      if (ced.length === 9 && typeof get("cedula") === "number") { ced = "0" + ced; avisos.push("Agregué el 0 inicial a la cédula"); }
      const v = validarCedulaEcuatoriana(ced);
      if (!v.valida) errores.push(v.error ?? "Cédula inválida");
      if (vistas.has(ced)) errores.push("Cédula repetida en el archivo"); vistas.add(ced);
      const nombres = [String(get("apellidos") ?? "").trim(), String(get("nombres") ?? "").trim()].filter(Boolean).join(" ").replace(/\s+/g, " ");
      if (nombres.length < 2) errores.push("Falta el nombre");
      const fecha = parseFecha(get("fecha"));
      if (!fecha) errores.push(`Fecha no reconocida: «${get("fecha") ?? ""}»`);
      else { const y = Number(fecha.slice(0, 4)); if (y < 1990 || y > new Date().getFullYear() - 5) avisos.push(`Revisa el año de nacimiento (${y})`); }
      const genero = parseGenero(get("genero"));
      if (!genero) errores.push(`Género no reconocido: «${get("genero") ?? ""}»`);
      const institucion = String(get("institucion") ?? "").trim() || instDef.trim();
      if (!institucion) errores.push("Falta la institución (escribe una por defecto)");
      return { n: filaEnc + i + 2, cedula: ced, nombres, fecha, genero, institucion, errores, avisos };
    });
    setFilas(res); setPaso(3);
  }

  const validas = filas.filter((f) => !f.errores.length);
  const conError = filas.length - validas.length;

  async function importar() {
    setCorriendo(true); setPaso(4); setProgreso(0);
    const out = [...filas];
    let hechos = 0;
    for (const f of out) {
      if (f.errores.length) continue;
      try {
        await crear({ data: { cedula: f.cedula, nombres: f.nombres, institucion: f.institucion, fechaNacimiento: f.fecha!, genero: f.genero!, rol: "estudiante" } });
        f.estado = "ok";
      } catch (e) {
        const m = (e as Error).message;
        f.estado = "error"; f.msg = /already|registered|exists/i.test(m) ? "Ya existe un usuario con esta cédula" : m;
      }
      hechos++; setProgreso(Math.round((hechos / validas.length) * 100)); setFilas([...out]);
    }
    setCorriendo(false);
    qc.invalidateQueries();
  }

  const Guia = ({ children }: { children: React.ReactNode }) => (
    <div className="flex gap-2 rounded-xl border border-primary/30 bg-primary/5 p-3 text-sm"><Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><div>{children}</div></div>
  );

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!corriendo) { onOpenChange(v); if (!v) reiniciar(); } }}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><FileSpreadsheet className="h-5 w-5" /> Importar estudiantes desde una lista</DialogTitle>
          <DialogDescription>Paso {paso} de 4 · {["Subir archivo", "Confirmar columnas", "Revisar datos", "Crear cuentas"][paso - 1]}</DialogDescription>
        </DialogHeader>
        <div className="flex gap-1">{[1, 2, 3, 4].map((p) => <div key={p} className={`h-1.5 flex-1 rounded-full ${p <= paso ? "bg-primary" : "bg-muted"}`} />)}</div>

        {paso === 1 && (
          <div className="space-y-4">
            <Guia>
              Sube un archivo <b>Excel (.xlsx, .xls, .csv)</b> o <b>Word (.docx)</b> con una tabla. La primera fila debe tener títulos como:
              <b> Cédula, Nombres, Apellidos, Fecha de nacimiento, Género, Institución</b>. No importa el orden: yo identifico cada columna y te muestro lo que encontré antes de crear nada.
            </Guia>
            <label className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed p-10 text-center hover:bg-muted/40">
              <Upload className="h-8 w-8 text-primary" />
              <span className="font-semibold">Haz clic o arrastra tu archivo aquí</span>
              <span className="text-xs text-muted-foreground">.xlsx · .xls · .csv · .docx</span>
              <input type="file" accept=".xlsx,.xls,.csv,.docx" className="hidden" onChange={(e) => e.target.files?.[0] && cargar(e.target.files[0])} />
            </label>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        )}

        {paso === 2 && (
          <div className="space-y-4">
            <Guia>
              Leí <b>{archivo}</b>: {tabla.length - filaEnc - 1} filas de estudiantes. La fila de títulos es la n.º {filaEnc + 1}.
              Revisa que cada dato esté unido a la columna correcta. {faltan.length ? <b className="text-destructive">Falta indicar: {faltan.map((f) => f.label).join(", ")}.</b> : "¡Todo identificado! Si algo no coincide, cámbialo."}
            </Guia>
            <div className="grid gap-3 sm:grid-cols-2">
              {CAMPOS.map((c) => {
                const ej = mapa[c.id] >= 0 ? tabla[filaEnc + 1]?.[mapa[c.id]] : "";
                return (
                  <div key={c.id} className={`rounded-xl border p-3 ${c.req && mapa[c.id] < 0 ? "border-destructive" : ""}`}>
                    <div className="flex items-center justify-between text-sm font-semibold">{c.label} {mapa[c.id] >= 0 ? <CheckCircle2 className="h-4 w-4 text-success" /> : c.req && <AlertTriangle className="h-4 w-4 text-destructive" />}</div>
                    <select className="mt-1 w-full rounded-md border bg-background px-2 py-1.5 text-sm" value={mapa[c.id]} onChange={(e) => setMapa({ ...mapa, [c.id]: Number(e.target.value) })}>
                      <option value={-1}>— No está en el archivo —</option>
                      {encabezados.map((h, i) => <option key={i} value={i}>{String(h) || `Columna ${i + 1}`}</option>)}
                    </select>
                    <p className="mt-1 text-xs text-muted-foreground">{c.ayuda}</p>
                    {ej !== "" && ej != null && <p className="mt-1 text-xs">Ejemplo de la 1.ª fila: <b>{String(ej)}</b></p>}
                  </div>
                );
              })}
            </div>
            <div>
              <label className="text-sm font-semibold">Institución por defecto</label>
              <Input value={instDef} onChange={(e) => setInstDef(e.target.value)} placeholder="Ej.: Unidad Educativa ..." />
            </div>
            <div className="flex justify-between"><Button variant="outline" onClick={reiniciar}>Cambiar archivo</Button><Button disabled={faltan.length > 0} onClick={revisar}>Revisar datos →</Button></div>
          </div>
        )}

        {paso === 3 && (
          <div className="space-y-4">
            <Guia>
              <b>{validas.length}</b> estudiantes están listos. {conError > 0 ? <><b className="text-destructive">{conError}</b> filas tienen errores y <b>no se crearán</b>; corrígelas en tu archivo y vuelve a subirlo, o continúa solo con las correctas.</> : "No encontré errores."} Las advertencias en amarillo no impiden crear la cuenta, pero conviene revisarlas.
            </Guia>
            <div className="max-h-[45vh] overflow-auto rounded-xl border">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-muted"><tr>{["Fila", "Cédula", "Nombre", "Nacimiento", "Género", "Institución", "Revisión"].map((h) => <th key={h} className="px-2 py-1.5 text-left">{h}</th>)}</tr></thead>
                <tbody>
                  {filas.map((f) => (
                    <tr key={f.n} className={f.errores.length ? "bg-destructive/10" : f.avisos.length ? "bg-warning/10" : ""}>
                      <td className="px-2 py-1">{f.n}</td><td className="px-2 py-1 font-mono">{f.cedula}</td><td className="px-2 py-1">{f.nombres}</td><td className="px-2 py-1">{f.fecha ?? "—"}</td><td className="px-2 py-1">{f.genero ?? "—"}</td><td className="px-2 py-1">{f.institucion}</td>
                      <td className="px-2 py-1">{f.errores.length ? <span className="text-destructive">{f.errores.join(" · ")}</span> : f.avisos.length ? f.avisos.join(" · ") : <CheckCircle2 className="h-4 w-4 text-success" />}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-between"><Button variant="outline" onClick={() => setPaso(2)}>← Columnas</Button><Button disabled={!validas.length} onClick={importar}>Crear {validas.length} cuentas</Button></div>
          </div>
        )}

        {paso === 4 && (
          <div className="space-y-4">
            <div className="h-3 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary transition-all" style={{ width: `${progreso}%` }} /></div>
            <p className="flex items-center gap-2 text-sm">{corriendo && <Loader2 className="h-4 w-4 animate-spin" />}{corriendo ? `Creando cuentas… ${progreso} %` : `Listo: ${filas.filter((f) => f.estado === "ok").length} creadas, ${filas.filter((f) => f.estado === "error").length} con problemas.`}</p>
            {!corriendo && <Guia>Cada estudiante entra con su <b>cédula</b> y la contraseña temporal <b>123*789*h</b>; al entrar por primera vez deberá cambiarla.</Guia>}
            <div className="max-h-[40vh] overflow-auto rounded-xl border text-xs">
              {filas.filter((f) => f.estado).map((f) => (
                <div key={f.n} className="flex items-center gap-2 border-b px-3 py-1.5">
                  {f.estado === "ok" ? <CheckCircle2 className="h-4 w-4 text-success" /> : <XCircle className="h-4 w-4 text-destructive" />}
                  <span className="font-mono">{f.cedula}</span><span>{f.nombres}</span>{f.msg && <span className="text-destructive">— {f.msg}</span>}
                </div>
              ))}
            </div>
            {!corriendo && <div className="flex justify-end"><Button onClick={() => { onOpenChange(false); reiniciar(); }}>Cerrar</Button></div>}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

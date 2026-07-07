import { useEffect, useRef } from "react";
import { Bold, Italic, Underline as UnderlineIcon, Palette, Type, List } from "lucide-react";

type Props = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
};

const COLORS = ["#111827", "#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4", "#3b82f6", "#a855f7", "#ec4899"];
const FONTS = [
  { label: "Sans", value: "system-ui, -apple-system, sans-serif" },
  { label: "Serif", value: "Georgia, 'Times New Roman', serif" },
  { label: "Mono", value: "ui-monospace, Menlo, monospace" },
  { label: "Cursiva", value: "'Comic Sans MS', 'Segoe Print', cursive" },
];

export function RichTextEditor({ value, onChange, placeholder }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== value) {
      ref.current.innerHTML = value || "";
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function exec(cmd: string, val?: string) {
    ref.current?.focus();
    document.execCommand(cmd, false, val);
    if (ref.current) onChange(ref.current.innerHTML);
  }

  return (
    <div className="rounded-xl border bg-background">
      <div className="flex flex-wrap items-center gap-1 border-b p-1.5">
        <button type="button" onClick={() => exec("bold")} className="rounded p-1.5 hover:bg-muted" title="Negrita">
          <Bold className="h-4 w-4" />
        </button>
        <button type="button" onClick={() => exec("italic")} className="rounded p-1.5 hover:bg-muted" title="Cursiva">
          <Italic className="h-4 w-4" />
        </button>
        <button type="button" onClick={() => exec("underline")} className="rounded p-1.5 hover:bg-muted" title="Subrayado">
          <UnderlineIcon className="h-4 w-4" />
        </button>
        <button type="button" onClick={() => exec("insertUnorderedList")} className="rounded p-1.5 hover:bg-muted" title="Lista">
          <List className="h-4 w-4" />
        </button>
        <div className="mx-1 h-5 w-px bg-border" />
        <div className="flex items-center gap-1">
          <Palette className="h-4 w-4 text-muted-foreground" />
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => exec("foreColor", c)}
              className="h-5 w-5 rounded-full border"
              style={{ background: c }}
              title={c}
            />
          ))}
        </div>
        <div className="mx-1 h-5 w-px bg-border" />
        <div className="flex items-center gap-1">
          <Type className="h-4 w-4 text-muted-foreground" />
          <select
            onMouseDown={(e) => e.preventDefault()}
            onChange={(e) => exec("fontName", e.target.value)}
            className="rounded border bg-background px-1 py-0.5 text-xs"
            defaultValue=""
          >
            <option value="" disabled>Fuente</option>
            {FONTS.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
          <select
            onMouseDown={(e) => e.preventDefault()}
            onChange={(e) => exec("fontSize", e.target.value)}
            className="rounded border bg-background px-1 py-0.5 text-xs"
            defaultValue=""
          >
            <option value="" disabled>Tamaño</option>
            <option value="2">S</option>
            <option value="3">M</option>
            <option value="5">L</option>
            <option value="7">XL</option>
          </select>
        </div>
      </div>
      <div
        ref={ref}
        contentEditable
        onInput={(e) => onChange((e.target as HTMLDivElement).innerHTML)}
        className="min-h-[120px] w-full px-3 py-2 text-sm outline-none prose prose-sm max-w-none"
        data-placeholder={placeholder}
        suppressContentEditableWarning
      />
    </div>
  );
}

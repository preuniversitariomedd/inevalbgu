import type { InformeSeccion } from './curso-informe.functions';
export type InformeCurso = { grupo: { id:string; nombre:string }; generadoEn:string; alcance:string; secciones:InformeSeccion[] };
export async function prepararInforme(informe: InformeCurso, formato: 'pdf'|'excel'): Promise<Blob> {
  if (formato === 'excel') {
    const XLSX = await import('xlsx');
    const wb = XLSX.utils.book_new();
    const ficha = XLSX.utils.aoa_to_sheet([['PreUniversitario MEDD', informe.grupo.nombre], ['Generado',informe.generadoEn], ['Alcance',informe.alcance]]);
    ficha['!cols'] = [{ wch:24 },{ wch:100 }]; XLSX.utils.book_append_sheet(wb,ficha,'Informe');
    for (const s of informe.secciones) {
      const filas = s.filas.flatMap((r, index) => {
        const columnas = Object.keys(r);
        // Long text and JSON are split into continuation records without losing data.
        const partes = Math.max(1,...columnas.map(k => Math.ceil(texto(r[k]).length/30000)));
        return Array.from({ length:partes },(_,parte) => ({ registro:index+1, continuación:parte+1,...Object.fromEntries(columnas.map(k => [k, typeof r[k] === 'number' && parte === 0 ? r[k] : texto(r[k]).slice(parte*30000,(parte+1)*30000)])) }));
      });
      const ws = filas.length ? XLSX.utils.json_to_sheet(filas) : XLSX.utils.aoa_to_sheet([['Sin registros']]);
      ws['!cols'] = Array.from({ length:Math.max(1,Object.keys(filas[0] ?? {}).length) },() => ({ wch:26 }));
      XLSX.utils.book_append_sheet(wb,ws,s.nombre.slice(0,31));
    }
    return new Blob([XLSX.write(wb,{ bookType:'xlsx',type:'array' })],{ type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }
  const [{ jsPDF }, { default:autoTable }] = await Promise.all([import('jspdf'),import('jspdf-autotable')]);
  const doc = new jsPDF({ compress: true, orientation:'landscape' });
  doc.setFont('helvetica','bold'); doc.setFontSize(18); doc.text('PreUniversitario MEDD',14,20);
  doc.setFontSize(13); doc.text(doc.splitTextToSize(informe.grupo.nombre,180),14,30);
  doc.setFont('helvetica','normal'); doc.setFontSize(9); doc.text(`Generado: ${informe.generadoEn}`,14,44);
  doc.text(doc.splitTextToSize(informe.alcance,180),14,54);
  for (const s of informe.secciones) {
    doc.addPage(); doc.setFontSize(13); doc.text(`${s.nombre} (${s.filas.length} registros)`,14,18);
    const columnas = [...new Set(s.filas.flatMap(r => Object.keys(r)))];
    if (!columnas.length) { doc.setFontSize(9); doc.text('Sin registros',14,30); continue; }
    // Narrow column bands retain every field and full value without one vertical form per record.
    for (let offset=0;offset<columnas.length;offset+=4) {
      if (offset) { doc.addPage(); doc.setFontSize(13); doc.text(`${s.nombre} · campos ${offset+1}–${Math.min(offset+4,columnas.length)}`,14,18); }
      const campos = columnas.slice(offset,offset+4);
      const body = s.filas.map((r,i) => [String(i+1),...campos.map(k => texto(r[k]))]);
      autoTable(doc,{ startY:25,head:[['Registro',...campos]],body,theme:'grid',styles:{ font:'helvetica',fontSize:7,cellPadding:1.2,overflow:'linebreak' },columnStyles:{ 0:{ cellWidth:14 } },margin:{ left:14,right:14,top:20,bottom:16 },rowPageBreak:'avoid' });
    }
  }
  const total = doc.getNumberOfPages();
  for (let n=1;n<=total;n++) { doc.setPage(n); doc.setFontSize(8); doc.text(`${n} / ${total}`,283,202,{ align:'right' }); }
  return doc.output('blob');
}
function texto(v: unknown): string { return v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v); }
export function descargarInforme(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob); const a = document.createElement('a');
  a.href=url; a.download=filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url),30000);
}
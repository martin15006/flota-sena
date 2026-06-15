import fs from 'fs';
import { Paragraph, TextRun, ImageRun, Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType, AlignmentType } from 'docx';
import { LOGO_PATH, lineaOrigen } from '../branding.js';

const VERDE = '39A900';
const LOGO_DATA = fs.readFileSync(LOGO_PATH);

// Encabezado: logo + titulo + linea de origen, dentro de una "banda" verde simulada
// con shading de celda (docx no tiene banner, usamos una tabla de 1 fila sin bordes).
export const encabezadoDocx = (titulo, origen, meta) => {
    const logo = new Paragraph({
        children: [new ImageRun({ type: 'png', data: LOGO_DATA, transformation: { width: 46, height: 46 } })],
    });
    const tituloP = new Paragraph({ children: [new TextRun({ text: titulo, bold: true, size: 30, color: 'FFFFFF' })] });
    const subP = new Paragraph({ children: [new TextRun({ text: lineaOrigen(origen), size: 18, color: 'FFFFFF' })] });
    const metaP = new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: (meta || []).map((m, i) => new TextRun({ text: m, size: 16, color: 'FFFFFF', break: i ? 1 : 0 })),
    });
    const sinBorde = { style: BorderStyle.NONE };
    return new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [1200, 5760, 2400],
        borders: { top: sinBorde, bottom: sinBorde, left: sinBorde, right: sinBorde, insideHorizontal: sinBorde, insideVertical: sinBorde },
        rows: [new TableRow({ children: [
            new TableCell({ width: { size: 1200, type: WidthType.DXA }, shading: { fill: VERDE, type: ShadingType.CLEAR }, margins: { top: 120, bottom: 120, left: 120, right: 60 }, children: [logo] }),
            new TableCell({ width: { size: 5760, type: WidthType.DXA }, shading: { fill: VERDE, type: ShadingType.CLEAR }, margins: { top: 120, bottom: 120, left: 60, right: 60 }, children: [tituloP, subP] }),
            new TableCell({ width: { size: 2400, type: WidthType.DXA }, shading: { fill: VERDE, type: ShadingType.CLEAR }, margins: { top: 120, bottom: 120, left: 60, right: 120 }, children: [metaP] }),
        ] })],
    });
};

export const tituloSeccion = (texto) =>
    new Paragraph({ spacing: { before: 220, after: 80 }, children: [new TextRun({ text: texto, bold: true, size: 22, color: '2A7A00' })] });

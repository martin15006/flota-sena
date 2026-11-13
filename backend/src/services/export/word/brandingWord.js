import fs from 'fs';
import { Paragraph, TextRun, ImageRun, Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType, AlignmentType, TableLayoutType, Footer, PageNumber, TabStopType } from 'docx';
import { LOGO_PATH, lineaOrigen, fechaHora } from '../branding.js';

const VERDE = '39A900';
const LOGO_DATA = fs.readFileSync(LOGO_PATH);

export const ANCHO_CONTENIDO = 10800;

export const encabezadoDocx = (titulo, origen, meta, ancho = ANCHO_CONTENIDO) => {
    const colTitulo = ancho - 1300 - 2700;
    const logo = new Paragraph({
        children: [new ImageRun({ type: 'png', data: LOGO_DATA, transformation: { width: 54, height: 54 } })],
    });
    const tituloP = new Paragraph({ children: [new TextRun({ text: titulo, bold: true, size: 34, color: 'FFFFFF' })] });
    const subP = new Paragraph({ spacing: { before: 40 }, children: [new TextRun({ text: lineaOrigen(origen), size: 22, color: 'FFFFFF' })] });
    const metaP = new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: (meta || []).map((m, i) => new TextRun({ text: m, size: 18, color: 'FFFFFF', break: i ? 1 : 0 })),
    });
    const sinBorde = { style: BorderStyle.NONE };
    return new Table({
        width: { size: ancho, type: WidthType.DXA },
        columnWidths: [1300, colTitulo, 2700],
        layout: TableLayoutType.FIXED,
        borders: { top: sinBorde, bottom: sinBorde, left: sinBorde, right: sinBorde, insideHorizontal: sinBorde, insideVertical: sinBorde },
        rows: [new TableRow({ children: [
            new TableCell({ width: { size: 1300, type: WidthType.DXA }, verticalAlign: 'center', shading: { fill: VERDE, type: ShadingType.CLEAR }, margins: { top: 160, bottom: 160, left: 160, right: 60 }, children: [logo] }),
            new TableCell({ width: { size: colTitulo, type: WidthType.DXA }, verticalAlign: 'center', shading: { fill: VERDE, type: ShadingType.CLEAR }, margins: { top: 160, bottom: 160, left: 60, right: 60 }, children: [tituloP, subP] }),
            new TableCell({ width: { size: 2700, type: WidthType.DXA }, verticalAlign: 'center', shading: { fill: VERDE, type: ShadingType.CLEAR }, margins: { top: 160, bottom: 160, left: 60, right: 160 }, children: [metaP] }),
        ] })],
    });
};

export const tituloSeccion = (texto) =>
    new Paragraph({ spacing: { before: 280, after: 120 }, children: [new TextRun({ text: texto, bold: true, size: 26, color: '2A7A00' })] });

export const pieDocx = (ancho = ANCHO_CONTENIDO) => new Footer({
    children: [
        new Paragraph({
            tabStops: [{ type: TabStopType.RIGHT, position: ancho }],
            border: { top: { style: BorderStyle.SINGLE, size: 4, color: 'E5E5E5', space: 6 } },
            children: [
                new TextRun({ text: `Generado el ${fechaHora(new Date().toISOString())} · Sistema de Gestión de Flota SENA`, size: 16, color: '5F5E5A' }),
                new TextRun({ text: '\t' }),
                new TextRun({ children: ['Página ', PageNumber.CURRENT, ' de ', PageNumber.TOTAL_PAGES], size: 16, color: '5F5E5A' }),
            ],
        }),
    ],
});

export const espaciadoresSuperior = (n = 0) =>
    Array.from({ length: n }, () => new Paragraph({ spacing: { after: 0 } }));

const BORDE = { style: BorderStyle.SINGLE, size: 2, color: 'E0DED6' };
export const BORDES_TABLA = { top: BORDE, bottom: BORDE, left: BORDE, right: BORDE };

export const celdaTexto = (texto, { width, bold = false, fill = null, size = 22, color = null, align = null } = {}) =>
    new TableCell({
        ...(width ? { width: { size: width, type: WidthType.DXA } } : {}),
        borders: BORDES_TABLA,
        ...(fill ? { shading: { fill, type: ShadingType.CLEAR } } : {}),
        margins: { top: 90, bottom: 90, left: 160, right: 120 },
        children: [new Paragraph({ ...(align ? { alignment: align } : {}), children: [new TextRun({ text: texto == null || texto === '' ? '—' : String(texto), bold, size, ...(color ? { color } : {}) })] })],
    });

export const filaDato = (etiqueta, valor, colEtiqueta, colValor) =>
    new TableRow({ children: [
        celdaTexto(etiqueta, { width: colEtiqueta, bold: true, fill: 'F1EFE8' }),
        celdaTexto(valor, { width: colValor }),
    ] });

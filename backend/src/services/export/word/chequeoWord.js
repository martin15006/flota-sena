import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType } from 'docx';
import { fechaLarga } from '../branding.js';
import { encabezadoDocx, tituloSeccion } from './brandingWord.js';

const borde = { style: BorderStyle.SINGLE, size: 1, color: 'E5E5E5' };
const bordes = { top: borde, bottom: borde, left: borde, right: borde };
const textoResultado = (r) => r === 'cumple' ? 'Cumple' : r === 'no_cumple' ? 'No cumple' : 'N/A';

const filaInfo = (etiqueta, valor) => new TableRow({ children: [
    new TableCell({ width: { size: 2600, type: WidthType.DXA }, borders: bordes, shading: { fill: 'F1EFE8', type: ShadingType.CLEAR }, margins: { top: 60, bottom: 60, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: etiqueta, bold: true, size: 18 })] })] }),
    new TableCell({ width: { size: 6760, type: WidthType.DXA }, borders: bordes, margins: { top: 60, bottom: 60, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: valor || '—', size: 18 })] })] }),
] });

export const chequeoWordBuffer = async ({ chequeo, origen }) => {
    const v = chequeo.vehiculo || {};
    const c = chequeo.conductor || {};

    const tablaInfo = new Table({
        width: { size: 9360, type: WidthType.DXA }, columnWidths: [2600, 6760],
        rows: [
            filaInfo('Resultado', `${(chequeo.resultado_estado || '—').toUpperCase()} · criticidad ${chequeo.resultado_criticidad ?? 0}%`),
            filaInfo('Vehiculo', `${v.placa || '—'} · ${v.marca || ''} ${v.linea || ''}`.trim()),
            filaInfo('Conductor', `${c.nombre_completo || '—'}${c.cedula ? ` · CC ${c.cedula}` : ''}`),
            filaInfo('Tipo', chequeo.tipo === 'postoperacional' ? 'Post-operacional' : 'Preoperacional'),
            filaInfo('Kilometraje', chequeo.kilometraje != null ? `${chequeo.kilometraje.toLocaleString('es-CO')} km` : '—'),
            filaInfo('Fecha', fechaLarga(chequeo.fecha)),
        ],
    });

    const cabChecklist = new TableRow({ tableHeader: true, children: [
        new TableCell({ width: { size: 7000, type: WidthType.DXA }, borders: bordes, shading: { fill: 'F1EFE8', type: ShadingType.CLEAR }, margins: { top: 60, bottom: 60, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: 'Item', bold: true, size: 16 })] })] }),
        new TableCell({ width: { size: 2360, type: WidthType.DXA }, borders: bordes, shading: { fill: 'F1EFE8', type: ShadingType.CLEAR }, margins: { top: 60, bottom: 60, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: 'Resultado', bold: true, size: 16 })] })] }),
    ] });
    const filasChecklist = (chequeo.respuestas_chequeo || []).map((r) => new TableRow({ children: [
        new TableCell({ width: { size: 7000, type: WidthType.DXA }, borders: bordes, margins: { top: 60, bottom: 60, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: r.item?.descripcion || '—', size: 18 })] })] }),
        new TableCell({ width: { size: 2360, type: WidthType.DXA }, borders: bordes, margins: { top: 60, bottom: 60, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: textoResultado(r.estado), size: 18 })] })] }),
    ] }));

    const doc = new Document({
        styles: { default: { document: { run: { font: 'Arial' } } } },
        sections: [{
            properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1080, right: 1440, bottom: 1080, left: 1440 } } },
            children: [
                encabezadoDocx('Chequeo preoperacional', origen, [`N.º ${(chequeo.id || '').slice(0, 8).toUpperCase()}`, fechaLarga(chequeo.fecha)]),
                new Paragraph({ text: '' }),
                tituloSeccion('Datos'),
                tablaInfo,
                tituloSeccion('Checklist'),
                new Table({ width: { size: 9360, type: WidthType.DXA }, columnWidths: [7000, 2360], rows: [cabChecklist, ...filasChecklist] }),
            ],
        }],
    });
    return Packer.toBuffer(doc);
};

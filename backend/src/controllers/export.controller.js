import { datosChequeo, datosVehiculo, datosConductor } from '../services/export/datos.js';
import { chequeoPdfBuffer } from '../services/export/pdf/chequeoPdf.js';
import { chequeoWordBuffer } from '../services/export/word/chequeoWord.js';
import { vehiculoPdfBuffer } from '../services/export/pdf/vehiculoPdf.js';
import { vehiculoWordBuffer } from '../services/export/word/vehiculoWord.js';
import { conductorPdfBuffer } from '../services/export/pdf/conductorPdf.js';
import { conductorWordBuffer } from '../services/export/word/conductorWord.js';

const TIPO_WORD = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

// GET /api/export/chequeo/:id?formato=pdf|word
export const exportarChequeo = async (req, res) => {
    try {
        const { id } = req.params;
        const formato = req.query.formato === 'word' ? 'word' : 'pdf';
        const datos = await datosChequeo(id, req.usuario);
        if (!datos.ok) return res.status(datos.status || 404).json({ error: datos.error });

        const nombreBase = `chequeo-${(datos.chequeo.vehiculo?.placa || id).replace(/\s+/g, '')}`;
        if (formato === 'word') {
            const buffer = await chequeoWordBuffer(datos);
            res.setHeader('Content-Type', TIPO_WORD);
            res.setHeader('Content-Disposition', `attachment; filename="${nombreBase}.docx"`);
            return res.send(buffer);
        }
        const buffer = await chequeoPdfBuffer(datos);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${nombreBase}.pdf"`);
        return res.send(buffer);
    } catch (err) {
        console.error('Error exportando chequeo:', err);
        res.status(500).json({ error: 'No se pudo generar el documento.' });
    }
};

// GET /api/export/vehiculo/:id?formato=pdf|word
export const exportarVehiculo = async (req, res) => {
    try {
        const { id } = req.params;
        const formato = req.query.formato === 'word' ? 'word' : 'pdf';
        const datos = await datosVehiculo(id, req.usuario);
        if (!datos.ok) return res.status(datos.status || 404).json({ error: datos.error });

        const nombreBase = `vehiculo-${(datos.vehiculo.placa || id).replace(/\s+/g, '')}`;
        if (formato === 'word') {
            const buffer = await vehiculoWordBuffer(datos);
            res.setHeader('Content-Type', TIPO_WORD);
            res.setHeader('Content-Disposition', `attachment; filename="${nombreBase}.docx"`);
            return res.send(buffer);
        }
        const buffer = await vehiculoPdfBuffer(datos);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${nombreBase}.pdf"`);
        return res.send(buffer);
    } catch (err) {
        console.error('Error exportando vehiculo:', err);
        res.status(500).json({ error: 'No se pudo generar el documento.' });
    }
};

// GET /api/export/conductor/:id?formato=pdf|word
export const exportarConductor = async (req, res) => {
    try {
        const { id } = req.params;
        const formato = req.query.formato === 'word' ? 'word' : 'pdf';
        const datos = await datosConductor(id, req.usuario);
        if (!datos.ok) return res.status(datos.status || 404).json({ error: datos.error });

        const cedula = (datos.conductor.cedula || id).toString().replace(/\s+/g, '');
        const nombreBase = `conductor-${cedula}`;
        if (formato === 'word') {
            const buffer = await conductorWordBuffer(datos);
            res.setHeader('Content-Type', TIPO_WORD);
            res.setHeader('Content-Disposition', `attachment; filename="${nombreBase}.docx"`);
            return res.send(buffer);
        }
        const buffer = await conductorPdfBuffer(datos);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${nombreBase}.pdf"`);
        return res.send(buffer);
    } catch (err) {
        console.error('Error exportando conductor:', err);
        res.status(500).json({ error: 'No se pudo generar el documento.' });
    }
};

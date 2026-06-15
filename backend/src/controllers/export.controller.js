import { datosChequeo } from '../services/export/datos.js';
import { chequeoPdfBuffer } from '../services/export/pdf/chequeoPdf.js';
import { chequeoWordBuffer } from '../services/export/word/chequeoWord.js';

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
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
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

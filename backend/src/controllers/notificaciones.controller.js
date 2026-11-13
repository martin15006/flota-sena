import {
    listarMisNotificaciones,
    contarNoLeidas,
    marcarLeida,
    marcarTodasLeidas,
} from '../services/notificaciones.service.js';

export const getMisNotificaciones = async (req, res) => {
    try {
        const { pagina, limite, solo_no_leidas } = req.query;
        const resultado = await listarMisNotificaciones({
            destinatarioId: req.usuario.id,
            pagina: pagina ? parseInt(pagina, 10) : 1,
            limite: limite ? parseInt(limite, 10) : 20,
            soloNoLeidas: solo_no_leidas === 'true',
        });
        res.json(resultado);
    } catch (err) {
        console.error('Error listando notificaciones:', err);
        res.status(500).json({ error: 'Error al listar notificaciones' });
    }
};

export const getContadorNoLeidas = async (req, res) => {
    try {
        const count = await contarNoLeidas(req.usuario.id);
        res.json({ count });
    } catch (err) {
        console.error('Error contando notificaciones no leidas:', err);
        res.status(500).json({ error: 'Error al contar notificaciones' });
    }
};

export const patchMarcarLeida = async (req, res) => {
    try {
        const { id } = req.params;
        const data = await marcarLeida(id, req.usuario.id);
        if (!data) {
            return res.status(404).json({ error: 'Notificacion no encontrada' });
        }
        res.json({ mensaje: 'Marcada como leida', notificacion: data });
    } catch (err) {
        console.error('Error marcando como leida:', err);
        res.status(500).json({ error: 'Error al marcar la notificacion' });
    }
};

export const patchMarcarTodasLeidas = async (req, res) => {
    try {
        await marcarTodasLeidas(req.usuario.id);
        res.json({ mensaje: 'Todas las notificaciones marcadas como leidas' });
    } catch (err) {
        console.error('Error marcando todas como leidas:', err);
        res.status(500).json({ error: 'Error al marcar las notificaciones' });
    }
};

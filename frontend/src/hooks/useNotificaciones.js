// useNotificaciones — hook global del Bloque C paso 3.
//
// Mantiene el contador de no leidas actualizado para que el punto rojo de la
// campanita aparezca en TODAS las paginas del admin (no solo dashboard).
// Polling cada 30s contra GET /api/notificaciones/no-leidas/count.
//
// Tambien expone funciones para listar/leer/marcar todas, que usa el dropdown
// de la campanita cuando se abre.

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../lib/api.js";

const INTERVALO_POLLING_MS = 30 * 1000; // 30 segundos

function useNotificaciones({ habilitado = true } = {}) {
    const [contadorNoLeidas, setContadorNoLeidas] = useState(0);
    const [lista, setLista] = useState([]);
    const [cargandoLista, setCargandoLista] = useState(false);
    const timerRef = useRef(null);

    const refrescarContador = useCallback(async () => {
        if (!habilitado) return;
        try {
            const data = await api("/notificaciones/no-leidas/count");
            setContadorNoLeidas(data.count || 0);
        } catch {
            // Falla silenciosa — el polling intentara de nuevo en 30s
        }
    }, [habilitado]);

    const cargarLista = useCallback(async () => {
        if (!habilitado) return;
        setCargandoLista(true);
        try {
            const data = await api("/notificaciones?limite=10");
            setLista(data.notificaciones || []);
        } catch {
            setLista([]);
        } finally {
            setCargandoLista(false);
        }
    }, [habilitado]);

    const marcarLeida = useCallback(async (id) => {
        try {
            await api(`/notificaciones/${id}/leer`, { method: "PATCH" });
            // Optimistic update: marcar localmente sin esperar refrescar
            setLista((prev) =>
                prev.map((n) => (n.id === id ? { ...n, leida: true } : n))
            );
            setContadorNoLeidas((prev) => Math.max(0, prev - 1));
        } catch {
            // si falla, refrescar para sincronizar
            refrescarContador();
            cargarLista();
        }
    }, [refrescarContador, cargarLista]);

    const marcarTodasLeidas = useCallback(async () => {
        try {
            await api("/notificaciones/leer-todas", { method: "PATCH" });
            setLista((prev) => prev.map((n) => ({ ...n, leida: true })));
            setContadorNoLeidas(0);
        } catch {
            refrescarContador();
        }
    }, [refrescarContador]);

    // Polling del contador
    useEffect(() => {
        if (!habilitado) {
            if (timerRef.current) clearInterval(timerRef.current);
            return undefined;
        }
        refrescarContador();
        timerRef.current = setInterval(refrescarContador, INTERVALO_POLLING_MS);
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [habilitado, refrescarContador]);

    return {
        contadorNoLeidas,
        lista,
        cargandoLista,
        cargarLista,
        marcarLeida,
        marcarTodasLeidas,
        refrescarContador,
    };
}

export default useNotificaciones;

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../lib/api.js";
import { useAuth } from "./useAuth.js";
import { supabaseRealtime } from "../lib/supabaseClient.js";

const INTERVALO_POLLING_MS = 60 * 1000;

function useNotificaciones({ habilitado = true } = {}) {
    const { usuario } = useAuth();
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
            setLista((prev) =>
                prev.map((n) => (n.id === id ? { ...n, leida: true } : n))
            );
            setContadorNoLeidas((prev) => Math.max(0, prev - 1));
        } catch {
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

    useEffect(() => {
        if (!habilitado || !usuario?.id || !supabaseRealtime) return undefined;

        const canal = supabaseRealtime
            .channel(`notif_${usuario.id}`)
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "notificaciones",
                    filter: `destinatario_id=eq.${usuario.id}`,
                },
                (payload) => {
                    const nueva = payload.new;
                    if (!nueva) return;
                    setContadorNoLeidas((prev) => prev + 1);
                    setLista((prev) => {
                        if (prev.some((n) => n.id === nueva.id)) return prev;
                        return [nueva, ...prev].slice(0, 10);
                    });
                }
            )
            .subscribe();

        return () => {
            supabaseRealtime.removeChannel(canal);
        };
    }, [habilitado, usuario?.id]);

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

import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { API_URL } from "../lib/api.js";

const MINUTOS_DEFECTO = 2;

function useTimeoutAbandono(chequeoId, minutos = MINUTOS_DEFECTO) {
    const navigate = useNavigate();
    const timerRef = useRef(null);
    const yaAbandonadoRef = useRef(false);

    useEffect(() => {
        if (!chequeoId) return undefined;

        const milisegundos = minutos * 60 * 1000;
        const apiUrl = `${API_URL}/chequeos/${chequeoId}/abandonar`;

        const marcarAbandono = async (motivo) => {
            if (yaAbandonadoRef.current) return;
            yaAbandonadoRef.current = true;
            const token = localStorage.getItem("token");
            try {
                await fetch(apiUrl, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: token ? `Bearer ${token}` : "",
                    },
                    body: JSON.stringify({ motivo }),
                });
            } catch {
            }
        };

        const marcarAbandonoBeacon = (motivo) => {
            if (yaAbandonadoRef.current) return;
            yaAbandonadoRef.current = true;
            const token = localStorage.getItem("token");
            try {
                const data = new Blob(
                    [JSON.stringify({ motivo, token })],
                    { type: "application/json" }
                );
                navigator.sendBeacon(apiUrl, data);
            } catch {
            }
        };

        const enInactividad = async () => {
            await marcarAbandono("inactividad");
            alert(
                "Tu chequeo fue cancelado por inactividad de " +
                    minutos +
                    " minutos. El administrador ha sido notificado. " +
                    "Si necesitas continuar, debes iniciar un chequeo nuevo."
            );
            navigate("/conductor");
        };

        const resetearTimer = () => {
            if (timerRef.current) clearTimeout(timerRef.current);
            timerRef.current = setTimeout(enInactividad, milisegundos);
        };

        const onBeforeUnload = () => {
            marcarAbandonoBeacon("cerro_pestana");
        };

        const eventos = ["click", "touchstart", "keydown", "scroll", "mousemove"];
        eventos.forEach((ev) => window.addEventListener(ev, resetearTimer, { passive: true }));
        window.addEventListener("beforeunload", onBeforeUnload);

        resetearTimer();

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
            eventos.forEach((ev) => window.removeEventListener(ev, resetearTimer));
            window.removeEventListener("beforeunload", onBeforeUnload);
        };
    }, [chequeoId, minutos, navigate]);
}

export default useTimeoutAbandono;

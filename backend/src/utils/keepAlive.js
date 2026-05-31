import { supabase } from "../config/supabase.js";

const INTERVALO_MS = 4 * 60 * 1000;

let intervaloId = null;
let fallosConsecutivos = 0;

const latido = async () => {
    const inicio = Date.now();
    try {
        const { error } = await supabase
            .from("vehiculos")
            .select("id", { head: true, count: "exact" })
            .limit(1);

        if (error) {
            fallosConsecutivos += 1;
            console.warn(
                `[KEEP-ALIVE] Latido fallido (${fallosConsecutivos}):`,
                error.message
            );
            return;
        }

        if (fallosConsecutivos > 0) {
            console.log(
                `[KEEP-ALIVE] Conexion recuperada despues de ${fallosConsecutivos} fallos (${Date.now() - inicio}ms)`
            );
            fallosConsecutivos = 0;
        }
    } catch (err) {
        fallosConsecutivos += 1;
        console.warn(
            `[KEEP-ALIVE] Excepcion en latido (${fallosConsecutivos}):`,
            err.message
        );
    }
};

export const iniciarKeepAlive = () => {
    if (intervaloId) return;
    console.log(`[KEEP-ALIVE] Activado cada ${INTERVALO_MS / 1000}s`);
    latido();
    intervaloId = setInterval(latido, INTERVALO_MS);
};

export const detenerKeepAlive = () => {
    if (!intervaloId) return;
    clearInterval(intervaloId);
    intervaloId = null;
    console.log("[KEEP-ALIVE] Detenido");
};

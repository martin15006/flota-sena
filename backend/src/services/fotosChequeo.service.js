import { supabase } from "../config/supabase.js";
import {
    subirArchivoACloudinary,
    eliminarDeCloudinary,
} from "./vehiculos.service.js";

const MAX_FOTOS_POR_RESPUESTA = 3;

const verificarRespuestaEditable = async (respuestaId, conductorId) => {
    const { data, error } = await supabase
        .from("respuestas_chequeo")
        .select(`
            id, estado,
            chequeo:chequeos_preoperacionales (id, conductor_id, cerrado)
        `)
        .eq("id", respuestaId)
        .maybeSingle();

    if (error || !data) {
        return { error: { status: 404, mensaje: "Respuesta no encontrada" } };
    }
    if (data.chequeo?.conductor_id !== conductorId) {
        return { error: { status: 403, mensaje: "Esta respuesta no es tuya" } };
    }
    if (data.chequeo?.cerrado) {
        return { error: { status: 400, mensaje: "El chequeo ya fue cerrado. No puedes modificar las fotos." } };
    }
    if (data.estado !== "no_cumple") {
        return {
            error: {
                status: 400,
                mensaje: "Solo se pueden subir fotos a items marcados como NO CUMPLE",
            },
        };
    }
    return { respuesta: data };
};

export const subirFotoEvidencia = async ({ respuestaId, conductorId, buffer, descripcion }) => {
    const verificacion = await verificarRespuestaEditable(respuestaId, conductorId);
    if (verificacion.error) return verificacion;

    const { count: fotosExistentes, error: errCount } = await supabase
        .from("fotos_chequeo")
        .select("id", { count: "exact", head: true })
        .eq("respuesta_id", respuestaId);

    if (errCount) {
        return { error: { status: 500, mensaje: errCount.message } };
    }
    if ((fotosExistentes || 0) >= MAX_FOTOS_POR_RESPUESTA) {
        return {
            error: {
                status: 400,
                mensaje: `Ya hay ${MAX_FOTOS_POR_RESPUESTA} fotos en este item. Elimina una antes de subir otra.`,
            },
        };
    }

    let resultado;
    try {
        resultado = await subirArchivoACloudinary(buffer, "chequeos-evidencia", "image");
    } catch (err) {
        return { error: { status: 500, mensaje: `Error subiendo a Cloudinary: ${err.message}` } };
    }

    const { data: foto, error: errInsert } = await supabase
        .from("fotos_chequeo")
        .insert({
            respuesta_id: respuestaId,
            url: resultado.secure_url,
            cloudinary_public_id: resultado.public_id,
            descripcion: descripcion?.trim() || null,
        })
        .select()
        .single();

    if (errInsert) {
        await eliminarDeCloudinary(resultado.public_id);
        return { error: { status: 500, mensaje: errInsert.message } };
    }

    return { foto };
};

export const eliminarFotoEvidencia = async ({ fotoId, conductorId }) => {
    const { data: foto, error } = await supabase
        .from("fotos_chequeo")
        .select(`
            id, cloudinary_public_id,
            respuesta:respuestas_chequeo (
                id, estado,
                chequeo:chequeos_preoperacionales (id, conductor_id, cerrado)
            )
        `)
        .eq("id", fotoId)
        .maybeSingle();

    if (error || !foto) {
        return { error: { status: 404, mensaje: "Foto no encontrada" } };
    }
    if (foto.respuesta?.chequeo?.conductor_id !== conductorId) {
        return { error: { status: 403, mensaje: "Esta foto no es tuya" } };
    }
    if (foto.respuesta?.chequeo?.cerrado) {
        return { error: { status: 400, mensaje: "El chequeo ya fue cerrado. No puedes eliminar las fotos." } };
    }

    await eliminarDeCloudinary(foto.cloudinary_public_id);

    const { error: errDel } = await supabase
        .from("fotos_chequeo")
        .delete()
        .eq("id", fotoId);

    if (errDel) {
        return { error: { status: 500, mensaje: errDel.message } };
    }
    return { ok: true };
};

export const togglePreservarFoto = async ({ fotoId, preservar }) => {
    const { data, error } = await supabase
        .from("fotos_chequeo")
        .update({
            preservar_siempre: !!preservar,
            ...(preservar === false && { fecha_borrado_programado: null }),
        })
        .eq("id", fotoId)
        .select()
        .maybeSingle();

    if (error || !data) {
        return { error: { status: 404, mensaje: error?.message || "Foto no encontrada" } };
    }
    return { foto: data };
};

export const listarFotosDeRespuesta = async (respuestaId, conductorId) => {
    const { data: resp, error: errResp } = await supabase
        .from("respuestas_chequeo")
        .select("id, chequeo:chequeos_preoperacionales (conductor_id)")
        .eq("id", respuestaId)
        .maybeSingle();

    if (errResp || !resp) {
        return { error: { status: 404, mensaje: "Respuesta no encontrada" } };
    }
    if (resp.chequeo?.conductor_id !== conductorId) {
        return { error: { status: 403, mensaje: "Esta respuesta no es tuya" } };
    }

    const { data, error } = await supabase
        .from("fotos_chequeo")
        .select("id, url, descripcion, fecha_subida, preservar_siempre, fecha_borrado_programado")
        .eq("respuesta_id", respuestaId)
        .order("fecha_subida", { ascending: true });
    if (error) throw error;
    return { fotos: data };
};

import { supabase } from '../config/supabase.js';

export const buscarEmailPorCedula = async (cedula) => {
    const { data: usuario, error } = await supabase
        .from('usuarios')
        .select('id')
        .eq('cedula', cedula)
        .single();

    if (error || !usuario) return null;

    const { data, error: errAuth } = await supabase.auth.admin.getUserById(
        usuario.id
    );

    if (errAuth) return null;
    return data?.user?.email ?? null;
};


export const resolverIdentificador = async (identificador) => {
    if (identificador.includes('@')) {
        return identificador;
    }

    return await buscarEmailPorCedula(identificador);
};


export const obtenerPerfil = async (userId) => {
    const { data, error } = await supabase
        .from('usuarios')
        .select(`
            *,
            centros_formacion:centro_id (
                id,
                nombre
            )
        `)
        .eq('id', userId)
        .single();

    if (error) throw error;
    if (data) {
        data.centro_nombre = data.centros_formacion?.nombre || null;
        delete data.centros_formacion;
    }
    return data;
};
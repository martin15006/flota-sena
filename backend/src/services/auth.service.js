import { supabase } from '../config/supabase.js';

export const buscarEmailPorCedula = async (cedula) => {
    const { data: usuario, error } = await supabase
        .from('usuarios')
        .select('id')
        .eq('cedula', cedula)
        .eq('activo', true)
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
        .select('*')
        .eq('id', userId)
        .single();

    if (error) throw error;
    return data;
};
import { supabase } from '../config/supabase.js';

// IMPORTANTE: este helper NO debe filtrar por activo=true.
// Antes filtrabamos por activo=true aqui, pero eso provocaba que los conductores
// desactivados que intentaban entrar con su cedula vieran "Credenciales invalidas"
// (porque no se resolvia el email), en lugar del mensaje correcto "Cuenta desactivada".
//
// El chequeo de activo se hace despues en el controller, *despues* de validar
// que la contraseña sea correcta. Esto evita filtrar la existencia de cuentas
// a atacantes externos (account enumeration) y a la vez le da un mensaje claro
// al usuario legitimo que si conoce su contraseña.
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
        .select('*')
        .eq('id', userId)
        .single();

    if (error) throw error;
    return data;
};
import { supabase } from "../config/supabase.js";
import { resolverIdentificador, obtenerPerfil } from "../services/auth.service.js";


export const login = async (req, res) => {
    try {
        const {identificador, password }=req.body;

        if (!identificador || !password){
            return res.status(400).json({
                error: 'Identificador y contraseñas son obligatorios',
            });
        }

        const email = await resolverIdentificador(identificador);
        if(!email){
            return res.status(401).json({error:'Credenciales invalidas'});
        }

        const {data, error} = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error){
            return res.status(401).json({error: 'Credenciales invalidas'});
        }

        const perfil = await obtenerPerfil(data.user.id);

        if (!perfil.activo){
            return res.status(403).json({error: 'Cuenta desactivada'});
        }
        
        res.json({
            token: data.session.access_token,
            refresh_token: data.session.refresh_token,
            expira_en: data.session.expires_in,
            usuario: {
                id: perfil.id,
                cedula: perfil.cedula,
                nombre_completo: perfil.nombre_completo,
                rol: perfil.rol,
                debe_cambiar_password: perfil.debe_cambiar_password,
                foto_url: perfil.foto_url,
            },
        });
    }catch (err){
        console.error('Error en login: ', err);
        res.status(500).json({error: 'Error interno del servidor'});
    }
};

export const obtenerActual = (req, res)=>{
    res.json({
        usuario:{
            id: req.usuario.id,
            cedula: req.usuario.cedula,
            nombre_completo: req.usuario.nombre_completo,
            telefono: req.usuario.telefono,
            email: req.usuario.email,
            rol: req.usuario.rol,
            foto_url: req.usuario.foto_url,
            debe_cambiar_password: req.usuario.debe_cambiar_password,
            licencia_numero: req.usuario.licencia_numero,
            licencia_categoria: req.usuario.licencia_categoria,
            licencia_vencimiento: req.usuario.licencia_vencimiento,
        },
    });
};
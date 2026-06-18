// Servicio de envio de correos + plantillas HTML con branding SENA.
//
// enviarCorreo() nunca tumba el flujo principal: si no hay credenciales (correo
// deshabilitado) o el envio falla, loguea y devuelve { enviado:false } sin lanzar.
import { transporter, correoHabilitado, REMITENTE } from '../config/email.js';
import { supabase } from '../config/supabase.js';
import { LOGO_PATH, COLORES, fechaLarga } from './export/branding.js';

const APP_URL = process.env.CORS_ORIGIN || '';

// Envia un correo. `para` puede ser un email o un array de emails.
export const enviarCorreo = async ({ para, asunto, html }) => {
    const destinos = (Array.isArray(para) ? para : [para]).filter(Boolean);
    if (!correoHabilitado) {
        console.log(`[correo] deshabilitado (sin credenciales) — se omite: "${asunto}"`);
        return { enviado: false, omitido: true };
    }
    if (destinos.length === 0) {
        return { enviado: false, sinDestinatarios: true };
    }
    try {
        await transporter.sendMail({
            from: REMITENTE,
            to: destinos,
            subject: asunto,
            html,
            attachments: [{ filename: 'logo.png', path: LOGO_PATH, cid: 'logosena' }],
        });
        return { enviado: true, cantidad: destinos.length };
    } catch (err) {
        console.error('[correo] error enviando:', err.message);
        return { enviado: false, error: err.message };
    }
};

// Resuelve los correos de una lista de IDs de usuario. Los emails viven en
// Supabase Auth (no en la tabla usuarios), asi que se traen de ahi.
export const emailsDeUsuarios = async (ids) => {
    const set = new Set((ids || []).filter(Boolean));
    if (set.size === 0) return [];
    const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (error) {
        console.error('[correo] error listando usuarios auth:', error.message);
        return [];
    }
    return (data?.users || [])
        .filter((u) => set.has(u.id) && u.email)
        .map((u) => u.email);
};

// ---- Plantillas HTML (estilos inline: los clientes de correo no leen <style>) ----

const layout = (titulo, cuerpoHtml) => `
<div style="margin:0;padding:0;background:#f1efe8;font-family:Arial,Helvetica,sans-serif;color:#1a1a1a;">
  <div style="max-width:640px;margin:0 auto;background:#ffffff;">
    <div style="background:${COLORES.verde};padding:18px 24px;display:flex;align-items:center;">
      <img src="cid:logosena" width="42" height="42" alt="SENA" style="background:#fff;border-radius:6px;padding:4px;vertical-align:middle;" />
      <span style="color:#fff;font-size:18px;font-weight:bold;margin-left:12px;vertical-align:middle;">${titulo}</span>
    </div>
    <div style="padding:22px 24px;">
      ${cuerpoHtml}
    </div>
    <div style="padding:14px 24px;background:#fafafa;border-top:1px solid #e5e5e5;color:#5f5e5a;font-size:12px;">
      Sistema de Gestion de Flota SENA · Este es un correo automatico, no responder.
    </div>
  </div>
</div>`;

const boton = (texto, url) => url
    ? `<a href="${url}" style="display:inline-block;margin-top:16px;background:${COLORES.verde};color:#fff;text-decoration:none;padding:10px 22px;border-radius:8px;font-weight:bold;">${texto}</a>`
    : '';

// Correo inmediato de falla critica (vehiculo no operativo).
export const plantillaFallaCritica = ({ placa, conductor, criticidad, fecha, chequeoId, origen }) => {
    const url = chequeoId && APP_URL ? `${APP_URL}/admin/chequeos/${chequeoId}` : '';
    const cuerpo = `
    <div style="background:#FBEAEA;border-left:4px solid ${COLORES.critico};padding:12px 16px;border-radius:6px;">
      <div style="font-size:16px;font-weight:bold;color:${COLORES.critico};">Vehiculo NO OPERATIVO</div>
      <div style="font-size:13px;color:#5f5e5a;margin-top:2px;">Una falla critica fue detectada en un chequeo.</div>
    </div>
    <table style="width:100%;border-collapse:collapse;margin-top:16px;font-size:14px;">
      <tr><td style="padding:6px 0;color:#5f5e5a;width:140px;">Vehiculo</td><td style="padding:6px 0;font-weight:bold;">${placa || '—'}</td></tr>
      <tr><td style="padding:6px 0;color:#5f5e5a;">Conductor</td><td style="padding:6px 0;">${conductor || '—'}</td></tr>
      <tr><td style="padding:6px 0;color:#5f5e5a;">Criticidad</td><td style="padding:6px 0;">${criticidad != null ? `${criticidad}%` : '—'}</td></tr>
      <tr><td style="padding:6px 0;color:#5f5e5a;">Fecha</td><td style="padding:6px 0;">${fechaLarga(fecha)}</td></tr>
      ${origen ? `<tr><td style="padding:6px 0;color:#5f5e5a;">Centro</td><td style="padding:6px 0;">${origen}</td></tr>` : ''}
    </table>
    <div style="margin-top:12px;font-size:13px;color:#5f5e5a;">El vehiculo no puede operar hasta que un administrador lo revise y autorice.</div>
    ${boton('Ver el chequeo', url)}`;
    return layout('Falla critica en un vehiculo', cuerpo);
};

// Correo-resumen diario de documentos por vencer (un correo por admin).
export const plantillaDigestVencimientos = ({ items, centroNombre }) => {
    const filas = items.map((it) => {
        const color = it.dias <= 0 ? COLORES.critico : it.dias <= 7 ? COLORES.critico : it.dias <= 15 ? COLORES.alerta : '#1a1a1a';
        const faltan = it.dias <= 0 ? 'VENCIDO' : `${it.dias} dia${it.dias === 1 ? '' : 's'}`;
        return `<tr style="border-top:1px solid #f0f0f0;">
          <td style="padding:8px 6px;font-size:13px;">${it.categoria}</td>
          <td style="padding:8px 6px;font-size:13px;">${it.sujeto}</td>
          <td style="padding:8px 6px;font-size:13px;">${fechaLarga(it.vence)}</td>
          <td style="padding:8px 6px;font-size:13px;font-weight:bold;color:${color};">${faltan}</td>
        </tr>`;
    }).join('');
    const cuerpo = `
    <div style="font-size:14px;">Documentos por vencer${centroNombre ? ` en <b>${centroNombre}</b>` : ''}:</div>
    <table style="width:100%;border-collapse:collapse;margin-top:14px;">
      <tr style="background:${COLORES.grisFondo};">
        <td style="padding:8px 6px;font-size:11px;text-transform:uppercase;color:#5f5e5a;">Documento</td>
        <td style="padding:8px 6px;font-size:11px;text-transform:uppercase;color:#5f5e5a;">Vehiculo / Conductor</td>
        <td style="padding:8px 6px;font-size:11px;text-transform:uppercase;color:#5f5e5a;">Vence</td>
        <td style="padding:8px 6px;font-size:11px;text-transform:uppercase;color:#5f5e5a;">Faltan</td>
      </tr>
      ${filas}
    </table>
    <div style="margin-top:12px;font-size:13px;color:#5f5e5a;">Renueva estos documentos a tiempo para que los vehiculos puedan seguir operando.</div>`;
    return layout('Documentos por vencer', cuerpo);
};

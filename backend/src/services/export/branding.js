import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { supabase } from '../../config/supabase.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const LOGO_PATH = join(__dirname, 'assets', 'logoverde.png');

// Paleta SENA para los documentos
export const COLORES = {
    verde: '#39A900',
    verdeOscuro: '#2A7A00',
    grisTexto: '#1A1A1A',
    grisSuave: '#5F5E5A',
    grisLinea: '#E5E5E5',
    grisFondo: '#F1EFE8',
    ok: '#3B6D11',
    alerta: '#BA7517',
    critico: '#A32D2D',
};

// Resuelve el centro de un documento a { centroNombre, departamentoNombre } para el
// header dinamico "SENA · Regional {departamento} · {Centro}".
export const cabeceraDeCentro = async (centroId) => {
    if (!centroId) return { centroNombre: '', departamentoNombre: '' };
    const { data } = await supabase
        .from('centros_formacion')
        .select('nombre, ciudad:ciudad_id ( departamento:departamento_id ( nombre ) )')
        .eq('id', centroId)
        .maybeSingle();
    return {
        centroNombre: data?.nombre || '',
        departamentoNombre: data?.ciudad?.departamento?.nombre || '',
    };
};

// "SENA · Regional Tolima · Centro de Industria y Construccion"
export const lineaOrigen = ({ centroNombre, departamentoNombre }) => {
    const partes = ['SENA'];
    if (departamentoNombre) partes.push(`Regional ${departamentoNombre}`);
    if (centroNombre) partes.push(centroNombre);
    return partes.join(' · ');
};

export const fechaLarga = (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('es-CO', {
        day: '2-digit', month: 'long', year: 'numeric',
    });
};
export const fechaHora = (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('es-CO', {
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
};

// Etiquetas legibles (espejo de las del frontend) para los documentos.
const TIPOS_VEHICULO = { camion: 'Camión', camioneta: 'Camioneta', tractocamion: 'Tractocamión', microbus: 'Microbús', buseta: 'Buseta', bus: 'Bus' };
export const etiquetaTipo = (t) => TIPOS_VEHICULO[t] || t || '—';

const ESTADOS_VEHICULO = { operativo: 'Operativo', observacion: 'Observación', alerta: 'Alerta', critico: 'Crítico', no_operativo: 'No operativo' };
export const etiquetaEstado = (e) => ESTADOS_VEHICULO[e] || e || '—';

// Cargo legible (espejo de frontend/src/lib/roles.js). Un conductor del pool se
// muestra como "Pool de transporte".
const ETIQUETA_ROL = { superadmin: 'Director Nacional', admin_departamental: 'Director Regional', admin_centro: 'Coordinador de Flota', admin: 'Coordinador de Flota', conductor: 'Conductor' };
export const etiquetaCargo = (rol, esPool) =>
    rol === 'conductor' && esPool ? 'Pool de transporte' : (ETIQUETA_ROL[rol] || rol || '—');

// Color del estado (operativo/observacion/alerta/critico/no_operativo) para banderas y badges.
export const colorDeEstado = (estado) =>
    estado === 'critico' || estado === 'no_operativo' ? COLORES.critico
        : estado === 'alerta' || estado === 'observacion' ? COLORES.alerta
            : COLORES.ok;

// ¿La fecha (vencimiento) ya pasó? Devuelve false si no hay fecha.
export const estaVencido = (fecha) => {
    if (!fecha) return false;
    const t = new Date(fecha).getTime();
    return Number.isFinite(t) && t < Date.now();
};

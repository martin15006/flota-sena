// Descarga un archivo de un endpoint protegido (manda el token, lee el blob y dispara
// la descarga). `endpoint` es relativo a /api. Lanza Error con el mensaje del backend.
const API_URL = `http://${window.location.hostname}:3001/api`;

export const descargarArchivo = async (endpoint, nombreSugerido) => {
    const token = localStorage.getItem('token');
    const centroActivo = localStorage.getItem('flota_centro_activo');
    const resp = await fetch(`${API_URL}${endpoint}`, {
        headers: {
            ...(token && { Authorization: `Bearer ${token}` }),
            ...(centroActivo && { 'X-Centro-Activo': centroActivo }),
        },
    });
    if (!resp.ok) {
        let msg = 'No se pudo generar el documento';
        try { msg = (await resp.json()).error || msg; } catch { /* respuesta no-JSON */ }
        throw new Error(msg);
    }
    const blob = await resp.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombreSugerido || 'documento';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
};

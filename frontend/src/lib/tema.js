const CLAVE = "flota-tema";
const EVENTO = "flota-tema-cambio";

export function leerPreferencia() {
  try {
    return localStorage.getItem(CLAVE) === "oscuro" ? "oscuro" : "claro";
  } catch {
    return "claro";
  }
}

export function aplicarTema(pref) {
  const efectivo = pref === "oscuro" ? "oscuro" : "claro";
  document.documentElement.setAttribute("data-tema", efectivo);
  return efectivo;
}

export function guardarPreferencia(pref) {
  try {
    localStorage.setItem(CLAVE, pref);
  } catch {
  }
  const efectivo = aplicarTema(pref);
  window.dispatchEvent(new CustomEvent(EVENTO, { detail: pref }));
  return efectivo;
}

export function suscribirCambio(cb) {
  const handler = (e) => cb(e.detail);
  window.addEventListener(EVENTO, handler);
  return () => window.removeEventListener(EVENTO, handler);
}

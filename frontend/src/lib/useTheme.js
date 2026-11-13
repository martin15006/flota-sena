import { useEffect, useState, useCallback } from "react";
import { leerPreferencia, guardarPreferencia, suscribirCambio } from "./tema.js";

export function useTheme() {
  const [preferencia, setPref] = useState(leerPreferencia);

  useEffect(() => suscribirCambio((pref) => setPref(pref)), []);

  const temaEfectivo = preferencia === "oscuro" ? "oscuro" : "claro";

  useEffect(() => {
    document.documentElement.setAttribute("data-tema", temaEfectivo);
  }, [temaEfectivo]);

  const setPreferencia = useCallback((pref) => {
    guardarPreferencia(pref);
    setPref(pref);
  }, []);

  return { preferencia, temaEfectivo, setPreferencia };
}

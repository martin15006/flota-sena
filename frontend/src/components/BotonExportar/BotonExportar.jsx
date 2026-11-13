import { useState } from "react";
import { descargarArchivo } from "../../lib/descargar.js";
import "./BotonExportar.css";

function BotonExportar({ base, nombre = "documento", compacto = false, onError }) {
    const [cargando, setCargando] = useState(null);

    const bajar = async (formato) => {
        setCargando(formato);
        try {
            const ext = formato === "word" ? "docx" : "pdf";
            const sep = base.includes("?") ? "&" : "?";
            await descargarArchivo(`${base}${sep}formato=${formato}`, `${nombre}.${ext}`);
        } catch (err) {
            if (onError) onError(err.message);
            else alert(err.message);
        } finally {
            setCargando(null);
        }
    };

    return (
        <span className={`boton-exportar ${compacto ? "boton-exportar-compacto" : ""}`}>
            <button type="button" className="boton-exportar-pdf" onClick={() => bajar("pdf")} disabled={cargando !== null} title="Descargar PDF">
                {cargando === "pdf" ? "…" : "PDF"}
            </button>
            <button type="button" className="boton-exportar-word" onClick={() => bajar("word")} disabled={cargando !== null} title="Descargar Word">
                {cargando === "word" ? "…" : "Word"}
            </button>
        </span>
    );
}

export default BotonExportar;

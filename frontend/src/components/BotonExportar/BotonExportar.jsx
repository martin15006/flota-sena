import { useState } from "react";
import { descargarArchivo } from "../../lib/descargar.js";
import "./BotonExportar.css";

// Dos botones "PDF" / "Word" que descargan de `base` (ej. "/export/chequeo/123").
// `nombre` es el nombre base del archivo. `compacto` para usarlo en filas de tabla.
function BotonExportar({ base, nombre = "documento", compacto = false, onError }) {
    const [cargando, setCargando] = useState(null); // 'pdf' | 'word' | null

    const bajar = async (formato) => {
        setCargando(formato);
        try {
            const ext = formato === "word" ? "docx" : "pdf";
            await descargarArchivo(`${base}?formato=${formato}`, `${nombre}.${ext}`);
        } catch (err) {
            if (onError) onError(err.message);
            else alert(err.message);
        } finally {
            setCargando(null);
        }
    };

    return (
        <span className={`boton-exportar ${compacto ? "boton-exportar-compacto" : ""}`}>
            <button type="button" onClick={() => bajar("pdf")} disabled={cargando !== null} title="Descargar PDF">
                {cargando === "pdf" ? "…" : "PDF"}
            </button>
            <button type="button" onClick={() => bajar("word")} disabled={cargando !== null} title="Descargar Word">
                {cargando === "word" ? "…" : "Word"}
            </button>
        </span>
    );
}

export default BotonExportar;

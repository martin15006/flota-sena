// Pool · Suplencia Fase B: cuando el pool cubre VARIOS centros (toda una regional),
// elige acá a cuál entrar a gestionar (uno a la vez). Al elegir, guardamos el centro
// activo, recargamos la sesión (/auth/me ya manda el header) y entramos al panel.
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth.js";
import { api } from "../../lib/api.js";
import { setCentroActivo } from "../../lib/centroActivo.js";
import "./SelectorCentroSuplencia.css";

function SelectorCentroSuplencia() {
    const { usuario, actualizarUsuario } = useAuth();
    const navigate = useNavigate();
    const [cargandoId, setCargandoId] = useState(null);

    if (!usuario) return null;

    const centros = usuario.suplencia_centros || [];
    const deptoNombre = usuario.suplencia?.departamento?.nombre;

    const elegir = async (centro) => {
        setCargandoId(centro.id);
        setCentroActivo(centro.id);
        try {
            const data = await api("/auth/me"); // ya manda X-Centro-Activo
            actualizarUsuario(data.usuario);
            navigate("/dashboard");
        } catch {
            setCargandoId(null);
        }
    };

    return (
        <div className="selcentro-pagina">
            <div className="selcentro-card animar-fade-in-up">
                <img src="/logoverde.png" alt="SENA" className="selcentro-logo" />
                <h1 className="selcentro-titulo">Elegí el centro a gestionar</h1>
                <p className="selcentro-sub">
                    Estás supliendo{deptoNombre ? ` la Regional ${deptoNombre}` : ""}. Entrá a un
                    centro para gestionarlo; podés volver acá cuando quieras para cambiar.
                </p>

                <div className="selcentro-lista">
                    {centros.map((c) => {
                        const activo = usuario.centro_activo === c.id;
                        return (
                            <button
                                key={c.id}
                                className={`selcentro-item ${activo ? "selcentro-item-activo" : ""}`}
                                onClick={() => elegir(c)}
                                disabled={cargandoId !== null}
                            >
                                <span className="selcentro-item-icono">🏢</span>
                                <span className="selcentro-item-nombre">{c.nombre}</span>
                                {cargandoId === c.id
                                    ? <span className="selcentro-item-badge">Entrando…</span>
                                    : activo
                                        ? <span className="selcentro-item-badge">Actual</span>
                                        : <span className="selcentro-item-flecha">→</span>}
                            </button>
                        );
                    })}
                    {centros.length === 0 && (
                        <p className="selcentro-vacio">No hay centros para gestionar en esta suplencia.</p>
                    )}
                </div>

                <button className="selcentro-volver" onClick={() => navigate("/conductor")}>
                    ← Volver a mi panel de conductor
                </button>
            </div>
        </div>
    );
}

export default SelectorCentroSuplencia;

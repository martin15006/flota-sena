import { useEffect, useState } from "react";
import Modal from "../../../components/Modal/Modal.jsx";
import { api } from "../../../lib/api.js";
import "./ModalSuplencia.css";

// Activa o desactiva la suplencia de un conductor del pool. `usuario` es la fila
// del conductor (debe tener rol 'conductor' y es_pool true). onHecho(mensaje) avisa
// al padre para refrescar la lista y mostrar el toast.
function ModalSuplencia({ abierto, onCerrar, usuario, onHecho }) {
    const [suplenciaActiva, setSuplenciaActiva] = useState(null);
    const [hasta, setHasta] = useState("");
    const [motivo, setMotivo] = useState("");
    const [error, setError] = useState(null);
    const [cargando, setCargando] = useState(false);
    const [consultando, setConsultando] = useState(true);

    useEffect(() => {
        if (!abierto || !usuario) return;
        setError(null);
        setHasta("");
        setMotivo("");
        setConsultando(true);
        // ¿Ya tiene una suplencia activa? (filtramos por su centro)
        api(`/suplencias?activa=true&centro_id=${usuario.centro_id}`)
            .then((data) => {
                const mia = (data.suplencias || []).find((s) => s.pool_id === usuario.id);
                setSuplenciaActiva(mia || null);
            })
            .catch((err) => { if (!err.sesionExpirada) setError(err.message); })
            .finally(() => setConsultando(false));
    }, [abierto, usuario]);

    const activar = async () => {
        setError(null);
        setCargando(true);
        try {
            await api("/suplencias", {
                method: "POST",
                body: { pool_id: usuario.id, hasta: hasta || null, motivo: motivo || null },
            });
            onHecho(`Suplencia activada para ${usuario.nombre_completo}.`);
            onCerrar();
        } catch (err) {
            if (!err.sesionExpirada) setError(err.message);
        } finally { setCargando(false); }
    };

    const desactivar = async () => {
        setError(null);
        setCargando(true);
        try {
            await api(`/suplencias/${suplenciaActiva.id}/desactivar`, { method: "PATCH" });
            onHecho(`Suplencia finalizada para ${usuario.nombre_completo}.`);
            onCerrar();
        } catch (err) {
            if (!err.sesionExpirada) setError(err.message);
        } finally { setCargando(false); }
    };

    if (!usuario) return null;

    return (
        <Modal abierto={abierto} onCerrar={onCerrar} titulo={`Suplencia · ${usuario.nombre_completo}`}>
            <div className="modal-suplencia">
                {consultando ? (
                    <p className="modal-suplencia-cargando">Consultando…</p>
                ) : suplenciaActiva ? (
                    <>
                        <p className="modal-suplencia-info">
                            Este conductor está <strong>supliendo al Coordinador de Flota</strong>
                            {suplenciaActiva.hasta
                                ? ` hasta el ${new Date(suplenciaActiva.hasta).toLocaleDateString("es-CO")}`
                                : " (sin fecha de fin)"}.
                        </p>
                        <p className="modal-suplencia-meta">
                            Activada por <strong>{suplenciaActiva.activada_por?.nombre_completo || "—"}</strong>
                            {" el "}
                            {new Date(suplenciaActiva.desde).toLocaleDateString("es-CO")}
                            {suplenciaActiva.motivo ? ` · Motivo: ${suplenciaActiva.motivo}` : ""}
                        </p>
                        {error && <div className="modal-suplencia-error">⚠️ {error}</div>}
                        <div className="modal-suplencia-acciones">
                            <button className="modal-suplencia-boton-cancelar" onClick={onCerrar} disabled={cargando}>
                                Cerrar
                            </button>
                            <button className="modal-suplencia-boton-fin" onClick={desactivar} disabled={cargando}>
                                {cargando ? "Finalizando…" : "Finalizar suplencia"}
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        <p className="modal-suplencia-info">
                            Al activar, este conductor del pool reemplaza al Coordinador de Flota de su centro
                            (gestiona vehículos, conductores y chequeos) mientras dure la suplencia.
                        </p>
                        <label className="modal-suplencia-label">Hasta (opcional)</label>
                        <input type="date" className="modal-suplencia-input"
                            value={hasta} onChange={(e) => setHasta(e.target.value)} disabled={cargando} />
                        <small className="modal-suplencia-ayuda">
                            Si la dejás vacía, queda activa hasta que la finalices a mano.
                        </small>
                        <label className="modal-suplencia-label">Motivo (opcional)</label>
                        <input type="text" className="modal-suplencia-input" placeholder="Ej: vacaciones del coordinador"
                            value={motivo} onChange={(e) => setMotivo(e.target.value)} disabled={cargando} />
                        {error && <div className="modal-suplencia-error">⚠️ {error}</div>}
                        <div className="modal-suplencia-acciones">
                            <button className="modal-suplencia-boton-cancelar" onClick={onCerrar} disabled={cargando}>
                                Cancelar
                            </button>
                            <button className="modal-suplencia-boton-activar" onClick={activar} disabled={cargando}>
                                {cargando ? "Activando…" : "Activar suplencia"}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </Modal>
    );
}

export default ModalSuplencia;

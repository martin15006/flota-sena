import { useEffect } from "react";
import './Modal.css';

function Modal({ abierto, onCerrar, titulo, children, ancho = 'mediano' }) {
    // Cerrar con la tecla Esc 
    useEffect(() => {
        if (!abierto) return;
        const handler = (e) => {
            if (e.key === 'Escape') onCerrar();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [abierto, onCerrar]);

    // Bloquear el scroll del body cuando el modal permanece abierto 
    useEffect(() => {
        if (abierto) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [abierto]);

    if (!abierto) return null;

    return (
        <div className="modal-overlay" onClick={onCerrar}>
            <div
                className={`modal-contenedor modal-ancho-${ancho}`}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="modal-cabecera">
                    <h2 className="modal-titulo">{titulo}</h2>
                    <button
                        className="modal-cerrar"
                        onClick={onCerrar}
                        aria-label="Cerrar"
                    >
                        x
                    </button>
                </div>
                <div className="modal-cuerpo">{children}</div>
            </div>
        </div>
    );
}

export default Modal;
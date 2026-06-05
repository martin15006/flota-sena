// Campanita de notificaciones en el header del admin.
// Por ahora es un PLACEHOLDER no funcional (Bloque C la cableamos a notificaciones reales).
// El unico estado visible es el "punto rojo" que se pinta cuando hay notificaciones,
// controlado por la prop `tieneNotificaciones`.

import "./Campanita.css";

function Campanita({ tieneNotificaciones = false, onClick }) {
    const titulo = tieneNotificaciones
        ? "Tienes notificaciones nuevas"
        : "No tienes notificaciones";

    return (
        <button
            type="button"
            className="campanita"
            onClick={onClick}
            title={titulo}
            aria-label={titulo}
        >
            {/* SVG de campana — stroke estilo Heroicons/Feather para coherencia con el resto */}
            <svg
                xmlns="http://www.w3.org/2000/svg"
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
            >
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            {tieneNotificaciones && (
                <span className="campanita-punto" aria-hidden="true" />
            )}
        </button>
    );
}

export default Campanita;

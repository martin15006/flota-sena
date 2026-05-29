import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth.js";
import { api } from "../../lib/api.js";
import "./CambiarPassword.css";

function CambiarPassword() {
  const { usuario, cargando } = useAuth();
  const navigate = useNavigate();

  const [passwordActual, setPasswordActual] = useState("");
  const [passwordNueva, setPasswordNueva] = useState("");
  const [passwordConfirmacion, setPasswordConfirmacion] = useState("");
  const [error, setError] = useState(null);
  const [exito, setExito] = useState(false);
  const [enviando, setEnviando] = useState(false);

  // Mientras AuthContext valida
  if (cargando) return null;

  // Si no esta autenticado, al login
  if (!usuario) return <Navigate to="/login" replace />;

  const enviar = async (e) => {
    e.preventDefault();
    setError(null);
    setEnviando(true);

    try {
      await api("/auth/cambiar-password", {
        method: "POST",
        body: {
          password_actual: passwordActual,
          password_nueva: passwordNueva,
          password_confirmacion: passwordConfirmacion,
        },
      });

      setExito(true);
      // Esperar 1.5s para que el usuario vea el mensaje y luego redirigir
      setTimeout(() => navigate("/dashboard"), 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="cambiar-pass-pagina">
      <div className="cambiar-pass-fondo">
        <div className="cambiar-pass-formas"></div>
      </div>

      <div className="cambiar-pass-tarjeta animar-fade-in-up">
        <div className="cambiar-pass-cabecera">
          <img
            src="/logoverde.png"
            alt="SENA"
            className="cambiar-pass-logo"
          />
          <h1 className="cambiar-pass-titulo">Cambia tu contraseña</h1>
          <p className="cambiar-pass-subtitulo">
            {usuario.debe_cambiar_password
              ? "Por seguridad, debes cambiar tu contraseña temporal antes de continuar."
              : "Actualiza tu contraseña."}
          </p>
        </div>

        {exito ? (
          <div className="cambiar-pass-exito animar-fade-in">
            <div className="cambiar-pass-exito-icono">✓</div>
            <p>Contraseña actualizada correctamente</p>
            <p className="cambiar-pass-exito-sub">Redirigiendo al dashboard...</p>
          </div>
        ) : (
          <form className="cambiar-pass-form" onSubmit={enviar}>
            <div className="cambiar-pass-campo">
              <label className="cambiar-pass-label">Contraseña actual</label>
              <input
                type="password"
                className="cambiar-pass-input"
                value={passwordActual}
                onChange={(e) => setPasswordActual(e.target.value)}
                required
                autoFocus
                disabled={enviando}
              />
            </div>

            <div className="cambiar-pass-campo">
              <label className="cambiar-pass-label">Nueva contraseña</label>
              <input
                type="password"
                className="cambiar-pass-input"
                value={passwordNueva}
                onChange={(e) => setPasswordNueva(e.target.value)}
                required
                disabled={enviando}
                minLength={8}
              />
              <p className="cambiar-pass-hint">
                Mínimo 8 caracteres
              </p>
            </div>

            <div className="cambiar-pass-campo">
              <label className="cambiar-pass-label">Confirmar nueva contraseña</label>
              <input
                type="password"
                className="cambiar-pass-input"
                value={passwordConfirmacion}
                onChange={(e) => setPasswordConfirmacion(e.target.value)}
                required
                disabled={enviando}
                minLength={8}
              />
              {passwordNueva &&
                passwordConfirmacion &&
                passwordNueva !== passwordConfirmacion && (
                  <p className="cambiar-pass-hint cambiar-pass-hint-error">
                    Las contraseñas no coinciden
                  </p>
                )}
            </div>

            {error && (
              <div className="cambiar-pass-error animar-shake">⚠️ {error}</div>
            )}

            <button
              type="submit"
              className="cambiar-pass-boton"
              disabled={
                enviando ||
                !passwordActual ||
                !passwordNueva ||
                !passwordConfirmacion ||
                passwordNueva !== passwordConfirmacion
              }
            >
              {enviando ? "Cambiando..." : "Cambiar contraseña"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default CambiarPassword;
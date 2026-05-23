import { useEffect, useState } from "react";
import './App.css';

const API_URL = 'http://localhost:3001/api';

function App() {
  const [estadoBackend, setEstadoBackend] = useState({
    cargando: true,
    conectado: false,
    error: null,
    usuarios: 0,
  });

  useEffect(() => {
    fetch(`${API_URL}/test-supabase`)
      .then((res) => res.json())
      .then((data) => {
        setEstadoBackend({
          cargando: false,
          conectado: data.conectado,
          error: data.error ?? null,
          usuarios: data.usuariosRegistrados ?? 0,
        });
      })
      .catch((err) => {
        setEstadoBackend({
          cargando: false,
          conectado: false,
          error: err.message,
          usuarios: 0,
        });
      });
  }, []);

  return (
    <div className="app">
      <header className="app-header animar-fade-in-down">
        <div className="app-header-logo">SENA · Regional Tolima</div>
        <div className="app-header-badge animar-pulse-glow">
          <span className="punto-estado"></span>
          En desarrollo
        </div>
      </header>

      <main className="app-main">
        <div className="hero">
          <div className="hero-etiqueta animar-fade-in delay-100">
            Proyecto ID + I · SENNOVA · TRL 7
          </div>

          <h1 className="hero-titulo animar-fade-in-up delay-200">
            Sistema de Gestión <br /> de Flota Vehicular
          </h1>

          <p className="hero-subtitulo animar-fade-in-up delay-300">
            Chequeo preoperacional digital · Alertas inteligentes ·
            Gestión preventiva del mantenimiento
          </p>

          <div className="hero-acciones animar-fade-in-up delay-500">
            <button className="boton boton-primario">Comenzar</button>
            <button className="boton boton-secundario">Conocer más</button>
          </div>
        </div>

        <div className="estado-sistema animar-fade-in-up delay-700">
          <div className="estado-sistema-titulo">Estado del sistema</div>

          <div className="estado-sistema-grid">
            <div className="estado-item">
              <div className="estado-item-label">Frontend</div>
              <div className="estado-item-valor conectado">
                <span className="estado-punto"></span>
                Activo
              </div>
            </div>

            <div className="estado-item">
              <div className="estado-item-label">Backend</div>
              <div className={`estado-item-valor ${estadoBackend.cargando
                ? 'cargando'
                : estadoBackend.conectado
                  ? 'conectado'
                  : 'desconectado'
                }`}>
                <span className="estado-punto"></span>
                {estadoBackend.cargando
                  ? 'Verificando...'
                  : estadoBackend.conectado
                    ? 'Conectado'
                    : 'Sin conexion'}
              </div>
            </div>

            <div className="estado-item">
              <div className="estado-item-label">Supabase</div>
              <div className={`estado-item-valor ${estadoBackend.cargando
                ? 'cargando'
                : estadoBackend.conectado
                  ? 'conectado'
                  : 'desconectado'
                }`}>
                <span className="estado-punto"></span>
                {estadoBackend.cargando
                  ? 'Verificando...'
                  : estadoBackend.conectado
                    ? 'Conectado'
                    : 'Sin conexión'}
              </div>
            </div>

            <div className="estado-item">
              <div className="estado-item-label">Usuarios</div>
              <div className="estado-item-valor">
                {estadoBackend.cargando ? '...' : estadoBackend.usuarios}
              </div>
            </div>
          </div>

          {estadoBackend.error && (
            <div className="estado-error animar-shake">
              {estadoBackend.error}
            </div>
          )}
        </div>
      </main>

      <footer className="app-footer animar-fade-in delay-1000">
        Centro de Industria y de la Construcción · SENA Regional Tolima
      </footer>
    </div>
  );
}

export default App;
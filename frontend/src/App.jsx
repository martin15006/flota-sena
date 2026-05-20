import "./App.css";

function App() {
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
            Proyecto ID+I · SENNOVA · TRL 7
          </div>

          <h1 className="hero-titulo animar-fade-in-up delay-200">
            Sistema de Gestión<br />de Flota Vehicular
          </h1>

          <p className="hero-subtitulo animar-fade-in-up delay-300">
            Chequeo preoperacional digital · Alertas inteligentes ·
            Gestión preventiva del mantenimiento
          </p>

          <div className="hero-acciones animar-fade-in-up delay-500">
            <button className="boton boton-primario">
              Comenzar
            </button>
            <button className="boton boton-secundario">
              Conocer más
            </button>
          </div>
        </div>

        <div className="info-fase animar-fade-in delay-700">
          <div className="info-fase-titulo">Fase actual de desarrollo</div>
          <div className="info-fase-progreso">
            <div className="info-fase-paso completado">
              <span className="info-fase-numero">0</span>
              <span className="info-fase-nombre">Fundación</span>
            </div>
            <div className="info-fase-paso">
              <span className="info-fase-numero">1</span>
              <span className="info-fase-nombre">Autenticación</span>
            </div>
            <div className="info-fase-paso">
              <span className="info-fase-numero">2</span>
              <span className="info-fase-nombre">Vehículos</span>
            </div>
            <div className="info-fase-paso">
              <span className="info-fase-numero">3</span>
              <span className="info-fase-nombre">Chequeo</span>
            </div>
            <div className="info-fase-paso">
              <span className="info-fase-numero">4</span>
              <span className="info-fase-nombre">Dashboard</span>
            </div>
          </div>
        </div>
      </main>

      <footer className="app-footer animar-fade-in delay-1000">
        Centro de Industria y Construcción · SENA Regional Tolima
      </footer>
    </div>
  );
}

export default App;

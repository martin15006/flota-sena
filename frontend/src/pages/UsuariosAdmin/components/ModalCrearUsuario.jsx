import { useEffect, useRef, useState } from "react";
import Modal from "../../../components/Modal/Modal.jsx";
import { api } from "../../../lib/api.js";
import { useAuth } from "../../../hooks/useAuth.js";
import {
  ETIQUETA_ROL,
  NIVEL_TERRITORIO,
  rolesQuePuedeCrear,
} from "../../../lib/roles.js";
import "./ModalCrearUsuario.css";

const ESTADO_INICIAL = {
  cedula: "",
  nombre_completo: "",
  email: "",
  telefono: "",
  rol: "conductor",
  centro_id: "",
  ciudad_id: "",
  departamento_id: "",
  region_id: "",
  licencia_numero: "",
  licencia_categoria: "",
  licencia_vencimiento: "",
  eps: "",
  arl: "",
};

// Filtros de input por tipo de dato. Se aplican en el onChange para que el usuario
// no pueda introducir caracteres invalidos (en vez de mostrar error despues).
const soloDigitos = (texto) => (texto || "").replace(/\D/g, "");
const soloLetrasYEspacios = (texto) =>
    (texto || "").replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñÜü\s]/g, "");
const telefonoColombia = (texto) => (texto || "").replace(/[^\d+\-\s]/g, "");
// Categoria de licencia colombiana: una letra + un digito (A1, A2, B1, B2, C1, C2, C3, etc.)
const categoriaLicencia = (texto) =>
    (texto || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 2);

function ModalCrearUsuario({ abierto, onCerrar, onCreado }) {
  const { usuario } = useAuth();
  const [form, setForm] = useState(ESTADO_INICIAL);
  const [foto, setFoto] = useState(null);
  const [fotoPreview, setFotoPreview] = useState(null);
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const [error, setError] = useState(null);
  const [cargando, setCargando] = useState(false);
  // Listas geograficas para los selectores de territorio (ya vienen filtradas
  // por el scope del admin desde el backend, ver geo.routes.js).
  const [centros, setCentros] = useState([]);
  const [ciudades, setCiudades] = useState([]);
  const [departamentos, setDepartamentos] = useState([]);
  const [regiones, setRegiones] = useState([]);
  // Avisos contextuales debajo de cada campo cuando se intenta escribir un caracter invalido.
  // Cada aviso se borra solo despues de 2.5 segundos.
  const [avisos, setAvisos] = useState({});
  const timersAvisos = useRef({});

  // Muestra un aviso temporal para un campo. Reinicia el timer si ya habia uno activo.
  const mostrarAviso = (campo, mensaje) => {
    if (timersAvisos.current[campo]) {
      clearTimeout(timersAvisos.current[campo]);
    }
    setAvisos((prev) => ({ ...prev, [campo]: mensaje }));
    timersAvisos.current[campo] = setTimeout(() => {
      setAvisos((prev) => {
        const copia = { ...prev };
        delete copia[campo];
        return copia;
      });
      delete timersAvisos.current[campo];
    }, 2500);
  };

  // Wrapper que aplica un filtro y muestra aviso si removio caracteres
  const filtrarConAviso = (valor, filtro, campo, mensajeAviso) => {
    const filtrado = filtro(valor);
    if (filtrado.length < valor.length) {
      mostrarAviso(campo, mensajeAviso);
    }
    return filtrado;
  };

  // Cargar las listas geograficas (ya scopeadas) al abrir el modal. Pedimos los
  // 4 niveles; el selector solo muestra el que corresponde al rol elegido.
  useEffect(() => {
    if (!abierto) return;
    const cargar = (ruta, set) =>
      api(ruta)
        .then((data) => set(data[Object.keys(data)[0]] || []))
        .catch((err) => {
          if (!err.sesionExpirada) console.error(`Error cargando ${ruta}:`, err.message);
        });
    cargar("/geo/centros", setCentros);
    cargar("/geo/ciudades", setCiudades);
    cargar("/geo/departamentos", setDepartamentos);
    cargar("/geo/regiones", setRegiones);
  }, [abierto]);

  const esConductor = form.rol === "conductor";
  // Nivel de territorio a asignar segun el rol elegido: region|departamento|ciudad|centro
  const nivelTerritorio = NIVEL_TERRITORIO[form.rol] || null;
  // Roles que el admin actual puede crear (solo rangos inferiores). Si por algun
  // motivo no hay ninguno, dejamos al menos 'conductor' como fallback seguro.
  const rolesCreables = (() => {
    const lista = rolesQuePuedeCrear(usuario?.rol);
    return lista.length > 0 ? lista : ["conductor"];
  })();

  // Descriptor del selector de territorio segun el nivel del rol elegido.
  const territorio = {
    centro: {
      label: "Centro de formación",
      campo: "centro_id",
      opciones: centros,
      formato: (c) =>
        `${c.nombre}${c.ciudad ? ` · ${c.ciudad}` : ""}${c.departamento ? ` (${c.departamento})` : ""}`,
    },
    ciudad: { label: "Ciudad", campo: "ciudad_id", opciones: ciudades, formato: (c) => c.nombre },
    departamento: {
      label: "Departamento",
      campo: "departamento_id",
      opciones: departamentos,
      formato: (d) => d.nombre,
    },
    region: { label: "Región", campo: "region_id", opciones: regiones, formato: (r) => r.nombre },
  }[nivelTerritorio] || null;

  const cerrar = () => {
    setForm(ESTADO_INICIAL);
    setFoto(null);
    setFotoPreview(null);
    setError(null);
    onCerrar();
  };

  const cambiarCampo = (campo, valor) => {
    setForm({ ...form, [campo]: valor });
  };

  // Al cambiar el rol limpiamos los campos de territorio, para no arrastrar (ni
  // enviar) uno que no corresponde al nuevo nivel (p.ej. un centro_id al pasar a
  // admin de ciudad).
  const cambiarRol = (nuevoRol) => {
    setForm((prev) => ({
      ...prev,
      rol: nuevoRol,
      centro_id: "",
      ciudad_id: "",
      departamento_id: "",
      region_id: "",
    }));
  };

  const cambiarFoto = (e) => {
    const archivo = e.target.files?.[0];
    if (!archivo) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(archivo.type)) {
      setError("Solo se permiten imágenes JPEG, PNG o WebP");
      return;
    }
    if (archivo.size > 5 * 1024 * 1024) {
      setError("La imagen no debe superar los 5 MB");
      return;
    }

    setError(null);
    setFoto(archivo);
    const reader = new FileReader();
    reader.onload = (ev) => setFotoPreview(ev.target.result);
    reader.readAsDataURL(archivo);
  };

  const quitarFoto = () => {
    setFoto(null);
    setFotoPreview(null);
  };

  const enviar = async (e) => {
    e.preventDefault();
    setError(null);

    // Validacion frontend: el territorio (segun el rol) es obligatorio.
    const campoTerritorio = {
      centro: "centro_id",
      ciudad: "ciudad_id",
      departamento: "departamento_id",
      region: "region_id",
    }[nivelTerritorio];
    if (campoTerritorio && !form[campoTerritorio]) {
      setError("Debes asignar el área (territorio) del usuario.");
      return;
    }

    setCargando(true);

    try {
      let foto_url = null;

      // Subir foto a Cloudinary primero si hay una
      if (foto) {
        setSubiendoFoto(true);
        const fd = new FormData();
        fd.append("foto", foto);
        fd.append("folder", "usuarios");

        const token = localStorage.getItem("token");
        const resp = await fetch("http://localhost:3001/api/upload/foto", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: fd,
        });
        const dataUpload = await resp.json();
        if (!resp.ok)
          throw new Error(dataUpload.error || "Error subiendo foto");
        foto_url = dataUpload.url;
        setSubiendoFoto(false);
      }

      // Preparar datos: quitar campos vacios opcionales
      const datos = { ...form };
      Object.keys(datos).forEach((k) => {
        if (datos[k] === "") delete datos[k];
      });
      if (foto_url) datos.foto_url = foto_url;

      // Crear usuario
      const resultado = await api("/usuarios", {
        method: "POST",
        body: datos,
      });

      // Pasar al padre la info de la password generada
      onCreado({
        password: resultado.password_temporal,
        email: resultado.email,
        nombreUsuario: resultado.usuario.nombre_completo,
      });

      cerrar();
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
      setSubiendoFoto(false);
    }
  };

  return (
    <Modal
      abierto={abierto}
      onCerrar={cerrar}
      titulo="Crear nuevo usuario"
      ancho="grande"
    >
      <form className="form-usuario" onSubmit={enviar}>
        {/* === FOTO === */}
        <div className="form-usuario-seccion">
          <h3 className="form-usuario-seccion-titulo">Foto del usuario</h3>
          <div className="form-usuario-foto-area">
            {fotoPreview ? (
              <div className="form-usuario-foto-preview-contenedor">
                <img
                  src={fotoPreview}
                  alt="Preview"
                  className="form-usuario-foto-preview"
                />
                <button
                  type="button"
                  className="form-usuario-foto-quitar"
                  onClick={quitarFoto}
                  disabled={cargando}
                >
                  Quitar
                </button>
              </div>
            ) : (
              <label className="form-usuario-foto-placeholder">
                <span className="form-usuario-foto-icono">📷</span>
                <span>Seleccionar foto</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={cambiarFoto}
                  hidden
                />
              </label>
            )}
          </div>
        </div>

        {/* === DATOS BASICOS === */}
        <div className="form-usuario-seccion">
          <h3 className="form-usuario-seccion-titulo">Datos básicos</h3>
          <div className="form-usuario-grid">
            <div className="form-usuario-campo">
              <label className="form-usuario-label">Cédula *</label>
              <input
                type="text"
                inputMode="numeric"
                className="form-usuario-input"
                value={form.cedula}
                onChange={(e) => cambiarCampo("cedula", filtrarConAviso(
                  e.target.value, soloDigitos, "cedula",
                  "Solo se permiten números"
                ))}
                placeholder="Solo números"
                required
                disabled={cargando}
              />
              {avisos.cedula && (
                <small className="form-usuario-aviso-validacion">{avisos.cedula}</small>
              )}
            </div>
            <div className="form-usuario-campo">
              <label className="form-usuario-label">Nombre completo *</label>
              <input
                type="text"
                className="form-usuario-input"
                value={form.nombre_completo}
                onChange={(e) =>
                  cambiarCampo("nombre_completo", filtrarConAviso(
                    e.target.value, soloLetrasYEspacios, "nombre_completo",
                    "Solo se permiten letras y espacios"
                  ))
                }
                placeholder="Solo letras"
                required
                disabled={cargando}
              />
              {avisos.nombre_completo && (
                <small className="form-usuario-aviso-validacion">{avisos.nombre_completo}</small>
              )}
            </div>
            <div className="form-usuario-campo">
              <label className="form-usuario-label">Correo electrónico *</label>
              <input
                type="email"
                className="form-usuario-input"
                value={form.email}
                onChange={(e) => cambiarCampo("email", e.target.value)}
                required
                disabled={cargando}
              />
            </div>
            <div className="form-usuario-campo">
              <label className="form-usuario-label">Teléfono</label>
              <input
                type="tel"
                inputMode="tel"
                className="form-usuario-input"
                value={form.telefono}
                onChange={(e) => cambiarCampo("telefono", filtrarConAviso(
                  e.target.value, telefonoColombia, "telefono",
                  "Solo se permiten números, espacios y signos + -"
                ))}
                placeholder="Ej: 3001234567"
                disabled={cargando}
              />
              {avisos.telefono && (
                <small className="form-usuario-aviso-validacion">{avisos.telefono}</small>
              )}
            </div>
            <div className="form-usuario-campo">
              <label className="form-usuario-label">Rol *</label>
              <select
                className="form-usuario-input"
                value={form.rol}
                onChange={(e) => cambiarRol(e.target.value)}
                disabled={cargando}
              >
                {rolesCreables.map((r) => (
                  <option key={r} value={r}>
                    {ETIQUETA_ROL[r] || r}
                  </option>
                ))}
              </select>
            </div>
            {territorio && (
              <div className="form-usuario-campo">
                <label className="form-usuario-label">{territorio.label} *</label>
                <select
                  className="form-usuario-input"
                  value={form[territorio.campo]}
                  onChange={(e) => cambiarCampo(territorio.campo, e.target.value)}
                  required
                  disabled={cargando || territorio.opciones.length === 0}
                >
                  <option value="">— Selecciona {territorio.label.toLowerCase()} —</option>
                  {territorio.opciones.map((o) => (
                    <option key={o.id} value={o.id}>
                      {territorio.formato(o)}
                    </option>
                  ))}
                </select>
                <small className="form-usuario-ayuda">
                  {territorio.opciones.length === 0
                    ? "No hay opciones disponibles en tu área para este nivel."
                    : "Define el área que tendrá a su cargo este usuario."}
                </small>
              </div>
            )}
          </div>
        </div>

        {/* === LICENCIA (solo conductor, todos obligatorios por ley) === */}
        {esConductor && (
          <div className="form-usuario-seccion">
            <h3 className="form-usuario-seccion-titulo">
              Licencia de conducción
            </h3>
            <div className="form-usuario-grid">
              <div className="form-usuario-campo">
                <label className="form-usuario-label">Número *</label>
                <input
                  type="text"
                  inputMode="numeric"
                  className="form-usuario-input"
                  value={form.licencia_numero}
                  onChange={(e) =>
                    cambiarCampo("licencia_numero", filtrarConAviso(
                      e.target.value, soloDigitos, "licencia_numero",
                      "Solo se permiten números"
                    ))
                  }
                  placeholder="Solo números"
                  required
                  disabled={cargando}
                />
                {avisos.licencia_numero && (
                  <small className="form-usuario-aviso-validacion">{avisos.licencia_numero}</small>
                )}
              </div>
              <div className="form-usuario-campo">
                <label className="form-usuario-label">Categoría *</label>
                <input
                  type="text"
                  className="form-usuario-input"
                  value={form.licencia_categoria}
                  onChange={(e) => {
                    const raw = e.target.value;
                    const procesado = categoriaLicencia(raw);
                    // Mensaje especifico segun el motivo: longitud o caracter invalido
                    if (raw.length > 2 && procesado.length === 2) {
                      mostrarAviso("licencia_categoria", "Máximo 2 caracteres (ej: C2)");
                    } else if (procesado.length < raw.length) {
                      mostrarAviso("licencia_categoria", "Solo letras y números (ej: C2, B1)");
                    }
                    cambiarCampo("licencia_categoria", procesado);
                  }}
                  placeholder="Ej: C2, C3"
                  required
                  disabled={cargando}
                />
                {avisos.licencia_categoria && (
                  <small className="form-usuario-aviso-validacion">{avisos.licencia_categoria}</small>
                )}
              </div>
              <div className="form-usuario-campo">
                <label className="form-usuario-label">
                  Fecha de vencimiento *
                </label>
                <input
                  type="date"
                  className="form-usuario-input"
                  value={form.licencia_vencimiento}
                  onChange={(e) =>
                    cambiarCampo("licencia_vencimiento", e.target.value)
                  }
                  required
                  disabled={cargando}
                />
              </div>
            </div>
            <small className="form-usuario-ayuda">
              Obligatorio para conductores. Sin licencia vigente no se puede operar vehículos institucionales.
            </small>
          </div>
        )}

        {/* === SEGURIDAD SOCIAL (obligatoria solo para conductor) === */}
        <div className="form-usuario-seccion">
          <h3 className="form-usuario-seccion-titulo">Seguridad social</h3>
          <div className="form-usuario-grid">
            <div className="form-usuario-campo">
              <label className="form-usuario-label">EPS {esConductor && "*"}</label>
              <input
                type="text"
                className="form-usuario-input"
                value={form.eps}
                onChange={(e) => cambiarCampo("eps", e.target.value)}
                required={esConductor}
                disabled={cargando}
              />
            </div>
            <div className="form-usuario-campo">
              <label className="form-usuario-label">ARL {esConductor && "*"}</label>
              <input
                type="text"
                className="form-usuario-input"
                value={form.arl}
                onChange={(e) => cambiarCampo("arl", e.target.value)}
                required={esConductor}
                disabled={cargando}
              />
            </div>
          </div>
          {esConductor && (
            <small className="form-usuario-ayuda">
              Obligatoria para conductores. Cobertura ante accidente conduciendo el vehículo institucional.
            </small>
          )}
        </div>

        {error && (
          <div className="form-usuario-error animar-shake">⚠️ {error}</div>
        )}

        {subiendoFoto && (
          <div className="form-usuario-info">
            Subiendo foto a Cloudinary...
          </div>
        )}

        <div className="form-usuario-acciones">
          <button
            type="button"
            className="form-usuario-boton form-usuario-boton-cancelar"
            onClick={cerrar}
            disabled={cargando}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="form-usuario-boton form-usuario-boton-crear"
            disabled={cargando}
          >
            {cargando ? "Creando..." : "Crear usuario"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default ModalCrearUsuario;
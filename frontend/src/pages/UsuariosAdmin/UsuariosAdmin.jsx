import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth.js";
import { api } from "../../lib/api.js";
import "./UsuariosAdmin.css";
import ModalPasswordTemporal from "./components/ModalPasswordTemporal.jsx";
import Footer from '../../components/Footer/Footer.jsx';
import Toast from '../../components/Toast/Toast.jsx';
import ModalCrearUsuario from "./components/ModalCrearUsuario.jsx";
import ModalEditarUsuario from "./components/ModalEditarUsuario.jsx";

function UsuariosAdmin() {
  const { usuario, cerrarSesion } = useAuth();
  const navigate = useNavigate();
  const [usuarios, setUsuarios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [filtroRol, setFiltroRol] = useState("todos");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [modalPassword, setModalPassword] = useState(null);
  const [modalCrearAbierto, setModalCrearAbierto] = useState(false);
  const [usuarioAEditar, setUsuarioAeditar] = useState(null);
  const [toast, setToast] = useState(null);

  // Helper para mostrar toast con tipo determinado (exito | error | advertencia | info)
  const mostrarToast = (mensaje, tipo = "exito") => setToast({ mensaje, tipo });

  const cargarUsuarios = async () => {
    setCargando(true);
    setError(null);
    try {
      const data = await api("/usuarios");
      setUsuarios(data.usuarios);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (usuario && usuario.rol === "admin") cargarUsuarios();
  }, [usuario]);


  // Filtros aplicados sobre la lista cruda
  const usuariosFiltrados = usuarios.filter((u) => {
    if (filtroRol !== "todos" && u.rol !== filtroRol) return false;
    if (filtroEstado === "activos" && !u.activo) return false;
    if (filtroEstado === "inactivos" && u.activo) return false;
    if (busqueda) {
      const q = busqueda.toLowerCase();
      const match =
        u.nombre_completo?.toLowerCase().includes(q) ||
        u.cedula?.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  // Acciones
  const desactivar = async (id, nombre) => {
    if (!confirm(`¿Desactivar al usuario ${nombre}?`)) return;
    try {
      await api(`/usuarios/${id}/desactivar`, { method: "PATCH" });
      mostrarToast(`Usuario ${nombre} desactivado`, "advertencia");
      cargarUsuarios();
    } catch (err) {
      if (!err.sesionExpirada) mostrarToast(err.message, "error");
    }
  };

  const reactivar = async (id, nombre) => {
    try {
      await api(`/usuarios/${id}/reactivar`, { method: "PATCH" });
      mostrarToast(`Usuario ${nombre} reactivado`, "exito");
      cargarUsuarios();
    } catch (err) {
      if (!err.sesionExpirada) mostrarToast(err.message, "error");
    }
  };

  const eliminar = async (id, nombre) => {
    if (!confirm(`¿Eliminar permanentemente a ${nombre}? Esta acción no se puede deshacer.`))
      return;
    try {
      await api(`/usuarios/${id}`, { method: "DELETE" });
      mostrarToast(`Usuario ${nombre} eliminado permanentemente`, "exito");
      cargarUsuarios();
    } catch (err) {
      if (!err.sesionExpirada) mostrarToast(err.message, "error");
    }
  };

  const resetearPassword = async (id, nombre) => {
    if (!confirm(`¿Generar una nueva contraseña temporal para ${nombre}?`))
      return;
    try {
      const data = await api(`/usuarios/${id}/resetear-password`, {
        method: "POST",
      });
      setModalPassword({
        password: data.password_temporal,
        email: data.email,
        nombreUsuario: nombre,
      });
      mostrarToast(`Contraseña temporal generada para ${nombre}`, "exito");
      cargarUsuarios();
    } catch (err) {
      if (!err.sesionExpirada) mostrarToast(err.message, "error");
    }
  };

  const cerrar = () => {
    cerrarSesion();
    navigate("/login");
  };

  return (
    <div className="usuarios-admin">
      <header className="usuarios-admin-header">
        <div className="usuarios-admin-logo-wrapper">
          <img src="/logoverde.png" alt="SENA" className="usuarios-admin-logo-img" />
          <div className="usuarios-admin-logo">Gestión de Flota</div>
        </div>
        <div className="usuarios-admin-usuario">
          <div className="usuarios-admin-usuario-info">
            <div className="usuarios-admin-usuario-nombre">
              {usuario.nombre_completo}
            </div>
            <div className="usuarios-admin-usuario-rol">{usuario.rol}</div>
          </div>
          <button className="usuarios-admin-logout" onClick={cerrar}>
            Cerrar sesión
          </button>

        </div>
      </header>

      <main className="usuarios-admin-main">
        <button
          className="usuarios-admin-volver"
          onClick={() => navigate("/dashboard")}
        >
          ← Volver al dashboard
        </button>

        <div className="usuarios-admin-encabezado">
          <div>
            <h1 className="usuarios-admin-titulo">Gestión de usuarios</h1>
            <p className="usuarios-admin-subtitulo">
              {usuarios.length} registrados · {usuariosFiltrados.length} visibles
            </p>
          </div>
          <div className="usuarios-admin-acciones-encabezado">
            <button
              className="usuarios-admin-boton-refrescar"
              onClick={cargarUsuarios}
              disabled={cargando}
              title="Recargar la lista sin reiniciar la página"
            >
              {cargando ? "Refrescando..." : "Refrescar"}
            </button>
            <button
              className="usuarios-admin-boton-crear"
              onClick={() => setModalCrearAbierto(true)}
            >
              + Crear Usuario
            </button>
          </div>
        </div>

        <div className="usuarios-admin-filtros animar-fade-in">
          <input
            type="text"
            className="usuarios-admin-busqueda"
            placeholder="Buscar por nombre o cédula..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
          <select
            className="usuarios-admin-select"
            value={filtroRol}
            onChange={(e) => setFiltroRol(e.target.value)}
          >
            <option value="todos">Todos los roles</option>
            <option value="admin">Administradores</option>
            <option value="conductor">Conductores</option>
          </select>
          <select
            className="usuarios-admin-select"
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
          >
            <option value="todos">Todos los estados</option>
            <option value="activos">Solo activos</option>
            <option value="inactivos">Solo inactivos</option>
          </select>
        </div>

        {cargando && (
          <div className="usuarios-admin-estado-cargando">
            Cargando usuarios...
          </div>
        )}

        {error && (
          <div className="usuarios-admin-estado-error animar-shake">
            ⚠️ {error}
          </div>
        )}

        {!cargando && !error && usuariosFiltrados.length === 0 && (
          <div className="usuarios-admin-vacio">
            No hay usuarios que coincidan con los filtros.
          </div>
        )}

        {!cargando && !error && usuariosFiltrados.length > 0 && (
          <div className="usuarios-admin-tabla-wrapper animar-fade-in">
            <table className="usuarios-admin-tabla">
              <thead>
                <tr>
                  <th>Foto</th>
                  <th>Nombre</th>
                  <th>Cédula</th>
                  <th>Rol</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {usuariosFiltrados.map((u) => (
                  <tr
                    key={u.id}
                    className={!u.activo ? "usuarios-admin-fila-inactiva" : ""}
                  >
                    <td>
                      {u.foto_url ? (
                        <img
                          src={u.foto_url}
                          alt={u.nombre_completo}
                          className="usuarios-admin-foto"
                        />
                      ) : (
                        <div className="usuarios-admin-foto-placeholder">
                          {u.nombre_completo?.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </td>
                    <td className="usuarios-admin-nombre">
                      {u.nombre_completo}
                    </td>
                    <td>{u.cedula}</td>
                    <td>
                      <span
                        className={`usuarios-admin-rol usuarios-admin-rol-${u.rol}`}
                      >
                        {u.rol}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`usuarios-admin-estado ${u.activo ? "activo" : "inactivo"
                          }`}
                      >
                        {u.activo ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td>
                      <div className="usuarios-admin-acciones">
                        <button
                          className="usuarios-admin-accion"
                          onClick={() => navigate(`/admin/usuarios/${u.id}`)}
                          title="Ver perfil completo"
                        >
                          Ver perfil
                        </button>
                        <button
                          className="usuarios-admin-accion"
                          onClick={() => setUsuarioAeditar(u)}
                          title="Editar"
                        >
                          Editar
                        </button>
                        <button
                          className="usuarios-admin-accion"
                          onClick={() =>
                            resetearPassword(u.id, u.nombre_completo)
                          }
                          title="Resetear contraseña"
                        >
                          Resetear
                        </button>
                        {u.activo ? (
                          <button
                            className="usuarios-admin-accion usuarios-admin-accion-warning"
                            onClick={() => desactivar(u.id, u.nombre_completo)}
                            title="Desactivar"
                          >
                            Desactivar
                          </button>
                        ) : (
                          <button
                            className="usuarios-admin-accion usuarios-admin-accion-success"
                            onClick={() => reactivar(u.id, u.nombre_completo)}
                            title="Reactivar"
                          >
                            Reactivar
                          </button>
                        )}
                        <button
                          className="usuarios-admin-accion usuarios-admin-accion-danger"
                          onClick={() => eliminar(u.id, u.nombre_completo)}
                          title="Eliminar"
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
      <ModalPasswordTemporal
        abierto={modalPassword !== null}
        onCerrar={() => setModalPassword(null)}
        password={modalPassword?.password}
        email={modalPassword?.email}
        nombreUsuario={modalPassword?.nombreUsuario}
      />
      <ModalCrearUsuario
        abierto={modalCrearAbierto}
        onCerrar={() => setModalCrearAbierto(false)}
        onCreado={(data) => {
          setModalPassword(data);
          mostrarToast(`Usuario ${data.nombreUsuario} creado correctamente`, "exito");
          cargarUsuarios();
        }}
      />
      <ModalEditarUsuario
        abierto={usuarioAEditar !== null}
        onCerrar={() => setUsuarioAeditar(null)}
        usuario={usuarioAEditar}
        onEditado={(nombre, mensajePersonalizado) => {
          // Si viene un mensaje del backend (cambio de correo/cedula) lo usamos
          // tal cual; si no, mostramos el genérico de "Cambios guardados".
          const mensaje = mensajePersonalizado
            ? mensajePersonalizado
            : `Cambios guardados${nombre ? ` para ${nombre}` : ""}`;
          mostrarToast(mensaje, "exito");
          cargarUsuarios();
        }}
      />

      {toast && (
        <Toast
          mensaje={toast.mensaje}
          tipo={toast.tipo}
          duracion={3500}
          posicion="arriba-centro"
          onCerrar={() => setToast(null)}
        />
      )}

      <Footer />
    </div>
  );
}

export default UsuariosAdmin;
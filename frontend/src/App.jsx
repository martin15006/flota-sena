import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext.jsx";
import ProtectedRoutes from "./components/ProtectedRoute/ProtectedRoute.jsx";
import Login from "./pages/Login/Login.jsx";
import Dashboard from "./pages/Dashboard/Dashboard.jsx";
import UsuariosAdmin from "./pages/UsuariosAdmin/UsuariosAdmin.jsx";
import VehiculosAdmin from "./pages/VehiculosAdmin/VehiculosAdmin.jsx";
import VehiculoDetalle from "./pages/VehiculoDetalle/VehiculoDetalle.jsx";
import CambiarPassword from "./pages/CambiarPassword/CambiarPassword.jsx";

function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Routes>
                    <Route path='/' element={<Navigate to='/login' replace />} />
                    <Route path='/login' element={<Login />} />

                    <Route path='/cambiar-password' element={
                        <ProtectedRoutes>
                            <CambiarPassword />
                        </ProtectedRoutes>
                    } />

                    <Route path='/dashboard' element={
                        <ProtectedRoutes>
                            <Dashboard />
                        </ProtectedRoutes>
                    } />

                    <Route path="/admin/usuarios" element={
                        <ProtectedRoutes>
                            <UsuariosAdmin />
                        </ProtectedRoutes>
                    } />

                    <Route path="/admin/vehiculos" element={
                        <ProtectedRoutes>
                            <VehiculosAdmin />
                        </ProtectedRoutes>
                    } />

                    <Route path="/admin/vehiculos/:id" element={
                        <ProtectedRoutes>
                            <VehiculoDetalle />
                        </ProtectedRoutes>
                    } />

                    <Route path='*' element={<Navigate to='/login' replace />} />
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    );
}

export default App;
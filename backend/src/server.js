import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helloRoutes from './routes/hello.routes.js';
import authRouter from './routes/auth.routes.js';
import usuariosRoutes from './routes/usuarios.routes.js';
import uploadRoutes from './routes/upload.routes.js';
import vehiculosRoutes from './routes/vehiculos.routes.js';
import { iniciarKeepAlive, detenerKeepAlive } from './utils/keepAlive.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// middleware 
app.use(cors({ origin: process.env.CORS_ORIGIN }));

app.use(express.json());

app.set('etag', false);
app.use('/api', (req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    next();
});

app.use('/api', helloRoutes);
app.use('/api/auth', authRouter);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/vehiculos', vehiculosRoutes);

app.use((req, res) => {
    res.status(404).json({ error: 'Ruta no encontrada' });
});

app.use((err, req, res, next) => {
    console.error('Error no manejado:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
});

const servidor = app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
    console.log(`Prueba: http://localhost:${PORT}/api/hello`);
    console.log(`Test Supabase: http://localhost:${PORT}/api/test-supabase`);
    iniciarKeepAlive();
});

const cerrarLimpio = (senal) => {
    console.log(`\nRecibida senal ${senal}, cerrando servidor...`);
    detenerKeepAlive();
    servidor.close(() => process.exit(0));
};

process.on('SIGINT', () => cerrarLimpio('SIGINT'));
process.on('SIGTERM', () => cerrarLimpio('SIGTERM'));
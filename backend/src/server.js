import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helloRoutes from './routes/hello.routes.js';
import authRouter from './routes/auth.routes.js';
import usuariosRoutes from './routes/usuarios.routes.js'

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// middleware 
app.use(cors({ origin: process.env.CORS_ORIGIN }));

app.use(express.json());

app.use('/api', helloRoutes);
app.use('/api/auth', authRouter);
app.use('/api/usuarios', usuariosRoutes);

app.use((req, res) => {
    res.status(404).json({ error: 'Ruta no encontrada' });
});

app.use((err, req, res, next) => {
    console.error('Error no manejado:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
});

app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
    console.log(`Prueba: http://localhost:${PORT}/api/hello`);
    console.log(`Test Supabase: http://localhost:${PORT}/api/test-supabase`);
});;
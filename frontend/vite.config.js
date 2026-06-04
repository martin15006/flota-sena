import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // host: true expone el servidor a la red local (no solo localhost).
    // Permite acceder desde celular u otro dispositivo en el mismo wifi:
    //   http://<IP_DEL_PC>:5173
    host: true,
    port: 5173,
  },
})

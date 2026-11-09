/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';

// BASE_PATH permite publicar a futuro en GitHub Pages bajo /<repositorio>/.
// En local (localhost:3000) se usa la raíz "/".
const base = process.env.BASE_PATH ?? '/';

export default defineConfig({
  base,
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    port: 3000,
    strictPort: true, // si 3000 está ocupado, falla en lugar de cambiar de puerto
    host: 'localhost',
  },
  preview: {
    port: 3000,
    strictPort: true,
    host: 'localhost',
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});

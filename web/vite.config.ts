import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// base: для GitHub Pages билд кладётся в /trener/ (имя репо).
// VITE_BASE можно переопределить, если репо/деплой переедет.
const base = process.env.VITE_BASE ?? '/trener/';

export default defineConfig(({ command }) => ({
  base: command === 'build' ? base : '/',
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
}));

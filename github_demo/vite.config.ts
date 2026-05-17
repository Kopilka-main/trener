import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// base: './' — относительные пути к ассетам, чтобы сборка работала
// на GitHub Pages по любому адресу (user.github.io/<repo>/) без правок.
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
});

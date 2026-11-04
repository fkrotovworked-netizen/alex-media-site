import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // GitHub Pages serves the site from /<repo>/; the workflow passes it in (see src/asset.ts)
  base: process.env.BASE_PATH || '/',
  // the preview pane assigns a port through PORT when 5183 is taken by another session
  server: { port: Number(process.env.PORT) || 5183 }
});

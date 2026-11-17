import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Dev only: the API runs on 8080; in production both share one origin.
  server: { proxy: { '/api': 'http://localhost:8080' } },
  test: { environment: 'jsdom' },
});

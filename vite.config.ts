/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const API_PORT = process.env.PORT ?? '3001';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // The backend (npm run dev:api) serves /api; the dev server forwards to it.
    proxy: { '/api': `http://localhost:${API_PORT}` },
  },
  preview: {
    proxy: { '/api': `http://localhost:${API_PORT}` },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'server/**/*.test.ts'],
  },
});

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // GitHub project Pages serve from /<repo>/, not the domain root.
  base: process.env.GITHUB_PAGES ? '/smart-office-assistant/' : '/',
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
});

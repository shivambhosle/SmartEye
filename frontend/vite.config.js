import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Lets the frontend call /api/... during dev without CORS headaches
      '/api': 'http://localhost:3000',
    },
  },
});
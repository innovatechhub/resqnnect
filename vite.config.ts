import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom', '@tanstack/react-query'],
          charts: ['recharts'],
          qr: ['qrcode', 'html5-qrcode'],
          supabase: ['@supabase/supabase-js'],
          maps: ['leaflet', 'react-leaflet'],
        },
      },
    },
  },
});

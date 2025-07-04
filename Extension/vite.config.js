import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist", // Output directory for extension
    rollupOptions: {
      input: {
        main: "index.html"
      }
    }
  }
});

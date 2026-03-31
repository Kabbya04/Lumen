// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Excalidraw (and its bundled diagram defs) is a very large dependency by nature.
    // We lazy-load the routes, so this is a warning-noise threshold rather than a performance issue.
    chunkSizeWarningLimit: 6000,
    rollupOptions: {
      output: {
        /**
         * Hint chunking for large vendor deps so we avoid huge minified bundles.
         * Dynamic imports in `src/App.tsx` do most of the work; this just helps Vite split well.
         */
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (id.includes("@excalidraw/excalidraw")) return "vendor_excalidraw";
          if (id.includes("pdfjs-dist")) return "vendor_pdfjs";
          if (id.includes("mammoth")) return "vendor_mammoth";
          if (id.includes("groq-sdk") || id.includes("groq")) return "vendor_groq";
          if (id.includes("react-pdf")) return "vendor_react_pdf";
          return undefined;
        },
      },
    },
  },
})
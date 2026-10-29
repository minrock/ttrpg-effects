import { defineConfig } from "electron-vite";
import { resolve } from "node:path";

export default defineConfig({
  main: {
    build: {
      rollupOptions: {
        // Mantener __dirname de los módulos main junto al entry y sus rutas relativas.
        output: { chunkFileNames: "[name]-[hash].js" },
        input: {
          index: resolve(__dirname, "src/main/index.ts")
        }
      }
    }
  },
  preload: {
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, "src/preload/index.ts")
        },
        output: {
          format: "cjs",
          entryFileNames: "[name].cjs"
        }
      }
    }
  },
  renderer: {
    root: "src/renderer",
    base: "./"
  }
});

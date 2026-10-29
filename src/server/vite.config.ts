import { resolve } from "node:path";
export default {
  build: { ssr: resolve(import.meta.dirname, "index.ts"), outDir: "out/api", emptyOutDir: true,
    target: "node24", rollupOptions: { output: { entryFileNames: "index.mjs" } } }
};

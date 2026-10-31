import { resolve } from "node:path";
export default {
  build: { ssr: true, outDir: "out/api", emptyOutDir: true,
    target: "node24", rollupOptions: { input: { "invitation-backend": resolve(import.meta.dirname, "invitation-backend.ts"), "invitation-invalidate": resolve(import.meta.dirname, "invitation-invalidate.ts"), index: resolve(import.meta.dirname, "index.ts"), "db-migrate": resolve(import.meta.dirname, "db-migrate.ts"), "data-cli": resolve(import.meta.dirname, "data-cli.ts"), "identity-cli": resolve(import.meta.dirname, "identity-cli.ts") }, output: { entryFileNames: "[name].mjs" } } }
};

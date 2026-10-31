import { defineConfig } from "vitest/config";
export default defineConfig({ test: { include: ["src/infrastructure/server/identity/*.contract.ts"], testTimeout: 30000, hookTimeout: 20000, fileParallelism: false } });

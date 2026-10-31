import { defineConfig } from "vitest/config";
export default defineConfig({ test: { include: ["src/infrastructure/server/owned/*.contract.ts"], testTimeout: 30000, hookTimeout: 30000, fileParallelism: false } });

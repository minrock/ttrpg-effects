import { defineConfig } from "vitest/config";
export default defineConfig({ test: { include: ["src/infrastructure/server/database/*.contract.ts"], testTimeout: 20000, hookTimeout: 20000, fileParallelism: false } });

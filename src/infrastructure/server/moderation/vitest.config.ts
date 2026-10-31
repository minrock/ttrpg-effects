import { defineConfig } from "vitest/config";
export default defineConfig({ test: { include: ["src/infrastructure/server/moderation/*.contract.ts"], testTimeout: 60000, hookTimeout: 30000, fileParallelism: false } });

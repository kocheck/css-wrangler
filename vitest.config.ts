import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

const aliases = {
  "@shared": resolve(__dirname, "src/shared"),
  "@panel": resolve(__dirname, "src/panel"),
  "@content": resolve(__dirname, "src/content"),
};

export default defineConfig({
  resolve: { alias: aliases },
  test: {
    projects: [
      {
        resolve: { alias: aliases },
        test: {
          name: "shared",
          environment: "node",
          include: ["src/__tests__/shared/**/*.test.ts"],
        },
      },
      {
        resolve: { alias: aliases },
        test: {
          name: "panel-lib",
          environment: "node",
          include: [
            "src/__tests__/panel/**/*.test.ts",
            "src/__tests__/content/**/*.test.ts",
          ],
        },
      },
      {
        test: {
          name: "cli-unit",
          environment: "node",
          include: ["cli/test/unit/**/*.test.ts"],
        },
      },
      {
        test: {
          name: "cli-integration",
          environment: "node",
          include: ["cli/test/integration/**/*.test.ts"],
          // Daemons spawn child processes; give them room.
          testTimeout: 15000,
          hookTimeout: 10000,
          // Don't parallel-run integration tests — they bind ports.
          fileParallelism: false,
        },
      },
    ],
  },
});

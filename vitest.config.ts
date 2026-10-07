import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const at = (p: string) => fileURLToPath(new URL(p, import.meta.url));

/**
 * Tests run against their own SQLite file (prisma/test.db), recreated before every run,
 * so the working database is never touched. Files run one after another: they share that file.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": at("./src"),
      "server-only": at("./tests/setup/server-only.ts"),
    },
  },
  test: {
    include: ["tests/**/*.test.ts"],
    globalSetup: ["tests/setup/global.ts"],
    fileParallelism: false,
    // next-intl imports "next/navigation" without an extension; let Vite resolve it.
    server: { deps: { inline: ["next-intl"] } },
    testTimeout: 30_000,
    hookTimeout: 60_000,
    env: {
      DATABASE_URL: "file:./test.db",
      AUTH_SECRET: "test-secret",
      BILLING_TIMER: "off",
      APP_URL: "http://localhost:3000",
      CLICK_MODE: "emulator",
      CLICK_SERVICE_ID: "10000",
      CLICK_SECRET_KEY: "test-click-secret",
      STRIPE_SECRET_KEY: "sk_test_dummy",
      STRIPE_WEBHOOK_SECRET: "whsec_test",
      SMTP_URL: "",
      FISCAL_PROVIDER: "mock-ofd",
    },
  },
});

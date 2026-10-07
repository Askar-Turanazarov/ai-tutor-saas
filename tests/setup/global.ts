import { execSync } from "node:child_process";
import { rmSync } from "node:fs";
import { fileURLToPath } from "node:url";

/** Recreates the throwaway test database (prisma/test.db) from the Prisma schema and seeds it before the run. */
export default function setup() {
  for (const f of ["test.db", "test.db-journal"]) rmSync(fileURLToPath(new URL(`../../prisma/${f}`, import.meta.url)), { force: true });
  const env = { ...process.env, DATABASE_URL: "file:./test.db", PRISMA_HIDE_UPDATE_MESSAGE: "1" };
  execSync("npx prisma db push --skip-generate", { stdio: "ignore", env });
  execSync("npx tsx prisma/seed.ts", { stdio: "ignore", env });
}

// First fill of the Neon database: applies migrations and runs prisma/seed.ts against it (.env.neon),
// then regenerates the SQLite client so the local app keeps working, whatever happened.
import { PG_SCHEMA, neonEnv, run, step } from "./pg-env.mjs";

const env = neonEnv();
run("node", ["scripts/pg-schema.mjs"]);
const ok =
  step("npx", ["prisma", "generate", "--schema", PG_SCHEMA], env) &&
  step("npx", ["prisma", "migrate", "deploy", "--schema", PG_SCHEMA], env) &&
  step("npx", ["tsx", "prisma/seed.ts"], env);
run("npx", ["prisma", "generate"]);
process.exit(ok ? 0 : 1);

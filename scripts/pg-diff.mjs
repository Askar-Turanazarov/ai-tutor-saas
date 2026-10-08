// After changing prisma/schema.prisma: writes prisma/postgres/migrations/NNNN_<name>/migration.sql with the SQL
// that brings the Neon database (DATABASE_URL_UNPOOLED in .env.neon) to the new schema. Review it, commit it, deploy.
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { PG_SCHEMA, neonEnv, run } from "./pg-env.mjs";

const name = (process.argv[2] || "").replace(/[^a-z0-9_]/gi, "_").toLowerCase();
if (!name) {
  console.error("Usage: npm run db:pg:diff <migration_name>");
  process.exit(1);
}
const env = neonEnv();
run("node", ["scripts/pg-schema.mjs"]);

const dir = "prisma/postgres/migrations";
const next = (existsSync(dir) ? readdirSync(dir).filter((d) => /^\d{4}_/.test(d)).length : 0) + 1;
const r = spawnSync("npx", ["prisma", "migrate", "diff", "--from-url", env.DATABASE_URL_UNPOOLED, "--to-schema-datamodel", PG_SCHEMA, "--script"], {
  env,
  encoding: "utf8",
  shell: process.platform === "win32",
});
if (r.status !== 0) {
  console.error(r.stderr);
  process.exit(1);
}
if (!/^\s*(CREATE|ALTER|DROP)/m.test(r.stdout)) {
  console.log("The database already matches the schema; no migration written.");
  process.exit(0);
}
const out = `${dir}/${String(next).padStart(4, "0")}_${name}`;
mkdirSync(out, { recursive: true });
writeFileSync(`${out}/migration.sql`, r.stdout);
console.log(`Wrote ${out}/migration.sql — review it and commit; Vercel applies it on the next deploy (prisma migrate deploy).`);

// Environment for commands against Neon: .env (seed accounts, secrets) overlaid with .env.neon
// (DATABASE_URL = pooled, DATABASE_URL_UNPOOLED = direct connection string). Both files are gitignored.
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

const read = (file) =>
  existsSync(file)
    ? Object.fromEntries(
        readFileSync(file, "utf8")
          .split(/\r?\n/)
          .map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*"?(.*?)"?\s*$/))
          .filter(Boolean)
          .map((m) => [m[1], m[2]]),
      )
    : null;

export function neonEnv() {
  const neon = read(".env.neon");
  if (!neon?.DATABASE_URL?.startsWith("postgres") || !neon.DATABASE_URL_UNPOOLED?.startsWith("postgres")) {
    console.error("Create .env.neon with DATABASE_URL (pooled) and DATABASE_URL_UNPOOLED (direct) from the Neon console — see tasks/todo.md or README.");
    process.exit(1);
  }
  return { ...process.env, ...read(".env"), ...neon };
}

export const PG_SCHEMA = "prisma/postgres/schema.prisma";

/** Runs a command and stops the script if it fails. */
export function run(cmd, args, env = process.env) {
  const r = spawnSync(cmd, args, { stdio: "inherit", env, shell: process.platform === "win32" });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

/** Runs a command; returns whether it succeeded. */
export function step(cmd, args, env = process.env) {
  return spawnSync(cmd, args, { stdio: "inherit", env, shell: process.platform === "win32" }).status === 0;
}

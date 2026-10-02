import "server-only";
import type { z } from "zod";
import { db } from "../db";
import { getAllSettings } from "../settings";
import { gemini } from "./providers/gemini";
import { anthropic } from "./providers/anthropic";
import { openai } from "./providers/openai";
import { isProTier } from "./rank";
import { ProviderError, type AIProvider, type ChatTurn } from "./types";

export const PROVIDERS: AIProvider[] = [gemini, anthropic, openai];

const ATTEMPT_TIMEOUT_MS = 15_000;
const TOTAL_BUDGET_MS = 40_000;
const MAX_ATTEMPTS = 8;
const MODELS_TTL_MS = 60 * 60 * 1000;

type ModelCache = { models: string[]; at: number; error?: string };
type Breaker = { failures: number; openUntil: number; lastError?: string };

// Survives hot reloads in dev.
const g = globalThis as unknown as {
  __aiModels?: Map<string, ModelCache>;
  __aiBreakers?: Map<string, Breaker>;
};
const modelCache = (g.__aiModels ??= new Map());
const breakers = (g.__aiBreakers ??= new Map());

export async function providerModels(p: AIProvider, force = false): Promise<ModelCache> {
  const cached = modelCache.get(p.id);
  if (!force && cached && Date.now() - cached.at < (cached.error ? 2 * 60_000 : MODELS_TTL_MS)) return cached;
  try {
    const entry = { models: await p.listModels(), at: Date.now() };
    modelCache.set(p.id, entry);
    return entry;
  } catch (e) {
    const entry = { models: [], at: Date.now(), error: (e as Error).message };
    modelCache.set(p.id, entry);
    return entry;
  }
}

export function breakerState() {
  return Object.fromEntries(breakers);
}

export function resetBreakers() {
  breakers.clear();
  modelCache.clear();
}

function breakerKey(p: string, m: string) {
  return `${p}/${m}`;
}

function isOpen(key: string) {
  const b = breakers.get(key);
  return !!b && b.openUntil > Date.now();
}

function recordFailure(key: string, err: unknown) {
  const b = breakers.get(key) ?? { failures: 0, openUntil: 0 };
  b.failures += 1;
  b.lastError = (err as Error)?.message?.slice(0, 160);
  const status = err instanceof ProviderError ? err.status : undefined;
  let cooldown = 0;
  if (status === 404 || status === 400) cooldown = 60 * 60_000; // model gone or unsupported
  else if (status === 401 || status === 403) cooldown = 10 * 60_000;
  else if (status === 429) cooldown = 60_000 * Math.min(b.failures, 5); // busy / quota
  else if (b.failures >= 2) cooldown = 3 * 60_000; // timeouts, 5xx, bad output
  if (cooldown) b.openUntil = Date.now() + cooldown;
  breakers.set(key, b);
}

function recordSuccess(key: string) {
  breakers.delete(key);
}

export type Candidate = { provider: AIProvider; model: string };

/** Full fallback chain: providers in configured order, each provider's models best-first. */
export async function candidateChain(): Promise<Candidate[]> {
  const s = await getAllSettings();
  if (s["ai.forceMock"] === "true") return [];
  const disabled = new Set(s["ai.disabledModels"].split(",").map((x) => x.trim()).filter(Boolean));
  const order = s["ai.providerOrder"].split(",").map((x) => x.trim());
  const providers = [...PROVIDERS]
    .filter((p) => p.isConfigured())
    .sort((a, b) => idx(order, a.id) - idx(order, b.id));

  const fast: Candidate[] = [];
  const slow: Candidate[] = [];
  for (const p of providers) {
    const { models } = await providerModels(p);
    for (const model of models) {
      if (disabled.has(`${p.id}/${model}`)) continue;
      (isProTier(model) ? slow : fast).push({ provider: p, model });
    }
  }
  // Pro tiers are slow: try them only after every fast model of every provider.
  return s["ai.includePro"] === "true" ? [...fast, ...slow] : fast;
}

function idx(arr: string[], v: string) {
  const i = arr.indexOf(v);
  return i < 0 ? 99 : i;
}

export function extractJSON(text: string): unknown {
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(cleaned.slice(start, end + 1));
    throw new ProviderError("invalid JSON");
  }
}

export type RunResult<T> = { data: T; provider: string; model: string; attempts: number };

/**
 * Runs a JSON task through the fallback chain. Never throws: if every model fails
 * (or no keys are configured) the offline tutor answers instead.
 */
export async function runJSON<T>(opts: {
  task: string;
  system: string;
  messages: ChatTurn[];
  schema: z.ZodType<T>;
  fallback: () => T;
  userId?: string;
  temperature?: number;
  only?: Candidate[];
}): Promise<RunResult<T>> {
  const started = Date.now();
  const chain = (opts.only ?? (await candidateChain())).filter(
    (c) => opts.only || !isOpen(breakerKey(c.provider.id, c.model)),
  );
  let attempt = 0;

  for (const c of chain) {
    if (attempt >= MAX_ATTEMPTS || Date.now() - started > TOTAL_BUDGET_MS) break;
    attempt += 1;
    const key = breakerKey(c.provider.id, c.model);
    const t0 = Date.now();
    try {
      const text = await c.provider.generate(c.model, {
        system: opts.system,
        messages: opts.messages,
        json: true,
        temperature: opts.temperature,
        signal: AbortSignal.timeout(ATTEMPT_TIMEOUT_MS),
      });
      const parsed = opts.schema.safeParse(extractJSON(text));
      if (!parsed.success) throw new ProviderError("schema mismatch");
      recordSuccess(key);
      log(opts.task, c.provider.id, c.model, true, Date.now() - t0, attempt, undefined, opts.userId);
      return { data: parsed.data, provider: c.provider.id, model: c.model, attempts: attempt };
    } catch (e) {
      recordFailure(key, e);
      log(opts.task, c.provider.id, c.model, false, Date.now() - t0, attempt, errMsg(e), opts.userId);
    }
  }

  const t0 = Date.now();
  const data = opts.fallback();
  log(opts.task, "mock", "offline-tutor", true, Date.now() - t0, attempt + 1, undefined, opts.userId);
  return { data, provider: "mock", model: "offline-tutor", attempts: attempt + 1 };
}

function errMsg(e: unknown) {
  if (e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError")) return "timeout";
  return (e as Error)?.message?.slice(0, 300) ?? "unknown";
}

function log(
  task: string,
  provider: string,
  model: string,
  ok: boolean,
  latencyMs: number,
  attempt: number,
  error?: string,
  userId?: string,
) {
  db.aILog
    .create({ data: { task, provider, model, ok, latencyMs, attempt, error, userId } })
    .catch(() => {});
}

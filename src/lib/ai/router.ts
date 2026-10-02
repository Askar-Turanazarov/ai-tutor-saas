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
/** If a model hasn't answered by then, the same request also goes to the next model; first valid answer wins. */
const DEFAULT_HEDGE_MS = 4_500;
const MAX_IN_FLIGHT = 2;
/** Latency measurements older than this are ignored, so a once-slow model gets another chance. */
const LATENCY_TTL_MS = 15 * 60_000;

type ModelCache = { models: string[]; at: number; error?: string };
type Breaker = { failures: number; openUntil: number; lastError?: string };
type Latency = { ms: number; at: number };

// Survives hot reloads in dev.
const g = globalThis as unknown as {
  __aiModels?: Map<string, ModelCache>;
  __aiBreakers?: Map<string, Breaker>;
  __aiLatency?: Map<string, Latency>;
};
const modelCache = (g.__aiModels ??= new Map());
const breakers = (g.__aiBreakers ??= new Map());
const latency = (g.__aiLatency ??= new Map<string, Latency>());

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

/** Smoothed recent response time per model (ms), for the admin panel. */
export function latencyState(): Record<string, number> {
  const now = Date.now();
  return Object.fromEntries(
    [...latency].filter(([, l]) => now - l.at < LATENCY_TTL_MS).map(([k, l]) => [k, Math.round(l.ms)]),
  );
}

export function resetBreakers() {
  breakers.clear();
  modelCache.clear();
  latency.clear();
}

function breakerKey(p: string, m: string) {
  return `${p}/${m}`;
}

function isOpen(key: string) {
  const b = breakers.get(key);
  return !!b && b.openUntil > Date.now();
}

function recordLatency(key: string, ms: number) {
  const prev = latency.get(key);
  const fresh = prev && Date.now() - prev.at < LATENCY_TTL_MS;
  latency.set(key, { ms: fresh ? prev.ms * 0.6 + ms * 0.4 : ms, at: Date.now() });
}

function recordFailure(key: string, err: unknown) {
  const b = breakers.get(key) ?? { failures: 0, openUntil: 0 };
  b.failures += 1;
  b.lastError = (err as Error)?.message?.slice(0, 160);
  const status = err instanceof ProviderError ? err.status : undefined;
  let cooldown = 0;
  if (status === 404 || status === 400) cooldown = 60 * 60_000; // model gone or unsupported
  else if (status === 401 || status === 403) cooldown = 10 * 60_000;
  else if (status === 429) cooldown = 60_000 * Math.min(b.failures, 5); // quota
  else if (status === 503) cooldown = 2 * 60_000 * Math.min(b.failures, 3); // "high demand": skip it right away
  else if (b.failures >= 2) cooldown = 3 * 60_000; // timeouts, other 5xx, bad output
  if (errMsg(err) === "timeout") recordLatency(key, ATTEMPT_TIMEOUT_MS);
  if (cooldown) b.openUntil = Date.now() + cooldown;
  breakers.set(key, b);
}

function recordSuccess(key: string) {
  breakers.delete(key);
}

export type Candidate = { provider: AIProvider; model: string };

/** Full fallback chain: providers in configured order, each provider's models fastest-first. */
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
    const own: Candidate[] = [];
    for (const model of models) {
      if (disabled.has(`${p.id}/${model}`)) continue;
      (isProTier(model) ? slow : own).push({ provider: p, model });
    }
    fast.push(...bySpeed(own));
  }
  // Pro tiers are slow: try them only after every fast model of every provider.
  return s["ai.includePro"] === "true" ? [...fast, ...slow] : fast;
}

/**
 * Inside one provider, order models by how fast they actually answered recently.
 * Unmeasured models keep their static rank (an estimate that grows with position),
 * so newly released models still get tried.
 */
function bySpeed(list: Candidate[]): Candidate[] {
  const now = Date.now();
  const score = (c: Candidate, i: number) => {
    const l = latency.get(breakerKey(c.provider.id, c.model));
    return l && now - l.at < LATENCY_TTL_MS ? l.ms : 2_500 + i * 400;
  };
  return list
    .map((c, i) => ({ c, i, s: score(c, i) }))
    .sort((a, b) => a.s - b.s || a.i - b.i)
    .map((x) => x.c);
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
 *
 * Switching is seamless: a failed model hands over to the next one immediately, and a
 * slow one is "hedged": after `hedgeMs` the next model starts in parallel and whichever
 * returns a valid answer first wins (the other request is cancelled and not penalised).
 */
export async function runJSON<T>(opts: {
  task: string;
  system: string;
  messages: ChatTurn[];
  schema: z.ZodType<T>;
  fallback: () => T;
  userId?: string;
  temperature?: number;
  reasoning?: "off" | "low";
  hedgeMs?: number;
  only?: Candidate[];
  /** Long answers (a whole lesson) need more time than chat replies. */
  timeoutMs?: number;
  maxTokens?: number;
}): Promise<RunResult<T>> {
  const started = Date.now();
  const chain = (opts.only ?? (await candidateChain())).filter(
    (c) => opts.only || !isOpen(breakerKey(c.provider.id, c.model)),
  );
  const hedgeMs = opts.hedgeMs ?? DEFAULT_HEDGE_MS;

  return new Promise<RunResult<T>>((resolve) => {
    let next = 0;
    let attempt = 0;
    let inFlight = 0;
    let done = false;
    let hedgeTimer: ReturnType<typeof setTimeout> | undefined;
    const running = new Set<AbortController>();

    const finish = (r: RunResult<T>) => {
      done = true;
      clearTimeout(hedgeTimer);
      for (const ac of running) ac.abort();
      resolve(r);
    };

    const offline = () => {
      const t0 = Date.now();
      const data = opts.fallback();
      log(opts.task, "mock", "offline-tutor", true, Date.now() - t0, attempt + 1, undefined, opts.userId);
      finish({ data, provider: "mock", model: "offline-tutor", attempts: attempt + 1 });
    };

    const exhausted = () =>
      next >= chain.length || attempt >= MAX_ATTEMPTS || Date.now() - started > Math.max(TOTAL_BUDGET_MS, (opts.timeoutMs ?? 0) * 2);

    const launch = () => {
      if (done) return;
      if (exhausted()) {
        if (inFlight === 0) offline();
        return;
      }
      const c = chain[next++];
      const n = ++attempt;
      const key = breakerKey(c.provider.id, c.model);
      const ac = new AbortController();
      const timeout = setTimeout(() => ac.abort(new DOMException("timeout", "TimeoutError")), opts.timeoutMs ?? ATTEMPT_TIMEOUT_MS);
      running.add(ac);
      inFlight++;
      const t0 = Date.now();

      clearTimeout(hedgeTimer);
      hedgeTimer = setTimeout(() => {
        if (inFlight < MAX_IN_FLIGHT) launch();
      }, hedgeMs);

      c.provider
        .generate(c.model, {
          system: opts.system,
          messages: opts.messages,
          json: true,
          temperature: opts.temperature,
          reasoning: opts.reasoning ?? "off",
          maxTokens: opts.maxTokens,
          signal: ac.signal,
        })
        .then((text) => {
          const parsed = opts.schema.safeParse(extractJSON(text));
          if (!parsed.success) throw new ProviderError(`schema mismatch: ${parsed.error.issues.slice(0, 2).map((i) => `${i.path.join(".")} ${i.message}`).join("; ")}`);
          return parsed.data;
        })
        .then(
          (data) => {
            const ms = Date.now() - t0;
            recordSuccess(key);
            recordLatency(key, ms);
            if (done) return; // a parallel model already answered
            log(opts.task, c.provider.id, c.model, true, ms, n, undefined, opts.userId);
            finish({ data, provider: c.provider.id, model: c.model, attempts: n });
          },
          (e) => {
            if (done) return; // cancelled because another model won
            recordFailure(key, e);
            log(opts.task, c.provider.id, c.model, false, Date.now() - t0, n, errMsg(e), opts.userId);
          },
        )
        .finally(() => {
          clearTimeout(timeout);
          running.delete(ac);
          inFlight--;
          if (!done && inFlight < MAX_IN_FLIGHT) launch();
        });
    };

    launch();
  });
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

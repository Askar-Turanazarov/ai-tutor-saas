import { ProviderError, type AIProvider, type GenerateInput } from "../types";
import { rankModels } from "../rank";

const BASE = "https://generativelanguage.googleapis.com/v1beta";
// Used only if ListModels fails. Gemini 2.5 models are retired (404), so they're not here.
const FALLBACK = ["gemini-3.5-flash-lite", "gemini-3-flash-preview", "gemini-3.1-flash-lite", "gemini-3.6-flash", "gemini-3.5-flash"];
const key = () => (process.env.GEMINI_API_KEY || "").trim();

// Fast tiers first: flash-lite answers a tutoring turn in ~1–2 s, flash in ~2–4 s, pro is last.
const rank = (ids: string[]) =>
  rankModels(ids, [
    [/flash-lite/i, 0],
    [/flash/i, 1],
    [/pro/i, 9],
  ]);

// Not chat models (speech, images, agents, transcription…).
const EXCLUDE = /(embed|tts|image|audio|live|thinking|deep-think|computer|robotics|native|omni|transcribe|customtools|-latest$)/i;

type ThinkingConfig = Record<string, string | number> | null;

/**
 * Every Gemini generation accepts a different way of switching reasoning down:
 * 2.5 takes `thinkingBudget`, 3.x takes `thinkingLevel`, and not every model supports
 * "minimal". We try the options in order and remember which one each model accepted.
 */
function thinkingOptions(model: string, reasoning: "off" | "low"): ThinkingConfig[] {
  const pro = /pro/i.test(model);
  if (/^gemini-2\./.test(model)) return reasoning === "off" ? [{ thinkingBudget: pro ? 128 : 0 }, null] : [{ thinkingBudget: 1024 }, null];
  if (reasoning === "low") return [{ thinkingLevel: "low" }, { thinkingBudget: 1024 }, null];
  return pro
    ? [{ thinkingLevel: "low" }, null]
    : [{ thinkingLevel: "minimal" }, { thinkingBudget: 0 }, { thinkingLevel: "low" }, null];
}

const g = globalThis as unknown as { __geminiThinking?: Map<string, number> };
const accepted = (g.__geminiThinking ??= new Map<string, number>());

export const gemini: AIProvider = {
  id: "gemini",
  label: "Google Gemini",
  isConfigured: () => key().length > 0,

  async listModels() {
    const res = await fetch(`${BASE}/models?pageSize=1000`, {
      headers: { "x-goog-api-key": key() },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new ProviderError(`listModels ${res.status}`, res.status);
    const data = (await res.json()) as {
      models?: { name: string; supportedGenerationMethods?: string[] }[];
    };
    const ids = (data.models ?? [])
      .filter((m) => m.supportedGenerationMethods?.includes("generateContent"))
      .map((m) => m.name.replace(/^models\//, ""))
      .filter((id) => /^gemini-\d/.test(id))
      .filter((id) => !EXCLUDE.test(id));
    return ids.length ? rank(ids) : FALLBACK;
  },

  async generate(model: string, input: GenerateInput) {
    const reasoning = input.reasoning ?? "off";
    const options = thinkingOptions(model, reasoning);
    const cacheKey = `${model}:${reasoning}`;

    for (let i = accepted.get(cacheKey) ?? 0; i < options.length; i++) {
      const res = await fetch(`${BASE}/models/${model}:generateContent`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": key() },
        signal: input.signal,
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: input.system }] },
          contents: input.messages.map((m) => ({
            role: m.role === "assistant" ? "model" : "user",
            parts: [{ text: m.content }],
          })),
          generationConfig: {
            temperature: input.temperature ?? 0.7,
            maxOutputTokens: input.maxTokens ?? 4096,
            ...(input.json ? { responseMimeType: "application/json" } : {}),
            ...(options[i] ? { thinkingConfig: options[i] } : {}),
          },
        }),
      });
      if (!res.ok) {
        const body = (await res.text()).slice(0, 300);
        // The model rejected this reasoning setting: quietly try the next variant on the same model.
        if (res.status === 400 && /thinking|invalid argument/i.test(body) && i < options.length - 1) continue;
        throw new ProviderError(`${res.status} ${body.slice(0, 200)}`, res.status);
      }
      accepted.set(cacheKey, i);
      const data = (await res.json()) as {
        candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] } }[];
      };
      const text =
        data.candidates?.[0]?.content?.parts
          ?.filter((p) => !p.thought)
          .map((p) => p.text ?? "")
          .join("") ?? "";
      if (!text.trim()) throw new ProviderError("empty response");
      return text;
    }
    throw new ProviderError("no accepted thinking config", 400);
  },
};

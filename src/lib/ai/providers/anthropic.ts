import { ProviderError, type AIProvider, type GenerateInput } from "../types";
import { rankModels } from "../rank";

const BASE = "https://api.anthropic.com/v1";
const FALLBACK = ["claude-haiku-4-5", "claude-sonnet-5", "claude-opus-5-5"];
const key = () => process.env.ANTHROPIC_API_KEY || "";
const headers = () => ({
  "content-type": "application/json",
  "x-api-key": key(),
  "anthropic-version": "2023-06-01",
});

export const anthropic: AIProvider = {
  id: "anthropic",
  label: "Anthropic Claude",
  isConfigured: () => key().length > 0,

  async listModels() {
    const res = await fetch(`${BASE}/models?limit=100`, { headers: headers(), signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new ProviderError(`listModels ${res.status}`, res.status);
    const data = (await res.json()) as { data?: { id: string }[] };
    const ids = (data.data ?? []).map((m) => m.id).filter((id) => id.startsWith("claude"));
    return ids.length
      ? rankModels(ids, [
          [/haiku/i, 0],
          [/sonnet/i, 1],
          [/fable/i, 2],
          [/opus/i, 9],
        ])
      : FALLBACK;
  },

  async generate(model: string, input: GenerateInput) {
    const res = await fetch(`${BASE}/messages`, {
      method: "POST",
      headers: headers(),
      signal: input.signal,
      body: JSON.stringify({
        model,
        max_tokens: input.maxTokens ?? 4096,
        system: input.json
          ? `${input.system}\n\nRespond with a single valid JSON object only — no prose, no code fences.`
          : input.system,
        messages: input.messages.map((m) => ({ role: m.role, content: m.content })),
      }),
    });
    if (!res.ok) throw new ProviderError(`${res.status} ${(await res.text()).slice(0, 200)}`, res.status);
    const data = (await res.json()) as { content?: { type: string; text?: string }[] };
    const text =
      data.content
        ?.filter((c) => c.type === "text")
        .map((c) => c.text)
        .join("") ?? "";
    if (!text.trim()) throw new ProviderError("empty response");
    return text;
  },
};

import { ProviderError, type AIProvider, type GenerateInput } from "../types";
import { rankModels } from "../rank";

const BASE = "https://api.openai.com/v1";
const FALLBACK = ["gpt-4.1-mini", "gpt-4o-mini", "gpt-4.1"];
const key = () => process.env.OPENAI_API_KEY || "";

export const openai: AIProvider = {
  id: "openai",
  label: "OpenAI ChatGPT",
  isConfigured: () => key().length > 0,

  async listModels() {
    const res = await fetch(`${BASE}/models`, {
      headers: { authorization: `Bearer ${key()}` },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new ProviderError(`listModels ${res.status}`, res.status);
    const data = (await res.json()) as { data?: { id: string }[] };
    const ids = (data.data ?? [])
      .map((m) => m.id)
      .filter((id) => /^gpt-\d/.test(id))
      .filter((id) => !/(audio|realtime|transcribe|tts|image|search|codex|instruct|16k|0301|0613)/i.test(id));
    return ids.length
      ? rankModels(ids, [
          [/nano/i, 1],
          [/mini/i, 0],
          [/pro/i, 9],
        ])
      : FALLBACK;
  },

  async generate(model: string, input: GenerateInput) {
    const res = await fetch(`${BASE}/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${key()}` },
      signal: input.signal,
      body: JSON.stringify({
        model,
        messages: [{ role: "system", content: input.system }, ...input.messages],
        ...(input.json ? { response_format: { type: "json_object" } } : {}),
      }),
    });
    if (!res.ok) throw new ProviderError(`${res.status} ${(await res.text()).slice(0, 200)}`, res.status);
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const text = data.choices?.[0]?.message?.content ?? "";
    if (!text.trim()) throw new ProviderError("empty response");
    return text;
  },
};

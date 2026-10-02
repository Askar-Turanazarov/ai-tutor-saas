import { ProviderError, type AIProvider, type GenerateInput } from "../types";
import { rankModels } from "../rank";

const BASE = "https://generativelanguage.googleapis.com/v1beta";
const FALLBACK = ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-2.0-flash", "gemini-2.5-pro"];
const key = () => process.env.GEMINI_API_KEY || "";

const rank = (ids: string[]) =>
  rankModels(ids, [
    [/flash-lite/i, 1],
    [/flash/i, 0],
    [/pro/i, 9],
  ]);

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
      .filter((id) => !/(embed|tts|image|audio|live|thinking|computer|robotics|native|-latest$)/i.test(id));
    return ids.length ? rank(ids) : FALLBACK;
  },

  async generate(model: string, input: GenerateInput) {
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
        },
      }),
    });
    if (!res.ok) throw new ProviderError(`${res.status} ${(await res.text()).slice(0, 200)}`, res.status);
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
  },
};

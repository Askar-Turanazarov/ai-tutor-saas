export type ChatTurn = { role: "user" | "assistant"; content: string };

export type GenerateInput = {
  system: string;
  messages: ChatTurn[];
  /** Ask the model to return a single JSON object. */
  json?: boolean;
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
};

export interface AIProvider {
  id: string;
  label: string;
  /** True when credentials exist for this provider. */
  isConfigured(): boolean;
  /** Models available right now, best-first (fast models first, "pro" tiers last). */
  listModels(): Promise<string[]>;
  generate(model: string, input: GenerateInput): Promise<string>;
}

/** Error that should make the router move on to the next model. */
export class ProviderError extends Error {
  constructor(
    message: string,
    public status?: number,
  ) {
    super(message);
  }
}

import { db } from "./db";
import { billingDefaults } from "./billing/catalog";

const BASE_DEFAULTS = {
  "ai.providerOrder": process.env.AI_PROVIDER_ORDER || "gemini,anthropic,openai",
  "ai.forceMock": "false",
  "ai.disabledModels": "",
  "ai.includePro": "true",
} as const;

/** Every known setting with its default. Billing keys (limits, prices) come from the plan catalog. */
export const SETTING_DEFAULTS: Record<string, string> = { ...BASE_DEFAULTS, ...billingDefaults() };

export type SettingKey = keyof typeof BASE_DEFAULTS | `limit.${string}` | `price.${string}` | `billing.${string}`;

export async function getSetting(key: SettingKey): Promise<string> {
  const row = await db.setting.findUnique({ where: { key } });
  return row?.value ?? SETTING_DEFAULTS[key];
}

export async function getAllSettings(): Promise<Record<string, string>> {
  const rows = await db.setting.findMany();
  const out = { ...SETTING_DEFAULTS };
  for (const r of rows) if (r.key in out) out[r.key] = r.value;
  return out;
}

export async function setSetting(key: SettingKey, value: string) {
  await db.setting.upsert({ where: { key }, update: { value }, create: { key, value } });
}

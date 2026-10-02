import { db } from "./db";

export const SETTING_DEFAULTS = {
  "free.dailyMinutes": "15",
  "ai.providerOrder": process.env.AI_PROVIDER_ORDER || "gemini,anthropic,openai",
  "ai.forceMock": "false",
  "ai.disabledModels": "",
  "ai.includePro": "true",
} as const;

export type SettingKey = keyof typeof SETTING_DEFAULTS;

export async function getSetting(key: SettingKey): Promise<string> {
  const row = await db.setting.findUnique({ where: { key } });
  return row?.value ?? SETTING_DEFAULTS[key];
}

export async function getAllSettings(): Promise<Record<SettingKey, string>> {
  const rows = await db.setting.findMany();
  const out = { ...SETTING_DEFAULTS } as Record<SettingKey, string>;
  for (const r of rows) if (r.key in out) out[r.key as SettingKey] = r.value;
  return out;
}

export async function setSetting(key: SettingKey, value: string) {
  await db.setting.upsert({ where: { key }, update: { value }, create: { key, value } });
}

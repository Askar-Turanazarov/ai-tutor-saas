import { db } from "./db";

export const SETTING_DEFAULTS = {
  "free.dailyMinutes": "15",
  "ai.providerOrder": process.env.AI_PROVIDER_ORDER || "gemini,anthropic,openai",
  "ai.forceMock": "false",
  "ai.disabledModels": "",
  "ai.includePro": "true",
  // Prices in sum (UZS) for 1, 3 and 12 months.
  "billing.price1": "79000",
  "billing.price3": "213000",
  "billing.price12": "711000",
  "billing.noticeDays": "3",
  "billing.stripeEnabled": "true",
  "billing.clickEnabled": "true",
  // Fiscal receipt data (Uzbekistan OFD). The MXIK (IKPU) code is chosen by an accountant at tasnif.soliq.uz.
  "billing.mxik": "10305008003000000",
  "billing.packageCode": "1545643",
  "billing.vatPercent": "12",
  "billing.sellerName": "Ustoz AI MChJ (test)",
  "billing.sellerTin": "300000000",
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

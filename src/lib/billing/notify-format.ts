export const NOTIFY_TYPES = ["sub_expiring", "sub_ending", "sub_expired", "payment_ok", "renewed", "payment_failed"] as const;
export type NotifyType = (typeof NOTIFY_TYPES)[number];
export type NotifyParams = Record<string, string | number | boolean>;

const parse = (raw: string | NotifyParams) => (typeof raw === "string" ? (JSON.parse(raw || "{}") as NotifyParams) : raw);

/** ICU messages need real Date objects for `{until, date, long}`; params are stored as JSON. */
export function notifyValues(raw: string | NotifyParams): Record<string, string | number | Date> {
  const out: Record<string, string | number | Date> = { tier: "Pro" };
  for (const [k, v] of Object.entries(parse(raw))) {
    if (typeof v === "boolean") continue;
    out[k] = k === "until" && typeof v === "string" ? new Date(v) : v;
  }
  return out;
}

/** Which message to use for the body: auto-renew reminders and trials have their own text. */
export const bodyKey = (type: NotifyType, raw: string | NotifyParams) => {
  const p = parse(raw);
  if (type === "sub_ending") return p.trial ? "bodyTrial" : "body";
  if (type !== "sub_expiring") return "body";
  return p.trial ? "bodyTrial" : p.autoRenew ? "bodyAuto" : "body";
};

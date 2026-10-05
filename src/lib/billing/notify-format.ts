export const NOTIFY_TYPES = ["sub_expiring", "sub_expired", "payment_ok", "renewed", "payment_failed"] as const;
export type NotifyType = (typeof NOTIFY_TYPES)[number];
export type NotifyParams = Record<string, string | number | boolean>;

/** ICU messages need real Date objects for `{until, date, long}`; params are stored as JSON. */
export function notifyValues(raw: string | NotifyParams): Record<string, string | number | Date> {
  const p = typeof raw === "string" ? (JSON.parse(raw || "{}") as NotifyParams) : raw;
  const out: Record<string, string | number | Date> = {};
  for (const [k, v] of Object.entries(p)) {
    if (typeof v === "boolean") continue;
    out[k] = k === "until" && typeof v === "string" ? new Date(v) : v;
  }
  return out;
}

/** Which message to use for the body: auto-renew reminders have their own text. */
export const bodyKey = (type: NotifyType, raw: string | NotifyParams) => {
  const p = typeof raw === "string" ? (JSON.parse(raw || "{}") as NotifyParams) : raw;
  return type === "sub_expiring" && p.autoRenew ? "bodyAuto" : "body";
};

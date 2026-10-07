/** Phone numbers are stored in E.164 (+998901234567). Uzbek numbers may be typed without the country code. */
export function normalizePhone(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.length === 9 && !input.trim().startsWith("+")) return `+998${digits}`;
  if (digits.startsWith("998")) return digits.length === 12 ? `+${digits}` : null;
  return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : null;
}

/** "+998 90 123 45 67" for Uzbek numbers, E.164 as is for the rest. */
export function formatPhone(e164: string) {
  const m = e164.match(/^\+998(\d{2})(\d{3})(\d{2})(\d{2})$/);
  return m ? `+998 ${m[1]} ${m[2]} ${m[3]} ${m[4]}` : e164;
}

/** Input mask: keeps "+998 XX XXX XX XX" while the user types; other countries are left as typed. */
export function maskPhoneInput(value: string) {
  const raw = value.replace(/[^\d+]/g, "");
  if (!raw) return "";
  const digits = raw.replace(/\D/g, "");
  if (raw.startsWith("+")) {
    if (!"998".startsWith(digits.slice(0, 3))) return `+${digits.slice(0, 15)}`;
    if (digits.length <= 3) return `+${digits}`; // still typing (or erasing) the country code
  }
  const local = (digits.startsWith("998") ? digits.slice(3) : digits).slice(0, 9);
  const parts = [local.slice(0, 2), local.slice(2, 5), local.slice(5, 7), local.slice(7, 9)].filter(Boolean);
  return ["+998", ...parts].join(" ");
}

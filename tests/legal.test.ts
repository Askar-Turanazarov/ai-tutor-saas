import { describe, expect, test } from "vitest";
import { LEGAL_VERSION, legalDoc, termsAccepted, type LegalKind } from "@/lib/legal";

const kinds: LegalKind[] = ["offer", "privacy"];
const locales = ["ru", "uz", "en"];

describe("legal documents", () => {
  test.each(kinds)("%s has the same clauses in every language", (kind) => {
    const [ru, ...rest] = locales.map((l) => legalDoc(kind, l));
    for (const doc of rest) {
      expect(doc.sections.map((s) => s.id)).toEqual(ru.sections.map((s) => s.id));
      expect(doc.sections.map((s) => s.items.length)).toEqual(ru.sections.map((s) => s.items.length));
    }
  });

  test("every edition marks the company and its details as fictitious", () => {
    for (const kind of kinds) for (const l of locales) expect(JSON.stringify(legalDoc(kind, l))).toMatch(/вымышлен|fictitious|toʻqima/);
  });

  test("unknown locale falls back to Russian; acceptance stamps the current edition", () => {
    expect(legalDoc("offer", "de")).toBe(legalDoc("offer", "ru"));
    expect(termsAccepted().termsVersion).toBe(LEGAL_VERSION);
  });
});

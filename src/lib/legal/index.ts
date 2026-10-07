import { offerRu } from "./offer.ru";
import { offerUz } from "./offer.uz";
import { offerEn } from "./offer.en";
import { privacyRu } from "./privacy.ru";
import { privacyUz } from "./privacy.uz";
import { privacyEn } from "./privacy.en";

/**
 * Edition of the offer and the privacy policy. Stored on the user (`termsVersion`) when they
 * accept by signing up or paying; bump it whenever the text changes in substance.
 */
export const LEGAL_VERSION = "2026-10-07";

export type LegalSection = { id: string; title: string; items: string[] };
export type LegalDoc = { title: string; lead: string; sections: LegalSection[] };
export type LegalKind = "offer" | "privacy";

const DOCS: Record<LegalKind, Record<string, LegalDoc>> = {
  offer: { ru: offerRu, uz: offerUz, en: offerEn },
  privacy: { ru: privacyRu, uz: privacyUz, en: privacyEn },
};

export function legalDoc(kind: LegalKind, locale: string): LegalDoc {
  return DOCS[kind][locale] ?? DOCS[kind].ru;
}

/** What to write on the user when they accept the current edition. */
export const termsAccepted = () => ({ termsAcceptedAt: new Date(), termsVersion: LEGAL_VERSION });

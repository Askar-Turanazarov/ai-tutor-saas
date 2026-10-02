/**
 * Which tier unlocks which feature. Pure and synchronous: used both on the server
 * (to enforce) and on the client (to show locks). Numeric quotas live in ./limits.ts.
 */
import { TIER_RANK, type Tier } from "./catalog";
import { FREE_LEVELS, type Level } from "../levels";

export const FEATURES = {
  /** Levels B1–C2 and Pro-marked topics. */
  allLevels: "PLUS",
  /** Correction cards with rule and examples instead of a one-liner. */
  detailedFeedback: "PLUS",
  /** Pronunciation tips (IPA) under tutor messages. */
  chatTips: "PRO",
  /** Learning path with generated quizzes. */
  path: "PLUS",
  pronunciation: "PLUS",
  /** Practising from the mistake bank (Free can only look at it). */
  mistakeTraining: "PLUS",
  /** AI role-play mission at the end of a lesson. */
  missions: "PLUS",
  /** AI-generated C1–C2 and personal lessons. */
  aiLessons: "PRO",
} as const satisfies Record<string, Tier>;

export type Feature = keyof typeof FEATURES;

export function tierOf(u: { plan: string }): Tier {
  return u.plan === "PRO" || u.plan === "PLUS" ? u.plan : "FREE";
}

export const atLeast = (u: { plan: string }, tier: Tier) => TIER_RANK[tierOf(u)] >= TIER_RANK[tier];

export const can = (u: { plan: string }, feature: Feature) => atLeast(u, FEATURES[feature]);

export const requiredTier = (feature: Feature): Tier => FEATURES[feature];

export function canAccessLevel(u: { plan: string }, level: string) {
  return can(u, "allLevels") || FREE_LEVELS.includes(level as Level);
}

export function canAccessTopic(u: { plan: string }, t: { proOnly: boolean; level: string }) {
  return can(u, "allLevels") || (!t.proOnly && canAccessLevel(u, t.level));
}

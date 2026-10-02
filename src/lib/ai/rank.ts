/**
 * Rank model ids so that fast models come first and slow "pro"/"opus" tiers come last.
 * Newer versions win inside a tier; previews and dated snapshots are slightly penalised.
 */
export function rankModels(ids: string[], tiers: [RegExp, number][]): string[] {
  const version = (id: string) => {
    const m = id.match(/(\d+(?:\.\d+)?)/);
    return m ? parseFloat(m[1]) : 0;
  };
  const tier = (id: string) => {
    for (const [re, t] of tiers) if (re.test(id)) return t;
    return 5;
  };
  const unstable = (id: string) => (/(preview|exp|experimental|\d{2}-\d{2})/i.test(id) ? 1 : 0);
  return [...new Set(ids)].sort(
    (a, b) => tier(a) - tier(b) || unstable(a) - unstable(b) || version(b) - version(a) || a.localeCompare(b),
  );
}

export const isProTier = (id: string) => /(^|[-/])(pro|opus)([-.]|$)/i.test(id);

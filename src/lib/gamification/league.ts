import "server-only";
import { db } from "../db";
import { GUEST_DOMAIN } from "../auth";
import { tashkentDate } from "../time";

/** Five divisions in the palette's stones: bronze → turquoise. */
export const LEAGUES = ["bronze", "silver", "gold", "lapis", "turquoise"] as const;
export const ZONE = 3; // top 3 go up, bottom 3 go down
const BOARD = 15;

const DAY = 86_400_000;
const parse = (d: string) => Date.parse(d + "T00:00:00Z");
const fmt = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** Monday of the Tashkent week that contains `date`. */
export function weekStart(date = tashkentDate()) {
  const ms = parse(date);
  const dow = (new Date(ms).getUTCDay() + 6) % 7; // Monday = 0
  return fmt(ms - dow * DAY);
}
const weekDays = (monday: string) => Array.from({ length: 7 }, (_, i) => fmt(parse(monday) + i * DAY));

/** Hours left until the week closes (Monday 00:00 Tashkent). */
export function weekEndsIn(now = Date.now()) {
  const next = parse(weekStart()) + 7 * DAY - 5 * 3600_000;
  const h = Math.max(0, Math.floor((next - now) / 3600_000));
  return { days: Math.floor(h / 24), hours: h % 24 };
}

function noise(seed: string) {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return ((h >>> 0) % 1000) / 1000;
}

/**
 * A demo player's XP for a week, up to now: a daily amount around their pace (some days off),
 * today's share growing with the hour, so they climb during the week like real people.
 */
export function demoXp(p: { id: string; pace: number }, monday: string, now = new Date()) {
  const today = tashkentDate(now);
  const hour = (now.getUTCHours() + 5) % 24;
  let xp = 0;
  for (const d of weekDays(monday)) {
    if (d > today) break;
    const r = noise(p.id + d);
    if (r < 0.15) continue; // a day off
    const day = Math.round(p.pace * (0.4 + r * 1.2));
    xp += d === today ? Math.round((day * Math.min(hour, 22)) / 22) : day;
  }
  return xp;
}

const realUsers = (league: number) =>
  db.user.findMany({ where: { league, role: "USER", NOT: { email: { endsWith: GUEST_DOMAIN } } }, select: { id: true, name: true } });

async function weeklyXp(userIds: string[], monday: string) {
  const days = weekDays(monday);
  const rows = await db.xpEvent.groupBy({ by: ["userId"], where: { userId: { in: userIds }, date: { gte: days[0], lte: days[6] } }, _sum: { amount: true } });
  return new Map(rows.map((r) => [r.userId, r._sum.amount ?? 0]));
}

export type BoardRow = { id: string; name: string; xp: number; demo: boolean; me: boolean };

/** The league table for a week: the real learners of the division plus demo players to fill it. */
async function board(user: { id: string; name: string; league: number }, monday: string, now?: Date): Promise<BoardRow[]> {
  const real = (await realUsers(user.league)).filter((u) => u.id !== user.id);
  const people = [{ id: user.id, name: user.name }, ...real].slice(0, BOARD);
  const xp = await weeklyXp(people.map((p) => p.id), monday);
  const demos = await db.demoPlayer.findMany({ where: { league: user.league }, orderBy: { id: "asc" }, take: Math.max(0, BOARD - people.length) });
  const rows: BoardRow[] = [
    ...people.map((p) => ({ id: p.id, name: p.name, xp: xp.get(p.id) ?? 0, demo: false, me: p.id === user.id })),
    ...demos.map((d) => ({ id: d.id, name: d.name, xp: demoXp(d, monday, now), demo: true, me: false })),
  ];
  // Ties: the learner goes after people with the same XP (no free promotions at 0 XP).
  return rows.sort((a, b) => b.xp - a.xp || Number(a.me) - Number(b.me) || a.name.localeCompare(b.name));
}

/**
 * Settles past weeks lazily, the first time the learner looks after Monday: top 3 move up,
 * bottom 3 (or anyone with no XP) move down.
 */
async function settle(user: { id: string; name: string; league: number; leagueWeek: string | null; leagueLast: string | null }) {
  const current = weekStart();
  if (user.leagueWeek === current) return { league: user.league, note: user.leagueLast };
  if (!user.leagueWeek) {
    await db.user.update({ where: { id: user.id }, data: { leagueWeek: current } });
    return { league: user.league, note: null };
  }
  // Only the week right before this one counts; older gaps just mean the learner was away.
  const last = fmt(parse(current) - 7 * DAY);
  let league = user.league;
  let note: string | null = null;
  if (user.leagueWeek === last) {
    const rows = await board(user, last, new Date(parse(current) - 1));
    const rank = rows.findIndex((r) => r.me) + 1;
    const mine = rows[rank - 1].xp;
    if (rank <= ZONE && mine > 0) league = Math.min(LEAGUES.length - 1, league + 1);
    else if (rank > rows.length - ZONE || mine === 0) league = Math.max(0, league - 1);
    note = JSON.stringify({ from: user.league, to: league, rank });
  } else if (league > 0) {
    league -= 1;
    note = JSON.stringify({ from: user.league, to: league, rank: 0 });
  }
  await db.user.update({ where: { id: user.id }, data: { league, leagueWeek: current, leagueLast: note } });
  return { league, note };
}

export async function leagueState(user: { id: string; name: string; league: number; leagueWeek: string | null; leagueLast: string | null }) {
  const { league, note: last } = await settle(user);
  // Other learners' ids stay on the server.
  const rows = (await board({ ...user, league }, weekStart())).map((r, i) => ({ ...r, id: r.demo || r.me ? r.id : `p${i}` }));
  const rank = rows.findIndex((r) => r.me) + 1;
  return { league, key: LEAGUES[league], rows, rank, size: rows.length, endsIn: weekEndsIn(), last: last ? (JSON.parse(last) as { from: number; to: number; rank: number }) : null };
}
export type LeagueState = Awaited<ReturnType<typeof leagueState>>;

/** The "seen" flag for the result banner. */
export const dismissLeagueNote = (userId: string) => db.user.update({ where: { id: userId }, data: { leagueLast: null } });

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { TOPICS } from "../src/lib/content/topics";
import { lessonRows } from "../src/lib/content/lessons";
import { ACHIEVEMENTS, levelFromXp } from "../src/lib/gamification/rules";
import { DEMO_PLAYERS } from "./demo-players";

const db = new PrismaClient();

/** Same numbering as the app: UST-<year>-<6 digits>, sequential per year. */
async function nextNumber(at: Date) {
  const year = at.getFullYear();
  const last = await db.invoice.findFirst({ where: { number: { startsWith: `UST-${year}-` } }, orderBy: { number: "desc" } });
  return `UST-${year}-${String((last ? Number(last.number.slice(-6)) : 0) + 1).padStart(6, "0")}`;
}

async function main() {
  for (const [i, t] of TOPICS.entries()) {
    const data = {
      level: t.level,
      icon: t.icon,
      proOnly: !!t.proOnly,
      order: i,
      titleRu: t.title.ru,
      titleEn: t.title.en,
      titleUz: t.title.uz,
      descRu: t.desc.ru,
      descEn: t.desc.en,
      descUz: t.desc.uz,
      starter: t.starter,
    };
    await db.topic.upsert({ where: { slug: t.slug }, update: data, create: { slug: t.slug, ...data } });
  }

  const { items, rows } = lessonRows();
  for (const it of items) await db.lexicalItem.upsert({ where: { id: it.id }, update: it, create: it });
  for (const l of rows) await db.lesson.upsert({ where: { slug: l.slug }, update: l, create: l });

  for (const [order, a] of ACHIEVEMENTS.entries()) await db.achievement.upsert({ where: { id: a.id }, update: { ...a, order }, create: { ...a, order } });

  for (const p of DEMO_PLAYERS) await db.demoPlayer.upsert({ where: { id: p.id }, update: p, create: p });
  const userPw = await bcrypt.hash(process.env.SEED_USER_PASSWORD || "demo12345", 10);
  const adminPw = await bcrypt.hash(process.env.SEED_ADMIN_PASSWORD || "admin12345", 10);
  const users = [
    { email: process.env.SEED_ADMIN_EMAIL || "admin@ustoz.local", name: "Admin", role: "ADMIN", plan: "PRO", level: "B2", passwordHash: adminPw },
    { email: process.env.SEED_FREE_EMAIL || "free@ustoz.local", name: "Dilnoza", role: "USER", plan: "FREE", level: "A1", passwordHash: userPw },
    { email: process.env.SEED_PLUS_EMAIL || "plus@ustoz.local", name: "Malika", role: "USER", plan: "PLUS", level: "A2", passwordHash: userPw },
    { email: process.env.SEED_PRO_EMAIL || "pro@ustoz.local", name: "Timur", role: "USER", plan: "PRO", level: "B1", passwordHash: userPw },
    // Plus that ends in two days: shows the reminder, auto-renewal and expiry right away.
    { email: "sub@ustoz.local", name: "Aziz", role: "USER", plan: "PLUS", level: "A2", passwordHash: userPw },
  ];
  const day = 24 * 60 * 60 * 1000;
  for (const u of users) {
    const user = await db.user.upsert({
      where: { email: u.email },
      update: { role: u.role, plan: u.plan },
      create: {
        ...u,
        onboarded: true,
        xp: u.plan === "FREE" ? 60 : 340,
        streak: u.plan === "FREE" ? 1 : 5,
        bestStreak: u.plan === "FREE" ? 1 : 5,
        // Seeded XP is not something to celebrate on first login.
        levelSeen: levelFromXp(u.plan === "FREE" ? 60 : 340).level,
      },
    });
    if (u.plan === "FREE" || (await db.subscription.findUnique({ where: { userId: user.id } }))) continue;

    // Paid demo accounts get a real subscription so renewals and cancellation can be tried right away.
    const soon = u.email === "sub@ustoz.local";
    const months = u.role === "ADMIN" ? 12 : 1;
    const end = soon ? new Date(Date.now() + 2 * day) : new Date(Date.now() - 10 * day);
    if (!soon) end.setMonth(end.getMonth() + months);
    const start = new Date(end);
    start.setMonth(start.getMonth() - months);
    const card =
      u.role === "ADMIN"
        ? null
        : await db.paymentMethod.create({
            data: {
              userId: user.id,
              provider: "card",
              brand: u.plan === "PRO" ? "humo" : "uzcard",
              last4: soon ? "1111" : u.plan === "PRO" ? "4417" : "1234",
              expMonth: 12,
              expYear: 2029,
              token: `tok_seed_${user.id}`,
            },
          });
    const sub = await db.subscription.create({
      data: {
        userId: user.id,
        tier: u.plan,
        period: months,
        status: "active",
        provider: card ? "card" : "admin",
        currentPeriodStart: start,
        currentPeriodEnd: end,
        paymentMethodId: card?.id,
      },
    });
    if (card) {
      const amount = u.plan === "PRO" ? 89000 : 49000;
      const invoice = await db.invoice.create({
        data: {
          number: await nextNumber(start),
          userId: user.id,
          subscriptionId: sub.id,
          tier: u.plan,
          period: months,
          amount,
          currency: "UZS",
          provider: "card",
          status: "paid",
          saveCard: true,
          providerTxId: `seed_${user.id}`,
          paidAt: start,
          createdAt: start,
          periodStart: start,
          periodEnd: end,
        },
      });
      const tx = await db.transaction.create({ data: { invoiceId: invoice.id, provider: "card", providerTxId: `seed_${user.id}`, state: "completed", amount } });
      // The same test receipt the mock OFD issues for a real payment (see lib/billing/fiscal.ts).
      const vat = Math.round((amount * 12) / 112);
      const item = { name: `Ustoz AI ${u.plan === "PRO" ? "Pro" : "Plus"}, ${months} мес.`, mxik: "10305008003000000", packageCode: "1545643", price: amount, qty: 1, vatPercent: 12, vat };
      await db.receipt.create({
        data: {
          invoiceId: invoice.id,
          transactionId: tx.id,
          items: JSON.stringify([item]),
          total: amount,
          vatAmount: vat,
          fiscalProvider: "mock-ofd",
          fiscalStatus: "fiscalized",
          fiscalizedAt: start,
          terminalId: "TEST0000000001",
          receiptNo: String(await db.receipt.count({ where: { fiscalStatus: "fiscalized" } }) + 1),
          fiscalSign: String(100_000_000_000 + Math.floor(Math.random() * 899_999_999_999)),
          attempts: 1,
          createdAt: start,
        },
      });
    }
  }
  console.log(`Seeded ${TOPICS.length} topics, ${rows.length} lessons, ${items.length} chunks and ${users.length} users.`);
}

main().finally(() => db.$disconnect());

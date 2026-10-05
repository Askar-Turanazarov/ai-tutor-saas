import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { TOPICS } from "../src/lib/content/topics";

const db = new PrismaClient();

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

  const userPw = await bcrypt.hash(process.env.SEED_USER_PASSWORD || "demo12345", 10);
  const adminPw = await bcrypt.hash(process.env.SEED_ADMIN_PASSWORD || "admin12345", 10);
  const users = [
    { email: process.env.SEED_ADMIN_EMAIL || "admin@ustoz.local", name: "Admin", role: "ADMIN", plan: "PRO", level: "B2", passwordHash: adminPw },
    { email: process.env.SEED_FREE_EMAIL || "free@ustoz.local", name: "Dilnoza", role: "USER", plan: "FREE", level: "A1", passwordHash: userPw },
    { email: process.env.SEED_PRO_EMAIL || "pro@ustoz.local", name: "Timur", role: "USER", plan: "PRO", level: "B1", passwordHash: userPw },
  ];
  for (const u of users) {
    await db.user.upsert({
      where: { email: u.email },
      // Seeded Pro accounts are lifetime Pro (no end date), like Pro granted by an admin.
      update: { role: u.role, plan: u.plan, proUntil: null },
      create: { ...u, onboarded: true, xp: u.plan === "PRO" ? 340 : 60, streak: u.plan === "PRO" ? 5 : 1 },
    });
  }
  // A paid subscription that ends in 2 days: shows the reminder banner/notification right away.
  const subEmail = process.env.SEED_SUB_EMAIL || "sub@ustoz.local";
  if (!(await db.user.findUnique({ where: { email: subEmail } }))) {
    const end = new Date(Date.now() + 2 * 86_400_000);
    const start = new Date(end);
    start.setMonth(start.getMonth() - 1);
    const u = await db.user.create({
      data: { email: subEmail, name: "Malika", passwordHash: userPw, plan: "PRO", proUntil: end, level: "B1", onboarded: true, xp: 180, streak: 3 },
    });
    const sub = await db.subscription.create({
      data: { userId: u.id, provider: "click", months: 1, status: "active", currentPeriodStart: start, currentPeriodEnd: end },
    });
    await db.invoice.create({
      data: {
        number: `UST-${start.getFullYear()}-SEED01`,
        userId: u.id,
        subscriptionId: sub.id,
        kind: "initial",
        provider: "click",
        months: 1,
        amount: 79_000_00,
        status: "paid",
        periodStart: start,
        periodEnd: end,
        paidAt: start,
      },
    });
  }
  console.log(`Seeded ${TOPICS.length} topics and ${users.length + 1} users.`);
}

main().finally(() => db.$disconnect());

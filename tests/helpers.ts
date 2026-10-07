import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";

/** Throwaway user in the test database; removed by the caller (cascade cleans the rest). */
export function makeUser(data: { plan?: string; level?: string; email?: string } = {}) {
  return db.user.create({
    data: { email: data.email ?? `t-${randomUUID()}@test.local`, name: "Test", passwordHash: "-", plan: data.plan ?? "FREE", level: data.level ?? "B1", onboarded: true },
  });
}

export const userWithSub = (id: string) => db.user.findUniqueOrThrow({ where: { id }, include: { subscription: true } });

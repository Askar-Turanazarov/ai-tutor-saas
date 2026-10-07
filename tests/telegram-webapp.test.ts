import { createHmac } from "node:crypto";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import type { User } from "@prisma/client";
import { db } from "@/lib/db";
import { verifyInitData } from "@/lib/messaging/telegram-webapp";
import { POST as me } from "@/app/api/telegram/me/route";
import { makeUser } from "./helpers";

const TOKEN = "123456:test-token";

/** Signs initData the way Telegram does. */
function sign(fields: Record<string, string>, token = TOKEN) {
  const check = Object.entries(fields)
    .map(([k, v]) => `${k}=${v}`)
    .sort()
    .join("\n");
  const secret = createHmac("sha256", "WebAppData").update(token).digest();
  const hash = createHmac("sha256", secret).update(check).digest("hex");
  return new URLSearchParams({ ...fields, hash }).toString();
}
const fields = (id: number, ageSec = 60) => ({
  auth_date: String(Math.floor(Date.now() / 1000) - ageSec),
  query_id: "AAE",
  user: JSON.stringify({ id, first_name: "QA", username: "qa" }),
});

describe("Mini App initData", () => {
  test("accepts a valid signature and returns the user", () => {
    expect(verifyInitData(sign(fields(42)), TOKEN)?.id).toBe(42);
  });

  test("refuses a wrong token, tampered data and stale auth_date", () => {
    expect(verifyInitData(sign(fields(42)), "other:token")).toBeNull();
    const tampered = sign(fields(42)).replace("%22id%22%3A42", "%22id%22%3A43");
    expect(verifyInitData(tampered, TOKEN)).toBeNull();
    expect(verifyInitData(sign(fields(42, 25 * 3600)), TOKEN)).toBeNull();
    expect(verifyInitData("auth_date=1", TOKEN)).toBeNull();
  });
});

describe("POST /api/telegram/me", () => {
  let u: User;
  const call = (body: object) => me(new Request("http://x/api/telegram/me", { method: "POST", body: JSON.stringify(body) }));

  beforeAll(async () => {
    process.env.TELEGRAM_BOT_TOKEN = TOKEN;
    u = await makeUser();
    await db.user.update({ where: { id: u.id }, data: { telegramChatId: "777000" } });
  });
  afterAll(async () => {
    delete process.env.TELEGRAM_BOT_TOKEN;
    await db.user.delete({ where: { id: u.id } });
  });

  test("returns the linked account's data, 'not linked' for others, 401 for bad data", async () => {
    const ok = await (await call({ initData: sign(fields(777000)) })).json();
    expect(ok.linked).toBe(true);
    expect(ok.data.profile.email).toBe(u.email);
    expect(ok.data.tier).toBe("FREE");

    expect(await (await call({ initData: sign(fields(1)) })).json()).toEqual({ linked: false });
    expect((await call({ initData: sign(fields(777000), "bad:token") })).status).toBe(401);
    expect((await call({})).status).toBe(401);
  });
});

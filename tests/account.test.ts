import { afterAll, beforeAll, describe, expect, test } from "vitest";
import type { User } from "@prisma/client";
import { db } from "@/lib/db";
import { consumeToken, issueToken, issuedRecently, peekToken } from "@/lib/account/tokens";
import { requestPasswordReset } from "@/app/actions/account";
import { makeUser } from "./helpers";

const form = (data: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(data)) f.set(k, v);
  return f;
};

describe("one-time tokens", () => {
  let u: User;
  beforeAll(async () => {
    u = await makeUser();
  });
  afterAll(async () => {
    await db.user.delete({ where: { id: u.id } });
  });

  test("valid once, for its own kind only; only the hash is stored", async () => {
    const raw = await issueToken(u.id, "verify", 60_000);
    expect(await db.authToken.count({ where: { tokenHash: raw } })).toBe(0);
    expect(await peekToken(raw, "reset")).toBeNull();
    expect(await peekToken(raw, "verify")).toBe(u.id);
    expect(await consumeToken(raw, "verify")).toBe(u.id);
    expect(await consumeToken(raw, "verify")).toBeNull();
    expect(await consumeToken("nonsense", "verify")).toBeNull();
  });

  test("expired and superseded tokens are refused", async () => {
    const old = await issueToken(u.id, "reset", 60_000);
    const fresh = await issueToken(u.id, "reset", 60_000);
    expect(await peekToken(old, "reset")).toBeNull();
    expect(await peekToken(fresh, "reset")).toBe(u.id);
    const expired = await issueToken(u.id, "verify", -1);
    expect(await consumeToken(expired, "verify")).toBeNull();
    expect(await issuedRecently(u.id, "verify")).toBe(true);
  });
});

describe("forgot password", () => {
  let u: User;
  beforeAll(async () => {
    u = await makeUser();
  });
  afterAll(async () => {
    await db.user.delete({ where: { id: u.id } });
  });

  test("same answer for unknown addresses, bad input is rejected", async () => {
    expect(await requestPasswordReset(undefined, form({ email: "nobody@test.local" }))).toEqual({ sent: true, email: "nobody@test.local" });
    expect((await requestPasswordReset(undefined, form({ email: "not-an-email" })))?.error).toBe("errEmail");
  });

  test("emails a working reset link, at most once a minute", async () => {
    expect((await requestPasswordReset(undefined, form({ email: u.email.toUpperCase() })))?.sent).toBe(true);
    await requestPasswordReset(undefined, form({ email: u.email }));
    const mails = await db.outboxMessage.findMany({ where: { userId: u.id } });
    expect(mails).toHaveLength(1);
    const token = mails[0].body.match(/\/reset\?token=([\w-]+)/)?.[1];
    expect(token).toBeTruthy();
    expect(await peekToken(token!, "reset")).toBe(u.id);
  });
});

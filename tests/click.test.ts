import { afterAll, beforeAll, describe, expect, test } from "vitest";
import type { Invoice, User } from "@prisma/client";
import { db } from "@/lib/db";
import { createInvoice } from "@/lib/billing/subscription";
import { clickConfig, clickSign } from "@/lib/billing/providers/click";
import { POST as prepare } from "@/app/api/payments/click/prepare/route";
import { POST as complete } from "@/app/api/payments/click/complete/route";
import { makeUser } from "./helpers";

type ClickReply = { error: number; merchant_prepare_id?: number };

describe("Click SHOP API callbacks", () => {
  let u: User;
  let inv: Invoice;
  let base: Record<string, string>;
  const cfg = clickConfig();
  const call = async (handler: (req: Request) => Promise<Response>, p: Record<string, string>, sign = clickSign(p, cfg.secretKey)) => {
    const req = new Request("http://localhost/api/payments/click", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ ...p, sign_string: sign }),
    });
    return (await (await handler(req)).json()) as ClickReply;
  };

  beforeAll(async () => {
    u = await makeUser();
    inv = await createInvoice(u, { tier: "PLUS", period: 1, provider: "click", currency: "UZS" });
    const id = String(Date.now());
    base = {
      click_trans_id: id,
      service_id: cfg.serviceId,
      click_paydoc_id: id.slice(-8),
      merchant_trans_id: inv.id,
      amount: inv.amount.toFixed(2),
      sign_time: "2026-10-06 12:00:00",
      error: "0",
      error_note: "Success",
    };
  });
  afterAll(async () => {
    await db.user.delete({ where: { id: u.id } });
  });

  test("bad signature → -1, wrong amount → -2", async () => {
    expect((await call(prepare, { ...base, action: "0" }, "bad")).error).toBe(-1);
    expect((await call(prepare, { ...base, action: "0", amount: "1000.00" })).error).toBe(-2);
  });

  test("prepare + complete pays the invoice once and fiscalizes the receipt", async () => {
    const prep = await call(prepare, { ...base, action: "0" });
    expect(prep.error).toBe(0);
    expect(prep.merchant_prepare_id).toBeTruthy();
    const done = { ...base, action: "1", merchant_prepare_id: String(prep.merchant_prepare_id) };
    expect((await call(complete, done)).error).toBe(0);
    expect((await call(complete, done)).error).toBe(-4);
    const paid = await db.invoice.findUniqueOrThrow({ where: { id: inv.id }, include: { receipts: true } });
    expect(paid.status).toBe("paid");
    expect(paid.receipts[0]?.fiscalStatus).toBe("fiscalized");
  });
});

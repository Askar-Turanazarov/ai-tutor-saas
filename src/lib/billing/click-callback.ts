import { db } from "../db";
import { CLICK_ERR, clickAmountToTiyin, clickVerify, type ClickParams } from "./click";
import { activatePaidInvoice } from "./service";

type Reply = Record<string, string | number | null>;

const FIELDS = ["click_trans_id", "service_id", "merchant_trans_id", "amount", "action", "error", "sign_time", "sign_string"] as const;

/**
 * Click SHOP API callbacks. action=0 is Prepare (check the order, reserve it),
 * action=1 is Complete (Click took the money, or failed to: `error` < 0).
 */
export async function handleClickCallback(action: "0" | "1", form: URLSearchParams): Promise<Reply> {
  const p = Object.fromEntries(form) as unknown as ClickParams;
  const base: Reply = { click_trans_id: p.click_trans_id ?? null, merchant_trans_id: p.merchant_trans_id ?? null };
  const fail = (error: number, note: string): Reply => ({ ...base, error, error_note: note });

  const res = await (async (): Promise<Reply> => {
    if (FIELDS.some((f) => p[f] === undefined) || (action === "1" && !p.merchant_prepare_id)) return fail(CLICK_ERR.BAD_REQUEST, "Error in request from click");
    if (!clickVerify(p)) return fail(CLICK_ERR.SIGN, "SIGN CHECK FAILED!");
    if (p.action !== action) return fail(CLICK_ERR.ACTION, "Action not found");

    const inv = await db.invoice.findUnique({ where: { id: p.merchant_trans_id } });
    if (!inv || inv.provider !== "click") return fail(CLICK_ERR.NOT_FOUND, "Invoice not found");
    if (clickAmountToTiyin(p.amount) !== inv.amount) return fail(CLICK_ERR.AMOUNT, "Incorrect parameter amount");
    if (inv.status === "paid") return fail(CLICK_ERR.ALREADY_PAID, "Already paid");
    if (inv.status !== "open") return fail(CLICK_ERR.CANCELLED, "Transaction cancelled");

    if (action === "0") {
      const existing = await db.transaction.findUnique({ where: { provider_providerTxId: { provider: "click", providerTxId: p.click_trans_id } } });
      const prepareId = existing?.clickPrepareId ?? ((await db.transaction.aggregate({ _max: { clickPrepareId: true } }))._max.clickPrepareId ?? 0) + 1;
      await db.transaction.upsert({
        where: { provider_providerTxId: { provider: "click", providerTxId: p.click_trans_id } },
        update: { state: "prepared", raw: JSON.stringify(p) },
        create: { invoiceId: inv.id, provider: "click", providerTxId: p.click_trans_id, clickPrepareId: prepareId, amount: inv.amount, state: "prepared", raw: JSON.stringify(p) },
      });
      return { ...base, merchant_prepare_id: prepareId, error: CLICK_ERR.OK, error_note: "Success" };
    }

    const tx = await db.transaction.findUnique({ where: { clickPrepareId: Number(p.merchant_prepare_id) } });
    if (!tx || tx.providerTxId !== p.click_trans_id || tx.invoiceId !== inv.id) return fail(CLICK_ERR.TX_NOT_FOUND, "Transaction does not exist");
    if (tx.state === "canceled") return fail(CLICK_ERR.CANCELLED, "Transaction cancelled");

    // Click reports a failed payment (e.g. -5017 insufficient funds) through the same call.
    if (Number(p.error) < 0) {
      await db.transaction.update({ where: { id: tx.id }, data: { state: "canceled", error: `click ${p.error} ${p.error_note ?? ""}`.trim(), raw: JSON.stringify(p) } });
      return fail(CLICK_ERR.CANCELLED, "Transaction cancelled");
    }

    await activatePaidInvoice(inv.id, { provider: "click", providerTxId: p.click_trans_id, raw: p });
    return { ...base, merchant_confirm_id: tx.clickPrepareId, error: CLICK_ERR.OK, error_note: "Success" };
  })();

  // Journal every callback; the unique id keeps exact repeats from being logged twice.
  await db.webhookEvent
    .create({
      data: {
        provider: "click",
        eventId: `click:${p.click_trans_id}:${action}:${p.sign_time}:${res.error}`,
        type: action === "0" ? "prepare" : "complete",
        payload: JSON.stringify({ request: p, response: res }),
        ok: res.error === 0,
        error: res.error === 0 ? null : String(res.error_note),
        processedAt: new Date(),
      },
    })
    .catch(() => {});
  return res;
}

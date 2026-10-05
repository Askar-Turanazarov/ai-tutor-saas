import { randomInt } from "node:crypto";
import { db } from "../db";
import { billingConfig, clickMode, fiscalProviderName } from "./config";
import { submitFiscalItems } from "./click";

/**
 * Fiscal receipts (Uzbekistan). Every payment from an individual needs a receipt registered
 * with the OFD (tax office). Click can do it for its own payments (`ofd_data/submit_items`);
 * Stripe has no link to the Uzbek OFD, so in the study version receipts are fiscalized by a
 * mock OFD: all the fields are there, marked as TEST, nothing is sent to the tax office.
 */

export type ReceiptItem = {
  name: string;
  mxik: string;
  packageCode: string;
  price: number; // tiyin, VAT included
  qty: number;
  vatPercent: number;
  vat: number; // tiyin
};

export async function createReceipt(invoiceId: string, transactionId: string | null) {
  const exists = await db.receipt.findFirst({ where: { invoiceId, kind: "sale" } });
  if (exists) return exists;
  const inv = await db.invoice.findUniqueOrThrow({ where: { id: invoiceId } });
  const { fiscal } = await billingConfig();
  const vat = Math.round((inv.amount * fiscal.vatPercent) / (100 + fiscal.vatPercent));
  const item: ReceiptItem = {
    name: `Ustoz AI Pro — ${inv.months} mo.`,
    mxik: fiscal.mxik,
    packageCode: fiscal.packageCode,
    price: inv.amount,
    qty: 1,
    vatPercent: fiscal.vatPercent,
    vat,
  };
  const configured = fiscalProviderName();
  const provider =
    configured === "none" ? "none" : configured === "click-ofd" && inv.provider === "click" && clickMode() === "live" ? "click-ofd" : "mock-ofd";
  const receipt = await db.receipt.create({
    data: {
      invoiceId,
      transactionId,
      items: JSON.stringify([item]),
      total: inv.amount,
      vatAmount: vat,
      fiscalProvider: provider,
      fiscalStatus: provider === "none" ? "skipped" : "pending",
    },
  });
  await fiscalize(receipt.id);
  return receipt;
}

export async function fiscalize(receiptId: string) {
  const r = await db.receipt.findUnique({ where: { id: receiptId }, include: { transaction: true } });
  if (!r || r.fiscalStatus === "fiscalized" || r.fiscalStatus === "skipped") return;
  try {
    if (r.fiscalProvider === "click-ofd") {
      const { sellerTin } = (await billingConfig()).fiscal;
      const items = (JSON.parse(r.items) as ReceiptItem[]).map((i) => ({
        Name: i.name,
        SPIC: i.mxik,
        PackageCode: i.packageCode,
        Price: i.price,
        Amount: i.qty,
        VAT: i.vat,
        VATPercent: i.vatPercent,
        CommissionInfo: { TIN: sellerTin },
      }));
      const raw = r.transaction?.raw ? (JSON.parse(r.transaction.raw) as Record<string, string>) : {};
      const paymentId = raw.click_paydoc_id || r.transaction?.providerTxId;
      if (!paymentId) throw new Error("no Click payment id");
      await submitFiscalItems(paymentId, items, r.total);
      await db.receipt.update({
        where: { id: r.id },
        data: { fiscalStatus: "fiscalized", fiscalizedAt: new Date(), attempts: { increment: 1 }, error: null },
      });
      return;
    }
    // mock-ofd: what a real OFD returns: terminal, receipt number and fiscal sign.
    const count = await db.receipt.count({ where: { fiscalStatus: "fiscalized" } });
    await db.receipt.update({
      where: { id: r.id },
      data: {
        fiscalStatus: "fiscalized",
        fiscalizedAt: new Date(),
        terminalId: "TEST0000000001",
        receiptNo: String(count + 1),
        fiscalSign: String(randomInt(100_000, 999_999)) + String(randomInt(100_000, 999_999)),
        attempts: { increment: 1 },
        error: null,
      },
    });
  } catch (e) {
    await db.receipt.update({
      where: { id: r.id },
      data: { fiscalStatus: "failed", attempts: { increment: 1 }, error: (e as Error).message.slice(0, 300) },
    });
  }
}

export async function retryFailedReceipts() {
  const list = await db.receipt.findMany({ where: { fiscalStatus: { in: ["pending", "failed"] }, attempts: { lt: 10 } }, take: 20 });
  for (const r of list) await fiscalize(r.id);
  return list.length;
}

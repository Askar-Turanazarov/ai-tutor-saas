import "server-only";
import { randomInt } from "node:crypto";
import { db } from "../db";
import { getAllSettings } from "../settings";
import { tierLabel } from "./catalog";

/**
 * Fiscal receipts (Uzbekistan). Every payment from an individual needs a receipt registered
 * with the OFD (tax office). Click can do it for its own payments (`ofd_data/submit_items`);
 * Stripe and the Uzcard/HUMO mock have no link to the Uzbek OFD, so here receipts are fiscalized
 * by a mock OFD: all the fields are there, marked as TEST, nothing is sent to the tax office.
 */

export type ReceiptItem = {
  name: string;
  mxik: string;
  packageCode: string;
  price: number; // whole UZS, VAT included
  qty: number;
  vatPercent: number;
  vat: number; // whole UZS
};

type FiscalProvider = "mock-ofd" | "click-ofd" | "none";

const fiscalProviderName = (): FiscalProvider => {
  const v = process.env.FISCAL_PROVIDER;
  return v === "click-ofd" || v === "none" ? v : "mock-ofd";
};

export async function fiscalSettings() {
  const s = await getAllSettings();
  return {
    mxik: s["billing.mxik"],
    packageCode: s["billing.packageCode"],
    vatPercent: Number(s["billing.vatPercent"]) || 0,
    sellerName: s["billing.sellerName"],
    sellerTin: s["billing.sellerTin"],
  };
}

/** Creates the sale receipt of a paid invoice (once) and fiscalizes it. Never throws. */
export async function createReceipt(invoiceId: string, transactionId: string | null) {
  try {
    const exists = await db.receipt.findFirst({
      where: { invoiceId, kind: "sale" },
    });
    if (exists) return exists;
    const inv = await db.invoice.findUniqueOrThrow({
      where: { id: invoiceId },
    });
    const fiscal = await fiscalSettings();
    const vat = Math.round((inv.amount * fiscal.vatPercent) / (100 + fiscal.vatPercent));
    const item: ReceiptItem = {
      name: `Ustoz AI ${tierLabel(inv.tier)}, ${inv.period} мес.`,
      mxik: fiscal.mxik,
      packageCode: fiscal.packageCode,
      price: inv.amount,
      qty: 1,
      vatPercent: fiscal.vatPercent,
      vat,
    };
    const configured = fiscalProviderName();
    const clickLive = process.env.CLICK_MODE === "live";
    const provider = configured === "none" ? "none" : configured === "click-ofd" && inv.provider === "click" && clickLive ? "click-ofd" : "mock-ofd";
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
  } catch (e) {
    console.error("[fiscal] receipt", invoiceId, e);
    return null;
  }
}

export async function fiscalize(receiptId: string) {
  const r = await db.receipt.findUnique({
    where: { id: receiptId },
    include: { transaction: true },
  });
  if (!r || r.fiscalStatus === "fiscalized" || r.fiscalStatus === "skipped") return;
  try {
    if (r.fiscalProvider === "click-ofd") {
      const { sellerTin } = await fiscalSettings();
      // Click wants amounts in tiyin.
      const items = (JSON.parse(r.items) as ReceiptItem[]).map((i) => ({
        Name: i.name,
        SPIC: i.mxik,
        PackageCode: i.packageCode,
        Price: i.price * 100,
        Amount: i.qty,
        VAT: i.vat * 100,
        VATPercent: i.vatPercent,
        CommissionInfo: { TIN: sellerTin },
      }));
      const raw = r.transaction?.raw ? (JSON.parse(r.transaction.raw) as Record<string, string>) : {};
      const paymentId = raw.click_paydoc_id || r.transaction?.providerTxId;
      if (!paymentId) throw new Error("no Click payment id");
      const { submitFiscalItems } = await import("./providers/click");
      await submitFiscalItems(paymentId, items, r.total * 100);
      await db.receipt.update({
        where: { id: r.id },
        data: {
          fiscalStatus: "fiscalized",
          fiscalizedAt: new Date(),
          attempts: { increment: 1 },
          error: null,
        },
      });
      return;
    }
    // mock-ofd: what a real OFD returns: terminal, receipt number and fiscal sign.
    const count = await db.receipt.count({
      where: { fiscalStatus: "fiscalized" },
    });
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
      data: {
        fiscalStatus: "failed",
        attempts: { increment: 1 },
        error: (e as Error).message.slice(0, 300),
      },
    });
  }
}

/** Retries receipts the OFD has not accepted yet (up to 10 attempts each). */
export async function retryFailedReceipts() {
  const list = await db.receipt.findMany({
    where: {
      fiscalStatus: { in: ["pending", "failed"] },
      attempts: { lt: 10 },
    },
    take: 20,
  });
  for (const r of list) await fiscalize(r.id);
  return list.length;
}

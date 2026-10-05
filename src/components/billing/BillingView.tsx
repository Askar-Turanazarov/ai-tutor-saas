"use client";

import { useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useFormatter, useTranslations } from "next-intl";
import { AlertTriangle, CreditCard, Crown, FileText, Plus, RefreshCw, Sparkles, Trash2 } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Badge, Field, Sheet, Stagger, StaggerItem } from "@/components/ui/primitives";
import { Switch } from "@/components/ui/Switch";
import { Link } from "@/i18n/navigation";
import { bindClickCardConfirm, bindClickCardStart, removeCard, setAutoRenew } from "@/app/actions/billing";
import { cn } from "@/lib/cn";

type Sub = { status: string; provider: string; months: number; autoRenew: boolean; end: string | null; price: number; card: string | null };
type Card = { id: string; provider: string; maskedPan: string; brand: string | null; expire: string | null };
type Inv = {
  id: string;
  number: string;
  kind: string;
  provider: string;
  months: number;
  amount: number;
  status: string;
  createdAt: string;
  periodEnd: string | null;
  receiptId: string | null;
};

const STATUS_TONE: Record<string, "success" | "danger" | "neutral" | "gold"> = {
  active: "success",
  past_due: "danger",
  paid: "success",
  failed: "danger",
  open: "gold",
};

export function BillingView({ pro, lifetime, sub, cards, invoices, clickAvailable }: { pro: boolean; lifetime: boolean; sub: Sub | null; cards: Card[]; invoices: Inv[]; clickAvailable: boolean }) {
  const t = useTranslations("billing");
  const f = useFormatter();
  const money = (n: number) => f.number(n, { maximumFractionDigits: 0 });

  return (
    <Stagger className="mx-auto max-w-2xl space-y-6">
      <StaggerItem>
        <h1 className="text-[30px] font-bold tracking-tight">{t("title")}</h1>
      </StaggerItem>

      {/* Plan */}
      <StaggerItem className="surface overflow-hidden rounded-card">
        <div className="flex items-center gap-4 p-5">
          <span className={cn("grid size-12 shrink-0 place-items-center rounded-[14px]", pro ? "bg-accent-soft text-accent" : "bg-fill text-label-2")}>
            <Crown className="size-6" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[13px] text-label-2">{t("planTitle")}</div>
            <div className="flex flex-wrap items-center gap-2 text-[20px] font-bold">
              {lifetime ? t("lifetimeShort") : pro ? "Pro" : "Free"}
              {sub && !lifetime && <Badge tone={STATUS_TONE[sub.status] ?? "neutral"}>{t(`status_${sub.status}` as "status_active")}</Badge>}
            </div>
            {pro && !lifetime && sub?.end && <div className="text-[14px] text-label-2">{t("activeUntil", { date: new Date(sub.end) })}</div>}
          </div>
          {!lifetime && (
            <ButtonLink href="/app/upgrade" size="sm" icon={Sparkles} variant={pro ? "secondary" : "primary"}>
              {pro ? t("renew") : t("getPro")}
            </ButtonLink>
          )}
        </div>
        {!pro && !lifetime && <p className="border-t border-separator px-5 py-4 text-[14px] text-label-2">{t("freeText")}</p>}
        {sub && !lifetime && sub.end && <AutoRenewRow sub={sub} money={money} hasCards={cards.length > 0} />}
      </StaggerItem>

      {/* Cards */}
      <StaggerItem>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-[19px] font-semibold">{t("cards")}</h2>
          {clickAvailable && <BindCard />}
        </div>
        <div className="surface divide-y divide-separator rounded-card">
          {cards.length === 0 && <p className="p-5 text-[14px] text-label-3">{t("noCards")}</p>}
          {cards.map((c) => (
            <CardRow key={c.id} card={c} />
          ))}
        </div>
      </StaggerItem>

      {/* Invoices */}
      <StaggerItem>
        <h2 className="mb-2 text-[19px] font-semibold">{t("invoices")}</h2>
        {invoices.length === 0 ? (
          <p className="surface rounded-card p-5 text-[14px] text-label-3">{t("noInvoices")}</p>
        ) : (
          <ul className="surface divide-y divide-separator rounded-card">
            {invoices.map((i) => (
              <li key={i.id} className="flex items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[13px]">{i.number}</span>
                    <Badge tone={STATUS_TONE[i.status] ?? "neutral"}>{t(`inv_${i.status}` as "inv_paid")}</Badge>
                  </div>
                  <div className="mt-0.5 text-[13px] text-label-2">
                    {f.dateTime(new Date(i.createdAt), { dateStyle: "medium" })} · {t(`kind_${i.kind}` as "kind_initial")} · {t("months", { n: i.months })} ·{" "}
                    {i.provider === "click" ? "Click" : "Stripe"}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[15px] font-semibold tabular-nums">{t("sum", { price: money(i.amount) })}</div>
                  {i.receiptId && (
                    <Link href={`/app/billing/receipt/${i.receiptId}`} className="inline-flex items-center gap-1 text-[13px] font-medium text-accent">
                      <FileText className="size-3.5" /> {t("receipt")}
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </StaggerItem>
    </Stagger>
  );
}

function AutoRenewRow({ sub, money, hasCards }: { sub: Sub; money: (n: number) => string; hasCards: boolean }) {
  const t = useTranslations("billing");
  const [on, setOn] = useState(sub.autoRenew);
  const [hint, setHint] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const end = new Date(sub.end!);

  const toggle = (v: boolean) =>
    start(async () => {
      setHint(null);
      setOn(v);
      const r = await setAutoRenew(v);
      if (!r.ok) {
        setOn(!v);
        setHint(t("noCardHint"));
      }
    });

  return (
    <div className="border-t border-separator px-5 py-4">
      {sub.status === "past_due" && (
        <div className="mb-3 flex items-start gap-2 rounded-[12px] bg-danger-soft p-3 text-[14px] text-danger">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" /> {t("pastDue", { date: end })}
        </div>
      )}
      <div className="flex items-center gap-3">
        <RefreshCw className="size-5 shrink-0 text-label-2" />
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-semibold">{t("autoRenew")}</div>
          <div className="text-[13px] text-label-2">
            {on ? t("nextCharge", { date: end, price: money(sub.price) }) : t("willEnd", { date: end })}
            {on && sub.card && <span className="text-label-3"> · {sub.card}</span>}
          </div>
        </div>
        <Switch checked={on} onChange={toggle} disabled={pending} label={t("autoRenew")} />
      </div>
      <AnimatePresence>
        {(hint || (!hasCards && !on)) && (
          <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mt-2 text-[13px] text-label-3">
            {hint ?? t("noCardHint")}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

function CardRow({ card }: { card: Card }) {
  const t = useTranslations("billing");
  const [pending, start] = useTransition();
  return (
    <motion.div layout className="flex items-center gap-3 p-4">
      <span className="grid size-10 place-items-center rounded-[12px] bg-fill">
        <CreditCard className="size-5 text-label-2" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="font-mono text-[14px]">{card.maskedPan}</div>
        <div className="text-[12.5px] text-label-2">
          {[card.brand, card.expire, card.provider === "click" ? "Click" : "Stripe"].filter(Boolean).join(" · ")}
        </div>
      </div>
      <Button size="sm" variant="danger" icon={Trash2} loading={pending} onClick={() => start(() => removeCard(card.id))}>
        {t("removeCard")}
      </Button>
    </motion.div>
  );
}

function BindCard() {
  const t = useTranslations("billing");
  const [open, setOpen] = useState(false);
  const [card, setCard] = useState("");
  const [expire, setExpire] = useState("");
  const [sms, setSms] = useState("");
  const [token, setToken] = useState<{ token: string; phone: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const close = () => {
    setOpen(false);
    setToken(null);
    setSms("");
    setError(null);
  };
  const send = () =>
    start(async () => {
      setError(null);
      const r = await bindClickCardStart(card, expire);
      if ("error" in r) setError(t("err_card_not_found"));
      else setToken(r);
    });
  const confirm = () =>
    start(async () => {
      setError(null);
      const r = await bindClickCardConfirm(token!.token, sms, expire);
      if ("error" in r) setError(t("err_bad_sms"));
      else close();
    });

  return (
    <>
      <Button size="sm" variant="tinted" icon={Plus} onClick={() => setOpen(true)}>
        {t("bindCard")}
      </Button>
      <Sheet open={open} onClose={close} label={t("bindCard")}>
        <h2 className="text-[20px] font-bold">{t("bindCard")}</h2>
        <div className="mt-5 space-y-3">
          {!token ? (
            <>
              <Field
                label={t("cardNumber")}
                inputMode="numeric"
                placeholder="8600 0000 0000 0001"
                value={card}
                onChange={(e) => setCard(e.target.value.replace(/\D/g, "").slice(0, 16).replace(/(\d{4})(?=\d)/g, "$1 "))}
              />
              <Field label={t("expire")} inputMode="numeric" placeholder="12/29" value={expire} onChange={(e) => setExpire(e.target.value.slice(0, 5))} />
              <Button className="w-full" loading={pending} onClick={send}>
                {t("sendCode")}
              </Button>
            </>
          ) : (
            <>
              <p className="text-[14px] text-label-2">{t("smsSent", { phone: token.phone })}</p>
              <Field label={t("smsCode")} inputMode="numeric" placeholder="666666" value={sms} onChange={(e) => setSms(e.target.value.replace(/\D/g, "").slice(0, 6))} autoFocus />
              <Button className="w-full" loading={pending} disabled={sms.length < 4} onClick={confirm}>
                {t("confirm")}
              </Button>
            </>
          )}
          {error && <p className="text-[14px] text-danger">{error}</p>}
          <p className="text-[12.5px] text-label-3">{t("emuHint")}</p>
        </div>
      </Sheet>
    </>
  );
}

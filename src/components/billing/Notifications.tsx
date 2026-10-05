"use client";

import { useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useFormatter, useNow, useTranslations } from "next-intl";
import { AlertTriangle, Bell, CircleCheck, Clock, Crown, RefreshCw, X } from "lucide-react";
import { Sheet } from "@/components/ui/primitives";
import { ButtonLink } from "@/components/ui/Button";
import { markNotificationsRead } from "@/app/actions/billing";
import { bodyKey, notifyValues, type NotifyType } from "@/lib/billing/notify-format";
import { cn } from "@/lib/cn";

export type ShellNotification = { id: string; type: string; params: string; createdAt: string; read: boolean };

const ICON: Record<string, { icon: typeof Bell; tone: string }> = {
  sub_expiring: { icon: Clock, tone: "bg-gold-soft text-gold" },
  sub_expired: { icon: Crown, tone: "bg-fill text-label-2" },
  payment_ok: { icon: CircleCheck, tone: "bg-success-soft text-success" },
  renewed: { icon: RefreshCw, tone: "bg-success-soft text-success" },
  payment_failed: { icon: AlertTriangle, tone: "bg-danger-soft text-danger" },
};

export function NotificationBell({ items, className }: { items: ShellNotification[]; className?: string }) {
  const t = useTranslations("notify");
  const f = useFormatter();
  const now = useNow({ updateInterval: 60_000 });
  const [open, setOpen] = useState(false);
  const [, start] = useTransition();
  const unread = items.filter((n) => !n.read).length;

  const show = () => {
    setOpen(true);
    if (unread) start(() => markNotificationsRead());
  };

  return (
    <>
      <button
        onClick={show}
        aria-label={t("bell")}
        title={t("bell")}
        className={cn("relative grid size-9 place-items-center rounded-full text-label-2 transition-colors hover:bg-fill hover:text-label", className)}
      >
        <motion.span animate={unread ? { rotate: [0, -14, 12, -8, 0] } : {}} transition={{ duration: 0.7, repeat: unread ? Infinity : 0, repeatDelay: 4 }} className="inline-flex">
          <Bell className="size-[19px]" />
        </motion.span>
        <AnimatePresence>
          {unread > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute right-0.5 top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-danger px-1 text-[10px] font-bold text-white"
            >
              {unread}
            </motion.span>
          )}
        </AnimatePresence>
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} label={t("bell")}>
        <h2 className="text-[20px] font-bold">{t("bell")}</h2>
        <div className="-mx-2 mt-4 max-h-[60vh] space-y-1 overflow-y-auto">
          {items.length === 0 && <p className="px-2 py-6 text-center text-[14px] text-label-3">{t("empty")}</p>}
          {items.map((n) => {
            const meta = ICON[n.type] ?? { icon: Bell, tone: "bg-fill text-label-2" };
            const Icon = meta.icon;
            return (
              <div key={n.id} className={cn("flex gap-3 rounded-[14px] p-2.5", !n.read && "bg-accent-soft/50")}>
                <span className={cn("grid size-9 shrink-0 place-items-center rounded-[11px]", meta.tone)}>
                  <Icon className="size-[18px]" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[14.5px] font-semibold">{t(`${n.type as NotifyType}.title`)}</div>
                  <p className="text-[13.5px] leading-snug text-label-2">{t(`${n.type as NotifyType}.${bodyKey(n.type as NotifyType, n.params)}`, notifyValues(n.params))}</p>
                  <div className="mt-1 text-[12px] text-label-3">{f.relativeTime(new Date(n.createdAt), now)}</div>
                </div>
              </div>
            );
          })}
        </div>
      </Sheet>
    </>
  );
}

export type BillingAlert = { kind: "expiring" | "past_due"; end: string };

/** A slim banner on top of every app page while Pro is about to end or a renewal failed. */
export function BillingBanner({ alert }: { alert: BillingAlert }) {
  const t = useTranslations("billing");
  const tn = useTranslations("notify");
  const [hidden, setHidden] = useState(false);
  const end = new Date(alert.end);
  if (hidden) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "mb-5 flex items-center gap-3 rounded-[16px] p-3.5 text-[14px]",
        alert.kind === "past_due" ? "bg-danger-soft text-danger" : "bg-gold-soft text-gold",
      )}
    >
      {alert.kind === "past_due" ? <AlertTriangle className="size-5 shrink-0" /> : <Clock className="size-5 shrink-0" />}
      <span className="flex-1 font-medium">
        {alert.kind === "past_due" ? t("pastDue", { date: end }) : tn("sub_expiring.body", { until: end })}
      </span>
      <ButtonLink href={alert.kind === "past_due" ? "/app/billing" : "/app/upgrade"} size="sm" variant="secondary">
        {t("bannerRenew")}
      </ButtonLink>
      <button onClick={() => setHidden(true)} aria-label="Close" className="grid size-7 place-items-center rounded-full hover:bg-black/5">
        <X className="size-4" />
      </button>
    </motion.div>
  );
}

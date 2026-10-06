"use client";

import { useState, useTransition } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useFormatter, useNow, useTranslations } from "next-intl";
import { AlertTriangle, Bell, CircleCheck, Clock, Crown, RefreshCw, X, type LucideIcon } from "lucide-react";
import { Sheet } from "@/components/ui/primitives";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/decor/EmptyState";
import { markNotificationsRead } from "@/app/actions/billing";
import { bodyKey, notifyValues, type NotifyType } from "@/lib/billing/notify-format";
import { cn } from "@/lib/cn";

export type ShellNotification = { id: string; type: string; params: string; createdAt: string; read: boolean };

const ICON: Record<string, { icon: LucideIcon; tone: string }> = {
  sub_expiring: { icon: Clock, tone: "bg-gold-soft text-gold" },
  sub_expired: { icon: Crown, tone: "bg-fill text-label-2" },
  payment_ok: { icon: CircleCheck, tone: "bg-success-soft text-success" },
  renewed: { icon: RefreshCw, tone: "bg-teal-soft text-teal" },
  payment_failed: { icon: AlertTriangle, tone: "bg-danger-soft text-danger" },
};

/** Bell with an unread badge; the list opens in a sheet and is marked read on open. */
export function NotificationBell({ items, className }: { items: ShellNotification[]; className?: string }) {
  const t = useTranslations("notify");
  const f = useFormatter();
  // A shared "now" keeps relative times identical on the server and the client.
  const now = useNow({ updateInterval: 60_000 });
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState(false);
  const [, start] = useTransition();
  const unread = seen ? 0 : items.filter((n) => !n.read).length;

  const show = () => {
    setOpen(true);
    if (unread) {
      setSeen(true);
      start(() => markNotificationsRead());
    }
  };

  return (
    <>
      <button
        onClick={show}
        aria-label={unread ? `${t("bell")} (${unread})` : t("bell")}
        title={t("bell")}
        className={cn("relative grid size-9 shrink-0 place-items-center rounded-full text-label-2 transition-colors hover:bg-fill hover:text-label", className)}
      >
        <motion.span
          animate={unread && !reduce ? { rotate: [0, -14, 12, -8, 0] } : {}}
          transition={{ duration: 0.7, repeat: unread && !reduce ? Infinity : 0, repeatDelay: 4 }}
          className="inline-flex origin-top"
        >
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
        <h2 className="font-lesson text-[22px] font-semibold">{t("bell")}</h2>
        <div className="-mx-2 mt-4 max-h-[60vh] space-y-1 overflow-y-auto">
          {items.length === 0 && <EmptyState icon={<Bell className="size-6" />} text={t("empty")} className="py-6" />}
          {items.map((n, i) => {
            const meta = ICON[n.type] ?? { icon: Bell, tone: "bg-fill text-label-2" };
            const type = n.type as NotifyType;
            const values = notifyValues(n.params);
            return (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0, transition: { delay: Math.min(i, 8) * 0.03 } }}
                className={cn("flex gap-3 rounded-[14px] p-2.5", !n.read && "bg-accent-soft/50")}
              >
                <span className={cn("grid size-9 shrink-0 place-items-center rounded-[11px]", meta.tone)}>
                  <meta.icon className="size-[18px]" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[14.5px] font-semibold">{t(`${type}.title`, values)}</div>
                  <p className="text-[13.5px] leading-snug text-label-2">{t(`${type}.${bodyKey(type, n.params)}`, values)}</p>
                  <div className="mt-1 text-[12px] text-label-3">{f.relativeTime(new Date(n.createdAt), now)}</div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </Sheet>
    </>
  );
}

export type BillingAlert = { kind: "expiring" | "past_due"; tier: string; date: string };

/** "Today" banner while a renewal failed or a plan without auto-renewal is about to end. */
export function BillingBanner({ alert }: { alert: BillingAlert }) {
  const t = useTranslations("dashboard");
  const [hidden, setHidden] = useState(false);
  const values = { tier: alert.tier, date: new Date(alert.date) };
  const past = alert.kind === "past_due";
  return (
    <AnimatePresence initial={false}>
      {!hidden && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, height: 0, marginTop: 0 }}
          role="status"
          className={cn("flex items-center gap-3 rounded-[16px] p-3.5 text-[14px]", past ? "bg-danger-soft text-danger" : "bg-gold-soft text-gold")}
        >
          {past ? <AlertTriangle className="size-5 shrink-0" /> : <Clock className="size-5 shrink-0" />}
          <span className="min-w-0 flex-1 font-medium leading-snug">{past ? t("bannerPastDue", values) : t("bannerExpiring", values)}</span>
          <ButtonLink href="/app/billing" size="sm" variant="secondary">
            {t("bannerAction")}
          </ButtonLink>
          <button onClick={() => setHidden(true)} aria-label={t("bannerClose")} className="grid size-7 shrink-0 place-items-center rounded-full hover:bg-black/5">
            <X className="size-4" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

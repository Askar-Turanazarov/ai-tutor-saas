"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { CircleCheck, CircleX, Hourglass, Undo2 } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { invoiceStatus } from "@/app/actions/billing";
import { useRouter } from "@/i18n/navigation";
import { celebrate } from "@/lib/celebrate";
import { cn } from "@/lib/cn";

type State = { kind: "wait" | "slow" } | { kind: "ok"; until: string } | { kind: "fail"; error: string | null } | { kind: "canceled" };

/** Waits for the provider's callback/webhook to mark the invoice paid (polling with backoff). */
export function PaymentReturn({ invoiceId, canceled }: { invoiceId: string; canceled: boolean }) {
  const t = useTranslations("billing");
  const router = useRouter();
  const [state, setState] = useState<State>({ kind: "wait" });

  useEffect(() => {
    let stop = false;
    let n = 0;
    const tick = async () => {
      const s = await invoiceStatus(invoiceId).catch(() => null);
      if (stop) return;
      if (s?.status === "paid") {
        setState({ kind: "ok", until: s.periodEnd! });
        celebrate();
        router.refresh();
        return;
      }
      if (s && s.status !== "open") return setState({ kind: "fail", error: null });
      if (canceled) return setState(s?.error ? { kind: "fail", error: s.error } : { kind: "canceled" });
      if (s?.error && n > 2) return setState({ kind: "fail", error: s.error });
      if (++n === 10) setState({ kind: "slow" });
      setTimeout(tick, Math.min(1000 + n * 400, 5000));
    };
    tick();
    return () => {
      stop = true;
    };
  }, [invoiceId, canceled, router]);

  const view = {
    wait: { icon: Hourglass, tone: "bg-accent-soft text-accent", title: t("waitTitle"), text: t("waitText") },
    slow: { icon: Hourglass, tone: "bg-gold-soft text-gold", title: t("waitTitle"), text: t("stillWaiting") },
    ok: { icon: CircleCheck, tone: "bg-success-soft text-success", title: t("okTitle"), text: state.kind === "ok" ? t("okText", { date: new Date(state.until) }) : "" },
    fail: { icon: CircleX, tone: "bg-danger-soft text-danger", title: t("failTitle"), text: t("failText") },
    canceled: { icon: Undo2, tone: "bg-fill text-label-2", title: t("canceledTitle"), text: t("canceledText") },
  }[state.kind];
  const Icon = view.icon;

  return (
    <div className="mx-auto flex max-w-md flex-col items-center pt-10 text-center">
      <motion.div
        key={state.kind}
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 16 }}
        className={cn("grid size-20 place-items-center rounded-[24px]", view.tone)}
      >
        <motion.span
          animate={state.kind === "wait" || state.kind === "slow" ? { rotate: [0, 180, 180, 360] } : { rotate: 0 }}
          transition={state.kind === "wait" || state.kind === "slow" ? { duration: 2.4, repeat: Infinity, ease: "easeInOut" } : undefined}
          className="inline-flex"
        >
          <Icon className="size-10" />
        </motion.span>
      </motion.div>
      <h1 className="mt-6 text-[26px] font-bold">{view.title}</h1>
      <p className="mt-2 text-[16px] leading-relaxed text-label-2">{view.text}</p>
      {state.kind === "fail" && state.error && <p className="mt-2 font-mono text-[12px] text-label-3">{state.error}</p>}
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        {(state.kind === "fail" || state.kind === "canceled") && <ButtonLink href="/app/upgrade">{t("tryAgain")}</ButtonLink>}
        <ButtonLink href="/app/billing" variant={state.kind === "ok" ? "primary" : "secondary"}>
          {t("toBilling")}
        </ButtonLink>
      </div>
    </div>
  );
}

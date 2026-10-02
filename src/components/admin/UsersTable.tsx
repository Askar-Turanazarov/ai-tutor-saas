"use client";

import { useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useFormatter, useTranslations } from "next-intl";
import { Crown, LogIn, RotateCcw, Search, Trash2, UserRound } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge, Sheet } from "@/components/ui/primitives";
import { deleteUser, impersonate, resetUserUsage, setUserLevel, setUserPlan } from "@/app/actions/admin";
import { LEVELS } from "@/lib/levels";
import { Avatar } from "@/components/app/AppShell";

type Row = {
  id: string;
  name: string;
  email: string;
  role: string;
  plan: string;
  level: string;
  xp: number;
  seconds: number;
  requested: boolean;
  created: string;
};

export function UsersTable({ users, meId }: { users: Row[]; meId: string }) {
  const [q, setQ] = useState("");
  const t = useTranslations("admin");
  const list = users.filter((u) => `${u.name} ${u.email}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="space-y-4">
      <label className="relative block max-w-sm">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-label-3" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Email / name"
          aria-label="Search"
          className="h-10 w-full rounded-full bg-fill pl-10 pr-4 text-[15px] outline-none transition-shadow focus:shadow-[0_0_0_4px_var(--accent-soft)]"
        />
      </label>
      <motion.ul layout className="grid gap-3">
        <AnimatePresence initial={false}>
          {list.map((u, i) => (
            <motion.li
              key={u.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0, transition: { delay: Math.min(i, 10) * 0.03 } }}
              exit={{ opacity: 0, scale: 0.96 }}
            >
              <UserCard u={u} isMe={u.id === meId} />
            </motion.li>
          ))}
        </AnimatePresence>
      </motion.ul>
      {list.length === 0 && <p className="text-label-3">{t("empty")}</p>}
    </div>
  );
}

function UserCard({ u, isMe }: { u: Row; isMe: boolean }) {
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const f = useFormatter();
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const run = (key: string, fn: () => Promise<unknown>) =>
    start(async () => {
      setBusy(key);
      await fn();
      setBusy(null);
    });
  const pro = u.plan === "PRO";

  return (
    <div className="surface flex flex-col gap-4 rounded-card p-4 md:flex-row md:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Avatar name={u.name} size={42} />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="truncate font-semibold">{u.name}</span>
            {u.role === "ADMIN" && <Badge tone="accent">{tc("admin")}</Badge>}
            <Badge tone={pro ? "gold" : "neutral"}>{pro ? tc("pro") : tc("free")}</Badge>
            {u.requested && !pro && <Badge tone="teal">{t("upgradeRequests")}</Badge>}
          </div>
          <div className="truncate text-[13px] text-label-2">{u.email}</div>
          <div className="mt-0.5 text-[12px] text-label-3">
            {u.xp} XP · {t("usage")}: {Math.round(u.seconds / 60)} {tc("min")} · {f.dateTime(new Date(u.created), { dateStyle: "medium" })}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={u.level}
          aria-label={t("level")}
          disabled={pending}
          onChange={(e) => run("level", () => setUserLevel(u.id, e.target.value))}
          className="h-9 rounded-[10px] bg-fill px-2.5 text-[14px] font-medium outline-none"
        >
          {LEVELS.map((l) => (
            <option key={l}>{l}</option>
          ))}
        </select>
        <Button
          size="sm"
          variant={pro ? "secondary" : "tinted"}
          icon={pro ? UserRound : Crown}
          loading={busy === "plan"}
          onClick={() => run("plan", () => setUserPlan(u.id, pro ? "FREE" : "PRO"))}
        >
          {pro ? t("makeFree") : t("makePro")}
        </Button>
        <Button size="sm" variant="secondary" icon={RotateCcw} iconAnim="spin" loading={busy === "usage"} onClick={() => run("usage", () => resetUserUsage(u.id))}>
          {t("resetUsage")}
        </Button>
        {!isMe && (
          <>
            <Button size="sm" variant="secondary" icon={LogIn} iconAnim="nudge" loading={busy === "imp"} onClick={() => run("imp", () => impersonate(u.id))}>
              {t("loginAs")}
            </Button>
            <Button size="sm" variant="danger" icon={Trash2} iconAnim="wiggle" aria-label={t("delete")} onClick={() => setConfirm(true)} />
          </>
        )}
      </div>

      <Sheet open={confirm} onClose={() => setConfirm(false)} label={t("delete")}>
        <h2 className="pr-8 text-[20px] font-bold">
          {t("delete")}: {u.name}?
        </h2>
        <p className="mt-2 text-[14px] text-label-2">{u.email}</p>
        <div className="mt-6 flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={() => setConfirm(false)}>
            {tc("cancel")}
          </Button>
          <Button
            variant="danger"
            className="flex-1"
            loading={busy === "del"}
            onClick={() =>
              run("del", async () => {
                await deleteUser(u.id);
                setConfirm(false);
              })
            }
          >
            {t("delete")}
          </Button>
        </div>
      </Sheet>
    </div>
  );
}

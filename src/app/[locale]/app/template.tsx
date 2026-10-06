"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { ease } from "@/components/ui/motion";

/** Focus screens (lesson, exercises, review) open with their own entrance, so they skip the page transition. */
const FOCUS = /\/app\/(learn\/[^/]+|quiz\/[^/]+|vocab\/review|mistakes\/train|chat)(\/|$)/;

/** Short fade and lift between app screens; fade only with reduced motion. */
export default function Template({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "";
  const reduce = useReducedMotion();
  if (FOCUS.test(pathname)) return <>{children}</>;
  return (
    <motion.div initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, ease }}>
      {children}
    </motion.div>
  );
}

"use client";

import type { ReactNode } from "react";
import { ThemeProvider } from "next-themes";
import { MotionConfig } from "framer-motion";
import { ToastRegion } from "./ui/overlays";
import { Backdrop, LiquidGlassFilter } from "./decor/Backdrop";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <MotionConfig reducedMotion="user">
        <LiquidGlassFilter />
        <Backdrop />
        {children}
        <ToastRegion />
      </MotionConfig>
    </ThemeProvider>
  );
}

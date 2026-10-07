"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function PrintButton({ label }: { label: string }) {
  return (
    <Button variant="secondary" size="sm" icon={Printer} onClick={() => window.print()} className="shrink-0 self-start print:hidden sm:self-auto">
      {label}
    </Button>
  );
}

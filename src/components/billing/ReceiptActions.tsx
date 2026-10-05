"use client";

import { ArrowLeft, Printer } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/Button";

export function ReceiptActions({ back, print }: { back: string; print: string }) {
  return (
    <div className="flex items-center justify-between print:hidden">
      <ButtonLink href="/app/billing" variant="ghost" size="sm" icon={ArrowLeft}>
        {back}
      </ButtonLink>
      <Button size="sm" variant="secondary" icon={Printer} onClick={() => window.print()}>
        {print}
      </Button>
    </div>
  );
}

import type { ReactNode } from "react";
import { SiteFooter } from "@/components/shell/SiteFooter";

/** Payment gateway pages (card and Click emulators) are full-screen; the site footer sits below them. */
export default function PayLayout({ children }: { children: ReactNode }) {
  return (
    <div className="bg-bg">
      {children}
      <SiteFooter className="px-4" />
    </div>
  );
}

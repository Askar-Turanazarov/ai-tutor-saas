import { redirect } from "@/i18n/navigation";

/** Old address of the plans page. */
export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  return redirect({ href: "/app/plans", locale: (await params).locale });
}

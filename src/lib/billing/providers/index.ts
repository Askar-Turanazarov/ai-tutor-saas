import { getAllSettings } from "../../settings";
import type { PaymentProvider, ProviderId } from "./types";
import { cardMock } from "./card-mock";
import { click } from "./click";
import { stripeProvider } from "./stripe";

export const PAYMENT_PROVIDERS: PaymentProvider[] = [cardMock, click, stripeProvider];

export function getProvider(id: string): PaymentProvider | undefined {
  return PAYMENT_PROVIDERS.find((p) => p.id === id);
}

/** Providers with keys in place and switched on in the admin settings. */
export async function enabledProviders() {
  const s = await getAllSettings();
  return PAYMENT_PROVIDERS.filter((p) => p.enabled() && s[`billing.${p.id}Enabled`] !== "false");
}

export type { PaymentProvider, ProviderId };

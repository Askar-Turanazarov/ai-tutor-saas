import type { PaymentProvider, ProviderId } from "./types";
import { cardMock } from "./card-mock";
import { click } from "./click";

export const PAYMENT_PROVIDERS: PaymentProvider[] = [cardMock, click];

export function getProvider(id: string): PaymentProvider | undefined {
  return PAYMENT_PROVIDERS.find((p) => p.id === id);
}

export function enabledProviders() {
  return PAYMENT_PROVIDERS.filter((p) => p.enabled());
}

export type { PaymentProvider, ProviderId };

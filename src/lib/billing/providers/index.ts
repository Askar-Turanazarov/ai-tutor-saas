import type { PaymentProvider, ProviderId } from "./types";

export const PAYMENT_PROVIDERS: PaymentProvider[] = [];

export function getProvider(id: string): PaymentProvider | undefined {
  return PAYMENT_PROVIDERS.find((p) => p.id === id);
}

export function enabledProviders() {
  return PAYMENT_PROVIDERS.filter((p) => p.enabled());
}

export type { PaymentProvider, ProviderId };

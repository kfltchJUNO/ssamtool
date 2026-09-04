// src/lib/payments/index.ts
import { createLemonSqueezyCheckout } from "./lemonsqueezy";
import { CheckoutSessionRequest, CheckoutSessionResponse, ChalkPackage } from "./types";

export const CHALK_PACKAGES: ChalkPackage[] = [
  {
    id: "chalk_starter",
    name: "분필 Starter (10개)",
    chalkAmount: 10,
    priceUsd: 2.99,
    variantId: process.env.LEMONSQUEEZY_VARIANT_CHALK_STARTER || "starter_variant_id",
  },
  {
    id: "chalk_standard",
    name: "분필 Standard (30개)",
    chalkAmount: 30,
    priceUsd: 7.99,
    variantId: process.env.LEMONSQUEEZY_VARIANT_CHALK_STANDARD || "standard_variant_id",
  },
  {
    id: "chalk_pro",
    name: "분필 Pro (100개)",
    chalkAmount: 100,
    priceUsd: 19.99,
    variantId: process.env.LEMONSQUEEZY_VARIANT_CHALK_PRO || "pro_variant_id",
  },
];

export async function createCheckout(
  req: CheckoutSessionRequest
): Promise<CheckoutSessionResponse> {
  return createLemonSqueezyCheckout(req);
}

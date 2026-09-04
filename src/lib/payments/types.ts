// src/lib/payments/types.ts
export type PaymentProvider = "lemonsqueezy";

export interface ChalkPackage {
  id: string;
  name: string;
  chalkAmount: number;
  priceUsd: number;
  variantId: string;
}

export interface CheckoutSessionRequest {
  uid: string;
  email: string;
  productId: string;
  variantId: string;
  redirectUrl?: string;
}

export interface CheckoutSessionResponse {
  checkoutUrl: string;
}

export interface PaymentEvent {
  eventId: string;
  uid: string;
  type: "chalk_pack" | "subscription";
  amount: number;
  currency: string;
  chalkGranted: number;
  orderId: string;
  customerId: string;
  status: string;
  createdAt: unknown;
}

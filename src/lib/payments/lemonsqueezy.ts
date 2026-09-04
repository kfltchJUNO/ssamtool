// src/lib/payments/lemonsqueezy.ts
import crypto from "crypto";
import { CheckoutSessionRequest, CheckoutSessionResponse } from "./types";

const LS_API_KEY = process.env.LEMONSQUEEZY_API_KEY || "";
const LS_STORE_ID = process.env.LEMONSQUEEZY_STORE_ID || "";
const LS_WEBHOOK_SECRET = process.env.LEMONSQUEEZY_WEBHOOK_SECRET || "";

export async function createLemonSqueezyCheckout(
  req: CheckoutSessionRequest
): Promise<CheckoutSessionResponse> {
  if (!LS_API_KEY || !LS_STORE_ID) {
    throw new Error("LEMONSQUEEZY_CONFIG_MISSING");
  }

  const response = await fetch("https://api.lemonsqueezy.com/v1/checkouts", {
    method: "POST",
    headers: {
      "Accept": "application/vnd.api+json",
      "Content-Type": "application/vnd.api+json",
      "Authorization": `Bearer ${LS_API_KEY}`,
    },
    body: JSON.stringify({
      data: {
        type: "checkouts",
        attributes: {
          checkout_data: {
            email: req.email,
            custom: {
              uid: req.uid,
            },
          },
        },
        relationships: {
          store: {
            data: {
              type: "stores",
              id: LS_STORE_ID,
            },
          },
          variant: {
            data: {
              type: "variants",
              id: req.variantId,
            },
          },
        },
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[LemonSqueezy API Error]:", errorText);
    throw new Error("FAILED_TO_CREATE_CHECKOUT");
  }

  const data = await response.json();
  const checkoutUrl = data.data.attributes.url;
  return { checkoutUrl };
}

export function verifyLemonSqueezySignature(
  rawBody: string,
  signatureHeader: string
): boolean {
  if (!LS_WEBHOOK_SECRET) return false;
  const hmac = crypto.createHmac("sha256", LS_WEBHOOK_SECRET);
  const digest = Buffer.from(hmac.update(rawBody).digest("hex"), "utf8");
  const signature = Buffer.from(signatureHeader, "utf8");

  if (digest.length !== signature.length) return false;
  return crypto.timingSafeEqual(digest, signature);
}

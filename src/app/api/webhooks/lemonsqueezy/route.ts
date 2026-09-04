// src/app/api/webhooks/lemonsqueezy/route.ts
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue, Transaction } from "firebase-admin/firestore";
import { verifyLemonSqueezySignature } from "@/lib/payments/lemonsqueezy";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-signature") || "";

    // 1) 서명 검증
    const isValid = verifyLemonSqueezySignature(rawBody, signature);
    if (!isValid) {
      console.warn("[LemonSqueezy Webhook] Invalid signature");
      return NextResponse.json({ error: "UNAUTHORIZED_SIGNATURE" }, { status: 401 });
    }

    const payload = JSON.parse(rawBody);
    const eventName = payload.meta?.event_name;
    const eventId = payload.meta?.custom_data?.eventId || payload.data?.id;
    const uid = payload.meta?.custom_data?.uid;

    if (!uid) {
      console.warn("[LemonSqueezy Webhook] Missing custom.uid");
      return NextResponse.json({ error: "MISSING_USER_UID" }, { status: 400 });
    }

    // 2) 멱등성 검증 & 분필 지급 트랜잭션 (order_created, subscription_payment_success)
    if (eventName === "order_created" || eventName === "subscription_payment_success") {
      const paymentRef = adminDb.collection("payments").doc(eventId);
      const userRef = adminDb.collection("users").doc(uid);

      const variantId = payload.data?.attributes?.first_order_item?.variant_id?.toString();
      const amountPaid = payload.data?.attributes?.total ?? 0;

      // Variant에 따른 지급 분필 계산
      let grantedChalk = 10;
      if (variantId === process.env.LEMONSQUEEZY_VARIANT_CHALK_STANDARD) grantedChalk = 30;
      if (variantId === process.env.LEMONSQUEEZY_VARIANT_CHALK_PRO) grantedChalk = 100;

      const processed = await adminDb.runTransaction(async (tx: Transaction) => {
        const pSnap = await tx.get(paymentRef);
        if (pSnap.exists) {
          return false; // 이미 처리된 웹훅
        }

        tx.set(paymentRef, {
          uid,
          eventId,
          eventName,
          amountPaid,
          chalkGranted: grantedChalk,
          status: "completed",
          createdAt: FieldValue.serverTimestamp(),
        });

        tx.update(userRef, {
          chalk: FieldValue.increment(grantedChalk),
        });

        const logRef = adminDb.collection("chalkLogs").doc();
        tx.set(logRef, {
          uid,
          amount: grantedChalk,
          reason: `결제 충전 (Order ID: ${payload.data?.id})`,
          createdAt: FieldValue.serverTimestamp(),
        });

        return true;
      });

      console.log(`[LemonSqueezy Webhook] Event ${eventId} processed: ${processed}`);
    }

    return NextResponse.json({ received: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Webhook processing failed";
    console.error("[LemonSqueezy Webhook Exception]:", msg);
    return NextResponse.json({ error: "INTERNAL_WEBHOOK_ERROR" }, { status: 500 });
  }
}

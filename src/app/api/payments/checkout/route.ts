// src/app/api/payments/checkout/route.ts
import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";
import { createCheckout, CHALK_PACKAGES } from "@/lib/payments";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
    }
    const decoded = await adminAuth.verifyIdToken(token);
    const { packageId } = await req.json();

    const pkg = CHALK_PACKAGES.find(p => p.id === packageId);
    if (!pkg) {
      return NextResponse.json({ error: "INVALID_PACKAGE_ID" }, { status: 400 });
    }

    const { checkoutUrl } = await createCheckout({
      uid: decoded.uid,
      email: decoded.email || "",
      productId: pkg.id,
      variantId: pkg.variantId,
    });

    return NextResponse.json({ checkoutUrl });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "알 수 없는 오류";
    console.error("[payments/checkout] error:", msg);
    return NextResponse.json({ error: "CHECKOUT_CREATION_FAILED", message: msg }, { status: 500 });
  }
}

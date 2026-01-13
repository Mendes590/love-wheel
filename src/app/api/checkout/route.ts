import { NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

const stripeSecret = process.env.STRIPE_SECRET_KEY;
const baseUrl = process.env.APP_BASE_URL;

if (!stripeSecret) {
  throw new Error("STRIPE_SECRET_KEY is not configured");
}
if (!baseUrl) {
  throw new Error("APP_BASE_URL is not configured");
}

const stripe = new Stripe(stripeSecret);

export async function POST(req: Request) {
  try {
    const ct = req.headers.get("content-type") || "";
    if (!ct.includes("application/json")) {
      return NextResponse.json(
        { error: 'Invalid content-type. Use "application/json".' },
        { status: 415 }
      );
    }

    const body = await req.json().catch(() => null);
    const giftId = body?.giftId as string | undefined;

    if (!giftId || typeof giftId !== "string" || !giftId.trim()) {
      return NextResponse.json({ error: "Missing giftId" }, { status: 400 });
    }

    // (Opcional mas recomendado) checar se gift existe
    const { data: gift, error } = await supabaseAdmin
      .from("gifts")
      .select("id, slug, status")
      .eq("id", giftId)
      .single();

    if (error || !gift) {
      return NextResponse.json({ error: "Gift not found" }, { status: 404 });
    }

    if (gift.status === "paid") {
      // Se já tá pago, pode mandar direto pro /g/:slug
      return NextResponse.json({ url: `${baseUrl}/g/${gift.slug}` });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: 499, // $4.99 (exemplo)
            product_data: {
              name: "Premium Reveal",
              description: "Unlock the wheel + reveal experience.",
            },
          },
        },
      ],
      metadata: { giftId },
      success_url: `${baseUrl}/success?slug=${gift.slug}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/g/${gift.slug}`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error("Checkout error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Checkout failed" },
      { status: 400 }
    );
  }
}

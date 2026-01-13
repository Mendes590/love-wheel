import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase-admin";
import Stripe from "stripe";

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error("Webhook signature error:", err?.message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      const giftId = session.metadata?.giftId;
      const paymentIntentId =
        typeof session.payment_intent === "string" ? session.payment_intent : null;

      if (giftId) {
        const { error } = await supabaseAdmin
          .from("gifts")
          .update({
            status: "paid",
            paid_at: new Date().toISOString(),
            stripe_payment_intent_id: paymentIntentId,
          })
          .eq("id", giftId);

        if (error) console.error("DB update error:", error);
      }
    }

    return NextResponse.json({ received: true });
  } catch (e) {
    console.error("Webhook handler error:", e);
    return NextResponse.json({ error: "Webhook failed" }, { status: 500 });
  }
}

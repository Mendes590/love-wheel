import { NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

const stripeSecret = process.env.STRIPE_SECRET_KEY;
if (!stripeSecret) throw new Error("STRIPE_SECRET_KEY is missing");

const stripe = new Stripe(stripeSecret);

type Ctx = { params: Promise<{ slug: string }> | { slug: string } };

export async function GET(req: Request, ctx: Ctx) {
  try {
    const { slug } = await ctx.params; // ✅ fix do Next 16

    const url = new URL(req.url);
    const sessionId = url.searchParams.get("session_id");

    if (!slug) {
      return NextResponse.json({ error: "Missing slug" }, { status: 400 });
    }
    if (!sessionId) {
      return NextResponse.json({ error: "Missing session_id" }, { status: 400 });
    }

    // 1) valida session no Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    // Garanta que só confirma quando estiver pago
    const paid =
      session.payment_status === "paid" ||
      (session.status === "complete" && session.payment_status !== "unpaid");

    if (!paid) {
      return NextResponse.json(
        { ok: false, status: "pending" },
        { status: 202 }
      );
    }

    // 2) pega gift pelo slug e marca como paid
    const { data: gift, error: giftErr } = await supabaseAdmin
      .from("gifts")
      .select("id, slug, status")
      .eq("slug", slug)
      .single();

    if (giftErr || !gift) {
      return NextResponse.json({ error: "Gift not found" }, { status: 404 });
    }

    if (gift.status !== "paid") {
      const { error: updErr } = await supabaseAdmin
        .from("gifts")
        .update({ status: "paid" })
        .eq("id", gift.id);

      if (updErr) {
        console.error("Resolve update error:", updErr);
        return NextResponse.json({ error: "Failed to update gift" }, { status: 500 });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("Resolve route error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Resolve failed" },
      { status: 400 }
    );
  }
}

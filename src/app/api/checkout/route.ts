import { NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

const stripeSecret = process.env.STRIPE_SECRET_KEY;
const baseUrlRaw = process.env.APP_BASE_URL;

if (!stripeSecret) {
  throw new Error("STRIPE_SECRET_KEY is not configured");
}
if (!baseUrlRaw) {
  throw new Error("APP_BASE_URL is not configured");
}

// Normaliza e valida APP_BASE_URL (evita bug com barra no final / sem https)
function normalizeBaseUrl(input: string) {
  const trimmed = input.trim().replace(/\/+$/, "");
  // se o cara colocou sem https, tenta corrigir
  const withProto =
    trimmed.startsWith("http://") || trimmed.startsWith("https://")
      ? trimmed
      : `https://${trimmed}`;

  try {
    const u = new URL(withProto);
    return u.origin; // garante sem path e sem trailing slash
  } catch {
    throw new Error(`APP_BASE_URL is invalid: "${input}"`);
  }
}

const baseUrl = normalizeBaseUrl(baseUrlRaw);

const stripe = new Stripe(stripeSecret, {
  apiVersion: "2024-06-20", // pode remover se preferir, mas é bom fixar
});

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

    // Checa se o gift existe
    const { data: gift, error } = await supabaseAdmin
      .from("gifts")
      .select("id, slug, status")
      .eq("id", giftId)
      .single();

    if (error || !gift) {
      return NextResponse.json({ error: "Gift not found" }, { status: 404 });
    }

    // Se já tá pago, manda direto pro gift
    if (gift.status === "paid") {
      return NextResponse.json({ url: `${baseUrl}/g/${gift.slug}` });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      // payment_method_types é opcional hoje em dia, mas ok manter:
      payment_method_types: ["card"],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: 499, // $4.99
            product_data: {
              name: "Premium Reveal",
              description: "Unlock the wheel + reveal experience.",
            },
          },
        },
      ],

      // IMPORTANTÍSSIMO pro webhook marcar pago:
      metadata: { giftId },

      // ✅ SEM /success (evita 404)
      // Você volta pro gift e passa session_id pra você mostrar "Confirming payment..."
      success_url: `${baseUrl}/g/${gift.slug}?session_id={CHECKOUT_SESSION_ID}`,
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

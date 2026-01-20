import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import type { NextRequest } from "next/server";

type Gift = {
  id: string;
  slug: string;
  status: string;
  paid_at: string | null;
  created_at: string | null;

  couple_photo_url: string | null;
  love_letter: string | null;
  relationship_start_at: string | null;
  red_phrase: string | null;

  stripe_session_id: string | null;
  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;

  amount_cents: number | null;
  currency: string | null;

  // ⚠️ Só inclua se EXISTIR na sua tabela
  // couple_names: string | null;
  // created_by_name: string | null;
};

function mustEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

const supabaseAdmin = createClient(
  mustEnv("SUPABASE_URL"),
  mustEnv("SUPABASE_SERVICE_ROLE_KEY"),
  {
    auth: { autoRefreshToken: false, persistSession: false },
  }
);

const stripe = new Stripe(mustEnv("STRIPE_SECRET_KEY"), {
  apiVersion: "2023-10-16",
});

function isoNow() {
  return new Date().toISOString();
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params;

    const { data: gift, error } = await supabaseAdmin
      .from("gifts")
      .select(
        `
        id,
        slug,
        status,
        paid_at,
        created_at,
        couple_photo_url,
        love_letter,
        relationship_start_at,
        red_phrase,
        stripe_session_id,
        stripe_checkout_session_id,
        stripe_payment_intent_id,
        amount_cents,
        currency
      `
      )
      .eq("slug", slug)
      .maybeSingle<Gift>(); // ✅ evita "Cannot coerce ... single JSON object"

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!gift) {
      return NextResponse.json({ error: "Gift não encontrado" }, { status: 404 });
    }

    // ✅ já pago -> devolve tudo
    if (gift.status === "paid" || gift.paid_at) {
      return NextResponse.json(gift);
    }

    // ✅ payment_intent no banco -> marca pago
    if (gift.stripe_payment_intent_id?.startsWith("pi_")) {
      const ts = isoNow();
      await supabaseAdmin
        .from("gifts")
        .update({ status: "paid", paid_at: ts })
        .eq("id", gift.id);

      return NextResponse.json({ ...gift, status: "paid", paid_at: ts });
    }

    // ✅ checar sessão no Stripe (URL > banco)
    const url = new URL(request.url);
    const sessionIdFromUrl = url.searchParams.get("session_id");

    const stripeSessionId =
      (sessionIdFromUrl?.startsWith("cs_") ? sessionIdFromUrl : null) ||
      gift.stripe_session_id ||
      gift.stripe_checkout_session_id;

    if (stripeSessionId?.startsWith("cs_")) {
      try {
        const session = await stripe.checkout.sessions.retrieve(stripeSessionId);

        if (session.payment_status === "paid" && session.status === "complete") {
          const ts = isoNow();
          await supabaseAdmin
            .from("gifts")
            .update({
              status: "paid",
              paid_at: ts,
              stripe_session_id: stripeSessionId,
              stripe_checkout_session_id: stripeSessionId,
              stripe_payment_intent_id: session.payment_intent as string,
            })
            .eq("id", gift.id);

          return NextResponse.json({
            ...gift,
            status: "paid",
            paid_at: ts,
            stripe_session_id: stripeSessionId,
            stripe_checkout_session_id: stripeSessionId,
            stripe_payment_intent_id: session.payment_intent as string,
          });
        }
      } catch {
        // cai no 402 abaixo
      }
    }

    // ❌ não pago
    return NextResponse.json(
      {
        error: "Pagamento necessário",
        id: gift.id,
        slug: gift.slug,
        preview: {
          red_phrase: gift.red_phrase,
          relationship_start_at: gift.relationship_start_at,
        },
        needs_payment: true,
      },
      { status: 402 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: `Erro interno: ${err?.message ?? "unknown"}` },
      { status: 500 }
    );
  }
}

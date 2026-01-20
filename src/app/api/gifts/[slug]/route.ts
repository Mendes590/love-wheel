import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

type GiftAny = Record<string, any>;

function mustEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

const supabaseAdmin = createClient(
  mustEnv("SUPABASE_URL"),
  mustEnv("SUPABASE_SERVICE_ROLE_KEY"),
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const stripe = new Stripe(mustEnv("STRIPE_SECRET_KEY"), {
  apiVersion: "2023-10-16",
});

function isoNow() {
  return new Date().toISOString();
}

async function loadGiftBySlug(slug: string): Promise<GiftAny | null> {
  const res = await supabaseAdmin.from("gifts").select("*").eq("slug", slug).maybeSingle();
  if (!res.error && res.data) return res.data as GiftAny;

  const msg = res.error?.message ?? "";
  if (msg.includes("Cannot coerce the result to a single JSON object")) {
    const list = await supabaseAdmin
      .from("gifts")
      .select("*")
      .eq("slug", slug)
      .order("created_at", { ascending: false })
      .limit(1);

    if (!list.error && list.data && list.data.length > 0) {
      console.warn("⚠️ Slug duplicado no banco. Usando o mais recente.");
      return list.data[0] as GiftAny;
    }
  }

  if (!res.error && !res.data) return null;

  console.error("Erro ao buscar gift:", res.error?.message || "unknown");
  return null;
}

export async function GET(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params;

    const gift = await loadGiftBySlug(slug);
    if (!gift) {
      return NextResponse.json({ error: "Gift não encontrado" }, { status: 404 });
    }

    if (gift.status === "paid" || gift.paid_at) {
      return NextResponse.json(gift);
    }

    if (typeof gift.stripe_payment_intent_id === "string" && gift.stripe_payment_intent_id.startsWith("pi_")) {
      const ts = isoNow();
      await supabaseAdmin
        .from("gifts")
        .update({ status: "paid", paid_at: ts, updated_at: ts })
        .eq("id", gift.id);

      return NextResponse.json({ ...gift, status: "paid", paid_at: ts });
    }

    const url = new URL(request.url);
    const sessionIdFromUrl = url.searchParams.get("session_id");

    const stripeSessionId =
      (sessionIdFromUrl?.startsWith("cs_") ? sessionIdFromUrl : null) ||
      gift.stripe_session_id ||
      gift.stripe_checkout_session_id;

    if (typeof stripeSessionId === "string" && stripeSessionId.startsWith("cs_")) {
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
              updated_at: ts,
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
        // segue pro 402
      }
    }

    return NextResponse.json(
      {
        error: "Pagamento necessário",
        id: gift.id,
        slug: gift.slug,
        preview: {
          red_phrase: gift.red_phrase ?? null,
          relationship_start_at: gift.relationship_start_at ?? null,
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

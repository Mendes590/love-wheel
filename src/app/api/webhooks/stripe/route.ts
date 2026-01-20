import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function mustEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

// ✅ Stripe (sem apiVersion pra não quebrar tipagem no build)
const stripe = new Stripe(mustEnv("STRIPE_SECRET_KEY"), {
  typescript: true,
});

// ✅ Supabase admin (service role) — SERVER ONLY
const supabaseAdmin = createClient(
  mustEnv("SUPABASE_URL"),
  mustEnv("SUPABASE_SERVICE_ROLE_KEY"),
  {
    auth: { autoRefreshToken: false, persistSession: false },
  }
);

type GiftRow = {
  id: string;
  slug: string | null;
  status: string | null;
  stripe_session_id: string | null;
  stripe_checkout_session_id: string | null;
};

function isoNow() {
  return new Date().toISOString();
}

/**
 * Atualiza gift tentando incluir updated_at,
 * mas se a coluna não existir (PGRST204), re-tenta sem.
 */
async function safeGiftUpdateById(giftId: string, data: Record<string, any>) {
  const { error } = await supabaseAdmin.from("gifts").update(data).eq("id", giftId);

  if (!error) return { ok: true as const };

  // Se updated_at não existe, re-tentar removendo
  const msg = (error as any)?.message ?? "";
  const code = (error as any)?.code ?? "";

  if (
    code === "PGRST204" ||
    msg.includes("updated_at") ||
    msg.includes("Could not find the 'updated_at' column")
  ) {
    const { updated_at, ...withoutUpdatedAt } = data;
    const { error: retryError } = await supabaseAdmin
      .from("gifts")
      .update(withoutUpdatedAt)
      .eq("id", giftId);

    if (!retryError) return { ok: true as const };

    return { ok: false as const, error: retryError };
  }

  return { ok: false as const, error };
}

async function updateGiftStatusPaid(giftId: string, sessionId: string, paymentIntentId?: string) {
  const ts = isoNow();

  const updateData: Record<string, any> = {
    status: "paid",
    paid_at: ts,
    // tenta salvar nas duas
    stripe_session_id: sessionId,
    stripe_checkout_session_id: sessionId,
    updated_at: ts,
  };

  if (paymentIntentId) updateData.stripe_payment_intent_id = paymentIntentId;

  const res = await safeGiftUpdateById(giftId, updateData);
  if (!res.ok) {
    console.error("❌ Erro updateGiftStatusPaid:", res.error);
  } else {
    console.log("✅ Gift atualizado para PAID:", giftId);
  }
}

async function updateGiftBySlug(slug: string, sessionId: string, paymentIntentId?: string) {
  console.log(`🔍 Buscando gift pelo slug: ${slug}`);

  const { data: gift, error } = await supabaseAdmin
    .from("gifts")
    .select("id, slug, status, stripe_session_id, stripe_checkout_session_id")
    .eq("slug", slug)
    .maybeSingle<GiftRow>();

  if (error) {
    console.error("❌ Erro buscando gift pelo slug:", error);
    return;
  }

  if (!gift) {
    console.error("❌ Nenhum gift encontrado pelo slug:", slug);
    return;
  }

  console.log("✅ Gift encontrado pelo slug:", { id: gift.id, status: gift.status });
  await updateGiftStatusPaid(gift.id, sessionId, paymentIntentId);
}

async function updateGiftBySessionId(sessionId: string, paymentIntentId?: string) {
  // Pode existir em stripe_session_id OU stripe_checkout_session_id
  const { data: byStripe, error: e1 } = await supabaseAdmin
    .from("gifts")
    .select("id, slug, status")
    .eq("stripe_session_id", sessionId);

  if (e1) console.error("⚠️ Erro buscando por stripe_session_id:", e1);

  const { data: byCheckout, error: e2 } = await supabaseAdmin
    .from("gifts")
    .select("id, slug, status")
    .eq("stripe_checkout_session_id", sessionId);

  if (e2) console.error("⚠️ Erro buscando por stripe_checkout_session_id:", e2);

  const all = [...(byStripe || []), ...(byCheckout || [])];
  const unique = Array.from(new Map(all.map((g: any) => [g.id, g])).values());

  if (unique.length === 0) {
    console.log("⚠️ Nenhum gift encontrado com essa session_id:", sessionId);
    return;
  }

  console.log(`✅ Encontrados ${unique.length} gifts com a session_id`);
  for (const g of unique) {
    await updateGiftStatusPaid(g.id, sessionId, paymentIntentId);
  }
}

export async function POST(req: Request) {
  console.log("🔔 Webhook do Stripe chamado");

  // ✅ Secret garantida como string (remove string|undefined)
  let webhookSecret: string;
  try {
    webhookSecret = mustEnv("STRIPE_WEBHOOK_SECRET");
  } catch (e: any) {
    console.error("❌ Missing STRIPE_WEBHOOK_SECRET");
    return NextResponse.json({ error: e.message }, { status: 500 });
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    console.error("❌ Missing stripe-signature header");
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const rawBody = await req.text();
  console.log("📦 Payload tamanho:", rawBody.length, "bytes");

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
    console.log("✅ Assinatura verificada. Evento:", event.type, "ID:", event.id);
  } catch (err: any) {
    console.error("❌ Invalid signature:", err?.message ?? err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        const session = event.data.object as Stripe.Checkout.Session;

        const sessionId = session.id;
        const paymentIntentId = (session.payment_intent as string) || undefined;
        const giftId = session.metadata?.giftId;
        const slug = session.metadata?.slug;

        console.log("💰 Checkout pago:", {
          sessionId,
          paymentStatus: session.payment_status,
          status: session.status,
          giftId,
          slug,
          paymentIntentId,
        });

        if (giftId) {
          await updateGiftStatusPaid(giftId, sessionId, paymentIntentId);
          break;
        }

        if (slug) {
          await updateGiftBySlug(slug, sessionId, paymentIntentId);
          break;
        }

        // Fallback: achar pelo sessionId
        await updateGiftBySessionId(sessionId, paymentIntentId);
        break;
      }

      case "payment_intent.succeeded": {
        const pi = event.data.object as Stripe.PaymentIntent;
        console.log("✅ payment_intent.succeeded:", pi.id);

        // achar gifts com esse PI e marcar como paid se necessário
        const { data: gifts, error } = await supabaseAdmin
          .from("gifts")
          .select("id, slug, status, stripe_session_id, stripe_checkout_session_id")
          .eq("stripe_payment_intent_id", pi.id);

        if (error) {
          console.error("❌ Erro buscando gifts por payment_intent_id:", error);
          break;
        }

        if (!gifts || gifts.length === 0) {
          console.log("ℹ️ Nenhum gift com payment_intent_id:", pi.id);
          break;
        }

        for (const g of gifts as any[]) {
          if (g.status !== "paid") {
            // tenta usar sessionId já salvo no banco; se não tiver, salva só status/paid_at
            const sessionId = g.stripe_session_id || g.stripe_checkout_session_id || "";
            if (sessionId) {
              await updateGiftStatusPaid(g.id, sessionId, pi.id);
            } else {
              const ts = isoNow();
              await safeGiftUpdateById(g.id, {
                status: "paid",
                paid_at: ts,
                updated_at: ts,
              });
              console.log("✅ Gift atualizado via PI (sem session_id):", g.id);
            }
          } else {
            console.log("ℹ️ Gift já estava paid:", g.id);
          }
        }

        break;
      }

      default:
        console.log("ℹ️ Evento ignorado:", event.type);
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("💥 Webhook handler error:", err?.message ?? err);
    return NextResponse.json({ error: "Webhook failed", message: err?.message }, { status: 500 });
  }
}

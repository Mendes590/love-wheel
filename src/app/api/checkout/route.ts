import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from '@supabase/supabase-js';

// Conexão DIRETA
const supabaseAdmin = createClient(
  "https://bkmabhybqioyxgpnnetd.supabase.co",
  "sb_secret_95QZWIfzgVKdnXHF3k6pNA_NUCLHDOZ",
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export const runtime = "nodejs";

const stripeSecret = process.env.STRIPE_SECRET_KEY;
const baseUrlRaw = process.env.APP_BASE_URL;

if (!stripeSecret) {
  throw new Error("STRIPE_SECRET_KEY is not configured");
}
if (!baseUrlRaw) {
  throw new Error("APP_BASE_URL is not configured");
}

function normalizeBaseUrl(input: string) {
  const trimmed = input.trim().replace(/\/+$/, "");
  const withProto =
    trimmed.startsWith("http://") || trimmed.startsWith("https://")
      ? trimmed
      : `https://${trimmed}`;

  try {
    const u = new URL(withProto);
    return u.origin;
  } catch {
    throw new Error(`APP_BASE_URL is invalid: "${input}"`);
  }
}

const baseUrl = normalizeBaseUrl(baseUrlRaw);
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

    console.log("🛒 Checkout iniciado para giftId:", giftId);

    // BUSCAR COM OS CAMPOS CORRETOS QUE EXISTEM
    const { data: gift, error: giftError } = await supabaseAdmin
      .from("gifts")
      .select("id, slug, status, stripe_session_id, stripe_checkout_session_id")
      .eq("id", giftId)
      .single();

    if (giftError || !gift) {
      console.error("❌ Gift não encontrado:", giftError);
      return NextResponse.json({ error: "Gift not found" }, { status: 404 });
    }

    console.log("📦 Gift encontrado:", {
      slug: gift.slug,
      status: gift.status,
      stripe_session_id: gift.stripe_session_id,
      stripe_checkout_session_id: gift.stripe_checkout_session_id
    });

    // Se já tá pago, manda direto pro gift
    if (gift.status === "paid") {
      console.log("✅ Gift já pago, redirecionando direto");
      return NextResponse.json({ url: `${baseUrl}/g/${gift.slug}` });
    }

    // Se já tem uma sessão ativa, retornar a mesma URL
    const existingSessionId = gift.stripe_session_id || gift.stripe_checkout_session_id;
    if (existingSessionId && existingSessionId.startsWith('cs_')) {
      console.log("🔄 Usando sessão existente:", existingSessionId.substring(0, 20) + '...');
      try {
        const existingSession = await stripe.checkout.sessions.retrieve(existingSessionId);
        if (existingSession.status === 'open') {
          return NextResponse.json({ url: existingSession.url });
        }
      } catch (e) {
        console.log("⚠️ Sessão expirada, criando nova...");
      }
    }

    // Criar nova sessão no Stripe
    console.log("🆕 Criando nova sessão Stripe...");
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: 490, // $4.90
            product_data: {
              name: "Premium Reveal",
              description: "Unlock the wheel + reveal experience.",
            },
          },
        },
      ],
      metadata: { 
        giftId: gift.id,
        slug: gift.slug,
        type: 'gift_payment'
      },
      success_url: `${baseUrl}/g/${gift.slug}?session_id={CHECKOUT_SESSION_ID}&success=true&paid=1`,
      cancel_url: `${baseUrl}/g/${gift.slug}?canceled=true`,
      expires_at: Math.floor(Date.now() / 1000) + 3600, // 1 hora
    });

    console.log("✅ Sessão Stripe criada:", {
      sessionId: session.id,
      url: session.url?.substring(0, 50) + '...'
    });

    // SALVAR O SESSION_ID NO BANCO - AMBAS AS COLUNAS
    console.log("💾 Salvando session_id no banco...");
    const { error: updateError } = await supabaseAdmin
      .from("gifts")
      .update({
        stripe_session_id: session.id,
        stripe_checkout_session_id: session.id, // Salvar em ambas as colunas
        updated_at: new Date().toISOString()
      })
      .eq("id", giftId);

    if (updateError) {
      console.error("❌ ERRO ao salvar session_id no banco:", updateError);
    } else {
      console.log("✅ Session_id salvo no banco com sucesso!");
    }

    return NextResponse.json({ 
      url: session.url,
      sessionId: session.id,
      giftSlug: gift.slug 
    });

  } catch (err: any) {
    console.error("💥 Checkout error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Checkout failed" },
      { status: 400 }
    );
  }
}
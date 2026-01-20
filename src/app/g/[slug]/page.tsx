import type { Metadata } from "next";
import GiftWheelClient from "./wheel-client";
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

function pickGiftForClient(g: GiftAny) {
  return {
    id: g.id ?? "",
    slug: g.slug ?? "",
    status: g.status ?? "draft",
    paid_at: g.paid_at ?? null,
    created_at: g.created_at ?? null,

    couple_photo_url: g.couple_photo_url ?? null,
    love_letter: g.love_letter ?? "",

    red_phrase: g.red_phrase ?? "",
    relationship_start_at: g.relationship_start_at ?? "",

    stripe_session_id: g.stripe_session_id ?? null,
    stripe_checkout_session_id: g.stripe_checkout_session_id ?? null,
    stripe_payment_intent_id: g.stripe_payment_intent_id ?? null,

    needs_payment: g.needs_payment ?? undefined,
  };
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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  try {
    const { data } = await supabaseAdmin
      .from("gifts")
      .select("red_phrase")
      .eq("slug", slug)
      .maybeSingle();

    const redPhrase = (data as any)?.red_phrase as string | undefined;

    return {
      title: "Special Gift | Love Wheel",
      description: redPhrase || "A special gift for someone special",
    };
  } catch {
    return {
      title: "Special Gift | Love Wheel",
      description: "A special gift for someone special",
    };
  }
}

async function checkPaymentAndLoadGift(slug: string, sessionId?: string) {
  console.log("🔍 Verificando pagamento no servidor para:", slug);

  const gift = await loadGiftBySlug(slug);
  if (!gift) return { paid: false, gift: null as any };

  // 1) já pago
  if (gift.status === "paid" || gift.paid_at) {
    return { paid: true, gift: pickGiftForClient(gift) };
  }

  // 2) payment_intent
  if (typeof gift.stripe_payment_intent_id === "string" && gift.stripe_payment_intent_id.startsWith("pi_")) {
    const ts = isoNow();
    await supabaseAdmin.from("gifts").update({ status: "paid", paid_at: ts }).eq("id", gift.id);
    return { paid: true, gift: pickGiftForClient({ ...gift, status: "paid", paid_at: ts }) };
  }

  // 3) stripe session (url ou banco)
  const stripeSessionId =
    (sessionId?.startsWith("cs_") ? sessionId : null) ||
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
          })
          .eq("id", gift.id);

        return {
          paid: true,
          gift: pickGiftForClient({
            ...gift,
            status: "paid",
            paid_at: ts,
            stripe_session_id: stripeSessionId,
            stripe_checkout_session_id: stripeSessionId,
            stripe_payment_intent_id: session.payment_intent as string,
          }),
        };
      }
    } catch (e) {
      console.error("Erro Stripe retrieve session:", e);
    }
  }

  // 4) não pago -> preview
  return {
    paid: false,
    gift: {
      id: gift.id,
      slug: gift.slug,
      status: gift.status ?? "draft",
      paid_at: gift.paid_at ?? null,
      created_at: gift.created_at ?? null,
      red_phrase: gift.red_phrase ?? "",
      relationship_start_at: gift.relationship_start_at ?? "",
      needs_payment: true,
    },
  };
}

export default async function GiftPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { slug } = await params;
  const search = await searchParams;

  const sessionIdRaw = search.session_id;
  const sessionId = Array.isArray(sessionIdRaw) ? sessionIdRaw[0] : sessionIdRaw;

  const res = await checkPaymentAndLoadGift(slug, sessionId);

  if (!res.gift) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="text-center space-y-6">
          <div className="text-6xl">😔</div>
          <h1 className="text-3xl font-bold">Presente Não Encontrado</h1>
          <a
            href="/create"
            className="inline-block rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 px-6 py-3 font-bold text-white hover:opacity-95 transition"
          >
            Criar Seu Presente
          </a>
        </div>
      </div>
    );
  }

  if (!res.paid) {
    return <GiftWheelClient slug={slug} gift={res.gift as any} needsPayment={true} />;
  }

  return <GiftWheelClient slug={slug} gift={res.gift as any} needsPayment={false} />;
}

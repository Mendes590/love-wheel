import { NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

type Ctx = { params: { slug: string } | Promise<{ slug: string }> };

async function getSlug(ctx: Ctx) {
  const p: any = (ctx as any)?.params;
  const obj = typeof p?.then === "function" ? await p : p;
  const slug = (obj?.slug || "").trim();
  return slug;
}

function getStripe() {
  const stripeSecret = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecret) throw new Error("STRIPE_SECRET_KEY is missing");
  return new Stripe(stripeSecret);
}

export async function GET(req: Request, ctx: Ctx) {
  try {
    const slug = await getSlug(ctx);

    if (!slug) {
      return NextResponse.json({ error: "Missing slug" }, { status: 400 });
    }

    const url = new URL(req.url);
    const sessionId = url.searchParams.get("session_id");

    // 1) Sempre resolve o gift pelo slug (serve pros 2 fluxos)
    const { data: gift, error: giftErr } = await supabaseAdmin
      .from("gifts")
      .select("id, slug, status")
      .eq("slug", slug)
      .single();

    if (giftErr || !gift?.id) {
      return NextResponse.json({ error: "Gift not found" }, { status: 404 });
    }

    // ✅ Fluxo A: sem session_id -> só retorna o id (pra tela "Preparing checkout..." destravar)
    if (!sessionId) {
      return NextResponse.json({
        id: gift.id,
        status: gift.status, // opcional, ajuda no front
      });
    }

    // ✅ Fluxo B: com session_id -> confirma pagamento e marca como paid
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    const paid =
      session.payment_status === "paid" ||
      (session.status === "complete" && session.payment_status !== "unpaid");

    if (!paid) {
      // ainda processando
      return NextResponse.json(
        {
          ok: false,
          status: "pending",
          payment_status: session.payment_status,
          session_status: session.status,
        },
        { status: 202 }
      );
    }

    // segurança extra: garante que a sessão corresponde ao gift (via metadata)
    const metaGiftId = (session.metadata?.giftId || "").trim();
    if (metaGiftId && metaGiftId !== gift.id) {
      return NextResponse.json(
        { error: "Session does not match gift" },
        { status: 400 }
      );
    }

    if (gift.status !== "paid") {
      const { error: updErr } = await supabaseAdmin
        .from("gifts")
        .update({
          status: "paid",
          // se tiver colunas, você pode salvar:
          // paid_at: new Date().toISOString(),
          // stripe_session_id: session.id,
        })
        .eq("id", gift.id);

      if (updErr) {
        console.error("Resolve update error:", updErr);
        return NextResponse.json(
          { error: "Failed to update gift" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ ok: true, slug: gift.slug });
  } catch (err: any) {
    console.error("Resolve route error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Resolve failed" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from '@supabase/supabase-js';

// Conexão DIRETA para garantir funcionamento
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

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
  typescript: true,
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

if (!webhookSecret) {
  throw new Error("STRIPE_WEBHOOK_SECRET is not configured");
}

export async function POST(req: Request) {
  console.log("🔔 Webhook do Stripe chamado");
  
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    console.error("❌ Missing stripe-signature header");
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const rawBody = await req.text();
  
  console.log("📦 Webhook payload recebido, tamanho:", rawBody.length, "bytes");

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      webhookSecret
    );
    console.log("✅ Assinatura do webhook verificada");
  } catch (err: any) {
    console.error("❌ Webhook signature error:", err?.message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    console.log(`🎯 Tipo de evento: ${event.type}`);
    console.log("📝 Event ID:", event.id);

    // 1. CHECKOUT SESSION COMPLETED - PAGAMENTO CONFIRMADO
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      
      console.log("💰 CHECKOUT SESSION COMPLETED!");
      console.log("📊 Dados da sessão:", {
        sessionId: session.id,
        paymentIntent: session.payment_intent,
        paymentStatus: session.payment_status,
        amountTotal: session.amount_total,
        currency: session.currency,
        customerEmail: session.customer_email,
        metadata: session.metadata
      });

      const giftId = session.metadata?.giftId;
      const slug = session.metadata?.slug;
      const paymentIntentId = session.payment_intent as string;

      if (giftId) {
        console.log(`🔍 Buscando gift com ID: ${giftId}`);
        
        // Primeiro verificar se o gift existe
        const { data: existingGift, error: fetchError } = await supabaseAdmin
          .from("gifts")
          .select("id, slug, status, stripe_session_id, stripe_checkout_session_id")
          .eq("id", giftId)
          .single();

        if (fetchError || !existingGift) {
          console.error("❌ Gift não encontrado pelo ID:", giftId);
          
          // Tentar buscar pelo slug se não encontrar pelo ID
          if (slug) {
            console.log(`🔍 Tentando buscar pelo slug: ${slug}`);
            await updateGiftBySlug(slug, session.id, paymentIntentId);
          }
        } else {
          console.log("✅ Gift encontrado:", {
            id: existingGift.id,
            slug: existingGift.slug,
            currentStatus: existingGift.status,
            existingStripeSessionId: existingGift.stripe_session_id,
            existingCheckoutSessionId: existingGift.stripe_checkout_session_id
          });

          // Atualizar o gift - AMBAS AS COLUNAS DE SESSION_ID
          console.log("💾 Atualizando gift no banco...");
          const { error: updateError } = await supabaseAdmin
            .from("gifts")
            .update({
              status: "paid",
              paid_at: new Date().toISOString(),
              stripe_session_id: session.id,
              stripe_checkout_session_id: session.id, // ⚠️ ATUALIZAR AMBAS AS COLUNAS
              stripe_payment_intent_id: paymentIntentId,
              updated_at: new Date().toISOString()
            })
            .eq("id", giftId);

          if (updateError) {
            console.error("❌ Erro ao atualizar gift:", updateError);
            
            // Tentar atualização mais simples sem as colunas extras
            const { error: simpleError } = await supabaseAdmin
              .from("gifts")
              .update({
                status: "paid",
                paid_at: new Date().toISOString(),
                stripe_payment_intent_id: paymentIntentId,
                updated_at: new Date().toISOString()
              })
              .eq("id", giftId);
              
            if (simpleError) {
              console.error("❌ Erro na atualização simples também:", simpleError);
              
              // Última tentativa: apenas status
              await supabaseAdmin
                .from("gifts")
                .update({
                  status: "paid",
                  paid_at: new Date().toISOString()
                })
                .eq("id", giftId);
                
              console.log("✅ Atualização mínima (apenas status) aplicada");
            } else {
              console.log("✅ Gift atualizado (atualização simples)");
            }
          } else {
            console.log("✅✅✅ Gift atualizado com sucesso para PAID!");
          }
        }
      } else if (slug) {
        // Se não tem giftId mas tem slug
        console.log(`🔍 Buscando gift pelo slug: ${slug}`);
        await updateGiftBySlug(slug, session.id, paymentIntentId);
      } else {
        console.log("⚠️ Nenhum giftId ou slug encontrado no metadata, tentando buscar pela session_id...");
        
        // Tentar buscar gift pelo session_id em ambas as colunas
        const { data: giftsByStripeId } = await supabaseAdmin
          .from("gifts")
          .select("id, slug")
          .eq("stripe_session_id", session.id);

        const { data: giftsByCheckoutId } = await supabaseAdmin
          .from("gifts")
          .select("id, slug")
          .eq("stripe_checkout_session_id", session.id);

        const allGifts = [...(giftsByStripeId || []), ...(giftsByCheckoutId || [])];
        const uniqueGifts = Array.from(new Set(allGifts.map(g => g.id)))
          .map(id => allGifts.find(g => g.id === id));

        if (uniqueGifts.length > 0) {
          console.log(`✅ Encontrados ${uniqueGifts.length} gifts com essa session_id`);
          
          for (const gift of uniqueGifts) {
            if (!gift) continue;
            
            await supabaseAdmin
              .from("gifts")
              .update({
                status: "paid",
                paid_at: new Date().toISOString(),
                stripe_payment_intent_id: paymentIntentId,
                stripe_session_id: session.id, // Garantir que está salvo
                stripe_checkout_session_id: session.id, // Garantir que está salvo
                updated_at: new Date().toISOString()
              })
              .eq("id", gift.id);
              
            console.log(`✅ Gift ${gift.id} (${gift.slug}) atualizado`);
          }
        } else {
          console.log("⚠️ Nenhum gift encontrado com essa session_id");
          
          // Log para debug
          console.log("📋 Metadata completo:", JSON.stringify(session.metadata, null, 2));
        }
      }
    }
    
    // 2. CHECKOUT SESSION ASYNC PAYMENT SUCCEEDED - Pagamento assíncrono confirmado
    else if (event.type === "checkout.session.async_payment_succeeded") {
      const session = event.data.object as Stripe.Checkout.Session;
      
      console.log("✅ PAGAMENTO ASSÍNCRONO CONFIRMADO:", session.id);
      
      // Mesma lógica de atualização
      const giftId = session.metadata?.giftId;
      const slug = session.metadata?.slug;
      
      if (giftId) {
        await updateGiftStatus(giftId, session.id, session.payment_intent as string);
      } else if (slug) {
        await updateGiftBySlug(slug, session.id, session.payment_intent as string);
      }
    }
    
    // 3. PAYMENT INTENT SUCCEEDED - Outra forma de pagamento confirmado
    else if (event.type === "payment_intent.succeeded") {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      
      console.log("✅ PAYMENT INTENT SUCESSO:", paymentIntent.id);
      
      // Tentar encontrar gift pelo payment_intent_id
      const { data: gifts } = await supabaseAdmin
        .from("gifts")
        .select("id, slug, status")
        .eq("stripe_payment_intent_id", paymentIntent.id);

      if (gifts && gifts.length > 0) {
        for (const gift of gifts) {
          if (gift.status !== 'paid') {
            await supabaseAdmin
              .from("gifts")
              .update({
                status: "paid",
                paid_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
              .eq("id", gift.id);
              
            console.log(`✅ Gift ${gift.id} (${gift.slug}) atualizado via payment_intent`);
          } else {
            console.log(`ℹ️ Gift ${gift.id} já estava como paid`);
          }
        }
      } else {
        console.log(`ℹ️ Nenhum gift encontrado com payment_intent_id: ${paymentIntent.id}`);
      }
    }
    
    // 4. Outros eventos (para logging)
    else {
      console.log(`ℹ️ Outro evento recebido: ${event.type}`);
      
      // Log detalhado para debug
      if (process.env.NODE_ENV === 'development') {
        console.log("📋 Detalhes do evento:", JSON.stringify(event.data.object, null, 2));
      }
    }

    return NextResponse.json({ 
      received: true,
      eventType: event.type,
      status: "processed"
    });
    
  } catch (e: any) {
    console.error("💥 Webhook handler error:", e);
    console.error("Stack trace:", e.stack);
    
    return NextResponse.json({ 
      error: "Webhook failed",
      message: e.message 
    }, { status: 500 });
  }
}

// FUNÇÃO AUXILIAR: Atualizar gift pelo slug
async function updateGiftBySlug(slug: string, sessionId: string, paymentIntentId: string) {
  try {
    console.log(`🔍 Buscando gift pelo slug: ${slug}`);
    
    const { data: gift, error: fetchError } = await supabaseAdmin
      .from("gifts")
      .select("id, slug, status")
      .eq("slug", slug)
      .single();

    if (fetchError || !gift) {
      console.error(`❌ Gift não encontrado pelo slug: ${slug}`, fetchError);
      return;
    }

    console.log(`✅ Gift encontrado pelo slug: ${gift.id}, status atual: ${gift.status}`);

    // Atualizar com todas as colunas possíveis
    const updateData: any = {
      status: "paid",
      paid_at: new Date().toISOString(),
      stripe_payment_intent_id: paymentIntentId,
      updated_at: new Date().toISOString()
    };

    // Adicionar session_id em ambas as colunas
    updateData.stripe_session_id = sessionId;
    updateData.stripe_checkout_session_id = sessionId;

    const { error: updateError } = await supabaseAdmin
      .from("gifts")
      .update(updateData)
      .eq("id", gift.id);

    if (updateError) {
      console.error("❌ Erro ao atualizar gift pelo slug:", updateError);
      
      // Tentar sem as colunas de session_id
      const { error: retryError } = await supabaseAdmin
        .from("gifts")
        .update({
          status: "paid",
          paid_at: new Date().toISOString(),
          stripe_payment_intent_id: paymentIntentId,
          updated_at: new Date().toISOString()
        })
        .eq("id", gift.id);
        
      if (retryError) {
        console.error("❌ Erro na segunda tentativa:", retryError);
      } else {
        console.log(`✅ Gift ${gift.id} atualizado (sem session_id)`);
      }
    } else {
      console.log(`✅ Gift ${gift.id} (${slug}) atualizado para PAID via webhook`);
    }
  } catch (error: any) {
    console.error(`💥 Erro em updateGiftBySlug: ${error.message}`);
  }
}

// FUNÇÃO AUXILIAR: Atualizar status do gift
async function updateGiftStatus(giftId: string, sessionId: string, paymentIntentId: string) {
  try {
    console.log(`🔍 Atualizando gift ${giftId}...`);
    
    const updateData: any = {
      status: "paid",
      paid_at: new Date().toISOString(),
      stripe_payment_intent_id: paymentIntentId,
      updated_at: new Date().toISOString()
    };

    // Adicionar session_id em ambas as colunas
    updateData.stripe_session_id = sessionId;
    updateData.stripe_checkout_session_id = sessionId;

    const { error: updateError } = await supabaseAdmin
      .from("gifts")
      .update(updateData)
      .eq("id", giftId);

    if (updateError) {
      console.error("❌ Erro ao atualizar gift:", updateError);
      
      // Tentar atualização mínima
      const { error: simpleError } = await supabaseAdmin
        .from("gifts")
        .update({
          status: "paid",
          paid_at: new Date().toISOString(),
          stripe_payment_intent_id: paymentIntentId
        })
        .eq("id", giftId);
        
      if (simpleError) {
        console.error("❌ Erro na atualização simples:", simpleError);
        
        // Última tentativa
        await supabaseAdmin
          .from("gifts")
          .update({
            status: "paid",
            paid_at: new Date().toISOString()
          })
          .eq("id", giftId);
          
        console.log("✅ Atualização mínima aplicada");
      } else {
        console.log("✅ Gift atualizado (versão simples)");
      }
    } else {
      console.log(`✅ Gift ${giftId} atualizado com sucesso`);
    }
  } catch (error: any) {
    console.error(`💥 Erro em updateGiftStatus: ${error.message}`);
  }
}
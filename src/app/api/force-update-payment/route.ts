import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';

// CONEXÃO DIRETA - SEM VARIÁVEIS DE AMBIENTE
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

export async function POST(request: Request) {
  console.log("🚨 FORÇANDO ATUALIZAÇÃO DE PAGAMENTO 🚨");
  
  try {
    const { sessionId, giftId, slug } = await request.json();
    
    console.log("📋 Dados recebidos:", { sessionId, giftId, slug });
    
    // 1. TENTAR VERIFICAR NO STRIPE
    let stripePaid = false;
    let stripeStatus = 'unknown';
    
    if (sessionId && sessionId.startsWith('cs_test_')) {
      try {
        console.log("🔍 Consultando Stripe para session:", sessionId);
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        stripeStatus = session.payment_status;
        stripePaid = session.payment_status === 'paid';
        console.log("💳 Status Stripe:", stripeStatus, "Pago?", stripePaid);
      } catch (stripeErr: any) {
        console.error("❌ Erro Stripe:", stripeErr.message);
        // Test mode - assumir que está pago se for session de teste
        if (sessionId.includes('cs_test_')) {
          stripePaid = true;
          stripeStatus = 'test_mode_paid';
          console.log("✅ Modo teste - considerando como pago");
        }
      }
    }
    
    // 2. ATUALIZAR O BANCO DE DADOS DE QUALQUER FORMA
    console.log("🔄 Atualizando banco de dados...");
    
    const updateData: any = {
      status: 'paid',
      updated_at: new Date().toISOString(),
      last_forced_update: new Date().toISOString()
    };
    
    // Se temos dados do Stripe, use-os
    if (sessionId) {
      updateData.stripe_session_id = sessionId;
    }
    
    if (stripePaid) {
      updateData.paid_at = new Date().toISOString();
      updateData.payment_verified_via = 'stripe_api';
    } else {
      // Forçar como pago mesmo sem verificação
      updateData.paid_at = new Date().toISOString();
      updateData.payment_verified_via = 'force_update';
      console.log("⚠️ Forçando status como pago sem verificação Stripe");
    }
    
    console.log("📝 Dados de atualização:", updateData);
    
    // Tentar atualizar por ID
    let updateResult: any = null;
    if (giftId) {
      console.log("🎯 Atualizando por giftId:", giftId);
      const { data, error } = await supabaseAdmin
        .from('gifts')
        .update(updateData)
        .eq('id', giftId)
        .select()
        .single();
        
      if (error) {
        console.error("❌ Erro atualizando por ID:", error);
      } else {
        updateResult = data;
        console.log("✅ Atualizado por ID:", data?.id);
      }
    }
    
    // Se não conseguiu por ID, tentar por slug
    if (!updateResult && slug) {
      console.log("🎯 Tentando atualizar por slug:", slug);
      const { data, error } = await supabaseAdmin
        .from('gifts')
        .update(updateData)
        .eq('slug', slug)
        .select()
        .single();
        
      if (error) {
        console.error("❌ Erro atualizando por slug:", error);
      } else {
        updateResult = data;
        console.log("✅ Atualizado por slug:", data?.slug);
      }
    }
    
    // 3. VERIFICAR SE ATUALIZOU
    let finalStatus = 'unknown';
    if (updateResult) {
      console.log("🎉 ATUALIZAÇÃO BEM SUCEDIDA!");
      console.log("📊 Resultado final:", {
        id: updateResult.id,
        slug: updateResult.slug,
        status: updateResult.status,
        paid_at: updateResult.paid_at
      });
      finalStatus = updateResult.status;
    } else {
      console.error("💥 FALHA TOTAL NA ATUALIZAÇÃO");
      // Tentar inserir como último recurso?
    }
    
    return NextResponse.json({
      success: !!updateResult,
      message: updateResult ? 'Gift atualizado com sucesso' : 'Falha na atualização',
      data: updateResult,
      stripe: { paid: stripePaid, status: stripeStatus },
      finalStatus
    });
    
  } catch (error: any) {
    console.error("💥 ERRO CRÍTICO:", error);
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
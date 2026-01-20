import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = supabaseUrl && serviceRoleKey 
  ? createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null;

export async function POST(request: Request) {
  try {
    const { giftId } = await request.json();
    
    if (!giftId) {
      return NextResponse.json(
        { error: 'giftId is required' },
        { status: 400 }
      );
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const { data: gift, error } = await supabaseAdmin
      .from('gifts')
      .select('*')
      .eq('id', giftId)
      .single();

    if (error || !gift) {
      return NextResponse.json(
        { error: 'Gift not found' },
        { status: 404 }
      );
    }

    const isPaid = gift.status === 'paid' || gift.paid_at !== null;

    return NextResponse.json({
      isPaid,
      status: gift.status,
      paid_at: gift.paid_at,
      gift: isPaid ? gift : null
    });
  } catch (error: any) {
    console.error('Error verifying payment:', error);
    return NextResponse.json(
      { error: `Internal server error: ${error.message}` },
      { status: 500 }
    );
  }
}
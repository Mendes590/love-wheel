import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ slug: string }> }
) {
  const { slug } = await ctx.params;

  if (!slug) {
    return NextResponse.json({ error: "Missing slug" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("gifts")
    .select(
      "id, slug, status, created_at, couple_photo_url, love_letter, red_phrase, relationship_start_at"
    )
    .eq("slug", slug)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (data.status === "disabled") {
    return NextResponse.json({ error: "Not available" }, { status: 410 });
  }

  // ✅ Bloqueia acesso se não pagou
  if (data.status !== "paid") {
    return NextResponse.json({ error: "Payment required" }, { status: 402 });
  }

  return NextResponse.json(data);
}

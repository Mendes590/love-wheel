import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { generateSlug } from "@/lib/slug";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { loveLetter, redPhrase, relationshipStartAt } = body;

    if (!loveLetter || !redPhrase || !relationshipStartAt) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const slug = generateSlug(12);

    const { data, error } = await supabaseAdmin
      .from("gifts")
      .insert({
        slug,
        status: "draft",
        love_letter: loveLetter,
        red_phrase: redPhrase,
        relationship_start_at: relationshipStartAt,
      })
      .select("id, slug")
      .single();

    if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (e) {
    console.error("API error:", e);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

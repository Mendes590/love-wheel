import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

const MAX_MB = 8;
const MAX_BYTES = MAX_MB * 1024 * 1024;

function safeExtFromMime(mime: string) {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };
  return map[mime] ?? null;
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    const giftId = formData.get("giftId");

    if (!(file instanceof File) || typeof giftId !== "string" || !giftId.trim()) {
      return NextResponse.json({ error: "Missing file or giftId" }, { status: 400 });
    }

    // Validate file
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Only image files are allowed" }, { status: 400 });
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: `Image too large. Max ${MAX_MB}MB.` },
        { status: 400 }
      );
    }

    const ext = safeExtFromMime(file.type);
    if (!ext) {
      return NextResponse.json(
        { error: "Unsupported image type. Use JPG, PNG or WebP." },
        { status: 400 }
      );
    }

    // Nice, predictable path (supports replacing later)
    // Example: couple-photos/<giftId>/cover.jpg
    const filePath = `${giftId}/cover.${ext}`;

    // Convert File -> Buffer (most reliable in route handlers)
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await supabaseAdmin.storage
      .from("couple-photos")
      .upload(filePath, buffer, {
        upsert: true, // keep your old behavior (replace)
        contentType: file.type,
        cacheControl: "3600",
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }

    const { data } = supabaseAdmin.storage
      .from("couple-photos")
      .getPublicUrl(filePath);

    const publicUrl = data.publicUrl;

    // Persist in DB
    const { error: updateError } = await supabaseAdmin
      .from("gifts")
      .update({
        couple_photo_url: publicUrl,
        // opcional mas recomendo guardar o path também:
        couple_photo_path: filePath,
      })
      .eq("id", giftId);

    if (updateError) {
      console.error("DB update error:", updateError);
      return NextResponse.json({ error: "DB update failed" }, { status: 500 });
    }

    return NextResponse.json({ url: publicUrl, path: filePath });
  } catch (e) {
    console.error("Upload-photo route error:", e);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

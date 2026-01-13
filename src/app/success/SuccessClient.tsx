"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function SuccessClient() {
  const sp = useSearchParams();
  const router = useRouter();

  const slug = sp.get("slug") ?? "";
  const sessionId = sp.get("session_id") ?? "";

  const [msg, setMsg] = React.useState("Confirming your payment…");

  React.useEffect(() => {
    if (!slug || !sessionId) {
      setMsg("Missing checkout info.");
      return;
    }

    let tries = 0;
    let stopped = false;

    async function tick() {
      tries += 1;

      // depois de um tempo, para de martelar e só avisa
      if (tries > 20) {
        setMsg("Still confirming… If this keeps happening, refresh in a moment.");
        return;
      }

      try {
        const url = `/api/resolve/${encodeURIComponent(slug)}?session_id=${encodeURIComponent(sessionId)}`;
        const res = await fetch(url, { method: "GET" });
        const data = await res.json();

        if (data?.ok) {
          stopped = true;
          router.replace(`/g/${slug}`);
          return;
        }

        if (!stopped) window.setTimeout(tick, 1200);
      } catch {
        if (!stopped) window.setTimeout(tick, 1500);
      }
    }

    tick();

    return () => {
      stopped = true;
    };
  }, [slug, sessionId, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="rounded-2xl border bg-white/70 p-6">
        <div className="text-lg font-semibold">{msg}</div>
        <div className="text-sm opacity-70 mt-2">Hang tight — redirecting soon.</div>
      </div>
    </div>
  );
}

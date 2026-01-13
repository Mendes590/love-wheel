import * as React from "react";
import SuccessClient from "./SuccessClient";

export default function SuccessPage() {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="rounded-2xl border bg-white/70 p-6">
            <div className="text-lg font-semibold">Confirming your payment…</div>
            <div className="text-sm opacity-70 mt-2">Hang tight — redirecting soon.</div>
          </div>
        </div>
      }
    >
      <SuccessClient />
    </React.Suspense>
  );
}

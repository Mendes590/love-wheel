"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import * as QRCode from "qrcode";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

/**
 * Mobile-first performance fixes:
 * - Reduce heavy animations on mobile automatically
 * - Compress photo preview before rendering
 * - Modal: header fixed, body scroll, footer sticky
 * - Avoid huge re-render triggers from form.watch() (useWatch instead)
 * - Fix Tailwind opacity syntax (/[0.xx])
 */

const PRICE_USD = "$4.90";
const PRICE_MICROCOPY = `One-time unlock · ${PRICE_USD} · No subscription`;

const schema = z.object({
  redPhrase: z.string().trim().min(3, "Write at least 3 characters.").max(80, "Max 80 characters."),
  relationshipStartAt: z.string().min(1, "Pick a date."),
  loveLetter: z.string().trim().min(30, "Write at least 30 characters.").max(4000, "Max 4000 characters."),
});

type FormValues = z.infer<typeof schema>;
type StepKey = "hero" | "red" | "green" | "photo" | "yellow" | "confirm";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function dateToStableIso(dateStr: string) {
  // keeps date stable across TZ differences
  return `${dateStr}T12:00:00.000Z`;
}

function formatDuration(from: Date, to: Date) {
  let years = to.getFullYear() - from.getFullYear();
  let months = to.getMonth() - from.getMonth();
  let days = to.getDate() - from.getDate();

  if (days < 0) {
    const prevMonthDays = new Date(to.getFullYear(), to.getMonth(), 0).getDate();
    days += prevMonthDays;
    months -= 1;
  }
  if (months < 0) {
    months += 12;
    years -= 1;
  }
  if (years < 0) return "—";

  const parts: string[] = [];
  if (years) parts.push(`${years}y`);
  if (months) parts.push(`${months}m`);
  if (!years && !months) parts.push(`${days}d`);
  return parts.join(" ");
}

function prefersVibration() {
  return typeof navigator !== "undefined" && "vibrate" in navigator;
}

function softHaptic(pattern: number | number[] = 10) {
  if (typeof window === "undefined") return;
  try {
    if (prefersVibration()) navigator.vibrate(pattern as any);
  } catch {
    // ignore
  }
}

/** ===== Icons (memoized) ===== */

const IconHeart = React.memo(function IconHeart({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={cx("h-4 w-4", className)}>
      <path
        d="M12 21s-7.2-4.35-9.6-8.55C.3 8.85 2.25 5.4 5.85 5.1c1.95-.15 3.45.9 4.2 2.1.75-1.2 2.25-2.25 4.2-2.1 3.6.3 5.55 3.75 3.45 7.35C19.2 16.65 12 21 12 21z"
        fill="currentColor"
      />
    </svg>
  );
});

const IconSpark = React.memo(function IconSpark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={cx("h-4 w-4", className)}>
      <path
        d="M12 2l1.2 5.2L18 9l-4.8 1.8L12 16l-1.2-5.2L6 9l4.8-1.8L12 2zm7 8l.6 2.6L22 14l-2.4.9L19 18l-.6-3.1L16 14l2.4-1.4L19 10zM4 10l.6 2.6L7 14l-2.4.9L4 18l-.6-3.1L1 14l2.4-1.4L4 10z"
        fill="currentColor"
      />
    </svg>
  );
});

const IconPhoto = React.memo(function IconPhoto({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={cx("h-4 w-4", className)}>
      <path
        d="M20 5h-3.2l-1.2-1.4A2 2 0 0014.1 3H9.9a2 2 0 00-1.5.6L7.2 5H4a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V7a2 2 0 00-2-2zm0 14H4V7h3.9l1.7-2h4.8l1.7 2H20v12zm-8-1a5 5 0 110-10 5 5 0 010 10zm0-2.2a2.8 2.8 0 100-5.6 2.8 2.8 0 000 5.6z"
        fill="currentColor"
      />
    </svg>
  );
});

const IconX = React.memo(function IconX({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={cx("h-4 w-4", className)}>
      <path
        d="M18.3 5.7a1 1 0 00-1.4 0L12 10.6 7.1 5.7a1 1 0 00-1.4 1.4l4.9 4.9-4.9 4.9a1 1 0 001.4 1.4l4.9-4.9 4.9 4.9a1 1 0 001.4-1.4L13.4 12l4.9-4.9a1 1 0 000-1.4z"
        fill="currentColor"
      />
    </svg>
  );
});

const IconLink = React.memo(function IconLink({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={cx("h-4 w-4", className)}>
      <path
        d="M10.6 13.4a1 1 0 001.4 1.4l4.95-4.95a3 3 0 10-4.24-4.24l-2.12 2.12a1 1 0 101.4 1.4l2.12-2.12a1 1 0 112.83 2.83l-4.95 4.95zM13.4 10.6a1 1 0 00-1.4-1.4l-4.95 4.95a3 3 0 104.24 4.24l2.12-2.12a1 1 0 10-1.4-1.4l-2.12 2.12a1 1 0 11-2.83-2.83l4.95-4.95z"
        fill="currentColor"
      />
    </svg>
  );
});

const IconMenu = React.memo(function IconMenu({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={cx("h-5 w-5", className)}>
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 12h18M3 6h18M3 18h18"
      />
    </svg>
  );
});

const IconArrowRight = React.memo(function IconArrowRight({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={cx("h-4 w-4", className)}>
      <path
        d="M13 7l5 5-5 5m-6-10l5 5-5 5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
});

/** ===== Accent system (fixed Tailwind opacity syntax) ===== */

function stepAccent(step: StepKey) {
  if (step === "red")
    return {
      dot: "bg-fuchsia-500",
      ring: "ring-fuchsia-500/[0.20]",
      glow: "from-fuchsia-500/[0.18] via-pink-500/[0.10] to-violet-500/[0.10]",
      chip: "hover:border-fuchsia-500/25 hover:text-foreground",
      bar: "from-fuchsia-500 via-pink-500 to-violet-500",
      stroke: "border-fuchsia-500/15",
      icon: "text-fuchsia-400/85",
    };
  if (step === "green")
    return {
      dot: "bg-emerald-400",
      ring: "ring-emerald-400/[0.18]",
      glow: "from-emerald-400/[0.14] via-sky-400/[0.10] to-fuchsia-500/[0.10]",
      chip: "hover:border-emerald-400/25 hover:text-foreground",
      bar: "from-emerald-400 via-sky-400 to-fuchsia-500",
      stroke: "border-emerald-400/15",
      icon: "text-emerald-300/90",
    };
  if (step === "photo")
    return {
      dot: "bg-sky-400",
      ring: "ring-sky-400/[0.18]",
      glow: "from-sky-400/[0.14] via-violet-500/[0.10] to-fuchsia-500/[0.10]",
      chip: "hover:border-sky-400/25 hover:text-foreground",
      bar: "from-sky-400 via-violet-500 to-fuchsia-500",
      stroke: "border-sky-400/15",
      icon: "text-sky-300/90",
    };
  if (step === "yellow")
    return {
      dot: "bg-amber-300",
      ring: "ring-amber-300/[0.18]",
      glow: "from-amber-300/[0.12] via-fuchsia-500/[0.10] to-sky-400/[0.10]",
      chip: "hover:border-amber-300/25 hover:text-foreground",
      bar: "from-amber-300 via-fuchsia-500 to-sky-400",
      stroke: "border-amber-300/15",
      icon: "text-amber-200/90",
    };
  if (step === "confirm")
    return {
      dot: "bg-violet-500",
      ring: "ring-violet-500/[0.18]",
      glow: "from-violet-500/[0.14] via-fuchsia-500/[0.10] to-sky-400/[0.10]",
      chip: "hover:border-violet-500/25 hover:text-foreground",
      bar: "from-violet-500 via-fuchsia-500 to-sky-400",
      stroke: "border-violet-500/15",
      icon: "text-violet-300/90",
    };

  return {
    dot: "bg-fuchsia-500",
    ring: "ring-white/10",
    glow: "from-fuchsia-500/[0.18] via-pink-500/[0.10] to-violet-500/[0.10]",
    chip: "hover:border-white/15 hover:text-foreground",
    bar: "from-fuchsia-500 via-pink-500 to-violet-500",
    stroke: "border-white/10",
    icon: "text-fuchsia-400/85",
  };
}

/** ===== Background (reduce motion on mobile too) ===== */

function NeonBg({ reduceAll }: { reduceAll: boolean }) {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(1200px_circle_at_20%_20%,rgba(255,255,255,0.06),transparent_55%),radial-gradient(900px_circle_at_85%_25%,rgba(255,64,169,0.10),transparent_55%),radial-gradient(900px_circle_at_70%_85%,rgba(155,81,224,0.10),transparent_60%),linear-gradient(180deg,#050816_0%,#050816_45%,#040513_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(1200px_circle_at_50%_45%,transparent_40%,rgba(0,0,0,0.70)_100%)]" />
      <div className="absolute inset-0 opacity-[0.08] [background-image:radial-gradient(rgba(255,255,255,0.9)_1px,transparent_1px)] [background-size:10px_10px]" />

      {!reduceAll && (
        <motion.div
          className="absolute -inset-14 opacity-[0.30]"
          animate={{ y: [0, -10, 0], x: [0, 6, 0] }}
          transition={{ duration: 10, ease: "easeInOut", repeat: Infinity }}
        >
          <div className="absolute left-[10%] top-[25%] h-28 w-28 rounded-full bg-fuchsia-500/10 blur-3xl" />
          <div className="absolute left-[72%] top-[18%] h-32 w-32 rounded-full bg-violet-500/12 blur-3xl" />
          <div className="absolute left-[55%] top-[72%] h-36 w-36 rounded-full bg-pink-500/10 blur-3xl" />
        </motion.div>
      )}
    </div>
  );
}

/** ===== Helpers ===== */

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-2 text-xs text-fuchsia-300">
      {msg}
    </motion.div>
  );
}

function KeyHint({ children }: { children: React.ReactNode }) {
  return <div className="text-[11px] text-white/55">{children}</div>;
}

function GhostChip({
  children,
  onClick,
  step,
  icon,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  step: StepKey;
  icon?: React.ReactNode;
}) {
  const a = stepAccent(step);
  return (
    <button
      type="button"
      onClick={() => {
        softHaptic(8);
        onClick?.();
      }}
      className={cx(
        "inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/6 px-3 py-1.5 text-xs text-white/70 backdrop-blur transition",
        "hover:bg-white/10 active:scale-[0.99]",
        "focus:outline-none focus:ring-2 focus:ring-white/15",
        a.chip
      )}
    >
      {icon ? <span className={cx("opacity-90", a.icon)}>{icon}</span> : null}
      {children}
    </button>
  );
}

function MinimalProgress({ step, progress, reduceAll }: { step: StepKey; progress: number; reduceAll: boolean }) {
  const label =
    step === "red"
      ? "Your line"
      : step === "green"
      ? "Your date"
      : step === "photo"
      ? "Your photo"
      : step === "yellow"
      ? "Your letter"
      : "Preview";

  const a = stepAccent(step);

  return (
    <div className="mt-4 sm:mt-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4">
      <div className="text-xs text-white/60">
        <span className="text-white/85">{label}</span> • {progress}%
      </div>

      <div className="relative h-2 w-full sm:w-44 overflow-hidden rounded-full bg-white/10">
        {!reduceAll && (
          <motion.div
            className={cx("absolute inset-0 opacity-30", "bg-gradient-to-r", a.bar)}
            animate={{ x: ["-30%", "30%", "-30%"] }}
            transition={{ duration: 3.8, ease: "easeInOut", repeat: Infinity }}
          />
        )}
        <div className={cx("relative h-full rounded-full bg-gradient-to-r transition-all", a.bar)} style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}

/** ===== Photo compression for mobile smoothness ===== */

const MAX_PHOTO_MB = 8;
const MAX_BYTES = MAX_PHOTO_MB * 1024 * 1024;

function isValidImage(file: File) {
  return file.type.startsWith("image/");
}

async function compressForPreview(file: File, maxSide = 1280, quality = 0.82): Promise<Blob> {
  // If browser doesn't support createImageBitmap, fallback to original
  if (typeof createImageBitmap === "undefined") return file;

  const bitmap = await createImageBitmap(file);
  const w = bitmap.width;
  const h = bitmap.height;

  const scale = Math.min(1, maxSide / Math.max(w, h));
  const outW = Math.max(1, Math.round(w * scale));
  const outH = Math.max(1, Math.round(h * scale));

  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;

  const ctx = canvas.getContext("2d");
  if (!ctx) return file;

  ctx.drawImage(bitmap, 0, 0, outW, outH);

  const blob: Blob = await new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b ?? file), "image/jpeg", quality);
  });

  bitmap.close?.();
  return blob;
}

/** ===== InfoModal (scroll ok on mobile) ===== */

function InfoModal({
  open,
  onOpenChange,
  title,
  content,
  ctaLabel,
  onCta,
  reduceAll,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  content: React.ReactNode;
  ctaLabel?: string;
  onCta?: () => void;
  reduceAll: boolean;
}) {
  const dialogRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => dialogRef.current?.focus(), 30);
    return () => window.clearTimeout(t);
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[90] flex items-center justify-center p-3 sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onOpenChange(false);
          }}
        >
          <motion.div className="absolute inset-0 bg-black/55 backdrop-blur-[10px]" />

          <motion.div
            role="dialog"
            aria-modal="true"
            tabIndex={-1}
            ref={dialogRef}
            onKeyDown={(e) => e.key === "Escape" && onOpenChange(false)}
            className={cx(
              "relative w-full max-w-2xl overflow-hidden rounded-[26px] border border-white/12 bg-[#070A1B]/80 shadow-[0_40px_160px_-70px_rgba(0,0,0,0.85)] backdrop-blur",
              "focus:outline-none focus:ring-2 focus:ring-white/15"
            )}
            initial={reduceAll ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.99, filter: "blur(8px)" }}
            animate={reduceAll ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
            exit={reduceAll ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.99, filter: "blur(8px)" }}
            transition={{ duration: reduceAll ? 0.14 : 0.28, ease: "easeOut" }}
          >
            <div className="relative p-5 sm:p-7">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/6 px-3 py-1 text-xs text-white/70 backdrop-blur">
                    <span className="h-1.5 w-1.5 rounded-full bg-fuchsia-400" />
                    LoveWheel
                  </div>
                  <div className="text-xl sm:text-2xl font-semibold tracking-tight text-white/90">{title}</div>
                </div>

                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className={cx(
                    "inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/12 bg-white/6 text-white/70 backdrop-blur transition",
                    "hover:bg-white/10 hover:text-white active:scale-[0.98]",
                    "focus:outline-none focus:ring-2 focus:ring-white/15"
                  )}
                  aria-label="Close"
                >
                  <IconX className="h-4 w-4" />
                </button>
              </div>

              <div
                className="mt-4 sm:mt-5 max-h-[60vh] overflow-auto rounded-2xl border border-white/12 bg-white/6 p-4 text-sm text-white/75 leading-relaxed overscroll-contain"
                style={{ WebkitOverflowScrolling: "touch" } as any}
              >
                {content}
              </div>

              <div className="mt-4 sm:mt-5 flex flex-wrap items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full border-white/15 bg-white/0 text-white hover:bg-white/10 text-sm px-4 py-2"
                  onClick={() => onOpenChange(false)}
                >
                  Close
                </Button>
                {ctaLabel ? (
                  <Button
                    type="button"
                    className="rounded-full bg-gradient-to-r from-fuchsia-500 via-pink-500 to-violet-500 text-white hover:opacity-95 text-sm px-4 py-2"
                    onClick={() => {
                      softHaptic([8, 12, 8]);
                      onCta?.();
                    }}
                  >
                    {ctaLabel}
                  </Button>
                ) : null}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** ===== QR generator ===== */

function QrCodeBlock({ value }: { value: string }) {
  const [dataUrl, setDataUrl] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!value) return;
      setLoading(true);
      try {
        const url = await QRCode.toDataURL(value, {
          width: 240,
          margin: 1,
          errorCorrectionLevel: "M",
        });
        if (!cancelled) setDataUrl(url);
      } catch {
        if (!cancelled) setDataUrl(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [value]);

  function download() {
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = "LoveWheel-QR.png";
    document.body.appendChild(a);
    a.click();
    a.remove();
    toast.success("QR saved.", { description: "Perfect. Now you can print it or place it in a letter." });
    softHaptic([8, 12, 8]);
  }

  return (
    <div className="mt-4 sm:mt-5 rounded-2xl border border-white/12 bg-white/6 p-3 sm:p-4">
      <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[10px] sm:text-[11px] text-white/55">Save this QR code before you pay</div>
          <div className="mt-1 text-xs sm:text-sm text-white/80">
            Print it, tape it into a letter, or keep it for the perfect delivery moment.
          </div>
        </div>
        <Button type="button" variant="secondary" className="rounded-full mt-2 sm:mt-0 text-sm px-3 py-2" onClick={download} disabled={!dataUrl}>
          {dataUrl ? "Download QR" : loading ? "Generating…" : "QR unavailable"}
        </Button>
      </div>

      <div className="mt-3 sm:mt-4 flex items-center justify-center">
        {dataUrl ? (
          <div className="rounded-xl sm:rounded-2xl bg-white p-2 sm:p-3">
            <img src={dataUrl} alt="QR code for your LoveWheel link" className="h-[180px] w-[180px] sm:h-[220px] sm:w-[220px]" />
          </div>
        ) : (
          <div className="w-full rounded-2xl border border-white/12 bg-white/5 p-3 sm:p-4 text-xs text-white/60">
            {loading ? "Generating your QR code…" : "Couldn't generate QR code on this device."}
          </div>
        )}
      </div>

      <div className="mt-2 sm:mt-3 text-[10px] sm:text-[11px] text-white/55">Tip: on iPhone, long-press the QR image and save it.</div>
    </div>
  );
}

/** ===== LinkReady popup (footer sticky on mobile) ===== */

function LinkReadyPopup({
  open,
  onOpenChange,
  slug,
  onCopy,
  onPay,
  reduceAll,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  slug: string;
  onCopy: () => void;
  onPay: () => void;
  reduceAll: boolean;
}) {
  const dialogRef = React.useRef<HTMLDivElement | null>(null);
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const path = `/g/${slug}`;
  const fullLink = origin ? `${origin}${path}` : path;

  React.useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => dialogRef.current?.focus(), 30);
    return () => window.clearTimeout(t);
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onOpenChange(false);
          }}
        >
          <motion.div className="absolute inset-0 bg-black/55 backdrop-blur-[10px]" />

          <motion.div
            role="dialog"
            aria-modal="true"
            tabIndex={-1}
            ref={dialogRef}
            onKeyDown={(e) => e.key === "Escape" && onOpenChange(false)}
            className={cx(
              "relative w-full max-w-xl overflow-hidden rounded-[24px] sm:rounded-[32px] border border-white/12 bg-[#070A1B]/85 shadow-[0_40px_160px_-70px_rgba(0,0,0,0.85)] backdrop-blur",
              "focus:outline-none focus:ring-2 focus:ring-white/15"
            )}
            initial={reduceAll ? { opacity: 0 } : { opacity: 0, y: 14, scale: 0.99, filter: "blur(10px)" }}
            animate={reduceAll ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
            exit={reduceAll ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.99, filter: "blur(10px)" }}
            transition={{ duration: reduceAll ? 0.14 : 0.30, ease: "easeOut" }}
          >
            <div className="relative max-h-[85svh] overflow-hidden flex flex-col">
              {/* Header */}
              <div className="p-4 sm:p-6 border-b border-white/10">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/6 px-3 py-1 text-xs text-white/70 backdrop-blur">
                      <span className="h-1.5 w-1.5 rounded-full bg-fuchsia-400" />
                      Link ready ✨
                    </div>
                    <div className="mt-2 text-xl sm:text-2xl font-semibold tracking-tight text-white/90">Your moment is live.</div>
                    <div className="text-xs sm:text-sm text-white/60">Save QR, then pay to unlock the premium reveal.</div>
                    <div className="text-[10px] sm:text-[11px] text-white/55">{PRICE_MICROCOPY}</div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onOpenChange(false)}
                    className={cx(
                      "inline-flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full border border-white/12 bg-white/6 text-white/70 backdrop-blur transition",
                      "hover:bg-white/10 hover:text-white active:scale-[0.98]",
                      "focus:outline-none focus:ring-2 focus:ring-white/15"
                    )}
                    aria-label="Close"
                  >
                    <IconX className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-auto p-4 sm:p-6 overscroll-contain" style={{ WebkitOverflowScrolling: "touch" } as any}>
                <div className="rounded-2xl border border-white/12 bg-white/6 p-3">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[10px] sm:text-[11px] text-white/55">Shareable link</div>
                      <div className="mt-1 flex items-center gap-2 text-xs sm:text-sm text-white/80">
                        <IconLink className="h-4 w-4 text-white/55" />
                        <div className="min-w-0 truncate">
                          <span className="text-white/55">{origin ? `${origin}` : ""}</span>
                          <span className="font-mono">{path}</span>
                        </div>
                      </div>
                    </div>

                    <Button type="button" variant="secondary" className="rounded-full text-sm px-3 py-2" onClick={onCopy}>
                      Copy
                    </Button>
                  </div>
                </div>

                <QrCodeBlock value={fullLink} />

                <div className="mt-3 text-[10px] sm:text-[11px] text-white/55">
                  Pro tip: after payment, add a 2–3s "premium" animation before the reveal. It makes the moment land.
                </div>
              </div>

              {/* Footer sticky */}
              <div className="sticky bottom-0 border-t border-white/10 bg-[#070A1B]/92 backdrop-blur p-3 sm:p-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-full border-white/15 bg-white/0 text-white hover:bg-white/10 text-sm px-3 py-2"
                    onClick={() => onOpenChange(false)}
                  >
                    Close
                  </Button>
                  <Button type="button" variant="secondary" className="rounded-full text-sm px-3 py-2" onClick={onCopy}>
                    Copy link
                  </Button>
                  <Button
                    type="button"
                    className="rounded-full bg-gradient-to-r from-fuchsia-500 via-pink-500 to-violet-500 text-white hover:opacity-95 text-sm px-3 py-2 col-span-2 sm:col-span-1"
                    onClick={onPay}
                  >
                    Pay & unlock
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** ===== BuilderModal (real mobile modal: header fixed, body scroll, footer) ===== */

function BuilderModal({
  open,
  onOpenChange,
  children,
  reduceAll,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  children: React.ReactNode;
  reduceAll: boolean;
}) {
  const dialogRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const t = window.setTimeout(() => dialogRef.current?.focus(), 30);
    return () => {
      document.body.style.overflow = prev;
      window.clearTimeout(t);
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onOpenChange(false);
          }}
        >
          <motion.div className="absolute inset-0 bg-black/55 backdrop-blur-[10px]" />

          <motion.div
            role="dialog"
            aria-modal="true"
            tabIndex={-1}
            ref={dialogRef}
            onKeyDown={(e) => e.key === "Escape" && onOpenChange(false)}
            className={cx(
              "relative w-full max-w-3xl overflow-hidden rounded-[24px] sm:rounded-[34px] border border-white/12 bg-[#070A1B]/85 shadow-[0_70px_240px_-120px_rgba(0,0,0,0.95)] backdrop-blur",
              "focus:outline-none focus:ring-2 focus:ring-white/15"
            )}
            style={{ height: "92svh" }}
            initial={reduceAll ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.99, filter: "blur(12px)" }}
            animate={reduceAll ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
            exit={reduceAll ? { opacity: 0 } : { opacity: 0, y: 14, scale: 0.99, filter: "blur(12px)" }}
            transition={{ duration: reduceAll ? 0.14 : 0.30, ease: "easeOut" }}
          >
            <div className="h-full w-full overflow-hidden flex flex-col">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** ===== Confirm preview ===== */

function ConfirmPreview({
  red,
  duration,
  startDate,
  letter,
  photoPreviewUrl,
  reduceAll,
}: {
  red: string;
  duration: string;
  startDate: string;
  letter: string;
  photoPreviewUrl: string | null;
  reduceAll: boolean;
}) {
  const lines = letter.trim() ? letter.trim().split("\n").filter(Boolean).slice(0, 10) : [];

  return (
    <div className="space-y-4">
      <div className="rounded-2xl sm:rounded-3xl border border-white/12 bg-white/6 p-4 sm:p-6 shadow-sm backdrop-blur">
        <div className="mb-2 flex items-center justify-between text-xs text-white/60">
          <span className="inline-flex items-center gap-2">
            <IconHeart className="h-4 w-4 text-fuchsia-300" />
            Your line
          </span>
          <span className="h-2 w-2 rounded-full bg-fuchsia-400/80" />
        </div>
        <div className="text-lg sm:text-2xl font-semibold leading-snug tracking-tight text-white/90">{red.trim() ? `"${red.trim()}"` : "—"}</div>
        <div className="mt-2 text-[11px] text-white/60">Make it specific. One private detail beats ten generic compliments.</div>
      </div>

      <div className="rounded-2xl sm:rounded-3xl border border-white/12 bg-white/6 p-4 sm:p-6 shadow-sm backdrop-blur">
        <div className="mb-2 flex items-center justify-between text-xs text-white/60">
          <span className="inline-flex items-center gap-2">
            <IconSpark className="h-4 w-4 text-emerald-300" />
            Time together
          </span>
          <span className="h-2 w-2 rounded-full bg-emerald-300/80" />
        </div>
        <div className="text-xs text-white/60">Since {startDate || "—"}</div>
        <div className="mt-1 text-2xl sm:text-4xl font-semibold tracking-tight text-white/90">{duration}</div>
        <div className="mt-2 text-[11px] text-white/60">This number is simple — and it lands every time.</div>
      </div>

      <div className="rounded-2xl sm:rounded-3xl border border-white/12 bg-white/6 p-4 sm:p-6 shadow-sm backdrop-blur">
        <div className="mb-3 flex items-center justify-between text-xs text-white/60">
          <span className="inline-flex items-center gap-2">
            <IconPhoto className="h-4 w-4 text-sky-300" />
            The photo
          </span>
          <span className="h-2 w-2 rounded-full bg-sky-300/80" />
        </div>

        {photoPreviewUrl ? (
          <div className="relative overflow-hidden rounded-xl sm:rounded-2xl border border-white/12 bg-white/5">
            <img src={photoPreviewUrl} alt="Couple photo preview" className="h-[180px] sm:h-[220px] w-full object-cover" />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
            <div className="pointer-events-none absolute bottom-2 left-2 text-xs text-white/85">Revealed after payment.</div>
          </div>
        ) : (
          <div className="rounded-xl sm:rounded-2xl border border-white/12 bg-white/5 p-3 sm:p-4 text-sm text-white/60">—</div>
        )}

        <div className="mt-2 text-xs text-white/60">Tip: pick a photo that instantly brings you back.</div>
      </div>

      <div className="rounded-2xl sm:rounded-3xl border border-white/12 bg-white/6 p-4 sm:p-6 shadow-sm backdrop-blur">
        <div className="mb-2 flex items-center justify-between text-xs text-white/60">
          <span className="inline-flex items-center gap-2">
            <IconSpark className="h-4 w-4 text-amber-200" />
            The letter
          </span>
          <span className="h-2 w-2 rounded-full bg-amber-200/80" />
        </div>

        <div className="space-y-2">
          {lines.map((l, i) =>
            reduceAll ? (
              <div key={i} className="text-sm leading-relaxed text-white/85">
                {l}
              </div>
            ) : (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.02 }}
                className="text-sm leading-relaxed text-white/85"
              >
                {l}
              </motion.div>
            )
          )}
        </div>

        <div className="mt-4 text-xs text-white/60">
          The premium <span className="text-white/80">spin → reveal</span> unlocks after payment.
        </div>
      </div>
    </div>
  );
}

/** ===== Main page ===== */

export default function CreatePage() {
  const reduceMotion = useReducedMotion();
  const [isMobile, setIsMobile] = React.useState(false);
  const reduceAll = !!reduceMotion || isMobile;

  React.useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check, { passive: true } as any);
    return () => window.removeEventListener("resize", check as any);
  }, []);

  const [step, setStep] = React.useState<StepKey>("hero");
  const [builderOpen, setBuilderOpen] = React.useState(false);

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [created, setCreated] = React.useState<{ id: string; slug: string } | null>(null);

  const [typing, setTyping] = React.useState(false);
  const typingTimer = React.useRef<number | null>(null);

  const [photoFile, setPhotoFile] = React.useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const [linkPopupOpen, setLinkPopupOpen] = React.useState(false);

  // Info popup
  const [infoOpen, setInfoOpen] = React.useState(false);
  const [infoTitle, setInfoTitle] = React.useState("Info");
  const [infoBody, setInfoBody] = React.useState<React.ReactNode>(null);
  const [infoCta, setInfoCta] = React.useState<{ label?: string; onClick?: () => void }>({});

  // Section refs
  const faqRef = React.useRef<HTMLDivElement | null>(null);
  const howItWorksRef = React.useRef<HTMLDivElement | null>(null);

  // Form (useWatch: less re-render trash than form.watch())
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { redPhrase: "", relationshipStartAt: "", loveLetter: "" },
    mode: "onChange",
  });

  const redPhrase = useWatch({ control: form.control, name: "redPhrase" }) || "";
  const relationshipStartAt = useWatch({ control: form.control, name: "relationshipStartAt" }) || "";
  const loveLetter = useWatch({ control: form.control, name: "loveLetter" }) || "";

  const a = stepAccent(step);

  const startDate = relationshipStartAt ? new Date(dateToStableIso(relationshipStartAt)) : null;
  const duration = startDate ? formatDuration(startDate, new Date()) : "—";

  const redLen = redPhrase.trim().length;
  const letterLen = loveLetter.trim().length;

  const filledCount =
    (redLen >= 3 ? 1 : 0) + (relationshipStartAt ? 1 : 0) + (photoFile ? 1 : 0) + (letterLen >= 30 ? 1 : 0);
  const progress = Math.round((filledCount / 4) * 100);

  const redRef = React.useRef<HTMLInputElement | null>(null);
  const dateRef = React.useRef<HTMLInputElement | null>(null);
  const letterRef = React.useRef<HTMLTextAreaElement | null>(null);

  const stepOrder: StepKey[] = ["hero", "red", "green", "photo", "yellow", "confirm"];

  function pingTyping() {
    setTyping(true);
    if (typingTimer.current) window.clearTimeout(typingTimer.current);
    typingTimer.current = window.setTimeout(() => setTyping(false), 420);
  }

  function canAdvanceFrom(s: StepKey) {
    if (s === "hero") return true;
    if (s === "red") return redLen >= 3;
    if (s === "green") return !!relationshipStartAt;
    if (s === "photo") return !!photoFile;
    if (s === "yellow") return letterLen >= 30;
    if (s === "confirm") return form.formState.isValid && !!photoFile;
    return false;
  }

  async function doStepChange(nextStep: StepKey) {
    softHaptic([8, 12, 8]);
    setStep(nextStep);
  }

  async function next() {
    if (!canAdvanceFrom(step)) {
      if (step === "red") await form.trigger("redPhrase");
      if (step === "green") await form.trigger("relationshipStartAt");
      if (step === "yellow") await form.trigger("loveLetter");
      if (step === "photo") toast.message("Pick a photo that *says* something.", { description: "The reveal moment lives or dies on this choice." });

      toast.message("Almost there…", { description: "Complete this step to continue." });
      softHaptic(18);
      return;
    }
    const i = stepOrder.indexOf(step);
    const nextStep = stepOrder[Math.min(stepOrder.length - 1, i + 1)];
    await doStepChange(nextStep);
  }

  async function back() {
    const i = stepOrder.indexOf(step);
    const prev = stepOrder[Math.max(0, i - 1)];
    await doStepChange(prev);
  }

  // Focus inputs (small delay avoids layout thrash)
  React.useEffect(() => {
    const t = window.setTimeout(() => {
      if (!builderOpen) return;
      if (step === "red") redRef.current?.focus();
      if (step === "green") dateRef.current?.focus();
      if (step === "yellow") letterRef.current?.focus();
    }, 80);
    return () => window.clearTimeout(t);
  }, [step, builderOpen]);

  // Keyboard nav
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!builderOpen) return;

      if (e.key === "Escape") {
        if (linkPopupOpen) {
          e.preventDefault();
          setLinkPopupOpen(false);
          softHaptic(8);
        } else {
          e.preventDefault();
          setBuilderOpen(false);
          softHaptic(8);
        }
        return;
      }

      if (e.key !== "Enter") return;

      if (step === "yellow") {
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          next();
        }
        return;
      }

      if (step === "red" || step === "green" || step === "photo" || step === "confirm") {
        e.preventDefault();
        next();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [builderOpen, step, linkPopupOpen]);

  // Cleanup preview URL
  React.useEffect(() => {
    return () => {
      if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
    };
  }, [photoPreviewUrl]);

  async function setPhoto(file: File | null) {
    if (photoPreviewUrl) {
      URL.revokeObjectURL(photoPreviewUrl);
      setPhotoPreviewUrl(null);
    }

    if (!file) {
      setPhotoFile(null);
      return;
    }

    if (!isValidImage(file)) {
      toast.error("That file won't work.", { description: "Choose an image (JPG/PNG/WebP)." });
      softHaptic(22);
      return;
    }

    if (file.size > MAX_BYTES) {
      toast.error("That image is too big.", { description: `Keep it under ${MAX_PHOTO_MB}MB.` });
      softHaptic(22);
      return;
    }

    setPhotoFile(file);

    // IMPORTANT: compress preview for mobile smoothness
    try {
      toast.message("Preparing preview…", { description: "Optimizing for smooth mobile performance." });
      const blob = await compressForPreview(file, 1280, 0.82);
      const url = URL.createObjectURL(blob);
      setPhotoPreviewUrl(url);
    } catch {
      // fallback
      const url = URL.createObjectURL(file);
      setPhotoPreviewUrl(url);
    }

    toast.message("Photo locked in.", { description: "Pick the one that instantly brings you back." });
    softHaptic([10, 14, 10]);
    pingTyping();
  }

  const handlePhotoChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    void setPhoto(file);
  }, [photoPreviewUrl]);

  const quickLine = React.useMemo(
    () => [
      "I'd choose you again. Every time.",
      "You feel like home — even in chaos.",
      "My favorite plan is still: you.",
      "You're the calm I didn't know I needed.",
      "If I could replay one thing, it'd be us.",
      "I'm proud of us. Always.",
    ],
    []
  );

  const quickPrompts = React.useMemo(
    () => [
      "The moment I knew it was you was…",
      "My favorite memory with you is…",
      "Thank you for…",
      "I love the way you…",
      "Here's what I promise you…",
      "If we're old someday, I hope we still…",
    ],
    []
  );

  const handleQuickLineClick = React.useCallback(
    (text: string) => {
      // avoid validation + heavy rerender while tapping chips
      form.setValue("redPhrase", text, { shouldDirty: true, shouldTouch: true, shouldValidate: false });
      // validate after a tick
      window.setTimeout(() => void form.trigger("redPhrase"), 0);
      toast.message("Inserted", { description: "Now tweak it to sound like you." });
      pingTyping();
      window.setTimeout(() => redRef.current?.focus(), 40);
    },
    [form]
  );

  const handleQuickPromptClick = React.useCallback(
    (text: string) => {
      const curr = form.getValues("loveLetter") || "";
      const nextVal = curr.trim() ? curr.replace(/\s*$/, "") + "\n" + text + " " : text + " ";
      form.setValue("loveLetter", nextVal, { shouldDirty: true, shouldTouch: true, shouldValidate: false });
      window.setTimeout(() => void form.trigger("loveLetter"), 0);
      toast.message("Added", { description: "Now make it yours with details." });
      pingTyping();
      window.setTimeout(() => letterRef.current?.focus(), 40);
    },
    [form]
  );

  async function uploadPhotoToSupabase(file: File, giftId: string) {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("giftId", giftId);

    const res = await fetch("/api/upload-photo", { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error ?? "Photo upload failed.");
    return data as { url: string; path: string };
  }

  async function onCreate(values: FormValues) {
    if (!photoFile) {
      toast.error("Add a photo to continue.", { description: "This is the reveal moment — don't skip it." });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/gifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          redPhrase: values.redPhrase.trim(),
          loveLetter: values.loveLetter.trim(),
          relationshipStartAt: dateToStableIso(values.relationshipStartAt),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to create.");

      await uploadPhotoToSupabase(photoFile, data.id);

      setCreated({ id: data.id, slug: data.slug });
      setLinkPopupOpen(true);

      toast.success("Link created.", { description: "Save your QR code, then unlock the premium reveal ✨" });
      softHaptic([10, 14, 10]);
    } catch (e: any) {
      toast.error(e?.message ?? "Something went wrong.");
      softHaptic(22);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function payAndUnlock() {
    if (!created) return;
    softHaptic([10, 14, 10]);

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ giftId: created.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Checkout failed");
      window.location.href = data.url;
    } catch (e: any) {
      toast.error(e?.message ?? "Could not start checkout.");
      softHaptic(22);
    }
  }

  async function copyLink() {
    if (!created) return;
    const link = `${window.location.origin}/g/${created.slug}`;
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Link copied.", { description: "Send it when you want the moment to land." });
      softHaptic(10);
    } catch {
      toast.error("Couldn't copy.");
      softHaptic(22);
    }
  }

  const canSubmit = form.formState.isValid && !isSubmitting && !!photoFile;

  function openBuilder() {
    setBuilderOpen(true);
    setStep("red");
    softHaptic([8, 12, 8]);
  }

  function openInfo(title: string, body: React.ReactNode, ctaLabel?: string, cta?: () => void) {
    setInfoTitle(title);
    setInfoBody(body);
    setInfoCta({ label: ctaLabel, onClick: cta });
    setInfoOpen(true);
    softHaptic([8, 12, 8]);
  }

  function openPricing() {
    openInfo(
      "Pricing",
      <div className="space-y-3">
        <div className="text-white/85">
          LoveWheel costs <span className="text-white font-semibold">{PRICE_USD}</span> to unlock the premium spin → reveal.
        </div>
        <div>One-time payment. No subscription.</div>
        <div className="text-white/80">After unlock, the reveal becomes part of the surprise.</div>
      </div>,
      "Start creating",
      openBuilder
    );
  }

  function openQrReader() {
    openInfo(
      "QR Reader",
      <div className="space-y-3">
        <div>We generate a QR code for your LoveWheel link, so you can print it and place it inside a real letter.</div>
        <div className="text-white/80">Digital surprise. Physical delivery. Unfair combo.</div>
      </div>,
      "Create a moment",
      openBuilder
    );
  }

  function openFaqItem(which: string) {
    const map: Record<string, { title: string; body: React.ReactNode }> = {
      "what-is": {
        title: "What exactly is LoveWheel?",
        body: (
          <div className="space-y-3">
            <div>It's a private gift page you create in minutes: a short line, a "time together" counter, a photo reveal, and a love letter.</div>
            <div>Your partner spins the wheel and discovers each piece. It feels like a game, but lands like a memory.</div>
          </div>
        ),
      },
      "is-it-private": {
        title: "Is it private?",
        body: (
          <div className="space-y-3">
            <div>Yes. The link is unlisted (only people with the link can open it).</div>
            <div className="text-white/80">Pro tip: send it at the exact moment you want it to land.</div>
          </div>
        ),
      },
      "what-if-they-share": {
        title: "What if they share the link?",
        body: (
          <div className="space-y-3">
            <div>Most people keep it between you two. If you want, you can create a new moment anytime.</div>
          </div>
        ),
      },
      "does-it-expire": {
        title: "Does it expire?",
        body: (
          <div className="space-y-3">
            <div>No. The counter keeps running, and the page stays live.</div>
            <div className="text-white/80">It's a gift that quietly gets better with time.</div>
          </div>
        ),
      },
    };
    const item = map[which] ?? { title: "FAQ", body: <div>More answers coming soon.</div> };
    openInfo(item.title, item.body);
  }

  function openHowItWorksItem(which: string) {
    const map: Record<string, { title: string; body: React.ReactNode }> = {
      build: {
        title: "How it works: Build",
        body: (
          <div className="space-y-3">
            <div>You write four things:</div>
            <ul className="list-disc pl-5 space-y-1 text-white/80">
              <li>A short line that hits.</li>
              <li>The date your story began (we turn it into a live counter).</li>
              <li>A photo (the "oh wow" reveal).</li>
              <li>A letter they'll keep.</li>
            </ul>
            <div className="text-white/80">You don't need to be poetic. You just need one true detail.</div>
          </div>
        ),
      },
      share: {
        title: "How it works: Share",
        body: (
          <div className="space-y-3">
            <div>You get a link instantly. Send it however you want:</div>
            <ul className="list-disc pl-5 space-y-1 text-white/80">
              <li>Text message</li>
              <li>DM</li>
              <li>A note inside a gift</li>
              <li>A printed QR code in a letter</li>
            </ul>
            <div className="text-white/80">The best delivery is the unexpected one.</div>
          </div>
        ),
      },
      reveal: {
        title: "How it works: Reveal",
        body: (
          <div className="space-y-3">
            <div>Your partner spins. Each slice reveals a piece. The premium unlock makes the moment feel cinematic.</div>
            <div className="text-white/80">A tiny pause before the reveal turns "cute" into "I'm not crying, you are."</div>
          </div>
        ),
      },
    };
    const item = map[which] ?? { title: "How it works", body: <div>More details soon.</div> };
    openInfo(item.title, item.body);
  }

  const headline =
    step === "hero"
      ? "Turn your story into a premium reveal."
      : step === "red"
      ? "Write the line that stops them."
      : step === "green"
      ? "Pick the day your story began."
      : step === "photo"
      ? "Choose the photo that says everything."
      : step === "yellow"
      ? "Write the letter they'll keep."
      : "Preview it like it's already theirs.";

  const sub =
    step === "hero"
      ? "One line. One date. One photo. One letter. We turn it into a cinematic spin → reveal moment."
      : step === "red"
      ? "Not generic. Not polite. Something only you could say."
      : step === "green"
      ? "This powers the live counter — a detail that hits hard."
      : step === "photo"
      ? "Pick the most meaningful one. This is the moment they'll remember."
      : step === "yellow"
      ? "One memory + one gratitude + one promise. Keep it real."
      : "If it feels right, create the link — we'll open your unlock popup immediately.";

  const heroPhrases = React.useMemo(
    () => ["I'd choose you again.", "You feel like home.", "My favorite plan is still: you.", "I'll never stop choosing us.", "Somehow, it's always you."],
    []
  );
  const heroPhrase = heroPhrases[clamp(redLen % heroPhrases.length, 0, heroPhrases.length - 1)];

  // Scene motion
  const scene = {
    initial: reduceAll ? { opacity: 0 } : { opacity: 0, y: 14, filter: "blur(8px)", scale: 0.994 },
    animate: reduceAll ? { opacity: 1 } : { opacity: 1, y: 0, filter: "blur(0px)", scale: 1 },
    exit: reduceAll ? { opacity: 0 } : { opacity: 0, y: -8, filter: "blur(8px)", scale: 0.994 },
    transition: { duration: reduceAll ? 0.14 : 0.34, ease: "easeOut" as const },
  };

  return (
    <div className="min-h-screen text-white overflow-x-hidden">
      <NeonBg reduceAll={reduceAll} />

      <InfoModal
        open={infoOpen}
        onOpenChange={(v) => {
          setInfoOpen(v);
          if (!v) softHaptic(8);
        }}
        title={infoTitle}
        content={infoBody}
        ctaLabel={infoCta.label}
        onCta={infoCta.onClick}
        reduceAll={reduceAll}
      />

      {created && (
        <LinkReadyPopup
          open={linkPopupOpen}
          onOpenChange={(v) => {
            setLinkPopupOpen(v);
            if (v) softHaptic([8, 12, 8]);
          }}
          slug={created.slug}
          onCopy={copyLink}
          onPay={payAndUnlock}
          reduceAll={reduceAll}
        />
      )}

      {/* Top nav */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#050816]/85 backdrop-blur supports-[backdrop-filter]:bg-[#050816]/55">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-2xl bg-white/8 ring-1 ring-white/12 flex items-center justify-center">
              <span className="text-fuchsia-300">
                <IconHeart className="h-4 w-4" />
              </span>
            </div>
            <div className="text-sm font-semibold tracking-tight">
              Love<span className="text-fuchsia-300">Wheel</span>
            </div>
          </div>

          <nav className="hidden items-center gap-4 text-sm text-white/70 md:flex">
            <button type="button" className="hover:text-white transition" onClick={openPricing}>Pricing</button>
            <button
              type="button"
              className="hover:text-white transition"
              onClick={() => {
                faqRef.current?.scrollIntoView({ behavior: "smooth" });
                softHaptic(8);
              }}
            >
              FAQ
            </button>
            <button
              type="button"
              className="hover:text-white transition"
              onClick={() => {
                howItWorksRef.current?.scrollIntoView({ behavior: "smooth" });
                softHaptic(8);
              }}
            >
              How it works
            </button>
            <button type="button" className="hover:text-white transition" onClick={openQrReader}>QR Reader</button>
          </nav>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              onClick={openBuilder}
              className="rounded-full bg-gradient-to-r from-fuchsia-500 via-pink-500 to-violet-500 text-white hover:opacity-95 text-sm px-4 py-2"
            >
              Create
            </Button>

            <button
              className="md:hidden p-2"
              onClick={() => {
                openInfo(
                  "Menu",
                  <div className="space-y-2">
                    <button className="w-full text-left p-3 rounded-xl bg-white/5 hover:bg-white/10 transition" onClick={openPricing}>Pricing</button>
                    <button
                      className="w-full text-left p-3 rounded-xl bg-white/5 hover:bg-white/10 transition"
                      onClick={() => {
                        setInfoOpen(false);
                        setTimeout(() => faqRef.current?.scrollIntoView({ behavior: "smooth" }), 80);
                      }}
                    >
                      FAQ
                    </button>
                    <button
                      className="w-full text-left p-3 rounded-xl bg-white/5 hover:bg-white/10 transition"
                      onClick={() => {
                        setInfoOpen(false);
                        setTimeout(() => howItWorksRef.current?.scrollIntoView({ behavior: "smooth" }), 80);
                      }}
                    >
                      How it works
                    </button>
                    <button className="w-full text-left p-3 rounded-xl bg-white/5 hover:bg-white/10 transition" onClick={openQrReader}>QR Reader</button>
                  </div>
                );
              }}
            >
              <IconMenu className="h-5 w-5 text-white/70" />
            </button>
          </div>
        </div>
      </header>

      {/* HERO */}
      <main className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
        <div className="grid items-center gap-8 lg:grid-cols-2">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/6 px-3 py-1 text-xs text-white/70 backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-fuchsia-400" />
              Designed to land like a memory
            </div>

            <h1 className="mt-4 text-2xl font-semibold tracking-tight sm:text-3xl md:text-4xl">
              Surprise{" "}
              <span className="bg-gradient-to-r from-white via-fuchsia-200 to-pink-200 bg-clip-text text-transparent">
                your love
              </span>
            </h1>

            <p className="mt-3 max-w-xl text-white/65 text-sm sm:text-base">
              Create a live relationship counter, a private line, a photo reveal, and a letter. Share via link or QR — then unlock
              the premium spin → reveal.
            </p>

            <div className="mt-5 flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-2">
              <Button
                type="button"
                onClick={openBuilder}
                className="h-11 rounded-full px-6 bg-gradient-to-r from-fuchsia-500 via-pink-500 to-violet-500 text-white shadow-[0_20px_80px_-40px_rgba(255,64,169,0.75)] hover:opacity-95 w-full sm:w-auto"
              >
                Start creating
              </Button>

              <Button
                type="button"
                variant="secondary"
                className="h-11 rounded-full border border-white/12 bg-white/6 text-white hover:bg-white/10 w-full sm:w-auto text-sm px-4"
                onClick={() => toast.message("Quick tip", { description: "The best gifts feel like one private detail. Start there." })}
              >
                Quick tip
              </Button>

              <button
                type="button"
                onClick={openPricing}
                className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/6 px-3 py-2 text-[11px] text-white/70 backdrop-blur transition hover:bg-white/10 w-full sm:w-auto justify-center"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-fuchsia-400" />
                {PRICE_MICROCOPY}
              </button>
            </div>

            <div className="mt-6 grid max-w-xl gap-2 sm:grid-cols-3">
              <button
                type="button"
                onClick={() =>
                  openInfo(
                    "How long does it take?",
                    <div className="space-y-3">
                      <div>Usually 2–3 minutes.</div>
                      <div className="text-white/80">The best version is the honest one.</div>
                    </div>,
                    "Start now",
                    openBuilder
                  )
                }
                className="text-left rounded-2xl border border-white/12 bg-white/6 p-3 sm:p-4 backdrop-blur hover:bg-white/10 transition"
              >
                <div className="text-[11px] text-white/55">Takes</div>
                <div className="mt-1 text-base sm:text-lg font-semibold text-white/90">2–3 min</div>
              </button>

              <button
                type="button"
                onClick={openQrReader}
                className="text-left rounded-2xl border border-white/12 bg-white/6 p-3 sm:p-4 backdrop-blur hover:bg-white/10 transition"
              >
                <div className="text-[11px] text-white/55">Share</div>
                <div className="mt-1 text-base sm:text-lg font-semibold text-white/90">Link + QR</div>
              </button>

              <button
                type="button"
                onClick={openPricing}
                className="text-left rounded-2xl border border-white/12 bg-white/6 p-3 sm:p-4 backdrop-blur hover:bg-white/10 transition"
              >
                <div className="text-[11px] text-white/55">Unlock</div>
                <div className="mt-1 text-base sm:text-lg font-semibold text-white/90">{PRICE_USD}</div>
              </button>
            </div>
          </div>

          {/* Mobile preview (lightweight) */}
          <div className="lg:hidden rounded-3xl border border-white/12 bg-white/6 p-4 backdrop-blur">
            <div className="text-sm text-white/70 mb-2">Preview</div>
            <div className="text-2xl font-semibold text-white/90">"{heroPhrase}"</div>
            <div className="text-xs text-white/55 mt-2">Build → Share → Pay → Reveal</div>
          </div>

          {/* Desktop placeholder (your HeroArt can come back later, but it’s heavy) */}
          <div className="hidden lg:block rounded-[34px] border border-white/12 bg-white/6 p-6 backdrop-blur">
            <div className="text-xs text-white/60">Hero mock</div>
            <div className="mt-2 text-2xl font-semibold text-white/90">"{heroPhrase}"</div>
            <div className="mt-3 text-sm text-white/65">Keep desktop fancy. Keep mobile fast.</div>
          </div>
        </div>

        <div className="mt-8 flex items-center justify-center gap-6 text-white/55">
          <div className="hidden sm:block text-xs">+723 happy couples</div>
        </div>

        {/* Pricing/QR tiles */}
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <button
            type="button"
            onClick={openPricing}
            className="text-left rounded-2xl sm:rounded-3xl border border-white/12 bg-white/6 p-4 sm:p-6 backdrop-blur transition hover:bg-white/10"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/6 px-3 py-1 text-xs text-white/70 backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-fuchsia-400" />
              Pricing
            </div>
            <div className="mt-3 text-xl sm:text-2xl font-semibold text-white/90">{PRICE_USD} to unlock</div>
            <div className="mt-2 text-sm text-white/65">One-time. No subscription.</div>
          </button>

          <button
            type="button"
            onClick={openQrReader}
            className="text-left rounded-2xl sm:rounded-3xl border border-white/12 bg-white/6 p-4 sm:p-6 backdrop-blur transition hover:bg-white/10"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/6 px-3 py-1 text-xs text-white/70 backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
              QR Reader
            </div>
            <div className="mt-3 text-xl sm:text-2xl font-semibold text-white/90">Print it. Seal it. Deliver it.</div>
            <div className="mt-2 text-sm text-white/65">We generate a QR code for your link.</div>
          </button>
        </div>

        {/* FAQ */}
        <div ref={faqRef} className="mt-8 sm:mt-10 scroll-mt-24">
          <div className="text-lg sm:text-xl font-semibold text-white/90">FAQ</div>
          <div className="mt-3 grid gap-2 sm:gap-3 md:grid-cols-2">
            {[
              { id: "what-is", q: "What exactly is LoveWheel?" },
              { id: "is-it-private", q: "Is it private?" },
              { id: "what-if-they-share", q: "What if they share the link?" },
              { id: "does-it-expire", q: "Does it expire?" },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => openFaqItem(item.id)}
                className="text-left rounded-xl sm:rounded-2xl border border-white/12 bg-white/6 p-3 sm:p-4 backdrop-blur transition hover:bg-white/10"
              >
                <div className="text-sm font-semibold text-white/90">{item.q}</div>
                <div className="mt-1 text-xs text-white/60">Click to open the full answer.</div>
              </button>
            ))}
          </div>
        </div>

        {/* How it works */}
        <div ref={howItWorksRef} className="mt-8 sm:mt-10 scroll-mt-24">
          <div className="text-lg sm:text-xl font-semibold text-white/90">How it works</div>
          <div className="mt-3 grid gap-2 sm:gap-3 md:grid-cols-3">
            {[
              { id: "build", title: "Build", desc: "Write the four pieces that make it real." },
              { id: "share", title: "Share", desc: "Send by link or a printed QR in a letter." },
              { id: "reveal", title: "Reveal", desc: "They spin. They discover. It lands." },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => openHowItWorksItem(item.id)}
                className="text-left rounded-xl sm:rounded-2xl border border-white/12 bg-white/6 p-4 backdrop-blur transition hover:bg-white/10"
              >
                <div className="inline-flex items-center gap-2 text-xs text-white/60">
                  <IconSpark className="h-4 w-4 text-white/55" />
                  Step
                </div>
                <div className="mt-2 text-base sm:text-lg font-semibold text-white/90">{item.title}</div>
                <div className="mt-1 text-sm text-white/65">{item.desc}</div>
                <div className="mt-2 text-xs text-white/60">Click to open details.</div>
              </button>
            ))}
          </div>
        </div>
      </main>

      {/* BUILDER MODAL */}
      <BuilderModal
        open={builderOpen}
        onOpenChange={(v) => {
          setBuilderOpen(v);
          if (v) softHaptic([8, 12, 8]);
          else softHaptic(8);
        }}
        reduceAll={reduceAll}
      >
        {/* Header */}
        <div className="px-4 sm:px-6 py-4 border-b border-white/10">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/6 px-3 py-1 text-xs text-white/70 backdrop-blur">
                <span className={cx("h-1.5 w-1.5 rounded-full", a.dot)} />
                Premium builder
              </div>
              <h2 className="mt-3 text-xl sm:text-2xl font-semibold tracking-tight text-white/90">{headline}</h2>
              <p className="mt-2 text-xs sm:text-sm text-white/60">{sub}</p>
            </div>

            <button
              type="button"
              onClick={() => setBuilderOpen(false)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/12 bg-white/6 text-white/70 hover:bg-white/10 hover:text-white transition"
              aria-label="Close"
            >
              <IconX className="h-4 w-4" />
            </button>
          </div>

          <MinimalProgress step={step} progress={progress} reduceAll={reduceAll} />
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto px-4 sm:px-6 py-4 overscroll-contain" style={{ WebkitOverflowScrolling: "touch" } as any}>
          <div className="relative">
            {!reduceAll && typing && (
              <div className="pointer-events-none absolute -inset-2 rounded-[34px] blur-2xl bg-gradient-to-r from-fuchsia-500/[0.12] via-pink-500/[0.08] to-violet-500/[0.08]" />
            )}

            <div className={cx("relative rounded-[24px] sm:rounded-[32px] ring-1", a.ring)}>
              <Card className="border border-white/12 bg-white/6 shadow-[0_30px_140px_-80px_rgba(0,0,0,0.9)] backdrop-blur">
                <CardContent className="relative p-4 sm:p-6">
                  <AnimatePresence mode="wait">
                    {/* STEP: RED */}
                    {step === "red" && (
                      <motion.div key="red" {...scene} className="space-y-4 sm:space-y-6">
                        <div className="flex items-end justify-between gap-3">
                          <div>
                            <div className="text-xs text-white/55">Step 1 of 4</div>
                            <div className="mt-1 text-lg sm:text-2xl font-semibold tracking-tight text-white/90">Write the line that stops them.</div>
                            <div className="mt-2 text-xs sm:text-sm text-white/60">Aim for <span className="text-white/85">specific</span>, not perfect.</div>
                          </div>
                          <div className="rounded-2xl border border-white/12 bg-white/6 px-3 py-2 text-xs text-white/60">
                            <span className="text-white/85">{redLen}</span>/80
                          </div>
                        </div>

                        <div className={cx("rounded-2xl sm:rounded-3xl border border-white/12 bg-white/6 p-4 sm:p-6", a.stroke)}>
                          <Label htmlFor="redPhrase" className="text-xs text-white/60">Your line</Label>

                          <div className="relative mt-2">
                            {!reduceAll && (
                              <motion.div
                                className="pointer-events-none absolute -inset-2 rounded-3xl bg-gradient-to-r from-fuchsia-500/[0.12] via-pink-500/[0.08] to-violet-500/[0.08] blur-xl"
                                animate={{ opacity: [0.10, 0.20, 0.10] }}
                                transition={{ duration: 2.8, ease: "easeInOut", repeat: Infinity }}
                              />
                            )}

                            {(() => {
                              const { ref: rhfRef, ...redReg } = form.register("redPhrase");
                              return (
                                <Input
                                  id="redPhrase"
                                  placeholder='e.g. "You feel like home — even in chaos."'
                                  {...redReg}
                                  ref={(el) => {
                                    rhfRef(el);
                                    redRef.current = el;
                                  }}
                                  onChange={(e) => {
                                    redReg.onChange(e);
                                    form.setValue("redPhrase", e.target.value, { shouldValidate: true, shouldDirty: true });
                                    pingTyping();
                                  }}
                                  className="relative h-12 rounded-2xl text-sm sm:text-base bg-white/5 text-white placeholder:text-white/35 border-white/12 focus-visible:ring-2 focus-visible:ring-white/15"
                                />
                              );
                            })()}
                          </div>

                          <FieldError msg={form.formState.errors.redPhrase?.message} />

                          <div className="mt-3 flex flex-wrap gap-2">
                            {quickLine.map((t) => (
                              <GhostChip key={t} step={step} icon={<IconHeart className="h-4 w-4" />} onClick={() => handleQuickLineClick(t)}>
                                {t}
                              </GhostChip>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {/* STEP: GREEN */}
                    {step === "green" && (
                      <motion.div key="green" {...scene} className="space-y-4 sm:space-y-6">
                        <div className="flex items-end justify-between gap-3">
                          <div>
                            <div className="text-xs text-white/55">Step 2 of 4</div>
                            <div className="mt-1 text-lg sm:text-2xl font-semibold tracking-tight text-white/90">Pick the day it began.</div>
                            <div className="mt-2 text-xs sm:text-sm text-white/60">This powers the live counter.</div>
                          </div>
                          <div className="rounded-2xl border border-white/12 bg-white/6 px-3 py-2 text-xs text-white/60">
                            <span className="text-white/85">{duration}</span>
                          </div>
                        </div>

                        <div className={cx("rounded-2xl sm:rounded-3xl border border-white/12 bg-white/6 p-4 sm:p-6", a.stroke)}>
                          <Label htmlFor="relationshipStartAt" className="text-xs text-white/60">Relationship start date</Label>

                          <div className="relative mt-2">
                            {(() => {
                              const { ref: rhfRef, ...dateReg } = form.register("relationshipStartAt");
                              return (
                                <Input
                                  id="relationshipStartAt"
                                  type="date"
                                  {...dateReg}
                                  ref={(el) => {
                                    rhfRef(el);
                                    dateRef.current = el;
                                  }}
                                  onChange={(e) => {
                                    dateReg.onChange(e);
                                    form.setValue("relationshipStartAt", e.target.value, { shouldValidate: true, shouldDirty: true });
                                    pingTyping();
                                  }}
                                  className="relative h-12 rounded-2xl text-sm sm:text-base bg-white/5 text-white border-white/12 focus-visible:ring-2 focus-visible:ring-white/15"
                                />
                              );
                            })()}
                          </div>

                          <FieldError msg={form.formState.errors.relationshipStartAt?.message} />
                        </div>
                      </motion.div>
                    )}

                    {/* STEP: PHOTO */}
                    {step === "photo" && (
                      <motion.div key="photo" {...scene} className="space-y-4 sm:space-y-6">
                        <div className="flex items-end justify-between gap-3">
                          <div>
                            <div className="text-xs text-white/55">Step 3 of 4</div>
                            <div className="mt-1 text-lg sm:text-2xl font-semibold tracking-tight text-white/90">Choose the photo that says everything.</div>
                            <div className="mt-2 text-xs sm:text-sm text-white/60">This is the reveal. Pick the most meaningful one.</div>
                          </div>
                          <div className="rounded-2xl border border-white/12 bg-white/6 px-3 py-2 text-xs text-white/60">
                            <span className="text-white/85">{photoFile ? "Selected" : "Missing"}</span>
                          </div>
                        </div>

                        <div className={cx("rounded-2xl sm:rounded-3xl border border-white/12 bg-white/6 p-4 sm:p-6", a.stroke)}>
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <div className="text-sm font-semibold tracking-tight text-white/90">Couple photo</div>
                              <div className="mt-1 text-xs text-white/55">JPG/PNG/WebP • up to {MAX_PHOTO_MB}MB</div>
                            </div>
                            <div className="flex items-center gap-2">
                              <GhostChip step={step} icon={<IconPhoto className="h-4 w-4" />} onClick={() => fileInputRef.current?.click()}>
                                Choose
                              </GhostChip>
                              {photoFile && (
                                <GhostChip step={step} icon={<IconX className="h-4 w-4" />} onClick={() => void setPhoto(null)}>
                                  Remove
                                </GhostChip>
                              )}
                            </div>
                          </div>

                          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />

                          <div
                            onDragOver={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                            }}
                            onDrop={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              const f = e.dataTransfer.files?.[0];
                              if (f) void setPhoto(f);
                            }}
                            className={cx(
                              "mt-3 rounded-xl sm:rounded-2xl border border-white/12 bg-white/5 p-3 sm:p-4 transition",
                              "hover:bg-white/8",
                              "focus-within:ring-2 focus-within:ring-white/15"
                            )}
                          >
                            {!photoPreviewUrl ? (
                              <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
                                <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/6 px-3 py-1 text-xs text-white/70 backdrop-blur">
                                  <IconPhoto className="h-4 w-4 text-sky-300" />
                                  Drag & drop or click "Choose"
                                </div>
                                <div className="max-w-sm text-xs text-white/60">Pick the photo that makes your chest feel warm.</div>
                              </div>
                            ) : (
                              <div className="space-y-3">
                                <div className="relative overflow-hidden rounded-xl sm:rounded-2xl border border-white/12 bg-white/5">
                                  <img src={photoPreviewUrl} alt="Selected couple photo preview" className="h-[220px] w-full object-cover" />
                                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
                                  <div className="pointer-events-none absolute bottom-2 left-2 text-xs text-white/85">Revealed after payment.</div>
                                </div>

                                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-white/60">
                                  <div className="truncate">
                                    <span className="text-white/85">{photoFile?.name}</span>
                                  </div>
                                  <div>{photoFile ? `${Math.round(photoFile.size / 1024)} KB` : ""}</div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {/* STEP: YELLOW */}
                    {step === "yellow" && (
                      <motion.div key="yellow" {...scene} className="space-y-4 sm:space-y-6">
                        <div className="flex items-end justify-between gap-3">
                          <div>
                            <div className="text-xs text-white/55">Step 4 of 4</div>
                            <div className="mt-1 text-lg sm:text-2xl font-semibold tracking-tight text-white/90">Write the letter they'll keep.</div>
                            <div className="mt-2 text-xs sm:text-sm text-white/60">One memory + one gratitude + one promise. Keep it real.</div>
                          </div>
                          <div className="rounded-2xl border border-white/12 bg-white/6 px-3 py-2 text-xs text-white/60">
                            <span className="text-white/85">{letterLen}</span>/4000
                          </div>
                        </div>

                        <div className={cx("rounded-2xl sm:rounded-3xl border border-white/12 bg-white/6 p-4 sm:p-6", a.stroke)}>
                          <Label htmlFor="loveLetter" className="text-xs text-white/60">Your letter</Label>

                          <div className="relative mt-2">
                            {(() => {
                              const { ref: rhfRef, ...letterReg } = form.register("loveLetter");
                              return (
                                <Textarea
                                  id="loveLetter"
                                  placeholder={"The moment I knew it was you was...\n\nThank you for...\n\nHere's what I promise you..."}
                                  {...letterReg}
                                  ref={(el) => {
                                    rhfRef(el);
                                    letterRef.current = el;
                                  }}
                                  onChange={(e) => {
                                    letterReg.onChange(e);
                                    form.setValue("loveLetter", e.target.value, { shouldValidate: true, shouldDirty: true });
                                    pingTyping();
                                  }}
                                  className="relative min-h-[220px] rounded-2xl text-sm sm:text-base bg-white/5 text-white placeholder:text-white/35 border-white/12 focus-visible:ring-2 focus-visible:ring-white/15"
                                />
                              );
                            })()}
                          </div>

                          <FieldError msg={form.formState.errors.loveLetter?.message} />

                          <div className="mt-3 flex flex-wrap gap-2">
                            {quickPrompts.map((t) => (
                              <GhostChip key={t} step={step} icon={<IconSpark className="h-4 w-4" />} onClick={() => handleQuickPromptClick(t)}>
                                {t}
                              </GhostChip>
                            ))}
                          </div>

                          <div className="mt-3 text-xs text-white/55">Shortcut: <span className="font-mono">Ctrl+Enter</span> to continue.</div>
                        </div>
                      </motion.div>
                    )}

                    {/* STEP: CONFIRM */}
                    {step === "confirm" && (
                      <motion.div key="confirm" {...scene} className="space-y-4 sm:space-y-6">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-xs text-white/55">Preview</div>
                            <div className="mt-1 text-lg sm:text-2xl font-semibold tracking-tight text-white/90">Preview it like it's already theirs.</div>
                            <div className="mt-2 text-xs sm:text-sm text-white/60">If it hits, create the link.</div>
                            <button type="button" onClick={openPricing} className="mt-2 text-[11px] text-white/55 hover:text-white transition">
                              {PRICE_MICROCOPY}
                            </button>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <GhostChip step={step} onClick={() => void doStepChange("red")} icon={<IconHeart className="h-4 w-4" />}>Edit line</GhostChip>
                            <GhostChip step={step} onClick={() => void doStepChange("green")} icon={<IconSpark className="h-4 w-4" />}>Edit date</GhostChip>
                            <GhostChip step={step} onClick={() => void doStepChange("photo")} icon={<IconPhoto className="h-4 w-4" />}>Edit photo</GhostChip>
                            <GhostChip step={step} onClick={() => void doStepChange("yellow")} icon={<IconSpark className="h-4 w-4" />}>Edit letter</GhostChip>
                          </div>
                        </div>

                        <ConfirmPreview
                          red={redPhrase}
                          startDate={relationshipStartAt}
                          duration={duration}
                          letter={loveLetter}
                          photoPreviewUrl={photoPreviewUrl}
                          reduceAll={reduceAll}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Footer sticky controls */}
        <div className="sticky bottom-0 border-t border-white/10 bg-[#070A1B]/92 backdrop-blur px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="secondary"
              className="rounded-full border border-white/12 bg-white/6 text-white hover:bg-white/10 text-sm px-4 py-2"
              onClick={step === "red" ? () => setBuilderOpen(false) : back}
            >
              {step === "red" ? "Close" : "Back"}
            </Button>

            <div className="flex items-center gap-2">
              {step !== "confirm" ? (
                <>
                  {!isMobile && <KeyHint><span className="font-mono">Enter</span> to continue</KeyHint>}
                  <Button
                    type="button"
                    onClick={next}
                    disabled={!canAdvanceFrom(step)}
                    className={cx(
                      "rounded-full px-5 sm:px-6 text-white hover:opacity-95 disabled:opacity-60 text-sm py-2",
                      step === "red"
                        ? "bg-gradient-to-r from-fuchsia-500 via-pink-500 to-violet-500"
                        : step === "green"
                        ? "bg-gradient-to-r from-emerald-400 via-sky-400 to-fuchsia-500"
                        : step === "photo"
                        ? "bg-gradient-to-r from-sky-400 via-violet-500 to-fuchsia-500"
                        : "bg-gradient-to-r from-amber-300 via-fuchsia-500 to-sky-400 text-[#050816]"
                    )}
                  >
                    Continue
                  </Button>
                </>
              ) : (
                <div className="flex flex-col items-end gap-1">
                  <Button
                    type="button"
                    onClick={form.handleSubmit(onCreate)}
                    disabled={!canSubmit}
                    className="rounded-full px-5 sm:px-6 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500 text-white hover:opacity-95 disabled:opacity-60 text-sm py-2"
                  >
                    {isSubmitting ? "Creating…" : "Create gift link"}
                  </Button>
                  <button type="button" onClick={openPricing} className="text-[11px] text-white/55 hover:text-white transition">
                    You'll pay to unlock next · <span className="text-white/85">{PRICE_USD}</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="mt-2 text-center text-[11px] text-white/55">You're not filling a form — you're setting up a moment.</div>
        </div>
      </BuilderModal>
    </div>
  );
}

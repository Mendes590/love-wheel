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
 * CLEAN redesign inspired by your reference print:
 * - Minimal top nav
 * - Clean hero (headline + short sub + 1 primary CTA)
 * - Right-side premium visual (QR + phone mock)
 * - Fewer tiles / less noise
 * - Builder flow preserved (steps, upload, create link, QR, checkout)
 * - All UI in English
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

/* =============================================================================
   Icons (tiny, clean)
============================================================================= */

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

const IconChevron = React.memo(function IconChevron({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={cx("h-4 w-4", className)}>
      <path
        d="M6 9l6 6 6-6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
});

/* =============================================================================
   Accent helpers
============================================================================= */

function stepAccent(step: StepKey) {
  if (step === "green")
    return {
      dot: "bg-emerald-400",
      ring: "ring-emerald-400/[0.16]",
      bar: "from-emerald-400 via-sky-400 to-fuchsia-500",
      stroke: "border-emerald-400/12",
      chip: "hover:border-emerald-400/25 hover:text-foreground",
      icon: "text-emerald-200/90",
    };
  if (step === "photo")
    return {
      dot: "bg-sky-400",
      ring: "ring-sky-400/[0.16]",
      bar: "from-sky-400 via-violet-500 to-fuchsia-500",
      stroke: "border-sky-400/12",
      chip: "hover:border-sky-400/25 hover:text-foreground",
      icon: "text-sky-200/90",
    };
  if (step === "yellow")
    return {
      dot: "bg-amber-300",
      ring: "ring-amber-300/[0.16]",
      bar: "from-amber-300 via-fuchsia-500 to-sky-400",
      stroke: "border-amber-300/12",
      chip: "hover:border-amber-300/25 hover:text-foreground",
      icon: "text-amber-200/90",
    };
  if (step === "confirm")
    return {
      dot: "bg-violet-500",
      ring: "ring-violet-500/[0.16]",
      bar: "from-violet-500 via-fuchsia-500 to-sky-400",
      stroke: "border-violet-500/12",
      chip: "hover:border-violet-500/25 hover:text-foreground",
      icon: "text-violet-200/90",
    };

  // default / red / hero
  return {
    dot: "bg-fuchsia-500",
    ring: "ring-fuchsia-500/[0.16]",
    bar: "from-fuchsia-500 via-pink-500 to-violet-500",
    stroke: "border-white/10",
    chip: "hover:border-fuchsia-500/25 hover:text-foreground",
    icon: "text-fuchsia-200/90",
  };
}

/* =============================================================================
   Background + hero visual (clean, premium)
============================================================================= */

function NeonBg({ reduceAll }: { reduceAll: boolean }) {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(900px_circle_at_20%_18%,rgba(255,255,255,0.06),transparent_60%),radial-gradient(900px_circle_at_78%_26%,rgba(255,64,169,0.10),transparent_60%),radial-gradient(900px_circle_at_70%_85%,rgba(155,81,224,0.10),transparent_60%),linear-gradient(180deg,#050816_0%,#050816_55%,#040513_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(1000px_circle_at_50%_40%,transparent_40%,rgba(0,0,0,0.72)_100%)]" />
      <div className="absolute inset-0 opacity-[0.06] [background-image:radial-gradient(rgba(255,255,255,0.9)_1px,transparent_1px)] [background-size:11px_11px]" />

      {!reduceAll && (
        <motion.div
          className="absolute -inset-20 opacity-[0.20]"
          animate={{ y: [0, -8, 0], x: [0, 6, 0] }}
          transition={{ duration: 12, ease: "easeInOut", repeat: Infinity }}
        >
          <div className="absolute left-[12%] top-[18%] h-40 w-40 rounded-full bg-fuchsia-500/10 blur-3xl" />
          <div className="absolute left-[72%] top-[16%] h-44 w-44 rounded-full bg-violet-500/12 blur-3xl" />
          <div className="absolute left-[60%] top-[74%] h-52 w-52 rounded-full bg-pink-500/10 blur-3xl" />
        </motion.div>
      )}
    </div>
  );
}

function HeroVisual({ reduceAll }: { reduceAll: boolean }) {
  return (
    <div className="relative mx-auto w-full max-w-[520px]">
      <div className="absolute -inset-10 rounded-[48px] bg-gradient-to-r from-fuchsia-500/18 via-pink-500/10 to-violet-500/14 blur-3xl" />
      <div className="relative rounded-[34px] border border-white/10 bg-white/[0.05] p-6 backdrop-blur">
        {!reduceAll && (
          <motion.div
            className="pointer-events-none absolute left-1/2 top-1/2 h-[380px] w-[380px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-r from-fuchsia-500/18 via-pink-500/10 to-violet-500/18 blur-2xl"
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 18, ease: "linear", repeat: Infinity }}
          />
        )}

        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/6 px-3 py-1 text-[11px] text-white/70">
            <span className="h-1.5 w-1.5 rounded-full bg-fuchsia-400" />
            Share by QR
          </div>

          <div className="mt-3 grid grid-cols-9 gap-[3px] rounded-2xl bg-white p-3 shadow-[0_18px_80px_-40px_rgba(255,64,169,0.55)]">
            {Array.from({ length: 81 }).map((_, i) => {
              const on = (i * 17 + 11) % 7 < 3 || (i % 9 === 0 && i % 2 === 0) || (i % 5 === 0 && i % 7 === 0);
              return <div key={i} className={cx("h-[10px] w-[10px] rounded-[2px]", on ? "bg-black" : "bg-white")} />;
            })}
          </div>
        </div>

        <div className="relative mt-6 flex justify-end">
          <div className="relative w-[245px] rotate-[10deg] rounded-[28px] border border-white/14 bg-[#0B0E22]/70 p-3 shadow-[0_40px_160px_-90px_rgba(0,0,0,0.95)]">
            <div className="mb-2 flex items-center justify-between px-2 text-[10px] text-white/55">
              <span>19:47</span>
              <span className="h-1 w-8 rounded-full bg-white/15" />
            </div>

            <div className="overflow-hidden rounded-[18px] border border-white/10 bg-white/5">
              <div className="h-[210px] bg-[radial-gradient(120px_circle_at_30%_25%,rgba(255,255,255,0.10),transparent_55%),linear-gradient(180deg,rgba(255,64,169,0.10),rgba(155,81,224,0.08))]">
                <div className="p-3">
                  <div className="h-2 w-24 rounded-full bg-white/12" />
                  <div className="mt-2 h-2 w-40 rounded-full bg-white/10" />
                </div>
                <div className="mx-3 mt-4 h-[130px] rounded-2xl bg-white/8 border border-white/10" />
                <div className="px-3 py-3">
                  <div className="h-2 w-28 rounded-full bg-white/12" />
                  <div className="mt-2 h-2 w-20 rounded-full bg-white/10" />
                </div>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-center gap-2 text-[10px] text-white/55">
              <span className="h-2 w-2 rounded-full bg-pink-300/80" />
              <span>spin → reveal</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =============================================================================
   Small UI helpers
============================================================================= */

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-2 text-xs text-fuchsia-200">
      {msg}
    </motion.div>
  );
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
      onClick={(e) => {
        e.stopPropagation();
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
      ? "Line"
      : step === "green"
      ? "Date"
      : step === "photo"
      ? "Photo"
      : step === "yellow"
      ? "Letter"
      : "Preview";

  const a = stepAccent(step);

  return (
    <div className="mt-4 sm:mt-5 flex items-center justify-between gap-4">
      <div className="text-xs text-white/60">
        <span className="text-white/85">{label}</span> • {progress}%
      </div>

      <div className="relative h-2 w-44 overflow-hidden rounded-full bg-white/10">
        {!reduceAll && (
          <motion.div
            className={cx("absolute inset-0 opacity-30", "bg-gradient-to-r", a.bar)}
            animate={{ x: ["-30%", "30%", "-30%"] }}
            transition={{ duration: 3.6, ease: "easeInOut", repeat: Infinity }}
          />
        )}
        <div className={cx("relative h-full rounded-full bg-gradient-to-r transition-all", a.bar)} style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}

/* =============================================================================
   Photo compression for mobile smoothness
============================================================================= */

const MAX_PHOTO_MB = 8;
const MAX_BYTES = MAX_PHOTO_MB * 1024 * 1024;

function isValidImage(file: File) {
  return file.type.startsWith("image/");
}

async function compressForPreview(file: File, maxSide = 1280, quality = 0.82): Promise<Blob> {
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

/* =============================================================================
   InfoModal (clean, reusable)
============================================================================= */

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
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/6 px-3 py-1 text-xs text-white/70">
                    <span className="h-1.5 w-1.5 rounded-full bg-fuchsia-400" />
                    LoveWheel
                  </div>
                  <div className="text-xl sm:text-2xl font-semibold tracking-tight text-white/90">{title}</div>
                </div>

                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className={cx(
                    "inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/12 bg-white/6 text-white/70 transition",
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

/* =============================================================================
   QR generator block
============================================================================= */

function QrCodeBlock({ value }: { value: string }) {
  const [dataUrl, setDataUrl] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [saved, setSaved] = React.useState(false);

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

    setSaved(true);
    window.setTimeout(() => setSaved(false), 2200);
    softHaptic([8, 12, 8]);
  }

  return (
    <div className="mt-4 sm:mt-5 rounded-2xl border border-white/12 bg-white/6 p-3 sm:p-4">
      <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[10px] sm:text-[11px] text-white/55">Save this QR code</div>
          <div className="mt-1 text-xs sm:text-sm text-white/80">Print it or keep it for the perfect delivery moment.</div>
        </div>
        <Button
          type="button"
          variant="secondary"
          className="rounded-full mt-2 sm:mt-0 text-sm px-3 py-2"
          onClick={download}
          disabled={!dataUrl}
        >
          {saved ? "Saved ✓" : dataUrl ? "Download QR" : loading ? "Generating…" : "QR unavailable"}
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

      <div className="mt-2 sm:mt-3 text-[10px] sm:text-[11px] text-white/55">Tip: on iPhone, long-press the image to save.</div>
    </div>
  );
}

/* =============================================================================
   LinkReady popup (clean)
============================================================================= */

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
              <div className="p-4 sm:p-6 border-b border-white/10">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/6 px-3 py-1 text-xs text-white/70">
                      <span className="h-1.5 w-1.5 rounded-full bg-fuchsia-400" />
                      Link ready
                    </div>
                    <div className="mt-2 text-xl sm:text-2xl font-semibold tracking-tight text-white/90">Your gift link is live.</div>
                    <div className="text-xs sm:text-sm text-white/60">Save the QR, then unlock the premium spin → reveal.</div>
                    <div className="text-[10px] sm:text-[11px] text-white/55">{PRICE_MICROCOPY}</div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onOpenChange(false)}
                    className={cx(
                      "inline-flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full border border-white/12 bg-white/6 text-white/70 transition",
                      "hover:bg-white/10 hover:text-white active:scale-[0.98]",
                      "focus:outline-none focus:ring-2 focus:ring-white/15"
                    )}
                    aria-label="Close"
                  >
                    <IconX className="h-4 w-4" />
                  </button>
                </div>
              </div>

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
              </div>

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

/* =============================================================================
   BuilderModal (mobile-safe)
============================================================================= */

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

/* =============================================================================
   Confirm preview (clean)
============================================================================= */

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
      <div className="rounded-2xl sm:rounded-3xl border border-white/12 bg-white/6 p-4 sm:p-6 backdrop-blur">
        <div className="text-xs text-white/60">Your line</div>
        <div className="mt-2 text-lg sm:text-2xl font-semibold tracking-tight text-white/90">{red.trim() ? `"${red.trim()}"` : "—"}</div>
      </div>

      <div className="rounded-2xl sm:rounded-3xl border border-white/12 bg-white/6 p-4 sm:p-6 backdrop-blur">
        <div className="text-xs text-white/60">Time together</div>
        <div className="mt-2 text-xs text-white/60">Since {startDate || "—"}</div>
        <div className="mt-1 text-2xl sm:text-4xl font-semibold tracking-tight text-white/90">{duration}</div>
      </div>

      <div className="rounded-2xl sm:rounded-3xl border border-white/12 bg-white/6 p-4 sm:p-6 backdrop-blur">
        <div className="text-xs text-white/60">Photo</div>
        <div className="mt-3">
          {photoPreviewUrl ? (
            <div className="relative overflow-hidden rounded-xl sm:rounded-2xl border border-white/12 bg-white/5">
              <img src={photoPreviewUrl} alt="Selected photo preview" className="h-[190px] sm:h-[230px] w-full object-cover" />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
              <div className="pointer-events-none absolute bottom-2 left-2 text-xs text-white/85">Revealed after payment.</div>
            </div>
          ) : (
            <div className="rounded-xl sm:rounded-2xl border border-white/12 bg-white/5 p-3 sm:p-4 text-sm text-white/60">—</div>
          )}
        </div>
      </div>

      <div className="rounded-2xl sm:rounded-3xl border border-white/12 bg-white/6 p-4 sm:p-6 backdrop-blur">
        <div className="text-xs text-white/60">Letter</div>
        <div className="mt-3 space-y-2">
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
      </div>
    </div>
  );
}

/* =============================================================================
   Main page
============================================================================= */

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
  const [linkPopupOpen, setLinkPopupOpen] = React.useState(false);

  const [typing, setTyping] = React.useState(false);
  const typingTimer = React.useRef<number | null>(null);

  const [photoFile, setPhotoFile] = React.useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  // Info modal
  const [infoOpen, setInfoOpen] = React.useState(false);
  const [infoTitle, setInfoTitle] = React.useState("Info");
  const [infoBody, setInfoBody] = React.useState<React.ReactNode>(null);
  const [infoCta, setInfoCta] = React.useState<{ label?: string; onClick?: () => void }>({});

  // Sections
  const faqRef = React.useRef<HTMLDivElement | null>(null);
  const howRef = React.useRef<HTMLDivElement | null>(null);

  // FAQ accordion
  const [faqOpenKey, setFaqOpenKey] = React.useState<string | null>(null);

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

  // Focus inputs
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

    try {
      const blob = await compressForPreview(file, 1280, 0.82);
      const url = URL.createObjectURL(blob);
      setPhotoPreviewUrl(url);
    } catch {
      const url = URL.createObjectURL(file);
      setPhotoPreviewUrl(url);
    }

    softHaptic([10, 14, 10]);
    pingTyping();
  }

  const handlePhotoChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0] || null;
      void setPhoto(file);
    },
    [photoPreviewUrl]
  );

  const quickLine = React.useMemo(
    () => ["I'd choose you again.", "You feel like home.", "My favorite plan is still: you.", "Somehow, it's always you."],
    []
  );

  const quickPrompts = React.useMemo(
    () => ["The moment I knew it was you was…", "Thank you for…", "I love the way you…", "Here's what I promise you…"],
    []
  );

  const handleQuickLineClick = React.useCallback(
    (text: string) => {
      form.setValue("redPhrase", text, { shouldDirty: true, shouldTouch: true, shouldValidate: false });
      window.setTimeout(() => void form.trigger("redPhrase"), 0);
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
      </div>,
      "Start creating",
      openBuilder
    );
  }

  function openQrReader() {
    openInfo(
      "QR code",
      <div className="space-y-3">
        <div>We generate a QR code for your gift link so you can print it and deliver it in a real note.</div>
        <div className="text-white/80">Digital surprise. Physical delivery.</div>
      </div>,
      "Create a moment",
      openBuilder
    );
  }

  const heroHeadline = "A premium spin → reveal gift.";
  const heroSub = "One line, one date, one photo, one letter. Create in minutes. Share by link or QR.";

  const scene = {
    initial: reduceAll ? { opacity: 0 } : { opacity: 0, y: 14, filter: "blur(8px)", scale: 0.994 },
    animate: reduceAll ? { opacity: 1 } : { opacity: 1, y: 0, filter: "blur(0px)", scale: 1 },
    exit: reduceAll ? { opacity: 0 } : { opacity: 0, y: -8, filter: "blur(8px)", scale: 0.994 },
    transition: { duration: reduceAll ? 0.14 : 0.30, ease: "easeOut" as const },
  };

  const faqItems = [
    {
      key: "what",
      q: "What is LoveWheel?",
      a: "A private gift page that reveals your story through a cinematic spin: a short line, a live counter, a photo reveal, and a letter.",
    },
    {
      key: "private",
      q: "Is it private?",
      a: "Yes. The link is unlisted — only people with the link can open it.",
    },
    {
      key: "expire",
      q: "Does it expire?",
      a: "No. The page stays live and the counter keeps running.",
    },
    {
      key: "payment",
      q: "What does payment unlock?",
      a: "It unlocks the premium spin → reveal flow that makes the moment land (the reveal becomes part of the surprise).",
    },
  ];

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

      {/* Top nav (minimal) */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#050816]/85 backdrop-blur supports-[backdrop-filter]:bg-[#050816]/55">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-2xl bg-white/8 ring-1 ring-white/12 flex items-center justify-center">
              <span className="text-fuchsia-200">
                <IconHeart className="h-4 w-4" />
              </span>
            </div>
            <div className="text-sm font-semibold tracking-tight">
              Love<span className="text-fuchsia-200">Wheel</span>
            </div>
          </div>

          <nav className="hidden items-center gap-6 text-sm text-white/70 md:flex">
            <button type="button" className="hover:text-white transition" onClick={openPricing}>
              Pricing
            </button>
            <button
              type="button"
              className="hover:text-white transition"
              onClick={() => {
                howRef.current?.scrollIntoView({ behavior: "smooth" });
                softHaptic(8);
              }}
            >
              How it works
            </button>
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
            <button type="button" className="hover:text-white transition" onClick={openQrReader}>
              QR
            </button>
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
                    <button
                      className="w-full text-left p-3 rounded-xl bg-white/5 hover:bg-white/10 transition"
                      onClick={() => {
                        setInfoOpen(false);
                        openPricing();
                      }}
                    >
                      Pricing
                    </button>
                    <button
                      className="w-full text-left p-3 rounded-xl bg-white/5 hover:bg-white/10 transition"
                      onClick={() => {
                        setInfoOpen(false);
                        setTimeout(() => howRef.current?.scrollIntoView({ behavior: "smooth" }), 80);
                      }}
                    >
                      How it works
                    </button>
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
                        openQrReader();
                      }}
                    >
                      QR
                    </button>
                  </div>
                );
              }}
              aria-label="Open menu"
            >
              <IconMenu className="h-5 w-5 text-white/70" />
            </button>
          </div>
        </div>
      </header>

      {/* HERO (clean) */}
      <main className="mx-auto max-w-6xl px-4 py-10 sm:py-12">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/6 px-3 py-1 text-xs text-white/70">
              <span className="h-1.5 w-1.5 rounded-full bg-fuchsia-400" />
              Designed to feel premium
            </div>

            <h1 className="mt-4 text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-white/90">
              {heroHeadline}
            </h1>

            <p className="mt-4 max-w-xl text-white/65 text-sm sm:text-base leading-relaxed">{heroSub}</p>

            <div className="mt-6 flex flex-col sm:flex-row gap-2 sm:items-center">
              <Button
                type="button"
                onClick={openBuilder}
                className="h-11 rounded-full px-6 bg-gradient-to-r from-fuchsia-500 via-pink-500 to-violet-500 text-white shadow-[0_20px_80px_-40px_rgba(255,64,169,0.70)] hover:opacity-95"
              >
                Start creating
              </Button>

              <Button
                type="button"
                variant="secondary"
                className="h-11 rounded-full border border-white/12 bg-white/6 text-white hover:bg-white/10 px-5"
                onClick={openPricing}
              >
                Pricing
              </Button>
            </div>

            <div className="mt-3 text-[11px] text-white/55">{PRICE_MICROCOPY}</div>

            {/* Minimal highlights */}
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {[
                { title: "Build", desc: "Write four pieces." },
                { title: "Share", desc: "Link or QR." },
                { title: "Reveal", desc: "Spin → discover." },
              ].map((x) => (
                <div key={x.title} className="rounded-2xl border border-white/10 bg-white/6 p-4 backdrop-blur">
                  <div className="text-sm font-semibold text-white/90">{x.title}</div>
                  <div className="mt-1 text-xs text-white/60">{x.desc}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:justify-self-end">
            <HeroVisual reduceAll={reduceAll} />
          </div>
        </div>

        {/* How it works (clean section) */}
        <section ref={howRef} className="mt-14 sm:mt-16 scroll-mt-24">
          <div className="text-sm font-semibold text-white/85">How it works</div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/6 p-5 backdrop-blur">
              <div className="inline-flex items-center gap-2 text-xs text-white/60">
                <IconHeart className="text-fuchsia-200" />
                Step 1
              </div>
              <div className="mt-2 text-base font-semibold text-white/90">Write</div>
              <div className="mt-2 text-sm text-white/65 leading-relaxed">
                A line, a date, a photo, and a letter — simple and personal.
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/6 p-5 backdrop-blur">
              <div className="inline-flex items-center gap-2 text-xs text-white/60">
                <IconLink className="text-sky-200" />
                Step 2
              </div>
              <div className="mt-2 text-base font-semibold text-white/90">Share</div>
              <div className="mt-2 text-sm text-white/65 leading-relaxed">
                Send the link, or print a QR code and deliver it in a real note.
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/6 p-5 backdrop-blur">
              <div className="inline-flex items-center gap-2 text-xs text-white/60">
                <IconSpark className="text-violet-200" />
                Step 3
              </div>
              <div className="mt-2 text-base font-semibold text-white/90">Reveal</div>
              <div className="mt-2 text-sm text-white/65 leading-relaxed">
                They spin the wheel and discover each part — premium unlock makes it cinematic.
              </div>
            </div>
          </div>
        </section>

        {/* FAQ (accordion, clean) */}
        <section ref={faqRef} className="mt-14 sm:mt-16 scroll-mt-24">
          <div className="text-sm font-semibold text-white/85">FAQ</div>
          <div className="mt-4 space-y-2">
            {faqItems.map((item) => {
              const open = faqOpenKey === item.key;
              return (
                <div key={item.key} className="rounded-2xl border border-white/10 bg-white/6 backdrop-blur">
                  <button
                    type="button"
                    className="w-full flex items-center justify-between gap-4 px-4 sm:px-5 py-4 text-left"
                    onClick={() => {
                      setFaqOpenKey((prev) => (prev === item.key ? null : item.key));
                      softHaptic(6);
                    }}
                  >
                    <div className="text-sm font-semibold text-white/90">{item.q}</div>
                    <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.18 }}>
                      <IconChevron className="text-white/60" />
                    </motion.div>
                  </button>
                  <AnimatePresence initial={false}>
                    {open && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.22, ease: "easeOut" }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 sm:px-5 pb-4 text-sm text-white/70 leading-relaxed">{item.a}</div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>

          <div className="mt-6 flex flex-col sm:flex-row gap-2 sm:items-center">
            <Button
              type="button"
              onClick={openBuilder}
              className="h-11 rounded-full px-6 bg-gradient-to-r from-fuchsia-500 via-pink-500 to-violet-500 text-white hover:opacity-95"
            >
              Create your gift
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="h-11 rounded-full border border-white/12 bg-white/6 text-white hover:bg-white/10 px-5"
              onClick={openQrReader}
            >
              How QR works
            </Button>
          </div>
        </section>

        {/* Footer (minimal) */}
        <footer className="mt-16 pb-10 text-center text-xs text-white/50">
          <div>LoveWheel · {PRICE_MICROCOPY}</div>
        </footer>
      </main>

      {/* BUILDER MODAL (same flow, cleaner spacing) */}
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
              <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/6 px-3 py-1 text-xs text-white/70">
                <span className={cx("h-1.5 w-1.5 rounded-full", a.dot)} />
                Builder
              </div>
              <h2 className="mt-3 text-xl sm:text-2xl font-semibold tracking-tight text-white/90">
                {step === "red"
                  ? "Write the line."
                  : step === "green"
                  ? "Pick the date."
                  : step === "photo"
                  ? "Choose the photo."
                  : step === "yellow"
                  ? "Write the letter."
                  : "Preview."}
              </h2>
              <p className="mt-2 text-xs sm:text-sm text-white/60">
                {step === "red"
                  ? "Short, specific, real."
                  : step === "green"
                  ? "This powers the live counter."
                  : step === "photo"
                  ? "This is the reveal moment."
                  : step === "yellow"
                  ? "One memory, one gratitude, one promise."
                  : "If it feels right, create the link."}
              </p>
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
              <div className="pointer-events-none absolute -inset-2 rounded-[34px] blur-2xl bg-gradient-to-r from-fuchsia-500/[0.10] via-pink-500/[0.06] to-violet-500/[0.06]" />
            )}

            <div className={cx("relative rounded-[24px] sm:rounded-[32px] ring-1", a.ring)}>
              <Card className="border border-white/12 bg-white/6 shadow-[0_30px_140px_-90px_rgba(0,0,0,0.95)] backdrop-blur">
                <CardContent className="relative p-4 sm:p-6">
                  <AnimatePresence mode="wait">
                    {/* STEP: RED */}
                    {step === "red" && (
                      <motion.div key="red" {...scene} className="space-y-4 sm:space-y-6">
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-sm font-semibold text-white/90">Your line</div>
                          <div className="rounded-2xl border border-white/12 bg-white/6 px-3 py-2 text-xs text-white/60">
                            <span className="text-white/85">{redLen}</span>/80
                          </div>
                        </div>

                        <div className={cx("rounded-2xl sm:rounded-3xl border border-white/12 bg-white/6 p-4 sm:p-6", a.stroke)}>
                          <Label htmlFor="redPhrase" className="text-xs text-white/60">
                            Write something only you could say.
                          </Label>

                          <div className="relative mt-2">
                            {(() => {
                              const { ref: rhfRef, ...redReg } = form.register("redPhrase");
                              return (
                                <Input
                                  id="redPhrase"
                                  placeholder='e.g. "You feel like home."'
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
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-sm font-semibold text-white/90">Start date</div>
                          <div className="rounded-2xl border border-white/12 bg-white/6 px-3 py-2 text-xs text-white/60">
                            <span className="text-white/85">{duration}</span>
                          </div>
                        </div>

                        <div className={cx("rounded-2xl sm:rounded-3xl border border-white/12 bg-white/6 p-4 sm:p-6", a.stroke)}>
                          <Label htmlFor="relationshipStartAt" className="text-xs text-white/60">
                            Pick the day your story began.
                          </Label>

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
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-sm font-semibold text-white/90">Photo</div>
                          <div className="rounded-2xl border border-white/12 bg-white/6 px-3 py-2 text-xs text-white/60">
                            <span className="text-white/85">{photoFile ? "Selected" : "Missing"}</span>
                          </div>
                        </div>

                        <div className={cx("rounded-2xl sm:rounded-3xl border border-white/12 bg-white/6 p-4 sm:p-6", a.stroke)}>
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <div className="text-sm font-semibold tracking-tight text-white/90">Choose a photo</div>
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

                          {/* click anywhere */}
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={() => fileInputRef.current?.click()}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                fileInputRef.current?.click();
                              }
                            }}
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
                              "hover:bg-white/8 cursor-pointer",
                              "focus:outline-none focus-within:ring-2 focus-within:ring-white/15"
                            )}
                          >
                            {!photoPreviewUrl ? (
                              <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
                                <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/6 px-3 py-1 text-xs text-white/70">
                                  <IconPhoto className="h-4 w-4 text-sky-200" />
                                  Click, drag & drop, or choose
                                </div>
                                <div className="max-w-sm text-xs text-white/60">Pick one that instantly brings you back.</div>
                              </div>
                            ) : (
                              <div className="space-y-3">
                                <div className="relative overflow-hidden rounded-xl sm:rounded-2xl border border-white/12 bg-white/5">
                                  <img src={photoPreviewUrl} alt="Selected photo preview" className="h-[220px] w-full object-cover" />
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
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-sm font-semibold text-white/90">Letter</div>
                          <div className="rounded-2xl border border-white/12 bg-white/6 px-3 py-2 text-xs text-white/60">
                            <span className="text-white/85">{letterLen}</span>/4000
                          </div>
                        </div>

                        <div className={cx("rounded-2xl sm:rounded-3xl border border-white/12 bg-white/6 p-4 sm:p-6", a.stroke)}>
                          <Label htmlFor="loveLetter" className="text-xs text-white/60">
                            Keep it honest.
                          </Label>

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

                          <div className="mt-3 text-xs text-white/55">
                            Shortcut: <span className="font-mono">Ctrl+Enter</span> to continue.
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {/* STEP: CONFIRM */}
                    {step === "confirm" && (
                      <motion.div key="confirm" {...scene} className="space-y-4 sm:space-y-6">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-white/90">Preview</div>
                            <button type="button" onClick={openPricing} className="mt-2 text-[11px] text-white/55 hover:text-white transition">
                              {PRICE_MICROCOPY}
                            </button>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <GhostChip step={step} onClick={() => void doStepChange("red")} icon={<IconHeart className="h-4 w-4" />}>
                              Edit line
                            </GhostChip>
                            <GhostChip step={step} onClick={() => void doStepChange("green")} icon={<IconSpark className="h-4 w-4" />}>
                              Edit date
                            </GhostChip>
                            <GhostChip step={step} onClick={() => void doStepChange("photo")} icon={<IconPhoto className="h-4 w-4" />}>
                              Edit photo
                            </GhostChip>
                            <GhostChip step={step} onClick={() => void doStepChange("yellow")} icon={<IconSpark className="h-4 w-4" />}>
                              Edit letter
                            </GhostChip>
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

        {/* Footer controls */}
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
                    Pay to unlock next · <span className="text-white/85">{PRICE_USD}</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="mt-2 text-center text-[11px] text-white/55">Clean inputs. Big impact.</div>
        </div>
      </BuilderModal>
    </div>
  );
}

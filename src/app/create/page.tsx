"use client";

import * as React from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

/**
 * Apple-like romantic single-page builder:
 * - Hero + Builder (no route change)
 * - Steps with cinematic, subtle transitions
 * - Preview only at the end
 * - Keyboard-first: Enter / Ctrl+Enter
 * - Photo upload via /api/upload-photo (server uploads to Supabase)
 *
 * Notes:
 * - We CREATE the gift first, then upload the photo using giftId.
 * - We NEVER set Content-Type manually when sending FormData.
 *
 * Requested change:
 * - Popup opens automatically right after "Create gift link" succeeds.
 * - Remove any "keep editing" helper section inside the popup.
 * - No need to click "Close" to open the popup (and we remove that button).
 *
 * New request:
 * - Show price very small: $4.90 (USD).
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

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function prefersVibration() {
  return typeof navigator !== "undefined" && "vibrate" in navigator;
}
function softHaptic(pattern: number | number[] = 10) {
  try {
    if (prefersVibration()) (navigator as any).vibrate(pattern);
  } catch {
    // ignore
  }
}

function stepAccent(step: StepKey) {
  if (step === "red")
    return {
      dot: "bg-rose-500",
      ring: "ring-rose-500/25",
      glow: "from-rose-500/22 via-pink-500/12 to-amber-500/12",
      chip: "hover:border-rose-500/30 hover:text-foreground",
      bar: "from-rose-500 via-pink-500 to-amber-500",
      stroke: "border-rose-500/15",
      icon: "text-rose-500/80",
    };
  if (step === "green")
    return {
      dot: "bg-emerald-500",
      ring: "ring-emerald-500/25",
      glow: "from-emerald-500/18 via-sky-500/12 to-rose-500/10",
      chip: "hover:border-emerald-500/30 hover:text-foreground",
      bar: "from-emerald-500 via-sky-500 to-rose-500",
      stroke: "border-emerald-500/15",
      icon: "text-emerald-500/80",
    };
  if (step === "photo")
    return {
      dot: "bg-sky-500",
      ring: "ring-sky-500/25",
      glow: "from-sky-500/18 via-violet-500/10 to-rose-500/10",
      chip: "hover:border-sky-500/30 hover:text-foreground",
      bar: "from-sky-500 via-violet-500 to-rose-500",
      stroke: "border-sky-500/15",
      icon: "text-sky-500/80",
    };
  if (step === "yellow")
    return {
      dot: "bg-amber-500",
      ring: "ring-amber-500/25",
      glow: "from-amber-500/18 via-rose-500/12 to-sky-500/12",
      chip: "hover:border-amber-500/30 hover:text-foreground",
      bar: "from-amber-500 via-rose-500 to-sky-500",
      stroke: "border-amber-500/15",
      icon: "text-amber-500/80",
    };
  if (step === "confirm")
    return {
      dot: "bg-sky-500",
      ring: "ring-sky-500/25",
      glow: "from-sky-500/16 via-rose-500/12 to-amber-500/12",
      chip: "hover:border-sky-500/30 hover:text-foreground",
      bar: "from-sky-500 via-rose-500 to-amber-500",
      stroke: "border-sky-500/15",
      icon: "text-sky-500/80",
    };

  return {
    dot: "bg-rose-500",
    ring: "ring-foreground/10",
    glow: "from-rose-500/16 via-amber-500/10 to-sky-500/10",
    chip: "hover:border-foreground/25 hover:text-foreground",
    bar: "from-rose-500 via-amber-500 to-sky-500",
    stroke: "border-foreground/10",
    icon: "text-rose-500/80",
  };
}

/** ===== Tiny icons ===== */

function IconHeart({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={cx("h-4 w-4", className)}>
      <path
        d="M12 21s-7.2-4.35-9.6-8.55C.3 8.85 2.25 5.4 5.85 5.1c1.95-.15 3.45.9 4.2 2.1.75-1.2 2.25-2.25 4.2-2.1 3.6.3 5.55 3.75 3.45 7.35C19.2 16.65 12 21 12 21z"
        fill="currentColor"
      />
    </svg>
  );
}

function IconSpark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={cx("h-4 w-4", className)}>
      <path
        d="M12 2l1.2 5.2L18 9l-4.8 1.8L12 16l-1.2-5.2L6 9l4.8-1.8L12 2zm7 8l.6 2.6L22 14l-2.4.9L19 18l-.6-3.1L16 14l2.4-1.4L19 10zM4 10l.6 2.6L7 14l-2.4.9L4 18l-.6-3.1L1 14l2.4-1.4L4 10z"
        fill="currentColor"
      />
    </svg>
  );
}

function IconPhoto({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={cx("h-4 w-4", className)}>
      <path
        d="M20 5h-3.2l-1.2-1.4A2 2 0 0014.1 3H9.9a2 2 0 00-1.5.6L7.2 5H4a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V7a2 2 0 00-2-2zm0 14H4V7h3.9l1.7-2h4.8l1.7 2H20v12zm-8-1a5 5 0 110-10 5 5 0 010 10zm0-2.2a2.8 2.8 0 100-5.6 2.8 2.8 0 000 5.6z"
        fill="currentColor"
      />
    </svg>
  );
}

function IconX({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={cx("h-4 w-4", className)}>
      <path
        d="M18.3 5.7a1 1 0 00-1.4 0L12 10.6 7.1 5.7a1 1 0 00-1.4 1.4l4.9 4.9-4.9 4.9a1 1 0 001.4 1.4l4.9-4.9 4.9 4.9a1 1 0 001.4-1.4L13.4 12l4.9-4.9a1 1 0 000-1.4z"
        fill="currentColor"
      />
    </svg>
  );
}

function IconLink({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={cx("h-4 w-4", className)}>
      <path
        d="M10.6 13.4a1 1 0 001.4 1.4l4.95-4.95a3 3 0 10-4.24-4.24l-2.12 2.12a1 1 0 101.4 1.4l2.12-2.12a1 1 0 112.83 2.83l-4.95 4.95zM13.4 10.6a1 1 0 00-1.4-1.4l-4.95 4.95a3 3 0 104.24 4.24l2.12-2.12a1 1 0 10-1.4-1.4l-2.12 2.12a1 1 0 11-2.83-2.83l4.95-4.95z"
        fill="currentColor"
      />
    </svg>
  );
}

/** ===== Background ===== */

function PremiumBg({ step }: { step: StepKey }) {
  const reduce = useReducedMotion();

  const pos =
    step === "hero"
      ? "18% 18%"
      : step === "red"
      ? "22% 30%"
      : step === "green"
      ? "80% 22%"
      : step === "photo"
      ? "70% 55%"
      : step === "yellow"
      ? "58% 82%"
      : "52% 44%";

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-background" />
      <div className="absolute inset-0 bg-[radial-gradient(1200px_circle_at_15%_18%,rgba(244,114,182,0.18),transparent_55%),radial-gradient(900px_circle_at_85%_20%,rgba(251,191,36,0.12),transparent_55%),radial-gradient(900px_circle_at_55%_92%,rgba(56,189,248,0.10),transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(1100px_circle_at_50%_50%,transparent_38%,rgba(0,0,0,0.22)_100%)] dark:bg-[radial-gradient(1100px_circle_at_50%_50%,transparent_38%,rgba(0,0,0,0.62)_100%)]" />
      <div className="absolute inset-0 opacity-[0.05] [background-image:radial-gradient(rgba(255,255,255,0.55)_1px,transparent_1px)] [background-size:8px_8px]" />

      <motion.div
        className="absolute inset-0"
        animate={{
          backgroundImage: `radial-gradient(900px_circle_at_${pos}, rgba(255,255,255,0.10), transparent 62%)`,
        }}
        transition={{ duration: 0.75, ease: "easeOut" }}
      />

      {!reduce && (
        <motion.div
          className="absolute -inset-10 opacity-[0.30]"
          animate={{ y: [0, -12, 0] }}
          transition={{ duration: 8, ease: "easeInOut", repeat: Infinity }}
        >
          <div className="absolute left-[12%] top-[32%] h-16 w-16 rounded-full bg-rose-500/10 blur-2xl" />
          <div className="absolute left-[76%] top-[18%] h-20 w-20 rounded-full bg-amber-500/10 blur-2xl" />
          <div className="absolute left-[58%] top-[76%] h-24 w-24 rounded-full bg-sky-500/10 blur-2xl" />
        </motion.div>
      )}
    </div>
  );
}

function StepWipe({ show }: { show: boolean }) {
  const reduce = useReducedMotion();
  if (reduce) return null;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="pointer-events-none fixed inset-0 z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
        >
          <motion.div
            className="absolute inset-0 bg-background/10 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          />
          <motion.div
            className="absolute -inset-24"
            style={{
              background:
                "linear-gradient(115deg, rgba(244,114,182,0.22), rgba(251,191,36,0.14), rgba(56,189,248,0.16))",
            }}
            initial={{ x: "-70%", rotate: -7, opacity: 0.0 }}
            animate={{ x: "70%", rotate: -7, opacity: 0.95 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.56, ease: "easeInOut" }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** ===== UI bits ===== */

function TopPill({ step }: { step: StepKey }) {
  const a = stepAccent(step);
  return (
    <div className="inline-flex items-center gap-2 rounded-full border bg-background/55 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
      <span className={cx("h-1.5 w-1.5 rounded-full", a.dot)} />
      Designed to land like a memory
    </div>
  );
}

function MinimalProgress({ step, progress }: { step: StepKey; progress: number }) {
  const label =
    step === "hero"
      ? "Home"
      : step === "red"
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
    <div className="mt-6 flex items-center justify-between gap-4">
      <div className="text-xs text-muted-foreground">
        <span className="text-foreground/85">{label}</span> • {progress}%
      </div>

      <div className="relative h-2 w-44 overflow-hidden rounded-full bg-muted/40">
        <motion.div
          className={cx("absolute inset-0 opacity-30", "bg-gradient-to-r", a.bar)}
          animate={{ x: ["-30%", "30%", "-30%"] }}
          transition={{ duration: 3.8, ease: "easeInOut", repeat: Infinity }}
        />
        <div className={cx("relative h-full rounded-full bg-gradient-to-r transition-all", a.bar)} style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-2 text-xs text-rose-500">
      {msg}
    </motion.div>
  );
}

function KeyHint({ children }: { children: React.ReactNode }) {
  return <div className="text-[11px] text-muted-foreground">{children}</div>;
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
        "inline-flex items-center gap-2 rounded-full border bg-background/55 px-3 py-1 text-xs text-muted-foreground backdrop-blur transition",
        "hover:bg-background/75 active:scale-[0.99]",
        "focus:outline-none focus:ring-2 focus:ring-foreground/15",
        a.chip
      )}
    >
      {icon ? <span className={cx("opacity-80", a.icon)}>{icon}</span> : null}
      {children}
    </button>
  );
}

function Sparkles({ step, active }: { step: StepKey; active: boolean }) {
  const reduce = useReducedMotion();
  const a = stepAccent(step);
  if (reduce) return null;

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          className="pointer-events-none absolute inset-0 overflow-hidden rounded-[28px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className={cx("absolute -top-10 left-8 h-24 w-24 rounded-full blur-2xl", a.dot, "opacity-10")}
            animate={{ y: [0, 16, 0], x: [0, 8, 0] }}
            transition={{ duration: 2.8, ease: "easeInOut", repeat: Infinity }}
          />
          <motion.div
            className="absolute -bottom-12 right-10 h-28 w-28 rounded-full bg-sky-500/10 blur-2xl"
            animate={{ y: [0, -16, 0], x: [0, -10, 0] }}
            transition={{ duration: 3.0, ease: "easeInOut", repeat: Infinity }}
          />
          <motion.div
            className="absolute top-10 right-28 h-20 w-20 rounded-full bg-amber-500/10 blur-2xl"
            animate={{ y: [0, 10, 0], x: [0, -6, 0] }}
            transition={{ duration: 2.9, ease: "easeInOut", repeat: Infinity }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function LoveScore({
  redLen,
  hasDate,
  hasPhoto,
  letterLen,
}: {
  redLen: number;
  hasDate: boolean;
  hasPhoto: boolean;
  letterLen: number;
}) {
  const score =
    (clamp(redLen, 0, 80) / 80) * 25 + (hasDate ? 20 : 0) + (hasPhoto ? 20 : 0) + (clamp(letterLen, 0, 4000) / 4000) * 35;

  const rounded = Math.round(score);

  const label =
    rounded >= 90 ? "This is going to hit." : rounded >= 75 ? "Almost unforgettable." : rounded >= 55 ? "It’s warming up." : "Start with one true detail.";

  return (
    <div className="rounded-2xl border bg-background/55 p-4 backdrop-blur">
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs text-muted-foreground">Moment strength</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
      <div className="mt-2 flex items-end justify-between">
        <div className="text-3xl font-semibold tracking-tight">{rounded}</div>
        <div className="text-[11px] text-muted-foreground">/ 100</div>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted/40">
        <div className="h-full bg-gradient-to-r from-rose-500 via-pink-500 to-amber-500" style={{ width: `${rounded}%` }} />
      </div>
      <div className="mt-3 text-[11px] text-muted-foreground">
        Your photo is the “oh wow” moment. Pick the one that says <span className="text-foreground/75">us</span>.
      </div>
    </div>
  );
}

/** ===== Confirm preview (includes photo) ===== */

function ConfirmPreview({
  red,
  duration,
  startDate,
  letter,
  photoPreviewUrl,
}: {
  red: string;
  duration: string;
  startDate: string;
  letter: string;
  photoPreviewUrl: string | null;
}) {
  const lines = letter.trim() ? letter.trim().split("\n").filter(Boolean).slice(0, 10) : [];

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border bg-background/65 p-6 shadow-sm backdrop-blur">
        <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-2">
            <IconHeart className="h-4 w-4 text-rose-500/80" />
            Your line
          </span>
          <span className="h-2 w-2 rounded-full bg-rose-500/70" />
        </div>
        <div className="text-2xl font-semibold leading-snug tracking-tight">{red.trim() ? `“${red.trim()}”` : "—"}</div>
        <div className="mt-3 text-[11px] text-muted-foreground">Make it specific. One private detail beats ten generic compliments.</div>
      </div>

      <div className="rounded-3xl border bg-background/65 p-6 shadow-sm backdrop-blur">
        <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-2">
            <IconSpark className="h-4 w-4 text-emerald-500/80" />
            Time together
          </span>
          <span className="h-2 w-2 rounded-full bg-emerald-500/70" />
        </div>
        <div className="text-xs text-muted-foreground">Since {startDate || "—"}</div>
        <div className="mt-1 text-4xl font-semibold tracking-tight">{duration}</div>
        <div className="mt-3 text-[11px] text-muted-foreground">This number is simple — and it lands every time.</div>
      </div>

      <div className="rounded-3xl border bg-background/65 p-6 shadow-sm backdrop-blur">
        <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-2">
            <IconPhoto className="h-4 w-4 text-sky-500/80" />
            The photo
          </span>
          <span className="h-2 w-2 rounded-full bg-sky-500/70" />
        </div>

        {photoPreviewUrl ? (
          <div className="relative overflow-hidden rounded-2xl border bg-muted/10">
            <img src={photoPreviewUrl} alt="Couple photo preview" className="h-[220px] w-full object-cover" />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
            <div className="pointer-events-none absolute bottom-3 left-3 text-xs text-white/85">Choose your most meaningful photo — this is the reveal.</div>
          </div>
        ) : (
          <div className="rounded-2xl border bg-muted/10 p-4 text-sm text-muted-foreground">—</div>
        )}

        <div className="mt-3 text-xs text-muted-foreground">
          Tip: pick a photo that instantly brings you back. A laugh. A trip. A night that felt like forever.
        </div>
      </div>

      <div className="rounded-3xl border bg-background/65 p-6 shadow-sm backdrop-blur">
        <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-2">
            <IconSpark className="h-4 w-4 text-amber-500/80" />
            The letter
          </span>
          <span className="h-2 w-2 rounded-full bg-amber-500/70" />
        </div>

        <div className="space-y-2">
          {lines.map((l, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.02 }}
              className="text-sm leading-relaxed text-foreground/90"
            >
              {l}
            </motion.div>
          ))}
        </div>

        <div className="mt-5 text-xs text-muted-foreground">
          The premium <span className="text-foreground/75">spin → reveal</span> unlocks after payment.
        </div>
      </div>
    </div>
  );
}

/** ===== Premium popup (shows Link Ready dynamically) ===== */

function LinkReadyPopup({
  open,
  onOpenChange,
  slug,
  onCopy,
  onPreview,
  onPay,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  slug: string;
  onCopy: () => void;
  onPreview: () => void;
  onPay: () => void;
}) {
  const reduce = useReducedMotion();
  const dialogRef = React.useRef<HTMLDivElement | null>(null);

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const path = `/g/${slug}`;

  React.useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => dialogRef.current?.focus(), 30);
    return () => window.clearTimeout(t);
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[70] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onOpenChange(false);
          }}
        >
          <motion.div
            className="absolute inset-0 bg-black/40 backdrop-blur-[8px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            tabIndex={-1}
            ref={dialogRef}
            onKeyDown={(e) => {
              if (e.key === "Escape") onOpenChange(false);
            }}
            className={cx(
              "relative w-full max-w-xl overflow-hidden rounded-[32px] border bg-background/70 shadow-[0_40px_160px_-70px_rgba(0,0,0,0.75)] backdrop-blur",
              "focus:outline-none focus:ring-2 focus:ring-foreground/15"
            )}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 18, scale: 0.985, filter: "blur(10px)" }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 14, scale: 0.985, filter: "blur(10px)" }}
            transition={{ duration: reduce ? 0.16 : 0.34, ease: "easeOut" }}
          >
            <motion.div
              aria-hidden="true"
              className="pointer-events-none absolute -inset-8 bg-[radial-gradient(700px_circle_at_20%_15%,rgba(244,114,182,0.22),transparent_50%),radial-gradient(650px_circle_at_80%_20%,rgba(251,191,36,0.16),transparent_55%),radial-gradient(700px_circle_at_55%_85%,rgba(56,189,248,0.14),transparent_55%)]"
              animate={{ opacity: [0.55, 0.85, 0.55] }}
              transition={{ duration: 5.0, ease: "easeInOut", repeat: Infinity }}
            />

            <div className="relative p-6 sm:p-7">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-2 rounded-full border bg-background/55 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
                    <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                    Link ready ✨
                  </div>
                  <div className="mt-2 text-2xl font-semibold tracking-tight">Your moment is live.</div>
                  <div className="text-sm text-muted-foreground">Pay to unlock the premium wheel + reveal. After payment, it’s locked.</div>
                  <div className="text-[11px] text-muted-foreground">{PRICE_MICROCOPY}</div>
                </div>

                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className={cx(
                    "inline-flex h-10 w-10 items-center justify-center rounded-full border bg-background/55 text-muted-foreground backdrop-blur transition",
                    "hover:bg-background/75 hover:text-foreground active:scale-[0.98]",
                    "focus:outline-none focus:ring-2 focus:ring-foreground/15"
                  )}
                  aria-label="Close"
                >
                  <IconX className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-5 rounded-2xl border bg-background/70 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[11px] text-muted-foreground">Shareable link</div>
                    <div className="mt-1 flex items-center gap-2 text-sm">
                      <IconLink className="h-4 w-4 text-muted-foreground" />
                      <div className="min-w-0 truncate">
                        <span className="text-muted-foreground">{origin ? `${origin}` : ""}</span>
                        <span className="font-mono">{path}</span>
                      </div>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="secondary"
                    className="rounded-full"
                    onClick={() => {
                      softHaptic(10);
                      onCopy();
                    }}
                  >
                    Copy
                  </Button>
                </div>
              </div>

              <div className="mt-5 grid gap-2 sm:grid-cols-3">
                <Button type="button" variant="outline" className="rounded-full" onClick={onPreview}>
                  Open preview
                </Button>
                <Button type="button" variant="secondary" className="rounded-full" onClick={onCopy}>
                  Copy link
                </Button>
                <Button
                  type="button"
                  className="rounded-full bg-gradient-to-r from-rose-500 via-pink-500 to-amber-500 text-white hover:opacity-95"
                  onClick={onPay}
                >
                  Pay & unlock
                </Button>
              </div>

              <div className="mt-4 text-[11px] text-muted-foreground">
                Pro tip: after payment, add a 2–3s “premium” animation before the reveal. It makes the moment land.
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** ===== Photo helper ===== */

const MAX_PHOTO_MB = 8;
const MAX_BYTES = MAX_PHOTO_MB * 1024 * 1024;

function isValidImage(file: File) {
  return file.type.startsWith("image/");
}

export default function CreatePage() {
  const reduce = useReducedMotion();

  const [step, setStep] = React.useState<StepKey>("hero");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [created, setCreated] = React.useState<{ id: string; slug: string } | null>(null);

  const [wipe, setWipe] = React.useState(false);
  const navLockRef = React.useRef(false);

  const [typing, setTyping] = React.useState(false);
  const typingTimer = React.useRef<number | null>(null);

  const [photoFile, setPhotoFile] = React.useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const [linkPopupOpen, setLinkPopupOpen] = React.useState(false);

  React.useEffect(() => {
    return () => {
      if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
    };
  }, [photoPreviewUrl]);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { redPhrase: "", relationshipStartAt: "", loveLetter: "" },
    mode: "onChange",
  });

  const v = form.watch();
  const a = stepAccent(step);

  const startDate = v.relationshipStartAt ? new Date(dateToStableIso(v.relationshipStartAt)) : null;
  const duration = startDate ? formatDuration(startDate, new Date()) : "—";

  const redLen = v.redPhrase.trim().length;
  const letterLen = v.loveLetter.trim().length;

  const filledCount =
    (redLen >= 3 ? 1 : 0) + (v.relationshipStartAt ? 1 : 0) + (photoFile ? 1 : 0) + (letterLen >= 30 ? 1 : 0);

  const progress = Math.round((filledCount / 4) * 100);

  const redRef = React.useRef<HTMLInputElement | null>(null);
  const dateRef = React.useRef<HTMLInputElement | null>(null);
  const letterRef = React.useRef<HTMLTextAreaElement | null>(null);

  React.useEffect(() => {
    const t = setTimeout(() => {
      if (step === "red") redRef.current?.focus();
      if (step === "green") dateRef.current?.focus();
      if (step === "yellow") letterRef.current?.focus();
    }, 110);
    return () => clearTimeout(t);
  }, [step]);

  const stepOrder: StepKey[] = ["hero", "red", "green", "photo", "yellow", "confirm"];

  function pingTyping() {
    setTyping(true);
    if (typingTimer.current) window.clearTimeout(typingTimer.current);
    typingTimer.current = window.setTimeout(() => setTyping(false), 520);
  }

  function canAdvanceFrom(s: StepKey) {
    if (s === "hero") return true;
    if (s === "red") return redLen >= 3;
    if (s === "green") return !!v.relationshipStartAt;
    if (s === "photo") return !!photoFile;
    if (s === "yellow") return letterLen >= 30;
    if (s === "confirm") return form.formState.isValid && !!photoFile;
    return false;
  }

  async function doStepChange(nextStep: StepKey) {
    if (navLockRef.current) return;
    navLockRef.current = true;

    softHaptic([8, 12, 8]);

    if (!reduce) setWipe(true);
    setTimeout(() => setStep(nextStep), reduce ? 0 : 140);

    setTimeout(() => {
      setWipe(false);
      navLockRef.current = false;
    }, reduce ? 120 : 650);
  }

  async function next() {
    if (!canAdvanceFrom(step)) {
      if (step === "red") await form.trigger("redPhrase");
      if (step === "green") await form.trigger("relationshipStartAt");
      if (step === "yellow") await form.trigger("loveLetter");
      if (step === "photo")
        toast.message("Pick a photo that *says* something.", { description: "The reveal moment lives or dies on this choice." });

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

  // keyboard-first
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (linkPopupOpen) {
          e.preventDefault();
          setLinkPopupOpen(false);
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

      if (step === "hero" || step === "red" || step === "green" || step === "photo" || step === "confirm") {
        e.preventDefault();
        next();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, v.redPhrase, v.relationshipStartAt, v.loveLetter, photoFile, linkPopupOpen]);

  function setPhoto(file: File | null) {
    if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);

    if (!file) {
      setPhotoFile(null);
      setPhotoPreviewUrl(null);
      return;
    }

    if (!isValidImage(file)) {
      toast.error("That file won’t work.", { description: "Choose an image (JPG/PNG/WebP)." });
      softHaptic(22);
      return;
    }

    if (file.size > MAX_BYTES) {
      toast.error("That image is too big.", { description: `Keep it under ${MAX_PHOTO_MB}MB.` });
      softHaptic(22);
      return;
    }

    setPhotoFile(file);
    setPhotoPreviewUrl(URL.createObjectURL(file));
    toast.message("Photo locked in.", { description: "Pick the one that instantly brings you back." });
    softHaptic([10, 14, 10]);
    pingTyping();
  }

  async function uploadPhotoToSupabase(file: File, giftId: string) {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("giftId", giftId);

    const res = await fetch("/api/upload-photo", {
      method: "POST",
      body: fd,
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data?.error ?? "Photo upload failed.");
    return data as { url: string; path: string };
  }

  async function onCreate(values: FormValues) {
    if (!photoFile) {
      toast.error("Add a photo to continue.", { description: "This is the reveal moment — don’t skip it." });
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

      // OPEN POPUP AUTOMATICALLY
      setLinkPopupOpen(true);

      toast.success("Link created.", { description: "Now unlock the premium reveal ✨" });
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
      toast.error("Couldn’t copy.");
      softHaptic(22);
    }
  }

  const canSubmit = form.formState.isValid && !isSubmitting && !!photoFile;

  const quickLine = [
    "I’d choose you again. Every time.",
    "You feel like home — even in chaos.",
    "My favorite plan is still: you.",
    "You’re the calm I didn’t know I needed.",
    "If I could replay one thing, it’d be us.",
    "I’m proud of us. Always.",
  ];

  const quickPrompts = [
    "The moment I knew it was you was…",
    "My favorite memory with you is…",
    "Thank you for…",
    "I love the way you…",
    "Here’s what I promise you…",
    "If we’re old someday, I hope we still…",
  ];

  const headline =
    step === "hero"
      ? "Turn three truths into a premium reveal."
      : step === "red"
      ? "Write the line that stops them."
      : step === "green"
      ? "Pick the day your story began."
      : step === "photo"
      ? "Choose the photo that says everything."
      : step === "yellow"
      ? "Write the letter they’ll keep."
      : "Preview it like it’s already theirs.";

  const sub =
    step === "hero"
      ? "One line. One date. One photo. One letter. We turn it into a cinematic spin → reveal moment."
      : step === "red"
      ? "Not generic. Not polite. Something only you could say."
      : step === "green"
      ? "This powers the live “time together” counter — a simple detail that hits hard."
      : step === "photo"
      ? "Pick the most meaningful one. This is the moment they’ll remember."
      : step === "yellow"
      ? "One memory + one gratitude + one promise. Keep it real."
      : "If it feels right, create the link — we’ll open your share + unlock popup immediately.";

  const scene = {
    initial: reduce ? { opacity: 0 } : { opacity: 0, y: 18, filter: "blur(9px)", scale: 0.992 },
    animate: reduce ? { opacity: 1 } : { opacity: 1, y: 0, filter: "blur(0px)", scale: 1 },
    exit: reduce ? { opacity: 0 } : { opacity: 0, y: -10, filter: "blur(9px)", scale: 0.992 },
    transition: { duration: reduce ? 0.15 : 0.44, ease: "easeOut" as const },
  };

  return (
    <div className="min-h-screen">
      <PremiumBg step={step} />
      <StepWipe show={wipe} />

      {created && (
        <LinkReadyPopup
          open={linkPopupOpen}
          onOpenChange={(v) => {
            setLinkPopupOpen(v);
            if (v) softHaptic([8, 12, 8]);
          }}
          slug={created.slug}
          onCopy={copyLink}
          onPreview={() => window.open(`/g/${created.slug}`, "_blank")}
          onPay={payAndUnlock}
        />
      )}

      <div className="mx-auto max-w-3xl px-5 py-10 md:py-14">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <TopPill step={step} />
          <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-5xl">{headline}</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">{sub}</p>

          {/* tiny price hint (kept subtle) */}
          {(step === "hero" || step === "confirm") && (
            <div className="mt-2 text-[11px] text-muted-foreground">{PRICE_MICROCOPY}</div>
          )}

          <MinimalProgress step={step} progress={progress} />
        </motion.div>

        <div className="relative">
          <motion.div
            className={cx("pointer-events-none absolute -inset-2 rounded-[34px] blur-2xl", "bg-gradient-to-r", a.glow)}
            animate={{ opacity: [0.22, 0.42, 0.22], scale: [1, 1.015, 1] }}
            transition={{ duration: 4.4, ease: "easeInOut", repeat: Infinity }}
          />
          <div className="pointer-events-none absolute -inset-px rounded-[32px] bg-gradient-to-r from-transparent via-foreground/10 to-transparent opacity-60" />

          <div className={cx("relative rounded-[32px] ring-1", a.ring)}>
            <Card className="border bg-background/55 shadow-[0_30px_120px_-60px_rgba(0,0,0,0.55)] backdrop-blur">
              <CardContent className="relative p-7 md:p-10">
                <Sparkles step={step} active={typing} />

                <AnimatePresence mode="wait">
                  {/* HERO */}
                  {step === "hero" && (
                    <motion.div key="hero" {...scene} className="space-y-6">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="text-xs text-muted-foreground">Minimal. Fast. Built for emotional payoff.</div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-rose-500/70" />
                            Words
                          </span>
                          <span className="inline-flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-sky-500/70" />
                            Photo reveal
                          </span>
                          <span className="inline-flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-amber-500/70" />
                            Premium moment
                          </span>
                        </div>
                      </div>

                      <LoveScore redLen={redLen} hasDate={!!v.relationshipStartAt} hasPhoto={!!photoFile} letterLen={letterLen} />

                      <div className="rounded-2xl border bg-background/55 p-4 backdrop-blur">
                        <div className="text-xs text-muted-foreground">A quick recipe</div>
                        <div className="mt-2 grid gap-2 text-sm text-foreground/90">
                          <div className="flex items-start gap-2">
                            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-rose-500/80" />
                            <span>
                              <span className="font-medium">One line</span> that only you could write.
                            </span>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-500/80" />
                            <span>
                              <span className="font-medium">One date</span> that marks the start.
                            </span>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-sky-500/80" />
                            <span>
                              <span className="font-medium">One photo</span> that makes them pause.
                            </span>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-amber-500/80" />
                            <span>
                              <span className="font-medium">One letter</span> they’ll save.
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <KeyHint>
                          Press <span className="font-mono">Enter</span> to begin.
                        </KeyHint>

                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="secondary"
                            className="rounded-full"
                            onClick={() =>
                              toast.message("Tip", {
                                description: "Add one private detail. That’s what turns this into a real moment.",
                              })
                            }
                          >
                            Quick tip
                          </Button>

                          <Button
                            type="button"
                            onClick={next}
                            className="rounded-full px-6 bg-gradient-to-r from-rose-500 via-pink-500 to-amber-500 text-white hover:opacity-95"
                          >
                            Begin
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* RED */}
                  {step === "red" && (
                    <motion.div key="red" {...scene} className="space-y-6">
                      <div className="flex items-end justify-between gap-4">
                        <div>
                          <div className="text-xs text-muted-foreground">Step 1 of 4</div>
                          <div className="mt-1 text-2xl font-semibold tracking-tight">Write the line that stops them.</div>
                          <div className="mt-2 text-sm text-muted-foreground">
                            Aim for <span className="text-foreground/80">specific</span>, not perfect.
                          </div>
                        </div>

                        <div className="rounded-2xl border bg-background/55 px-3 py-2 text-xs text-muted-foreground">
                          <span className="text-foreground/80">{redLen}</span>/80
                        </div>
                      </div>

                      <div className={cx("rounded-3xl border bg-background/55 p-6", a.stroke)}>
                        <Label htmlFor="redPhrase" className="text-xs text-muted-foreground">
                          Your line (the one they’ll replay)
                        </Label>

                        <div className="relative mt-2">
                          <motion.div
                            className="pointer-events-none absolute -inset-2 rounded-3xl bg-gradient-to-r from-rose-500/16 via-pink-500/10 to-amber-500/10 blur-xl"
                            animate={{ opacity: [0.14, 0.28, 0.14] }}
                            transition={{ duration: 3.0, ease: "easeInOut", repeat: Infinity }}
                          />
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
                                  form.setValue("redPhrase", e.target.value, {
                                    shouldValidate: true,
                                    shouldDirty: true,
                                  });
                                  pingTyping();
                                }}
                                className="relative h-12 rounded-2xl text-base bg-background/70 focus-visible:ring-2 focus-visible:ring-foreground/15"
                              />
                            );
                          })()}

                        </div>

                        <FieldError msg={form.formState.errors.redPhrase?.message} />

                        <div className="mt-4 rounded-2xl border bg-background/60 p-4 text-xs text-muted-foreground">
                          <div className="font-medium text-foreground/85">Make it hit:</div>
                          <div className="mt-2 grid gap-1">
                            <div>• Mention a shared thing: a place, a joke, a habit.</div>
                            <div>• Keep it short enough to screenshot.</div>
                            <div>• Avoid “you’re amazing” — say why, once.</div>
                          </div>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          {quickLine.map((t) => (
                            <GhostChip
                              key={t}
                              step={step}
                              icon={<IconHeart className="h-4 w-4" />}
                              onClick={() => {
                                form.setValue("redPhrase", t, { shouldValidate: true, shouldDirty: true });
                                toast.message("Inserted", { description: "Now tweak it to sound like you." });
                                pingTyping();
                              }}
                            >
                              {t}
                            </GhostChip>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <Button type="button" variant="secondary" className="rounded-full" onClick={back}>
                          Back
                        </Button>
                        <div className="flex items-center gap-3">
                          <KeyHint>
                            <span className="font-mono">Enter</span> to continue
                          </KeyHint>
                          <Button
                            type="button"
                            onClick={next}
                            disabled={!canAdvanceFrom("red")}
                            className="rounded-full px-6 bg-gradient-to-r from-rose-500 via-pink-500 to-amber-500 text-white hover:opacity-95 disabled:opacity-60"
                          >
                            Continue
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* GREEN */}
                  {step === "green" && (
                    <motion.div key="green" {...scene} className="space-y-6">
                      <div className="flex items-end justify-between gap-4">
                        <div>
                          <div className="text-xs text-muted-foreground">Step 2 of 4</div>
                          <div className="mt-1 text-2xl font-semibold tracking-tight">Pick the day it began.</div>
                          <div className="mt-2 text-sm text-muted-foreground">This powers the live counter.</div>
                        </div>

                        <div className="rounded-2xl border bg-background/55 px-3 py-2 text-xs text-muted-foreground">
                          <span className="text-foreground/80">{duration}</span>
                        </div>
                      </div>

                      <div className={cx("rounded-3xl border bg-background/55 p-6", a.stroke)}>
                        <Label htmlFor="relationshipStartAt" className="text-xs text-muted-foreground">
                          Relationship start date
                        </Label>

                        <div className="relative mt-2">
                          <motion.div
                            className="pointer-events-none absolute -inset-2 rounded-3xl bg-gradient-to-r from-emerald-500/14 via-sky-500/10 to-rose-500/8 blur-xl"
                            animate={{ opacity: [0.12, 0.24, 0.12] }}
                            transition={{ duration: 3.4, ease: "easeInOut", repeat: Infinity }}
                          />
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
                                  form.setValue("relationshipStartAt", e.target.value, {
                                    shouldValidate: true,
                                    shouldDirty: true,
                                  });
                                  pingTyping();
                                }}
                                className={cx(
                                  "relative h-12 rounded-2xl text-base bg-background/70",
                                  "focus-visible:ring-2 focus-visible:ring-foreground/15"
                                )}
                              />
                            );
                          })()}

                        </div>

                        <FieldError msg={form.formState.errors.relationshipStartAt?.message} />

                        <div className="mt-4 rounded-2xl border bg-background/60 p-4 text-xs text-muted-foreground">
                          Choose the date that feels true — the first “we” moment, not the first message.
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <Button type="button" variant="secondary" className="rounded-full" onClick={back}>
                          Back
                        </Button>
                        <div className="flex items-center gap-3">
                          <KeyHint>
                            <span className="font-mono">Enter</span> to continue
                          </KeyHint>
                          <Button
                            type="button"
                            onClick={next}
                            disabled={!canAdvanceFrom("green")}
                            className="rounded-full px-6 bg-gradient-to-r from-emerald-500 via-sky-500 to-rose-500 text-white hover:opacity-95 disabled:opacity-60"
                          >
                            Continue
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* PHOTO */}
                  {step === "photo" && (
                    <motion.div key="photo" {...scene} className="space-y-6">
                      <div className="flex items-end justify-between gap-4">
                        <div>
                          <div className="text-xs text-muted-foreground">Step 3 of 4</div>
                          <div className="mt-1 text-2xl font-semibold tracking-tight">Choose the photo that says everything.</div>
                          <div className="mt-2 text-sm text-muted-foreground">
                            This is the <span className="text-foreground/80">reveal</span>. Pick the most meaningful one.
                          </div>
                        </div>

                        <div className="rounded-2xl border bg-background/55 px-3 py-2 text-xs text-muted-foreground">
                          <span className="text-foreground/80">{photoFile ? "Selected" : "Missing"}</span>
                        </div>
                      </div>

                      <div className={cx("rounded-3xl border bg-background/55 p-6", a.stroke)}>
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold tracking-tight">Couple photo</div>
                            <div className="mt-1 text-xs text-muted-foreground">JPG/PNG/WebP • up to {MAX_PHOTO_MB}MB</div>
                          </div>

                          <div className="flex items-center gap-2">
                            <GhostChip step={step} icon={<IconPhoto className="h-4 w-4" />} onClick={() => fileInputRef.current?.click()}>
                              Choose
                            </GhostChip>
                            {photoFile && (
                              <GhostChip step={step} icon={<IconSpark className="h-4 w-4" />} onClick={() => setPhoto(null)}>
                                Remove
                              </GhostChip>
                            )}
                          </div>
                        </div>

                        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} />

                        <div
                          onDragOver={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const f = e.dataTransfer.files?.[0];
                            if (f) setPhoto(f);
                          }}
                          className={cx(
                            "mt-4 rounded-2xl border bg-muted/10 p-4 transition",
                            "hover:bg-muted/15",
                            "focus-within:ring-2 focus-within:ring-foreground/15"
                          )}
                        >
                          {!photoPreviewUrl ? (
                            <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
                              <div className="inline-flex items-center gap-2 rounded-full border bg-background/55 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
                                <IconPhoto className="h-4 w-4 text-sky-500/80" />
                                Drag & drop or click “Choose”
                              </div>
                              <div className="max-w-sm text-xs text-muted-foreground">
                                Pick the photo that makes your chest feel warm. A laugh. A trip. A night you’ll never forget.
                              </div>
                            </div>
                          ) : (
                            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                              <div className="relative overflow-hidden rounded-2xl border bg-background">
                                <img src={photoPreviewUrl} alt="Selected couple photo preview" className="h-[260px] w-full object-cover" />
                                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                                <div className="pointer-events-none absolute bottom-3 left-3 text-xs text-white/90">This will be revealed after payment.</div>
                              </div>

                              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                                <div className="truncate">
                                  <span className="text-foreground/80">{photoFile?.name}</span>
                                </div>
                                <div>{photoFile ? `${Math.round(photoFile.size / 1024)} KB` : ""}</div>
                              </div>
                            </motion.div>
                          )}
                        </div>

                        {!photoFile ? (
                          <div className="mt-3 text-xs text-muted-foreground">Choose carefully — this is the “oh wow” moment.</div>
                        ) : (
                          <div className="mt-3 text-xs text-muted-foreground">Perfect. This is the moment.</div>
                        )}
                      </div>

                      <div className="flex items-center justify-between">
                        <Button type="button" variant="secondary" className="rounded-full" onClick={back}>
                          Back
                        </Button>
                        <div className="flex items-center gap-3">
                          <KeyHint>
                            <span className="font-mono">Enter</span> to continue
                          </KeyHint>
                          <Button
                            type="button"
                            onClick={next}
                            disabled={!canAdvanceFrom("photo")}
                            className="rounded-full px-6 bg-gradient-to-r from-sky-500 via-violet-500 to-rose-500 text-white hover:opacity-95 disabled:opacity-60"
                          >
                            Continue
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* YELLOW */}
                  {step === "yellow" && (
                    <motion.div key="yellow" {...scene} className="space-y-6">
                      <div className="flex items-end justify-between gap-4">
                        <div>
                          <div className="text-xs text-muted-foreground">Step 4 of 4</div>
                          <div className="mt-1 text-2xl font-semibold tracking-tight">Write the letter they’ll keep.</div>
                          <div className="mt-2 text-sm text-muted-foreground">One memory + one gratitude + one promise. Keep it real.</div>
                        </div>

                        <div className="rounded-2xl border bg-background/55 px-3 py-2 text-xs text-muted-foreground">
                          <span className="text-foreground/80">{letterLen}</span>/4000
                        </div>
                      </div>

                      <div className={cx("rounded-3xl border bg-background/55 p-6", a.stroke)}>
                        <Label htmlFor="loveLetter" className="text-xs text-muted-foreground">
                          Your letter (make it undeniable)
                        </Label>

                        <div className="relative mt-2">
                          <motion.div
                            className="pointer-events-none absolute -inset-2 rounded-3xl bg-gradient-to-r from-amber-500/14 via-rose-500/10 to-sky-500/10 blur-xl"
                            animate={{ opacity: [0.12, 0.26, 0.12] }}
                            transition={{ duration: 3.2, ease: "easeInOut", repeat: Infinity }}
                          />
                          {(() => {
                              const { ref: rhfRef, ...letterReg } = form.register("loveLetter");

                              return (
                                <Textarea
                                  id="loveLetter"
                                  placeholder={"The moment I knew it was you was...\n\nThank you for...\n\nHere’s what I promise you..."}
                                  {...letterReg}
                                  ref={(el) => {
                                    rhfRef(el);
                                    letterRef.current = el;
                                  }}
                                  onChange={(e) => {
                                    letterReg.onChange(e);
                                    form.setValue("loveLetter", e.target.value, {
                                      shouldValidate: true,
                                      shouldDirty: true,
                                    });
                                    pingTyping();
                                  }}
                                  className={cx(
                                    "relative min-h-[240px] rounded-2xl text-base bg-background/70",
                                    "focus-visible:ring-2 focus-visible:ring-foreground/15"
                                  )}
                                />
                              );
                            })()}

                        </div>

                        <FieldError msg={form.formState.errors.loveLetter?.message} />

                        <div className="mt-4 rounded-2xl border bg-background/60 p-4 text-xs text-muted-foreground">
                          <div className="font-medium text-foreground/85">A simple structure that works:</div>
                          <div className="mt-2 grid gap-1">
                            <div>• A memory: “I still think about…”</div>
                            <div>• A thank you: “You changed my life by…”</div>
                            <div>• A promise: “I will always…”</div>
                          </div>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          {quickPrompts.map((t) => (
                            <GhostChip
                              key={t}
                              step={step}
                              icon={<IconSpark className="h-4 w-4" />}
                              onClick={() => {
                                const curr = form.getValues("loveLetter") || "";
                                const nextVal = curr.trim() ? curr.replace(/\s*$/, "") + "\n" + t + " " : t + " ";
                                form.setValue("loveLetter", nextVal, { shouldValidate: true, shouldDirty: true });
                                toast.message("Added", { description: "Now make it yours with details." });
                                pingTyping();
                                setTimeout(() => letterRef.current?.focus(), 50);
                              }}
                            >
                              {t}
                            </GhostChip>
                          ))}
                        </div>

                        <div className="mt-4 text-xs text-muted-foreground">
                          Shortcut: <span className="font-mono">Ctrl+Enter</span> to continue.
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <Button type="button" variant="secondary" className="rounded-full" onClick={back}>
                          Back
                        </Button>
                        <Button
                          type="button"
                          onClick={next}
                          disabled={!canAdvanceFrom("yellow")}
                          className="rounded-full px-6 bg-gradient-to-r from-amber-500 via-rose-500 to-sky-500 text-white hover:opacity-95 disabled:opacity-60"
                        >
                          Review
                        </Button>
                      </div>
                    </motion.div>
                  )}

                  {/* CONFIRM */}
                  {step === "confirm" && (
                    <motion.div key="confirm" {...scene} className="space-y-6">
                      <div className="flex flex-wrap items-end justify-between gap-3">
                        <div>
                          <div className="text-xs text-muted-foreground">Preview</div>
                          <div className="mt-1 text-2xl font-semibold tracking-tight">Preview it like it’s already theirs.</div>
                          <div className="mt-2 text-sm text-muted-foreground">If it hits, create the link — we’ll open your unlock popup immediately.</div>
                          <div className="mt-2 text-[11px] text-muted-foreground">{PRICE_MICROCOPY}</div>
                        </div>

                        <div className="flex items-center gap-2">
                          <GhostChip step={step} onClick={() => doStepChange("red")} icon={<IconHeart className="h-4 w-4" />}>
                            Edit line
                          </GhostChip>
                          <GhostChip step={step} onClick={() => doStepChange("green")} icon={<IconSpark className="h-4 w-4" />}>
                            Edit date
                          </GhostChip>
                          <GhostChip step={step} onClick={() => doStepChange("photo")} icon={<IconPhoto className="h-4 w-4" />}>
                            Edit photo
                          </GhostChip>
                          <GhostChip step={step} onClick={() => doStepChange("yellow")} icon={<IconSpark className="h-4 w-4" />}>
                            Edit letter
                          </GhostChip>
                        </div>
                      </div>

                      <ConfirmPreview red={v.redPhrase} startDate={v.relationshipStartAt} duration={duration} letter={v.loveLetter} photoPreviewUrl={photoPreviewUrl} />

                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <Button type="button" variant="secondary" className="rounded-full" onClick={back}>
                          Back
                        </Button>

                        <div className="flex flex-col items-end gap-1">
                          <Button
                            type="button"
                            onClick={form.handleSubmit(onCreate)}
                            disabled={!canSubmit}
                            className="rounded-full px-6 bg-gradient-to-r from-sky-500 via-rose-500 to-amber-500 text-white hover:opacity-95 disabled:opacity-60"
                          >
                            {isSubmitting ? "Creating…" : "Create gift link"}
                          </Button>
                          <div className="text-[11px] text-muted-foreground">
                            You’ll pay to unlock the reveal next · <span className="text-foreground/80">{PRICE_USD}</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="mt-6 text-center text-xs text-muted-foreground">You’re not filling a form — you’re setting up a moment.</div>
      </div>
    </div>
  );
}

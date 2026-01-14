"use client";

import * as React from "react";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  useMotionValue,
  animate,
  useSpring,
} from "framer-motion";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type Gift = {
  id: string;
  slug: string;
  status: "draft" | "paid" | "disabled";
  couple_photo_url: string | null;
  love_letter: string;
  red_phrase: string;
  relationship_start_at: string;
};

type SliceKey = "blue" | "red" | "green" | "yellow";
const ALL_SLICES: SliceKey[] = ["blue", "red", "green", "yellow"];

const SLICE_LABEL: Record<SliceKey, string> = {
  blue: "Photo",
  red: "Short Line",
  green: "Time Together",
  yellow: "Love Letter",
};

const SLICE_HINT: Record<SliceKey, string> = {
  blue: "A single frame that says everything.",
  red: "A sentence you’ll want to keep.",
  green: "Proof that time can be tender.",
  yellow: "Read it slowly—like a secret.",
};

const SLICE_PUBLIC: Record<
  SliceKey,
  { colorName: string; title: string; preview: string; vibe: string }
> = {
  blue: {
    colorName: "Blue",
    title: "A photo",
    preview: "A saved moment—instant warmth.",
    vibe: "Visual + emotional",
  },
  red: {
    colorName: "Rose",
    title: "A short line",
    preview: "One sentence that lands softly… then stays.",
    vibe: "Quick + powerful",
  },
  green: {
    colorName: "Emerald",
    title: "Time together",
    preview: "Days / hours / minutes since it began.",
    vibe: "Nostalgia + goosebumps",
  },
  yellow: {
    colorName: "Gold",
    title: "A love letter",
    preview: "A longer message—read it like a vow.",
    vibe: "Deep + romantic",
  },
};

/* --------------------------------- Utils --------------------------------- */

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
function mod360(n: number) {
  return ((n % 360) + 360) % 360;
}
function pickRandom<T>(arr: T[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}
function msToParts(ms: number) {
  const s = Math.floor(ms / 1000);
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  return { days, hours, mins, secs };
}
function formatDate(d: Date) {
  try {
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
    });
  } catch {
    return d.toLocaleDateString();
  }
}
function useEvent<T extends (...args: any[]) => any>(fn: T) {
  const ref = React.useRef(fn);
  React.useEffect(() => void (ref.current = fn), [fn]);
  return React.useCallback((...args: Parameters<T>) => ref.current(...args), []);
}

function safeSplitLines(text: string) {
  return text
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

/* ------------------------------ Visual theme ------------------------------ */

function colorDotClass(k: SliceKey) {
  return k === "blue"
    ? "bg-sky-500/90"
    : k === "red"
    ? "bg-rose-500/90"
    : k === "green"
    ? "bg-emerald-500/90"
    : "bg-amber-500/90";
}

function sliceThemeGradient(k: SliceKey) {
  return k === "red"
    ? "from-rose-500/22 via-pink-500/10 to-transparent"
    : k === "green"
    ? "from-emerald-500/18 via-emerald-500/10 to-transparent"
    : k === "yellow"
    ? "from-amber-500/18 via-amber-500/10 to-transparent"
    : "from-sky-500/18 via-sky-500/10 to-transparent";
}

function sliceFillRGBA(k: SliceKey) {
  if (k === "blue") return "rgba(56,189,248,.70)";
  if (k === "red") return "rgba(244,114,182,.70)";
  if (k === "green") return "rgba(52,211,153,.68)";
  return "rgba(251,191,36,.68)";
}

function buildWheelLayout(keys: SliceKey[]) {
  const safe = keys.length ? keys : (["blue"] as SliceKey[]);
  const n = safe.length;
  const step = 360 / n;

  const map = new Map<
    SliceKey,
    { start: number; end: number; center: number; index: number }
  >();
  safe.forEach((k, i) => {
    const start = i * step;
    const end = (i + 1) * step;
    const center = start + step / 2;
    map.set(k, { start, end, center, index: i });
  });

  return { step, map, keys: safe };
}

function buildConicGradient(keys: SliceKey[]) {
  const n = Math.max(1, keys.length);
  const stops = keys.map((k, i) => {
    const p0 = (i / n) * 100;
    const p1 = ((i + 1) / n) * 100;
    return `${sliceFillRGBA(k)} ${p0}% ${p1}%`;
  });
  return `conic-gradient(from 0deg, ${stops.join(",")})`;
}

function angleFromTopClockwiseFromEvent(
  e: React.MouseEvent,
  el: HTMLElement
): number {
  const rect = el.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;

  const x = e.clientX - cx;
  const y = e.clientY - cy;

  const degFromRightCCW = (Math.atan2(y, x) * 180) / Math.PI;
  const degTopCW = mod360(90 - degFromRightCCW);
  return degTopCW;
}

/* ------------------------------ Storage helpers ------------------------------ */

function useLocalStorageBoolean(key: string, initial: boolean) {
  const [value, setValue] = React.useState<boolean>(() => {
    if (typeof window === "undefined") return initial;
    try {
      const raw = window.localStorage.getItem(key);
      if (raw === null) return initial;
      return raw === "true";
    } catch {
      return initial;
    }
  });

  React.useEffect(() => {
    try {
      window.localStorage.setItem(key, String(value));
    } catch {
      // ignore
    }
  }, [key, value]);

  return [value, setValue] as const;
}

/* ------------------------------ Background ------------------------------ */

function GlowBg() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(1200px_circle_at_12%_10%,rgba(244,114,182,0.22),transparent_55%),radial-gradient(1100px_circle_at_86%_18%,rgba(251,191,36,0.14),transparent_55%),radial-gradient(1000px_circle_at_55%_92%,rgba(56,189,248,0.10),transparent_60%),radial-gradient(900px_circle_at_50%_45%,rgba(236,72,153,0.10),transparent_55%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(1200px_circle_at_50%_50%,transparent_35%,rgba(0,0,0,0.24)_100%)] dark:bg-[radial-gradient(1200px_circle_at_50%_50%,transparent_35%,rgba(0,0,0,0.72)_100%)]" />
      <div className="absolute inset-0 opacity-[0.06] [background-image:radial-gradient(rgba(255,255,255,0.55)_1px,transparent_1px)] [background-size:7px_7px]" />
      <div className="absolute inset-0 opacity-[0.05] [background-image:linear-gradient(to_bottom,rgba(255,255,255,0.55),transparent,rgba(255,255,255,0.25))]" />
    </div>
  );
}

function SoftDivider({ className = "" }: { className?: string }) {
  return (
    <div
      className={[
        "my-6 h-px w-full bg-gradient-to-r from-transparent via-border/80 to-transparent",
        className,
      ].join(" ")}
    />
  );
}

function Pill({
  children,
  dotClassName = "bg-rose-500/85",
}: {
  children: React.ReactNode;
  dotClassName?: string;
}) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/55 px-3 py-1 text-xs text-muted-foreground shadow-[0_1px_0_rgba(255,255,255,0.35)_inset] backdrop-blur">
      <span className={["h-1.5 w-1.5 rounded-full", dotClassName].join(" ")} />
      {children}
    </span>
  );
}

/* ------------------------------ Audio FX ------------------------------ */

function useTickAudio(enabled: boolean) {
  const prefersReducedMotion = useReducedMotion();
  const ctxRef = React.useRef<AudioContext | null>(null);
  const lastRef = React.useRef(0);

  const beep = React.useCallback(
    (kind: "tick" | "land") => {
      if (!enabled || prefersReducedMotion) return;

      try {
        const AudioCtx = (
          window.AudioContext || (window as any).webkitAudioContext
        ) as typeof AudioContext | undefined;
        if (!AudioCtx) return;

        if (!ctxRef.current) ctxRef.current = new AudioCtx();
        const ctx = ctxRef.current;

        if (ctx.state === "suspended") void ctx.resume();

        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        const freq = kind === "tick" ? 560 : 360;
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now);

        const dur = kind === "tick" ? 0.02 : 0.12;
        const peak = kind === "tick" ? 0.035 : 0.085;

        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(peak, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + dur + 0.02);
      } catch {
        // ignore
      }
    },
    [enabled, prefersReducedMotion]
  );

  const tickThrottled = React.useCallback(() => {
    const t = performance.now();
    if (t - lastRef.current < 60) return;
    lastRef.current = t;
    beep("tick");
  }, [beep]);

  const land = React.useCallback(() => beep("land"), [beep]);

  return { tick: tickThrottled, land };
}

/* ------------------------------ Icons ------------------------------ */

function HeartIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={["h-4 w-4", className].join(" ")}
      fill="none"
    >
      <path
        d="M12 20s-7-4.6-9.2-8.9C1.3 8 3 5.2 6 5.1c1.6 0 3 .9 3.8 2 .8-1.1 2.2-2 3.8-2 3 .1 4.7 2.9 3.2 6C19 15.4 12 20 12 20Z"
        className="fill-white/90"
      />
    </svg>
  );
}

function IconSparkle() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 2l1.1 4.4L17.5 7.5l-4.4 1.1L12 13l-1.1-4.4L6.5 7.5l4.4-1.1L12 2Z"
        className="fill-white/90"
      />
      <path
        d="M19 12l.7 2.8L22.5 15l-2.8.7L19 18.5l-.7-2.8L15.5 15l2.8-.7L19 12Z"
        className="fill-white/70"
      />
      <path
        d="M5 13l.6 2.4L8 16l-2.4.6L5 19l-.6-2.4L2 16l2.4-.6L5 13Z"
        className="fill-white/70"
      />
    </svg>
  );
}

/* ------------------------------ Premium Confetti ------------------------------ */

function HeartBurst({ fire }: { fire: boolean }) {
  const prefersReducedMotion = useReducedMotion();
  const [seed, setSeed] = React.useState(0);

  React.useEffect(() => {
    if (!fire || prefersReducedMotion) return;
    setSeed((s) => s + 1);
  }, [fire, prefersReducedMotion]);

  return (
    <div className="pointer-events-none fixed inset-0 z-40">
      <AnimatePresence>
        {fire && !prefersReducedMotion && (
          <motion.div
            key={`burst-${seed}`}
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {Array.from({ length: 18 }).map((_, i) => {
              const left = 50 + (Math.random() * 26 - 13);
              const top = 52 + (Math.random() * 16 - 8);
              const dx = Math.random() * 240 - 120;
              const dy = -(210 + Math.random() * 210);
              const rot = Math.random() * 160 - 80;
              const delay = i * 0.012;

              return (
                <motion.div
                  key={i}
                  className="absolute"
                  style={{ left: `${left}%`, top: `${top}%` }}
                  initial={{ opacity: 0, scale: 0.6, x: 0, y: 0, rotate: 0 }}
                  animate={{
                    opacity: [0, 1, 1, 0],
                    scale: [0.6, 1, 1, 0.9],
                    x: dx,
                    y: dy,
                    rotate: rot,
                  }}
                  transition={{ duration: 0.95, delay, ease: "easeOut" }}
                >
                  <div className="grid h-7 w-7 place-items-center rounded-full border border-white/12 bg-black/16 backdrop-blur">
                    <HeartIcon className="opacity-95" />
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------ Reveal Modal ------------------------------ */

function RevealOverlay({
  open,
  slice,
  onClose,
  gift,
  parts,
}: {
  open: boolean;
  slice: SliceKey | null;
  onClose: () => void;
  gift: Gift;
  parts: ReturnType<typeof msToParts>;
}) {
  const prefersReducedMotion = useReducedMotion();
  const [stage, setStage] = React.useState<"intro" | "reveal">("intro");
  const dialogRef = React.useRef<HTMLDivElement | null>(null);
  const closeBtnRef = React.useRef<HTMLButtonElement | null>(null);
  const lastActiveEl = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setStage("intro");
  }, [open, slice]);

  React.useEffect(() => {
    if (!open) return;
    lastActiveEl.current = document.activeElement as HTMLElement | null;
    window.setTimeout(() => closeBtnRef.current?.focus(), 0);
    return () => {
      lastActiveEl.current?.focus?.();
    };
  }, [open]);

  const theme = slice
    ? sliceThemeGradient(slice)
    : "from-white/10 via-white/5 to-transparent";
  const dot = slice ? colorDotClass(slice) : "bg-foreground/50";
  const title = slice ? SLICE_LABEL[slice] : "Reveal";

  const headline =
    slice === "red"
      ? "A line, just for you."
      : slice === "green"
      ? "Your love, measured gently."
      : slice === "yellow"
      ? "A letter sealed in time."
      : "A moment you can revisit.";

  const introCopy =
    slice === "red"
      ? "Short. Soft. Unforgettable."
      : slice === "green"
      ? "Because every second carries meaning."
      : slice === "yellow"
      ? "Slow down—this one deserves your full attention."
      : "A photo that brings you right back.";

  const readyLine =
    slice === "red"
      ? "Press Reveal when you’re ready."
      : slice === "green"
      ? "Press Reveal to see your timeline."
      : slice === "yellow"
      ? "Press Reveal to open the letter."
      : "Press Reveal to uncover the photo.";

  const letterLines = React.useMemo(
    () => safeSplitLines(gift.love_letter),
    [gift.love_letter]
  );

  React.useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
      if (e.key === "Enter" && stage === "intro") {
        e.preventDefault();
        setStage("reveal");
      }

      if (e.key === "Tab") {
        const root = dialogRef.current;
        if (!root) return;

        const focusables = Array.from(
          root.querySelectorAll<HTMLElement>(
            'button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])'
          )
        ).filter((el) => !el.hasAttribute("disabled"));

        if (!focusables.length) return;

        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement as HTMLElement | null;

        if (e.shiftKey) {
          if (active === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (active === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, stage]);

  return (
    <AnimatePresence>
      {open && slice && (
        <motion.div
          key="overlay"
          className="fixed inset-0 z-50 grid place-items-center px-5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          aria-modal="true"
          role="dialog"
          aria-label="Surprise reveal dialog"
        >
          <motion.button
            type="button"
            aria-label="Close overlay"
            className="absolute inset-0 bg-black/70"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          <div className={`pointer-events-none absolute inset-0 bg-gradient-to-b ${theme}`} />

          <motion.div
            ref={dialogRef}
            initial={{
              y: prefersReducedMotion ? 0 : 18,
              scale: 0.99,
              opacity: 0,
            }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{
              y: prefersReducedMotion ? 0 : 10,
              scale: 0.995,
              opacity: 0,
            }}
            transition={{ type: "spring", stiffness: 150, damping: 18, mass: 0.9 }}
            className="relative w-full max-w-2xl"
          >
            <div className="rounded-[30px] border border-border/60 bg-background/70 shadow-[0_40px_140px_-80px_rgba(0,0,0,0.85)] backdrop-blur-xl">
              <div className="flex items-start justify-between gap-4 px-6 pb-2 pt-6 md:px-8">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={["h-2.5 w-2.5 rounded-full", dot].join(" ")} />
                    <div className="text-xs text-muted-foreground">{title}</div>
                  </div>
                  <div className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">
                    {headline}
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground">{SLICE_HINT[slice]}</div>
                </div>

                <Button
                  ref={closeBtnRef as any}
                  variant="secondary"
                  className="rounded-full border-border/60 bg-background/50 shadow-[0_1px_0_rgba(255,255,255,0.2)_inset]"
                  onClick={onClose}
                >
                  Close
                </Button>
              </div>

              <SoftDivider className="my-4" />

              <div className="px-6 pb-6 md:px-8 md:pb-8">
                <motion.div
                  className="relative overflow-hidden rounded-[26px] border border-border/60 bg-background/60 shadow-[0_1px_0_rgba(255,255,255,0.25)_inset]"
                  initial={prefersReducedMotion ? { opacity: 0 } : { rotateX: 8, y: 8, opacity: 0 }}
                  animate={prefersReducedMotion ? { opacity: 1 } : { rotateX: 0, y: 0, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 135, damping: 16 }}
                  style={{ transformStyle: "preserve-3d" }}
                >
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(700px_circle_at_25%_18%,rgba(255,255,255,0.22),transparent_55%)]" />
                  <div className="pointer-events-none absolute inset-0 opacity-[0.06] [background-image:linear-gradient(to_right,rgba(255,255,255,0.9),transparent)]" />

                  <div className="p-6 md:p-8">
                    <AnimatePresence mode="wait">
                      {stage === "intro" ? (
                        <motion.div
                          key="intro"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 8 }}
                          transition={{ duration: 0.26 }}
                          className="space-y-5"
                        >
                          <div className="text-xs uppercase tracking-wide text-muted-foreground/90">
                            It landed on
                          </div>

                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <div className="text-2xl font-semibold tracking-tight">
                                {SLICE_PUBLIC[slice].colorName} — {SLICE_PUBLIC[slice].title}
                              </div>
                              <div className="mt-2 text-sm text-muted-foreground">{introCopy}</div>
                            </div>

                            <div className="hidden sm:block rounded-2xl border border-border/60 bg-muted/10 px-4 py-3 text-xs text-muted-foreground shadow-[0_1px_0_rgba(255,255,255,0.25)_inset]">
                              <div className="font-medium text-foreground/80">Vibe</div>
                              <div className="mt-1">{SLICE_PUBLIC[slice].vibe}</div>
                            </div>
                          </div>

                          <div className="rounded-2xl border border-border/60 bg-muted/10 p-4 text-sm text-muted-foreground shadow-[0_1px_0_rgba(255,255,255,0.2)_inset]">
                            <div className="font-medium text-foreground/80">One more step</div>
                            <div className="mt-1">{readyLine}</div>
                          </div>

                          <div className="flex items-center justify-between gap-3 pt-1">
                            <div className="text-xs text-muted-foreground">Tip: press Enter to reveal.</div>
                            <Button
                              className="rounded-full px-6 bg-gradient-to-r from-rose-500 via-pink-500 to-amber-500 text-white hover:opacity-95 shadow-[0_18px_80px_-55px_rgba(244,114,182,0.55)]"
                              onClick={() => setStage("reveal")}
                            >
                              Reveal
                            </Button>
                          </div>
                        </motion.div>
                      ) : (
                        <motion.div
                          key="reveal"
                          initial={{ opacity: 0, scale: 0.99, y: 10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.995, y: 6 }}
                          transition={{ type: "spring", stiffness: 170, damping: 18 }}
                        >
                          {slice === "red" && (
                            <div className="text-center">
                              <div className="text-xs uppercase tracking-wide text-muted-foreground/90">
                                Short line
                              </div>
                              <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.06 }}
                                className="mt-3 text-3xl font-semibold leading-tight tracking-tight md:text-4xl"
                              >
                                “{gift.red_phrase}”
                              </motion.div>
                              <div className="mt-4 text-xs text-muted-foreground">
                                Save it. Repeat it. Make it yours.
                              </div>
                            </div>
                          )}

                          {slice === "green" && (
                            <div className="space-y-4">
                              <div className="text-sm text-muted-foreground">
                                Since{" "}
                                <span className="font-medium text-foreground">
                                  {formatDate(new Date(gift.relationship_start_at))}
                                </span>
                              </div>

                              <div className="grid grid-cols-4 gap-3">
                                {[
                                  { v: parts.days, l: "days" },
                                  { v: parts.hours, l: "hrs" },
                                  { v: parts.mins, l: "min" },
                                  { v: parts.secs, l: "sec" },
                                ].map((x, i) => (
                                  <motion.div
                                    key={x.l}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.06 }}
                                    className="rounded-2xl border border-border/60 bg-muted/10 p-4 text-center shadow-[0_1px_0_rgba(255,255,255,0.25)_inset]"
                                  >
                                    <div className="text-2xl font-semibold tracking-tight">{x.v}</div>
                                    <div className="text-xs text-muted-foreground">{x.l}</div>
                                  </motion.div>
                                ))}
                              </div>

                              <div className="text-xs text-muted-foreground">
                                Still choosing each other—one second at a time.
                              </div>
                            </div>
                          )}

                          {slice === "yellow" && (
                            <div className="space-y-3">
                              <div className="text-xs uppercase tracking-wide text-muted-foreground/90">
                                Love letter
                              </div>
                              <div className="space-y-2">
                                {(letterLines.length ? letterLines : [gift.love_letter])
                                  .slice(0, 18)
                                  .map((line, i) => (
                                    <motion.div
                                      key={i}
                                      initial={{ opacity: 0, y: 8 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      transition={{ delay: i * 0.028 }}
                                      className="text-sm leading-relaxed text-foreground/90"
                                    >
                                      {line}
                                    </motion.div>
                                  ))}
                              </div>
                            </div>
                          )}

                          {slice === "blue" && (
                            <div className="space-y-3">
                              <div className="text-xs uppercase tracking-wide text-muted-foreground/90">
                                Photo
                              </div>

                              {gift.couple_photo_url ? (
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.99 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  transition={{ duration: 0.32 }}
                                  className="relative overflow-hidden rounded-3xl border border-border/60 shadow-[0_1px_0_rgba(255,255,255,0.25)_inset]"
                                >
                                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(700px_circle_at_28%_18%,rgba(255,255,255,0.24),transparent_55%)]" />
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={gift.couple_photo_url}
                                    alt="Couple photo"
                                    className="h-[300px] w-full object-cover md:h-[360px]"
                                    loading="eager"
                                  />
                                </motion.div>
                              ) : (
                                <div className="rounded-3xl border border-border/60 bg-muted/10 p-12 text-center text-sm text-muted-foreground shadow-[0_1px_0_rgba(255,255,255,0.2)_inset]">
                                  Photo not added yet.
                                </div>
                              )}

                              <div className="text-xs text-muted-foreground">
                                A little “us”—kept beautifully.
                              </div>
                            </div>
                          )}

                          <div className="mt-6 flex items-center justify-between gap-3">
                            <div className="text-xs text-muted-foreground">
                              Tip: after the last one, there’s a final message.
                            </div>
                            <Button className="rounded-full px-6" onClick={onClose}>
                              Continue
                            </Button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ------------------------------ NEW: Final Popup Overlay ------------------------------ */

function EndOverlay({
  open,
  onClose,
  onReplay,
}: {
  open: boolean;
  onClose: () => void;
  onReplay: () => void;
}) {
  const prefersReducedMotion = useReducedMotion();
  const dialogRef = React.useRef<HTMLDivElement | null>(null);
  const primaryBtnRef = React.useRef<HTMLButtonElement | null>(null);
  const lastActiveEl = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    if (!open) return;
    lastActiveEl.current = document.activeElement as HTMLElement | null;
    window.setTimeout(() => primaryBtnRef.current?.focus(), 0);
    return () => lastActiveEl.current?.focus?.();
  }, [open]);

  React.useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }

      if (e.key === "Tab") {
        const root = dialogRef.current;
        if (!root) return;

        const focusables = Array.from(
          root.querySelectorAll<HTMLElement>(
            'button,[href],[tabindex]:not([tabindex="-1"])'
          )
        ).filter((el) => !el.hasAttribute("disabled"));

        if (!focusables.length) return;

        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement as HTMLElement | null;

        if (e.shiftKey) {
          if (active === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (active === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  React.useEffect(() => {
    if (!open) return;
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = prev;
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[80] grid place-items-center px-5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          aria-modal="true"
          role="dialog"
          aria-label="Final message"
        >
          <motion.button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-black/70"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(900px_circle_at_20%_10%,rgba(244,114,182,0.22),transparent_55%),radial-gradient(900px_circle_at_85%_15%,rgba(251,191,36,0.14),transparent_55%),radial-gradient(1000px_circle_at_50%_90%,rgba(56,189,248,0.10),transparent_60%)]" />

          <motion.div
            ref={dialogRef}
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 18, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.995 }}
            transition={{ type: "spring", stiffness: 190, damping: 18 }}
            className="relative w-full max-w-2xl"
          >
            <div className="rounded-[30px] border border-border/60 bg-background/75 shadow-[0_50px_180px_-110px_rgba(0,0,0,0.90)] backdrop-blur-xl overflow-hidden">
              <div className="pointer-events-none absolute inset-0 opacity-[0.55] bg-[radial-gradient(900px_circle_at_25%_20%,rgba(255,255,255,0.18),transparent_55%)]" />

              <div className="relative p-6 md:p-10 text-center">
                <div className="mx-auto w-fit">
                  <Pill dotClassName="bg-rose-500/80">Complete</Pill>
                </div>

                <h2 className="mt-4 text-2xl font-semibold tracking-tight md:text-3xl">
                  We hope you loved this experience.
                </h2>
                <p className="mt-3 text-sm text-muted-foreground md:text-base">
                  Wishing the couple a lifetime of joy, warmth, and beautiful moments together.
                </p>

                <div className="mt-7 flex flex-wrap justify-center gap-2">
                  <Button
                    ref={primaryBtnRef as any}
                    onClick={() => {
                      onClose();
                      onReplay();
                    }}
                    className="rounded-full px-6 bg-gradient-to-r from-rose-500 via-pink-500 to-amber-500 text-white hover:opacity-95 shadow-[0_16px_70px_-45px_rgba(244,114,182,0.55)]"
                  >
                    Replay the experience
                  </Button>
                  <Button
                    variant="secondary"
                    className="rounded-full border-border/60 bg-background/50 shadow-[0_1px_0_rgba(255,255,255,0.2)_inset]"
                    onClick={() => (window.location.href = "/create")}
                  >
                    Create Yours
                  </Button>
                  <Button
                    variant="secondary"
                    className="rounded-full border-border/60 bg-background/50 shadow-[0_1px_0_rgba(255,255,255,0.2)_inset]"
                    onClick={onClose}
                    title="Close"
                  >
                    Close
                  </Button>
                </div>

                <div className="mt-5 text-[11px] text-muted-foreground">
                  Tip: press <span className="font-medium text-foreground/80">Esc</span> to close.
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ------------------------------ Bet Chips ------------------------------ */

function BetChip({
  k,
  selected,
  disabled,
  pulse,
  onPick,
}: {
  k: SliceKey;
  selected: boolean;
  disabled: boolean;
  pulse: boolean;
  onPick: () => void;
}) {
  const base =
    k === "blue"
      ? "from-sky-500/20 via-sky-400/8"
      : k === "red"
      ? "from-rose-500/22 via-pink-500/8"
      : k === "green"
      ? "from-emerald-500/20 via-emerald-400/8"
      : "from-amber-500/20 via-amber-300/8";

  return (
    <motion.button
      type="button"
      disabled={disabled}
      onClick={onPick}
      className={[
        "relative inline-flex items-center gap-2 rounded-full border border-white/12 bg-black/18 px-3 py-2 text-xs text-white/85 backdrop-blur",
        "shadow-[0_22px_90px_-70px_rgba(0,0,0,0.75)]",
        "transition active:scale-[0.98] disabled:cursor-not-allowed",
        selected ? "ring-2 ring-white/18" : "hover:border-white/18",
        disabled ? "opacity-45" : "opacity-100",
      ].join(" ")}
      animate={pulse && !selected && !disabled ? { y: [0, -2, 0] } : { y: 0 }}
      transition={
        pulse && !selected && !disabled
          ? { duration: 1.25, repeat: Infinity, ease: "easeInOut" }
          : {}
      }
      aria-pressed={selected}
      title={`Pick ${SLICE_PUBLIC[k].colorName}`}
    >
      <span className={["h-2.5 w-2.5 rounded-full", colorDotClass(k)].join(" ")} />
      <span className="font-semibold tracking-tight">{SLICE_PUBLIC[k].colorName}</span>
      <span className="text-white/55">•</span>
      <span className="text-white/72">{SLICE_PUBLIC[k].title}</span>
      <span className={`pointer-events-none absolute inset-0 rounded-full bg-gradient-to-b ${base} to-transparent`} />
    </motion.button>
  );
}

/* ------------------------------ Primary Spin CTA ------------------------------ */

function PressToSpinButton({
  enabled,
  spinning,
  onPress,
  label,
  helper,
}: {
  enabled: boolean;
  spinning: boolean;
  onPress: () => void;
  label: string;
  helper?: string;
}) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      className={[
        "relative rounded-full border border-white/14 bg-gradient-to-r from-rose-500 via-pink-500 to-amber-500 p-[2px]",
        "shadow-[0_28px_120px_-90px_rgba(244,114,182,0.70)]",
        enabled ? "opacity-100" : "opacity-60",
      ].join(" ")}
      animate={!enabled && !spinning ? { y: [0, -2, 0] } : { y: 0 }}
      transition={
        !enabled && !spinning ? { duration: 1.25, repeat: Infinity, ease: "easeInOut" } : {}
      }
    >
      <motion.button
        type="button"
        disabled={!enabled || spinning}
        className={[
          "group relative flex flex-col items-center justify-center gap-1 rounded-full px-10 py-5 text-sm font-semibold text-white",
          "bg-black/16 backdrop-blur",
          "shadow-[0_1px_0_rgba(255,255,255,0.18)_inset]",
          "transition active:scale-[0.98] disabled:cursor-not-allowed",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25",
        ].join(" ")}
        onClick={() => {
          if (enabled && !spinning) onPress();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            if (enabled && !spinning) onPress();
          }
        }}
        aria-label={label}
        title={enabled ? "Press to spin" : "Pick a color first"}
      >
        <span className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(520px_circle_at_30%_25%,rgba(255,255,255,0.24),transparent_58%)] opacity-90" />
        <span className="relative inline-flex items-center gap-2">
          <IconSparkle />
          {spinning ? "Spinning…" : label}
        </span>
        <span className="relative text-[11px] font-medium text-white/70">
          {helper ?? (spinning ? "listen for the ticks" : "press Enter / Space")}
        </span>
      </motion.button>

      <motion.div
        className="pointer-events-none absolute -inset-2 rounded-full opacity-40"
        animate={prefersReducedMotion ? {} : { opacity: [0.28, 0.52, 0.28] }}
        transition={prefersReducedMotion ? {} : { duration: 2.1, repeat: Infinity }}
        style={{
          background:
            "radial-gradient(600px circle at 30% 30%, rgba(255,255,255,0.16), transparent 60%)",
          filter: "blur(10px)",
        }}
      />
    </motion.div>
  );
}

/* ------------------------------ FIXED: Choice Modal (centered) ------------------------------ */

function ChoiceModal({
  open,
  remaining,
  bet,
  canPick,
  onPick,
  onClose,
}: {
  open: boolean;
  remaining: SliceKey[];
  bet: SliceKey | null;
  canPick: boolean;
  onPick: (k: SliceKey) => void;
  onClose: () => void;
}) {
  const prefersReducedMotion = useReducedMotion();
  const dialogRef = React.useRef<HTMLDivElement | null>(null);
  const closeRef = React.useRef<HTMLButtonElement | null>(null);
  const lastActiveEl = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    if (!open) return;
    lastActiveEl.current = document.activeElement as HTMLElement | null;
    window.setTimeout(() => closeRef.current?.focus(), 0);
    return () => lastActiveEl.current?.focus?.();
  }, [open]);

  React.useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }

      if (e.key === "Tab") {
        const root = dialogRef.current;
        if (!root) return;

        const focusables = Array.from(
          root.querySelectorAll<HTMLElement>(
            'button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])'
          )
        ).filter((el) => !el.hasAttribute("disabled"));

        if (!focusables.length) return;

        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement as HTMLElement | null;

        if (e.shiftKey) {
          if (active === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (active === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  React.useEffect(() => {
    if (!open) return;
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = prev;
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[70]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          aria-modal="true"
          role="dialog"
          aria-label="Pick your color"
        >
          <motion.button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-black/70"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          <div className="absolute inset-0 grid place-items-end sm:place-items-center p-3 sm:p-6">
            <motion.div
              ref={dialogRef}
              initial={
                prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 18, scale: 0.99 }
              }
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.995 }}
              transition={{ type: "spring", stiffness: 220, damping: 20 }}
              className={[
                "w-full sm:max-w-lg",
                "rounded-[28px] border border-border/60 bg-background/80 shadow-[0_40px_160px_-90px_rgba(0,0,0,0.85)] backdrop-blur-xl",
                "overflow-hidden",
              ].join(" ")}
              style={{ maxHeight: "min(82vh, 720px)" }}
            >
              <div className="relative">
                <div
                  className="pointer-events-none absolute inset-0 opacity-[0.60]"
                  style={{
                    background:
                      "radial-gradient(900px circle at 20% 0%, rgba(244,114,182,0.14), transparent 55%), radial-gradient(900px circle at 95% 10%, rgba(251,191,36,0.10), transparent 55%), radial-gradient(1000px circle at 40% 110%, rgba(56,189,248,0.09), transparent 60%)",
                  }}
                />

                <div className="relative px-5 pb-4 pt-5 sm:px-6">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold tracking-tight">Pick your color</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        This is your “I hope it’s this one.” The spin stays random.
                      </div>
                    </div>

                    <Button
                      ref={closeRef as any}
                      variant="secondary"
                      className="rounded-full border-border/60 bg-background/50 shadow-[0_1px_0_rgba(255,255,255,0.2)_inset]"
                      onClick={onClose}
                    >
                      Close
                    </Button>
                  </div>

                  <div className="mt-4 rounded-2xl border border-border/60 bg-muted/10 p-3 text-[11px] text-muted-foreground shadow-[0_1px_0_rgba(255,255,255,0.2)_inset]">
                    Tip: you can also tap <span className="font-medium text-foreground/80">directly on the wheel</span>.
                    This menu is just a comfy shortcut.
                  </div>

                  <div className="mt-4 grid gap-2">
                    {remaining.map((k) => (
                      <button
                        key={k}
                        type="button"
                        disabled={!canPick}
                        onClick={() => onPick(k)}
                        className={[
                          "group relative flex w-full items-center justify-between gap-3 rounded-2xl border border-border/60 bg-background/60 px-4 py-3 text-left",
                          "shadow-[0_18px_70px_-60px_rgba(0,0,0,0.55)] backdrop-blur",
                          "transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-55",
                          bet === k ? "ring-2 ring-foreground/15" : "hover:border-border/80",
                        ].join(" ")}
                        aria-pressed={bet === k}
                        title={`Select ${SLICE_PUBLIC[k].colorName}`}
                      >
                        <span className="flex items-center gap-3">
                          <span className={["h-3 w-3 rounded-full", colorDotClass(k)].join(" ")} />
                          <span>
                            <div className="text-sm font-semibold tracking-tight">
                              {SLICE_PUBLIC[k].colorName}{" "}
                              <span className="text-muted-foreground font-medium">— {SLICE_PUBLIC[k].title}</span>
                            </div>
                            <div className="mt-0.5 text-[11px] text-muted-foreground">
                              {SLICE_PUBLIC[k].preview}
                            </div>
                          </span>
                        </span>

                        <span className="shrink-0 rounded-full border border-border/60 bg-background/60 px-3 py-1 text-[11px] text-muted-foreground">
                          {bet === k ? "Selected" : "Choose"}
                        </span>

                        <span
                          className={[
                            "pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition group-hover:opacity-100",
                            "bg-[radial-gradient(520px_circle_at_30%_30%,rgba(255,255,255,0.14),transparent_55%)]",
                          ].join(" ")}
                        />
                      </button>
                    ))}
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-3">
                    <div className="text-[11px] text-muted-foreground">
                      Press <span className="font-medium text-foreground/80">Esc</span> to close.
                    </div>
                    <Button className="rounded-full px-6" variant="secondary" onClick={onClose}>
                      Done
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ------------------------------ Wheel ------------------------------ */

function Wheel({
  rotationMV,
  spinning,
  onSpin,
  disabled,
  spotlight,
  remaining,
  bet,
  setBet,
  lastResult,
  pointerPulse,
}: {
  rotationMV: ReturnType<typeof useMotionValue<number>>;
  spinning: boolean;
  onSpin: () => void;
  disabled: boolean;
  spotlight: SliceKey | null;
  remaining: SliceKey[];
  bet: SliceKey | null;
  setBet: (k: SliceKey | null) => void;
  lastResult: { slice: SliceKey; guessedRight: boolean } | null;
  pointerPulse: number;
}) {
  const prefersReducedMotion = useReducedMotion();

  const mustPick = remaining.length > 0 && !bet && !spinning && !disabled;
  const canPick = !spinning && !disabled && remaining.length > 0;

  const ringAccent =
    spotlight === "blue"
      ? "from-sky-500/18 via-sky-400/8"
      : spotlight === "red"
      ? "from-rose-500/18 via-pink-500/8"
      : spotlight === "green"
      ? "from-emerald-500/16 via-emerald-400/8"
      : spotlight === "yellow"
      ? "from-amber-500/16 via-amber-300/8"
      : "from-white/10 via-white/5";

  const layout = React.useMemo(() => buildWheelLayout(remaining), [remaining]);
  const wheelBg = React.useMemo(() => buildConicGradient(remaining), [remaining]);

  const spinScale = useSpring(spinning && !prefersReducedMotion ? 1.01 : 1, {
    stiffness: 220,
    damping: 18,
    mass: 0.7,
  });

  const [choiceOpen, setChoiceOpen] = React.useState(false);

  React.useEffect(() => {
    if (!canPick) setChoiceOpen(false);
  }, [canPick]);

  const pick = React.useCallback(
    (k: SliceKey) => {
      if (!canPick) return;
      setBet(k);
      setChoiceOpen(false);
      toast.message("Choice set.", { description: `You chose ${SLICE_PUBLIC[k].colorName}.` });
    },
    [canPick, setBet]
  );

  const wheelRef = React.useRef<HTMLDivElement | null>(null);

  const onWheelClick = React.useCallback(
    (e: React.MouseEvent) => {
      if (!canPick) return;
      const el = wheelRef.current;
      if (!el) return;

      const t = e.target as HTMLElement | null;
      if (t && t.closest?.("[data-wheel-cta]")) return;

      const degTopCW = angleFromTopClockwiseFromEvent(e, el);

      const currentRot = mod360(rotationMV.get());
      const wheelSpaceDeg = mod360(degTopCW - currentRot);

      const step = 360 / Math.max(1, remaining.length);
      const idx = Math.floor(wheelSpaceDeg / step);
      const key = remaining[clamp(idx, 0, remaining.length - 1)] ?? remaining[0];

      if (!key) return;

      if (bet === key) {
        setBet(null);
        toast.message("Choice cleared.", { description: "Pick another one." });
      } else {
        pick(key);
      }
    },
    [canPick, remaining, rotationMV, bet, setBet, pick]
  );

  return (
    <div className="mx-auto grid place-items-center">
      <ChoiceModal
        open={choiceOpen}
        remaining={remaining}
        bet={bet}
        canPick={canPick}
        onPick={pick}
        onClose={() => setChoiceOpen(false)}
      />

      <div className="relative w-full max-w-[920px]">
        <div className="mb-6 text-center">
          <div className="text-base font-semibold tracking-tight">
            {spinning
              ? "Let it unfold…"
              : disabled
              ? "All surprises revealed."
              : bet
              ? remaining.length === 1
                ? "Final choice."
                : "Choice set."
              : "Choose a color to begin."}
          </div>

          <div className="mt-1 text-xs text-muted-foreground">
            {spinning
              ? "A soft tick for every passing slice."
              : disabled
              ? "Replay anytime to relive the moment."
              : bet
              ? remaining.length === 1
                ? `You chose ${SLICE_PUBLIC[bet].colorName}. The final reveal is next.`
                : `You chose ${SLICE_PUBLIC[bet].colorName}. (The outcome remains random.)`
              : "Pick a chip, tap the wheel, or click the choice pill. Then spin."}
          </div>

          <div className="mt-4 flex items-center justify-center">
            <div className="relative">
              <button
                type="button"
                disabled={!canPick}
                onClick={() => setChoiceOpen(true)}
                className={[
                  "relative inline-flex items-center gap-3 rounded-full border border-border/60 bg-background/55 px-4 py-2 text-xs text-muted-foreground",
                  "shadow-[0_18px_80px_-60px_rgba(0,0,0,0.55)] backdrop-blur",
                  "transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20",
                ].join(" ")}
                aria-haspopup="dialog"
                aria-expanded={choiceOpen}
                title={canPick ? "Click to pick your choice" : "You can pick after the reveal"}
              >
                <span className="inline-flex items-center gap-2">
                  <span className="grid h-7 w-7 place-items-center rounded-full border border-white/12 bg-black/16">
                    <HeartIcon className="opacity-90" />
                  </span>
                  <span className="font-medium text-foreground/85">Your choice</span>
                </span>

                <span className="text-muted-foreground">—</span>

                <AnimatePresence mode="wait">
                  {bet ? (
                    <motion.span
                      key={`bet-${bet}`}
                      initial={{ opacity: 0, y: 6, scale: 0.985 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 6, scale: 0.99 }}
                      transition={{ type: "spring", stiffness: 220, damping: 18 }}
                      className="inline-flex items-center gap-2"
                    >
                      <span className={["h-2.5 w-2.5 rounded-full", colorDotClass(bet)].join(" ")} />
                      <span className="font-semibold text-foreground">{SLICE_PUBLIC[bet].colorName}</span>

                      <span className="ml-1 inline-flex items-center rounded-full border border-border/60 bg-background/60 px-2 py-1 text-[11px] text-muted-foreground">
                        click to change
                      </span>
                    </motion.span>
                  ) : (
                    <motion.span
                      key="bet-empty"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 6 }}
                      className="text-muted-foreground"
                    >
                      Click here to choose
                    </motion.span>
                  )}
                </AnimatePresence>

                <span className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(520px_circle_at_30%_25%,rgba(255,255,255,0.14),transparent_60%)]" />
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            {remaining.map((k) => (
              <BetChip
                key={k}
                k={k}
                selected={bet === k}
                disabled={!canPick}
                pulse={mustPick}
                onPick={() => {
                  if (!canPick) return;
                  if (bet === k) {
                    setBet(null);
                    toast.message("Choice cleared.", { description: "Pick another one." });
                    return;
                  }
                  pick(k);
                }}
              />
            ))}
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            <Pill dotClassName={mustPick ? "bg-rose-500/80" : "bg-foreground/50"}>
              {mustPick ? (
                <>Pick a color to unlock the spin</>
              ) : (
                <>
                  Outcome stays <span className="font-medium text-foreground">random</span>
                  <span className="text-muted-foreground"> — your choice is the romance.</span>
                </>
              )}
            </Pill>
            <Pill dotClassName="bg-emerald-500/80">
              Remaining <span className="font-medium text-foreground">{remaining.length}</span>/4
            </Pill>
            <Pill dotClassName="bg-sky-500/75">Tap the wheel to choose</Pill>
          </div>

          <AnimatePresence>
            {lastResult && !spinning && !prefersReducedMotion && (
              <motion.div
                key="resultBadge"
                initial={{ opacity: 0, y: 8, scale: 0.99 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.995 }}
                transition={{ type: "spring", stiffness: 180, damping: 18 }}
                className="mt-4 mx-auto w-fit inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/55 px-4 py-2 text-xs shadow-[0_18px_80px_-60px_rgba(0,0,0,0.65)] backdrop-blur"
              >
                <span className={["h-2 w-2 rounded-full", colorDotClass(lastResult.slice)].join(" ")} />
                <span className="font-semibold">{lastResult.guessedRight ? "Well chosen." : "Almost."}</span>
                <span className="text-muted-foreground">
                  It landed on {SLICE_PUBLIC[lastResult.slice].colorName}.
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="pointer-events-none absolute left-1/2 top-[290px] h-[72%] w-[72%] -translate-x-1/2 rounded-full bg-gradient-to-r from-rose-500/12 via-pink-500/8 to-amber-500/12 blur-2xl" />

        <motion.div
          className="absolute left-1/2 top-[364px] z-30 -translate-x-1/2"
          animate={spinning && !prefersReducedMotion ? { y: [0, -2, 0] } : { y: 0 }}
          transition={{ duration: 0.25, repeat: spinning && !prefersReducedMotion ? Infinity : 0 }}
          style={{ scale: prefersReducedMotion ? 1 : 1 + Math.min(0.07, pointerPulse * 0.010) }}
        >
          <div className="h-0 w-0 border-l-[14px] border-r-[14px] border-b-[22px] border-l-transparent border-r-transparent border-b-foreground/85 drop-shadow-sm" />
          <div className="mx-auto mt-1 h-3 w-3 rounded-full bg-foreground/70 shadow-[0_12px_34px_-20px_rgba(0,0,0,0.85)]" />
        </motion.div>

        <div className="relative mx-auto mt-6 aspect-square w-full max-w-[560px]">
          <div className="pointer-events-none absolute -inset-3 rounded-full bg-gradient-to-b from-white/12 to-transparent blur-[2px]" />
          <div className="pointer-events-none absolute -inset-2 rounded-full border border-white/10" />
          <div
            className={`pointer-events-none absolute -inset-10 rounded-full bg-gradient-to-b ${ringAccent} to-transparent blur-2xl`}
          />

          <motion.div
            className="pointer-events-none absolute -inset-8 rounded-full opacity-[0.45]"
            animate={prefersReducedMotion ? {} : { rotate: 360 }}
            transition={prefersReducedMotion ? {} : { duration: 20, ease: "linear", repeat: Infinity }}
            style={{
              background:
                "conic-gradient(from 0deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02), rgba(255,255,255,0.10), rgba(255,255,255,0.02), rgba(255,255,255,0.08))",
              filter: "blur(12px)",
            }}
          />

          <motion.div
            ref={wheelRef}
            onClick={onWheelClick}
            className={[
              "absolute inset-0 rounded-full border border-border/60 bg-background/65 backdrop-blur",
              "shadow-[0_60px_190px_-130px_rgba(0,0,0,0.85)] transform-gpu",
              canPick ? "cursor-pointer" : "cursor-default",
            ].join(" ")}
            style={{
              transformOrigin: "50% 50%",
              background: wheelBg,
              rotate: rotationMV,
              scale: spinScale,
            }}
            role="button"
            aria-label="Wheel (click a slice to choose)"
            aria-disabled={!canPick}
            title={canPick ? "Click a slice to choose your color" : "Wheel is locked right now"}
          >
            <div className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(900px_circle_at_28%_18%,rgba(255,255,255,0.46),transparent_50%)]" />
            <div className="pointer-events-none absolute inset-0 rounded-full ring-1 ring-white/10" />

            <div className="pointer-events-none absolute inset-[7%] rounded-full ring-1 ring-white/8" />
            <div className="pointer-events-none absolute inset-[10%] rounded-full bg-[radial-gradient(420px_circle_at_50%_30%,rgba(255,255,255,0.09),transparent_60%)]" />

            <div className="pointer-events-none absolute inset-0 rounded-full">
              {remaining.length > 1 &&
                remaining.map((_, i) => {
                  const ang = i * layout.step;
                  return (
                    <div
                      key={`sep-${i}`}
                      className="absolute left-1/2 top-1/2 h-[54%] w-px origin-bottom -translate-x-1/2 bg-white/14"
                      style={{ transform: `rotate(${ang}deg)` }}
                    />
                  );
                })}
            </div>

            {canPick && (
              <motion.div
                className="pointer-events-none absolute inset-0 rounded-full ring-1 ring-white/0"
                animate={prefersReducedMotion ? {} : { opacity: [0.12, 0.26, 0.12] }}
                transition={prefersReducedMotion ? {} : { duration: 2.4, repeat: Infinity }}
                style={{
                  boxShadow: "0 0 0 1px rgba(255,255,255,0.08) inset",
                }}
              />
            )}
          </motion.div>

          <div className="absolute inset-0 grid place-items-center" data-wheel-cta>
            <div data-wheel-cta>
              <PressToSpinButton
                enabled={!disabled && !spinning && remaining.length > 0 && !!bet}
                spinning={spinning}
                onPress={onSpin}
                label={
                  disabled
                    ? "All revealed"
                    : !bet
                    ? "Choose a color"
                    : remaining.length === 1
                    ? "Reveal the last one"
                    : "Spin"
                }
                helper={
                  !bet
                    ? "tap the wheel or click your choice"
                    : remaining.length === 1
                    ? "no spin—just the reveal"
                    : undefined
                }
              />
            </div>
          </div>

          <AnimatePresence>
            {mustPick && (
              <motion.div
                key="helper"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="pointer-events-none absolute bottom-8 left-1/2 -translate-x-1/2 rounded-full border border-border/60 bg-background/60 px-3 py-1 text-[11px] text-muted-foreground shadow-[0_18px_80px_-60px_rgba(0,0,0,0.65)] backdrop-blur"
              >
                Click the choice pill • tap the wheel • or pick a chip
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="mt-4 text-center text-[11px] text-muted-foreground">
          Keyboard: 1/2/3/4 choose • Enter/Space spin • R replay • Esc close • M sound
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ Skeleton ------------------------------ */

function Skeleton() {
  return (
    <div className="min-h-screen">
      <GlowBg />
      <div className="mx-auto max-w-4xl px-5 py-10 md:py-14">
        <div className="space-y-4">
          <div className="h-6 w-28 animate-pulse rounded-full bg-muted/20" />
          <div className="h-10 w-[min(560px,90%)] animate-pulse rounded-2xl bg-muted/20" />
          <div className="h-4 w-[min(620px,95%)] animate-pulse rounded-xl bg-muted/15" />
        </div>

        <div className="mt-10">
          <Card className="border-border/60 bg-background/60 backdrop-blur">
            <CardContent className="p-6 md:p-10">
              <div className="mx-auto aspect-square w-full max-w-[540px] animate-pulse rounded-full bg-muted/15" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ Page ------------------------------ */

export default function GiftWheelClient({ slug }: { slug: string }) {
  const prefersReducedMotion = useReducedMotion();

  const [gift, setGift] = React.useState<Gift | null>(null);
  const [loading, setLoading] = React.useState(true);

  const [remaining, setRemaining] = React.useState<SliceKey[]>(ALL_SLICES);
  const [active, setActive] = React.useState<SliceKey | null>(null);

  const [spinning, setSpinning] = React.useState(false);
  const rotationMV = useMotionValue(0);

  const [now, setNow] = React.useState(() => new Date());

  const [paymentRequired, setPaymentRequired] = React.useState(false);
  const [giftIdForPay, setGiftIdForPay] = React.useState<string | null>(null);

  const [revealOpen, setRevealOpen] = React.useState(false);
  const [spotlight, setSpotlight] = React.useState<SliceKey | null>(null);

  const [bet, setBet] = React.useState<SliceKey | null>(null);
  const [lastResult, setLastResult] = React.useState<{ slice: SliceKey; guessedRight: boolean } | null>(
    null
  );

  const [pointerPulse, setPointerPulse] = React.useState(0);

  const [audioOn, setAudioOn] = useLocalStorageBoolean("lw_audio_on", true);
  const audio = useTickAudio(audioOn);

  const [burst, setBurst] = React.useState(false);

  // ✅ NEW: final popup after last reveal closes
  const [endOpen, setEndOpen] = React.useState(false);
  const endShownRef = React.useRef(false);
  const remainingRef = React.useRef<SliceKey[]>(remaining);
  React.useEffect(() => {
    remainingRef.current = remaining;
  }, [remaining]);

  // tick detection for “feel”
  const boundaryStepRef = React.useRef(90);
  const lastBoundaryIndexRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    boundaryStepRef.current = 360 / Math.max(1, remaining.length);
    lastBoundaryIndexRef.current = null;
  }, [remaining.length]);

  React.useEffect(() => {
    if (prefersReducedMotion) return;

    const unsub = rotationMV.on("change", (v) => {
      if (!spinning) return;

      const step = boundaryStepRef.current;
      const m = mod360(v);
      const idx = Math.floor(m / step);

      if (lastBoundaryIndexRef.current === null) {
        lastBoundaryIndexRef.current = idx;
        return;
      }

      if (idx !== lastBoundaryIndexRef.current) {
        lastBoundaryIndexRef.current = idx;
        audio.tick();
        setPointerPulse((p) => p + 1);
      }
    });

    return () => unsub();
  }, [rotationMV, spinning, audio, prefersReducedMotion]);

  React.useEffect(() => {
    let alive = true;

    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

    async function fetchGift() {
      const res = await fetch(`/api/gifts/${slug}`, { cache: "no-store" });

      if (res.status === 402) {
        return { kind: "locked" as const, data: null as any };
      }

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Failed to load gift.");
      return { kind: "ok" as const, data };
    }

    async function getGiftIdForCheckout() {
      const r = await fetch(`/api/resolve/${slug}`, { cache: "no-store" });
      const d = await r.json().catch(() => null);
      if (!r.ok) throw new Error(d?.error ?? "Failed to prepare checkout.");
      return d?.id as string | undefined;
    }

    async function confirmPayment(sessionId: string) {
      const maxTries = 12;

      for (let i = 0; i < maxTries; i++) {
        const r = await fetch(`/api/resolve/${slug}?session_id=${encodeURIComponent(sessionId)}`, {
          cache: "no-store",
        });

        if (r.status === 200) return true;
        if (r.status === 202) {
          await sleep(900);
          continue;
        }

        const d = await r.json().catch(() => null);
        throw new Error(d?.error ?? "Resolve failed.");
      }

      return false;
    }

    (async () => {
      try {
        if (!alive) return;
        setLoading(true);

        const url = new URL(window.location.href);
        const sessionId = url.searchParams.get("session_id");

        if (sessionId) {
          const ok = await confirmPayment(sessionId);
          if (ok) {
            url.searchParams.delete("session_id");
            const next =
              url.pathname + (url.searchParams.toString() ? `?${url.searchParams.toString()}` : "");
            window.history.replaceState({}, "", next);
          }
        }

        const out = await fetchGift();
        if (!alive) return;

        if (out.kind === "locked") {
          setGift(null);
          setPaymentRequired(true);

          const id = await getGiftIdForCheckout();
          if (!alive) return;

          setGiftIdForPay(id ?? null);
          return;
        }

        setPaymentRequired(false);
        setGiftIdForPay(null);
        setGift(out.data);
      } catch (e: any) {
        if (!alive) return;
        toast.error(e?.message ?? "Could not load this link.");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [slug]);

  React.useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const startAt = gift ? new Date(gift.relationship_start_at) : null;
  const elapsed = startAt ? clamp(now.getTime() - startAt.getTime(), 0, 10 ** 15) : 0;
  const parts = msToParts(elapsed);

  const payAndUnlock = useEvent(async () => {
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ giftId: giftIdForPay }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Checkout failed");
      window.location.href = data.url;
    } catch (e: any) {
      toast.error(e?.message ?? "Could not start checkout.");
    }
  });

  const reset = useEvent(() => {
    setRemaining(ALL_SLICES);
    setActive(null);
    rotationMV.set(0);
    setRevealOpen(false);
    setSpinning(false);
    setSpotlight(null);
    setBet(null);
    setLastResult(null);
    setPointerPulse(0);
    setBurst(false);

    // ✅ reset final popup state
    setEndOpen(false);
    endShownRef.current = false;

    toast.message("Replayed.", { description: "Spin again to relive it." });
  });

  // ✅ Close reveal, and if it was the last one, open the final popup right after
  const closeReveal = useEvent(() => {
    setRevealOpen(false);

    // open final message AFTER the last reveal closes
    const isDone = remainingRef.current.length === 0;
    if (isDone && !endShownRef.current) {
      endShownRef.current = true;
      window.setTimeout(() => setEndOpen(true), prefersReducedMotion ? 0 : 140);
    }
  });

  const spin = useEvent(async () => {
    if (spinning) return;
    if (!gift) return;

    if (remaining.length === 0) {
      toast.message("All revealed.", { description: "Hit replay to experience it again." });
      return;
    }

    if (!bet) {
      toast.message("Choose a color first.", {
        description: "Tap the wheel, click the choice pill, or pick a chip.",
      });
      return;
    }

    // ✅ LAST ONE: no “lonely spin” — go straight to the reveal.
    if (remaining.length === 1) {
      const chosen = remaining[0];
      setSpinning(false);
      setRevealOpen(false);

      setSpotlight(chosen);

      const guessedRight = bet === chosen;
      setLastResult({ slice: chosen, guessedRight });

      toast.message("Final reveal.", {
        description: `It’s ${SLICE_PUBLIC[chosen].colorName} — ${SLICE_PUBLIC[chosen].title}.`,
      });

      if (guessedRight && !prefersReducedMotion) {
        setBurst(false);
        window.setTimeout(() => setBurst(true), 10);
        window.setTimeout(() => setBurst(false), 900);
      }

      setRemaining([]);
      setActive(chosen);
      setRevealOpen(true);
      setBet(null);
      return;
    }

    setSpinning(true);
    setRevealOpen(false);
    setEndOpen(false);

    const chosen = pickRandom(remaining);
    setSpotlight(chosen);

    const { map, step } = buildWheelLayout(remaining);

    // ✅ NEW: stop at a RANDOM point inside the slice (not always center)
    const seg = map.get(chosen);
    const start = seg?.start ?? 0;
    const end = seg?.end ?? step;

    // avoid landing too close to borders (feels "off")
    const edgeMargin = prefersReducedMotion ? 0 : Math.min(8, step * 0.14);
    const lo = start + edgeMargin;
    const hi = end - edgeMargin;

    const targetInWheelSpace = prefersReducedMotion
      ? (seg?.center ?? start + step / 2)
      : lo + Math.random() * Math.max(1, hi - lo);

    // wheel rotation needed so that pointer (top) points to that angle:
    const baseTarget = mod360(360 - targetInWheelSpace);

    const currentMod = mod360(rotationMV.get());
    const deltaToTarget = mod360(baseTarget - currentMod);

    // ✅ NEW: vary turns + a tiny flourish so it feels less "samey"
    const extraTurns =
      prefersReducedMotion
        ? 3
        : remaining.length === 4
        ? 8 + Math.floor(Math.random() * 4) // 8..11
        : remaining.length === 3
        ? 7 + Math.floor(Math.random() * 4) // 7..10
        : remaining.length === 2
        ? 6 + Math.floor(Math.random() * 4) // 6..9
        : 6;

    const nextRotation = rotationMV.get() + extraTurns * 360 + deltaToTarget;

    // optional micro-overshoot for premium "settle"
    const overshoot =
      prefersReducedMotion ? 0 : (Math.random() * 12 + 10) * (Math.random() > 0.5 ? 1 : -1);

    const dur = prefersReducedMotion ? 0.9 : 3.35;

    await new Promise<void>((resolve) => {
      animate(rotationMV, nextRotation + overshoot, {
        duration: dur,
        ease: prefersReducedMotion ? "easeOut" : [0.06, 0.92, 0.12, 1],
        onComplete: () => {
          // settle back quickly (makes it feel alive)
          if (!prefersReducedMotion && Math.abs(overshoot) > 0.1) {
            animate(rotationMV, nextRotation, {
              duration: 0.32,
              ease: "easeOut",
              onComplete: () => resolve(),
            });
          } else {
            resolve();
          }
        },
      });
    });

    audio.land();

    if (!prefersReducedMotion) {
      try {
        if (navigator.vibrate) navigator.vibrate([16, 28, 22]);
      } catch {
        // ignore
      }
    }

    const guessedRight = bet === chosen;
    setLastResult({ slice: chosen, guessedRight });

    toast.message(guessedRight ? "Well chosen." : "Not this time.", {
      description: `It landed on ${SLICE_PUBLIC[chosen].colorName} — ${SLICE_PUBLIC[chosen].title}.`,
    });

    if (guessedRight && !prefersReducedMotion) {
      setBurst(false);
      window.setTimeout(() => setBurst(true), 10);
      window.setTimeout(() => setBurst(false), 900);
    }

    setRemaining((r) => r.filter((x) => x !== chosen));
    setActive(chosen);

    setRevealOpen(true);
    setSpinning(false);

    setBet(null);
  });

  React.useEffect(() => {
    if (bet && !remaining.includes(bet)) setBet(null);
  }, [bet, remaining]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName?.toLowerCase();
      const isTyping = tag === "input" || tag === "textarea" || (e.target as any)?.isContentEditable;
      if (isTyping) return;

      if (!spinning && !revealOpen && remaining.length > 0) {
        if (e.key === "1" && remaining.includes("blue")) setBet("blue");
        if (e.key === "2" && remaining.includes("red")) setBet("red");
        if (e.key === "3" && remaining.includes("green")) setBet("green");
        if (e.key === "4" && remaining.includes("yellow")) setBet("yellow");
      }

      if ((e.key === " " || e.key === "Enter") && !revealOpen && !endOpen) {
        e.preventDefault();
        if (!bet) {
          toast.message("Choose a color first.", {
            description: "Tap the wheel, click the choice pill, or pick a chip.",
          });
          return;
        }
        spin();
      }

      if ((e.key === "r" || e.key === "R") && !revealOpen && !endOpen) reset();
      if (e.key === "m" || e.key === "M") setAudioOn((v) => !v);
      if (e.key === "Escape" && revealOpen) closeReveal();
      if (e.key === "Escape" && endOpen) setEndOpen(false);
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [spin, reset, revealOpen, spinning, remaining, bet, setAudioOn, endOpen, closeReveal]);

  if (loading) return <Skeleton />;

  if (paymentRequired) {
    return (
      <div className="min-h-screen grid place-items-center px-6">
        <GlowBg />
        <Card className="w-full max-w-xl border border-border/60 bg-background/60 shadow-[0_30px_120px_-70px_rgba(0,0,0,0.55)] backdrop-blur-xl">
          <CardContent className="p-6 md:p-8">
            <Pill dotClassName="bg-amber-500/80">Locked</Pill>

            <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">
              Unlock the{" "}
              <span className="bg-gradient-to-r from-rose-500 via-pink-500 to-amber-500 bg-clip-text text-transparent">
                moment
              </span>
              .
            </h1>

            <p className="mt-3 text-sm text-muted-foreground">
              One-time payment to reveal the wheel and the surprises. The link stays permanent.
            </p>

            <SoftDivider />

            <div className="flex flex-wrap gap-2">
              <Button
                onClick={payAndUnlock}
                disabled={!giftIdForPay}
                className="rounded-full px-6 bg-gradient-to-r from-rose-500 via-pink-500 to-amber-500 text-white hover:opacity-95 shadow-[0_16px_70px_-45px_rgba(244,114,182,0.55)]"
              >
                Pay & Unlock
              </Button>
              <Button
                variant="secondary"
                className="rounded-full border-border/60 bg-background/50 shadow-[0_1px_0_rgba(255,255,255,0.2)_inset]"
                onClick={() => (window.location.href = "/create")}
              >
                Create Yours
              </Button>
            </div>

            {!giftIdForPay && <div className="mt-4 text-xs text-muted-foreground">Preparing checkout…</div>}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!gift) {
    return (
      <div className="min-h-screen grid place-items-center px-6">
        <GlowBg />
        <Card className="w-full max-w-lg border border-border/60 bg-background/60 shadow-[0_30px_120px_-75px_rgba(0,0,0,0.55)] backdrop-blur-xl">
          <CardContent className="p-6 md:p-8">
            <Pill dotClassName="bg-sky-500/80">Link Issue</Pill>
            <div className="mt-4 text-xl font-semibold tracking-tight">Link Not Found</div>
            <div className="mt-2 text-sm text-muted-foreground">
              This gift may have been removed, or the link is incorrect.
            </div>
            <div className="mt-6">
              <Button className="rounded-full px-6" onClick={() => (window.location.href = "/create")}>
                Create a New One
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isPaid = gift.status === "paid";

  return (
    <div className="min-h-screen">
      <GlowBg />

      <HeartBurst fire={burst} />

      <RevealOverlay
        open={revealOpen}
        slice={active}
        onClose={closeReveal}
        gift={gift}
        parts={parts}
      />

      {/* ✅ NEW: final message popup (after last reveal closes) */}
      <EndOverlay
        open={endOpen}
        onClose={() => setEndOpen(false)}
        onReplay={reset}
      />

      <div className="mx-auto max-w-5xl px-5 py-10 md:py-14">
        <div className="flex flex-col items-center text-center">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Pill dotClassName={isPaid ? "bg-rose-500/80" : "bg-sky-500/80"}>
              {isPaid ? "Surprise" : "Preview"}
            </Pill>

            <Pill dotClassName="bg-emerald-500/80">
              Remaining <span className="font-medium text-foreground">{remaining.length}</span>/4
            </Pill>

            <button
              type="button"
              onClick={() => setAudioOn((v) => !v)}
              className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/55 px-3 py-1 text-xs text-muted-foreground shadow-[0_1px_0_rgba(255,255,255,0.35)_inset] backdrop-blur transition hover:border-border/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20"
              aria-pressed={audioOn}
              title="Toggle sound (M)"
            >
              <span
                className={[
                  "h-1.5 w-1.5 rounded-full",
                  audioOn ? "bg-emerald-500/80" : "bg-muted-foreground/45",
                ].join(" ")}
              />
              Sound {audioOn ? "On" : "Off"}
            </button>
          </div>

          <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl">
            A quiet ritual:{" "}
            <span className="bg-gradient-to-r from-rose-500 via-pink-500 to-amber-500 bg-clip-text text-transparent">
              choose
            </span>{" "}
            → {remaining.length === 0 ? "relive" : "spin"} → reveal.
          </h1>

          <p className="mt-3 max-w-2xl text-sm text-muted-foreground md:text-base">
            Four surprises, one at a time. Your choice never changes the outcome—it just makes the moment feel personal.
          </p>

          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Button
              variant="secondary"
              onClick={reset}
              className="rounded-full border-border/60 bg-background/50 shadow-[0_1px_0_rgba(255,255,255,0.2)_inset]"
              disabled={spinning}
            >
              Replay
            </Button>
          </div>
        </div>

        <div className="mt-10">
          <Card className="relative overflow-hidden border border-border/60 bg-background/60 shadow-[0_30px_120px_-85px_rgba(0,0,0,0.60)] backdrop-blur-xl">
            <motion.div
              className="pointer-events-none absolute inset-0 opacity-[0.50]"
              animate={prefersReducedMotion ? {} : { opacity: [0.40, 0.54, 0.40] }}
              transition={prefersReducedMotion ? {} : { duration: 6, repeat: Infinity }}
              style={{
                background:
                  "radial-gradient(900px circle at 20% 15%, rgba(244,114,182,0.13), transparent 55%), radial-gradient(900px circle at 85% 25%, rgba(251,191,36,0.10), transparent 55%), radial-gradient(1000px circle at 50% 90%, rgba(56,189,248,0.09), transparent 60%)",
              }}
            />
            <CardContent className="relative p-6 md:p-10">
              <Wheel
                rotationMV={rotationMV}
                spinning={spinning}
                onSpin={spin}
                disabled={spinning || remaining.length === 0}
                spotlight={spotlight}
                remaining={remaining}
                bet={bet}
                setBet={setBet}
                lastResult={lastResult}
                pointerPulse={pointerPulse}
              />
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 text-center text-[11px] text-muted-foreground">
          Keyboard: 1/2/3/4 choose • Enter/Space spin • R replay • Esc close • M sound
        </div>
      </div>
    </div>
  );
}

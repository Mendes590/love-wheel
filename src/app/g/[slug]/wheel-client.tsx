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
const SLICE_ORDER: SliceKey[] = ["blue", "red", "green", "yellow"];

const SLICE_LABEL: Record<SliceKey, string> = {
  blue: "Photo",
  red: "Short Line",
  green: "Time Together",
  yellow: "Love Letter",
};

const SLICE_HINT: Record<SliceKey, string> = {
  blue: "That “oh wow” moment.",
  red: "A sentence that hits.",
  green: "Every second counts.",
  yellow: "Read it slowly.",
};

const SLICE_PUBLIC: Record<
  SliceKey,
  { colorName: string; title: string; preview: string; vibe: string }
> = {
  blue: {
    colorName: "Blue",
    title: "A photo",
    preview: "A saved moment — instant “aww”.",
    vibe: "Visual + emotional hit",
  },
  red: {
    colorName: "Red",
    title: "A short line",
    preview: "One sentence that lands hard.",
    vibe: "Quick + powerful",
  },
  green: {
    colorName: "Green",
    title: "Time together",
    preview: "Days / hours / minutes since it began.",
    vibe: "Nostalgia + goosebumps",
  },
  yellow: {
    colorName: "Gold",
    title: "A love letter",
    preview: "A longer message — read slowly.",
    vibe: "Deep + romantic",
  },
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
function msToParts(ms: number) {
  const s = Math.floor(ms / 1000);
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  return { days, hours, mins, secs };
}
function pickRandom<T>(arr: T[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}
function mod360(n: number) {
  return ((n % 360) + 360) % 360;
}
function useEvent<T extends (...args: any[]) => any>(fn: T) {
  const ref = React.useRef(fn);
  React.useEffect(() => void (ref.current = fn), [fn]);
  return React.useCallback((...args: Parameters<T>) => ref.current(...args), []);
}

function GlowBg() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(1200px_circle_at_12%_10%,rgba(244,114,182,0.30),transparent_55%),radial-gradient(1100px_circle_at_86%_18%,rgba(251,191,36,0.18),transparent_55%),radial-gradient(1000px_circle_at_55%_92%,rgba(56,189,248,0.12),transparent_60%),radial-gradient(900px_circle_at_50%_45%,rgba(236,72,153,0.12),transparent_55%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(1200px_circle_at_50%_50%,transparent_35%,rgba(0,0,0,0.22)_100%)] dark:bg-[radial-gradient(1200px_circle_at_50%_50%,transparent_35%,rgba(0,0,0,0.68)_100%)]" />
      <div className="absolute inset-0 opacity-[0.08] [background-image:radial-gradient(rgba(255,255,255,0.55)_1px,transparent_1px)] [background-size:7px_7px]" />
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
    ? "from-rose-500/30 via-pink-500/14 to-transparent"
    : k === "green"
    ? "from-emerald-500/26 via-emerald-500/12 to-transparent"
    : k === "yellow"
    ? "from-amber-500/26 via-amber-500/12 to-transparent"
    : "from-sky-500/26 via-sky-500/12 to-transparent";
}

function sliceFillRGBA(k: SliceKey) {
  if (k === "blue") return "rgba(56,189,248,.78)";
  if (k === "red") return "rgba(244,114,182,.78)";
  if (k === "green") return "rgba(52,211,153,.78)";
  return "rgba(251,191,36,.78)";
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

/* ------------------------------ Audio FX ------------------------------ */

function useTickAudio(enabled: boolean) {
  const prefersReducedMotion = useReducedMotion();
  const ctxRef = React.useRef<AudioContext | null>(null);
  const lastRef = React.useRef(0);

  const beep = React.useCallback(
    (kind: "tick" | "land") => {
      if (!enabled || prefersReducedMotion) return;

      try {
        const AudioCtx = (window.AudioContext ||
          (window as any).webkitAudioContext) as
          | typeof AudioContext
          | undefined;
        if (!AudioCtx) return;

        if (!ctxRef.current) ctxRef.current = new AudioCtx();
        const ctx = ctxRef.current;

        if (ctx.state === "suspended") void ctx.resume();

        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        const freq = kind === "tick" ? 640 : 420;
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now);

        const dur = kind === "tick" ? 0.022 : 0.13;
        const peak = kind === "tick" ? 0.05 : 0.1;

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
    if (t - lastRef.current < 55) return;
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

/* ------------------------------ Simple Valentine Confetti ------------------------------ */

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
            {Array.from({ length: 20 }).map((_, i) => {
              const left = 50 + (Math.random() * 30 - 15);
              const top = 52 + (Math.random() * 18 - 9);
              const dx = (Math.random() * 260 - 130);
              const dy = -(220 + Math.random() * 220);
              const rot = Math.random() * 180 - 90;
              const delay = i * 0.01;

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
                  <div className="grid h-7 w-7 place-items-center rounded-full border border-white/14 bg-black/18 backdrop-blur">
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

  React.useEffect(() => {
    if (!open) return;
    setStage("intro");
  }, [open, slice]);

  const theme = slice
    ? sliceThemeGradient(slice)
    : "from-white/10 via-white/5 to-transparent";
  const dot = slice ? colorDotClass(slice) : "bg-foreground/50";
  const title = slice ? SLICE_LABEL[slice] : "Reveal";

  const headline =
    slice === "red"
      ? "A line for your heart."
      : slice === "green"
      ? "Your love in numbers…"
      : slice === "yellow"
      ? "A letter, just for you."
      : "A moment you can replay.";

  const introCopy =
    slice === "red"
      ? "Short. Sweet. Dangerous (in the best way)."
      : slice === "green"
      ? "Because every second together counts."
      : slice === "yellow"
      ? "Take your time. Read it like a secret."
      : "The kind of photo that makes you smile instantly.";

  const readyLine =
    slice === "red"
      ? "Press Reveal to open it."
      : slice === "green"
      ? "Press Reveal to see it."
      : slice === "yellow"
      ? "Press Reveal to break the seal."
      : "Press Reveal to uncover the photo.";

  const letterLines = React.useMemo(
    () =>
      gift.love_letter
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
    [gift.love_letter]
  );

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Enter" && stage === "intro") setStage("reveal");
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

          <div
            className={`pointer-events-none absolute inset-0 bg-gradient-to-b ${theme}`}
          />

          <motion.div
            initial={{
              y: prefersReducedMotion ? 0 : 22,
              scale: 0.98,
              opacity: 0,
            }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{
              y: prefersReducedMotion ? 0 : 12,
              scale: 0.99,
              opacity: 0,
            }}
            transition={{ type: "spring", stiffness: 140, damping: 18, mass: 0.9 }}
            className="relative w-full max-w-2xl"
          >
            <div className="rounded-[32px] border border-border/60 bg-background/70 shadow-[0_40px_140px_-80px_rgba(0,0,0,0.85)] backdrop-blur-xl">
              <div className="flex items-start justify-between gap-4 px-6 pb-2 pt-6 md:px-8">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={["h-2.5 w-2.5 rounded-full", dot].join(" ")} />
                    <div className="text-xs text-muted-foreground">{title}</div>
                  </div>
                  <div className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">
                    {headline}
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground">
                    {SLICE_HINT[slice]}
                  </div>
                </div>

                <Button
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
                  className="relative overflow-hidden rounded-[28px] border border-border/60 bg-background/60 shadow-[0_1px_0_rgba(255,255,255,0.25)_inset]"
                  initial={
                    prefersReducedMotion
                      ? { opacity: 0 }
                      : { rotateX: 10, y: 10, opacity: 0 }
                  }
                  animate={
                    prefersReducedMotion ? { opacity: 1 } : { rotateX: 0, y: 0, opacity: 1 }
                  }
                  transition={{ type: "spring", stiffness: 130, damping: 16 }}
                  style={{ transformStyle: "preserve-3d" }}
                >
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(700px_circle_at_25%_18%,rgba(255,255,255,0.26),transparent_55%)]" />
                  <div className="pointer-events-none absolute inset-0 opacity-[0.08] [background-image:linear-gradient(to_right,rgba(255,255,255,0.9),transparent)]" />

                  <div className="p-6 md:p-8">
                    <AnimatePresence mode="wait">
                      {stage === "intro" ? (
                        <motion.div
                          key="intro"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 8 }}
                          transition={{ duration: 0.28 }}
                          className="space-y-5"
                        >
                          <div className="text-sm text-muted-foreground">It landed on</div>

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
                              className="rounded-full px-6 bg-gradient-to-r from-rose-500 via-pink-500 to-amber-500 text-white hover:opacity-95 shadow-[0_18px_80px_-55px_rgba(244,114,182,0.65)]"
                              onClick={() => setStage("reveal")}
                            >
                              Reveal
                            </Button>
                          </div>
                        </motion.div>
                      ) : (
                        <motion.div
                          key="reveal"
                          initial={{ opacity: 0, scale: 0.98, y: 10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.99, y: 6 }}
                          transition={{ type: "spring", stiffness: 170, damping: 18 }}
                        >
                          {slice === "red" && (
                            <div className="text-center">
                              <div className="text-xs text-muted-foreground">Short line</div>
                              <motion.div
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.06 }}
                                className="mt-3 text-3xl font-semibold leading-tight tracking-tight md:text-4xl"
                              >
                                “{gift.red_phrase}”
                              </motion.div>
                              <div className="mt-4 text-xs text-muted-foreground">
                                Valentine’s Day energy. Keep it forever.
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
                                Every second, still choosing each other.
                              </div>
                            </div>
                          )}

                          {slice === "yellow" && (
                            <div className="space-y-3">
                              <div className="text-sm text-muted-foreground">Love letter</div>
                              <div className="space-y-2">
                                {(letterLines.length ? letterLines : [gift.love_letter])
                                  .slice(0, 18)
                                  .map((line, i) => (
                                    <motion.div
                                      key={i}
                                      initial={{ opacity: 0, y: 8 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      transition={{ delay: i * 0.03 }}
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
                              <div className="text-sm text-muted-foreground">Photo</div>

                              {gift.couple_photo_url ? (
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.98 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  transition={{ duration: 0.35 }}
                                  className="relative overflow-hidden rounded-3xl border border-border/60 shadow-[0_1px_0_rgba(255,255,255,0.25)_inset]"
                                >
                                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(700px_circle_at_28%_18%,rgba(255,255,255,0.28),transparent_55%)]" />
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={gift.couple_photo_url}
                                    alt="Couple photo"
                                    className="h-[300px] w-full object-cover md:h-[340px]"
                                    loading="eager"
                                  />
                                </motion.div>
                              ) : (
                                <div className="rounded-3xl border border-border/60 bg-muted/10 p-12 text-center text-sm text-muted-foreground shadow-[0_1px_0_rgba(255,255,255,0.2)_inset]">
                                  Photo not added yet.
                                </div>
                              )}

                              <div className="text-xs text-muted-foreground">
                                A little “us” moment — perfect for Valentine’s.
                              </div>
                            </div>
                          )}

                          <div className="mt-6 flex items-center justify-between gap-3">
                            <div className="text-xs text-muted-foreground">
                              Tip: after the last one, hit replay.
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

/* ------------------------------ Orbit Bet Picker (FUN + SIMPLE) ------------------------------ */

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
      ? "from-sky-500/30 via-sky-400/10"
      : k === "red"
      ? "from-rose-500/32 via-pink-500/10"
      : k === "green"
      ? "from-emerald-500/30 via-emerald-400/10"
      : "from-amber-500/30 via-amber-300/10";

  return (
    <motion.button
      type="button"
      disabled={disabled}
      onClick={onPick}
      className={[
        "relative inline-flex items-center gap-2 rounded-full border border-white/12 bg-black/20 px-3 py-2 text-xs text-white/85 backdrop-blur",
        "shadow-[0_22px_90px_-70px_rgba(0,0,0,0.8)]",
        "transition active:scale-[0.98] disabled:cursor-not-allowed",
        selected ? "ring-2 ring-white/20" : "hover:border-white/18",
        disabled ? "opacity-45" : "opacity-100",
      ].join(" ")}
      animate={pulse && !selected && !disabled ? { y: [0, -3, 0] } : { y: 0 }}
      transition={
        pulse && !selected && !disabled
          ? { duration: 1.15, repeat: Infinity, ease: "easeInOut" }
          : {}
      }
      aria-pressed={selected}
      title={`Pick ${SLICE_PUBLIC[k].colorName}`}
    >
      <span className={["h-2.5 w-2.5 rounded-full", colorDotClass(k)].join(" ")} />
      <span className="font-semibold tracking-tight">{SLICE_PUBLIC[k].colorName}</span>
      <span className="text-white/60">•</span>
      <span className="text-white/75">{SLICE_PUBLIC[k].title}</span>
      <span className={`pointer-events-none absolute inset-0 rounded-full bg-gradient-to-b ${base} to-transparent`} />
    </motion.button>
  );
}

function PressToSpinButton({
  enabled,
  spinning,
  onPress,
  label,
}: {
  enabled: boolean;
  spinning: boolean;
  onPress: () => void;
  label: string;
}) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      className={[
        "relative rounded-full border border-white/16 bg-gradient-to-r from-rose-500 via-pink-500 to-amber-500 p-[2px]",
        "shadow-[0_28px_120px_-85px_rgba(244,114,182,0.75)]",
        enabled ? "opacity-100" : "opacity-60",
      ].join(" ")}
      animate={!enabled && !spinning ? { y: [0, -2, 0] } : { y: 0 }}
      transition={!enabled && !spinning ? { duration: 1.2, repeat: Infinity, ease: "easeInOut" } : {}}
    >
      <motion.button
        type="button"
        disabled={!enabled || spinning}
        className={[
          "group relative flex items-center justify-center gap-2 rounded-full px-8 py-4 text-sm font-semibold text-white",
          "bg-black/18 backdrop-blur",
          "shadow-[0_1px_0_rgba(255,255,255,0.22)_inset]",
          "transition active:scale-[0.98] disabled:cursor-not-allowed",
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
        <span className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(520px_circle_at_30%_25%,rgba(255,255,255,0.28),transparent_58%)] opacity-90" />
        <span className="relative inline-flex items-center gap-2">
          <IconSparkle />
          {spinning ? "Spinning…" : label}
        </span>
        <span className="ml-1 inline-flex items-center text-[11px] font-medium text-white/75">
          press
        </span>
      </motion.button>

      {/* tiny pulse shine for Valentine vibe */}
      <motion.div
        className="pointer-events-none absolute -inset-2 rounded-full opacity-50"
        animate={prefersReducedMotion ? {} : { opacity: [0.35, 0.65, 0.35] }}
        transition={prefersReducedMotion ? {} : { duration: 1.8, repeat: Infinity }}
        style={{
          background:
            "radial-gradient(600px circle at 30% 30%, rgba(255,255,255,0.18), transparent 60%)",
          filter: "blur(8px)",
        }}
      />
    </motion.div>
  );
}

/* ------------------------------ Wheel (NEW UX: PRESS) ------------------------------ */

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
      ? "from-sky-500/30 via-sky-400/10"
      : spotlight === "red"
      ? "from-rose-500/32 via-pink-500/10"
      : spotlight === "green"
      ? "from-emerald-500/30 via-emerald-400/10"
      : spotlight === "yellow"
      ? "from-amber-500/30 via-amber-300/10"
      : "from-white/10 via-white/5";

  const layout = React.useMemo(() => buildWheelLayout(remaining), [remaining]);
  const wheelBg = React.useMemo(() => buildConicGradient(remaining), [remaining]);

  const spinScale = useSpring(spinning && !prefersReducedMotion ? 1.01 : 1, {
    stiffness: 210,
    damping: 18,
    mass: 0.7,
  });

  return (
    <div className="mx-auto grid place-items-center">
      <div className="relative w-full max-w-[900px]">
        {/* Top: Bet slot + microcopy */}
        <div className="mb-6 text-center">
          <div className="text-base font-semibold tracking-tight">
            {spinning
              ? "Fate is turning…"
              : disabled
              ? "All surprises opened."
              : bet
              ? "Bet locked in."
              : "Pick a color (quick + fun)."}
          </div>

          <div className="mt-1 text-xs text-muted-foreground">
            {spinning
              ? "Listen for the ticks…"
              : disabled
              ? "Replay to experience it again."
              : bet
              ? `You picked ${SLICE_PUBLIC[bet].colorName}. (It never changes the outcome.)`
              : "Tap a floating chip to set your bet. Then press to spin."}
          </div>

          {/* Bet slot */}
          <div className="mt-4 flex items-center justify-center">
            <div className="relative inline-flex items-center gap-3 rounded-full border border-border/60 bg-background/55 px-4 py-2 text-xs text-muted-foreground shadow-[0_18px_80px_-60px_rgba(0,0,0,0.55)] backdrop-blur">
              <span className="inline-flex items-center gap-2">
                <span className="grid h-7 w-7 place-items-center rounded-full border border-white/14 bg-black/18">
                  <HeartIcon className="opacity-90" />
                </span>
                <span className="font-medium text-foreground/85">Your bet</span>
              </span>

              <span className="text-muted-foreground">—</span>

              <AnimatePresence mode="wait">
                {bet ? (
                  <motion.span
                    key={`bet-${bet}`}
                    initial={{ opacity: 0, y: 6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.99 }}
                    transition={{ type: "spring", stiffness: 200, damping: 18 }}
                    className="inline-flex items-center gap-2"
                  >
                    <span className={["h-2.5 w-2.5 rounded-full", colorDotClass(bet)].join(" ")} />
                    <span className="font-semibold text-foreground">{SLICE_PUBLIC[bet].colorName}</span>
                    <button
                      type="button"
                      onClick={() => setBet(null)}
                      disabled={!canPick}
                      className="ml-1 inline-flex items-center rounded-full border border-border/60 bg-background/60 px-2 py-1 text-[11px] text-muted-foreground transition hover:text-foreground disabled:opacity-60"
                      title="Clear bet"
                    >
                      Clear
                    </button>
                  </motion.span>
                ) : (
                  <motion.span
                    key="bet-empty"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    className="text-muted-foreground"
                  >
                    Choose a color chip below
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Floating chips row */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            {remaining.map((k) => (
              <BetChip
                key={k}
                k={k}
                selected={bet === k}
                disabled={!canPick}
                pulse={mustPick}
                onPick={() => setBet(bet === k ? null : k)}
              />
            ))}
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            <Pill dotClassName={mustPick ? "bg-rose-500/85" : "bg-foreground/50"}>
              {mustPick ? (
                <>Pick a chip to unlock the spin</>
              ) : (
                <>
                  Outcome is always{" "}
                  <span className="font-medium text-foreground">random</span>
                  <span className="text-muted-foreground"> — the bet is just for drama.</span>
                </>
              )}
            </Pill>
            <Pill dotClassName="bg-emerald-500/85">
              Remaining <span className="font-medium text-foreground">{remaining.length}</span>/4
            </Pill>
          </div>

          <AnimatePresence>
            {lastResult && !spinning && !prefersReducedMotion && (
              <motion.div
                key="resultBadge"
                initial={{ opacity: 0, y: 8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.99 }}
                transition={{ type: "spring", stiffness: 180, damping: 18 }}
                className="mt-4 mx-auto w-fit inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/55 px-4 py-2 text-xs shadow-[0_18px_80px_-60px_rgba(0,0,0,0.65)] backdrop-blur"
              >
                <span className={["h-2 w-2 rounded-full", colorDotClass(lastResult.slice)].join(" ")} />
                <span className="font-semibold">
                  {lastResult.guessedRight ? "Nice pick." : "Close."}
                </span>
                <span className="text-muted-foreground">
                  Landed on {SLICE_PUBLIC[lastResult.slice].colorName}.
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Halo behind */}
        <div className="pointer-events-none absolute left-1/2 top-[290px] h-[72%] w-[72%] -translate-x-1/2 rounded-full bg-gradient-to-r from-rose-500/16 via-pink-500/10 to-amber-500/16 blur-2xl" />

        {/* pointer */}
        <motion.div
          className="absolute left-1/2 top-[364px] z-30 -translate-x-1/2"
          animate={spinning && !prefersReducedMotion ? { y: [0, -2, 0] } : { y: 0 }}
          transition={{ duration: 0.25, repeat: spinning && !prefersReducedMotion ? Infinity : 0 }}
          style={{
            scale: prefersReducedMotion ? 1 : 1 + Math.min(0.08, pointerPulse * 0.012),
          }}
        >
          <div className="h-0 w-0 border-l-[14px] border-r-[14px] border-b-[22px] border-l-transparent border-r-transparent border-b-foreground/90 drop-shadow-sm" />
          <div className="mx-auto mt-1 h-3 w-3 rounded-full bg-foreground/75 shadow-[0_12px_34px_-20px_rgba(0,0,0,0.85)]" />
        </motion.div>

        {/* wheel */}
        <div className="relative mx-auto mt-6 aspect-square w-full max-w-[560px]">
          <div className="pointer-events-none absolute -inset-3 rounded-full bg-gradient-to-b from-white/14 to-transparent blur-[2px]" />
          <div className="pointer-events-none absolute -inset-2 rounded-full border border-white/12" />
          <div className={`pointer-events-none absolute -inset-10 rounded-full bg-gradient-to-b ${ringAccent} to-transparent blur-2xl`} />

          <motion.div
            className="pointer-events-none absolute -inset-8 rounded-full opacity-[0.55]"
            animate={prefersReducedMotion ? {} : { rotate: 360 }}
            transition={prefersReducedMotion ? {} : { duration: 18, ease: "linear", repeat: Infinity }}
            style={{
              background:
                "conic-gradient(from 0deg, rgba(255,255,255,0.10), rgba(255,255,255,0.02), rgba(255,255,255,0.14), rgba(255,255,255,0.02), rgba(255,255,255,0.10))",
              filter: "blur(10px)",
            }}
          />

          <motion.div
            className={[
              "absolute inset-0 rounded-full border border-border/60 bg-background/65 backdrop-blur",
              "shadow-[0_60px_190px_-130px_rgba(0,0,0,0.85)] transform-gpu",
            ].join(" ")}
            style={{
              transformOrigin: "50% 50%",
              background: wheelBg,
              rotate: rotationMV,
              scale: spinScale,
            }}
            aria-label="Wheel"
          >
            <div className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(900px_circle_at_28%_18%,rgba(255,255,255,0.52),transparent_50%)]" />
            <div className="pointer-events-none absolute inset-0 rounded-full ring-1 ring-white/12" />

            <div className="pointer-events-none absolute inset-[7%] rounded-full ring-1 ring-white/10" />
            <div className="pointer-events-none absolute inset-[10%] rounded-full bg-[radial-gradient(400px_circle_at_50%_30%,rgba(255,255,255,0.10),transparent_60%)]" />

            <div className="pointer-events-none absolute inset-0 rounded-full">
              {remaining.length > 1 &&
                remaining.map((_, i) => {
                  const ang = i * layout.step;
                  return (
                    <div
                      key={`sep-${i}`}
                      className="absolute left-1/2 top-1/2 h-[54%] w-px origin-bottom -translate-x-1/2 bg-white/16"
                      style={{ transform: `rotate(${ang}deg)` }}
                    />
                  );
                })}
            </div>
          </motion.div>

          {/* center: PRESS TO SPIN */}
          <div className="absolute inset-0 grid place-items-center">
            <PressToSpinButton
              enabled={!disabled && !spinning && remaining.length > 0 && !!bet}
              spinning={spinning}
              onPress={onSpin}
              label={disabled ? "All revealed" : !bet ? "Pick a color" : "Spin"}
            />
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
                Tap a color chip above
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="mt-4 text-center text-xs text-muted-foreground">
          Keyboard: 1/2/3/4 to pick • Enter/Space to spin • R to replay • Esc closes the modal • M toggles sound
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

  const [remaining, setRemaining] = React.useState<SliceKey[]>([
    "blue",
    "red",
    "green",
    "yellow",
  ]);
  const [active, setActive] = React.useState<SliceKey | null>(null);

  const [spinning, setSpinning] = React.useState(false);
  const rotationMV = useMotionValue(0);

  const [now, setNow] = React.useState(() => new Date());

  const [paymentRequired, setPaymentRequired] = React.useState(false);
  const [giftIdForPay, setGiftIdForPay] = React.useState<string | null>(null);

  const [revealOpen, setRevealOpen] = React.useState(false);
  const [spotlight, setSpotlight] = React.useState<SliceKey | null>(null);

  const [bet, setBet] = React.useState<SliceKey | null>(null);
  const [lastResult, setLastResult] = React.useState<{
    slice: SliceKey;
    guessedRight: boolean;
  } | null>(null);

  const [pointerPulse, setPointerPulse] = React.useState(0);

  const [audioOn, setAudioOn] = React.useState(true);
  const audio = useTickAudio(audioOn);

  const [burst, setBurst] = React.useState(false);

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

    (async () => {
      try {
        const res = await fetch(`/api/gifts/${slug}`, { cache: "no-store" });

        if (res.status === 402) {
          if (alive) setPaymentRequired(true);

          const r2 = await fetch(`/api/resolve/${slug}`, { cache: "no-store" });
          const d2 = await r2.json();
          if (r2.ok && alive) setGiftIdForPay(d2.id);

          if (alive) setLoading(false);
          return;
        }

        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? "Failed to load gift.");
        if (alive) setGift(data);
      } catch (e: any) {
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
  const elapsed = startAt
    ? clamp(now.getTime() - startAt.getTime(), 0, 10 ** 15)
    : 0;
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
    setRemaining(["blue", "red", "green", "yellow"]);
    setActive(null);
    rotationMV.set(0);
    setRevealOpen(false);
    setSpinning(false);
    setSpotlight(null);
    setBet(null);
    setLastResult(null);
    setPointerPulse(0);
    setBurst(false);

    toast.message("Replayed.", { description: "Spin again to relive it." });
  });

  const spin = useEvent(async () => {
    if (spinning) return;
    if (!gift) return;

    if (remaining.length === 0) {
      toast.message("All revealed.", { description: "Hit replay to experience it again." });
      return;
    }

    if (!bet) {
      toast.message("Pick a color first.", {
        description: "Tap a color chip to lock your bet (outcome stays random).",
      });
      return;
    }

    setSpinning(true);
    setRevealOpen(false);

    const chosen = pickRandom(remaining);
    setSpotlight(chosen);

    const { map } = buildWheelLayout(remaining);
    const center = map.get(chosen)?.center ?? 0;

    const baseTarget = mod360(360 - center);
    const jitter = prefersReducedMotion ? 0 : Math.random() * 16 - 8;
    const targetMod = mod360(baseTarget + jitter);

    const currentMod = mod360(rotationMV.get());
    const deltaToTarget = mod360(targetMod - currentMod);

    const extraTurns = prefersReducedMotion
      ? 3
      : remaining.length === 4
      ? 9
      : remaining.length === 3
      ? 8
      : remaining.length === 2
      ? 7
      : 6;

    const nextRotation = rotationMV.get() + extraTurns * 360 + deltaToTarget;

    const dur = prefersReducedMotion ? 0.9 : 3.75;
    await new Promise<void>((resolve) => {
      animate(rotationMV, nextRotation, {
        duration: dur,
        ease: prefersReducedMotion ? "easeOut" : [0.05, 0.92, 0.10, 1],
        onComplete: () => resolve(),
      });
    });

    audio.land();

    if (!prefersReducedMotion) {
      try {
        if (navigator.vibrate) navigator.vibrate([18, 30, 24]);
      } catch {
        // ignore
      }
    }

    const guessedRight = bet === chosen;
    setLastResult({ slice: chosen, guessedRight });

    toast.message(guessedRight ? "Nice pick." : "Not this time.", {
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
      const isTyping =
        tag === "input" || tag === "textarea" || (e.target as any)?.isContentEditable;
      if (isTyping) return;

      if (!spinning && !revealOpen && remaining.length > 0) {
        if (e.key === "1" && remaining.includes("blue")) setBet("blue");
        if (e.key === "2" && remaining.includes("red")) setBet("red");
        if (e.key === "3" && remaining.includes("green")) setBet("green");
        if (e.key === "4" && remaining.includes("yellow")) setBet("yellow");
      }

      if ((e.key === " " || e.key === "Enter") && !revealOpen) {
        e.preventDefault();
        if (!bet) {
          toast.message("Pick a color first.", {
            description: "Tap a chip (bet) to unlock spin.",
          });
          return;
        }
        spin();
      }

      if ((e.key === "r" || e.key === "R") && !revealOpen) reset();
      if (e.key === "m" || e.key === "M") setAudioOn((v) => !v);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [spin, reset, revealOpen, spinning, remaining, bet]);

  if (loading) return <Skeleton />;

  if (paymentRequired) {
    return (
      <div className="min-h-screen grid place-items-center px-6">
        <GlowBg />
        <Card className="w-full max-w-xl border border-border/60 bg-background/60 shadow-[0_30px_120px_-70px_rgba(0,0,0,0.55)] backdrop-blur-xl">
          <CardContent className="p-6 md:p-8">
            <Pill dotClassName="bg-amber-500/85">Locked Gift</Pill>

            <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">
              Unlock the{" "}
              <span className="bg-gradient-to-r from-rose-500 via-pink-500 to-amber-500 bg-clip-text text-transparent">
                Valentine
              </span>{" "}
              moment.
            </h1>

            <p className="mt-3 text-sm text-muted-foreground">
              Pay once to reveal the wheel and the surprises. The link stays permanent.
            </p>

            <SoftDivider />

            <div className="flex flex-wrap gap-2">
              <Button
                onClick={payAndUnlock}
                disabled={!giftIdForPay}
                className="rounded-full px-6 bg-gradient-to-r from-rose-500 via-pink-500 to-amber-500 text-white hover:opacity-95 shadow-[0_16px_70px_-45px_rgba(244,114,182,0.65)]"
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

            {!giftIdForPay && (
              <div className="mt-4 text-xs text-muted-foreground">
                Preparing checkout…
              </div>
            )}
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
            <Pill dotClassName="bg-sky-500/85">Link Issue</Pill>
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

  return (
    <div className="min-h-screen">
      <GlowBg />

      <HeartBurst fire={burst} />

      <RevealOverlay
        open={revealOpen}
        slice={active}
        onClose={() => setRevealOpen(false)}
        gift={gift}
        parts={parts}
      />

      <div className="mx-auto max-w-5xl px-5 py-10 md:py-14">
        <div className="flex flex-col items-center text-center">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Pill dotClassName={gift.status === "paid" ? "bg-rose-500/85" : "bg-sky-500/85"}>
              {gift.status === "paid" ? "Valentine Surprise" : "Draft Preview"}
            </Pill>
            <Pill dotClassName="bg-emerald-500/85">
              Remaining <span className="font-medium text-foreground">{remaining.length}</span>/4
            </Pill>
            <button
              type="button"
              onClick={() => setAudioOn((v) => !v)}
              className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/55 px-3 py-1 text-xs text-muted-foreground shadow-[0_1px_0_rgba(255,255,255,0.35)_inset] backdrop-blur transition hover:border-border/80"
              aria-pressed={audioOn}
              title="Toggle sound (M)"
            >
              <span
                className={[
                  "h-1.5 w-1.5 rounded-full",
                  audioOn ? "bg-emerald-500/85" : "bg-muted-foreground/50",
                ].join(" ")}
              />
              Sound {audioOn ? "On" : "Off"}
            </button>
          </div>

          <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl">
            Pick a chip →{" "}
            <span className="bg-gradient-to-r from-rose-500 via-pink-500 to-amber-500 bg-clip-text text-transparent">
              press
            </span>{" "}
            → reveal.
          </h1>

          <p className="mt-3 max-w-2xl text-sm text-muted-foreground md:text-base">
            Valentine’s Day edition: four little surprises, one cozy spin at a time. The bet never changes the outcome —
            it just makes the moment sweeter.
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
              className="pointer-events-none absolute inset-0 opacity-[0.55]"
              animate={prefersReducedMotion ? {} : { opacity: [0.42, 0.58, 0.42] }}
              transition={prefersReducedMotion ? {} : { duration: 5.4, repeat: Infinity }}
              style={{
                background:
                  "radial-gradient(900px circle at 20% 15%, rgba(244,114,182,0.16), transparent 55%), radial-gradient(900px circle at 85% 25%, rgba(251,191,36,0.12), transparent 55%), radial-gradient(1000px circle at 50% 90%, rgba(56,189,248,0.10), transparent 60%)",
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

        <div className="mt-8 text-center text-xs text-muted-foreground">
          Keyboard: 1/2/3/4 to pick • Space/Enter to spin • R to replay • Esc closes the modal • M toggles sound
        </div>
      </div>
    </div>
  );
}

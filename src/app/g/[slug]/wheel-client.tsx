"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
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
      {/* romantic aurora */}
      <div className="absolute inset-0 bg-[radial-gradient(1200px_circle_at_12%_10%,rgba(244,114,182,0.28),transparent_55%),radial-gradient(1100px_circle_at_86%_18%,rgba(251,191,36,0.18),transparent_55%),radial-gradient(1000px_circle_at_55%_92%,rgba(56,189,248,0.12),transparent_60%),radial-gradient(900px_circle_at_50%_45%,rgba(236,72,153,0.10),transparent_55%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(1200px_circle_at_50%_50%,transparent_35%,rgba(0,0,0,0.22)_100%)] dark:bg-[radial-gradient(1200px_circle_at_50%_50%,transparent_35%,rgba(0,0,0,0.68)_100%)]" />
      {/* soft grain */}
      <div className="absolute inset-0 opacity-[0.07] [background-image:radial-gradient(rgba(255,255,255,0.55)_1px,transparent_1px)] [background-size:7px_7px]" />
      {/* subtle vertical shimmer */}
      <div className="absolute inset-0 opacity-[0.06] [background-image:linear-gradient(to_bottom,rgba(255,255,255,0.55),transparent,rgba(255,255,255,0.30))]" />
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
    return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
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
  // slightly richer + romantic palette (still premium)
  if (k === "blue") return "rgba(56,189,248,.74)";
  if (k === "red") return "rgba(244,114,182,.74)";
  if (k === "green") return "rgba(52,211,153,.74)";
  return "rgba(251,191,36,.74)";
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

/** No icons inside the wheel (clean look) */
function SliceGlyph(_: { k: SliceKey }) {
  return null;
}

const SLICE_PUBLIC: Record<SliceKey, { colorName: string; title: string; preview: string; vibe: string }> = {
  blue: { colorName: "Blue", title: "A photo", preview: "A saved moment — instant “aww”.", vibe: "Visual + emotional hit" },
  red: { colorName: "Red", title: "A short line", preview: "One sentence that lands hard.", vibe: "Quick + powerful" },
  green: { colorName: "Green", title: "Time together", preview: "Days / hours / minutes since it began.", vibe: "Nostalgia + goosebumps" },
  yellow: { colorName: "Gold", title: "A love letter", preview: "A longer message — read slowly.", vibe: "Deep + romantic" },
};

function LegendCard({
  k,
  selected,
  disabled,
  onPick,
}: {
  k: SliceKey;
  selected: boolean;
  disabled: boolean;
  onPick: () => void;
}) {
  const accent =
    k === "blue"
      ? "from-sky-500/22 via-sky-400/10"
      : k === "red"
      ? "from-rose-500/24 via-pink-500/10"
      : k === "green"
      ? "from-emerald-500/22 via-emerald-400/10"
      : "from-amber-500/22 via-amber-300/10";

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onPick}
      className={[
        "group relative w-full text-left",
        "rounded-2xl border border-border/60 bg-background/55 backdrop-blur",
        "shadow-[0_18px_80px_-60px_rgba(0,0,0,0.60)]",
        "transition active:scale-[0.99] disabled:cursor-not-allowed",
        selected ? "ring-2 ring-white/18" : "hover:border-border/80",
        disabled ? "opacity-45" : "opacity-100",
      ].join(" ")}
      aria-pressed={selected}
    >
      <div className={`pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-b ${accent} to-transparent`} />
      <div className="relative p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className={["h-2.5 w-2.5 rounded-full", colorDotClass(k)].join(" ")} />
            <div className="text-sm font-semibold tracking-tight">
              {SLICE_PUBLIC[k].colorName} — {SLICE_PUBLIC[k].title}
            </div>
          </div>

          <div
            className={[
              "inline-flex items-center gap-2 rounded-full border border-white/12 bg-black/18 px-3 py-1 text-[11px] text-white/85",
              selected ? "opacity-100" : "opacity-70 group-hover:opacity-90",
            ].join(" ")}
          >
            {selected ? "Your bet" : "Bet"}
          </div>
        </div>

        <div className="mt-2 text-xs text-muted-foreground">{SLICE_PUBLIC[k].preview}</div>
        <div className="mt-2 text-[11px] text-muted-foreground/90">
          <span className="font-medium text-foreground/80">Vibe:</span> {SLICE_PUBLIC[k].vibe}
        </div>
      </div>
    </button>
  );
}

/** Build the wheel slices dynamically from remaining colors (removes colors that already landed). */
function buildWheelLayout(keys: SliceKey[]) {
  const safe = keys.length ? keys : (["blue"] as SliceKey[]); // avoids division by 0
  const n = safe.length;
  const step = 360 / n;

  const map = new Map<SliceKey, { start: number; end: number; center: number; index: number }>();
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

  // small “gloss” trick: add transparent sliver at boundaries for premium separation
  return `conic-gradient(from 0deg, ${stops.join(",")})`;
}

/**
 * Two-step modal:
 * 1) Intro (what it is)
 * 2) Reveal (actual content)
 */
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

  const theme = slice ? sliceThemeGradient(slice) : "from-white/10 via-white/5 to-transparent";
  const dot = slice ? colorDotClass(slice) : "bg-foreground/50";
  const title = slice ? SLICE_LABEL[slice] : "Reveal";

  const headline =
    slice === "red"
      ? "A sentence is waiting."
      : slice === "green"
      ? "Your time together…"
      : slice === "yellow"
      ? "A letter is sealed."
      : "A photo is hidden.";

  const introCopy =
    slice === "red"
      ? "Short. Simple. Powerful. The kind you remember."
      : slice === "green"
      ? "A reminder that time is the real gift."
      : slice === "yellow"
      ? "Breathe. Read slowly. No rush."
      : "A saved moment — the classic “aww” hit.";

  const readyLine =
    slice === "red"
      ? "Ready to open the sentence?"
      : slice === "green"
      ? "Ready to see the numbers?"
      : slice === "yellow"
      ? "Ready to break the seal?"
      : "Ready to reveal the photo?";

  const letterLines = React.useMemo(
    () => gift.love_letter.split("\n").map((s) => s.trim()).filter(Boolean),
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

          <div className={`pointer-events-none absolute inset-0 bg-gradient-to-b ${theme}`} />

          <motion.div
            initial={{ y: prefersReducedMotion ? 0 : 22, scale: 0.98, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: prefersReducedMotion ? 0 : 12, scale: 0.99, opacity: 0 }}
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
                  <div className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">{headline}</div>
                  <div className="mt-2 text-sm text-muted-foreground">{SLICE_HINT[slice]}</div>
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
                  initial={prefersReducedMotion ? { opacity: 0 } : { rotateX: 10, y: 10, opacity: 0 }}
                  animate={prefersReducedMotion ? { opacity: 1 } : { rotateX: 0, y: 0, opacity: 1 }}
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
                              <div className="mt-4 text-xs text-muted-foreground">Save it. Repeat it. Make it yours.</div>
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

                              <div className="text-xs text-muted-foreground">Counting every second of this chapter.</div>
                            </div>
                          )}

                          {slice === "yellow" && (
                            <div className="space-y-3">
                              <div className="text-sm text-muted-foreground">Love letter</div>
                              <div className="space-y-2">
                                {(letterLines.length ? letterLines : [gift.love_letter]).slice(0, 18).map((line, i) => (
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

                              <div className="text-xs text-muted-foreground">Save this one for the perfect timing.</div>
                            </div>
                          )}

                          <div className="mt-6 flex items-center justify-between gap-3">
                            <div className="text-xs text-muted-foreground">Tip: after the last one, hit replay.</div>
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

/**
 * Bet is:
 * - required to spin
 * - dynamic: only remaining colors are selectable
 * - does NOT affect outcome
 * Wheel is also dynamic:
 * - removed colors disappear from the wheel after they land
 */
function Wheel({
  rotation,
  spinning,
  onSpin,
  disabled,
  spotlight,
  remaining,
  bet,
  setBet,
  lastResult,
}: {
  rotation: number;
  spinning: boolean;
  onSpin: () => void;
  disabled: boolean;
  spotlight: SliceKey | null;
  remaining: SliceKey[];
  bet: SliceKey | null;
  setBet: (k: SliceKey | null) => void;
  lastResult: { slice: SliceKey; guessedRight: boolean } | null;
}) {
  const prefersReducedMotion = useReducedMotion();

  const canBet = !spinning && !disabled && remaining.length > 0;
  const mustPick = remaining.length > 0 && !bet && !spinning && !disabled;

  const promptTitle = spinning
    ? "Spinning…"
    : disabled
    ? "All surprises opened."
    : mustPick
    ? "Before you spin: place your bet."
    : "Bet placed. Now spin.";

  const promptSub = spinning
    ? "Watch it slow down…"
    : disabled
    ? "Replay to experience it again."
    : mustPick
    ? "Pick one of the remaining colors below. It’s just a bet — the outcome stays random."
    : `You bet on ${SLICE_PUBLIC[bet!].colorName}. (Betting does not influence the result.)`;

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

  return (
    <div className="mx-auto grid place-items-center">
      <div className="relative w-full max-w-[820px]">
        <div className="mb-6">
          <div className="text-center">
            <div className="text-base font-semibold tracking-tight">{promptTitle}</div>
            <div className="mt-1 text-xs text-muted-foreground">{promptSub}</div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {remaining.map((k) => (
              <LegendCard
                key={k}
                k={k}
                selected={bet === k}
                disabled={!canBet}
                onPick={() => setBet(bet === k ? null : k)}
              />
            ))}
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground">
            <Pill dotClassName={mustPick ? "bg-rose-500/85" : "bg-foreground/50"}>
              {mustPick ? (
                <>Required: choose a remaining color to unlock the spin</>
              ) : (
                <>
                  Your bet:{" "}
                  <span className="font-medium text-foreground">
                    {bet ? SLICE_PUBLIC[bet].colorName : "—"}
                  </span>{" "}
                  <span className="text-muted-foreground">(does not affect outcome)</span>
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
                className={[
                  "mt-4 mx-auto w-fit inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/55 px-4 py-2 text-xs",
                  "shadow-[0_18px_80px_-60px_rgba(0,0,0,0.65)] backdrop-blur",
                ].join(" ")}
              >
                <span className={["h-2 w-2 rounded-full", colorDotClass(lastResult.slice)].join(" ")} />
                <span className="font-semibold">{lastResult.guessedRight ? "You guessed it." : "Not this time."}</span>
                <span className="text-muted-foreground">
                  Landed on {SLICE_PUBLIC[lastResult.slice].colorName} — {SLICE_PUBLIC[lastResult.slice].title}.
                </span>
                <span className="relative ml-1 inline-flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-foreground/20" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-foreground/30" />
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="pointer-events-none absolute left-1/2 top-[280px] h-[70%] w-[70%] -translate-x-1/2 rounded-full bg-gradient-to-r from-rose-500/16 via-pink-500/10 to-amber-500/16 blur-2xl" />

        <motion.div
          className="absolute left-1/2 top-[332px] z-30 -translate-x-1/2"
          animate={spinning && !prefersReducedMotion ? { y: [0, -2, 0] } : { y: 0 }}
          transition={{ duration: 0.25, repeat: spinning && !prefersReducedMotion ? Infinity : 0 }}
        >
          <div className="h-0 w-0 border-l-[14px] border-r-[14px] border-b-[22px] border-l-transparent border-r-transparent border-b-foreground/90 drop-shadow-sm" />
          <div className="mx-auto mt-1 h-3 w-3 rounded-full bg-foreground/75 shadow-[0_12px_34px_-20px_rgba(0,0,0,0.85)]" />
        </motion.div>

        {/* slightly smaller wheel */}
        <div className="relative mx-auto mt-6 aspect-square w-full max-w-[540px]">
          <div className="pointer-events-none absolute -inset-3 rounded-full bg-gradient-to-b from-white/12 to-transparent blur-[2px]" />
          <div className="pointer-events-none absolute -inset-2 rounded-full border border-white/10" />
          <div className={`pointer-events-none absolute -inset-8 rounded-full bg-gradient-to-b ${ringAccent} to-transparent blur-2xl`} />

          <motion.div
            className={[
              "absolute inset-0 rounded-full border border-border/60 bg-background/65 backdrop-blur",
              "shadow-[0_60px_190px_-130px_rgba(0,0,0,0.85)]",
              "transform-gpu",
            ].join(" ")}
            animate={{ rotate: rotation }}
            transition={
              prefersReducedMotion
                ? { type: "spring", stiffness: 95, damping: 22, mass: 1.05 }
                : { duration: 3.35, ease: [0.06, 0.92, 0.12, 1] }
            }
            style={{
              transformOrigin: "50% 50%",
              background: wheelBg,
            }}
            aria-label="Wheel"
          >
            {/* gloss + romantic sparkle */}
            <div className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(900px_circle_at_28%_18%,rgba(255,255,255,0.46),transparent_48%)]" />
            <div className="pointer-events-none absolute inset-0 rounded-full ring-1 ring-white/12" />
            <div className="pointer-events-none absolute inset-0 rounded-full opacity-[0.10] [background-image:radial-gradient(rgba(255,255,255,0.9)_1px,transparent_1px)] [background-size:10px_10px]" />

            {/* dynamic separators based on remaining slices */}
            <div className="pointer-events-none absolute inset-0 rounded-full">
              {remaining.length > 1 &&
                remaining.map((_, i) => {
                  const ang = i * layout.step; // boundary angle
                  return (
                    <div
                      key={`sep-${i}`}
                      className="absolute left-1/2 top-1/2 h-[52%] w-px origin-bottom -translate-x-1/2 bg-white/14"
                      style={{ transform: `rotate(${ang}deg)` }}
                    />
                  );
                })}
            </div>

            {/* removed glyphs */}
            <div className="pointer-events-none absolute inset-0">
              {SLICE_ORDER.map((k) => (
                <div key={k} className="hidden">
                  <SliceGlyph k={k} />
                </div>
              ))}
            </div>
          </motion.div>

          <div className="absolute inset-0 grid place-items-center">
            <div className="relative rounded-full border border-white/18 bg-white/10 p-2 shadow-[0_1px_0_rgba(255,255,255,0.18)_inset] backdrop-blur">
              <Button
                onClick={onSpin}
                disabled={disabled || !bet}
                className={[
                  "group relative rounded-full px-10 py-7 text-base",
                  "shadow-[0_30px_130px_-92px_rgba(0,0,0,0.95)]",
                  "bg-gradient-to-r from-rose-500 via-pink-500 to-amber-500 text-white",
                  "hover:opacity-95 active:scale-[0.99]",
                  !bet ? "opacity-60" : "opacity-100",
                ].join(" ")}
                title={!bet ? "Choose a remaining color to unlock the spin" : "Spin (random outcome)"}
              >
                <span className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(520px_circle_at_30%_25%,rgba(255,255,255,0.42),transparent_55%)] opacity-90" />
                <span className="relative inline-flex items-center gap-2">
                  <IconSparkle />
                  {spinning ? "Spinning…" : disabled ? "All revealed" : !bet ? "Choose a color" : "Spin"}
                </span>
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-4 text-center text-xs text-muted-foreground">
          Keyboard: 1/2/3/4 to bet • Space/Enter to spin • R to replay • Esc closes the modal
        </div>
      </div>
    </div>
  );
}

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

export default function GiftWheelClient({ slug }: { slug: string }) {
  const prefersReducedMotion = useReducedMotion();

  const [gift, setGift] = React.useState<Gift | null>(null);
  const [loading, setLoading] = React.useState(true);

  const [remaining, setRemaining] = React.useState<SliceKey[]>(["blue", "red", "green", "yellow"]);
  const [active, setActive] = React.useState<SliceKey | null>(null);

  const [spinning, setSpinning] = React.useState(false);
  const [rotation, setRotation] = React.useState(0);

  const [now, setNow] = React.useState(() => new Date());

  const [paymentRequired, setPaymentRequired] = React.useState(false);
  const [giftIdForPay, setGiftIdForPay] = React.useState<string | null>(null);

  const [revealOpen, setRevealOpen] = React.useState(false);
  const [spotlight, setSpotlight] = React.useState<SliceKey | null>(null);

  // bet: must choose again each round, and only among remaining
  const [bet, setBet] = React.useState<SliceKey | null>(null);

  const [lastResult, setLastResult] = React.useState<{ slice: SliceKey; guessedRight: boolean } | null>(null);

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
    setRemaining(["blue", "red", "green", "yellow"]);
    setActive(null);
    setRotation(0);
    setRevealOpen(false);
    setSpinning(false);
    setSpotlight(null);
    setBet(null);
    setLastResult(null);
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
      toast.message("Place your bet first.", { description: "Choose a remaining color — the outcome stays random." });
      return;
    }

    setSpinning(true);
    setRevealOpen(false);

    // outcome is random among remaining (not influenced by bet)
    const chosen = pickRandom(remaining);
    setSpotlight(chosen);

    // dynamic center based on remaining (because wheel removes slices)
    const { map } = buildWheelLayout(remaining);
    const center = map.get(chosen)?.center ?? 0;

    // rotate so chosen center lands under the pointer at top
    const baseTarget = mod360(360 - center);

    const jitter = prefersReducedMotion ? 0 : Math.random() * 18 - 9; // smaller jitter feels more “premium”
    const targetMod = mod360(baseTarget + jitter);

    const currentMod = mod360(rotation);
    const deltaToTarget = mod360(targetMod - currentMod);

    const extraTurns = prefersReducedMotion ? 3 : 8;
    const nextRotation = rotation + extraTurns * 360 + deltaToTarget;

    setRotation(nextRotation);

    window.setTimeout(() => {
      const guessedRight = bet === chosen;
      setLastResult({ slice: chosen, guessedRight });

      toast.message(guessedRight ? "You nailed it." : "Not this time.", {
        description: `It landed on ${SLICE_PUBLIC[chosen].colorName} — ${SLICE_PUBLIC[chosen].title}.`,
      });

      // ✅ remove the landed color from the wheel
      setRemaining((r) => r.filter((x) => x !== chosen));
      setActive(chosen);
      setRevealOpen(true);
      setSpinning(false);

      // bet resets each round
      setBet(null);
    }, prefersReducedMotion ? 900 : 3350);
  });

  // keep bet always valid
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

      if ((e.key === " " || e.key === "Enter") && !revealOpen) {
        e.preventDefault();
        if (!bet) {
          toast.message("Choose a color first.", { description: "Bet first — the outcome remains random." });
          return;
        }
        spin();
      }

      if ((e.key === "r" || e.key === "R") && !revealOpen) reset();
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
                experience
              </span>
              .
            </h1>

            <p className="mt-3 text-sm text-muted-foreground">
              Pay once to reveal the wheel and the cinematic surprises. The link stays permanent.
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
            <Pill dotClassName="bg-sky-500/85">Link Issue</Pill>
            <div className="mt-4 text-xl font-semibold tracking-tight">Link Not Found</div>
            <div className="mt-2 text-sm text-muted-foreground">This gift may have been removed, or the link is incorrect.</div>
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

      <RevealOverlay open={revealOpen} slice={active} onClose={() => setRevealOpen(false)} gift={gift} parts={parts} />

      <div className="mx-auto max-w-5xl px-5 py-10 md:py-14">
        <div className="flex flex-col items-center text-center">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Pill dotClassName={gift.status === "paid" ? "bg-rose-500/85" : "bg-sky-500/85"}>
              {gift.status === "paid" ? "A Small Surprise" : "Draft Preview"}
            </Pill>
            <Pill dotClassName="bg-emerald-500/85">
              Remaining <span className="font-medium text-foreground">{remaining.length}</span>/4
            </Pill>
          </div>

          <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl">
            Place a bet →{" "}
            <span className="bg-gradient-to-r from-rose-500 via-pink-500 to-amber-500 bg-clip-text text-transparent">
              spin
            </span>{" "}
            → reveal.
          </h1>

          <p className="mt-3 max-w-2xl text-sm text-muted-foreground md:text-base">
            Betting is required each round, but it never changes the outcome — it only makes the moment sweeter.
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

            <Button
              onClick={spin}
              className="rounded-full px-6 bg-gradient-to-r from-rose-500 via-pink-500 to-amber-500 text-white hover:opacity-95 shadow-[0_18px_80px_-55px_rgba(244,114,182,0.65)]"
              disabled={spinning || remaining.length === 0 || !bet}
              title={!bet ? "Choose a remaining color to unlock the spin" : "Spin (random outcome)"}
            >
              {spinning ? "Spinning…" : remaining.length ? (!bet ? "Choose a color" : "Spin") : "All Revealed"}
            </Button>
          </div>
        </div>

        <div className="mt-10">
          <Card className="border border-border/60 bg-background/60 shadow-[0_30px_120px_-85px_rgba(0,0,0,0.60)] backdrop-blur-xl">
            <CardContent className="p-6 md:p-10">
              <Wheel
                rotation={rotation}
                spinning={spinning}
                onSpin={spin}
                disabled={spinning || remaining.length === 0}
                spotlight={spotlight}
                remaining={remaining}
                bet={bet}
                setBet={setBet}
                lastResult={lastResult}
              />
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 text-center text-xs text-muted-foreground">
          Keyboard: 1/2/3/4 to bet • Space/Enter to spin • R to replay • Esc closes the modal • Enter reveals inside the modal
        </div>
      </div>
    </div>
  );
}

"use client";

import * as React from "react";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  useMotionValue,
  animate,
  useSpring,
  useTransform,
} from "framer-motion";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

type Gift = {
  id: string;
  slug: string;
  status: "draft" | "paid" | "disabled";
  couple_photo_url: string | null;
  love_letter: string;
  red_phrase: string;
  relationship_start_at: string;
  couple_names?: string;
  created_by_name?: string;
  paid_at?: string;
  needs_payment?: boolean;
};

type GiftLike = Partial<Gift> & Record<string, any>;

function firstNonEmptyString(...vals: any[]): string {
  for (const v of vals) {
    if (typeof v === "string" && v.trim().length > 0) return v;
  }
  return "";
}

function firstTruthy<T>(...vals: any[]): T | null {
  for (const v of vals) {
    if (v) return v as T;
  }
  return null;
}

function normalizeGift(raw: GiftLike): Gift {
  console.log("Normalizando gift:", raw);

  // If it already matches the shape, return as-is.
  if (
    raw &&
    raw.couple_photo_url !== undefined &&
    raw.love_letter !== undefined &&
    raw.red_phrase !== undefined &&
    raw.relationship_start_at !== undefined
  ) {
    return raw as Gift;
  }

  function findProp(obj: any, propNames: string[]): any {
    if (!obj || typeof obj !== "object") return null;

    for (const prop of propNames) {
      if (obj[prop] !== undefined && obj[prop] !== null) {
        return obj[prop];
      }
    }

    for (const key in obj) {
      if (typeof obj[key] === "object") {
        const found = findProp(obj[key], propNames);
        if (found !== null && found !== undefined && found !== "") return found;
      }
    }

    return null;
  }

  const id = findProp(raw, ["id", "giftId", "uid"]) || "";
  const slug = findProp(raw, ["slug", "giftSlug", "urlSlug"]) || "";
  const status = (findProp(raw, ["status", "giftStatus", "state"]) || "draft") as Gift["status"];

  const couple_photo_url =
    findProp(raw, [
      "couple_photo_url",
      "couplePhotoUrl",
      "couplePhotoURL",
      "photo_url",
      "photoUrl",
      "photoURL",
      "image_url",
      "imageUrl",
      "image",
    ]) || null;

  const love_letter =
    findProp(raw, ["love_letter", "loveLetter", "letter", "loveletter", "message", "text", "content"]) || "";

  const red_phrase = findProp(raw, ["red_phrase", "redPhrase", "phrase", "tagline", "quote"]) || "";

  const relationship_start_at =
    findProp(raw, [
      "relationship_start_at",
      "relationshipStartAt",
      "relationshipStartDate",
      "start_at",
      "startAt",
      "startDate",
      "date",
    ]) || "";

  console.log("Resultado da normalização:", {
    id,
    slug,
    status,
    couple_photo_url,
    love_letter,
    red_phrase,
    relationship_start_at,
  });

  return {
    id,
    slug,
    status,
    couple_photo_url,
    love_letter,
    red_phrase,
    relationship_start_at,
    couple_names: raw?.couple_names || raw?.coupleNames || undefined,
    created_by_name: raw?.created_by_name || raw?.createdByName || undefined,
    paid_at: raw?.paid_at || raw?.paidAt || undefined,
    needs_payment: raw?.needs_payment || raw?.needsPayment || undefined,
  };
}

interface GiftWheelClientProps {
  slug: string;
  gift: Gift | null;
  needsPayment: boolean;
}

type SliceKey = "blue" | "red" | "green" | "yellow";
const ALL_SLICES: SliceKey[] = ["blue", "red", "green", "yellow"];

const SLICE_LABEL: Record<SliceKey, string> = {
  blue: "Photo",
  red: "Your Line",
  green: "Your Time",
  yellow: "Your Letter",
};

const SLICE_HINT: Record<SliceKey, string> = {
  blue: "A memory frozen in time.",
  red: "Words that echo in the heart.",
  green: "Moments that became forever.",
  yellow: "Feelings written just for you.",
};

const SLICE_PUBLIC: Record<
  SliceKey,
  {
    colorName: string;
    title: string;
    preview: string;
    vibe: string;
    emoji: string;
    briefDesc: string;
    whatYouGet: string;
  }
> = {
  blue: {
    colorName: "Sapphire",
    title: "Our Photo",
    preview: "A captured moment that tells our story.",
    vibe: "Visual memory",
    emoji: "📸",
    briefDesc: "Cherished photo memory",
    whatYouGet: "You'll see a special photo of the couple that captures their love story in a single moment.",
  },
  red: {
    colorName: "Rose",
    title: "Your Line",
    preview: "Words that only you could say.",
    vibe: "Heartfelt whisper",
    emoji: "💖",
    briefDesc: "Special phrase for you",
    whatYouGet: "You'll discover a unique love phrase or quote that holds special meaning for this relationship.",
  },
  green: {
    colorName: "Emerald",
    title: "Our Time",
    preview: "Every second has been worth it.",
    vibe: "Growing love",
    emoji: "⏳",
    briefDesc: "Relationship timeline",
    whatYouGet: "You'll see how long this couple has been together, with a beautiful timeline breakdown of their journey.",
  },
  yellow: {
    colorName: "Gold",
    title: "Love Letter",
    preview: "A letter sealed with feeling.",
    vibe: "Deep connection",
    emoji: "💌",
    briefDesc: "Personal love letter",
    whatYouGet: "You'll read a heartfelt love letter written from the heart, expressing deep feelings and memories.",
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
  return { days, hours, mins, secs, totalSeconds: s };
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
function safeSplitLines(text: string | null | undefined) {
  if (!text) return [];
  return text
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

/* ------------------------------ Visual theme ------------------------------ */
function colorDotClass(k: SliceKey) {
  return k === "blue"
    ? "bg-sky-400/90"
    : k === "red"
    ? "bg-fuchsia-500/90"
    : k === "green"
    ? "bg-emerald-400/90"
    : "bg-amber-300/90";
}

function sliceFillRGBA(k: SliceKey) {
  if (k === "blue") return "rgba(56,189,248,.85)";
  if (k === "red") return "rgba(236,72,153,.85)";
  if (k === "green") return "rgba(52,211,153,.85)";
  return "rgba(251,191,36,.85)";
}

function buildWheelLayout(keys: SliceKey[]) {
  const safe = keys.length ? keys : (["blue"] as SliceKey[]);
  const n = safe.length;
  const step = 360 / n;

  const map = new Map<SliceKey, { start: number; end: number; center: number; index: number }>();
  safe.forEach((k, i) => {
    const start = i * step;
    const end = (i + 1) * step;
    const center = start + step / 2;
    map.set(k, { start, end, center, index: i });
  });

  return { step, map, keys: safe, count: n };
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

function angleFromTopClockwiseFromEvent(e: React.MouseEvent, el: HTMLElement): number {
  const rect = el.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;

  const x = e.clientX - cx;
  const y = e.clientY - cy;

  const rad = Math.atan2(y, x);
  let deg = (rad * 180) / Math.PI;

  deg = (90 - deg) % 360;
  if (deg < 0) deg += 360;

  return deg;
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

/* ------------------------------ Premium Icons ------------------------------ */
function IconHeart({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path
        d="M12 21s-7.2-4.35-9.6-8.55C.3 8.85 2.25 5.4 5.85 5.1c1.95-.15 3.45.9 4.2 2.1.75-1.2 2.25-2.25 4.2-2.1 3.6.3 5.55 3.75 3.45 7.35C19.2 16.65 12 21 12 21z"
        fill="currentColor"
      />
    </svg>
  );
}

function IconSpark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path
        d="M12 2l1.2 5.2L18 9l-4.8 1.8L12 16l-1.2-5.2L6 9l4.8-1.8L12 2zm7 8l.6 2.6L22 14l-2.4.9L19 18l-.6-3.1L16 14l2.4-1.4L19 10zM4 10l.6 2.6L7 14l-2.4.9L4 18l-.6-3.1L1 14l2.4-1.4L4 10z"
        fill="currentColor"
      />
    </svg>
  );
}

function IconShare({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path
        d="M18 16c-.79 0-1.5.31-2.03.81L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.53.5 1.24.81 2.03.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.51 9.31 6.8 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.8 0 1.51-.31 2.04-.81l7.05 4.11c-.05.23-.09.46-.09.7 0 1.66 1.34 3 3 3s3-1.34 3-3-1.34-3-3-3z"
        fill="currentColor"
      />
    </svg>
  );
}

function IconGift({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path
        d="M20 6h-2.18c.11-.31.18-.65.18-1a2.996 2.996 0 00-5.5-1.65l-.5.67-.5-.68C10.96 2.54 10.05 2 9 2 7.34 2 6 3.34 6 5c0 .35.07.69.18 1H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-5-2c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zM9 4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm11 15H4v-2h16v2zm0-5H4V8h5.08L7 10.83 8.62 12 11 8.76l1-1.36 1 1.36L15.38 12 17 10.83 14.92 8H20v6z"
        fill="currentColor"
      />
    </svg>
  );
}

function IconRestart({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path
        d="M17.65 6.35A7.958 7.958 0 0012 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0112 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"
        fill="currentColor"
      />
    </svg>
  );
}

function IconVolumeOn({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path
        d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"
        fill="currentColor"
      />
    </svg>
  );
}

function IconVolumeOff({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path
        d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"
        fill="currentColor"
      />
    </svg>
  );
}

/* ------------------------------ Premium Background ------------------------------ */
function GlowBg() {
  const reduce = !!useReducedMotion();

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(1400px_circle_at_15%_15%,rgba(255,255,255,0.08),transparent_50%),radial-gradient(1000px_circle_at_85%_25%,rgba(255,64,169,0.12),transparent_50%),radial-gradient(900px_circle_at_70%_85%,rgba(155,81,224,0.10),transparent_60%),linear-gradient(180deg,#050816_0%,#0a0b1a_45%,#090a15_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(1200px_circle_at_50%_45%,transparent_30%,rgba(0,0,0,0.85)_100%)]" />
      <div className="absolute inset-0 opacity-[0.12] [background-image:radial-gradient(rgba(255,255,255,0.9)_1px,transparent_1px)] [background-size:16px_16px]" />

      {!reduce && (
        <>
          <motion.div
            className="absolute -inset-14 opacity-[0.35]"
            animate={{ y: [0, -14, 0], x: [0, 8, 0] }}
            transition={{ duration: 10, ease: "easeInOut", repeat: Infinity }}
          >
            <div className="absolute left-[10%] top-[25%] h-32 w-32 rounded-full bg-fuchsia-500/15 blur-3xl" />
            <div className="absolute left-[72%] top-[18%] h-36 w-36 rounded-full bg-violet-500/18 blur-3xl" />
            <div className="absolute left-[55%] top-[72%] h-40 w-40 rounded-full bg-pink-500/15 blur-3xl" />
          </motion.div>
          <motion.div
            className="absolute inset-0"
            animate={{ rotate: 360 }}
            transition={{ duration: 120, ease: "linear", repeat: Infinity }}
          >
            <div className="absolute left-[30%] top-[10%] h-64 w-64 rounded-full bg-sky-500/05 blur-3xl" />
          </motion.div>
        </>
      )}
    </div>
  );
}

function SoftDivider({ className = "" }: { className?: string }) {
  return (
    <div
      className={[
        "my-6 h-px w-full bg-gradient-to-r from-transparent via-white/15 to-transparent",
        className,
      ].join(" ")}
    />
  );
}

function Pill({
  children,
  dotClassName = "bg-fuchsia-400",
  glow = false,
}: {
  children: React.ReactNode;
  dotClassName?: string;
  glow?: boolean;
}) {
  return (
    <span
      className={[
        "relative inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/8 px-3 py-1.5 text-[11px] sm:text-xs text-white/80 shadow-[0_1px_0_rgba(255,255,255,0.35)_inset] backdrop-blur",
        glow ? "shadow-[0_0_20px_rgba(236,72,153,0.3)]" : "",
      ].join(" ")}
    >
      <span className={["h-1.5 w-1.5 rounded-full", dotClassName].join(" ")} />
      {children}
    </span>
  );
}

/* ------------------------------ Premium Audio FX ------------------------------ */
function useTickAudio(enabled: boolean) {
  const prefersReducedMotion = useReducedMotion();
  const ctxRef = React.useRef<AudioContext | null>(null);
  const lastRef = React.useRef(0);

  const play = React.useCallback(
    (kind: "tick" | "land" | "success" | "reveal" | "spin_start" | "segment_pass") => {
      if (!enabled || prefersReducedMotion) return;

      try {
        const AudioCtx = (window.AudioContext || (window as any).webkitAudioContext) as
          | typeof AudioContext
          | undefined;
        if (!AudioCtx) return;

        if (!ctxRef.current) ctxRef.current = new AudioCtx();
        const ctx = ctxRef.current;

        if (ctx.state === "suspended") void ctx.resume();

        const now = ctx.currentTime;
        const osc1 = ctx.createOscillator();
        const osc2 =
          kind === "success" || kind === "reveal" || kind === "spin_start"
            ? ctx.createOscillator()
            : null;
        const gain = ctx.createGain();

        let freq1 = 560;
        let freq2 = 840;
        let dur = 0.02;
        let peak = 0.035;

        if (kind === "land") {
          freq1 = 360;
          freq2 = 480;
          dur = 0.12;
          peak = 0.085;
        } else if (kind === "success") {
          freq1 = 640;
          freq2 = 960;
          dur = 0.25;
          peak = 0.12;
        } else if (kind === "reveal") {
          freq1 = 420;
          freq2 = 720;
          dur = 0.18;
          peak = 0.095;
        } else if (kind === "spin_start") {
          freq1 = 680;
          freq2 = 920;
          dur = 0.15;
          peak = 0.1;
        } else if (kind === "segment_pass") {
          freq1 = 480;
          freq2 = 720;
          dur = 0.08;
          peak = 0.05;
        }

        osc1.type = "sine";
        osc1.frequency.setValueAtTime(freq1, now);
        if (osc2) {
          osc2.type = "sine";
          osc2.frequency.setValueAtTime(freq2, now);
        }

        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(peak, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

        osc1.connect(gain);
        if (osc2) osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.start(now);
        if (osc2) osc2.start(now);
        osc1.stop(now + dur + 0.02);
        if (osc2) osc2.stop(now + dur + 0.02);
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
    play("tick");
  }, [play]);

  const land = React.useCallback(() => play("land"), [play]);
  const success = React.useCallback(() => play("success"), [play]);
  const reveal = React.useCallback(() => play("reveal"), [play]);
  const spinStart = React.useCallback(() => play("spin_start"), [play]);
  const segmentPass = React.useCallback(() => play("segment_pass"), [play]);

  return { tick: tickThrottled, land, success, reveal, spinStart, segmentPass };
}

/* ------------------------------ HTML Confetti System ------------------------------ */
function ConfettiExplosion({ trigger, intensity = 1 }: { trigger: boolean; intensity?: number }) {
  const prefersReducedMotion = useReducedMotion();
  const [particles, setParticles] = React.useState<
    Array<{ id: number; x: number; y: number; color: string; shape: "heart" | "circle" | "star" | "diamond" }>
  >([]);

  React.useEffect(() => {
    if (!trigger || prefersReducedMotion) return;

    const colors = [
      "#ec4899",
      "#f472b6",
      "#db2777",
      "#f9a8d4",
      "#8b5cf6",
      "#a78bfa",
      "#7c3aed",
      "#c4b5fd",
      "#3b82f6",
      "#60a5fa",
      "#1d4ed8",
      "#93c5fd",
      "#10b981",
      "#34d399",
      "#059669",
      "#6ee7b7",
    ];

    const shapes: Array<"heart" | "circle" | "star" | "diamond"> = ["heart", "circle", "star", "diamond"];

    const isSmall = typeof window !== "undefined" ? window.matchMedia("(max-width: 640px)").matches : false;
    const baseCount = Math.floor((isSmall ? 42 : 60) * intensity);

    const newParticles = Array.from({ length: baseCount }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      color: colors[Math.floor(Math.random() * colors.length)],
      shape: shapes[Math.floor(Math.random() * shapes.length)],
    }));

    setParticles(newParticles);

    const timer = setTimeout(() => {
      setParticles([]);
    }, 3000);

    return () => clearTimeout(timer);
  }, [trigger, intensity, prefersReducedMotion]);

  if (particles.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      <AnimatePresence>
        {particles.map((particle) => (
          <motion.div
            key={particle.id}
            className="absolute"
            style={{
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              color: particle.color,
            }}
            initial={{ opacity: 0, scale: 0, rotate: 0, y: 0, x: 0 }}
            animate={{
              opacity: [0, 1, 1, 0],
              scale: [0, 1.2, 1, 0.8],
              rotate: [0, 180, 360, 540],
              y: [0, -Math.random() * 300 - 100, -Math.random() * 500 - 200, -Math.random() * 800 - 300],
              x: [0, (Math.random() - 0.5) * 200, (Math.random() - 0.5) * 400, (Math.random() - 0.5) * 600],
            }}
            transition={{ duration: 2 + Math.random() * 1, ease: "easeOut" }}
          >
            {particle.shape === "heart" && <div className="text-xl sm:text-2xl">❤️</div>}
            {particle.shape === "circle" && <div className="w-3 h-3 rounded-full bg-current" />}
            {particle.shape === "star" && <div className="text-lg sm:text-xl">⭐</div>}
            {particle.shape === "diamond" && <div className="text-lg sm:text-xl">💎</div>}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------ Storytelling Introduction ------------------------------ */
function StoryIntro({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = React.useState(0);

  const steps = [
    { emoji: "🎁", title: "A Personalized Experience", text: "This isn't just a wheel—it's a journey through your unique story." },
    { emoji: "💝", title: "Four Heartfelt Surprises", text: "Each color holds a special memory, chosen just for you." },
    { emoji: "🎯", title: "Your Choice Matters", text: "Pick what speaks to you. The outcome is random, but your choice makes it personal." },
    { emoji: "✨", title: "Ready to Begin?", text: "Let's spin the wheel of memories together." },
  ];

  React.useEffect(() => {
    if (step >= steps.length) {
      const timer = setTimeout(onComplete, 500);
      return () => clearTimeout(timer);
    }
  }, [step, steps.length, onComplete]);

  const nextStep = () => setStep((s) => s + 1);
  if (step >= steps.length) return null;

  return (
    <motion.div className="fixed inset-0 z-50 grid place-items-center px-4 sm:px-5" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div className="absolute inset-0 bg-black/80" initial={{ opacity: 0 }} animate={{ opacity: 1 }} />
      <motion.div className="relative w-full max-w-md" initial={{ y: 20, scale: 0.95 }} animate={{ y: 0, scale: 1 }} transition={{ type: "spring", damping: 20 }}>
        <div className="rounded-3xl border border-white/15 bg-gradient-to-b from-white/10 to-white/5 backdrop-blur-2xl p-6 sm:p-8 text-center">
          <motion.div key={step} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
            <div className="text-5xl">{steps[step].emoji}</div>
            <h3 className="text-xl sm:text-2xl font-semibold text-white/95">{steps[step].title}</h3>
            <p className="text-white/70 text-sm sm:text-base">{steps[step].text}</p>

            <div className="pt-4">
              <div className="flex justify-center gap-2 mb-6">
                {steps.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 rounded-full transition-all duration-300 ${i <= step ? "bg-fuchsia-500 w-6" : "bg-white/20 w-3"}`}
                  />
                ))}
              </div>

              <Button
                onClick={nextStep}
                className="rounded-full px-8 bg-gradient-to-r from-fuchsia-500 via-pink-500 to-violet-500 text-white hover:opacity-95 shadow-[0_18px_80px_-55px_rgba(244,114,182,0.55)]"
              >
                {step === steps.length - 1 ? "Begin Experience" : "Continue"}
              </Button>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ------------------------------ Live Time Counter ------------------------------ */
function useLiveTimeCounter(startDate: Date | null) {
  const [currentTime, setCurrentTime] = React.useState(() => new Date());

  React.useEffect(() => {
    if (!startDate) return;
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, [startDate]);

  if (!startDate) return null;

  const elapsed = Math.max(0, currentTime.getTime() - startDate.getTime());
  return msToParts(elapsed);
}

/* ------------------------------ Enhanced Reveal Modal ------------------------------ */
function RevealOverlay({
  open,
  slice,
  onClose,
  gift,
}: {
  open: boolean;
  slice: SliceKey | null;
  onClose: () => void;
  gift: Gift;
}) {
  const [stage, setStage] = React.useState<"intro" | "reveal">("intro");
  const [glow, setGlow] = React.useState(false);
  const dialogRef = React.useRef<HTMLDivElement | null>(null);
  const closeBtnRef = React.useRef<HTMLButtonElement | null>(null);
  const startDate = gift ? new Date(gift.relationship_start_at) : null;
  const liveParts = useLiveTimeCounter(startDate);

  React.useEffect(() => {
    if (!open) return;
    setStage("intro");
    setGlow(true);
    const timer = setTimeout(() => setGlow(false), 1200);
    return () => clearTimeout(timer);
  }, [open, slice]);

  const getSliceColor = (sliceKey: SliceKey | null) => {
    if (!sliceKey) return "from-fuchsia-500/22 via-pink-500/10 to-violet-500/10";
    switch (sliceKey) {
      case "blue":
        return "from-sky-400/22 via-blue-500/10 to-violet-500/10";
      case "red":
        return "from-fuchsia-500/22 via-pink-500/10 to-violet-500/10";
      case "green":
        return "from-emerald-400/22 via-green-500/10 to-teal-500/10";
      case "yellow":
        return "from-amber-300/22 via-yellow-500/10 to-orange-500/10";
      default:
        return "from-fuchsia-500/22 via-pink-500/10 to-violet-500/10";
    }
  };

  const getButtonGradient = (sliceKey: SliceKey | null) => {
    if (!sliceKey) return "from-fuchsia-500 via-pink-500 to-violet-500";
    switch (sliceKey) {
      case "blue":
        return "from-sky-500 via-blue-500 to-violet-500";
      case "red":
        return "from-fuchsia-500 via-pink-500 to-violet-500";
      case "green":
        return "from-emerald-500 via-green-500 to-teal-500";
      case "yellow":
        return "from-amber-500 via-yellow-500 to-orange-500";
      default:
        return "from-fuchsia-500 via-pink-500 to-violet-500";
    }
  };

  const getShadowColor = (sliceKey: SliceKey | null) => {
    if (!sliceKey) return "shadow-fuchsia-500/30";
    switch (sliceKey) {
      case "blue":
        return "shadow-sky-500/30";
      case "red":
        return "shadow-fuchsia-500/30";
      case "green":
        return "shadow-emerald-500/30";
      case "yellow":
        return "shadow-amber-500/30";
      default:
        return "shadow-fuchsia-500/30";
    }
  };

  const sliceTheme = getSliceColor(slice);
  const buttonGradient = getButtonGradient(slice);
  const shadowColor = getShadowColor(slice);
  const dot = slice ? colorDotClass(slice) : "bg-white/50";
  const publicInfo = slice ? SLICE_PUBLIC[slice] : null;

  return (
    <AnimatePresence>
      {open && slice && (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-center px-4 sm:px-5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          aria-modal="true"
          role="dialog"
        >
          <motion.button
            type="button"
            className="absolute inset-0 bg-black/75 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          <div className={`pointer-events-none absolute inset-0 bg-gradient-to-b ${sliceTheme} opacity-30`} />

          <motion.div
            ref={dialogRef}
            initial={{ y: 20, scale: 0.98 }}
            animate={{ y: 0, scale: 1 }}
            exit={{ y: 10, scale: 0.99 }}
            transition={{ type: "spring", damping: 20 }}
            className="relative w-full max-w-3xl"
          >
            <div
              className={`rounded-3xl border border-white/15 bg-gradient-to-b ${sliceTheme
                .replace("/22", "/15")
                .replace("/10", "/5")} backdrop-blur-2xl shadow-2xl ${glow ? shadowColor : "shadow-black/50"}`}
            >
              <div className="p-5 sm:p-8">
                <div className="flex items-start justify-between gap-4 sm:gap-6 mb-5 sm:mb-6">
                  <div>
                    <div className="flex items-center gap-3 mb-3 sm:mb-4">
                      <span className={`h-3 w-3 rounded-full ${dot}`} />
                      <span className="text-xs sm:text-sm font-medium text-white/70">
                        {publicInfo?.emoji} {SLICE_LABEL[slice]}
                      </span>
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-bold text-white/95">{publicInfo?.title}</h2>
                    <p className="mt-2 text-white/60 text-sm sm:text-base">{SLICE_HINT[slice]}</p>
                  </div>

                  <Button
                    ref={closeBtnRef as any}
                    variant="ghost"
                    size="icon"
                    className="rounded-full border border-white/15 bg-white/5 hover:bg-white/10 h-10 w-10"
                    onClick={onClose}
                  >
                    <span className="sr-only">Close</span>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </Button>
                </div>

                <AnimatePresence mode="wait">
                  {stage === "intro" ? (
                    <motion.div
                      key="intro"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="space-y-5 sm:space-y-6"
                    >
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-6">
                        <div className="text-[11px] sm:text-sm text-white/60 mb-2">WHAT YOU'LL DISCOVER</div>
                        <div className="text-lg sm:text-xl font-semibold text-white/90 mb-2">{publicInfo?.whatYouGet}</div>

                        <div className="mt-4 grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <div className="text-[10px] sm:text-xs text-white/60">THEME COLOR</div>
                            <div className="text-white/90 flex items-center gap-2 text-sm sm:text-base">
                              <span className={`h-2 w-2 rounded-full ${dot}`} />
                              {publicInfo?.colorName}
                            </div>
                          </div>
                          <div className="space-y-1">
                            <div className="text-[10px] sm:text-xs text-white/60">VIBE</div>
                            <div className="text-white/90 text-sm sm:text-base">{publicInfo?.vibe}</div>
                          </div>
                        </div>

                        <div className="mt-4 p-3 bg-white/5 rounded-xl border border-white/10">
                          <div className="text-[10px] sm:text-xs text-white/60 mb-1">PREVIEW</div>
                          <div className="text-white/80 text-sm sm:text-base">{publicInfo?.preview}</div>
                        </div>
                      </div>

                      <div className="text-center py-2 sm:py-4">
                        <Button
                          onClick={() => setStage("reveal")}
                          size="lg"
                          className={`rounded-full px-7 sm:px-8 text-base sm:text-lg bg-gradient-to-r ${buttonGradient} hover:shadow-[0_0_40px_rgba(236,72,153,0.4)] transition-all duration-300`}
                        >
                          <IconSpark className="w-5 h-5 mr-2" />
                          Reveal Now
                        </Button>
                        <p className="mt-3 text-xs sm:text-sm text-white/60">Press Enter or tap to unveil the surprise</p>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="reveal"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      className="space-y-6 sm:space-y-8"
                    >
                      {slice === "red" && (
                        <div className="text-center py-4 sm:py-8">
                          <div className="text-[11px] sm:text-sm text-white/60 mb-4">A SPECIAL LINE FOR YOU</div>
                          <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="text-3xl sm:text-5xl font-bold bg-gradient-to-r from-fuchsia-400 to-pink-400 bg-clip-text text-transparent"
                          >
                            "{gift.red_phrase || "A special phrase just for you"}"
                          </motion.div>
                          <p className="mt-4 sm:mt-6 text-white/70 text-sm sm:text-base">Words meant only for your heart</p>
                        </div>
                      )}

                      {slice === "green" && liveParts && (
                        <div className="space-y-5 sm:space-y-6">
                          <div className="text-center">
                            <div className="text-[11px] sm:text-sm text-white/60">LOVE TIMELINE</div>
                            <div className="text-xl sm:text-2xl font-semibold text-white/90 mt-2">
                              Since {formatDate(new Date(gift.relationship_start_at))}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                            {[
                              { value: liveParts.days, label: "Days", color: "from-emerald-400 to-sky-400", description: "Days of love" },
                              { value: liveParts.hours, label: "Hours", color: "from-sky-400 to-violet-400", description: "Hours shared" },
                              { value: liveParts.mins, label: "Minutes", color: "from-violet-400 to-fuchsia-400", description: "Minutes together" },
                              { value: liveParts.secs, label: "Seconds", color: "from-fuchsia-400 to-pink-400", description: "Seconds counting..." },
                            ].map((item, i) => (
                              <motion.div
                                key={item.label}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: i * 0.1 }}
                                className={`rounded-2xl bg-gradient-to-br ${item.color} p-3 sm:p-4 text-center`}
                              >
                                <div className="text-2xl sm:text-3xl font-bold text-white">
                                  {item.value}
                                  {item.label === "Seconds" && <span className="text-xs sm:text-sm ml-1 opacity-80">↻</span>}
                                </div>
                                <div className="text-xs sm:text-sm text-white/90 mt-1">{item.label}</div>
                                {item.description && <div className="text-[10px] sm:text-xs text-white/80 mt-2">{item.description}</div>}
                              </motion.div>
                            ))}
                          </div>

                          <div className="text-center mt-2 sm:mt-4">
                            <div className="inline-block px-4 py-2 bg-white/5 rounded-full">
                              <div className="text-xs sm:text-sm text-white/70">
                                Total: {liveParts.totalSeconds.toLocaleString()} seconds of love
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {slice === "yellow" && (
                        <div className="space-y-5 sm:space-y-6">
                          <div className="text-center">
                            <div className="text-[11px] sm:text-sm text-white/60">LOVE LETTER</div>
                            <h3 className="text-xl sm:text-2xl font-semibold text-white/90 mt-2">Words From The Heart</h3>
                          </div>

                          <div className="max-h-[52vh] sm:max-h-[400px] overflow-y-auto rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-6">
                            {gift.love_letter ? (
                              <div className="space-y-4">
                                {safeSplitLines(gift.love_letter).map((line, i) => (
                                  <motion.p
                                    key={i}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                    className="text-white/90 leading-relaxed text-sm sm:text-base"
                                  >
                                    {line}
                                  </motion.p>
                                ))}
                              </div>
                            ) : (
                              <div className="text-center py-10 sm:py-12">
                                <div className="text-5xl mb-4">💌</div>
                                <p className="text-white/70 text-sm sm:text-base">A heartfelt letter will appear here</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {slice === "blue" && (
                        <div className="space-y-5 sm:space-y-6">
                          <div className="text-center">
                            <div className="text-[11px] sm:text-sm text-white/60">CAPTURED MOMENT</div>
                            <h3 className="text-xl sm:text-2xl font-semibold text-white/90 mt-2">A Memory In Time</h3>
                          </div>

                          {gift.couple_photo_url ? (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="relative overflow-hidden rounded-3xl border border-white/10"
                            >
                              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                              <img
                                src={gift.couple_photo_url}
                                alt="Cherished memory"
                                className="w-full h-[280px] sm:h-[400px] object-cover"
                                onError={(e) => {
                                  const target = e.currentTarget;
                                  target.style.display = "none";
                                  const parent = target.parentElement;
                                  if (parent) {
                                    const fallback = document.createElement("div");
                                    fallback.className =
                                      "w-full h-[280px] sm:h-[400px] flex flex-col items-center justify-center bg-gradient-to-br from-sky-500/20 to-violet-500/20 rounded-3xl";
                                    fallback.innerHTML = `
                                      <div class="text-5xl mb-4">📸</div>
                                      <div class="text-white/90 text-lg">A Beautiful Memory</div>
                                      <div class="text-white/70 mt-2">This moment lives in your heart</div>
                                    `;
                                    parent.appendChild(fallback);
                                  }
                                }}
                              />
                              <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 text-white">
                                <div className="text-xs sm:text-sm opacity-90">A moment to remember forever</div>
                              </div>
                            </motion.div>
                          ) : (
                            <div className="rounded-3xl border border-white/10 bg-white/5 p-10 sm:p-12 text-center">
                              <div className="text-5xl mb-4">📸</div>
                              <div className="text-white/70 text-sm sm:text-base">A beautiful memory awaits here</div>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="pt-4 sm:pt-6 border-t border-white/10">
                        <Button
                          onClick={onClose}
                          size="lg"
                          className={`w-full rounded-full bg-gradient-to-r ${buttonGradient} hover:opacity-90`}
                        >
                          Continue Journey
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ------------------------------ Final Celebration ------------------------------ */
function FinalCelebration({
  open,
  onClose,
  onShare,
  gift,
}: {
  open: boolean;
  onClose: () => void;
  onShare: () => void;
  gift: Gift;
}) {
  const prefersReducedMotion = useReducedMotion();
  const [confettiTrigger, setConfettiTrigger] = React.useState(false);

  React.useEffect(() => {
    if (open && !prefersReducedMotion) {
      setConfettiTrigger(true);
      const timer = setTimeout(() => setConfettiTrigger(false), 100);
      return () => clearTimeout(timer);
    }
  }, [open, prefersReducedMotion]);

  return (
    <>
      <ConfettiExplosion trigger={confettiTrigger} intensity={2} />

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-50 grid place-items-center px-4 sm:px-5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="absolute inset-0 bg-gradient-to-b from-purple-900/30 via-black/70 to-black"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            />

            <motion.div
              className="relative w-full max-w-2xl"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: "spring", damping: 20 }}
            >
              <div className="rounded-3xl border border-white/20 bg-gradient-to-b from-white/15 to-white/5 backdrop-blur-2xl p-7 sm:p-10 text-center shadow-2xl">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", delay: 0.2 }}
                  className="inline-block p-4 rounded-full bg-gradient-to-r from-fuchsia-500 to-pink-500 mb-6"
                >
                  <IconGift className="w-12 h-12 text-white" />
                </motion.div>

                <h2 className="text-3xl sm:text-4xl font-bold text-white/95 mb-4">Experience Complete! ✨</h2>

                <p className="text-base sm:text-xl text-white/80 mb-2">You've uncovered all the beautiful memories</p>

                {gift.couple_names && (
                  <p className="text-white/70 mb-8 text-sm sm:text-base">For {gift.couple_names} • Created with love</p>
                )}

                <div className="space-y-6 mb-8">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-2xl bg-white/5 p-4">
                      <div className="text-2xl font-bold text-white/95">4</div>
                      <div className="text-sm text-white/70">Surprises Revealed</div>
                    </div>
                    <div className="rounded-2xl bg-white/5 p-4">
                      <div className="text-2xl font-bold text-white/95">100%</div>
                      <div className="text-sm text-white/70">Emotional Journey</div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
                  <Button onClick={onShare} size="lg" className="rounded-full bg-gradient-to-r from-sky-500 to-violet-500 hover:opacity-90">
                    <IconShare className="w-5 h-5 mr-2" />
                    Share This Experience
                  </Button>

                  <Button
                    onClick={() => (window.location.href = "/create")}
                    size="lg"
                    variant="outline"
                    className="rounded-full border-white/20 bg-white/5 hover:bg-white/10"
                  >
                    Create Your Own
                  </Button>

                  <Button onClick={onClose} size="lg" variant="ghost" className="rounded-full border-white/20">
                    Close
                  </Button>
                </div>

                <p className="mt-8 text-xs sm:text-sm text-white/60">This moment was created with LoveWheel • Share the love 💝</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/* ------------------------------ Enhanced Wheel Component ------------------------------ */
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
  onShare,
  spinCount,
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
  onShare: () => void;
  spinCount: number;
}) {
  const prefersReducedMotion = useReducedMotion();
  const [showLabels, setShowLabels] = React.useState(true);
  const wheelRef = React.useRef<HTMLDivElement>(null);

  const layout = React.useMemo(() => buildWheelLayout(remaining), [remaining]);
  const wheelBg = React.useMemo(() => buildConicGradient(remaining), [remaining]);

  const spinScale = useSpring(spinning && !prefersReducedMotion ? 1.02 : 1, {
    stiffness: 200,
    damping: 15,
  });

  const glowIntensity = useSpring(spotlight ? 1 : 0, {
    stiffness: 100,
    damping: 10,
  });

  const pointerScale = useSpring(1, { stiffness: 700, damping: 18 });

  // ✅ IMPORTANT: counter-rotate labels using motion value (no stale rotationMV.get() in render)
  const counterRotate = useTransform(rotationMV, (v) => -v);

  React.useEffect(() => {
    if (!pointerPulse) return;
    pointerScale.set(1.14);
    const c = animate(pointerScale, 1, { duration: 0.18, ease: "easeOut" });
    return () => c.stop();
  }, [pointerPulse, pointerScale]);

  const onWheelClick = React.useCallback(
    (e: React.MouseEvent) => {
      if (!remaining.length || spinning || disabled) return;

      const el = wheelRef.current;
      if (!el) return;

      const deg = angleFromTopClockwiseFromEvent(e, el);
      const wheelDeg = mod360(deg - rotationMV.get());

      const idx = Math.floor(wheelDeg / layout.step) % remaining.length;
      const key = remaining[idx];

      if (key && key !== bet) {
        setBet(key);
        toast.success(`Chose ${SLICE_PUBLIC[key].colorName}`, { description: "Your heart's pick is set" });
      }
    },
    [remaining, spinning, disabled, rotationMV, layout.step, bet, setBet]
  );

  const wheelMax = "max-w-[420px] sm:max-w-[520px] lg:max-w-[600px]";
  const topPillsOffset = "-top-16 sm:-top-20";

  return (
    <div className="relative">
      <div className={`absolute ${topPillsOffset} left-0 right-0 flex flex-wrap justify-center gap-2 sm:gap-4 px-2`}>
        <Pill dotClassName="bg-fuchsia-400" glow={remaining.length === 1}>
          {remaining.length} {remaining.length === 1 ? "Surprise Left" : "Surprises Left"}
        </Pill>
        <Pill dotClassName="bg-sky-400">
          {bet ? `${SLICE_PUBLIC[bet].emoji} ${SLICE_PUBLIC[bet].colorName}` : "No Choice Yet"}
        </Pill>
        <Pill dotClassName="bg-amber-400">Spin #{spinCount + 1}</Pill>
      </div>

      <div className={`relative mx-auto aspect-square w-full ${wheelMax}`}>
        <motion.div
          className="absolute -inset-10 sm:-inset-12 rounded-full blur-3xl"
          style={{
            background: `radial-gradient(circle at center, ${
              spotlight ? sliceFillRGBA(spotlight) : "rgba(255,255,255,0.1)"
            } 0%, transparent 70%)`,
            opacity: glowIntensity,
          }}
        />

        <div className="absolute inset-0 rounded-full border border-white/5" />
        <div className="absolute inset-2 rounded-full border border-white/2" />

        {!prefersReducedMotion && (
          <div className="absolute inset-0 overflow-hidden rounded-full">
            {Array.from({ length: 8 + spinCount * 2 }).map((_, i) => (
              <motion.div
                key={i}
                className="absolute h-1 w-1 bg-white/40 rounded-full"
                style={{
                  left: `${50 + (46 + spinCount * 2) * Math.cos((i * Math.PI) / 4)}%`,
                  top: `${50 + (46 + spinCount * 2) * Math.sin((i * Math.PI) / 4)}%`,
                }}
                animate={{
                  scale: [1, 1.5 + spinCount * 0.1, 1],
                  opacity: [0.3, 0.8 + spinCount * 0.05, 0.3],
                }}
                transition={{
                  duration: Math.max(1.2, 2 - spinCount * 0.1),
                  repeat: Infinity,
                  delay: i * 0.2,
                }}
              />
            ))}
          </div>
        )}

        <motion.div
          ref={wheelRef}
          onClick={onWheelClick}
          className="absolute inset-0 rounded-full cursor-pointer touch-pan-y select-none"
          style={{
            rotate: rotationMV,
            scale: spinScale,
            background: wheelBg,
            transformStyle: "preserve-3d",
            boxShadow: spinning ? "0 0 60px rgba(255,255,255,0.3)" : "none",
          }}
          whileHover={!spinning && !disabled && remaining.length > 0 ? { scale: 1.02 } : {}}
        >
          <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.15)_0%,transparent_70%)]" />

          {remaining.length > 1 &&
            remaining.map((_, i) => {
              const angle = i * layout.step;
              return (
                <div
                  key={i}
                  className="absolute left-1/2 top-1/2 h-[2%] w-px origin-bottom -translate-x-1/2 bg-gradient-to-b from-white/80 via-white/60 to-transparent"
                  style={{ transform: `rotate(${angle}deg)`, top: "2%" }}
                />
              );
            })}

          {showLabels &&
            remaining.map((key, i) => {
              const POINTER_OFFSET = -90;
              const centerAngle = (i + 0.5) * layout.step;
              const visualAngle = centerAngle + POINTER_OFFSET;
              const rad = (visualAngle * Math.PI) / 180;

              const radius = 33;
              const x = 50 + radius * Math.cos(rad);
              const y = 50 + radius * Math.sin(rad);

              return (
                <motion.div
                  key={key}
                  className="absolute pointer-events-none"
                  style={{
                    left: `${x}%`,
                    top: `${y}%`,
                    transform: "translate(-50%, -50%)",
                  }}
                  animate={
                    spinning
                      ? {
                          scale: [1, 1.08, 1],
                        }
                      : {}
                  }
                  transition={
                    spinning
                      ? {
                          duration: 0.8,
                          repeat: Infinity,
                          delay: i * 0.1,
                        }
                      : {}
                  }
                >
                  {/* ✅ Counter-rotate content smoothly using MotionValue */}
                  <motion.div style={{ rotate: counterRotate }}>
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-xl sm:text-2xl drop-shadow-lg">{SLICE_PUBLIC[key].emoji}</span>
                      <span className="text-[11px] sm:text-xs font-semibold text-white/90 bg-black/40 px-2 py-1 rounded-full backdrop-blur-sm">
                        {SLICE_PUBLIC[key].colorName}
                      </span>
                      <span className="hidden sm:block text-[10px] text-white/70 mt-1 max-w-[90px] text-center bg-black/20 px-1 py-0.5 rounded">
                        {SLICE_PUBLIC[key].briefDesc}
                      </span>
                    </div>
                  </motion.div>
                </motion.div>
              );
            })}
        </motion.div>

        {/* Pointer */}
        <motion.div
          className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10"
          style={{ scale: pointerScale }}
        >
          <div className="relative">
            <div className="h-7 sm:h-8 w-14 sm:w-16 bg-gradient-to-b from-white/30 to-transparent rounded-t-full" />
            <div className="h-0 w-0 border-l-[18px] sm:border-l-[20px] border-r-[18px] sm:border-r-[20px] border-t-[26px] sm:border-t-[30px] border-l-transparent border-r-transparent border-t-white/95 mx-auto" />
            <motion.div
              className="absolute -top-3 left-1/2 -translate-x-1/2 h-5 w-5 sm:h-6 sm:w-6 rounded-full bg-gradient-to-br from-white to-amber-200 shadow-[0_0_30px_rgba(255,255,255,0.9)]"
              animate={
                spinning
                  ? {
                      scale: [1, 1.3, 1],
                      boxShadow: [
                        "0 0 20px rgba(255,255,255,0.9)",
                        "0 0 40px rgba(255,255,255,1)",
                        "0 0 20px rgba(255,255,255,0.9)",
                      ],
                    }
                  : {}
              }
              transition={
                spinning
                  ? {
                      duration: 0.5,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }
                  : {}
              }
            />
          </div>
        </motion.div>

        {/* Center Spin Button */}
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            className="relative"
            whileHover={!spinning && !disabled && remaining.length > 0 && bet ? { scale: 1.05 } : {}}
            whileTap={!spinning && !disabled && remaining.length > 0 && bet ? { scale: 0.95 } : {}}
          >
            <button
              onClick={onSpin}
              disabled={spinning || disabled || remaining.length === 0 || !bet}
              className={`
                relative h-24 w-24 sm:h-28 sm:w-28 rounded-full border-2 border-white/20
                bg-gradient-to-br from-white/15 to-white/8 backdrop-blur-xl
                flex flex-col items-center justify-center gap-2
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-all duration-300
                ${spinning ? "animate-pulse" : ""}
              `}
            >
              <div className="text-3xl sm:text-4xl">{spinning ? "🌀" : remaining.length === 0 ? "🎉" : "✨"}</div>
              <div className="text-[10px] sm:text-xs font-semibold tracking-wider">
                {spinning ? "SPINNING..." : remaining.length === 0 ? "COMPLETE!" : "SPIN NOW!"}
              </div>

              {!spinning && !disabled && remaining.length > 0 && bet && (
                <motion.div
                  className="absolute inset-0 rounded-full border-2 border-fuchsia-500/60"
                  animate={{
                    scale: [1, 1.15, 1],
                    borderColor: ["rgba(236,72,153,0.6)", "rgba(236,72,153,0.9)", "rgba(236,72,153,0.6)"],
                  }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                />
              )}

              {spinning && (
                <motion.div
                  className="absolute inset-4 rounded-full border border-white/30"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                />
              )}
            </button>
          </motion.div>
        </div>
      </div>

      {/* Controls under wheel */}
      <div className="mt-8 sm:mt-12 space-y-5 sm:space-y-6">
        <div className="max-w-md mx-auto">
          <div className="flex justify-between text-xs sm:text-sm text-white/70 mb-2 px-1">
            <span>Your Journey</span>
            <span>{4 - remaining.length} of 4</span>
          </div>
          <div className="relative">
            <Progress value={((4 - remaining.length) / 4) * 100} className="h-2" />
            <motion.div
              className="absolute top-0 left-0 h-2 w-1 bg-white/80 rounded-full"
              animate={{ x: ["0%", "100%"] }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            />
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-2 sm:gap-3 px-1">
          {remaining.map((key) => (
            <motion.button
              key={key}
              onClick={() => setBet(key === bet ? null : key)}
              className={`
                relative px-3 sm:px-4 py-2 rounded-full border backdrop-blur-sm
                flex items-center gap-2 transition-all duration-300
                ${bet === key ? "border-fuchsia-500/50 bg-fuchsia-500/25 shadow-[0_0_40px_rgba(236,72,153,0.4)]" : "border-white/20 bg-white/5 hover:bg-white/10"}
              `}
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              animate={
                bet === key
                  ? {
                      boxShadow: [
                        "0 0 20px rgba(236,72,153,0.3)",
                        "0 0 40px rgba(236,72,153,0.6)",
                        "0 0 20px rgba(236,72,153,0.3)",
                      ],
                    }
                  : {}
              }
              transition={bet === key ? { duration: 1.5, repeat: Infinity } : {}}
            >
              <motion.span
                className={`h-2 w-2 rounded-full ${colorDotClass(key)}`}
                animate={bet === key ? { scale: [1, 1.2, 1] } : {}}
                transition={bet === key ? { duration: 1, repeat: Infinity } : {}}
              />
              <span className="font-semibold text-sm">{SLICE_PUBLIC[key].colorName}</span>
              <span className="opacity-70">{SLICE_PUBLIC[key].emoji}</span>
              {bet === key && <motion.div className="absolute inset-0 rounded-full bg-gradient-to-r from-fuchsia-500/20 to-pink-500/20" layoutId="activeChoice" />}
            </motion.button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:flex sm:flex-wrap justify-center gap-3 sm:gap-4 px-1">
          <Button
            onClick={() => setBet(null)}
            variant="outline"
            size="sm"
            className="rounded-full border-white/20 bg-white/5 hover:bg-white/10 w-full sm:w-auto"
            disabled={!bet}
          >
            Clear Choice
          </Button>

          <Button
            onClick={onShare}
            variant="outline"
            size="sm"
            className="rounded-full border-white/20 bg-white/5 hover:bg-white/10 w-full sm:w-auto"
          >
            <IconShare className="w-4 h-4 mr-2" />
            Share
          </Button>

          <Button
            onClick={() => (window.location.href = "/create")}
            size="sm"
            className="rounded-full bg-gradient-to-r from-sky-500 to-violet-500 hover:opacity-90 w-full sm:w-auto"
          >
            Create Yours
          </Button>
        </div>

        {lastResult && !spinning && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 200 }}
            className="text-center px-2"
          >
            <div
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-sm ${
                lastResult.guessedRight
                  ? "bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 shadow-[0_0_30px_rgba(16,185,129,0.3)]"
                  : "bg-white/10 text-white/80 border border-white/20"
              }`}
            >
              <motion.span
                className={colorDotClass(lastResult.slice)}
                animate={lastResult.guessedRight ? { scale: [1, 1.3, 1] } : {}}
                transition={lastResult.guessedRight ? { duration: 0.5, repeat: 3 } : {}}
              />
              {lastResult.guessedRight ? (
                <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2 }}>
                  🎯 Perfect match! You chose right! 🎯
                </motion.span>
              ) : (
                <>Landed on {SLICE_PUBLIC[lastResult.slice].colorName}. Next time! 💫</>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------ Main Component ------------------------------ */
export default function GiftWheelClient({ slug, gift, needsPayment }: GiftWheelClientProps) {
  const prefersReducedMotion = useReducedMotion();

  const normalizedGift = React.useMemo(() => {
    return gift ? normalizeGift(gift as any) : null;
  }, [gift]);

  React.useEffect(() => {
    console.log("RAW gift prop:", gift);
    console.log("NORMALIZED gift:", normalizedGift);
  }, [gift, normalizedGift]);

  const [showStory, setShowStory] = React.useState(true);
  const [loading, setLoading] = React.useState(false);
  const [remaining, setRemaining] = React.useState<SliceKey[]>(ALL_SLICES);
  const [active, setActive] = React.useState<SliceKey | null>(null);
  const [spinning, setSpinning] = React.useState(false);
  const rotationMV = useMotionValue(0);
  const [now] = React.useState(() => new Date());
  const [revealOpen, setRevealOpen] = React.useState(false);
  const [spotlight, setSpotlight] = React.useState<SliceKey | null>(null);
  const [bet, setBet] = React.useState<SliceKey | null>(null);
  const [lastResult, setLastResult] = React.useState<{ slice: SliceKey; guessedRight: boolean } | null>(null);
  const [pointerPulse, setPointerPulse] = React.useState(0);
  const [audioOn, setAudioOn] = useLocalStorageBoolean("lw_audio_on", true);
  const audio = useTickAudio(audioOn);
  const [burst, setBurst] = React.useState(false);
  const [finalOpen, setFinalOpen] = React.useState(false);
  const [confettiTrigger, setConfettiTrigger] = React.useState(false);
  const hasShownFinal = React.useRef(false);
  const spinAnimationRef = React.useRef<any>(null);
  const [spinCount, setSpinCount] = React.useState(0);
  const lastSegmentIndex = React.useRef(-1);

  React.useEffect(() => {
    return () => {
      // cleanup any running animation when unmounting
      if (spinAnimationRef.current) {
        try {
          spinAnimationRef.current.stop();
        } catch {}
      }
    };
  }, []);

  const resetRotation = useEvent(() => {
    animate(rotationMV, 0, {
      duration: 0.5,
      ease: "easeInOut",
    });
  });

  // Se precisa de pagamento
  if (needsPayment && normalizedGift) {
    const gift = normalizedGift;
    return (
      <div className="min-h-screen flex items-center justify-center px-4 sm:px-6 py-8">
        <GlowBg />
        <div className="relative w-full max-w-md">
          <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-500/10 via-pink-500/10 to-purple-500/10 rounded-3xl blur-xl" />

          <Card className="relative border-white/20 bg-gradient-to-b from-white/15 to-white/5 backdrop-blur-xl shadow-2xl overflow-hidden">
            <CardContent className="p-6 sm:p-8">
              <div className="text-center mb-8">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", delay: 0.1 }}
                  className="inline-block p-4 rounded-full bg-gradient-to-r from-fuchsia-500 to-pink-500 mb-4"
                >
                  <IconHeart className="w-12 h-12 text-white" />
                </motion.div>
                <h1 className="text-3xl font-bold text-white/95 mb-2">Special Gift</h1>
                <p className="text-white/70">"I'd choose you again. Every time."</p>
              </div>

              <div className="space-y-6 mb-8">
                {gift.red_phrase && (
                  <div className="rounded-2xl border border-white/15 bg-white/5 p-6 text-center">
                    <div className="text-sm text-white/60 mb-2">PREVIEW</div>
                    <p className="text-xl text-white/90 italic">"{gift.red_phrase}"</p>
                  </div>
                )}

                {gift.relationship_start_at && (
                  <div className="flex items-center justify-center gap-2 text-white/80">
                    <span className="text-sm">Together since:</span>
                    <span className="font-semibold">
                      {new Date(gift.relationship_start_at).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "2-digit",
                      })}
                    </span>
                  </div>
                )}
              </div>

              <SoftDivider />

              <div className="text-center space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-white/95 mb-2">Unlock the Full Experience</h2>
                  <p className="text-white/70 mb-4">
                    Pay only <strong className="text-2xl text-fuchsia-400">$4.99</strong> to reveal all the special
                    content prepared with care
                  </p>
                </div>

                <Button
                  onClick={async () => {
                    try {
                      setLoading(true);
                      const response = await fetch("/api/checkout", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ giftId: gift.id }),
                      });

                      const data = await response.json();

                      if (data.url) {
                        window.location.href = data.url;
                      } else {
                        toast.error("Error creating checkout");
                      }
                    } catch (error) {
                      toast.error("Payment processing error");
                    } finally {
                      setLoading(false);
                    }
                  }}
                  disabled={loading}
                  className="w-full py-6 rounded-xl bg-gradient-to-r from-fuchsia-600 via-pink-600 to-purple-600 hover:from-fuchsia-700 hover:via-pink-700 hover:to-purple-700 text-white font-bold text-lg shadow-[0_20px_60px_-15px_rgba(236,72,153,0.5)] transition-all duration-300"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Processing...
                    </div>
                  ) : (
                    <>
                      <IconGift className="w-5 h-5 mr-2" />
                      Pay & Unlock Full Experience ($4.99)
                    </>
                  )}
                </Button>

                <div className="flex items-center justify-center gap-2 text-xs sm:text-sm text-white/60">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                  <span>Secure payment via Stripe • Lifetime access to content</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Se não tem gift
  if (!normalizedGift) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <GlowBg />
        <div className="text-center space-y-6">
          <div className="text-6xl">😔</div>
          <h1 className="text-3xl font-bold text-white/95">Gift Not Found</h1>
          <p className="text-white/70">This Love Wheel may have been removed or the link is incorrect</p>
          <Button
            onClick={() => (window.location.href = "/create")}
            size="lg"
            className="rounded-full bg-gradient-to-r from-fuchsia-500 to-pink-500"
          >
            Create Your Love Wheel
          </Button>
        </div>
      </div>
    );
  }

  // Função spin
  const spin = useEvent(async () => {
    if (spinning || !bet || remaining.length === 0) return;

    const remainingBefore = remaining.slice(); // snapshot for correct logic below

    setSpinning(true);
    setRevealOpen(false);
    setFinalOpen(false);
    setSpinCount((p) => p + 1);
    audio.spinStart();

    const chosen = pickRandom(remainingBefore);
    console.log("🎯 Segmento escolhido:", chosen, "Cor:", SLICE_PUBLIC[chosen].colorName);

    setSpotlight(chosen);

    const { map, step } = buildWheelLayout(remainingBefore);
    const seg = map.get(chosen)!;

    const START_ROTATION = rotationMV.get();
    const spins = prefersReducedMotion ? 2 : Math.floor(6 + Math.min(4, spinCount * 0.5));

    const targetMod = mod360(360 - seg.center);
    const currentMod = mod360(START_ROTATION);
    const delta = mod360(targetMod - currentMod);
    const totalDegrees = START_ROTATION + spins * 360 + delta;

    if (spinAnimationRef.current) spinAnimationRef.current.stop();
    lastSegmentIndex.current = -1;

    const duration = prefersReducedMotion ? 1.2 : clamp(4.2 + spinCount * 0.12, 4.2, 5.5);

    const phase1 = animate(rotationMV, totalDegrees, {
      duration,
      ease: [0.12, 0.78, 0.08, 0.99],
      onUpdate: (latest) => {
        const wheelAtPointer = mod360(-latest);
        const idx = Math.floor(wheelAtPointer / step) % remainingBefore.length;

        if (idx !== lastSegmentIndex.current) {
          lastSegmentIndex.current = idx;
          const progress = (latest - START_ROTATION) / (totalDegrees - START_ROTATION);

          if (progress > 0.78) audio.segmentPass();
          else audio.tick();

          setPointerPulse((p) => p + 1);
        }
      },
    });

    spinAnimationRef.current = phase1;
    await phase1.finished;

    rotationMV.set(mod360(totalDegrees));

    audio.land();
    setPointerPulse((p) => p + 1);

    if (navigator.vibrate) navigator.vibrate([120, 40, 120]);

    const guessedRight = chosen === bet;
    setLastResult({ slice: chosen, guessedRight });

    setConfettiTrigger(true);
    setTimeout(() => setConfettiTrigger(false), guessedRight ? 1500 : 500);

    if (guessedRight) audio.success();
    else audio.reveal();

    setRemaining((r) => r.filter((x) => x !== chosen));

    const nextRemainingLen = remainingBefore.length - 1;

    setTimeout(() => {
      setSpinning(false);
      setActive(chosen);
      setRevealOpen(true);
      setBet(null);

      // ✅ Use the NEXT remaining length (after removing chosen), not stale state
      if (nextRemainingLen > 1) resetRotation();
    }, 800);
  });

  const reset = useEvent(() => {
    setRemaining(ALL_SLICES);
    setActive(null);
    setRevealOpen(false);
    setSpinning(false);
    setSpotlight(null);
    setBet(null);
    setLastResult(null);
    setPointerPulse(0);
    setBurst(false);
    setFinalOpen(false);
    setConfettiTrigger(false);
    setSpinCount(0);
    hasShownFinal.current = false;

    resetRotation();
    toast("Journey reset", { description: "Start fresh with all surprises" });
  });

  const closeReveal = useEvent(() => {
    setRevealOpen(false);
    resetRotation();

    if (remaining.length === 0 && !hasShownFinal.current) {
      hasShownFinal.current = true;
      setTimeout(() => setFinalOpen(true), 600);
    }
  });

  const shareExperience = useEvent(() => {
    const url = window.location.href;
    const text = `Just experienced this beautiful Love Wheel journey! 💝 Spin the wheel and reveal heartfelt surprises.`;

    if (navigator.share) {
      navigator.share({ title: "Love Wheel", text, url });
    } else {
      navigator.clipboard.writeText(`${text} ${url}`);
      toast.success("Link copied to clipboard!");
    }
  });

  React.useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.key) {
        case " ":
        case "Enter":
          e.preventDefault();
          if (!revealOpen && !finalOpen && !spinning && bet) spin();
          break;
        case "r":
        case "R":
          if (!revealOpen && !finalOpen) reset();
          break;
        case "m":
        case "M":
          // ✅ Fix stale audioOn toast: compute next inside setter
          setAudioOn((v) => {
            const next = !v;
            toast.success(`Sound ${next ? "On" : "Off"}`, { description: "Audio settings updated" });
            return next;
          });
          break;
        case "Escape":
          if (revealOpen) closeReveal();
          if (finalOpen) setFinalOpen(false);
          break;
        case "1":
          if (remaining.includes("blue")) setBet("blue");
          break;
        case "2":
          if (remaining.includes("red")) setBet("red");
          break;
        case "3":
          if (remaining.includes("green")) setBet("green");
          break;
        case "4":
          if (remaining.includes("yellow")) setBet("yellow");
          break;
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [spin, reset, revealOpen, finalOpen, remaining, setAudioOn, closeReveal, spinning, bet]);

  const startAt = normalizedGift ? new Date(normalizedGift.relationship_start_at) : null;
  const elapsed = startAt ? Math.max(0, now.getTime() - startAt.getTime()) : 0;
  const parts = msToParts(elapsed);

  return (
    <div
      className="min-h-screen text-white overflow-hidden"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <GlowBg />
      <ConfettiExplosion trigger={confettiTrigger} intensity={remaining.length === 1 ? 2 : 1} />

      {showStory && <StoryIntro onComplete={() => setShowStory(false)} />}

      <RevealOverlay open={revealOpen} slice={active} onClose={closeReveal} gift={normalizedGift} />

      <FinalCelebration open={finalOpen} onClose={() => setFinalOpen(false)} onShare={shareExperience} gift={normalizedGift} />

      <header className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 sm:gap-6">
          <div className="text-center md:text-left">
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-fuchsia-400 to-pink-400 bg-clip-text text-transparent">
              Love Wheel
            </h1>
            <p className="text-white/70 mt-2 text-sm sm:text-base">Spin to reveal heartfelt surprises</p>
            {normalizedGift.couple_names && <p className="text-white/60 text-sm mt-1">For {normalizedGift.couple_names}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 w-full md:w-auto">
            <button
              onClick={() =>
                setAudioOn((v) => {
                  const next = !v;
                  toast.success(`Sound ${next ? "On" : "Off"}`, { description: "Audio settings updated" });
                  return next;
                })
              }
              className={`px-4 py-2 rounded-full border backdrop-blur-sm flex items-center justify-center gap-2 w-full ${
                audioOn ? "border-emerald-500/50 bg-emerald-500/20 text-emerald-300" : "border-white/20 bg-white/5 text-white/70"
              }`}
            >
              {audioOn ? <IconVolumeOn className="w-4 h-4" /> : <IconVolumeOff className="w-4 h-4" />}
              Sound {audioOn ? "On" : "Off"}
            </button>

            <Button
              onClick={reset}
              className="rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:opacity-90 transition-all duration-300 shadow-[0_0_30px_rgba(6,182,212,0.3)] w-full"
            >
              <IconRestart className="w-4 h-4 mr-2" />
              Restart
            </Button>

            <Button onClick={shareExperience} className="rounded-full bg-gradient-to-r from-sky-500 to-violet-500 hover:opacity-90 w-full">
              <IconShare className="w-4 h-4 mr-2" />
              Share
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="max-w-6xl mx-auto">
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
            onShare={shareExperience}
            spinCount={spinCount}
          />
        </div>
      </main>

      <footer className="container mx-auto px-4 sm:px-6 py-8 border-t border-white/10">
        <div className="text-center text-white/50 text-xs sm:text-sm">
          <p>Made with 💝 using LoveWheel • Share the love with someone special</p>
          <div className="mt-4">
            <Button
              onClick={() => (window.location.href = "/create")}
              variant="outline"
              size="sm"
              className="rounded-full border-white/20 bg-white/5 hover:bg-white/10"
            >
              Create Your Own Love Wheel
            </Button>
          </div>
        </div>
      </footer>
    </div>
  );
}
  
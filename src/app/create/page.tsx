"use client";

import * as React from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useForm } from "react-hook-form";
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
 * LoveWheel landing + cinematic builder:
 * - Dark premium hero + neon glow art
 * - Primary CTA opens the builder modal
 * - Link-ready popup after create
 * - Pricing / QR Reader open popups
 * - FAQ + How it works NAV scroll to sections (no popup)
 * - QR code generated in LinkReady popup BEFORE payment (ask user to save it)
 * - All copy in English
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

/** ===== Accent system ===== */

function stepAccent(step: StepKey) {
  // LoveWheel palette: pink → magenta → violet on deep navy
  if (step === "red")
    return {
      dot: "bg-fuchsia-500",
      ring: "ring-fuchsia-500/20",
      glow: "from-fuchsia-500/18 via-pink-500/10 to-violet-500/10",
      chip: "hover:border-fuchsia-500/25 hover:text-foreground",
      bar: "from-fuchsia-500 via-pink-500 to-violet-500",
      stroke: "border-fuchsia-500/12",
      icon: "text-fuchsia-400/85",
    };
  if (step === "green")
    return {
      dot: "bg-emerald-400",
      ring: "ring-emerald-400/18",
      glow: "from-emerald-400/14 via-sky-400/10 to-fuchsia-500/10",
      chip: "hover:border-emerald-400/25 hover:text-foreground",
      bar: "from-emerald-400 via-sky-400 to-fuchsia-500",
      stroke: "border-emerald-400/12",
      icon: "text-emerald-300/90",
    };
  if (step === "photo")
    return {
      dot: "bg-sky-400",
      ring: "ring-sky-400/18",
      glow: "from-sky-400/14 via-violet-500/10 to-fuchsia-500/10",
      chip: "hover:border-sky-400/25 hover:text-foreground",
      bar: "from-sky-400 via-violet-500 to-fuchsia-500",
      stroke: "border-sky-400/12",
      icon: "text-sky-300/90",
    };
  if (step === "yellow")
    return {
      dot: "bg-amber-300",
      ring: "ring-amber-300/18",
      glow: "from-amber-300/12 via-fuchsia-500/10 to-sky-400/10",
      chip: "hover:border-amber-300/25 hover:text-foreground",
      bar: "from-amber-300 via-fuchsia-500 to-sky-400",
      stroke: "border-amber-300/10",
      icon: "text-amber-200/90",
    };
  if (step === "confirm")
    return {
      dot: "bg-violet-500",
      ring: "ring-violet-500/18",
      glow: "from-violet-500/14 via-fuchsia-500/10 to-sky-400/10",
      chip: "hover:border-violet-500/25 hover:text-foreground",
      bar: "from-violet-500 via-fuchsia-500 to-sky-400",
      stroke: "border-violet-500/10",
      icon: "text-violet-300/90",
    };

  return {
    dot: "bg-fuchsia-500",
    ring: "ring-white/10",
    glow: "from-fuchsia-500/18 via-pink-500/10 to-violet-500/10",
    chip: "hover:border-white/15 hover:text-foreground",
    bar: "from-fuchsia-500 via-pink-500 to-violet-500",
    stroke: "border-white/10",
    icon: "text-fuchsia-400/85",
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

function IconSound({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={cx("h-4 w-4", className)}>
      <path
        d="M14 4a1 1 0 00-1.6-.8l-3.8 2.9H4a2 2 0 00-2 2v4a2 2 0 002 2h4.6l3.8 2.9a1 1 0 001.6-.8V4zm-4 5a1 1 0 00-1.7-.7 1 1 0 00-.3.7v2a1 1 0 001 1 1 1 0 001-1V9zm3 3a1 1 0 00-1.7-.7 1 1 0 00-.3.7v2a1 1 0 001 1 1 1 0 001-1v-2zm3-3a1 1 0 00-1.7-.7 1 1 0 00-.3.7v4a1 1 0 001 1 1 1 0 001-1V9z"
        fill="currentColor"
      />
    </svg>
  );
}

function IconRestart({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={cx("h-4 w-4", className)}>
      <path
        d="M17.6 6.3A8 8 0 0119 12a8 8 0 01-8 8 8 8 0 01-8-8 8 8 0 018-8c1.8 0 3.4.6 4.8 1.7l-2.5 2.5H19V3l-1.4 1.4a10 10 0 00-7.6-3.4C5.4 1 1 5.4 1 11s4.4 10 10 10 10-4.4 10-10c0-2.6-1-5-2.7-6.9l-1.7 1.2z"
        fill="currentColor"
      />
    </svg>
  );
}

function IconShare({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={cx("h-4 w-4", className)}>
      <path
        d="M18 16c-.8 0-1.5.3-2 .8l-7-4.2c.1-.2.1-.4.1-.6s0-.4-.1-.6l7-4.2c.5.5 1.2.8 2 .8 1.7 0 3-1.3 3-3s-1.3-3-3-3-3 1.3-3 3c0 .2 0 .4.1.6l-7 4.2c-.5-.5-1.2-.8-2-.8-1.7 0-3 1.3-3 3s1.3 3 3 3c.8 0 1.5-.3 2-.8l7 4.2c-.1.2-.1.4-.1.6 0 1.7 1.3 3 3 3s3-1.3 3-3-1.3-3-3-3z"
        fill="currentColor"
      />
    </svg>
  );
}

function IconArrowRight({ className }: { className?: string }) {
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
}

/** ===== Background (dark navy + neon) ===== */

function NeonBg() {
  const reduce = useReducedMotion();

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(1200px_circle_at_20%_20%,rgba(255,255,255,0.06),transparent_55%),radial-gradient(900px_circle_at_85%_25%,rgba(255,64,169,0.10),transparent_55%),radial-gradient(900px_circle_at_70%_85%,rgba(155,81,224,0.10),transparent_60%),linear-gradient(180deg,#050816_0%,#050816_45%,#040513_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(1200px_circle_at_50%_45%,transparent_40%,rgba(0,0,0,0.70)_100%)]" />
      <div className="absolute inset-0 opacity-[0.08] [background-image:radial-gradient(rgba(255,255,255,0.9)_1px,transparent_1px)] [background-size:10px_10px]" />

      {!reduce && (
        <motion.div
          className="absolute -inset-14 opacity-[0.35]"
          animate={{ y: [0, -14, 0], x: [0, 8, 0] }}
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

/** ===== MINI WHEEL PREVIEW - A imagem que você enviou ===== */

function MiniWheelPreview() {
  const [selectedColor, setSelectedColor] = React.useState<string | null>(null);
  const [spinsLeft, setSpinsLeft] = React.useState(4);
  const [journey, setJourney] = React.useState<string[]>([]);
  const [isSpinning, setIsSpinning] = React.useState(false);
  
  const colors = [
    { name: "Gold", description: "Personal love letter", bg: "bg-gradient-to-b from-amber-300 to-amber-500" },
    { name: "Sapphire", description: "Cherished photo memory", bg: "bg-gradient-to-b from-blue-400 to-blue-600" },
    { name: "Emerald", description: "Relationship timeline", bg: "bg-gradient-to-b from-emerald-400 to-emerald-600" },
    { name: "Rose", description: "Special phrase for you", bg: "bg-gradient-to-b from-pink-400 to-pink-600" },
  ];

  const handleSpin = () => {
    if (spinsLeft <= 0 || isSpinning) return;
    
    setIsSpinning(true);
    softHaptic([10, 20, 10]);
    
    const randomIndex = Math.floor(Math.random() * colors.length);
    const selected = colors[randomIndex];
    
    setTimeout(() => {
      setSelectedColor(selected.name);
      setSpinsLeft(prev => prev - 1);
      setJourney(prev => [...prev, selected.name]);
      setIsSpinning(false);
      softHaptic([15, 25, 15]);
    }, 1500);
  };

  const handleRestart = () => {
    setSelectedColor(null);
    setSpinsLeft(4);
    setJourney([]);
    softHaptic(10);
  };

  return (
    <div className="relative w-full max-w-sm mx-auto">
      {/* Wheel container */}
      <div className="relative rounded-3xl overflow-hidden border border-white/15 bg-gradient-to-b from-gray-900/90 to-gray-950/90 backdrop-blur-lg shadow-2xl shadow-black/50">
        {/* Header */}
        <div className="p-6 text-center border-b border-white/10">
          <h3 className="text-2xl font-bold bg-gradient-to-r from-fuchsia-300 via-pink-300 to-violet-300 bg-clip-text text-transparent">
            Love Wheel
          </h3>
          <p className="text-white/70 text-sm mt-1">Spin to reveal heartfelt surprises</p>
        </div>
        
        {/* Color options */}
        <div className="p-6 grid grid-cols-2 gap-4">
          {colors.map((color) => (
            <div 
              key={color.name}
              className={`rounded-2xl p-4 border-2 transition-all duration-300 ${
                selectedColor === color.name 
                  ? 'border-white/30 shadow-lg shadow-white/10' 
                  : 'border-white/10 hover:border-white/20'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full ${color.bg} flex items-center justify-center shadow-inner`}>
                  {selectedColor === color.name && (
                    <div className="w-5 h-5 rounded-full bg-white/90 animate-pulse" />
                  )}
                </div>
                <div className="text-left">
                  <div className={`font-semibold ${
                    color.name === "Gold" ? "text-amber-300" :
                    color.name === "Sapphire" ? "text-blue-400" :
                    color.name === "Emerald" ? "text-emerald-400" :
                    "text-pink-400"
                  }`}>
                    {color.name}
                  </div>
                  <div className="text-white/70 text-xs">{color.description}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Stats */}
        <div className="px-6 pb-4 grid grid-cols-2 gap-4">
          <div className="rounded-xl bg-white/5 p-3 border border-white/10">
            <div className="text-white/70 text-xs">Surprises Left</div>
            <div className="text-2xl font-bold text-white mt-1">{spinsLeft}</div>
          </div>
          <div className="rounded-xl bg-white/5 p-3 border border-white/10">
            <div className="text-white/70 text-xs">Choice</div>
            <div className="text-2xl font-bold text-white mt-1">
              {selectedColor ? selectedColor.slice(0, 3) : "—"}
            </div>
          </div>
        </div>
        
        {/* Spin info */}
        <div className="px-6 pb-6">
          <div className="rounded-xl bg-gradient-to-r from-fuchsia-500/20 to-violet-500/20 p-3 border border-fuchsia-500/30">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-white/70 text-xs">Current Spin</div>
                <div className="text-xl font-bold text-white">Spin #{4 - spinsLeft + 1}</div>
              </div>
              <div className="text-right">
                <div className="text-white/70 text-xs">Status</div>
                <div className="text-sm font-semibold text-fuchsia-300">
                  {selectedColor ? "Revealed" : "Ready"}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Controls */}
        <div className="p-6 border-t border-white/10 bg-black/30 grid grid-cols-3 gap-3">
          <button 
            className="flex flex-col items-center justify-center gap-1 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all active:scale-95 border border-white/10"
            onClick={() => softHaptic(10)}
          >
            <IconSound className="h-5 w-5 text-white/80" />
            <span className="text-xs text-white/70">Sound On</span>
          </button>
          
          <button 
            className="flex flex-col items-center justify-center gap-1 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all active:scale-95 border border-white/10"
            onClick={handleRestart}
          >
            <IconRestart className="h-5 w-5 text-white/80" />
            <span className="text-xs text-white/70">Restart</span>
          </button>
          
          <button 
            className="flex flex-col items-center justify-center gap-1 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all active:scale-95 border border-white/10"
            onClick={() => softHaptic(10)}
          >
            <IconShare className="h-5 w-5 text-white/80" />
            <span className="text-xs text-white/70">Share</span>
          </button>
        </div>
        
        {/* Spin button */}
        <div className="p-6 pt-0">
          <button
            onClick={handleSpin}
            disabled={spinsLeft <= 0 || isSpinning}
            className={`w-full py-4 rounded-2xl font-bold text-lg transition-all ${
              spinsLeft > 0 && !isSpinning
                ? 'bg-gradient-to-r from-fuchsia-500 via-pink-500 to-violet-500 hover:from-fuchsia-600 hover:via-pink-600 hover:to-violet-600 active:scale-95 shadow-lg shadow-fuchsia-500/30'
                : 'bg-gray-700/50 cursor-not-allowed'
            }`}
          >
            {isSpinning ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Spinning...
              </span>
            ) : spinsLeft > 0 ? (
              `Spin to Reveal (${spinsLeft} left)`
            ) : (
              "No Spins Left"
            )}
          </button>
        </div>
      </div>
      
      {/* Journey section */}
      <div className="mt-6 rounded-3xl overflow-hidden border border-white/15 bg-gradient-to-b from-gray-900/90 to-gray-950/90 backdrop-blur-lg p-6">
        <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          Your Journey
          <span className="text-white/70 text-sm font-normal">
            {journey.length} of 4
          </span>
        </h4>
        
        {journey.length === 0 ? (
          <div className="text-center py-8 text-white/50">
            <div className="text-4xl mb-2">🌀</div>
            <p>Spin the wheel to start your journey!</p>
            <p className="text-sm mt-2">Each spin reveals a new surprise</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {colors.map((color) => (
              <div 
                key={color.name}
                className={`rounded-xl p-3 flex items-center gap-3 ${
                  journey.includes(color.name)
                    ? 'bg-white/10 border border-white/20'
                    : 'bg-white/5 border border-white/10 opacity-50'
                }`}
              >
                <div className={`w-8 h-8 rounded-full ${color.bg} flex items-center justify-center`}>
                  {journey.includes(color.name) && (
                    <div className="w-3 h-3 rounded-full bg-white/90" />
                  )}
                </div>
                <div className="text-sm font-medium text-white">
                  {color.name}
                </div>
              </div>
            ))}
          </div>
        )}
        
        <div className="mt-4 text-center text-xs text-white/50">
          Complete all 4 spins to unlock the full experience
        </div>
      </div>
    </div>
  );
}

/** ===== Simple Info Modal (Pricing / QR Reader) ===== */

function InfoModal({
  open,
  onOpenChange,
  title,
  content,
  ctaLabel,
  onCta,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  content: React.ReactNode;
  ctaLabel?: string;
  onCta?: () => void;
}) {
  const reduce = useReducedMotion();
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
          className="fixed inset-0 z-[90] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onOpenChange(false);
          }}
        >
          <motion.div
            className="absolute inset-0 bg-black/55 backdrop-blur-[10px]"
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
              "relative w-full max-w-2xl overflow-hidden rounded-[32px] border border-white/12 bg-[#070A1B]/70 shadow-[0_40px_160px_-70px_rgba(0,0,0,0.85)] backdrop-blur",
              "focus:outline-none focus:ring-2 focus:ring-white/15"
            )}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 18, scale: 0.985, filter: "blur(10px)" }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 14, scale: 0.985, filter: "blur(10px)" }}
            transition={{ duration: reduce ? 0.16 : 0.34, ease: "easeOut" }}
          >
            <motion.div
              aria-hidden="true"
              className="pointer-events-none absolute -inset-10 bg-[radial-gradient(750px_circle_at_20%_15%,rgba(255,64,169,0.26),transparent_55%),radial-gradient(650px_circle_at_85%_20%,rgba(155,81,224,0.22),transparent_58%),radial-gradient(700px_circle_at_55%_85%,rgba(56,189,248,0.14),transparent_60%)]"
              animate={{ opacity: [0.55, 0.85, 0.55] }}
              transition={{ duration: 5.0, ease: "easeInOut", repeat: Infinity }}
            />

            <div className="relative p-6 sm:p-7">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/6 px-3 py-1 text-xs text-white/70 backdrop-blur">
                    <span className="h-1.5 w-1.5 rounded-full bg-fuchsia-400" />
                    LoveWheel
                  </div>
                  <div className="text-2xl font-semibold tracking-tight text-white/90">{title}</div>
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

              <div className="mt-5 rounded-2xl border border-white/12 bg-white/6 p-4 text-sm text-white/75 leading-relaxed">
                {content}
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full border-white/15 bg-white/0 text-white hover:bg-white/10"
                  onClick={() => onOpenChange(false)}
                >
                  Close
                </Button>
                {ctaLabel ? (
                  <Button
                    type="button"
                    className="rounded-full bg-gradient-to-r from-fuchsia-500 via-pink-500 to-violet-500 text-white hover:opacity-95"
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

/** ===== Beautiful mini wheel (hero mock) ===== */

function MiniWheel({ phrase, reduceMotion }: { phrase: string; reduceMotion: boolean }) {
  const slices = [
    { label: "Photo", from: "from-sky-400/35", to: "to-violet-500/25" },
    { label: "Short line", from: "from-fuchsia-500/35", to: "to-pink-500/25" },
    { label: "Time", from: "from-emerald-400/30", to: "to-sky-400/20" },
    { label: "Letter", from: "from-amber-300/30", to: "to-fuchsia-500/20" },
  ];

  return (
    <div className="relative">
      <div className="absolute -inset-10 rounded-[44px] bg-[radial-gradient(closest-side,rgba(255,64,169,0.22),transparent_70%)] blur-2xl" />
      <div className="absolute -inset-10 rounded-[44px] bg-[radial-gradient(closest-side,rgba(155,81,224,0.18),transparent_72%)] blur-2xl" />

      <div className="relative overflow-hidden rounded-[34px] border border-white/12 bg-white/6 shadow-[0_50px_180px_-90px_rgba(0,0,0,0.85)] backdrop-blur">
        <div className="p-5">
          <div className="mb-3 flex items-center justify-between text-[11px] text-white/70">
            <span className="inline-flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-fuchsia-400" />
              love moment preview
            </span>
            <span className="inline-flex items-center gap-2">
              <IconSpark className="h-4 w-4 text-white/60" />
              spin → reveal
            </span>
          </div>

          <div className="relative mx-auto grid place-items-center">
            <div className="absolute -top-1 z-10 h-0 w-0 border-l-[10px] border-r-[10px] border-b-[14px] border-l-transparent border-r-transparent border-b-white/80 drop-shadow" />

            <motion.div
              className="relative h-[230px] w-[230px] rounded-full border border-white/12 bg-black/20 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]"
              animate={reduceMotion ? undefined : { rotate: [0, 8, 0, -6, 0] }}
              transition={reduceMotion ? undefined : { duration: 10, ease: "easeInOut", repeat: Infinity }}
            >
              <div className="absolute inset-0 rounded-full overflow-hidden">
                {slices.map((s, i) => {
                  const rot = i * 90;
                  return (
                    <div
                      key={s.label}
                      className="absolute inset-0"
                      style={{
                        transform: `rotate(${rot}deg)`,
                      }}
                    >
                      <div
                        className={cx(
                          "absolute left-1/2 top-0 h-1/2 w-1/2 -translate-x-1/2 origin-bottom",
                          "bg-gradient-to-b",
                          s.from,
                          s.to
                        )}
                      />
                    </div>
                  );
                })}
                <div className="absolute inset-0 bg-[radial-gradient(closest-side,rgba(255,255,255,0.10),transparent_65%)]" />
              </div>

              <div className="absolute -inset-3 rounded-full bg-[conic-gradient(from_180deg,rgba(255,64,169,0.30),rgba(155,81,224,0.22),rgba(56,189,248,0.20),rgba(255,64,169,0.30))] blur-xl opacity-60" />

              <div className="absolute left-1/2 top-1/2 z-10 h-[92px] w-[92px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/12 bg-[#070A1B]/70 backdrop-blur shadow-[0_20px_80px_-40px_rgba(255,64,169,0.55)]">
                <div className="flex h-full flex-col items-center justify-center gap-1">
                  <div className="text-white/85">
                    <IconHeart className="h-6 w-6 text-fuchsia-300" />
                  </div>
                  <div className="text-[11px] font-semibold text-white/90 tracking-tight">LoveWheel</div>
                  <div className="text-[10px] text-white/55">tap to spin</div>
                </div>
              </div>
            </motion.div>

            <div className="mt-4 w-full rounded-2xl border border-white/12 bg-white/6 p-4">
              <div className="text-[11px] text-white/60">It lands like this:</div>
              <div className="mt-1 text-lg font-semibold text-white/90">"I'd choose you again."</div>
              <div className="mt-1 text-[11px] text-white/60">Then: unlock → reveal the rest.</div>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-white/12 bg-white/6 p-3 text-[11px] text-white/70">
            Tip: the best gifts feel like a memory, not a template.
          </div>
        </div>

        <div className="pointer-events-none absolute left-1/2 top-2 h-5 w-24 -translate-x-1/2 rounded-full bg-black/35" />
      </div>
    </div>
  );
}

/** ===== Hero art wrapper (QR + wheel mock + neon) ===== */

function HeroArt({ phrase }: { phrase: string }) {
  const reduce = useReducedMotion();

  return (
    <div className="relative mx-auto w-full max-w-[520px]">
      <div className="relative">
        <motion.div
          className="absolute -left-6 -top-10 h-32 w-32 rounded-3xl border border-white/10 bg-white/6 backdrop-blur-md"
          initial={reduce ? { opacity: 1 } : { opacity: 0, y: 10, rotate: -6, scale: 0.98, filter: "blur(10px)" }}
          animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, rotate: -6, scale: 1, filter: "blur(0px)" }}
          transition={{ duration: 0.65, ease: "easeOut" }}
        >
          <div className="p-3">
            <div className="h-full w-full rounded-2xl bg-white/90 p-2">
              <div className="grid h-full w-full grid-cols-8 gap-[2px]">
                {Array.from({ length: 64 }).map((_, i) => {
                  const on = [0, 1, 2, 5, 6, 7].includes(i % 8) ? i % 3 !== 0 : i % 5 === 0 || i % 7 === 0;
                  return <div key={i} className={cx("rounded-[2px]", on ? "bg-black/85" : "bg-black/10")} />;
                })}
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          className="relative ml-auto w-[320px]"
          initial={reduce ? { opacity: 1 } : { opacity: 0, y: 16, rotate: 6, scale: 0.985, filter: "blur(12px)" }}
          animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, rotate: 6, scale: 1, filter: "blur(0px)" }}
          transition={{ duration: 0.75, ease: "easeOut" }}
        >
          <MiniWheel phrase={phrase} reduceMotion={!!reduce} />

        </motion.div>

        {!reduce && (
          <motion.div
            aria-hidden="true"
            className="pointer-events-none absolute -inset-12"
            animate={{ rotate: [0, 2, 0, -2, 0] }}
            transition={{ duration: 8, ease: "easeInOut", repeat: Infinity }}
          >
            <div className="absolute left-[18%] top-[10%] h-80 w-80 rounded-full bg-fuchsia-500/10 blur-3xl" />
            <div className="absolute left-[35%] top-[22%] h-72 w-72 rounded-full bg-violet-500/10 blur-3xl" />
          </motion.div>
        )}

        <div className="pointer-events-none absolute -right-6 -top-8 opacity-90">
          <div className="relative">
            <div className="h-10 w-10 rounded-full bg-fuchsia-500/20 blur-xl" />
            <div className="absolute inset-0 flex items-center justify-center text-fuchsia-300">
              <IconHeart className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="pointer-events-none absolute -right-10 bottom-6 opacity-85">
          <div className="relative">
            <div className="h-12 w-12 rounded-full bg-violet-500/20 blur-xl" />
            <div className="absolute inset-0 flex items-center justify-center text-violet-300">
              <IconHeart className="h-7 w-7" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** ===== Builder modal (opens from hero button) ===== */

function BuilderModal({
  open,
  onOpenChange,
  children,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  children: React.ReactNode;
}) {
  const reduce = useReducedMotion();
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
          className="fixed inset-0 z-[60] flex items-start justify-center p-4 sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onOpenChange(false);
          }}
        >
          <motion.div
            className="absolute inset-0 bg-black/55 backdrop-blur-[10px]"
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
              "relative w-full max-w-3xl overflow-hidden rounded-[34px] border border-white/12 bg-[#070A1B]/65 shadow-[0_70px_240px_-120px_rgba(0,0,0,0.95)] backdrop-blur",
              "focus:outline-none focus:ring-2 focus:ring-white/15"
            )}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 18, scale: 0.985, filter: "blur(12px)" }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 14, scale: 0.985, filter: "blur(12px)" }}
            transition={{ duration: reduce ? 0.16 : 0.34, ease: "easeOut" }}
          >
            <motion.div
              aria-hidden="true"
              className="pointer-events-none absolute -inset-10 bg-[radial-gradient(700px_circle_at_20%_15%,rgba(255,64,169,0.22),transparent_55%),radial-gradient(700px_circle_at_85%_20%,rgba(155,81,224,0.18),transparent_58%),radial-gradient(700px_circle_at_55%_85%,rgba(255,255,255,0.06),transparent_65%)]"
              animate={{ opacity: [0.55, 0.85, 0.55] }}
              transition={{ duration: 5.0, ease: "easeInOut", repeat: Infinity }}
            />

            <div className="relative flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-2xl bg-white/8 ring-1 ring-white/12 backdrop-blur flex items-center justify-center">
                  <span className="text-fuchsia-300">
                    <IconHeart className="h-5 w-5" />
                  </span>
                </div>
                <div>
                  <div className="text-sm font-semibold text-white/90">Create your love moment</div>
                  <div className="text-[11px] text-white/60">{PRICE_MICROCOPY}</div>
                </div>
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

            <div className="relative max-h-[80vh] overflow-auto px-5 py-5 sm:px-6 sm:py-6">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** ===== UI bits (builder) ===== */

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
        "inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/6 px-3 py-1 text-xs text-white/70 backdrop-blur transition",
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

function MinimalProgress({ step, progress }: { step: StepKey; progress: number }) {
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
    <div className="mt-5 flex items-center justify-between gap-4">
      <div className="text-xs text-white/60">
        <span className="text-white/85">{label}</span> • {progress}%
      </div>

      <div className="relative h-2 w-44 overflow-hidden rounded-full bg-white/10">
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
      <div className="rounded-3xl border border-white/12 bg-white/6 p-6 shadow-sm backdrop-blur">
        <div className="mb-2 flex items-center justify-between text-xs text-white/60">
          <span className="inline-flex items-center gap-2">
            <IconHeart className="h-4 w-4 text-fuchsia-300" />
            Your line
          </span>
          <span className="h-2 w-2 rounded-full bg-fuchsia-400/80" />
        </div>
        <div className="text-2xl font-semibold leading-snug tracking-tight text-white/90">{red.trim() ? `"${red.trim()}"` : "—"}</div>
        <div className="mt-3 text-[11px] text-white/60">Make it specific. One private detail beats ten generic compliments.</div>
      </div>

      <div className="rounded-3xl border border-white/12 bg-white/6 p-6 shadow-sm backdrop-blur">
        <div className="mb-2 flex items-center justify-between text-xs text-white/60">
          <span className="inline-flex items-center gap-2">
            <IconSpark className="h-4 w-4 text-emerald-300" />
            Time together
          </span>
          <span className="h-2 w-2 rounded-full bg-emerald-300/80" />
        </div>
        <div className="text-xs text-white/60">Since {startDate || "—"}</div>
        <div className="mt-1 text-4xl font-semibold tracking-tight text-white/90">{duration}</div>
        <div className="mt-3 text-[11px] text-white/60">This number is simple — and it lands every time.</div>
      </div>

      <div className="rounded-3xl border border-white/12 bg-white/6 p-6 shadow-sm backdrop-blur">
        <div className="mb-3 flex items-center justify-between text-xs text-white/60">
          <span className="inline-flex items-center gap-2">
            <IconPhoto className="h-4 w-4 text-sky-300" />
            The photo
          </span>
          <span className="h-2 w-2 rounded-full bg-sky-300/80" />
        </div>

        {photoPreviewUrl ? (
          <div className="relative overflow-hidden rounded-2xl border border-white/12 bg-white/5">
            <img src={photoPreviewUrl} alt="Couple photo preview" className="h-[220px] w-full object-cover" />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
            <div className="pointer-events-none absolute bottom-3 left-3 text-xs text-white/85">Revealed after payment.</div>
          </div>
        ) : (
          <div className="rounded-2xl border border-white/12 bg-white/5 p-4 text-sm text-white/60">—</div>
        )}

        <div className="mt-3 text-xs text-white/60">Tip: pick a photo that instantly brings you back. A laugh. A trip. A night that felt like forever.</div>
      </div>

      <div className="rounded-3xl border border-white/12 bg-white/6 p-6 shadow-blur">
        <div className="mb-2 flex items-center justify-between text-xs text-white/60">
          <span className="inline-flex items-center gap-2">
            <IconSpark className="h-4 w-4 text-amber-200" />
            The letter
          </span>
          <span className="h-2 w-2 rounded-full bg-amber-200/80" />
        </div>

        <div className="space-y-2">
          {lines.map((l, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.02 }}
              className="text-sm leading-relaxed text-white/85"
            >
              {l}
            </motion.div>
          ))}
        </div>

        <div className="mt-5 text-xs text-white/60">
          The premium <span className="text-white/80">spin → reveal</span> unlocks after payment.
        </div>
      </div>
    </div>
  );
}

/** ===== QR generator (for LinkReady popup) ===== */

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
    <div className="mt-5 rounded-2xl border border-white/12 bg-white/6 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] text-white/55">Save this QR code before you pay</div>
          <div className="mt-1 text-sm text-white/80">
            Print it, tape it into a letter, or keep it for the perfect delivery moment.
          </div>
        </div>
        <Button type="button" variant="secondary" className="rounded-full" onClick={download} disabled={!dataUrl}>
          {dataUrl ? "Download QR" : loading ? "Generating…" : "QR unavailable"}
        </Button>
      </div>

      <div className="mt-4 flex items-center justify-center">
        {dataUrl ? (
          <div className="rounded-2xl bg-white p-3">
            <img src={dataUrl} alt="QR code for your LoveWheel link" className="h-[220px] w-[220px]" />
          </div>
        ) : (
          <div className="w-full rounded-2xl border border-white/12 bg-white/5 p-4 text-xs text-white/60">
            {loading ? "Generating your QR code…" : "Couldn't generate QR code on this device."}
          </div>
        )}
      </div>

      <div className="mt-3 text-[11px] text-white/55">
        Tip: on iPhone, you can also long-press the QR image after it appears and save it.
      </div>
    </div>
  );
}

/** ===== Premium popup (shows Link Ready dynamically + QR before pay) ===== */

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
          className="fixed inset-0 z-[80] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onOpenChange(false);
          }}
        >
          <motion.div
            className="absolute inset-0 bg-black/55 backdrop-blur-[10px]"
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
              "relative w-full max-w-xl overflow-hidden rounded-[32px] border border-white/12 bg-[#070A1B]/65 shadow-[0_40px_160px_-70px_rgba(0,0,0,0.85)] backdrop-blur",
              "focus:outline-none focus:ring-2 focus:ring-white/15"
            )}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 18, scale: 0.985, filter: "blur(10px)" }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 14, scale: 0.985, filter: "blur(10px)" }}
            transition={{ duration: reduce ? 0.16 : 0.34, ease: "easeOut" }}
          >
            <motion.div
              aria-hidden="true"
              className="pointer-events-none absolute -inset-10 bg-[radial-gradient(700px_circle_at_20%_15%,rgba(255,64,169,0.24),transparent_55%),radial-gradient(650px_circle_at_85%_20%,rgba(155,81,224,0.20),transparent_58%),radial-gradient(700px_circle_at_55%_85%,rgba(56,189,248,0.12),transparent_60%)]"
              animate={{ opacity: [0.55, 0.85, 0.55] }}
              transition={{ duration: 5.0, ease: "easeInOut", repeat: Infinity }}
            />

            <div className="relative p-6 sm:p-7">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/6 px-3 py-1 text-xs text-white/70 backdrop-blur">
                    <span className="h-1.5 w-1.5 rounded-full bg-fuchsia-400" />
                    Link ready ✨
                  </div>
                  <div className="mt-2 text-2xl font-semibold tracking-tight text-white/90">Your moment is live.</div>
                  <div className="text-sm text-white/60">
                    Before you pay: save your QR code below (for printing / letters). Then unlock the premium wheel + reveal.
                  </div>
                  <div className="text-[11px] text-white/55">{PRICE_MICROCOPY}</div>
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

              <div className="mt-5 rounded-2xl border border-white/12 bg-white/6 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[11px] text-white/55">Shareable link</div>
                    <div className="mt-1 flex items-center gap-2 text-sm text-white/80">
                      <IconLink className="h-4 w-4 text-white/55" />
                      <div className="min-w-0 truncate">
                        <span className="text-white/55">{origin ? `${origin}` : ""}</span>
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

              {/* QR generated BEFORE payment */}
              <QrCodeBlock value={fullLink} />

              <div className="mt-5 grid gap-2 sm:grid-cols-3">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full border-white/15 bg-white/0 text-white hover:bg-white/10"
                  onClick={onPreview}
                >
                  Open preview
                </Button>
                <Button type="button" variant="secondary" className="rounded-full" onClick={onCopy}>
                  Copy link
                </Button>
                <Button
                  type="button"
                  className="rounded-full bg-gradient-to-r from-fuchsia-500 via-pink-500 to-violet-500 text-white hover:opacity-95"
                  onClick={onPay}
                >
                  Pay & unlock
                </Button>
              </div>

              <div className="mt-4 text-[11px] text-white/55">
                Pro tip: after payment, add a 2–3s "premium" animation before the reveal. It makes the moment land.
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

/** ===== Mobile Responsive Adjustments ===== */

function MobilePreviewSection() {
  return (
    <div className="md:hidden w-full mt-10">
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/6 px-3 py-1 text-xs text-white/70 backdrop-blur mb-4">
          <span className="h-1.5 w-1.5 rounded-full bg-fuchsia-400" />
          Live Preview
        </div>
        <h3 className="text-2xl font-bold text-white mb-2">See it in action</h3>
        <p className="text-white/60 text-sm">Experience the Love Wheel just like your partner will</p>
      </div>
      
      <MiniWheelPreview />
      
      <div className="mt-8 text-center">
        <p className="text-white/70 text-sm mb-4">
          This is how your love story will be revealed - one spin at a time.
        </p>
        <button className="text-fuchsia-300 text-sm font-medium inline-flex items-center gap-2">
          Learn how it works
          <IconArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/** ===== Main page ===== */

export default function CreatePage() {
  const reduce = useReducedMotion();

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

  // Info popup state (Pricing / QR Reader only)
  const [infoOpen, setInfoOpen] = React.useState(false);
  const [infoTitle, setInfoTitle] = React.useState("Info");
  const [infoBody, setInfoBody] = React.useState<React.ReactNode>(null);
  const [infoCta, setInfoCta] = React.useState<{ label?: string; onClick?: () => void }>({});

  // Section refs (FAQ + How it works) for nav scroll
  const faqRef = React.useRef<HTMLDivElement | null>(null);
  const howItWorksRef = React.useRef<HTMLDivElement | null>(null);

  function scrollToSection(
  ref: React.RefObject<HTMLDivElement | null>,
  offset = 92
) {
  const el = ref.current;
  if (!el) return;

  const y = el.getBoundingClientRect().top + window.scrollY - offset;
  window.scrollTo({ top: y, behavior: "smooth" });
  softHaptic(8);
}


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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [builderOpen, step, v.redPhrase, v.relationshipStartAt, v.loveLetter, photoFile, linkPopupOpen]);

  function setPhoto(file: File | null) {
    if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);

    if (!file) {
      setPhotoFile(null);
      setPhotoPreviewUrl(null);
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

  const quickLine = [
    "I'd choose you again. Every time.",
    "You feel like home — even in chaos.",
    "My favorite plan is still: you.",
    "You're the calm I didn't know I needed.",
    "If I could replay one thing, it'd be us.",
    "I'm proud of us. Always.",
  ];

  const quickPrompts = [
    "The moment I knew it was you was…",
    "My favorite memory with you is…",
    "Thank you for…",
    "I love the way you…",
    "Here's what I promise you…",
    "If we're old someday, I hope we still…",
  ];

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
      ? "This powers the live 'time together' counter — a simple detail that hits hard."
      : step === "photo"
      ? "Pick the most meaningful one. This is the moment they'll remember."
      : step === "yellow"
      ? "One memory + one gratitude + one promise. Keep it real."
      : "If it feels right, create the link — we'll open your unlock popup immediately.";

  const scene = {
    initial: reduce ? { opacity: 0 } : { opacity: 0, y: 18, filter: "blur(10px)", scale: 0.992 },
    animate: reduce ? { opacity: 1 } : { opacity: 1, y: 0, filter: "blur(0px)", scale: 1 },
    exit: reduce ? { opacity: 0 } : { opacity: 0, y: -10, filter: "blur(10px)", scale: 0.992 },
    transition: { duration: reduce ? 0.15 : 0.42, ease: "easeOut" as const },
  };

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
      <>
        <div className="space-y-3">
          <div className="text-white/85">
            LoveWheel costs <span className="text-white font-semibold">{PRICE_USD}</span> to unlock the premium spin → reveal.
          </div>
          <div>
            That's the number on your card. The emotional value is… not measurable. This isn't "content". It's a moment someone
            keeps.
          </div>
          <div className="text-white/80">One-time payment. No subscription. After unlock, the reveal becomes part of the surprise.</div>
        </div>
      </>,
      "Start creating",
      openBuilder
    );
  }

  function openFaqItem(which: string) {
    const map: Record<string, { title: string; body: React.ReactNode }> = {
      "what-is": {
        title: "What exactly is LoveWheel?",
        body: (
          <div className="space-y-3">
            <div>
              It's a private gift page you create in minutes: a short line, a "time together" counter, a photo reveal, and a love
              letter.
            </div>
            <div>Your partner spins the wheel and discovers each piece. It feels like a game, but lands like a memory.</div>
          </div>
        ),
      },
      "is-it-private": {
        title: "Is it private?",
        body: (
          <div className="space-y-3">
            <div>
              Yes. The link is unlisted (only people with the link can open it), and the reveal is gated so it doesn't get spoiled
              instantly.
            </div>
            <div className="text-white/80">Pro tip: send it at the exact moment you want it to land.</div>
          </div>
        ),
      },
      "what-if-they-share": {
        title: "What if they share the link?",
        body: (
          <div className="space-y-3">
            <div>
              That's part of the magic. The wheel makes it feel like a tiny ritual. But your details are personal, so most people
              keep it between you two.
            </div>
            <div className="text-white/80">If you want, you can create a new moment anytime.</div>
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
            <div>
              Your partner spins. Each slice reveals a piece. The premium spin → reveal unlock makes the moment feel earned and
              cinematic.
            </div>
            <div className="text-white/80">A tiny pause before the reveal turns "cute" into "I'm not crying, you are."</div>
          </div>
        ),
      },
    };

    const item = map[which] ?? { title: "How it works", body: <div>More details soon.</div> };
    openInfo(item.title, item.body);
  }

  function openQrReader() {
    openInfo(
      "QR Reader",
      <div className="space-y-3">
        <div>We generate a QR code for your LoveWheel link, so you can print it and place it inside a real letter.</div>
        <div className="text-white/80">
          Imagine this: a handwritten note… then a QR code at the bottom. They scan it. The wheel appears. The reveal begins.
        </div>
        <div className="text-white/80">Digital surprise. Physical delivery. Unfair combo.</div>
      </div>,
      "Create a moment",
      openBuilder
    );
  }

  const heroPhrases = ["I'd choose you again.", "You feel like home.", "My favorite plan is still: you.", "I'll never stop choosing us.", "Somehow, it's always you."];
  const heroPhrase = heroPhrases[clamp(redLen % heroPhrases.length, 0, heroPhrases.length - 1)];

  return (
    <div className="min-h-screen text-white overflow-x-hidden">
      <NeonBg />

      {/* Info popup */}
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
      />

      {/* Link popup (after create) */}
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

      {/* Top nav - Mobile optimized */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#050816]/85 backdrop-blur supports-[backdrop-filter]:bg-[#050816]/55">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-5 sm:py-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-2xl bg-white/8 ring-1 ring-white/12 flex items-center justify-center">
              <span className="text-fuchsia-300">
                <IconHeart className="h-4 w-4 sm:h-5 sm:w-5" />
              </span>
            </div>
            <div className="text-sm font-semibold tracking-tight hidden sm:block">
              Love<span className="text-fuchsia-300">Wheel</span>
            </div>
            <div className="text-sm font-semibold tracking-tight sm:hidden">
              LW
            </div>
          </div>

          <nav className="hidden items-center gap-5 text-sm text-white/70 md:flex">
            <button type="button" className="hover:text-white transition" onClick={openPricing}>
              Pricing
            </button>

            {/* FAQ now scrolls */}
            <button
              type="button"
              className="hover:text-white transition"
              onClick={() => scrollToSection(faqRef)}
            >
              FAQ
            </button>

            {/* How it works now scrolls */}
            <button
              type="button"
              className="hover:text-white transition"
              onClick={() => scrollToSection(howItWorksRef)}
            >
              How it works
            </button>

            <button type="button" className="hover:text-white transition" onClick={openQrReader}>
              QR Reader
            </button>
          </nav>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              onClick={openBuilder}
              className="rounded-full bg-gradient-to-r from-fuchsia-500 via-pink-500 to-violet-500 text-white hover:opacity-95 text-sm px-4 py-2 sm:px-6"
            >
              Create
            </Button>
            
            {/* Mobile menu button */}
            <button 
              className="md:hidden flex flex-col gap-1 p-2"
              onClick={() => {
                openInfo(
                  "Menu",
                  <div className="space-y-3">
                    <button 
                      className="w-full text-left p-3 rounded-xl bg-white/5 hover:bg-white/10 transition"
                      onClick={openPricing}
                    >
                      Pricing
                    </button>
                    <button 
                      className="w-full text-left p-3 rounded-xl bg-white/5 hover:bg-white/10 transition"
                      onClick={() => scrollToSection(faqRef)}
                    >
                      FAQ
                    </button>
                    <button 
                      className="w-full text-left p-3 rounded-xl bg-white/5 hover:bg-white/10 transition"
                      onClick={() => scrollToSection(howItWorksRef)}
                    >
                      How it works
                    </button>
                    <button 
                      className="w-full text-left p-3 rounded-xl bg-white/5 hover:bg-white/10 transition"
                      onClick={openQrReader}
                    >
                      QR Reader
                    </button>
                  </div>
                );
              }}
            >
              <div className="w-5 h-0.5 bg-white/70"></div>
              <div className="w-5 h-0.5 bg-white/70"></div>
              <div className="w-5 h-0.5 bg-white/70"></div>
            </button>
          </div>
        </div>
      </header>

      {/* HERO - Mobile optimized */}
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-5 sm:py-12 md:py-16">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/6 px-3 py-1 text-xs text-white/70 backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-fuchsia-400" />
              Designed to land like a memory
            </div>

            <h1 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl">
              Surprise{" "}
              <span className="bg-gradient-to-r from-white via-fuchsia-200 to-pink-200 bg-clip-text text-transparent">
                your love
              </span>
            </h1>

            <p className="mt-4 max-w-xl text-white/65 text-sm sm:text-base">
              Create a live relationship counter, a private line, a photo reveal, and a letter. Share via link or QR — then unlock
              the premium spin → reveal.
            </p>

            <div className="mt-6 flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-3">
              <Button
                type="button"
                onClick={openBuilder}
                className="h-12 rounded-full px-7 bg-gradient-to-r from-fuchsia-500 via-pink-500 to-violet-500 text-white shadow-[0_20px_80px_-40px_rgba(255,64,169,0.75)] hover:opacity-95 w-full sm:w-auto"
              >
                Start creating
              </Button>

              <Button
                type="button"
                variant="secondary"
                className="h-12 rounded-full border border-white/12 bg-white/6 text-white hover:bg-white/10 w-full sm:w-auto"
                onClick={() =>
                  toast.message("Quick tip", {
                    description: "The best gifts feel like one private detail. Start there.",
                  })
                }
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

            <div className="mt-8 grid max-w-xl gap-3 sm:grid-cols-3">
              <button
                type="button"
                onClick={() =>
                  openInfo(
                    "How long does it take?",
                    <div className="space-y-3">
                      <div>Usually 2–3 minutes.</div>
                      <div className="text-white/80">The "perfect" version takes longer, but the best version is the honest one.</div>
                    </div>,
                    "Start now",
                    openBuilder
                  )
                }
                className="text-left rounded-2xl border border-white/12 bg-white/6 p-4 backdrop-blur hover:bg-white/10 transition"
              >
                <div className="text-[11px] text-white/55">Takes</div>
                <div className="mt-1 text-lg font-semibold text-white/90">2–3 min</div>
              </button>

              <button
                type="button"
                onClick={openQrReader}
                className="text-left rounded-2xl border border-white/12 bg-white/6 p-4 backdrop-blur hover:bg-white/10 transition"
              >
                <div className="text-[11px] text-white/55">Share</div>
                <div className="mt-1 text-lg font-semibold text-white/90">Link + QR</div>
              </button>

              <button
                type="button"
                onClick={openPricing}
                className="text-left rounded-2xl border border-white/12 bg-white/6 p-4 backdrop-blur hover:bg-white/10 transition"
              >
                <div className="text-[11px] text-white/55">Unlock</div>
                <div className="mt-1 text-lg font-semibold text-white/90">{PRICE_USD}</div>
              </button>
            </div>
          </div>

          {/* Mobile Preview - Hidden on desktop */}
          <div className="lg:hidden">
            <MiniWheelPreview />
          </div>
          
          {/* Desktop Hero Art - Hidden on mobile */}
          <div className="hidden lg:block">
            <HeroArt phrase={heroPhrase} />
          </div>
        </div>

        <div className="mt-10 flex items-center justify-center gap-6 text-white/55">
          <div className="hidden sm:block text-xs">+723 happy couples</div>
        </div>

        {/* Mobile Preview Section */}
        <MobilePreviewSection />

        {/* Sections with click → popup */}
        <div className="mt-12 grid gap-5 md:grid-cols-2">
          {/* Pricing */}
          <button
            type="button"
            onClick={openPricing}
            className="text-left rounded-3xl border border-white/12 bg-white/6 p-6 backdrop-blur transition hover:bg-white/10"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/6 px-3 py-1 text-xs text-white/70 backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-fuchsia-400" />
              Pricing
            </div>
            <div className="mt-3 text-2xl font-semibold text-white/90">{PRICE_USD} to unlock</div>
            <div className="mt-2 text-sm text-white/65">The number is small. The emotional value is outrageous. Click to see what's included.</div>
          </button>

          {/* QR Reader */}
          <button
            type="button"
            onClick={openQrReader}
            className="text-left rounded-3xl border border-white/12 bg-white/6 p-6 backdrop-blur transition hover:bg-white/10"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/6 px-3 py-1 text-xs text-white/70 backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
              QR Reader
            </div>
            <div className="mt-3 text-2xl font-semibold text-white/90">Print it. Seal it. Deliver it.</div>
            <div className="mt-2 text-sm text-white/65">We generate a QR code for your link so you can place it inside a letter for the ultimate surprise.</div>
          </button>
        </div>

        {/* FAQ */}
        <div ref={faqRef} className="mt-10 scroll-mt-28">
          <div className="flex items-center justify-between">
            <div className="text-xl font-semibold text-white/90">FAQ</div>
            <button
              type="button"
              onClick={() =>
                openInfo(
                  "FAQ",
                  <div className="space-y-3">
                    <div>Tap any question on the page and it opens a detailed answer.</div>
                    <div className="text-white/80">We designed this to feel like exploring, not reading.</div>
                  </div>
                )
              }
              className="text-xs text-white/60 hover:text-white transition"
            >
              What's this?
            </button>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
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
                className="text-left rounded-2xl border border-white/12 bg-white/6 p-4 backdrop-blur transition hover:bg-white/10"
              >
                <div className="text-sm font-semibold text-white/90">{item.q}</div>
                <div className="mt-1 text-xs text-white/60">Click to open the full answer.</div>
              </button>
            ))}
          </div>
        </div>

        {/* How it works */}
        <div ref={howItWorksRef} className="mt-10 scroll-mt-28">
          <div className="text-xl font-semibold text-white/90">How it works</div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {[
              { id: "build", title: "Build", desc: "Write the four pieces that make it real." },
              { id: "share", title: "Share", desc: "Send by link or a printed QR in a letter." },
              { id: "reveal", title: "Reveal", desc: "They spin. They discover. It lands." },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => openHowItWorksItem(item.id)}
                className="text-left rounded-2xl border border-white/12 bg-white/6 p-5 backdrop-blur transition hover:bg-white/10"
              >
                <div className="inline-flex items-center gap-2 text-xs text-white/60">
                  <IconSpark className="h-4 w-4 text-white/55" />
                  Step
                </div>
                <div className="mt-2 text-lg font-semibold text-white/90">{item.title}</div>
                <div className="mt-1 text-sm text-white/65">{item.desc}</div>
                <div className="mt-3 text-xs text-white/60">Click to open details.</div>
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
      >
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-5">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/6 px-3 py-1 text-xs text-white/70 backdrop-blur">
            <span className={cx("h-1.5 w-1.5 rounded-full", a.dot)} />
            Premium builder
          </div>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white/90 sm:text-3xl">{headline}</h2>
          <p className="mt-2 text-sm text-white/60">{sub}</p>
          <MinimalProgress step={step} progress={progress} />
        </motion.div>

        <div className="relative">
          <motion.div
            className={cx("pointer-events-none absolute -inset-2 rounded-[34px] blur-2xl", "bg-gradient-to-r", a.glow)}
            animate={{ opacity: [0.18, 0.34, 0.18], scale: [1, 1.015, 1] }}
            transition={{ duration: 4.4, ease: "easeInOut", repeat: Infinity }}
          />

          <div className={cx("relative rounded-[32px] ring-1", a.ring)}>
            <Card className="border border-white/12 bg-white/6 shadow-[0_30px_140px_-80px_rgba(0,0,0,0.9)] backdrop-blur">
              <CardContent className="relative p-6 sm:p-8">
                {!reduce && (
                  <AnimatePresence>
                    {typing && (
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
                          className="absolute -bottom-12 right-10 h-28 w-28 rounded-full bg-violet-500/10 blur-2xl"
                          animate={{ y: [0, -16, 0], x: [0, -10, 0] }}
                          transition={{ duration: 3.0, ease: "easeInOut", repeat: Infinity }}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                )}

                <AnimatePresence mode="wait">
                  {/* STEP: RED */}
                  {step === "red" && (
                    <motion.div key="red" {...scene} className="space-y-6">
                      <div className="flex items-end justify-between gap-4">
                        <div>
                          <div className="text-xs text-white/55">Step 1 of 4</div>
                          <div className="mt-1 text-2xl font-semibold tracking-tight text-white/90">Write the line that stops them.</div>
                          <div className="mt-2 text-sm text-white/60">
                            Aim for <span className="text-white/85">specific</span>, not perfect.
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/12 bg-white/6 px-3 py-2 text-xs text-white/60">
                          <span className="text-white/85">{redLen}</span>/80
                        </div>
                      </div>

                      <div className={cx("rounded-3xl border border-white/12 bg-white/6 p-6", a.stroke)}>
                        <Label htmlFor="redPhrase" className="text-xs text-white/60">
                          Your line (the one they'll replay)
                        </Label>

                        <div className="relative mt-2">
                          <motion.div
                            className="pointer-events-none absolute -inset-2 rounded-3xl bg-gradient-to-r from-fuchsia-500/16 via-pink-500/10 to-violet-500/10 blur-xl"
                            animate={{ opacity: [0.12, 0.24, 0.12] }}
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
                                className="relative h-12 rounded-2xl text-base bg-white/5 text-white placeholder:text-white/35 border-white/12 focus-visible:ring-2 focus-visible:ring-white/15"
                              />
                            );
                          })()}
                        </div>

                        <FieldError msg={form.formState.errors.redPhrase?.message} />

                        <div className="mt-4 rounded-2xl border border-white/12 bg-white/5 p-4 text-xs text-white/60">
                          <div className="font-medium text-white/85">Make it hit:</div>
                          <div className="mt-2 grid gap-1">
                            <div>• Mention a shared thing: a place, a joke, a habit.</div>
                            <div>• Keep it short enough to screenshot.</div>
                            <div>• Avoid "you're amazing" — say why, once.</div>
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
                        <Button
                          type="button"
                          variant="secondary"
                          className="rounded-full border border-white/12 bg-white/6 text-white hover:bg-white/10"
                          onClick={() => {
                            setBuilderOpen(false);
                            softHaptic(8);
                          }}
                        >
                          Close
                        </Button>

                        <div className="flex items-center gap-3">
                          <KeyHint>
                            <span className="font-mono">Enter</span> to continue
                          </KeyHint>
                          <Button
                            type="button"
                            onClick={next}
                            disabled={!canAdvanceFrom("red")}
                            className="rounded-full px-6 bg-gradient-to-r from-fuchsia-500 via-pink-500 to-violet-500 text-white hover:opacity-95 disabled:opacity-60"
                          >
                            Continue
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* STEP: GREEN */}
                  {step === "green" && (
                    <motion.div key="green" {...scene} className="space-y-6">
                      <div className="flex items-end justify-between gap-4">
                        <div>
                          <div className="text-xs text-white/55">Step 2 of 4</div>
                          <div className="mt-1 text-2xl font-semibold tracking-tight text-white/90">Pick the day it began.</div>
                          <div className="mt-2 text-sm text-white/60">This powers the live counter.</div>
                        </div>

                        <div className="rounded-2xl border border-white/12 bg-white/6 px-3 py-2 text-xs text-white/60">
                          <span className="text-white/85">{duration}</span>
                        </div>
                      </div>

                      <div className={cx("rounded-3xl border border-white/12 bg-white/6 p-6", a.stroke)}>
                        <Label htmlFor="relationshipStartAt" className="text-xs text-white/60">
                          Relationship start date
                        </Label>

                        <div className="relative mt-2">
                          <motion.div
                            className="pointer-events-none absolute -inset-2 rounded-3xl bg-gradient-to-r from-emerald-400/12 via-sky-400/10 to-fuchsia-500/10 blur-xl"
                            animate={{ opacity: [0.10, 0.22, 0.10] }}
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
                                className="relative h-12 rounded-2xl text-base bg-white/5 text-white border-white/12 focus-visible:ring-2 focus-visible:ring-white/15"
                              />
                            );
                          })()}
                        </div>

                        <FieldError msg={form.formState.errors.relationshipStartAt?.message} />

                        <div className="mt-4 rounded-2xl border border-white/12 bg-white/5 p-4 text-xs text-white/60">
                          Choose the date that feels true — the first "we" moment, not the first message.
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <Button
                          type="button"
                          variant="secondary"
                          className="rounded-full border border-white/12 bg-white/6 text-white hover:bg-white/10"
                          onClick={back}
                        >
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
                            className="rounded-full px-6 bg-gradient-to-r from-emerald-400 via-sky-400 to-fuchsia-500 text-white hover:opacity-95 disabled:opacity-60"
                          >
                            Continue
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* STEP: PHOTO */}
                  {step === "photo" && (
                    <motion.div key="photo" {...scene} className="space-y-6">
                      <div className="flex items-end justify-between gap-4">
                        <div>
                          <div className="text-xs text-white/55">Step 3 of 4</div>
                          <div className="mt-1 text-2xl font-semibold tracking-tight text-white/90">Choose the photo that says everything.</div>
                          <div className="mt-2 text-sm text-white/60">
                            This is the <span className="text-white/85">reveal</span>. Pick the most meaningful one.
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/12 bg-white/6 px-3 py-2 text-xs text-white/60">
                          <span className="text-white/85">{photoFile ? "Selected" : "Missing"}</span>
                        </div>
                      </div>

                      <div className={cx("rounded-3xl border border-white/12 bg-white/6 p-6", a.stroke)}>
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold tracking-tight text-white/90">Couple photo</div>
                            <div className="mt-1 text-xs text-white/55">JPG/PNG/WebP • up to {MAX_PHOTO_MB}MB</div>
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
                            "mt-4 rounded-2xl border border-white/12 bg-white/5 p-4 transition",
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
                              <div className="max-w-sm text-xs text-white/60">
                                Pick the photo that makes your chest feel warm. A laugh. A trip. A night you'll never forget.
                              </div>
                            </div>
                          ) : (
                            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                              <div className="relative overflow-hidden rounded-2xl border border-white/12 bg-white/5">
                                <img src={photoPreviewUrl} alt="Selected couple photo preview" className="h-[260px] w-full object-cover" />
                                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
                                <div className="pointer-events-none absolute bottom-3 left-3 text-xs text-white/85">This will be revealed after payment.</div>
                              </div>

                              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-white/60">
                                <div className="truncate">
                                  <span className="text-white/85">{photoFile?.name}</span>
                                </div>
                                <div>{photoFile ? `${Math.round(photoFile.size / 1024)} KB` : ""}</div>
                              </div>
                            </motion.div>
                          )}
                        </div>

                        {!photoFile ? (
                          <div className="mt-3 text-xs text-white/60">Choose carefully — this is the "oh wow" moment.</div>
                        ) : (
                          <div className="mt-3 text-xs text-white/60">Perfect. This is the moment.</div>
                        )}
                      </div>

                      <div className="flex items-center justify-between">
                        <Button
                          type="button"
                          variant="secondary"
                          className="rounded-full border border-white/12 bg-white/6 text-white hover:bg-white/10"
                          onClick={back}
                        >
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
                            className="rounded-full px-6 bg-gradient-to-r from-sky-400 via-violet-500 to-fuchsia-500 text-white hover:opacity-95 disabled:opacity-60"
                          >
                            Continue
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* STEP: YELLOW */}
                  {step === "yellow" && (
                    <motion.div key="yellow" {...scene} className="space-y-6">
                      <div className="flex items-end justify-between gap-4">
                        <div>
                          <div className="text-xs text-white/55">Step 4 of 4</div>
                          <div className="mt-1 text-2xl font-semibold tracking-tight text-white/90">Write the letter they'll keep.</div>
                          <div className="mt-2 text-sm text-white/60">One memory + one gratitude + one promise. Keep it real.</div>
                        </div>

                        <div className="rounded-2xl border border-white/12 bg-white/6 px-3 py-2 text-xs text-white/60">
                          <span className="text-white/85">{letterLen}</span>/4000
                        </div>
                      </div>

                      <div className={cx("rounded-3xl border border-white/12 bg-white/6 p-6", a.stroke)}>
                        <Label htmlFor="loveLetter" className="text-xs text-white/60">
                          Your letter (make it undeniable)
                        </Label>

                        <div className="relative mt-2">
                          <motion.div
                            className="pointer-events-none absolute -inset-2 rounded-3xl bg-gradient-to-r from-amber-300/12 via-fuchsia-500/10 to-sky-400/10 blur-xl"
                            animate={{ opacity: [0.10, 0.24, 0.10] }}
                            transition={{ duration: 3.2, ease: "easeInOut", repeat: Infinity }}
                          />
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
                                  form.setValue("loveLetter", e.target.value, {
                                    shouldValidate: true,
                                    shouldDirty: true,
                                  });
                                  pingTyping();
                                }}
                                className="relative min-h-[240px] rounded-2xl text-base bg-white/5 text-white placeholder:text-white/35 border-white/12 focus-visible:ring-2 focus-visible:ring-white/15"
                              />
                            );
                          })()}
                        </div>

                        <FieldError msg={form.formState.errors.loveLetter?.message} />

                        <div className="mt-4 rounded-2xl border border-white/12 bg-white/5 p-4 text-xs text-white/60">
                          <div className="font-medium text-white/85">A simple structure that works:</div>
                          <div className="mt-2 grid gap-1">
                            <div>• A memory: "I still think about…"</div>
                            <div>• A thank you: "You changed my life by…"</div>
                            <div>• A promise: "I will always…"</div>
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

                        <div className="mt-4 text-xs text-white/55">
                          Shortcut: <span className="font-mono">Ctrl+Enter</span> to continue.
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <Button
                          type="button"
                          variant="secondary"
                          className="rounded-full border border-white/12 bg-white/6 text-white hover:bg-white/10"
                          onClick={back}
                        >
                          Back
                        </Button>
                        <Button
                          type="button"
                          onClick={next}
                          disabled={!canAdvanceFrom("yellow")}
                          className="rounded-full px-6 bg-gradient-to-r from-amber-300 via-fuchsia-500 to-sky-400 text-[#050816] hover:opacity-95 disabled:opacity-60"
                        >
                          Review
                        </Button>
                      </div>
                    </motion.div>
                  )}

                  {/* STEP: CONFIRM */}
                  {step === "confirm" && (
                    <motion.div key="confirm" {...scene} className="space-y-6">
                      <div className="flex flex-wrap items-end justify-between gap-3">
                        <div>
                          <div className="text-xs text-white/55">Preview</div>
                          <div className="mt-1 text-2xl font-semibold tracking-tight text-white/90">Preview it like it's already theirs.</div>
                          <div className="mt-2 text-sm text-white/60">If it hits, create the link — we'll open your unlock popup immediately.</div>
                          <button type="button" onClick={openPricing} className="mt-2 text-[11px] text-white/55 hover:text-white transition">
                            {PRICE_MICROCOPY}
                          </button>
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
                        <Button
                          type="button"
                          variant="secondary"
                          className="rounded-full border border-white/12 bg-white/6 text-white hover:bg-white/10"
                          onClick={back}
                        >
                          Back
                        </Button>

                        <div className="flex flex-col items-end gap-1">
                          <Button
                            type="button"
                            onClick={form.handleSubmit(onCreate)}
                            disabled={!canSubmit}
                            className="rounded-full px-6 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500 text-white hover:opacity-95 disabled:opacity-60"
                          >
                            {isSubmitting ? "Creating…" : "Create gift link"}
                          </Button>
                          <button type="button" onClick={openPricing} className="text-[11px] text-white/55 hover:text-white transition">
                            You'll pay to unlock the reveal next · <span className="text-white/85">{PRICE_USD}</span>
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="mt-5 text-center text-xs text-white/55">You're not filling a form — you're setting up a moment.</div>
      </BuilderModal>
    </div>
  );
}
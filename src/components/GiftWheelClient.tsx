// Crie este arquivo em: src/components/GiftWheelClient.tsx
"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

// Ícones que precisamos
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

function IconSound({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path
        d="M14 4a1 1 0 00-1.6-.8l-3.8 2.9H4a2 2 0 00-2 2v4a2 2 0 002 2h4.6l3.8 2.9a1 1 0 001.6-.8V4zm-4 5a1 1 0 00-1.7-.7 1 1 0 00-.3.7v2a1 1 0 001 1 1 1 0 001-1V9zm3 3a1 1 0 00-1.7-.7 1 1 0 00-.3.7v2a1 1 0 001 1 1 1 0 001-1v-2zm3-3a1 1 0 00-1.7-.7 1 1 0 00-.3.7v4a1 1 0 001 1 1 1 0 001-1V9z"
        fill="currentColor"
      />
    </svg>
  );
}

function IconRestart({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path
        d="M17.6 6.3A8 8 0 0119 12a8 8 0 01-8 8 8 8 0 01-8-8 8 8 0 018-8c1.8 0 3.4.6 4.8 1.7l-2.5 2.5H19V3l-1.4 1.4a10 10 0 00-7.6-3.4C5.4 1 1 5.4 1 11s4.4 10 10 10 10-4.4 10-10c0-2.6-1-5-2.7-6.9l-1.7 1.2z"
        fill="currentColor"
      />
    </svg>
  );
}

function IconShare({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path
        d="M18 16c-.8 0-1.5.3-2 .8l-7-4.2c.1-.2.1-.4.1-.6s0-.4-.1-.6l7-4.2c.5.5 1.2.8 2 .8 1.7 0 3-1.3 3-3s-1.3-3-3-3-3 1.3-3 3c0 .2 0 .4.1.6l-7 4.2c-.5-.5-1.2-.8-2-.8-1.7 0-3 1.3-3 3s1.3 3 3 3c.8 0 1.5-.3 2-.8l7 4.2c-.1.2-.1.4-.1.6 0 1.7 1.3 3 3 3s3-1.3 3-3-1.3-3-3-3z"
        fill="currentColor"
      />
    </svg>
  );
}

function IconLock({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path
        d="M18 8h-1V6c0-2.8-2.2-5-5-5S7 3.2 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.7 1.3-3 3-3s3 1.3 3 3v2z"
        fill="currentColor"
      />
    </svg>
  );
}

interface GiftWheelClientProps {
  slug: string;
  gift: any;
  needsPayment: boolean;
}

function softHaptic(pattern: number | number[] = 10) {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      (navigator as any).vibrate(pattern);
    }
  } catch {
    // ignore
  }
}

export default function GiftWheelClient({ slug, gift, needsPayment }: GiftWheelClientProps) {
  const [selectedColor, setSelectedColor] = React.useState<string | null>(null);
  const [spinsLeft, setSpinsLeft] = React.useState(4);
  const [journey, setJourney] = React.useState<string[]>([]);
  const [isSpinning, setIsSpinning] = React.useState(false);
  const [isUnlocked, setIsUnlocked] = React.useState(!needsPayment);
  const [showPaymentModal, setShowPaymentModal] = React.useState(false);
  
  const reduce = useReducedMotion();
  
  const colors = [
    { 
      name: "Gold", 
      description: "Personal love letter", 
      bg: "bg-gradient-to-b from-amber-300 to-amber-500",
      content: gift?.loveLetter || "A heartfelt letter just for you..."
    },
    { 
      name: "Sapphire", 
      description: "Cherished photo memory", 
      bg: "bg-gradient-to-b from-blue-400 to-blue-600",
      content: gift?.photoUrl ? (
        <img 
          src={gift.photoUrl} 
          alt="Cherished memory" 
          className="w-full h-full object-cover rounded-2xl"
        />
      ) : "A special photo memory..."
    },
    { 
      name: "Emerald", 
      description: "Relationship timeline", 
      bg: "bg-gradient-to-b from-emerald-400 to-emerald-600",
      content: gift?.relationshipStartAt ? (
        <div className="text-center p-4">
          <div className="text-4xl font-bold text-white mb-2">
            {calculateDuration(gift.relationshipStartAt)}
          </div>
          <div className="text-white/70">Together since {formatDate(gift.relationshipStartAt)}</div>
        </div>
      ) : "Your journey together..."
    },
    { 
      name: "Rose", 
      description: "Special phrase for you", 
      bg: "bg-gradient-to-b from-pink-400 to-pink-600",
      content: gift?.redPhrase || "A special message just for you..."
    },
  ];

  function calculateDuration(startDate: string) {
    const start = new Date(startDate);
    const now = new Date();
    
    let years = now.getFullYear() - start.getFullYear();
    let months = now.getMonth() - start.getMonth();
    let days = now.getDate() - start.getDate();
    
    if (days < 0) {
      const prevMonthDays = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
      days += prevMonthDays;
      months -= 1;
    }
    if (months < 0) {
      months += 12;
      years -= 1;
    }
    
    const parts: string[] = [];
    if (years) parts.push(`${years}y`);
    if (months) parts.push(`${months}m`);
    if (!years && !months) parts.push(`${days}d`);
    
    return parts.join(" ") || "Just started";
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }

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

  const handleUnlock = () => {
    if (!needsPayment) {
      setIsUnlocked(true);
      toast.success("Content unlocked!", { description: "Enjoy your special moments." });
      softHaptic([10, 20, 10]);
    } else {
      setShowPaymentModal(true);
    }
  };

  const handlePayment = () => {
    // Redirecionar para checkout
    window.location.href = `/api/checkout?giftId=${gift.id}`;
  };

  if (needsPayment && !isUnlocked) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white p-4 flex items-center justify-center">
        <div className="max-w-md w-full text-center">
          <div className="mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-r from-fuchsia-500/20 to-violet-500/20 mb-4">
              <IconLock className="h-10 w-10 text-fuchsia-300" />
            </div>
            <h1 className="text-3xl font-bold mb-2">Unlock the Love Wheel</h1>
            <p className="text-white/60">This special gift is waiting for you</p>
          </div>
          
          <div className="bg-white/5 rounded-3xl p-6 border border-white/10 mb-6">
            <div className="text-left mb-4">
              <div className="text-white/70 text-sm mb-1">Created with love for you</div>
              <div className="text-xl font-semibold">A Special Surprise</div>
            </div>
            
            <div className="grid grid-cols-2 gap-3 mb-6">
              {colors.map((color) => (
                <div key={color.name} className="rounded-xl bg-white/5 p-3 border border-white/10">
                  <div className="flex items-center gap-2">
                    <div className={`w-6 h-6 rounded-full ${color.bg}`} />
                    <div className="text-sm font-medium">{color.name}</div>
                  </div>
                  <div className="text-xs text-white/60 mt-1">{color.description}</div>
                </div>
              ))}
            </div>
            
            <div className="text-center">
              <div className="text-white/70 text-sm mb-2">Unlock all 4 surprises</div>
              <div className="text-2xl font-bold text-fuchsia-300">$4.90</div>
              <div className="text-xs text-white/50 mt-1">One-time payment · No subscription</div>
            </div>
          </div>
          
          <Button
            onClick={handlePayment}
            className="w-full py-6 rounded-2xl bg-gradient-to-r from-fuchsia-500 via-pink-500 to-violet-500 text-white text-lg font-bold hover:opacity-90"
          >
            Unlock Now for $4.90
          </Button>
          
          <div className="mt-6 text-sm text-white/50">
            <p>After payment, you'll be able to spin the wheel and discover all the surprises</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white p-4">
      {/* Header */}
      <header className="max-w-sm mx-auto mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-r from-fuchsia-500/20 to-violet-500/20 flex items-center justify-center">
              <IconHeart className="h-6 w-6 text-fuchsia-300" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">Love Wheel</h1>
              <div className="text-xs text-white/60">A gift just for you</div>
            </div>
          </div>
          
          {isUnlocked && (
            <div className="text-right">
              <div className="text-xs text-white/60">Spins left</div>
              <div className="text-xl font-bold">{spinsLeft}</div>
            </div>
          )}
        </div>
      </header>

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
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                toast.success("Link copied!", { description: "Share this special moment" });
                softHaptic(10);
              }}
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

        {/* Content Modal */}
        {selectedColor && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-md w-full rounded-3xl overflow-hidden bg-gradient-to-b from-gray-900 to-black border border-white/15"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full ${colors.find(c => c.name === selectedColor)?.bg}`} />
                    <div>
                      <h3 className="text-xl font-bold">{selectedColor}</h3>
                      <p className="text-sm text-white/60">
                        {colors.find(c => c.name === selectedColor)?.description}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedColor(null)}
                    className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20"
                  >
                    ✕
                  </button>
                </div>
                
                <div className="rounded-2xl bg-white/5 p-4 min-h-[200px] border border-white/10">
                  {colors.find(c => c.name === selectedColor)?.content}
                </div>
                
                <div className="mt-6">
                  <Button
                    onClick={() => setSelectedColor(null)}
                    className="w-full py-3 rounded-xl bg-white/10 text-white hover:bg-white/20"
                  >
                    Close
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}
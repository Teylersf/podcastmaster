"use client";

import { motion } from "framer-motion";

export default function WaveformAnimation() {
  const bars = 15;

  return (
    <div className="flex items-center justify-center gap-1 h-16">
      {Array.from({ length: bars }).map((_, i) => (
        <motion.div
          key={i}
          className="w-1.5 rounded-full bg-gradient-to-t from-[var(--accent-primary)] to-[var(--accent-secondary)]"
          initial={{ height: 8 }}
          animate={{
            height: [8, Math.random() * 50 + 14, 8],
          }}
          transition={{
            duration: 0.8 + Math.random() * 0.4,
            repeat: Infinity,
            delay: i * 0.05,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}


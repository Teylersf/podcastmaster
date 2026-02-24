"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Palette, Check, ChevronDown } from "lucide-react";
import { useTheme, themes, ThemeName } from "./ThemeProvider";

export default function ThemeSelector() {
  const { theme, setTheme, hasUserChosen } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const tooltipTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const currentTheme = themes.find((t) => t.id === theme) || themes[0];

  // Show tooltip on first hover if user hasn't chosen a theme yet
  const handleMouseEnter = () => {
    if (!hasUserChosen && !isOpen) {
      tooltipTimeoutRef.current = setTimeout(() => {
        setShowTooltip(true);
      }, 300);
    }
  };

  const handleMouseLeave = () => {
    if (tooltipTimeoutRef.current) {
      clearTimeout(tooltipTimeoutRef.current);
    }
    setShowTooltip(false);
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      if (tooltipTimeoutRef.current) {
        clearTimeout(tooltipTimeoutRef.current);
      }
    };
  }, []);

  // Hide tooltip when dropdown opens
  useEffect(() => {
    if (isOpen) {
      setShowTooltip(false);
    }
  }, [isOpen]);

  return (
    <div 
      className="relative" 
      ref={dropdownRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Tooltip */}
      <AnimatePresence>
        {showTooltip && !isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 5, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 px-3 py-2 rounded-lg bg-(--bg-elevated) border border-(--border-medium) shadow-lg z-50 whitespace-nowrap"
          >
            <div className="flex items-center gap-2 text-sm">
              <Palette className="w-4 h-4 text-(--accent-primary)" />
              <span className="text-(--text-secondary)">
                Change theme here — <span className="text-(--accent-primary) font-medium">19 themes</span> available!
              </span>
            </div>
            {/* Tooltip arrow */}
            <div className="absolute -top-1.5 right-6 w-3 h-3 rotate-45 bg-(--bg-elevated) border-l border-t border-(--border-medium)" />
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-(--border-subtle) hover:border-(--accent-primary) transition-all text-sm bg-(--bg-secondary)"
        aria-label="Change theme"
      >
        <span className="text-base">{currentTheme.icon}</span>
        <span className="hidden sm:inline text-(--text-secondary)">{currentTheme.name}</span>
        <ChevronDown className={`w-4 h-4 text-(--text-muted) transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-56 max-h-80 overflow-y-auto rounded-xl border border-(--border-subtle) bg-(--bg-card) shadow-xl z-50"
          >
            <div className="p-2">
              <div className="px-3 py-2 text-xs font-medium text-(--text-muted) uppercase tracking-wider flex items-center gap-2">
                <Palette className="w-3 h-3" />
                Choose Theme ({themes.length})
              </div>
              <div className="space-y-1">
                {themes.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      setTheme(t.id as ThemeName);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all ${
                      theme === t.id
                        ? "bg-(--accent-muted) text-(--accent-primary)"
                        : "hover:bg-(--bg-tertiary) text-(--text-secondary)"
                    }`}
                  >
                    <span className="text-lg">{t.icon}</span>
                    <span className="flex-1 text-sm font-medium">{t.name}</span>
                    {theme === t.id && (
                      <Check className="w-4 h-4 text-(--accent-primary)" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

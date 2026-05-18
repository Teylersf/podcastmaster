"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type ThemeName =
  | "version-3"
  | "glassmorphism"
  | "light"
  | "dark"
  | "pretty-pink"
  | "blue"
  | "green-ocean"
  | "purple-galaxy"
  | "boring-enterprise"
  | "grey-alien"
  | "matrix"
  | "hand-written"
  | "coloring-book"
  | "rainbow"
  | "chaos"
  | "orange-slim"
  | "yellow-sunshine"
  | "90s"
  | "80s"
  | "cringe"
  | "black-and-white";

export interface ThemeInfo {
  id: ThemeName;
  name: string;
  icon: string;
}

export const themes: ThemeInfo[] = [
  { id: "version-3", name: "Version 3 ✨ NEW", icon: "🚀" },
  { id: "glassmorphism", name: "Glassmorphism", icon: "🪟" },
  { id: "dark", name: "Dark", icon: "🌙" },
  { id: "light", name: "Light", icon: "☀️" },
  { id: "pretty-pink", name: "Pretty Pink", icon: "🌸" },
  { id: "blue", name: "Ocean Blue", icon: "🌊" },
  { id: "green-ocean", name: "Deep Sea", icon: "🐋" },
  { id: "purple-galaxy", name: "Purple Galaxy", icon: "🔮" },
  { id: "boring-enterprise", name: "Enterprise", icon: "💼" },
  { id: "grey-alien", name: "Grey Alien", icon: "👽" },
  { id: "matrix", name: "Matrix", icon: "💊" },
  { id: "hand-written", name: "Hand Written", icon: "✏️" },
  { id: "coloring-book", name: "Coloring Book", icon: "🖍️" },
  { id: "rainbow", name: "Rainbow", icon: "🌈" },
  { id: "chaos", name: "Chaos", icon: "🎭" },
  { id: "orange-slim", name: "Orange Slim", icon: "🍊" },
  { id: "yellow-sunshine", name: "Yellow Sunshine", icon: "🌻" },
  { id: "90s", name: "90s Vibes", icon: "📼" },
  { id: "80s", name: "80s Retro", icon: "🕹️" },
  { id: "cringe", name: "Cringe", icon: "😬" },
  { id: "black-and-white", name: "Black & White", icon: "⬛" },
];

interface ThemeContextType {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
  themes: ThemeInfo[];
  hasUserChosen: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Default theme for all users (v3 launch — was "glassmorphism" before)
const DEFAULT_THEME: ThemeName = "version-3";

// Check if a theme is valid
function isValidTheme(theme: string | null): theme is ThemeName {
  return theme !== null && themes.some((t) => t.id === theme);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>(DEFAULT_THEME);
  const [mounted, setMounted] = useState(false);
  const [hasUserChosen, setHasUserChosen] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // Priority:
    // 1. User's chosen theme (localStorage) - permanent choice
    // 2. Default to glassmorphism for everyone
    
    const userChosenTheme = localStorage.getItem("podcast-theme-chosen");
    
    let themeToUse: ThemeName;
    
    if (isValidTheme(userChosenTheme)) {
      // User has previously chosen a theme - use it
      themeToUse = userChosenTheme;
      setHasUserChosen(true);
    } else {
      // Default to the current launch theme for all new users
      themeToUse = DEFAULT_THEME;
    }
    
    setThemeState(themeToUse);
    document.documentElement.setAttribute("data-theme", themeToUse);
  }, []);

  const setTheme = (newTheme: ThemeName) => {
    setThemeState(newTheme);
    setHasUserChosen(true);
    // Save as user's permanent choice
    localStorage.setItem("podcast-theme-chosen", newTheme);
    // Also update session storage
    sessionStorage.setItem("podcast-theme-session", newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
  };

  // Prevent flash of wrong theme
  if (!mounted) {
    return (
      <div style={{ visibility: "hidden" }}>
        {children}
      </div>
    );
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, themes, hasUserChosen }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  
  // Return default values during SSR/build time when context isn't available
  if (context === undefined) {
    return {
      theme: "version-3" as ThemeName,
      setTheme: () => {},
      themes,
      hasUserChosen: false,
    };
  }
  
  return context;
}

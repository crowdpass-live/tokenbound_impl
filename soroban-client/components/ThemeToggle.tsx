"use client";

import { MoonStar, SunMedium } from "lucide-react";

import { useTheme } from "@/contexts/ThemeContext";

export default function ThemeToggle({ className = "" }: { className?: string }) {
  const { isReady, resolvedTheme, toggleTheme } = useTheme();
  const isDarkMode = resolvedTheme === "dark";
  const label = isDarkMode ? "Switch to light mode" : "Switch to dark mode";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-300/80 bg-white/70 px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-white md:px-4 dark:border-white/10 dark:bg-white/10 dark:text-zinc-100 dark:hover:bg-white/15 ${className}`.trim()}
      aria-label={label}
      title={label}
    >
      {isReady ? (
        isDarkMode ? (
          <SunMedium size={18} aria-hidden="true" />
        ) : (
          <MoonStar size={18} aria-hidden="true" />
        )
      ) : (
        <span className="h-[18px] w-[18px]" aria-hidden="true" />
      )}
      <span className="hidden lg:inline">{isDarkMode ? "Light" : "Dark"}</span>
    </button>
  );
}
"use client";
import React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

export default function Footer() {
  const t = useTranslations("footer");

  return (
    <footer className="bg-zinc-100 py-16 text-zinc-900 dark:bg-[#52525b] dark:text-white">
      <div className="container mx-auto px-4 md:px-8">
        <div className="mb-12 grid grid-cols-1 gap-8 md:grid-cols-4">
          {/* Brand & Newsletter */}
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <div className="grid grid-cols-2 gap-0.5">
                <div className="h-3 w-3 bg-zinc-900 dark:bg-white" />
                <div className="h-3 w-3 bg-zinc-900 dark:bg-white" />
                <div className="h-3 w-3 bg-zinc-900 dark:bg-white" />
                <div className="h-3 w-3 bg-zinc-500/40 dark:bg-white/50" />
              </div>
              <span className="text-2xl font-semibold tracking-tight">CrowdPass</span>
            </div>
            <p className="max-w-xs text-sm leading-relaxed text-zinc-600 dark:text-gray-200">{t("tagline")}</p>
            <div className="relative max-w-xs">
              <input
                type="email"
                placeholder={t("newsletter")}
                className="w-full rounded border border-zinc-300 bg-white px-4 py-3 pr-12 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-[#FF5722] focus:outline-none dark:border-gray-500 dark:bg-[#65656e] dark:text-white dark:placeholder-gray-300 dark:focus:border-white"
              />
              <button className="absolute right-1 top-1 bottom-1 bg-[#F97316] hover:bg-[#ea580c] text-white rounded px-3 flex items-center justify-center transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </div>
          </div>

          {/* Quick Links 1 */}
          <div className="md:ml-auto">
            <h3 className="mb-6 text-lg font-semibold">{t("quickLinks")}</h3>
            <ul className="space-y-4 text-sm text-zinc-600 dark:text-gray-200">
              <li><Link href="/" className="transition-colors hover:text-zinc-950 dark:hover:text-white">{t("home")}</Link></li>
              <li><Link href="/about" className="transition-colors hover:text-zinc-950 dark:hover:text-white">{t("about")}</Link></li>
              <li><Link href="/contact" className="transition-colors hover:text-zinc-950 dark:hover:text-white">{t("contact")}</Link></li>
            </ul>
          </div>

          {/* Quick Links 2 */}
          <div className="md:ml-auto">
            <h3 className="mb-6 text-lg font-semibold">{t("quickLinks")}</h3>
            <ul className="space-y-4 text-sm text-zinc-600 dark:text-gray-200">
              <li><Link href="/signup" className="transition-colors hover:text-zinc-950 dark:hover:text-white">{t("signUp")}</Link></li>
              <li><Link href="/login" className="transition-colors hover:text-zinc-950 dark:hover:text-white">{t("logIn")}</Link></li>
              <li><Link href="/terms" className="transition-colors hover:text-zinc-950 dark:hover:text-white">{t("terms")}</Link></li>
              <li><Link href="/privacy" className="transition-colors hover:text-zinc-950 dark:hover:text-white">{t("privacy")}</Link></li>
            </ul>
          </div>

          {/* Quick Links 3 */}
          <div className="md:ml-auto">
            <h3 className="mb-6 text-lg font-semibold">{t("quickLinks")}</h3>
            <ul className="space-y-4 text-sm text-zinc-600 dark:text-gray-200">
              <li><Link href="/create-event" className="transition-colors hover:text-zinc-950 dark:hover:text-white">{t("createEvent")}</Link></li>
              <li><Link href="/get-spok" className="transition-colors hover:text-zinc-950 dark:hover:text-white">{t("getSpok")}</Link></li>
              <li><Link href="/attend" className="transition-colors hover:text-zinc-950 dark:hover:text-white">{t("attendEvent")}</Link></li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-4 border-t border-zinc-300/80 pt-8 dark:border-gray-600/50 md:flex-row">
          <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-gray-300">
            <span>©</span>
            <span>{t("copyright", { year: new Date().getFullYear() })}</span>
          </div>
          <div className="flex items-center gap-4">
            {[
              <path key="fb" d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />,
              <>
                <rect key="ig-rect" x="2" y="2" width="20" height="20" rx="5" ry="5" />
                <path key="ig-path" d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                <line key="ig-line" x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
              </>,
              <>
                <path key="yt" d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.33 29 29 0 0 0-.46-5.33z" />
                <polygon key="yt-poly" points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" />
              </>,
              <>
                <path key="x1" d="M4 4l11.733 16h8.895L15 8 4 4z" />
                <path key="x2" d="M4 20l6.768-6.768m2.46-2.46L20 4" />
              </>,
            ].map((icon, i) => (
              <a key={i} href="#" className="rounded bg-[#F97316] p-1.5 text-white transition-colors hover:bg-[#ea580c]">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {icon}
                </svg>
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter, usePathname } from "next/navigation";
import { routing } from "@/i18n/routing";

const LOCALE_LABELS: Record<string, string> = {
  en: "EN",
  fr: "FR",
  ar: "ع",
};

export default function LanguageSwitcher() {
  const t = useTranslations("language");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const next = e.target.value;
    // Replace current locale segment in path
    const segments = pathname.split("/");
    segments[1] = next;
    router.push(segments.join("/") || "/");
  };

  return (
    <select
      value={locale}
      onChange={handleChange}
      aria-label={t("label")}
      className="cursor-pointer rounded-lg border border-zinc-300 bg-white/80 px-2 py-1 text-sm text-zinc-700 transition hover:bg-white focus:outline-none dark:border-gray-400 dark:bg-transparent dark:text-white dark:hover:bg-white/10"
    >
      {routing.locales.map((loc) => (
        <option key={loc} value={loc} className="bg-white text-zinc-900 dark:bg-[#525252] dark:text-white">
          {LOCALE_LABELS[loc]}
        </option>
      ))}
    </select>
  );
}

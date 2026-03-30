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
      className="bg-transparent border border-gray-400 text-white rounded-lg px-2 py-1 text-sm cursor-pointer focus:outline-none hover:bg-white/10 transition"
    >
      {routing.locales.map((loc) => (
        <option key={loc} value={loc} className="bg-[#525252] text-white">
          {LOCALE_LABELS[loc]}
        </option>
      ))}
    </select>
  );
}

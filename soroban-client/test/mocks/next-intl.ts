/**
 * Jest runs in CJS; `next-intl` ships ESM-only entrypoints that break without extra transpilation.
 * Tests only need stable strings from `useTranslations`.
 */
export function useTranslations(namespace: string) {
  return (key: string, values?: Record<string, unknown>) => {
    if (namespace === "hero") {
      const copy: Record<string, string> = {
        tagline: "EVENTS REIMAGINED",
        headline: "Secure Tickets",
        brand: "Seamless Access",
        cta: "Get Started",
      };
      return copy[key] ?? key;
    }

    if (namespace === "footer" && key === "copyright") {
      const year =
        typeof values?.year === "number"
          ? values.year
          : new Date().getFullYear();
      return `© ${year} All Rights Reserved, CrowdPass`;
    }

    return key;
  };
}

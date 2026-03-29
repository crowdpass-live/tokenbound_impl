import type { ReactNode } from "react";

/**
 * Mirrors `messages/en.json` for namespaces used in tests so assertions match production copy.
 */
const MESSAGES: Record<string, Record<string, string>> = {
  hero: {
    tagline: "Reinvent your events",
    headline: "Secure Tickets, Seamless Access — Anytime, Anywhere with",
    brand: "CrowdPass",
    cta: "Get Started",
  },
  footer: {
    tagline:
      "Step into the future with CrowdPass — where every ticket unlocks more than just entry, it tells a story of secure, seamless experiences. From exclusive events to unforgettable moments, your next adventure starts here.",
    newsletter: "Enter email to subscribe to our newsletter",
    quickLinks: "Quick Links",
    home: "Home",
    about: "About",
    contact: "Contact",
    signUp: "Sign Up",
    logIn: "Log In",
    terms: "Terms & Condition",
    privacy: "Privacy Policy",
    createEvent: "Create Event",
    getSpok: "Get SPOK",
    attendEvent: "Attend Event",
    copyright: "All Rights Reserved, CrowdPass {year}.",
  },
};

function interpolate(
  template: string,
  values?: Record<string, unknown>,
): string {
  if (!values) {
    return template;
  }
  return template.replace(/\{(\w+)\}/g, (_, name: string) =>
    values[name] !== undefined && values[name] !== null
      ? String(values[name])
      : "",
  );
}

/** Jest stub so components can import `next-intl` without loading ESM from node_modules. */
export function useTranslations(namespace?: string) {
  const dict = namespace ? (MESSAGES[namespace] ?? {}) : {};
  return function translate(key: string, values?: Record<string, unknown>) {
    const template = dict[key] ?? key;
    return interpolate(template, values);
  };
}

export function useLocale() {
  return "en";
}

export function NextIntlClientProvider({ children }: { children: ReactNode }) {
  return children;
}

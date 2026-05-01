type Messages = Record<string, any>;

export function useTranslations(_namespace?: string) {
  return (key: string, values?: Record<string, any>) => {
    if (key === "headline") return "Secure Tickets";
    if (key === "cta") return "Get Started";
    if (key === "brand") return "CrowdPass";
    if (key === "copyright") {
      const year = values?.year ?? "";
      return `All Rights Reserved, CrowdPass ${year}`.trim();
    }
    return key;
  };
}

export function useLocale() {
  return "en";
}

export function useMessages(): Messages {
  return {};
}

export function useFormatter() {
  return {
    dateTime: (value: Date | number | string) => String(value),
    number: (value: number) => String(value),
  };
}

export const NextIntlClientProvider = ({ children }: { children: any }) =>
  children;

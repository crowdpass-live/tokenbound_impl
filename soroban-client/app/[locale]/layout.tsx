import { env } from "@/lib/env";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "../globals.css";
import Footer from "@/components/Footer";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { WalletProvider } from "@/contexts/WalletContext";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { notFound } from "next/navigation";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(env.NEXT_PUBLIC_BASE_URL),
  title: "CrowdPass — Secure Event Ticketing on Stellar",
  description:
    "Decentralized event ticketing platform built on Stellar blockchain. Secure, transparent, and fraud-proof event management powered by blockchain technology.",
  keywords: ["event ticketing", "blockchain", "Stellar", "Soroban", "decentralized", "NFT tickets", "crypto events"],
  authors: [{ name: "CrowdPass" }],
  openGraph: {
    title: "CrowdPass — Secure Event Ticketing on Stellar",
    description:
      "Decentralized event ticketing platform built on Stellar blockchain. Secure, transparent, and fraud-proof event management powered by blockchain technology.",
    url: "https://crowdpassevents.com",
    siteName: "CrowdPass",
    images: [{ url: "/banner.jpg", width: 1200, height: 630, alt: "CrowdPass - Decentralized Event Ticketing on Stellar" }],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "CrowdPass — Secure Event Ticketing on Stellar",
    description:
      "Decentralized event ticketing platform built on Stellar blockchain. Secure, transparent, and fraud-proof event management powered by blockchain technology.",
    images: ["/banner.jpg"],
  },
  icons: { icon: "/logo.jpg", apple: "/logo.jpg" },
};

const RTL_LOCALES = ["ar"];

const THEME_INIT_SCRIPT = `
(() => {
  const storageKey = "crowdpass-theme";
  const storedTheme = window.localStorage.getItem(storageKey);
  const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  const theme = storedTheme === "light" || storedTheme === "dark" ? storedTheme : systemTheme;
  const root = document.documentElement;

  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
})();
`;

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as "en" | "fr" | "ar")) {
    notFound();
  }

  const messages = await getMessages();
  const dir = RTL_LOCALES.includes(locale) ? "rtl" : "ltr";

  return (
    <html lang={locale} dir={dir} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider>
          <NextIntlClientProvider messages={messages}>
            <WalletProvider>
              {children}
              <Footer />
            </WalletProvider>
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

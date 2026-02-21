import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Footer from "@/components/Footer";
import { WalletProvider } from "@/contexts/WalletContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'https://crowdpass.io'),
  title: "CrowdPass — Secure Event Ticketing on Stellar",
  description: "Decentralized event ticketing platform built on Stellar blockchain. Secure, transparent, and fraud-proof event management powered by blockchain technology.",
  keywords: ["event ticketing", "blockchain", "Stellar", "Soroban", "decentralized", "NFT tickets", "crypto events"],
  authors: [{ name: "CrowdPass" }],
  openGraph: {
    title: "CrowdPass — Secure Event Ticketing on Stellar",
    description: "Decentralized event ticketing platform built on Stellar blockchain. Secure, transparent, and fraud-proof event management powered by blockchain technology.",
    url: "https://crowdpassevents.com",
    siteName: "CrowdPass",
    images: [
      {
        url: "/banner.jpg",
        width: 1200,
        height: 630,
        alt: "CrowdPass - Decentralized Event Ticketing on Stellar",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "CrowdPass — Secure Event Ticketing on Stellar",
    description: "Decentralized event ticketing platform built on Stellar blockchain. Secure, transparent, and fraud-proof event management powered by blockchain technology.",
    images: ["/banner.jpg"],
  },
  icons: {
    icon: "/logo.jpg",
    apple: "/logo.jpg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <WalletProvider>
          {children}
          <Footer />
        </WalletProvider>
      </body>
    </html>
  );
}

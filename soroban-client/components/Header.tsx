"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";

import ThemeToggle from "@/components/ThemeToggle";
import { useTheme } from "@/contexts/ThemeContext";
import { useWallet } from "@/contexts/WalletContext";
import type { WalletProviderId } from "@/contexts/walletAdapters";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/events", label: "Events" },
  { href: "/marketplace", label: "Marketplace" },
  { href: "/my-tickets", label: "My Tickets" },
  { href: "/verifier", label: "Verifier" },
  { href: "/analytics", label: "Analytics" },
];

export default function Header() {
  const { resolvedTheme } = useTheme();
  const {
    address,
    providerId,
    providerName,
    availableProviders,
    isConnected,
    isInstalled,
    connect,
    disconnect,
    setProviderId,
  } = useWallet();
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);

  const openWalletModal = () => setIsWalletModalOpen(true);
  const closeWalletModal = () => setIsWalletModalOpen(false);

  const handleProviderSelect = async (selectedProviderId: WalletProviderId) => {
    setProviderId(selectedProviderId);
    try {
      await connect(selectedProviderId);
    } catch (err) {
      console.error("Could not connect to provider", selectedProviderId, err);
    } finally {
      closeWalletModal();
    }
  };

  const formatAddress = (value: string) =>
    `${value.substring(0, 4)}...${value.substring(value.length - 4)}`;

  const handleConnect = async () => {
    if (!isInstalled) {
      openWalletModal();
      return;
    }
    try {
      await connect(providerId);
    } catch (err) {
      console.error("Connect error", err);
      openWalletModal();
    }
  };

  const closeMenu = () => setIsMenuOpen(false);

  const handleMenuItemClick = async (action?: () => Promise<void> | void) => {
    if (action) {
      await action();
    }
    closeMenu();
  };

  useEffect(() => {
    document.body.style.overflow = isMenuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMenuOpen]);

  useEffect(() => {
    closeMenu();
  }, [pathname]);

  const logoColor = resolvedTheme === "dark" ? "white" : "currentColor";

  return (
    <header className="absolute left-0 right-0 top-0 z-100 flex justify-center px-4 pt-8">
      <div className="flex w-full max-w-6xl items-center justify-between rounded-2xl border border-zinc-200/80 bg-white/85 px-6 py-4 text-zinc-900 shadow-lg shadow-zinc-900/5 backdrop-blur-sm dark:border-white/10 dark:bg-[#525252]/85 dark:text-white dark:shadow-black/20">
        <Link href="/" className="flex items-center gap-2 text-current">
          <div className="flex items-center gap-2 text-2xl font-bold">
            <svg
              width="32"
              height="32"
              viewBox="0 0 32 32"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M4 10H14V14H8V22H14V26H4V10Z" fill={logoColor} />
              <path d="M18 10H28V14H22V26H18V10Z" fill={logoColor} />
            </svg>
            CrowdPass
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="font-medium text-zinc-600 transition hover:text-zinc-950 dark:text-zinc-200 dark:hover:text-white"
            >
              {link.label}
            </Link>
          ))}
          {isConnected && (
            <Link
              href="/dashboard"
              className="font-medium text-zinc-600 transition hover:text-zinc-950 dark:text-zinc-200 dark:hover:text-white"
            >
              Dashboard
            </Link>
          )}
        </nav>

        <div className="hidden items-center gap-4 md:flex">
          <ThemeToggle />

          {isConnected ? (
            <div className="flex items-center gap-4">
              <span className="rounded-md bg-zinc-950/5 px-3 py-1 font-mono text-sm text-zinc-600 dark:bg-white/10 dark:text-zinc-300">
                {formatAddress(address!)}
              </span>
              <button
                onClick={disconnect}
                className="rounded-lg border border-zinc-300 px-6 py-2 font-medium text-zinc-700 transition hover:bg-zinc-900/5 dark:border-gray-400 dark:text-white dark:hover:bg-white/10"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <button
              onClick={handleConnect}
              className="rounded-lg border border-zinc-300 px-6 py-2 font-medium text-zinc-700 transition hover:bg-zinc-900/5 dark:border-gray-400 dark:text-white dark:hover:bg-white/10"
            >
              {isInstalled ? `Connect ${providerName}` : "Select Wallet"}
            </button>
          )}

          <Link
            href="/create-event"
            className="rounded-lg bg-[#FF5722] px-6 py-2 font-bold text-white shadow-md transition hover:bg-[#F4511E]"
          >
            Create Events
          </Link>
        </div>

        <button
          onClick={() => setIsMenuOpen((current) => !current)}
          className="flex items-center justify-center rounded-lg p-2 transition hover:bg-zinc-900/5 dark:hover:bg-white/10 md:hidden"
          aria-label="Toggle navigation menu"
          aria-expanded={isMenuOpen}
          aria-controls="mobile-menu"
        >
          {isMenuOpen ? (
            <X size={24} className="text-current" />
          ) : (
            <Menu size={24} className="text-current" />
          )}
        </button>
      </div>

      <div
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 md:hidden ${isMenuOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
          }`}
        onClick={closeMenu}
        role="presentation"
      />

      <nav
        id="mobile-menu"
        role="dialog"
        aria-label="Mobile navigation menu"
        className={`fixed left-0 right-0 top-0 z-50 w-full max-w-full origin-top border-b border-zinc-200/80 bg-white text-zinc-900 shadow-lg transition-all duration-300 dark:border-white/10 dark:bg-[#525252] dark:text-white md:hidden ${isMenuOpen
            ? "pointer-events-auto translate-y-0 opacity-100"
            : "pointer-events-none -translate-y-full opacity-0"
          }`}
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="flex items-center justify-between px-4 py-4">
          <div className="text-xl font-bold text-current">Menu</div>
          <div className="flex items-center gap-2">
            <ThemeToggle className="px-3" />
            <button
              onClick={closeMenu}
              className="rounded-lg p-2 transition hover:bg-zinc-900/5 dark:hover:bg-white/10"
              aria-label="Close menu"
            >
              <X size={24} className="text-current" />
            </button>
          </div>
        </div>

        <div className="border-t border-zinc-200 dark:border-gray-600" />

        <div className="space-y-4 px-4 py-6">
          <div className="space-y-3">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`block rounded-2xl px-4 py-3 text-lg font-medium transition ${pathname === link.href
                    ? "bg-zinc-900/5 text-zinc-950 dark:bg-white/10 dark:text-white"
                    : "text-zinc-600 hover:bg-zinc-900/5 hover:text-zinc-950 dark:text-zinc-200 dark:hover:bg-white/5 dark:hover:text-white"
                  }`}
                onClick={() => handleMenuItemClick()}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="border-t border-zinc-200 py-4 dark:border-gray-600" />

          <div className="space-y-3">
            {isConnected ? (
              <>
                <div className="rounded-2xl bg-zinc-950/5 px-4 py-3 font-mono text-sm text-zinc-600 dark:bg-white/10 dark:text-zinc-300">
                  {formatAddress(address!)}
                </div>
                <button
                  onClick={() => handleMenuItemClick(disconnect)}
                  className="w-full rounded-2xl border border-zinc-300 px-4 py-4 font-medium text-zinc-700 transition hover:bg-zinc-900/5 dark:border-gray-400 dark:text-white dark:hover:bg-white/10"
                >
                  Disconnect
                </button>
              </>
            ) : (
              <button
                onClick={() => handleMenuItemClick(handleConnect)}
                className="w-full rounded-2xl border border-zinc-300 px-4 py-4 font-medium text-zinc-700 transition hover:bg-zinc-900/5 dark:border-gray-400 dark:text-white dark:hover:bg-white/10"
              >
                {isInstalled ? `Connect ${providerName}` : "Select Wallet"}
              </button>
            )}

            <Link
              href="/create-event"
              onClick={() => handleMenuItemClick()}
              className="block w-full rounded-2xl bg-[#FF5722] px-4 py-4 text-center font-bold text-white shadow-md transition hover:bg-[#F4511E]"
            >
              Create Events
            </Link>
          </div>
        </div>
      </nav>

      {/* Wallet Selection Modal */}
      {isWalletModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-4 text-zinc-900 shadow-xl dark:border-white/10 dark:bg-[#252525] dark:text-white">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-bold">Choose Wallet Provider</h3>
              <button onClick={closeWalletModal} className="text-current transition hover:text-zinc-500 dark:hover:text-gray-300">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-2">
              {availableProviders.map((provider) => (
                <button
                  key={provider.id}
                  onClick={() => {
                    if (provider.installed) handleProviderSelect(provider.id);
                    else window.open(provider.installUrl, "_blank");
                  }}
                  className={`w-full rounded-lg border p-3 text-left transition ${provider.id === providerId
                      ? "border-blue-400 dark:border-blue-400"
                      : "border-zinc-200 dark:border-gray-600"
                    } ${provider.installed ? "hover:border-blue-300" : "cursor-pointer opacity-70"}`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold">{provider.name}</div>
                      <div className="text-xs text-zinc-500 dark:text-gray-300">{provider.description}</div>
                    </div>
                    <div className="text-xs">{provider.installed ? "Available" : "Install"}</div>
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-4 text-sm text-zinc-500 dark:text-gray-300">
              Not installed? Click to open the official install page then refresh.
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
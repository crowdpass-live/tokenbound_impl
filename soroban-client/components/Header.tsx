"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { useWallet } from "@/contexts/WalletContext";

export default function Header() {
  const { address, isConnected, isInstalled, connect, disconnect } =
    useWallet();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const formatAddress = (addr: string) => {
    return `${addr.substring(0, 4)}...${addr.substring(addr.length - 4)}`;
  };

  const handleConnect = async () => {
    if (!isInstalled) {
      alert("Please install Freighter wallet extension.");
      return;
    }
    await connect();
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  const handleMenuItemClick = () => {
    closeMenu();
  };

  return (
    <header className="absolute top-0 left-0 right-0 z-100 flex justify-center pt-8 px-4">
      <div className="bg-[#525252] backdrop-blur-sm rounded-2xl px-6 py-4 flex items-center justify-between w-full max-w-6xl shadow-lg">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="text-white font-bold text-2xl flex items-center gap-2">
            {/* Simple Logo Icon */}
            <svg
              width="32"
              height="32"
              viewBox="0 0 32 32"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M4 10H14V14H8V22H14V26H4V10Z"
                fill="white"
              />
              <path
                d="M18 10H28V14H22V26H18V10Z"
                fill="white"
              />
            </svg>
            CrowdPass
          </div>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8">
          <Link
            href="#"
            className="text-gray-200 hover:text-white font-medium transition"
          >
            Events
          </Link>
          <Link
            href="#"
            className="text-gray-200 hover:text-white font-medium transition"
          >
            Marketplace
          </Link>
        </nav>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center gap-4">
          {isConnected ? (
            <div className="flex items-center gap-4">
              <span className="text-gray-300 font-mono text-sm bg-white/10 px-3 py-1 rounded-md">
                {formatAddress(address!)}
              </span>
              <button
                onClick={disconnect}
                className="text-white border border-gray-400 px-6 py-2 rounded-lg hover:bg-white/10 transition font-medium"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <button
              onClick={handleConnect}
              className="text-white border border-gray-400 px-6 py-2 rounded-lg hover:bg-white/10 transition font-medium"
            >
              {isInstalled ? "Connect Wallet" : "Install Freighter"}
            </button>
          )}

          <Link href="/create-event" className="bg-[#FF5722] hover:bg-[#F4511E] text-white px-6 py-2 rounded-lg font-bold shadow-md transition">
            Create Events
          </Link>
        </div>

        {/* Mobile Hamburger Button */}
        <button
          onClick={toggleMenu}
          className="md:hidden flex items-center justify-center p-2 rounded-lg hover:bg-white/10 transition"
          aria-label="Toggle navigation menu"
          aria-expanded={isMenuOpen}
          aria-controls="mobile-menu"
        >
          {isMenuOpen ? (
            <X
              size={24}
              className="text-white"
            />
          ) : (
            <Menu
              size={24}
              className="text-white"
            />
          )}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      <div
        className={`fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity duration-300 ${
          isMenuOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
        onClick={closeMenu}
        role="presentation"
      />

      {/* Mobile Menu */}
      <nav
        id="mobile-menu"
        role="dialog"
        aria-label="Mobile navigation menu"
        className={`fixed top-0 left-0 right-0 w-full max-w-full bg-[#525252] shadow-lg md:hidden z-50 transition-all duration-300 origin-top ${
          isMenuOpen
            ? "opacity-100 translate-y-0 pointer-events-auto"
            : "opacity-0 -translate-y-full pointer-events-none"
        }`}
        style={{
          paddingTop: "env(safe-area-inset-top)",
        }}
      >
        {/* Menu Header with Close Button */}
        <div className="flex justify-between items-center px-4 py-4">
          <div className="text-white font-bold text-xl">Menu</div>
          <button
            onClick={closeMenu}
            className="p-2 rounded-lg hover:bg-white/10 transition"
            aria-label="Close menu"
          >
            <X
              size={24}
              className="text-white"
            />
          </button>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-600" />

        {/* Menu Content */}
        <div className="px-4 py-6 space-y-4">
          {/* Navigation Links */}
          <nav className="space-y-3">
            <Link
              href="#"
              className="block text-gray-200 hover:text-white font-medium text-lg transition py-2"
              onClick={handleMenuItemClick}
            >
              Events
            </Link>
            <Link
              href="#"
              className="block text-gray-200 hover:text-white font-medium text-lg transition py-2"
              onClick={handleMenuItemClick}
            >
              Marketplace
            </Link>
            <Link
              href="/create-event"
              className="block text-gray-200 hover:text-white font-medium text-lg transition py-2"
              onClick={handleMenuItemClick}
            >
              Create Event
            </Link>
          </nav>

          {/* Divider */}
          <div className="border-t border-gray-600 my-4" />

          {/* Action Buttons */}
          <div className="space-y-3">
            {isConnected ? (
              <>
                <div className="flex items-center gap-2 py-2">
                  <span className="text-gray-300 font-mono text-sm bg-white/10 px-3 py-2 rounded-md">
                    {formatAddress(address!)}
                  </span>
                </div>
                <button
                  onClick={() => {
                    disconnect();
                    handleMenuItemClick();
                  }}
                  className="w-full text-white border border-gray-400 px-4 py-3 rounded-lg hover:bg-white/10 transition font-medium"
                >
                  Disconnect
                </button>
              </>
            ) : (
              <button
                onClick={() => {
                  handleConnect();
                  handleMenuItemClick();
                }}
                className="w-full text-white border border-gray-400 px-4 py-3 rounded-lg hover:bg-white/10 transition font-medium"
              >
                {isInstalled ? "Connect Wallet" : "Install Freighter"}
              </button>
            )}

            <Link
              href="/create-event"
              onClick={handleMenuItemClick}
              className="w-full bg-[#FF5722] hover:bg-[#F4511E] text-white px-4 py-3 rounded-lg font-bold shadow-md transition"
            >
              Create Events
            </Link>
          </div>
        </div>
      </nav>
    </header>
  );
}

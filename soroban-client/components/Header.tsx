'use client';

import Link from 'next/link';
import { useWallet } from '@/contexts/WalletContext';

export default function Header() {
    const { address, isConnected, isInstalled, connect, disconnect } = useWallet();

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

    return (
        <header className="absolute top-0 left-0 right-0 z-50 flex justify-center pt-8 px-4">
            <div className="bg-[#525252] backdrop-blur-sm rounded-2xl px-6 py-4 flex items-center justify-between w-full max-w-6xl shadow-lg">
                {/* Logo */}
                <div className="flex items-center gap-2">
                    <div className="text-white font-bold text-2xl flex items-center gap-2">
                        {/* Simple Logo Icon */}
                        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M4 10H14V14H8V22H14V26H4V10Z" fill="white" />
                            <path d="M18 10H28V14H22V26H18V10Z" fill="white" />
                        </svg>
                        CrowdPass
                    </div>
                </div>

                {/* Navigation */}
                <nav className="hidden md:flex items-center gap-8">
                    <Link href="#" className="text-gray-200 hover:text-white font-medium">
                        Events
                    </Link>
                    <Link href="#" className="text-gray-200 hover:text-white font-medium">
                        Marketplace
                    </Link>
                </nav>

                {/* Actions */}
                <div className="flex items-center gap-4">
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

                    <button className="bg-[#FF5722] hover:bg-[#F4511E] text-white px-6 py-2 rounded-lg font-bold shadow-md transition">
                        Create Events
                    </button>
                </div>
            </div>
        </header>
    );
}

"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
    isConnected,
    requestAccess,
} from "@stellar/freighter-api";

interface WalletContextType {
    address: string | null;
    isConnected: boolean;
    isInstalled: boolean;
    connect: () => Promise<void>;
    disconnect: () => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [address, setAddress] = useState<string | null>(null);
    const [isInstalled, setIsInstalled] = useState<boolean>(false);

    useEffect(() => {
        const checkInstallation = async () => {
            try {
                const installed = await isConnected();
                setIsInstalled(!!installed);
            } catch (e) {
                console.error("Freighter installation check failed", e);
            }
        };
        checkInstallation();
    }, []);

    const connect = async () => {
        console.log("Connect function called");
        try {
            console.log("Requesting access from Freighter...");
            const response = await requestAccess();
            console.log("Freighter response:", response);
            if (response && response.address) {
                setAddress(response.address);
                localStorage.setItem('wallet_address', response.address);
                console.log("Successfully connected:", response.address);
            } else if (response && response.error) {
                console.error("Freighter returned an error:", response.error);
                alert(`Freighter Error: ${response.error}`);
            } else {
                console.warn("Freighter returned an empty or unexpected response");
            }
        } catch (error) {
            console.error("Failed to connect to Freighter:", error);
            alert("An unexpected error occurred while connecting. Check console for details.");
        }
    };

    const disconnect = () => {
        setAddress(null);
        localStorage.removeItem('wallet_address');
    };

    // Persist connection state across page navigation
    useEffect(() => {
        const savedAddress = localStorage.getItem('wallet_address');
        if (savedAddress) {
            setAddress(savedAddress);
        }
    }, []);

    return (
        <WalletContext.Provider value={{
            address,
            isConnected: !!address,
            isInstalled,
            connect,
            disconnect
        }}>
            {children}
        </WalletContext.Provider>
    );
};

export const useWallet = () => {
    const context = useContext(WalletContext);
    if (context === undefined) {
        throw new Error('useWallet must be used within a WalletProvider');
    }
    return context;
};

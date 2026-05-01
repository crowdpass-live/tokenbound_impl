import React, { createContext, useContext, useState } from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { freighterApi } from '../lib/soroban';

// Create the context for Stellar as requested
export const WalletContext = createContext({
    address: null,
    connect: () => { },
    disconnect: () => { }
});

export const WalletProvider = ({ children }) => {
    const [address, setAddress] = useState(null);

    const connect = async () => {
        const isConnected = await freighterApi.isConnected();
        if (isConnected) {
            const userAddress = await freighterApi.getAddress();
            setAddress(userAddress);
        }
    };

    return (
        <WalletContext.Provider value={{ address, connect }}>
            {children}
        </WalletContext.Provider>
    );
};

// Test for WalletContext behavior with mocks
describe('WalletContext with Freighter API', () => {
    afterEach(() => {
        cleanup();
    });

    it('provides a context for wallet address', async () => {
        const Consumer = () => {
            const { address, connect } = useContext(WalletContext);
            return (
                <div>
                    <span data-testid="address">{address || 'none'}</span>
                    <button data-testid="connect-btn" onClick={connect}>Connect</button>
                </div>
            );
        };

        render(
            <WalletProvider>
                <Consumer />
            </WalletProvider>
        );

        const addressSpan = screen.getByTestId('address');
        expect(addressSpan.innerHTML).toBe('none');

        fireEvent.click(screen.getByTestId('connect-btn'));

        await waitFor(() => {
            expect(addressSpan.innerHTML).toBe('GBXXXXX...');
        });
    });
});

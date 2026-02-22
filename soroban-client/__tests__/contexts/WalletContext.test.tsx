import React, { useEffect } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { WalletProvider, useWallet } from '../../contexts/WalletContext';
import { isConnected, requestAccess } from '@stellar/freighter-api';

jest.mock('@stellar/freighter-api', () => ({
    isConnected: jest.fn(),
    requestAccess: jest.fn(),
}));

// A dummy component to consume the wallet context
const DummyConsumer = () => {
    const { address, isConnected, isInstalled, connect, disconnect } = useWallet();

    return (
        <div>
            <div data-testid="address">{address || 'No Address'}</div>
            <div data-testid="is-connected">{isConnected.toString()}</div>
            <div data-testid="is-installed">{isInstalled.toString()}</div>
            <button onClick={connect}>Connect Button</button>
            <button onClick={disconnect}>Disconnect Button</button>
        </div>
    );
};

describe('WalletContext Integration', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Clear local storage for each test run to prevent side effects
        window.localStorage.clear();
    });

    it('initializes with disconnected state but checks freighter installation', async () => {
        (isConnected as jest.Mock).mockResolvedValue(true);

        render(
            <WalletProvider>
                <DummyConsumer />
            </WalletProvider>
        );

        expect(screen.getByTestId('address')).toHaveTextContent('No Address');
        expect(screen.getByTestId('is-connected')).toHaveTextContent('false');

        // Wait for the async useEffect checking installation to finish
        await waitFor(() => {
            expect(isConnected).toHaveBeenCalledTimes(1);
            expect(screen.getByTestId('is-installed')).toHaveTextContent('true');
        });
    });

    it('connects to wallet and securely populates address state', async () => {
        (isConnected as jest.Mock).mockResolvedValue(true);
        const mockAddress = 'GBJ2V4YJ4V4BDK3NPGKQ2XZR2F2BQYQ2X2Y2Z2X2V2Y2Z2X2V2Y2Z2X2V2Y2';
        (requestAccess as jest.Mock).mockResolvedValue({ address: mockAddress, error: null });

        render(
            <WalletProvider>
                <DummyConsumer />
            </WalletProvider>
        );

        const connectButton = screen.getByText('Connect Button');
        fireEvent.click(connectButton);

        await waitFor(() => {
            expect(requestAccess).toHaveBeenCalledTimes(1);
            expect(screen.getByTestId('address')).toHaveTextContent(mockAddress);
            expect(screen.getByTestId('is-connected')).toHaveTextContent('true');
        });

        // Also check localStorage value
        expect(window.localStorage.getItem('wallet_address')).toBe(mockAddress);
    });

    it('disconnects and clears the address state', async () => {
        (isConnected as jest.Mock).mockResolvedValue(true);
        // Prerequisite: user is already connected
        window.localStorage.setItem('wallet_address', 'SOME_ADDRESS');

        render(
            <WalletProvider>
                <DummyConsumer />
            </WalletProvider>
        );

        // Initial check matches localstorage
        expect(screen.getByTestId('address')).toHaveTextContent('SOME_ADDRESS');
        expect(screen.getByTestId('is-connected')).toHaveTextContent('true');

        // Disconnect
        const disconnectButton = screen.getByText('Disconnect Button');
        fireEvent.click(disconnectButton);

        await waitFor(() => {
            expect(screen.getByTestId('address')).toHaveTextContent('No Address');
            expect(screen.getByTestId('is-connected')).toHaveTextContent('false');
        });

        // Verify localstorage was cleared
        expect(window.localStorage.getItem('wallet_address')).toBeNull();
    });
});

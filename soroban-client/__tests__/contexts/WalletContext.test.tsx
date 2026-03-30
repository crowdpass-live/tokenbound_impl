import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { WalletProvider, useWallet } from '../../contexts/WalletContext';
import { detectAvailableWalletProviders, connectWallet } from '../../contexts/walletAdapters';

jest.mock('../../contexts/walletAdapters', () => ({
    detectAvailableWalletProviders: jest.fn(),
    connectWallet: jest.fn(),
    signTransactionWithProvider: jest.fn(),
}));

// A dummy component to consume the wallet context
const DummyConsumer = () => {
    const { address, isConnected, isInstalled, connect, disconnect } = useWallet();

    return (
        <div>
            <div data-testid="address">{address || 'No Address'}</div>
            <div data-testid="is-connected">{isConnected.toString()}</div>
            <div data-testid="is-installed">{isInstalled.toString()}</div>
            <button type="button" onClick={() => void connect()}>
                Connect Button
            </button>
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

    it('initializes with disconnected state but detects wallet providers', async () => {
        (detectAvailableWalletProviders as jest.Mock).mockResolvedValue([
            { id: 'freighter', name: 'Freighter', installed: true, description: 'Freighter extension', installUrl: 'https://www.freighter.app/' },
        ]);

        render(
            <WalletProvider>
                <DummyConsumer />
            </WalletProvider>
        );

        expect(screen.getByTestId('address')).toHaveTextContent('No Address');
        expect(screen.getByTestId('is-connected')).toHaveTextContent('false');

        // Wait for the async useEffect to finish
        await waitFor(() => {
            expect(detectAvailableWalletProviders).toHaveBeenCalledTimes(1);
            expect(screen.getByTestId('is-installed')).toHaveTextContent('true');
        });
    });

    it('connects to wallet and securely populates address state', async () => {
        (detectAvailableWalletProviders as jest.Mock).mockResolvedValue([
            { id: 'freighter', name: 'Freighter', installed: true, description: 'Freighter extension', installUrl: 'https://www.freighter.app/' },
        ]);

        const mockAddress = 'GBJ2V4YJ4V4BDK3NPGKQ2XZR2F2BQYQ2X2Y2Z2X2V2Y2Z2X2V2Y2Z2X2V2Y2';
        (connectWallet as jest.Mock).mockResolvedValue(mockAddress);

        render(
            <WalletProvider>
                <DummyConsumer />
            </WalletProvider>
        );

        const connectButton = screen.getByText('Connect Button');
        fireEvent.click(connectButton);

        await waitFor(() => {
            expect(connectWallet).toHaveBeenCalledTimes(1);
            expect(screen.getByTestId('address')).toHaveTextContent(mockAddress);
            expect(screen.getByTestId('is-connected')).toHaveTextContent('true');
        });

        // Also check localStorage value
        expect(window.localStorage.getItem('wallet_address')).toBe(mockAddress);
    });

    it('disconnects and clears the address state', async () => {
        (detectAvailableWalletProviders as jest.Mock).mockResolvedValue([
            { id: 'freighter', name: 'Freighter', installed: true, description: 'Freighter extension', installUrl: 'https://www.freighter.app/' },
        ]);

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

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Header from '../../components/Header';
import { useWallet } from '@/contexts/WalletContext';

// Mock Wallet Context Hook
jest.mock('@/contexts/WalletContext', () => ({
    useWallet: jest.fn(),
}));

describe('Header Component', () => {
    it('renders navigation links properly', () => {
        (useWallet as jest.Mock).mockReturnValue({
            address: null,
            isConnected: false,
            isInstalled: true,
            connect: jest.fn(),
            disconnect: jest.fn(),
        });

        render(<Header />);

        expect(screen.getByText('CrowdPass')).toBeInTheDocument();
        // Events, Marketplace, Create Events may appear multiple times (desktop + mobile)
        expect(screen.getAllByText('Events').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Marketplace').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Create Events').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Connect Wallet').length).toBeGreaterThan(0);
    });

    it('displays Install Freighter if wallet is not installed', () => {
        (useWallet as jest.Mock).mockReturnValue({
            address: null,
            isConnected: false,
            isInstalled: false,
            connect: jest.fn(),
            disconnect: jest.fn(),
        });

        render(<Header />);
        // Install Freighter may appear multiple times (desktop + mobile)
        expect(screen.getAllByText('Install Freighter').length).toBeGreaterThan(0);
    });

    it('renders connected wallet address prefix and disconnect button when connected', () => {
        const mockAddress = 'GBJ2V4YJ4V4BDK3NPGKQ2XZR2F2BQYQ2X2Y2Z2X2V2Y2Z2X2V2Y2Z2X2V2Y2';
        const disconnectMock = jest.fn();

        (useWallet as jest.Mock).mockReturnValue({
            address: mockAddress,
            isConnected: true,
            isInstalled: true,
            connect: jest.fn(),
            disconnect: disconnectMock,
        });

        render(<Header />);
        const formattedAddress = 'GBJ2...V2Y2';
        // There are multiple address displays (desktop and mobile), so verify they exist
        expect(screen.getAllByText(formattedAddress).length).toBeGreaterThan(0);
        
        // Disconnect buttons may appear multiple times (desktop + mobile)
        const disconnectBtns = screen.getAllByText('Disconnect');
        expect(disconnectBtns.length).toBeGreaterThan(0);
        fireEvent.click(disconnectBtns[0]);
        expect(disconnectMock).toHaveBeenCalledTimes(1);
    });
});

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
        expect(screen.getByText('Events')).toBeInTheDocument();
        expect(screen.getByText('Marketplace')).toBeInTheDocument();
        expect(screen.getByText('Create Events')).toBeInTheDocument();
        expect(screen.getByText('Connect Wallet')).toBeInTheDocument();
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
        expect(screen.getByText('Install Freighter')).toBeInTheDocument();
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
        expect(screen.getByText(formattedAddress)).toBeInTheDocument();
        
        const disconnectBtn = screen.getByText('Disconnect');
        expect(disconnectBtn).toBeInTheDocument();
        fireEvent.click(disconnectBtn);
        expect(disconnectMock).toHaveBeenCalledTimes(1);
    });
});

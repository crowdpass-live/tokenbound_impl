import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { KitContext } from '../context/kit-context';

// Mock starknet-react
vi.mock('@starknet-react/core', () => ({
    useStarknet: () => ({ account: {} }),
    useNetwork: () => ({ chain: {} }),
    useContractRead: ({ functionName }) => {
        if (functionName === 'get_event_count') return { data: "1", isError: false, isLoading: false, error: null };
        if (functionName === 'user_event_ticket') return { data: BigInt(1), isError: false, isLoading: false, error: null };
        if (functionName === 'balance_of') return { data: BigInt(100), isError: false, isLoading: false, error: null };
        if (functionName === 'get_event') return {
            data: {
                theme: BigInt(0x123),
                event_type: BigInt(0x456),
                status: BigInt(1),
                start_date: BigInt(123456),
                end_date: BigInt(234567),
                ticket_price: BigInt(10) * BigInt(1e18),
                total_tickets: BigInt(100),
                tickets_sold: BigInt(20),
                is_canceled: false,
                organizer: BigInt(0x123),
                event_ticket_addr: BigInt(0x789)
            },
            isError: false,
            isLoading: false,
            error: null
        };
        return { data: [], isError: false, isLoading: false, error: null };
    },
    useAccount: () => ({ address: '0x123', isConnected: true }),
    publicProvider: vi.fn(),
    starknet: vi.fn(),
}));

// Page components to test
import Dashboard from '../pages/dashboard/dashboard';
import Events from '../pages/dashboard/events';
import Tickets from '../pages/dashboard/tickets';
import Analytics from '../pages/dashboard/analytics';
import Settings from '../pages/dashboard/settings';
import Discover from '../pages/dashboard/discover';
import EventDetails from '../pages/dashboard/event-details';

// Mock dashboard components and layout
vi.mock('../Components/dashboard/layout', () => ({
    default: ({ children }) => <div data-testid="layout-mock">{children}</div>
}));

vi.mock('../Components/dashboard/sidebar-item', () => ({
    default: () => <div data-testid="sidebar-item-mock" />
}));

vi.mock('../Components/dashboard/navbar', () => ({
    default: () => <div data-testid="navbar-mock" />
}));

vi.mock('../Components/dashboard/event-card', () => ({
    default: () => <div data-testid="event-card-mock" />
}));

vi.mock('../Components/dashboard/ticket-card', () => ({
    default: () => <div data-testid="ticket-card-mock" />
}));

vi.mock('../Components/dashboard/cancel-dialog', () => ({
    default: () => <div data-testid="cancel-dialog-mock" />
}));

vi.mock('../Components/dashboard/transfer-dialogue', () => ({
    TransferDialog: () => <div data-testid="transfer-dialog-mock" />
}));

const mockContextValue = {
    address: '0x12345678901234567890123456789012345678901234567890123456789012345',
    account: {},
    connect: vi.fn(),
    disconnect: vi.fn(),
    connectors: []
};

const renderWithContext = (Component) => {
    return render(
        <KitContext.Provider value={mockContextValue}>
            <BrowserRouter>
                <Component />
            </BrowserRouter>
        </KitContext.Provider>
    );
};

describe('Dashboard Pages Rendering Tests', () => {
    afterEach(() => {
        cleanup();
    });

    it('renders Dashboard page correctly', () => {
        renderWithContext(Dashboard);
        expect(screen.getByTestId('layout-mock')).toBeInTheDocument();
        // Check some text that's expected in Dashboard
        // e.g. "Welcome back", or checking if it contains components
    });

    it('renders Events page correctly', () => {
        renderWithContext(Events);
        expect(screen.getByTestId('layout-mock')).toBeInTheDocument();
    });

    it('renders Tickets page correctly', () => {
        renderWithContext(Tickets);
        expect(screen.getByTestId('layout-mock')).toBeInTheDocument();
    });

    it('renders Analytics page correctly', () => {
        renderWithContext(Analytics);
        expect(screen.getByTestId('layout-mock')).toBeInTheDocument();
    });

    it('renders Settings page correctly', () => {
        renderWithContext(Settings);
        expect(screen.getByTestId('layout-mock')).toBeInTheDocument();
    });

    it('renders Discover page correctly', () => {
        renderWithContext(Discover);
        expect(screen.getByTestId('layout-mock')).toBeInTheDocument();
    });

    it('renders EventDetails page correctly', () => {
        renderWithContext(EventDetails);
        expect(screen.getByTestId('layout-mock')).toBeInTheDocument();
    });
});

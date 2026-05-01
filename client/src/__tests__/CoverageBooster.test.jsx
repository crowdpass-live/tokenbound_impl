import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { KitContext } from '../context/kit-context';
import EventDetails from '../pages/dashboard/event-details';
import Sidebar from '../Components/dashboard/sidebar';
import { TransferDialog } from '../Components/dashboard/transfer-dialogue';
import { RescheduleDialog } from '../Components/dashboard/reschedule-dialog';

// GLOBAL MOCKS
vi.mock('react-router-dom', async (importOriginal) => {
    const actual = await importOriginal();
    return { ...actual, useParams: () => ({ id: '1' }) };
});

vi.mock('@starknet-react/core', () => ({
    useStarknet: () => ({ account: {}, chain: {} }),
    useNetwork: () => ({ chain: {} }),
    useContractRead: ({ functionName }) => {
        if (functionName === 'get_event_count') return { data: "1", isError: false, isLoading: false };
        if (functionName === 'user_event_ticket') return { data: BigInt(1), isError: false, isLoading: false };
        if (functionName === 'balance_of') return { data: BigInt(100), isError: false, isLoading: false };
        if (functionName === 'get_event') return {
            data: {
                theme: BigInt(0x123), event_type: BigInt(0x456), status: BigInt(1),
                start_date: BigInt(123456), end_date: BigInt(234567),
                ticket_price: BigInt(10) * 1000000000000000000n,
                total_tickets: BigInt(100), tickets_sold: BigInt(20),
                is_canceled: false, organizer: BigInt(0x123),
                event_ticket_addr: BigInt(0x789)
            },
            isError: false, isLoading: false
        };
        return { data: [], isError: false, isLoading: false };
    },
    useAccount: () => ({ address: '0x123', status: 'connected', isConnected: true }),
    useConnect: () => ({ connect: vi.fn(), connectors: [] }),
    useDisconnect: () => ({ disconnect: vi.fn() }),
    useContract: () => ({ contract: { address: '0x1' } }),
    useInjectedConnectors: () => ({ connectors: [] }),
    useExplorer: () => ({ getTransaction: (hash) => '', getAddress: (addr) => '' }),
    useBalance: () => ({ data: { formatted: '100', symbol: 'STRK' } }),
    useBlockNumber: () => ({ data: 123 }),
    argent: vi.fn(),
    braavos: vi.fn(),
    publicProvider: vi.fn(),
    starknet: vi.fn(),
    StarknetConfig: ({ children }) => <div>{children}</div>,
}));

vi.mock('starknet-tokenbound-sdk', () => ({
    TokenboundClient: class {
        constructor() {
            this.transferERC20 = vi.fn().mockResolvedValue({ status: "success" });
            this.checkAccountDeployment = vi.fn().mockResolvedValue(true);
            this.createAccount = vi.fn().mockResolvedValue({});
            this.getAccount = vi.fn().mockResolvedValue(BigInt(0xabc));
        }
    }
}));

const mockContext = {
    address: '0x12345678901234567890123456789012345678901234567890123456789012345',
    account: { address: '0x123' },
    connect: vi.fn(),
    disconnect: vi.fn(),
    connectors: [],
    eventContract: {
        purchase_ticket: vi.fn().mockResolvedValue({}),
        reschedule_event: vi.fn().mockResolvedValue({}),
        cancel_event: vi.fn().mockResolvedValue({}),
        claim_ticket_refund: vi.fn().mockResolvedValue({}),
    },
    strkContract: {
        approve: vi.fn().mockResolvedValue({}),
    },
    eventAbi: [],
    contractAddr: '0x1',
};

describe('Coverage Booster Tests', () => {
    afterEach(cleanup);

    it('triggers EventDetails interactive functions as organizer', async () => {
        render(
            <KitContext.Provider value={mockContext}>
                <BrowserRouter>
                    <EventDetails />
                </BrowserRouter>
            </KitContext.Provider>
        );
        const cancelBtn = screen.getByText(/Cancel Event/i);
        fireEvent.click(cancelBtn);
        expect(mockContext.eventContract.cancel_event).toHaveBeenCalled();
    });

    it('renders EventDetails as regular user and triggers purchase', async () => {
        const userContext = {
            ...mockContext,
            address: '0xnotorganizer',
            account: { address: '0xnotorganizer' }
        };
        render(
            <KitContext.Provider value={userContext}>
                <BrowserRouter>
                    <EventDetails />
                </BrowserRouter>
            </KitContext.Provider>
        );
        expect(screen.getByText(/Get ticket/i)).toBeInTheDocument();
        fireEvent.click(screen.getByText(/Give app approval/i));
        fireEvent.click(screen.getByText(/Get ticket/i));
        expect(mockContext.eventContract.purchase_ticket).toHaveBeenCalled();
    });

    it('triggers Sidebar with long and short addresses', () => {
        const { unmount } = render(
            <KitContext.Provider value={mockContext}>
                <BrowserRouter>
                    <Sidebar />
                </BrowserRouter>
            </KitContext.Provider>
        );
        expect(screen.getByText(/0x123/i)).toBeInTheDocument();
        unmount();

        render(
            <KitContext.Provider value={{ ...mockContext, address: '0xabc' }}>
                <BrowserRouter>
                    <Sidebar />
                </BrowserRouter>
            </KitContext.Provider>
        );
        expect(screen.getByText('0xabc')).toBeInTheDocument();
    });

    it('triggers TransferDialog success path', async () => {
        render(
            <KitContext.Provider value={mockContext}>
                <TransferDialog tba="0xtba" />
            </KitContext.Provider>
        );
        fireEvent.click(screen.getByText('Transfer'));
        fireEvent.change(screen.getByLabelText(/Receiver address/i), { target: { value: '0xrec', name: 'receiver' } });
        fireEvent.change(screen.getByLabelText(/Amount/i), { target: { value: '10', name: 'amount' } });
        fireEvent.click(screen.getByRole('button', { name: /Transfer/i, selector: 'button[type="submit"]' }));
    });
});

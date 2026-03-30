import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { TransferDialog } from '../Components/dashboard/transfer-dialogue';
import { KitContext } from '../context/kit-context';
import { Dialog, DialogTrigger, DialogContent, DialogTitle, DialogDescription } from '../Components/shared/dialog';

// Mock SDK
vi.mock('starknet-tokenbound-sdk', () => ({
    TokenboundClient: class {
        constructor() {
            this.transferERC20 = vi.fn().mockResolvedValue({ status: "success" });
        }
    }
}));

import { RescheduleDialog } from '../Components/dashboard/reschedule-dialog';
import Sidebar from '../Components/dashboard/sidebar';
import { BrowserRouter } from 'react-router-dom';

const mockContext = {
    account: { address: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef' },
    address: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    connect: vi.fn(),
    disconnect: vi.fn(),
    connectors: [],
    eventContract: {
        reschedule_event: vi.fn().mockResolvedValue({})
    }
};

describe('Dashboard Expanded Components', () => {
    afterEach(() => {
        cleanup();
    });

    it('renders TransferDialog and handles input changes', () => {
        render(
            <KitContext.Provider value={mockContext}>
                <TransferDialog tba="0xtba" />
            </KitContext.Provider>
        );

        const trigger = screen.getByText('Transfer');
        fireEvent.click(trigger);

        expect(screen.getByText('send your tokens')).toBeInTheDocument();

        const receiverInput = screen.getByLabelText(/Receiver address/i);
        const amountInput = screen.getByLabelText(/Amount/i);

        fireEvent.change(receiverInput, { target: { value: '0xrec', name: 'receiver' } });
        fireEvent.change(amountInput, { target: { value: '10', name: 'amount' } });

        expect(receiverInput.value).toBe('0xrec');
        expect(amountInput.value).toBe('10');
    });

    it('renders Shared Dialog correctly', () => {
        render(
            <Dialog>
                <DialogTrigger>Open</DialogTrigger>
                <DialogContent>
                    <DialogTitle>Test Title</DialogTitle>
                    <DialogDescription>Test Desc</DialogDescription>
                </DialogContent>
            </Dialog>
        );

        fireEvent.click(screen.getByText('Open'));
        expect(screen.getByText('Test Title')).toBeInTheDocument();
        expect(screen.getByText('Test Desc')).toBeInTheDocument();
    });

    it('renders RescheduleDialog and handles inputs', () => {
        render(
            <KitContext.Provider value={mockContext}>
                <RescheduleDialog id="1" />
            </KitContext.Provider>
        );

        const trigger = screen.getByText(/Reschedule Event/i);
        fireEvent.click(trigger);

        const startInput = screen.getByLabelText(/Start Date/i);
        const endInput = screen.getByLabelText(/End Date/i);

        fireEvent.change(startInput, { target: { value: '2025-12-01', name: 'startTime' } });
        fireEvent.change(endInput, { target: { value: '2025-12-02', name: 'endTime' } });

        expect(startInput.value).toBe('2025-12-01');
        expect(endInput.value).toBe('2025-12-02');
    });

    it('renders Sidebar correctly', () => {
        render(
            <KitContext.Provider value={mockContext}>
                <BrowserRouter>
                    <Sidebar />
                </BrowserRouter>
            </KitContext.Provider>
        );

        expect(screen.getByText(/Log Out/i)).toBeInTheDocument();
        // Check if sliced address is present
        expect(screen.getByText(/0x123/i)).toBeInTheDocument();
    });
});

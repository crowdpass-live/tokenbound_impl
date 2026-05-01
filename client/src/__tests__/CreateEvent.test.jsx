import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import CreateEvent from '../pages/dashboard/create-event';
import { KitContext } from '../context/kit-context';
import toast from 'react-hot-toast';

// Mock everything the component depends on
vi.mock('../Components/dashboard/layout', () => ({
    default: ({ children }) => <div data-testid="layout-mock">{children}</div>
}));
vi.mock('../../Components/shared/card', () => ({
    Card: ({ children }) => <div>{children}</div>,
    CardContent: ({ children }) => <div>{children}</div>,
    CardDescription: ({ children }) => <div>{children}</div>,
    CardFooter: ({ children }) => <div>{children}</div>,
    CardHeader: ({ children }) => <div>{children}</div>,
    CardTitle: ({ children }) => <div>{children}</div>,
}));
vi.mock('../../Components/shared/button', () => ({
    Button: ({ children, onClick }) => <button onClick={onClick}>{children}</button>
}));
vi.mock('react-hot-toast', () => ({
    default: {
        loading: vi.fn(),
        success: vi.fn(),
        error: vi.fn(),
        remove: vi.fn()
    }
}));
vi.mock('starknet', () => ({
    cairo: {
        uint256: (val) => val
    }
}));

const mockCreateEventTx = vi.fn().mockResolvedValue({ status: "success" });

const renderWithContext = () => {
    return render(
        <KitContext.Provider value={{
            eventContract: {
                create_event: mockCreateEventTx
            }
        }}>
            <CreateEvent />
        </KitContext.Provider>
    );
};

describe('CreateEvent Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        cleanup();
    });

    it('renders the creation form correctly', () => {
        renderWithContext();
        expect(screen.getByText(/Create New Event/i)).toBeInTheDocument();
    });

    it('submits form correctly', async () => {
        renderWithContext();

        fireEvent.change(screen.getByLabelText(/Event Name/i), { target: { value: 'My Event' } });
        fireEvent.change(screen.getByLabelText(/Expected Attendee/i), { target: { value: '100' } });
        fireEvent.change(screen.getByLabelText(/Ticket Price/i), { target: { value: '10' } });

        const submitBtn = screen.getByRole('button', { name: /Create Event/i });
        fireEvent.click(submitBtn);

        await waitFor(() => {
            expect(mockCreateEventTx).toHaveBeenCalled();
        });
    });

    it('handles interaction errors gracefully', async () => {
        mockCreateEventTx.mockRejectedValueOnce(new Error("Submission failed"));
        renderWithContext();

        const submitBtn = screen.getByRole('button', { name: /Create Event/i });
        fireEvent.click(submitBtn);

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith("Submission failed");
        });
    });
});

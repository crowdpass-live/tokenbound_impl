import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import Header from '../Components/landing-page/header';
import { KitContext } from '../context/kit-context';

const mockConnect = vi.fn();
const mockConnectors = [
    { id: 'connector1', name: 'Connector 1' },
    { id: 'connector2', name: 'Connector 2' }
];

const renderWithContext = (contextValue = {}) => {
    return render(
        <KitContext.Provider value={{
            connect: mockConnect,
            connectors: mockConnectors,
            address: null,
            account: null,
            ...contextValue
        }}>
            <Header />
        </KitContext.Provider>
    );
};

describe('Header Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        cleanup();
    });

    it('renders correctly with logo and links', () => {
        renderWithContext();
        expect(screen.getByRole('img')).toBeInTheDocument();
        expect(screen.getByText(/Popular Events/i)).toBeInTheDocument();
        expect(screen.getByText(/Analytics/i)).toBeInTheDocument();
    });

    it('renders connector buttons', () => {
        renderWithContext();
        expect(screen.getByText(/Connect Connector 1/i)).toBeInTheDocument();
        expect(screen.getByText(/Connect Connector 2/i)).toBeInTheDocument();
    });

    it('calls connect when a connector is clicked', () => {
        renderWithContext();
        const connectBtn = screen.getByText(/Connect Connector 1/i);
        fireEvent.click(connectBtn);
        expect(mockConnect).toHaveBeenCalledWith({ connector: mockConnectors[0] });
    });
});

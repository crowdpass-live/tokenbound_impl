import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import App from '../App';

// MOCK DISCONNECTED STATE
vi.mock('@starknet-react/core', () => ({
    useStarknet: () => ({ account: {}, chain: {} }),
    useConnect: () => ({ connect: vi.fn(), connectors: [] }),
    useAccount: () => ({ address: null, status: 'disconnected', account: null }),
    useDisconnect: () => ({ disconnect: vi.fn() }),
    useContract: () => ({ contract: { address: '0x1' } }),
    useInjectedConnectors: () => ({ connectors: [] }),
    argent: vi.fn(),
    braavos: vi.fn(),
    publicProvider: vi.fn(),
    starknet: vi.fn(),
    StarknetConfig: ({ children }) => <div>{children}</div>,
}));

describe('App Disconnected State', () => {
    afterEach(cleanup);

    it('renders landing page when disconnected', () => {
        render(
            <BrowserRouter>
                <App />
            </BrowserRouter>
        );
        // It should render LandingPage components
        // We look for common text in landing page
        expect(screen.getByText(/Decentralized Event Management/i)).toBeInTheDocument();
    });
});

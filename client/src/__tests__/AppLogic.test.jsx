import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import App from '../App';

// Mock SDK
vi.mock('starknet-tokenbound-sdk', () => ({
    TokenboundClient: class {
        constructor() {
            this.transferERC20 = vi.fn().mockResolvedValue({ status: "success" });
        }
    }
}));

// Mock starknet-react
vi.mock('@starknet-react/core', () => ({
    useConnect: () => ({ connect: vi.fn(), connectors: [] }),
    useAccount: () => ({ address: '0x123', status: 'connected', account: {} }),
    useDisconnect: () => ({ disconnect: vi.fn() }),
    useContract: () => ({ contract: {} }),
    StarknetConfig: ({ children }) => <div data-testid="starknet-config">{children}</div>,
    useInjectedConnectors: () => ({ connectors: [] }),
    publicProvider: vi.fn(),
    alchemyProvider: vi.fn(),
    argent: vi.fn(),
    braavos: vi.fn(),
    voyager: vi.fn(),
    jsonRpcProvider: vi.fn(),
}));

// Mock starknet library
vi.mock('starknet', () => ({
    Contract: class {
        constructor() {
            this.call = vi.fn().mockResolvedValue({ eventCount: "1" });
        }
    },
    RpcProvider: class {
        constructor() {
            this.waitForTransaction = vi.fn();
        }
    },
    shortString: {
        decodeShortString: vi.fn().mockReturnValue("Mocked String")
    }
}));

// Mock StarknetProvider component
vi.mock('../context/starknet-provider', () => ({
    StarknetProvider: ({ children }) => <div data-testid="starknet-provider-mock">{children}</div>
}));

// Mock LandingPage and Dashboard to avoid deep nesting issues
vi.mock('../pages/static/landing-page', () => ({
    default: () => <div data-testid="landing-page-mock" />
}));

vi.mock('../pages/dashboard/dashboard', () => ({
    default: () => <div data-testid="dashboard-mock" />
}));

const renderApp = (route = '/') => {
    return render(
        <MemoryRouter initialEntries={[route]}>
            <App />
        </MemoryRouter>
    );
};

describe('General App and Landing Logic Rendering Tests', () => {
    afterEach(() => {
        cleanup();
    });

    it('renders the App routing correctly', () => {
        renderApp('/');
        // status is connected by default in mock, so it should show dashboard
        expect(screen.getByTestId('dashboard-mock')).toBeInTheDocument();
    });
});

import { vi } from 'vitest';
import React from 'react';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
    ChevronLeft: () => <div data-testid="chevron-left" />,
    ChevronRight: () => <div data-testid="chevron-right" />,
}));

// Mock react-icons/bs
vi.mock('react-icons/bs', () => ({
    BsSendFill: () => <div data-testid="bs-send-fill" />,
}));

// Mock react-router-dom
vi.mock('react-router-dom', () => ({
    Link: ({ children, to }) => <a href={to}>{children}</a>,
}));

// Mock Sidebar and Navbar globally
vi.mock('../Components/dashboard/sidebar', () => ({
    default: () => <div data-testid="sidebar-mock" />
}));
vi.mock('../Components/dashboard/navbar', () => ({
    default: () => <div data-testid="navbar-mock" />
}));

// Mock kit-context
export const mockKitContext = {
    connect: vi.fn(),
    connectors: [{ id: 'argent', name: 'Argent' }, { id: 'braavos', name: 'Braavos' }],
    address: '0x12345678901234567890123456789012345678901234567890123456789012345',
    account: {},
    disconnect: vi.fn(),
    eventContract: {
        create_event: vi.fn().mockResolvedValue({ status: "success" })
    }
};

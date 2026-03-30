import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import SidebarItem from '../Components/dashboard/sidebar-item';
import Navbar from '../Components/dashboard/navbar';
import EventCard from '../Components/dashboard/event-card';
import TicketCard from '../Components/dashboard/ticket-card';
import RecentActivities from '../Components/dashboard/recent-activities';
import { KitContext } from '../context/kit-context';

// Mock context components
const mockContext = {
    address: '0x123...',
    connect: vi.fn(),
    disconnect: vi.fn(),
    connectors: []
};

describe('Dashboard Individual Components Tests', () => {
    afterEach(() => {
        cleanup();
    });

    it('renders SidebarItem correctly', () => {
        const menu = { url: '/test', icon: <span>icon</span>, title: 'Test Menu' };
        render(
            <BrowserRouter>
                <SidebarItem menu={menu} />
            </BrowserRouter>
        );
        expect(screen.getByText('Test Menu')).toBeInTheDocument();
    });

    it('renders Navbar correctly', () => {
        render(
            <KitContext.Provider value={mockContext}>
                <BrowserRouter>
                    <Navbar />
                </BrowserRouter>
            </KitContext.Provider>
        );
        expect(screen.getByPlaceholderText(/Search/i)).toBeInTheDocument();
    });

    it('renders EventCard correctly', () => {
        render(
            <BrowserRouter>
                <EventCard id="1" />
            </BrowserRouter>
        );
        expect(screen.getByText(/First Event/i)).toBeInTheDocument();
    });

    it('renders TicketCard correctly', () => {
        render(
            <BrowserRouter>
                <TicketCard eventName="Test Event" price="10" date="2025-10-10" />
            </BrowserRouter>
        );
        expect(screen.getByText('Test Event')).toBeInTheDocument();
    });

    it('renders RecentActivities correctly', () => {
        render(
            <BrowserRouter>
                <RecentActivities />
            </BrowserRouter>
        );
        expect(screen.getByText(/Recent Activities/i)).toBeInTheDocument();
    });
});

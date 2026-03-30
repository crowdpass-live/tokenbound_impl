import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import React from 'react';
import FeaturesSection from '../Components/landing-page/sections/features-section';

// Mock FeaturesCard to isolate FeaturesSection
vi.mock('../Components/landing-page/features-card', () => ({
    default: ({ title, description }) => (
        <div data-testid="feature-card">
            <h3>{title}</h3>
            <p>{description}</p>
        </div>
    )
}));

describe('FeaturesSection Component', () => {
    afterEach(() => {
        cleanup();
    });

    it('renders section title correctly', () => {
        render(<FeaturesSection />);
        expect(screen.getByText(/Features/i)).toBeInTheDocument();
    });

    it('renders all feature cards defined in data', () => {
        render(<FeaturesSection />);
        // Use getAllByText for titles because the description might contain the title text
        expect(screen.getAllByText(/Event Management/i)[0]).toBeInTheDocument();
        expect(screen.getAllByText(/Real Time Analytics/i)[0]).toBeInTheDocument();
        expect(screen.getAllByText(/POAP Integration/i)[0]).toBeInTheDocument();
        expect(screen.getAllByText(/Security/i)[0]).toBeInTheDocument();
        expect(screen.getAllByText(/Decentralized Identity/i)[0]).toBeInTheDocument();
    });

    it('contains feature descriptions', () => {
        render(<FeaturesSection />);
        expect(screen.getByText(/Streamline your event planning process/i)).toBeInTheDocument();
        expect(screen.getByText(/Get real-time insights/i)).toBeInTheDocument();
    });
});

import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';
import React from 'react';
import HiwSection from '../Components/landing-page/sections/hiw-section';

describe('HowItWorksSection Component', () => {
    afterEach(() => {
        cleanup();
    });

    it('renders section title correctly', () => {
        render(<HiwSection />);
        expect(screen.getByText(/How it works/i)).toBeInTheDocument();
    });

    it('displays titles when rendered', () => {
        render(<HiwSection />);
        expect(screen.getByText(/Create and verify your identity/i)).toBeInTheDocument();
        expect(screen.getByText(/Set up your event profile/i)).toBeInTheDocument();
    });
});

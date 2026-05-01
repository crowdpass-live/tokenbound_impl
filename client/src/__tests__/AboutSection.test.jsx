import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';
import React from 'react';
import AboutSection from '../Components/landing-page/sections/about-section';

describe('AboutSection Component', () => {
    afterEach(() => {
        cleanup();
    });

    it('renders with images and correctly titled card', () => {
        render(<AboutSection />);
        expect(screen.getByAltText('podcast-image')).toBeInTheDocument();
        expect(screen.getByAltText('concert-image')).toBeInTheDocument();
        expect(screen.getByAltText('get-together-image')).toBeInTheDocument();
        expect(screen.getByAltText('dinner-image')).toBeInTheDocument();
        expect(screen.getByText(/About Us/i)).toBeInTheDocument();
    });

    it('renders descriptive paragraphs', () => {
        render(<AboutSection />);
        expect(screen.getByText(/premier event ticketing and management solution/i)).toBeInTheDocument();
        expect(screen.getByText(/seamless and secure ticketing experience/i)).toBeInTheDocument();
    });

    it('renders Learn More button', () => {
        render(<AboutSection />);
        expect(screen.getByText(/Learn More/i)).toBeInTheDocument();
    });
});

import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';
import React from 'react';
import PartnersCard from '../Components/landing-page/partners-card';

describe('PartnersSection Component', () => {
    afterEach(() => {
        cleanup();
    });

    it('renders section title correctly', () => {
        render(<PartnersCard />);
        expect(screen.getByText(/Partners/i)).toBeInTheDocument();
    });

    it('renders partner logos correctly', () => {
        render(<PartnersCard />);
        expect(screen.getByAltText('web3bridge')).toBeInTheDocument();
        expect(screen.getByAltText('starknet')).toBeInTheDocument();
        expect(screen.getByAltText('tokenbound')).toBeInTheDocument();
        expect(screen.getByAltText('voyager')).toBeInTheDocument();
    });

    it('renders navigation buttons', () => {
        render(<PartnersCard />);
        // Buttons with chevron icons
        const buttons = screen.getAllByRole('button');
        expect(buttons.length).toBe(2);
    });
});

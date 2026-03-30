import React from 'react';
import { render, screen } from '@testing-library/react';
import Hero from '../../components/Hero';

describe('Hero Component', () => {
    it('renders the main heading', () => {
        render(<Hero />);

        // Using a loose string match because text might be broken into spans/lines
        expect(screen.getByText(/Secure Tickets/i)).toBeInTheDocument();
        expect(screen.getByText(/Seamless Access/i)).toBeInTheDocument();
    });

    it('renders the call to action buttons', () => {
        render(<Hero />);
        expect(screen.getByRole('button', { name: /Get Started/i })).toBeInTheDocument();
    });
});

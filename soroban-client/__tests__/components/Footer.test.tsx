import React from 'react';
import { render, screen } from '@testing-library/react';
import Footer from '../../components/Footer';

describe('Footer Component', () => {
    it('renders the copyright text properly', () => {
        render(<Footer />);

        // The text is rendered across two spans, but we can search for the main substring
        expect(screen.getByText(/All Rights Reserved, CrowdPass/i)).toBeInTheDocument();
    });
});

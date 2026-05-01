import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import Footer from '../Components/landing-page/footer';

const renderFooter = () => {
    return render(
        <BrowserRouter>
            <Footer />
        </BrowserRouter>
    );
};

describe('Footer Component', () => {
    afterEach(() => {
        cleanup();
    });

    it('renders logo and newsletter section', () => {
        renderFooter();
        // Check for logo img by its src if alt is missing, or just check it exists
        const logo = screen.getAllByRole('img')[0];
        expect(logo).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/Enter email/i)).toBeInTheDocument();
    });

    it('renders quick links sections correctly', () => {
        renderFooter();
        const linkTitles = screen.getAllByText(/Quick Links/i);
        expect(linkTitles.length).toBe(3);
    });

    it('renders social icons', () => {
        renderFooter();
        expect(screen.getByAltText('facebook-icon')).toBeInTheDocument();
        expect(screen.getByAltText('instagram-icon')).toBeInTheDocument();
        expect(screen.getByAltText('youtube-icon')).toBeInTheDocument();
        expect(screen.getByAltText('x-icon')).toBeInTheDocument();
    });

    it('renders copyright text', () => {
        renderFooter();
        expect(screen.getByText(/All Rights Reserved, CrowdPass 2024./i)).toBeInTheDocument();
    });
});

import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';
import React from 'react';
import { Button } from '../Components/shared/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../Components/shared/card';

describe('Shared Components', () => {
    afterEach(() => {
        cleanup();
    });

    describe('Button Component', () => {
        it('renders correctly', () => {
            render(<Button>Click me</Button>);
            expect(screen.getByRole('button')).toHaveTextContent('Click me');
        });

        it('renders as different component when asChild is true', () => {
            render(
                <Button asChild>
                    <a href="/test">Link Button</a>
                </Button>
            );
            const link = screen.getByRole('link');
            expect(link).toHaveAttribute('href', '/test');
            expect(link).toHaveTextContent('Link Button');
        });
    });

    describe('Card Components', () => {
        it('renders all card sub-components correctly', () => {
            render(
                <Card className="custom-card">
                    <CardHeader className="custom-header">
                        <CardTitle className="custom-title">Title</CardTitle>
                        <CardDescription className="custom-desc">Description</CardDescription>
                    </CardHeader>
                    <CardContent className="custom-content">
                        Content
                    </CardContent>
                    <CardFooter className="custom-footer">
                        Footer
                    </CardFooter>
                </Card>
            );

            expect(screen.getByText('Title')).toBeInTheDocument();
            expect(screen.getByText('Description')).toBeInTheDocument();
            expect(screen.getByText('Content')).toBeInTheDocument();
            expect(screen.getByText('Footer')).toBeInTheDocument();
        });
    });
});

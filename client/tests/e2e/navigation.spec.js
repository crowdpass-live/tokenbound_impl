import { test, expect } from '@playwright/test';
import { TestHelpers, AppAssertions } from './utils/test-helpers.js';

test.describe('Navigation and Routing', () => {
  test.beforeEach(async ({ page }) => {
    // Mock wallet connection
    await TestHelpers.mockWalletConnection(page);
    await page.goto('/');
  });

  test('should navigate to dashboard when wallet is connected', async ({ page }) => {
    // Mock wallet as connected
    await page.addInitScript(() => {
      window.walletConnected = true;
    });

    // Navigate to root path
    await page.goto('/');
    
    // Should redirect to dashboard
    await expect(page).toHaveURL(/dashboard/);
    
    // Dashboard should be visible
    await expect(page.locator('[data-testid="dashboard"], .dashboard')).toBeVisible();
  });

  test('should navigate to analytics page', async ({ page }) => {
    // Connect wallet first
    await page.addInitScript(() => {
      window.walletConnected = true;
    });
    
    await page.goto('/dashboard');
    
    // Navigate to analytics
    await page.goto('/analytics');
    
    // Check URL and content
    await expect(page).toHaveURL(/analytics/);
    await expect(page.locator('[data-testid="analytics"], .analytics, h1:has-text("Analytics")')).toBeVisible();
  });

  test('should navigate to events page', async ({ page }) => {
    // Connect wallet first
    await page.addInitScript(() => {
      window.walletConnected = true;
    });
    
    await page.goto('/dashboard');
    
    // Navigate to events
    await page.goto('/events');
    
    // Check URL and content
    await expect(page).toHaveURL(/events/);
    await expect(page.locator('[data-testid="events"], .events, h1:has-text("Events")')).toBeVisible();
  });

  test('should navigate to create events page', async ({ page }) => {
    // Connect wallet first
    await page.addInitScript(() => {
      window.walletConnected = true;
    });
    
    await page.goto('/dashboard');
    
    // Navigate to create events
    await page.goto('/create-events');
    
    // Check URL and content
    await expect(page).toHaveURL(/create-events/);
    await expect(page.locator('[data-testid="create-event"], .create-event, h1:has-text("Create")')).toBeVisible();
  });

  test('should navigate to settings page', async ({ page }) => {
    // Connect wallet first
    await page.addInitScript(() => {
      window.walletConnected = true;
    });
    
    await page.goto('/dashboard');
    
    // Navigate to settings
    await page.goto('/settings');
    
    // Check URL and content
    await expect(page).toHaveURL(/settings/);
    await expect(page.locator('[data-testid="settings"], .settings, h1:has-text("Settings")')).toBeVisible();
  });

  test('should navigate to tickets page', async ({ page }) => {
    // Connect wallet first
    await page.addInitScript(() => {
      window.walletConnected = true;
    });
    
    await page.goto('/dashboard');
    
    // Navigate to tickets
    await page.goto('/tickets');
    
    // Check URL and content
    await expect(page).toHaveURL(/tickets/);
    await expect(page.locator('[data-testid="tickets"], .tickets, h1:has-text("Tickets")')).toBeVisible();
  });

  test('should navigate to event details page', async ({ page }) => {
    // Connect wallet first
    await page.addInitScript(() => {
      window.walletConnected = true;
    });
    
    await page.goto('/dashboard');
    
    // Navigate to specific event
    await page.goto('/events/123');
    
    // Check URL and content
    await expect(page).toHaveURL(/events\/123/);
    await expect(page.locator('[data-testid="event-details"], .event-details, h1:has-text("Event")')).toBeVisible();
  });

  test('should navigate to discover page', async ({ page }) => {
    // Connect wallet first
    await page.addInitScript(() => {
      window.walletConnected = true;
    });
    
    await page.goto('/dashboard');
    
    // Navigate to discover
    await page.goto('/discover');
    
    // Check URL and content
    await expect(page).toHaveURL(/discover/);
    await expect(page.locator('[data-testid="discover"], .discover, h1:has-text("Discover")')).toBeVisible();
  });

  test('should handle navigation when wallet is disconnected', async ({ page }) => {
    // Ensure wallet is disconnected
    await page.addInitScript(() => {
      window.walletConnected = false;
    });

    // Try to navigate to protected routes
    const protectedRoutes = ['/dashboard', '/analytics', '/events', '/create-events', '/settings', '/tickets'];
    
    for (const route of protectedRoutes) {
      await page.goto(route);
      
      // Should redirect to landing page
      await expect(page).toHaveURL('/');
      
      // Should show landing page content
      await expect(page.locator('h1')).toContainText(/Welcome/);
    }
  });

  test('should handle invalid routes gracefully', async ({ page }) => {
    // Try to navigate to invalid route
    await page.goto('/invalid-route');
    
    // Should redirect to landing page or show 404
    await expect(page.locator('[data-testid="404"], .not-found, h1:has-text("404")')).toBeVisible({ timeout: 5000 });
  });

  test('should maintain navigation state across page refreshes', async ({ page }) => {
    // Connect wallet
    await page.addInitScript(() => {
      window.walletConnected = true;
    });
    
    // Navigate to a specific page
    await page.goto('/analytics');
    await expect(page).toHaveURL(/analytics/);
    
    // Refresh the page
    await page.reload();
    
    // Should maintain the same route
    await expect(page).toHaveURL(/analytics/);
    await expect(page.locator('[data-testid="analytics"], .analytics')).toBeVisible();
  });

  test('should handle browser back and forward navigation', async ({ page }) => {
    // Connect wallet
    await page.addInitScript(() => {
      window.walletConnected = true;
    });
    
    await page.goto('/dashboard');
    
    // Navigate to different pages
    await page.goto('/events');
    await page.goto('/analytics');
    await page.goto('/settings');
    
    // Use browser back button
    await page.goBack();
    await expect(page).toHaveURL(/analytics/);
    
    await page.goBack();
    await expect(page).toHaveURL(/events/);
    
    await page.goBack();
    await expect(page).toHaveURL(/dashboard/);
    
    // Use browser forward button
    await page.goForward();
    await expect(page).toHaveURL(/events/);
    
    await page.goForward();
    await expect(page).toHaveURL(/analytics/);
  });

  test('should handle deep linking correctly', async ({ page }) => {
    // Connect wallet
    await page.addInitScript(() => {
      window.walletConnected = true;
    });
    
    // Direct navigation to deep link
    await page.goto('/events/456');
    await expect(page).toHaveURL(/events\/456/);
    
    // Should show event details
    await expect(page.locator('[data-testid="event-details"], .event-details')).toBeVisible();
  });
});
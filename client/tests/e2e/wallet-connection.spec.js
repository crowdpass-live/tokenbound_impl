import { test, expect } from '@playwright/test';
import { TestHelpers, AppAssertions } from './utils/test-helpers.js';

test.describe('Wallet Connection Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Mock wallet connection
    await TestHelpers.mockWalletConnection(page);
    
    // Navigate to the application
    await page.goto('/');
    
    // Wait for page to load
    await AppAssertions.assertPageLoaded(page, 'TokenBound');
  });

  test('should display landing page when wallet is disconnected', async ({ page }) => {
    // Check that we're on the landing page
    await expect(page.locator('h1')).toContainText(/Welcome/);
    
    // Check for wallet connection button
    const connectButton = page.locator('button:has-text("Connect Wallet")');
    await expect(connectButton).toBeVisible();
  });

  test('should connect wallet successfully', async ({ page }) => {
    // Mock successful wallet connection
    await page.addInitScript(() => {
      window.walletConnected = false;
      window.connectWallet = async () => {
        window.walletConnected = true;
        return { address: '0x1234567890abcdef' };
      };
    });

    // Click connect wallet button
    const connectButton = page.locator('button:has-text("Connect Wallet")');
    await connectButton.click();

    // Wait for connection to complete
    await page.waitForTimeout(2000);

    // Check that we're redirected to dashboard
    await expect(page).toHaveURL(/dashboard/);
    
    // Check for wallet address display
    await expect(page.locator('[data-testid="wallet-address"]')).toBeVisible();
  });

  test('should handle wallet disconnection', async ({ page }) => {
    // First connect wallet
    await page.addInitScript(() => {
      window.walletConnected = true;
      window.disconnectWallet = async () => {
        window.walletConnected = false;
      };
    });

    // Navigate to dashboard
    await page.goto('/dashboard');
    
    // Find and click disconnect button
    const disconnectButton = page.locator('button:has-text("Disconnect")');
    if (await disconnectButton.isVisible()) {
      await disconnectButton.click();
      
      // Should redirect back to landing page
      await expect(page).toHaveURL('/');
    }
  });

  test('should maintain wallet connection across page navigation', async ({ page }) => {
    // Connect wallet
    await page.addInitScript(() => {
      window.walletConnected = true;
    });

    // Navigate to different pages
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/dashboard/);
    
    await page.goto('/events');
    await expect(page).toHaveURL(/events/);
    
    await page.goto('/analytics');
    await expect(page).toHaveURL(/analytics/);
    
    // Wallet should still be connected
    await expect(page.locator('[data-testid="wallet-address"]')).toBeVisible();
  });

  test('should handle wallet connection errors gracefully', async ({ page }) => {
    // Mock wallet connection error
    await page.addInitScript(() => {
      window.connectWallet = async () => {
        throw new Error('Wallet connection failed');
      };
    });

    // Try to connect wallet
    const connectButton = page.locator('button:has-text("Connect Wallet")');
    await connectButton.click();

    // Wait for error handling
    await page.waitForTimeout(2000);

    // Should still be on landing page
    await expect(page).toHaveURL('/');
    
    // Should show error message
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
  });
});
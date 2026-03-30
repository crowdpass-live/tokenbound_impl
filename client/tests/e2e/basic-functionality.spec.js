import { test, expect } from '@playwright/test';
import { TestHelpers, AppAssertions } from './utils/test-helpers.js';

test.describe('Basic Functionality', () => {
  test('should load the application', async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
    
    // Check that the page loads without errors
    await expect(page).toHaveTitle(/TokenBound/);
    await expect(page.locator('body')).toBeVisible();
    
    // Check for basic page elements
    await expect(page.locator('html')).toBeVisible();
  });

  test('should handle basic navigation', async ({ page }) => {
    // Navigate to different routes
    await page.goto('/');
    await expect(page).toHaveURL('/');
    
    // Try to navigate to dashboard (may redirect to landing if no wallet)
    await page.goto('/dashboard');
    // Should either be on dashboard or redirected to landing
    await expect(page.locator('body')).toBeVisible();
  });

  test('should handle viewport changes', async ({ page }) => {
    // Test different viewport sizes
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto('/');
    await expect(page.locator('body')).toBeVisible();

    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.locator('body')).toBeVisible();

    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('body')).toBeVisible();
  });
});
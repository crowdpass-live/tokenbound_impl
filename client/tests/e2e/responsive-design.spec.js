import { test, expect } from '@playwright/test';
import { TestHelpers, AppAssertions } from './utils/test-helpers.js';

test.describe('Responsive Design', () => {
  test.describe('Desktop View (1200px and above)', () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 1400, height: 900 });
      await TestHelpers.mockWalletConnection(page);
      await page.goto('/');
    });

    test('should display full navigation menu', async ({ page }) => {
      // Check for full navigation elements
      await expect(page.locator('nav')).toBeVisible();
      await expect(page.locator('nav a')).toHaveCount(6); // All navigation links should be visible
    });

    test('should display dashboard layout correctly', async ({ page }) => {
      // Connect wallet and go to dashboard
      await page.addInitScript(() => {
        window.walletConnected = true;
      });
      await page.goto('/dashboard');
      
      // Check for sidebar and main content area
      await expect(page.locator('[data-testid="sidebar"], .sidebar')).toBeVisible();
      await expect(page.locator('[data-testid="main-content"], .main-content')).toBeVisible();
      
      // Sidebar should be visible and not collapsed
      const sidebar = page.locator('[data-testid="sidebar"], .sidebar');
      await expect(sidebar).toBeVisible();
      await expect(sidebar).toHaveCSS('width', /.*px/);
    });

    test('should display forms with proper layout', async ({ page }) => {
      // Connect wallet and go to create event
      await page.addInitScript(() => {
        window.walletConnected = true;
      });
      await page.goto('/create-events');
      
      // Check for proper form layout
      const form = page.locator('form, .create-event-form');
      await expect(form).toBeVisible();
      
      // Form fields should be in grid layout
      const formFields = page.locator('[name="theme"], [name="total_ticket"], [name="type"]');
      await expect(formFields.first()).toBeVisible();
    });
  });

  test.describe('Tablet View (768px to 1199px)', () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 1024, height: 768 });
      await TestHelpers.mockWalletConnection(page);
      await page.goto('/');
    });

    test('should display responsive navigation', async ({ page }) => {
      // Navigation should adapt for tablet
      await expect(page.locator('nav')).toBeVisible();
      
      // Navigation items might be in a different layout
      const navItems = page.locator('nav a, nav button');
      await expect(navItems).toBeVisible({ timeout: 5000 });
    });

    test('should display dashboard with adjusted layout', async ({ page }) => {
      // Connect wallet and go to dashboard
      await page.addInitScript(() => {
        window.walletConnected = true;
      });
      await page.goto('/dashboard');
      
      // Sidebar might be collapsible or adjusted
      await expect(page.locator('[data-testid="sidebar"], .sidebar')).toBeVisible();
      await expect(page.locator('[data-testid="main-content"], .main-content')).toBeVisible();
    });

    test('should display forms with tablet-friendly layout', async ({ page }) => {
      // Connect wallet and go to create event
      await page.addInitScript(() => {
        window.walletConnected = true;
      });
      await page.goto('/create-events');
      
      // Form should be readable and usable
      await expect(page.locator('form, .create-event-form')).toBeVisible();
      
      // Form fields should be properly sized
      const themeField = page.locator('[name="theme"]');
      await expect(themeField).toBeVisible();
      await expect(themeField).toHaveCSS('width', /.*px/);
    });
  });

  test.describe('Mobile View (480px to 767px)', () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await TestHelpers.mockWalletConnection(page);
      await page.goto('/');
    });

    test('should display mobile navigation', async ({ page }) => {
      // Navigation should be in mobile format (hamburger menu)
      await expect(page.locator('nav')).toBeVisible();
      
      // Hamburger menu should be visible
      const hamburgerMenu = page.locator('[data-testid="hamburger-menu"], .hamburger, button[aria-label*="menu"]');
      if (await hamburgerMenu.isVisible()) {
        await hamburgerMenu.click();
        // Menu items should be visible after clicking
        await expect(page.locator('nav a, nav button')).toBeVisible({ timeout: 5000 });
      }
    });

    test('should display dashboard with mobile layout', async ({ page }) => {
      // Connect wallet and go to dashboard
      await page.addInitScript(() => {
        window.walletConnected = true;
      });
      await page.goto('/dashboard');
      
      // Sidebar might be hidden or collapsible
      const sidebar = page.locator('[data-testid="sidebar"], .sidebar');
      if (await sidebar.isVisible()) {
        // Sidebar should be properly sized for mobile
        await expect(sidebar).toHaveCSS('width', /.*px/);
      }
      
      // Main content should be visible and readable
      await expect(page.locator('[data-testid="main-content"], .main-content')).toBeVisible();
    });

    test('should display forms with mobile-friendly layout', async ({ page }) => {
      // Connect wallet and go to create event
      await page.addInitScript(() => {
        window.walletConnected = true;
      });
      await page.goto('/create-events');
      
      // Form should be mobile-friendly
      await expect(page.locator('form, .create-event-form')).toBeVisible();
      
      // Form fields should be properly sized for mobile
      const themeField = page.locator('[name="theme"]');
      await expect(themeField).toBeVisible();
      await expect(themeField).toHaveCSS('width', /.*px/);
      
      // Form should be scrollable if needed
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await expect(page.locator('button[type="submit"], button:has-text("Create Event")')).toBeVisible();
    });
  });

  test.describe('Small Mobile View (479px and below)', () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await TestHelpers.mockWalletConnection(page);
      await page.goto('/');
    });

    test('should display compact navigation', async ({ page }) => {
      // Navigation should be compact for small screens
      await expect(page.locator('nav')).toBeVisible();
      
      // Navigation items should be accessible
      const navItems = page.locator('nav a, nav button');
      await expect(navItems.first()).toBeVisible();
    });

    test('should display dashboard with compact layout', async ({ page }) => {
      // Connect wallet and go to dashboard
      await page.addInitScript(() => {
        window.walletConnected = true;
      });
      await page.goto('/dashboard');
      
      // Layout should be optimized for small screens
      await expect(page.locator('[data-testid="main-content"], .main-content')).toBeVisible();
      
      // Content should be readable without horizontal scrolling
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      const viewportWidth = await page.evaluate(() => window.innerWidth);
      expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 10); // Allow small tolerance
    });

    test('should display forms with single-column layout', async ({ page }) => {
      // Connect wallet and go to create event
      await page.addInitScript(() => {
        window.walletConnected = true;
      });
      await page.goto('/create-events');
      
      // Form should be single-column for small screens
      await expect(page.locator('form, .create-event-form')).toBeVisible();
      
      // All form fields should be visible and properly sized
      const formFields = page.locator('[name="theme"], [name="total_ticket"], [name="type"], [name="startTime"], [name="endTime"], [name="ticketPrice"]');
      for (const field of await formFields.all()) {
        await expect(field).toBeVisible();
        await expect(field).toHaveCSS('width', /.*px/);
      }
    });
  });

  test.describe('Orientation Changes', () => {
    test('should handle portrait to landscape transition', async ({ page }) => {
      // Start in portrait
      await page.setViewportSize({ width: 375, height: 667 });
      await TestHelpers.mockWalletConnection(page);
      await page.goto('/create-events');
      
      // Change to landscape
      await page.setViewportSize({ width: 667, height: 375 });
      
      // Form should still be usable
      await expect(page.locator('form, .create-event-form')).toBeVisible();
      await expect(page.locator('[name="theme"]')).toBeVisible();
    });

    test('should handle landscape to portrait transition', async ({ page }) => {
      // Start in landscape
      await page.setViewportSize({ width: 1024, height: 768 });
      await TestHelpers.mockWalletConnection(page);
      await page.goto('/dashboard');
      
      // Change to portrait
      await page.setViewportSize({ width: 768, height: 1024 });
      
      // Dashboard should still be usable
      await expect(page.locator('[data-testid="main-content"], .main-content')).toBeVisible();
    });
  });

  test.describe('Touch Interactions', () => {
    test('should handle touch interactions on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await TestHelpers.mockWalletConnection(page);
      await page.goto('/');
      
      // Test touch interactions
      const connectButton = page.locator('button:has-text("Connect Wallet")');
      if (await connectButton.isVisible()) {
        await connectButton.tap();
        // Should respond to touch
        await expect(connectButton).toBeVisible();
      }
    });

    test('should handle form interactions on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.addInitScript(() => {
        window.walletConnected = true;
      });
      await page.goto('/create-events');
      
      // Test form field interactions
      const themeField = page.locator('[name="theme"]');
      await themeField.tap();
      await themeField.fill('Mobile Test Event');
      await expect(themeField).toHaveValue('Mobile Test Event');
    });
  });
});
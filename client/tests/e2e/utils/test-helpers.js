import { expect } from '@playwright/test';

/**
 * Common test helpers for E2E tests
 */
export class TestHelpers {
  /**
   * Wait for a specific element to be visible
   */
  static async waitForElement(page, selector, timeout = 10000) {
    await page.waitForSelector(selector, { timeout });
  }

  /**
   * Check if element exists and is visible
   */
  static async elementExists(page, selector) {
    const element = await page.locator(selector);
    return await element.isVisible();
  }

  /**
   * Fill form fields with data
   */
  static async fillForm(page, formData) {
    for (const [field, value] of Object.entries(formData)) {
      await page.fill(`[name="${field}"]`, value);
    }
  }

  /**
   * Take a screenshot with a descriptive name
   */
  static async takeScreenshot(page, name) {
    await page.screenshot({ path: `tests/e2e/screenshots/${name}.png` });
  }

  /**
   * Check for console errors
   */
  static async checkConsoleErrors(page) {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    return errors;
  }

  /**
   * Mock wallet connection for testing
   */
  static async mockWalletConnection(page) {
    // Mock the wallet connection for testing purposes
    await page.addInitScript(() => {
      window.mockWallet = {
        connect: async () => ({
          address: '0x1234567890abcdef',
          status: 'connected'
        }),
        disconnect: async () => ({}),
        account: {
          address: '0x1234567890abcdef'
        }
      };
    });
  }
}

/**
 * Common assertions for the application
 */
export class AppAssertions {
  /**
   * Assert that the page has loaded successfully
   */
  static async assertPageLoaded(page, pageTitle) {
    await expect(page).toHaveTitle(/TokenBound/);
    await expect(page.locator('body')).toBeVisible();
  }

  /**
   * Assert that navigation elements are present
   */
  static async assertNavigation(page) {
    // Check for common navigation elements
    await expect(page.locator('nav')).toBeVisible();
  }

  /**
   * Assert responsive design elements
   */
  static async assertResponsiveDesign(page) {
    // Check for responsive meta tag
    await expect(page.locator('meta[name="viewport"]')).toBeVisible();
  }
}
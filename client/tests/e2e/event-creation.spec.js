import { test, expect } from '@playwright/test';
import { TestHelpers, AppAssertions } from './utils/test-helpers.js';

test.describe('Event Creation Form', () => {
  test.beforeEach(async ({ page }) => {
    // Mock wallet connection and navigate to create event page
    await TestHelpers.mockWalletConnection(page);
    await page.goto('/create-events');
    
    // Wait for page to load
    await AppAssertions.assertPageLoaded(page, 'Create Event');
  });

  test('should display event creation form', async ({ page }) => {
    // Check form title
    await expect(page.locator('h2, h3, .text-deep-blue')).toContainText(/Create New Event/);
    
    // Check for all required form fields
    await expect(page.locator('[name="theme"]')).toBeVisible();
    await expect(page.locator('[name="total_ticket"]')).toBeVisible();
    await expect(page.locator('[name="type"]')).toBeVisible();
    await expect(page.locator('[name="startTime"]')).toBeVisible();
    await expect(page.locator('[name="endTime"]')).toBeVisible();
    await expect(page.locator('[name="ticketPrice"]')).toBeVisible();
    
    // Check for submit button
    await expect(page.locator('button[type="submit"], button:has-text("Create Event")')).toBeVisible();
  });

  test('should validate required fields', async ({ page }) => {
    // Try to submit empty form
    const submitButton = page.locator('button[type="submit"], button:has-text("Create Event")');
    await submitButton.click();
    
    // Should show validation errors or prevent submission
    await expect(page.locator('[data-testid="error-message"], .error, .invalid')).toBeVisible({ timeout: 5000 });
  });

  test('should fill form with valid data', async ({ page }) => {
    const formData = {
      theme: 'Test Conference 2024',
      total_ticket: '100',
      type: 'conference',
      startTime: '2024-12-15',
      endTime: '2024-12-16',
      ticketPrice: '0.1'
    };

    // Fill form fields
    await TestHelpers.fillForm(page, formData);
    
    // Verify all fields are filled correctly
    for (const [field, value] of Object.entries(formData)) {
      await expect(page.locator(`[name="${field}"]`)).toHaveValue(value);
    }
  });

  test('should validate date fields', async ({ page }) => {
    // Fill form with invalid dates (end date before start date)
    await page.fill('[name="theme"]', 'Test Event');
    await page.fill('[name="total_ticket"]', '50');
    await page.fill('[name="type"]', 'conference');
    await page.fill('[name="startTime"]', '2024-12-20');
    await page.fill('[name="endTime"]', '2024-12-15'); // Earlier than start date
    await page.fill('[name="ticketPrice"]', '0.05');
    
    const submitButton = page.locator('button[type="submit"], button:has-text("Create Event")');
    await submitButton.click();
    
    // Should show date validation error
    await expect(page.locator('[data-testid="date-error"], .date-error, .invalid-date')).toBeVisible({ timeout: 5000 });
  });

  test('should validate ticket price format', async ({ page }) => {
    // Fill form with invalid ticket price
    await page.fill('[name="theme"]', 'Test Event');
    await page.fill('[name="total_ticket"]', '50');
    await page.fill('[name="type"]', 'conference');
    await page.fill('[name="startTime"]', '2024-12-15');
    await page.fill('[name="endTime"]', '2024-12-16');
    await page.fill('[name="ticketPrice"]', 'invalid-price');
    
    const submitButton = page.locator('button[type="submit"], button:has-text("Create Event")');
    await submitButton.click();
    
    // Should show price validation error
    await expect(page.locator('[data-testid="price-error"], .price-error, .invalid-price')).toBeVisible({ timeout: 5000 });
  });

  test('should submit form successfully', async ({ page }) => {
    // Mock successful contract interaction
    await page.addInitScript(() => {
      window.mockContract = {
        create_event: async () => {
          return { transaction_hash: '0x1234567890abcdef' };
        }
      };
    });

    const formData = {
      theme: 'Integration Test Event',
      total_ticket: '200',
      type: 'workshop',
      startTime: '2024-12-20',
      endTime: '2024-12-21',
      ticketPrice: '0.25'
    };

    // Fill and submit form
    await TestHelpers.fillForm(page, formData);
    
    const submitButton = page.locator('button[type="submit"], button:has-text("Create Event")');
    await submitButton.click();
    
    // Wait for success message
    await expect(page.locator('[data-testid="success-message"], .success, .toast')).toBeVisible({ timeout: 10000 });
    
    // Should redirect to events page or show success state
    await expect(page.locator('[data-testid="event-created"], .event-created')).toBeVisible();
  });

  test('should handle form submission errors', async ({ page }) => {
    // Mock contract error
    await page.addInitScript(() => {
      window.mockContract = {
        create_event: async () => {
          throw new Error('Contract execution failed');
        }
      };
    });

    const formData = {
      theme: 'Error Test Event',
      total_ticket: '100',
      type: 'conference',
      startTime: '2024-12-15',
      endTime: '2024-12-16',
      ticketPrice: '0.1'
    };

    // Fill and submit form
    await TestHelpers.fillForm(page, formData);
    
    const submitButton = page.locator('button[type="submit"], button:has-text("Create Event")');
    await submitButton.click();
    
    // Wait for error message
    await expect(page.locator('[data-testid="error-message"], .error, .toast')).toBeVisible({ timeout: 10000 });
  });

  test('should handle network errors gracefully', async ({ page }) => {
    // Mock network error
    await page.route('**/*', route => {
      if (route.request().url().includes('contract')) {
        route.abort('connectionfailed');
      } else {
        route.continue();
      }
    });

    const formData = {
      theme: 'Network Test Event',
      total_ticket: '50',
      type: 'meetup',
      startTime: '2024-12-18',
      endTime: '2024-12-18',
      ticketPrice: '0.05'
    };

    // Fill and submit form
    await TestHelpers.fillForm(page, formData);
    
    const submitButton = page.locator('button[type="submit"], button:has-text("Create Event")');
    await submitButton.click();
    
    // Should show network error message
    await expect(page.locator('[data-testid="network-error"], .network-error, .toast')).toBeVisible({ timeout: 10000 });
  });
});
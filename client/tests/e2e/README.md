# E2E Tests

This directory contains end-to-end tests for the TokenBound frontend application using Playwright.

## Test Coverage

The E2E tests cover the following areas:

### 1. Wallet Connection Flow (`wallet-connection.spec.js`)

- Display landing page when wallet is disconnected
- Connect wallet successfully
- Handle wallet disconnection
- Maintain wallet connection across page navigation
- Handle wallet connection errors gracefully

### 2. Event Creation Form (`event-creation.spec.js`)

- Display event creation form
- Validate required fields
- Fill form with valid data
- Validate date fields (end date after start date)
- Validate ticket price format
- Submit form successfully
- Handle form submission errors
- Handle network errors gracefully

### 3. Navigation and Routing (`navigation.spec.js`)

- Navigate to dashboard when wallet is connected
- Navigate to analytics, events, create events, settings, tickets pages
- Navigate to event details page
- Navigate to discover page
- Handle navigation when wallet is disconnected
- Handle invalid routes gracefully
- Maintain navigation state across page refreshes
- Handle browser back and forward navigation
- Handle deep linking correctly

### 4. Responsive Design (`responsive-design.spec.js`)

- Desktop view (1200px and above)
- Tablet view (768px to 1199px)
- Mobile view (480px to 767px)
- Small mobile view (479px and below)
- Orientation changes (portrait to landscape and vice versa)
- Touch interactions on mobile devices

## Running Tests

### Prerequisites

- Node.js 20+
- Playwright browsers installed

### Install Dependencies

```bash
npm install
```

### Install Playwright Browsers

```bash
npx playwright install
```

### Run All Tests

```bash
npm run test:e2e
```

### Run Tests in Headed Mode (with browser visible)

```bash
npm run test:e2e:headed
```

### Run Tests in Debug Mode

```bash
npm run test:e2e:debug
```

### Run Tests with UI Mode

```bash
npm run test:e2e:ui
```

### Run Specific Test File

```bash
npx playwright test wallet-connection.spec.js
```

### Run Tests on Specific Browser

```bash
npx playwright test --project=chromium
```

### Run Tests on Specific Viewport

```bash
npx playwright test --viewport=1280x720
```

## Test Configuration

The tests are configured in `playwright.config.js` with the following settings:

- **Base URL**: `http://localhost:5173`
- **Test Directory**: `./tests/e2e`
- **Browsers**: Chromium, Firefox, WebKit
- **Viewports**: Desktop, Mobile Chrome, Mobile Safari
- **Web Server**: Starts development server automatically
- **Reporting**: HTML reporter with screenshots on failure
- **Tracing**: Enabled on first retry

## Test Helpers

Common utilities are available in `utils/test-helpers.js`:

- `TestHelpers.waitForElement()` - Wait for element to be visible
- `TestHelpers.elementExists()` - Check if element exists
- `TestHelpers.fillForm()` - Fill form fields with data
- `TestHelpers.takeScreenshot()` - Take screenshot with descriptive name
- `TestHelpers.checkConsoleErrors()` - Check for console errors
- `TestHelpers.mockWalletConnection()` - Mock wallet connection for testing

## Mocking

The tests use various mocking strategies:

- **Wallet Connection**: Mocked using `addInitScript()` to simulate wallet states
- **Contract Interactions**: Mocked for successful and error scenarios
- **Network Errors**: Simulated using `page.route()` to intercept requests

## Screenshots and Videos

- Screenshots are taken on test failure
- Videos are recorded on test failure
- Traces are collected on first retry
- All artifacts are saved in the `test-results/` directory

## CI Integration

E2E tests are automatically run in the CI pipeline:

- Tests run after client build succeeds
- Playwright browsers are installed in CI
- Tests run in headless mode
- Results are reported in the CI logs

## Best Practices

1. **Use descriptive test names** that clearly indicate what is being tested
2. **Mock external dependencies** like wallets and contracts
3. **Use data-testid attributes** for reliable element selection
4. **Wait for elements** before interacting with them
5. **Clean up state** between tests when necessary
6. **Test both happy path and error scenarios**
7. **Test responsive behavior** across different viewports
8. **Use proper assertions** to verify expected behavior

## Troubleshooting

### Tests Failing Locally

- Ensure development server is running on `http://localhost:5173`
- Check that all dependencies are installed
- Verify Playwright browsers are installed

### Tests Failing in CI

- Check that environment variables are properly set
- Verify that the development server starts correctly
- Check for any network or timeout issues

### Performance Issues

- Use `await page.waitForLoadState()` to ensure pages are fully loaded
- Use specific selectors instead of broad ones
- Consider using `page.locator()` instead of `page.$()` for better performance

## Adding New Tests

1. Create a new test file in the `tests/e2e/` directory
2. Use the existing test structure as a template
3. Add appropriate test helpers and mocking
4. Update this README if new functionality is tested
5. Run the tests to ensure they pass

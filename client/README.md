# Client - HostIt Frontend

A React-based frontend application for the HostIt event management platform built with Vite, Tailwind CSS, and Starknet integration.

## Features

- Event creation and management
- Ticket purchasing and transfers
- Starknet wallet integration
- Responsive design with Tailwind CSS
- Comprehensive logging and monitoring

## Logging and Monitoring

This application includes comprehensive logging and monitoring capabilities:

### Structured Logging (Pino)

The application uses [Pino](https://github.com/pinojs/pino) for structured logging with the following features:

- **Structured JSON logs** in production for easy parsing and aggregation
- **Pretty-printed logs** in development for better readability
- **Module-specific loggers** for different parts of the application
- **Multiple log levels**: fatal, error, warn, info, debug, trace

#### Usage

```javascript
import { createLogger, logTransaction, logTransactionFailure } from './lib/logger';

const logger = createLogger('my-module');

// Basic logging
logger.info({ type: 'user_action', action: 'login' });

// Transaction logging
logTransaction({
  transactionId: 'tx_123',
  type: 'ticket_purchase',
  status: 'success'
});

// Transaction failure logging
logTransactionFailure(error, {
  transactionId: 'tx_123',
  type: 'ticket_purchase'
});
```

### Error Tracking (Sentry)

The application integrates with [Sentry](https://sentry.io/) for error tracking and monitoring:

- **Automatic error capture** from React error boundaries
- **Performance monitoring** with transaction tracing
- **Session replay** for debugging user sessions
- **Breadcrumbs** for tracking user actions before errors

#### Configuration

Set the following environment variable:

```bash
VITE_SENTRY_DSN=your_sentry_dsn_here
```

#### Usage

```javascript
import { captureException, captureMessage, setUser } from './lib/sentry';

// Capture exceptions
try {
  // risky operation
} catch (error) {
  captureException(error, { userId: '123' });
}

// Capture messages
captureMessage('User completed checkout', 'info', { orderId: '456' });

// Set user context
setUser({ id: '123', email: 'user@example.com' });
```

### Performance Monitoring (Core Web Vitals)

The application monitors Core Web Vitals metrics:

- **CLS** (Cumulative Layout Shift)
- **FID** (First Input Delay)
- **FCP** (First Contentful Paint)
- **LCP** (Largest Contentful Paint)
- **TTFB** (Time to First Byte)
- **INP** (Interaction to Next Paint)

#### Configuration

Optionally set an analytics endpoint:

```bash
VITE_ANALYTICS_ENDPOINT=https://your-analytics-service.com/metrics
```

#### Usage

```javascript
import { markPerformance, measurePerformance } from './lib/performance';

// Mark performance points
markPerformance('checkout_start');
// ... perform operation
markPerformance('checkout_end');

// Measure between marks
measurePerformance('checkout_duration', 'checkout_start', 'checkout_end');
```

### Transaction Logging

Detailed transaction logging for blockchain operations:

```javascript
import { 
  logTransactionStart, 
  logTransactionSuccess, 
  logTransactionError,
  withTransactionLogging 
} from './lib/transaction-logger';

// Manual transaction logging
const txId = logTransactionStart('ticket_purchase', { eventId: '123' });
try {
  // perform transaction
  logTransactionSuccess(txId, 'ticket_purchase', { txHash: '0x...' });
} catch (error) {
  logTransactionError(txId, 'ticket_purchase', error);
}

// Automatic transaction logging with wrapper
await withTransactionLogging('ticket_purchase', async () => {
  // perform transaction
}, { eventId: '123' });
```

### Error Boundaries

React error boundaries are implemented to catch and log component errors:

- **Global error boundary** in `main.jsx` wraps the entire application
- **Route-level error boundaries** in `App.jsx` wrap each route
- **Custom fallback UI** with error details in development mode
- **Automatic error reporting** to Sentry

## Environment Variables

Create a `.env` file in the client directory:

```bash
# Sentry DSN for error tracking
VITE_SENTRY_DSN=your_sentry_dsn_here

# Log level (fatal, error, warn, info, debug, trace)
VITE_LOG_LEVEL=info

# Optional: Analytics endpoint for performance metrics
VITE_ANALYTICS_ENDPOINT=https://your-analytics-service.com/metrics
```

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linter
npm run lint
```

## Project Structure

```
client/
├── src/
│   ├── Components/
│   │   ├── shared/
│   │   │   └── error-boundary.jsx    # Error boundary component
│   │   └── ...
│   ├── lib/
│   │   ├── logger.js                 # Pino logging utility
│   │   ├── sentry.js                 # Sentry integration
│   │   ├── performance.js            # Core Web Vitals monitoring
│   │   └── transaction-logger.js     # Transaction logging
│   ├── pages/
│   └── main.jsx                      # Application entry point
├── package.json
└── README.md
```

## Technologies

- **React 18** - UI framework
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Starknet** - Blockchain integration
- **Pino** - Structured logging
- **Sentry** - Error tracking
- **web-vitals** - Performance monitoring

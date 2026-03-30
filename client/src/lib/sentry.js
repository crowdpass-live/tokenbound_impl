import * as Sentry from '@sentry/react';
import { createLogger } from './logger';

const logger = createLogger('sentry');

// Initialize Sentry
export const initSentry = () => {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  
  if (!dsn) {
    logger.warn('Sentry DSN not configured. Error tracking disabled.');
    return;
  }

  Sentry.init({
    dsn,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],
    // Performance Monitoring
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0, // Capture 100% of transactions in dev, 10% in prod
    // Session Replay
    replaysSessionSampleRate: 0.1, // Sample 10% of sessions
    replaysOnErrorSampleRate: 1.0, // Sample 100% of sessions with errors
    environment: import.meta.env.MODE,
    beforeSend(event) {
      // Log the event being sent to Sentry
      logger.debug({
        type: 'sentry_event',
        event: event.event_id,
        level: event.level,
        message: event.message
      });
      return event;
    }
  });

  logger.info('Sentry initialized successfully');
};

// Capture exception with context
export const captureException = (error, context = {}) => {
  logger.error({
    type: 'sentry_capture_exception',
    error: {
      message: error.message,
      stack: error.stack
    },
    context
  });

  Sentry.captureException(error, {
    extra: context
  });
};

// Capture message with context
export const captureMessage = (message, level = 'info', context = {}) => {
  logger.info({
    type: 'sentry_capture_message',
    message,
    level,
    context
  });

  Sentry.captureMessage(message, {
    level,
    extra: context
  });
};

// Set user context
export const setUser = (user) => {
  Sentry.setUser(user);
  logger.debug({
    type: 'sentry_set_user',
    user: user ? { id: user.id, email: user.email } : null
  });
};

// Add breadcrumb
export const addBreadcrumb = (breadcrumb) => {
  Sentry.addBreadcrumb(breadcrumb);
  logger.debug({
    type: 'sentry_breadcrumb',
    breadcrumb
  });
};

// Start transaction for performance monitoring
export const startTransaction = (name, op) => {
  return Sentry.startTransaction({
    name,
    op
  });
};

export default Sentry;

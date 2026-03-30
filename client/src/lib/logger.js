import pino from 'pino';

// Create a structured logger instance
const logger = pino({
  level: import.meta.env.VITE_LOG_LEVEL || 'info',
  browser: {
    asObject: true,
    transmit: {
      send: (level, logEvent) => {
        // Send logs to console in development
        if (import.meta.env.DEV) {
          console.log(`[${level}]`, logEvent.messages);
        }
        // In production, you can send to a logging service
        // Example: sendToLoggingService(level, logEvent);
      }
    }
  },
  transport: import.meta.env.DEV ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname'
    }
  } : undefined
});

// Create child loggers for different modules
export const createLogger = (module) => {
  return logger.child({ module });
};

// Log levels
export const logLevels = {
  fatal: 'fatal',
  error: 'error',
  warn: 'warn',
  info: 'info',
  debug: 'debug',
  trace: 'trace'
};

// Transaction logging helper
export const logTransaction = (transactionData) => {
  const transactionLogger = createLogger('transaction');
  transactionLogger.info({
    type: 'transaction',
    ...transactionData,
    timestamp: new Date().toISOString()
  });
};

// Transaction failure logging
export const logTransactionFailure = (error, transactionData) => {
  const transactionLogger = createLogger('transaction');
  transactionLogger.error({
    type: 'transaction_failure',
    error: {
      message: error.message,
      stack: error.stack,
      code: error.code
    },
    transaction: transactionData,
    timestamp: new Date().toISOString()
  });
};

// Performance logging helper
export const logPerformance = (metric, value, metadata = {}) => {
  const performanceLogger = createLogger('performance');
  performanceLogger.info({
    type: 'performance',
    metric,
    value,
    ...metadata,
    timestamp: new Date().toISOString()
  });
};

// User action logging helper
export const logUserAction = (action, metadata = {}) => {
  const userLogger = createLogger('user');
  userLogger.info({
    type: 'user_action',
    action,
    ...metadata,
    timestamp: new Date().toISOString()
  });
};

// API call logging helper
export const logApiCall = (method, url, status, duration, metadata = {}) => {
  const apiLogger = createLogger('api');
  apiLogger.info({
    type: 'api_call',
    method,
    url,
    status,
    duration,
    ...metadata,
    timestamp: new Date().toISOString()
  });
};

export default logger;

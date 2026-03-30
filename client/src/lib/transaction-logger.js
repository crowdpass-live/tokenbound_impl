import { createLogger, logTransaction, logTransactionFailure } from './logger';
import { captureException, addBreadcrumb } from './sentry';

const logger = createLogger('transaction');

// Transaction types
export const TRANSACTION_TYPES = {
  EVENT_CREATION: 'event_creation',
  TICKET_PURCHASE: 'ticket_purchase',
  TICKET_TRANSFER: 'ticket_transfer',
  TOKEN_TRANSFER: 'token_transfer',
  CONTRACT_CALL: 'contract_call',
  WALLET_CONNECTION: 'wallet_connection'
};

// Transaction statuses
export const TRANSACTION_STATUS = {
  PENDING: 'pending',
  SUCCESS: 'success',
  FAILED: 'failed',
  CANCELLED: 'cancelled'
};

// Log transaction start
export const logTransactionStart = (type, metadata = {}) => {
  const transactionId = metadata.transactionId || `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const transactionData = {
    transactionId,
    type,
    status: TRANSACTION_STATUS.PENDING,
    ...metadata,
    startTime: new Date().toISOString()
  };

  logTransaction(transactionData);
  
  addBreadcrumb({
    category: 'transaction',
    message: `Transaction started: ${type}`,
    level: 'info',
    data: transactionData
  });

  return transactionId;
};

// Log transaction success
export const logTransactionSuccess = (transactionId, type, metadata = {}) => {
  const transactionData = {
    transactionId,
    type,
    status: TRANSACTION_STATUS.SUCCESS,
    ...metadata,
    endTime: new Date().toISOString()
  };

  logTransaction(transactionData);
  
  addBreadcrumb({
    category: 'transaction',
    message: `Transaction succeeded: ${type}`,
    level: 'info',
    data: transactionData
  });

  logger.info({
    type: 'transaction_success',
    transactionId,
    transactionType: type,
    ...metadata
  });
};

// Log transaction failure with detailed error information
export const logTransactionError = (transactionId, type, error, metadata = {}) => {
  const errorDetails = {
    message: error.message || 'Unknown error',
    code: error.code,
    stack: error.stack,
    name: error.name,
    // Starknet specific error fields
    starknetError: error.errorType,
    starknetMessage: error.message,
    transactionHash: error.transactionHash
  };

  const transactionData = {
    transactionId,
    type,
    status: TRANSACTION_STATUS.FAILED,
    error: errorDetails,
    ...metadata,
    endTime: new Date().toISOString()
  };

  logTransactionFailure(error, transactionData);
  
  // Report to Sentry
  captureException(error, {
    transactionId,
    transactionType: type,
    ...metadata
  });

  addBreadcrumb({
    category: 'transaction',
    message: `Transaction failed: ${type}`,
    level: 'error',
    data: transactionData
  });

  logger.error({
    type: 'transaction_error',
    transactionId,
    transactionType: type,
    error: errorDetails,
    ...metadata
  });
};

// Log transaction cancellation
export const logTransactionCancelled = (transactionId, type, metadata = {}) => {
  const transactionData = {
    transactionId,
    type,
    status: TRANSACTION_STATUS.CANCELLED,
    ...metadata,
    endTime: new Date().toISOString()
  };

  logTransaction(transactionData);
  
  addBreadcrumb({
    category: 'transaction',
    message: `Transaction cancelled: ${type}`,
    level: 'warning',
    data: transactionData
  });

  logger.warn({
    type: 'transaction_cancelled',
    transactionId,
    transactionType: type,
    ...metadata
  });
};

// Wrapper for async transaction operations
export const withTransactionLogging = async (type, operation, metadata = {}) => {
  const transactionId = logTransactionStart(type, metadata);
  
  try {
    const result = await operation();
    logTransactionSuccess(transactionId, type, {
      ...metadata,
      result: result ? 'completed' : 'no_result'
    });
    return result;
  } catch (error) {
    logTransactionError(transactionId, type, error, metadata);
    throw error;
  }
};

// Log contract interaction
export const logContractInteraction = (contractAddress, method, params = {}) => {
  logger.info({
    type: 'contract_interaction',
    contractAddress,
    method,
    params,
    timestamp: new Date().toISOString()
  });

  addBreadcrumb({
    category: 'contract',
    message: `Contract call: ${method}`,
    level: 'info',
    data: {
      contractAddress,
      method,
      params
    }
  });
};

// Log wallet interaction
export const logWalletInteraction = (action, metadata = {}) => {
  logger.info({
    type: 'wallet_interaction',
    action,
    ...metadata,
    timestamp: new Date().toISOString()
  });

  addBreadcrumb({
    category: 'wallet',
    message: `Wallet action: ${action}`,
    level: 'info',
    data: metadata
  });
};

export default {
  TRANSACTION_TYPES,
  TRANSACTION_STATUS,
  logTransactionStart,
  logTransactionSuccess,
  logTransactionError,
  logTransactionCancelled,
  withTransactionLogging,
  logContractInteraction,
  logWalletInteraction
};

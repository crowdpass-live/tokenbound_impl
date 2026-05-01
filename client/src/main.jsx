import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { BrowserRouter } from 'react-router-dom'
import { KitContext } from './context/kit-context.js'
import { StarknetProvider } from './context/starknet-provider.jsx'
import { Toaster } from 'sonner';
import ErrorBoundary from './Components/shared/error-boundary.jsx'
import { initSentry } from './lib/sentry.js'
import { initPerformanceMonitoring, trackPageLoad } from './lib/performance.js'
import { createLogger } from './lib/logger.js'
import { HelmetProvider } from 'react-helmet-async'

const logger = createLogger('main');

// Initialize monitoring and logging
logger.info('Initializing application monitoring');
initSentry();
initPerformanceMonitoring();
trackPageLoad();
logger.info('Application monitoring initialized');

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HelmetProvider>
      <ErrorBoundary>
        <BrowserRouter>
          <StarknetProvider>
            <App />
            <Toaster richColors position="top-right" closeButton />
          </StarknetProvider>
        </BrowserRouter>
      </ErrorBoundary>
    </HelmetProvider>
  </React.StrictMode>,
)

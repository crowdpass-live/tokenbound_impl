import { onCLS, onFID, onFCP, onLCP, onTTFB, onINP } from 'web-vitals';
import { createLogger, logPerformance } from './logger';
import { captureMessage } from './sentry';

const logger = createLogger('performance');

// Core Web Vitals thresholds
const THRESHOLDS = {
  CLS: { good: 0.1, poor: 0.25 },
  FID: { good: 100, poor: 300 },
  FCP: { good: 1800, poor: 3000 },
  LCP: { good: 2500, poor: 4000 },
  TTFB: { good: 800, poor: 1800 },
  INP: { good: 200, poor: 500 }
};

// Get rating for a metric value
const getRating = (metric, value) => {
  const threshold = THRESHOLDS[metric];
  if (!threshold) return 'unknown';
  
  if (value <= threshold.good) return 'good';
  if (value <= threshold.poor) return 'needs-improvement';
  return 'poor';
};

// Report metric to logging and monitoring services
const reportMetric = (metric) => {
  const { name, value, id, delta, rating } = metric;
  
  // Log the metric
  logPerformance(name, value, {
    id,
    delta,
    rating: rating || getRating(name, value),
    navigationType: metric.navigationType
  });

  // Report poor metrics to Sentry
  const metricRating = rating || getRating(name, value);
  if (metricRating === 'poor') {
    captureMessage(`Poor ${name} performance detected`, 'warning', {
      metric: name,
      value,
      threshold: THRESHOLDS[name]?.poor,
      id,
      delta
    });
  }

  // Send to analytics service (if configured)
  if (import.meta.env.VITE_ANALYTICS_ENDPOINT) {
    sendToAnalytics(metric);
  }
};

// Send metric to analytics service
const sendToAnalytics = async (metric) => {
  try {
    const endpoint = import.meta.env.VITE_ANALYTICS_ENDPOINT;
    if (!endpoint) return;

    await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        type: 'web-vital',
        metric: metric.name,
        value: metric.value,
        id: metric.id,
        delta: metric.delta,
        rating: metric.rating || getRating(metric.name, metric.value),
        timestamp: new Date().toISOString(),
        url: window.location.href,
        userAgent: navigator.userAgent
      })
    });
  } catch (error) {
    logger.error({
      type: 'analytics_send_error',
      error: error.message
    });
  }
};

// Initialize Core Web Vitals monitoring
export const initPerformanceMonitoring = () => {
  logger.info('Initializing Core Web Vitals monitoring');

  // Cumulative Layout Shift
  onCLS(reportMetric);
  
  // First Input Delay
  onFID(reportMetric);
  
  // First Contentful Paint
  onFCP(reportMetric);
  
  // Largest Contentful Paint
  onLCP(reportMetric);
  
  // Time to First Byte
  onTTFB(reportMetric);
  
  // Interaction to Next Paint
  onINP(reportMetric);

  logger.info('Core Web Vitals monitoring initialized');
};

// Custom performance marks
export const markPerformance = (name) => {
  if (performance && performance.mark) {
    performance.mark(name);
    logger.debug({
      type: 'performance_mark',
      name,
      timestamp: new Date().toISOString()
    });
  }
};

// Measure performance between marks
export const measurePerformance = (name, startMark, endMark) => {
  if (performance && performance.measure) {
    try {
      performance.measure(name, startMark, endMark);
      const measure = performance.getEntriesByName(name, 'measure')[0];
      
      if (measure) {
        logPerformance(name, measure.duration, {
          startMark,
          endMark,
          startTime: measure.startTime
        });
      }
      
      return measure;
    } catch (error) {
      logger.error({
        type: 'performance_measure_error',
        error: error.message,
        name,
        startMark,
        endMark
      });
    }
  }
};

// Track page load performance
export const trackPageLoad = () => {
  window.addEventListener('load', () => {
    setTimeout(() => {
      const navigation = performance.getEntriesByType('navigation')[0];
      
      if (navigation) {
        logPerformance('page_load', navigation.loadEventEnd, {
          domContentLoaded: navigation.domContentLoadedEventEnd,
          domInteractive: navigation.domInteractive,
          redirectCount: navigation.redirectCount,
          type: navigation.type
        });
      }
    }, 0);
  });
};

export default {
  initPerformanceMonitoring,
  markPerformance,
  measurePerformance,
  trackPageLoad
};

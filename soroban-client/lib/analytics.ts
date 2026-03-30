// lib/analytics.ts
"use client";

import { useEffect } from "react";

type EventParams = Record<string, string | number | boolean>;

// Analytics state for dashboard
let analyticsState = {
  pageViews: {
    home: 0,
    events: 0,
    marketplace: 0,
    analytics: 0,
    createEvent: 0,
    dashboard: 0,
  },
  pageViewSeries: [] as { name: string; views: number }[],
  eventSeries: [] as { name: string; sold: number }[],
  walletConnections: 0,
  ticketsPurchased: 0,
  revenueXlm: 0,
  organizerConversionRate: 0,
};

// Google Analytics event tracking
export const trackEvent = (eventName: string, params?: EventParams) => {
  if (typeof window !== "undefined" && (window as any).gtag) {
    (window as any).gtag("event", eventName, params);
  }
  
  // Update local state for dashboard
  if (eventName === "page_view" && params?.page) {
    const page = params.page as string;
    if (analyticsState.pageViews[page as keyof typeof analyticsState.pageViews] !== undefined) {
      analyticsState.pageViews[page as keyof typeof analyticsState.pageViews]++;
    }
    
    // Update page view series
    const existingPage = analyticsState.pageViewSeries.find(p => p.name === page);
    if (existingPage) {
      existingPage.views++;
    } else {
      analyticsState.pageViewSeries.push({ name: page, views: 1 });
    }
  }
  
  if (eventName === "wallet_connected") {
    analyticsState.walletConnections++;
  }
  
  if (eventName === "ticket_purchase" && params) {
    analyticsState.ticketsPurchased += (params.quantity as number) || 1;
    analyticsState.revenueXlm += (params.total_price as number) || 0;
    
    // Update event series
    const eventTitle = params.event_title as string;
    if (eventTitle) {
      const existingEvent = analyticsState.eventSeries.find(e => e.name === eventTitle);
      if (existingEvent) {
        existingEvent.sold += (params.quantity as number) || 1;
      } else {
        analyticsState.eventSeries.push({ 
          name: eventTitle, 
          sold: (params.quantity as number) || 1 
        });
      }
    }
  }
  
  if (eventName === "marketplace_purchase" && params) {
    analyticsState.ticketsPurchased++;
    analyticsState.revenueXlm += (params.price as number) || 0;
  }
};

// Page view tracking
export const trackPageView = (page: string) => {
  trackEvent("page_view", { page });
};

// Hook to track page views
export const useTrackPageView = (page: string) => {
  useEffect(() => {
    trackPageView(page);
  }, [page]);
};

// Get analytics snapshot for dashboard
export const getAnalyticsSnapshot = () => {
  // Calculate organizer conversion rate (mock calculation)
  const conversionRate = analyticsState.ticketsPurchased > 0 
    ? (analyticsState.revenueXlm / analyticsState.ticketsPurchased / 10) * 100
    : 0;
  
  return {
    pageViews: analyticsState.pageViews,
    pageViewSeries: analyticsState.pageViewSeries,
    eventSeries: analyticsState.eventSeries,
    walletConnections: analyticsState.walletConnections,
    ticketsPurchased: analyticsState.ticketsPurchased,
    revenueXlm: analyticsState.revenueXlm,
    organizerConversionRate: Math.min(conversionRate, 100),
  };
};

// Reset analytics (for testing)
export const resetAnalytics = () => {
  analyticsState = {
    pageViews: {
      home: 0,
      events: 0,
      marketplace: 0,
      analytics: 0,
      createEvent: 0,
      dashboard: 0,
    },
    pageViewSeries: [],
    eventSeries: [],
    walletConnections: 0,
    ticketsPurchased: 0,
    revenueXlm: 0,
    organizerConversionRate: 0,
  };
};

// Wallet connection tracking
export const trackWalletConnection = () => {
  trackEvent("wallet_connected");
};

// Ticket purchase tracking
export const trackTicketPurchase = (
  eventTitle: string,
  quantity: number,
  totalPrice: number
) => {
  trackEvent("ticket_purchase", {
    event_title: eventTitle,
    quantity,
    total_price: totalPrice,
    currency: "XLM",
  });
};

// Marketplace purchase tracking
export const trackMarketplacePurchase = (
  ticketContract: string,
  tokenId: number,
  price: number
) => {
  trackEvent("marketplace_purchase", {
    ticket_contract: ticketContract,
    token_id: tokenId,
    price,
    currency: "XLM",
  });
};

// Marketplace listing tracking
export const trackMarketplaceListing = (
  ticketContract: string,
  tokenId: number,
  price: number
) => {
  trackEvent("marketplace_listing", {
    ticket_contract: ticketContract,
    token_id: tokenId,
    price,
    currency: "XLM",
  });
};

// Error tracking
export const trackError = (error: Error, context?: string) => {
  trackEvent("error", {
    error_message: error.message,
    error_stack: error.stack,
    context,
    timestamp: Date.now(),
  });
};
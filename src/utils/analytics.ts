/**
 * Analytics Tracking Utility
 * 
 * Track user interactions and test sessions.
 * 
 * Usage:
 * trackEvent('test_session_start', { entryPoint: 'mock-qr' });
 */

export type AnalyticsEventType =
  | 'admin_tab_view'
  | 'test_session_start'
  | 'test_entry_point_selected'
  | 'test_scan_complete'
  | 'admin_tools_expanded'
  | 'test_validation_saved'
  | 'admin_onboarding_started'
  | 'admin_onboarding_complete'
  | 'test_mode_changed'
  | 'bottle_selected';

export interface AnalyticsEvent {
  eventName: AnalyticsEventType;
  properties: Record<string, any>;
  timestamp: string;
  sessionId: string;
}

// Get or create session ID
const getSessionId = (): string => {
  let sessionId = sessionStorage.getItem('afia_test_session_id');
  if (!sessionId) {
    sessionId = `test_session_${crypto.randomUUID()}`;
    sessionStorage.setItem('afia_test_session_id', sessionId);
  }
  return sessionId;
};

// Track event
export const trackEvent = (
  eventName: AnalyticsEventType,
  properties: Record<string, any> = {}
): void => {
  const event: AnalyticsEvent = {
    eventName,
    properties,
    timestamp: new Date().toISOString(),
    sessionId: getSessionId(),
  };

  // Log to console in development
  if (import.meta.env.DEV) {
    console.log('[Analytics]', eventName, event);
  }

  // Store locally for now (future: send to analytics service)
  try {
    const events = JSON.parse(localStorage.getItem('afia_analytics_events') || '[]');
    events.push(event);
    
    // Keep only last 1000 events
    if (events.length > 1000) {
      events.shift();
    }
    
    localStorage.setItem('afia_analytics_events', JSON.stringify(events));
  } catch (error) {
    console.error('Failed to store analytics event:', error);
  }
};

// Convenience methods
export const analytics = {
  adminTabView: (tab: string, isFirstTime: boolean) => {
    trackEvent('admin_tab_view', { tab, isFirstTime });
  },

  testSessionStart: (entryPoint: string, testMode: string) => {
    trackEvent('test_session_start', { entryPoint, testMode });
  },

  testEntryPointSelected: (entryPoint: string, bottleSku?: string) => {
    trackEvent('test_entry_point_selected', { entryPoint, bottleSku });
  },

  testScanComplete: (
    sessionId: string,
    scanId: string,
    duration: number,
    result: any
  ) => {
    trackEvent('test_scan_complete', {
      sessionId,
      scanId,
      duration,
      confidence: result?.confidence,
      aiProvider: result?.aiProvider,
    });
  },

  adminToolsExpanded: (sessionId: string, testResultId: string) => {
    trackEvent('admin_tools_expanded', { sessionId, testResultId });
  },

  testValidationSaved: (
    testResultId: string,
    accuracyRating: string,
    hasNotes: boolean
  ) => {
    trackEvent('test_validation_saved', {
      testResultId,
      accuracyRating,
      hasNotes,
    });
  },

  adminOnboardingStarted: (sessionId: string) => {
    trackEvent('admin_onboarding_started', { sessionId });
  },

  adminOnboardingComplete: (
    sessionId: string,
    completedSteps: number,
    duration: number
  ) => {
    trackEvent('admin_onboarding_complete', {
      sessionId,
      completedSteps,
      duration,
    });
  },

  testModeChanged: (from: string, to: string) => {
    trackEvent('test_mode_changed', { from, to });
  },

  bottleSelected: (sku: string, entryPoint: string) => {
    trackEvent('bottle_selected', { sku, entryPoint });
  },
};

// Get analytics data
export const getAnalytics = (): AnalyticsEvent[] => {
  try {
    return JSON.parse(localStorage.getItem('afia_analytics_events') || '[]');
  } catch {
    return [];
  }
};

// Clear analytics data
export const clearAnalytics = (): void => {
  localStorage.removeItem('afia_analytics_events');
};

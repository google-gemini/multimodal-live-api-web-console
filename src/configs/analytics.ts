import posthog from 'posthog-js'

// Define Electron window interface
declare global {
    interface Window {
        electron?: {
            platform: string;
            osVersion: string;
            arch: string;
            appVersion: string;
        };
    }
}

// Initialize PostHog
export const initAnalytics = () => {
    // Only initialize in production
    if (process.env.NODE_ENV === 'production') {
        console.log("initializing analytics");
        posthog.init(
            process.env.REACT_APP_POSTHOG_KEY || 'your-project-key',
            {
                api_host: process.env.REACT_APP_POSTHOG_HOST || 'https://app.posthog.com',
                loaded: (posthog) => {
                    if (process.env.NODE_ENV === 'development') posthog.debug()
                },
                autocapture: process.env.NODE_ENV === 'production',
                persistence: 'localStorage',
                person_profiles: 'always'
            }
        )
        
        // Track app launch and set up session tracking
        trackAppLaunch()
    } else {
        console.log('Analytics disabled in development environment')
    }
}

// Track app launch with system info
const trackAppLaunch = () => {
    const systemInfo = {
        os: window?.electron?.platform || navigator.platform,
        osVersion: window?.electron?.osVersion,
        arch: window?.electron?.arch,
        appVersion: window?.electron?.appVersion,
        isFirstLaunch: !localStorage.getItem('app_previously_launched')
    }
    
    // Mark that the app has been launched before
    if (systemInfo.isFirstLaunch) {
        localStorage.setItem('app_previously_launched', 'true')
        trackEvent('first_app_launch', systemInfo)
    }
    
    trackEvent('app_launched', systemInfo)

    // Set up session tracking
    trackEvent('session_started', systemInfo)
    setupSessionTracking()
}

// Track user session duration
const setupSessionTracking = () => {
    let sessionStartTime = Date.now()
    
    // Track session end when the window is closed or the app is quit
    window.addEventListener('beforeunload', () => {
        const sessionDuration = Date.now() - sessionStartTime
        trackEvent('session_ended', {
            duration_ms: sessionDuration,
            duration_minutes: Math.round(sessionDuration / 60000)
        })
    })
}

// Utility function to track events
export const trackEvent = (eventName: string, properties?: Record<string, any>) => {
    const eventProperties = {
        ...properties,
        timestamp: new Date().toISOString()
    }
    posthog.capture(eventName, eventProperties)
}

// Utility function to identify users
export const identifyUser = (
    distinctId: string,
    properties?: Record<string, any>
) => {
    posthog.identify(distinctId, properties)
} 
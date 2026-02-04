/**
 * Centralized error logging utility.
 * Logs to console in development, can be extended for production error tracking.
 */
export function logError(context: string, error: unknown): void {
  if (import.meta.env.DEV) {
    console.error(`[${context}]`, error);
  }
  // Production: Could integrate Sentry, LogRocket, etc.
}

export function logWarn(context: string, message: string): void {
  if (import.meta.env.DEV) {
    console.warn(`[${context}]`, message);
  }
}

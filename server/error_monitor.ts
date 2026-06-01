import { logger } from './logger';

// Try to dynamically load Sentry to prevent boot errors if not installed in node_modules
let Sentry: any = null;
const SENTRY_DSN = process.env.SENTRY_DSN;

try {
  // Use dynamic import/require wrapper to be highly resilient to compilation systems
  if (SENTRY_DSN) {
    Sentry = require('@sentry/node');
    Sentry.init({
      dsn: SENTRY_DSN,
      environment: process.env.NODE_ENV || 'production',
      tracesSampleRate: 0.1
    });
    logger.info('SENTRY_INITIALIZATION', 'Sentry error monitoring successfully loaded and activated.');
  }
} catch (e) {
  // Sentry not present, fallback silently to local structured logging
}

export const errorMonitor = {
  captureError(err: any, context: string = 'GENERIC_SYSTEM_ERROR') {
    const errorMsg = err?.message || String(err || 'Unknown Error');
    const errorStack = err?.stack || null;
    const errorName = err?.name || 'Error';

    // Log to standard structured JSON logger
    logger.error('RUNTIME_ERROR', `Captured error in context: ${context} - ${errorMsg}`, {
      context,
      error: {
        name: errorName,
        message: errorMsg,
        stack: errorStack
      }
    });

    // Forward to Sentry if active
    if (Sentry && SENTRY_DSN) {
      try {
        Sentry.captureException(err);
      } catch (sentryErr) {
        logger.warn('SENTRY_SEND_FAILURE', 'Failed to dispatch error to Sentry endpoint', { error: String(sentryErr) });
      }
    }
  }
};

export function registerGlobalCrashHandlers() {
  process.on('uncaughtException', (err: Error) => {
    errorMonitor.captureError(err, 'UNCAUGHT_EXCEPTION_CRASH');
    // In production, exit process on uncaughtException so clustering manager (PM2/Render) restarts it cleanly
    if (process.env.NODE_ENV === 'production') {
      logger.error('PROCESS_CRITICAL_EXIT', 'Exiting process due to critical uncaught exception to allow clean restart.');
      setTimeout(() => process.exit(1), 1000);
    }
  });

  process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    errorMonitor.captureError(reason, 'UNHANDLED_PROMISE_REJECTION');
  });
}

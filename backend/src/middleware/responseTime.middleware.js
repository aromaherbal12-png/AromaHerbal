import { log } from "../utils/logger.js";

/**
 * Middleware to track and log API response times
 * Logs slow requests (>1000ms) at warn level
 * Logs all requests at http level with timing info
 */
export function responseTimeMiddleware(req, res, next) {
  const startTime = Date.now();

  // Capture the original end method
  const originalEnd = res.end;

  // Override res.end to capture response time
  res.end = function (...args) {
    const duration = Date.now() - startTime;

    // Log response with timing information
    const logData = {
      method: req.method,
      url: req.originalUrl || req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userId: req.user?.id,
      userRole: req.user?.role,
      ip: req.ip,
    };

    // Log slow requests as warnings
    if (duration > 1000) {
      log.warn(`Slow request detected (${duration}ms)`, logData);
    } else {
      log.http(`${req.method} ${req.url} - ${res.statusCode} - ${duration}ms`, logData);
    }

    // Call the original end method
    return originalEnd.apply(this, args);
  };

  next();
}

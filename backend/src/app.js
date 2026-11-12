import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";

import { env } from "./config/env.js";
import routes from "./routes/index.js";
import { ApiError } from "./utils/ApiError.js";
import { errorMiddleware } from "./middleware/error.middleware.js";
import { shutdownMiddleware } from "./utils/gracefulShutdown.js";

const app = express();

app.disable("x-powered-by");

// Enhanced helmet security configuration
app.use(
  helmet({
    // Content Security Policy
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles for UI frameworks
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    // HTTP Strict Transport Security (HSTS) - enforce HTTPS
    hsts: {
      maxAge: 31536000, // 1 year in seconds
      includeSubDomains: true,
      preload: true,
    },
    // Prevent clickjacking
    frameguard: {
      action: "deny",
    },
    // Prevent MIME type sniffing
    noSniff: true,
    // Hide X-Powered-By header (redundant with app.disable but explicit)
    hidePoweredBy: true,
    // Prevent browsers from sending referrer information
    referrerPolicy: {
      policy: "strict-origin-when-cross-origin",
    },
    // Disable DNS prefetching
    dnsPrefetchControl: {
      allow: false,
    },
    // Prevent IE from executing downloads in site's context
    ieNoOpen: true,
    // Add X-XSS-Protection header
    xssFilter: true,
  })
);

app.use(
  cors({
    origin: env.clientUrl,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true, // Allow cookies/credentials
    maxAge: 86400, // Cache preflight requests for 24 hours
  })
);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

if (env.nodeEnv !== "test") {
  app.use(morgan(env.nodeEnv === "production" ? "combined" : "dev"));
}

// Temporarily disabled rate limiting for development
// Global rate limiter for all API routes
// app.use(
//   "/api",
//   rateLimit({
//     windowMs: env.rateLimitWindowMs,
//     limit: env.rateLimitMax,
//     standardHeaders: "draft-8",
//     legacyHeaders: false,
//     message: {
//       success: false,
//       message: "Too many requests. Please try again later.",
//     },
//   })
// );

// Strict rate limiter for auth endpoints (5 requests per minute)
// app.use(
//   "/api/auth",
//   rateLimit({
//     windowMs: 60 * 1000, // 1 minute
//     limit: 5, // 5 requests per minute
//     standardHeaders: "draft-8",
//     legacyHeaders: false,
//     skipSuccessfulRequests: false, // Count all requests, including successful ones
//     message: {
//       success: false,
//       message: "Too many authentication attempts. Please try again after 1 minute.",
//     },
//   })
// );

// Reject new requests during graceful shutdown
app.use(shutdownMiddleware);

app.use("/api", routes);

// Use the existing error middleware for unmatched routes.
app.use((req, res, next) => {
  next(
    new ApiError(
      404,
      `Route not found: ${req.method} ${req.originalUrl}`
    )
  );
});

app.use(errorMiddleware);

export default app;
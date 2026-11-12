import "dotenv/config";

const nodeEnv = process.env.NODE_ENV || "development";

export const env = {
  nodeEnv,
  port: Number.parseInt(process.env.PORT || "5000", 10),
  mongoUri:
    process.env.MONGODB_URI ||
    "mongodb://127.0.0.1:27017/aroma_workflow",
  jwtSecret: process.env.JWT_SECRET || "",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "1d",
  clientUrl: process.env.CLIENT_URL || "http://localhost:5173",
  bootstrapAdminName: process.env.BOOTSTRAP_ADMIN_NAME || "",
  bootstrapAdminEmail: process.env.BOOTSTRAP_ADMIN_EMAIL || "",
  bootstrapAdminPassword: process.env.BOOTSTRAP_ADMIN_PASSWORD || "",
  rateLimitWindowMs: Number.parseInt(
    process.env.RATE_LIMIT_WINDOW_MS || "900000",
    10
  ),
  rateLimitMax: Number.parseInt(
    process.env.RATE_LIMIT_MAX || "200",
    10
  ),
  // Logging configuration
  logLevel: process.env.LOG_LEVEL || (nodeEnv === "production" ? "info" : "debug"),
  // Request timeout (milliseconds)
  requestTimeout: Number.parseInt(process.env.REQUEST_TIMEOUT || "30000", 10),
};

if (
  !Number.isInteger(env.port) ||
  env.port < 1 ||
  env.port > 65535
) {
  throw new Error("PORT must be a valid port between 1 and 65535.");
}

if (
  !Number.isInteger(env.rateLimitWindowMs) ||
  env.rateLimitWindowMs < 1 ||
  !Number.isInteger(env.rateLimitMax) ||
  env.rateLimitMax < 1
) {
  throw new Error("Rate-limit settings must be positive integers.");
}

if (nodeEnv === "production") {
  if (!env.mongoUri) {
    throw new Error("MONGODB_URI is required in production.");
  }

  if (env.jwtSecret.length < 32) {
    throw new Error(
      "JWT_SECRET must contain at least 32 characters in production."
    );
  }
}
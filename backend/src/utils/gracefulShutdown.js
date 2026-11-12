import mongoose from "mongoose";

/**
 * Graceful shutdown handler
 * Ensures all connections are closed properly before process termination
 */

let server = null;
let isShuttingDown = false;

/**
 * Register the HTTP server for graceful shutdown
 * @param {http.Server} httpServer - The Express server instance
 */
export function registerServer(httpServer) {
  server = httpServer;
}

/**
 * Graceful shutdown function
 * @param {string} signal - The signal that triggered shutdown (SIGTERM, SIGINT)
 */
async function gracefulShutdown(signal) {
  if (isShuttingDown) {
    console.log("⚠️  Shutdown already in progress...");
    return;
  }

  isShuttingDown = true;
  console.log(`\n🛑 ${signal} received. Starting graceful shutdown...`);

  const shutdownTimeout = 30000; // 30 seconds max for graceful shutdown
  const forceShutdownTimer = setTimeout(() => {
    console.error("❌ Graceful shutdown timeout. Forcing exit...");
    process.exit(1);
  }, shutdownTimeout);

  try {
    // Step 1: Stop accepting new connections
    if (server) {
      console.log("📡 Closing HTTP server (stop accepting new connections)...");
      await new Promise((resolve, reject) => {
        server.close((err) => {
          if (err) {
            console.error("⚠️  Error closing HTTP server:", err);
            reject(err);
          } else {
            console.log("✅ HTTP server closed");
            resolve();
          }
        });
      });
    }

    // Step 2: Close database connections
    if (mongoose.connection.readyState === 1) {
      console.log("🗄️  Closing MongoDB connection...");
      await mongoose.connection.close(false); // false = don't force close
      console.log("✅ MongoDB connection closed");
    }

    // Step 3: Cleanup any other resources (Redis, message queues, etc.)
    // Add your cleanup logic here if needed
    // Example: await redisClient.quit();
    // Example: await messageQueue.close();

    console.log("✨ Graceful shutdown completed successfully");
    clearTimeout(forceShutdownTimer);
    process.exit(0);
  } catch (error) {
    console.error("❌ Error during graceful shutdown:", error);
    clearTimeout(forceShutdownTimer);
    process.exit(1);
  }
}

/**
 * Setup graceful shutdown handlers for process signals
 */
export function setupGracefulShutdown() {
  // Handle SIGTERM (Kubernetes, Docker, systemd)
  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

  // Handle SIGINT (Ctrl+C)
  process.on("SIGINT", () => gracefulShutdown("SIGINT"));

  // Handle uncaught exceptions
  process.on("uncaughtException", (error) => {
    console.error("💥 Uncaught Exception:", error);
    gracefulShutdown("UNCAUGHT_EXCEPTION");
  });

  // Handle unhandled promise rejections
  process.on("unhandledRejection", (reason, promise) => {
    console.error("💥 Unhandled Rejection at:", promise, "reason:", reason);
    gracefulShutdown("UNHANDLED_REJECTION");
  });

  console.log("🛡️  Graceful shutdown handlers registered");
}

/**
 * Middleware to reject new requests during shutdown
 */
export function shutdownMiddleware(req, res, next) {
  if (isShuttingDown) {
    res.status(503).json({
      success: false,
      message: "Server is shutting down. Please try again later.",
    });
    return;
  }
  next();
}

/**
 * Check if server is currently shutting down
 */
export function isServerShuttingDown() {
  return isShuttingDown;
}

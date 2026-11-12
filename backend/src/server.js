import bcrypt from "bcryptjs";

import app from "./app.js";
import { env } from "./config/env.js";
import {
  connectDatabase,
  disconnectDatabase,
} from "./config/database.js";
import User, { USER_ROLES } from "./modules/users/models/User.js";
import { registerServer, setupGracefulShutdown } from "./utils/gracefulShutdown.js";

let server;
// Note: shuttingDown flag is now managed by gracefulShutdown.js

async function bootstrapAdministrator() {
  const name = env.bootstrapAdminName.trim();
  const email = env.bootstrapAdminEmail.trim().toLowerCase();
  const password = env.bootstrapAdminPassword;

  if (!name || !email || !password) {
    throw new Error(
      "Set BOOTSTRAP_ADMIN_NAME, BOOTSTRAP_ADMIN_EMAIL, and BOOTSTRAP_ADMIN_PASSWORD in backend/.env."
    );
  }

  if (password.length < 12 || password.length > 128) {
    throw new Error(
      "Bootstrap Administrator password must be between 12 and 128 characters."
    );
  }

  const existingAdministrator = await User.exists({
    role: USER_ROLES.ADMINISTRATOR,
  });

  if (existingAdministrator) {
    throw new Error(
      "Bootstrap refused: an Administrator already exists. Use normal user management instead."
    );
  }

  const existingEmail = await User.exists({ email });

  if (existingEmail) {
    throw new Error(
      "Bootstrap refused: this email already belongs to a user. Choose a different email or review the existing account."
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await User.create({
    name,
    email,
    passwordHash,
    role: USER_ROLES.ADMINISTRATOR,
    isActive: true,
  });

  console.log("Initial Administrator created successfully.");
  console.log(`Email: ${email}`);
  console.log("Remove the BOOTSTRAP_ADMIN_* variables from .env now.");
}

async function startServer() {
  try {
    await connectDatabase();

    if (process.argv.includes("--bootstrap-admin")) {
      await bootstrapAdministrator();
      return;
    }

    server = app.listen(env.port, () => {
      console.log("---------------------------------------");
      console.log(" Aroma Workflow Backend");
      console.log("---------------------------------------");
      console.log(`Environment: ${env.nodeEnv}`);
      console.log(`API:         http://localhost:${env.port}/api`);
      console.log(`Health:      http://localhost:${env.port}/api/health`);
      console.log("---------------------------------------");
      
      // Register server for graceful shutdown
      registerServer(server);
      
      // Setup graceful shutdown handlers
      setupGracefulShutdown();
    });
  } catch (error) {
    console.error("Backend startup failed:", error.message);
    process.exitCode = 1;
  } finally {
    if (process.argv.includes("--bootstrap-admin")) {
      await disconnectDatabase().catch((error) => {
        console.error("Database disconnect failed:", error.message);
        process.exitCode = 1;
      });
    }
  }
}

// Legacy shutdown handlers - now handled by setupGracefulShutdown()
// Kept for backward compatibility during transition
async function shutdown(signal) {
  console.log(`${signal} received. Delegating to graceful shutdown handler...`);
  // The gracefulShutdown utility will handle everything
}

// These are now redundant but kept to avoid breaking existing code
process.once("SIGINT", () => shutdown("SIGINT"));
process.once("SIGTERM", () => shutdown("SIGTERM"));

await startServer();
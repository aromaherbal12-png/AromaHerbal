import { Router } from "express";
import mongoose from "mongoose";

import authRoutes from "../modules/auth/auth.routes.js";
import userRoutes from "../modules/users/users.routes.js";
import inventoryRoutes from "../modules/inventory/inventory.routes.js";
import qualityRoutes from "../modules/quality/quality.routes.js";
import productionRoutes from "../modules/production/production.routes.js";
import finishedGoodsRoutes from "../modules/finished-goods/finishedGoods.routes.js";
import dispatchRoutes from "../modules/dispatch/dispatch.routes.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import machinesRoutes from "../modules/machines/machines.routes.js";
import dashboardRoutes from "../modules/dashboard/dashboard.routes.js";
import reportsRoutes from "../modules/reports/reports.routes.js";
import auditRoutes from "../modules/audit/audit.routes.js";
import messagesRoutes from "../modules/messages/messages.routes.js";
import batchDataRoutes from "../modules/production/batchData.routes.js";

const router = Router();

router.get("/", (req, res) => {
  res.status(200).json(
    new ApiResponse(200, "Welcome to Aroma Workflow API", {
      version: "1.0.0",
      healthCheck: "/api/health",
    })
  );
});

router.get("/health", (req, res) => {
  const states = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting",
  };

  const database = states[mongoose.connection.readyState] || "unknown";
  const healthy = database === "connected";

  // Match the format the frontend expects
  const healthData = {
    service: "aroma-workflow-backend",
    database: database, // Frontend expects this to be a string: "connected" or "disconnected"
    timestamp: new Date().toISOString(),
  };

  res.status(healthy ? 200 : 503).json(
    new ApiResponse(
      healthy ? 200 : 503,
      healthy ? "Aroma Workflow API is healthy" : "Service is unhealthy - database not connected",
      healthData
    )
  );
});

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/inventory", inventoryRoutes);
router.use("/quality", qualityRoutes);
router.use("/production", productionRoutes);
router.use("/finished-goods", finishedGoodsRoutes);
router.use("/dispatch", dispatchRoutes);
router.use("/machines", machinesRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/reports", reportsRoutes);
router.use("/audit", auditRoutes);
router.use("/messages", messagesRoutes);
router.use("/batch-data", batchDataRoutes);

export default router;

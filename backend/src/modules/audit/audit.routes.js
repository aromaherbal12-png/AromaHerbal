import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import { allowRoles } from "../../middleware/permission.middleware.js";
import { USER_ROLES } from "../users/models/User.js";
import {
  listAuditLogs,
  getAuditLog,
  getEntityAuditTrail,
  getUserAuditLogs,
  getAuditStatistics,
} from "./audit.controller.js";

const router = Router();

// All audit routes require authentication
router.use(authenticate);

// Only administrators and managers can view audit logs
const canViewAudits = allowRoles(USER_ROLES.ADMINISTRATOR, USER_ROLES.MANAGER);

// List all audit logs with filtering
router.get("/", canViewAudits, listAuditLogs);

// Get audit statistics
router.get("/statistics", canViewAudits, getAuditStatistics);

// Get specific audit log
router.get("/:id", canViewAudits, getAuditLog);

// Get audit trail for a specific entity
router.get("/entity/:entityType/:entityId", canViewAudits, getEntityAuditTrail);

// Get audit logs for a specific user
router.get("/user/:userId", canViewAudits, getUserAuditLogs);

export default router;

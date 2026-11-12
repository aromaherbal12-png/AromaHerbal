import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import { allowRoles } from "../../middleware/permission.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { USER_ROLES } from "../users/models/User.js";

import {
  createMachineController,
  listMachinesController,
  getMachineController,
  updateMachineController,
  updateMachineStatusController,
  getMachineDowntimeHistoryController,
  reportMachineDowntimeController,
  startMachineDowntimeController,
  resolveMachineDowntimeController,
  cancelMachineDowntimeController,
} from "./machines.controller.js";

import {
  createMachineSchema,
  updateMachineSchema,
  machineIdSchema,
  updateMachineStatusSchema,
  listMachinesSchema,
  machineDowntimeHistorySchema,
  reportMachineDowntimeSchema,
  downtimeIdSchema,
  resolveMachineDowntimeSchema,
  cancelMachineDowntimeSchema,
} from "./machines.validation.js";

const router = Router();

const allRoles = allowRoles(
  USER_ROLES.ADMINISTRATOR, USER_ROLES.MANAGER,
  USER_ROLES.PRODUCTION_INCHARGE, USER_ROLES.STORE_INCHARGE,
  USER_ROLES.QUALITY_INCHARGE
);
const canManageMachines = allowRoles(
  USER_ROLES.ADMINISTRATOR, USER_ROLES.MANAGER, USER_ROLES.PRODUCTION_INCHARGE
);
const canManageDowntime = allowRoles(
  USER_ROLES.ADMINISTRATOR, USER_ROLES.MANAGER, USER_ROLES.PRODUCTION_INCHARGE
);
const adminManagerOnly = allowRoles(USER_ROLES.ADMINISTRATOR, USER_ROLES.MANAGER);

router.use(authenticate);

// ── Downtime routes — registered BEFORE /:id to avoid param collision ─────────
router.post("/downtime", canManageDowntime, validate(reportMachineDowntimeSchema), reportMachineDowntimeController);
router.patch("/downtime/:downtimeId/start",   canManageDowntime, validate(downtimeIdSchema),               startMachineDowntimeController);
router.patch("/downtime/:downtimeId/resolve", canManageDowntime, validate(resolveMachineDowntimeSchema),   resolveMachineDowntimeController);
router.patch("/downtime/:downtimeId/cancel",  adminManagerOnly,  validate(cancelMachineDowntimeSchema),    cancelMachineDowntimeController);

// ── Machine routes ─────────────────────────────────────────────────────────────
router.get("/",    allRoles,        validate(listMachinesSchema),        listMachinesController);
router.post("/",   canManageMachines, validate(createMachineSchema),     createMachineController);

// Downtime history must come before /:id (both use /:id prefix)
router.get("/:id/downtime", allowRoles(USER_ROLES.ADMINISTRATOR, USER_ROLES.MANAGER, USER_ROLES.PRODUCTION_INCHARGE, USER_ROLES.QUALITY_INCHARGE), validate(machineDowntimeHistorySchema), getMachineDowntimeHistoryController);

router.get("/:id",           allRoles,         validate(machineIdSchema),           getMachineController);
router.patch("/:id",         canManageMachines, validate(updateMachineSchema),       updateMachineController);
router.patch("/:id/status",  canManageMachines, validate(updateMachineStatusSchema), updateMachineStatusController);

export default router;

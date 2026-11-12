import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import { allowRoles } from "../../middleware/permission.middleware.js";
import { USER_ROLES } from "../users/models/User.js";
import {
  getDashboardSummaryController,
  getProductionDashboardController,
  getInventoryDashboardController,
  getQualityDashboardController,
  getMachineDashboardController,
  getDispatchDashboardController,
} from "./dashboard.controller.js";

const router = Router();

const allRoles = allowRoles(
  USER_ROLES.ADMINISTRATOR, USER_ROLES.MANAGER,
  USER_ROLES.PRODUCTION_INCHARGE, USER_ROLES.STORE_INCHARGE,
  USER_ROLES.QUALITY_INCHARGE
);

router.use(authenticate);

router.get("/",          allRoles, getDashboardSummaryController);
router.get("/production", allowRoles(USER_ROLES.ADMINISTRATOR, USER_ROLES.MANAGER, USER_ROLES.PRODUCTION_INCHARGE), getProductionDashboardController);
router.get("/inventory",  allowRoles(USER_ROLES.ADMINISTRATOR, USER_ROLES.MANAGER, USER_ROLES.STORE_INCHARGE),      getInventoryDashboardController);
router.get("/quality",    allowRoles(USER_ROLES.ADMINISTRATOR, USER_ROLES.MANAGER, USER_ROLES.QUALITY_INCHARGE),    getQualityDashboardController);
router.get("/machines",   allowRoles(USER_ROLES.ADMINISTRATOR, USER_ROLES.MANAGER, USER_ROLES.PRODUCTION_INCHARGE), getMachineDashboardController);
router.get("/dispatch",   allowRoles(USER_ROLES.ADMINISTRATOR, USER_ROLES.MANAGER, USER_ROLES.STORE_INCHARGE),      getDispatchDashboardController);

export default router;

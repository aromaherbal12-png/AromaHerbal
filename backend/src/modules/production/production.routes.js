import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import { allowRoles } from "../../middleware/permission.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { USER_ROLES } from "../users/models/User.js";

import {
  createProductionPlan,
  listProductionPlans,
  getProductionPlan,
  approveProductionPlan,
  cancelProductionPlan,
  createProductionBatchController,
  listProductionBatchesController,
  getProductionBatchController,
  startProductionBatchController,
  holdProductionBatchController,
  resumeProductionBatchController,
  completeProductionBatchController,
  createProductionEntryController,
  listProductionEntriesController,
  getProductionEntryController,
  recordMaterialConsumptionController,
  reviewBMRController,
} from "./production.controller.js";

import {
  createProductionPlanSchema,
  listProductionPlansSchema,
  productionPlanIdSchema,
  createProductionBatchSchema,
  listProductionBatchesSchema,
  productionBatchIdSchema,
  productionBatchNotesSchema,
  completeProductionBatchSchema,
  createProductionEntrySchema,
  listProductionEntriesSchema,
  productionEntryIdSchema,
  recordMaterialConsumptionSchema,
  reviewBmrSchema,
} from "./production.validation.js";

const router = Router();

const allRoles = allowRoles(
  USER_ROLES.ADMINISTRATOR, USER_ROLES.MANAGER,
  USER_ROLES.PRODUCTION_INCHARGE, USER_ROLES.STORE_INCHARGE,
  USER_ROLES.QUALITY_INCHARGE
);
const canManagePlan = allowRoles(USER_ROLES.ADMINISTRATOR, USER_ROLES.MANAGER, USER_ROLES.PRODUCTION_INCHARGE);
const canApprovePlan = allowRoles(USER_ROLES.ADMINISTRATOR, USER_ROLES.MANAGER);
const canManageBatch = allowRoles(USER_ROLES.ADMINISTRATOR, USER_ROLES.PRODUCTION_INCHARGE);

router.use(authenticate);

// Production Plans
router.get("/plans", validate(listProductionPlansSchema), listProductionPlans);
router.get("/plans/:id", validate(productionPlanIdSchema), getProductionPlan);
router.post("/plans", canManagePlan, validate(createProductionPlanSchema), createProductionPlan);
router.patch("/plans/:id/approve", canApprovePlan, validate(productionPlanIdSchema), approveProductionPlan);
router.patch("/plans/:id/cancel", canApprovePlan, validate(productionPlanIdSchema), cancelProductionPlan);

// Production Batches
router.get("/batches", allRoles, validate(listProductionBatchesSchema), listProductionBatchesController);
router.get("/batches/:id", allRoles, validate(productionBatchIdSchema), getProductionBatchController);
router.post("/batches", canManagePlan, validate(createProductionBatchSchema), createProductionBatchController);
router.patch("/batches/:id/start", canManageBatch, validate(productionBatchIdSchema), startProductionBatchController);
router.patch("/batches/:id/hold", canManageBatch, validate(productionBatchNotesSchema), holdProductionBatchController);
router.patch("/batches/:id/resume", canManageBatch, validate(productionBatchIdSchema), resumeProductionBatchController);
router.patch("/batches/:id/complete", canManageBatch, validate(completeProductionBatchSchema), completeProductionBatchController);

// Production Entries
router.get("/entries", allRoles, validate(listProductionEntriesSchema), listProductionEntriesController);
router.get("/entries/:id", allRoles, validate(productionEntryIdSchema), getProductionEntryController);
router.post("/entries", canManageBatch, validate(createProductionEntrySchema), createProductionEntryController);

// Material Consumption & BMR Review
router.post("/batches/:id/material-consumption", canManageBatch, validate(recordMaterialConsumptionSchema), recordMaterialConsumptionController);
router.patch("/bmr/:id/review", allowRoles(USER_ROLES.ADMINISTRATOR, USER_ROLES.QUALITY_INCHARGE), validate(reviewBmrSchema), reviewBMRController);

export default router;

import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../../middleware/auth.middleware.js";
import { allowRoles } from "../../middleware/permission.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { USER_ROLES } from "../users/models/User.js";
import {
  createBatchDataController,
  upsertBatchDataController,
  listBatchDataController,
  getBatchDataController,
  deleteBatchDataController,
} from "./batchData.controller.js";

const router = Router();

const canManage = allowRoles(
  USER_ROLES.ADMINISTRATOR,
  USER_ROLES.PRODUCTION_INCHARGE
);

const allRoles = allowRoles(
  USER_ROLES.ADMINISTRATOR,
  USER_ROLES.MANAGER,
  USER_ROLES.PRODUCTION_INCHARGE,
  USER_ROLES.STORE_INCHARGE,
  USER_ROLES.QUALITY_INCHARGE
);

const upsertSchema = z.object({
  body: z.object({
    batchId: z.string().trim().min(1, "batchId is required").max(100),
    data: z.record(z.any()),
  }),
});

const batchIdSchema = z.object({
  params: z.object({
    batchId: z.string().trim().min(1).max(100),
  }),
});

router.use(authenticate);

router.get("/", allRoles, listBatchDataController);
router.post("/", canManage, validate(upsertSchema), upsertBatchDataController);
router.get("/:batchId", allRoles, validate(batchIdSchema), getBatchDataController);
router.delete("/:batchId", canManage, validate(batchIdSchema), deleteBatchDataController);

export default router;

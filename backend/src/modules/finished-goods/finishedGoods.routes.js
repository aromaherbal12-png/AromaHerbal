import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../../middleware/auth.middleware.js";
import { allowRoles } from "../../middleware/permission.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { USER_ROLES } from "../users/models/User.js";
import {
  createFinishedGoodsLotController,
  releaseFinishedGoodsLotController,
  listFinishedGoodsController,
  getFinishedGoodsLotController,
  createFinishedGoodsFromBMRController,
} from "./finishedGoods.controller.js";

const router = Router();

const allRoles = allowRoles(
  USER_ROLES.ADMINISTRATOR, USER_ROLES.MANAGER,
  USER_ROLES.PRODUCTION_INCHARGE, USER_ROLES.STORE_INCHARGE,
  USER_ROLES.QUALITY_INCHARGE
);

const fromBMRSchema = z.object({
  body: z.object({
    productName: z.string().trim().min(1, "Product name is required").max(200),
    bmrNumber: z.string().trim().max(100).optional(),
    productCode: z.string().trim().max(100).optional(),
    producedQuantity: z.coerce.number().positive("Produced quantity must be greater than zero"),
    rejectedQuantity: z.coerce.number().min(0).default(0),
    unit: z.string().trim().max(20).optional(),
  }),
});

router.use(authenticate);

router.get("/", allRoles, listFinishedGoodsController);
router.post("/from-bmr", allowRoles(USER_ROLES.ADMINISTRATOR, USER_ROLES.PRODUCTION_INCHARGE), validate(fromBMRSchema), createFinishedGoodsFromBMRController);
router.get("/:id", allRoles, getFinishedGoodsLotController);
router.post("/", allowRoles(USER_ROLES.ADMINISTRATOR, USER_ROLES.PRODUCTION_INCHARGE), createFinishedGoodsLotController);
router.patch("/:id/release", allowRoles(USER_ROLES.ADMINISTRATOR, USER_ROLES.QUALITY_INCHARGE), releaseFinishedGoodsLotController);

export default router;

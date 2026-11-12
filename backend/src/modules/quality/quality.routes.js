import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import { allowRoles } from "../../middleware/permission.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { USER_ROLES } from "../users/models/User.js";

import {
  createMaterialQC,
  listMaterialQC,
  getMaterialQC,
  createProductionQCController,
  listProductionQCController,
  getProductionQCController,
  decideProductionQCController,
} from "./quality.controller.js";

import {
  createMaterialQCSchema,
  listMaterialQCSchema,
  materialQCIdSchema,
  createProductionQCSchema,
  listProductionQCSchema,
  productionQCIdSchema,
  decideProductionQCSchema,
} from "./quality.validation.js";

const router = Router();

router.use(authenticate);

const canManageQC = allowRoles(USER_ROLES.ADMINISTRATOR, USER_ROLES.QUALITY_INCHARGE);
const allRoles = allowRoles(USER_ROLES.ADMINISTRATOR, USER_ROLES.MANAGER, USER_ROLES.PRODUCTION_INCHARGE, USER_ROLES.STORE_INCHARGE, USER_ROLES.QUALITY_INCHARGE);

// Material QC
router.get("/material-qc", validate(listMaterialQCSchema), listMaterialQC);
router.get("/material-qc/:id", validate(materialQCIdSchema), getMaterialQC);
router.post("/material-qc", canManageQC, validate(createMaterialQCSchema), createMaterialQC);

// Production QC
router.post("/production-qc", canManageQC, validate(createProductionQCSchema), createProductionQCController);
router.get("/production-qc", allRoles, validate(listProductionQCSchema), listProductionQCController);
router.get("/production-qc/:id", allRoles, validate(productionQCIdSchema), getProductionQCController);
router.patch("/production-qc/:id/decision", canManageQC, validate(decideProductionQCSchema), decideProductionQCController);

export default router;

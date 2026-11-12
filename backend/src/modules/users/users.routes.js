import { Router } from "express";
import { getMe, getUsers, changeRole, changeStatus } from "./users.controller.js";
import { authenticate } from "../../middleware/auth.middleware.js";
import { administratorOnly } from "../../middleware/permission.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { userIdSchema, updateRoleSchema, updateStatusSchema } from "./user.validation.js";

const router = Router();

router.use(authenticate);

router.get("/me", getMe);
router.get("/", administratorOnly, getUsers);
router.patch("/:id/role", administratorOnly, validate(updateRoleSchema), changeRole);
router.patch("/:id/status", administratorOnly, validate(updateStatusSchema), changeStatus);

export default router;

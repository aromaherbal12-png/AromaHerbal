import { Router } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import { authenticate } from "../../middleware/auth.middleware.js";
import { allowRoles } from "../../middleware/permission.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { USER_ROLES } from "../users/models/User.js";
import {
  createDispatchController,
  confirmDispatchController,
  cancelDispatchController,
  listDispatchesController,
  getDispatchController,
  directDispatchController,
} from "./dispatch.controller.js";

const router = Router();

const allRoles = allowRoles(
  USER_ROLES.ADMINISTRATOR, USER_ROLES.MANAGER,
  USER_ROLES.PRODUCTION_INCHARGE, USER_ROLES.STORE_INCHARGE,
  USER_ROLES.QUALITY_INCHARGE
);
const canDispatch = allowRoles(USER_ROLES.ADMINISTRATOR, USER_ROLES.STORE_INCHARGE);

const dispatchIdSchema = z.object({
  params: z.object({ id: z.string().refine((v) => mongoose.isValidObjectId(v), "Invalid dispatch ID") }),
});

const createDispatchSchema = z.object({
  body: z.object({
    finishedGoodsId: z.string().refine((v) => mongoose.isValidObjectId(v), "Invalid finished-goods ID"),
    quantity: z.coerce.number().positive("Quantity must be greater than zero"),
    customerName: z.string().trim().min(1).max(200),
    destination: z.string().trim().max(500).optional(),
    referenceNumber: z.string().trim().max(100).optional(),
    notes: z.string().trim().max(1000).optional(),
  }),
});

const directDispatchSchema = z.object({
  body: z.object({
    finishedGoodsId: z.string().refine((v) => mongoose.isValidObjectId(v), "Invalid finished-goods ID"),
    quantity: z.coerce.number().positive("Quantity must be greater than zero"),
    destination: z.string().trim().min(1, "Location/Purpose is required").max(500),
    customerName: z.string().trim().max(200).optional(),
    referenceNumber: z.string().trim().max(100).optional(),
    notes: z.string().trim().max(1000).optional(),
    dispatchDate: z.string().optional(),
  }),
});

const cancelDispatchSchema = z.object({
  params: dispatchIdSchema.shape.params,
  body: z.object({ reason: z.string().trim().min(3).max(500) }),
});

const listDispatchesSchema = z.object({
  query: z.object({
    status: z.enum(["Reserved", "Dispatched", "Cancelled"]).optional(),
    finishedGoodsId: z.string().refine((v) => mongoose.isValidObjectId(v), "Invalid finished-goods ID").optional(),
    customerName: z.string().trim().max(200).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),
});

router.use(authenticate);

router.post("/", canDispatch, validate(createDispatchSchema), createDispatchController);
router.post("/direct", canDispatch, validate(directDispatchSchema), directDispatchController);
router.get("/", allRoles, validate(listDispatchesSchema), listDispatchesController);
router.get("/:id", allRoles, validate(dispatchIdSchema), getDispatchController);
router.patch("/:id/confirm", canDispatch, validate(dispatchIdSchema), confirmDispatchController);
router.patch("/:id/cancel", canDispatch, validate(cancelDispatchSchema), cancelDispatchController);

export default router;

import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import { create, list, update } from "./receivers.controller.js";

const router = Router();

// All receiver routes require authentication
router.use(authenticate);

// GET  /api/receivers         → list all receivers
// POST /api/receivers         → create a new receiver
// PATCH /api/receivers/:id    → update an existing receiver
router.get("/", list);
router.post("/", create);
router.patch("/:id", update);

export default router;

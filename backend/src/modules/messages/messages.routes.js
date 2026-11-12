import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import {
  sendMessageController,
  getInboxController,
  getOutboxController,
  getUnreadCountController,
  markAsReadController,
  markAllAsReadController,
  listRecipientsController,
} from "./messages.controller.js";
import { sendMessageSchema, messageIdSchema } from "./messages.validation.js";

const router = Router();

// All message routes require a valid JWT
router.use(authenticate);

// Recipient list (for the send dropdown)
router.get("/recipients", listRecipientsController);

// Unread badge count
router.get("/unread-count", getUnreadCountController);

// Inbox / Outbox
router.get("/inbox", getInboxController);
router.get("/outbox", getOutboxController);

// Send a message
router.post("/", validate(sendMessageSchema), sendMessageController);

// Mark one message as read
router.patch("/:id/read", validate(messageIdSchema), markAsReadController);

// Mark all messages as read
router.patch("/mark-all-read", markAllAsReadController);

export default router;

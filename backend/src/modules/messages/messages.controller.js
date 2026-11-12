import { ApiResponse } from "../../utils/ApiResponse.js";
import {
  sendMessage,
  getInbox,
  getOutbox,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  listRecipients,
} from "./messages.service.js";

/** POST /api/messages */
export async function sendMessageController(req, res, next) {
  try {
    const { recipientId, body } = req.validated.body;
    const message = await sendMessage({
      senderId: req.user._id,
      recipientId,
      body,
    });
    res
      .status(201)
      .json(new ApiResponse(201, "Message sent successfully.", message));
  } catch (err) {
    next(err);
  }
}

/** GET /api/messages/inbox */
export async function getInboxController(req, res, next) {
  try {
    const messages = await getInbox(req.user._id);
    res
      .status(200)
      .json(new ApiResponse(200, "Inbox retrieved.", messages));
  } catch (err) {
    next(err);
  }
}

/** GET /api/messages/outbox */
export async function getOutboxController(req, res, next) {
  try {
    const messages = await getOutbox(req.user._id);
    res
      .status(200)
      .json(new ApiResponse(200, "Outbox retrieved.", messages));
  } catch (err) {
    next(err);
  }
}

/** GET /api/messages/unread-count */
export async function getUnreadCountController(req, res, next) {
  try {
    const count = await getUnreadCount(req.user._id);
    res
      .status(200)
      .json(new ApiResponse(200, "Unread count retrieved.", { count }));
  } catch (err) {
    next(err);
  }
}

/** PATCH /api/messages/:id/read */
export async function markAsReadController(req, res, next) {
  try {
    const { id } = req.validated.params;
    await markAsRead(id, req.user._id);
    res
      .status(200)
      .json(new ApiResponse(200, "Message marked as read."));
  } catch (err) {
    next(err);
  }
}

/** PATCH /api/messages/mark-all-read */
export async function markAllAsReadController(req, res, next) {
  try {
    const count = await markAllAsRead(req.user._id);
    res
      .status(200)
      .json(
        new ApiResponse(200, `${count} message(s) marked as read.`, { count })
      );
  } catch (err) {
    next(err);
  }
}

/** GET /api/messages/recipients */
export async function listRecipientsController(req, res, next) {
  try {
    const users = await listRecipients(req.user._id);
    res
      .status(200)
      .json(new ApiResponse(200, "Recipients retrieved.", users));
  } catch (err) {
    next(err);
  }
}

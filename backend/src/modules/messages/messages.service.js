import Message from "./models/Message.js";
import User from "../users/models/User.js";
import { ApiError } from "../../utils/ApiError.js";

/**
 * Send a message from one user to another.
 * Looks up the recipient by ID and stores their name/role snapshot.
 */
export async function sendMessage({ senderId, recipientId, body }) {
  if (String(senderId) === String(recipientId)) {
    throw new ApiError(400, "You cannot send a message to yourself.");
  }

  const [sender, recipient] = await Promise.all([
    User.findById(senderId).lean(),
    User.findById(recipientId).lean(),
  ]);

  if (!sender) throw new ApiError(404, "Sender not found.");
  if (!recipient || !recipient.isActive) {
    throw new ApiError(404, "Recipient not found or inactive.");
  }

  const message = await Message.create({
    sender: sender._id,
    senderName: sender.name,
    senderRole: sender.role,
    recipient: recipient._id,
    recipientName: recipient.name,
    recipientRole: recipient.role,
    body: body.trim(),
  });

  return message;
}

/**
 * Get all messages received by the current user (inbox), newest first.
 */
export async function getInbox(userId) {
  return Message.find({ recipient: userId })
    .sort({ createdAt: -1 })
    .lean();
}

/**
 * Get all messages sent by the current user (outbox), newest first.
 */
export async function getOutbox(userId) {
  return Message.find({ sender: userId })
    .sort({ createdAt: -1 })
    .lean();
}

/**
 * Count unread messages for the current user.
 */
export async function getUnreadCount(userId) {
  return Message.countDocuments({ recipient: userId, isRead: false });
}

/**
 * Mark a single message as read.
 * Only the recipient may mark it read.
 */
export async function markAsRead(messageId, userId) {
  const message = await Message.findOneAndUpdate(
    { _id: messageId, recipient: userId, isRead: false },
    { $set: { isRead: true, readAt: new Date() } },
    { new: true }
  );

  // If not found, it may already be read or not belong to this user — that's fine.
  return message;
}

/**
 * Mark ALL unread messages for a user as read in one shot.
 */
export async function markAllAsRead(userId) {
  const result = await Message.updateMany(
    { recipient: userId, isRead: false },
    { $set: { isRead: true, readAt: new Date() } }
  );
  return result.modifiedCount;
}

/**
 * List all active users except the caller — used to populate the recipient dropdown.
 */
export async function listRecipients(callerId) {
  const users = await User.find(
    { _id: { $ne: callerId }, isActive: true },
    { name: 1, role: 1, email: 1 }
  )
    .sort({ name: 1 })
    .lean();

  return users;
}

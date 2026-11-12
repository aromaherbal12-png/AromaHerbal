import api from "./api.js";

const messagesApi = {
  /** Fetch all users who can receive messages (excludes self). */
  getRecipients: () => api.get("/messages/recipients"),

  /** Fetch the current user's inbox (messages received). */
  getInbox: () => api.get("/messages/inbox"),

  /** Fetch the current user's outbox (messages sent). */
  getOutbox: () => api.get("/messages/outbox"),

  /** Get the count of unread messages. */
  getUnreadCount: () => api.get("/messages/unread-count"),

  /** Send a message to a recipient. */
  send: (recipientId, body) =>
    api.post("/messages", { recipientId, body }),

  /** Mark a single message as read. */
  markRead: (id) => api.patch(`/messages/${id}/read`),

  /** Mark all inbox messages as read. */
  markAllRead: () => api.patch("/messages/mark-all-read"),
};

export default messagesApi;

import { z } from "zod";

export const sendMessageSchema = z.object({
  body: z.object({
    recipientId: z
      .string({ required_error: "recipientId is required." })
      .regex(/^[a-f\d]{24}$/i, "recipientId must be a valid MongoDB ObjectId."),
    body: z
      .string({ required_error: "Message body is required." })
      .trim()
      .min(1, "Message cannot be empty.")
      .max(2000, "Message cannot exceed 2000 characters."),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

export const messageIdSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({
    id: z
      .string({ required_error: "Message ID is required." })
      .regex(/^[a-f\d]{24}$/i, "Message ID must be a valid MongoDB ObjectId."),
  }),
  query: z.object({}).optional(),
});

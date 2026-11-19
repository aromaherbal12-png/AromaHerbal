import { z } from "zod";
import { USER_ROLE_VALUES } from "./models/User.js";

export const userIdSchema = z.object({
  body: z.object({}),
  params: z.object({
    id: z.string().regex(/^[a-f\d]{24}$/i, "Invalid user ID"),
  }),
  query: z.object({}),
});

export const updateRoleSchema = z.object({
  body: z.object({
    role: z.enum(USER_ROLE_VALUES),
  }).strict(),
  params: z.object({
    id: z.string().regex(/^[a-f\d]{24}$/i, "Invalid user ID"),
  }),
  query: z.object({}),
});

export const updateStatusSchema = z.object({
  body: z.object({
    isActive: z.boolean(),
  }).strict(),
  params: z.object({
    id: z.string().regex(/^[a-f\d]{24}$/i, "Invalid user ID"),
  }),
  query: z.object({}),
});

export const updatePasswordSchema = z.object({
  body: z.object({
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[a-zA-Z]/, "Password must contain at least one letter")
      .regex(/[0-9]/, "Password must contain at least one number"),
    confirmPassword: z.string(),
  })
  .strict()
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  }),
  params: z.object({
    id: z.string().regex(/^[a-f\d]{24}$/i, "Invalid user ID"),
  }),
  query: z.object({}),
});
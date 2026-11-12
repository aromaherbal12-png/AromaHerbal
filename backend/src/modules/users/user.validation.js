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
import { z } from "zod";

export const e164Phone = z
  .string()
  .regex(/^\+[1-9]\d{1,14}$/, "Phone number must be in E.164 format, e.g. +919876543210");

export const inviteStaffSchema = z.object({
  email: z.string().email(),
  full_name: z.string().min(1).max(120),
  whatsapp_number: e164Phone.optional(),
});
export type InviteStaffInput = z.infer<typeof inviteStaffSchema>;

export const updateUserSchema = z.object({
  full_name: z.string().min(1).max(120).optional(),
  whatsapp_number: e164Phone.nullable().optional(),
});
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

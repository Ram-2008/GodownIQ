import { z } from "zod";

const money = z
  .number()
  .nonnegative()
  .refine((v) => Number.isInteger(v * 100), "Up to 2 decimal places only");

export const expenseCategoryEnum = z.enum(["rent", "salaries", "utilities", "maintenance", "transport", "other"]);

export const createExpenseSchema = z.object({
  category: expenseCategoryEnum,
  description: z.string().trim().min(1).max(200),
  amount: money,
  expense_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "expense_date must be YYYY-MM-DD"),
  payment_status: z.enum(["paid", "pending"]).default("paid"),
  payment_due_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  note: z.string().trim().max(500).optional(),
});
export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;

export const updateExpenseSchema = z.object({
  category: expenseCategoryEnum.optional(),
  description: z.string().trim().min(1).max(200).optional(),
  amount: money.optional(),
  expense_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  payment_status: z.enum(["paid", "pending"]).optional(),
  payment_due_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  note: z.string().trim().max(500).nullable().optional(),
});
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;

export const listExpensesQuerySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  category: expenseCategoryEnum.optional(),
  q: z.string().trim().min(1).max(120).optional(),
  page: z.coerce.number().int().positive().default(1),
  page_size: z.coerce.number().int().positive().max(200).default(50),
});

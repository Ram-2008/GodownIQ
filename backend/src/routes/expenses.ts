import { Router } from "express";
import { authenticate, requireOwner } from "../middleware/auth";
import { asyncHandler } from "../middleware/asyncHandler";
import { createExpenseSchema, listExpensesQuerySchema, updateExpenseSchema } from "../validation/expenses";
import {
  createExpense,
  getExpenseById,
  listExpenses,
  markExpensePaid,
  softDeleteExpense,
  updateExpense,
} from "../services/expenseService";

export const expensesRouter = Router();

expensesRouter.use(authenticate);

expensesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const query = listExpensesQuerySchema.parse(req.query);
    const result = await listExpenses(req.supabase!, {
      from: query.from,
      to: query.to,
      category: query.category,
      q: query.q,
      page: query.page,
      pageSize: query.page_size,
    });
    res.json(result);
  })
);

expensesRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const expense = await getExpenseById(req.supabase!, req.params.id);
    res.json({ expense });
  })
);

expensesRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const input = createExpenseSchema.parse(req.body);
    const expense = await createExpense(req.supabase!, req.profile!, input);
    res.status(201).json({ expense });
  })
);

expensesRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const input = updateExpenseSchema.parse(req.body);
    const expense = await updateExpense(req.supabase!, req.profile!, req.params.id, input);
    res.json({ expense });
  })
);

expensesRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await softDeleteExpense(req.supabase!, req.profile!, req.params.id);
    res.status(204).send();
  })
);

expensesRouter.post(
  "/:id/mark-paid",
  requireOwner,
  asyncHandler(async (req, res) => {
    const expense = await markExpensePaid(req.supabase!, req.profile!, req.params.id);
    res.json({ expense });
  })
);

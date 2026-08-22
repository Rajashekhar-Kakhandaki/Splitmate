const express = require("express");
const { body, validationResult } = require("express-validator");
const { requireAuth } = require("../middleware/auth.middleware");
const {
  createExpense,
  listExpenses,
  getDashboard,
  updateExpense,
  deleteExpense,
  CATEGORIES,
} = require("../controllers/expense.controller");

// mergeParams lets this router read :id from the parent /api/rooms/:id mount
const router = express.Router({ mergeParams: true });

function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: "Validation failed.", details: errors.array() });
  }
  next();
}

router.use(requireAuth);

router.get("/", listExpenses);

router.post(
  "/",
  [
    body("title").trim().notEmpty().withMessage("Title is required."),
    body("amount").isFloat({ gt: 0 }).withMessage("Amount must be a positive number."),
    body("category")
      .isIn(CATEGORIES)
      .withMessage(`Category must be one of: ${CATEGORIES.join(", ")}`),
    body("paidBy").notEmpty().withMessage("Paid by is required."),
    body("splitWith").isIn(["all", "custom", "exact", "percentage", "shares"]).withMessage("Invalid splitWith."),
    body("memberIds").optional().isArray(),
    body("computedShares").optional().isArray(),
    body("computedShares.*.memberId").optional().isString(),
    body("computedShares.*.shareAmount").optional().isNumeric(),
    body("date").optional().isISO8601().withMessage("Date must be a valid date."),
    body("note").optional().isString(),
  ],
  validate,
  createExpense
);

router.put(
  "/:expenseId",
  [
    body("title").optional().trim().notEmpty().withMessage("Title cannot be empty."),
    body("amount").optional().isFloat({ gt: 0 }).withMessage("Amount must be a positive number."),
    body("category")
      .optional()
      .isIn(CATEGORIES)
      .withMessage(`Category must be one of: ${CATEGORIES.join(", ")}`),
    body("paidBy").optional().notEmpty().withMessage("Paid by is required."),
    body("splitWith").optional().isIn(["all", "custom", "exact", "percentage", "shares"]),
    body("memberIds").optional().isArray(),
    body("computedShares").optional().isArray(),
    body("date").optional().isISO8601(),
    body("note").optional().isString(),
  ],
  validate,
  updateExpense
);

router.delete("/:expenseId", deleteExpense);

module.exports = router;

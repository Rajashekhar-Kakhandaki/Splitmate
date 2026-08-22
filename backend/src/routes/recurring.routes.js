const express = require("express");
const { body, validationResult } = require("express-validator");
const { requireAuth } = require("../middleware/auth.middleware");
const { listRecurring, createRecurring, deleteRecurring, applyRecurring, CATEGORIES } = require("../controllers/recurring.controller");

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

router.get("/", listRecurring);

router.post(
  "/",
  [
    body("title").trim().notEmpty().withMessage("Title is required."),
    body("amount").isFloat({ gt: 0 }).withMessage("Amount must be positive."),
    body("category").isIn(CATEGORIES).withMessage("Invalid category."),
    body("paidBy").notEmpty().withMessage("Paid by is required."),
    body("frequency").isIn(["weekly", "monthly"]).withMessage("Frequency must be weekly or monthly."),
    body("nextDueDate").optional().isISO8601(),
    body("splitWith").optional().isIn(["all", "custom"]).withMessage("splitWith must be 'all' or 'custom'."),
    body("memberIds").optional().isArray(),
  ],
  validate,
  createRecurring
);

router.delete("/:rid", deleteRecurring);
router.post("/:rid/apply", applyRecurring);

module.exports = router;

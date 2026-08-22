const express = require("express");
const { body, validationResult } = require("express-validator");
const { requireAuth } = require("../middleware/auth.middleware");
const { getBudget, setBudget, deleteBudget } = require("../controllers/budget.controller");

const router = express.Router({ mergeParams: true });

function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: "Validation failed.", details: errors.array() });
  }
  next();
}

router.use(requireAuth);

router.get("/", getBudget);
router.put(
  "/",
  [body("monthlyLimit").isFloat({ gt: 0 }).withMessage("Monthly limit must be a positive number.")],
  validate,
  setBudget
);
router.delete("/", deleteBudget);

module.exports = router;

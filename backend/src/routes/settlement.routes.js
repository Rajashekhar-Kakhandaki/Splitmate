const express = require("express");
const { body, validationResult } = require("express-validator");
const { requireAuth } = require("../middleware/auth.middleware");
const {
  getSuggestions,
  listSettlements,
  createSettlement,
  deletePendingSettlement,
  updateSettlementMethod,
} = require("../controllers/settlement.controller");

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

router.get("/suggestions", getSuggestions);
router.get("/", listSettlements);

router.post(
  "/",
  [
    body("payer").notEmpty().withMessage("Payer is required."),
    body("receiver").notEmpty().withMessage("Receiver is required."),
    body("amount").isFloat({ gt: 0 }).withMessage("Amount must be a positive number."),
  ],
  validate,
  createSettlement
);

router.patch("/:settlementId", updateSettlementMethod);
router.delete("/pending/:settlementId", deletePendingSettlement);
router.delete("/:settlementId", deletePendingSettlement);

module.exports = router;

const express = require("express");
const { body, validationResult } = require("express-validator");
const { updateProfile, changePassword } = require("../controllers/user.controller");
const { requireAuth } = require("../middleware/auth.middleware");

const router = express.Router();

function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: "Validation failed.", details: errors.array() });
  }
  next();
}

router.put(
  "/profile",
  requireAuth,
  [
    body("name").optional().trim().notEmpty().withMessage("Name cannot be empty."),
    body("email").optional().isEmail().withMessage("A valid email is required.").normalizeEmail(),
    body("avatarUrl").optional({ nullable: true }), // Allow null to remove avatar
  ],
  validate,
  updateProfile
);

router.put(
  "/password",
  requireAuth,
  [
    body("currentPassword").notEmpty().withMessage("Current password is required."),
    body("newPassword").isLength({ min: 6 }).withMessage("New password must be at least 6 characters."),
  ],
  validate,
  changePassword
);

module.exports = router;

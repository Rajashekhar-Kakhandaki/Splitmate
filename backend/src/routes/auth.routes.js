const express = require("express");
const { body, validationResult } = require("express-validator");
const { signup, login, me, forgotPassword, resetPassword } = require("../controllers/auth.controller");
const { requireAuth } = require("../middleware/auth.middleware");

const router = express.Router();

function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: "Validation failed.", details: errors.array() });
  }
  next();
}

router.post(
  "/signup",
  [
    body("name").trim().notEmpty().withMessage("Name is required."),
    body("email").isEmail().withMessage("A valid email is required.").normalizeEmail(),
    body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters."),
  ],
  validate,
  signup
);

router.post(
  "/login",
  [
    body("email").isEmail().withMessage("A valid email is required.").normalizeEmail(),
    body("password").notEmpty().withMessage("Password is required."),
  ],
  validate,
  login
);

router.get("/me", requireAuth, me);

router.post(
  "/forgot-password",
  [body("email").isEmail().withMessage("A valid email is required.").normalizeEmail()],
  validate,
  forgotPassword
);

router.post(
  "/reset-password",
  [
    body("token").notEmpty().withMessage("Token is required."),
    body("newPassword").isLength({ min: 6 }).withMessage("Password must be at least 6 characters."),
  ],
  validate,
  resetPassword
);

module.exports = router;

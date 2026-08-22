const express = require("express");
const { body, validationResult } = require("express-validator");
const { requireAuth } = require("../middleware/auth.middleware");
const { createRoom, joinRoom, listRooms, getRoom } = require("../controllers/room.controller");
const { getDashboard } = require("../controllers/expense.controller");
const { downloadMonthlyReport, downloadExcelReport } = require("../controllers/report.controller");
const expenseRoutes = require("./expense.routes");
const settlementRoutes = require("./settlement.routes");
const recurringRoutes = require("./recurring.routes");
const budgetRoutes = require("./budget.routes");

const router = express.Router();

function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: "Validation failed.", details: errors.array() });
  }
  next();
}

router.use(requireAuth);

router.get("/", listRooms);

router.post(
  "/",
  [body("roomName").trim().notEmpty().withMessage("Room name is required.")],
  validate,
  createRoom
);

router.post(
  "/join",
  [body("roomCode").trim().notEmpty().withMessage("Room code is required.")],
  validate,
  joinRoom
);

router.get("/:id", getRoom);
router.get("/:id/dashboard", getDashboard);
router.get("/:id/report", downloadMonthlyReport);
router.get("/:id/report/excel", downloadExcelReport);

router.use("/:id/expenses", expenseRoutes);
router.use("/:id/settlements", settlementRoutes);
router.use("/:id/recurring", recurringRoutes);
router.use("/:id/budget", budgetRoutes);

module.exports = router;

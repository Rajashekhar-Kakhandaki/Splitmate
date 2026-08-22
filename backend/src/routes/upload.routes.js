const express = require("express");
const { requireAuth } = require("../middleware/auth.middleware");
const { uploadReceipt, uploadAvatar } = require("../middleware/upload");
const { handleUpload, handleAvatarUpload } = require("../controllers/upload.controller");

const router = express.Router();

router.post("/receipt", requireAuth, uploadReceipt.single("receipt"), handleUpload);
router.post("/avatar", requireAuth, uploadAvatar.single("avatar"), handleAvatarUpload);

// Multer errors (bad file type, too large) land here rather than the
// generic error handler, so we can give a clean 400 instead of a 500.
router.use((err, req, res, next) => {
  if (err) {
    return res.status(400).json({ error: err.message || "Upload failed." });
  }
  next();
});

module.exports = router;

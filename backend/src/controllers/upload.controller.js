const { uploadReceipt } = require("../middleware/upload");

// POST /api/uploads/receipt
function handleUpload(req, res) {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded. Use field name 'receipt'." });
  }
  
  // Cloudinary returns the secure URL in req.file.path
  // Local diskStorage returns the absolute file path, so we construct the local URL
  const url = process.env.CLOUDINARY_URL 
    ? req.file.path 
    : `/uploads/receipts/${req.file.filename}`;
    
  res.status(201).json({ url });
}

function handleAvatarUpload(req, res) {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded. Use field name 'avatar'." });
  }
  
  const url = process.env.CLOUDINARY_URL 
    ? req.file.path 
    : `/uploads/avatars/${req.file.filename}`;
    
  res.status(201).json({ url });
}

module.exports = { handleUpload, handleAvatarUpload };

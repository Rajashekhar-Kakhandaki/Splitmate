const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const { v2: cloudinary } = require("cloudinary");
const { CloudinaryStorage } = require("multer-storage-cloudinary");

const RECEIPT_DIR = path.join(__dirname, "..", "..", "uploads", "receipts");
const AVATAR_DIR = path.join(__dirname, "..", "..", "uploads", "avatars");
fs.mkdirSync(RECEIPT_DIR, { recursive: true });
fs.mkdirSync(AVATAR_DIR, { recursive: true });

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic"]);
const MAX_FILE_SIZE = 8 * 1024 * 1024; // 8MB — plenty for a phone photo

const localReceiptStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, RECEIPT_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || ".jpg";
    const unique = crypto.randomBytes(16).toString("hex");
    cb(null, `${unique}${ext}`);
  },
});

const localAvatarStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, AVATAR_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || ".jpg";
    const unique = crypto.randomBytes(16).toString("hex");
    cb(null, `${unique}${ext}`);
  },
});

let receiptStorage = localReceiptStorage;
let avatarStorage = localAvatarStorage;

// If Cloudinary URL is provided, configure Cloudinary Storage
if (process.env.CLOUDINARY_URL) {
  // Cloudinary auto-configures itself from the CLOUDINARY_URL env var
  
  receiptStorage = new CloudinaryStorage({
    cloudinary,
    params: {
      folder: "splitmate/receipts",
      allowed_formats: ["jpg", "jpeg", "png", "webp", "heic"],
    },
  });

  avatarStorage = new CloudinaryStorage({
    cloudinary,
    params: {
      folder: "splitmate/avatars",
      allowed_formats: ["jpg", "jpeg", "png", "webp", "heic"],
    },
  });
}

const uploadReceipt = multer({
  storage: receiptStorage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_TYPES.has(file.mimetype)) {
      return cb(new Error("Only JPEG, PNG, WEBP, or HEIC images are allowed."));
    }
    cb(null, true);
  },
});

const uploadAvatar = multer({
  storage: avatarStorage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_TYPES.has(file.mimetype)) {
      return cb(new Error("Only JPEG, PNG, WEBP, or HEIC images are allowed."));
    }
    cb(null, true);
  },
});

module.exports = { uploadReceipt, uploadAvatar, RECEIPT_DIR, AVATAR_DIR };

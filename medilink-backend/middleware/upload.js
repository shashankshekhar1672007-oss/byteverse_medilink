const multer = require('multer');
const { error } = require('../utils/apiResponse');
const logger = require('../utils/logger');

const isCloudinaryConfigured =
process.env.CLOUDINARY_CLOUD_NAME &&
process.env.CLOUDINARY_API_KEY &&
process.env.CLOUDINARY_API_SECRET;

// ── Cloudinary storage (only when configured) ─────────────────────────────────
let CloudinaryStorage, cloudinary;

if (isCloudinaryConfigured) {
cloudinary = require('cloudinary').v2;

// ✅ FIX: compatible import for all versions
const cloudinaryStoragePkg = require('multer-storage-cloudinary');
CloudinaryStorage =
cloudinaryStoragePkg.CloudinaryStorage || cloudinaryStoragePkg;

cloudinary.config({
cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
api_key: process.env.CLOUDINARY_API_KEY,
api_secret: process.env.CLOUDINARY_API_SECRET,
});
}

// ── Fallback: memory storage (dev without Cloudinary) ─────────────────────────
const memoryStorage = multer.memoryStorage();

const buildStorage = (folder, formats, transform) => {
if (!isCloudinaryConfigured) return memoryStorage;

return new CloudinaryStorage({
cloudinary,
params: {
folder,
allowed_formats: formats,
transformation: transform,
},
});
};

const fileFilter = (allowed) => (req, file, cb) => {
if (allowed.includes(file.mimetype)) cb(null, true);
else cb(new Error(`Unsupported file type: ${file.mimetype}`), false);
};

// ── Avatar uploader ───────────────────────────────────────────────────────────
const avatarUpload = multer({
storage: buildStorage(
'medilink/avatars',
['jpg', 'jpeg', 'png', 'webp'],
[{ width: 400, height: 400, crop: 'fill', gravity: 'face' }]
),
limits: { fileSize: 2 * 1024 * 1024 },
fileFilter: fileFilter(['image/jpeg', 'image/png', 'image/webp']),
}).single('avatar');

// ── Document uploader ─────────────────────────────────────────────────────────
const documentUpload = multer({
storage: buildStorage(
'medilink/documents',
['jpg', 'jpeg', 'png', 'pdf'],
[]
),
limits: { fileSize: 5 * 1024 * 1024 },
fileFilter: fileFilter([
'image/jpeg',
'image/png',
'application/pdf',
]),
}).single('document');

// ── Error-handling wrappers ───────────────────────────────────────────────────
const handleAvatarUpload = (req, res, next) => {
avatarUpload(req, res, (err) => {
if (err) return error(res, err.message, 400);
next();
});
};

const handleDocumentUpload = (req, res, next) => {
documentUpload(req, res, (err) => {
if (err) return error(res, err.message, 400);
next();
});
};

const deleteFromCloudinary = async (publicId) => {
if (!publicId || !isCloudinaryConfigured) return;

try {
await cloudinary.uploader.destroy(publicId);
} catch (e) {
logger.error(`Cloudinary delete failed: ${e.message}`);
}
};

module.exports = {
handleAvatarUpload,
handleDocumentUpload,
deleteFromCloudinary,
};

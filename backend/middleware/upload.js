const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { error } = require('../utils/apiResponse');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

if (!cloudinary.config().cloud_name) {
  console.warn('Cloudinary not configured; file uploads will fail');
}

// ── Custom Cloudinary Storage Engine (compatible with cloudinary v2) ─────────
function cloudinaryStorage(options = {}) {
  return {
    _handleFile(req, file, cb) {
      const folder = options.folder || 'medilink/uploads';
      const resourceType = options.resource_type || 'auto';
      const transformation = options.transformation || [];

      const uploadOptions = {
        folder,
        resource_type: resourceType,
        transformation,
      };

      const uploadStream = cloudinary.uploader.upload_stream(uploadOptions, (err, result) => {
        if (err) return cb(err);
        cb(null, {
          path: result.secure_url,
          filename: result.public_id,
          size: result.bytes,
          mimetype: file.mimetype,
        });
      });

      file.stream.pipe(uploadStream);
    },
    _removeFile(req, file, cb) {
      if (file.filename) {
        cloudinary.uploader.destroy(file.filename).then(() => cb()).catch(cb);
      } else {
        cb();
      }
    },
  };
}

// Avatar storage
const avatarStorage = cloudinaryStorage({
  folder: 'medilink/avatars',
  transformation: [{ width: 400, height: 400, crop: 'fill', gravity: 'face' }],
});

// Medical document storage
const documentStorage = cloudinaryStorage({
  folder: 'medilink/documents',
  resource_type: 'auto',
});

const fileFilter = (allowedTypes) => (req, file, cb) => {
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Unsupported file type: ${file.mimetype}`), false);
  }
};

// Avatar uploader (single, 2MB)
const uploadAvatar = multer({
  storage: avatarStorage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: fileFilter(['image/jpeg', 'image/png', 'image/webp']),
}).single('avatar');

// Document uploader (single, 5MB)
const uploadDocument = multer({
  storage: documentStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: fileFilter(['image/jpeg', 'image/png', 'application/pdf']),
}).single('document');

// Error-handling wrappers
const handleAvatarUpload = (req, res, next) => {
  uploadAvatar(req, res, (err) => {
    if (err) return error(res, err.message, 400);
    next();
  });
};

const handleDocumentUpload = (req, res, next) => {
  uploadDocument(req, res, (err) => {
    if (err) return error(res, err.message, 400);
    next();
  });
};

const deleteFromCloudinary = async (publicId) => {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.error(`Cloudinary delete failed: ${err.message}`);
  }
};

module.exports = { handleAvatarUpload, handleDocumentUpload, deleteFromCloudinary };

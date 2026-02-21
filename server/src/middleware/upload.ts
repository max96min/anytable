import multer from 'multer';
import { AppError } from '../lib/errors.js';

const storage = multer.memoryStorage();

export const uploadSingle = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(AppError.badRequest('Only image files are allowed'));
    }
  },
}).single('image');

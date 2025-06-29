import multer from 'multer';
import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/app-error';
import {FILE_CONFIGS, validateFile} from "../services/minio-service";

// Configure multer to use memory storage
const storage = multer.memoryStorage();

// Base multer configuration
const createMulterConfig = (fileType: keyof typeof FILE_CONFIGS) => {
	const config = FILE_CONFIGS[fileType];

	return multer({
		storage,
		limits: {
			fileSize: config.maxSize,
			files: 1 // Single file upload
		},
		fileFilter: (req, file, cb) => {
			const validation = validateFile(file, fileType);

			if (!validation.isValid) {
				cb(new AppError(validation.error || 'Invalid file', 400));
				return;
			}

			cb(null, true);
		}
	});
};

// Multiple files multer configuration
const createMulterMultiConfig = (fileType: keyof typeof FILE_CONFIGS, maxFiles: number = 10) => {
	const config = FILE_CONFIGS[fileType];

	return multer({
		storage,
		limits: {
			fileSize: config.maxSize,
			files: maxFiles
		},
		fileFilter: (req, file, cb) => {
			const validation = validateFile(file, fileType);

			if (!validation.isValid) {
				cb(new AppError(validation.error || 'Invalid file', 400));
				return;
			}

			cb(null, true);
		}
	});
};

// Avatar upload middleware
export const uploadAvatar = createMulterConfig('avatar').single('avatar');

// Course image upload middleware
export const uploadCourseImage = createMulterConfig('courseImage').single('image');

// Activity file upload middleware
export const uploadActivityFile = createMulterConfig('activityFile').single('file');

// Multiple activity files upload middleware
export const uploadActivityFiles = createMulterMultiConfig('activityFile', 5).array('files', 5);

// Deposited files upload middleware (for students submitting work)
export const uploadDepositedFiles = createMulterMultiConfig('depositedFile', 10).array('files', 10);

// General file upload middleware
export const uploadGeneralFile = createMulterConfig('general').single('file');

// Multiple general files upload middleware
export const uploadGeneralFiles = createMulterMultiConfig('general', 10).array('files', 10);

// Custom middleware to handle file upload errors
export const handleFileUploadError = (
	 error: any,
	 req: Request,
	 res: Response,
	 next: NextFunction
): void => {
	if (error instanceof multer.MulterError) {
		let message;

		switch (error.code) {
			case 'LIMIT_FILE_SIZE':
				message = 'File size too large';
				break;
			case 'LIMIT_FILE_COUNT':
				message = 'Too many files uploaded';
				break;
			case 'LIMIT_UNEXPECTED_FILE':
				message = 'Unexpected file field';
				break;
			default:
				message = error.message;
		}

		return next(new AppError(message, 400));
	}

	if (error instanceof AppError) {
		return next(error);
	}

	next(error);
};

// Middleware to ensure file is uploaded
export const requireFile = (fieldName: string = 'file') => {
	return (req: Request, res: Response, next: NextFunction): void => {
		if (!req.file && !req.files) {
			throw new AppError(`${fieldName} is required`, 400);
		}
		next();
	};
};

// Middleware to ensure files are uploaded (for multiple files)
export const requireFiles = (fieldName: string = 'files', minFiles: number = 1) => {
	return (req: Request, res: Response, next: NextFunction): void => {
		const files = req.files as Express.Multer.File[];

		if (!files || files.length < minFiles) {
			throw new AppError(`At least ${minFiles} ${fieldName} required`, 400);
		}
		next();
	};
};

// Middleware to validate file type after upload
export const validateUploadedFile = (fileType: keyof typeof FILE_CONFIGS) => {
	return (req: Request, res: Response, next: NextFunction): void => {
		if (req.file) {
			const validation = validateFile(req.file, fileType);
			if (!validation.isValid) {
				throw new AppError(validation.error || 'Invalid file', 400);
			}
		}

		if (req.files && Array.isArray(req.files)) {
			for (const file of req.files) {
				const validation = validateFile(file, fileType);
				if (!validation.isValid) {
					throw new AppError(validation.error || 'Invalid file', 400);
				}
			}
		}

		next();
	};
};
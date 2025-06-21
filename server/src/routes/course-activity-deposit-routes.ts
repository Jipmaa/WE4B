import { Router, Request, Response } from 'express';
import { query, param } from 'express-validator';
import { FileDepositoryActivityModel } from '../models/course-activity';
import DepositedFiles from '../models/deposited-files';
import { authMiddleware } from '../middleware/auth-middleware';
import { teacherMiddleware } from '../middleware/roles-middleware';
import { validateRequest } from '../middleware/validate-request';
import { AppError } from '../utils/app-error';
import { asyncHandler } from '../utils/async-handler';
import { uploadDepositedFiles, handleFileUploadError } from '../middleware/file-upload-middleware';
import { uploadFile, generateFileName, deleteFile, FILE_CONFIGS } from '../services/minio-service';

const router = Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Validation rules
const activityIdValidation = [
	param('activityId')
		.isMongoId()
		.withMessage('Invalid activity ID format')
];

const depositIdValidation = [
	param('depositId')
		.isMongoId()
		.withMessage('Invalid deposit ID format')
];

const getDepositsValidation = [
	query('page')
		.optional()
		.isInt({ min: 1 })
		.withMessage('Page must be a positive integer'),
	query('limit')
		.optional()
		.isInt({ min: 1, max: 100 })
		.withMessage('Limit must be between 1 and 100'),
	query('userId')
		.optional()
		.isMongoId()
		.withMessage('Invalid user ID format')
];

// @route   GET /api/course-activities/:activityId/deposits
// @desc    Get all file deposits for an activity (Teachers only)
// @access  Private (Teacher only)
router.get('/:activityId/deposits', teacherMiddleware, activityIdValidation, getDepositsValidation, validateRequest, asyncHandler(async (req: Request, res: Response) => {
	const page = parseInt(req.query.page as string) || 1;
	const limit = parseInt(req.query.limit as string) || 10;
	const userId = req.query.userId as string;
	const skip = (page - 1) * limit;

	// Verify activity exists and is a file depository
	const activity = await FileDepositoryActivityModel.findById(req.params.activityId);
	if (!activity) {
		throw new AppError('Activity not found or not a file depository activity', 404);
	}

	// Build filter object
	const filter: any = { activity: req.params.activityId };
	if (userId) {
		filter.user = userId;
	}

	// Execute queries
	const [deposits, totalDeposits] = await Promise.all([
		DepositedFiles.find(filter)
			.populate('user', 'firstName lastName email')
			.populate('activity', 'title')
			.sort({ createdAt: -1 })
			.skip(skip)
			.limit(limit)
			.select('-__v'),
		DepositedFiles.countDocuments(filter)
	]);

	// Add download URLs for files
	const depositsWithUrls = await Promise.all(
		deposits.map(async (deposit) => {
			const depositData = deposit.toJSON();
			const fileUrls = await deposit.getFileUrls();
			return { ...depositData, fileUrls };
		})
	);

	// Calculate pagination info
	const totalPages = Math.ceil(totalDeposits / limit);
	const hasNextPage = page < totalPages;
	const hasPrevPage = page > 1;

	res.json({
		success: true,
		data: {
			deposits: depositsWithUrls,
			activity: {
				id: activity._id,
				title: activity.title,
				maxFiles: activity.maxFiles,
				restrictedFileTypes: activity.restrictedFileTypes
			},
			pagination: {
				currentPage: page,
				totalPages,
				totalDeposits,
				limit,
				hasNextPage,
				hasPrevPage
			}
		}
	});
}));

// @route   GET /api/course-activities/:activityId/deposits/my
// @desc    Get current user's file deposits for an activity
// @access  Private (All authenticated users)
router.get('/:activityId/deposits/my', activityIdValidation, validateRequest, asyncHandler(async (req: Request, res: Response) => {
	// Verify activity exists and is a file depository
	const activity = await FileDepositoryActivityModel.findById(req.params.activityId);
	if (!activity) {
		throw new AppError('Activity not found or not a file depository activity', 404);
	}

	const deposit = await DepositedFiles.findOne({
		activity: req.params.activityId,
		user: req.user!.userId
	})
		.populate('activity', 'title maxFiles restrictedFileTypes')
		.select('-__v');

	if (!deposit) {
		return res.json({
			success: true,
			data: {
				deposit: null,
				activity: {
					id: activity._id,
					title: activity.title,
					maxFiles: activity.maxFiles,
					restrictedFileTypes: activity.restrictedFileTypes
				}
			}
		});
	}

	// Add download URLs for files
	const depositData = deposit.toJSON();
	const fileUrls = await deposit.getFileUrls();
	const depositWithUrls = { ...depositData, fileUrls };

	res.json({
		success: true,
		data: {
			deposit: depositWithUrls,
			activity: {
				id: activity._id,
				title: activity.title,
				maxFiles: activity.maxFiles,
				restrictedFileTypes: activity.restrictedFileTypes
			}
		}
	});
}));

// @route   POST /api/course-activities/:activityId/deposits
// @desc    Submit files for an activity
// @access  Private (All authenticated users)
router.post('/:activityId/deposits', activityIdValidation, uploadDepositedFiles, handleFileUploadError, validateRequest, asyncHandler(async (req: Request, res: Response) => {
	if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
		throw new AppError('At least one file is required', 400);
	}

	// Verify activity exists and is a file depository
	const activity = await FileDepositoryActivityModel.findById(req.params.activityId);
	if (!activity) {
		throw new AppError('Activity not found or not a file depository activity', 404);
	}

	const userId = req.user!.userId;
	const files = req.files as Express.Multer.File[];

	// Check if user already has a submission
	const existingDeposit = await DepositedFiles.findOne({
		activity: req.params.activityId,
		user: userId
	});

	if (existingDeposit) {
		throw new AppError('You have already submitted files for this activity. Use PUT to update your submission.', 400);
	}

	// Validate file count
	if (files.length > activity.maxFiles) {
		throw new AppError(`Maximum ${activity.maxFiles} files allowed`, 400);
	}

	// Validate file types if restricted
	if (activity.restrictedFileTypes && activity.restrictedFileTypes.length > 0) {
		const allowedExtensions = activity.restrictedFileTypes.map(type => {
			const config = FILE_CONFIGS.depositedFile;
			const typeIndex = ['text-file', 'image', 'presentation', 'video', 'audio', 'spreadsheet', 'archive', 'other'].indexOf(type);
			// This is a simplified mapping - in a real app, you'd have a more sophisticated type-to-extension mapping
			return config.allowedExtensions;
		}).flat();

		for (const file of files) {
			const ext = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));
			if (!allowedExtensions.includes(ext)) {
				throw new AppError(`File type ${ext} is not allowed for this activity`, 400);
			}
		}
	}

	// Upload files to MinIO
	const uploadedFileKeys: string[] = [];
	try {
		for (const file of files) {
			const fileName = generateFileName(file.originalname, `deposit-${userId}`);
			const fileKey = await uploadFile(
				file,
				FILE_CONFIGS.depositedFile.bucket,
				fileName,
				{
					'X-Amz-Meta-Activity-Id': req.params.activityId,
					'X-Amz-Meta-User-Id': userId,
					'X-Amz-Meta-Upload-Type': 'deposited-file'
				}
			);
			uploadedFileKeys.push(fileKey);
		}

		// Create deposit record
		const deposit = new DepositedFiles({
			activity: req.params.activityId,
			user: userId,
			files: uploadedFileKeys
		});

		await deposit.save();

		const populatedDeposit = await DepositedFiles.findById(deposit._id)
			.populate('activity', 'title')
			.populate('user', 'firstName lastName email');

		// Add download URLs
		const depositData = populatedDeposit!.toJSON();
		const fileUrls = await populatedDeposit!.getFileUrls();
		const depositWithUrls = { ...depositData, fileUrls };

		res.status(201).json({
			success: true,
			message: 'Files submitted successfully',
			data: {
				deposit: depositWithUrls
			}
		});
	} catch (error) {
		// Clean up uploaded files if deposit creation fails
		for (const fileKey of uploadedFileKeys) {
			try {
				await deleteFile(FILE_CONFIGS.depositedFile.bucket, fileKey);
			} catch (deleteError) {
				console.warn('Failed to clean up file:', fileKey, deleteError);
			}
		}
		throw error;
	}
}));

// @route   PUT /api/course-activities/:activityId/deposits
// @desc    Update file submission for an activity
// @access  Private (All authenticated users)
router.put('/:activityId/deposits', activityIdValidation, uploadDepositedFiles, handleFileUploadError, validateRequest, asyncHandler(async (req: Request, res: Response) => {
	if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
		throw new AppError('At least one file is required', 400);
	}

	// Verify activity exists and is a file depository
	const activity = await FileDepositoryActivityModel.findById(req.params.activityId);
	if (!activity) {
		throw new AppError('Activity not found or not a file depository activity', 404);
	}

	const userId = req.user!.userId;
	const files = req.files as Express.Multer.File[];

	// Find existing deposit
	const existingDeposit = await DepositedFiles.findOne({
		activity: req.params.activityId,
		user: userId
	});

	if (!existingDeposit) {
		throw new AppError('No existing submission found. Use POST to create a new submission.', 404);
	}

	// Validate file count
	if (files.length > activity.maxFiles) {
		throw new AppError(`Maximum ${activity.maxFiles} files allowed`, 400);
	}

	// Upload new files to MinIO
	const uploadedFileKeys: string[] = [];
	try {
		for (const file of files) {
			const fileName = generateFileName(file.originalname, `deposit-${userId}`);
			const fileKey = await uploadFile(
				file,
				FILE_CONFIGS.depositedFile.bucket,
				fileName,
				{
					'X-Amz-Meta-Activity-Id': req.params.activityId,
					'X-Amz-Meta-User-Id': userId,
					'X-Amz-Meta-Upload-Type': 'deposited-file'
				}
			);
			uploadedFileKeys.push(fileKey);
		}

		// Delete old files
		for (const oldFileKey of existingDeposit.files) {
			try {
				await deleteFile(FILE_CONFIGS.depositedFile.bucket, oldFileKey);
			} catch (error) {
				console.warn('Failed to delete old file:', oldFileKey, error);
			}
		}

		// Update deposit record
		existingDeposit.files = uploadedFileKeys;
		existingDeposit.updatedAt = new Date();
		await existingDeposit.save();

		const populatedDeposit = await DepositedFiles.findById(existingDeposit._id)
			.populate('activity', 'title')
			.populate('user', 'firstName lastName email');

		// Add download URLs
		const depositData = populatedDeposit!.toJSON();
		const fileUrls = await populatedDeposit!.getFileUrls();
		const depositWithUrls = { ...depositData, fileUrls };

		res.json({
			success: true,
			message: 'Files updated successfully',
			data: {
				deposit: depositWithUrls
			}
		});
	} catch (error) {
		// Clean up new uploaded files if update fails
		for (const fileKey of uploadedFileKeys) {
			try {
				await deleteFile(FILE_CONFIGS.depositedFile.bucket, fileKey);
			} catch (deleteError) {
				console.warn('Failed to clean up file:', fileKey, deleteError);
			}
		}
		throw error;
	}
}));

// @route   DELETE /api/course-activities/:activityId/deposits
// @desc    Delete file submission for an activity
// @access  Private (All authenticated users)
router.delete('/:activityId/deposits', activityIdValidation, validateRequest, asyncHandler(async (req: Request, res: Response) => {
	const userId = req.user!.userId;

	// Find existing deposit
	const existingDeposit = await DepositedFiles.findOne({
		activity: req.params.activityId,
		user: userId
	});

	if (!existingDeposit) {
		throw new AppError('No submission found to delete', 404);
	}

	// Delete files from MinIO
	for (const fileKey of existingDeposit.files) {
		try {
			await deleteFile(FILE_CONFIGS.depositedFile.bucket, fileKey);
		} catch (error) {
			console.warn('Failed to delete file:', fileKey, error);
		}
	}

	// Delete deposit record
	await DepositedFiles.findByIdAndDelete(existingDeposit._id);

	res.json({
		success: true,
		message: 'Submission deleted successfully',
		data: {
			deletedSubmission: {
				id: existingDeposit._id,
				activityId: req.params.activityId,
				fileCount: existingDeposit.files.length
			}
		}
	});
}));

// @route   GET /api/course-activities/:activityId/deposits/:depositId
// @desc    Get specific file deposit by ID (Teachers only)
// @access  Private (Teacher only)
router.get('/:activityId/deposits/:depositId', teacherMiddleware, [...activityIdValidation, ...depositIdValidation], validateRequest, asyncHandler(async (req: Request, res: Response) => {
	// Verify activity exists and is a file depository
	const activity = await FileDepositoryActivityModel.findById(req.params.activityId);
	if (!activity) {
		throw new AppError('Activity not found or not a file depository activity', 404);
	}

	const deposit = await DepositedFiles.findOne({
		_id: req.params.depositId,
		activity: req.params.activityId
	})
		.populate('user', 'firstName lastName email')
		.populate('activity', 'title maxFiles restrictedFileTypes')
		.select('-__v');

	if (!deposit) {
		throw new AppError('Deposit not found', 404);
	}

	// Add download URLs for files
	const depositData = deposit.toJSON();
	const fileUrls = await deposit.getFileUrls();
	const depositWithUrls = { ...depositData, fileUrls };

	res.json({
		success: true,
		data: {
			deposit: depositWithUrls
		}
	});
}));

// @route   GET /api/course-activities/:activityId/deposits/stats
// @desc    Get submission statistics for an activity (Teachers only)
// @access  Private (Teacher only)
router.get('/:activityId/deposits/stats', teacherMiddleware, activityIdValidation, validateRequest, asyncHandler(async (req: Request, res: Response) => {
	// Verify activity exists and is a file depository
	const activity = await FileDepositoryActivityModel.findById(req.params.activityId)
		.populate('courseUnit', 'name capacity');
	
	if (!activity) {
		throw new AppError('Activity not found or not a file depository activity', 404);
	}

	// Get submission statistics
	const [totalSubmissions, uniqueSubmitters] = await Promise.all([
		DepositedFiles.countDocuments({ activity: req.params.activityId }),
		DepositedFiles.distinct('user', { activity: req.params.activityId })
	]);

	// Get recent submissions
	const recentSubmissions = await DepositedFiles.find({ activity: req.params.activityId })
		.populate('user', 'firstName lastName email')
		.sort({ createdAt: -1 })
		.limit(5)
		.select('user createdAt files');

	// Add file count to recent submissions
	const recentSubmissionsWithCount = recentSubmissions.map(submission => ({
		...submission.toJSON(),
		fileCount: submission.files.length
	}));

	const submissionRate = activity.courseUnit && (activity.courseUnit as any).capacity 
		? Math.round((uniqueSubmitters.length / (activity.courseUnit as any).capacity) * 100)
		: 0;

	res.json({
		success: true,
		data: {
			activity: {
				id: activity._id,
				title: activity.title,
				maxFiles: activity.maxFiles,
				restrictedFileTypes: activity.restrictedFileTypes
			},
			stats: {
				totalSubmissions,
				uniqueSubmitters: uniqueSubmitters.length,
				submissionRate,
				courseCapacity: activity.courseUnit ? (activity.courseUnit as any).capacity : null
			},
			recentSubmissions: recentSubmissionsWithCount
		}
	});
}));

export default router;
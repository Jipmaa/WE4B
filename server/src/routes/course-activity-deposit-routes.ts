import { Router, Request, Response } from 'express';
import { query, param, body } from 'express-validator';
import { FileDepositoryActivityModel } from '../models/course-activity';
import DepositedFiles from '../models/deposited-files';
import CourseGroup from '../models/course-group';
import { authMiddleware } from '../middleware/auth-middleware';
import { teacherMiddleware } from '../middleware/roles-middleware';
import { validateRequest } from '../middleware/validate-request';
import { AppError } from '../utils/app-error';
import { asyncHandler } from '../utils/async-handler';
import { uploadDepositedFiles, handleFileUploadError } from '../middleware/file-upload-middleware';
import { uploadFile, generateFileName, deleteFile, FILE_CONFIGS } from '../services/minio-service';
import { ArchiveService } from '../services/archive-service';
import { isFileAllowed } from '../utils/file-type-mappings';
import RecentActivity from '../models/recent-activity';

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

// @route   GET /api/course-activities/:activityId/deposits/teacher-view
// @desc    Get deposits with teacher-specific information (Teachers only)
// @access  Private (Teacher only)
router.get('/:activityId/deposits/teacher-view', teacherMiddleware, activityIdValidation, validateRequest, asyncHandler(async (req: Request, res: Response) => {
	// Verify activity exists and is a file depository
	const activity = await FileDepositoryActivityModel.findById(req.params.activityId);
	if (!activity) {
		throw new AppError('Activity not found or not a file depository activity', 404);
	}

	// Get all deposits for this activity
	const deposits = await DepositedFiles.find({ activity: req.params.activityId })
		.populate('user', 'firstName lastName email')
		.populate('evaluation.gradedBy', 'firstName lastName email')
		.sort({ createdAt: -1 });

	// Get student groups for each deposit
	const depositsWithDetails = await Promise.all(
		deposits.map(async (deposit) => {
			const depositData = deposit.toJSON();
			const fileUrls = await deposit.getFileUrls();
			
			// Find user's groups for this course unit
			const userGroups = await CourseGroup.find({
				courseUnit: activity.courseUnit,
				'users.user': deposit.user
			}).select('name');

			const isLate = activity.dueAt && deposit.createdAt > activity.dueAt;

			return {
				...depositData,
				fileUrls,
				isLate,
				student: {
					name: `${(deposit.user as any).firstName} ${(deposit.user as any).lastName}`,
					groups: userGroups.map(group => group.name)
				}
			};
		})
	);

	res.json({
		success: true,
		data: {
			deposits: depositsWithDetails,
			activity: {
				id: activity._id,
				title: activity.title,
				dueAt: activity.dueAt,
				maxFiles: activity.maxFiles,
				restrictedFileTypes: activity.restrictedFileTypes
			}
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

// @route   GET /api/course-activities/:activityId/deposits/download-all
// @desc    Download all student deposits as bulk archive (Teachers only)
// @access  Private (Teacher only)
router.get('/:activityId/deposits/download-all', teacherMiddleware, activityIdValidation, validateRequest, asyncHandler(async (req: Request, res: Response) => {
	// Verify activity exists and is a file depository
	const activity = await FileDepositoryActivityModel.findById(req.params.activityId);
	if (!activity) {
		throw new AppError('Activity not found or not a file depository activity', 404);
	}

	// Get all deposits for this activity
	const deposits = await DepositedFiles.find({ activity: req.params.activityId })
		.populate('user', 'firstName lastName email');

	if (deposits.length === 0) {
		throw new AppError('No submissions found for this activity', 404);
	}

	const submissions = deposits.map(deposit => ({
		student: {
			firstName: (deposit.user as any).firstName,
			lastName: (deposit.user as any).lastName
		},
		files: deposit.files
	}));

	await ArchiveService.createBulkArchive(submissions, activity.title, res);
}));

// @route   POST /api/course-activities/:activityId/deposits
// @desc    Submit files for an activity
// @access  Private (All authenticated users)
router.post('/:activityId/deposits', activityIdValidation, uploadDepositedFiles, handleFileUploadError, validateRequest, asyncHandler(async (req: Request, res: Response) => {
	if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
		throw new AppError('At least one file is required', 400);
	}

	// Verify activity exists and is a file depository
	const activity = await FileDepositoryActivityModel.findById(req.params.activityId).populate('courseUnit');
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
		for (const file of files) {
			const validation = isFileAllowed(file.mimetype, file.originalname, activity.restrictedFileTypes);
			if (!validation.isValid) {
				throw new AppError(validation.error || 'File type not allowed for this activity', 400);
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
			courseActivity: req.params.activityId,
			courseUnit: (activity.courseUnit as any)._id,
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

		// Log file submission activity
		try {
			await RecentActivity.create({
				actor: {
					kind: 'user',
					data: req.user!.userId
				},
				date: new Date(),
				course: activity.courseUnit,
				activity: activity._id,
				action: 'submit',
				metadata: {
					filesCount: uploadedFileKeys.length
				}
			});
		} catch (logError) {
			console.error('Failed to log file submission:', logError);
		}

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
	const activity = await FileDepositoryActivityModel.findById(req.params.activityId).populate('courseUnit');
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

	// Validate file types if restricted
	if (activity.restrictedFileTypes && activity.restrictedFileTypes.length > 0) {
		for (const file of files) {
			const validation = isFileAllowed(file.mimetype, file.originalname, activity.restrictedFileTypes);
			if (!validation.isValid) {
				throw new AppError(validation.error || 'File type not allowed for this activity', 400);
			}
		}
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


// @route   PUT /api/course-activities/:activityId/deposits/:depositId/grade
// @desc    Grade a student's deposit (Teachers only)
// @access  Private (Teacher only)
router.put('/:activityId/deposits/:depositId/grade', teacherMiddleware, [...activityIdValidation, ...depositIdValidation], [
	body('grade')
		.optional()
		.isFloat({ min: 0, max: 20 })
		.withMessage('Grade must be between 0 and 20'),
	body('comment')
		.optional()
		.isLength({ max: 1000 })
		.withMessage('Comment must be less than 1000 characters')
], validateRequest, asyncHandler(async (req: Request, res: Response) => {
	const { grade, comment } = req.body;

	// Verify activity exists and is a file depository
	const activity = await FileDepositoryActivityModel.findById(req.params.activityId);
	if (!activity) {
		throw new AppError('Activity not found or not a file depository activity', 404);
	}

	const deposit = await DepositedFiles.findOne({
		_id: req.params.depositId,
		activity: req.params.activityId
	});

	if (!deposit) {
		throw new AppError('Deposit not found', 404);
	}

	// Update evaluation
	deposit.evaluation = {
		grade: grade !== undefined ? grade : deposit.evaluation?.grade,
		comment: comment !== undefined ? comment : deposit.evaluation?.comment,
		gradedBy: new (require('mongoose')).Types.ObjectId(req.user!.userId),
		gradedAt: new Date()
	};

	await deposit.save();

	const populatedDeposit = await DepositedFiles.findById(deposit._id)
		.populate('user', 'firstName lastName email')
		.populate('activity', 'title')
		.populate('evaluation.gradedBy', 'firstName lastName email');

	// Add download URLs
	const depositData = populatedDeposit!.toJSON();
	const fileUrls = await populatedDeposit!.getFileUrls();
	const depositWithUrls = { ...depositData, fileUrls };

	// Log grading activity
	try {
		await RecentActivity.create({
			actor: {
				kind: 'user',
				data: req.user!.userId
			},
			date: new Date(),
			course: activity.courseUnit,
			activity: activity._id,
			action: 'grade',
			targetUser: deposit.user,
			metadata: {
				grade: deposit.evaluation?.grade
			}
		});
	} catch (logError) {
		console.error('Failed to log grading activity:', logError);
	}

	res.json({
		success: true,
		message: 'Deposit graded successfully',
		data: {
			deposit: depositWithUrls
		}
	});
}));


// @route   GET /api/course-activities/:activityId/deposits/:depositId/download
// @desc    Download individual student's deposit as archive (Teachers only)
// @access  Private (Teacher only)
router.get('/:activityId/deposits/:depositId/download', teacherMiddleware, [...activityIdValidation, ...depositIdValidation], validateRequest, asyncHandler(async (req: Request, res: Response) => {
	// Verify activity exists and is a file depository
	const activity = await FileDepositoryActivityModel.findById(req.params.activityId);
	if (!activity) {
		throw new AppError('Activity not found or not a file depository activity', 404);
	}

	const deposit = await DepositedFiles.findOne({
		_id: req.params.depositId,
		activity: req.params.activityId
	}).populate('user', 'firstName lastName email');

	if (!deposit) {
		throw new AppError('Deposit not found', 404);
	}

	const studentSubmission = {
		student: {
			firstName: (deposit.user as any).firstName,
			lastName: (deposit.user as any).lastName
		},
		files: deposit.files
	};

	await ArchiveService.createStudentArchive(studentSubmission, activity.title, res);
}));


export default router;
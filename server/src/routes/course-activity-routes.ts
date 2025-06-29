import { Router, Request, Response } from 'express';
import { query, param, body } from 'express-validator';
import { CourseActivityModel, MessageActivityModel, FileActivityModel, FileDepositoryActivityModel } from '../models/course-activity';
import CourseUnit from '../models/course-unit';
import CourseGroup from '../models/course-group';
import { authMiddleware } from '../middleware/auth-middleware';
import { teacherMiddleware } from '../middleware/roles-middleware';
import { validateRequest } from '../middleware/validate-request';
import { AppError } from '../utils/app-error';
import { asyncHandler } from '../utils/async-handler';
import { uploadActivityFile, handleFileUploadError } from '../middleware/file-upload-middleware';
import { uploadFile, generateFileName, deleteFile, FILE_CONFIGS } from '../services/minio-service';
import { logActivity } from '../utils/logger';

const router = Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Validation rules
const getActivitiesValidation = [
	query('page')
		.optional()
		.isInt({ min: 1 })
		.withMessage('Page must be a positive integer'),
	query('limit')
		.optional()
		.isInt({ min: 1, max: 100 })
		.withMessage('Limit must be between 1 and 100'),
	query('activityType')
		.optional()
		.isIn(['message', 'file', 'file-depository'])
		.withMessage('Activity type must be message, file, or file-depository'),
	query('courseUnit')
		.optional()
		.isMongoId()
		.withMessage('Invalid course unit ID format')
];

const activityIdValidation = [
	param('id')
		.isMongoId()
		.withMessage('Invalid activity ID format')
];

const baseActivityValidation = [
	body('courseUnit')
		.notEmpty()
		.withMessage('Course unit is required')
		.isMongoId()
		.withMessage('Invalid course unit ID format'),
	body('restrictedGroups')
		.optional()
		.isArray()
		.withMessage('Restricted groups must be an array')
		.custom((groups) => {
			return groups.every((group: string) => /^[0-9a-fA-F]{24}$/.test(group));
		})
		.withMessage('All restricted group IDs must be valid MongoDB ObjectIds'),
];

const messageActivityValidation = [
	...baseActivityValidation,
	body('title')
		.notEmpty()
		.withMessage('Title is required')
		.isLength({ max: 100 })
		.withMessage('Title must be less than 100 characters')
		.trim(),
	body('content')
		.notEmpty()
		.withMessage('Content is required')
		.isLength({ max: 5000 })
		.withMessage('Content must be less than 5000 characters'),
	body('level')
		.optional()
		.isIn(['normal', 'important', 'urgent'])
		.withMessage('Level must be normal, important, or urgent')
];

const fileActivityValidation = [
	...baseActivityValidation,
	body('title')
		.notEmpty()
		.withMessage('Title is required')
		.isLength({ max: 100 })
		.withMessage('Title must be less than 100 characters')
		.trim(),
	body('content')
		.notEmpty()
		.withMessage('Content is required')
		.isLength({ max: 5000 })
		.withMessage('Content must be less than 5000 characters'),
	body('fileType')
		.notEmpty()
		.withMessage('File type is required')
		.isIn(['text-file', 'image', 'presentation', 'video', 'audio', 'spreadsheet', 'archive', 'other'])
		.withMessage('Invalid file type')
];

const fileDepositoryValidation = [
	...baseActivityValidation,
	body('title')
		.notEmpty()
		.withMessage('Title is required')
		.isLength({ max: 100 })
		.withMessage('Title must be less than 100 characters')
		.trim(),
	body('content')
		.notEmpty()
		.withMessage('Content is required')
		.isLength({ max: 5000 })
		.withMessage('Content must be less than 5000 characters'),
	body('instructions')
		.notEmpty()
		.withMessage('Instructions are required'),
	body('maxFiles')
		.optional()
		.isInt({ min: 1, max: 20 })
		.withMessage('Max files must be between 1 and 20')
];

// @route   GET /api/course-activities
// @desc    Get all activities with pagination and filters
// @access  Private (All authenticated users)
router.get('/', getActivitiesValidation, validateRequest, asyncHandler(async (req: Request, res: Response) => {
	const page = parseInt(req.query.page as string) || 1;
	const limit = parseInt(req.query.limit as string) || 10;
	const activityType = req.query.activityType as string;
	const courseUnit = req.query.courseUnit as string;
	const skip = (page - 1) * limit;

	// Build filter object
	const filter: any = {};

	if (activityType) {
		filter.activityType = activityType;
	}

	if (courseUnit) {
		filter.courseUnit = courseUnit;
	}

	// Execute queries
	const [activities, totalActivities] = await Promise.all([
		CourseActivityModel.find(filter)
			.populate('courseUnit', 'name code slug')
			.populate('restrictedGroups', 'name slug')
			.sort({ createdAt: -1 })
			.skip(skip)
			.limit(limit)
			.select('-__v'),
		CourseActivityModel.countDocuments(filter)
	]);

	// Calculate pagination info
	const totalPages = Math.ceil(totalActivities / limit);
	const hasNextPage = page < totalPages;
	const hasPrevPage = page > 1;

	res.json({
		success: true,
		data: {
			activities,
			pagination: {
				currentPage: page,
				totalPages,
				totalActivities,
				limit,
				hasNextPage,
				hasPrevPage
			}
		}
	});
}));

// @route   GET /api/course-activities/:id
// @desc    Get activity by ID
// @access  Private (All authenticated users)
router.get('/:id', activityIdValidation, validateRequest, asyncHandler(async (req: Request, res: Response) => {
	const activity = await CourseActivityModel.findById(req.params.id)
		.populate('courseUnit', 'name code slug')
		.populate('completion.user', 'firstName lastName email')
		.populate('restrictedGroups', 'name slug')
		.select('-__v');

	if (!activity) {
		throw new AppError('Activity not found', 404);
	}

	// Add file download URL if it's a file activity
	let responseData: any = activity.toJSON();
	if (activity.activityType === 'file' && (activity as any).file) {
		const fileActivity = activity as any;
		const fileUrl = await fileActivity.getFileUrl();
		responseData = { ...responseData, fileUrl };
	}

	// Add instructions file URL if it's a file-depository activity with file instructions
	if (activity.activityType === 'file-depository' && responseData.instructions.type === 'file' && responseData.instructions.file) {
		const fileDepositoryActivity = activity as any;
		const instructionsFileUrl = await fileDepositoryActivity.getInstructionsFileUrl();
		const instructionsWithUrl = {
			...responseData.instructions,
			fileUrl: instructionsFileUrl
		};
		responseData = {
			...responseData,
			instructions: instructionsWithUrl
		};
	}

	// Add completion rate
	responseData.completionRate = await activity.getCompletionRate();

	res.json({
		success: true,
		data: {
			activity: responseData
		}
	});
}));

// @route   POST /api/course-activities/message
// @desc    Create new message activity
// @access  Private (Teacher only)
router.post('/message', teacherMiddleware, messageActivityValidation, validateRequest, asyncHandler(async (req: Request, res: Response) => {
	const { courseUnit, title, content, level, restrictedGroups, category } = req.body;

	// Verify course unit exists
	const courseUnitDoc = await CourseUnit.findById(courseUnit);
	if (!courseUnitDoc) {
		throw new AppError('Course unit not found', 404);
	}

	// Verify restricted groups if provided
	if (restrictedGroups && restrictedGroups.length > 0) {
		const groups = await CourseGroup.find({ _id: { $in: restrictedGroups } });
		if (groups.length !== restrictedGroups.length) {
			throw new AppError('One or more restricted groups not found', 404);
		}
	}

	const activity = new MessageActivityModel({
		activityType: 'message',
		courseUnit,
		title,
		content,
		level: level || 'normal',
		restrictedGroups: restrictedGroups || []
	});

	await activity.save();

	// Add activity to course unit category
	if (category) {
		// Use atomic updates to prevent race conditions and read-modify-write issues.
		// First, try to push the new activity ID to an existing category.
		const updateResult = await CourseUnit.updateOne(
			{ _id: courseUnit, 'activities.name': category },
			{ $push: { 'activities.$.activities': activity._id } }
		);

		// If the category doesn't exist (no document was modified), create it.
		// The condition 'activities.name': { $ne: category } prevents adding a duplicate category in a race condition.
		if (updateResult.modifiedCount === 0) {
			await CourseUnit.updateOne(
				{ _id: courseUnit, 'activities.name': { $ne: category } },
				{
					$push: {
						activities: {
							_id: new (require('mongoose')).Types.ObjectId(),
							name: category,
							description: `Catégorie ${category}`,
							activities: [activity._id]
						}
					}
				}
			);
		}
	}

	const populatedActivity = await MessageActivityModel.findById(activity._id)
		.populate('courseUnit', 'name code slug')
		.populate('restrictedGroups', 'name slug');

	res.status(201).json({
		success: true,
		message: 'Message activity created successfully',
		data: {
			activity: populatedActivity
		}
	});
}));

// @route   PUT /api/course-activities/message/:id
// @desc    Update message activity
// @access  Private (Teacher only)
router.put('/message/:id', teacherMiddleware, activityIdValidation, [
	body('title')
		.optional()
		.isLength({ max: 100 })
		.withMessage('Title must be less than 100 characters')
		.trim(),
	body('content')
		.optional()
		.isLength({ max: 5000 })
		.withMessage('Content must be less than 5000 characters'),
	body('level')
		.optional()
		.isIn(['normal', 'important', 'urgent'])
		.withMessage('Level must be normal, important, or urgent'),
	body('category')
		.optional()
		.isLength({ max: 50 })
		.withMessage('Category must be less than 50 characters')
], validateRequest, asyncHandler(async (req: Request, res: Response) => {
	const activity = await MessageActivityModel.findById(req.params.id);

	if (!activity) {
		throw new AppError('Message activity not found', 404);
	}

	const { title, content, level, category } = req.body;

	// Update fields that are provided
	if (title !== undefined) activity.title = title;
	if (content !== undefined) activity.content = content;
	if (level !== undefined) activity.level = level;

	await activity.save();

	// Handle category update if provided
	if (category !== undefined) {
		// First, remove the activity from its current category
		await CourseUnit.updateMany(
			{ 'activities.activities': activity._id },
			{ $pull: { 'activities.$.activities': activity._id } }
		);

		// Remove empty categories
		await CourseUnit.updateMany(
			{},
			{ $pull: { activities: { activities: { $size: 0 } } } }
		);

		// Add to new category if specified
		if (category && category.trim()) {
			// Try to add to existing category
			const updateResult = await CourseUnit.updateOne(
				{ _id: activity.courseUnit, 'activities.name': category },
				{ $push: { 'activities.$.activities': activity._id } }
			);

			// If category doesn't exist, create it
			if (updateResult.modifiedCount === 0) {
				await CourseUnit.updateOne(
					{ _id: activity.courseUnit, 'activities.name': { $ne: category } },
					{
						$push: {
							activities: {
								_id: new (require('mongoose')).Types.ObjectId(),
								name: category,
								description: `Catégorie ${category}`,
								activities: [activity._id]
							}
						}
					}
				);
			}
		}
	}

	const populatedActivity = await MessageActivityModel.findById(activity._id)
		.populate('courseUnit', 'name code slug')
		.populate('restrictedGroups', 'name slug');

	res.json({
		success: true,
		message: 'Message activity updated successfully',
		data: {
			activity: populatedActivity
		}
	});
}));

// @route   POST /api/course-activities/file
// @desc    Create new file activity
// @access  Private (Teacher only)
router.post('/file', teacherMiddleware, uploadActivityFile, handleFileUploadError, fileActivityValidation, validateRequest, asyncHandler(async (req: Request, res: Response) => {
	if (!req.file) {
		throw new AppError('File is required for file activity', 400);
	}

	const { courseUnit, title, content, fileType, restrictedGroups, category } = req.body;

	// Verify course unit exists
	const courseUnitDoc = await CourseUnit.findById(courseUnit);
	if (!courseUnitDoc) {
		throw new AppError('Course unit not found', 404);
	}

	// Verify restricted groups if provided
	if (restrictedGroups && restrictedGroups.length > 0) {
		const groups = await CourseGroup.find({ _id: { $in: restrictedGroups } });
		if (groups.length !== restrictedGroups.length) {
			throw new AppError('One or more restricted groups not found', 404);
		}
	}

	// Upload file to MinIO
	const fileName = generateFileName(req.file.originalname, `activity-file`);
	const fileKey = await uploadFile(
		req.file,
		FILE_CONFIGS.activityFile.bucket,
		fileName,
		{
			'X-Amz-Meta-Course-Unit': courseUnit,
			'X-Amz-Meta-Activity-Type': 'file',
			'X-Amz-Meta-File-Type': fileType
		}
	);

	const activity = new FileActivityModel({
		activityType: 'file',
		courseUnit,
		title,
		content,
		fileType,
		file: fileKey,
		restrictedGroups: restrictedGroups || []
	});

	await activity.save();

	// Add activity to course unit category
	if (category) {
		// Use atomic updates to prevent race conditions and read-modify-write issues.
		// First, try to push the new activity ID to an existing category.
		const updateResult = await CourseUnit.updateOne(
			{ _id: courseUnit, 'activities.name': category },
			{ $push: { 'activities.$.activities': activity._id } }
		);

		// If the category doesn't exist (no document was modified), create it.
		// The condition 'activities.name': { $ne: category } prevents adding a duplicate category in a race condition.
		if (updateResult.modifiedCount === 0) {
			await CourseUnit.updateOne(
				{ _id: courseUnit, 'activities.name': { $ne: category } },
				{
					$push: {
						activities: {
							_id: new (require('mongoose')).Types.ObjectId(),
							name: category,
							description: `Catégorie ${category}`,
							activities: [activity._id]
						}
					}
				}
			);
		}
	}

	const populatedActivity = await FileActivityModel.findById(activity._id)
		.populate('courseUnit', 'name code slug')
		.populate('restrictedGroups', 'name slug');

	const responseData = populatedActivity!.toJSON();
	const fileUrl = await populatedActivity!.getFileUrl();
	const activityWithUrl = { ...responseData, fileUrl };

	res.status(201).json({
		success: true,
		message: 'File activity created successfully',
		data: {
			activity: activityWithUrl
		}
	});
}));

// @route   PUT /api/course-activities/file/:id
// @desc    Update file activity
// @access  Private (Teacher only)
router.put('/file/:id', teacherMiddleware, uploadActivityFile, handleFileUploadError, activityIdValidation, [
	body('title')
		.optional()
		.isLength({ max: 100 })
		.withMessage('Title must be less than 100 characters')
		.trim(),
	body('content')
		.optional()
		.isLength({ max: 5000 })
		.withMessage('Content must be less than 5000 characters'),
	body('fileType')
		.optional()
		.isIn(['text-file', 'image', 'presentation', 'video', 'audio', 'spreadsheet', 'archive', 'other'])
		.withMessage('Invalid file type'),
	body('category')
		.optional()
		.isLength({ max: 50 })
		.withMessage('Category must be less than 50 characters')
], validateRequest, asyncHandler(async (req: Request, res: Response) => {
	const activity = await FileActivityModel.findById(req.params.id);

	if (!activity) {
		throw new AppError('File activity not found', 404);
	}

	const { title, content, fileType, category } = req.body;
	let fileKey = activity.file;

	// Update fields that are provided
	if (title !== undefined) activity.title = title;
	if (content !== undefined) activity.content = content;
	if (fileType !== undefined) activity.fileType = fileType;

	// Handle file upload if provided
	if (req.file) {
		// Delete old file if it exists
		if (activity.file) {
			try {
				await deleteFile(FILE_CONFIGS.activityFile.bucket, activity.file);
			} catch (error) {
				console.warn('Failed to delete old activity file:', error);
			}
		}

		// Upload new file
		const fileName = generateFileName(req.file.originalname, `activity-file`);
		fileKey = await uploadFile(
			req.file,
			FILE_CONFIGS.activityFile.bucket,
			fileName,
			{
				'X-Amz-Meta-Course-Unit': activity.courseUnit.toString(),
				'X-Amz-Meta-Activity-Type': 'file',
				'X-Amz-Meta-File-Type': fileType || activity.fileType
			}
		);
		activity.file = fileKey;
	}

	await activity.save();

	// Handle category update if provided
	if (category !== undefined) {
		// First, remove the activity from its current category
		await CourseUnit.updateMany(
			{ 'activities.activities': activity._id },
			{ $pull: { 'activities.$.activities': activity._id } }
		);

		// Remove empty categories
		await CourseUnit.updateMany(
			{},
			{ $pull: { activities: { activities: { $size: 0 } } } }
		);

		// Add to new category if specified
		if (category && category.trim()) {
			// Try to add to existing category
			const updateResult = await CourseUnit.updateOne(
				{ _id: activity.courseUnit, 'activities.name': category },
				{ $push: { 'activities.$.activities': activity._id } }
			);

			// If category doesn't exist, create it
			if (updateResult.modifiedCount === 0) {
				await CourseUnit.updateOne(
					{ _id: activity.courseUnit, 'activities.name': { $ne: category } },
					{
						$push: {
							activities: {
								_id: new (require('mongoose')).Types.ObjectId(),
								name: category,
								description: `Catégorie ${category}`,
								activities: [activity._id]
							}
						}
					}
				);
			}
		}
	}

	const populatedActivity = await FileActivityModel.findById(activity._id)
		.populate('courseUnit', 'name code slug')
		.populate('restrictedGroups', 'name slug');

	const responseData = populatedActivity!.toJSON();
	const fileUrl = await populatedActivity!.getFileUrl();
	const activityWithUrl = { ...responseData, fileUrl };

	res.json({
		success: true,
		message: 'File activity updated successfully',
		data: {
			activity: activityWithUrl
		}
	});
}));

// @route   POST /api/course-activities/file-depository
// @desc    Create new file depository activity
// @access  Private (Teacher only)
router.post('/file-depository', teacherMiddleware, uploadActivityFile, handleFileUploadError, fileDepositoryValidation, validateRequest, asyncHandler(async (req: Request, res: Response) => {
	const { courseUnit, title, content, maxFiles, restrictedGroups, category } = req.body;
	
	// Parse JSON strings from FormData
	let instructions, restrictedFileTypes;
	
	try {
		instructions = typeof req.body.instructions === 'string' ? JSON.parse(req.body.instructions) : req.body.instructions;
	} catch (error) {
		throw new AppError('Invalid instructions format', 400);
	}
	
	try {
		restrictedFileTypes = req.body.restrictedFileTypes ? 
			(typeof req.body.restrictedFileTypes === 'string' ? JSON.parse(req.body.restrictedFileTypes) : req.body.restrictedFileTypes) : 
			[];
	} catch (error) {
		throw new AppError('Invalid restrictedFileTypes format', 400);
	}
	
	// Validate parsed instructions
	if (!instructions || typeof instructions !== 'object') {
		throw new AppError('Instructions are required and must be an object', 400);
	}
	
	if (!['file', 'text'].includes(instructions.type)) {
		throw new AppError('Instructions type must be file or text', 400);
	}
	
	if (instructions.type === 'text' && (!instructions.text || typeof instructions.text !== 'string')) {
		throw new AppError('Text instructions must have a valid text field', 400);
	}
	
	// Validate parsed restrictedFileTypes
	if (!Array.isArray(restrictedFileTypes)) {
		throw new AppError('Restricted file types must be an array', 400);
	}

	// Verify course unit exists
	const courseUnitDoc = await CourseUnit.findById(courseUnit);
	if (!courseUnitDoc) {
		throw new AppError('Course unit not found', 404);
	}

	// Verify restricted groups if provided
	if (restrictedGroups && restrictedGroups.length > 0) {
		const groups = await CourseGroup.find({ _id: { $in: restrictedGroups } });
		if (groups.length !== restrictedGroups.length) {
			throw new AppError('One or more restricted groups not found', 404);
		}
	}

	let instructionsData = instructions;

	// If instructions type is file and file was uploaded
	if (instructions.type === 'file' && req.file) {
		const fileName = generateFileName(req.file.originalname, `instructions-file`);
		const fileKey = await uploadFile(
			req.file,
			FILE_CONFIGS.activityFile.bucket,
			fileName,
			{
				'X-Amz-Meta-Course-Unit': courseUnit,
				'X-Amz-Meta-Activity-Type': 'file-depository-instructions'
			}
		);
		instructionsData = { type: 'file', file: fileKey };
	}

	const activity = new FileDepositoryActivityModel({
		activityType: 'file-depository',
		courseUnit,
		title,
		content,
		instructions: instructionsData,
		restrictedFileTypes: restrictedFileTypes || [],
		maxFiles: maxFiles || 1,
		restrictedGroups: restrictedGroups || []
	});

	await activity.save();

	// Log activity creation
	if (req.user?.userId) {
		await logActivity({
			level: 'info',
			message: `Teacher created a new file depository activity: ${title} (Course Unit: ${courseUnitDoc.name})`,
			userId: req.user.userId,
			metadata: {
				activityId: activity._id.toString(),
				activityType: 'file-depository',
				courseUnitId: courseUnitDoc._id.toString(),
				courseUnitName: courseUnitDoc.name,
				activityTitle: title
			}
		});
	}

	// Add activity to course unit category
	if (category) {
		// Use atomic updates to prevent race conditions and read-modify-write issues.
		// First, try to push the new activity ID to an existing category.
		const updateResult = await CourseUnit.updateOne(
			{ _id: courseUnit, 'activities.name': category },
			{ $push: { 'activities.$.activities': activity._id } }
		);

		// If the category doesn't exist (no document was modified), create it.
		// The condition 'activities.name': { $ne: category } prevents adding a duplicate category in a race condition.
		if (updateResult.modifiedCount === 0) {
			await CourseUnit.updateOne(
				{ _id: courseUnit, 'activities.name': { $ne: category } },
				{
					$push: {
						activities: {
							_id: new (require('mongoose')).Types.ObjectId(),
							name: category,
							description: `Catégorie ${category}`,
							activities: [activity._id]
						}
					}
				}
			);
		}
	}

	const populatedActivity = await FileDepositoryActivityModel.findById(activity._id)
		.populate('courseUnit', 'name code slug')
		.populate('restrictedGroups', 'name slug');

	let responseData = populatedActivity!.toJSON();

	// Add file URL if instructions contain a file
	if (responseData.instructions.type === 'file' && responseData.instructions.file) {
		const instructionsFileUrl = await populatedActivity!.getInstructionsFileUrl();
		const instructionsWithUrl = {
			...responseData.instructions,
			fileUrl: instructionsFileUrl
		};
		responseData = {
			...responseData,
			instructions: instructionsWithUrl
		};
	}

	res.status(201).json({
		success: true,
		message: 'File depository activity created successfully',
		data: {
			activity: responseData
		}
	});
}));

// @route   PUT /api/course-activities/file-depository/:id
// @desc    Update file depository activity
// @access  Private (Teacher only)
router.put('/file-depository/:id', teacherMiddleware, uploadActivityFile, handleFileUploadError, activityIdValidation, [
	body('title')
		.optional()
		.isLength({ max: 100 })
		.withMessage('Title must be less than 100 characters')
		.trim(),
	body('content')
		.optional()
		.isLength({ max: 5000 })
		.withMessage('Content must be less than 5000 characters'),
	body('maxFiles')
		.optional()
		.isInt({ min: 1, max: 20 })
		.withMessage('Max files must be between 1 and 20'),
	body('category')
		.optional()
		.isLength({ max: 50 })
		.withMessage('Category must be less than 50 characters')
], validateRequest, asyncHandler(async (req: Request, res: Response) => {
	const activity = await FileDepositoryActivityModel.findById(req.params.id);

	if (!activity) {
		throw new AppError('File depository activity not found', 404);
	}

	const { title, content, maxFiles, category } = req.body;

	// Parse JSON strings from FormData
	let instructions, restrictedFileTypes;
	
	try {
		instructions = req.body.instructions ? 
			(typeof req.body.instructions === 'string' ? JSON.parse(req.body.instructions) : req.body.instructions) : 
			undefined;
	} catch (error) {
		throw new AppError('Invalid instructions format', 400);
	}
	
	try {
		restrictedFileTypes = req.body.restrictedFileTypes ? 
			(typeof req.body.restrictedFileTypes === 'string' ? JSON.parse(req.body.restrictedFileTypes) : req.body.restrictedFileTypes) : 
			undefined;
	} catch (error) {
		throw new AppError('Invalid restrictedFileTypes format', 400);
	}

	// Update fields that are provided
	if (title !== undefined) activity.title = title;
	if (content !== undefined) activity.content = content;
	if (maxFiles !== undefined) activity.maxFiles = maxFiles;
	if (restrictedFileTypes !== undefined) activity.restrictedFileTypes = restrictedFileTypes;

	// Handle instructions update
	if (instructions !== undefined) {
		// Validate instructions
		if (instructions && typeof instructions === 'object') {
			if (!['file', 'text'].includes(instructions.type)) {
				throw new AppError('Instructions type must be file or text', 400);
			}
			
			if (instructions.type === 'text' && (!instructions.text || typeof instructions.text !== 'string')) {
				throw new AppError('Text instructions must have a valid text field', 400);
			}

			// If changing to file instructions and file was uploaded
			if (instructions.type === 'file' && req.file) {
				// Delete old instructions file if it exists
				if (activity.instructions.type === 'file' && activity.instructions.file) {
					try {
						await deleteFile(FILE_CONFIGS.activityFile.bucket, activity.instructions.file);
					} catch (error) {
						console.warn('Failed to delete old instructions file:', error);
					}
				}

				// Upload new instructions file
				const fileName = generateFileName(req.file.originalname, `instructions-file`);
				const fileKey = await uploadFile(
					req.file,
					FILE_CONFIGS.activityFile.bucket,
					fileName,
					{
						'X-Amz-Meta-Course-Unit': activity.courseUnit.toString(),
						'X-Amz-Meta-Activity-Type': 'file-depository-instructions'
					}
				);
				activity.instructions = { type: 'file', file: fileKey };
			} else if (instructions.type === 'text') {
				// Delete old instructions file if changing from file to text
				if (activity.instructions.type === 'file' && activity.instructions.file) {
					try {
						await deleteFile(FILE_CONFIGS.activityFile.bucket, activity.instructions.file);
					} catch (error) {
						console.warn('Failed to delete old instructions file:', error);
					}
				}
				activity.instructions = { type: 'text', text: instructions.text };
			}
		}
	}

	await activity.save();

	// Handle category update if provided
	if (category !== undefined) {
		// First, remove the activity from its current category
		await CourseUnit.updateMany(
			{ 'activities.activities': activity._id },
			{ $pull: { 'activities.$.activities': activity._id } }
		);

		// Remove empty categories
		await CourseUnit.updateMany(
			{},
			{ $pull: { activities: { activities: { $size: 0 } } } }
		);

		// Add to new category if specified
		if (category && category.trim()) {
			// Try to add to existing category
			const updateResult = await CourseUnit.updateOne(
				{ _id: activity.courseUnit, 'activities.name': category },
				{ $push: { 'activities.$.activities': activity._id } }
			);

			// If category doesn't exist, create it
			if (updateResult.modifiedCount === 0) {
				await CourseUnit.updateOne(
					{ _id: activity.courseUnit, 'activities.name': { $ne: category } },
					{
						$push: {
							activities: {
								_id: new (require('mongoose')).Types.ObjectId(),
								name: category,
								description: `Catégorie ${category}`,
								activities: [activity._id]
							}
						}
					}
				);
			}
		}
	}

	const populatedActivity = await FileDepositoryActivityModel.findById(activity._id)
		.populate('courseUnit', 'name code slug')
		.populate('restrictedGroups', 'name slug');

	let responseData = populatedActivity!.toJSON();

	// Add file URL if instructions contain a file
	if (responseData.instructions.type === 'file' && responseData.instructions.file) {
		const instructionsFileUrl = await populatedActivity!.getInstructionsFileUrl();
		const instructionsWithUrl = {
			...responseData.instructions,
			fileUrl: instructionsFileUrl
		};
		responseData = {
			...responseData,
			instructions: instructionsWithUrl
		};
	}

	res.json({
		success: true,
		message: 'File depository activity updated successfully',
		data: {
			activity: responseData
		}
	});
}));

// @route   PUT /api/course-activities/:id/complete
// @desc    Mark activity as completed by user
// @access  Private (All authenticated users)
router.put('/:id/complete', activityIdValidation, validateRequest, asyncHandler(async (req: Request, res: Response) => {
	const activity = await CourseActivityModel.findById(req.params.id);

	if (!activity) {
		throw new AppError('Activity not found', 404);
	}

	const userId = req.user!.userId;

	// Check if user already completed this activity
	const existingCompletion = activity.completion.find(c => c.user.toString() === userId);
	if (existingCompletion) {
		throw new AppError('Activity already completed by user', 400);
	}

	// Add completion
	activity.completion.push({
		user: userId,
		completedAt: new Date()
	} as any);

	await activity.save();

	// Log activity completion
	if (req.user?.userId) {
		await logActivity({
			level: 'info',
			message: `User completed activity: ${activity.title} (Type: ${activity.activityType})`,
			userId: req.user.userId,
			metadata: {
				activityId: activity._id.toString(),
				activityType: activity.activityType,
				activityTitle: activity.title,
				courseUnitId: activity.courseUnit.toString()
			}
		});
	}

	const completionRate = await activity.getCompletionRate();

	res.json({
		success: true,
		message: 'Activity marked as completed',
		data: {
			completionRate,
			completedAt: new Date()
		}
	});
}));

// @route   PATCH /api/course-activities/:id
// @desc    Update activity (e.g., toggle pin)
// @access  Private (Teacher only)
router.patch('/:id', teacherMiddleware, activityIdValidation, validateRequest, asyncHandler(async (req: Request, res: Response) => {
	const activity = await CourseActivityModel.findById(req.params.id);

	if (!activity) {
		throw new AppError('Activity not found', 404);
	}

	// Update fields that are provided in the request body
	const { pin } = req.body;

	if (pin !== undefined) {
		(activity as any).isPinned = pin;
	}

	await activity.save();

	const populatedActivity = await CourseActivityModel.findById(activity._id)
		.populate('courseUnit', 'name code slug')
		.populate('restrictedGroups', 'name slug');

	res.json({
		success: true,
		message: 'Activity updated successfully',
		data: populatedActivity
	});
}));

// @route   DELETE /api/course-activities/:id
// @desc    Delete activity
// @access  Private (Teacher only)
router.delete('/:id', teacherMiddleware, activityIdValidation, validateRequest, asyncHandler(async (req: Request, res: Response) => {
	const activity = await CourseActivityModel.findById(req.params.id);

	if (!activity) {
		throw new AppError('Activity not found', 404);
	}

	// Delete associated files if they exist
	if (activity.activityType === 'file') {
		const fileActivity = activity as any;
		if (fileActivity.file) {
			try {
				await deleteFile(FILE_CONFIGS.activityFile.bucket, fileActivity.file);
			} catch (error) {
				console.warn('Failed to delete activity file:', error);
			}
		}
	} else if (activity.activityType === 'file-depository') {
		const depositoryActivity = activity as any;
		if (depositoryActivity.instructions.type === 'file' && depositoryActivity.instructions.file) {
			try {
				await deleteFile(FILE_CONFIGS.activityFile.bucket, depositoryActivity.instructions.file);
			} catch (error) {
				console.warn('Failed to delete instructions file:', error);
			}
		}
	}

	await CourseActivityModel.findByIdAndDelete(req.params.id);

	res.json({
		success: true,
		message: 'Activity deleted successfully',
		data: {
			deletedActivity: {
				id: activity._id,
				activityType: activity.activityType,
				title: (activity as any).title || 'N/A'
			}
		}
	});
}));

export default router;

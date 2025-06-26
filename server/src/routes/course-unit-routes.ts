import { Router, Request, Response } from 'express';
import { query, param, body } from 'express-validator';
import CourseUnit from '../models/course-unit';
import { authMiddleware } from '../middleware/auth-middleware';
import { adminMiddleware } from '../middleware/roles-middleware';
import { validateRequest } from '../middleware/validate-request';
import { AppError } from '../utils/app-error';
import { asyncHandler } from '../utils/async-handler';
import { uploadCourseImage, handleFileUploadError } from '../middleware/file-upload-middleware';
import { uploadFile, generateFileName, deleteFile, FILE_CONFIGS, getPublicUrl } from '../services/minio-service';

const router = Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Validation rules
const getCourseUnitsValidation = [
	query('page')
		 .optional()
		 .isInt({ min: 1 })
		 .withMessage('Page must be a positive integer'),
	query('limit')
		 .optional()
		 .isInt({ min: 1, max: 100 })
		 .withMessage('Limit must be between 1 and 100'),
	query('search')
		 .optional()
		 .isLength({ min: 1, max: 50 })
		 .withMessage('Search term must be between 1 and 50 characters'),
	query('minCapacity')
		 .optional()
		 .isInt({ min: 0 })
		 .withMessage('Minimum capacity must be a non-negative integer'),
	query('maxCapacity')
		 .optional()
		 .isInt({ min: 0 })
		 .withMessage('Maximum capacity must be a non-negative integer'),
	query('sortBy')
		 .optional()
		 .isIn(['createdAt', 'updatedAt', 'name', 'code', 'capacity'])
		 .withMessage('sortBy must be one of: createdAt, updatedAt, name, code, capacity'),
	query('sortOrder')
		 .optional()
		 .isIn(['asc', 'desc'])
		 .withMessage('sortOrder must be asc or desc')
];

const courseUnitIdValidation = [
	param('id')
		 .isMongoId()
		 .withMessage('Invalid course unit ID format')
];

const createCourseUnitValidation = [
	body('name')
		 .notEmpty()
		 .withMessage('Name is required')
		 .isLength({ max: 50 })
		 .withMessage('Name must be less than 50 characters')
		 .trim(),
	body('code')
		 .notEmpty()
		 .withMessage('Code is required')
		 .isLength({ min: 2, max: 20 })
		 .withMessage('Code must be between 2 and 20 characters')
		 .matches(/^[A-Z0-9]+$/)
		 .withMessage('Code must contain only uppercase letters and numbers')
		 .trim(),
	body('slug')
		 .notEmpty()
		 .withMessage('Slug is required')
		 .isLength({ min: 2, max: 50 })
		 .withMessage('Slug must be between 2 and 50 characters')
		 .matches(/^[a-z0-9-]+$/)
		 .withMessage('Slug must contain only lowercase letters, numbers, and hyphens')
		 .trim(),
	body('capacity')
		 .notEmpty()
		 .withMessage('Capacity is required')
		 .isInt({ min: 1 })
		 .withMessage('Capacity must be a positive integer'),
	// Image will be handled by file upload middleware
];

const updateCourseUnitValidation = [
	body('name')
		 .optional()
		 .isLength({ max: 50 })
		 .withMessage('Name must be less than 50 characters')
		 .trim(),
	body('code')
		 .optional()
		 .isLength({ min: 2, max: 20 })
		 .withMessage('Code must be between 2 and 20 characters')
		 .matches(/^[A-Z0-9]+$/)
		 .withMessage('Code must contain only uppercase letters and numbers')
		 .trim(),
	body('slug')
		 .optional()
		 .isLength({ min: 2, max: 50 })
		 .withMessage('Slug must be between 2 and 50 characters')
		 .matches(/^[a-z0-9-]+$/)
		 .withMessage('Slug must contain only lowercase letters, numbers, and hyphens')
		 .trim(),
	body('capacity')
		 .optional()
		 .isInt({ min: 1 })
		 .withMessage('Capacity must be a positive integer'),
	// Image will be handled by file upload middleware
];

// @route   GET /api/course-units
// @desc    Get all course units with pagination and filters
// @access  Private (All authenticated users)
router.get('/', getCourseUnitsValidation, validateRequest, asyncHandler(async (req: Request, res: Response) => {
	const page = parseInt(req.query.page as string) || 1;
	const limit = parseInt(req.query.limit as string) || 10;
	const search = req.query.search as string;
	const minCapacity = req.query.minCapacity ? parseInt(req.query.minCapacity as string) : undefined;
	const maxCapacity = req.query.maxCapacity ? parseInt(req.query.maxCapacity as string) : undefined;
	const sortBy = (req.query.sortBy as string) || 'createdAt';
	const sortOrder = (req.query.sortOrder as string) || 'desc';

	// Build filter object
	const filter: any = {};

	if (search) {
		filter.$or = [
			{ name: { $regex: search, $options: 'i' } },
			{ code: { $regex: search, $options: 'i' } },
			{ slug: { $regex: search, $options: 'i' } }
		];
	}

	if (minCapacity !== undefined && maxCapacity !== undefined) {
		filter.capacity = { $gte: minCapacity, $lte: maxCapacity };
	} else if (minCapacity !== undefined) {
		filter.capacity = { $gte: minCapacity };
	} else if (maxCapacity !== undefined) {
		filter.capacity = { $lte: maxCapacity };
	}

	// Build sort object
	const sort: any = {};
	sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

	// Calculate skip value for pagination
	const skip = (page - 1) * limit;

	// Execute queries
	const [courseUnits, totalCourseUnits] = await Promise.all([
		CourseUnit.find(filter)
			 .sort(sort)
			 .skip(skip)
			 .limit(limit)
			 .select('-__v'),
		CourseUnit.countDocuments(filter)
	]);

	// Calculate pagination info
	const totalPages = Math.ceil(totalCourseUnits / limit);
	const hasNextPage = page < totalPages;
	const hasPrevPage = page > 1;

	res.json({
		success: true,
		data: {
			courseUnits,
			pagination: {
				currentPage: page,
				totalPages,
				totalCourseUnits,
				limit,
				hasNextPage,
				hasPrevPage
			}
		}
	});
}));

// @route   GET /api/course-units/stats
// @desc    Get course unit statistics
// @access  Private (Admin only)
router.get('/stats', adminMiddleware, asyncHandler(async (req: Request, res: Response) => {
	const stats = await CourseUnit.aggregate([
		{
			$group: {
				_id: null,
				totalCourseUnits: { $sum: 1 },
				totalCapacity: { $sum: '$capacity' },
				averageCapacity: { $avg: '$capacity' },
				minCapacity: { $min: '$capacity' },
				maxCapacity: { $max: '$capacity' }
			}
		}
	]);

	const capacityDistribution = await CourseUnit.aggregate([
		{
			$bucket: {
				groupBy: '$capacity',
				boundaries: [0, 20, 50, 100, 200, 500, 1000],
				default: '1000+',
				output: {
					count: { $sum: 1 },
					courseUnits: {
						$push: {
							name: '$name',
							code: '$code',
							capacity: '$capacity'
						}
					}
				}
			}
		}
	]);

	const recentCourseUnits = await CourseUnit.find()
		 .sort({ createdAt: -1 })
		 .limit(5)
		 .select('name code capacity slug createdAt');

	const topCapacityCourseUnits = await CourseUnit.find()
		 .sort({ capacity: -1 })
		 .limit(5)
		 .select('name code capacity slug');

	const result = stats[0] || {
		totalCourseUnits: 0,
		totalCapacity: 0,
		averageCapacity: 0,
		minCapacity: 0,
		maxCapacity: 0
	};

	res.json({
		success: true,
		data: {
			overview: result,
			capacityDistribution,
			recentCourseUnits,
			topCapacityCourseUnits
		}
	});
}));

// @route   GET /api/course-units/:id
// @desc    Get course unit by ID
// @access  Private (All authenticated users)
router.get('/:id', courseUnitIdValidation, validateRequest, asyncHandler(async (req: Request, res: Response) => {
	const courseUnit = await CourseUnit.findById(req.params.id).select('-__v');

	if (!courseUnit) {
		throw new AppError('Course unit not found', 404);
	}

	res.json({
		success: true,
		data: {
			courseUnit
		}
	});
}));

// @route   POST /api/course-units
// @desc    Create new course unit
// @access  Private (Admin only)
router.post('/', adminMiddleware, uploadCourseImage, handleFileUploadError, createCourseUnitValidation, validateRequest, asyncHandler(async (req: Request, res: Response) => {
	const { name, code, slug, capacity } = req.body;

	// Check if course unit with same slug already exists
	const existingCourseUnit = await CourseUnit.findOne({ slug });
	if (existingCourseUnit) {
		throw new AppError('Course unit with this slug already exists', 400);
	}

	// Check if course unit with same code already exists
	const existingCode = await CourseUnit.findOne({ code });
	if (existingCode) {
		throw new AppError('Course unit with this code already exists', 400);
	}

	let imageKey = null;
	let imageUrl = null;

	// Handle image upload if provided
	if (req.file) {
		const fileName = generateFileName(req.file.originalname, `course-${slug}`);
		imageKey = await uploadFile(
			req.file,
			FILE_CONFIGS.courseImage.bucket,
			fileName,
			{
				'X-Amz-Meta-Course-Slug': slug,
				'X-Amz-Meta-Upload-Type': 'course-image'
			}
		);
		imageUrl = getPublicUrl(FILE_CONFIGS.courseImage.bucket, imageKey);
	}

	const courseUnit = new CourseUnit({
		name,
		code,
		slug,
		capacity,
		img: imageKey
	});

	await courseUnit.save();

	res.status(201).json({
		success: true,
		message: 'Course unit created successfully',
		data: {
			courseUnit: {
				id: courseUnit._id,
				name: courseUnit.name,
				code: courseUnit.code,
				slug: courseUnit.slug,
				capacity: courseUnit.capacity,
				img: courseUnit.img,
				imageUrl,
				createdAt: courseUnit.createdAt,
				updatedAt: courseUnit.updatedAt
			}
		}
	});
}));

// @route   PUT /api/course-units/:id
// @desc    Update course unit
// @access  Private (Admin only)
router.put('/:id', adminMiddleware, [...courseUnitIdValidation, ...updateCourseUnitValidation], validateRequest, asyncHandler(async (req: Request, res: Response) => {
	const { name, code, slug, capacity } = req.body;

	const courseUnit = await CourseUnit.findById(req.params.id);

	if (!courseUnit) {
		throw new AppError('Course unit not found', 404);
	}

	// Check if another course unit with same slug already exists
	if (slug && slug !== courseUnit.slug) {
		const existingSlug = await CourseUnit.findOne({ slug, _id: { $ne: req.params.id } });
		if (existingSlug) {
			throw new AppError('Course unit with this slug already exists', 400);
		}
	}

	// Check if another course unit with same code already exists
	if (code && code !== courseUnit.code) {
		const existingCode = await CourseUnit.findOne({ code, _id: { $ne: req.params.id } });
		if (existingCode) {
			throw new AppError('Course unit with this code already exists', 400);
		}
	}

	// Update fields if provided
	if (name !== undefined) courseUnit.name = name;
	if (code !== undefined) courseUnit.code = code;
	if (slug !== undefined) courseUnit.slug = slug;
	if (capacity !== undefined) courseUnit.capacity = capacity;

	await courseUnit.save();

	// Get image URL if exists
	let imageUrl = null;
	if (courseUnit.img) {
		imageUrl = getPublicUrl(FILE_CONFIGS.courseImage.bucket, courseUnit.img);
	}

	res.json({
		success: true,
		message: 'Course unit updated successfully',
		data: {
			courseUnit: {
				id: courseUnit._id,
				name: courseUnit.name,
				code: courseUnit.code,
				slug: courseUnit.slug,
				capacity: courseUnit.capacity,
				img: courseUnit.img,
				imageUrl,
				createdAt: courseUnit.createdAt,
				updatedAt: courseUnit.updatedAt
			}
		}
	});
}));

// @route   DELETE /api/course-units/:id
// @desc    Delete course unit
// @access  Private (Admin only)
router.delete('/:id', adminMiddleware, courseUnitIdValidation, validateRequest, asyncHandler(async (req: Request, res: Response) => {
	const courseUnit = await CourseUnit.findById(req.params.id);

	if (!courseUnit) {
		throw new AppError('Course unit not found', 404);
	}

	await CourseUnit.findByIdAndDelete(req.params.id);

	res.json({
		success: true,
		message: 'Course unit deleted successfully',
		data: {
			deletedCourseUnit: {
				id: courseUnit._id,
				name: courseUnit.name,
				code: courseUnit.code,
				slug: courseUnit.slug,
				capacity: courseUnit.capacity
			}
		}
	});
}));

// @route   GET /api/course-units/search/:term
// @desc    Search course units by name, code, or slug
// @access  Private (All authenticated users)
router.get('/search/:term', [
	param('term')
		 .isLength({ min: 1, max: 50 })
		 .withMessage('Search term must be between 1 and 50 characters')
], validateRequest, asyncHandler(async (req: Request, res: Response) => {
	const searchTerm = req.params.term;
	const limit = parseInt(req.query.limit as string) || 10;

	const courseUnits = await CourseUnit.find({
		$or: [
			{ name: { $regex: searchTerm, $options: 'i' } },
			{ code: { $regex: searchTerm, $options: 'i' } },
			{ slug: { $regex: searchTerm, $options: 'i' } }
		]
	})
		 .limit(limit)
		 .select('name code slug capacity img createdAt')
		 .sort({ name: 1 });

	res.json({
		success: true,
		data: {
			courseUnits,
			count: courseUnits.length
		}
	});
}));

// @route   GET /api/course-units/by-code/:code
// @desc    Get course unit by code
// @access  Private (All authenticated users)
router.get('/by-code/:code', [
	param('code')
		 .isLength({ min: 2, max: 20 })
		 .withMessage('Code must be between 2 and 20 characters')
		 .matches(/^[A-Z0-9]+$/)
		 .withMessage('Code must contain only uppercase letters and numbers')
], validateRequest, asyncHandler(async (req: Request, res: Response) => {
	const code = req.params.code;

	const courseUnit = await CourseUnit.findOne({ code }).select('-__v');

	if (!courseUnit) {
		throw new AppError('Course unit not found', 404);
	}

	res.json({
		success: true,
		data: {
			courseUnit
		}
	});
}));

// @route   GET /api/course-units/by-slug/:slug
// @desc    Get course unit by slug
// @access  Private (All authenticated users)
router.get('/by-slug/:slug', [
	param('slug')
		 .isLength({ min: 2, max: 50 })
		 .withMessage('Slug must be between 2 and 50 characters')
		 .matches(/^[a-z0-9-]+$/)
		 .withMessage('Slug must contain only lowercase letters, numbers, and hyphens')
], validateRequest, asyncHandler(async (req: Request, res: Response) => {
	const slug = req.params.slug;

	const courseUnit = await CourseUnit.findOne({ slug }).select('-__v');

	if (!courseUnit) {
		throw new AppError('Course unit not found', 404);
	}

	res.json({
		success: true,
		data: {
			courseUnit
		}
	});
}));

// @route   GET /api/course-units/capacity-range/:min/:max
// @desc    Get course units within capacity range
// @access  Private (All authenticated users)
router.get('/capacity-range/:min/:max', [
	param('min')
		 .isInt({ min: 0 })
		 .withMessage('Minimum capacity must be a non-negative integer'),
	param('max')
		 .isInt({ min: 0 })
		 .withMessage('Maximum capacity must be a non-negative integer')
		 .custom((value, { req }) => {
			 if (!req.params?.min || req.params.min === '') {
				 throw new Error('Minimum capacity is required');
			 }
			 if (parseInt(value) < parseInt(req.params.min)) {
				 throw new Error('Maximum capacity must be greater than or equal to minimum capacity');
			 }
			 return true;
		 }),
	query('page')
		 .optional()
		 .isInt({ min: 1 })
		 .withMessage('Page must be a positive integer'),
	query('limit')
		 .optional()
		 .isInt({ min: 1, max: 100 })
		 .withMessage('Limit must be between 1 and 100')
], validateRequest, asyncHandler(async (req: Request, res: Response) => {
	const minCapacity = parseInt(req.params.min);
	const maxCapacity = parseInt(req.params.max);
	const page = parseInt(req.query.page as string) || 1;
	const limit = parseInt(req.query.limit as string) || 10;
	const skip = (page - 1) * limit;

	const [courseUnits, totalCourseUnits] = await Promise.all([
		CourseUnit.find({
			capacity: { $gte: minCapacity, $lte: maxCapacity }
		})
			 .sort({ capacity: 1 })
			 .skip(skip)
			 .limit(limit)
			 .select('name code slug capacity img createdAt'),
		CourseUnit.countDocuments({
			capacity: { $gte: minCapacity, $lte: maxCapacity }
		})
	]);

	const totalPages = Math.ceil(totalCourseUnits / limit);

	res.json({
		success: true,
		data: {
			courseUnits,
			pagination: {
				currentPage: page,
				totalPages,
				totalCourseUnits,
				limit,
				hasNextPage: page < totalPages,
				hasPrevPage: page > 1
			},
			capacityRange: {
				min: minCapacity,
				max: maxCapacity
			}
		}
	});
}));

// @route   PUT /api/course-units/:id/image
// @desc    Upload/Update course unit image
// @access  Private (Admin only)
router.put('/:id/image', adminMiddleware, courseUnitIdValidation, uploadCourseImage, handleFileUploadError, validateRequest, asyncHandler(async (req: Request, res: Response) => {
	if (!req.file) {
		throw new AppError('Image file is required', 400);
	}

	const courseUnit = await CourseUnit.findById(req.params.id);

	if (!courseUnit) {
		throw new AppError('Course unit not found', 404);
	}

	// Delete old image if exists
	if (courseUnit.img) {
		try {
			await deleteFile(FILE_CONFIGS.courseImage.bucket, courseUnit.img);
		} catch (error) {
			console.warn('Failed to delete old course image:', error);
		}
	}

	// Generate unique filename and upload new image
	const fileName = generateFileName(req.file.originalname, `course-${courseUnit.slug}`);
	const objectKey = await uploadFile(
		req.file,
		FILE_CONFIGS.courseImage.bucket,
		fileName,
		{
			'X-Amz-Meta-Course-Id': courseUnit._id.toString(),
			'X-Amz-Meta-Course-Slug': courseUnit.slug,
			'X-Amz-Meta-Upload-Type': 'course-image'
		}
	);

	// Update course unit image reference
	courseUnit.img = objectKey;
	await courseUnit.save();

	const imageUrl = getPublicUrl(FILE_CONFIGS.courseImage.bucket, objectKey);

	res.json({
		success: true,
		message: 'Course unit image uploaded successfully',
		data: {
			img: objectKey,
			imageUrl,
			courseUnit: {
				id: courseUnit._id,
				name: courseUnit.name,
				code: courseUnit.code,
				slug: courseUnit.slug,
				capacity: courseUnit.capacity,
				img: objectKey,
				imageUrl
			}
		}
	});
}));

// @route   DELETE /api/course-units/:id/image
// @desc    Remove course unit image
// @access  Private (Admin only)
router.delete('/:id/image', adminMiddleware, courseUnitIdValidation, validateRequest, asyncHandler(async (req: Request, res: Response) => {
	const courseUnit = await CourseUnit.findById(req.params.id);

	if (!courseUnit) {
		throw new AppError('Course unit not found', 404);
	}

	if (!courseUnit.img) {
		throw new AppError('Course unit has no image to remove', 400);
	}

	// Delete image from MinIO
	try {
		await deleteFile(FILE_CONFIGS.courseImage.bucket, courseUnit.img);
	} catch (error) {
		console.warn('Failed to delete image from storage:', error);
	}

	// Remove image reference from course unit
	courseUnit.img = undefined;
	await courseUnit.save();

	res.json({
		success: true,
		message: 'Course unit image removed successfully',
		data: {
			courseUnit: {
				id: courseUnit._id,
				name: courseUnit.name,
				code: courseUnit.code,
				slug: courseUnit.slug,
				capacity: courseUnit.capacity,
				img: null
			}
		}
	});
}));

export default router;
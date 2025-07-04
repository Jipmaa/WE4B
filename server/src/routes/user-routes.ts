import { Router, Request, Response } from 'express';
import { query, param, body } from 'express-validator';
import User from '../models/user';
import CourseGroup from '../models/course-group';
import { authMiddleware } from '../middleware/auth-middleware';
import { adminMiddleware } from '../middleware/roles-middleware';
import { validateRequest } from '../middleware/validate-request';
import { AppError } from '../utils/app-error';
import { asyncHandler } from '../utils/async-handler';
import { uploadAvatar, handleFileUploadError } from '../middleware/file-upload-middleware';
import { uploadFile, generateFileName, deleteFile, FILE_CONFIGS, getPublicUrl } from '../services/minio-service';

const router = Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Validation rules
const getUsersValidation = [
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
	query('role')
		 .optional()
		 .isIn(['student', 'teacher', 'admin'])
		 .withMessage('Role must be student, teacher, or admin'),
	query('department')
		 .optional()
		 .isLength({ min: 1, max: 100 })
		 .withMessage('Department must be between 1 and 100 characters'),
	query('isActive')
		 .optional()
		 .isBoolean()
		 .withMessage('isActive must be a boolean'),
	query('sortBy')
		 .optional()
		 .isIn(['createdAt', 'updatedAt', 'email', 'lastLogin', 'firstName', 'lastName'])
		 .withMessage('sortBy must be one of: createdAt, updatedAt, email, lastLogin, firstName, lastName'),
	query('sortOrder')
		 .optional()
		 .isIn(['asc', 'desc'])
		 .withMessage('sortOrder must be asc or desc')
];

const userIdValidation = [
	param('id')
		 .isMongoId()
		 .withMessage('Invalid user ID format')
];

const createUserValidation = [
	body('email')
		 .isEmail()
		 .withMessage('Please provide a valid email address')
		 .normalizeEmail()
		 .toLowerCase()
		 .trim(),
	body('password')
		 .isLength({ min: 6 })
		 .withMessage('Password must be at least 6 characters long'),
	body('firstName')
		 .notEmpty()
		 .withMessage('First name is required')
		 .isLength({ max: 50 })
		 .withMessage('First name must be less than 50 characters')
		 .trim(),
	body('lastName')
		 .notEmpty()
		 .withMessage('Last name is required')
		 .isLength({ max: 50 })
		 .withMessage('Last name must be less than 50 characters')
		 .trim(),
	body('birthdate')
		 .isISO8601()
		 .toDate()
		 .withMessage('Please provide a valid birthdate'),
	body('roles')
		 .optional()
		 .isArray()
		 .withMessage('Roles must be an array')
		 .custom((roles) => {
			 const validRoles = ['student', 'teacher', 'admin'];
			 return roles.every((role: string) => validRoles.includes(role)) && roles.length > 0;
		 })
		 .withMessage('Roles must contain valid values: student, teacher, admin and cannot be empty'),
	body('department')
		 .optional()
		 .isLength({ max: 100 })
		 .withMessage('Department must be less than 100 characters')
		 .trim(),
	body('isActive')
		 .optional()
		 .isBoolean()
		 .withMessage('isActive must be a boolean'),
	body('isEmailVerified')
		 .optional()
		 .isBoolean()
		 .withMessage('isEmailVerified must be a boolean'),
	body('phone')
		 .optional()
		 .custom((value) => {
			 if (!value) return true; // Allow empty since it's optional
			 // Remove common formatting characters before validation
			 const cleanPhone = value.replace(/[\s\-.()]/g, '');
			 // Match the User model regex pattern: /^\+?\d{7,14}$/
			 return /^\+?\d{7,14}$/.test(cleanPhone);
		 })
		 .withMessage('Please provide a valid phone number (7-14 digits, optional +)')
];

// @route   POST /api/users
// @desc    Create a new user
// @access  Private (Admin only)
router.post('/', adminMiddleware, uploadAvatar, handleFileUploadError, createUserValidation, validateRequest, asyncHandler(async (req: Request, res: Response) => {
	const {
		email,
		password,
		firstName,
		lastName,
		birthdate,
		roles,
		department,
		isActive,
		isEmailVerified,
		phone
	} = req.body;

	// Check if user already exists
	const existingUser = await User.findOne({ email });
	if (existingUser) {
		throw new AppError('User with this email already exists', 400);
	}

	// Create new user
	const userData: any = {
		email,
		password,
		firstName,
		lastName,
		birthdate,
		roles: roles || ['student'], // Default to student role if not provided
		department: department || undefined,
		isActive: isActive !== undefined ? isActive : true, // Default to active
		isEmailVerified: isEmailVerified !== undefined ? isEmailVerified : false, // Default to unverified
		phone: phone ? phone.replace(/[\s\-.()]/g, '') : undefined
	};

	// Handle avatar upload if provided
	if (req.file) {
		// Generate unique filename and upload avatar
		const fileName = generateFileName(req.file.originalname, `avatar-new-user`);
		userData.avatar = await uploadFile(req.file, FILE_CONFIGS.avatar.bucket, fileName, {
			'X-Amz-Meta-Upload-Type': 'avatar',
			'X-Amz-Meta-User-Id': userData._id
		});
	}

	const user = new User(userData);
	await user.save();

	res.status(201).json({
		success: true,
		message: 'User created successfully',
		data: {
			user: {
				id: user._id,
				email: user.email,
				firstName: user.firstName,
				lastName: user.lastName,
				fullName: user.getFullName(),
				department: user.department,
				birthdate: user.birthdate,
				avatar: user.avatar,
				roles: user.roles,
				isActive: user.isActive,
											isEmailVerified: user.isEmailVerified,
							phone: user.phone,
							createdAt: user.createdAt,
							updatedAt: user.updatedAt
			}
		}
	});
}));

// @route   GET /api/users
// @desc    Get all users with pagination and filters
// @access  Private (Admin only)
router.get('/', adminMiddleware, getUsersValidation, validateRequest, asyncHandler(async (req: Request, res: Response) => {
	const page = parseInt(req.query.page as string) || 1;
	const limit = parseInt(req.query.limit as string) || 10;
	const search = req.query.search as string;
	const role = req.query.role as string;
	const department = req.query.department as string;
	const isActive = req.query.isActive as string;
	const sortBy = (req.query.sortBy as string) || 'createdAt';
	const sortOrder = (req.query.sortOrder as string) || 'desc';

	// Build filter object
	const filter: any = {};

	if (search) {
		filter.$or = [
			{ email: { $regex: search, $options: 'i' } },
			{ firstName: { $regex: search, $options: 'i' } },
			{ lastName: { $regex: search, $options: 'i' } },
			{ department: { $regex: search, $options: 'i' } },
			{ phone: { $regex: search, $options: 'i' } }
		];
	}

	if (role) {
		filter.roles = { $in: [role] };
	}

	if (department) {
		filter.department = { $regex: department, $options: 'i' };
	}

	if (isActive !== undefined) {
		filter.isActive = isActive === 'true';
	}

	// Build sort object
	const sort: any = {};
	sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

	// Calculate skip value for pagination
	const skip = (page - 1) * limit;

	// Execute queries
	const [users, totalUsers] = await Promise.all([
		User.find(filter)
			 .sort(sort)
			 .skip(skip)
			 .limit(limit)
			 .select('-__v'),
		User.countDocuments(filter)
	]);

	// Calculate pagination info
	const totalPages = Math.ceil(totalUsers / limit);
	const hasNextPage = page < totalPages;
	const hasPrevPage = page > 1;

	res.json({
		success: true,
		data: {
			users,
			pagination: {
				currentPage: page,
				totalPages,
				totalUsers,
				limit,
				hasNextPage,
				hasPrevPage
			}
		}
	});
}));

// @route   GET /api/users/stats
// @desc    Get user statistics
// @access  Private (Admin only)
router.get('/stats', adminMiddleware, asyncHandler(async (req: Request, res: Response) => {
	const stats = await User.aggregate([
		{
			$group: {
				_id: null,
				totalUsers: { $sum: 1 },
				activeUsers: {
					$sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] }
				},
				inactiveUsers: {
					$sum: { $cond: [{ $eq: ['$isActive', false] }, 1, 0] }
				},
				verifiedUsers: {
					$sum: { $cond: [{$or: [
						{ $eq: ['$isEmailVerified', true] },
						{ $eq: ['$isPhoneVerified', true] }
					]}, 1, 0] }
				},
				unverifiedUsers: {
					$sum: { $cond: [{$and: [
						{ $eq: ['$isEmailVerified', false] },
						{ $eq: ['$isPhoneVerified', false] }
					]}, 1, 0] }
				}
			}
		}
	]);

	const roleStats = await User.aggregate([
		{ $unwind: '$roles' },
		{
			$group: {
				_id: '$roles',
				count: { $sum: 1 }
			}
		}
	]);

	const departmentStats = await User.aggregate([
		{
			$match: { department: { $nin: [null, ''] } }
		},
		{
			$group: {
				_id: '$department',
				count: { $sum: 1 }
			}
		},
		{ $sort: { count: -1 } }
	]);

	const recentUsers = await User.find()
		 .sort({ createdAt: -1 })
		 .limit(5)
		 .select('email firstName lastName createdAt roles department');

	const result = stats[0] || {
		totalUsers: 0,
		activeUsers: 0,
		inactiveUsers: 0,
		verifiedUsers: 0,
		unverifiedUsers: 0
	};

	res.json({
		success: true,
		data: {
			overview: result,
			roleDistribution: roleStats,
			departmentDistribution: departmentStats,
			recentUsers
		}
	});
}));

// @route   GET /api/users/:id
// @desc    Get user by ID
// @access  Private (Admin only)
router.get('/:id', adminMiddleware, userIdValidation, validateRequest, asyncHandler(async (req: Request, res: Response) => {
	const user = await User.findById(req.params.id).select('-__v');

	if (!user) {
		throw new AppError('User not found', 404);
	}

	res.json({
		success: true,
		data: {
			user
		}
	});
}));

// @route   PUT /api/users/:id/toggle-status
// @desc    Toggle user active status
// @access  Private (Admin only)
router.put('/:id/toggle-status', adminMiddleware, userIdValidation, validateRequest, asyncHandler(async (req: Request, res: Response) => {
	const user = await User.findById(req.params.id);

	if (!user) {
		throw new AppError('User not found', 404);
	}

	// Prevent admin from deactivating themselves
	if (user._id.toString() === req.user?.userId) {
		throw new AppError('You cannot deactivate your own account', 400);
	}

	user.isActive = !user.isActive;
	await user.save();

	res.json({
		success: true,
		message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully`,
		data: {
			user: {
				id: user._id,
				email: user.email,
				firstName: user.firstName,
				lastName: user.lastName,
				department: user.department,
				roles: user.roles,
				isActive: user.isActive
			}
		}
	});
}));

// @route   PUT /api/users/:id/roles
// @desc    Update user roles
// @access  Private (Admin only)
router.put('/:id/roles', adminMiddleware, [
	...userIdValidation,
	body('roles')
		 .isArray()
		 .withMessage('Roles must be an array')
		 .custom((roles) => {
			 const validRoles = ['student', 'teacher', 'admin'];
			 return roles.every((role: string) => validRoles.includes(role)) && roles.length > 0;
		 })
		 .withMessage('Roles must contain valid values: student, teacher, admin and cannot be empty')
], validateRequest, asyncHandler(async (req: Request, res: Response) => {
	const { roles } = req.body;

	const user = await User.findById(req.params.id);

	if (!user) {
		throw new AppError('User not found', 404);
	}

	// Prevent admin from changing their own roles
	if (user._id.toString() === req.user?.userId) {
		throw new AppError('You cannot change your own roles', 400);
	}

	const oldRoles = user.roles;
	user.roles = roles;
	await user.save();

	res.json({
		success: true,
		message: `User roles updated from [${oldRoles.join(', ')}] to [${roles.join(', ')}]`,
		data: {
			user: {
				id: user._id,
				email: user.email,
				firstName: user.firstName,
				lastName: user.lastName,
				department: user.department,
				roles: user.roles
			}
		}
	});
}));

// @route   PUT /api/users/:id/profile
// @desc    Update user profile (Admin only)
// @access  Private (Admin only)
router.put('/:id', adminMiddleware, uploadAvatar, handleFileUploadError, [
	...userIdValidation,
	body('email')
		 .optional()
		 .isEmail()
		 .withMessage('Please provide a valid email address')
		 .normalizeEmail()
		 .toLowerCase()
		 .trim(),
	body('password')
		 .optional()
		 .isLength({ min: 6 })
		 .withMessage('Password must be at least 6 characters long'),
	body('firstName')
		 .optional()
		 .isLength({ max: 50 })
		 .withMessage('First name must be less than 50 characters')
		 .trim(),
	body('lastName')
		 .optional()
		 .isLength({ max: 50 })
		 .withMessage('Last name must be less than 50 characters')
		 .trim(),
	body('birthdate')
		 .optional()
		 .isISO8601()
		 .toDate()
		 .withMessage('Please provide a valid birthdate'),
	body('roles')
		 .optional()
		 .isArray()
		 .withMessage('Roles must be an array')
		 .custom((roles) => {
			 const validRoles = ['student', 'teacher', 'admin'];
			 return roles.every((role: string) => validRoles.includes(role)) && roles.length > 0;
		 })
		 .withMessage('Roles must contain valid values: student, teacher, admin and cannot be empty'),
	body('department')
		 .optional()
		 .isLength({ max: 100 })
		 .withMessage('Department must be less than 100 characters')
		 .trim(),
	body('phone')
		 .optional()
		 .custom((value) => {
			 if (!value) return true; // Allow empty since it's optional
			 // Remove common formatting characters before validation
			 const cleanPhone = value.replace(/[\s\-.()]/g, '');
			 // Match the User model regex pattern: /^\+?\d{7,14}$/
			 return /^\+?\d{7,14}$/.test(cleanPhone);
		 })
		 .withMessage('Please provide a valid phone number (7-14 digits, optional +)')
], validateRequest, asyncHandler(async (req: Request, res: Response) => {
	const { email, password, firstName, lastName, birthdate, roles, department, phone } = req.body;

	const user = await User.findById(req.params.id).select('+password');

	if (!user) {
		throw new AppError('User not found', 404);
	}

	// Update fields if provided
	if (email !== undefined) user.email = email;
	if (password !== undefined) user.password = password;
	if (firstName !== undefined) user.firstName = firstName;
	if (lastName !== undefined) user.lastName = lastName;
	if (birthdate !== undefined) user.birthdate = birthdate;
	if (roles !== undefined) user.roles = roles;
	if (department !== undefined) user.department = department;
	if (phone !== undefined) {
		// Clean the phone number before assigning it
		user.phone = phone ? phone.replace(/[\s\-.()]/g, '') : null;
	}

	// Handle avatar update/removal
	if (req.file) {
		// Delete old avatar if exists
		if (user.avatar) {
			try {
				await deleteFile(FILE_CONFIGS.avatar.bucket, user.avatar);
			} catch (error) {
				console.warn('Failed to delete old avatar:', error);
			}
		}
		// Generate unique filename and upload new avatar
		const fileName = generateFileName(req.file.originalname, `avatar-${user._id}`);
		user.avatar = await uploadFile(req.file, FILE_CONFIGS.avatar.bucket, fileName, {
			'X-Amz-Meta-Upload-Type': 'avatar',
			'X-Amz-Meta-User-Id': user._id.toString()
		});
	} else if (user.avatar && req.body.avatar === '') { // If avatar field is explicitly empty, remove it
		try {
			await deleteFile(FILE_CONFIGS.avatar.bucket, user.avatar);
		} catch (error) {
			console.warn('Failed to delete old avatar:', error);
		}
		user.avatar = undefined;
	}

	await user.save();

	res.json({
		success: true,
		message: 'User updated successfully',
		data: {
			user: {
				id: user._id,
				email: user.email,
				firstName: user.firstName,
				lastName: user.lastName,
				fullName: user.getFullName(),
				department: user.department,
				birthdate: user.birthdate,
				avatar: user.avatar,
				phone: user.phone,
				roles: user.roles,
				isActive: user.isActive,
				isEmailVerified: user.isEmailVerified,
				isPhoneVerified: user.isPhoneVerified,
				updatedAt: user.updatedAt
			}
		}
	});
}));

// @route   DELETE /api/users/:id
// @desc    Delete user
// @access  Private (Admin only)
router.delete('/:id', adminMiddleware, userIdValidation, validateRequest, asyncHandler(async (req: Request, res: Response) => {
	const user = await User.findById(req.params.id);

	if (!user) {
		throw new AppError('User not found', 404);
	}

	// Prevent admin from deleting themselves
	if (user._id.toString() === req.user?.userId) {
		throw new AppError('You cannot delete your own account', 400);
	}

	await User.findByIdAndDelete(req.params.id);

	res.json({
		success: true,
		message: 'User deleted successfully',
		data: {
			deletedUser: {
				id: user._id,
				email: user.email,
				firstName: user.firstName,
				lastName: user.lastName,
				department: user.department
			}
		}
	});
}));

// @route   GET /api/users/search/:term
// @desc    Search users by email, name, or department
// @access  Private
router.get('/search/:term', [
	param('term')
		 .isLength({ min: 1, max: 50 })
		 .withMessage('Search term must be between 1 and 50 characters')
], validateRequest, asyncHandler(async (req: Request, res: Response) => {
	const searchTerm = req.params.term;
	const limit = parseInt(req.query.limit as string) || 10;

	const users = await User.find({
		$or: [
			{ email: { $regex: searchTerm, $options: 'i' } },
			{ firstName: { $regex: searchTerm, $options: 'i' } },
			{ lastName: { $regex: searchTerm, $options: 'i' } },
			{ department: { $regex: searchTerm, $options: 'i' } },
			{ phone: { $regex: searchTerm, $options: 'i' } }
		],
		isActive: true
	})
		 .limit(limit)
		 .select('email firstName lastName avatar roles department createdAt')
		 .sort({ firstName: 1, lastName: 1 });

	res.json({
		success: true,
		data: {
			users,
			count: users.length
		}
	});
}));

// @route   GET /api/users/by-role/:role
// @desc    Get users by role
// @access  Private (Admin only)
router.get('/by-role/:role', adminMiddleware, [
	param('role')
		 .isIn(['student', 'teacher', 'admin'])
		 .withMessage('Role must be student, teacher, or admin'),
	query('page')
		 .optional()
		 .isInt({ min: 1 })
		 .withMessage('Page must be a positive integer'),
	query('limit')
		 .optional()
		 .isInt({ min: 1, max: 100 })
		 .withMessage('Limit must be between 1 and 100')
], validateRequest, asyncHandler(async (req: Request, res: Response) => {
	const role = req.params.role;
	const page = parseInt(req.query.page as string) || 1;
	const limit = parseInt(req.query.limit as string) || 10;
	const skip = (page - 1) * limit;

	const [users, totalUsers] = await Promise.all([
		User.find({ roles: { $in: [role] }, isActive: true })
			 .sort({ createdAt: -1 })
			 .skip(skip)
			 .limit(limit)
			 .select('email firstName lastName department roles createdAt'),
		User.countDocuments({ roles: { $in: [role] }, isActive: true })
	]);

	const totalPages = Math.ceil(totalUsers / limit);

	res.json({
		success: true,
		data: {
			users,
			pagination: {
				currentPage: page,
				totalPages,
				totalUsers,
				limit,
				hasNextPage: page < totalPages,
				hasPrevPage: page > 1
			}
		}
	});
}));

// @route   GET /api/users/by-department/:department
// @desc    Get users by department
// @access  Private (Admin only)
router.get('/by-department/:department', adminMiddleware, [
	param('department')
		 .isLength({ min: 1, max: 100 })
		 .withMessage('Department must be between 1 and 100 characters'),
	query('page')
		 .optional()
		 .isInt({ min: 1 })
		 .withMessage('Page must be a positive integer'),
	query('limit')
		 .optional()
		 .isInt({ min: 1, max: 100 })
		 .withMessage('Limit must be between 1 and 100')
], validateRequest, asyncHandler(async (req: Request, res: Response) => {
	const department = req.params.department;
	const page = parseInt(req.query.page as string) || 1;
	const limit = parseInt(req.query.limit as string) || 10;
	const skip = (page - 1) * limit;

	const [users, totalUsers] = await Promise.all([
		User.find({
			department: { $regex: department, $options: 'i' },
			isActive: true
		})
			 .sort({ createdAt: -1 })
			 .skip(skip)
			 .limit(limit)
			 .select('email firstName lastName department roles createdAt'),
		User.countDocuments({
			department: { $regex: department, $options: 'i' },
			isActive: true
		})
	]);

	const totalPages = Math.ceil(totalUsers / limit);

	res.json({
		success: true,
		data: {
			users,
			pagination: {
				currentPage: page,
				totalPages,
				totalUsers,
				limit,
				hasNextPage: page < totalPages,
				hasPrevPage: page > 1
			}
		}
	});
}));

// @route   GET /api/users/me
// @desc    Get current user profile
// @access  Private
router.get('/me', asyncHandler(async (req: Request, res: Response) => {
	const user = await User.findById(req.user?.userId).select('-__v');

	if (!user) {
		throw new AppError('User not found', 404);
	}

	// Add avatar URL if exists
	const userData = user.toJSON();
	const avatarUrl = userData.avatar ? user.getAvatarUrl() : null;
	const userWithAvatar = {
		...userData,
		avatarUrl
	};

	res.json({
		success: true,
		data: {
			user: userWithAvatar
		}
	});
}));

// @route   GET /api/users/me/course-units
// @desc    Get current user's course units based on their groups
// @access  Private
router.get('/me/course-units', asyncHandler(async (req: Request, res: Response) => {
	const user = await User.findById(req.user?.userId).select('_id');

	if (!user) {
		throw new AppError('User not found', 404);
	}

	// Find all course groups where the user is explicitly assigned with a role
	const courseGroups = await CourseGroup.find({
		'users.user': user._id
	}).select('courseUnit users').populate('courseUnit', 'slug name code img');

	// Extract unique course units and include user's role in each course
	const courseUnitsMap = new Map();

	courseGroups.forEach(group => {
		const userInGroup = group.users.find(u => u.user.toString() === user._id.toString());
		if (userInGroup && group.courseUnit) {
			const courseUnitId = group.courseUnit._id.toString();
			if (!courseUnitsMap.has(courseUnitId)) {
				courseUnitsMap.set(courseUnitId, {
					...group.courseUnit,
					userRole: userInGroup.role
				});
			}
		}
	});

	const courseUnits = Array.from(courseUnitsMap.values());

	res.json({
		success: true,
		data: {
			courseUnits
		}
	});
}));

// @route   PUT /api/users/me/avatar
// @desc    Upload/Update user avatar
// @access  Private
router.put('/me/avatar', uploadAvatar, handleFileUploadError, asyncHandler(async (req: Request, res: Response) => {
	if (!req.file) {
		throw new AppError('Avatar file is required', 400);
	}

	const user = await User.findById(req.user?.userId);

	if (!user) {
		throw new AppError('User not found', 404);
	}

	// Delete old avatar if exists
	if (user.avatar) {
		try {
			await deleteFile(FILE_CONFIGS.avatar.bucket, user.avatar);
		} catch (error) {
			console.warn('Failed to delete old avatar:', error);
		}
	}

	// Generate unique filename and upload new avatar
	const fileName = generateFileName(req.file.originalname, `avatar-${user._id}`);
	const objectKey = await uploadFile(
		req.file,
		FILE_CONFIGS.avatar.bucket,
		fileName,
		{
			'X-Amz-Meta-User-Id': user._id.toString(),
			'X-Amz-Meta-Upload-Type': 'avatar'
		}
	);

	// Update user avatar reference
	user.avatar = objectKey;
	await user.save();

	const avatarUrl = getPublicUrl(FILE_CONFIGS.avatar.bucket, objectKey);

	res.json({
		success: true,
		message: 'Avatar uploaded successfully',
		data: {
			user: {
				id: user._id,
				email: user.email,
				firstName: user.firstName,
				lastName: user.lastName,
				fullName: user.getFullName(),
				avatar: avatarUrl,
				roles: user.roles,
				department: user.department,
				birthdate: user.birthdate,
				phone: user.phone,
				isActive: user.isActive,
				isEmailVerified: user.isEmailVerified,
				isPhoneVerified: user.isPhoneVerified,
				lastLogin: user.lastLogin,
				createdAt: user.createdAt,
				updatedAt: user.updatedAt
			}
		}
	});
}));

// @route   DELETE /api/users/me/avatar
// @desc    Remove user avatar
// @access  Private
router.delete('/me/avatar', asyncHandler(async (req: Request, res: Response) => {
	const user = await User.findById(req.user?.userId);

	if (!user) {
		throw new AppError('User not found', 404);
	}

	if (!user.avatar) {
		throw new AppError('No avatar to remove', 400);
	}

	// Delete avatar from MinIO
	try {
		await deleteFile(FILE_CONFIGS.avatar.bucket, user.avatar);
	} catch (error) {
		console.warn('Failed to delete avatar from storage:', error);
	}

	// Remove avatar reference from user
	user.avatar = undefined;
	await user.save();

	res.json({
		success: true,
		message: 'Avatar removed successfully',
		data: {
			user: {
				id: user._id,
				email: user.email,
				firstName: user.firstName,
				lastName: user.lastName,
				fullName: user.getFullName(),
				avatar: null,
				roles: user.roles,
				department: user.department,
				birthdate: user.birthdate,
				phone: user.phone,
				isActive: user.isActive,
				isEmailVerified: user.isEmailVerified,
				isPhoneVerified: user.isPhoneVerified,
				lastLogin: user.lastLogin,
				createdAt: user.createdAt,
				updatedAt: user.updatedAt
			}
		}
	});
}));

// @route   DELETE /api/users/:id/avatar
// @desc    Remove user avatar (Admin only)
// @access  Private (Admin only)
router.delete('/:id/avatar', adminMiddleware, userIdValidation, validateRequest, asyncHandler(async (req: Request, res: Response) => {
	const user = await User.findById(req.params.id);

	if (!user) {
		throw new AppError('User not found', 404);
	}

	if (!user.avatar) {
		throw new AppError('User has no avatar to remove', 400);
	}

	// Delete avatar from MinIO
	try {
		await deleteFile(FILE_CONFIGS.avatar.bucket, user.avatar);
	} catch (error) {
		console.warn('Failed to delete avatar from storage:', error);
	}

	// Remove avatar reference from user
	user.avatar = undefined;
	await user.save();

	res.json({
		success: true,
		message: 'User avatar removed successfully',
		data: {
			user: {
				id: user._id,
				email: user.email,
				firstName: user.firstName,
				lastName: user.lastName,
				fullName: user.getFullName(),
				avatar: null
			}
		}
	});
}));

export default router;
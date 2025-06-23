import { Router, Request, Response } from 'express';
import { query, param, body } from 'express-validator';
import CourseGroup from '../models/course-group';
import CourseUnit from '../models/course-unit';
import User from '../models/user';
import { authMiddleware } from '../middleware/auth-middleware';
import { teacherMiddleware } from '../middleware/roles-middleware';
import { validateRequest } from '../middleware/validate-request';
import { AppError } from '../utils/app-error';
import { asyncHandler } from '../utils/async-handler';
import { getCurrentAcademicPeriod } from '../utils/academic-period';

const router = Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Validation rules
const getGroupsValidation = [
	query('page')
		.optional()
		.isInt({ min: 1 })
		.withMessage('Page must be a positive integer'),
	query('limit')
		.optional()
		.isInt({ min: 1, max: 100 })
		.withMessage('Limit must be between 1 and 100'),
	query('courseUnit')
		.optional()
		.isMongoId()
		.withMessage('Invalid course unit ID format'),
	query('kind')
		.optional()
		.isIn(['theoretical', 'practical', 'laboratory', 'other'])
		.withMessage('Kind must be theoretical, practical, laboratory, or other'),
	query('semester')
		.optional()
		.isIn(['1', '2'])
		.withMessage('Semester must be 1 or 2'),
	query('day')
		.optional()
		.isIn(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])
		.withMessage('Invalid day')
];

const groupIdValidation = [
	param('id')
		.isMongoId()
		.withMessage('Invalid group ID format')
];

const createGroupValidation = [
	body('name')
		.notEmpty()
		.withMessage('Name is required')
		.isLength({ max: 100 })
		.withMessage('Name must be less than 100 characters')
		.trim(),
	body('slug')
		.notEmpty()
		.withMessage('Slug is required')
		.isLength({ min: 2, max: 50 })
		.withMessage('Slug must be between 2 and 50 characters')
		.matches(/^[a-z0-9-]+$/)
		.withMessage('Slug must contain only lowercase letters, numbers, and hyphens')
		.trim(),
	body('kind')
		.notEmpty()
		.withMessage('Kind is required')
		.isIn(['theoretical', 'practical', 'laboratory', 'other'])
		.withMessage('Kind must be theoretical, practical, laboratory, or other'),
	body('courseUnit')
		.notEmpty()
		.withMessage('Course unit is required')
		.isMongoId()
		.withMessage('Invalid course unit ID format'),
	body('day')
		.notEmpty()
		.withMessage('Day is required')
		.isIn(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])
		.withMessage('Invalid day'),
	body('from')
		.notEmpty()
		.withMessage('Start time is required')
		.matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
		.withMessage('Start time must be in HH:mm format'),
	body('to')
		.notEmpty()
		.withMessage('End time is required')
		.matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
		.withMessage('End time must be in HH:mm format'),
	body('semester')
		.notEmpty()
		.withMessage('Semester is required')
		.isIn([1, 2])
		.withMessage('Semester must be 1 or 2')
];

const updateGroupValidation = [
	body('name')
		.optional()
		.isLength({ max: 100 })
		.withMessage('Name must be less than 100 characters')
		.trim(),
	body('slug')
		.optional()
		.isLength({ min: 2, max: 50 })
		.withMessage('Slug must be between 2 and 50 characters')
		.matches(/^[a-z0-9-]+$/)
		.withMessage('Slug must contain only lowercase letters, numbers, and hyphens')
		.trim(),
	body('kind')
		.optional()
		.isIn(['theoretical', 'practical', 'laboratory', 'other'])
		.withMessage('Kind must be theoretical, practical, laboratory, or other'),
	body('day')
		.optional()
		.isIn(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])
		.withMessage('Invalid day'),
	body('from')
		.optional()
		.matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
		.withMessage('Start time must be in HH:mm format'),
	body('to')
		.optional()
		.matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
		.withMessage('End time must be in HH:mm format'),
	body('semester')
		.optional()
		.isIn([1, 2])
		.withMessage('Semester must be 1 or 2')
];

const addUserValidation = [
	body('userId')
		.notEmpty()
		.withMessage('User ID is required')
		.isMongoId()
		.withMessage('Invalid user ID format'),
	body('role')
		.notEmpty()
		.withMessage('Role is required')
		.isIn(['student', 'teacher'])
		.withMessage('Role must be student or teacher'),
	body('semester')
		.optional()
		.isIn([1, 2])
		.withMessage('Semester must be 1 or 2'),
	body('year')
		.optional()
		.matches(/^\d{4}-\d{4}$/)
		.withMessage('Year must be in YYYY-YYYY format')
];

// @route   GET /api/course-groups
// @desc    Get all course groups with pagination and filters
// @access  Private (All authenticated users)
router.get('/', getGroupsValidation, validateRequest, asyncHandler(async (req: Request, res: Response) => {
	const page = parseInt(req.query.page as string) || 1;
	const limit = parseInt(req.query.limit as string) || 10;
	const courseUnit = req.query.courseUnit as string;
	const kind = req.query.kind as string;
	const semester = req.query.semester ? parseInt(req.query.semester as string) : undefined;
	const day = req.query.day as string;
	const skip = (page - 1) * limit;

	// Build filter object
	const filter: any = {};

	if (courseUnit) {
		filter.courseUnit = courseUnit;
	}

	if (kind) {
		filter.kind = kind;
	}

	if (semester) {
		filter.semester = semester;
	}

	if (day) {
		filter.day = day;
	}

	// Execute queries
	const [groups, totalGroups] = await Promise.all([
		CourseGroup.find(filter)
			.populate('courseUnit', 'name code slug')
			.populate('users.user', 'firstName lastName email')
			.sort({ createdAt: -1 })
			.skip(skip)
			.limit(limit)
			.select('-__v'),
		CourseGroup.countDocuments(filter)
	]);

	// Calculate pagination info
	const totalPages = Math.ceil(totalGroups / limit);
	const hasNextPage = page < totalPages;
	const hasPrevPage = page > 1;

	res.json({
		success: true,
		data: {
			groups,
			pagination: {
				currentPage: page,
				totalPages,
				totalGroups,
				limit,
				hasNextPage,
				hasPrevPage
			}
		}
	});
}));

// @route   GET /api/course-groups/:id
// @desc    Get course group by ID
// @access  Private (All authenticated users)
router.get('/:id', groupIdValidation, validateRequest, asyncHandler(async (req: Request, res: Response) => {
	const group = await CourseGroup.findById(req.params.id)
		.populate('courseUnit', 'name code slug capacity')
		.populate('users.user', 'firstName lastName email roles department')
		.select('-__v');

	if (!group) {
		throw new AppError('Course group not found', 404);
	}

	// Separate users by role
	const groupData = group.toJSON();
	const students = groupData.users.filter((u: any) => u.role === 'student');
	const teachers = groupData.users.filter((u: any) => u.role === 'teacher');
	const userCount = {
		total: groupData.users.length,
		students: students.length,
		teachers: teachers.length
	};
	const groupWithSeparatedUsers = {
		...groupData,
		students,
		teachers,
		userCount
	};

	res.json({
		success: true,
		data: {
			group: groupWithSeparatedUsers
		}
	});
}));

// @route   POST /api/course-groups
// @desc    Create new course group
// @access  Private (Admin/Teacher only)
router.post('/', teacherMiddleware, createGroupValidation, validateRequest, asyncHandler(async (req: Request, res: Response) => {
	const { name, slug, kind, courseUnit, day, from, to, semester } = req.body;

	// Verify course unit exists
	const courseUnitDoc = await CourseUnit.findById(courseUnit);
	if (!courseUnitDoc) {
		throw new AppError('Course unit not found', 404);
	}

	// Check if group with same slug already exists
	const existingGroup = await CourseGroup.findOne({ slug });
	if (existingGroup) {
		throw new AppError('Course group with this slug already exists', 400);
	}

	// Validate time range
	const fromTime = new Date(`1970-01-01T${from}:00`);
	const toTime = new Date(`1970-01-01T${to}:00`);
	if (fromTime >= toTime) {
		throw new AppError('End time must be after start time', 400);
	}

	const group = new CourseGroup({
		name,
		slug,
		kind,
		courseUnit,
		day,
		from,
		to,
		semester,
		users: []
	});

	await group.save();

	// Update course unit to include this group
	await CourseUnit.findByIdAndUpdate(
		courseUnit,
		{ $addToSet: { groups: group._id } }
	);

	const populatedGroup = await CourseGroup.findById(group._id)
		.populate('courseUnit', 'name code slug');

	res.status(201).json({
		success: true,
		message: 'Course group created successfully',
		data: {
			group: populatedGroup
		}
	});
}));

// @route   PUT /api/course-groups/:id
// @desc    Update course group
// @access  Private (Admin/Teacher only)
router.put('/:id', teacherMiddleware, [...groupIdValidation, ...updateGroupValidation], validateRequest, asyncHandler(async (req: Request, res: Response) => {
	const { name, slug, kind, day, from, to, semester } = req.body;

	const group = await CourseGroup.findById(req.params.id);

	if (!group) {
		throw new AppError('Course group not found', 404);
	}

	// Check if another group with same slug already exists
	if (slug && slug !== group.slug) {
		const existingSlug = await CourseGroup.findOne({ slug, _id: { $ne: req.params.id } });
		if (existingSlug) {
			throw new AppError('Course group with this slug already exists', 400);
		}
	}

	// Validate time range if both times are provided
	if (from && to) {
		const fromTime = new Date(`1970-01-01T${from}:00`);
		const toTime = new Date(`1970-01-01T${to}:00`);
		if (fromTime >= toTime) {
			throw new AppError('End time must be after start time', 400);
		}
	}

	// Update fields if provided
	if (name !== undefined) group.name = name;
	if (slug !== undefined) group.slug = slug;
	if (kind !== undefined) group.kind = kind;
	if (day !== undefined) group.day = day;
	if (from !== undefined) group.from = from;
	if (to !== undefined) group.to = to;
	if (semester !== undefined) group.semester = semester;

	await group.save();

	const populatedGroup = await CourseGroup.findById(group._id)
		.populate('courseUnit', 'name code slug')
		.populate('users.user', 'firstName lastName email');

	res.json({
		success: true,
		message: 'Course group updated successfully',
		data: {
			group: populatedGroup
		}
	});
}));

// @route   DELETE /api/course-groups/:id
// @desc    Delete course group
// @access  Private (Admin/Teacher only)
router.delete('/:id', teacherMiddleware, groupIdValidation, validateRequest, asyncHandler(async (req: Request, res: Response) => {
	const group = await CourseGroup.findById(req.params.id);

	if (!group) {
		throw new AppError('Course group not found', 404);
	}

	// Remove group from course unit
	await CourseUnit.findByIdAndUpdate(
		group.courseUnit,
		{ $pull: { groups: group._id } }
	);

	// Remove group from users' memberOfGroups
	const userIds = group.users.map(u => u.user);
	await User.updateMany(
		{ _id: { $in: userIds } },
		{ $pull: { memberOfGroups: group._id } }
	);

	await CourseGroup.findByIdAndDelete(req.params.id);

	res.json({
		success: true,
		message: 'Course group deleted successfully',
		data: {
			deletedGroup: {
				id: group._id,
				name: group.name,
				slug: group.slug,
				userCount: group.users.length
			}
		}
	});
}));

// @route   POST /api/course-groups/:id/users
// @desc    Add user to course group
// @access  Private (Admin/Teacher only)
router.post('/:id/users', teacherMiddleware, [...groupIdValidation, ...addUserValidation], validateRequest, asyncHandler(async (req: Request, res: Response) => {
	const { userId, role, semester, year } = req.body;

	const group = await CourseGroup.findById(req.params.id);
	if (!group) {
		throw new AppError('Course group not found', 404);
	}

	// Verify user exists
	const user = await User.findById(userId);
	if (!user) {
		throw new AppError('User not found', 404);
	}

	// Check if user is already in this group
	const existingUser = group.users.find(u => u.user.toString() === userId);
	if (existingUser) {
		throw new AppError('User is already in this group', 400);
	}

	// Get current academic period if not provided
	const currentPeriod = getCurrentAcademicPeriod();
	const userSemester = semester || currentPeriod.semester;
	const userYear = year || currentPeriod.year;

	// Add user to group
	group.users.push({
		user: userId,
		role,
		semester: userSemester,
		year: userYear
	} as any);

	await group.save();

	// Add group to user's memberOfGroups
	await User.findByIdAndUpdate(
		userId,
		{ $addToSet: { memberOfGroups: group._id } }
	);

	const populatedGroup = await CourseGroup.findById(group._id)
		.populate('users.user', 'firstName lastName email');

	// Find the newly added user data
	const addedUser = populatedGroup!.users.find(u => u.user._id.toString() === userId);

	res.json({
		success: true,
		message: 'User added to group successfully',
		data: {
			group: {
				id: group._id,
				name: group.name,
				slug: group.slug,
				userCount: group.users.length
			},
			addedUser
		}
	});
}));

// @route   DELETE /api/course-groups/:id/users/:userId
// @desc    Remove user from course group
// @access  Private (Admin/Teacher only)
router.delete('/:id/users/:userId', teacherMiddleware, [
	...groupIdValidation,
	param('userId')
		.isMongoId()
		.withMessage('Invalid user ID format')
], validateRequest, asyncHandler(async (req: Request, res: Response) => {
	const { userId } = req.params;

	const group = await CourseGroup.findById(req.params.id);
	if (!group) {
		throw new AppError('Course group not found', 404);
	}

	// Check if user is in this group
	const userIndex = group.users.findIndex(u => u.user.toString() === userId);
	if (userIndex === -1) {
		throw new AppError('User is not in this group', 404);
	}

	// Remove user from group
	const removedUser = group.users[userIndex];
	group.users.splice(userIndex, 1);
	await group.save();

	// Remove group from user's memberOfGroups
	await User.findByIdAndUpdate(
		userId,
		{ $pull: { memberOfGroups: group._id } }
	);

	res.json({
		success: true,
		message: 'User removed from group successfully',
		data: {
			group: {
				id: group._id,
				name: group.name,
				slug: group.slug,
				userCount: group.users.length
			},
			removedUser: {
				userId,
				role: removedUser.role
			}
		}
	});
}));

// @route   GET /api/course-groups/:id/users
// @desc    Get all users in a course group
// @access  Private (All authenticated users)
router.get('/:id/users', groupIdValidation, validateRequest, asyncHandler(async (req: Request, res: Response) => {
	const group = await CourseGroup.findById(req.params.id)
		.populate('users.user', 'firstName lastName email roles department')
		.select('name slug users');

	if (!group) {
		throw new AppError('Course group not found', 404);
	}

	// Separate users by role
	const students = group.users.filter(u => u.role === 'student');
	const teachers = group.users.filter(u => u.role === 'teacher');

	res.json({
		success: true,
		data: {
			group: {
				id: group._id,
				name: group.name,
				slug: group.slug
			},
			users: {
				all: group.users,
				students,
				teachers,
				count: {
					total: group.users.length,
					students: students.length,
					teachers: teachers.length
				}
			}
		}
	});
}));

// @route   GET /api/course-groups/by-course-unit/:courseUnitId
// @desc    Get all groups for a specific course unit
// @access  Private (All authenticated users)
router.get('/by-course-unit/:courseUnitId', [
	param('courseUnitId')
		.isMongoId()
		.withMessage('Invalid course unit ID format')
], validateRequest, asyncHandler(async (req: Request, res: Response) => {
	const groups = await CourseGroup.find({ courseUnit: req.params.courseUnitId })
		.populate('courseUnit', 'name code slug')
		.sort({ semester: 1, day: 1, from: 1 })
		.select('-__v');

	res.json({
		success: true,
		data: {
			groups,
			count: groups.length
		}
	});
}));

// @route   GET /api/course-groups/my
// @desc    Get current user's course groups
// @access  Private (All authenticated users)
router.get('/my', asyncHandler(async (req: Request, res: Response) => {
	const user = await User.findById(req.user!.userId)
		.populate({
			path: 'memberOfGroups',
			populate: {
				path: 'courseUnit',
				select: 'name code slug'
			}
		})
		.select('memberOfGroups');

	if (!user) {
		throw new AppError('User not found', 404);
	}

	res.json({
		success: true,
		data: {
			groups: user.memberOfGroups,
			count: user.memberOfGroups.length
		}
	});
}));

export default router;
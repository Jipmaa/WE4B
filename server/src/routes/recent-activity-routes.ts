import { Router, Request, Response } from 'express';
import { query } from 'express-validator';
import RecentActivity, { RecentActivityAction } from '../models/recent-activity';
import CourseGroup from '../models/course-group';
import DepositedFiles from '../models/deposited-files';
import User from '../models/user';
import { authMiddleware } from '../middleware/auth-middleware';
import { validateRequest } from '../middleware/validate-request';
import { AppError } from '../utils/app-error';
import { asyncHandler } from '../utils/async-handler';
import { getCurrentAcademicPeriod } from '../utils/academic-period';

const router = Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Helper function to check if user has submitted work for an activity
async function hasUserSubmittedWork(userId: string, activityId: string): Promise<boolean> {
	try {
		const submission = await DepositedFiles.findOne({
			user: userId,
			activity: activityId
		}).lean();
		return !!submission;
	} catch (error) {
		console.warn('Failed to check user submission:', error);
		return false;
	}
}

// Helper function to get user's role in a course
function getUserRoleInCourse(userGroups: any[], courseId: string, userId: string): 'student' | 'teacher' | null {
	const group = userGroups.find(g => g.courseUnit._id.toString() === courseId.toString());
	if (!group) return null;
	
	const userInGroup = group.users.find((u: any) => u.user.toString() === userId.toString());
	return userInGroup ? userInGroup.role : null;
}

// Main filtering function for activities based on user role
async function filterActivitiesByUserRole(
	activities: any[], 
	userId: string, 
	userGroups: any[], 
	userRoles: string[]
): Promise<any[]> {
	// Apply role-based filtering
	const filteredActivities: any[] = [];
	const isAdmin = userRoles.includes('admin');
	const isTeacher = userRoles.includes('teacher');
	const isStudent = userRoles.includes('student');

	console.log({
		isAdmin,
		isTeacher,
		isStudent,
		userId,
		userGroups: userGroups.map(g => g.courseUnit._id.toString())
	})
	
	// Batch check submissions for due_soon/overdue activities (for student role)
	const dueSoonOrOverdueActivities = activities.filter(
		activity => activity.action === 'due_soon' || activity.action === 'overdue'
	);
	
	const submissionChecks = await Promise.all(
		dueSoonOrOverdueActivities.map(activity => 
			hasUserSubmittedWork(userId, activity.activity._id.toString())
		)
	);
	
	const submissionMap = new Map();
	dueSoonOrOverdueActivities.forEach((activity, index) => {
		submissionMap.set(activity._id.toString(), submissionChecks[index]);
	});

	// Use a Set to avoid duplicate activities
	const activityIds = new Set<string>();
	
	// ADMIN ROLE: Add add_to_course activities
	if (isAdmin) {
		activities.forEach(activity => {
			if (activity.action === 'add_to_course' && !activityIds.has(activity._id.toString())) {
				filteredActivities.push(activity);
				activityIds.add(activity._id.toString());
			}
		});
	}
	
	// TEACHER ROLE: Add teacher-specific activities
	if (isTeacher) {
		activities.forEach(activity => {
			if (activityIds.has(activity._id.toString())) return; // Skip if already added
			
			const courseId = activity.course._id.toString();
			const userRole = getUserRoleInCourse(userGroups, courseId, userId);

			if (activity.actor.kind === 'user' && activity.actor.data._id.toString() === userId) {
				// If the activity is performed by the user themselves, never include it
				return;
			}
			
			if (userRole === 'teacher') {
				switch (activity.action) {
					case 'create':
					case 'update':
					case 'submit':
					case 'grade':
					case 'add_to_course':
						filteredActivities.push(activity);
						activityIds.add(activity._id.toString());
						break;
				}
			}
		});
	}
	
	// STUDENT ROLE: Add student-specific activities
	if (isStudent) {
		activities.forEach(activity => {
			if (activityIds.has(activity._id.toString())) return; // Skip if already added
			
			const courseId = activity.course._id.toString();
			const userRole = getUserRoleInCourse(userGroups, courseId, userId);
			
			if (userRole === 'student') {
				switch (activity.action) {
					case 'create':
					case 'update':
						// Visible to everyone in the course
						filteredActivities.push(activity);
						activityIds.add(activity._id.toString());
						break;
						
					case 'submit':
						// Only visible if it's their own submission
						const isOwnSubmission = activity.actor.kind === 'user' && 
							activity.actor.data._id && 
							activity.actor.data._id.toString() === userId.toString();
						if (isOwnSubmission) {
							filteredActivities.push(activity);
							activityIds.add(activity._id.toString());
						}
						break;
						
					case 'grade':
						// Only visible if they are the graded student
						const isGradedStudent = activity.targetUser && 
							activity.targetUser._id.toString() === userId.toString();
						if (isGradedStudent) {
							filteredActivities.push(activity);
							activityIds.add(activity._id.toString());
						}
						break;
						
					case 'due_soon':
					case 'overdue':
						// Only visible if they haven't submitted work for that activity
						if (activity.activity) {
							const hasSubmitted = submissionMap.get(activity._id.toString());
							if (!hasSubmitted) {
								filteredActivities.push(activity);
								activityIds.add(activity._id.toString());
							}
						}
						break;
				}
			}
		});
	}

	return filteredActivities;
}

// Validation rules
const getRecentActivitiesValidation = [
	query('page')
		.optional()
		.isInt({ min: 1 })
		.withMessage('Page must be a positive integer'),
	query('limit')
		.optional()
		.isInt({ min: 1, max: 50 })
		.withMessage('Limit must be between 1 and 50'),
	query('courseId')
		.optional()
		.isMongoId()
		.withMessage('Invalid course ID format'),
	query('action')
		.optional()
		.isIn(['create', 'update', 'submit', 'grade', 'add_to_course', 'due_soon', 'overdue'])
		.withMessage('Invalid action type')
];

// @route   GET /api/recent-activities
// @desc    Get recent activities for the authenticated user
// @access  Private
router.get('/', 
	getRecentActivitiesValidation,
	validateRequest,
	asyncHandler(async (req: Request, res: Response) => {
		const userId = req.user!.userId;
		const { page = 1, limit = 20, courseId, action } = req.query;
		
		// Get user roles
		const user = await User.findById(userId).select('roles');
		if (!user) {
			throw new AppError('User not found', 404);
		}
		
		// Get courses that the user is enrolled in or teaching
		const { year, semester } = getCurrentAcademicPeriod();
		
		const userGroups = await CourseGroup.find({
			'users.user': userId,
			$or: [
				{ 'users.year': year, 'users.semester': semester },
				{ 'users.year': null, 'users.semester': null },
				{ 'users.year': year, 'users.semester': null },
				{ 'users.year': null, 'users.semester': semester }
			]
		}).select('courseUnit users').populate('courseUnit', '_id');
		
		const userCourseIds = userGroups.map(group => group.courseUnit._id);
		
		if (userCourseIds.length === 0) {
			return res.json({
				success: true,
				data: {
					activities: [],
					pagination: {
						page: Number(page),
						limit: Number(limit),
						total: 0,
						pages: 0
					}
				}
			});
		}
		
		// Build query
		const query: any = {
			course: { $in: userCourseIds }
		};
		
		if (courseId) {
			// Verify user has access to this specific course
			if (!userCourseIds.some(id => id.toString() === courseId)) {
				throw new AppError('Access denied to this course', 403);
			}
			query.course = courseId;
		}
		
		if (action) {
			query.action = action as RecentActivityAction;
		}
		
		// Get activities with proper population (fetch more to account for filtering)
		const activities = await RecentActivity.find(query)
			.populate('course', 'code slug')
			.populate('activity', '_id title dueAt')
			.populate('targetUser', 'firstName lastName avatar')
			.sort({ date: -1 })
			.limit(Number(limit) * 5) // Fetch 5x the limit to account for filtering
			.lean();
		
		// Post-process to handle actor population
		const populatedActivities = await Promise.all(
			activities.map(async (activity) => {
				if (activity.actor.kind === 'user') {
					const User = require('../models/user').default;
					const actorUser = await User.findById(activity.actor.data)
						.select('firstName lastName avatar');
					
					if (actorUser) {
						(activity.actor as any).data = {
							_id: actorUser._id,
							fullName: actorUser.getFullName(),
							imageUrl: actorUser.getAvatarUrl()
						};
					}
				}
				return activity;
			})
		);
		
		// Apply role-based filtering
		const filteredActivities = await filterActivitiesByUserRole(
			populatedActivities,
			userId,
			userGroups,
			user.roles
		);
		
		// Apply pagination after filtering
		const skip = (Number(page) - 1) * Number(limit);
		const paginatedActivities = filteredActivities.slice(skip, skip + Number(limit));
		const total = filteredActivities.length;
		
		res.json({
			success: true,
			data: {
				activities: paginatedActivities,
				pagination: {
					page: Number(page),
					limit: Number(limit),
					total,
					pages: Math.ceil(total / Number(limit))
				}
			}
		});
	})
);

// @route   GET /api/recent-activities/course/:courseId
// @desc    Get recent activities for a specific course
// @access  Private
router.get('/course/:courseId',
	query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
	query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
	validateRequest,
	asyncHandler(async (req: Request, res: Response) => {
		const userId = req.user!.userId;
		const { courseId } = req.params;
		const { page = 1, limit = 20 } = req.query;
		
		// Get user roles
		const user = await User.findById(userId).select('roles');
		if (!user) {
			throw new AppError('User not found', 404);
		}
		
		// Verify user has access to this course
		const { year, semester } = getCurrentAcademicPeriod();
		
		const userGroup = await CourseGroup.findOne({
			courseUnit: courseId,
			'users.user': userId,
			'users.year': year,
			'users.semester': semester
		}).select('courseUnit users');
		
		if (!userGroup) {
			throw new AppError('Access denied to this course', 403);
		}
		
		// Get activities for this specific course (fetch more to account for filtering)
		const activities = await RecentActivity.find({ course: courseId })
			.populate('course', 'code slug')
			.populate('activity', '_id title dueAt')
			.populate('targetUser', 'firstName lastName avatar')
			.sort({ date: -1 })
			.limit(Number(limit) * 5) // Fetch 5x the limit to account for filtering
			.lean();
		
		// Post-process to handle actor population
		const populatedActivities = await Promise.all(
			activities.map(async (activity) => {
				if (activity.actor.kind === 'user') {
					const User = require('../models/user').default;
					const actorUser = await User.findById(activity.actor.data)
						.select('firstName lastName avatar');
					
					if (actorUser) {
						(activity.actor as any).data = {
							_id: actorUser._id,
							fullName: actorUser.getFullName(),
							imageUrl: actorUser.getAvatarUrl()
						};
					}
				}
				return activity;
			})
		);
		
		// Apply role-based filtering
		const filteredActivities = await filterActivitiesByUserRole(
			populatedActivities,
			userId,
			[userGroup], // Pass single group as array for consistency
			user.roles
		);
		
		// Apply pagination after filtering
		const skip = (Number(page) - 1) * Number(limit);
		const paginatedActivities = filteredActivities.slice(skip, skip + Number(limit));
		const total = filteredActivities.length;
		
		res.json({
			success: true,
			data: {
				activities: paginatedActivities,
				pagination: {
					page: Number(page),
					limit: Number(limit),
					total,
					pages: Math.ceil(total / Number(limit))
				}
			}
		});
	})
);

// @route   GET /api/recent-activities/stats
// @desc    Get activity statistics
// @access  Private
router.get('/stats',
	asyncHandler(async (req: Request, res: Response) => {
		const userId = req.user!.userId;
		
		// Get courses that the user is enrolled in or teaching
		const { year, semester } = getCurrentAcademicPeriod();
		
		const userGroups = await CourseGroup.find({
			'users.user': userId,
			'users.year': year,
			'users.semester': semester
		}).select('courseUnit');
		
		const userCourseIds = userGroups.map(group => group.courseUnit);
		
		if (userCourseIds.length === 0) {
			return res.json({
				success: true,
				data: {
					totalActivities: 0,
					recentActivities: 0,
					actionBreakdown: {}
				}
			});
		}
		
		// Get activity statistics
		const totalActivities = await RecentActivity.countDocuments({
			course: { $in: userCourseIds }
		});
		
		const recentActivities = await RecentActivity.countDocuments({
			course: { $in: userCourseIds },
			date: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
		});
		
		const actionBreakdown = await RecentActivity.aggregate([
			{ $match: { course: { $in: userCourseIds } } },
			{ $group: { _id: '$action', count: { $sum: 1 } } },
			{ $sort: { count: -1 } }
		]);
		
		const breakdown = actionBreakdown.reduce((acc, item) => {
			acc[item._id] = item.count;
			return acc;
		}, {} as Record<string, number>);
		
		res.json({
			success: true,
			data: {
				totalActivities,
				recentActivities,
				actionBreakdown: breakdown
			}
		});
	})
);

export default router;
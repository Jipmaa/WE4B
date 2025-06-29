import { Router, Request, Response } from 'express';
import { query } from 'express-validator';
import RecentActivity, { RecentActivityAction } from '../models/recent-activity';
import CourseGroup from '../models/course-group';
import { authMiddleware } from '../middleware/auth-middleware';
import { validateRequest } from '../middleware/validate-request';
import { AppError } from '../utils/app-error';
import { asyncHandler } from '../utils/async-handler';
import { getCurrentAcademicPeriod } from '../utils/academic-period';

const router = Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);

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
		}).select('courseUnit').populate('courseUnit', '_id');
		
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
		
		const skip = (Number(page) - 1) * Number(limit);
		
		// Get activities with proper population
		const activities = await RecentActivity.find(query)
			.populate('course', 'code slug')
			.populate('activity', '_id title dueAt')
			.populate('targetUser', 'firstName lastName avatar')
			.sort({ date: -1 })
			.skip(skip)
			.limit(Number(limit))
			.lean();
		
		// Post-process to handle actor population
		const populatedActivities = await Promise.all(
			activities.map(async (activity) => {
				if (activity.actor.kind === 'user') {
					const User = require('../models/user').default;
					const user = await User.findById(activity.actor.data)
						.select('firstName lastName avatar');
					
					if (user) {
						(activity.actor as any).data = {
							_id: user._id,
							fullName: user.getFullName(),
							imageUrl: user.getAvatarUrl()
						};
					}
				}
				return activity;
			})
		);
		
		const total = await RecentActivity.countDocuments(query);
		
		res.json({
			success: true,
			data: {
				activities: populatedActivities,
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
		
		// Verify user has access to this course
		const { year, semester } = getCurrentAcademicPeriod();
		
		const userGroup = await CourseGroup.findOne({
			courseUnit: courseId,
			'users.user': userId,
			'users.year': year,
			'users.semester': semester
		});
		
		if (!userGroup) {
			throw new AppError('Access denied to this course', 403);
		}
		
		const skip = (Number(page) - 1) * Number(limit);
		
		// Get activities for this specific course
		const activities = await RecentActivity.find({ course: courseId })
			.populate('course', 'code slug')
			.populate('activity', '_id title dueAt')
			.populate('targetUser', 'firstName lastName avatar')
			.sort({ date: -1 })
			.skip(skip)
			.limit(Number(limit))
			.lean();
		
		// Post-process to handle actor population
		const populatedActivities = await Promise.all(
			activities.map(async (activity) => {
				if (activity.actor.kind === 'user') {
					const User = require('../models/user').default;
					const user = await User.findById(activity.actor.data)
						.select('firstName lastName avatar');
					
					if (user) {
						(activity.actor as any).data = {
							_id: user._id,
							fullName: user.getFullName(),
							imageUrl: user.getAvatarUrl()
						};
					}
				}
				return activity;
			})
		);
		
		const total = await RecentActivity.countDocuments({ course: courseId });
		
		res.json({
			success: true,
			data: {
				activities: populatedActivities,
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
import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth-middleware';
import { teacherMiddleware } from '../middleware/roles-middleware';
import { AppError } from '../utils/app-error';
import { asyncHandler } from '../utils/async-handler';
import CourseUnit from '../models/course-unit';
import { CourseActivityModel, FileDepositoryActivity } from '../models/course-activity';
import CourseGroup from '../models/course-group';
import DepositedFiles from '../models/deposited-files';

const router = Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);

/**
 * GET /api/dashboard/teacher-deposits
 * Get teacher dashboard data with deposit details
 * Requires teacher role
 */
router.get('/teacher-deposits', teacherMiddleware, asyncHandler(async (req: Request, res: Response) => {
	try {
		const userId = req.user!.userId;

		// Find all course units where the user is a teacher
		const teacherGroups = await CourseGroup.find({
			'users.user': userId,
			'users.role': 'teacher'
		}).populate('courseUnit');

		if (!teacherGroups.length) {
			return res.status(200).json({
				success: true,
				message: 'No courses found for teacher',
				data: { activities: [] }
			});
		}

		const courseUnitIds = teacherGroups.map(group => group.courseUnit);

		// Find all file-depository activities in teacher's courses
		const fileDepositoryActivities = await CourseActivityModel.find({
			courseUnit: { $in: courseUnitIds },
			activityType: 'file-depository'
		}).populate('courseUnit', 'code slug');

		if (!fileDepositoryActivities.length) {
			return res.status(200).json({
				success: true,
				message: 'No file-depository activities found',
				data: { activities: [] }
			});
		}

		// Process each activity to get deposit statistics
		const activities = await Promise.all(fileDepositoryActivities.map(async (activity) => {
			const courseUnit = activity.courseUnit as any;
			const activityId = activity._id;
			const activityData = activity as any; // Use any to access discriminated union properties

			// Get all students in groups for this course unit
			const courseGroups = await CourseGroup.find({
				courseUnit: courseUnit._id
			});

			const allStudents = new Set();
			courseGroups.forEach(group => {
				group.users.forEach(user => {
					if (user.role === 'student') {
						allStudents.add(user.user.toString());
					}
				});
			});

			const totalStudents = allStudents.size;

			// Get all deposits for this activity
			const deposits = await DepositedFiles.find({
				activity: activityId
			});

			const uniqueSubmitters = new Set(deposits.map(deposit => deposit.user.toString())).size;
			const missingStudentDeposits = Math.max(0, totalStudents - uniqueSubmitters);

			// Calculate feedback rate (deposits with evaluation)
			const depositsWithFeedback = deposits.filter(deposit => 
				deposit.evaluation && 
				(deposit.evaluation.grade !== undefined || deposit.evaluation.comment)
			).length;

			const feedbackRate = deposits.length > 0 
				? Math.round((depositsWithFeedback / deposits.length) * 100) 
				: 0;

			return {
				name: `${courseUnit.code} — ${activityData.title}`,
				url: `/courses/${courseUnit.slug}/activity/${activityId}`,
				missingStudentDeposits,
				feedbackRate,
				dueAt: activityData.dueAt || null
			};
		}));

		res.status(200).json({
			success: true,
			message: 'Teacher dashboard data retrieved successfully',
			data: { activities }
		});

	} catch (error) {
		console.error('Error fetching teacher dashboard data:', error);
		throw new AppError('Failed to fetch teacher dashboard data', 500);
	}
}));

/**
 * GET /api/dashboard/stats
 * Get general dashboard statistics
 */
router.get('/stats', asyncHandler(async (req: Request, res: Response) => {
	try {
		const userId = req.user!.userId;
		const userRole = req.user!.roles[0]; // Assuming first role is primary

		if (userRole === 'teacher' || req.user!.roles.includes('admin')) {
			// Teacher/Admin stats
			const teacherGroups = await CourseGroup.find({
				'users.user': userId,
				'users.role': 'teacher'
			});

			const courseUnitIds = teacherGroups.map(group => group.courseUnit);
			const totalCourses = courseUnitIds.length;

			const totalActivities = await CourseActivityModel.countDocuments({
				courseUnit: { $in: courseUnitIds }
			});

			const fileDepositoryActivities = await CourseActivityModel.find({
				courseUnit: { $in: courseUnitIds },
				activityType: 'file-depository'
			});

			let totalPendingFeedback = 0;
			let totalMissingDeposits = 0;

			for (const activity of fileDepositoryActivities) {
				const deposits = await DepositedFiles.find({ activity: activity._id });
				const depositsWithoutFeedback = deposits.filter(deposit => 
					!deposit.evaluation || 
					(deposit.evaluation.grade === undefined && !deposit.evaluation.comment)
				).length;
				
				totalPendingFeedback += depositsWithoutFeedback;

				// Calculate missing deposits for this activity
				const courseGroups = await CourseGroup.find({
					courseUnit: activity.courseUnit
				});

				const allStudents = new Set();
				courseGroups.forEach(group => {
					group.users.forEach(user => {
						if (user.role === 'student') {
							allStudents.add(user.user.toString());
						}
					});
				});

				const uniqueSubmitters = new Set(deposits.map(deposit => deposit.user.toString())).size;
				totalMissingDeposits += Math.max(0, allStudents.size - uniqueSubmitters);
			}

			res.status(200).json({
				success: true,
				data: {
					totalCourses,
					totalActivities,
					pendingFeedback: totalPendingFeedback,
					missingDeposits: totalMissingDeposits,
					role: 'teacher'
				}
			});

		} else {
			// Student stats
			const studentGroups = await CourseGroup.find({
				'users.user': userId,
				'users.role': 'student'
			});

			const courseUnitIds = studentGroups.map(group => group.courseUnit);
			const totalCourses = courseUnitIds.length;

			const totalActivities = await CourseActivityModel.countDocuments({
				courseUnit: { $in: courseUnitIds },
				activityType: 'file-depository'
			});

			const userDeposits = await DepositedFiles.find({
				user: userId
			});

			const completedActivities = userDeposits.length;
			const pendingActivities = Math.max(0, totalActivities - completedActivities);

			// Calculate overdue activities
			const now = new Date();
			const overdueActivities = await CourseActivityModel.countDocuments({
				courseUnit: { $in: courseUnitIds },
				activityType: 'file-depository',
				dueAt: { $lt: now },
				_id: { $nin: userDeposits.map(d => d.activity) }
			});

			res.status(200).json({
				success: true,
				data: {
					totalCourses,
					totalActivities,
					completedActivities,
					pendingActivities,
					overdueActivities,
					role: 'student'
				}
			});
		}

	} catch (error) {
		console.error('Error fetching dashboard stats:', error);
		throw new AppError('Failed to fetch dashboard statistics', 500);
	}
}));

export default router;
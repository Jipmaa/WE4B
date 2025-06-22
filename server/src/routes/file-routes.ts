import { Router, Request, Response } from 'express';
import { param } from 'express-validator';
import { authMiddleware } from '../middleware/auth-middleware';
import { validateRequest } from '../middleware/validate-request';
import { AppError } from '../utils/app-error';
import { asyncHandler } from '../utils/async-handler';
import { minioClient, getFileInfo } from '../services/minio-service';
import User from '../models/user';
import CourseUnit from '../models/course-unit';
import CourseActivity from '../models/course-activity';
import CourseGroup from '../models/course-group';
import DepositedFile from '../models/deposited-files';

const router = Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);

// @route   GET /api/files/avatars/:filename
// @desc    Serve avatar files (accessible to all authenticated users)
// @access  Private
router.get('/avatars/:filename', [
	param('filename')
		.isLength({ min: 1, max: 255 })
		.withMessage('Invalid filename')
], validateRequest, asyncHandler(async (req: Request, res: Response) => {
	const { filename } = req.params;
	const bucket = 'avatars';

	// Check if file exists
	const fileInfo = await getFileInfo(bucket, filename);
	if (!fileInfo) {
		throw new AppError('File not found', 404);
	}

	// Stream file from MinIO
	const stream = await minioClient.getObject(bucket, filename);
	
	// Set appropriate headers with CORS
	res.set({
		'Content-Type': fileInfo.metaData['content-type'] || 'application/octet-stream',
		'Content-Length': fileInfo.size.toString(),
		'Cache-Control': 'public, max-age=86400', // 24 hours cache
		'ETag': fileInfo.etag,
		'Access-Control-Allow-Origin': req.headers.origin || '*',
		'Access-Control-Allow-Credentials': 'true',
		'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-Requested-With'
	});

	stream.pipe(res);
}));

// @route   GET /api/files/course-images/:filename
// @desc    Serve course image files (accessible to all authenticated users)
// @access  Private
router.get('/course-images/:filename', [
	param('filename')
		.isLength({ min: 1, max: 255 })
		.withMessage('Invalid filename')
], validateRequest, asyncHandler(async (req: Request, res: Response) => {
	const { filename } = req.params;
	const bucket = 'course-images';

	// Check if file exists
	const fileInfo = await getFileInfo(bucket, filename);
	if (!fileInfo) {
		throw new AppError('File not found', 404);
	}

	// Stream file from MinIO
	const stream = await minioClient.getObject(bucket, filename);
	
	// Set appropriate headers
	res.set({
		'Content-Type': fileInfo.metaData['content-type'] || 'application/octet-stream',
		'Content-Length': fileInfo.size.toString(),
		'Cache-Control': 'public, max-age=86400', // 24 hours cache
		'ETag': fileInfo.etag
	});

	stream.pipe(res);
}));

// @route   GET /api/files/activity-files/:filename
// @desc    Serve activity files (accessible to course members and admins)
// @access  Private (Course members + Admins)
router.get('/activity-files/:filename', [
	param('filename')
		.isLength({ min: 1, max: 255 })
		.withMessage('Invalid filename')
], validateRequest, asyncHandler(async (req: Request, res: Response) => {
	const { filename } = req.params;
	const bucket = 'activity-files';
	const userId = req.user!.userId;

	// Check if file exists
	const fileInfo = await getFileInfo(bucket, filename);
	if (!fileInfo) {
		throw new AppError('File not found', 404);
	}

	// Get user to check if admin
	const user = await User.findById(userId);
	if (!user) {
		throw new AppError('User not found', 404);
	}

	// Admins can access all activity files
	if (user.isAdmin()) {
		const stream = await minioClient.getObject(bucket, filename);
		
		res.set({
			'Content-Type': fileInfo.metaData['content-type'] || 'application/octet-stream',
			'Content-Length': fileInfo.size.toString(),
			'Cache-Control': 'private, max-age=3600', // 1 hour cache
			'ETag': fileInfo.etag
		});

		return stream.pipe(res);
	}

	// Find the activity that contains this file
	const activity = await CourseActivity.findOne({ 
		$or: [
			{ 'files.filename': filename },
			{ 'files.originalName': filename }
		]
	}).populate('courseUnit');

	if (!activity) {
		throw new AppError('Activity not found for this file', 404);
	}

	// Check if user is member of any group in the course unit
	const courseUnit = activity.courseUnit as any;
	const userGroups = await CourseGroup.find({
		courseUnit: courseUnit._id,
		members: userId
	});

	if (userGroups.length === 0 && !user.isTeacher()) {
		throw new AppError('Access denied. You are not a member of this course.', 403);
	}

	// If user is a teacher, check if they have access to the course
	if (user.isTeacher() && userGroups.length === 0) {
		// Teachers can access files from courses they are assigned to
		const teacherGroups = await CourseGroup.find({
			courseUnit: courseUnit._id,
			teachers: userId
		});

		if (teacherGroups.length === 0) {
			throw new AppError('Access denied. You do not have teacher access to this course.', 403);
		}
	}

	// Stream file from MinIO
	const stream = await minioClient.getObject(bucket, filename);
	
	res.set({
		'Content-Type': fileInfo.metaData['content-type'] || 'application/octet-stream',
		'Content-Length': fileInfo.size.toString(),
		'Cache-Control': 'private, max-age=3600', // 1 hour cache
		'ETag': fileInfo.etag
	});

	stream.pipe(res);
}));

// @route   GET /api/files/deposited-files/:filename
// @desc    Serve deposited files (accessible to file owner, course teachers, and admins)
// @access  Private (File owner + Course teachers + Admins)
router.get('/deposited-files/:filename', [
	param('filename')
		.isLength({ min: 1, max: 255 })
		.withMessage('Invalid filename')
], validateRequest, asyncHandler(async (req: Request, res: Response) => {
	const { filename } = req.params;
	const bucket = 'deposited-files';
	const userId = req.user!.userId;

	// Check if file exists
	const fileInfo = await getFileInfo(bucket, filename);
	if (!fileInfo) {
		throw new AppError('File not found', 404);
	}

	// Get user to check roles
	const user = await User.findById(userId);
	if (!user) {
		throw new AppError('User not found', 404);
	}

	// Admins can access all deposited files
	if (user.isAdmin()) {
		const stream = await minioClient.getObject(bucket, filename);
		
		res.set({
			'Content-Type': fileInfo.metaData['content-type'] || 'application/octet-stream',
			'Content-Length': fileInfo.size.toString(),
			'Cache-Control': 'private, max-age=3600', // 1 hour cache
			'ETag': fileInfo.etag
		});

		return stream.pipe(res);
	}

	// Find the deposited file record
	const depositedFile = await DepositedFile.findOne({ 
		filename: filename 
	}).populate('courseActivity');

	if (!depositedFile) {
		throw new AppError('File record not found', 404);
	}

	// Check if user is the file owner
	if (depositedFile.uploadedBy.toString() === userId) {
		const stream = await minioClient.getObject(bucket, filename);
		
		res.set({
			'Content-Type': fileInfo.metaData['content-type'] || 'application/octet-stream',
			'Content-Length': fileInfo.size.toString(),
			'Cache-Control': 'private, max-age=3600', // 1 hour cache
			'ETag': fileInfo.etag
		});

		return stream.pipe(res);
	}

	// If user is not the owner, check if they are a teacher in the course
	if (!user.isTeacher()) {
		throw new AppError('Access denied. You can only access your own files.', 403);
	}

	// Get the course activity and course unit
	const courseActivity = depositedFile.courseActivity as any;
	const courseUnit = await CourseUnit.findById(courseActivity.courseUnit);

	if (!courseUnit) {
		throw new AppError('Course not found', 404);
	}

	// Check if teacher has access to this course
	const teacherGroups = await CourseGroup.find({
		courseUnit: courseUnit._id,
		teachers: userId
	});

	if (teacherGroups.length === 0) {
		throw new AppError('Access denied. You do not have teacher access to this course.', 403);
	}

	// Stream file from MinIO
	const stream = await minioClient.getObject(bucket, filename);
	
	res.set({
		'Content-Type': fileInfo.metaData['content-type'] || 'application/octet-stream',
		'Content-Length': fileInfo.size.toString(),
		'Cache-Control': 'private, max-age=3600', // 1 hour cache
		'ETag': fileInfo.etag
	});

	stream.pipe(res);
}));

// @route   GET /api/files/general/:filename
// @desc    Serve general files (accessible to file owner and admins)
// @access  Private (File owner + Admins)
router.get('/general/:filename', [
	param('filename')
		.isLength({ min: 1, max: 255 })
		.withMessage('Invalid filename')
], validateRequest, asyncHandler(async (req: Request, res: Response) => {
	const { filename } = req.params;
	const bucket = 'general';
	const userId = req.user!.userId;

	// Check if file exists
	const fileInfo = await getFileInfo(bucket, filename);
	if (!fileInfo) {
		throw new AppError('File not found', 404);
	}

	// Get user to check if admin
	const user = await User.findById(userId);
	if (!user) {
		throw new AppError('User not found', 404);
	}

	// Admins can access all general files
	if (user.isAdmin()) {
		const stream = await minioClient.getObject(bucket, filename);
		
		res.set({
			'Content-Type': fileInfo.metaData['content-type'] || 'application/octet-stream',
			'Content-Length': fileInfo.size.toString(),
			'Cache-Control': 'private, max-age=3600', // 1 hour cache
			'ETag': fileInfo.etag
		});

		return stream.pipe(res);
	}

	// Check file metadata for user ownership
	const userIdFromMeta = fileInfo.metaData['x-amz-meta-user-id'];
	if (!userIdFromMeta || userIdFromMeta !== userId) {
		throw new AppError('Access denied. You can only access your own files.', 403);
	}

	// Stream file from MinIO
	const stream = await minioClient.getObject(bucket, filename);
	
	res.set({
		'Content-Type': fileInfo.metaData['content-type'] || 'application/octet-stream',
		'Content-Length': fileInfo.size.toString(),
		'Cache-Control': 'private, max-age=3600', // 1 hour cache
		'ETag': fileInfo.etag
	});

	stream.pipe(res);
}));

export default router;
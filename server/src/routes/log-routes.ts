import { Router, Request, Response } from 'express';
import { query } from 'express-validator';
import { validateRequest } from '../middleware/validate-request';
import { asyncHandler } from '../utils/async-handler';
import Log from '../models/log';
import LoginHistory from '../models/login-history';

const router = Router();

// Admin middleware temporarily removed for testing
// router.use(adminMiddleware);

// Validation rules for pagination
const paginationValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
];

// @route   GET /api/logs/activity
// @desc    Get all activity logs with pagination and filters
// @access  Private (Admin only)
router.get('/activity', paginationValidation, validateRequest, asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const skip = (page - 1) * limit;

  const [logs, totalLogs] = await Promise.all([
    Log.find()
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .select('-__v'),
    Log.countDocuments()
  ]);

  const totalPages = Math.ceil(totalLogs / limit);

  res.json({
    success: true,
    data: {
      logs,
      pagination: {
        currentPage: page,
        totalPages,
        totalLogs,
        limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    }
  });
}));

// @route   GET /api/logs/login-history
// @desc    Get all login history logs with pagination and filters
// @access  Private (Admin only)
router.get('/login-history', paginationValidation, validateRequest, asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const skip = (page - 1) * limit;

  const [loginHistory, totalLoginHistory] = await Promise.all([
    LoginHistory.find()
      .populate('userId', 'firstName lastName email') // Populate user details
      .sort({ loginTime: -1 })
      .skip(skip)
      .limit(limit)
      .select('-__v'),
    LoginHistory.countDocuments()
  ]);

  const totalPages = Math.ceil(totalLoginHistory / limit);

  res.json({
    success: true,
    data: {
      loginHistory,
      pagination: {
        currentPage: page,
        totalPages,
        totalLoginHistory,
        limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    }
  });
}));

export default router;

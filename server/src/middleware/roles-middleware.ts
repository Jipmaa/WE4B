import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/app-error';

export const adminMiddleware = (req: Request, res: Response, next: NextFunction): void => {
	// Check if user is authenticated (should be set by authMiddleware)
	if (!req.user) {
		throw new AppError('Access denied. Authentication required.', 401);
	}

	// Check if user has admin role
	if (!req.user.roles.includes('admin')) {
		throw new AppError('Access denied. Admin privileges required.', 403);
	}

	next();
};

// Middleware for admin or teacher access
export const teacherMiddleware = (req: Request, res: Response, next: NextFunction): void => {
	// Check if user is authenticated
	if (!req.user) {
		throw new AppError('Access denied. Authentication required.', 401);
	}

	// Check if user has admin or teacher role
	if (!req.user.roles.includes('admin') && !req.user.roles.includes('teacher')) {
		throw new AppError('Access denied. Teacher or admin privileges required.', 403);
	}

	next();
};
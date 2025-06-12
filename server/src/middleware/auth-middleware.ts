import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/user';
import { AppError } from '../utils/app-error';
import { asyncHandler } from '../utils/async-handler';

// Extend Request interface to include user
declare global {
	namespace Express {
		interface Request {
			user?: {
				userId: string;
				roles: Array<'student' | 'teacher' | 'admin'>;
				email: string;
			};
		}
	}
}

interface JwtPayload {
	userId: string;
	iat: number;
	exp: number;
}

export const authMiddleware = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
	let token: string | undefined;

	// Get token from header
	if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
		token = req.headers.authorization.split(' ')[1];
	}

	// Check if token exists
	if (!token) {
		throw new AppError('Access denied. No token provided.', 401);
	}

	try {
		// Verify token
		const secret = process.env.JWT_SECRET;
		if (!secret) {
			throw new Error('JWT_SECRET is not defined in environment variables');
		}

		const decoded = jwt.verify(token, secret) as JwtPayload;

		// Check if user still exists
		const user = await User.findById(decoded.userId);
		if (!user) {
			throw new AppError('The user belonging to this token no longer exists.', 401);
		}

		// Check if user is active
		if (!user.isActive) {
			throw new AppError('Your account has been deactivated. Please contact support.', 401);
		}

		// Grant access to protected route
		req.user = {
			userId: user._id.toString(),
			roles: user.roles,
			email: user.email
		};

		next();
	} catch (error) {
		if (error instanceof jwt.JsonWebTokenError) {
			throw new AppError('Invalid token. Please log in again.', 401);
		}
		if (error instanceof jwt.TokenExpiredError) {
			throw new AppError('Your token has expired. Please log in again.', 401);
		}
		throw error;
	}
});
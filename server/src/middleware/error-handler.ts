import {Request, Response, NextFunction, Application} from 'express';
import mongoose from 'mongoose';
import { AppError } from '../utils/app-error';

interface ErrorResponse {
	success: false;
	error: {
		message: string;
		status: number;
		stack?: string;
		details?: any;
	};
}

// Handle Mongoose CastError
const handleCastErrorDB = (err: mongoose.Error.CastError): AppError => {
	const message = `Invalid ${err.path}: ${err.value}`;
	return new AppError(message, 400);
};

// Handle Mongoose Duplicate Field Error
const handleDuplicateFieldsDB = (err: any): AppError => {
	const field = Object.keys(err.keyValue)[0];
	const value = err.keyValue[field];
	const message = `${field.charAt(0).toUpperCase() + field.slice(1)} '${value}' already exists`;
	return new AppError(message, 400);
};

// Handle Mongoose Validation Error
const handleValidationErrorDB = (err: mongoose.Error.ValidationError): AppError => {
	const errors = Object.values(err.errors).map((el: any) => el.message);
	const message = `Invalid input data: ${errors.join('. ')}`;
	return new AppError(message, 400);
};

// Handle JWT Error
const handleJWTError = (): AppError => {
	return new AppError('Invalid token. Please log in again!', 401);
};

// Handle JWT Expired Error
const handleJWTExpiredError = (): AppError => {
	return new AppError('Your token has expired! Please log in again.', 401);
};

// Send error in development
const sendErrorDev = (err: AppError, res: Response): void => {
	const errorResponse: ErrorResponse = {
		success: false,
		error: {
			status: err.statusCode,
			message: err.message,
			stack: err.stack,
			details: err
		}
	};

	res.status(err.statusCode).json(errorResponse);
};

// Send error in production
const sendErrorProd = (err: AppError, res: Response): void => {
	// Operational errors: send message to client
	if (err.isOperational) {
		const errorResponse: ErrorResponse = {
			success: false,
			error: {
				status: err.statusCode,
				message: err.message
			}
		};

		res.status(err.statusCode).json(errorResponse);
	} else {
		// Programming or other unknown errors: don't leak error details
		console.error('ERROR 💥', err);

		const errorResponse: ErrorResponse = {
			success: false,
			error: {
				status: 500,
				message: 'Something went wrong!'
			}
		};

		res.status(500).json(errorResponse);
	}
};

// Global error handling middleware
const _errorHandler = (
	 err: any,
	 req: Request,
	 res: Response,
	 next: NextFunction
): void => {
	// Set default values
	err.statusCode = err.statusCode || 500;
	err.status = err.status || 'error';

	if (process.env.NODE_ENV === 'development') {
		sendErrorDev(err, res);
	} else {
		let error = { ...err };
		error.message = err.message;

		// Handle specific mongoose errors
		if (err.name === 'CastError') {
			error = handleCastErrorDB(err);
		}

		if (err.code === 11000) {
			error = handleDuplicateFieldsDB(err);
		}

		if (err.name === 'ValidationError') {
			error = handleValidationErrorDB(err);
		}

		if (err.name === 'JsonWebTokenError') {
			error = handleJWTError();
		}

		if (err.name === 'TokenExpiredError') {
			error = handleJWTExpiredError();
		}

		sendErrorProd(error, res);
	}
};

// Wraps the error handler with CORS headers tests and logging
export const errorHandler = (
	 app: Application,
	 req: Request,
	 res: Response,
	 next: NextFunction
) => {
	app.use((error: any, req: Request, res: Response, next: NextFunction) => {
		// Ensure CORS headers are set even for errors
		const origin = req.get('Origin');
		const allowedOrigins = ['http://localhost:4200', 'http://localhost:3000', 'http://127.0.0.1:4200', 'http://127.0.0.1:3000'];

		if (origin && allowedOrigins.includes(origin)) {
			res.header('Access-Control-Allow-Origin', origin);
			res.header('Access-Control-Allow-Credentials', 'true');
		}

		console.log(`🚫 Error occurred: ${error.message}`, error.stack);
		_errorHandler(error, req, res, next);
	});
}
import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/app-error';

export const notFound = (req: Request, res: Response, next: NextFunction): void => {
	const error = new AppError(`Route ${req.originalUrl} not found`, 404);
	next(error);
};
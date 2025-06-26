import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationError } from 'express-validator';
import { AppError } from '../utils/app-error';

export const validateRequest = (req: Request, res: Response, next: NextFunction): void => {
	const errors = validationResult(req);

	if (!errors.isEmpty()) {
		const errorMessages = errors.array().map((error: ValidationError) => {
			if (error.type === 'field') {
				return `${error.path}: ${error.msg}`;
			}
			return error.msg;
		});

		throw new AppError(`Validation failed: ${errorMessages.join(', ')}`, 400);
	}

	next();
};
import { Router, Request, Response } from 'express';
import { body } from 'express-validator';
import jwt from 'jsonwebtoken';
import User from '../models/user';
import BlacklistedToken from '../models/blacklisted-token';
import LoginHistory from '../models/login-history';
import { validateRequest } from '../middleware/validate-request';
import { authMiddleware } from '../middleware/auth-middleware';
import { AppError } from '../utils/app-error';
import { asyncHandler } from '../utils/async-handler';
import {FILE_CONFIGS, getPublicUrl} from "../services/minio-service";

const router = Router();

// Generate JWT token
const generateToken = (userId: string): string => {
	const secret = process.env.JWT_SECRET;
	if (!secret) {
		throw new Error('JWT_SECRET is not defined in environment variables');
	}

	return jwt.sign(
		 { userId },
		 secret,
		 { expiresIn: process.env.JWT_EXPIRES_IN as any || '7d' }
	);
};

// Registration validation rules
const registerValidation = [
	body('email')
		 .isEmail()
		 .normalizeEmail()
		 .withMessage('Please provide a valid email'),
	body('password')
		 .isLength({ min: 6 })
		 .withMessage('Password must be at least 6 characters long'),
	body('birthdate')
		 .isISO8601()
		 .toDate()
		 .withMessage('Please provide a valid birthdate'),
	body('firstName')
		 .isLength({ max: 50 })
		 .withMessage('First name must be less than 50 characters')
		 .trim(),
	body('lastName')
		 .isLength({ max: 50 })
		 .withMessage('Last name must be less than 50 characters')
		 .trim(),
	body('department')
		 .optional()
		 .isLength({ max: 100 })
		 .withMessage('Department must be less than 100 characters')
		 .trim(),
	body('phone')
		 .optional()
		 .custom((value) => {
			 if (!value) return true; // Allow empty since it's optional
			 // Remove common formatting characters before validation
			 const cleanPhone = value.replace(/[\s\-.()]/g, '');
			 // Match the User model regex pattern: /^\+?\d{7,14}$/
			 return /^\+?\d{7,14}$/.test(cleanPhone);
		 })
		 .withMessage('Please provide a valid phone number (7-14 digits, optional +)'),
	body('roles')
		 .optional()
		 .isArray()
		 .withMessage('Roles must be an array')
		 .custom((roles) => {
			 const validRoles = ['student', 'teacher', 'admin'];
			 return roles.every((role: string) => validRoles.includes(role));
		 })
		 .withMessage('Roles must contain valid values: student, teacher, admin')
];

// Login validation rules
const loginValidation = [
	body('email')
		 .isEmail()
		 .normalizeEmail()
		 .withMessage('Please provide a valid email'),
	body('password')
		 .notEmpty()
		 .withMessage('Password is required')
];

// Change password validation rules
const changePasswordValidation = [
	body('currentPassword')
		 .notEmpty()
		 .withMessage('Current password is required'),
	body('newPassword')
		 .isLength({ min: 6 })
		 .withMessage('New password must be at least 6 characters long')
];

// @route   POST /api/accounts/register
// @desc    Register a new user
// @access  Public
router.post('/register', registerValidation, validateRequest, asyncHandler(async (req: Request, res: Response) => {
	const { email, password, birthdate, firstName, lastName, department, roles, phone } = req.body;

	// Check if user already exists
	const existingUser = await User.findOne({ email });

	if (existingUser) {
		throw new AppError('Email is already registered', 400);
	}

	// Create new user
	const user = new User({
		email,
		password,
		birthdate,
		firstName,
		lastName,
		department,
		phone,
		roles: roles || ['student'] // Default to student role if not provided
	});

	await user.save();

	// Generate token
	const token = generateToken(user._id.toString());

	// Update last login
	user.lastLogin = new Date();
	await user.save();

	res.status(201).json({
		success: true,
		message: 'User registered successfully',
		data: {
			user: {
				id: user._id,
				email: user.email,
				firstName: user.firstName,
				lastName: user.lastName,
				fullName: user.getFullName(),
				roles: user.roles,
				department: user.department,
				birthdate: user.birthdate,
				phone: user.phone,
				isActive: user.isActive,
				isEmailVerified: user.isEmailVerified,
				isPhoneVerified: user.isPhoneVerified,
				createdAt: user.createdAt
			},
			token
		}
	});
}));

// @route   POST /api/accounts/login
// @desc    Login user
// @access  Public
router.post('/login', loginValidation, validateRequest, asyncHandler(async (req: Request, res: Response) => {
	const { email, password } = req.body;
	const ipAddress = req.ip;
	const userAgent = req.headers['user-agent'];

	let loginSuccess = false;
	let user = null;

	try {
		// Find user by email (include password for comparison)
		user = await User.findOne({ email: email.toLowerCase() }).select('+password');

		if (!user) {
			console.debug(`❌ User not found for email: ${email}`);
			throw new AppError('Invalid credentials', 401);
		}

		// Check if user is active
		if (!user.isActive) {
			console.debug(`❌ User account is deactivated: ${email}`);
			throw new AppError('Account is deactivated. Please contact support.', 401);
		}

		// Compare password
		const isPasswordValid = await user.comparePassword(password);
		if (!isPasswordValid) {
			console.debug(`❌ Invalid password for user: ${email}`);
			throw new AppError('Invalid credentials', 401);
		}

		// Generate token
		const token = generateToken(user._id.toString());

		// Update last login
		user.lastLogin = new Date();
		await user.save();

		loginSuccess = true;

		res.json({
			success: true,
			message: 'Login successful',
			data: {
				user: {
					id: user._id,
					email: user.email,
					avatar: user.avatar ? getPublicUrl(FILE_CONFIGS.avatar.bucket, user.avatar) : undefined,
					firstName: user.firstName,
					lastName: user.lastName,
					fullName: user.getFullName(),
					roles: user.roles,
					department: user.department,
					birthdate: user.birthdate,
					phone: user.phone,
					isActive: user.isActive,
					isEmailVerified: user.isEmailVerified,
					isPhoneVerified: user.isPhoneVerified,
					lastLogin: user.lastLogin
				},
				token
			}
		});
	} finally {
		// Record login attempt
		const loginHistoryEntry = new LoginHistory({
			userId: user ? user._id : null, // Use null if user not found
			loginTime: new Date(),
			ipAddress,
			userAgent,
			success: loginSuccess,
		});
		await loginHistoryEntry.save();
	}
}));

// @route   GET /api/accounts/me
// @desc    Get current user profile
// @access  Private
router.get('/me', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
	const user = await User.findById(req.user?.userId);

	if (!user) {
		throw new AppError('User not found', 404);
	}

	res.json({
		success: true,
		data: {
			user: {
				id: user._id,
				email: user.email,
				avatar: user.avatar ? getPublicUrl(FILE_CONFIGS.avatar.bucket, user.avatar) : undefined,
				firstName: user.firstName,
				lastName: user.lastName,
				fullName: user.getFullName(),
				roles: user.roles,
				department: user.department,
				birthdate: user.birthdate,
				phone: user.phone,
				isActive: user.isActive,
				isEmailVerified: user.isEmailVerified,
				isPhoneVerified: user.isPhoneVerified,
				lastLogin: user.lastLogin,
				createdAt: user.createdAt,
				updatedAt: user.updatedAt
			}
		}
	});
}));

// @route   PUT /api/accounts/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', authMiddleware, [
	body('firstName')
		 .optional()
		 .isLength({ max: 50 })
		 .withMessage('First name must be less than 50 characters')
		 .trim(),
	body('lastName')
		 .optional()
		 .isLength({ max: 50 })
		 .withMessage('Last name must be less than 50 characters')
		 .trim(),
	body('avatar')
		 .optional()
		 .isURL()
		 .withMessage('Avatar must be a valid URL'),
	body('department')
		 .optional()
		 .isLength({ max: 100 })
		 .withMessage('Department must be less than 100 characters')
		 .trim(),
	body('phone')
		 .optional()
		 .custom((value) => {
			 if (!value) return true; // Allow empty since it's optional
			 // Remove common formatting characters before validation
			 const cleanPhone = value.replace(/[\s\-.()]/g, '');
			 // Match the User model regex pattern: /^\+?\d{7,14}$/
			 return /^\+?\d{7,14}$/.test(cleanPhone);
		 })
		 .withMessage('Please provide a valid phone number (7-14 digits, optional +)'),
	body('birthdate')
		 .optional()
		 .isISO8601()
		 .toDate()
		 .withMessage('Please provide a valid birthdate')
], validateRequest, asyncHandler(async (req: Request, res: Response) => {
	const { firstName, lastName, avatar, department, birthdate, phone } = req.body;

	const user = await User.findById(req.user?.userId);
	if (!user) {
		throw new AppError('User not found', 404);
	}

	// Update fields if provided
	if (firstName !== undefined) user.firstName = firstName;
	if (lastName !== undefined) user.lastName = lastName;
	if (avatar !== undefined) user.avatar = avatar;
	if (department !== undefined) user.department = department;
	if (birthdate !== undefined) user.birthdate = birthdate;
	if (phone !== undefined) user.phone = phone;

	await user.save();

	res.json({
		success: true,
		message: 'Profile updated successfully',
		data: {
			user: {
				id: user._id,
				email: user.email,
				firstName: user.firstName,
				lastName: user.lastName,
				fullName: user.getFullName(),
				avatar: user.avatar ? getPublicUrl(FILE_CONFIGS.avatar.bucket, user.avatar) : undefined,
				roles: user.roles,
				department: user.department,
				birthdate: user.birthdate,
				phone: user.phone,
				isActive: user.isActive,
				isEmailVerified: user.isEmailVerified,
				isPhoneVerified: user.isPhoneVerified,
				updatedAt: user.updatedAt
			}
		}
	});
}));

// @route   PUT /api/accounts/change-password
// @desc    Change user password
// @access  Private
router.put('/change-password', authMiddleware, changePasswordValidation, validateRequest, asyncHandler(async (req: Request, res: Response) => {
	const { currentPassword, newPassword } = req.body;

	const user = await User.findById(req.user?.userId).select('+password');
	if (!user) {
		throw new AppError('User not found', 404);
	}

	// Verify current password
	const isCurrentPasswordValid = await user.comparePassword(currentPassword);
	if (!isCurrentPasswordValid) {
		throw new AppError('Current password is incorrect', 400);
	}

	// Update password
	user.password = newPassword;
	await user.save();

	res.json({
		success: true,
		message: 'Password changed successfully'
	});
}));

// @route   POST /api/accounts/logout
// @desc    Logout user and blacklist token
// @access  Private
router.post('/logout', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
	// Get token from header
	const authHeader = req.headers.authorization;
	if (!authHeader || !authHeader.startsWith('Bearer ')) {
		throw new AppError('No token provided for logout', 400);
	}

	const token = authHeader.split(' ')[1];
	
	// Decode token to get expiration time
	const secret = process.env.JWT_SECRET;
	if (!secret) {
		throw new Error('JWT_SECRET is not defined in environment variables');
	}

	try {
		const decoded = jwt.verify(token, secret) as any;
		const expiresAt = new Date(decoded.exp * 1000); // Convert from seconds to milliseconds

		// Add token to blacklist
		await BlacklistedToken.blacklistToken(token, req.user!.userId, expiresAt);

		// Update the last login history entry for the user
		await LoginHistory.findOneAndUpdate(
			{ userId: req.user!.userId, logoutTime: { $exists: false } },
			{ $set: { logoutTime: new Date() } },
			{ sort: { loginTime: -1 } } // Find the most recent login
		);

		res.json({
			success: true,
			message: 'Logged out successfully'
		});
	} catch (error) {
		// Even if token verification fails, respond successfully for security
		res.json({
			success: true,
			message: 'Logged out successfully'
		});
	}
}));

// @route   DELETE /api/accounts/delete-account
// @desc    Delete user account
// @access  Private
router.delete('/delete-account', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
	const user = await User.findById(req.user?.userId);
	if (!user) {
		throw new AppError('User not found', 404);
	}

	await User.findByIdAndDelete(user._id);

	res.json({
		success: true,
		message: 'Account deleted successfully'
	});
}));

export default router;
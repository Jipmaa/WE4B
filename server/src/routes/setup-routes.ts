import { Router, Request, Response } from 'express';
import { body } from 'express-validator';
import User from '../models/user';
import { validateRequest } from '../middleware/validate-request';
import { AppError } from '../utils/app-error';
import { asyncHandler } from '../utils/async-handler';

const router = Router();

// HTML template for the setup form
const generateSetupForm = (errors: string[] = [], successMessage: string = '', formData: any = {}) => {
	return `
<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Setup User - Mooodle WE4B</title>
	<style>
		* {
			margin: 0;
			padding: 0;
			box-sizing: border-box;
		}

		body {
			font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
			background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
			min-height: 100vh;
			display: flex;
			align-items: center;
			justify-content: center;
			padding: 20px;
		}

		.container {
			background: white;
			border-radius: 16px;
			box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
			padding: 40px;
			width: 100%;
			max-width: 600px;
		}

		.header {
			text-align: center;
			margin-bottom: 30px;
		}

		.header h1 {
			color: #333;
			font-size: 2.5rem;
			margin-bottom: 10px;
		}

		.header p {
			color: #666;
			font-size: 1.1rem;
		}

		.form-group {
			margin-bottom: 20px;
		}

		.form-row {
			display: flex;
			gap: 15px;
		}

		.form-row .form-group {
			flex: 1;
		}

		label {
			display: block;
			margin-bottom: 8px;
			font-weight: 600;
			color: #333;
		}

		input[type="text"],
		input[type="email"],
		input[type="password"],
		input[type="date"],
		select {
			width: 100%;
			padding: 12px;
			border: 2px solid #e1e1e1;
			border-radius: 8px;
			font-size: 16px;
			transition: border-color 0.3s ease;
		}

		input:focus,
		select:focus {
			outline: none;
			border-color: #667eea;
			box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
		}

		.roles-group {
			margin-bottom: 20px;
		}

		.roles-grid {
			display: flex;
			gap: 20px;
			margin-top: 10px;
		}

		.role-item {
			display: flex;
			align-items: center;
			gap: 8px;
		}

		.role-item input[type="checkbox"] {
			width: auto;
			margin: 0;
			transform: scale(1.2);
		}

		.role-item label {
			margin: 0;
			font-weight: normal;
			cursor: pointer;
		}

		.submit-btn {
			width: 100%;
			background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
			color: white;
			padding: 15px;
			border: none;
			border-radius: 8px;
			font-size: 18px;
			font-weight: 600;
			cursor: pointer;
			transition: transform 0.2s ease, box-shadow 0.3s ease;
		}

		.submit-btn:hover {
			transform: translateY(-2px);
			box-shadow: 0 10px 25px rgba(102, 126, 234, 0.3);
		}

		.submit-btn:active {
			transform: translateY(0);
		}

		.errors {
			background: #fee;
			border: 1px solid #fcc;
			border-radius: 8px;
			padding: 15px;
			margin-bottom: 20px;
		}

		.errors h3 {
			color: #c33;
			margin-bottom: 10px;
		}

		.errors ul {
			color: #c33;
			margin-left: 20px;
		}

		.errors li {
			margin-bottom: 5px;
		}

		.success {
			background: #efe;
			border: 1px solid #cfc;
			border-radius: 8px;
			padding: 15px;
			margin-bottom: 20px;
			color: #3c3;
			text-align: center;
			font-weight: 600;
		}

		.required {
			color: #e74c3c;
		}

		.helper-text {
			font-size: 14px;
			color: #666;
			margin-top: 5px;
		}

		@media (max-width: 600px) {
			.form-row {
				flex-direction: column;
				gap: 0;
			}

			.roles-grid {
				flex-direction: column;
				gap: 10px;
			}

			.header h1 {
				font-size: 2rem;
			}
		}
	</style>
</head>
<body>
	<div class="container">
		<div class="header">
			<h1>🎓 Setup User</h1>
			<p>Create a new user account for Mooodle WE4B</p>
		</div>

		${errors.length > 0 ? `
		<div class="errors">
			<h3>⚠️ Please fix the following errors:</h3>
			<ul>
				${errors.map(error => `<li>${error}</li>`).join('')}
			</ul>
		</div>
		` : ''}

		${successMessage ? `
		<div class="success">
			✅ ${successMessage}
		</div>
		` : ''}

		<form method="POST" action="">
			<div class="form-row">
				<div class="form-group">
					<label for="firstName">First Name <span class="required">*</span></label>
					<input type="text" id="firstName" name="firstName" value="${formData.firstName || ''}" required>
				</div>
				<div class="form-group">
					<label for="lastName">Last Name <span class="required">*</span></label>
					<input type="text" id="lastName" name="lastName" value="${formData.lastName || ''}" required>
				</div>
			</div>

			<div class="form-group">
				<label for="email">Email Address <span class="required">*</span></label>
				<input type="email" id="email" name="email" value="${formData.email || ''}" required>
				<div class="helper-text">This will be used for login</div>
			</div>

			<div class="form-group">
				<label for="password">Password <span class="required">*</span></label>
				<input type="password" id="password" name="password" required minlength="6">
				<div class="helper-text">Minimum 6 characters</div>
			</div>

			<div class="form-row">
				<div class="form-group">
					<label for="birthdate">Birth Date <span class="required">*</span></label>
					<input type="date" id="birthdate" name="birthdate" value="${formData.birthdate || ''}" required>
				</div>
				<div class="form-group">
					<label for="department">Department</label>
					<input type="text" id="department" name="department" value="${formData.department || ''}" placeholder="e.g., Computer Science">
				</div>
			</div>

			<div class="roles-group">
				<label>Roles <span class="required">*</span></label>
				<div class="roles-grid">
					<div class="role-item">
						<input type="checkbox" id="student" name="roles" value="student" 
							${!formData.roles || formData.roles.includes('student') ? 'checked' : ''}>
						<label for="student">👨‍🎓 Student</label>
					</div>
					<div class="role-item">
						<input type="checkbox" id="teacher" name="roles" value="teacher"
							${formData.roles && formData.roles.includes('teacher') ? 'checked' : ''}>
						<label for="teacher">👨‍🏫 Teacher</label>
					</div>
					<div class="role-item">
						<input type="checkbox" id="admin" name="roles" value="admin"
							${formData.roles && formData.roles.includes('admin') ? 'checked' : ''}>
						<label for="admin">👨‍💼 Admin</label>
					</div>
				</div>
				<div class="helper-text">Select at least one role</div>
			</div>

			<button type="submit" class="submit-btn">
				🚀 Create User Account
			</button>
		</form>
	</div>
</body>
</html>
	`;
};

// Validation rules for user creation
const createUserValidation = [
	body('firstName')
		 .trim()
		 .isLength({ min: 1, max: 50 })
		 .withMessage('First name is required and must be less than 50 characters'),
	body('lastName')
		 .trim()
		 .isLength({ min: 1, max: 50 })
		 .withMessage('Last name is required and must be less than 50 characters'),
	body('email')
		 .isEmail()
		 .normalizeEmail()
		 .withMessage('Please provide a valid email address'),
	body('password')
		 .isLength({ min: 6 })
		 .withMessage('Password must be at least 6 characters long'),
	body('birthdate')
		 .isISO8601()
		 .toDate()
		 .withMessage('Please provide a valid birth date')
		 .custom((value) => {
			 const today = new Date();
			 const birthDate = new Date(value);
			 const age = today.getFullYear() - birthDate.getFullYear();
			 if (age < 13) {
				 throw new Error('User must be at least 13 years old');
			 }
			 if (birthDate > today) {
				 throw new Error('Birth date cannot be in the future');
			 }
			 return true;
		 }),
	body('department')
		 .optional()
		 .trim()
		 .isLength({ max: 100 })
		 .withMessage('Department must be less than 100 characters'),
	body('roles')
		 .custom((value, { req }) => {
			 // Handle both single value and array from form submission
			 let roles = Array.isArray(value) ? value : [value];

			 // Filter out empty values
			 roles = roles.filter(role => role && role.trim());

			 if (roles.length === 0) {
				 throw new Error('At least one role must be selected');
			 }

			 const validRoles = ['student', 'teacher', 'admin'];
			 const invalidRoles = roles.filter(role => !validRoles.includes(role));

			 if (invalidRoles.length > 0) {
				 throw new Error(`Invalid roles: ${invalidRoles.join(', ')}`);
			 }

			 // Update the request body with the processed roles
			 req.body.roles = roles;
			 return true;
		 })
];

// @route   GET /setup/user
// @desc    Display user creation form
// @access  Public (no authentication required)
router.get('/user', (req: Request, res: Response) => {
	const html = generateSetupForm();
	res.send(html);
});

// @route   POST /setup/user
// @desc    Create a new user from form submission
// @access  Public (no authentication required)
router.post('/user', createUserValidation, asyncHandler(async (req: Request, res: Response) => {
	// Custom validation handling for HTML form
	const errors = validationResult(req);

	if (!errors.isEmpty()) {
		const errorMessages = errors.array().map((error: any) => {
			if (error.type === 'field') {
				return `${error.path}: ${error.msg}`;
			}
			return error.msg;
		});

		const html = generateSetupForm(errorMessages, '', req.body);
		return res.status(400).send(html);
	}

	try {
		const { firstName, lastName, email, password, birthdate, department, roles } = req.body;

		// Check if user already exists
		const existingUser = await User.findOne({ email: email.toLowerCase() });
		if (existingUser) {
			const html = generateSetupForm(['Email address is already registered'], '', req.body);
			return res.status(400).send(html);
		}

		// Create new user
		const newUser = new User({
			firstName,
			lastName,
			email: email.toLowerCase(),
			password,
			birthdate: new Date(birthdate),
			department: department || undefined,
			roles,
			isActive: true,
			isEmailVerified: true // Auto-verify for setup users
		});

		await newUser.save();

		// Generate success message
		const successMessage = `User account created successfully! 
			Email: ${newUser.email} | 
			Name: ${newUser.getFullName()} | 
			Roles: ${newUser.roles.join(', ')}`;

		// Clear form and show success
		const html = generateSetupForm([], successMessage);
		res.send(html);

	} catch (error: any) {
		// Handle mongoose validation errors
		if (error.name === 'ValidationError') {
			const mongooseErrors = Object.values(error.errors).map((err: any) => err.message);
			const html = generateSetupForm(mongooseErrors, '', req.body);
			return res.status(400).send(html);
		}

		// Handle duplicate key error
		if (error.code === 11000) {
			const field = Object.keys(error.keyValue)[0];
			const html = generateSetupForm([`${field} already exists`], '', req.body);
			return res.status(400).send(html);
		}

		// Handle other errors
		console.error('Setup user creation error:', error);
		const html = generateSetupForm(['An unexpected error occurred. Please try again.'], '', req.body);
		res.status(500).send(html);
	}
}));

// @route   GET /setup/user/stats
// @desc    Display current user statistics (for monitoring setup)
// @access  Public (no authentication required)
router.get('/user/stats', asyncHandler(async (req: Request, res: Response) => {
	const stats = await User.aggregate([
		{
			$group: {
				_id: null,
				totalUsers: { $sum: 1 },
				activeUsers: { $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] } },
				verifiedUsers: { $sum: { $cond: [{ $eq: ['$isEmailVerified', true] }, 1, 0] } }
			}
		}
	]);

	const roleStats = await User.aggregate([
		{ $unwind: '$roles' },
		{ $group: { _id: '$roles', count: { $sum: 1 } } },
		{ $sort: { count: -1 } }
	]);

	const result = stats[0] || { totalUsers: 0, activeUsers: 0, verifiedUsers: 0 };

	const html = `
<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>User Statistics - Mooodle WE4B</title>
	<style>
		body { 
			font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
			background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
			min-height: 100vh;
			margin: 0;
			padding: 20px;
		}
		.container { 
			max-width: 800px; 
			margin: 0 auto; 
			background: white; 
			border-radius: 16px; 
			padding: 40px;
			box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
		}
		h1 { 
			color: #333; 
			text-align: center; 
			margin-bottom: 30px;
		}
		.stats-grid { 
			display: grid; 
			grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); 
			gap: 20px; 
			margin-bottom: 30px;
		}
		.stat-card { 
			background: #f8f9fa; 
			padding: 20px; 
			border-radius: 8px; 
			text-align: center;
			border-left: 4px solid #667eea;
		}
		.stat-number { 
			font-size: 2rem; 
			font-weight: bold; 
			color: #667eea; 
		}
		.stat-label { 
			color: #666; 
			font-weight: 600;
		}
		.roles-section { 
			margin-top: 30px;
		}
		.role-item { 
			display: flex; 
			justify-content: space-between; 
			padding: 10px 15px; 
			background: #f8f9fa; 
			margin: 5px 0; 
			border-radius: 8px;
		}
		.links { 
			text-align: center; 
			margin-top: 30px;
		}
		.links a { 
			color: #667eea; 
			text-decoration: none; 
			margin: 0 15px;
			font-weight: 600;
		}
		.links a:hover { 
			text-decoration: underline;
		}
	</style>
</head>
<body>
	<div class="container">
		<h1>📊 User Statistics</h1>
		
		<div class="stats-grid">
			<div class="stat-card">
				<div class="stat-number">${result.totalUsers}</div>
				<div class="stat-label">Total Users</div>
			</div>
			<div class="stat-card">
				<div class="stat-number">${result.activeUsers}</div>
				<div class="stat-label">Active Users</div>
			</div>
			<div class="stat-card">
				<div class="stat-number">${result.verifiedUsers}</div>
				<div class="stat-label">Verified Users</div>
			</div>
		</div>

		<div class="roles-section">
			<h3>👥 Users by Role</h3>
			${roleStats.map(role => `
				<div class="role-item">
					<span>${role._id.charAt(0).toUpperCase() + role._id.slice(1)}s</span>
					<strong>${role.count}</strong>
				</div>
			`).join('')}
		</div>

		<div class="links">
			<a href="/setup/user">🆕 Create New User</a>
			<a href="/api/users/stats">📈 API Stats</a>
			<a href="/">🏠 Home</a>
		</div>
	</div>
</body>
</html>
	`;

	res.send(html);
}));

// Import validation result for the custom validation
import { validationResult } from 'express-validator';

export default router;
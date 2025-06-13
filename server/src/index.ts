import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

// Import routes
import userRoutes from './routes/user-routes';
import authRoutes from './routes/auth-routes';

// Import middleware
import { errorHandler } from './middleware/error-handler';
import { notFound } from './middleware/not-found';

// Load environment variables
dotenv.config();

class Server {
	public app: express.Application;
	private port: string | number;

	constructor() {
		this.app = express();
		this.port = process.env.PORT || 3000;

		this.connectDatabase();
		this.initializeMiddlewares();
		this.initializeRoutes();
		this.initializeErrorHandling();
	}

	private async connectDatabase(): Promise<void> {
		try {
			const mongoUri = process.env.MONGODB_URI;

			if (!mongoUri) {
				throw new Error('MONGODB_URI is not defined in environment variables');
			}

			await mongoose.connect(mongoUri);
			console.log('✅ Connected to MongoDB');

			mongoose.connection.on('error', (error) => {
				console.error('❌ MongoDB connection error:', error);
			});

			mongoose.connection.on('disconnected', () => {
				console.log('🔌 MongoDB disconnected');
			});

		} catch (error) {
			console.error('❌ Error connecting to MongoDB:', error);
			process.exit(1);
		}
	}

	private initializeMiddlewares(): void {
		// Security middleware
		this.app.use(helmet());

		// Rate limiting
		const limiter = rateLimit({
			windowMs: 15 * 60 * 1000, // 15 minutes
			max: 100, // limit each IP to 100 requests per windowMs
			message: 'Too many requests from this IP, please try again later.',
			standardHeaders: true,
			legacyHeaders: false,
		});
		this.app.use(limiter);

		// CORS configuration
		this.app.use(cors({
			origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
			credentials: true,
			methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'],
			allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
		}));

		// Compression middleware
		this.app.use(compression());

		// Logging middleware
		if (process.env.NODE_ENV === 'development') {
			this.app.use(morgan('dev'));
		} else {
			this.app.use(morgan('combined'));
		}

		// Body parsing middleware
		this.app.use(express.json({ limit: '10mb' }));
		this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

		// Health check endpoint
		this.app.get('/health', (req, res) => {
			res.status(200).json({
				status: 'OK',
				timestamp: new Date().toISOString(),
				uptime: process.uptime(),
				environment: process.env.NODE_ENV || 'development'
			});
		});
	}

	private initializeRoutes(): void {
		// API routes
		this.app.use('/api/accounts', authRoutes);
		this.app.use('/api/users', userRoutes);

		// Root endpoint
		this.app.get('/', (req, res) => {
			res.json({
				message: 'Mooodle WE4B Backend API',
				version: '1.0.0',
				endpoints: {
					health: '/health',
					auth: '/api/accounts',
					users: '/api/users'
				}
			});
		});
	}

	private initializeErrorHandling(): void {
		// 404 handler
		this.app.use(notFound);

		// Global error handler
		this.app.use(errorHandler);
	}

	public start(): void {
		this.app.listen(this.port, () => {
			console.log(`🚀 Server running on port ${this.port}`);
			console.log(`📖 Environment: ${process.env.NODE_ENV || 'development'}`);
			console.log(`🔗 API URL: http://localhost:${this.port}`);
		});
	}
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (err: Error) => {
	console.error('❌ Unhandled Promise Rejection:', err.message);
	process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err: Error) => {
	console.error('❌ Uncaught Exception:', err.message);
	process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
	console.log('🛑 SIGTERM received. Shutting down gracefully...');
	await mongoose.connection.close();
	process.exit(0);
});

process.on('SIGINT', async () => {
	console.log('🛑 SIGINT received. Shutting down gracefully...');
	await mongoose.connection.close();
	process.exit(0);
});

// Create and start server
const server = new Server();
server.start();

export default server;
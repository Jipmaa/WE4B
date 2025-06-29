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
import courseUnitRoutes from './routes/course-unit-routes';
import courseActivityRoutes from './routes/course-activity-routes';
import courseGroupRoutes from './routes/course-group-routes';
import setupRoutes from "./routes/setup-routes";
import authRoutes from './routes/auth-routes';
import fileRoutes from './routes/file-routes';
import discussionRoutes from './routes/discussion-routes';
import logRoutes from './routes/log-routes';

// Import middleware
import { errorHandler } from './middleware/error-handler';
import { notFound } from './middleware/not-found';
import {initializeBuckets} from "./services/minio-service";

// Load environment variables
dotenv.config();

class Server {
	public app: express.Application;
	private port: string | number;

	public static start() {
		const server = new Server();
		server.initializeServer().then(_r => {
			server.start();
		}).catch(e => {
			console.error("Could not start server", e);
			process.exit(1);
		});
	}

	private constructor() {
		this.app = express();
		this.port = process.env.PORT || 3000;
	}

	private async initializeServer(): Promise<void> {
		this.verifyEnv();
		await this.connectDatabase();
		await this.initializeMinIO();
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

	private async initializeMinIO(): Promise<void> {
		try {
			await initializeBuckets();
			console.log('✅ MinIO buckets initialized successfully');
		} catch (error) {
			console.error('❌ Error initializing MinIO:', error);
			console.warn('⚠️ Continuing without MinIO - file uploads will not work');
		}
	}

	private initializeMiddlewares(): void {
		// Security middleware with development-friendly configuration
		if (process.env.NODE_ENV === 'production') {
			this.app.use(helmet({
				hsts: {
					maxAge: 31536000,
					includeSubDomains: true,
					preload: true
				}
			}));
		} else {
			// Development configuration - don't force HTTPS
			this.app.use(helmet({
				hsts: false,
				contentSecurityPolicy: false,
				crossOriginEmbedderPolicy: false
			}));
		}

		// Logging middleware
		if (process.env.NODE_ENV === 'development') {
			morgan.token('origin', (req) => req.headers['origin'] || 'no-origin');
			morgan.token('auth', (req) => req.headers['authorization'] ? 'Bearer-present' : 'no-auth');
			this.app.use(morgan(':date[clf] :method :url — :status :res[content-length] :response-time ms | Origin: :origin | Auth: :auth'));
		} else {
			this.app.use(morgan('combined'));
		}

		// CORS configuration
		this.app.use(cors({
			origin: [
				'http://localhost:4200',  // Angular dev server
				'http://localhost:3000',  // The backend (for setup)
				process.env.CORS_ORIGIN!   // Environment variable for production
			].filter(Boolean), // Remove any undefined values
			credentials: true,
			methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'],
			allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
		}));

		// Handle preflight requests explicitly
		this.app.options('*', cors());

		// THEN rate limiting - much more lenient in development
		const isDevelopment = process.env.NODE_ENV === 'development';

		// Rate limiting
		const limiter = rateLimit({
			windowMs: 15 * 60 * 1000, // 15 minutes
			limit: isDevelopment ? 1000 : 100, // limit each IP to 100 requests per windowMs
			message: 'Too many requests from this IP, please try again later.',
			standardHeaders: true,
			legacyHeaders: false,
			skip: (req) => isDevelopment && req.method === 'OPTIONS'
		});
		this.app.use(limiter);

		// Compression middleware
		this.app.use(compression());

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
		if (process.env.NODE_ENV === 'development') {
			// Setup routes (no authentication required)
			this.app.use('/setup', setupRoutes);
		}

		// API routes
		this.app.use('/api/accounts', authRoutes);
		this.app.use('/api/course-units', courseUnitRoutes);
		this.app.use('/api/course-activities', courseActivityRoutes);
		this.app.use('/api/course-groups', courseGroupRoutes);
		this.app.use('/api/users', userRoutes);
		this.app.use('/api/files', fileRoutes);
		this.app.use('/api/discussions', discussionRoutes);
		this.app.use('/api/logs', logRoutes);

		// Root endpoint
		this.app.get('/', (req, res) => {
			res.json({
				message: 'Mooodle WE4B Backend API',
				version: '1.0.0',
				endpoints: {
					health: '/health',
					setup: '/setup/user',
					setupStats: '/setup/user/stats',
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
			console.log('📚 MinIO dashboard: http://localhost:9001');
			console.log(`👤 Setup User: http://localhost:${this.port}/setup/user`);
			console.log('------------------------------------------------------------------');
		});
	}

	private verifyEnv(): void {
		const missingEnvVars: string[] = [];
		const requiredEnvVars: string[] = [
			 'MONGODB_URI',
			 'MINIO_ENDPOINT',
			 'MINIO_PORT',
			 'MINIO_USE_SSL',
			 'MINIO_ACCESS_KEY',
			 'MINIO_SECRET_KEY'
		];

		for (const envVar of requiredEnvVars) {
			if (!process.env[envVar]) {
				missingEnvVars.push(envVar);
			}
		}

		if (missingEnvVars.length > 0) {
			throw new Error(`Missing environment variables: ${missingEnvVars.join(', ')}`);
		}
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
Server.start();
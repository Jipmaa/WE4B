import * as Minio from 'minio';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// MinIO client configuration
export const minioClient = new Minio.Client({
	endPoint: process.env.MINIO_ENDPOINT!,
	port: parseInt(process.env.MINIO_PORT!),
	useSSL: process.env.MINIO_USE_SSL === 'true',
	accessKey: process.env.MINIO_ACCESS_KEY,
	secretKey: process.env.MINIO_SECRET_KEY
});

// Bucket names
export const BUCKETS = {
	AVATARS: 'avatars',
	COURSE_IMAGES: 'course-images',
	ACTIVITY_FILES: 'activity-files',
	DEPOSITED_FILES: 'deposited-files',
	GENERAL: 'general'
} as const;

// Common image types and extensions
export const COMMON_IMAGE_TYPES = [
	'image/jpeg',
	'image/jpg',
	'image/png',
	'image/gif',
	'image/webp'
] as const;

export const COMMON_IMAGE_EXTENSIONS = [
	'.jpg',
	'.jpeg',
	'.png',
	'.gif',
	'.webp'
] as const;

// File type configurations
export const FILE_CONFIGS = {
	avatar: {
		bucket: BUCKETS.AVATARS,
		maxSize: 5 * 1024 * 1024, // 5MB
		allowedTypes: COMMON_IMAGE_TYPES,
		allowedExtensions: COMMON_IMAGE_EXTENSIONS
	},
	courseImage: {
		bucket: BUCKETS.COURSE_IMAGES,
		maxSize: 10 * 1024 * 1024, // 10MB
		allowedTypes: COMMON_IMAGE_TYPES,
		allowedExtensions: COMMON_IMAGE_EXTENSIONS
	},
	activityFile: {
		bucket: BUCKETS.ACTIVITY_FILES,
		maxSize: 50 * 1024 * 1024, // 50MB
		allowedTypes: [
			'image/jpeg', 'image/png', 'image/gif', 'image/webp',
			'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
			'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
			'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'application/vnd.openxmlformats-officedocument.presentationml.slideshow',
			'text/plain', 'text/csv',
			'video/mp4', 'video/webm',
			'audio/mpeg', 'audio/wav',
			'application/zip', 'application/x-rar-compressed'
		],
		allowedExtensions: [
			'.jpg', '.jpeg', '.png', '.gif', '.webp',
			'.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.ppsx',
			'.txt', '.csv',
			'.mp4', '.webm',
			'.mp3', '.wav',
			'.zip', '.rar'
		]
	},
	depositedFile: {
		bucket: BUCKETS.DEPOSITED_FILES,
		maxSize: 100 * 1024 * 1024, // 100MB
		allowedTypes: [
			'image/jpeg', 'image/png', 'image/gif', 'image/webp',
			'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
			'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
			'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'application/vnd.openxmlformats-officedocument.presentationml.slideshow',
			'text/plain', 'text/csv',
			'video/mp4', 'video/webm',
			'audio/mpeg', 'audio/wav',
			'application/zip', 'application/x-rar-compressed'
		],
		allowedExtensions: [
			'.jpg', '.jpeg', '.png', '.gif', '.webp',
			'.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.ppsx',
			'.txt', '.csv',
			'.mp4', '.webm',
			'.mp3', '.wav',
			'.zip', '.rar'
		]
	},
	general: {
		bucket: BUCKETS.GENERAL,
		maxSize: 100 * 1024 * 1024, // 100MB
		allowedTypes: [
			'image/jpeg', 'image/png', 'image/gif', 'image/webp',
			'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
			'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
			'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'application/vnd.openxmlformats-officedocument.presentationml.slideshow',
			'text/plain', 'text/csv',
			'video/mp4', 'video/webm',
			'audio/mpeg', 'audio/wav',
			'application/zip', 'application/x-rar-compressed'
		],
		allowedExtensions: [
			'.jpg', '.jpeg', '.png', '.gif', '.webp',
			'.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.ppsx',
			'.txt', '.csv',
			'.mp4', '.webm',
			'.mp3', '.wav',
			'.zip', '.rar'
		]
	}
};

// Initialize buckets
export const initializeBuckets = async (): Promise<void> => {
	try {
		for (const bucketName of Object.values(BUCKETS)) {
			const exists = await minioClient.bucketExists(bucketName);
			if (!exists) {
				await minioClient.makeBucket(bucketName);
				console.log(`✅ Created MinIO bucket: ${bucketName}`);

				// Set bucket policy for public read access (for avatars and course images)
				if (bucketName === BUCKETS.AVATARS || bucketName === BUCKETS.COURSE_IMAGES) {
					const policy = {
						Version: '2012-10-17',
						Statement: [
							{
								Effect: 'Allow',
								Principal: { AWS: ['*'] },
								Action: ['s3:GetObject'],
								Resource: [`arn:aws:s3:::${bucketName}/*`]
							}
						]
					};
					await minioClient.setBucketPolicy(bucketName, JSON.stringify(policy));
					console.log(`✅ Set public read policy for bucket: ${bucketName}`);
				}
			}
		}
	} catch (error) {
		console.error('❌ Error initializing MinIO buckets:', error);
		throw error;
	}
};

// Sanitize filename by removing special characters and normalizing
const sanitizeFileName = (filename: string): string => {
	return filename
		.normalize('NFD') // Decompose accented characters
		.replace(/[\u0300-\u036f]/g, '') // Remove diacritics
		.replace(/[^a-zA-Z0-9.-]/g, '_') // Replace non-alphanumeric chars with underscore
		.replace(/_{2,}/g, '_') // Replace multiple underscores with single one
		.replace(/^_|_$/g, ''); // Remove leading/trailing underscores
};

// Generate unique file name
export const generateFileName = (originalName: string, prefix?: string): string => {
	const ext = path.extname(originalName);
	const uuid = uuidv4();
	const timestamp = Date.now();
	const baseName = sanitizeFileName(path.basename(originalName, ext)).substring(0, 20); // Limit base name length

	return prefix
		 ? `${prefix}-${timestamp}-${uuid}-${baseName}${ext}`
		 : `${timestamp}-${uuid}-${baseName}${ext}`;
};

// Upload file to MinIO
export const uploadFile = async (
	 file: Express.Multer.File,
	 bucket: string,
	 objectName: string,
	 metadata?: Record<string, string>
): Promise<string> => {
	try {
		const metaData = {
			'Content-Type': file.mimetype,
			'X-Amz-Meta-Original-Name': Buffer.from(file.originalname, 'utf8').toString('base64'),
			'X-Amz-Meta-Upload-Date': new Date().toISOString(),
			...metadata
		};

		// Use putObject with Readable stream instead of buffer
		const { Readable } = await import('stream');
		const stream = Readable.from(file.buffer);
		
		await minioClient.putObject(bucket, objectName, stream, file.size, metaData);
		return objectName;
	} catch (error) {
		console.error('❌ Error uploading file to MinIO:', error);
		throw new Error('Failed to upload file');
	}
};

// Delete file from MinIO
export const deleteFile = async (bucket: string, objectName: string): Promise<void> => {
	try {
		await minioClient.removeObject(bucket, objectName);
	} catch (error) {
		console.error('❌ Error deleting file from MinIO:', error);
		throw new Error('Failed to delete file');
	}
};

// Get file info from MinIO
export const getFileInfo = async (bucket: string, objectName: string): Promise<Minio.BucketItemStat | null> => {
	try {
		return await minioClient.statObject(bucket, objectName);
	} catch (error) {
		if ((error as any).code === 'NotFound') {
			return null;
		}
		console.error('❌ Error getting file info from MinIO:', error);
		throw new Error('Failed to get file info');
	}
};

// Get presigned URL for file download
export const getPresignedUrl = async (
	 bucket: string,
	 objectName: string,
	 expiry: number = 24 * 60 * 60 // 24 hours
): Promise<string> => {
	try {
		return await minioClient.presignedGetObject(bucket, objectName, expiry);
	} catch (error) {
		console.error('❌ Error generating presigned URL:', error);
		throw new Error('Failed to generate download URL');
	}
};

// Get public URL for public buckets (now uses Express proxy)
export const getPublicUrl = (bucket: string, objectName: string): string => {
	const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
	const endpoint = process.env.NODE_ENV === 'production' 
		? process.env.API_HOST || 'localhost'
		: 'localhost';
	const port = process.env.NODE_ENV === 'production' 
		? (process.env.PORT || '3000')
		: '3000';

	return `${protocol}://${endpoint}:${port}/api/files/${bucket}/${objectName}`;
};

// List files in bucket
export const listFiles = async (
	 bucket: string,
	 prefix?: string,
	 recursive: boolean = false
): Promise<Minio.BucketItem[]> => {
	try {
		const files: Minio.BucketItem[] = [];
		const stream = minioClient.listObjects(bucket, prefix, recursive);

		return new Promise((resolve, reject) => {
			stream.on('data', (obj) => {
				// Only add objects that have a name (actual files, not prefixes)
				if (obj.name && typeof obj.name === 'string') {
					files.push(obj as Minio.BucketItem);
				}
			});
			stream.on('error', reject);
			stream.on('end', () => resolve(files));
		});
	} catch (error) {
		console.error('❌ Error listing files from MinIO:', error);
		throw new Error('Failed to list files');
	}
};

// Validate file type and size
export const validateFile = (
	 file: Express.Multer.File,
	 fileType: keyof typeof FILE_CONFIGS
): { isValid: boolean; error?: string } => {
	const config = FILE_CONFIGS[fileType];

	// Check file size
	if (file.size > config.maxSize) {
		return {
			isValid: false,
			error: `File size exceeds limit of ${config.maxSize / (1024 * 1024)}MB`
		};
	}

	// Check MIME type
	if (!(config.allowedTypes as readonly string[]).includes(file.mimetype)) {
		return {
			isValid: false,
			error: `File type ${file.mimetype} is not allowed`
		};
	}

	// Check file extension
	const ext = path.extname(file.originalname).toLowerCase();
	if (!(config.allowedExtensions as readonly string[]).includes(ext)) {
		return {
			isValid: false,
			error: `File extension ${ext} is not allowed`
		};
	}

	return { isValid: true };
};
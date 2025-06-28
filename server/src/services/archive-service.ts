import archiver from 'archiver';
import { Response } from 'express';
import { downloadFile, FILE_CONFIGS } from './minio-service';

export interface StudentSubmission {
	student: {
		firstName: string;
		lastName: string;
	};
	files: string[];
}

export class ArchiveService {
	static async createStudentArchive(
		submission: StudentSubmission,
		activityTitle: string,
		res: Response
	): Promise<void> {
		const archive = archiver('zip', {
			zlib: { level: 9 }
		});

		const fileName = `${submission.student.lastName}_${submission.student.firstName}-${activityTitle}.zip`;
		
		res.setHeader('Content-Type', 'application/zip');
		res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

		archive.pipe(res);

		for (const fileKey of submission.files) {
			try {
				const fileStream = await downloadFile(FILE_CONFIGS.depositedFile.bucket, fileKey);
				const originalFileName = this.extractFileNameFromKey(fileKey);
				archive.append(fileStream as any, { name: originalFileName });
			} catch (error) {
				console.warn(`Failed to add file ${fileKey} to archive:`, error);
			}
		}

		await archive.finalize();
	}

	static async createBulkArchive(
		submissions: Array<{ 
			student: { firstName: string; lastName: string };
			files: string[];
		}>,
		activityTitle: string,
		res: Response
	): Promise<void> {
		const archive = archiver('zip', {
			zlib: { level: 9 }
		});

		const fileName = `${activityTitle}-All_Submissions.zip`;
		
		res.setHeader('Content-Type', 'application/zip');
		res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

		archive.pipe(res);

		for (const submission of submissions) {
			const studentFolderName = `${submission.student.lastName}_${submission.student.firstName}`;
			
			for (const fileKey of submission.files) {
				try {
					const fileStream = await downloadFile(FILE_CONFIGS.depositedFile.bucket, fileKey);
					const originalFileName = this.extractFileNameFromKey(fileKey);
					archive.append(fileStream as any, { name: `${studentFolderName}/${originalFileName}` });
				} catch (error) {
					console.warn(`Failed to add file ${fileKey} to archive:`, error);
				}
			}
		}

		await archive.finalize();
	}

	private static extractFileNameFromKey(fileKey: string): string {
		const parts = fileKey.split('/');
		const fileName = parts[parts.length - 1];
		const underscoreIndex = fileName.indexOf('_');
		return underscoreIndex !== -1 ? fileName.substring(underscoreIndex + 1) : fileName;
	}
}
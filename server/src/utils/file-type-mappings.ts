// File type mapping utilities for semantic file types to MIME types and extensions

export interface FileTypeValidationResult {
  isValid: boolean;
  error?: string;
}

// Mapping of semantic file types to their allowed MIME types and extensions
export const FILE_TYPE_MAPPINGS: Record<string, {
  mimeTypes: string[];
  extensions: string[];
  description: string;
}> = {
  'text-file': {
    mimeTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/csv',
      'application/rtf'
    ],
    extensions: ['.pdf', '.doc', '.docx', '.txt', '.csv', '.rtf'],
    description: 'Documents texte (PDF, Word, TXT, CSV, RTF)'
  },
  'archive': {
    mimeTypes: [
      'application/zip',
      'application/x-zip-compressed',
      'application/x-rar-compressed',
      'application/vnd.rar',
      'application/x-7z-compressed'
    ],
    extensions: ['.zip', '.rar', '.7z'],
    description: 'Archives (ZIP, RAR, 7Z)'
  },
  'image': {
    mimeTypes: [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/bmp',
      'image/webp',
      'image/svg+xml'
    ],
    extensions: ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'],
    description: 'Images (JPG, PNG, GIF, BMP, WebP, SVG)'
  },
  'video': {
    mimeTypes: [
      'video/mp4',
      'video/mpeg',
      'video/quicktime',
      'video/x-msvideo',
      'video/x-ms-wmv',
      'video/webm'
    ],
    extensions: ['.mp4', '.mpeg', '.mov', '.avi', '.wmv', '.webm'],
    description: 'Vidéos (MP4, MPEG, MOV, AVI, WMV, WebM)'
  },
  'audio': {
    mimeTypes: [
      'audio/mpeg',
      'audio/wav',
      'audio/x-wav',
      'audio/ogg',
      'audio/mp4',
      'audio/aac',
      'audio/webm'
    ],
    extensions: ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.webm'],
    description: 'Audio (MP3, WAV, OGG, M4A, AAC, WebM)'
  },
  'spreadsheet': {
    mimeTypes: [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
      'application/vnd.oasis.opendocument.spreadsheet'
    ],
    extensions: ['.xls', '.xlsx', '.csv', '.ods'],
    description: 'Tableurs (Excel, CSV, ODS)'
  },
  'presentation': {
    mimeTypes: [
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.oasis.opendocument.presentation'
    ],
    extensions: ['.ppt', '.pptx', '.odp'],
    description: 'Présentations (PowerPoint, ODP)'
  }
};

export type SemanticFileType = keyof typeof FILE_TYPE_MAPPINGS;

/**
 * Validates if a file is allowed based on its MIME type, filename, and semantic file types
 */
export function isFileAllowed(
  mimeType: string, 
  filename: string, 
  allowedSemanticTypes: string[]
): FileTypeValidationResult {
  if (!allowedSemanticTypes || allowedSemanticTypes.length === 0) {
    return { isValid: true };
  }

  const fileExtension = getFileExtension(filename);
  
  for (const semanticType of allowedSemanticTypes) {
    const mapping = FILE_TYPE_MAPPINGS[semanticType as SemanticFileType];
    
    if (!mapping) {
      continue; // Skip unknown semantic types
    }

    // Check by MIME type
    if (mapping.mimeTypes.includes(mimeType)) {
      return { isValid: true };
    }

    // Check by file extension as fallback
    if (fileExtension && mapping.extensions.includes(fileExtension.toLowerCase())) {
      return { isValid: true };
    }
  }

  // Generate error message with allowed types
  const allowedDescriptions = allowedSemanticTypes
    .map(type => FILE_TYPE_MAPPINGS[type as SemanticFileType]?.description)
    .filter(Boolean)
    .join(', ');

  return {
    isValid: false,
    error: `Type de fichier non autorisé. Types acceptés: ${allowedDescriptions}`
  };
}

/**
 * Gets file extension from filename
 */
function getFileExtension(filename: string): string | null {
  const lastDotIndex = filename.lastIndexOf('.');
  if (lastDotIndex === -1 || lastDotIndex === filename.length - 1) {
    return null;
  }
  return filename.substring(lastDotIndex);
}

/**
 * Gets human-readable descriptions for semantic file types
 */
export function getFileTypeDescription(semanticType: string): string {
  const mapping = FILE_TYPE_MAPPINGS[semanticType as SemanticFileType];
  return mapping?.description || 'Type de fichier inconnu';
}

/**
 * Gets all allowed MIME types for semantic file types
 */
export function getAllowedMimeTypes(semanticTypes: string[]): string[] {
  const mimeTypes: string[] = [];
  for (const semanticType of semanticTypes) {
    const mapping = FILE_TYPE_MAPPINGS[semanticType as SemanticFileType];
    if (mapping) {
      mimeTypes.push(...mapping.mimeTypes);
    }
  }
  return [...new Set(mimeTypes)]; // Remove duplicates
}

/**
 * Gets all allowed extensions for semantic file types
 */
export function getAllowedExtensions(semanticTypes: string[]): string[] {
  const extensions: string[] = [];
  for (const semanticType of semanticTypes) {
    const mapping = FILE_TYPE_MAPPINGS[semanticType as SemanticFileType];
    if (mapping) {
      extensions.push(...mapping.extensions);
    }
  }
  return [...new Set(extensions)]; // Remove duplicates
}
// Client-side file type mapping utilities for semantic file types to browser-compatible formats

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
 * Converts semantic file types to browser-compatible accept attribute value
 * for use in HTML file input elements
 */
export function getAcceptAttribute(semanticTypes: string[]): string {
  if (!semanticTypes || semanticTypes.length === 0) {
    return '';
  }

  const acceptValues: string[] = [];
  
  for (const semanticType of semanticTypes) {
    const mapping = FILE_TYPE_MAPPINGS[semanticType as SemanticFileType];
    if (mapping) {
      // Add MIME types
      acceptValues.push(...mapping.mimeTypes);
      // Add extensions
      acceptValues.push(...mapping.extensions);
    }
  }

  // Remove duplicates and return as comma-separated string
  return [...new Set(acceptValues)].join(',');
}

/**
 * Gets human-readable descriptions for semantic file types
 */
export function getFileTypeDescription(semanticType: string): string {
  const mapping = FILE_TYPE_MAPPINGS[semanticType as SemanticFileType];
  return mapping?.description || 'Type de fichier inconnu';
}

/**
 * Gets combined description for multiple semantic file types
 */
export function getFileTypesDescription(semanticTypes: string[]): string {
  if (!semanticTypes || semanticTypes.length === 0) {
    return 'Tous types de fichiers';
  }

  const descriptions = semanticTypes
    .map(type => getFileTypeDescription(type))
    .filter(desc => desc !== 'Type de fichier inconnu');

  if (descriptions.length === 0) {
    return 'Types de fichiers non reconnus';
  }

  if (descriptions.length === 1) {
    return descriptions[0];
  }

  if (descriptions.length === 2) {
    return descriptions.join(' ou ');
  }

  return descriptions.slice(0, -1).join(', ') + ' ou ' + descriptions[descriptions.length - 1];
}

/**
 * Validates if a file type is allowed based on semantic file types
 * This is a client-side helper for immediate feedback
 */
export function isFileTypeAllowed(file: File, allowedSemanticTypes: string[]): boolean {
  if (!allowedSemanticTypes || allowedSemanticTypes.length === 0) {
    return true;
  }

  const fileName = file.name.toLowerCase();
  const fileType = file.type;

  for (const semanticType of allowedSemanticTypes) {
    const mapping = FILE_TYPE_MAPPINGS[semanticType as SemanticFileType];
    
    if (!mapping) {
      continue;
    }

    // Check by MIME type
    if (fileType && mapping.mimeTypes.includes(fileType)) {
      return true;
    }

    // Check by extension
    const hasAllowedExtension = mapping.extensions.some(ext => 
      fileName.endsWith(ext.toLowerCase())
    );
    
    if (hasAllowedExtension) {
      return true;
    }
  }

  return false;
}

/**
 * Gets all allowed extensions for display purposes
 */
export function getAllowedExtensions(semanticTypes: string[]): string[] {
  const extensions: string[] = [];
  
  for (const semanticType of semanticTypes) {
    const mapping = FILE_TYPE_MAPPINGS[semanticType as SemanticFileType];
    if (mapping) {
      extensions.push(...mapping.extensions);
    }
  }

  return [...new Set(extensions)];
}

/**
 * Formats extensions for user display
 */
export function formatExtensionsForDisplay(semanticTypes: string[]): string {
  const extensions = getAllowedExtensions(semanticTypes);
  
  if (extensions.length === 0) {
    return '';
  }
  
  if (extensions.length === 1) {
    return extensions[0];
  }
  
  if (extensions.length <= 3) {
    return extensions.join(', ');
  }
  
  return extensions.slice(0, 3).join(', ') + ` et ${extensions.length - 3} autres`;
}
import fs from 'fs';
import path from 'path';

let cloudinary: any = null;
let isCloudinaryConfigured = false;

// Dynamically check and configure Cloudinary
const initCloudinary = async () => {
  const hasCloudinaryEnv = process.env.CLOUDINARY_URL || 
    (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);
  
  if (!hasCloudinaryEnv) {
    console.log("ℹ️ Cloudinary credentials not configured. Uploads will be saved locally.");
    return;
  }

  try {
    const pkg = await import('cloudinary');
    cloudinary = pkg.v2;
    
    if (process.env.CLOUDINARY_URL) {
      // Automatic configuration from URL
      cloudinary.config();
    } else {
      cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
        secure: true
      });
    }
    
    isCloudinaryConfigured = true;
    console.log("⚡ Cloudinary integration initialized successfully.");
  } catch (err: any) {
    console.warn("⚠️ Failed to initialize Cloudinary. Falling back to local storage.", err.message);
    isCloudinaryConfigured = false;
  }
};

initCloudinary();

/** Simple string URL result — for backwards compatibility */
export const uploadMediaFile = async (
  localFilePath: string,
  folder: string,
  fallbackUrl: string
): Promise<string> => {
  const result = await uploadMediaFileWithMetadata(localFilePath, folder, fallbackUrl);
  return result.url;
};

export interface CloudinaryUploadResult {
  url: string;
  public_id: string | null;
  file_type: string | null;
  file_name: string | null;
  file_size: number | null;
  uploaded_at: string;
  source: 'cloudinary' | 'local';
}

/**
 * Uploads a local file to Cloudinary and returns rich metadata.
 * If Cloudinary is not configured, it returns the local file path with fallback metadata.
 * If Cloudinary succeeds, it removes the local file and returns the secure remote URL.
 */
export const uploadMediaFileWithMetadata = async (
  localFilePath: string,
  folder: string,
  fallbackUrl: string
): Promise<CloudinaryUploadResult> => {
  const fileName = path.basename(localFilePath);
  const ext = path.extname(localFilePath).toLowerCase().replace('.', '');
  let fileSize: number | null = null;
  
  try {
    const stats = fs.statSync(localFilePath);
    fileSize = stats.size;
  } catch (_) {}

  if (!isCloudinaryConfigured || !cloudinary) {
    return {
      url: fallbackUrl,
      public_id: null,
      file_type: ext || null,
      file_name: fileName || null,
      file_size: fileSize,
      uploaded_at: new Date().toISOString(),
      source: 'local'
    };
  }

  try {
    const result = await cloudinary.uploader.upload(localFilePath, {
      folder: `skill_track/${folder}`,
      resource_type: 'auto',
      use_filename: true,
      unique_filename: true
    });

    // Delete local file after successful upload to conserve disk space
    fs.unlink(localFilePath, (err) => {
      if (err) console.warn("⚠️ Failed to delete local temp file:", localFilePath, err.message);
    });

    return {
      url: result.secure_url,
      public_id: result.public_id || null,
      file_type: result.format || ext || null,
      file_name: result.original_filename || fileName || null,
      file_size: result.bytes || fileSize,
      uploaded_at: result.created_at || new Date().toISOString(),
      source: 'cloudinary'
    };
  } catch (error: any) {
    console.error("⚠️ Cloudinary upload failed, falling back to local file:", error.message);
    return {
      url: fallbackUrl,
      public_id: null,
      file_type: ext || null,
      file_name: fileName || null,
      file_size: fileSize,
      uploaded_at: new Date().toISOString(),
      source: 'local'
    };
  }
};

import fs from 'fs';

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

/**
 * Uploads a local file to Cloudinary.
 * If Cloudinary is not configured, it returns the local file path.
 * If Cloudinary succeeds, it removes the local file and returns the secure remote URL.
 */
export const uploadMediaFile = async (
  localFilePath: string,
  folder: string,
  fallbackUrl: string
): Promise<string> => {
  if (!isCloudinaryConfigured || !cloudinary) {
    return fallbackUrl;
  }

  try {
    const result = await cloudinary.uploader.upload(localFilePath, {
      folder: `skill_track/${folder}`,
      resource_type: 'auto'
    });

    // Delete local file after successful upload to conserve disk space
    fs.unlink(localFilePath, (err) => {
      if (err) console.warn("⚠️ Failed to delete local temp file:", localFilePath, err.message);
    });

    return result.secure_url;
  } catch (error: any) {
    console.error("⚠️ Cloudinary upload failed, falling back to local file:", error.message);
    return fallbackUrl;
  }
};

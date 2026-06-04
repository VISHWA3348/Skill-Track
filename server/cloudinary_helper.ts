import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { Readable } from 'stream';
import path from 'path';

let isCloudinaryConfigured = false;

// Dynamically check and configure Cloudinary
const initCloudinary = async () => {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    console.error("❌ CRITICAL: Cloudinary credentials missing from environment variables.");
    process.exit(1);
  }

  try {
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true
    });

    // Verify Cloudinary connectivity via API ping
    const pingResult = await cloudinary.api.ping();
    if (pingResult.status !== 'ok') {
      throw new Error(`Cloudinary ping returned status: ${pingResult.status}`);
    }

    isCloudinaryConfigured = true;
  } catch (err: any) {
    console.error("❌ CRITICAL: Failed to initialize or connect to Cloudinary:", err.message);
    process.exit(1);
  }
};

// Initialize Cloudinary on boot
initCloudinary();

const uploadFromBuffer = (buffer: Buffer, folder: string, fileName: string): Promise<UploadApiResponse> => {
  return new Promise((resolve, reject) => {
    const cleanName = path.basename(fileName, path.extname(fileName)).replace(/[^a-zA-Z0-9_-]/g, '');
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `skill_track/${folder}`,
        resource_type: 'auto',
        public_id: `${cleanName}_${Date.now()}`
      },
      (error, result) => {
        if (error) return reject(error);
        if (!result) return reject(new Error('Cloudinary upload returned empty result'));
        resolve(result);
      }
    );
    const stream = new Readable();
    stream.push(buffer);
    stream.push(null);
    stream.pipe(uploadStream);
  });
};

/**
 * Uploads an in-memory file to Cloudinary.
 * Throws an error on failure.
 */
export const uploadMediaFile = async (
  file: Express.Multer.File,
  folder: string
): Promise<string> => {
  if (!isCloudinaryConfigured) {
    throw new Error("Cloudinary is not configured");
  }
  try {
    const result = await uploadFromBuffer(file.buffer, folder, file.originalname);
    return result.secure_url;
  } catch (error: any) {
    console.error("❌ Cloudinary upload failed:", error.message);
    throw new Error(`Cloudinary upload failed: ${error.message}`);
  }
};

export interface UploadMetadata {
  url: string;
  public_id: string;
  file_type: string;
  file_name: string;
  uploaded_at: Date;
}

/**
 * Uploads an in-memory file to Cloudinary, returning full upload metadata.
 */
export const uploadMediaFileDetailed = async (
  file: Express.Multer.File,
  folder: string
): Promise<UploadMetadata> => {
  if (!isCloudinaryConfigured) {
    throw new Error("Cloudinary is not configured");
  }
  try {
    const result = await uploadFromBuffer(file.buffer, folder, file.originalname);
    const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
    return {
      url: result.secure_url,
      public_id: result.public_id,
      file_type: result.format || ext,
      file_name: file.originalname,
      uploaded_at: new Date(result.created_at || new Date())
    };
  } catch (error: any) {
    console.error("❌ Cloudinary upload failed:", error.message);
    throw new Error(`Cloudinary upload failed: ${error.message}`);
  }
};

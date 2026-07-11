import { v2 as cloudinary } from "cloudinary";

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

const isConfigured = Boolean(cloudName && apiKey && apiSecret);

if (isConfigured) {
  cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });
}

/**
 * Upload a file buffer to Cloudinary and return the secure URL.
 */
export async function uploadImage(buffer: Buffer): Promise<string> {
  if (!isConfigured) {
    throw new Error(
      "Missing Cloudinary credentials. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET."
    );
  }

  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream({ folder: "nexus-pos", resource_type: "image" }, (error, result) => {
        if (error || !result) {
          reject(error ?? new Error("Cloudinary upload failed"));
          return;
        }
        resolve(result.secure_url);
      })
      .end(buffer);
  });
}

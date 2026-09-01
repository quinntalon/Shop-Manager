import { v2 as cloudinary } from "cloudinary";

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey    = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

const isConfigured = Boolean(cloudName && apiKey && apiSecret);

if (isConfigured) {
  cloudinary.config({
    cloud_name: cloudName,
    api_key:    apiKey,
    api_secret: apiSecret,
  });
}

export interface UploadImageOptions {
  /** Cloudinary folder path (default: "nexus-pos") */
  folder?: string;
  /** Force output format, e.g. "png" for transparent images */
  format?: string;
}

/**
 * Upload a file buffer to Cloudinary and return the secure URL.
 *
 * @param buffer   Raw image bytes.
 * @param options  Optional overrides for folder and output format.
 */
export async function uploadImage(
  buffer: Buffer,
  options: UploadImageOptions = {},
): Promise<string> {
  if (!isConfigured) {
    throw new Error(
      "Missing Cloudinary credentials. " +
        "Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.",
    );
  }

  const { folder = "nexus-pos", format } = options;

  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          folder,
          resource_type: "image",
          // When format is specified (e.g. "png"), Cloudinary preserves alpha
          ...(format ? { format } : {}),
        },
        (error, result) => {
          if (error || !result) {
            reject(error ?? new Error("Cloudinary upload failed"));
            return;
          }
          resolve(result.secure_url);
        },
      )
      .end(buffer);
  });
}

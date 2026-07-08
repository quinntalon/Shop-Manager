import { useState, useCallback } from "react";

export interface UploadResponse {
  url: string;
}

interface UseUploadOptions {
  /** Base path where storage routes are mounted (default: "/api/storage") */
  basePath?: string;
  onSuccess?: (response: UploadResponse) => void;
  onError?: (error: Error) => void;
}

/**
 * React hook for uploading files to Cloudinary via the API server.
 *
 * Sends the file as multipart/form-data to POST /api/storage/upload.
 * The server uploads to Cloudinary and returns { url } — a permanent
 * Cloudinary URL that can be stored directly in the database.
 *
 * @example
 * ```tsx
 * const { uploadFile, isUploading } = useUpload({
 *   onSuccess: ({ url }) => setForm(f => ({ ...f, photoUrl: url })),
 * });
 *
 * <input type="file" onChange={e => uploadFile(e.target.files![0])} />
 * ```
 */
export function useUpload(options: UseUploadOptions = {}) {
  const basePath = options.basePath ?? "/api/storage";
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [progress, setProgress] = useState(0);

  const uploadFile = useCallback(
    async (file: File): Promise<UploadResponse | null> => {
      setIsUploading(true);
      setError(null);
      setProgress(0);

      try {
        setProgress(30);
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch(`${basePath}/upload`, {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error((data as { error?: string }).error ?? "Upload failed");
        }

        const data = (await response.json()) as UploadResponse;
        setProgress(100);
        options.onSuccess?.(data);
        return data;
      } catch (err) {
        const uploadError = err instanceof Error ? err : new Error("Upload failed");
        setError(uploadError);
        options.onError?.(uploadError);
        return null;
      } finally {
        setIsUploading(false);
      }
    },
    [basePath, options]
  );

  return { uploadFile, isUploading, error, progress };
}

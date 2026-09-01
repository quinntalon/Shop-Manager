import { useState, useCallback } from "react";

export interface UploadResponse {
  /** The display URL — background-removed PNG when removal succeeded, otherwise the original. */
  url: string;
  /** The untouched original image URL, always preserved in Cloudinary. */
  originalUrl: string;
  /** True when background removal ran successfully. */
  bgRemoved: boolean;
}

interface UseUploadOptions {
  /** Base path where storage routes are mounted (default: "/api/storage") */
  basePath?: string;
  onSuccess?: (response: UploadResponse) => void;
  onError?: (error: Error) => void;
}

/**
 * React hook for uploading product images to the API server.
 *
 * Flow (handled entirely on the backend — no API keys exposed here):
 *   1. File is sent to POST /api/storage/upload
 *   2. Backend uploads the original to Cloudinary
 *   3. Backend calls the remove.bg API to strip the background
 *   4. Backend uploads the processed transparent PNG to Cloudinary
 *   5. Returns { url, originalUrl, bgRemoved }
 *
 * If background removal is not configured or fails, `url` equals `originalUrl`
 * and `bgRemoved` is false — the original is always preserved.
 *
 * States exposed:
 *   isUploading    — file is being sent to the server (step 1)
 *   isProcessing   — server is running background removal (steps 2–4);
 *                    this is inferred from the server taking > ~300 ms after
 *                    the upload payload was sent. In practice the whole round-
 *                    trip is one request, so both flags fire together; the UI
 *                    can choose to show either or a combined spinner.
 *   progress       — rough 0-100 numeric progress for a progress bar
 */
export function useUpload(options: UseUploadOptions = {}) {
  const basePath = options.basePath ?? "/api/storage";

  const [isUploading,   setIsUploading]   = useState(false);
  const [isProcessing,  setIsProcessing]  = useState(false);
  const [error,         setError]         = useState<Error | null>(null);
  const [progress,      setProgress]      = useState(0);

  const uploadFile = useCallback(
    async (file: File): Promise<UploadResponse | null> => {
      setIsUploading(true);
      setIsProcessing(false);
      setError(null);
      setProgress(0);

      try {
        // Build multipart body
        const formData = new FormData();
        formData.append("file", file);

        setProgress(10);

        // After a short delay, flip to "processing" to give the UI a chance
        // to show the bg-removal spinner before the response arrives.
        const processingTimer = setTimeout(() => {
          setIsProcessing(true);
          setProgress(40);
        }, 300);

        const response = await fetch(`${basePath}/upload`, {
          method: "POST",
          body: formData,
        });

        clearTimeout(processingTimer);
        setProgress(90);

        if (!response.ok) {
          const data = await response.json().catch(() => ({})) as { error?: string };
          throw new Error(data.error ?? "Upload failed");
        }

        const data = await response.json() as Partial<UploadResponse> & { url: string };

        // Back-compat: if the server returns the old { url } shape (e.g. older
        // deployment that hasn't been updated yet), synthesise the missing fields.
        const result: UploadResponse = {
          url:         data.url,
          originalUrl: data.originalUrl ?? data.url,
          bgRemoved:   data.bgRemoved   ?? false,
        };

        setProgress(100);
        options.onSuccess?.(result);
        return result;
      } catch (err) {
        const uploadError = err instanceof Error ? err : new Error("Upload failed");
        setError(uploadError);
        options.onError?.(uploadError);
        return null;
      } finally {
        setIsUploading(false);
        setIsProcessing(false);
      }
    },
    [basePath, options],
  );

  return { uploadFile, isUploading, isProcessing, error, progress };
}

import { useRef, type ReactNode } from "react";
import { useUpload } from "./use-upload";

interface ObjectUploaderProps {
  /** Accepted MIME types (default: "image/*") */
  accept?: string;
  maxFileSize?: number;
  basePath?: string;
  onSuccess?: (url: string) => void;
  onError?: (error: Error) => void;
  buttonClassName?: string;
  children: ReactNode;
}

/**
 * A file upload button that uploads directly to Cloudinary via the API server.
 * Calls onSuccess with the resulting Cloudinary URL.
 */
export function ObjectUploader({
  accept = "image/*",
  maxFileSize = 10 * 1024 * 1024,
  basePath,
  onSuccess,
  onError,
  buttonClassName,
  children,
}: ObjectUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { uploadFile, isUploading } = useUpload({
    basePath,
    onSuccess: ({ url }) => onSuccess?.(url),
    onError,
  });

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > maxFileSize) {
      onError?.(new Error(`File exceeds maximum size of ${Math.round(maxFileSize / 1024 / 1024)} MB`));
      return;
    }
    await uploadFile(file);
    // Reset so the same file can be re-selected
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={handleChange}
        disabled={isUploading}
      />
      <button
        type="button"
        className={buttonClassName}
        disabled={isUploading}
        onClick={() => inputRef.current?.click()}
      >
        {children}
      </button>
    </>
  );
}

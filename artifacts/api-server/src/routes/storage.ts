import { Router, type IRouter, type Request, type Response } from "express";
import multer from "multer";
import { uploadImage } from "../lib/cloudinary";
import { requirePermission } from "../middlewares/requireRole";

const router: IRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      cb(new Error("Only image files are allowed"));
      return;
    }
    cb(null, true);
  },
});

/**
 * POST /storage/upload
 *
 * Accepts a multipart/form-data request with a single "file" field.
 * Uploads the image to Cloudinary and returns the permanent secure URL.
 *
 * Response: { url: string }
 */
router.post(
  "/storage/upload",
  requirePermission("inventory"),
  upload.single("file"),
  async (req: Request, res: Response): Promise<void> => {
    if (!req.file) {
      res.status(400).json({ error: "No file provided. Send a multipart/form-data request with a 'file' field." });
      return;
    }

    try {
      const url = await uploadImage(req.file.buffer);
      res.json({ url });
    } catch (error) {
      req.log.error({ err: error }, "Cloudinary upload failed");
      res.status(500).json({ error: "Image upload failed" });
    }
  }
);

export default router;

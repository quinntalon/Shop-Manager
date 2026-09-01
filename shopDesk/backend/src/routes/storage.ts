import type { FastifyPluginAsync } from "fastify";
import { uploadImage } from "../lib/cloudinary";
import { removeBackground, RemoveBgError } from "../lib/remove-bg";
import { requirePermission } from "../middlewares/requireRole";

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

/**
 * POST /storage/upload
 *
 * Accepts multipart/form-data with a single "file" field.
 *
 * Pipeline:
 *  1. Upload the original image to Cloudinary → originalUrl
 *  2. Attempt background removal via remove.bg
 *  3. If successful, upload the transparent PNG to Cloudinary → url
 *  4. If bg removal fails, url falls back to originalUrl (no data loss)
 *
 * Response: { url: string; originalUrl: string; bgRemoved: boolean }
 *
 *   url         — the image to display (bg-removed PNG when available)
 *   originalUrl — the untouched original always preserved in Cloudinary
 *   bgRemoved   — true when background removal succeeded
 */
const storageRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post(
    "/storage/upload",
    { preHandler: [requirePermission("inventory")] },
    async (request, reply) => {
      const data = await request.file();

      if (!data) {
        return reply.code(400).send({
          error:
            "No file provided. Send a multipart/form-data request with a 'file' field.",
        });
      }

      if (!ALLOWED_MIME_TYPES.has(data.mimetype)) {
        return reply.code(400).send({
          error: "Only JPG, PNG, and WebP images are allowed.",
        });
      }

      let buffer: Buffer;
      try {
        buffer = await data.toBuffer();
      } catch (err) {
        request.log.error({ err }, "Failed to read uploaded file buffer");
        return reply.code(500).send({ error: "Failed to read uploaded file." });
      }

      // ── Step 1: upload original to Cloudinary ──────────────────────────────
      let originalUrl: string;
      try {
        originalUrl = await uploadImage(buffer, {
          folder: "nexus-pos/originals",
        });
      } catch (err) {
        request.log.error({ err }, "Cloudinary upload (original) failed");
        return reply.code(500).send({ error: "Image upload failed." });
      }

      // ── Step 2 & 3: background removal + upload processed PNG ──────────────
      let processedUrl: string = originalUrl;
      let bgRemoved = false;

      if (!process.env.REMOVE_BG_API_KEY) {
        // Key not configured — skip silently, return original
        request.log.warn(
          "REMOVE_BG_API_KEY not set — skipping background removal",
        );
      } else {
        try {
          const processedBuffer = await removeBackground(
            buffer,
            data.filename ?? "image.png",
          );

          processedUrl = await uploadImage(processedBuffer, {
            folder: "nexus-pos/processed",
            // Hint Cloudinary that this is a PNG with alpha
            format: "png",
          });

          bgRemoved = true;
          request.log.info(
            { originalUrl, processedUrl },
            "Background removal succeeded",
          );
        } catch (err) {
          // Graceful fallback — log but don't fail the whole request
          if (err instanceof RemoveBgError) {
            request.log.warn(
              { message: err.message, statusCode: err.statusCode },
              "Background removal failed — using original image",
            );
          } else {
            request.log.error(
              { err },
              "Unexpected error during background removal — using original image",
            );
          }
          // processedUrl stays as originalUrl (set above)
        }
      }

      return reply.send({
        url: processedUrl,
        originalUrl,
        bgRemoved,
      });
    },
  );
};

export default storageRoutes;

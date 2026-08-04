import type { FastifyPluginAsync } from "fastify";
import { uploadImage } from "../lib/cloudinary";
import { requirePermission } from "../middlewares/requireRole";

/**
 * POST /storage/upload
 *
 * Accepts a multipart/form-data request with a single "file" field.
 * Uploads the image to Cloudinary and returns the permanent secure URL.
 *
 * Response: { url: string }
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
      if (!data.mimetype.startsWith("image/")) {
        return reply.code(400).send({ error: "Only image files are allowed" });
      }

      try {
        const buffer = await data.toBuffer();
        const url = await uploadImage(buffer);
        return { url };
      } catch (error) {
        request.log.error({ err: error }, "Cloudinary upload failed");
        return reply.code(500).send({ error: "Image upload failed" });
      }
    },
  );
};

export default storageRoutes;

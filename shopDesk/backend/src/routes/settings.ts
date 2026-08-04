import type { FastifyPluginAsync } from "fastify";
import { eq } from "drizzle-orm";
import { db, settingsTable, THEME_MODES } from "@workspace/db";
import { requirePermission } from "../middlewares/requireRole";
import { z } from "zod/v4";

const SETTINGS_ID = 1;

const SettingsUpdateBody = z.object({
  businessName: z.string().min(1).max(120).optional(),
  logoUrl: z.string().nullable().optional(),
  themeMode: z.enum(THEME_MODES).optional(),
  primaryColor: z.string().min(1).max(40).optional(),
  loyaltyEnabled: z.boolean().optional(),
  loyaltyPointsPerCedi: z.number().int().min(1).max(100).optional(),
  loyaltyRedemptionRate: z.number().int().min(1).max(10000).optional(),
});

async function getOrCreateSettings() {
  const [existing] = await db
    .select()
    .from(settingsTable)
    .where(eq(settingsTable.id, SETTINGS_ID));
  if (existing) return existing;

  const [created] = await db
    .insert(settingsTable)
    .values({ id: SETTINGS_ID })
    .onConflictDoNothing()
    .returning();
  if (created) return created;

  const [row] = await db
    .select()
    .from(settingsTable)
    .where(eq(settingsTable.id, SETTINGS_ID));
  return row;
}

const settingsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get("/settings", async () => {
    const settings = await getOrCreateSettings();
    return settings;
  });

  fastify.patch(
    "/settings",
    { preHandler: [requirePermission("settings")] },
    async (request, reply) => {
      const parsed = SettingsUpdateBody.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.message });
      }

      await getOrCreateSettings();

      const [row] = await db
        .update(settingsTable)
        .set({ ...parsed.data, updatedAt: new Date() })
        .where(eq(settingsTable.id, SETTINGS_ID))
        .returning();

      return row;
    },
  );
};

export default settingsRoutes;

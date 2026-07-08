import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, settingsTable, THEME_MODES } from "@workspace/db";
import { requirePermission } from "../middlewares/requireRole";
import { z } from "zod/v4";

const router: IRouter = Router();

const SETTINGS_ID = 1;

const SettingsUpdateBody = z.object({
  businessName: z.string().min(1).max(120).optional(),
  logoUrl: z.string().nullable().optional(),
  themeMode: z.enum(THEME_MODES).optional(),
  primaryColor: z.string().min(1).max(40).optional(),
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

router.get("/settings", async (_req, res): Promise<void> => {
  const settings = await getOrCreateSettings();
  res.json(settings);
});

router.patch(
  "/settings",
  requirePermission("settings"),
  async (req, res): Promise<void> => {
    const parsed = SettingsUpdateBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    await getOrCreateSettings();

    const [row] = await db
      .update(settingsTable)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(settingsTable.id, SETTINGS_ID))
      .returning();

    res.json(row);
  }
);

export default router;

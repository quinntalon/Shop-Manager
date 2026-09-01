/**
 * remove-bg.ts
 *
 * Thin wrapper around the remove.bg REST API.
 * https://www.remove.bg/api
 *
 * Set the environment variable REMOVE_BG_API_KEY to your remove.bg API key.
 * If the key is not set the function throws immediately so the caller can
 * fall back gracefully to the original image.
 *
 * The function sends the image buffer as multipart/form-data and returns the
 * processed PNG as a Buffer with a transparent background.
 */

const REMOVE_BG_URL = "https://api.remove.bg/v1.0/removebg";

export class RemoveBgError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
  ) {
    super(message);
    this.name = "RemoveBgError";
  }
}

/**
 * Remove the background from an image buffer using the remove.bg API.
 *
 * @param imageBuffer  Raw bytes of the source image (JPG / PNG / WebP).
 * @param filename     Original filename — used only as the multipart name hint.
 * @returns            PNG buffer with transparent background.
 * @throws             RemoveBgError if the API returns an error or is not configured.
 */
export async function removeBackground(
  imageBuffer: Buffer,
  filename = "image.png",
): Promise<Buffer> {
  const apiKey = process.env.REMOVE_BG_API_KEY;
  if (!apiKey) {
    throw new RemoveBgError(
      "REMOVE_BG_API_KEY is not set. Background removal is disabled.",
    );
  }

  // Build multipart body — use the native FormData (Node 18+) / undici
  const form = new FormData();

  // Wrap the buffer in a Blob so FormData can attach it
  const blob = new Blob([imageBuffer], { type: "image/png" });
  form.append("image_file", blob, filename);
  form.append("size", "auto");        // let remove.bg pick the best resolution
  form.append("format", "png");       // always return a transparent PNG
  form.append("bg_color", "");        // no background colour — transparent

  const response = await fetch(REMOVE_BG_URL, {
    method: "POST",
    headers: {
      "X-Api-Key": apiKey,
      // Do NOT set Content-Type — fetch sets it automatically with boundary
    },
    body: form,
  });

  if (!response.ok) {
    // Try to extract a human-readable message from the JSON error body
    let detail = `HTTP ${response.status}`;
    try {
      const json = (await response.json()) as { errors?: { title: string }[] };
      if (json.errors?.length) {
        detail = json.errors.map((e) => e.title).join("; ");
      }
    } catch {
      // ignore parse errors — use the status code message
    }
    throw new RemoveBgError(`remove.bg API error: ${detail}`, response.status);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

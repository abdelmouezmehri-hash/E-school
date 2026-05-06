import { Router, type IRouter, type Request, type Response } from "express";
import { ObjectStorageService, ObjectNotFoundError } from "../lib/objectStorage";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();
const objectStorageService = new ObjectStorageService();

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
const ALLOWED_UPLOAD_MIME_PREFIXES = ["image/", "video/"];
const ALLOWED_UPLOAD_MIME_TYPES = new Set(["application/pdf"]);

function isSafeUploadName(name: unknown): name is string {
  return typeof name === "string" &&
    name.length > 0 &&
    name.length <= 255 &&
    !name.includes("/") &&
    !name.includes("\\") &&
    !name.includes("..") &&
    !/[\x00-\x1f\x7f]/.test(name);
}

function isAllowedContentType(contentType: unknown): contentType is string {
  if (typeof contentType !== "string") return false;
  const normalized = contentType.toLowerCase();
  return ALLOWED_UPLOAD_MIME_TYPES.has(normalized) ||
    ALLOWED_UPLOAD_MIME_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}


/**
 * POST /storage/uploads/request-url
 * Request a presigned URL for file upload. Requires auth.
 * Body: { name: string, size: number, contentType: string }
 * Response: { uploadURL: string, objectPath: string }
 */
router.post("/storage/uploads/request-url", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { name, size, contentType } = req.body ?? {};
  if (!isSafeUploadName(name)) {
    res.status(400).json({ error: "Invalid file name" });
    return;
  }
  if (!Number.isInteger(size) || size <= 0 || size > MAX_UPLOAD_BYTES) {
    res.status(400).json({ error: `File size must be between 1 byte and ${MAX_UPLOAD_BYTES} bytes` });
    return;
  }
  if (!isAllowedContentType(contentType)) {
    res.status(400).json({ error: "Unsupported content type" });
    return;
  }

  try {
    const uploadURL = await objectStorageService.getObjectEntityUploadURL();
    const objectPath = objectStorageService.normalizeObjectEntityPath(uploadURL);
    res.json({ uploadURL, objectPath, metadata: { name, size, contentType } });
  } catch (error: any) {
    console.error("Error generating presigned URL:", error);
    res.status(500).json({ error: "Failed to generate upload URL" });
  }
});

/**
 * GET /storage/objects/*
 * Serve uploaded private objects. Requires auth.
 */
router.get("/storage/objects/*path", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const objectPath = "/objects/" + (req.params as any).path;
  try {
    const file = await objectStorageService.getObjectEntityFile(objectPath);
    const response = await objectStorageService.downloadObject(file);
    const contentType = response.headers.get("Content-Type") ?? "application/octet-stream";
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");

    if (response.body) {
      const { Readable } = await import("stream");
      const readable = Readable.fromWeb(response.body as any);
      readable.pipe(res);
    } else {
      res.status(204).end();
    }
  } catch (error: any) {
    if (error instanceof ObjectNotFoundError) {
      res.status(404).json({ error: "Object not found" });
    } else {
      console.error("Error serving object:", error);
      res.status(500).json({ error: "Failed to serve object" });
    }
  }
});

/**
 * GET /storage/public-objects/*
 * Serve public assets — no auth required.
 */
router.get("/storage/public-objects/*path", async (req: Request, res: Response): Promise<void> => {
  const filePath = (req.params as any).path;
  try {
    const file = await objectStorageService.searchPublicObject(filePath);
    if (!file) {
      res.status(404).json({ error: "Public object not found" });
      return;
    }
    const response = await objectStorageService.downloadObject(file);
    const contentType = response.headers.get("Content-Type") ?? "application/octet-stream";
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=86400");

    if (response.body) {
      const { Readable } = await import("stream");
      const readable = Readable.fromWeb(response.body as any);
      readable.pipe(res);
    } else {
      res.status(204).end();
    }
  } catch (error: any) {
    console.error("Error serving public object:", error);
    res.status(500).json({ error: "Failed to serve object" });
  }
});

export default router;

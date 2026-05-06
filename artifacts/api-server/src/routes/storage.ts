import { Router, type IRouter, type Request, type Response } from "express";
import {
  ObjectStorageService,
  ObjectNotFoundError,
} from "../lib/objectStorage";
import { requireAuth } from "../middlewares/auth";
import { canAccessObject, ObjectPermission } from "../lib/objectAcl";

const router: IRouter = Router();
const objectStorageService = new ObjectStorageService();

/**
 * POST /storage/uploads/request-url
 * Request a presigned URL for file upload. Requires auth.
 * Body: { name: string, size: number, contentType: string }
 * Response: { uploadURL: string, objectPath: string }
 */
router.post(
  "/storage/uploads/request-url",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const { name, size, contentType } = req.body ?? {};
    const allowedContentTypes = (
      process.env.UPLOAD_ALLOWED_CONTENT_TYPES ??
      "image/jpeg,image/png,image/webp,application/pdf"
    )
      .split(",")
      .map((v) => v.trim());
    const maxSize = Number(process.env.UPLOAD_MAX_BYTES ?? 10 * 1024 * 1024);
    if (!name || !size || !contentType) {
      res
        .status(400)
        .json({ error: "Missing required fields: name, size, contentType" });
      return;
    }
    if (!allowedContentTypes.includes(contentType) || Number(size) > maxSize) {
      res
        .status(400)
        .json({ error: "Upload metadata rejected and quarantined" });
      return;
    }

    try {
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      const objectPath =
        objectStorageService.normalizeObjectEntityPath(uploadURL);
      res.json({
        uploadURL,
        objectPath,
        metadata: { name, size, contentType },
      });
    } catch (error: any) {
      console.error("Error generating presigned URL:", error);
      res.status(500).json({ error: "Failed to generate upload URL" });
    }
  },
);

/**
 * GET /storage/objects/*
 * Serve uploaded private objects. Requires auth.
 */
router.get(
  "/storage/objects/*path",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const objectPath = "/objects/" + (req.params as any).path;
    try {
      const file = await objectStorageService.getObjectEntityFile(objectPath);
      const user = (req as any).user;
      const allowed = await canAccessObject({
        userId: user?.id ? String(user.id) : undefined,
        objectFile: file,
        requestedPermission: ObjectPermission.READ,
      });
      if (!allowed && user?.role !== "admin") {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
      const response = await objectStorageService.downloadObject(file);
      const contentType =
        response.headers.get("Content-Type") ?? "application/octet-stream";
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
  },
);

/**
 * GET /storage/public-objects/*
 * Serve public assets — no auth required.
 */
router.get(
  "/storage/public-objects/*path",
  async (req: Request, res: Response): Promise<void> => {
    const filePath = (req.params as any).path;
    try {
      const file = await objectStorageService.searchPublicObject(filePath);
      if (!file) {
        res.status(404).json({ error: "Public object not found" });
        return;
      }
      const response = await objectStorageService.downloadObject(file);
      const contentType =
        response.headers.get("Content-Type") ?? "application/octet-stream";
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
  },
);

export default router;

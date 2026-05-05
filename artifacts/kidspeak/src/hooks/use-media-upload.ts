import { useState } from "react";

interface UploadResult {
  objectPath: string;
  url: string;
}

interface UseMediaUploadOptions {
  onSuccess?: (result: UploadResult) => void;
  onError?: (err: string) => void;
}

export function useMediaUpload(options?: UseMediaUploadOptions) {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  async function uploadFile(file: File): Promise<UploadResult | null> {
    setIsUploading(true);
    setProgress(0);
    try {
      const res = await fetch("/api/storage/uploads/request-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
      });
      if (!res.ok) throw new Error("Failed to get upload URL");
      const { uploadURL, objectPath } = await res.json();

      setProgress(20);
      const xhr = new XMLHttpRequest();
      await new Promise<void>((resolve, reject) => {
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setProgress(20 + Math.round((e.loaded / e.total) * 75));
        };
        xhr.onload = () => (xhr.status < 300 ? resolve() : reject(new Error("Upload failed")));
        xhr.onerror = () => reject(new Error("Upload failed"));
        xhr.open("PUT", uploadURL);
        xhr.setRequestHeader("Content-Type", file.type);
        xhr.send(file);
      });

      setProgress(100);
      const servingUrl = `/api/storage${objectPath}`;
      const result = { objectPath, url: servingUrl };
      options?.onSuccess?.(result);
      return result;
    } catch (err: any) {
      options?.onError?.(err.message ?? "Upload failed");
      return null;
    } finally {
      setIsUploading(false);
    }
  }

  return { uploadFile, isUploading, progress };
}

/**
 * Extract the YouTube video ID from any YouTube URL format:
 * - https://www.youtube.com/watch?v=XXXXXXXXXXX
 * - https://youtu.be/XXXXXXXXXXX
 * - https://www.youtube.com/embed/XXXXXXXXXXX
 * - https://www.youtube.com/shorts/XXXXXXXXXXX
 */
export function getYouTubeVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?(?:.*&)?v=)([A-Za-z0-9_-]{11})/,
    /(?:youtu\.be\/)([A-Za-z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([A-Za-z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([A-Za-z0-9_-]{11})/,
    /(?:youtube\.com\/v\/)([A-Za-z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

/**
 * Returns the best-quality thumbnail URL for a YouTube video.
 * Uses hqdefault (480×360) as it's universally available.
 */
export function getYouTubeThumbnailUrl(url: string): string | null {
  const id = getYouTubeVideoId(url);
  if (!id) return null;
  return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
}

/**
 * Convert any supported video URL to an iframe-embeddable URL.
 * Handles:
 * - Standard YouTube watch URLs
 * - youtu.be short links
 * - YouTube Shorts
 * - Already-embedded YouTube URLs (pass-through)
 * - Vimeo URLs
 * - Already-embedded Vimeo URLs (pass-through)
 */
export function getVideoEmbedUrl(url: string): string | null {
  if (!url) return null;

  // Already a YouTube embed URL — return as-is
  if (url.startsWith("https://www.youtube.com/embed/")) return url;

  // Already a Vimeo embed URL — return as-is
  if (url.startsWith("https://player.vimeo.com/video/")) return url;

  // YouTube (watch, short link, shorts)
  const ytId = getYouTubeVideoId(url);
  if (ytId) {
    return `https://www.youtube.com/embed/${ytId}?rel=0&modestbranding=1`;
  }

  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  }

  return null;
}

export function isEmbedUrl(url: string): boolean {
  return url.startsWith("https://www.youtube.com/embed/") ||
    url.startsWith("https://player.vimeo.com/");
}

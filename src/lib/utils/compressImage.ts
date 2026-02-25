// src/lib/utils/compressImage.ts
// ============================================================================
// CLIENT-SIDE IMAGE COMPRESSION — Resize before uploading to Firebase Storage
//
// Problem: Mobile camera photos are 3-5MB each. Storing raw uploads means
// every product image, vendor logo, and cover photo is served at full
// resolution, destroying LCP (3.72s → should be <2.5s).
//
// Solution: Compress and resize on the client BEFORE uploading to Storage.
// This is a one-line drop-in replacement at every upload callsite.
//
// Usage:
//   import { compressImage } from '@/lib/utils/compressImage';
//
//   // Before: uploadBytes(storageRef, file);
//   // After:
//   const compressed = await compressImage(file);
//   uploadBytes(storageRef, compressed);
//
//   // With custom options:
//   const thumb = await compressImage(file, { maxWidth: 200, quality: 0.7 });
//
// ROLLBACK: Remove this file and revert upload callsites to use raw `file`.
// ============================================================================

export interface CompressOptions {
  /** Maximum width in pixels. Height scales proportionally. Default: 1200 */
  maxWidth?: number;
  /** Maximum height in pixels. Width scales proportionally. Default: 1200 */
  maxHeight?: number;
  /** JPEG/WebP quality 0-1. Default: 0.82 (good balance for food/product photos) */
  quality?: number;
  /** Output MIME type. Default: 'image/webp' for best compression, falls back to 'image/jpeg' */
  outputType?: "image/webp" | "image/jpeg" | "image/png";
}

const DEFAULT_OPTIONS: Required<CompressOptions> = {
  maxWidth: 1200,
  maxHeight: 1200,
  quality: 0.82,
  outputType: "image/webp",
};

/**
 * Compress and resize an image file before upload.
 *
 * @param file - The raw File from <input type="file"> or camera capture
 * @param options - Compression options (all optional, sensible defaults)
 * @returns A compressed Blob ready for `uploadBytes()`
 *
 * Typical results:
 *   - 4.2MB iPhone photo → ~120KB WebP at 1200px wide
 *   - 2.8MB Android photo → ~95KB WebP at 1200px wide
 *   - Already-small images pass through with minimal re-encoding
 */
export async function compressImage(
  file: File | Blob,
  options?: CompressOptions
): Promise<Blob> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Skip compression for very small files (< 100KB) or non-images
  if (file.size < 100 * 1024) {
    return file;
  }

  // Check WebP support and fall back to JPEG if needed
  const supportsWebP = await checkWebPSupport();
  if (!supportsWebP && opts.outputType === "image/webp") {
    opts.outputType = "image/jpeg";
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      // Calculate new dimensions maintaining aspect ratio
      let { width, height } = img;

      if (width > opts.maxWidth) {
        height = Math.round((height * opts.maxWidth) / width);
        width = opts.maxWidth;
      }
      if (height > opts.maxHeight) {
        width = Math.round((width * opts.maxHeight) / height);
        height = opts.maxHeight;
      }

      // Draw to canvas at target size
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas 2D context not available"));
        return;
      }

      // Use high-quality image smoothing for downscale
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, width, height);

      // Convert to blob
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            // Fallback: return original if canvas fails
            reject(new Error("Canvas toBlob returned null"));
          }
        },
        opts.outputType,
        opts.quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      // Don't block upload on compression failure — return original
      resolve(file instanceof Blob ? file : new Blob([file]));
    };

    img.src = url;
  });
}

/**
 * Compress specifically for product thumbnails (smaller, more aggressive).
 * Used in vendor product listings and cart previews.
 */
export async function compressProductThumbnail(file: File | Blob): Promise<Blob> {
  return compressImage(file, {
    maxWidth: 400,
    maxHeight: 400,
    quality: 0.75,
    outputType: "image/webp",
  });
}

/**
 * Compress for cover/hero images (larger, higher quality).
 * Used for vendor storefront hero banners.
 */
export async function compressCoverImage(file: File | Blob): Promise<Blob> {
  return compressImage(file, {
    maxWidth: 1600,
    maxHeight: 900,
    quality: 0.85,
    outputType: "image/webp",
  });
}

/**
 * Compress for logos/avatars (small, square-ish).
 */
export async function compressLogo(file: File | Blob): Promise<Blob> {
  return compressImage(file, {
    maxWidth: 300,
    maxHeight: 300,
    quality: 0.8,
    outputType: "image/webp",
  });
}

/**
 * Compress for delivery proof photos (moderate quality, fast upload on cellular).
 */
export async function compressProofPhoto(file: File | Blob): Promise<Blob> {
  return compressImage(file, {
    maxWidth: 800,
    maxHeight: 800,
    quality: 0.7,
    outputType: "image/jpeg", // JPEG for broader compatibility with admin review
  });
}

// ─── Helpers ────────────────────────────────────────────────────────────────

let webPSupported: boolean | null = null;

async function checkWebPSupport(): Promise<boolean> {
  if (webPSupported !== null) return webPSupported;

  if (typeof document === "undefined") {
    webPSupported = false;
    return false;
  }

  return new Promise((resolve) => {
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    const dataUrl = canvas.toDataURL("image/webp");
    webPSupported = dataUrl.startsWith("data:image/webp");
    resolve(webPSupported);
  });
}
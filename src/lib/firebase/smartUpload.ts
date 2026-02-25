// src/lib/firebase/smartUpload.ts
// ============================================================================
// SMART UPLOAD — Drop-in replacement for Firebase uploadBytes that
// auto-compresses images before uploading to Storage.
//
// Instead of patching every upload callsite individually, this module
// wraps uploadBytes and detects image files automatically. Videos and
// non-image files pass through untouched.
//
// USAGE (two options):
//
//   Option A — Replace uploadBytes directly:
//     import { smartUploadBytes } from '@/lib/firebase/smartUpload';
//     await smartUploadBytes(storageRef, file);          // auto-compresses images
//     await smartUploadBytes(storageRef, file, metadata); // metadata preserved
//
//   Option B — Use the high-level helper:
//     import { uploadAndCompress } from '@/lib/firebase/smartUpload';
//     const url = await uploadAndCompress(file, `vendors/logos/${uid}/logo`);
//
// ROLLBACK: Replace smartUploadBytes imports with uploadBytes from firebase/storage.
// ============================================================================

import {
  ref,
  uploadBytes,
  getDownloadURL,
  getStorage,
  type StorageReference,
  type UploadMetadata,
  type UploadResult,
} from "firebase/storage";

// ── Compression settings per detected image purpose ────────────────────────

interface CompressOptions {
  maxWidth: number;
  maxHeight: number;
  quality: number;
  outputType: "image/webp" | "image/jpeg";
}

const COMPRESS_DEFAULTS: CompressOptions = {
  maxWidth: 1200,
  maxHeight: 1200,
  quality: 0.82,
  outputType: "image/webp",
};

// Auto-detect purpose from the Storage path and apply appropriate settings
function getCompressOptions(storagePath: string): CompressOptions {
  const path = storagePath.toLowerCase();

  // Logos / avatars / profile photos — small, square
  if (
    path.includes("/logo") ||
    path.includes("/avatar") ||
    path.includes("/profile") ||
    path.includes("driver_photos")
  ) {
    return { maxWidth: 300, maxHeight: 300, quality: 0.8, outputType: "image/webp" };
  }

  // Cover / banner / hero images — wide, high quality
  if (path.includes("/cover") || path.includes("/banner") || path.includes("/hero")) {
    return { maxWidth: 1600, maxHeight: 900, quality: 0.85, outputType: "image/webp" };
  }

  // Proof of delivery photos — moderate, fast upload on cellular
  if (path.includes("/deliveries") || path.includes("/proof")) {
    return { maxWidth: 800, maxHeight: 800, quality: 0.7, outputType: "image/jpeg" };
  }

  // Product images — standard
  if (path.includes("/product")) {
    return { maxWidth: 1200, maxHeight: 1200, quality: 0.82, outputType: "image/webp" };
  }

  // Default
  return COMPRESS_DEFAULTS;
}

// ── Core compression (runs in browser only) ────────────────────────────────

async function compressImageBlob(
  blob: Blob | File,
  opts: CompressOptions
): Promise<Blob> {
  // Skip tiny files (< 100KB) — not worth re-encoding
  if (blob.size < 100 * 1024) return blob;

  // Skip non-images
  const type = blob instanceof File ? blob.type : blob.type;
  if (!type.startsWith("image/")) return blob;

  // Check WebP support, fall back to JPEG
  const supportsWebP = await checkWebPSupport();
  const outputType =
    !supportsWebP && opts.outputType === "image/webp"
      ? "image/jpeg"
      : opts.outputType;

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);

    img.onload = () => {
      URL.revokeObjectURL(url);

      let { width, height } = img;

      // Scale down maintaining aspect ratio
      if (width > opts.maxWidth) {
        height = Math.round((height * opts.maxWidth) / width);
        width = opts.maxWidth;
      }
      if (height > opts.maxHeight) {
        width = Math.round((width * opts.maxHeight) / height);
        height = opts.maxHeight;
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(blob); // fallback: return original
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (result) => resolve(result || blob),
        outputType,
        opts.quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(blob); // fallback: return original on error
    };

    img.src = url;
  });
}

// ── WebP support check (cached) ────────────────────────────────────────────

let _webPSupported: boolean | null = null;

async function checkWebPSupport(): Promise<boolean> {
  if (_webPSupported !== null) return _webPSupported;
  if (typeof document === "undefined") {
    _webPSupported = false;
    return false;
  }
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  _webPSupported = canvas.toDataURL("image/webp").startsWith("data:image/webp");
  return _webPSupported;
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Drop-in replacement for Firebase `uploadBytes`.
 * Automatically compresses image files before uploading.
 * Videos, PDFs, and other file types pass through untouched.
 *
 * @param storageRef - Firebase Storage reference
 * @param data - File or Blob to upload
 * @param metadata - Optional upload metadata (preserved as-is)
 * @returns UploadResult (same as uploadBytes)
 */
export async function smartUploadBytes(
  storageRef: StorageReference,
  data: Blob | Uint8Array | ArrayBuffer,
  metadata?: UploadMetadata
): Promise<UploadResult> {
  // Only compress Blob/File types that are images
  if (data instanceof Blob && data.type.startsWith("image/")) {
    const opts = getCompressOptions(storageRef.fullPath);
    const compressed = await compressImageBlob(data, opts);
    return uploadBytes(storageRef, compressed, metadata);
  }

  // Pass through non-image data unchanged
  return uploadBytes(storageRef, data, metadata);
}

/**
 * High-level helper: compress + upload + return download URL.
 * Handles Storage ref creation internally.
 *
 * @param file - File or Blob to upload
 * @param storagePath - Full path in Firebase Storage (e.g. "vendors/logos/uid123/logo")
 * @param metadata - Optional upload metadata
 * @returns Download URL string
 */
export async function uploadAndCompress(
  file: File | Blob,
  storagePath: string,
  metadata?: UploadMetadata
): Promise<string> {
  const storage = getStorage();
  const storageRef = ref(storage, storagePath);
  await smartUploadBytes(storageRef, file, metadata);
  return getDownloadURL(storageRef);
}

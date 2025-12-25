"use client";

import { useState } from "react";
import { Share2, Heart, Check, Phone } from "lucide-react";

interface StorefrontActionsProps {
  storeName: string;
  storeSlug: string;
  phone?: string;
}

export default function StorefrontActions({ storeName, storeSlug, phone }: StorefrontActionsProps) {
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleShare = async () => {
    const url = `${window.location.origin}/store/${storeSlug}`;
    
    // Try native share first (mobile)
    if (navigator.share) {
      try {
        await navigator.share({
          title: storeName,
          text: `Check out ${storeName} on StackBot!`,
          url,
        });
        return;
      } catch (err) {
        // User cancelled or error, fall through to clipboard
      }
    }

    // Fallback to clipboard
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleSave = () => {
    // TODO: Implement actual save/favorite functionality with Firebase
    setSaved(!saved);
  };

  return (
    <div className="flex items-center gap-2">
      {/* Share Button */}
      <button
        onClick={handleShare}
        className="inline-flex items-center justify-center gap-2 bg-white/15 backdrop-blur-md text-white p-2.5 sm:px-4 sm:py-2.5 rounded-full text-sm font-medium hover:bg-white/25 transition border border-white/20"
        title="Share store"
      >
        {copied ? (
          <>
            <Check className="w-4 h-4" />
            <span className="hidden sm:inline">Copied!</span>
          </>
        ) : (
          <>
            <Share2 className="w-4 h-4" />
            <span className="hidden sm:inline">Share</span>
          </>
        )}
      </button>

      {/* Save/Favorite Button */}
      <button
        onClick={handleSave}
        className={`inline-flex items-center justify-center gap-2 p-2.5 sm:px-4 sm:py-2.5 rounded-full text-sm font-medium transition border ${
          saved
            ? "bg-red-500 text-white border-red-500"
            : "bg-white/15 backdrop-blur-md text-white border-white/20 hover:bg-white/25"
        }`}
        title={saved ? "Remove from favorites" : "Save to favorites"}
      >
        <Heart className={`w-4 h-4 ${saved ? "fill-current" : ""}`} />
        <span className="hidden sm:inline">{saved ? "Saved" : "Save"}</span>
      </button>

      {/* Quick Call Button - Mobile Only */}
      {phone && (
        <a
          href={`tel:${phone}`}
          className="sm:hidden inline-flex items-center justify-center bg-white/15 backdrop-blur-md text-white p-2.5 rounded-full hover:bg-white/25 transition border border-white/20"
          title="Call store"
        >
          <Phone className="w-4 h-4" />
        </a>
      )}
    </div>
  );
}
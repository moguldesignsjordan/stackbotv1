// src/app/store/[slug]/StorefrontActions.tsx
"use client";

import { useState } from "react";
import { Share2, Heart, Check } from "lucide-react";
import { sanitizeSlug } from "@/lib/utils/slug";
import { useLanguage } from "@/contexts/LanguageContext";

interface StorefrontActionsProps {
  storeName: string;
  storeSlug: string;
}

export default function StorefrontActions({ storeName, storeSlug }: StorefrontActionsProps) {
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const { language } = useLanguage();

  const handleShare = async () => {
    const cleanSlug = sanitizeSlug(storeSlug);
    const url = `${window.location.origin}/store/${cleanSlug}`;
    
    // Bilingual share text
    const shareText = language === 'en' 
      ? `Check out ${storeName} on StackBot!`
      : `¡Mira ${storeName} en StackBot!`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: storeName,
          text: shareText,
          url,
        });
        return;
      } catch (err) {}
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleSave = () => {
    setSaved(!saved);
  };

  // Bilingual labels (follows global language setting)
  const copiedText = language === 'en' ? 'Copied!' : '¡Copiado!';
  const shareText = language === 'en' ? 'Share' : 'Compartir';
  const savedText = language === 'en' ? 'Saved' : 'Guardado';
  const saveText = language === 'en' ? 'Save' : 'Guardar';

  return (
    <div className="flex items-center gap-2">
      {/* Share Button */}
      <button
        onClick={handleShare}
        className="inline-flex items-center justify-center gap-2 bg-white/15 backdrop-blur-md text-white p-2.5 sm:px-4 sm:py-2.5 rounded-full text-sm font-medium hover:bg-white/25 transition border border-white/20"
      >
        {copied ? (
          <>
            <Check className="w-4 h-4" />
            <span className="hidden sm:inline">{copiedText}</span>
          </>
        ) : (
          <>
            <Share2 className="w-4 h-4" />
            <span className="hidden sm:inline">{shareText}</span>
          </>
        )}
      </button>

      {/* Save Button */}
      <button
        onClick={handleSave}
        className={`inline-flex items-center justify-center gap-2 p-2.5 sm:px-4 sm:py-2.5 rounded-full text-sm font-medium transition border ${
          saved
            ? "bg-red-500 text-white border-red-500"
            : "bg-white/15 backdrop-blur-md text-white border-white/20 hover:bg-white/25"
        }`}
      >
        <Heart className={`w-4 h-4 ${saved ? "fill-current" : ""}`} />
        <span className="hidden sm:inline">{saved ? savedText : saveText}</span>
      </button>
    </div>
  );
}
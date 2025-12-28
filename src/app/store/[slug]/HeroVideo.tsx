// src/app/store/[slug]/HeroVideo.tsx
"use client";

interface HeroVideoProps {
  src: string;
}

export default function HeroVideo({ src }: HeroVideoProps) {
  return (
    <video
      src={src}
      autoPlay
      muted
      loop
      playsInline
      className="absolute inset-0 w-full h-full object-cover"
    />
  );
}
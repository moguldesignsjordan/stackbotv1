// src/app/store/[slug]/StoreErrorState.tsx
"use client";

import Link from "next/link";
import { ArrowLeft, Store } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

type ErrorType = "invalidUrl" | "storeNotFound";

interface StoreErrorStateProps {
  type: ErrorType;
}

export default function StoreErrorState({ type }: StoreErrorStateProps) {
  const { language } = useLanguage();

  const content = {
    invalidUrl: {
      title: language === "en" ? "Invalid Store URL" : "URL de Tienda Inválida",
      message: language === "en"
        ? "The store link appears to be broken."
        : "El enlace de la tienda parece estar roto.",
      linkText: language === "en" ? "Back to Home" : "Volver al Inicio",
    },
    storeNotFound: {
      title: language === "en" ? "Store Not Found" : "Tienda No Encontrada",
      message: language === "en"
        ? "This vendor doesn't exist or has been removed."
        : "Este vendedor no existe o ha sido eliminado.",
      linkText: language === "en" ? "Back to Home" : "Volver al Inicio",
    },
  };

  const { title, message, linkText } = content[type];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-gray-600 gap-4 px-4 bg-gray-50">
      <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center">
        <Store className="w-10 h-10 text-gray-300" />
      </div>
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="text-gray-500 text-center max-w-sm">{message}</p>
      <Link
        href="/"
        className="mt-4 inline-flex items-center gap-2 text-[#55529d] font-semibold hover:underline"
      >
        <ArrowLeft className="w-4 h-4" />
        {linkText}
      </Link>
    </div>
  );
}
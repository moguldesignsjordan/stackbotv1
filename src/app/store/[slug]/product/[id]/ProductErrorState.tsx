// src/app/store/[slug]/product/[id]/ProductErrorState.tsx
"use client";

import Link from "next/link";
import { ArrowLeft, Package } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

type ErrorType = 
  | "invalidUrl" 
  | "storeNotFound" 
  | "productNotFound" 
  | "productUnavailable";

interface ProductErrorStateProps {
  type: ErrorType;
  storeSlug?: string;
}

export default function ProductErrorState({ type, storeSlug }: ProductErrorStateProps) {
  const { language } = useLanguage();

  const content = {
    invalidUrl: {
      title: language === "en" ? "Invalid Product URL" : "URL de Producto Inválida",
      message: language === "en" 
        ? "The product link appears to be broken." 
        : "El enlace del producto parece estar roto.",
      linkHref: "/",
      linkText: language === "en" ? "Back to Home" : "Volver al Inicio",
    },
    storeNotFound: {
      title: language === "en" ? "Store Not Found" : "Tienda No Encontrada",
      message: language === "en" 
        ? "The store you're looking for doesn't exist." 
        : "La tienda que buscas no existe.",
      linkHref: "/",
      linkText: language === "en" ? "Back to Home" : "Volver al Inicio",
    },
    productNotFound: {
      title: language === "en" ? "Product Not Found" : "Producto No Encontrado",
      message: language === "en" 
        ? "This product doesn't exist or has been removed." 
        : "Este producto no existe o ha sido eliminado.",
      linkHref: storeSlug ? `/store/${storeSlug}` : "/",
      linkText: language === "en" ? "Back to Store" : "Volver a la Tienda",
    },
    productUnavailable: {
      title: language === "en" ? "Product Unavailable" : "Producto No Disponible",
      message: language === "en" 
        ? "This product is currently unavailable." 
        : "Este producto no está disponible actualmente.",
      linkHref: storeSlug ? `/store/${storeSlug}` : "/",
      linkText: language === "en" ? "Back to Store" : "Volver a la Tienda",
    },
  };

  const { title, message, linkHref, linkText } = content[type];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-gray-600 gap-4 bg-gray-50">
      <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center">
        <Package className="w-10 h-10 text-gray-300" />
      </div>
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="text-gray-500 text-center max-w-sm">{message}</p>
      <Link
        href={linkHref}
        className="mt-4 inline-flex items-center gap-2 text-[#55529d] font-semibold hover:underline"
      >
        <ArrowLeft className="w-4 h-4" />
        {linkText}
      </Link>
    </div>
  );
}
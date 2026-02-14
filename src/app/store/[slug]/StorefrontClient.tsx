// src/app/store/[slug]/StorefrontClient.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import {
  MapPin,
  Phone,
  Globe,
  Star,
  Mail,
  MessageCircle,
  ArrowLeft,
  Store,
  ShoppingBag,
  ShoppingCart,
  ChevronRight,
  Sparkles,
  Truck,
  Package,
  Briefcase,
  BadgeCheck,
  Clock,
} from "lucide-react";
import StorefrontActions from "./StorefrontActions";
import ReviewsSection from "./ReviewsSection";
import HeroVideo from "./HeroVideo";
import BookingSection from "@/components/vendor/BookingSection";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCart } from "@/contexts/CartContext";
import { getStoreStatus, formatTime12h, type StoreHours, type DayOfWeek } from "@/lib/utils/store-hours";

// Social Icons
function InstagramIcon({ className }: { className?: string }) {
  return <svg className={className} fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" /></svg>;
}
function FacebookIcon({ className }: { className?: string }) {
  return <svg className={className} fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>;
}
function TikTokIcon({ className }: { className?: string }) {
  return <svg className={className} fill="currentColor" viewBox="0 0 24 24"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" /></svg>;
}
function TwitterIcon({ className }: { className?: string }) {
  return <svg className={className} fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>;
}
function YouTubeIcon({ className }: { className?: string }) {
  return <svg className={className} fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" /></svg>;
}

/* ======================================================
   STORE HOURS DISPLAY (Sidebar)
====================================================== */

const DAY_ORDER: DayOfWeek[] = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

const DAY_LABELS: Record<DayOfWeek, { en: string; es: string }> = {
  monday:    { en: "Mon", es: "Lun" },
  tuesday:   { en: "Tue", es: "Mar" },
  wednesday: { en: "Wed", es: "Mié" },
  thursday:  { en: "Thu", es: "Jue" },
  friday:    { en: "Fri", es: "Vie" },
  saturday:  { en: "Sat", es: "Sáb" },
  sunday:    { en: "Sun", es: "Dom" },
};

function StoreHoursDisplay({ storeHours, language }: { storeHours: StoreHours; language: string }) {
  const now = new Date();
  const drTime = new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone: "America/Santo_Domingo" }).format(now).toLowerCase() as DayOfWeek;

  return (
    <div className="space-y-1.5">
      {DAY_ORDER.map((day) => {
        const schedule = storeHours[day];
        if (!schedule) return null;
        const isToday = day === drTime;
        const label = language === "es" ? DAY_LABELS[day].es : DAY_LABELS[day].en;

        return (
          <div
            key={day}
            className={`flex items-center justify-between text-sm py-1 px-2 rounded-lg ${
              isToday ? "bg-purple-50 font-medium" : ""
            }`}
          >
            <span className={isToday ? "text-purple-700" : "text-gray-600"}>
              {label}
              {isToday && (
                <span className="ml-1.5 text-[10px] font-bold text-purple-500 uppercase">
                  {language === "es" ? "hoy" : "today"}
                </span>
              )}
            </span>
            {schedule.open ? (
              <span className={isToday ? "text-purple-700" : "text-gray-700"}>
                {formatTime12h(schedule.openTime)} – {formatTime12h(schedule.closeTime)}
              </span>
            ) : (
              <span className="text-red-400 text-xs font-medium">
                {language === "es" ? "Cerrado" : "Closed"}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Props passed from page.tsx (Server Component)
interface StorefrontClientProps {
  vendor: any;
  vendorId: string;
  storeSlug: string;
  products: any[];
  coverMedia: string;
  isVideo: boolean;
  socialLinks: any;
  whatsappLink: string | null;
  vendorCategory: string;
  serviceTypes: {
    delivery: boolean;
    pickup: boolean;
    services: boolean;
  };
}

export default function StorefrontClient({
  vendor,
  vendorId,
  storeSlug,
  products,
  coverMedia,
  isVideo,
  socialLinks,
  whatsappLink,
  vendorCategory,
  serviceTypes,
}: StorefrontClientProps) {
  
  // ✅ Hook for Translation & Currency
  const { t, formatCurrency, language } = useLanguage();
  
  // ✅ Cart state for floating button
  const { itemCount } = useCart();
  
  const hasSocialLinks = Object.values(socialLinks).some(Boolean);
  const hasServiceTypes = Object.values(serviceTypes).some(Boolean);

  // ✅ Store hours status
  const storeStatus = getStoreStatus(vendor.store_hours, language);
  const isClosed = !storeStatus.isOpen;

  // ✅ Bilingual item count
  const itemCountText = language === 'en' 
    ? `${products.length} items` 
    : `${products.length} artículos`;

  // ✅ Bilingual "Services" label
  const servicesLabel = language === 'en' ? 'Services' : 'Servicios';

  // ✅ Bilingual no products message
  const noProductsMessage = language === 'en'
    ? 'This vendor has not added any products yet.'
    : 'Este vendedor aún no ha agregado productos.';

  return (
    <div className="bg-gray-50 min-h-screen pb-24">
      {/* HERO WITH VIDEO/IMAGE SUPPORT */}
      <section className="relative h-[340px] md:h-[420px] w-full overflow-hidden">
        {isVideo ? (
          <HeroVideo src={coverMedia} />
        ) : (
          <Image
            src={coverMedia}
            alt={vendor.name}
            fill
            className="object-cover"
            priority
          />
        )}
        
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
        
        {/* Back button */}
        <Link
          href="/"
          className="absolute top-[64px] left-4 z-10 inline-flex items-center justify-center bg-white/15 backdrop-blur-md text-white w-10 h-10 rounded-full hover:bg-white/25 transition border border-white/20"
          title={t('product.backToHome')}
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>

        {/* Store Actions (includes Language Toggle) */}
        <div className="absolute top-[64px] right-4 z-10">
          <StorefrontActions 
            storeName={vendor.name} 
            storeSlug={storeSlug}
          />
        </div>

        {/* Store Info Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-end gap-4 md:gap-6">
              {/* Logo */}
              {vendor.logoUrl && (
                <div className="w-20 h-20 md:w-28 md:h-28 rounded-2xl bg-white shadow-xl overflow-hidden flex-shrink-0 ring-4 ring-white/20">
                  <Image
                    src={vendor.logoUrl}
                    alt={vendor.name}
                    width={112}
                    height={112}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              
              {/* Name & Meta */}
              <div className="flex-1 min-w-0 pb-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl md:text-4xl font-bold text-white drop-shadow-lg truncate">
                    {vendor.name}
                  </h1>
                  {vendor.verified && (
                    <BadgeCheck className="w-6 h-6 md:w-7 md:h-7 text-blue-400 flex-shrink-0" />
                  )}
                </div>
                
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  {vendor.featured && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-yellow-400/90 text-yellow-900 text-sm font-semibold rounded-full">
                      <Sparkles className="w-3.5 h-3.5" />
                      {t('products.featured')}
                    </span>
                  )}

                  {vendor.isNew && (
                    <span className="inline-flex px-3 py-1 bg-green-500 text-white text-sm font-medium rounded-full">
                      {t('common.new')}
                    </span>
                  )}

                  {vendorCategory && (
                    <span className="inline-flex px-3 py-1 bg-white/20 backdrop-blur-md text-white text-sm font-medium rounded-full">
                      {vendorCategory}
                    </span>
                  )}

                  {/* Store hours open/closed badge */}
                  {vendor.store_hours && (
                    storeStatus.isOpen ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-500/90 backdrop-blur-md text-white text-sm font-semibold rounded-full">
                        <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                        {storeStatus.label}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-500/90 backdrop-blur-md text-white text-sm font-semibold rounded-full">
                        <Clock className="w-3.5 h-3.5" />
                        {storeStatus.label}
                      </span>
                    )
                  )}
                  
                  {vendor.rating && (
                    <div className="flex items-center gap-1 text-white">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      <span className="font-semibold">{vendor.rating.toFixed(1)}</span>
                      {vendor.total_reviews && (
                        <span className="text-white/70 text-sm">
                          ({vendor.total_reviews})
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {hasServiceTypes && (
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    {serviceTypes.delivery && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white/15 backdrop-blur-md text-white text-xs font-medium rounded-full border border-white/20">
                        <Truck className="w-3.5 h-3.5" />
                        {t('fulfillment.delivery')}
                      </span>
                    )}
                    {serviceTypes.pickup && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white/15 backdrop-blur-md text-white text-xs font-medium rounded-full border border-white/20">
                        <Package className="w-3.5 h-3.5" />
                        {t('fulfillment.pickup')}
                      </span>
                    )}
                    {serviceTypes.services && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white/15 backdrop-blur-md text-white text-xs font-medium rounded-full border border-white/20">
                        <Briefcase className="w-3.5 h-3.5" />
                        {servicesLabel}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CLOSED BANNER */}
      {isClosed && vendor.store_hours && (
        <div className="bg-red-50 border-b border-red-100">
          <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 flex items-center justify-center gap-3">
            <Clock className="w-4 h-4 text-red-500 flex-shrink-0" />
            <p className="text-sm font-medium text-red-700">
              {language === "es" ? "Esta tienda está cerrada ahora" : "This store is currently closed"}
              {storeStatus.detail && (
                <span className="text-red-500 font-normal"> · {storeStatus.detail}</span>
              )}
            </p>
          </div>
        </div>
      )}

      {/* MAIN CONTENT */}
      <section className="max-w-7xl mx-auto px-4 md:px-6 py-8 grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8">
        {/* LEFT: INFO + PRODUCTS + REVIEWS */}
        <div className="space-y-8">
          {/* CONTACT INFO */}
          <div className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
            {vendor.address && (
              <a
                href={`https://maps.google.com/?q=${encodeURIComponent(vendor.address)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex gap-3 items-start group hover:opacity-70 transition-opacity"
              >
                <MapPin className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 group-hover:underline">{vendor.address}</span>
              </a>
            )}
            
            {vendor.phone && (
              <a
                href={`tel:${vendor.phone}`}
                className="flex gap-3 items-center group hover:opacity-70 transition-opacity"
              >
                <Phone className="h-5 w-5 text-gray-400" />
                <span className="text-gray-700 group-hover:underline">{vendor.phone}</span>
              </a>
            )}
            
            {vendor.email && (
              <div className="flex gap-3 items-center">
                <Mail className="h-5 w-5 text-gray-400" />
                <a href={`mailto:${vendor.email}`} className="text-[#55529d] hover:underline font-medium">
                  {vendor.email}
                </a>
              </div>
            )}
            
            {vendor.website && (
              <div className="flex gap-3 items-center">
                <Globe className="h-5 w-5 text-gray-400" />
                <a
                  href={vendor.website.startsWith("http") ? vendor.website : `https://${vendor.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#55529d] hover:underline font-medium"
                >
                  {vendor.website.replace(/^https?:\/\/(www\.)?/, "")}
                </a>
              </div>
            )}

            {/* Social Media Icons */}
            {hasSocialLinks && (
              <div className="pt-4 border-t border-gray-100">
                <p className="text-sm text-gray-500 mb-3">{t('footer.followUs')}</p>
                <div className="flex items-center gap-3">
                  {socialLinks.instagram && (
                    <a
                      href={socialLinks.instagram.startsWith("http") ? socialLinks.instagram : `https://instagram.com/${socialLinks.instagram.replace("@", "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-10 h-10 bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 rounded-xl flex items-center justify-center text-white hover:scale-110 transition-transform"
                    >
                      <InstagramIcon className="w-5 h-5" />
                    </a>
                  )}
                  {socialLinks.facebook && (
                    <a
                      href={socialLinks.facebook.startsWith("http") ? socialLinks.facebook : `https://facebook.com/${socialLinks.facebook}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-10 h-10 bg-[#1877F2] rounded-xl flex items-center justify-center text-white hover:scale-110 transition-transform"
                    >
                      <FacebookIcon className="w-5 h-5" />
                    </a>
                  )}
                  {socialLinks.tiktok && (
                    <a
                      href={socialLinks.tiktok.startsWith("http") ? socialLinks.tiktok : `https://tiktok.com/@${socialLinks.tiktok.replace("@", "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-10 h-10 bg-black rounded-xl flex items-center justify-center text-white hover:scale-110 transition-transform"
                    >
                      <TikTokIcon className="w-5 h-5" />
                    </a>
                  )}
                  {socialLinks.twitter && (
                    <a
                      href={socialLinks.twitter.startsWith("http") ? socialLinks.twitter : `https://x.com/${socialLinks.twitter.replace("@", "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-10 h-10 bg-black rounded-xl flex items-center justify-center text-white hover:scale-110 transition-transform"
                    >
                      <TwitterIcon className="w-5 h-5" />
                    </a>
                  )}
                  {socialLinks.youtube && (
                    <a
                      href={socialLinks.youtube.startsWith("http") ? socialLinks.youtube : `https://youtube.com/${socialLinks.youtube}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-10 h-10 bg-[#FF0000] rounded-xl flex items-center justify-center text-white hover:scale-110 transition-transform"
                    >
                      <YouTubeIcon className="w-5 h-5" />
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ABOUT / DESCRIPTION */}
          {(vendor.description || vendor.business_description) && (
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h3 className="font-semibold text-lg mb-3 text-gray-900">{t('footer.about')}</h3>
              <p className="text-gray-600 leading-relaxed">
                {vendor.description || vendor.business_description}
              </p>
              
              {vendor.badges?.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="flex flex-wrap items-center gap-2">
                    {vendor.badges.map((badge: string, idx: number) => (
                      <span
                        key={idx}
                        className="inline-flex px-3 py-1.5 bg-purple-50 text-purple-700 text-sm font-medium rounded-full"
                      >
                        {badge}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* PRODUCTS */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900">{t('products.title')}</h2>
              <span className="text-gray-500 text-sm">{itemCountText}</span>
            </div>

            {products.length === 0 ? (
              <div className="bg-white p-12 rounded-2xl shadow-sm text-center">
                <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">{noProductsMessage}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {products.map((product: any) => (
                  <Link
                    key={product.id}
                    href={`/store/${storeSlug}/product/${product.id}`}
                    className="group"
                  >
                    <div className="bg-white rounded-2xl shadow-sm overflow-hidden hover:shadow-md transition-all duration-300 hover:-translate-y-0.5">
                      <div className="flex gap-4 p-4">
                        <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100">
                          <Image
                            src={product.images?.[0] || "/placeholder.png"}
                            fill
                            alt={product.name}
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>

                        <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                          <div>
                            <h3 className="font-semibold text-[#55529d] group-hover:text-[#444287] transition-colors line-clamp-1">
                              {product.name}
                            </h3>
                            {product.description && (
                              <p className="text-sm text-gray-500 line-clamp-2 mt-1">
                                {product.description}
                              </p>
                            )}
                          </div>
                          
                          <div className="flex items-center justify-between mt-2">
                            {/* ✅ TRANSLATED CURRENCY */}
                            <p className="text-[#55529d] font-bold text-lg">
                              {formatCurrency(typeof product.price === 'number' ? product.price : 0)}
                            </p>
                            <span className="text-gray-400 text-sm flex items-center gap-1 group-hover:text-[#55529d] transition-colors">
                              {t('common.view')} <ChevronRight className="w-4 h-4" />
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="lg:hidden">
            {vendor.booking_url && (
              <BookingSection calLink={vendor.booking_url} />
            )}
          </div>

          <ReviewsSection vendorId={vendorId} vendorName={vendor.name} />
        </div>

        {/* RIGHT SIDEBAR - Desktop Only */}
        <aside className="hidden lg:block space-y-6">
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h3 className="font-semibold text-lg mb-4 text-gray-900">{t('vendors.contact')}</h3>
            
            <div className="space-y-3">
              {whatsappLink && (
                <a
                  href={whatsappLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-3.5 px-4 bg-[#25D366] text-white rounded-xl font-medium hover:bg-[#20BD5A] transition-colors shadow-sm"
                >
                  <MessageCircle className="w-5 h-5" />
                  WhatsApp
                </a>
              )}
              
              {vendor.email && (
                <a
                  href={`mailto:${vendor.email}`}
                  className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                >
                  <Mail className="w-4 h-4" />
                  {t('form.sendMessage')}
                </a>
              )}
            </div>

            {(vendor.store_hours || vendor.hours) && (
              <div className="mt-6 pt-6 border-t border-gray-100">
                <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-400" />
                  {language === 'en' ? 'Store Hours' : 'Horario'}
                </h4>
                {vendor.store_hours ? (
                  <StoreHoursDisplay storeHours={vendor.store_hours} language={language} />
                ) : (
                  <p className="text-sm text-gray-600">{vendor.hours}</p>
                )}
              </div>
            )}

            {hasServiceTypes && (
              <div className="mt-6 pt-6 border-t border-gray-100">
                <h4 className="font-medium text-gray-900 mb-3">
                  {language === 'en' ? 'Available Options' : 'Opciones Disponibles'}
                </h4>
                <div className="flex flex-wrap gap-2">
                  {serviceTypes.delivery && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 text-sm font-medium rounded-full">
                      <Truck className="w-4 h-4" />
                      {t('fulfillment.delivery')}
                    </span>
                  )}
                  {serviceTypes.pickup && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 text-sm font-medium rounded-full">
                      <Package className="w-4 h-4" />
                      {t('fulfillment.pickup')}
                    </span>
                  )}
                  {serviceTypes.services && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 text-purple-700 text-sm font-medium rounded-full">
                      <Briefcase className="w-4 h-4" />
                      {servicesLabel}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {vendor.booking_url && (
            <BookingSection calLink={vendor.booking_url} />
          )}
        </aside>
      </section>

      {/* FLOATING CART BUTTON - Mobile */}
      {itemCount > 0 && (
        <Link
          href="/cart"
          className="fixed bottom-6 left-4 right-4 lg:hidden bg-[#55529d] text-white rounded-full py-3.5 px-6 flex items-center justify-between shadow-lg shadow-[#55529d]/30 z-50 hover:bg-[#444287] transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 bg-white/20 rounded-full flex items-center justify-center">
              <ShoppingCart className="w-4 h-4" />
            </div>
            <span className="font-semibold text-sm">
              {language === "es" ? "Ver carrito" : "View Cart"}
            </span>
          </div>
          <span className="font-bold">{itemCount}</span>
        </Link>
      )}
    </div>
  );
}
import { db } from "@/lib/firebase/config";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
} from "firebase/firestore";
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
  Clock,
  Truck,
  CheckCircle2,
  Share2,
  Heart,
  ChevronRight,
  Package,
  BadgeCheck,
  Sparkles,
} from "lucide-react";
import StorefrontActions from "./StorefrontActions";

type PageProps = {
  params: Promise<{ slug?: string }>;
};

// Helper to check if store is open
function getStoreStatus(hours?: Record<string, { open: string; close: string }>) {
  if (!hours) return { isOpen: null, nextChange: null };
  
  const now = new Date();
  const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const today = days[now.getDay()];
  const todayHours = hours[today];
  
  if (!todayHours || !todayHours.open || !todayHours.close) {
    return { isOpen: null, nextChange: null };
  }
  
  const currentTime = now.getHours() * 100 + now.getMinutes();
  const openTime = parseInt(todayHours.open.replace(":", ""));
  const closeTime = parseInt(todayHours.close.replace(":", ""));
  
  const isOpen = currentTime >= openTime && currentTime < closeTime;
  
  return {
    isOpen,
    nextChange: isOpen ? `Closes at ${todayHours.close}` : `Opens at ${todayHours.open}`,
  };
}

export default async function VendorStorefront({ params }: PageProps) {
  const { slug } = await params;

  if (!slug) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Store className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-gray-600">Invalid store URL</h1>
        </div>
      </div>
    );
  }

  /* ===============================
     1️⃣ FIND VENDOR BY SLUG OR ID
  =============================== */
  let vendor: any = null;
  let vendorId: string = "";

  const vendorQuery = await getDocs(
    query(collection(db, "vendors"), where("slug", "==", slug))
  );

  if (!vendorQuery.empty) {
    const vendorDoc = vendorQuery.docs[0];
    vendor = vendorDoc.data();
    vendorId = vendorDoc.id;
  } else {
    const vendorRef = doc(db, "vendors", slug);
    const vendorSnap = await getDoc(vendorRef);
    
    if (vendorSnap.exists()) {
      vendor = vendorSnap.data();
      vendorId = vendorSnap.id;
    }
  }

  if (!vendor) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 gap-4 px-4">
        <Store className="w-20 h-20 text-gray-300" />
        <h1 className="text-2xl font-bold text-gray-900">Store Not Found</h1>
        <p className="text-gray-500 text-center">This vendor doesn't exist or has been removed.</p>
        <Link 
          href="/" 
          className="mt-4 inline-flex items-center gap-2 bg-[#55529d] text-white px-6 py-3 rounded-xl font-semibold hover:bg-[#444287] transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>
      </div>
    );
  }

  const storeSlug = vendor.slug || vendorId;
  const storeStatus = getStoreStatus(vendor.hours);
  const displayName = vendor.name || vendor.business_name;

  /* ===============================
     2️⃣ LOAD PRODUCTS
  =============================== */
  const productsSnap = await getDocs(
    query(
      collection(db, "vendors", vendorId, "products"),
      orderBy("created_at", "desc")
    )
  );

  const allProducts = productsSnap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((p: any) => p.active !== false);

  // Separate featured products
  const featuredProducts = allProducts.filter((p: any) => p.featured);
  const regularProducts = allProducts.filter((p: any) => !p.featured);

  /* ===============================
     3️⃣ RENDER STOREFRONT
  =============================== */
  return (
    <div className="bg-gray-50 min-h-screen pb-24">
      {/* ============ HERO ============ */}
      <section className="relative h-[280px] sm:h-[340px] md:h-[400px] w-full overflow-hidden">
        <Image
          src={vendor.cover_image_url || vendor.banner_url || "/store-cover-placeholder.jpg"}
          alt={`${displayName} cover`}
          fill
          priority
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/20" />

        {/* Top Bar */}
        <div className="absolute top-0 left-0 right-0 z-20 p-4 sm:p-6 flex items-center justify-between">
          <Link 
            href="/"
            className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-md text-white px-4 py-2.5 rounded-full text-sm font-medium hover:bg-white/25 transition border border-white/20"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back to Explore</span>
            <span className="sm:hidden">Back</span>
          </Link>

          <StorefrontActions 
            storeName={displayName} 
            storeSlug={storeSlug}
            phone={vendor.phone}
          />
        </div>

        {/* Hero Content */}
        <div className="relative z-10 h-full flex items-end">
          <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 pb-6 sm:pb-10">
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 sm:items-end">
              {/* Logo */}
              <div className="bg-white rounded-2xl p-1.5 sm:p-2 shadow-2xl w-fit ring-4 ring-white/20">
                <Image
                  src={vendor.logoUrl || vendor.logo_url || "/placeholder.png"}
                  width={100}
                  height={100}
                  alt={displayName}
                  className="rounded-xl object-cover w-20 h-20 sm:w-[100px] sm:h-[100px]"
                />
              </div>

              {/* Info */}
              <div className="flex-1 text-white space-y-2 sm:space-y-3">
                {/* Badges Row */}
                <div className="flex flex-wrap items-center gap-2">
                  {(vendor.categories?.[0] || vendor.category) && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs sm:text-sm font-medium bg-white/20 backdrop-blur-sm border border-white/10">
                      {vendor.categories?.[0] || vendor.category}
                    </span>
                  )}
                  {vendor.verified && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs sm:text-sm font-medium bg-blue-500/80 backdrop-blur-sm">
                      <BadgeCheck className="w-3.5 h-3.5" />
                      Verified
                    </span>
                  )}
                  {storeStatus.isOpen !== null && (
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs sm:text-sm font-medium backdrop-blur-sm ${
                      storeStatus.isOpen 
                        ? "bg-green-500/80 text-white" 
                        : "bg-red-500/80 text-white"
                    }`}>
                      <span className={`w-2 h-2 rounded-full ${storeStatus.isOpen ? "bg-white animate-pulse" : "bg-white/60"}`} />
                      {storeStatus.isOpen ? "Open Now" : "Closed"}
                    </span>
                  )}
                </div>

                {/* Name */}
                <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold tracking-tight">
                  {displayName}
                </h1>

                {/* Rating & Reviews */}
                <div className="flex items-center gap-3 text-white/90">
                  <div className="flex items-center gap-1.5">
                    <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                    <span className="font-semibold">
                      {vendor.rating ? vendor.rating.toFixed(1) : "New"}
                    </span>
                  </div>
                  {vendor.total_reviews > 0 && (
                    <span className="text-sm text-white/70">
                      ({vendor.total_reviews} review{vendor.total_reviews !== 1 ? "s" : ""})
                    </span>
                  )}
                  {vendor.total_orders > 0 && (
                    <>
                      <span className="text-white/40">•</span>
                      <span className="text-sm text-white/70">
                        {vendor.total_orders}+ orders
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

    

      {/* ============ MAIN CONTENT ============ */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 mt-6 sm:mt-10">
        <div className="grid lg:grid-cols-3 gap-6 lg:gap-10">
          {/* LEFT COLUMN - Products */}
          <div className="lg:col-span-2 space-y-8">
            {/* Featured Products */}
            {featuredProducts.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-5 h-5 text-amber-500" />
                  <h2 className="text-xl font-bold text-gray-900">Featured</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {featuredProducts.map((product: any) => (
                    <ProductCard 
                      key={product.id} 
                      product={product} 
                      storeSlug={storeSlug}
                      vendorId={vendorId}
                      vendorName={displayName}
                      featured
                    />
                  ))}
                </div>
              </div>
            )}

            {/* All Products */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                  {featuredProducts.length > 0 ? "All Products" : "Products"}
                </h2>
                <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                  {allProducts.length} item{allProducts.length !== 1 ? "s" : ""}
                </span>
              </div>

              {allProducts.length === 0 ? (
                <div className="bg-white p-12 rounded-2xl border border-gray-100 text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <ShoppingBag className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-600 font-medium">No products available yet</p>
                  <p className="text-gray-400 text-sm mt-1">Check back soon for new items</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {(featuredProducts.length > 0 ? regularProducts : allProducts).map((product: any) => (
                    <ProductCard 
                      key={product.id} 
                      product={product} 
                      storeSlug={storeSlug}
                      vendorId={vendorId}
                      vendorName={displayName}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN - Sidebar */}
          <div className="space-y-4 lg:sticky lg:top-6 lg:self-start">
            {/* Quick Contact */}
            {vendor.phone && (
              <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
                <a
                  href={`tel:${vendor.phone}`}
                  className="flex items-center justify-center gap-2 w-full bg-[#55529d] hover:bg-[#444287] text-white py-3.5 rounded-xl font-semibold transition"
                >
                  <Phone className="h-5 w-5" />
                  Call Now
                </a>
                <a
                  href={`https://wa.me/${vendor.phone.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full bg-green-500 hover:bg-green-600 text-white py-3.5 rounded-xl font-semibold transition"
                >
                  <MessageCircle className="h-5 w-5" />
                  WhatsApp
                </a>
              </div>
            )}

            {/* About */}
            {(vendor.description || vendor.business_description) && (
              <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <h3 className="font-semibold text-gray-900 mb-3">About</h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  {vendor.description || vendor.business_description}
                </p>
              </div>
            )}

            {/* Contact Info */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
              <h3 className="font-semibold text-gray-900">Contact & Location</h3>
              
              {(vendor.address || vendor.business_address) && (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                    vendor.address || vendor.business_address
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-3 group"
                >
                  <div className="p-2 bg-gray-100 rounded-lg group-hover:bg-[#55529d]/10 transition">
                    <MapPin className="h-4 w-4 text-gray-500 group-hover:text-[#55529d] transition" />
                  </div>
                  <span className="text-sm text-gray-600 group-hover:text-[#55529d] transition flex-1">
                    {vendor.address || vendor.business_address}
                  </span>
                </a>
              )}

              {vendor.phone && (
                <a href={`tel:${vendor.phone}`} className="flex items-center gap-3 group">
                  <div className="p-2 bg-gray-100 rounded-lg group-hover:bg-[#55529d]/10 transition">
                    <Phone className="h-4 w-4 text-gray-500 group-hover:text-[#55529d] transition" />
                  </div>
                  <span className="text-sm text-gray-600 group-hover:text-[#55529d] transition">
                    {vendor.phone}
                  </span>
                </a>
              )}

              {vendor.email && (
                <a href={`mailto:${vendor.email}`} className="flex items-center gap-3 group">
                  <div className="p-2 bg-gray-100 rounded-lg group-hover:bg-[#55529d]/10 transition">
                    <Mail className="h-4 w-4 text-gray-500 group-hover:text-[#55529d] transition" />
                  </div>
                  <span className="text-sm text-gray-600 group-hover:text-[#55529d] transition">
                    {vendor.email}
                  </span>
                </a>
              )}

              {vendor.website && (
                <a
                  href={vendor.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 group"
                >
                  <div className="p-2 bg-gray-100 rounded-lg group-hover:bg-[#55529d]/10 transition">
                    <Globe className="h-4 w-4 text-gray-500 group-hover:text-[#55529d] transition" />
                  </div>
                  <span className="text-sm text-[#55529d] group-hover:underline">
                    Visit Website
                  </span>
                </a>
              )}
            </div>

            {/* Store Hours */}
            {vendor.hours && (
              <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <h3 className="font-semibold text-gray-900 mb-3">Store Hours</h3>
                <StoreHours hours={vendor.hours} />
              </div>
            )}

            {/* Stats */}
            {(vendor.total_orders > 0 || vendor.rating) && (
              <div className="bg-gradient-to-br from-[#55529d]/5 to-purple-50 rounded-2xl border border-[#55529d]/10 p-5">
                <div className="grid grid-cols-2 gap-4">
                  {vendor.total_orders > 0 && (
                    <div className="text-center">
                      <p className="text-2xl font-bold text-[#55529d]">{vendor.total_orders}+</p>
                      <p className="text-xs text-gray-500">Orders</p>
                    </div>
                  )}
                  {vendor.rating && (
                    <div className="text-center">
                      <p className="text-2xl font-bold text-[#55529d]">{vendor.rating.toFixed(1)}</p>
                      <p className="text-xs text-gray-500">Rating</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

/* ============ PRODUCT CARD ============ */
function ProductCard({ 
  product, 
  storeSlug, 
  vendorId,
  vendorName,
  featured 
}: { 
  product: any; 
  storeSlug: string;
  vendorId: string;
  vendorName: string;
  featured?: boolean;
}) {
  const hasDiscount = product.compare_price && product.compare_price > product.price;
  const discountPercent = hasDiscount 
    ? Math.round((1 - product.price / product.compare_price) * 100) 
    : 0;

  return (
    <Link href={`/store/${storeSlug}/product/${product.id}`}>
      <div className={`group bg-white rounded-2xl border overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1 ${
        featured ? "border-amber-200 ring-1 ring-amber-100" : "border-gray-100"
      }`}>
        {/* Image */}
        <div className="relative aspect-square overflow-hidden bg-gray-100">
          <Image
            src={product.images?.[0] || product.imageUrl || "/placeholder.png"}
            fill
            alt={product.name}
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
          
          {/* Badges */}
          <div className="absolute top-3 left-3 flex flex-col gap-2">
            {featured && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-500 text-white text-xs font-semibold rounded-full">
                <Sparkles className="w-3 h-3" />
                Featured
              </span>
            )}
            {hasDiscount && (
              <span className="px-2.5 py-1 bg-red-500 text-white text-xs font-semibold rounded-full">
                -{discountPercent}%
              </span>
            )}
            {product.stock === 0 && (
              <span className="px-2.5 py-1 bg-gray-900 text-white text-xs font-semibold rounded-full">
                Sold Out
              </span>
            )}
          </div>

          {/* Quick View Overlay */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
            <span className="bg-white text-gray-900 px-4 py-2 rounded-full text-sm font-semibold shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-transform">
              View Details
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <h3 className="font-semibold text-gray-900 line-clamp-2 group-hover:text-[#55529d] transition-colors">
            {product.name}
          </h3>
          
          {product.description && (
            <p className="text-gray-500 text-sm line-clamp-1 mt-1">
              {product.description}
            </p>
          )}

          <div className="flex items-center justify-between mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold text-[#55529d]">
                ${typeof product.price === 'number' ? product.price.toFixed(2) : product.price}
              </span>
              {hasDiscount && (
                <span className="text-sm text-gray-400 line-through">
                  ${product.compare_price.toFixed(2)}
                </span>
              )}
            </div>
            
            <span className="text-[#55529d] text-sm font-semibold flex items-center gap-1 group-hover:gap-2 transition-all">
              View
              <ChevronRight className="w-4 h-4" />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

/* ============ STORE HOURS ============ */
function StoreHours({ hours }: { hours: Record<string, { open: string; close: string }> }) {
  const days = [
    { key: "monday", label: "Mon" },
    { key: "tuesday", label: "Tue" },
    { key: "wednesday", label: "Wed" },
    { key: "thursday", label: "Thu" },
    { key: "friday", label: "Fri" },
    { key: "saturday", label: "Sat" },
    { key: "sunday", label: "Sun" },
  ];

  const now = new Date();
  const todayKey = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"][now.getDay()];

  return (
    <div className="space-y-2">
      {days.map(({ key, label }) => {
        const dayHours = hours[key];
        const isToday = key === todayKey;
        
        return (
          <div 
            key={key} 
            className={`flex justify-between text-sm ${
              isToday ? "font-semibold text-[#55529d]" : "text-gray-600"
            }`}
          >
            <span className="flex items-center gap-2">
              {label}
              {isToday && (
                <span className="w-1.5 h-1.5 bg-[#55529d] rounded-full" />
              )}
            </span>
            <span>
              {dayHours?.open && dayHours?.close 
                ? `${dayHours.open} - ${dayHours.close}`
                : "Closed"
              }
            </span>
          </div>
        );
      })}
    </div>
  );
}
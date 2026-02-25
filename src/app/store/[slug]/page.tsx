// src/app/store/[slug]/page.tsx
// ============================================================================
// LCP FIX: Changed from `force-dynamic` to ISR with 5-minute revalidation.
//
// Before: Every store page request hit Firestore in real-time (TTFB ~650ms+).
// After:  Cached at the edge for 5 minutes, serving stale-while-revalidate.
//         TTFB drops from ~650ms to ~50ms for cached visitors.
//
// Trade-off: Product/vendor changes take up to 5 minutes to appear.
// This is acceptable for a storefront — customers won't notice.
// Vendor dashboard changes are still real-time (different pages).
//
// ROLLBACK: Change `revalidate = 300` back to `export const dynamic = "force-dynamic";`
// ============================================================================

import { db } from "@/lib/firebase/config";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { redirect } from "next/navigation";
import { sanitizeSlug, isUrlLike, generateSlug } from "@/lib/utils/slug";
import StorefrontClient from "./StorefrontClient";
import StoreErrorState from "./StoreErrorState";

// ✅ LCP FIX: ISR — revalidate every 5 minutes instead of force-dynamic
// This lets Vercel cache the page at the edge and serve it instantly.
// New visitors get the cached version; Vercel revalidates in the background.
export const revalidate = 300; // 5 minutes

type PageProps = {
  params: Promise<{ slug?: string }>;
};

// Helper to check if URL is a video
function isVideoUrl(url: string): boolean {
  if (!url) return false;
  const videoExtensions = [".mp4", ".webm", ".ogg", ".mov"];
  const lowercaseUrl = url.toLowerCase();
  return videoExtensions.some((ext) => lowercaseUrl.includes(ext));
}

// Serialize Firestore data to avoid serialization issues
function serializeFirestore(data: any) {
  return JSON.parse(JSON.stringify(data));
}

export default async function VendorStorefront({ params }: PageProps) {
  const { slug } = await params;

  // ✅ Invalid URL - uses bilingual client component
  if (!slug) {
    return <StoreErrorState type="invalidUrl" />;
  }

  /* ===============================
     1️⃣ FIND VENDOR BY SLUG OR ID
  =============================== */
  let vendorDoc: any = null;
  let vendor: any = null;
  let vendorId: string = "";

  const decodedSlug = decodeURIComponent(slug);
  const sanitizedSlug = sanitizeSlug(decodedSlug);

  // 1. Try exact slug match
  const exactQuery = await getDocs(
    query(collection(db, "vendors"), where("slug", "==", decodedSlug))
  );

  if (!exactQuery.empty) {
    vendorDoc = exactQuery.docs[0];
    vendor = vendorDoc.data();
    vendorId = vendorDoc.id;
  }

  // 2. If the incoming slug looks like a URL, try to find by the URL-like slug
  if (!vendor && isUrlLike(decodedSlug)) {
    const urlQuery = await getDocs(
      query(collection(db, "vendors"), where("slug", "==", decodedSlug))
    );

    if (!urlQuery.empty) {
      vendorDoc = urlQuery.docs[0];
      vendor = vendorDoc.data();
      vendorId = vendorDoc.id;

      if (sanitizedSlug && sanitizedSlug !== decodedSlug) {
        redirect(`/store/${sanitizedSlug}`);
      }
    }
  }

  // 3. Try sanitized slug match
  if (!vendor && sanitizedSlug && sanitizedSlug !== decodedSlug) {
    const sanitizedQuery = await getDocs(
      query(collection(db, "vendors"), where("slug", "==", sanitizedSlug))
    );

    if (!sanitizedQuery.empty) {
      vendorDoc = sanitizedQuery.docs[0];
      vendor = vendorDoc.data();
      vendorId = vendorDoc.id;
    }
  }

  // 4. Try matching vendor name
  if (!vendor) {
    const allVendorsSnap = await getDocs(collection(db, "vendors"));

    for (const vendorDocItem of allVendorsSnap.docs) {
      const v = vendorDocItem.data();
      const vendorSlug = v.slug ? sanitizeSlug(v.slug) : "";
      const vendorNameSlug = v.name ? generateSlug(v.name) : "";

      if (
        vendorSlug === sanitizedSlug ||
        vendorNameSlug === sanitizedSlug ||
        vendorDocItem.id === slug
      ) {
        vendorDoc = vendorDocItem;
        vendor = v;
        vendorId = vendorDocItem.id;

        // Redirect to canonical slug if vendor has one
        if (v.slug && v.slug !== decodedSlug) {
          redirect(`/store/${v.slug}`);
        }
        break;
      }
    }
  }

  // ✅ Store not found
  if (!vendor) {
    return <StoreErrorState type="storeNotFound" />;
  }

  // Use slug for links, fallback to vendorId
  const storeSlug = vendor.slug || vendorId;

  /* ===============================
     2️⃣ GET ALL ACTIVE PRODUCTS
  =============================== */
  const productsSnap = await getDocs(
    collection(db, "vendors", vendorId, "products")
  );

  const products = productsSnap.docs
    .map((d) => ({
      id: d.id,
      ...d.data(),
    }))
    .filter((p: any) => p.active !== false);

  /* ===============================
     3️⃣ PREPARE COVER MEDIA
  =============================== */
  const coverMedia =
    vendor.cover_image_url ||
    vendor.coverImageUrl ||
    vendor.logoUrl ||
    vendor.logo_url ||
    "/default-cover.jpg";

  const isVideo = isVideoUrl(coverMedia);

  /* ===============================
     4️⃣ SOCIAL LINKS & SERVICE TYPES
  =============================== */
  const socialLinks = {
    instagram: vendor.instagram || null,
    facebook: vendor.facebook || null,
    twitter: vendor.twitter || null,
    tiktok: vendor.tiktok || null,
    website: vendor.website || null,
  };

  const whatsappLink = vendor.whatsapp
    ? `https://wa.me/${vendor.whatsapp.replace(/\D/g, "")}`
    : vendor.phone
    ? `https://wa.me/${vendor.phone.replace(/\D/g, "")}`
    : null;

  const vendorCategory =
    vendor.category || vendor.categories?.[0] || "general";

  const serviceTypes = {
    delivery: vendor.offers_delivery !== false,
    pickup: vendor.offers_pickup === true,
    services: vendor.offers_services === true,
  };

  return (
    <StorefrontClient
      vendor={serializeFirestore({
        id: vendorId,
        name: vendor.name || vendor.business_name,
        description: vendor.description || vendor.business_description,
        logoUrl: vendor.logoUrl || vendor.logo_url,
        verified: vendor.verified || false,
        rating: vendor.rating,
        reviewCount: vendor.reviewCount,
        phone: vendor.phone,
        email: vendor.email,
        address: vendor.address || vendor.location?.location_address,
        store_hours: vendor.store_hours,
        categories: vendor.categories,
      })}
      vendorId={vendorId}
      storeSlug={storeSlug}
      products={serializeFirestore(products)}
      coverMedia={coverMedia}
      isVideo={isVideo}
      socialLinks={socialLinks}
      whatsappLink={whatsappLink}
      vendorCategory={vendorCategory}
      serviceTypes={serviceTypes}
    />
  );
}
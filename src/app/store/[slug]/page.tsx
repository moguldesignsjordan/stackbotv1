// src/app/store/[slug]/page.tsx
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

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug?: string }>;
};

// Helper to check if URL is a video
function isVideoUrl(url: string): boolean {
  if (!url) return false;
  const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov'];
  const lowercaseUrl = url.toLowerCase();
  return videoExtensions.some(ext => lowercaseUrl.includes(ext));
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
        (vendorSlug && vendorSlug === sanitizedSlug) ||
        (vendorNameSlug && vendorNameSlug === sanitizedSlug) ||
        (v.slug && v.slug.toLowerCase() === decodedSlug.toLowerCase())
      ) {
        vendorDoc = vendorDocItem;
        vendor = v;
        vendorId = vendorDocItem.id;
        break;
      }
    }
  }

  // 5. Fallback: Try to find by document ID
  if (!vendor) {
    try {
      const vendorRef = doc(db, "vendors", slug);
      const vendorSnap = await getDoc(vendorRef);
      
      if (vendorSnap.exists()) {
        vendorDoc = vendorSnap;
        vendor = vendorSnap.data();
        vendorId = vendorSnap.id;
      }
    } catch (e) {
      // Invalid document ID format
    }
  }

  // ✅ Store not found - uses bilingual client component
  if (!vendor) {
    return <StoreErrorState type="storeNotFound" />;
  }

  const storeSlug = vendor.slug 
    ? sanitizeSlug(vendor.slug) 
    : (vendor.name ? generateSlug(vendor.name) : vendorId);

  /* ===============================
     2️⃣ LOAD PRODUCTS
  =============================== */
  const productsSnap = await getDocs(
    collection(db, "vendors", vendorId, "products")
  );

  const products = productsSnap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((p: any) => p.active !== false);

  /* ===============================
     3️⃣ PREPARE COVER MEDIA
  =============================== */
  const coverMedia = vendor.cover_video_url || vendor.cover_image_url || vendor.logoUrl || "/placeholder-cover.jpg";
  const isVideo = isVideoUrl(coverMedia);

  /* ===============================
     4️⃣ PREPARE SOCIAL LINKS
  =============================== */
  const socialLinks = {
    instagram: vendor.instagram || vendor.social_instagram,
    facebook: vendor.facebook || vendor.social_facebook,
    tiktok: vendor.tiktok || vendor.social_tiktok,
    twitter: vendor.twitter || vendor.social_twitter,
    youtube: vendor.youtube || vendor.social_youtube,
  };

  // Format WhatsApp number with bilingual message
  const whatsappNumber = vendor.whatsapp || vendor.phone;
  const whatsappLink = whatsappNumber 
    ? `https://wa.me/${whatsappNumber.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi! I found your store on StackBot.`)}`
    : null;

  /* ===============================
     5️⃣ PREPARE CATEGORY & SERVICE TYPES
  =============================== */
  const vendorCategory = vendor.category || vendor.categories?.[0] || vendor.business_type || vendor.service_type;

  const serviceTypes = {
    delivery: vendor.supports_delivery ?? vendor.supportsDelivery ?? false,
    pickup: vendor.supports_pickup ?? vendor.supportsPickup ?? false,
    services: vendor.has_services ?? vendor.hasServices ?? false,
  };

  /* ===============================
     6️⃣ RENDER STOREFRONT CLIENT
  =============================== */
  return (
    <StorefrontClient
      vendor={serializeFirestore(vendor)}
      vendorId={vendorId}
      storeSlug={storeSlug}
      products={serializeFirestore(products)}
      coverMedia={coverMedia}
      isVideo={isVideo}
      socialLinks={socialLinks}
      whatsappLink={whatsappLink}
      vendorCategory={vendorCategory || ""}
      serviceTypes={serviceTypes}
    />
  );
}
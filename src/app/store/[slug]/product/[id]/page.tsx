// src/app/store/[slug]/product/[id]/page.tsx
import { db } from "@/lib/firebase/config";
import {
  collection,
  doc,
  getDocs,
  getDoc,
  query,
  where,
} from "firebase/firestore";
import { Metadata } from "next";
import ProductClient from "./ProductClient";
import Link from "next/link";
import { ArrowLeft, Package } from "lucide-react";

function serializeFirestore(data: any) {
  return JSON.parse(JSON.stringify(data));
}

type PageProps = {
  params: Promise<{ slug?: string; id?: string }>;
};

/* ======================================================
   GENERATE METADATA FOR SEO
====================================================== */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug, id: productId } = await params;

  if (!slug || !productId) {
    return {
      title: "Product Not Found | StackBot",
    };
  }

  try {
    // Find vendor
    let vendorData: any = null;
    let vendorId = "";

    const vendorSnap = await getDocs(
      query(collection(db, "vendors"), where("slug", "==", slug))
    );

    if (!vendorSnap.empty) {
      vendorData = vendorSnap.docs[0].data();
      vendorId = vendorSnap.docs[0].id;
    } else {
      const vendorByIdSnap = await getDoc(doc(db, "vendors", slug));
      if (vendorByIdSnap.exists()) {
        vendorData = vendorByIdSnap.data();
        vendorId = vendorByIdSnap.id;
      }
    }

    if (!vendorData || !vendorId) {
      return {
        title: "Store Not Found | StackBot",
      };
    }

    // Get product
    const productSnap = await getDoc(
      doc(db, "vendors", vendorId, "products", productId)
    );

    if (!productSnap.exists()) {
      return {
        title: "Product Not Found | StackBot",
      };
    }

    const product = productSnap.data();
    const vendorName = vendorData.name || vendorData.business_name || "Store";
    const productName = product.name || "Product";
    const description = product.description || `Shop ${productName} from ${vendorName} on StackBot`;
    const imageUrl = product.images?.[0] || vendorData.logoUrl;

    return {
      title: `${productName} | ${vendorName} | StackBot`,
      description: description.slice(0, 160),
      openGraph: {
        title: `${productName} - ${vendorName}`,
        description: description.slice(0, 160),
        type: "website",
        images: imageUrl
          ? [
              {
                url: imageUrl,
                width: 800,
                height: 800,
                alt: productName,
              },
            ]
          : [],
        siteName: "StackBot",
      },
      twitter: {
        card: "summary_large_image",
        title: `${productName} - ${vendorName}`,
        description: description.slice(0, 160),
        images: imageUrl ? [imageUrl] : [],
      },
    };
  } catch (error) {
    console.error("Error generating metadata:", error);
    return {
      title: "Product | StackBot",
    };
  }
}

/* ======================================================
   PAGE COMPONENT
====================================================== */
export default async function ProductPage({ params }: PageProps) {
  const { slug, id: productId } = await params;

  if (!slug || !productId) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-gray-600 gap-4 bg-gray-50">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center">
          <Package className="w-10 h-10 text-gray-300" />
        </div>
        <h1 className="text-2xl font-bold">Invalid Product URL</h1>
        <p className="text-gray-500">The product link appears to be broken.</p>
        <Link 
          href="/" 
          className="mt-4 inline-flex items-center gap-2 text-[#55529d] font-semibold hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>
      </div>
    );
  }

  /* ===============================
     1️⃣ FIND VENDOR BY SLUG OR ID
  =============================== */
  let vendorDoc: any = null;
  let vendor: any = null;
  let vendorId: string = "";

  // First, try to find by slug
  const vendorSnap = await getDocs(
    query(collection(db, "vendors"), where("slug", "==", slug))
  );

  if (!vendorSnap.empty) {
    vendorDoc = vendorSnap.docs[0];
    vendor = vendorDoc.data();
    vendorId = vendorDoc.id;
  } else {
    // Fallback: Try to find by document ID
    try {
      const vendorRef = doc(db, "vendors", slug);
      const vendorByIdSnap = await getDoc(vendorRef);
      
      if (vendorByIdSnap.exists()) {
        vendorDoc = vendorByIdSnap;
        vendor = vendorByIdSnap.data();
        vendorId = vendorByIdSnap.id;
      }
    } catch (e) {
      // Invalid document ID format
    }
  }

  if (!vendor) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-gray-600 gap-4 bg-gray-50">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center">
          <Package className="w-10 h-10 text-gray-300" />
        </div>
        <h1 className="text-2xl font-bold">Store Not Found</h1>
        <p className="text-gray-500">The store you&apos;re looking for doesn&apos;t exist.</p>
        <Link 
          href="/" 
          className="mt-4 inline-flex items-center gap-2 text-[#55529d] font-semibold hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>
      </div>
    );
  }

  /* ===============================
     2️⃣ GET PRODUCT FROM VENDOR SUBCOLLECTION
  =============================== */
  const productSnap = await getDoc(
    doc(db, "vendors", vendorId, "products", productId)
  );

  if (!productSnap.exists()) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-gray-600 gap-4 bg-gray-50">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center">
          <Package className="w-10 h-10 text-gray-300" />
        </div>
        <h1 className="text-2xl font-bold">Product Not Found</h1>
        <p className="text-gray-500">This product doesn&apos;t exist or has been removed.</p>
        <Link 
          href={`/store/${slug}`}
          className="mt-4 inline-flex items-center gap-2 text-[#55529d] font-semibold hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Store
        </Link>
      </div>
    );
  }

  const product = productSnap.data();

  if (product.active === false) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-gray-600 gap-4 bg-gray-50">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center">
          <Package className="w-10 h-10 text-gray-300" />
        </div>
        <h1 className="text-2xl font-bold">Product Unavailable</h1>
        <p className="text-gray-500">This product is currently unavailable.</p>
        <Link 
          href={`/store/${slug}`}
          className="mt-4 inline-flex items-center gap-2 text-[#55529d] font-semibold hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Store
        </Link>
      </div>
    );
  }

  // Use slug for links, fallback to vendorId
  const storeSlug = vendor.slug || vendorId;

  return (
    <ProductClient
      slug={storeSlug}
      vendor={serializeFirestore({
        id: vendorId,
        name: vendor.name || vendor.business_name,
        logoUrl: vendor.logoUrl,
        verified: vendor.verified,
      })}
      product={serializeFirestore({ id: productId, ...product })}
    />
  );
}
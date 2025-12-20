import { db } from "@/lib/firebase/config";
import {
  collection,
  doc,
  getDocs,
  getDoc,
  query,
  where,
} from "firebase/firestore";
import ProductClient from "./ProductClient";
import Link from "next/link";
import { ArrowLeft, Package } from "lucide-react";

function serializeFirestore(data: any) {
  return JSON.parse(JSON.stringify(data));
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug?: string; id?: string }>;
}) {
  const { slug, id: productId } = await params;

  if (!slug || !productId) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-gray-600 gap-4">
        <Package className="w-16 h-16 text-gray-300" />
        <h1 className="text-2xl font-bold">Invalid Product URL</h1>
        <Link 
          href="/" 
          className="mt-4 inline-flex items-center gap-2 text-purple-600 font-semibold hover:underline"
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
    const vendorRef = doc(db, "vendors", slug);
    const vendorByIdSnap = await getDoc(vendorRef);
    
    if (vendorByIdSnap.exists()) {
      vendorDoc = vendorByIdSnap;
      vendor = vendorByIdSnap.data();
      vendorId = vendorByIdSnap.id;
    }
  }

  if (!vendor) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-gray-600 gap-4">
        <Package className="w-16 h-16 text-gray-300" />
        <h1 className="text-2xl font-bold">Store Not Found</h1>
        <p className="text-gray-500">The store you're looking for doesn't exist.</p>
        <Link 
          href="/" 
          className="mt-4 inline-flex items-center gap-2 text-purple-600 font-semibold hover:underline"
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
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-gray-600 gap-4">
        <Package className="w-16 h-16 text-gray-300" />
        <h1 className="text-2xl font-bold">Product Not Found</h1>
        <p className="text-gray-500">This product doesn't exist or has been removed.</p>
        <Link 
          href={`/store/${slug}`}
          className="mt-4 inline-flex items-center gap-2 text-purple-600 font-semibold hover:underline"
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
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-gray-600 gap-4">
        <Package className="w-16 h-16 text-gray-300" />
        <h1 className="text-2xl font-bold">Product Unavailable</h1>
        <p className="text-gray-500">This product is currently unavailable.</p>
        <Link 
          href={`/store/${slug}`}
          className="mt-4 inline-flex items-center gap-2 text-purple-600 font-semibold hover:underline"
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
      vendor={serializeFirestore(vendor)}
      product={serializeFirestore({ id: productId, ...product })}
    />
  );
}
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
    return <div className="p-6">Invalid product URL</div>;
  }

  const vendorSnap = await getDocs(
    query(collection(db, "vendors"), where("slug", "==", slug))
  );

  if (vendorSnap.empty) {
    return <div className="p-6">Store not found</div>;
  }

  const vendorDoc = vendorSnap.docs[0];
  const vendorId = vendorDoc.id;
  const vendor = vendorDoc.data();

  const productSnap = await getDoc(
    doc(db, "vendors", vendorId, "products", productId)
  );

  if (!productSnap.exists()) {
    return <div className="p-6">Product not found</div>;
  }

  const product = productSnap.data();

  if (product.active === false) {
    return <div className="p-6">This product is unavailable</div>;
  }

  return (
    <ProductClient
      slug={slug}
      vendor={serializeFirestore(vendor)}
      product={serializeFirestore({ id: productId, ...product })}
    />
  );
}

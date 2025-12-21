import { NextResponse } from "next/server";
import admin from "@/lib/firebase/admin";

export async function POST(req: Request) {
  try {
    console.log("=== DELETE VENDOR API ===");
    
    // 1️⃣ Verify admin auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized - no token" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    
    let decoded;
    try {
      decoded = await admin.auth().verifyIdToken(token);
      console.log("Token verified. Claims:", { role: decoded.role, email: decoded.email });
    } catch (tokenErr: any) {
      console.error("Token verification failed:", tokenErr);
      return NextResponse.json({ error: "Invalid token: " + tokenErr.message }, { status: 401 });
    }
    
    if (decoded.role !== "admin") {
      return NextResponse.json({ error: `Forbidden - role is "${decoded.role}" not "admin"` }, { status: 403 });
    }

    // 2️⃣ Get vendorId
    const { vendorId } = await req.json();
    if (!vendorId) {
      return NextResponse.json({ error: "Missing vendorId" }, { status: 400 });
    }
    console.log("Deleting vendor:", vendorId);

    const db = admin.firestore();

    // 3️⃣ Delete vendor products
    try {
      const productsSnap = await db
        .collection("vendors")
        .doc(vendorId)
        .collection("products")
        .get();

      console.log("Found", productsSnap.size, "products to delete");

      const batchSize = 500;
      for (let i = 0; i < productsSnap.docs.length; i += batchSize) {
        const batch = db.batch();
        const chunk = productsSnap.docs.slice(i, i + batchSize);
        chunk.forEach((doc) => batch.delete(doc.ref));
        await batch.commit();
      }
      console.log("Products deleted");
    } catch (prodErr: any) {
      console.error("Product deletion failed:", prodErr);
      return NextResponse.json({ error: "Failed to delete products: " + prodErr.message }, { status: 500 });
    }

    // 4️⃣ Delete vendor doc
    try {
      await db.collection("vendors").doc(vendorId).delete();
      console.log("Vendor doc deleted");
    } catch (vendorErr: any) {
      console.error("Vendor doc deletion failed:", vendorErr);
      return NextResponse.json({ error: "Failed to delete vendor doc: " + vendorErr.message }, { status: 500 });
    }

    // 5️⃣ Delete auth user
    try {
      await admin.auth().deleteUser(vendorId);
      console.log("Auth user deleted");
    } catch (authErr: any) {
      if (authErr.code !== "auth/user-not-found") {
        console.error("Auth user deletion failed:", authErr);
        // Non-fatal, continue
      } else {
        console.log("Auth user not found (OK)");
      }
    }

    // 6️⃣ Delete storage folder
    try {
      const bucketName = process.env.FIREBASE_STORAGE_BUCKET;
      console.log("Storage bucket:", bucketName);
      
      if (bucketName) {
        const bucket = admin.storage().bucket(bucketName);
        await bucket.deleteFiles({ prefix: `vendors/${vendorId}/` });
        console.log("Storage files deleted");
      } else {
        console.log("No storage bucket configured, skipping");
      }
    } catch (storageErr: any) {
      console.error("Storage cleanup failed (non-fatal):", storageErr);
      // Non-fatal, continue
    }

    console.log("=== DELETE COMPLETE ===");
    return NextResponse.json({ success: true });
    
  } catch (error: any) {
    console.error("Delete vendor error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
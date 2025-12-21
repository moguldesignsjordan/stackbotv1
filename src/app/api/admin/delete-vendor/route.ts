import { NextResponse } from "next/server";
import admin from "@/lib/firebase/admin";

export async function POST(req: Request) {
  const { vendorId } = await req.json();
  const db = admin.firestore();

  // 1️⃣ Delete vendor products
  const productsSnap = await db
    .collection("vendors")
    .doc(vendorId)
    .collection("products")
    .get();

  const batch = db.batch();
  productsSnap.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();

  // 2️⃣ Delete vendor doc
  await db.collection("vendors").doc(vendorId).delete();

  // 3️⃣ Delete auth user
  await admin.auth().deleteUser(vendorId);

  // 4️⃣ (Optional) Delete storage folder
  await admin
    .storage()
    .bucket()
    .deleteFiles({ prefix: `vendors/${vendorId}` });

  return NextResponse.json({ success: true });
}

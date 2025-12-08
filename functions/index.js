const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

/* ============================================================
    INTERNAL UTILITIES
============================================================ */
function generatePIN() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/* ============================================================
    🚀 BOOTSTRAP ADMIN (ONE-TIME SETUP)
============================================================ */
exports.bootstrapAdmin = functions.https.onRequest(async (req, res) => {
  try {
    if (req.method !== "POST")
      return res.status(405).json({ error: "Method not allowed" });

    const { uid } = req.body;
    if (!uid) return res.status(400).json({ error: "Missing UID" });

    await admin.auth().setCustomUserClaims(uid, { role: "admin" });

    return res.json({
      success: true,
      message: "Admin created successfully.",
      uid,
    });
  } catch (error) {
    console.error("Bootstrap admin error:", error);
    return res.status(500).json({ error: error.message });
  }
});

/* ============================================================
    🔐 ADMIN SETS USER ROLE
============================================================ */
exports.setUserRole = functions.https.onCall(async (data, context) => {
  if (!context.auth || context.auth.token.role !== "admin")
    throw new functions.https.HttpsError(
      "permission-denied",
      "Only admins can assign roles."
    );

  const { uid, role } = data;
  await admin.auth().setCustomUserClaims(uid, { role });

  return { message: `Role '${role}' assigned.` };
});

/* ============================================================
    🏪 CREATE VENDOR (called implicitly by signup)
============================================================ */
exports.createVendor = functions.https.onCall(async (data, context) => {
  if (!context.auth)
    throw new functions.https.HttpsError(
      "unauthenticated",
      "Login required."
    );

  const userId = context.auth.uid;
  const pin = generatePIN();

  const vendorData = {
    owner_uid: userId,
    name: data.name,
    email: data.email,
    phone: data.phone,
    address: data.address,
    description: data.description,
    categories: data.categories || [],
    business_hours: data.business_hours || "",
    logoUrl: data.logoUrl || "",
    bank: data.bank || {},
    verified: false,
    stackbot_pin: pin,
    rating: 0,
    total_orders: 0,
    total_revenue: 0,
    created_at: admin.firestore.FieldValue.serverTimestamp(),
    updated_at: admin.firestore.FieldValue.serverTimestamp(),
  };

  await admin.firestore().collection("vendors").doc(userId).set(vendorData);

  return { vendorId: userId, pin };
});

/* ============================================================
    ✔ APPROVE VENDOR → Assign Auth Claim
============================================================ */
exports.approveVendor = functions.https.onCall(async (data, context) => {
  if (!context.auth || context.auth.token.role !== "admin")
    throw new functions.https.HttpsError(
      "permission-denied",
      "Only admins can approve vendors."
    );

  const vendorId = data.vendorId;

  // 1. Update Firestore
  await admin.firestore().collection("vendors").doc(vendorId).update({
    verified: true,
    updated_at: admin.firestore.FieldValue.serverTimestamp(),
  });

  // 2. Assign Firebase Auth Claim
  await admin.auth().setCustomUserClaims(vendorId, { role: "vendor" });

  return { message: "Vendor approved and role assigned." };
});

/* ============================================================
    🧾 CREATE ORDER
============================================================ */
exports.createOrder = functions.https.onCall(async (data, context) => {
  if (!context.auth)
    throw new functions.https.HttpsError("unauthenticated", "Login required.");

  const orderId = admin.firestore().collection("orders").doc().id;
  const customerId = context.auth.uid;

  const orderData = {
    orderId,
    vendorId: data.vendorId,
    customerId,
    items: data.items,
    subtotal: data.subtotal,
    delivery_fee: data.delivery_fee,
    total: data.total,
    status: "open",
    tracking_pin: generatePIN(),
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  };

  await admin.firestore().collection("orders").doc(orderId).set(orderData);

  await admin
    .firestore()
    .collection("vendors")
    .doc(data.vendorId)
    .collection("orders")
    .doc(orderId)
    .set(orderData);

  return { orderId };
});

/* ============================================================
    🔄 UPDATE ORDER STATUS
============================================================ */
exports.updateOrderStatus = functions.https.onCall(async (data, context) => {
  if (!context.auth)
    throw new functions.https.HttpsError("unauthenticated", "Login required.");

  const { orderId, vendorId, status } = data;

  await admin.firestore().collection("orders").doc(orderId).update({
    status,
    updated_at: admin.firestore.FieldValue.serverTimestamp(),
  });

  await admin
    .firestore()
    .collection("vendors")
    .doc(vendorId)
    .collection("orders")
    .doc(orderId)
    .update({
      status,
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    });

  return { message: "Order status updated." };
});

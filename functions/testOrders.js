/**
 * STACKBOT — Test Order Cloud Functions
 * Admin-only functions for creating, updating, and deleting test orders.
 */

const functions = require("firebase-functions");
const admin = require("firebase-admin");

const ADMIN_EMAILS = [
  "jordancobb92@gmail.com",
  "moguldesignsjordan@gmail.com",
  "Wilkerson3911@gmail.com",
  "Stackbotglobalgl@gmail.com",
];

/**
 * Verify the caller is an admin (custom claim or email allowlist).
 */
async function requireAdmin(context) {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Login required.");
  }
  const isAdmin =
    context.auth.token.role === "admin" ||
    ADMIN_EMAILS.includes(context.auth.token.email);
  if (!isAdmin) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Only admins can manage test orders."
    );
  }
  return context.auth;
}

/* ============================================================
    🧪 CREATE TEST ORDER
============================================================ */
const createTestOrder = functions.https.onCall(async (data, context) => {
  const caller = await requireAdmin(context);

  const { vendorId, status, amount, items } = data;
  if (!vendorId) {
    throw new functions.https.HttpsError("invalid-argument", "vendorId is required.");
  }

  // Lookup vendor name (optional, fallback gracefully)
  let vendorName = "Test Vendor";
  try {
    const vendorSnap = await admin.firestore().collection("vendors").doc(vendorId).get();
    if (vendorSnap.exists) {
      vendorName = vendorSnap.data().name || vendorName;
    }
  } catch (e) {
    console.warn("[createTestOrder] Could not fetch vendor:", e.message);
  }

  const itemCount = Number(items) || 2;
  const totalAmount = Number(amount) || 500;

  // Build mock items array
  const mockItems = [];
  for (let i = 0; i < itemCount; i++) {
    mockItems.push({
      id: `test-item-${i + 1}`,
      name: `Test Item ${i + 1}`,
      price: Math.round((totalAmount / itemCount) * 100) / 100,
      quantity: 1,
    });
  }

  const orderId = admin.firestore().collection("orders").doc().id;
  const now = admin.firestore.FieldValue.serverTimestamp();

  const orderData = {
    orderId,
    customerId: caller.uid,
    customerName: caller.token.name || caller.token.email || "Test Customer",
    customerEmail: caller.token.email || "",
    vendorId,
    vendorName,
    items: mockItems,
    subtotal: totalAmount,
    deliveryFee: 0,
    tax: 0,
    total: totalAmount,
    currency: "DOP",
    status: status || "pending",
    paymentMethod: "test",
    paymentStatus: "test",
    deliveryAddress: {
      street: "Calle Test 123",
      city: "Sosúa",
      state: "Puerto Plata",
      country: "Dominican Republic",
    },
    isTest: true,
    createdAt: now,
    updatedAt: now,
  };

  await admin.firestore().collection("orders").doc(orderId).set(orderData);

  // Also write to vendor subcollection for vendor portal visibility
  try {
    await admin.firestore()
      .collection("vendors")
      .doc(vendorId)
      .collection("orders")
      .doc(orderId)
      .set(orderData);
  } catch (e) {
    console.warn("[createTestOrder] Could not write to vendor subcollection:", e.message);
  }

  console.log(`[createTestOrder] Created test order ${orderId} for vendor ${vendorId}`);

  return {
    success: true,
    orderId,
    status: orderData.status,
    total: orderData.total,
    vendorName,
  };
});

/* ============================================================
    🔄 UPDATE ORDER STATUS
============================================================ */
const updateOrderStatus = functions.https.onCall(async (data, context) => {
  const caller = await requireAdmin(context);

  const { orderId, status } = data;
  if (!orderId || !status) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "orderId and status are required."
    );
  }

  const validStatuses = [
    "pending",
    "confirmed",
    "preparing",
    "ready",
    "out_for_delivery",
    "delivered",
    "cancelled",
  ];
  if (!validStatuses.includes(status)) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      `Invalid status: ${status}`
    );
  }

  const orderRef = admin.firestore().collection("orders").doc(orderId);
  const orderSnap = await orderRef.get();

  if (!orderSnap.exists) {
    throw new functions.https.HttpsError("not-found", "Order not found.");
  }

  const updates = {
    status,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  // Add timestamp fields for key status changes
  if (status === "confirmed") updates.confirmedAt = admin.firestore.FieldValue.serverTimestamp();
  if (status === "preparing") updates.preparingAt = admin.firestore.FieldValue.serverTimestamp();
  if (status === "ready") updates.readyAt = admin.firestore.FieldValue.serverTimestamp();
  if (status === "delivered") updates.deliveredAt = admin.firestore.FieldValue.serverTimestamp();
  if (status === "cancelled") updates.cancelledAt = admin.firestore.FieldValue.serverTimestamp();

  await orderRef.update(updates);

  // Sync to vendor subcollection
  const orderData = orderSnap.data();
  if (orderData.vendorId) {
    try {
      await admin.firestore()
        .collection("vendors")
        .doc(orderData.vendorId)
        .collection("orders")
        .doc(orderId)
        .update(updates);
    } catch (e) {
      // Subcollection doc may not exist
    }
  }

  console.log(`[updateOrderStatus] Order ${orderId} → ${status} by ${caller.uid}`);

  return { success: true, orderId, status };
});

/* ============================================================
    🗑️ DELETE ALL TEST ORDERS
============================================================ */
const deleteTestOrders = functions.https.onCall(async (data, context) => {
  await requireAdmin(context);

  const testOrders = await admin.firestore()
    .collection("orders")
    .where("isTest", "==", true)
    .limit(500)
    .get();

  if (testOrders.empty) {
    return { success: true, message: "No test orders found.", deleted: 0 };
  }

  const batch = admin.firestore().batch();
  const vendorCleanups = [];

  testOrders.docs.forEach((doc) => {
    const orderData = doc.data();
    batch.delete(doc.ref);

    // Queue vendor subcollection cleanup
    if (orderData.vendorId) {
      vendorCleanups.push(
        admin.firestore()
          .collection("vendors")
          .doc(orderData.vendorId)
          .collection("orders")
          .doc(doc.id)
          .delete()
          .catch(() => {}) // Ignore if subcollection doc doesn't exist
      );
    }
  });

  await batch.commit();
  await Promise.allSettled(vendorCleanups);

  const count = testOrders.size;
  console.log(`[deleteTestOrders] Deleted ${count} test orders.`);

  return { success: true, message: `Deleted ${count} test orders.`, deleted: count };
});

// ... all the function definitions above ...

/**
 * DEV ONLY: Simple test order creation without auth
 * ⚠️ REMOVE BEFORE PRODUCTION or add IP whitelist
 */
exports.createTestOrderDev = functions.https.onRequest((req, res) => {
  const cors = require("cors")({ origin: true });
  
  cors(req, res, async () => {
    try {
      if (req.method === "OPTIONS") return res.status(204).send("");
      if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
      }

      const { vendorId, status = "ready", amount = 500, items = 2 } = req.body;

      if (!vendorId) {
        return res.status(400).json({ error: "vendorId required" });
      }

      const vendorDoc = await admin.firestore().collection("vendors").doc(vendorId).get();
      if (!vendorDoc.exists) {
        return res.status(404).json({ error: "Vendor not found" });
      }

      const vendorData = vendorDoc.data();
      const testCustomerId = "test-customer-" + Date.now();
      
      const testItems = Array.from({ length: items }, (_, i) => ({
        id: `test-item-${i + 1}`,
        name: `Test Item ${i + 1}`,
        quantity: 1,
        price: amount / items,
        total: amount / items
      }));

      const deliveryFee = 100;
      const tax = amount * 0.18;
      const total = amount + deliveryFee + tax;

      const testOrder = {
        vendorId,
        vendorName: vendorData.name || vendorData.businessName || "Test Vendor",
        vendorAddress: vendorData.address || "",
        vendorCoordinates: vendorData.coordinates || null,
        
        customerId: testCustomerId,
        customerName: "Test Customer",
        customerInfo: {
          name: "Test Customer",
          email: "test@stackbot.com",
          phone: "809-555-0100"
        },
        
        items: testItems,
        subtotal: amount,
        deliveryFee: deliveryFee,
        tax: tax,
        total: total,
        
        deliveryAddress: {
          street: "Calle Principal #123",
          city: "Sosúa",
          state: "Puerto Plata",
          country: "Dominican Republic",
          coordinates: { lat: 19.7521, lng: -70.5132 }
        },
        
        fulfillmentType: "delivery",
        deliveryMethod: "delivery",
        status: status,
        
        paymentMethod: "card",
        paymentStatus: "paid",
        stripePaymentIntentId: "test_pi_" + Date.now(),
        
        tracking_pin: Math.floor(100000 + Math.random() * 900000).toString(),
        
        notes: "🧪 TEST ORDER - Dev endpoint",
        isTest: true,
        
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      if (status === "confirmed") {
        testOrder.confirmedAt = admin.firestore.FieldValue.serverTimestamp();
      } else if (status === "ready") {
        testOrder.confirmedAt = admin.firestore.FieldValue.serverTimestamp();
        testOrder.readyAt = admin.firestore.FieldValue.serverTimestamp();
      }

      const orderRef = await admin.firestore().collection("orders").add(testOrder);
      const orderId = orderRef.id;

      await admin.firestore()
        .collection("vendors")
        .doc(vendorId)
        .collection("orders")
        .doc(orderId)
        .set(testOrder);

      console.log(`✅ Dev test order created: ${orderId}`);

      return res.json({
        success: true,
        orderId: orderId,
        trackingPin: testOrder.tracking_pin,
        total: total,
        message: "Test order created (dev endpoint)"
      });

    } catch (error) {
      console.error("Dev endpoint error:", error);
      return res.status(500).json({ error: error.message });
    }
  });
});

// ✅ EXPORTS - ADD THIS:
exports.createTestOrder = createTestOrder;
exports.updateOrderStatus = updateOrderStatus;
exports.deleteTestOrders = deleteTestOrders;
/**
 * STACKBOT — Firebase Cloud Functions
 * Updated with location/coordinates support for orders
 * + Live Notifications System
 * + Broadcast Notifications
 */

const functions = require("firebase-functions");
const admin = require("firebase-admin");
const cors = require("cors")({ origin: true });


admin.initializeApp();

/* ============================================================
    UTILITIES
============================================================ */
function generatePIN() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function generatePassword() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
  let pass = "";
  for (let i = 0; i < 12; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pass;
}

function isValidCoordinates(coords) {
  if (!coords || typeof coords !== "object") return false;
  return (
    typeof coords.lat === "number" &&
    typeof coords.lng === "number" &&
    coords.lat >= -90 &&
    coords.lat <= 90 &&
    coords.lng >= -180 &&
    coords.lng <= 180
  );
}

function calculateDistance(coord1, coord2) {
  const R = 6371;
  const dLat = toRad(coord2.lat - coord1.lat);
  const dLng = toRad(coord2.lng - coord1.lng);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(coord1.lat)) *
      Math.cos(toRad(coord2.lat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg) {
  return deg * (Math.PI / 180);
}

function calculateDeliveryFee(distanceKm, baseFee = 3.0, perKmFee = 0.5, baseDistance = 3) {
  if (distanceKm <= baseDistance) return baseFee;
  const extraDistance = distanceKm - baseDistance;
  return Math.round((baseFee + extraDistance * perKmFee) * 100) / 100;
}

const ADMIN_EMAILS = [
  "jordancobb92@gmail.com",
  "moguldesignsjordan@gmail.com",
  "Wilkerson3911@gmail.com",
  "Stackbotglobalgl@gmail.com"
];

/* ============================================================
    🔔 NOTIFICATION HELPER
============================================================ */
async function createNotification({ userId, type, title, message, priority = "normal", data = {}, expiresAt = null }) {
  const notificationData = {
    userId,
    type,
    title,
    message,
    priority,
    data,
    read: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  };
  if (expiresAt) {
    notificationData.expiresAt = admin.firestore.Timestamp.fromDate(new Date(expiresAt));
  }
  return admin.firestore().collection("notifications").add(notificationData);
}

/* ============================================================
    🚀 BOOTSTRAP ADMIN
============================================================ */
exports.bootstrapAdmin = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    try {
      if (req.method === "OPTIONS") return res.status(204).send("");
      if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
      const { uid } = req.body;
      if (!uid) return res.status(400).json({ error: "Missing UID" });
      await admin.auth().setCustomUserClaims(uid, { role: "admin" });
      return res.json({ success: true, message: "Admin role assigned successfully.", uid });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  });
});

/* ============================================================
    🔐 SET USER ROLE
============================================================ */
exports.setUserRole = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    try {
      if (req.method === "OPTIONS") return res.status(204).send("");
      const authHeader = req.headers.authorization || "";
      const idToken = authHeader.startsWith("Bearer ") ? authHeader.substring(7) : null;
      if (!idToken) return res.status(401).json({ error: "Missing Authorization token" });
      const decoded = await admin.auth().verifyIdToken(idToken);
      const isAdmin = decoded.role === "admin" || ADMIN_EMAILS.includes(decoded.email);
      if (!isAdmin) return res.status(403).json({ error: "Only admins can assign roles" });
      let body = req.body;
      if (typeof body === "string") body = JSON.parse(body);
      const { uid, role } = body;
      if (!uid || !role) return res.status(400).json({ error: "Missing uid or role" });
      const validRoles = ["admin", "vendor", "customer"];
      if (!validRoles.includes(role)) return res.status(400).json({ error: `Invalid role: ${role}` });
      await admin.auth().setCustomUserClaims(uid, { role });
      return res.json({ success: true, message: `Role '${role}' assigned to ${uid}` });
    } catch (err) {
      return res.status(500).json({ error: "Internal server error" });
    }
  });
});

/* ============================================================
    ✔ APPROVE VENDOR
============================================================ */
exports.approveVendor = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    try {
      if (req.method === "OPTIONS") return res.status(204).send("");
      if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
      let body = req.body;
      if (typeof body === "string") body = JSON.parse(body);
      if (!body || Object.keys(body).length === 0) return res.status(400).json({ error: "Empty request body" });
      const vendorId = body.vendorId;
      if (!vendorId) return res.status(400).json({ error: "Missing vendorId" });
      const authHeader = req.headers.authorization || "";
      const idToken = authHeader.startsWith("Bearer ") ? authHeader.substring(7) : null;
      if (!idToken) return res.status(403).json({ error: "Missing Authorization token" });
      const decoded = await admin.auth().verifyIdToken(idToken);
      const isAdmin = decoded.role === "admin" || ADMIN_EMAILS.includes(decoded.email);
      if (!isAdmin) return res.status(403).json({ error: "Only admins can approve vendors." });
      const vendorRef = admin.firestore().collection("vendors").doc(vendorId);
      const vendorSnap = await vendorRef.get();
      if (!vendorSnap.exists) return res.status(404).json({ error: "Vendor not found" });
      const vendorData = vendorSnap.data();
      try { await admin.auth().setCustomUserClaims(vendorId, { role: "vendor" }); } catch (e) {}
      await vendorRef.update({
        verified: true,
        role: "vendor",
        approved_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      });
      try {
        await createNotification({
          userId: vendorId,
          type: "vendor_approved",
          title: "Application Approved! 🎉",
          message: "Congratulations! Your vendor application has been approved.",
          priority: "high",
          data: { url: "/vendor" },
        });
      } catch (e) {}
      return res.json({ success: true, message: "Vendor approved successfully", vendorId, email: vendorData.email });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });
});

/* ============================================================
    🪪 CREATE VENDOR
============================================================ */
exports.createVendor = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Login required.");
  const userId = context.auth.uid;
  const pin = generatePIN();
  const vendorData = {
    owner_uid: userId,
    uid: userId,
    name: data.name || "",
    email: data.email || context.auth.token.email || "",
    phone: data.phone || "",
    address: data.address || "",
    description: data.description || "",
    categories: data.categories || [],
    business_hours: data.business_hours || "",
    logoUrl: data.logoUrl || "",
    bank: data.bank || {},
    verified: false,
    stackbot_pin: pin,
    rating: 0,
    total_orders: 0,
    total_revenue: 0,
    source: "public_signup",
    created_at: admin.firestore.FieldValue.serverTimestamp(),
    updated_at: admin.firestore.FieldValue.serverTimestamp(),
  };
  if (data.coordinates && isValidCoordinates(data.coordinates)) {
    vendorData.coordinates = { lat: data.coordinates.lat, lng: data.coordinates.lng };
    vendorData.serviceRadius = data.serviceRadius || 10;
  }
  await admin.firestore().collection("vendors").doc(userId).set(vendorData);
  return { success: true, vendorId: userId, pin };
});

/* ============================================================
    📍 UPDATE VENDOR LOCATION
============================================================ */
exports.updateVendorLocation = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Login required.");
  const userId = context.auth.uid;
  const { coordinates, address, serviceRadius } = data;
  if (!coordinates || !isValidCoordinates(coordinates)) {
    throw new functions.https.HttpsError("invalid-argument", "Invalid coordinates.");
  }
  const vendorRef = admin.firestore().collection("vendors").doc(userId);
  const vendorSnap = await vendorRef.get();
  if (!vendorSnap.exists) throw new functions.https.HttpsError("not-found", "Vendor not found.");
  const updateData = { coordinates: { lat: coordinates.lat, lng: coordinates.lng }, updated_at: admin.firestore.FieldValue.serverTimestamp() };
  if (address) updateData.address = address;
  if (typeof serviceRadius === "number" && serviceRadius > 0) updateData.serviceRadius = Math.min(serviceRadius, 100);
  await vendorRef.update(updateData);
  return { success: true };
});

/* ============================================================
    🧾 CREATE ORDER
============================================================ */
exports.createOrder = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Login required.");
  const orderId = admin.firestore().collection("orders").doc().id;
  const customerId = context.auth.uid;
  const deliveryAddress = {
    street: data.deliveryAddress?.street || "",
    city: data.deliveryAddress?.city || "",
    state: data.deliveryAddress?.state || "",
    postalCode: data.deliveryAddress?.postalCode || "",
    country: data.deliveryAddress?.country || "Dominican Republic",
    instructions: data.deliveryAddress?.instructions || "",
  };
  if (data.deliveryAddress?.coordinates && isValidCoordinates(data.deliveryAddress.coordinates)) {
    deliveryAddress.coordinates = { lat: data.deliveryAddress.coordinates.lat, lng: data.deliveryAddress.coordinates.lng };
    deliveryAddress.pinLocked = data.deliveryAddress.pinLocked || false;
  }
  let calculatedDeliveryFee = data.delivery_fee || 0;
  let deliveryDistance = null;
  if (deliveryAddress.coordinates) {
    const vendorSnap = await admin.firestore().collection("vendors").doc(data.vendorId).get();
    if (vendorSnap.exists) {
      const vendorData = vendorSnap.data();
      if (vendorData.coordinates && isValidCoordinates(vendorData.coordinates)) {
        deliveryDistance = calculateDistance(vendorData.coordinates, deliveryAddress.coordinates);
        calculatedDeliveryFee = calculateDeliveryFee(deliveryDistance, vendorData.baseDeliveryFee || 3.0, vendorData.perKmFee || 0.5, vendorData.baseDeliveryDistance || 3);
      }
    }
  }
  const orderData = {
    orderId,
    vendorId: data.vendorId,
    customerId,
    items: data.items,
    subtotal: data.subtotal,
    delivery_fee: calculatedDeliveryFee,
    deliveryDistance,
    total: data.total,
    status: "open",
    tracking_pin: generatePIN(),
    deliveryAddress,
    customerInfo: data.customerInfo || {},
    notes: data.notes || "",
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  };
  await admin.firestore().collection("orders").doc(orderId).set(orderData);
  await admin.firestore().collection("vendors").doc(data.vendorId).collection("orders").doc(orderId).set(orderData);
  await admin.firestore().collection("customers").doc(customerId).collection("orders").doc(orderId).set(orderData);
  return { orderId, deliveryFee: calculatedDeliveryFee, deliveryDistance };
});

/* ============================================================
    📍 CALCULATE DELIVERY FEE
============================================================ */
exports.calculateDeliveryFeeForOrder = functions.https.onCall(async (data, context) => {
  const { vendorId, customerCoordinates } = data;
  if (!vendorId) throw new functions.https.HttpsError("invalid-argument", "Vendor ID is required.");
  if (!customerCoordinates || !isValidCoordinates(customerCoordinates)) {
    return { fee: 3.0, distance: null, message: "Using default delivery fee." };
  }
  const vendorSnap = await admin.firestore().collection("vendors").doc(vendorId).get();
  if (!vendorSnap.exists) throw new functions.https.HttpsError("not-found", "Vendor not found.");
  const vendorData = vendorSnap.data();
  if (!vendorData.coordinates || !isValidCoordinates(vendorData.coordinates)) {
    return { fee: vendorData.baseDeliveryFee || 3.0, distance: null, message: "Using default fee." };
  }
  const distance = calculateDistance(vendorData.coordinates, customerCoordinates);
  const serviceRadius = vendorData.serviceRadius || 50;
  if (distance > serviceRadius) {
    return { fee: null, distance, serviceRadius, available: false, message: `Delivery not available.` };
  }
  const fee = calculateDeliveryFee(distance, vendorData.baseDeliveryFee || 3.0, vendorData.perKmFee || 0.5, vendorData.baseDeliveryDistance || 3);
  return { fee, distance: Math.round(distance * 100) / 100, serviceRadius, available: true };
});

/* ============================================================
    🔄 UPDATE ORDER STATUS
============================================================ */
exports.updateOrderStatus = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Login required.");
  const { orderId, vendorId, status, customerId } = data;
  const updateData = { status, updated_at: admin.firestore.FieldValue.serverTimestamp() };
  await admin.firestore().collection("orders").doc(orderId).update(updateData);
  if (vendorId) await admin.firestore().collection("vendors").doc(vendorId).collection("orders").doc(orderId).update(updateData);
  if (customerId) await admin.firestore().collection("customers").doc(customerId).collection("orders").doc(orderId).update(updateData);
  return { message: "Order status updated." };
});

/* ============================================================
    📍 SAVE CUSTOMER LOCATION
============================================================ */
exports.saveCustomerLocation = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Login required.");
  const userId = context.auth.uid;
  const { label, address, coordinates, isDefault } = data;
  if (!label || !address || !coordinates || !isValidCoordinates(coordinates)) {
    throw new functions.https.HttpsError("invalid-argument", "Invalid data.");
  }
  const locationsRef = admin.firestore().collection("users").doc(userId).collection("savedLocations");
  if (isDefault) {
    const existingDefaults = await locationsRef.where("isDefault", "==", true).get();
    const batch = admin.firestore().batch();
    existingDefaults.forEach((doc) => batch.update(doc.ref, { isDefault: false }));
    await batch.commit();
  }
  const countSnap = await locationsRef.count().get();
  if (countSnap.data().count >= 10) throw new functions.https.HttpsError("resource-exhausted", "Max 10 locations.");
  const newLocationRef = locationsRef.doc();
  await newLocationRef.set({
    label: label.trim(),
    address: address.trim(),
    coordinates: { lat: coordinates.lat, lng: coordinates.lng },
    isDefault: isDefault || false,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  return { success: true, locationId: newLocationRef.id };
});

/* ============================================================
    🗑️ DELETE CUSTOMER LOCATION
============================================================ */
exports.deleteCustomerLocation = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Login required.");
  const userId = context.auth.uid;
  const { locationId } = data;
  if (!locationId) throw new functions.https.HttpsError("invalid-argument", "Location ID required.");
  const locationRef = admin.firestore().collection("users").doc(userId).collection("savedLocations").doc(locationId);
  const locationSnap = await locationRef.get();
  if (!locationSnap.exists) throw new functions.https.HttpsError("not-found", "Location not found.");
  await locationRef.delete();
  return { success: true };
});

/* ============================================================
    🔔 NOTIFICATION TRIGGERS
============================================================ */
exports.onOrderCreated = functions.firestore.document("orders/{orderId}").onCreate(async (snap, context) => {
  const order = snap.data();
  const orderId = context.params.orderId;
  const notifications = [];
  if (order.customerId) {
    notifications.push(createNotification({
      userId: order.customerId,
      type: "order_placed",
      title: "Order Placed!",
      message: `Your order #${orderId.slice(0, 8).toUpperCase()} has been placed.`,
      data: { orderId, vendorId: order.vendorId, url: "/account" },
    }));
  }
  if (order.vendorId) {
    notifications.push(createNotification({
      userId: order.vendorId,
      type: "order_placed",
      title: "New Order! 🎉",
      message: `New order #${orderId.slice(0, 8).toUpperCase()}`,
      priority: "high",
      data: { orderId, url: "/vendor/orders" },
    }));
  }
  await Promise.allSettled(notifications);
});

exports.onOrderStatusChange = functions.firestore.document("orders/{orderId}").onUpdate(async (change, context) => {
  const before = change.before.data();
  const after = change.after.data();
  const orderId = context.params.orderId;
  if (before.status === after.status) return null;
  const statusConfig = {
    confirmed: { type: "order_confirmed", title: "Order Confirmed", message: `Your order #${orderId.slice(0, 8).toUpperCase()} has been confirmed.` },
    preparing: { type: "order_preparing", title: "Order Being Prepared", message: `Your order #${orderId.slice(0, 8).toUpperCase()} is being prepared.` },
    ready: { type: "order_ready", title: "Order Ready!", message: `Your order #${orderId.slice(0, 8).toUpperCase()} is ready!`, priority: "high" },
    out_for_delivery: { type: "order_ready", title: "Out for Delivery", message: `Your order #${orderId.slice(0, 8).toUpperCase()} is on its way!`, priority: "high" },
    delivered: { type: "order_delivered", title: "Order Delivered", message: `Your order #${orderId.slice(0, 8).toUpperCase()} has been delivered.` },
    completed: { type: "order_delivered", title: "Order Completed", message: `Your order #${orderId.slice(0, 8).toUpperCase()} is complete.` },
    cancelled: { type: "order_cancelled", title: "Order Cancelled", message: `Your order #${orderId.slice(0, 8).toUpperCase()} has been cancelled.`, priority: "high" },
  };
  const config = statusConfig[after.status];
  if (!config || !after.customerId) return null;
  await createNotification({
    userId: after.customerId,
    type: config.type,
    title: config.title,
    message: config.message,
    priority: config.priority || "normal",
    data: { orderId, vendorId: after.vendorId, status: after.status, url: "/account" },
  });
  return null;
});

exports.onVendorStatusChange = functions.firestore.document("vendors/{vendorId}").onUpdate(async (change, context) => {
  const before = change.before.data();
  const after = change.after.data();
  const vendorId = context.params.vendorId;
  if (before.verified === after.verified) return null;
  if (before.verified === true && after.verified === false) {
    await createNotification({
      userId: vendorId,
      type: "vendor_rejected",
      title: "Account Status Updated",
      message: "Your vendor account status has been updated.",
      priority: "high",
      data: { url: "/vendor/settings" },
    });
  }
  return null;
});

/* ============================================================
    🧹 CLEANUP OLD NOTIFICATIONS
============================================================ */
exports.cleanupOldNotifications = functions.pubsub.schedule("every 24 hours").onRun(async () => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const oldNotifications = await admin.firestore().collection("notifications").where("createdAt", "<", admin.firestore.Timestamp.fromDate(thirtyDaysAgo)).limit(500).get();
  if (oldNotifications.empty) return null;
  const batch = admin.firestore().batch();
  oldNotifications.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
  return null;
});

/* ============================================================
    🔔 SEND NOTIFICATION (HTTP)
============================================================ */
exports.sendNotification = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    try {
      if (req.method === "OPTIONS") return res.status(204).send("");
      if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
      const authHeader = req.headers.authorization || "";
      const idToken = authHeader.startsWith("Bearer ") ? authHeader.substring(7) : null;
      if (!idToken) return res.status(401).json({ error: "Missing Authorization token" });
      const decoded = await admin.auth().verifyIdToken(idToken);
      const isAdmin = decoded.role === "admin" || ADMIN_EMAILS.includes(decoded.email);
      const { userId, type, title, message, priority, data } = req.body;
      if (!isAdmin && userId !== decoded.uid) return res.status(403).json({ error: "Forbidden" });
      if (!userId || !type || !title || !message) return res.status(400).json({ error: "Missing required fields" });
      const docRef = await createNotification({ userId, type, title, message, priority: priority || "normal", data: data || {} });
      return res.json({ success: true, notificationId: docRef.id });
    } catch (err) {
      return res.status(500).json({ error: "Internal server error" });
    }
  });
});

/* ============================================================
    🚀 ENHANCED SEND PUSH NOTIFICATION (FCM Trigger)
    - Better error logging
    - Token validation
    - Expired token cleanup
    - Supports customers, vendors, AND drivers
============================================================ */
exports.sendPushNotification = functions.firestore
  .document("notifications/{notificationId}")
  .onCreate(async (snap) => {
    const notification = snap.data();
    const notificationId = snap.id;
    const userId = notification.userId;

    // ── Validation ────────────────────────────────────────────
    if (!userId) {
      console.error(`[FCM] No userId in notification ${notificationId}`);
      return;
    }

    console.log(`[FCM] Processing notification ${notificationId} for user ${userId}`);
    console.log(`[FCM] Type: ${notification.type}, Title: ${notification.title}`);

    try {
      // ── Get user's FCM token ──────────────────────────────────
      const tokenDoc = await admin.firestore().collection("pushTokens").doc(userId).get();

      if (!tokenDoc.exists) {
        console.warn(`[FCM] ❌ No push token found for user ${userId}`);
        console.warn(`[FCM] User needs to login to mobile app to register FCM token`);
        
        // Log this to a collection for admin visibility
        await admin.firestore().collection("fcmErrors").add({
          userId,
          notificationId,
          error: "NO_TOKEN",
          message: "User has no FCM token registered",
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });
        
        return;
      }

      const tokenData = tokenDoc.data();
      const pushToken = tokenData.token;

      if (!pushToken) {
        console.warn(`[FCM] ❌ Empty token for user ${userId}`);
        return;
      }

      console.log(`[FCM] ✅ Found token for user ${userId}: ${pushToken.substring(0, 20)}...`);

      // ── Build FCM payload ─────────────────────────────────────
      // Route order-related notifications to the loud "orders" channel;
      // broadcasts and general notifications stay on "default".
      const isBroadcast = notification.type === "broadcast";
      const channelId = isBroadcast ? "default" : "orders";

      const payload = {
        token: pushToken,
        notification: {
          title: notification.title,
          body: notification.message,
        },
        android: {
          priority: "high",                          // Wake device from Doze
          notification: {
            sound: "notification_sound",             // matches res/raw/notification_sound.mp3
            channelId: channelId,
            priority: "max",                         // Highest visual priority
            defaultVibrateTimings: false,
            vibrateTimingsMillis: [0, 500, 200, 500],
            visibility: "public",
            notificationCount: 1,
            clickAction: "FCM_PLUGIN_ACTIVITY",
          },
        },
        apns: {
          headers: {
            "apns-priority": "10",                   // Immediate delivery on iOS
          },
          payload: {
            aps: {
              sound: "default",
              badge: 1,
              contentAvailable: true,
              interruptionLevel: "time-sensitive",    // iOS 15+ loud delivery
            },
          },
        },
        data: {
          notificationId,
          type: notification.type || "general",
          url: notification.data?.url || "/",
          ...notification.data,
        },
      };

      // ── Send FCM message ──────────────────────────────────────
      console.log(`[FCM] Sending push to ${userId}...`);
      const response = await admin.messaging().send(payload);
      console.log(`[FCM] ✅ Successfully sent to ${userId}. MessageId: ${response}`);

    } catch (error) {
      console.error(`[FCM] ❌ Error sending push to ${userId}:`, error);

      // ── Handle invalid/expired tokens ─────────────────────────
      if (
        error.code === "messaging/invalid-registration-token" ||
        error.code === "messaging/registration-token-not-registered"
      ) {
        console.warn(`[FCM] Token expired/invalid for ${userId}, removing from DB`);
        
        // Delete the invalid token
        await admin.firestore().collection("pushTokens").doc(userId).delete();
        
        // Log for admin visibility
        await admin.firestore().collection("fcmErrors").add({
          userId,
          notificationId,
          error: "INVALID_TOKEN",
          message: "Token expired or invalid, user needs to re-login",
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });
      } else {
        // Log other errors
        await admin.firestore().collection("fcmErrors").add({
          userId,
          notificationId,
          error: error.code || "UNKNOWN",
          message: error.message || "Unknown FCM error",
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    }
  });

/* ============================================================
    🚗 DRIVER: Order Assignment Notification
    Triggers when a driver is assigned to an order
============================================================ */
exports.onOrderAssignedToDriver = functions.firestore
  .document("orders/{orderId}")
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    const orderId = context.params.orderId;

    // Check if driver was just assigned
    if (!before.driverId && after.driverId) {
      console.log(`[Driver Notification] Order ${orderId} assigned to driver ${after.driverId}`);

      try {
        // Create notification for driver
        await createNotification({
          userId: after.driverId,
          type: "order_assigned",
          title: "🚗 New Delivery Assignment!",
          message: `Order #${orderId.slice(0, 8).toUpperCase()} - Pick up from ${after.vendorName || "vendor"}`,
          priority: "high",
          data: {
            orderId,
            vendorId: after.vendorId,
            vendorName: after.vendorName,
            customerName: after.customerName,
            deliveryAddress: after.deliveryAddress,
            orderTotal: after.total,
            url: `/driver/deliveries/${orderId}`,
          },
        });

        console.log(`[Driver Notification] ✅ Notification sent to driver ${after.driverId}`);

        // Also notify customer that driver was assigned
        if (after.customerId) {
          await createNotification({
            userId: after.customerId,
            type: "driver_assigned",
            title: "Driver Assigned 🚗",
            message: `Your order is being picked up by ${after.driverName || "a driver"}`,
            priority: "normal",
            data: {
              orderId,
              driverId: after.driverId,
              driverName: after.driverName,
              url: `/account/orders/${orderId}`,
            },
          });
        }

      } catch (error) {
        console.error(`[Driver Notification] Error:`, error);
      }
    }

    return null;
  });


/* ============================================================
    🚗 DRIVER: Status Change Notifications
    Notifies driver when order status changes
============================================================ */
exports.onDriverOrderStatusChange = functions.firestore
  .document("orders/{orderId}")
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    const orderId = context.params.orderId;

    // Only process if there's a driver assigned
    if (!after.driverId) return null;

    // Status didn't change
    if (before.status === after.status) return null;

    const statusMessages = {
      ready: {
        type: "order_ready_pickup",
        title: "📦 Order Ready for Pickup",
        message: `Order #${orderId.slice(0, 8).toUpperCase()} at ${after.vendorName || "vendor"} is ready!`,
        priority: "high",
      },
      out_for_delivery: {
        type: "delivery_in_progress",
        title: "🚗 Delivery in Progress",
        message: `Delivering order #${orderId.slice(0, 8).toUpperCase()} to customer`,
        priority: "normal",
      },
      delivered: {
        type: "delivery_completed",
        title: "✅ Delivery Completed!",
        message: `Order #${orderId.slice(0, 8).toUpperCase()} delivered successfully`,
        priority: "normal",
      },
    };

    const config = statusMessages[after.status];
    
    if (config) {
      try {
        await createNotification({
          userId: after.driverId,
          type: config.type,
          title: config.title,
          message: config.message,
          priority: config.priority,
          data: {
            orderId,
            vendorId: after.vendorId,
            customerId: after.customerId,
            status: after.status,
            url: `/driver/deliveries/${orderId}`,
          },
        });

        console.log(`[Driver Notification] ✅ Status change notification sent to driver ${after.driverId}`);
      } catch (error) {
        console.error(`[Driver Notification] Error:`, error);
      }
    }

    return null;
  });


/* ============================================================
    🚗 DRIVER: Customer Note Notification
    Manual function to notify driver of customer messages
============================================================ */
exports.notifyDriverOfCustomerNote = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Login required");
  }

  const { orderId, note, driverId } = data;

  if (!orderId || !note || !driverId) {
    throw new functions.https.HttpsError("invalid-argument", "Missing required fields");
  }

  try {
    await createNotification({
      userId: driverId,
      type: "customer_note",
      title: "💬 Customer Note",
      message: note,
      priority: "normal",
      data: {
        orderId,
        url: `/driver/deliveries/${orderId}`,
      },
    });

    return { success: true };
  } catch (error) {
    throw new functions.https.HttpsError("internal", error.message);
  }
});


/* ============================================================
    📊 ADMIN: Get FCM Token Status
    View which users have FCM tokens and recent errors
============================================================ */
exports.getFCMStatus = functions.https.onCall(async (data, context) => {
  // Admin-only
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Login required");
  }

  const isAdmin =
    context.auth.token.role === "admin" ||
    ADMIN_EMAILS.includes(context.auth.token.email);

  if (!isAdmin) {
    throw new functions.https.HttpsError("permission-denied", "Admin only");
  }

  try {
    // Get all tokens
    const tokensSnap = await admin.firestore().collection("pushTokens").get();
    const tokens = [];
    
    tokensSnap.forEach((doc) => {
      const data = doc.data();
      tokens.push({
        userId: doc.id,
        platform: data.platform,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      });
    });

    // Get recent errors (last 100)
    const errorsSnap = await admin
      .firestore()
      .collection("fcmErrors")
      .orderBy("timestamp", "desc")
      .limit(100)
      .get();
    
    const errors = [];
    errorsSnap.forEach((doc) => {
      errors.push({ id: doc.id, ...doc.data() });
    });

    return {
      totalTokens: tokens.length,
      tokens,
      recentErrors: errors,
    };
  } catch (error) {
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/* ============================================================
    🚗 SET DRIVER ROLE
============================================================ */
exports.setDriverRole = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    try {
      if (req.method === "OPTIONS") return res.status(204).send("");
      if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
      const authHeader = req.headers.authorization || "";
      const idToken = authHeader.startsWith("Bearer ") ? authHeader.substring(7) : null;
      if (!idToken) return res.status(401).json({ error: "Missing Authorization token" });
      const decoded = await admin.auth().verifyIdToken(idToken);
      const isAdmin = decoded.role === "admin" || ADMIN_EMAILS.includes(decoded.email);
      if (!isAdmin) return res.status(403).json({ error: "Only admins can assign driver role" });
      let body = req.body;
      if (typeof body === "string") body = JSON.parse(body);
      const { uid, email, name, phone, vehicleType } = body;
      if (!uid) return res.status(400).json({ error: "Missing uid" });
      await admin.auth().setCustomUserClaims(uid, { role: "driver" });
      const driverRef = admin.firestore().collection("drivers").doc(uid);
      const driverDoc = await driverRef.get();
      if (!driverDoc.exists) {
        await driverRef.set({
          userId: uid, email: email || "", name: name || "Driver", phone: phone || "", status: "offline", isOnline: false,
          vehicleType: vehicleType || "motorcycle", totalDeliveries: 0, rating: 5.0, ratingCount: 0, isVerified: true,
          verifiedAt: admin.firestore.FieldValue.serverTimestamp(), createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      } else {
        await driverRef.update({ isVerified: true, verifiedAt: admin.firestore.FieldValue.serverTimestamp(), updatedAt: admin.firestore.FieldValue.serverTimestamp() });
      }
      return res.json({ success: true, message: `Driver role assigned to ${uid}`, uid });
    } catch (err) {
      return res.status(500).json({ error: "Internal server error" });
    }
  });
});

/* ============================================================
    📍 UPDATE DRIVER LOCATION
============================================================ */
exports.updateDriverLocation = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Login required.");
  const userId = context.auth.uid;
  const { latitude, longitude, heading, speed } = data;
  if (typeof latitude !== "number" || typeof longitude !== "number") {
    throw new functions.https.HttpsError("invalid-argument", "Valid coordinates required.");
  }
  const driverRef = admin.firestore().collection("drivers").doc(userId);
  const driverDoc = await driverRef.get();
  if (!driverDoc.exists) throw new functions.https.HttpsError("not-found", "Driver not found.");
  await driverRef.update({
    currentLocation: { lat: latitude, lng: longitude },
    lastLocationUpdate: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  await admin.firestore().collection("drivers").doc(userId).collection("locationHistory").doc().set({
    coordinates: { lat: latitude, lng: longitude }, heading: heading || null, speed: speed || null,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });
  const driverData = driverDoc.data();
  if (driverData.currentOrderId) {
    await admin.firestore().collection("orders").doc(driverData.currentOrderId).update({
      driverLocation: { lat: latitude, lng: longitude },
      driverLocationUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
  return { success: true };
});

/* ============================================================
    🎯 CLAIM ORDER
    ─────────────────────────────────────────────────────────────
    FIX 2: Added 'ready_for_pickup' to claimableStatuses
    FIX 3: Smart stale-order detection for currentOrderId —
           if the referenced order is delivered/cancelled/missing
           or reassigned, auto-clear and allow the new claim.
    
    ROLLBACK: Revert claimableStatuses to ["ready","confirmed","preparing"]
              and replace stale-check block with:
              if (driverData.currentOrderId) throw ...
============================================================ */
exports.claimOrder = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Login required.");
  const userId = context.auth.uid;
  const { orderId } = data;
  if (!orderId) throw new functions.https.HttpsError("invalid-argument", "Order ID required.");

  const driverRef = admin.firestore().collection("drivers").doc(userId);
  const driverDoc = await driverRef.get();
  if (!driverDoc.exists) throw new functions.https.HttpsError("permission-denied", "Not a driver.");
  const driverData = driverDoc.data();
  if (!driverData.isVerified) throw new functions.https.HttpsError("permission-denied", "Driver not verified.");

  // ══════════════════════════════════════════════════════════════
  // FIX 3: Smart stale-order detection
  // Instead of blindly blocking, verify the referenced order is
  // actually still active. If terminal/missing, auto-clear.
  // ══════════════════════════════════════════════════════════════
  if (driverData.currentOrderId) {
    const terminalStatuses = ["delivered", "cancelled"];
    try {
      const existingOrderRef = admin.firestore().collection("orders").doc(driverData.currentOrderId);
      const existingOrderDoc = await existingOrderRef.get();

      if (!existingOrderDoc.exists) {
        // Order deleted — clear stale reference
        console.log(`[claimOrder] Clearing stale currentOrderId=${driverData.currentOrderId} (not found) for driver ${userId}`);
        await driverRef.update({ currentOrderId: null, status: "online", updatedAt: admin.firestore.FieldValue.serverTimestamp() });
      } else {
        const existingOrderData = existingOrderDoc.data();
        if (terminalStatuses.includes(existingOrderData.status)) {
          // Order delivered/cancelled — clear stale reference
          console.log(`[claimOrder] Clearing stale currentOrderId=${driverData.currentOrderId} (status=${existingOrderData.status}) for driver ${userId}`);
          await driverRef.update({ currentOrderId: null, status: "online", updatedAt: admin.firestore.FieldValue.serverTimestamp() });
        } else if (existingOrderData.driverId !== userId) {
          // Order reassigned to another driver — clear
          console.log(`[claimOrder] Clearing stale currentOrderId=${driverData.currentOrderId} (reassigned to ${existingOrderData.driverId}) for driver ${userId}`);
          await driverRef.update({ currentOrderId: null, status: "online", updatedAt: admin.firestore.FieldValue.serverTimestamp() });
        } else {
          // Order is genuinely active and assigned to this driver
          throw new functions.https.HttpsError("failed-precondition", "You already have an active order.");
        }
      }
    } catch (err) {
      // Re-throw HttpsErrors (the genuine "active order" case)
      if (err.code && String(err.code).includes("failed-precondition")) throw err;
      // For unexpected errors, log and clear to avoid permanent blocking
      console.error(`[claimOrder] Error checking stale order, clearing:`, err);
      await driverRef.update({ currentOrderId: null, status: "online", updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    }
  }

  const result = await admin.firestore().runTransaction(async (transaction) => {
    const orderRef = admin.firestore().collection("orders").doc(orderId);
    const orderDoc = await transaction.get(orderRef);
    if (!orderDoc.exists) throw new functions.https.HttpsError("not-found", "Order not found.");
    const orderData = orderDoc.data();
    if (orderData.driverId) throw new functions.https.HttpsError("already-exists", "Order already claimed.");

    // FIX 2: Added 'ready_for_pickup' — vendor flow sets this status
    const claimableStatuses = ["ready", "ready_for_pickup", "confirmed", "preparing"];
    if (!claimableStatuses.includes(orderData.status)) throw new functions.https.HttpsError("failed-precondition", `Cannot claim. Status: ${orderData.status}`);

    const updateData = {
      driverId: userId, driverName: driverData.name, driverPhone: driverData.phone || null,
      status: "claimed", deliveryStatus: "claimed",
      claimedAt: admin.firestore.FieldValue.serverTimestamp(), updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    transaction.update(orderRef, updateData);
    transaction.update(admin.firestore().collection("vendors").doc(orderData.vendorId).collection("orders").doc(orderId), updateData);
    transaction.update(admin.firestore().collection("customers").doc(orderData.customerId).collection("orders").doc(orderId), updateData);
    transaction.update(driverRef, { status: "busy", currentOrderId: orderId, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    return { orderId, vendorId: orderData.vendorId, customerId: orderData.customerId };
  });

  try {
    await createNotification({
      userId: result.customerId,
      type: "driver_assigned",
      title: "Driver Assigned 🚗",
      message: `${driverData.name} has been assigned to your order.`,
      data: { orderId, driverId: userId, driverName: driverData.name, url: "/account" },
    });
  } catch (notifErr) {
    console.error("[claimOrder] Notification error (non-blocking):", notifErr);
  }

  return { success: true, orderId, message: "Order claimed successfully" };
});

/* ============================================================
    ✅ COMPLETE DELIVERY
============================================================ */
exports.completeDelivery = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Login required.");
  const userId = context.auth.uid;
  const { orderId, deliveryPin } = data;
  if (!orderId) throw new functions.https.HttpsError("invalid-argument", "Order ID required.");
  const orderRef = admin.firestore().collection("orders").doc(orderId);
  const orderDoc = await orderRef.get();
  if (!orderDoc.exists) throw new functions.https.HttpsError("not-found", "Order not found.");
  const orderData = orderDoc.data();
  if (orderData.driverId !== userId) throw new functions.https.HttpsError("permission-denied", "Not your order.");
  if (deliveryPin && orderData.trackingPin !== deliveryPin) throw new functions.https.HttpsError("invalid-argument", "Invalid PIN.");
  const updateData = { status: "delivered", deliveryStatus: "delivered", deliveredAt: admin.firestore.FieldValue.serverTimestamp(), updatedAt: admin.firestore.FieldValue.serverTimestamp() };
  await orderRef.update(updateData);
  await admin.firestore().collection("vendors").doc(orderData.vendorId).collection("orders").doc(orderId).update(updateData);
  await admin.firestore().collection("customers").doc(orderData.customerId).collection("orders").doc(orderId).update(updateData);
  const driverRef = admin.firestore().collection("drivers").doc(userId);
  const driverDoc = await driverRef.get();
  const driverData = driverDoc.data();
  await driverRef.update({
    status: "available", currentOrderId: null, totalDeliveries: (driverData.totalDeliveries || 0) + 1,
    lastDeliveryAt: admin.firestore.FieldValue.serverTimestamp(), updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  await createNotification({
    userId: orderData.customerId,
    type: "order_delivered",
    title: "Order Delivered! ✅",
    message: `Your order from ${orderData.vendorName} has been delivered. Enjoy!`,
    data: { orderId, vendorId: orderData.vendorId, vendorName: orderData.vendorName, url: "/account" },
  });
  return { success: true, message: "Delivery completed" };
});

/* ============================================================
    📢 SEND BROADCAST NOTIFICATION (Admin Only) - SENDS 1X
============================================================ */
exports.sendBroadcastNotification = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Login required");
  const isAdmin = context.auth.token.role === "admin" || ADMIN_EMAILS.includes(context.auth.token.email);
  if (!isAdmin) throw new functions.https.HttpsError("permission-denied", "Admin only");
  
  const { title, message, url } = data;
  if (!title || !message) throw new functions.https.HttpsError("invalid-argument", "Title and message required");
  
  const tokensSnapshot = await admin.firestore().collection("pushTokens").get();
  if (tokensSnapshot.empty) return { success: false, message: "No users with push tokens", totalUsers: 0 };
  
  const tokens = [];
  const userIds = [];
  tokensSnapshot.forEach((doc) => {
    tokens.push(doc.data().token);
    userIds.push(doc.id);
  });
  
  console.log(`Sending broadcast to ${tokens.length} users`);
  
  const batchSize = 500;
  let successCount = 0;
  let failureCount = 0;
  
  // Send ONCE
  for (let i = 0; i < tokens.length; i += batchSize) {
    const batchTokens = tokens.slice(i, i + batchSize);
    try {
      const response = await admin.messaging().sendEachForMulticast({
        tokens: batchTokens,
        notification: { title, body: message },
        data: { type: "broadcast", url: url || "/" },
        android: {
          priority: "high",
          notification: {
            sound: "notification_sound",
            channelId: "default",
            priority: "max",
            defaultVibrateTimings: false,
            vibrateTimingsMillis: [0, 400, 200, 400],
            visibility: "public",
            notificationCount: 1,
          },
        },
        apns: {
          headers: { "apns-priority": "10" },
          payload: {
            aps: {
              sound: "default",
              badge: 1,
              contentAvailable: true,
              interruptionLevel: "time-sensitive",
            },
          },
        },
      });
      successCount += response.successCount;
      failureCount += response.failureCount;
    } catch (error) {
      console.error("Batch send error:", error);
      failureCount += batchTokens.length;
    }
  }
  
  // Create in-app notification
  const firestoreBatch = admin.firestore().batch();
  const now = admin.firestore.FieldValue.serverTimestamp();
  for (const uId of userIds) {
    const notifRef = admin.firestore().collection("notifications").doc();
    firestoreBatch.set(notifRef, {
      userId: uId,
      type: "broadcast",
      title,
      message,
      priority: "high",
      read: false,
      data: { url: url || "/" },
      createdAt: now,
    });
  }
  await firestoreBatch.commit();
  
  console.log(`Broadcast complete: ${successCount} success, ${failureCount} failed`);
  return { success: true, totalUsers: tokens.length, successCount, failureCount };
});
/* ============================================================
    📦 AUTO-POPULATE DELIVERY QUEUE
    ─────────────────────────────────────────────────────────────
    Triggers when an order status changes to 'ready' or
    'ready_for_pickup' AND the fulfillment type is 'delivery'.
    Creates a doc in delivery_queue so drivers see it instantly.
    
    Also handles cleanup: if an order is cancelled, removes the
    corresponding delivery_queue entry.
    
    ADD THIS BLOCK to functions/index.js (after the existing
    onOrderStatusChange function).
    
    ROLLBACK: Delete this function and redeploy:
      firebase deploy --only functions:onOrderReadyForDelivery
      firebase deploy --only functions:onOrderCancelledCleanup
============================================================ */

exports.onOrderReadyForDelivery = functions.firestore
  .document("orders/{orderId}")
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    const orderId = context.params.orderId;

    // ── Only trigger on status change ─────────────────────────
    if (before.status === after.status) return null;

    // ── Only trigger for delivery orders ──────────────────────
    const fulfillmentType = after.fulfillmentType || after.deliveryMethod || "delivery";
    if (fulfillmentType === "pickup") return null;

    // ── Only trigger when status becomes ready ────────────────
    const readyStatuses = ["ready", "ready_for_pickup"];
    if (!readyStatuses.includes(after.status)) return null;

    // ── Don't trigger if already claimed by a driver ──────────
    if (after.driverId) {
      console.log(`[onOrderReadyForDelivery] Order ${orderId} already has driver ${after.driverId}, skipping queue.`);
      return null;
    }

    // ── Prevent duplicates — check if queue entry already exists
    const existingQueue = await admin.firestore()
      .collection("delivery_queue")
      .where("orderId", "==", orderId)
      .where("status", "in", ["pending", "assigned"])
      .limit(1)
      .get();

    if (!existingQueue.empty) {
      console.log(`[onOrderReadyForDelivery] Queue entry already exists for order ${orderId}, skipping.`);
      return null;
    }

    // ── Gather vendor info ────────────────────────────────────
    let vendorData = {};
    if (after.vendorId) {
      try {
        const vendorDoc = await admin.firestore()
          .collection("vendors")
          .doc(after.vendorId)
          .get();
        if (vendorDoc.exists) {
          const vd = vendorDoc.data();
          vendorData = {
            vendorName: vd.name || after.vendorName || "Unknown Vendor",
            vendorAddress: vd.address || after.vendorAddress || "",
            vendorPhone: vd.phone || after.vendorPhone || null,
            vendorLocation: vd.coordinates || vd.location || after.vendorCoordinates || null,
          };
        }
      } catch (err) {
        console.error(`[onOrderReadyForDelivery] Error fetching vendor ${after.vendorId}:`, err);
      }
    }

    // ── Build customer address string ─────────────────────────
    const deliveryAddr = after.deliveryAddress || after.shippingAddress || {};
    const customerAddressParts = [
      deliveryAddr.street,
      deliveryAddr.city,
      deliveryAddr.state,
      deliveryAddr.zip || deliveryAddr.postalCode,
    ].filter(Boolean);
    const customerAddress = customerAddressParts.join(", ") || "Address not provided";

    // ── Calculate estimated distance if coordinates available ──
    let estimatedDistance = null;
    let estimatedTime = null;
    const vendorCoords = vendorData.vendorLocation || after.vendorCoordinates;
    const customerCoords = deliveryAddr.coordinates || after.customerCoordinates;

    if (isValidCoordinates(vendorCoords) && isValidCoordinates(customerCoords)) {
      estimatedDistance = calculateDistance(vendorCoords, customerCoords);
      // Rough estimate: 2 min per km in urban area
      estimatedTime = Math.max(5, Math.round(estimatedDistance * 2));
    }

    // ── Calculate delivery fee ─────────────────────────────────
    let deliveryFee = after.deliveryFee || 0;
    if (!deliveryFee && estimatedDistance) {
      // Use dynamic fee if none set on order
      deliveryFee = calculateDeliveryFee(estimatedDistance);
    }

    // ── Count items ────────────────────────────────────────────
    const items = after.items || [];
    const itemCount = items.reduce((sum, item) => sum + (item.quantity || 1), 0);

    // ── Determine priority ─────────────────────────────────────
    // High priority if order has been waiting > 15 min since confirmed
    let priority = "normal";
    if (after.confirmedAt) {
      const confirmedTime = after.confirmedAt.toMillis
        ? after.confirmedAt.toMillis()
        : new Date(after.confirmedAt).getTime();
      const waitMinutes = (Date.now() - confirmedTime) / 60000;
      if (waitMinutes > 15) priority = "high";
    }

    // ── Create delivery_queue entry ───────────────────────────
    const queueEntry = {
      // Order reference
      orderId: orderId,
      orderDisplayId: after.orderId || orderId.slice(0, 8).toUpperCase(),

      // Vendor info
      vendorId: after.vendorId || null,
      vendorName: vendorData.vendorName || after.vendorName || "Unknown Vendor",
      vendorAddress: vendorData.vendorAddress || after.vendorAddress || "",
      vendorPhone: vendorData.vendorPhone || after.vendorPhone || null,
      vendorLocation: vendorCoords || null,

      // Customer info
      customerId: after.customerId || null,
      customerName: after.customerInfo?.name || after.customerName || "Customer",
      customerAddress: customerAddress,
      customerPhone: after.customerInfo?.phone || after.customerPhone || null,
      customerLocation: customerCoords || null,

      // Order details
      itemCount: itemCount,
      orderTotal: after.total || 0,
      deliveryFee: deliveryFee,
      tip: after.tip || 0,

      // Logistics
      estimatedDistance: estimatedDistance ? Math.round(estimatedDistance * 10) / 10 : null,
      estimatedTime: estimatedTime,
      priority: priority,

      // Status tracking
      status: "pending",
      driverId: null,
      driverName: null,

      // Timestamps
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      orderCreatedAt: after.createdAt || null,
      assignedAt: null,
      pickedUpAt: null,
      deliveredAt: null,
      cancelledAt: null,
      cancelledBy: null,
      cancellationReason: null,
    };

    try {
      const docRef = await admin.firestore()
        .collection("delivery_queue")
        .add(queueEntry);

      console.log(`[onOrderReadyForDelivery] Created queue entry ${docRef.id} for order ${orderId} (${itemCount} items, ${priority} priority)`);

      // ── Notify online drivers ───────────────────────────────
      // Query up to 10 online drivers to notify
      const onlineDrivers = await admin.firestore()
        .collection("drivers")
        .where("status", "==", "online")
        .where("verified", "==", true)
        .limit(10)
        .get();

      if (!onlineDrivers.empty) {
        const notifications = onlineDrivers.docs.map((driverDoc) =>
          createNotification({
            userId: driverDoc.id,
            type: "system",
            title: "New Delivery Available! 📦",
            message: `Pickup from ${queueEntry.vendorName} — ${itemCount} item${itemCount !== 1 ? "s" : ""} — RD$${deliveryFee.toLocaleString()} fee`,
            priority: priority === "high" ? "high" : "normal",
            data: {
              orderId,
              queueId: docRef.id,
              vendorName: queueEntry.vendorName,
              url: "/driver/dashboard",
            },
          })
        );

        await Promise.allSettled(notifications);
        console.log(`[onOrderReadyForDelivery] Notified ${onlineDrivers.size} online drivers.`);
      }

      return { success: true, queueId: docRef.id };
    } catch (err) {
      console.error(`[onOrderReadyForDelivery] Error creating queue entry for order ${orderId}:`, err);
      return null;
    }
  });


/* ============================================================
    🗑️ CLEANUP DELIVERY QUEUE ON ORDER CANCELLATION
    ─────────────────────────────────────────────────────────────
    When an order is cancelled, remove or mark the corresponding
    delivery_queue entry so drivers don't see stale orders.
    
    FIX 3b: Also clears currentOrderId on the assigned driver
            to prevent stale blocking on next claim attempt.
============================================================ */
exports.onOrderCancelledCleanup = functions.firestore
  .document("orders/{orderId}")
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    const orderId = context.params.orderId;

    // Only trigger when status changes to cancelled
    if (before.status === after.status) return null;
    if (after.status !== "cancelled") return null;

    try {
      // Find all queue entries for this order
      const queueEntries = await admin.firestore()
        .collection("delivery_queue")
        .where("orderId", "==", orderId)
        .get();

      if (queueEntries.empty) {
        console.log(`[onOrderCancelledCleanup] No queue entries for order ${orderId}.`);
        return null;
      }

      const batch = admin.firestore().batch();
      let assignedDriverId = null;

      queueEntries.docs.forEach((queueDoc) => {
        const queueData = queueDoc.data();
        
        if (queueData.status === "pending") {
          // Not yet assigned — just delete it
          batch.delete(queueDoc.ref);
        } else if (["assigned", "heading_to_pickup", "at_pickup", "picked_up", "heading_to_customer", "at_customer"].includes(queueData.status)) {
          // Already assigned to a driver — mark cancelled, track driver
          assignedDriverId = queueData.driverId;
          batch.update(queueDoc.ref, {
            status: "cancelled",
            cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
            cancelledBy: "system",
            cancellationReason: "Order cancelled by vendor or customer",
          });
        }
        // delivered entries stay as-is
      });

      await batch.commit();

      // If a driver was assigned, free them up
      if (assignedDriverId) {
        // Remove active delivery
        const activeDeliveryRef = admin.firestore()
          .collection("driver_active_deliveries")
          .doc(assignedDriverId);
        
        const activeDoc = await activeDeliveryRef.get();
        if (activeDoc.exists && activeDoc.data().orderId === orderId) {
          await activeDeliveryRef.delete();
        }

        // FIX 3b: Set driver back to online AND clear currentOrderId
        await admin.firestore()
          .collection("drivers")
          .doc(assignedDriverId)
          .update({
            status: "online",
            currentOrderId: null,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });

        // Notify driver
        await createNotification({
          userId: assignedDriverId,
          type: "order_cancelled",
          title: "Delivery Cancelled ❌",
          message: `Order #${orderId.slice(0, 8).toUpperCase()} has been cancelled. You're back online.`,
          priority: "high",
          data: { orderId, url: "/driver/dashboard" },
        });

        console.log(`[onOrderCancelledCleanup] Freed driver ${assignedDriverId} from cancelled order ${orderId}.`);
      }

      console.log(`[onOrderCancelledCleanup] Cleaned up ${queueEntries.size} queue entries for order ${orderId}.`);
      return null;
    } catch (err) {
      console.error(`[onOrderCancelledCleanup] Error cleaning up order ${orderId}:`, err);
      return null;
    }
  });


/* ============================================================
    🔄 SYNC QUEUE STATUS WITH DELIVERY PROGRESS
    ─────────────────────────────────────────────────────────────
    When driver_active_deliveries updates (driver progressing
    through delivery stages), sync status back to delivery_queue
    and orders collection for customer tracking.
============================================================ */
exports.onActiveDeliveryUpdate = functions.firestore
  .document("driver_active_deliveries/{driverId}")
  .onWrite(async (change, context) => {
    const driverId = context.params.driverId;

    // ── Document deleted (delivery completed or cancelled) ────
    if (!change.after.exists) {
      console.log(`[onActiveDeliveryUpdate] Active delivery removed for driver ${driverId}.`);
      return null;
    }

    const data = change.after.data();
    const orderId = data.orderId;
    const queueId = data.queueId;
    const status = data.status;

    if (!orderId) return null;

    try {
      // ── Sync status to orders collection ─────────────────────
      const orderUpdates = {
        delivery_status: status,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      // Map active delivery statuses to order-level statuses
      if (status === "heading_to_pickup" || status === "at_pickup") {
        orderUpdates.status = "claimed";
        orderUpdates.deliveryStatus = "claimed";
      } else if (status === "picked_up" || status === "heading_to_customer") {
        orderUpdates.status = "out_for_delivery";
        orderUpdates.deliveryStatus = "in_transit";
        orderUpdates.pickedUpAt = data.pickedUpAt || admin.firestore.FieldValue.serverTimestamp();
      } else if (status === "at_customer") {
        orderUpdates.status = "out_for_delivery";
        orderUpdates.deliveryStatus = "arriving";
      }

      await admin.firestore()
        .collection("orders")
        .doc(orderId)
        .update(orderUpdates);

      // ── Sync to vendor subcollection ─────────────────────────
      if (data.vendorId) {
        try {
          await admin.firestore()
            .collection("vendors")
            .doc(data.vendorId)
            .collection("orders")
            .doc(orderId)
            .update(orderUpdates);
        } catch (err) {
          // Vendor subcollection doc might not exist
          console.warn(`[onActiveDeliveryUpdate] Could not update vendor subcollection:`, err.message);
        }
      }

      // ── Sync to customer subcollection ───────────────────────
      if (data.customerId) {
        try {
          await admin.firestore()
            .collection("customers")
            .doc(data.customerId)
            .collection("orders")
            .doc(orderId)
            .update(orderUpdates);
        } catch (err) {
          console.warn(`[onActiveDeliveryUpdate] Could not update customer subcollection:`, err.message);
        }
      }

      // ── Sync to delivery_queue ───────────────────────────────
      if (queueId) {
        await admin.firestore()
          .collection("delivery_queue")
          .doc(queueId)
          .update({
            status: status,
            driverId: driverId,
            driverName: data.driverName || null,
          });
      }

      console.log(`[onActiveDeliveryUpdate] Synced status '${status}' for order ${orderId} (driver ${driverId}).`);
      return null;
    } catch (err) {
      console.error(`[onActiveDeliveryUpdate] Error syncing delivery status:`, err);
      return null;
    }
  });


  /* ============================================================
    💬 SUPPORT MESSAGING — Cloud Functions
    Append this entire block to the bottom of functions/index.js
============================================================ */

/**
 * onSupportMessageCreate
 * Trigger: When a new message is added to supportTickets/{ticketId}/messages
 *
 * Actions:
 * 1. Update parent ticket's lastMessage, lastMessageAt, updatedAt
 * 2. Increment the appropriate unreadBy* counter
 *    - If sender is admin → increment unreadByUser
 *    - If sender is user  → increment unreadByAdmin
 */
exports.onSupportMessageCreate = functions.firestore
  .document("supportTickets/{ticketId}/messages/{messageId}")
  .onCreate(async (snap, context) => {
    const { ticketId } = context.params;
    const message = snap.data();

    if (!message) {
      functions.logger.warn("onSupportMessageCreate: No message data", { ticketId });
      return null;
    }

    // Don't update counters for system messages
    if (message.type === "system") {
      return null;
    }

    const ticketRef = admin.firestore().collection("supportTickets").doc(ticketId);
    const now = admin.firestore.FieldValue.serverTimestamp();

    // Build the preview text (truncate to 100 chars)
    const previewText = message.type === "image"
      ? "📷 Image"
      : (message.text || "").substring(0, 100);

    // Determine which unread counter to increment
    const isAdminSender = message.senderRole === "admin";

    const updateData = {
      lastMessage: previewText,
      lastMessageAt: now,
      updatedAt: now,
    };

    if (isAdminSender) {
      // Admin sent a message → user hasn't read it
      updateData.unreadByUser = admin.firestore.FieldValue.increment(1);
    } else {
      // User sent a message → admin hasn't read it
      updateData.unreadByAdmin = admin.firestore.FieldValue.increment(1);
    }

    try {
      await ticketRef.update(updateData);
      functions.logger.info("Support ticket updated", {
        ticketId,
        sender: message.senderRole,
        messageType: message.type,
      });
    } catch (error) {
      functions.logger.error("Failed to update support ticket", {
        ticketId,
        error: error.message,
      });
    }

    // ---- FCM NOTIFICATIONS ----
    try {
      const ticketSnap = await ticketRef.get();
      if (!ticketSnap.exists) return null;
      const ticket = ticketSnap.data();

      if (isAdminSender) {
        // Admin replied → notify the user who owns the ticket
        const userId = ticket.userId;
        if (!userId) return null;

        // Fetch user's FCM tokens from push_tokens collection
        const tokensSnap = await admin.firestore()
          .collection("push_tokens")
          .where("userId", "==", userId)
          .get();

        if (!tokensSnap.empty) {
          const tokens = tokensSnap.docs.map((doc) => doc.data().token).filter(Boolean);
          if (tokens.length > 0) {
            const payload = {
              notification: {
                title: "Support Reply",
                body: previewText,
              },
              android: {
                priority: "high",
                notification: {
                  sound: "notification_sound",
                  channelId: "orders",
                  priority: "max",
                  defaultVibrateTimings: false,
                  vibrateTimingsMillis: [0, 500, 200, 500],
                  visibility: "public",
                  notificationCount: 1,
                },
              },
              apns: {
                headers: { "apns-priority": "10" },
                payload: {
                  aps: {
                    sound: "default",
                    badge: 1,
                    contentAvailable: true,
                    interruptionLevel: "time-sensitive",
                  },
                },
              },
              data: {
                type: "support_reply",
                ticketId: ticketId,
                url: `/${ticket.userRole}/support/${ticketId}`,
              },
            };
            const response = await admin.messaging().sendEachForMulticast({
              tokens,
              ...payload,
            });
            functions.logger.info("FCM sent to user", {
              userId,
              successCount: response.successCount,
              failureCount: response.failureCount,
            });
          }
        }
      } else {
        // User sent a message → notify admin topic
        const payload = {
          notification: {
            title: `Support: ${ticket.subject || "New message"}`,
            body: `${message.senderName} (${message.senderRole}): ${previewText}`,
          },
          android: {
            priority: "high",
            notification: {
              sound: "notification_sound",
              channelId: "orders",
              priority: "max",
              defaultVibrateTimings: false,
              vibrateTimingsMillis: [0, 500, 200, 500],
              visibility: "public",
              notificationCount: 1,
            },
          },
          apns: {
            headers: { "apns-priority": "10" },
            payload: {
              aps: {
                sound: "default",
                badge: 1,
                contentAvailable: true,
                interruptionLevel: "time-sensitive",
              },
            },
          },
          data: {
            type: "support_message",
            ticketId: ticketId,
            userRole: message.senderRole || "",
            url: `/admin/support/${ticketId}`,
          },
        };
        await admin.messaging().sendToTopic("support_admin", payload);
        functions.logger.info("FCM sent to support_admin topic", { ticketId });
      }
    } catch (fcmError) {
      // FCM failures should NOT block the function — log and continue
      functions.logger.warn("FCM notification failed (non-blocking)", {
        ticketId,
        error: fcmError.message,
      });
    }

    return null;
  });


/**
 * onSupportTicketStatusChange
 * Trigger: When a support ticket document is updated
 *
 * Actions:
 * 1. If status changed → insert a system message into the messages subcollection
 * 2. Send FCM to the ticket owner about the status change
 */
exports.onSupportTicketStatusChange = functions.firestore
  .document("supportTickets/{ticketId}")
  .onUpdate(async (change, context) => {
    const { ticketId } = context.params;
    const before = change.before.data();
    const after = change.after.data();

    // Only fire if status actually changed
    if (before.status === after.status) return null;

    const now = admin.firestore.FieldValue.serverTimestamp();

    const statusLabels = {
      open: "Open / Abierto",
      in_progress: "In Progress / En Proceso",
      resolved: "Resolved / Resuelto",
      closed: "Closed / Cerrado",
    };

    const newStatusLabel = statusLabels[after.status] || after.status;

    // 1. Insert system message
    const systemMessage = {
      senderId: "system",
      senderName: "StackBot",
      senderRole: "admin",
      text: `Ticket status changed to: ${newStatusLabel}`,
      imageURL: null,
      type: "system",
      readByAdmin: true,
      readByUser: false,
      createdAt: now,
    };

    try {
      await admin.firestore()
        .collection("supportTickets")
        .doc(ticketId)
        .collection("messages")
        .add(systemMessage);

      functions.logger.info("System message inserted for status change", {
        ticketId,
        oldStatus: before.status,
        newStatus: after.status,
      });
    } catch (error) {
      functions.logger.error("Failed to insert system message", {
        ticketId,
        error: error.message,
      });
    }

    // 2. Send FCM to ticket owner
    try {
      const userId = after.userId;
      if (!userId) return null;

      const tokensSnap = await admin.firestore()
        .collection("push_tokens")
        .where("userId", "==", userId)
        .get();

      if (!tokensSnap.empty) {
        const tokens = tokensSnap.docs.map((doc) => doc.data().token).filter(Boolean);
        if (tokens.length > 0) {
          const payload = {
            notification: {
              title: "Support Update",
              body: `Your ticket "${after.subject}" is now: ${newStatusLabel}`,
            },
            android: {
              priority: "high",
              notification: {
                sound: "notification_sound",
                channelId: "orders",
                priority: "max",
                defaultVibrateTimings: false,
                vibrateTimingsMillis: [0, 500, 200, 500],
                visibility: "public",
                notificationCount: 1,
              },
            },
            apns: {
              headers: { "apns-priority": "10" },
              payload: {
                aps: {
                  sound: "default",
                  badge: 1,
                  contentAvailable: true,
                  interruptionLevel: "time-sensitive",
                },
              },
            },
            data: {
              type: "support_status_change",
              ticketId: ticketId,
              newStatus: after.status,
              url: `/${after.userRole}/support/${ticketId}`,
            },
          };
          await admin.messaging().sendEachForMulticast({
            tokens,
            ...payload,
          });
        }
      }
    } catch (fcmError) {
      functions.logger.warn("FCM for status change failed (non-blocking)", {
        ticketId,
        error: fcmError.message,
      });
    }

    return null;
  });
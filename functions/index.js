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
    🚀 SEND PUSH NOTIFICATION (FCM Trigger)
============================================================ */
exports.sendPushNotification = functions.firestore.document("notifications/{notificationId}").onCreate(async (snap) => {
  const notification = snap.data();
  const userId = notification.userId;
  if (!userId) return;
  try {
    const tokenDoc = await admin.firestore().collection("pushTokens").doc(userId).get();
    if (!tokenDoc.exists) return;
    const pushToken = tokenDoc.data().token;
    if (!pushToken) return;
    const payload = {
      token: pushToken,
      notification: { title: notification.title, body: notification.message },
      android: { notification: { sound: "default", channelId: "default", priority: "high", clickAction: "FCM_PLUGIN_ACTIVITY" } },
      apns: { payload: { aps: { sound: "default", badge: 1 } } },
      data: { ...notification.data, url: notification.data?.url || "/" },
    };
    await admin.messaging().send(payload);
  } catch (error) {
    console.error("Error sending push notification:", error);
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
  if (driverData.currentOrderId) throw new functions.https.HttpsError("failed-precondition", "You already have an active order.");
  const result = await admin.firestore().runTransaction(async (transaction) => {
    const orderRef = admin.firestore().collection("orders").doc(orderId);
    const orderDoc = await transaction.get(orderRef);
    if (!orderDoc.exists) throw new functions.https.HttpsError("not-found", "Order not found.");
    const orderData = orderDoc.data();
    if (orderData.driverId) throw new functions.https.HttpsError("already-exists", "Order already claimed.");
    const claimableStatuses = ["ready", "confirmed", "preparing"];
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
  await createNotification({
    userId: result.customerId,
    type: "driver_assigned",
    title: "Driver Assigned 🚗",
    message: `${driverData.name} has been assigned to your order.`,
    data: { orderId, driverId: userId, driverName: driverData.name, url: "/account" },
  });
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
        apns: { payload: { aps: { sound: "default", badge: 1 } } },
        android: { priority: "high", notification: { sound: "default", channelId: "default" } },
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
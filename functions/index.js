/**
 * STACKBOT — Firebase Cloud Functions
 * Updated with location/coordinates support for orders
 * + Live Notifications System
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

/**
 * Validate coordinates object
 */
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

/**
 * Calculate distance between two coordinates (Haversine formula)
 * @returns Distance in kilometers
 */
function calculateDistance(coord1, coord2) {
  const R = 6371; // Earth's radius in km
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

/**
 * Calculate delivery fee based on distance
 */
function calculateDeliveryFee(distanceKm, baseFee = 3.0, perKmFee = 0.5, baseDistance = 3) {
  if (distanceKm <= baseDistance) {
    return baseFee;
  }
  const extraDistance = distanceKm - baseDistance;
  return Math.round((baseFee + extraDistance * perKmFee) * 100) / 100;
}

// ⭐ Admin emails whitelist - ADD YOUR ADMIN EMAILS HERE
const ADMIN_EMAILS = [
  "jordancobb92@gmail.com",
  "moguldesignsjordan@gmail.com",
  "Wilkerson3911@gmail.com",
  "Stackbotglobalgl@gmail.com"
  // Add more admin emails as needed
];

/* ============================================================
    🔔 NOTIFICATION HELPER
============================================================ */

/**
 * Create a notification in Firestore
 */
async function createNotification({
  userId,
  type,
  title,
  message,
  priority = "normal",
  data = {},
  expiresAt = null,
}) {
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
    notificationData.expiresAt = admin.firestore.Timestamp.fromDate(
      new Date(expiresAt)
    );
  }

  return admin.firestore().collection("notifications").add(notificationData);
}

/* ============================================================
    🚀 BOOTSTRAP ADMIN (ONE-TIME SETUP via HTTP)
============================================================ */
exports.bootstrapAdmin = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    try {
      if (req.method === "OPTIONS") {
        return res.status(204).send("");
      }

      if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
      }

      const { uid, email } = req.body;

      if (!uid) {
        return res.status(400).json({ error: "Missing UID" });
      }

      await admin.auth().setCustomUserClaims(uid, { role: "admin" });

      console.log(`Admin role assigned to UID: ${uid}`);

      return res.json({
        success: true,
        message: "Admin role assigned successfully.",
        uid,
        note: "User must log out and log back in for changes to take effect."
      });
    } catch (error) {
      console.error("Bootstrap Admin Error:", error);
      return res.status(500).json({ error: error.message });
    }
  });
});

/* ============================================================
    🔐 SET USER ROLE (HTTP - Admin Only)
============================================================ */
exports.setUserRole = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    try {
      if (req.method === "OPTIONS") {
        return res.status(204).send("");
      }

      // 🔐 VERIFY AUTH TOKEN
      const authHeader = req.headers.authorization || "";
      const idToken = authHeader.startsWith("Bearer ")
        ? authHeader.substring(7)
        : null;

      if (!idToken) {
        return res.status(401).json({ error: "Missing Authorization token" });
      }

      const decoded = await admin.auth().verifyIdToken(idToken);

      const isAdmin =
        decoded.role === "admin" ||
        ADMIN_EMAILS.includes(decoded.email);

      if (!isAdmin) {
        return res.status(403).json({ error: "Only admins can assign roles" });
      }

      // 🧠 SAFE BODY PARSING
      let body = req.body;

      if (typeof body === "string") {
        try {
          body = JSON.parse(body);
        } catch {
          return res.status(400).json({ error: "Invalid JSON body" });
        }
      }

      if (!body || typeof body !== "object") {
        return res.status(400).json({ error: "Request body missing" });
      }

      const { uid, role } = body;

      if (!uid || !role) {
        return res.status(400).json({
          error: "Missing uid or role",
          received: body,
        });
      }

      const validRoles = ["admin", "vendor", "customer"];
      if (!validRoles.includes(role)) {
        return res.status(400).json({
          error: `Invalid role: ${role}`,
        });
      }

      await admin.auth().setCustomUserClaims(uid, { role });

      console.log(`✅ Role '${role}' assigned to ${uid}`);

      return res.json({
        success: true,
        message: `Role '${role}' assigned to ${uid}`,
      });
    } catch (err) {
      console.error("setUserRole error:", err);
      return res.status(500).json({
        error: "Internal server error",
      });
    }
  });
});


/* ============================================================
    ✔ APPROVE VENDOR (HTTP endpoint with CORS middleware)
============================================================ */
exports.approveVendor = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    try {
      console.log("=== APPROVE VENDOR START ===");
      console.log("Method:", req.method);
      console.log("Content-Type:", req.headers["content-type"]);
      console.log("Raw body type:", typeof req.body);
      console.log("Raw body:", req.body);

      if (req.method === "OPTIONS") {
        return res.status(204).send("");
      }

      if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
      }

      // Parse body - handle multiple formats
      let body = req.body;
      
      // If body is a string, parse it
      if (typeof body === "string") {
        try {
          body = JSON.parse(body);
        } catch (e) {
          console.error("Failed to parse body as JSON:", e);
          return res.status(400).json({ error: "Invalid JSON body" });
        }
      }

      // If body is still empty or undefined
      if (!body || Object.keys(body).length === 0) {
        console.error("Empty body received");
        return res.status(400).json({ error: "Empty request body" });
      }

      const vendorId = body.vendorId;
      console.log("Extracted vendorId:", vendorId);

      if (!vendorId) {
        return res.status(400).json({ 
          error: "Missing vendorId",
          receivedBody: body 
        });
      }

      // Verify admin token
      const authHeader = req.headers.authorization || "";
      console.log("Auth header present:", !!authHeader);

      const idToken = authHeader.startsWith("Bearer ")
        ? authHeader.substring(7)
        : null;

      if (!idToken) {
        return res.status(403).json({ error: "Missing Authorization token" });
      }

      let decoded;
      try {
        decoded = await admin.auth().verifyIdToken(idToken);
        console.log("Token decoded successfully");
        console.log("Caller email:", decoded.email);
        console.log("Caller role:", decoded.role);
      } catch (tokenError) {
        console.error("Token verification failed:", tokenError);
        return res.status(403).json({ error: "Invalid token" });
      }

      // Check admin permission
      const isAdminByRole = decoded.role === "admin";
      const isAdminByEmail = ADMIN_EMAILS.includes(decoded.email);

      if (!isAdminByRole && !isAdminByEmail) {
        return res.status(403).json({ 
          error: "Only admins can approve vendors.",
          yourRole: decoded.role || "none",
          yourEmail: decoded.email
        });
      }

      // Get vendor document
      const vendorRef = admin.firestore().collection("vendors").doc(vendorId);
      const vendorSnap = await vendorRef.get();

      if (!vendorSnap.exists) {
        return res.status(404).json({ error: "Vendor not found" });
      }

      const vendorData = vendorSnap.data();
      console.log("Vendor found:", vendorData.name);

      // Set vendor role in Firebase Auth
      try {
        await admin.auth().setCustomUserClaims(vendorId, { role: "vendor" });
        console.log("Vendor role assigned to:", vendorId);
      } catch (claimsError) {
        console.error("Error setting claims:", claimsError);
        // User might not exist in Auth yet - that's okay for now
      }

      // Update Firestore
      await vendorRef.update({
        verified: true,
        role: "vendor",
        approved_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      });

      // 🔔 Send notification to vendor
      try {
        await createNotification({
          userId: vendorId,
          type: "vendor_approved",
          title: "Application Approved! 🎉",
          message: "Congratulations! Your vendor application has been approved. You can now start adding products and receiving orders.",
          priority: "high",
          data: {
            url: "/vendor",
          },
        });
        console.log("Approval notification sent to vendor:", vendorId);
      } catch (notifError) {
        console.error("Failed to send approval notification:", notifError);
        // Don't fail the approval if notification fails
      }

      console.log("Vendor approved successfully:", vendorId);

      return res.json({
        success: true,
        message: "Vendor approved successfully",
        vendorId,
        email: vendorData.email
      });

    } catch (err) {
      console.error("APPROVE ERROR:", err);
      return res.status(500).json({ error: err.message });
    }
  });
});

/* ============================================================
    🪪 CREATE VENDOR APPLICATION (Callable)
============================================================ */
exports.createVendor = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Login required.");
  }

  const userId = context.auth.uid;
  const pin = generatePIN();

  // Build vendor data with optional coordinates
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

  // Add coordinates if provided and valid
  if (data.coordinates && isValidCoordinates(data.coordinates)) {
    vendorData.coordinates = {
      lat: data.coordinates.lat,
      lng: data.coordinates.lng,
    };
    vendorData.serviceRadius = data.serviceRadius || 10; // Default 10km
  }

  await admin.firestore().collection("vendors").doc(userId).set(vendorData);

  // 🔔 Notify admins about new vendor application
  try {
    const adminsSnap = await admin.firestore().collection("admins").get();
    const adminIds = adminsSnap.docs.map((doc) => doc.id);

    // Also notify admins from ADMIN_EMAILS list
    for (const adminEmail of ADMIN_EMAILS) {
      try {
        const userRecord = await admin.auth().getUserByEmail(adminEmail);
        if (userRecord && !adminIds.includes(userRecord.uid)) {
          adminIds.push(userRecord.uid);
        }
      } catch (e) {
        // User not found, skip
      }
    }

    const notificationPromises = adminIds.map((adminId) =>
      createNotification({
        userId: adminId,
        type: "vendor_application",
        title: "New Vendor Application",
        message: `${vendorData.name || "Someone"} (${vendorData.email}) has applied to become a vendor.`,
        priority: "normal",
        data: {
          vendorId: userId,
          vendorEmail: vendorData.email,
          url: `/admin/vendors/${userId}`,
        },
      })
    );

    await Promise.allSettled(notificationPromises);
    console.log("Admin notifications sent for vendor application:", userId);
  } catch (notifError) {
    console.error("Failed to send admin notifications:", notifError);
    // Don't fail the application if notifications fail
  }

  return { 
    success: true,
    vendorId: userId, 
    pin
  };
});

/* ============================================================
    📍 UPDATE VENDOR LOCATION (Callable)
============================================================ */
exports.updateVendorLocation = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Login required.");
  }

  const userId = context.auth.uid;
  const { coordinates, address, serviceRadius } = data;

  // Validate coordinates
  if (!coordinates || !isValidCoordinates(coordinates)) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Invalid coordinates provided."
    );
  }

  // Verify user is the vendor
  const vendorRef = admin.firestore().collection("vendors").doc(userId);
  const vendorSnap = await vendorRef.get();

  if (!vendorSnap.exists) {
    throw new functions.https.HttpsError("not-found", "Vendor not found.");
  }

  // Update location
  const updateData = {
    coordinates: {
      lat: coordinates.lat,
      lng: coordinates.lng,
    },
    updated_at: admin.firestore.FieldValue.serverTimestamp(),
  };

  if (address) {
    updateData.address = address;
  }

  if (typeof serviceRadius === "number" && serviceRadius > 0) {
    updateData.serviceRadius = Math.min(serviceRadius, 100); // Cap at 100km
  }

  await vendorRef.update(updateData);

  return {
    success: true,
    message: "Vendor location updated.",
  };
});

/* ============================================================
    🧾 CREATE ORDER (Callable) - Updated with coordinates
============================================================ */
exports.createOrder = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Login required.");
  }

  const orderId = admin.firestore().collection("orders").doc().id;
  const customerId = context.auth.uid;

  // Build delivery address with coordinates
  const deliveryAddress = {
    street: data.deliveryAddress?.street || "",
    city: data.deliveryAddress?.city || "",
    state: data.deliveryAddress?.state || "",
    postalCode: data.deliveryAddress?.postalCode || "",
    country: data.deliveryAddress?.country || "Dominican Republic",
    instructions: data.deliveryAddress?.instructions || "",
  };

  // Add coordinates if provided and valid
  if (data.deliveryAddress?.coordinates && 
      isValidCoordinates(data.deliveryAddress.coordinates)) {
    deliveryAddress.coordinates = {
      lat: data.deliveryAddress.coordinates.lat,
      lng: data.deliveryAddress.coordinates.lng,
    };
    deliveryAddress.pinLocked = data.deliveryAddress.pinLocked || false;
  }

  // Calculate distance-based delivery fee if both have coordinates
  let calculatedDeliveryFee = data.delivery_fee || 0;
  let deliveryDistance = null;

  if (deliveryAddress.coordinates) {
    // Get vendor location
    const vendorRef = admin.firestore().collection("vendors").doc(data.vendorId);
    const vendorSnap = await vendorRef.get();

    if (vendorSnap.exists) {
      const vendorData = vendorSnap.data();
      
      if (vendorData.coordinates && isValidCoordinates(vendorData.coordinates)) {
        deliveryDistance = calculateDistance(
          vendorData.coordinates,
          deliveryAddress.coordinates
        );
        
        // Calculate fee based on distance (can be customized per vendor)
        calculatedDeliveryFee = calculateDeliveryFee(
          deliveryDistance,
          vendorData.baseDeliveryFee || 3.0,
          vendorData.perKmFee || 0.5,
          vendorData.baseDeliveryDistance || 3
        );
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
    deliveryDistance: deliveryDistance, // Store for reference
    total: data.total,
    status: "open",
    tracking_pin: generatePIN(),
    deliveryAddress,
    customerInfo: data.customerInfo || {},
    notes: data.notes || "",
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  };

  // Save to orders collection
  await admin.firestore().collection("orders").doc(orderId).set(orderData);

  // Save to vendor's orders subcollection
  await admin
    .firestore()
    .collection("vendors")
    .doc(data.vendorId)
    .collection("orders")
    .doc(orderId)
    .set(orderData);

  // Save to customer's orders subcollection
  await admin
    .firestore()
    .collection("customers")
    .doc(customerId)
    .collection("orders")
    .doc(orderId)
    .set(orderData);

  return { 
    orderId,
    deliveryFee: calculatedDeliveryFee,
    deliveryDistance,
  };
});

/* ============================================================
    📍 CALCULATE DELIVERY FEE (Callable)
    Used for real-time fee calculation in checkout
============================================================ */
exports.calculateDeliveryFeeForOrder = functions.https.onCall(async (data, context) => {
  const { vendorId, customerCoordinates } = data;

  if (!vendorId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Vendor ID is required."
    );
  }

  // Default response if no coordinates
  if (!customerCoordinates || !isValidCoordinates(customerCoordinates)) {
    return {
      fee: 3.0, // Default base fee
      distance: null,
      message: "Using default delivery fee (no coordinates provided).",
    };
  }

  // Get vendor data
  const vendorRef = admin.firestore().collection("vendors").doc(vendorId);
  const vendorSnap = await vendorRef.get();

  if (!vendorSnap.exists) {
    throw new functions.https.HttpsError("not-found", "Vendor not found.");
  }

  const vendorData = vendorSnap.data();

  // Check if vendor has coordinates
  if (!vendorData.coordinates || !isValidCoordinates(vendorData.coordinates)) {
    return {
      fee: vendorData.baseDeliveryFee || 3.0,
      distance: null,
      message: "Using default fee (vendor location not set).",
    };
  }

  // Calculate distance
  const distance = calculateDistance(
    vendorData.coordinates,
    customerCoordinates
  );

  // Check if within service radius
  const serviceRadius = vendorData.serviceRadius || 50; // Default 50km
  if (distance > serviceRadius) {
    return {
      fee: null,
      distance,
      serviceRadius,
      available: false,
      message: `Delivery not available. Distance (${distance.toFixed(1)}km) exceeds service radius (${serviceRadius}km).`,
    };
  }

  // Calculate fee
  const fee = calculateDeliveryFee(
    distance,
    vendorData.baseDeliveryFee || 3.0,
    vendorData.perKmFee || 0.5,
    vendorData.baseDeliveryDistance || 3
  );

  return {
    fee,
    distance: Math.round(distance * 100) / 100,
    serviceRadius,
    available: true,
    message: `Delivery available. Distance: ${distance.toFixed(1)}km`,
  };
});

/* ============================================================
    🔄 UPDATE ORDER STATUS (Callable)
============================================================ */
exports.updateOrderStatus = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Login required.");
  }

  const { orderId, vendorId, status, customerId } = data;

  const updateData = {
    status,
    updated_at: admin.firestore.FieldValue.serverTimestamp(),
  };

  // Update main orders collection
  await admin.firestore().collection("orders").doc(orderId).update(updateData);

  // Update vendor's orders subcollection
  if (vendorId) {
    await admin
      .firestore()
      .collection("vendors")
      .doc(vendorId)
      .collection("orders")
      .doc(orderId)
      .update(updateData);
  }

  // Update customer's orders subcollection if we have customerId
  if (customerId) {
    await admin
      .firestore()
      .collection("customers")
      .doc(customerId)
      .collection("orders")
      .doc(orderId)
      .update(updateData);
  }

  return { message: "Order status updated." };
});

/* ============================================================
    📍 SAVE CUSTOMER LOCATION (Callable)
============================================================ */
exports.saveCustomerLocation = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Login required.");
  }

  const userId = context.auth.uid;
  const { label, address, coordinates, isDefault } = data;

  // Validate inputs
  if (!label || typeof label !== "string" || label.length > 50) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Invalid label provided."
    );
  }

  if (!address || typeof address !== "string" || address.length > 500) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Invalid address provided."
    );
  }

  if (!coordinates || !isValidCoordinates(coordinates)) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Invalid coordinates provided."
    );
  }

  const locationsRef = admin
    .firestore()
    .collection("users")
    .doc(userId)
    .collection("savedLocations");

  // If setting as default, remove default from others
  if (isDefault) {
    const existingDefaults = await locationsRef
      .where("isDefault", "==", true)
      .get();

    const batch = admin.firestore().batch();
    existingDefaults.forEach((doc) => {
      batch.update(doc.ref, { isDefault: false });
    });
    await batch.commit();
  }

  // Check count (limit to 10 saved locations)
  const countSnap = await locationsRef.count().get();
  if (countSnap.data().count >= 10) {
    throw new functions.https.HttpsError(
      "resource-exhausted",
      "Maximum saved locations (10) reached."
    );
  }

  // Add new location
  const newLocationRef = locationsRef.doc();
  await newLocationRef.set({
    label: label.trim(),
    address: address.trim(),
    coordinates: {
      lat: coordinates.lat,
      lng: coordinates.lng,
    },
    isDefault: isDefault || false,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return {
    success: true,
    locationId: newLocationRef.id,
    message: "Location saved successfully.",
  };
});

/* ============================================================
    🗑️ DELETE CUSTOMER LOCATION (Callable)
============================================================ */
exports.deleteCustomerLocation = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Login required.");
  }

  const userId = context.auth.uid;
  const { locationId } = data;

  if (!locationId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Location ID required."
    );
  }

  const locationRef = admin
    .firestore()
    .collection("users")
    .doc(userId)
    .collection("savedLocations")
    .doc(locationId);

  const locationSnap = await locationRef.get();

  if (!locationSnap.exists) {
    throw new functions.https.HttpsError("not-found", "Location not found.");
  }

  await locationRef.delete();

  return {
    success: true,
    message: "Location deleted successfully.",
  };
});

/* ============================================================
    🔔 NOTIFICATION TRIGGERS (Firestore)
============================================================ */

/**
 * Trigger notification when a new order is created
 */
exports.onOrderCreated = functions.firestore
  .document("orders/{orderId}")
  .onCreate(async (snap, context) => {
    const order = snap.data();
    const orderId = context.params.orderId;

    console.log("New order created:", orderId);

    const notifications = [];

    // Notify customer - order placed
    if (order.customerId) {
      notifications.push(
        createNotification({
          userId: order.customerId,
          type: "order_placed",
          title: "Order Placed!",
          message: `Your order #${orderId.slice(0, 8).toUpperCase()} has been placed${
            order.vendorName ? ` with ${order.vendorName}` : ""
          }.`,
          priority: "normal",
          data: {
            orderId,
            vendorId: order.vendorId,
            url: "/account",
          },
        })
      );
    }

    // Notify vendor - new order
    if (order.vendorId) {
      const customerName = order.customerInfo?.name || "A customer";
      const total = order.total ? `$${order.total.toFixed(2)}` : "";

      notifications.push(
        createNotification({
          userId: order.vendorId,
          type: "order_placed",
          title: "New Order! 🎉",
          message: `${customerName} placed order #${orderId
            .slice(0, 8)
            .toUpperCase()}${total ? ` - ${total}` : ""}.`,
          priority: "high",
          data: {
            orderId,
            customerId: order.customerId,
            url: "/vendor/orders",
          },
        })
      );
    }

    await Promise.allSettled(notifications);
    console.log("Order notifications sent for:", orderId);
  });

/**
 * Trigger notification when order status changes
 */
exports.onOrderStatusChange = functions.firestore
  .document("orders/{orderId}")
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    const orderId = context.params.orderId;

    // Only trigger if status changed
    if (before.status === after.status) {
      return null;
    }

    console.log(
      "Order status changed:",
      orderId,
      before.status,
      "->",
      after.status
    );

    const statusConfig = {
      confirmed: {
        type: "order_confirmed",
        title: "Order Confirmed",
        message: `Your order #${orderId
          .slice(0, 8)
          .toUpperCase()} has been confirmed.`,
      },
      preparing: {
        type: "order_preparing",
        title: "Order Being Prepared",
        message: `Your order #${orderId
          .slice(0, 8)
          .toUpperCase()} is now being prepared.`,
      },
      ready: {
        type: "order_ready",
        title: "Order Ready!",
        message: `Your order #${orderId
          .slice(0, 8)
          .toUpperCase()} is ready for ${
          after.fulfillmentType === "pickup" ? "pickup" : "delivery"
        }!`,
        priority: "high",
      },
      out_for_delivery: {
        type: "order_ready",
        title: "Out for Delivery",
        message: `Your order #${orderId
          .slice(0, 8)
          .toUpperCase()} is on its way!`,
        priority: "high",
      },
      delivered: {
        type: "order_delivered",
        title: "Order Delivered",
        message: `Your order #${orderId
          .slice(0, 8)
          .toUpperCase()} has been delivered. Enjoy!`,
      },
      completed: {
        type: "order_delivered",
        title: "Order Completed",
        message: `Your order #${orderId
          .slice(0, 8)
          .toUpperCase()} is complete. Thank you!`,
      },
      cancelled: {
        type: "order_cancelled",
        title: "Order Cancelled",
        message: `Your order #${orderId
          .slice(0, 8)
          .toUpperCase()} has been cancelled.`,
        priority: "high",
      },
    };

    const config = statusConfig[after.status];
    if (!config || !after.customerId) {
      return null;
    }

    await createNotification({
      userId: after.customerId,
      type: config.type,
      title: config.title,
      message: config.message,
      priority: config.priority || "normal",
      data: {
        orderId,
        vendorId: after.vendorId,
        status: after.status,
        url: "/account",
      },
    });

    console.log("Status change notification sent for:", orderId);
    return null;
  });

/**
 * Trigger notification when vendor status changes (approval/rejection)
 */
exports.onVendorStatusChange = functions.firestore
  .document("vendors/{vendorId}")
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    const vendorId = context.params.vendorId;

    // Check if verified status changed
    if (before.verified === after.verified) {
      return null;
    }

    console.log(
      "Vendor verification status changed:",
      vendorId,
      before.verified,
      "->",
      after.verified
    );

    // Vendor was rejected (verified set to false from true)
    if (before.verified === true && after.verified === false) {
      await createNotification({
        userId: vendorId,
        type: "vendor_rejected",
        title: "Account Status Updated",
        message:
          "Your vendor account status has been updated. Please contact support for more information.",
        priority: "high",
        data: {
          url: "/vendor/settings",
        },
      });
      console.log("Vendor status change notification sent:", vendorId);
    }

    return null;
  });

/* ============================================================
    🧹 CLEANUP OLD NOTIFICATIONS (Scheduled)
============================================================ */

/**
 * Scheduled function to clean up old notifications (runs daily)
 */
exports.cleanupOldNotifications = functions.pubsub
  .schedule("every 24 hours")
  .onRun(async (context) => {
    const db = admin.firestore();
    
    // Delete notifications older than 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const oldNotifications = await db
      .collection("notifications")
      .where("createdAt", "<", admin.firestore.Timestamp.fromDate(thirtyDaysAgo))
      .limit(500)
      .get();

    if (oldNotifications.empty) {
      console.log("No old notifications to clean up");
      return null;
    }

    const batch = db.batch();
    oldNotifications.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    console.log(`Cleaned up ${oldNotifications.size} old notifications`);
    return null;
  });

/* ============================================================
    🔔 SEND NOTIFICATION (HTTP - Admin/System use)
============================================================ */
exports.sendNotification = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    try {
      if (req.method === "OPTIONS") {
        return res.status(204).send("");
      }

      if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
      }

      // Verify admin token
      const authHeader = req.headers.authorization || "";
      const idToken = authHeader.startsWith("Bearer ")
        ? authHeader.substring(7)
        : null;

      if (!idToken) {
        return res.status(401).json({ error: "Missing Authorization token" });
      }

      let decoded;
      try {
        decoded = await admin.auth().verifyIdToken(idToken);
      } catch {
        return res.status(401).json({ error: "Invalid token" });
      }

      // Only admins can send notifications to other users
      const isAdmin = decoded.role === "admin" || ADMIN_EMAILS.includes(decoded.email);

      const { userId, type, title, message, priority, data } = req.body;

      // Non-admins can only send to themselves
      if (!isAdmin && userId !== decoded.uid) {
        return res.status(403).json({ error: "Forbidden" });
      }

      if (!userId || !type || !title || !message) {
        return res.status(400).json({
          error: "Missing required fields: userId, type, title, message",
        });
      }

      const docRef = await createNotification({
        userId,
        type,
        title,
        message,
        priority: priority || "normal",
        data: data || {},
      });

      return res.json({
        success: true,
        notificationId: docRef.id,
      });
    } catch (err) {
      console.error("sendNotification error:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  });
});
/* ============================================================
    🚀 SEND PUSH NOTIFICATION (FCM Trigger)
    Listens for new docs in 'notifications' and sends to device
============================================================ */
exports.sendPushNotification = functions.firestore
  .document("notifications/{notificationId}")
  .onCreate(async (snap, context) => {
    const notification = snap.data();
    const userId = notification.userId;

    if (!userId) return;

    try {
      // 1. Get the token we saved in the Frontend step
      const tokenDoc = await admin.firestore().collection("pushTokens").doc(userId).get();
      
      if (!tokenDoc.exists) {
        console.log(`No push token found for user ${userId}`);
        return;
      }

      const tokenData = tokenDoc.data();
      const pushToken = tokenData.token;

      if (!pushToken) return;

      // 2. Construct Payload (With Sound Settings)
      const payload = {
        token: pushToken,
        notification: {
          title: notification.title,
          body: notification.message,
        },
        // Android Sound Settings
        android: {
          notification: {
            sound: "default",
            channelId: "default", // Must match the channel ID in pushNotifications.ts
            priority: "high",
            clickAction: "FCM_PLUGIN_ACTIVITY" 
          }
        },
        // iOS Sound Settings
        apns: {
          payload: {
            aps: {
              sound: "default",
              badge: 1,
            }
          }
        },
        data: {
          ...notification.data,
          url: notification.data?.url || "/"
        }
      };

      // 3. Send!
      await admin.messaging().send(payload);
      console.log(`Push notification sent to ${userId}`);

    } catch (error) {
      console.error("Error sending push notification:", error);
    }
  });
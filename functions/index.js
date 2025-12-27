/**
 * STACKBOT — Firebase Cloud Functions
 * Updated with location/coordinates support for orders
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
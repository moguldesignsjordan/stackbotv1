/**
 * STACKBOT — Firebase Cloud Functions
 * Fixed version with proper role-based authentication
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
    🏪 CREATE VENDOR APPLICATION (Callable)
============================================================ */
exports.createVendor = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Login required.");
  }

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

  await admin.firestore().collection("vendors").doc(userId).set(vendorData);

  return { 
    success: true,
    vendorId: userId, 
    pin
  };
});

/* ============================================================
    🧾 CREATE ORDER (Callable)
============================================================ */
exports.createOrder = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Login required.");
  }

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
    🔄 UPDATE ORDER STATUS (Callable)
============================================================ */
exports.updateOrderStatus = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Login required.");
  }

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
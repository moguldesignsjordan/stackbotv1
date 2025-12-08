const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

// Helper: Generate secure random password
function generatePassword() {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()";
  let pass = "";
  for (let i = 0; i < 12; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pass;
}

// ⭐ Multi-admin support (ADD MORE emails here)
const ADMIN_EMAILS = [
  "jordancobb92@gmail.com",
  "moguldesignsjordan@gmail.com",
];

exports.approveVendor = functions.https.onCall(async (data, context) => {
  // Must be logged in
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "You must be logged in."
    );
  }

  // Check if caller is an admin
  const callerEmail = context.auth.token.email;
  console.log("Approve Vendor Caller Email:", callerEmail);

  if (!callerEmail || !ADMIN_EMAILS.includes(callerEmail)) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Only admins can approve vendors."
    );
  }

  const vendorId = data.vendorId;

  // Load vendor document
  const vendorRef = admin.firestore().collection("vendors").doc(vendorId);
  const vendorSnap = await vendorRef.get();

  if (!vendorSnap.exists) {
    throw new functions.https.HttpsError("not-found", "Vendor not found.");
  }

  const vendorData = vendorSnap.data();

  // Create Firebase Auth user
  const password = generatePassword();
  const userRecord = await admin.auth().createUser({
    email: vendorData.email,
    password,
    displayName: vendorData.name,
  });

  const uid = userRecord.uid;

  // Add vendor role
  await admin.auth().setCustomUserClaims(uid, { role: "vendor" });

  // Move vendor data into vendors/{uid}
  const newRef = admin.firestore().collection("vendors").doc(uid);
  await newRef.set({
    ...vendorData,
    verified: true,
    uid,
    approved_at: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Delete old doc
  await vendorRef.delete();

  console.log(`Vendor approved: ${vendorData.email}`);
  console.log(`Password: ${password}`);

  return {
    message: "Vendor approved successfully!",
    email: vendorData.email,
    password,
  };
});

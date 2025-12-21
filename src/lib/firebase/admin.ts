import admin from "firebase-admin";

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY;
const storageBucket = process.env.FIREBASE_STORAGE_BUCKET;

const hasCredentials =
  !!projectId &&
  !!clientEmail &&
  !!privateKey;

if (!admin.apps.length && hasCredentials) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey: privateKey!.replace(/\\n/g, "\n"), // ✅ FIX
    }),
    storageBucket,
  });
}

export default admin;

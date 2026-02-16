// scripts/migrate-bank-info.js
// ═══════════════════════════════════════════════════════════════════════════════
// ONE-TIME SCRIPT: Migrate bank_info from /vendors/{id} → /vendor_private/{id}
//
// This moves sensitive financial data out of the publicly-readable vendors
// collection into a new vendor_private collection (owner + admin only).
//
// PREREQUISITES:
//   1. Firebase Admin credentials configured (one of):
//      - Running on a machine with `firebase login` + default project set
//      - GOOGLE_APPLICATION_CREDENTIALS env var pointing to a service account key
//      - Running inside a GCP environment with default credentials
//
// USAGE:
//   cd functions
//   node ../scripts/migrate-bank-info.js
//
//   Or with explicit project:
//   GCLOUD_PROJECT=your-project-id node ../scripts/migrate-bank-info.js
//
// DRY RUN (see what would change without writing):
//   DRY_RUN=true node ../scripts/migrate-bank-info.js
//
// ROLLBACK:
//   node ../scripts/migrate-bank-info.js --rollback
// ═══════════════════════════════════════════════════════════════════════════════

const admin = require("firebase-admin");

// Initialize if not already (standalone mode)
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const DRY_RUN = process.env.DRY_RUN === "true";
const ROLLBACK = process.argv.includes("--rollback");
const MAX_BATCH = 450; // Firestore batch limit is 500, leave headroom

async function migrate() {
  console.log("═══════════════════════════════════════════════════════");
  console.log("  STACKBOT — Migrate bank_info to vendor_private");
  console.log(`  Mode: ${DRY_RUN ? "🔍 DRY RUN (no writes)" : "🔥 LIVE"}`);
  console.log("═══════════════════════════════════════════════════════\n");

  // Fetch all vendor docs
  const vendorsSnap = await db.collection("vendors").get();
  console.log(`Found ${vendorsSnap.size} total vendor docs.\n`);

  const vendorsWithBankInfo = [];

  for (const vendorDoc of vendorsSnap.docs) {
    const data = vendorDoc.data();
    if (data.bank_info && typeof data.bank_info === "object") {
      vendorsWithBankInfo.push({
        id: vendorDoc.id,
        bank_info: data.bank_info,
        email: data.email || data.contactEmail || "unknown",
        name: data.vendorName || data.businessName || "unknown",
      });
    }
  }

  if (vendorsWithBankInfo.length === 0) {
    console.log("✅ No vendors have bank_info in the public collection. Nothing to migrate.");
    return;
  }

  console.log(`Found ${vendorsWithBankInfo.length} vendor(s) with bank_info to migrate:\n`);

  for (const v of vendorsWithBankInfo) {
    console.log(`  • ${v.name} (${v.id}) — account ending ${v.bank_info.account_last4 || "????"}`);
  }
  console.log("");

  if (DRY_RUN) {
    console.log("🔍 DRY RUN complete. No changes made.");
    console.log("   Remove DRY_RUN=true to execute the migration.");
    return;
  }

  // Process in batches
  let processed = 0;
  let batch = db.batch();
  let batchCount = 0;

  for (const vendor of vendorsWithBankInfo) {
    const privateRef = db.collection("vendor_private").doc(vendor.id);
    const publicRef = db.collection("vendors").doc(vendor.id);

    // 1. Check if vendor_private doc already exists (idempotent)
    const existingPrivate = await privateRef.get();
    if (existingPrivate.exists && existingPrivate.data().bank_info) {
      console.log(`  ⏭️  ${vendor.name} — vendor_private already has bank_info, skipping create (will still clean public doc)`);
    } else {
      // Write bank_info to vendor_private
      batch.set(
        privateRef,
        {
          uid: vendor.id,
          bank_info: vendor.bank_info,
          migratedAt: admin.firestore.FieldValue.serverTimestamp(),
          migratedFrom: "vendors",
        },
        { merge: true }
      );
      batchCount++;
    }

    // 2. Remove bank_info from public vendor doc
    batch.update(publicRef, {
      bank_info: admin.firestore.FieldValue.delete(),
      bank_info_migrated: true, // breadcrumb for verification
      bank_info_migrated_at: admin.firestore.FieldValue.serverTimestamp(),
    });
    batchCount++;

    // Commit batch if approaching limit
    if (batchCount >= MAX_BATCH) {
      await batch.commit();
      console.log(`  📦 Committed batch (${batchCount} operations)`);
      batch = db.batch();
      batchCount = 0;
    }

    processed++;
  }

  // Commit remaining
  if (batchCount > 0) {
    await batch.commit();
    console.log(`  📦 Committed final batch (${batchCount} operations)`);
  }

  console.log(`\n✅ Migration complete. ${processed} vendor(s) processed.`);
  console.log("   bank_info moved to: /vendor_private/{vendorId}");
  console.log("   bank_info removed from: /vendors/{vendorId}");
  console.log("\n   Next steps:");
  console.log("   1. Deploy updated firestore.rules");
  console.log("   2. Update vendor settings UI to read/write vendor_private");
  console.log("   3. Verify in Firebase console that vendor_private docs exist");
}

async function rollback() {
  console.log("═══════════════════════════════════════════════════════");
  console.log("  STACKBOT — ROLLBACK bank_info migration");
  console.log(`  Mode: ${DRY_RUN ? "🔍 DRY RUN (no writes)" : "🔥 LIVE"}`);
  console.log("═══════════════════════════════════════════════════════\n");

  const privateSnap = await db.collection("vendor_private").get();
  console.log(`Found ${privateSnap.size} vendor_private doc(s).\n`);

  const toRollback = [];

  for (const doc of privateSnap.docs) {
    const data = doc.data();
    if (data.bank_info && data.migratedFrom === "vendors") {
      toRollback.push({
        id: doc.id,
        bank_info: data.bank_info,
      });
    }
  }

  if (toRollback.length === 0) {
    console.log("✅ No migrated bank_info found in vendor_private. Nothing to rollback.");
    return;
  }

  console.log(`Found ${toRollback.length} vendor(s) to rollback.\n`);

  if (DRY_RUN) {
    for (const v of toRollback) {
      console.log(`  • ${v.id} — would restore bank_info (last4: ${v.bank_info.account_last4 || "????"})`);
    }
    console.log("\n🔍 DRY RUN complete. No changes made.");
    return;
  }

  let batch = db.batch();
  let batchCount = 0;

  for (const vendor of toRollback) {
    // Restore bank_info to public vendor doc
    batch.update(db.collection("vendors").doc(vendor.id), {
      bank_info: vendor.bank_info,
      bank_info_migrated: admin.firestore.FieldValue.delete(),
      bank_info_migrated_at: admin.firestore.FieldValue.delete(),
    });
    batchCount++;

    // Remove from vendor_private
    batch.delete(db.collection("vendor_private").doc(vendor.id));
    batchCount++;

    if (batchCount >= MAX_BATCH) {
      await batch.commit();
      batch = db.batch();
      batchCount = 0;
    }
  }

  if (batchCount > 0) {
    await batch.commit();
  }

  console.log(`\n✅ Rollback complete. ${toRollback.length} vendor(s) restored.`);
  console.log("   ⚠️  Remember to also rollback firestore.rules if needed.");
}

// ─── Execute ──────────────────────────────────────────────────
(ROLLBACK ? rollback() : migrate())
  .then(() => {
    console.log("\nDone.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("\n❌ Migration failed:", err);
    process.exit(1);
  });

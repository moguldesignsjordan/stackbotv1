// scripts/backfill-vendor-coordinates.js
// ═══════════════════════════════════════════════════════════════════════════════
// ONE-TIME SCRIPT: Backfill vendorCoordinates on existing orders
//
// Run this once to fix orders that were created without vendor coordinates.
// Can be deployed as a callable Cloud Function or run via Node.js with
// Firebase Admin SDK.
//
// Usage (Cloud Functions):
//   Add to functions/index.js as an HTTP function, call once, then remove.
//
// Usage (standalone):
//   node scripts/backfill-vendor-coordinates.js
// ═══════════════════════════════════════════════════════════════════════════════

const admin = require('firebase-admin');

// Initialize if not already (standalone mode)
if (!admin.apps.length) {
  admin.initializeApp();
}

async function backfillVendorCoordinates() {
  const db = admin.firestore();
  
  console.log('Starting vendor coordinates backfill...');
  
  // 1. Fetch all orders that are missing vendorCoordinates
  const ordersSnap = await db.collection('orders')
    .where('fulfillmentType', '==', 'delivery')
    .get();
  
  console.log(`Found ${ordersSnap.size} delivery orders total`);
  
  // Build a cache of vendor coordinates to avoid repeated fetches
  const vendorCoordsCache = {};
  let updatedCount = 0;
  let skippedCount = 0;
  let missingVendorCount = 0;
  
  const batch = db.batch();
  let batchCount = 0;
  const MAX_BATCH = 450; // Firestore batch limit is 500
  
  for (const orderDoc of ordersSnap.docs) {
    const orderData = orderDoc.data();
    
    // Skip if already has vendorCoordinates
    if (orderData.vendorCoordinates?.lat && orderData.vendorCoordinates?.lng) {
      skippedCount++;
      continue;
    }
    
    const vendorId = orderData.vendorId;
    if (!vendorId) {
      skippedCount++;
      continue;
    }
    
    // Fetch vendor coords (with caching)
    if (!(vendorId in vendorCoordsCache)) {
      try {
        const vendorDoc = await db.collection('vendors').doc(vendorId).get();
        if (vendorDoc.exists) {
          const vData = vendorDoc.data();
          const coords = vData?.coordinates || vData?.location || vData?.vendorCoordinates || null;
          if (coords?.lat && coords?.lng) {
            vendorCoordsCache[vendorId] = { lat: coords.lat, lng: coords.lng };
          } else if (vData?.latitude && vData?.longitude) {
            vendorCoordsCache[vendorId] = { lat: vData.latitude, lng: vData.longitude };
          } else {
            vendorCoordsCache[vendorId] = null;
            console.warn(`  ⚠️  Vendor ${vendorId} (${vData?.name || 'unknown'}) has no coordinates`);
          }
        } else {
          vendorCoordsCache[vendorId] = null;
        }
      } catch (err) {
        console.error(`  ❌ Error fetching vendor ${vendorId}:`, err.message);
        vendorCoordsCache[vendorId] = null;
      }
    }
    
    const coords = vendorCoordsCache[vendorId];
    if (!coords) {
      missingVendorCount++;
      continue;
    }
    
    // Update the order
    batch.update(orderDoc.ref, { vendorCoordinates: coords });
    updatedCount++;
    batchCount++;
    
    // Commit batch if near limit
    if (batchCount >= MAX_BATCH) {
      await batch.commit();
      console.log(`  Committed batch of ${batchCount} updates`);
      batchCount = 0;
    }
  }
  
  // Commit remaining
  if (batchCount > 0) {
    await batch.commit();
    console.log(`  Committed final batch of ${batchCount} updates`);
  }
  
  console.log('\n═══ Backfill Complete ═══');
  console.log(`  ✅ Updated: ${updatedCount} orders`);
  console.log(`  ⏭️  Skipped (already had coords): ${skippedCount}`);
  console.log(`  ⚠️  Vendor missing coords: ${missingVendorCount}`);
  console.log('');
  console.log('IMPORTANT: Make sure your vendors have coordinates set in their');
  console.log('vendor settings. Vendors without coordinates will not show maps.');
  
  return { updatedCount, skippedCount, missingVendorCount };
}

// Run if called directly
if (require.main === module) {
  backfillVendorCoordinates()
    .then((result) => {
      console.log('\nDone:', result);
      process.exit(0);
    })
    .catch((err) => {
      console.error('Backfill failed:', err);
      process.exit(1);
    });
}

module.exports = { backfillVendorCoordinates };
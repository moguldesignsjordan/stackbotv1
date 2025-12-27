// src/app/api/admin/fix-slugs/route.ts
// One-time migration script to fix vendor slugs that look like URLs
// Run via: POST /api/admin/fix-slugs (admin auth required)

import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { generateSlug, isUrlLike, isValidSlug } from "@/lib/utils/slug";

export async function POST(request: NextRequest) {
  try {
    // Verify admin auth (you should add proper auth check here)
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all vendors
    const vendorsSnap = await adminDb.collection("vendors").get();
    
    const results: {
      fixed: { id: string; oldSlug: string; newSlug: string; name: string }[];
      skipped: { id: string; slug: string; reason: string }[];
      errors: { id: string; error: string }[];
    } = {
      fixed: [],
      skipped: [],
      errors: [],
    };

    // Track all slugs to avoid duplicates
    const usedSlugs = new Set<string>();

    // First pass: collect existing valid slugs
    vendorsSnap.docs.forEach((doc) => {
      const data = doc.data();
      if (data.slug && isValidSlug(data.slug)) {
        usedSlugs.add(data.slug);
      }
    });

    // Second pass: fix bad slugs
    for (const doc of vendorsSnap.docs) {
      const data = doc.data();
      const currentSlug = data.slug;
      const vendorName = data.name || data.business_name;

      // Skip if no slug or already valid
      if (!currentSlug) {
        // Generate slug from name if missing
        if (vendorName) {
          let newSlug = generateSlug(vendorName);
          let counter = 2;
          
          while (usedSlugs.has(newSlug)) {
            newSlug = `${generateSlug(vendorName)}-${counter}`;
            counter++;
          }

          try {
            await adminDb.collection("vendors").doc(doc.id).update({
              slug: newSlug,
              slug_updated_at: new Date(),
              slug_previous: null,
            });
            
            usedSlugs.add(newSlug);
            results.fixed.push({
              id: doc.id,
              oldSlug: "(none)",
              newSlug,
              name: vendorName,
            });
          } catch (err: any) {
            results.errors.push({ id: doc.id, error: err.message });
          }
        } else {
          results.skipped.push({
            id: doc.id,
            slug: "(none)",
            reason: "No slug and no name to generate from",
          });
        }
        continue;
      }

      // Skip if already valid
      if (isValidSlug(currentSlug) && !isUrlLike(currentSlug)) {
        results.skipped.push({
          id: doc.id,
          slug: currentSlug,
          reason: "Already valid",
        });
        continue;
      }

      // Fix the slug
      let baseSlug = "";
      
      if (isUrlLike(currentSlug)) {
        // Extract from URL-like slug
        baseSlug = generateSlug(currentSlug);
      } else if (vendorName) {
        // Generate from name
        baseSlug = generateSlug(vendorName);
      } else {
        // Sanitize existing slug
        baseSlug = generateSlug(currentSlug);
      }

      if (!baseSlug) {
        results.skipped.push({
          id: doc.id,
          slug: currentSlug,
          reason: "Could not generate valid slug",
        });
        continue;
      }

      // Ensure uniqueness
      let newSlug = baseSlug;
      let counter = 2;
      
      while (usedSlugs.has(newSlug)) {
        newSlug = `${baseSlug}-${counter}`;
        counter++;
      }

      // Update in database
      try {
        await adminDb.collection("vendors").doc(doc.id).update({
          slug: newSlug,
          slug_updated_at: new Date(),
          slug_previous: currentSlug, // Keep old slug for reference
        });

        usedSlugs.add(newSlug);
        results.fixed.push({
          id: doc.id,
          oldSlug: currentSlug,
          newSlug,
          name: vendorName || "(unknown)",
        });
      } catch (err: any) {
        results.errors.push({ id: doc.id, error: err.message });
      }
    }

    return NextResponse.json({
      success: true,
      summary: {
        total: vendorsSnap.docs.length,
        fixed: results.fixed.length,
        skipped: results.skipped.length,
        errors: results.errors.length,
      },
      results,
    });
  } catch (error: any) {
    console.error("Fix slugs error:", error);
    return NextResponse.json(
      { error: "Failed to fix slugs", details: error.message },
      { status: 500 }
    );
  }
}

// GET: Preview changes without applying them
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const vendorsSnap = await adminDb.collection("vendors").get();
    
    const preview: {
      needsFix: { id: string; currentSlug: string; suggestedSlug: string; name: string }[];
      valid: { id: string; slug: string }[];
    } = {
      needsFix: [],
      valid: [],
    };

    const usedSlugs = new Set<string>();

    vendorsSnap.docs.forEach((doc) => {
      const data = doc.data();
      const currentSlug = data.slug;
      const vendorName = data.name || data.business_name;

      if (currentSlug && isValidSlug(currentSlug) && !isUrlLike(currentSlug)) {
        preview.valid.push({ id: doc.id, slug: currentSlug });
        usedSlugs.add(currentSlug);
      } else {
        let suggestedSlug = "";
        
        if (currentSlug && isUrlLike(currentSlug)) {
          suggestedSlug = generateSlug(currentSlug);
        } else if (vendorName) {
          suggestedSlug = generateSlug(vendorName);
        } else if (currentSlug) {
          suggestedSlug = generateSlug(currentSlug);
        }

        // Ensure unique
        let finalSlug = suggestedSlug;
        let counter = 2;
        while (usedSlugs.has(finalSlug)) {
          finalSlug = `${suggestedSlug}-${counter}`;
          counter++;
        }

        if (finalSlug) {
          usedSlugs.add(finalSlug);
        }

        preview.needsFix.push({
          id: doc.id,
          currentSlug: currentSlug || "(none)",
          suggestedSlug: finalSlug || "(could not generate)",
          name: vendorName || "(unknown)",
        });
      }
    });

    return NextResponse.json({
      summary: {
        total: vendorsSnap.docs.length,
        needsFix: preview.needsFix.length,
        valid: preview.valid.length,
      },
      preview,
    });
  } catch (error: any) {
    console.error("Preview slugs error:", error);
    return NextResponse.json(
      { error: "Failed to preview", details: error.message },
      { status: 500 }
    );
  }
}
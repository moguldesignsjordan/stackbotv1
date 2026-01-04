"use client";

import { useState } from "react";
import { db } from "@/lib/firebase/config";
import { collection, getDocs, writeBatch, doc } from "firebase/firestore";
import { getCategoryFromLegacyName } from "@/lib/config/vendor-categories";
import { AlertTriangle, CheckCircle2, RefreshCw, Database, ArrowRight } from "lucide-react";

/**
 * CATEGORY NORMALIZER TOOL
 * 
 * This admin utility normalizes all vendor categories to match the unified system.
 * Run this once after deploying the new category system to ensure consistency.
 */

interface VendorCategoryUpdate {
  id: string;
  name: string;
  currentCategories: string[];
  normalizedCategories: string[];
  needsUpdate: boolean;
}

// Valid category names (from vendor-categories.ts)
const VALID_CATEGORIES = [
  "Restaurants",
  "Groceries",
  "Beauty & Wellness",
  "Taxi & Transport",
  "Tours & Activities",
  "Professional Services",
  "Home Repair & Maintenance",
  "Electronics & Gadgets",
  "Cleaning Services",
  "Retail Shops",
];

export default function CategoryNormalizerTool() {
  const [analyzing, setAnalyzing] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [vendors, setVendors] = useState<VendorCategoryUpdate[]>([]);
  const [complete, setComplete] = useState(false);

  // Step 1: Analyze all vendors
  const analyzeVendors = async () => {
    setAnalyzing(true);
    setComplete(false);

    try {
      const vendorsSnap = await getDocs(collection(db, "vendors"));
      const updates: VendorCategoryUpdate[] = [];

      vendorsSnap.docs.forEach(doc => {
        const data = doc.data();
        const currentCategories = data.categories || [];

        // Normalize categories
        const normalized = currentCategories
          .map((cat: string) => {
            const config = getCategoryFromLegacyName(cat);
            return config?.name || null;
          })
          .filter(Boolean) as string[];

        // Remove duplicates
        const uniqueNormalized = [...new Set(normalized)];

        // Check if update needed
        const needsUpdate =
          JSON.stringify(currentCategories.sort()) !==
          JSON.stringify(uniqueNormalized.sort());

        if (needsUpdate || uniqueNormalized.length > 0) {
          updates.push({
            id: doc.id,
            name: data.name || data.business_name || "Unnamed Vendor",
            currentCategories,
            normalizedCategories: uniqueNormalized,
            needsUpdate,
          });
        }
      });

      setVendors(updates);
    } catch (err) {
      console.error("Error analyzing vendors:", err);
      alert("Failed to analyze vendors");
    } finally {
      setAnalyzing(false);
    }
  };

  // Step 2: Update all vendors in batches
  const updateAllVendors = async () => {
    if (!confirm(`Update categories for ${vendors.filter(v => v.needsUpdate).length} vendors?`)) {
      return;
    }

    setUpdating(true);

    try {
      const vendorsToUpdate = vendors.filter(v => v.needsUpdate);
      const batchSize = 500; // Firestore batch limit
      
      for (let i = 0; i < vendorsToUpdate.length; i += batchSize) {
        const batch = writeBatch(db);
        const chunk = vendorsToUpdate.slice(i, i + batchSize);

        chunk.forEach(vendor => {
          const vendorRef = doc(db, "vendors", vendor.id);
          batch.update(vendorRef, {
            categories: vendor.normalizedCategories,
            categories_updated_at: new Date(),
          });
        });

        await batch.commit();
        console.log(`Updated batch ${Math.floor(i / batchSize) + 1}`);
      }

      setComplete(true);
      alert(`Successfully updated ${vendorsToUpdate.length} vendors!`);
    } catch (err) {
      console.error("Error updating vendors:", err);
      alert("Failed to update vendors");
    } finally {
      setUpdating(false);
    }
  };

  const needsUpdateCount = vendors.filter(v => v.needsUpdate).length;
  const alreadyNormalizedCount = vendors.filter(v => !v.needsUpdate).length;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Database className="w-6 h-6 text-blue-600" />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Category Normalizer</h2>
            <p className="text-gray-600">
              This tool updates all vendor categories to match the unified category system.
              Run this once after deploying the new category configuration.
            </p>
          </div>
        </div>
      </div>

      {/* Warning */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-amber-900 mb-2">Important</h3>
            <ul className="text-sm text-amber-800 space-y-1">
              <li>• This will update the <code className="bg-amber-100 px-1 rounded">categories</code> field for all vendors</li>
              <li>• Categories will be normalized to match <code className="bg-amber-100 px-1 rounded">vendor-categories.ts</code></li>
              <li>• Invalid or unmapped categories will be removed</li>
              <li>• This operation cannot be undone</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Actions */}
      {vendors.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <button
            onClick={analyzeVendors}
            disabled={analyzing}
            className="inline-flex items-center gap-2 bg-[#55529d] text-white px-6 py-3 rounded-xl font-semibold hover:bg-[#433f7a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {analyzing ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                Analyzing Vendors...
              </>
            ) : (
              <>
                <Database className="w-5 h-5" />
                Analyze All Vendors
              </>
            )}
          </button>
          <p className="text-sm text-gray-500 mt-3">
            Click to scan all vendors and identify categories that need normalization
          </p>
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="text-2xl font-bold text-gray-900">{vendors.length}</div>
              <div className="text-sm text-gray-500">Total Vendors</div>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="text-2xl font-bold text-amber-900">{needsUpdateCount}</div>
              <div className="text-sm text-amber-700">Need Update</div>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <div className="text-2xl font-bold text-green-900">{alreadyNormalizedCount}</div>
              <div className="text-sm text-green-700">Already Normalized</div>
            </div>
          </div>

          {/* Preview */}
          {needsUpdateCount > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="p-4 bg-gray-50 border-b border-gray-200">
                <h3 className="font-semibold text-gray-900">Preview Changes</h3>
                <p className="text-sm text-gray-500">Showing vendors that need category updates</p>
              </div>

              <div className="max-h-96 overflow-y-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Vendor</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Current</th>
                      <th className="px-4 py-2 text-center text-xs font-semibold text-gray-600"></th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Normalized</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {vendors
                      .filter(v => v.needsUpdate)
                      .slice(0, 20)
                      .map(vendor => (
                        <tr key={vendor.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-900 text-sm">{vendor.name}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="space-y-1">
                              {vendor.currentCategories.map((cat, i) => (
                                <span key={i} className="inline-block text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded-full mr-1">
                                  {cat}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <ArrowRight className="w-4 h-4 text-gray-400 mx-auto" />
                          </td>
                          <td className="px-4 py-3">
                            <div className="space-y-1">
                              {vendor.normalizedCategories.map((cat, i) => (
                                <span key={i} className="inline-block text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full mr-1">
                                  {cat}
                                </span>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              {needsUpdateCount > 20 && (
                <div className="p-3 bg-gray-50 border-t border-gray-200 text-sm text-gray-600 text-center">
                  Showing 20 of {needsUpdateCount} vendors that need updates
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => {
                setVendors([]);
                setComplete(false);
              }}
              className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
            >
              Reset
            </button>

            {needsUpdateCount > 0 && !complete && (
              <button
                onClick={updateAllVendors}
                disabled={updating}
                className="inline-flex items-center gap-2 bg-[#55529d] text-white px-6 py-3 rounded-xl font-semibold hover:bg-[#433f7a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {updating ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    Updating {needsUpdateCount} Vendors...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    Normalize {needsUpdateCount} Vendors
                  </>
                )}
              </button>
            )}

            {complete && (
              <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-6 py-3 rounded-xl font-semibold">
                <CheckCircle2 className="w-5 h-5" />
                Update Complete!
              </div>
            )}
          </div>
        </>
      )}

      {/* Available Categories Reference */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Valid Categories</h3>
        <div className="flex flex-wrap gap-2">
          {VALID_CATEGORIES.map(cat => (
            <span key={cat} className="inline-block text-xs px-3 py-1.5 bg-white border border-gray-200 text-gray-700 rounded-full">
              {cat}
            </span>
          ))}
        </div>
        <p className="text-sm text-gray-500 mt-3">
          Vendor categories will be normalized to match these values from <code className="bg-gray-200 px-1 rounded text-xs">vendor-categories.ts</code>
        </p>
      </div>
    </div>
  );
}
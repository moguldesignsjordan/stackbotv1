"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, auth } from "@/lib/firebase/config";
import { onAuthStateChanged } from "firebase/auth";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
  getDocs,
  query,
  where,
  collection,
} from "firebase/firestore";
import { Store, ArrowLeft } from "lucide-react";
import Link from "next/link";

const CATEGORIES = [
  "Restaurants",
  "Groceries",
  "Beauty & Wellness",
  "Taxi & Transport",
  "Cleaning Services",
  "Home Repair & Maintenance",
  "Retail Shops",
  "Electronics & Gadgets",
  "Tours & Activities",
  "Professional Services",
];

const generateSlug = (name: string) => {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/--+/g, "-");
};

export default function VendorSignupPage() {
  const router = useRouter();
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [existingVendor, setExistingVendor] = useState<any>(null);

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    website: "",
    description: "",
    categories: [] as string[],
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Check auth state and existing vendor application
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        // Not logged in - redirect to login with vendor intent
        router.replace("/login?intent=vendor");
        return;
      }

      setCurrentUser(user);

      // Pre-fill email from auth
      setForm((prev) => ({
        ...prev,
        email: user.email || "",
      }));

      // Check if user already has a vendor application
      try {
        const vendorRef = doc(db, "vendors", user.uid);
        const vendorSnap = await getDoc(vendorRef);

        if (vendorSnap.exists()) {
          const data = vendorSnap.data();
          setExistingVendor(data);

          // If already verified, redirect to vendor dashboard
          if (data.verified) {
            router.replace("/vendor");
            return;
          }
        }
      } catch (err) {
        console.error("Error checking existing vendor:", err);
      }

      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  const handleChange = (field: keyof typeof form, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const toggleCategory = (cat: string) => {
    setForm((prev) => {
      const exists = prev.categories.includes(cat);
      return {
        ...prev,
        categories: exists
          ? prev.categories.filter((c) => c !== cat)
          : [...prev.categories, cat],
      };
    });
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setLogoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (!currentUser) {
        throw new Error("You must be logged in to apply as a vendor.");
      }

      if (!form.name.trim()) {
        throw new Error("Business name is required.");
      }

      if (!form.email.trim()) {
        throw new Error("Business email is required.");
      }

      if (!form.phone.trim()) {
        throw new Error("Phone number is required.");
      }

      if (form.categories.length === 0) {
        throw new Error("Please select at least one business category.");
      }

      let logoUrl = "";

      // Upload logo if provided
      if (logoFile) {
        const safeName = logoFile.name.replace(/\s+/g, "-");
        const filePath = `vendors/logos/${currentUser.uid}-${Date.now()}-${safeName}`;

        const storage = getStorage();
        const logoRef = ref(storage, filePath);

        await uploadBytes(logoRef, logoFile);
        logoUrl = await getDownloadURL(logoRef);
      }

      // Generate unique slug
      const baseSlug = generateSlug(form.name);
      let finalSlug = baseSlug;

      // Only check for duplicate slugs if we have a valid slug
      if (baseSlug && baseSlug.length > 0) {
        try {
          const slugQuery = query(
            collection(db, "vendors"),
            where("slug", "==", baseSlug)
          );
          const slugSnap = await getDocs(slugQuery);

          if (!slugSnap.empty) {
            finalSlug = `${baseSlug}-${slugSnap.size + 1}`;
          }
        } catch (slugError) {
          console.error("Slug check error:", slugError);
          // Continue with base slug if query fails
        }
      }

      // ⭐ Save vendor with AUTH UID as document ID
      // This is crucial - it links the vendor profile to their Firebase Auth account
      const vendorRef = doc(db, "vendors", currentUser.uid);

      await setDoc(vendorRef, {
        uid: currentUser.uid, // Same as document ID
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        website: form.website.trim(),
        description: form.description.trim(),
        categories: form.categories,
        logoUrl,
        slug: finalSlug,
        verified: false, // Pending approval
        total_orders: 0,
        total_revenue: 0,
        rating: 0,
        source: "public_signup",
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      });

      console.log("Vendor application submitted:", currentUser.uid);

      // Redirect to pending page
      router.push("/vendor-pending");
    } catch (err: any) {
      console.error("Vendor signup error:", err);
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  // Loading state while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-sb-bg flex items-center justify-center">
        <LoadingSpinner text="Loading..." />
      </div>
    );
  }

  // User already has a pending application
  if (existingVendor && !existingVendor.verified) {
    return (
      <div className="min-h-screen bg-sb-bg flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center space-y-4">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto">
            <Store className="h-8 w-8 text-yellow-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            Application Pending
          </h1>
          <p className="text-gray-600">
            You've already submitted a vendor application for{" "}
            <strong>{existingVendor.name}</strong>. We're reviewing your
            application and will notify you once approved.
          </p>
          <div className="pt-4 space-y-3">
            <Link
              href="/"
              className="block w-full bg-sb-primary text-white py-3 rounded-xl font-semibold hover:opacity-90 transition text-center"
            >
              Return Home
            </Link>
            <Link
              href="/vendor-pending"
              className="block text-sb-primary font-medium hover:underline"
            >
              View Application Status →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-sb-bg py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Back Link */}
        <Link
          href="/"
          className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Home
        </Link>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 space-y-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-sb-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Store className="h-8 w-8 text-sb-primary" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Become a Vendor</h1>
            <p className="text-gray-600 mt-2">
              Tell us about your business. We'll review your application within
              24-48 hours.
            </p>
          </div>

          {/* Logged in as banner */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-600">
            Signed in as <strong>{currentUser?.email}</strong>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            {/* Business Name */}
            <Input
              label="Business Name"
              required
              value={form.name}
              onChange={(e) => handleChange("name", e.target.value)}
              placeholder="e.g., Island Eats Restaurant"
            />

            {/* Business Email */}
            <Input
              label="Business Email"
              type="email"
              required
              value={form.email}
              onChange={(e) => handleChange("email", e.target.value)}
              placeholder="contact@yourbusiness.com"
            />

            {/* Phone Number */}
            <Input
              label="Phone Number"
              required
              value={form.phone}
              onChange={(e) => handleChange("phone", e.target.value)}
              placeholder="+1 (xxx) xxx-xxxx"
            />

            {/* Business Address */}
            <Input
              label="Business Address"
              required
              value={form.address}
              onChange={(e) => handleChange("address", e.target.value)}
              placeholder="Street, City, Country"
            />

            {/* Website (Optional) */}
            <Input
              label="Website (Optional)"
              value={form.website}
              onChange={(e) => handleChange("website", e.target.value)}
              placeholder="https://yourbusiness.com"
            />

            {/* Description */}
            <Textarea
              label="Business Description"
              rows={4}
              value={form.description}
              onChange={(e) => handleChange("description", e.target.value)}
              placeholder="Tell customers about your business, what you offer, and what makes you special..."
            />

            {/* Categories */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Business Categories <span className="text-red-500">*</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((cat) => {
                  const active = form.categories.includes(cat);
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => toggleCategory(cat)}
                      className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                        active
                          ? "bg-sb-primary text-white border-sb-primary"
                          : "bg-gray-50 text-gray-700 border-gray-300 hover:bg-gray-100"
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
              {form.categories.length > 0 && (
                <p className="text-xs text-gray-500 mt-2">
                  Selected: {form.categories.join(", ")}
                </p>
              )}
            </div>

            {/* Logo Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Business Logo (Optional)
              </label>
              <div className="flex items-center gap-4">
                {logoPreview && (
                  <img
                    src={logoPreview}
                    alt="Logo preview"
                    className="w-16 h-16 rounded-xl object-cover border border-gray-200"
                  />
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                  className="text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-sb-primary/10 file:text-sb-primary hover:file:bg-sb-primary/20"
                />
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              className="w-full"
            >
              Submit Application
            </Button>

            <p className="text-xs text-gray-500 text-center">
              By submitting, you agree to our Terms of Service and Privacy
              Policy.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
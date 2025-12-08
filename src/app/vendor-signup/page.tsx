"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";
import { db } from "@/lib/firebase/config";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import {
  collection,
  addDoc,
  serverTimestamp,
  getDocs,
  query,
  where,
} from "firebase/firestore";

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

// ---------------------------------------------
// 🔥 1. Generate clean SEO slug
// ---------------------------------------------
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

  // ---------------------------------------------
  // 🔥 HANDLE SUBMIT
  // ---------------------------------------------
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Validate required fields
      if (!form.name.trim()) throw new Error("Business name is required.");
      if (form.categories.length === 0)
        throw new Error("Please select at least one business category.");

      // ---------------------------------------------
      // 2. Upload logo
      // ---------------------------------------------
      let logoUrl = "";

      if (logoFile) {
        if (!logoFile.type.startsWith("image/")) {
          throw new Error("Please upload a valid image.");
        }
        if (logoFile.size > 5 * 1024 * 1024) {
          throw new Error("Image must be under 5MB.");
        }

        const safeName = logoFile.name.replace(/\s+/g, "-");
        const filePath = `vendors/applications/${Date.now()}-${safeName}`;

        const storage = getStorage();
        const logoRef = ref(storage, filePath);

        await uploadBytes(logoRef, logoFile);
        logoUrl = await getDownloadURL(logoRef);
      }

      // ---------------------------------------------
      // 3. Generate slug & ensure uniqueness
      // ---------------------------------------------
      const baseSlug = generateSlug(form.name);

      const slugQuery = query(
        collection(db, "vendors"),
        where("slug", "==", baseSlug)
      );
      const slugSnap = await getDocs(slugQuery);

      let finalSlug = baseSlug;
      if (!slugSnap.empty) {
        finalSlug = `${baseSlug}-${slugSnap.size + 1}`;
      }

      // ---------------------------------------------
      // 4. Save vendor application
      // ---------------------------------------------
      await addDoc(collection(db, "vendors"), {
        name: form.name,
        email: form.email,
        phone: form.phone,
        address: form.address,
        website: form.website,
        description: form.description,
        categories: form.categories,
        logoUrl,
        slug: finalSlug, // ⭐ Save SEO-friendly slug
        verified: false,
        total_orders: 0,
        total_revenue: 0,
        rating: 0,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
        source: "public_signup",
      });

      alert("Application submitted! We will review your vendor profile.");
      router.push("/");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------------------------
  // UI
  // ---------------------------------------------
  return (
    <div className="min-h-screen bg-sb-bg flex items-center justify-center px-4">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-sm border border-gray-200 p-8 space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Become a Vendor</h1>
        <p className="text-gray-600 text-sm">
          Tell us about your business. We&apos;ll review and approve your store
          inside StackBot.
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
            {error}
          </div>
        )}

        <form className="space-y-5" onSubmit={handleSubmit}>
          {/* Inputs */}
          <Input
            label="Business Name"
            required
            value={form.name}
            onChange={(e) => handleChange("name", e.target.value)}
          />

          <Input
            label="Business Email"
            type="email"
            required
            value={form.email}
            onChange={(e) => handleChange("email", e.target.value)}
          />

          <Input
            label="Phone Number"
            required
            value={form.phone}
            onChange={(e) => handleChange("phone", e.target.value)}
          />

          <Input
            label="Business Address"
            required
            value={form.address}
            onChange={(e) => handleChange("address", e.target.value)}
          />

          <Input
            label="Website"
            value={form.website}
            onChange={(e) => handleChange("website", e.target.value)}
          />

          <Textarea
            label="Business Description"
            rows={4}
            value={form.description}
            onChange={(e) => handleChange("description", e.target.value)}
          />

          {/* CATEGORIES */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Business Categories
            </label>
            <p className="text-xs text-gray-500 mb-2">
              Select all that apply.
            </p>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => {
                const active = form.categories.includes(cat);
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => toggleCategory(cat)}
                    className={`px-3 py-1.5 rounded-full text-sm border ${
                      active
                        ? "bg-sb-primary text-white border-sb-primary"
                        : "bg-gray-50 text-gray-700 border-gray-300"
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Logo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Logo
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                setLogoFile(file);
              }}
              className="w-full text-sm text-gray-600"
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={loading}
            className="w-full"
          >
            Submit Application
          </Button>
        </form>
      </div>
    </div>
  );
}

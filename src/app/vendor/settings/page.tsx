"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase/config";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { onAuthStateChanged } from "firebase/auth";
import Image from "next/image";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import {
  Store,
  MapPin,
  Phone,
  Mail,
  Globe,
  Clock,
  ImageIcon,
  Save,
  X,
  Camera,
} from "lucide-react";

const CATEGORIES = [
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

export default function VendorSettings() {
  const [user, setUser] = useState<any>(null);
  const [vendor, setVendor] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Form state
  const [form, setForm] = useState({
    name: "",
    description: "",
    address: "",
    phone: "",
    email: "",
    website: "",
    categories: [] as string[],
    hours: "",
    delivery_fee: "",
    min_order: "",
  });

  // Image uploads
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);

  /* ---------------- AUTH & LOAD ---------------- */
  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      if (!u) return;
      setUser(u);

      const snap = await getDoc(doc(db, "vendors", u.uid));
      if (snap.exists()) {
        const data = snap.data();
        setVendor(data);
        setForm({
          name: data.name || "",
          description: data.description || "",
          address: data.address || "",
          phone: data.phone || "",
          email: data.email || "",
          website: data.website || "",
          categories: data.categories || [],
          hours: data.hours || "",
          delivery_fee: data.delivery_fee?.toString() || "",
          min_order: data.min_order?.toString() || "",
        });
      }

      setLoading(false);
    });
  }, []);

  /* ---------------- IMAGE HANDLERS ---------------- */
  const selectLogo = (file: File) => {
    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = () => setLogoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const selectCover = (file: File) => {
    setCoverFile(file);
    const reader = new FileReader();
    reader.onload = () => setCoverPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const uploadImage = async (file: File, path: string): Promise<string> => {
    const storage = getStorage();
    const imageRef = ref(storage, path);
    await uploadBytes(imageRef, file);
    return getDownloadURL(imageRef);
  };

  /* ---------------- CATEGORY TOGGLE ---------------- */
  const toggleCategory = (cat: string) => {
    setForm((f) => ({
      ...f,
      categories: f.categories.includes(cat)
        ? f.categories.filter((c) => c !== cat)
        : [...f.categories, cat],
    }));
  };

  /* ---------------- SAVE ---------------- */
  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setMessage(null);

    try {
      const updates: any = {
        name: form.name.trim(),
        description: form.description.trim(),
        address: form.address.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        website: form.website.trim(),
        categories: form.categories,
        hours: form.hours.trim(),
        delivery_fee: form.delivery_fee ? parseFloat(form.delivery_fee) : 0,
        min_order: form.min_order ? parseFloat(form.min_order) : 0,
        updated_at: serverTimestamp(),
      };

      // Upload logo if changed
      if (logoFile) {
        const safeName = logoFile.name.replace(/\s+/g, "-");
        const path = `vendors/logos/${user.uid}/${Date.now()}-${safeName}`;
        updates.logoUrl = await uploadImage(logoFile, path);
      }

      // Upload cover if changed
      if (coverFile) {
        const safeName = coverFile.name.replace(/\s+/g, "-");
        const path = `vendors/covers/${user.uid}/${Date.now()}-${safeName}`;
        updates.cover_image_url = await uploadImage(coverFile, path);
      }

      await updateDoc(doc(db, "vendors", user.uid), updates);

      // Update local state
      setVendor((v: any) => ({ ...v, ...updates }));
      setLogoFile(null);
      setLogoPreview(null);
      setCoverFile(null);
      setCoverPreview(null);

      setMessage({ type: "success", text: "Settings saved successfully!" });
    } catch (err: any) {
      console.error("Save error:", err);
      setMessage({ type: "error", text: err.message || "Failed to save settings" });
    }

    setSaving(false);
  };

  /* ---------------- REMOVE IMAGES ---------------- */
  const removeLogo = async () => {
    if (!confirm("Remove logo?")) return;
    await updateDoc(doc(db, "vendors", user.uid), {
      logoUrl: "",
      updated_at: serverTimestamp(),
    });
    setVendor((v: any) => ({ ...v, logoUrl: "" }));
    setMessage({ type: "success", text: "Logo removed" });
  };

  const removeCover = async () => {
    if (!confirm("Remove cover image?")) return;
    await updateDoc(doc(db, "vendors", user.uid), {
      cover_image_url: "",
      updated_at: serverTimestamp(),
    });
    setVendor((v: any) => ({ ...v, cover_image_url: "" }));
    setMessage({ type: "success", text: "Cover image removed" });
  };

  /* ---------------- LOADING STATE ---------------- */
  if (loading) return <LoadingSpinner text="Loading settings..." />;

  /* ---------------- UI ---------------- */
  return (
    <div className="space-y-6 max-w-3xl pb-20">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl sm:text-3xl font-bold">Store Settings</h1>
        {vendor?.slug && (
          <Link
            href={`/store/${vendor.slug}`}
            target="_blank"
            className="text-sb-primary font-semibold text-sm underline"
          >
            View Storefront →
          </Link>
        )}
      </div>

      {/* STATUS MESSAGE */}
      {message && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between ${
            message.type === "success"
              ? "bg-green-50 text-green-800 border border-green-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)}>
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* COVER IMAGE */}
      <Card title="Cover Image">
        <div className="space-y-4">
          <div className="relative h-40 sm:h-48 rounded-xl overflow-hidden border bg-gray-100">
            <Image
              src={coverPreview || vendor?.cover_image_url || "/store-cover-placeholder.jpg"}
              alt="Cover"
              fill
              className="object-cover"
            />
            <label className="absolute bottom-3 right-3 cursor-pointer bg-white/90 backdrop-blur px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 shadow-lg hover:bg-white transition">
              <Camera className="h-4 w-4" />
              Change
              <input
                hidden
                type="file"
                accept="image/*"
                onChange={(e) => e.target.files && selectCover(e.target.files[0])}
              />
            </label>
          </div>
          {vendor?.cover_image_url && (
            <button onClick={removeCover} className="text-red-600 text-sm font-medium">
              Remove Cover
            </button>
          )}
        </div>
      </Card>

      {/* LOGO & BASIC INFO */}
      <Card title="Store Identity">
        <div className="space-y-6">
          {/* Logo */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <Image
                src={logoPreview || vendor?.logoUrl || "/placeholder.png"}
                width={80}
                height={80}
                alt="Logo"
                className="rounded-xl border object-cover"
              />
              <label className="absolute -bottom-2 -right-2 cursor-pointer bg-sb-primary text-white p-2 rounded-full shadow-lg hover:bg-sb-primary/90 transition">
                <Camera className="h-4 w-4" />
                <input
                  hidden
                  type="file"
                  accept="image/*"
                  onChange={(e) => e.target.files && selectLogo(e.target.files[0])}
                />
              </label>
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-500 mb-1">Store Logo</p>
              {vendor?.logoUrl && (
                <button onClick={removeLogo} className="text-red-600 text-sm font-medium">
                  Remove Logo
                </button>
              )}
            </div>
          </div>

          {/* Store Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Store className="inline h-4 w-4 mr-1" />
              Store Name *
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-sb-primary focus:border-transparent"
              placeholder="Your store name"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-sb-primary focus:border-transparent resize-none"
              placeholder="Tell customers about your store..."
            />
          </div>
        </div>
      </Card>

      {/* CATEGORIES */}
      <Card title="Categories">
        <p className="text-sm text-gray-500 mb-3">Select all that apply</p>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => toggleCategory(cat)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                form.categories.includes(cat)
                  ? "bg-sb-primary text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </Card>

      {/* CONTACT INFO */}
      <Card title="Contact Information">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <MapPin className="inline h-4 w-4 mr-1" />
              Address
            </label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-sb-primary focus:border-transparent"
              placeholder="123 Main St, City"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Phone className="inline h-4 w-4 mr-1" />
                Phone
              </label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-sb-primary focus:border-transparent"
                placeholder="+1 (809) 555-0123"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Mail className="inline h-4 w-4 mr-1" />
                Email
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-sb-primary focus:border-transparent"
                placeholder="store@example.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Globe className="inline h-4 w-4 mr-1" />
              Website
            </label>
            <input
              type="url"
              value={form.website}
              onChange={(e) => setForm({ ...form, website: e.target.value })}
              className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-sb-primary focus:border-transparent"
              placeholder="https://yourwebsite.com"
            />
          </div>
        </div>
      </Card>

      {/* BUSINESS DETAILS */}
      <Card title="Business Details">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Clock className="inline h-4 w-4 mr-1" />
              Business Hours
            </label>
            <input
              type="text"
              value={form.hours}
              onChange={(e) => setForm({ ...form, hours: e.target.value })}
              className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-sb-primary focus:border-transparent"
              placeholder="Mon-Fri 9am-6pm, Sat 10am-4pm"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Delivery Fee ($)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.delivery_fee}
                onChange={(e) => setForm({ ...form, delivery_fee: e.target.value })}
                className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-sb-primary focus:border-transparent"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Min. Order ($)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.min_order}
                onChange={(e) => setForm({ ...form, min_order: e.target.value })}
                className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-sb-primary focus:border-transparent"
                placeholder="0.00"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* SAVE BUTTON */}
      <div className="sticky bottom-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-4 bg-sb-primary text-white font-semibold rounded-xl shadow-lg
                     hover:bg-sb-primary/90 disabled:opacity-50 disabled:cursor-not-allowed
                     flex items-center justify-center gap-2 transition"
        >
          <Save className="h-5 w-5" />
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
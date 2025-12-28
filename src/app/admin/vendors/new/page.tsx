// src/app/admin/vendors/new/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { db, auth } from "@/lib/firebase/config";
import {
  doc,
  setDoc,
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  Store,
  ArrowLeft,
  Save,
  Camera,
  Video,
  Image as ImageIcon,
  Phone,
  Mail,
  Globe,
  MapPin,
  Clock,
  MessageCircle,
  Instagram,
  Facebook,
  Youtube,
  Twitter,
  CheckCircle2,
  AlertCircle,
  Locate,
  X,
} from "lucide-react";

// TikTok icon
function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
    </svg>
  );
}

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

const generateSlug = (name: string) => {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/--+/g, "-");
};

export default function AdminNewVendorPage() {
  const router = useRouter();
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
    whatsapp: "",
    hours: "",
    categories: [] as string[],
    instagram: "",
    facebook: "",
    tiktok: "",
    twitter: "",
    youtube: "",
    delivery_fee: "",
    min_order: "",
  });

  // Location state
  const [location, setLocation] = useState({
    lat: "",
    lng: "",
    location_address: "",
  });
  const [gettingLocation, setGettingLocation] = useState(false);

  // Media uploads
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [coverType, setCoverType] = useState<"image" | "video">("image");

  // Approval status
  const [autoApprove, setAutoApprove] = useState(true);

  /* ===============================
     FILE UPLOAD HELPERS
  =============================== */
  const selectLogo = (file: File) => {
    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = () => setLogoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const selectCover = (file: File, type: "image" | "video") => {
    setCoverFile(file);
    setCoverType(type);

    if (type === "image") {
      const reader = new FileReader();
      reader.onload = () => setCoverPreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setCoverPreview(URL.createObjectURL(file));
    }
  };

  const uploadFile = async (file: File, path: string): Promise<string> => {
    const storage = getStorage();
    const fileRef = ref(storage, path);
    await uploadBytes(fileRef, file);
    return getDownloadURL(fileRef);
  };

  /* ===============================
     TOGGLE CATEGORY
  =============================== */
  const toggleCategory = (cat: string) => {
    setForm((f) => ({
      ...f,
      categories: f.categories.includes(cat)
        ? f.categories.filter((c) => c !== cat)
        : [...f.categories, cat],
    }));
  };

  /* ===============================
     GET CURRENT LOCATION
  =============================== */
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setMessage({ type: "error", text: "Geolocation not supported" });
      return;
    }

    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setLocation((prev) => ({
          ...prev,
          lat: latitude.toFixed(6),
          lng: longitude.toFixed(6),
        }));
        setGettingLocation(false);
        setMessage({ type: "success", text: "Location captured!" });
      },
      (err) => {
        console.error("Geolocation error:", err);
        setMessage({ type: "error", text: "Could not get location" });
        setGettingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  /* ===============================
     SAVE NEW VENDOR
  =============================== */
  async function handleSave() {
    if (!form.name.trim()) {
      setMessage({ type: "error", text: "Store name is required" });
      return;
    }

    if (form.categories.length === 0) {
      setMessage({ type: "error", text: "Select at least one category" });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      // Generate unique vendor ID
      const vendorId = doc(collection(db, "vendors")).id;

      // Generate slug
      const baseSlug = generateSlug(form.name);
      let finalSlug = baseSlug;

      if (baseSlug) {
        try {
          const slugQuery = query(
            collection(db, "vendors"),
            where("slug", "==", baseSlug)
          );
          const slugSnap = await getDocs(slugQuery);
          if (!slugSnap.empty) {
            finalSlug = `${baseSlug}-${slugSnap.size + 1}`;
          }
        } catch (err) {
          console.error("Slug check error:", err);
        }
      }

      const vendorData: any = {
        uid: vendorId,
        name: form.name.trim(),
        description: form.description.trim(),
        address: form.address.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        website: form.website.trim(),
        whatsapp: form.whatsapp.trim(),
        hours: form.hours.trim(),
        categories: form.categories,
        instagram: form.instagram.trim(),
        facebook: form.facebook.trim(),
        tiktok: form.tiktok.trim(),
        twitter: form.twitter.trim(),
        youtube: form.youtube.trim(),
        delivery_fee: form.delivery_fee ? parseFloat(form.delivery_fee) : 0,
        min_order: form.min_order ? parseFloat(form.min_order) : 0,
        slug: finalSlug,
        verified: autoApprove,
        status: autoApprove ? "approved" : "pending",
        total_orders: 0,
        total_revenue: 0,
        rating: 0,
        source: "admin_created",
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      };

      // Upload logo if provided
      if (logoFile) {
        const safeName = logoFile.name.replace(/\s+/g, "-");
        const path = `vendors/logos/${vendorId}/${Date.now()}-${safeName}`;
        vendorData.logoUrl = await uploadFile(logoFile, path);
      }

      // Upload cover if provided
      if (coverFile) {
        const safeName = coverFile.name.replace(/\s+/g, "-");
        const path = `vendors/covers/${vendorId}/${Date.now()}-${safeName}`;
        const url = await uploadFile(coverFile, path);

        if (coverType === "video") {
          vendorData.cover_video_url = url;
        } else {
          vendorData.cover_image_url = url;
        }
      }

      // Add location if provided
      if (location.lat && location.lng) {
        vendorData.location = {
          lat: parseFloat(location.lat),
          lng: parseFloat(location.lng),
          location_address: location.location_address.trim() || form.address.trim(),
        };
      }

      // Save vendor document
      await setDoc(doc(db, "vendors", vendorId), vendorData);

      // Log audit
      const admin = auth.currentUser;
      if (admin) {
        await addDoc(collection(db, "admin_audit_logs"), {
          action: "vendor_created",
          vendorId: vendorId,
          vendorName: form.name,
          adminUid: admin.uid,
          adminEmail: admin.email,
          timestamp: serverTimestamp(),
        });
      }

      setMessage({ type: "success", text: "Vendor created successfully!" });

      // Redirect to vendor detail page
      setTimeout(() => {
        router.push(`/admin/vendors/${vendorId}`);
      }, 1000);
    } catch (err: any) {
      console.error("Save error:", err);
      setMessage({ type: "error", text: err.message || "Failed to create vendor" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 max-w-4xl pb-24">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/admin/vendors"
          className="inline-flex items-center text-sb-primary font-medium hover:underline"
        >
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
          <Store className="h-6 w-6 sm:h-7 sm:w-7 text-sb-primary" />
          Add New Vendor
        </h1>
      </div>

      {/* Status Message */}
      {message && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between ${
            message.type === "success"
              ? "bg-green-50 text-green-800 border border-green-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          <span className="flex items-center gap-2">
            {message.type === "success" ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            {message.text}
          </span>
          <button onClick={() => setMessage(null)}>
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* COVER MEDIA */}
      <Card padding="lg">
        <h3 className="font-semibold text-lg mb-4">Cover Media</h3>
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Upload an image or video for the store hero section. Videos will autoplay on loop.
          </p>

          <div className="relative h-48 rounded-xl overflow-hidden bg-gray-100">
            {coverPreview ? (
              coverType === "video" ? (
                <video
                  src={coverPreview}
                  autoPlay
                  muted
                  loop
                  playsInline
                  className="w-full h-full object-cover"
                />
              ) : (
                <Image src={coverPreview} fill alt="Cover preview" className="object-cover" />
              )
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <ImageIcon className="w-12 h-12" />
              </div>
            )}

            <div className="absolute bottom-3 right-3 flex gap-2">
              <label className="cursor-pointer bg-white/90 backdrop-blur px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 shadow-lg hover:bg-white transition">
                <ImageIcon className="h-4 w-4" />
                Image
                <input
                  hidden
                  type="file"
                  accept="image/*"
                  onChange={(e) => e.target.files && selectCover(e.target.files[0], "image")}
                />
              </label>
              <label className="cursor-pointer bg-white/90 backdrop-blur px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 shadow-lg hover:bg-white transition">
                <Video className="h-4 w-4" />
                Video
                <input
                  hidden
                  type="file"
                  accept="video/mp4,video/webm,video/ogg,video/quicktime"
                  onChange={(e) => e.target.files && selectCover(e.target.files[0], "video")}
                />
              </label>
            </div>
          </div>

          {coverPreview && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500 flex items-center gap-2">
                {coverType === "video" ? (
                  <>
                    <Video className="h-4 w-4" /> Video selected
                  </>
                ) : (
                  <>
                    <ImageIcon className="h-4 w-4" /> Image selected
                  </>
                )}
              </span>
              <button
                onClick={() => {
                  setCoverFile(null);
                  setCoverPreview(null);
                }}
                className="text-red-600 text-sm font-medium"
              >
                Remove
              </button>
            </div>
          )}
        </div>
      </Card>

      {/* LOGO & BASIC INFO */}
      <Card padding="lg">
        <h3 className="font-semibold text-lg mb-4">Store Identity</h3>
        <div className="space-y-6">
          {/* Logo */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <Image
                src={logoPreview || "/placeholder.png"}
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
            <div>
              <p className="text-sm text-gray-500">Store Logo</p>
              <p className="text-xs text-gray-400">Square image recommended</p>
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Store Name *
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-sb-primary focus:border-transparent"
              placeholder="Amazing Store"
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
              placeholder="Tell customers about this store..."
            />
          </div>
        </div>
      </Card>

      {/* CATEGORIES */}
      <Card padding="lg">
        <h3 className="font-semibold text-lg mb-4">Categories *</h3>
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
      <Card padding="lg">
        <h3 className="font-semibold text-lg mb-4">Contact Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <MessageCircle className="inline h-4 w-4 mr-1 text-green-600" />
              WhatsApp
            </label>
            <input
              type="tel"
              value={form.whatsapp}
              onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Clock className="inline h-4 w-4 mr-1" />
              Store Hours
            </label>
            <input
              type="text"
              value={form.hours}
              onChange={(e) => setForm({ ...form, hours: e.target.value })}
              className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-sb-primary focus:border-transparent"
              placeholder="Mon-Fri 9AM-6PM"
            />
          </div>
        </div>
      </Card>

      {/* SOCIAL MEDIA */}
      <Card padding="lg">
        <h3 className="font-semibold text-lg mb-4">Social Media</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
              <Instagram className="h-4 w-4 text-pink-600" />
              Instagram
            </label>
            <input
              type="text"
              value={form.instagram}
              onChange={(e) => setForm({ ...form, instagram: e.target.value })}
              className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-sb-primary focus:border-transparent"
              placeholder="@username or URL"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
              <Facebook className="h-4 w-4 text-blue-600" />
              Facebook
            </label>
            <input
              type="text"
              value={form.facebook}
              onChange={(e) => setForm({ ...form, facebook: e.target.value })}
              className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-sb-primary focus:border-transparent"
              placeholder="Page name or URL"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
              <TikTokIcon className="h-4 w-4" />
              TikTok
            </label>
            <input
              type="text"
              value={form.tiktok}
              onChange={(e) => setForm({ ...form, tiktok: e.target.value })}
              className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-sb-primary focus:border-transparent"
              placeholder="@username or URL"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
              <Twitter className="h-4 w-4" />
              X (Twitter)
            </label>
            <input
              type="text"
              value={form.twitter}
              onChange={(e) => setForm({ ...form, twitter: e.target.value })}
              className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-sb-primary focus:border-transparent"
              placeholder="@handle"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
              <Youtube className="h-4 w-4 text-red-600" />
              YouTube
            </label>
            <input
              type="text"
              value={form.youtube}
              onChange={(e) => setForm({ ...form, youtube: e.target.value })}
              className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-sb-primary focus:border-transparent"
              placeholder="@channel or URL"
            />
          </div>
        </div>
      </Card>

      {/* DELIVERY SETTINGS */}
      <Card padding="lg">
        <h3 className="font-semibold text-lg mb-4">Delivery Settings</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Delivery Fee (RD$)
            </label>
            <input
              type="number"
              value={form.delivery_fee}
              onChange={(e) => setForm({ ...form, delivery_fee: e.target.value })}
              className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-sb-primary focus:border-transparent"
              placeholder="0"
              min="0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Minimum Order (RD$)
            </label>
            <input
              type="number"
              value={form.min_order}
              onChange={(e) => setForm({ ...form, min_order: e.target.value })}
              className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-sb-primary focus:border-transparent"
              placeholder="0"
              min="0"
            />
          </div>
        </div>
      </Card>

      {/* LOCATION */}
      <Card padding="lg">
        <h3 className="font-semibold text-lg mb-4">Store Location (Map Pin)</h3>
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Set exact location so customers can find this store on the map.
          </p>

          <button
            type="button"
            onClick={getCurrentLocation}
            disabled={gettingLocation}
            className="flex items-center gap-2 px-4 py-2.5 bg-sb-primary text-white rounded-xl font-medium text-sm hover:bg-sb-primary/90 transition disabled:opacity-50"
          >
            <Locate className={`h-4 w-4 ${gettingLocation ? "animate-spin" : ""}`} />
            {gettingLocation ? "Getting Location..." : "Use Current Location"}
          </button>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Latitude
              </label>
              <input
                type="text"
                value={location.lat}
                onChange={(e) => setLocation({ ...location, lat: e.target.value })}
                className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-sb-primary focus:border-transparent"
                placeholder="19.7808"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Longitude
              </label>
              <input
                type="text"
                value={location.lng}
                onChange={(e) => setLocation({ ...location, lng: e.target.value })}
                className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-sb-primary focus:border-transparent"
                placeholder="-70.6873"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Location Label
            </label>
            <input
              type="text"
              value={location.location_address}
              onChange={(e) => setLocation({ ...location, location_address: e.target.value })}
              className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-sb-primary focus:border-transparent"
              placeholder="Plaza Central, Puerto Plata"
            />
          </div>

          {location.lat && location.lng && (
            <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 px-3 py-2 rounded-lg">
              <CheckCircle2 className="h-4 w-4" />
              Location: {location.lat}, {location.lng}
            </div>
          )}
        </div>
      </Card>

      {/* APPROVAL STATUS */}
      <Card padding="lg">
        <h3 className="font-semibold text-lg mb-4">Approval Status</h3>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={autoApprove}
            onChange={(e) => setAutoApprove(e.target.checked)}
            className="w-5 h-5 rounded text-sb-primary focus:ring-sb-primary"
          />
          <div>
            <span className="font-medium text-gray-900">Auto-approve this vendor</span>
            <p className="text-sm text-gray-500">
              Vendor will be immediately visible and can start selling
            </p>
          </div>
        </label>
      </Card>

      {/* SAVE BUTTON */}
      <div className="flex gap-3 justify-end sticky bottom-4">
        <Link href="/admin/vendors">
          <Button variant="secondary">Cancel</Button>
        </Link>
        <Button onClick={handleSave} loading={saving}>
          <Save className="h-4 w-4 mr-1" />
          Create Vendor
        </Button>
      </div>
    </div>
  );
}
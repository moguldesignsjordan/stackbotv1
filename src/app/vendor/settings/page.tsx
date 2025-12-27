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
  Save,
  X,
  Camera,
  Locate,
  Building2,
  CreditCard,
  User,
  Hash,
  Wallet,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  ExternalLink,
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

interface BankInfo {
  bank_name: string;
  account_holder: string;
  account_last4: string;
  routing_number: string;
  account_type: "checking" | "savings";
}

interface LocationInfo {
  lat: number;
  lng: number;
  location_address: string;
}

export default function VendorSettings() {
  const [user, setUser] = useState<any>(null);
  const [vendor, setVendor] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [showBankEdit, setShowBankEdit] = useState(false);

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

  // Bank info state
  const [bankInfo, setBankInfo] = useState<BankInfo>({
    bank_name: "",
    account_holder: "",
    account_last4: "",
    routing_number: "",
    account_type: "checking",
  });

  // New account number for updates
  const [newAccountNumber, setNewAccountNumber] = useState("");

  // Location state
  const [location, setLocation] = useState({
    lat: "",
    lng: "",
    location_address: "",
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

        // Load bank info
        if (data.bank_info) {
          setBankInfo({
            bank_name: data.bank_info.bank_name || "",
            account_holder: data.bank_info.account_holder || "",
            account_last4: data.bank_info.account_last4 || "",
            routing_number: data.bank_info.routing_number || "",
            account_type: data.bank_info.account_type || "checking",
          });
        }

        // Load location
        if (data.location) {
          setLocation({
            lat: data.location.lat?.toString() || "",
            lng: data.location.lng?.toString() || "",
            location_address: data.location.location_address || "",
          });
        }
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

  /* ---------------- LOCATION ---------------- */
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
        setMessage({ type: "success", text: "Location updated!" });
      },
      (err) => {
        console.error("Geolocation error:", err);
        setMessage({ type: "error", text: "Could not get location" });
        setGettingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
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

      // Update location if set
      if (location.lat && location.lng) {
        updates.location = {
          lat: parseFloat(location.lat),
          lng: parseFloat(location.lng),
          location_address: location.location_address.trim() || form.address.trim(),
        };
      }

      // Update bank info if editing
      if (showBankEdit && bankInfo.bank_name) {
        updates.bank_info = {
          bank_name: bankInfo.bank_name.trim(),
          account_holder: bankInfo.account_holder.trim(),
          account_last4: newAccountNumber
            ? newAccountNumber.slice(-4)
            : bankInfo.account_last4,
          routing_number: bankInfo.routing_number.trim(),
          account_type: bankInfo.account_type,
        };
      }

      await updateDoc(doc(db, "vendors", user.uid), updates);

      // Update local state
      setVendor((v: any) => ({ ...v, ...updates }));
      setLogoFile(null);
      setLogoPreview(null);
      setCoverFile(null);
      setCoverPreview(null);
      setNewAccountNumber("");
      setShowBankEdit(false);

      // Update bank display
      if (updates.bank_info) {
        setBankInfo((prev) => ({
          ...prev,
          account_last4: updates.bank_info.account_last4,
        }));
      }

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
    <div className="space-y-6 max-w-3xl pb-24">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl sm:text-3xl font-bold">Store Settings</h1>
        {vendor?.slug && (
          <Link
            href={`/store/${vendor.slug}`}
            target="_blank"
            className="flex items-center gap-1 text-sb-primary font-semibold text-sm hover:underline"
          >
            View Storefront
            <ExternalLink className="h-3.5 w-3.5" />
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

      {/* COVER IMAGE */}
      <Card title="Cover Image">
        <div className="space-y-3">
          <div className="relative h-40 sm:h-48 rounded-xl overflow-hidden bg-gray-100">
            <Image
              src={coverPreview || vendor?.cover_image_url || "/placeholder-cover.png"}
              fill
              alt="Cover"
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

      {/* ============= LOCATION / MAP PIN ============= */}
      <Card title="Store Location (Map Pin)">
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Set your exact map coordinates so customers can find you.
          </p>

          <button
            type="button"
            onClick={getCurrentLocation}
            disabled={gettingLocation}
            className="flex items-center gap-2 px-4 py-2.5 bg-sb-primary text-white rounded-xl font-medium text-sm hover:bg-sb-primary/90 transition disabled:opacity-50"
          >
            <Locate className={`h-4 w-4 ${gettingLocation ? "animate-spin" : ""}`} />
            {gettingLocation ? "Getting Location..." : "Use My Current Location"}
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
              Location Label (for display)
            </label>
            <input
              type="text"
              value={location.location_address}
              onChange={(e) =>
                setLocation({ ...location, location_address: e.target.value })
              }
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

          {/* Map Preview Link */}
          {location.lat && location.lng && (
            <a
              href={`https://www.google.com/maps?q=${location.lat},${location.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-sb-primary hover:underline"
            >
              <ExternalLink className="h-4 w-4" />
              Preview on Google Maps
            </a>
          )}
        </div>
      </Card>

      {/* ============= BANK / DIRECT DEPOSIT ============= */}
      <Card title="Direct Deposit / Payout">
        <div className="space-y-4">
          {/* Display current bank info */}
          {bankInfo.bank_name && !showBankEdit ? (
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-gray-900 flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-gray-600" />
                  {bankInfo.bank_name}
                </h4>
                <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">
                  Active
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Account Holder</p>
                  <p className="font-medium">{bankInfo.account_holder}</p>
                </div>
                <div>
                  <p className="text-gray-500">Account</p>
                  <p className="font-medium">••••••{bankInfo.account_last4}</p>
                </div>
                <div>
                  <p className="text-gray-500">Routing</p>
                  <p className="font-medium">{bankInfo.routing_number}</p>
                </div>
                <div>
                  <p className="text-gray-500">Type</p>
                  <p className="font-medium capitalize">{bankInfo.account_type}</p>
                </div>
              </div>

              <button
                onClick={() => setShowBankEdit(true)}
                className="text-sb-primary text-sm font-medium hover:underline"
              >
                Edit Bank Information
              </button>
            </div>
          ) : (
            <div className="space-y-4 p-4 bg-blue-50 rounded-xl border border-blue-200">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-blue-600" />
                  {bankInfo.bank_name ? "Update Bank Information" : "Add Bank Information"}
                </h4>
                {showBankEdit && (
                  <button
                    onClick={() => setShowBankEdit(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X className="h-5 w-5" />
                  </button>
                )}
              </div>

              <p className="text-sm text-gray-600">
                Enter your bank account details to receive payouts.
              </p>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bank Name
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={bankInfo.bank_name}
                    onChange={(e) =>
                      setBankInfo({ ...bankInfo, bank_name: e.target.value })
                    }
                    className="w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-sb-primary focus:border-transparent"
                    placeholder="Banco Popular Dominicano"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Account Holder Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={bankInfo.account_holder}
                    onChange={(e) =>
                      setBankInfo({ ...bankInfo, account_holder: e.target.value })
                    }
                    className="w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-sb-primary focus:border-transparent"
                    placeholder="Full name on account"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {bankInfo.account_last4 ? "New Account Number" : "Account Number"}
                  </label>
                  <div className="relative">
                    <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="password"
                      value={newAccountNumber}
                      onChange={(e) => setNewAccountNumber(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-sb-primary focus:border-transparent"
                      placeholder={
                        bankInfo.account_last4
                          ? `Current: ••••••${bankInfo.account_last4}`
                          : "Account number"
                      }
                    />
                  </div>
                  {bankInfo.account_last4 && (
                    <p className="text-xs text-gray-500 mt-1">
                      Leave blank to keep current account
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Routing Number
                  </label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      value={bankInfo.routing_number}
                      onChange={(e) =>
                        setBankInfo({ ...bankInfo, routing_number: e.target.value })
                      }
                      className="w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-sb-primary focus:border-transparent"
                      placeholder="Transit / ABA number"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Account Type
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="account_type"
                      value="checking"
                      checked={bankInfo.account_type === "checking"}
                      onChange={() =>
                        setBankInfo({ ...bankInfo, account_type: "checking" })
                      }
                      className="w-4 h-4 text-sb-primary focus:ring-sb-primary"
                    />
                    <span className="text-sm text-gray-700">Checking</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="account_type"
                      value="savings"
                      checked={bankInfo.account_type === "savings"}
                      onChange={() =>
                        setBankInfo({ ...bankInfo, account_type: "savings" })
                      }
                      className="w-4 h-4 text-sb-primary focus:ring-sb-primary"
                    />
                    <span className="text-sm text-gray-700">Savings</span>
                  </label>
                </div>
              </div>

              <p className="text-xs text-gray-500 flex items-start gap-1.5">
                <AlertCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                Your bank details are encrypted. We only store the last 4 digits
                of your account number.
              </p>
            </div>
          )}
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
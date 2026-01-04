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
import {
  Store,
  ArrowLeft,
  Upload,
  MapPin,
  Locate,
  Building2,
  CreditCard,
  User,
  Hash,
  Wallet,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";

// ═══════════════════════════════════════════════════════════════════════════
// IMPORT FROM SINGLE SOURCE OF TRUTH
// ═══════════════════════════════════════════════════════════════════════════
import { VENDOR_CATEGORIES } from "@/lib/config/categories";

const generateSlug = (name: string) => {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/--+/g, "-");
};

interface BankInfo {
  bank_name: string;
  account_holder: string;
  account_number: string;
  routing_number: string;
  account_type: "checking" | "savings";
}

interface LocationInfo {
  lat: string;
  lng: string;
  location_address: string;
}

export default function VendorSignupPage() {
  const router = useRouter();
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [existingVendor, setExistingVendor] = useState<any>(null);
  const [gettingLocation, setGettingLocation] = useState(false);

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    website: "",
    description: "",
    categories: [] as string[],
  });

  // Bank account info
  const [bankInfo, setBankInfo] = useState<BankInfo>({
    bank_name: "",
    account_holder: "",
    account_number: "",
    routing_number: "",
    account_type: "checking",
  });

  // Location info
  const [location, setLocation] = useState<LocationInfo>({
    lat: "",
    lng: "",
    location_address: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Check auth state and existing vendor application
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace("/login?intent=vendor");
        return;
      }

      setCurrentUser(user);

      setForm((prev) => ({
        ...prev,
        email: user.email || "",
      }));

      try {
        const vendorRef = doc(db, "vendors", user.uid);
        const vendorSnap = await getDoc(vendorRef);

        if (vendorSnap.exists()) {
          const data = vendorSnap.data();
          setExistingVendor(data);

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

  const handleBankChange = (field: keyof BankInfo, value: string) => {
    setBankInfo((prev) => ({ ...prev, [field]: value }));
  };

  const handleLocationChange = (field: keyof LocationInfo, value: string) => {
    setLocation((prev) => ({ ...prev, [field]: value }));
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

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onload = () => setLogoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  // Get current location
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      return;
    }

    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setLocation((prev) => ({
          ...prev,
          lat: latitude.toFixed(6),
          lng: longitude.toFixed(6),
        }));
        setGettingLocation(false);
      },
      (err) => {
        console.error("Geolocation error:", err);
        setError("Could not get your location. Please enter manually.");
        setGettingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (!currentUser) throw new Error("Please log in first.");
      if (!form.name.trim()) throw new Error("Business name is required.");
      if (!form.email.trim()) throw new Error("Business email is required.");
      if (!form.phone.trim()) throw new Error("Phone number is required.");
      if (form.categories.length === 0) throw new Error("Select at least one category.");

      let logoUrl = "";
      if (logoFile) {
        const safeName = logoFile.name.replace(/\s+/g, "-");
        const vendorId = currentUser.uid;
        const filePath = `vendors/logos/${vendorId}/${Date.now()}-${safeName}`;
        const storage = getStorage();
        const logoRef = ref(storage, filePath);
        await uploadBytes(logoRef, logoFile);
        logoUrl = await getDownloadURL(logoRef);
      }

      // Slug generation
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
          console.error("Slug error:", err);
        }
      }

      // Prepare bank info (mask account number - only store last 4)
      const maskedBankInfo = bankInfo.bank_name
        ? {
            bank_name: bankInfo.bank_name.trim(),
            account_holder: bankInfo.account_holder.trim(),
            account_last4: bankInfo.account_number.slice(-4),
            routing_number: bankInfo.routing_number.trim(),
            account_type: bankInfo.account_type,
          }
        : null;

      // Prepare location info
      const locationData =
        location.lat && location.lng
          ? {
              lat: parseFloat(location.lat),
              lng: parseFloat(location.lng),
              location_address: location.location_address.trim() || form.address.trim(),
            }
          : null;

      // Save vendor
      const vendorRef = doc(db, "vendors", currentUser.uid);

      await setDoc(vendorRef, {
        uid: currentUser.uid,
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        website: form.website.trim(),
        description: form.description.trim(),
        categories: form.categories,
        logoUrl,
        slug: finalSlug,
        verified: false,
        total_orders: 0,
        total_revenue: 0,
        rating: 0,
        source: "public_signup",
        // Bank & Location
        ...(maskedBankInfo && { bank_info: maskedBankInfo }),
        ...(locationData && { location: locationData }),
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      });

      console.log("Vendor application submitted:", currentUser.uid);

      // Switch UI to pending mode
      setExistingVendor({
        uid: currentUser.uid,
        name: form.name,
        email: form.email,
        phone: form.phone,
        address: form.address,
        website: form.website,
        description: form.description,
        categories: form.categories,
        logoUrl: logoUrl || null,
        verified: false,
      });
    } catch (err: any) {
      console.error("Vendor signup error:", err);
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-sb-bg flex items-center justify-center">
        <LoadingSpinner text="Loading..." />
      </div>
    );
  }

  // Pending UI
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
            You've submitted an application for{" "}
            <strong>{existingVendor.name}</strong>. We're reviewing it and will
            notify you once approved.
          </p>

          <div className="pt-4 space-y-3">
            <Link
              href="/"
              className="block w-full bg-sb-primary text-white py-3 rounded-xl font-semibold hover:opacity-90 transition text-center"
            >
              Return Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Signup Form
  return (
    <div className="min-h-screen bg-sb-bg py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Back */}
        <Link
          href="/"
          className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Home
        </Link>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8 space-y-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-sb-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Store className="h-8 w-8 text-sb-primary" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Become a Vendor</h1>
            <p className="text-gray-600 mt-2">
              Tell us about your business. We'll review your application in
              24–48 hours.
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* ============= LOGO UPLOAD ============= */}
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                {logoPreview ? (
                  <Image
                    src={logoPreview}
                    alt="Logo preview"
                    width={100}
                    height={100}
                    className="rounded-xl object-cover border-2 border-gray-200"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-xl bg-gray-100 flex items-center justify-center border-2 border-dashed border-gray-300">
                    <Upload className="h-8 w-8 text-gray-400" />
                  </div>
                )}
              </div>
              <label className="cursor-pointer text-sb-primary font-medium text-sm hover:underline">
                Upload Business Logo
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={handleLogoSelect}
                />
              </label>
            </div>

            {/* ============= BUSINESS INFO ============= */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Store className="h-5 w-5 text-sb-primary" />
                Business Information
              </h3>

              <Input
                label="Business Name *"
                value={form.name}
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder="Your Business Name"
                required
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Business Email *"
                  type="email"
                  value={form.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  placeholder="business@example.com"
                  required
                />

                <Input
                  label="Phone Number *"
                  type="tel"
                  value={form.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                  placeholder="+1 (809) 555-0123"
                  required
                />
              </div>

              <Input
                label="Business Address"
                value={form.address}
                onChange={(e) => handleChange("address", e.target.value)}
                placeholder="123 Main St, City"
              />

              <Input
                label="Website (optional)"
                type="url"
                value={form.website}
                onChange={(e) => handleChange("website", e.target.value)}
                placeholder="https://yourwebsite.com"
              />

              <Textarea
                label="Business Description"
                value={form.description}
                onChange={(e) => handleChange("description", e.target.value)}
                placeholder="Tell customers what you offer..."
                rows={3}
              />
            </div>

            {/* ============= CATEGORIES (FROM SHARED CONFIG) ============= */}
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900">Categories *</h3>
              <p className="text-sm text-gray-500">Select all that apply</p>
              <div className="flex flex-wrap gap-2">
                {VENDOR_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
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
            </div>

            {/* ============= LOCATION / MAP PIN ============= */}
            <div className="space-y-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <MapPin className="h-5 w-5 text-sb-primary" />
                Store Location (Map Pin)
              </h3>
              <p className="text-sm text-gray-500">
                Set your exact location so customers can find you on the map.
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
                <Input
                  label="Latitude"
                  type="text"
                  value={location.lat}
                  onChange={(e) => handleLocationChange("lat", e.target.value)}
                  placeholder="19.7808"
                />
                <Input
                  label="Longitude"
                  type="text"
                  value={location.lng}
                  onChange={(e) => handleLocationChange("lng", e.target.value)}
                  placeholder="-70.6873"
                />
              </div>

              <Input
                label="Location Address (for display)"
                value={location.location_address}
                onChange={(e) => handleLocationChange("location_address", e.target.value)}
                placeholder="Plaza Central, Puerto Plata"
              />

              {location.lat && location.lng && (
                <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 px-3 py-2 rounded-lg">
                  <CheckCircle2 className="h-4 w-4" />
                  Location set: {location.lat}, {location.lng}
                </div>
              )}
            </div>

            {/* ============= BANK / DIRECT DEPOSIT ============= */}
            <div className="space-y-4 p-4 bg-blue-50 rounded-xl border border-blue-200">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Wallet className="h-5 w-5 text-blue-600" />
                Direct Deposit Setup
              </h3>
              <p className="text-sm text-gray-600">
                Enter your bank account details to receive payouts. This
                information is securely stored.
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
                    onChange={(e) => handleBankChange("bank_name", e.target.value)}
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
                    onChange={(e) => handleBankChange("account_holder", e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-sb-primary focus:border-transparent"
                    placeholder="Full name on account"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Account Number
                  </label>
                  <div className="relative">
                    <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="password"
                      value={bankInfo.account_number}
                      onChange={(e) => handleBankChange("account_number", e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-sb-primary focus:border-transparent"
                      placeholder="••••••••••"
                    />
                  </div>
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
                      onChange={(e) => handleBankChange("routing_number", e.target.value)}
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
                      onChange={() => handleBankChange("account_type", "checking")}
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
                      onChange={() => handleBankChange("account_type", "savings")}
                      className="w-4 h-4 text-sb-primary focus:ring-sb-primary"
                    />
                    <span className="text-sm text-gray-700">Savings</span>
                  </label>
                </div>
              </div>

              <p className="text-xs text-gray-500 flex items-start gap-1.5">
                <AlertCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                Your bank details are encrypted and only used for payout
                processing. We only store the last 4 digits of your account.
              </p>
            </div>

            {/* ============= SUBMIT ============= */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full py-4 text-lg"
            >
              {loading ? "Submitting..." : "Submit Application"}
            </Button>
          </form>

          <p className="text-center text-sm text-gray-500">
            Already have a vendor account?{" "}
            <Link href="/login" className="text-sb-primary font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
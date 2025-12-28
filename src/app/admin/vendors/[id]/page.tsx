// src/app/admin/vendors/[id]/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { db, auth } from "@/lib/firebase/config";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  deleteDoc,
  updateDoc,
  addDoc,
  serverTimestamp,
  query,
  where,
} from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Badge } from "@/components/ui/Badge";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Button } from "@/components/ui/Button";
import {
  ArrowLeft,
  Store,
  MapPin,
  Phone,
  Globe,
  Mail,
  Package,
  ShieldBan,
  ShieldCheck,
  Pencil,
  Trash2,
  Save,
  X,
  Camera,
  Clock,
  Star,
  DollarSign,
  Sparkles,
  CheckCircle2,
  ExternalLink,
  ImageIcon,
  Link2,
  Plus,
  ShoppingCart,
  Loader2,
  TrendingUp,
  ChevronRight,
} from "lucide-react";

/* ======================================================
   CONSTANTS
====================================================== */

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

/* ======================================================
   TYPES
====================================================== */

interface Vendor {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  website?: string;
  description?: string;
  categories?: string[];
  logoUrl?: string;
  cover_image_url?: string;
  slug?: string;
  total_orders?: number;
  total_revenue?: number;
  rating?: number;
  stackbot_pin?: string;
  status?: "approved" | "suspended" | "pending";
  featured?: boolean;
  verified?: boolean;
  hours?: string;
  delivery_fee?: number;
  min_order?: number;
  created_at?: any;
  updated_at?: any;
}

interface Product {
  id: string;
  name: string;
  price?: number;
  active?: boolean;
  images?: string[];
  description?: string;
}

interface FormState {
  name: string;
  email: string;
  phone: string;
  address: string;
  website: string;
  description: string;
  categories: string[];
  hours: string;
  delivery_fee: string;
  min_order: string;
  slug: string;
  featured: boolean;
  verified: boolean;
}

/* ======================================================
   MAIN COMPONENT
====================================================== */

export default function AdminVendorDetailPage() {
  const { id: vendorId } = useParams<{ id: string }>();
  const router = useRouter();

  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<FormState>({
    name: "",
    email: "",
    phone: "",
    address: "",
    website: "",
    description: "",
    categories: [],
    hours: "",
    delivery_fee: "",
    min_order: "",
    slug: "",
    featured: false,
    verified: false,
  });

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);

  const [working, setWorking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const isSuspended = useMemo(() => vendor?.status === "suspended", [vendor]);

  /* ===============================
     LOAD VENDOR + PRODUCTS
  =============================== */
  useEffect(() => {
    if (!vendorId) return;

    const load = async () => {
      setLoading(true);
      try {
        const vendorRef = doc(db, "vendors", vendorId);
        const vendorSnap = await getDoc(vendorRef);

        if (!vendorSnap.exists()) {
          setVendor(null);
          setProducts([]);
          return;
        }

        const vendorData = {
          id: vendorSnap.id,
          ...(vendorSnap.data() as any),
        } as Vendor;

        setVendor(vendorData);
        initializeForm(vendorData);

        const prodSnap = await getDocs(
          collection(db, "vendors", vendorId, "products")
        );

        setProducts(
          prodSnap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as any),
          }))
        );
      } catch (err) {
        console.error("Admin vendor load error:", err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [vendorId]);

  const initializeForm = (v: Vendor) => {
    setForm({
      name: v.name || "",
      email: v.email || "",
      phone: v.phone || "",
      address: v.address || "",
      website: v.website || "",
      description: v.description || "",
      categories: v.categories || [],
      hours: v.hours || "",
      delivery_fee: v.delivery_fee?.toString() || "",
      min_order: v.min_order?.toString() || "",
      slug: v.slug || "",
      featured: v.featured || false,
      verified: v.verified || false,
    });
    setLogoFile(null);
    setLogoPreview(null);
    setCoverFile(null);
    setCoverPreview(null);
  };

  async function logAudit(action: string, details?: Record<string, any>) {
    const admin = auth.currentUser;
    if (!admin || !vendor) return;

    await addDoc(collection(db, "admin_audit_logs"), {
      action,
      vendorId: vendor.id,
      vendorName: vendor.name,
      adminUid: admin.uid,
      adminEmail: admin.email,
      details: details || null,
      timestamp: serverTimestamp(),
    });
  }

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

  const removeLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
  };

  const removeCover = () => {
    setCoverFile(null);
    setCoverPreview(null);
  };

  const toggleCategory = (cat: string) => {
    setForm((f) => ({
      ...f,
      categories: f.categories.includes(cat)
        ? f.categories.filter((c) => c !== cat)
        : [...f.categories, cat],
    }));
  };

  const validateSlug = async (newSlug: string): Promise<boolean> => {
    if (!newSlug.trim()) return true;
    if (newSlug === vendor?.slug) return true;

    const slugQuery = query(
      collection(db, "vendors"),
      where("slug", "==", newSlug.trim())
    );
    const slugSnap = await getDocs(slugQuery);
    return slugSnap.empty;
  };

  const handleSave = async () => {
    if (!vendorId || !vendor) return;

    setSaving(true);
    setMessage(null);

    try {
      const slugValid = await validateSlug(form.slug);
      if (!slugValid) {
        throw new Error("This slug is already in use by another vendor.");
      }

      const updates: Record<string, any> = {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        website: form.website.trim(),
        description: form.description.trim(),
        categories: form.categories,
        hours: form.hours.trim(),
        delivery_fee: form.delivery_fee ? parseFloat(form.delivery_fee) : 0,
        min_order: form.min_order ? parseFloat(form.min_order) : 0,
        slug: form.slug.trim().toLowerCase().replace(/\s+/g, "-"),
        featured: form.featured,
        verified: form.verified,
        updated_at: serverTimestamp(),
      };

      if (logoFile) {
        const safeName = logoFile.name.replace(/\s+/g, "-");
        const path = `vendors/logos/${vendorId}/${Date.now()}-${safeName}`;
        updates.logoUrl = await uploadImage(logoFile, path);
      }

      if (coverFile) {
        const safeName = coverFile.name.replace(/\s+/g, "-");
        const path = `vendors/covers/${vendorId}/${Date.now()}-${safeName}`;
        updates.cover_image_url = await uploadImage(coverFile, path);
      }

      await updateDoc(doc(db, "vendors", vendorId), updates);

      await logAudit("update_vendor", {
        fields: Object.keys(updates).filter((k) => k !== "updated_at"),
      });

      setVendor((v) => (v ? { ...v, ...updates } : null));
      setLogoFile(null);
      setLogoPreview(null);
      setCoverFile(null);
      setCoverPreview(null);

      setMessage({ type: "success", text: "Vendor updated successfully!" });
      setIsEditing(false);
    } catch (err: any) {
      console.error("Save error:", err);
      setMessage({ type: "error", text: err.message || "Failed to save changes" });
    } finally {
      setSaving(false);
    }
  };

  const cancelEdit = () => {
    if (vendor) initializeForm(vendor);
    setIsEditing(false);
    setMessage(null);
  };

  const quickToggleFeatured = async () => {
    if (!vendorId || !vendor) return;
    setWorking(true);

    try {
      const newValue = !vendor.featured;
      await updateDoc(doc(db, "vendors", vendorId), {
        featured: newValue,
        updated_at: serverTimestamp(),
      });
      await logAudit(newValue ? "feature_vendor" : "unfeature_vendor");
      setVendor((v) => (v ? { ...v, featured: newValue } : null));
      setForm((f) => ({ ...f, featured: newValue }));
      setMessage({ type: "success", text: newValue ? "Vendor featured!" : "Vendor unfeatured" });
    } catch (err) {
      setMessage({ type: "error", text: "Failed to update" });
    } finally {
      setWorking(false);
    }
  };

  const quickToggleVerified = async () => {
    if (!vendorId || !vendor) return;
    setWorking(true);

    try {
      const newValue = !vendor.verified;
      await updateDoc(doc(db, "vendors", vendorId), {
        verified: newValue,
        updated_at: serverTimestamp(),
      });
      await logAudit(newValue ? "verify_vendor" : "unverify_vendor");
      setVendor((v) => (v ? { ...v, verified: newValue } : null));
      setForm((f) => ({ ...f, verified: newValue }));
      setMessage({ type: "success", text: newValue ? "Vendor verified!" : "Verification removed" });
    } catch (err) {
      setMessage({ type: "error", text: "Failed to update" });
    } finally {
      setWorking(false);
    }
  };

  const removeExistingLogo = async () => {
    if (!vendorId || !confirm("Remove vendor logo?")) return;
    setWorking(true);

    try {
      await updateDoc(doc(db, "vendors", vendorId), {
        logoUrl: "",
        updated_at: serverTimestamp(),
      });
      setVendor((v) => (v ? { ...v, logoUrl: "" } : null));
      setMessage({ type: "success", text: "Logo removed" });
    } catch (err) {
      setMessage({ type: "error", text: "Failed to remove logo" });
    } finally {
      setWorking(false);
    }
  };

  const removeExistingCover = async () => {
    if (!vendorId || !confirm("Remove cover image?")) return;
    setWorking(true);

    try {
      await updateDoc(doc(db, "vendors", vendorId), {
        cover_image_url: "",
        updated_at: serverTimestamp(),
      });
      setVendor((v) => (v ? { ...v, cover_image_url: "" } : null));
      setMessage({ type: "success", text: "Cover image removed" });
    } catch (err) {
      setMessage({ type: "error", text: "Failed to remove cover" });
    } finally {
      setWorking(false);
    }
  };

  async function toggleSuspension() {
    if (!vendorId || !vendor) return;

    const nextStatus = vendor.status === "suspended" ? "approved" : "suspended";

    const confirmMsg =
      nextStatus === "suspended"
        ? "Suspend this vendor? They will be hidden everywhere and unable to log in."
        : "Reinstate this vendor and restore access?";

    if (!confirm(confirmMsg)) return;

    try {
      setWorking(true);

      await updateDoc(doc(db, "vendors", vendorId), {
        status: nextStatus,
        updated_at: serverTimestamp(),
      });

      await fetch(
        `/api/admin/${nextStatus === "suspended" ? "disable-user" : "enable-user"}`,
        {
          method: "POST",
          body: JSON.stringify({ uid: vendorId }),
        }
      );

      await logAudit(
        nextStatus === "suspended" ? "suspend_vendor" : "reinstate_vendor"
      );

      setVendor({ ...vendor, status: nextStatus });
      setMessage({
        type: "success",
        text: nextStatus === "suspended" ? "Vendor suspended" : "Vendor reinstated",
      });
    } catch (e) {
      setMessage({ type: "error", text: "Failed to update vendor status" });
    } finally {
      setWorking(false);
    }
  }

  async function deleteProduct(productId: string) {
    if (!vendorId) return;
    if (!confirm("Delete this product permanently?")) return;

    try {
      setDeletingProductId(productId);
      await deleteDoc(doc(db, "vendors", vendorId, "products", productId));
      setProducts((prev) => prev.filter((p) => p.id !== productId));
    } catch (e) {
      alert("Failed to delete product.");
    } finally {
      setDeletingProductId(null);
    }
  }

  async function deleteVendor() {
    if (!vendorId || !vendor) return;

    if (
      !confirm(
        "This will permanently delete the vendor, all products, disable auth, and remove storage files. This cannot be undone."
      )
    )
      return;

    try {
      setWorking(true);

      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("Not authenticated");

      const res = await fetch("/api/admin/delete-vendor", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ vendorId }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Delete failed");
      }

      await logAudit("delete_vendor");
      router.push("/admin/vendors");
    } catch (e: any) {
      alert(e.message || "Failed to delete vendor.");
    } finally {
      setWorking(false);
    }
  }

  if (loading) return <LoadingSpinner text="Loading vendor..." />;

  if (!vendor) {
    return (
      <div className="space-y-4">
        <Link
          href="/admin/vendors"
          className="inline-flex items-center text-sb-primary font-medium hover:underline"
        >
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Vendors
        </Link>
        <p className="text-red-600">Vendor not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* STATUS MESSAGE */}
      {message && (
        <div
          className={`px-4 py-3 rounded-xl flex items-center justify-between text-sm shadow-sm ${
            message.type === "success"
              ? "bg-green-50 text-green-700"
              : "bg-red-50 text-red-700"
          }`}
        >
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="p-1 hover:opacity-70">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/vendors"
            className="p-2 hover:bg-white rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-500" />
          </Link>

          {vendor.logoUrl ? (
            <Image
              src={vendor.logoUrl}
              alt={vendor.name}
              width={48}
              height={48}
              className="rounded-xl bg-gray-100 object-cover"
            />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-sb-primary flex items-center justify-center">
              <Store className="h-6 w-6 text-white" />
            </div>
          )}

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-gray-900">{vendor.name}</h1>
              {vendor.featured && (
                <span className="w-6 h-6 rounded-lg bg-yellow-100 flex items-center justify-center">
                  <Sparkles className="h-3.5 w-3.5 text-yellow-600" />
                </span>
              )}
              {vendor.verified && (
                <span className="w-6 h-6 rounded-lg bg-green-100 flex items-center justify-center">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                </span>
              )}
            </div>
            {vendor.slug && (
              <Link
                href={`/store/${vendor.slug}`}
                target="_blank"
                className="text-xs text-gray-500 hover:text-sb-primary inline-flex items-center gap-1"
              >
                /store/{vendor.slug}
                <ExternalLink className="h-3 w-3" />
              </Link>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isEditing ? (
            <>
              <Button onClick={() => setIsEditing(true)} variant="secondary" size="sm">
                <Pencil className="h-4 w-4 mr-1" />
                Edit
              </Button>

              <Button
                onClick={toggleSuspension}
                loading={working}
                variant={isSuspended ? "secondary" : "danger"}
                size="sm"
              >
                {isSuspended ? (
                  <>
                    <ShieldCheck className="h-4 w-4 mr-1" />
                    Reinstate
                  </>
                ) : (
                  <>
                    <ShieldBan className="h-4 w-4 mr-1" />
                    Suspend
                  </>
                )}
              </Button>

              <Button onClick={deleteVendor} loading={working} variant="danger" size="sm">
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <Button onClick={cancelEdit} variant="secondary" size="sm" disabled={saving}>
                Cancel
              </Button>
              <Button onClick={handleSave} loading={saving} size="sm">
                <Save className="h-4 w-4 mr-1" />
                Save
              </Button>
            </>
          )}
        </div>
      </div>

      {/* MAIN CONTENT */}
      {isEditing ? (
        <EditMode
          form={form}
          setForm={setForm}
          vendor={vendor}
          logoPreview={logoPreview}
          coverPreview={coverPreview}
          selectLogo={selectLogo}
          selectCover={selectCover}
          removeLogo={removeLogo}
          removeCover={removeCover}
          removeExistingLogo={removeExistingLogo}
          removeExistingCover={removeExistingCover}
          toggleCategory={toggleCategory}
          working={working}
        />
      ) : (
        <ViewMode
          vendor={vendor}
          products={products}
          vendorId={vendorId}
          working={working}
          deletingProductId={deletingProductId}
          deleteProduct={deleteProduct}
          quickToggleFeatured={quickToggleFeatured}
          quickToggleVerified={quickToggleVerified}
        />
      )}
    </div>
  );
}

/* ======================================================
   VIEW MODE - DASHBOARD STYLE
====================================================== */

function ViewMode({
  vendor,
  products,
  vendorId,
  working,
  deletingProductId,
  deleteProduct,
  quickToggleFeatured,
  quickToggleVerified,
}: {
  vendor: Vendor;
  products: Product[];
  vendorId: string;
  working: boolean;
  deletingProductId: string | null;
  deleteProduct: (id: string) => void;
  quickToggleFeatured: () => void;
  quickToggleVerified: () => void;
}) {
  return (
    <>
      {/* STATS ROW - Dashboard Style */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Store className="h-5 w-5 text-white" />}
          iconBg="bg-sb-primary"
          label="Products"
          value={products.length}
        />
        <StatCard
          icon={<Clock className="h-5 w-5 text-white" />}
          iconBg="bg-orange-500"
          label={vendor.status === "pending" ? "Pending" : "Status"}
          value={vendor.status === "pending" ? "Review" : vendor.status === "suspended" ? "Suspended" : "Active"}
        />
        <StatCard
          icon={<ShoppingCart className="h-5 w-5 text-white" />}
          iconBg="bg-green-500"
          label="Orders"
          value={vendor.total_orders ?? 0}
        />
        <StatCard
          icon={<TrendingUp className="h-5 w-5 text-white" />}
          iconBg="bg-sb-primary"
          label="Revenue"
          value={`RD$${(vendor.total_revenue ?? 0).toLocaleString()}`}
        />
      </div>

      {/* TWO COLUMN LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT - Vendor Info */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Vendor Details</h2>
            <Link
              href={`/store/${vendor.slug}`}
              target="_blank"
              className="text-sb-primary text-sm font-medium hover:underline inline-flex items-center gap-1"
            >
              View store
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          {/* Vendor Card */}
          <div className="space-y-4">
            {/* Description */}
            {vendor.description && (
              <p className="text-sm text-gray-600 leading-relaxed">{vendor.description}</p>
            )}

            {/* Contact Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              {vendor.email && (
                <div className="flex items-center gap-2 text-gray-600">
                  <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <Mail className="h-4 w-4 text-gray-500" />
                  </div>
                  <span className="truncate">{vendor.email}</span>
                </div>
              )}
              {vendor.phone && (
                <div className="flex items-center gap-2 text-gray-600">
                  <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <Phone className="h-4 w-4 text-gray-500" />
                  </div>
                  <span>{vendor.phone}</span>
                </div>
              )}
              {vendor.address && (
                <div className="flex items-center gap-2 text-gray-600 sm:col-span-2">
                  <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <MapPin className="h-4 w-4 text-gray-500" />
                  </div>
                  <span>{vendor.address}</span>
                </div>
              )}
              {vendor.website && (
                <div className="flex items-center gap-2 text-gray-600">
                  <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <Globe className="h-4 w-4 text-gray-500" />
                  </div>
                  <a href={vendor.website} target="_blank" rel="noopener noreferrer" className="truncate hover:text-sb-primary">
                    {vendor.website.replace(/^https?:\/\/(www\.)?/, "")}
                  </a>
                </div>
              )}
              {vendor.hours && (
                <div className="flex items-center gap-2 text-gray-600">
                  <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <Clock className="h-4 w-4 text-gray-500" />
                  </div>
                  <span>{vendor.hours}</span>
                </div>
              )}
              {vendor.slug && (
                <div className="flex items-center gap-2 text-gray-600">
                  <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <Link2 className="h-4 w-4 text-gray-500" />
                  </div>
                  <code className="text-xs bg-gray-100 px-2 py-1 rounded">/store/{vendor.slug}</code>
                </div>
              )}
            </div>

            {/* Categories */}
            {vendor.categories && vendor.categories.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {vendor.categories.map((cat) => (
                  <span key={cat} className="px-3 py-1 bg-purple-50 text-purple-700 text-xs font-medium rounded-full">
                    {cat}
                  </span>
                ))}
              </div>
            )}

            {/* Quick Actions */}
            <div className="pt-4 border-t space-y-2">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Quick Actions</p>
              <div className="flex gap-2">
                <button
                  onClick={quickToggleFeatured}
                  disabled={working}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition ${
                    vendor.featured
                      ? "bg-yellow-50 text-yellow-700"
                      : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <Sparkles className="h-4 w-4" />
                  {vendor.featured ? "Featured" : "Feature"}
                </button>
                <button
                  onClick={quickToggleVerified}
                  disabled={working}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition ${
                    vendor.verified
                      ? "bg-green-50 text-green-700"
                      : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {vendor.verified ? "Verified" : "Verify"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT - Products */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Products</h2>
            <Link
              href={`/admin/vendors/${vendorId}/products/new`}
              className="text-sb-primary text-sm font-medium hover:underline inline-flex items-center gap-1"
            >
              Add product
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          {products.length === 0 ? (
            <div className="py-12 text-center">
              <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
                <Package className="h-6 w-6 text-gray-400" />
              </div>
              <p className="text-gray-500 text-sm">No products yet</p>
              <Link
                href={`/admin/vendors/${vendorId}/products/new`}
                className="inline-flex items-center gap-1 mt-3 text-sb-primary text-sm font-medium hover:underline"
              >
                <Plus className="h-4 w-4" />
                Add first product
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {products.slice(0, 5).map((p) => (
                <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors group">
                  {/* Avatar / Image */}
                  <div className="w-10 h-10 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0 flex items-center justify-center">
                    {p.images?.[0] ? (
                      <Image src={p.images[0]} alt={p.name} width={40} height={40} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-sm font-semibold text-gray-400">
                        {p.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 text-sm truncate">{p.name}</h4>
                    <p className="text-xs text-gray-500">
                      {p.price !== undefined ? `RD$${p.price.toLocaleString()}` : "No price"}
                    </p>
                  </div>

                  {/* Status Badge */}
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    p.active !== false
                      ? "bg-green-50 text-green-700"
                      : "bg-gray-100 text-gray-600"
                  }`}>
                    {p.active !== false ? "Active" : "Inactive"}
                  </span>

                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Link
                      href={`/admin/vendors/${vendorId}/products/${p.id}/edit`}
                      className="p-1.5 text-gray-400 hover:text-sb-primary rounded-lg transition-colors"
                    >
                      <Pencil className="h-4 w-4" />
                    </Link>
                    <button
                      onClick={() => deleteProduct(p.id)}
                      disabled={deletingProductId === p.id}
                      className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg transition-colors"
                    >
                      {deletingProductId === p.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </div>

                  <ChevronRight className="h-4 w-4 text-gray-300" />
                </div>
              ))}

              {products.length > 5 && (
                <Link
                  href={`/admin/vendors/${vendorId}/products`}
                  className="block text-center py-2 text-sm text-sb-primary font-medium hover:underline"
                >
                  View all {products.length} products
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

/* ======================================================
   STAT CARD - Dashboard Style
====================================================== */

function StatCard({
  icon,
  iconBg,
  label,
  value,
}: {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value: string | number;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-5">
      <div className={`w-11 h-11 rounded-xl ${iconBg} flex items-center justify-center mb-4`}>
        {icon}
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-500">{label}</p>
    </div>
  );
}

/* ======================================================
   EDIT MODE
====================================================== */

function EditMode({
  form,
  setForm,
  vendor,
  logoPreview,
  coverPreview,
  selectLogo,
  selectCover,
  removeLogo,
  removeCover,
  removeExistingLogo,
  removeExistingCover,
  toggleCategory,
  working,
}: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  vendor: Vendor;
  logoPreview: string | null;
  coverPreview: string | null;
  selectLogo: (file: File) => void;
  selectCover: (file: File) => void;
  removeLogo: () => void;
  removeCover: () => void;
  removeExistingLogo: () => void;
  removeExistingCover: () => void;
  toggleCategory: (cat: string) => void;
  working: boolean;
}) {
  return (
    <div className="space-y-6 max-w-3xl">
      {/* IMAGES */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Images</h3>
        <div className="grid sm:grid-cols-2 gap-6">
          {/* Logo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Logo</label>
            {logoPreview || vendor.logoUrl ? (
              <div className="relative w-24 h-24 rounded-xl overflow-hidden bg-gray-100">
                <Image src={logoPreview || vendor.logoUrl || ""} alt="Logo" fill className="object-cover" />
                <button
                  type="button"
                  onClick={logoPreview ? removeLogo : removeExistingLogo}
                  disabled={working}
                  className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-24 h-24 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition">
                <Camera className="h-6 w-6 text-gray-400" />
                <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && selectLogo(e.target.files[0])} />
              </label>
            )}
          </div>

          {/* Cover */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Cover</label>
            {coverPreview || vendor.cover_image_url ? (
              <div className="relative aspect-video rounded-xl overflow-hidden bg-gray-100">
                <Image src={coverPreview || vendor.cover_image_url || ""} alt="Cover" fill className="object-cover" />
                <button
                  type="button"
                  onClick={coverPreview ? removeCover : removeExistingCover}
                  disabled={working}
                  className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center aspect-video bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition">
                <ImageIcon className="h-6 w-6 text-gray-400" />
                <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && selectCover(e.target.files[0])} />
              </label>
            )}
          </div>
        </div>
      </div>

      {/* BASIC INFO */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Basic Info</h3>
        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <InputField label="Business Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">URL Slug</label>
              <div className="flex items-center gap-1">
                <span className="text-gray-400 text-sm">/store/</span>
                <input
                  type="text"
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/\s+/g, "-") })}
                  className="flex-1 px-3 py-2.5 bg-gray-50 rounded-xl text-sm font-mono focus:ring-2 focus:ring-sb-primary focus:bg-white transition"
                />
              </div>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
              className="w-full px-4 py-3 bg-gray-50 rounded-xl text-sm focus:ring-2 focus:ring-sb-primary focus:bg-white resize-none transition"
            />
          </div>
        </div>
      </div>

      {/* CATEGORIES */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h3 className="font-semibold text-gray-900 mb-3">Categories</h3>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
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

      {/* CONTACT */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Contact</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <InputField label="Email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} type="email" />
          <InputField label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} type="tel" />
          <InputField label="Address" value={form.address} onChange={(v) => setForm({ ...form, address: v })} className="sm:col-span-2" />
          <InputField label="Website" value={form.website} onChange={(v) => setForm({ ...form, website: v })} type="url" />
          <InputField label="Hours" value={form.hours} onChange={(v) => setForm({ ...form, hours: v })} />
        </div>
      </div>

      {/* DELIVERY */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Delivery</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <InputField label="Delivery Fee (RD$)" value={form.delivery_fee} onChange={(v) => setForm({ ...form, delivery_fee: v })} type="number" />
          <InputField label="Min Order (RD$)" value={form.min_order} onChange={(v) => setForm({ ...form, min_order: v })} type="number" />
        </div>
      </div>

      {/* ADMIN TOGGLES */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h3 className="font-semibold text-gray-900 mb-3">Admin Controls</h3>
        <div className="space-y-2">
          <label className="flex items-center justify-between p-4 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition">
            <span className="flex items-center gap-3 text-sm">
              <span className="w-8 h-8 rounded-lg bg-yellow-100 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-yellow-600" />
              </span>
              Featured Vendor
            </span>
            <input
              type="checkbox"
              checked={form.featured}
              onChange={(e) => setForm({ ...form, featured: e.target.checked })}
              className="w-5 h-5 text-sb-primary rounded"
            />
          </label>
          <label className="flex items-center justify-between p-4 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition">
            <span className="flex items-center gap-3 text-sm">
              <span className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              </span>
              Verified Vendor
            </span>
            <input
              type="checkbox"
              checked={form.verified}
              onChange={(e) => setForm({ ...form, verified: e.target.checked })}
              className="w-5 h-5 text-sb-primary rounded"
            />
          </label>
        </div>
      </div>
    </div>
  );
}

function InputField({
  label,
  value,
  onChange,
  type = "text",
  className = "",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-2.5 bg-gray-50 rounded-xl text-sm focus:ring-2 focus:ring-sb-primary focus:bg-white transition"
      />
    </div>
  );
}
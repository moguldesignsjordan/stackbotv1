// src/app/admin/vendors/[id]/page.tsx
"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { db, auth } from "@/lib/firebase/config";
import {
  doc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  collection,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { formatPrice } from "@/lib/utils/currency";
import {
  Store,
  ArrowLeft,
  Trash2,
  ShieldBan,
  ShieldCheck,
  Package,
  Pencil,
  ExternalLink,
  Save,
  X,
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
  cover_video_url?: string;
  slug?: string;
  total_orders?: number;
  total_revenue?: number;
  rating?: number;
  stackbot_pin?: string;
  status?: "approved" | "suspended" | "pending";
  verified?: boolean;
  hours?: string;
  whatsapp?: string;
  instagram?: string;
  facebook?: string;
  tiktok?: string;
  twitter?: string;
  youtube?: string;
}

interface Product {
  id: string;
  name: string;
  price?: number;
  active?: boolean;
  images?: string[];
  description?: string;
}

export default function AdminVendorDetailPage() {
  const { id: vendorId } = useParams<{ id: string }>();
  const router = useRouter();

  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [working, setWorking] = useState(false);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);

  // Form state for editing
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
  });

  // Media uploads
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [coverType, setCoverType] = useState<"image" | "video">("image");

  const isSuspended = useMemo(
    () => vendor?.status === "suspended",
    [vendor]
  );

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

        // Populate form
        setForm({
          name: vendorData.name || "",
          description: vendorData.description || "",
          address: vendorData.address || "",
          phone: vendorData.phone || "",
          email: vendorData.email || "",
          website: vendorData.website || "",
          whatsapp: vendorData.whatsapp || "",
          hours: vendorData.hours || "",
          categories: vendorData.categories || [],
          instagram: vendorData.instagram || "",
          facebook: vendorData.facebook || "",
          tiktok: vendorData.tiktok || "",
          twitter: vendorData.twitter || "",
          youtube: vendorData.youtube || "",
        });

        // Set cover type
        if (vendorData.cover_video_url) {
          setCoverType("video");
        }

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
     AUDIT LOG
  =============================== */
  async function logAudit(action: string) {
    const admin = auth.currentUser;
    if (!admin || !vendor) return;

    await addDoc(collection(db, "admin_audit_logs"), {
      action,
      vendorId: vendor.id,
      vendorName: vendor.name,
      adminUid: admin.uid,
      adminEmail: admin.email,
      timestamp: serverTimestamp(),
    });
  }

  /* ===============================
     SAVE VENDOR CHANGES
  =============================== */
  async function handleSave() {
    if (!vendorId || !vendor) return;
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
        whatsapp: form.whatsapp.trim(),
        hours: form.hours.trim(),
        categories: form.categories,
        instagram: form.instagram.trim(),
        facebook: form.facebook.trim(),
        tiktok: form.tiktok.trim(),
        twitter: form.twitter.trim(),
        youtube: form.youtube.trim(),
        updated_at: serverTimestamp(),
      };

      // Upload logo if changed
      if (logoFile) {
        const safeName = logoFile.name.replace(/\s+/g, "-");
        const path = `vendors/logos/${vendorId}/${Date.now()}-${safeName}`;
        updates.logoUrl = await uploadFile(logoFile, path);
      }

      // Upload cover if changed
      if (coverFile) {
        const safeName = coverFile.name.replace(/\s+/g, "-");
        const path = `vendors/covers/${vendorId}/${Date.now()}-${safeName}`;
        const url = await uploadFile(coverFile, path);
        
        if (coverType === "video") {
          updates.cover_video_url = url;
          updates.cover_image_url = "";
        } else {
          updates.cover_image_url = url;
          updates.cover_video_url = "";
        }
      }

      await updateDoc(doc(db, "vendors", vendorId), updates);
      await logAudit("vendor_updated");

      // Update local state
      setVendor((v) => (v ? { ...v, ...updates } : null));
      setLogoFile(null);
      setLogoPreview(null);
      setCoverFile(null);
      setCoverPreview(null);
      setEditMode(false);
      setMessage({ type: "success", text: "Vendor updated successfully!" });
    } catch (err: any) {
      console.error("Save error:", err);
      setMessage({ type: "error", text: err.message || "Failed to save changes" });
    } finally {
      setSaving(false);
    }
  }

  /* ===============================
     SUSPEND / REINSTATE
  =============================== */
  async function toggleSuspension() {
    if (!vendorId || !vendor) return;

    const nextStatus =
      vendor.status === "suspended" ? "approved" : "suspended";

    const confirmMsg =
      nextStatus === "suspended"
        ? "Suspend this vendor? They will be hidden everywhere and unable to log in."
        : "Reinstate this vendor and restore access?";

    if (!confirm(confirmMsg)) return;

    setWorking(true);
    try {
      await updateDoc(doc(db, "vendors", vendorId), {
        status: nextStatus,
        verified: nextStatus === "approved",
        updated_at: serverTimestamp(),
      });

      await logAudit(
        nextStatus === "suspended" ? "vendor_suspended" : "vendor_reinstated"
      );

      setVendor((v) =>
        v
          ? {
              ...v,
              status: nextStatus,
              verified: nextStatus === "approved",
            }
          : null
      );
    } catch (err) {
      console.error(err);
      alert("Failed to update vendor status.");
    } finally {
      setWorking(false);
    }
  }

  /* ===============================
     DELETE VENDOR
  =============================== */
  async function deleteVendor() {
    if (!vendorId || !vendor) return;

    const confirmText = prompt(
      `Type "${vendor.name}" to permanently delete this vendor and ALL their data:`
    );

    if (confirmText !== vendor.name) {
      alert("Name did not match. Delete cancelled.");
      return;
    }

    setWorking(true);
    try {
      await logAudit("vendor_deleted");

      // Delete subcollections
      const productsSnap = await getDocs(
        collection(db, "vendors", vendorId, "products")
      );
      const ordersSnap = await getDocs(
        collection(db, "vendors", vendorId, "orders")
      );
      const reviewsSnap = await getDocs(
        collection(db, "vendors", vendorId, "reviews")
      );

      await Promise.all([
        ...productsSnap.docs.map((d) => deleteDoc(d.ref)),
        ...ordersSnap.docs.map((d) => deleteDoc(d.ref)),
        ...reviewsSnap.docs.map((d) => deleteDoc(d.ref)),
      ]);

      // Delete vendor document
      await deleteDoc(doc(db, "vendors", vendorId));

      router.push("/admin/vendors");
    } catch (err) {
      console.error(err);
      alert("Failed to delete vendor.");
    } finally {
      setWorking(false);
    }
  }

  /* ===============================
     DELETE PRODUCT
  =============================== */
  async function deleteProduct(productId: string) {
    if (!vendorId) return;
    if (!confirm("Delete this product?")) return;

    setDeletingProductId(productId);
    try {
      await deleteDoc(doc(db, "vendors", vendorId, "products", productId));
      setProducts((prev) => prev.filter((p) => p.id !== productId));
      await logAudit(`product_deleted: ${productId}`);
    } catch (err) {
      console.error(err);
      alert("Failed to delete product.");
    } finally {
      setDeletingProductId(null);
    }
  }

  /* ===============================
     REMOVE COVER MEDIA
  =============================== */
  async function removeCover() {
    if (!vendorId || !confirm("Remove cover media?")) return;

    try {
      await updateDoc(doc(db, "vendors", vendorId), {
        cover_image_url: "",
        cover_video_url: "",
        updated_at: serverTimestamp(),
      });
      setVendor((v) => (v ? { ...v, cover_image_url: "", cover_video_url: "" } : null));
      setCoverPreview(null);
      setMessage({ type: "success", text: "Cover removed" });
    } catch (err) {
      console.error(err);
    }
  }

  /* ===============================
     UI STATES
  =============================== */
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

  // Determine current cover
  const currentCoverUrl = vendor.cover_video_url || vendor.cover_image_url;
  const isCurrentCoverVideo = !!vendor.cover_video_url;

  return (
    <div className="space-y-8 pb-24">
      {/* HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/vendors"
            className="inline-flex items-center text-sb-primary font-medium hover:underline"
          >
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Link>

          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Store className="h-6 w-6 lg:h-7 lg:w-7 text-sb-primary" />
            {vendor.name}
          </h1>

          <Badge variant={isSuspended ? "danger" : vendor.verified ? "success" : "warning"}>
            {isSuspended ? "Suspended" : vendor.verified ? "Approved" : "Pending"}
          </Badge>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {!editMode && (
            <Button onClick={() => setEditMode(true)} variant="secondary">
              <Pencil className="h-4 w-4 mr-1" />
              Edit Vendor
            </Button>
          )}

          <Button
            onClick={toggleSuspension}
            loading={working}
            variant={isSuspended ? "secondary" : "danger"}
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

          <Button onClick={deleteVendor} loading={working} variant="danger">
            <Trash2 className="h-4 w-4 mr-1" />
            Delete
          </Button>
        </div>
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

      {/* PUBLIC LINK */}
      {vendor.slug && (
        <Link
          href={`/store/${vendor.slug}`}
          className="text-sb-primary font-semibold underline text-sm inline-flex items-center gap-1"
          target="_blank"
        >
          View Public Storefront
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      )}

      {editMode ? (
        /* ===============================
           EDIT MODE
        =============================== */
        <div className="space-y-6">
          {/* COVER MEDIA - Only in Edit Mode */}
          <Card padding="lg">
            <h3 className="font-semibold text-lg mb-4">Cover Media</h3>
            <div className="space-y-4">
              <p className="text-sm text-gray-500">
                Upload an image or video for the store hero section.
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
                ) : currentCoverUrl ? (
                  isCurrentCoverVideo ? (
                    <video
                      src={currentCoverUrl}
                      autoPlay
                      muted
                      loop
                      playsInline
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Image src={currentCoverUrl} fill alt="Cover" className="object-cover" />
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
              
              {(currentCoverUrl || coverPreview) && (
                <button onClick={removeCover} className="text-red-600 text-sm font-medium">
                  Remove Cover
                </button>
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
                    src={logoPreview || vendor.logoUrl || "/placeholder.png"}
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
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Store Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-sb-primary focus:border-transparent"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-sb-primary focus:border-transparent resize-none"
                />
              </div>
            </div>
          </Card>

          {/* CATEGORIES */}
          <Card padding="lg">
            <h3 className="font-semibold text-lg mb-4">Categories</h3>
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

          {/* SAVE / CANCEL BUTTONS */}
          <div className="flex gap-3 justify-end sticky bottom-4">
            <Button variant="secondary" onClick={() => setEditMode(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} loading={saving}>
              <Save className="h-4 w-4 mr-1" />
              Save Changes
            </Button>
          </div>
        </div>
      ) : (
        /* ===============================
           VIEW MODE
        =============================== */
        <>
          {/* PROFILE + METRICS */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card padding="lg" className="lg:col-span-2">
              <div className="flex gap-6">
                {vendor.logoUrl && (
                  <Image
                    src={vendor.logoUrl}
                    alt={vendor.name}
                    width={96}
                    height={96}
                    className="rounded-xl bg-gray-100 flex-shrink-0"
                  />
                )}

                <div className="space-y-3 flex-1 min-w-0">
                  <p className="text-gray-700">{vendor.description || "No description provided."}</p>

                  <div className="flex flex-wrap gap-2">
                    {vendor.categories?.map((c) => (
                      <Badge key={c} size="sm">
                        {c}
                      </Badge>
                    ))}
                  </div>

                  {/* Contact Info - Clean icons, no emojis */}
                  <div className="text-sm text-gray-600 space-y-2 pt-2">
                    {vendor.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        <span className="truncate">{vendor.email}</span>
                      </div>
                    )}
                    {vendor.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        <span>{vendor.phone}</span>
                      </div>
                    )}
                    {vendor.whatsapp && (
                      <div className="flex items-center gap-2">
                        <MessageCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                        <span>WhatsApp: {vendor.whatsapp}</span>
                      </div>
                    )}
                    {vendor.address && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        <span>{vendor.address}</span>
                      </div>
                    )}
                    {vendor.website && (
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        <a href={vendor.website.startsWith("http") ? vendor.website : `https://${vendor.website}`} target="_blank" rel="noopener noreferrer" className="text-sb-primary hover:underline truncate">
                          {vendor.website}
                        </a>
                      </div>
                    )}
                    {vendor.hours && (
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        <span>{vendor.hours}</span>
                      </div>
                    )}
                  </div>

                  {/* Social Links */}
                  {(vendor.instagram || vendor.facebook || vendor.tiktok || vendor.twitter || vendor.youtube) && (
                    <div className="flex items-center gap-3 pt-3 border-t">
                      {vendor.instagram && (
                        <a href={vendor.instagram.startsWith("http") ? vendor.instagram : `https://instagram.com/${vendor.instagram.replace("@", "")}`} target="_blank" rel="noopener noreferrer" className="text-pink-600 hover:text-pink-700">
                          <Instagram className="h-5 w-5" />
                        </a>
                      )}
                      {vendor.facebook && (
                        <a href={vendor.facebook.startsWith("http") ? vendor.facebook : `https://facebook.com/${vendor.facebook}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700">
                          <Facebook className="h-5 w-5" />
                        </a>
                      )}
                      {vendor.tiktok && (
                        <a href={vendor.tiktok.startsWith("http") ? vendor.tiktok : `https://tiktok.com/@${vendor.tiktok.replace("@", "")}`} target="_blank" rel="noopener noreferrer" className="text-gray-900 hover:text-gray-700">
                          <TikTokIcon className="h-5 w-5" />
                        </a>
                      )}
                      {vendor.twitter && (
                        <a href={vendor.twitter.startsWith("http") ? vendor.twitter : `https://x.com/${vendor.twitter.replace("@", "")}`} target="_blank" rel="noopener noreferrer" className="text-gray-900 hover:text-gray-700">
                          <Twitter className="h-5 w-5" />
                        </a>
                      )}
                      {vendor.youtube && (
                        <a href={vendor.youtube.startsWith("http") ? vendor.youtube : `https://youtube.com/${vendor.youtube}`} target="_blank" rel="noopener noreferrer" className="text-red-600 hover:text-red-700">
                          <Youtube className="h-5 w-5" />
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </Card>

            {/* METRICS CARD */}
            <Card padding="lg">
              <h3 className="font-semibold text-lg mb-4">Performance</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500">Total Orders</p>
                  <p className="text-2xl font-bold">{vendor.total_orders ?? 0}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Revenue</p>
                  <p className="text-2xl font-bold">${(vendor.total_revenue ?? 0).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Rating</p>
                  <p className="text-2xl font-bold">{vendor.rating?.toFixed(1) || "0.0"}</p>
                </div>
                {vendor.stackbot_pin && (
                  <div>
                    <p className="text-sm text-gray-500">Vendor PIN</p>
                    <p className="text-lg font-mono font-bold">{vendor.stackbot_pin}</p>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* PRODUCTS */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Products ({products.length})</h2>
              <Link
                href={`/admin/vendors/${vendorId}/products/new`}
                className="text-sb-primary font-semibold text-sm hover:underline"
              >
                + Add Product
              </Link>
            </div>

            {products.length === 0 ? (
              <Card padding="lg">
                <div className="text-center py-8">
                  <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No products yet.</p>
                </div>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {products.map((p) => (
                  <Card key={p.id} padding="md" hover>
                    <div className="flex gap-4">
                      <div className="w-20 h-20 relative rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                        {p.images?.[0] ? (
                          <Image
                            src={p.images[0]}
                            alt={p.name}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="h-8 w-8 text-gray-300" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate">{p.name}</h3>
                        <p className="text-sb-primary font-bold">{formatPrice(p.price || 0)}</p>

                        {p.active !== undefined && (
                          <Badge variant={p.active ? "success" : "danger"} size="sm" className="mt-1">
                            {p.active ? "Active" : "Inactive"}
                          </Badge>
                        )}

                        <div className="flex gap-3 pt-2">
                          <Link
                            href={`/admin/vendors/${vendorId}/products/${p.id}/edit`}
                            className="text-sm text-sb-primary underline"
                          >
                            <Pencil className="h-4 w-4 inline mr-1" />
                            Edit
                          </Link>

                          <button
                            disabled={deletingProductId === p.id}
                            onClick={() => deleteProduct(p.id)}
                            className="text-sm text-red-600 underline disabled:opacity-50"
                          >
                            <Trash2 className="h-4 w-4 inline mr-1" />
                            {deletingProductId === p.id ? "..." : "Delete"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
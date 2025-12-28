// src/app/vendor/settings/page.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
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
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Video,
  Image as ImageIcon,
  MessageCircle,
  Instagram,
  Facebook,
  Youtube,
  Twitter,
  Trash2,
  Loader2,
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

// Video compression settings
const MAX_VIDEO_SIZE_MB = 8;
const MAX_VIDEO_WIDTH = 1280;
const MAX_VIDEO_HEIGHT = 720;

interface BankInfo {
  bank_name: string;
  account_holder: string;
  account_last4: string;
  routing_number: string;
  account_type: "checking" | "savings";
}

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
    </svg>
  );
}

export default function VendorSettings() {
  const [user, setUser] = useState<any>(null);
  const [vendor, setVendor] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [showBankEdit, setShowBankEdit] = useState(false);

  // Video compression state
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionProgress, setCompressionProgress] = useState(0);
  const [compressionStatus, setCompressionStatus] = useState("");

  // Form state
  const [form, setForm] = useState({
    name: "",
    description: "",
    address: "",
    phone: "",
    email: "",
    website: "",
    whatsapp: "",
    categories: [] as string[],
    hours: "",
    delivery_fee: "",
    min_order: "",
    instagram: "",
    facebook: "",
    tiktok: "",
    twitter: "",
    youtube: "",
  });

  const [bankInfo, setBankInfo] = useState<BankInfo>({
    bank_name: "",
    account_holder: "",
    account_last4: "",
    routing_number: "",
    account_type: "checking",
  });

  const [newAccountNumber, setNewAccountNumber] = useState("");

  const [location, setLocation] = useState({
    lat: "",
    lng: "",
    location_address: "",
  });

  // Media uploads
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [coverType, setCoverType] = useState<"image" | "video">("image");

  // Load vendor data
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
          whatsapp: data.whatsapp || "",
          categories: data.categories || [],
          hours: data.hours || "",
          delivery_fee: data.delivery_fee?.toString() || "",
          min_order: data.min_order?.toString() || "",
          instagram: data.instagram || "",
          facebook: data.facebook || "",
          tiktok: data.tiktok || "",
          twitter: data.twitter || "",
          youtube: data.youtube || "",
        });

        if (data.cover_video_url) setCoverType("video");

        if (data.bank_info) {
          setBankInfo({
            bank_name: data.bank_info.bank_name || "",
            account_holder: data.bank_info.account_holder || "",
            account_last4: data.bank_info.account_last4 || "",
            routing_number: data.bank_info.routing_number || "",
            account_type: data.bank_info.account_type || "checking",
          });
        }

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

  // Video compression function
  const compressVideo = useCallback(async (file: File): Promise<File> => {
    const fileSizeMB = file.size / (1024 * 1024);

    if (fileSizeMB <= MAX_VIDEO_SIZE_MB) {
      setCompressionStatus(`Video ready (${fileSizeMB.toFixed(1)}MB)`);
      return file;
    }

    setIsCompressing(true);
    setCompressionProgress(0);
    setCompressionStatus("Loading video...");

    return new Promise((resolve, reject) => {
      const video = document.createElement("video");
      video.muted = true;
      video.playsInline = true;
      video.preload = "auto";

      const videoUrl = URL.createObjectURL(file);
      video.src = videoUrl;

      video.onloadedmetadata = async () => {
        try {
          const duration = video.duration;
          let width = video.videoWidth;
          let height = video.videoHeight;

          // Scale down if needed
          const scale = Math.min(MAX_VIDEO_WIDTH / width, MAX_VIDEO_HEIGHT / height, 1);
          width = Math.round(width * scale);
          height = Math.round(height * scale);

          setCompressionProgress(10);
          setCompressionStatus(`Compressing ${width}x${height}...`);

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d")!;

          // Target bitrate
          const targetBps = Math.floor((MAX_VIDEO_SIZE_MB * 8 * 1024 * 1024) / duration * 0.7);

          const stream = canvas.captureStream(24);

          // Find supported codec
          let mimeType = "video/webm;codecs=vp9";
          if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = "video/webm;codecs=vp8";
          }
          if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = "video/webm";
          }

          const recorder = new MediaRecorder(stream, {
            mimeType,
            videoBitsPerSecond: Math.min(targetBps, 2000000),
          });

          const chunks: Blob[] = [];
          recorder.ondataavailable = (e) => {
            if (e.data.size > 0) chunks.push(e.data);
          };

          recorder.onstop = () => {
            URL.revokeObjectURL(videoUrl);
            const blob = new Blob(chunks, { type: "video/webm" });
            const compressed = new File([blob], file.name.replace(/\.[^.]+$/, ".webm"), { type: "video/webm" });
            const newSize = compressed.size / (1024 * 1024);
            
            setCompressionProgress(100);
            setCompressionStatus(`Done! ${fileSizeMB.toFixed(1)}MB → ${newSize.toFixed(1)}MB`);
            setIsCompressing(false);
            resolve(compressed);
          };

          recorder.onerror = () => {
            URL.revokeObjectURL(videoUrl);
            setIsCompressing(false);
            reject(new Error("Compression failed"));
          };

          recorder.start(100);
          video.currentTime = 0;
          await video.play();

          const startTime = Date.now();
          const maxMs = duration * 1000;

          const render = () => {
            if (video.paused || video.ended) {
              recorder.stop();
              return;
            }

            ctx.drawImage(video, 0, 0, width, height);

            const elapsed = Date.now() - startTime;
            const progress = Math.min(95, 10 + (elapsed / maxMs) * 85);
            setCompressionProgress(Math.round(progress));
            setCompressionStatus(`Compressing... ${Math.round(video.currentTime)}s / ${Math.round(duration)}s`);

            requestAnimationFrame(render);
          };

          render();

          video.onended = () => {
            if (recorder.state === "recording") recorder.stop();
          };

        } catch (err: any) {
          URL.revokeObjectURL(videoUrl);
          setIsCompressing(false);
          reject(err);
        }
      };

      video.onerror = () => {
        URL.revokeObjectURL(videoUrl);
        setIsCompressing(false);
        reject(new Error("Failed to load video"));
      };
    });
  }, []);

  const selectLogo = (file: File) => {
    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = () => setLogoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const selectCoverImage = (file: File) => {
    setCoverFile(file);
    setCoverType("image");
    const reader = new FileReader();
    reader.onload = () => setCoverPreview(reader.result as string);
    reader.readAsDataURL(file);
    setCompressionStatus("");
  };

  const selectCoverVideo = async (file: File) => {
    setCoverType("video");
    setCoverPreview(URL.createObjectURL(file));

    try {
      const compressed = await compressVideo(file);
      setCoverFile(compressed);
      // Update preview with compressed version
      if (coverPreview) URL.revokeObjectURL(coverPreview);
      setCoverPreview(URL.createObjectURL(compressed));
    } catch (err) {
      console.error("Compression failed:", err);
      setCoverFile(file); // Use original if compression fails
      setMessage({ type: "error", text: "Compression failed, using original video" });
    }
  };

  const uploadFile = async (file: File, path: string): Promise<string> => {
    const storage = getStorage();
    const fileRef = ref(storage, path);
    await uploadBytes(fileRef, file);
    return getDownloadURL(fileRef);
  };

  const toggleCategory = (cat: string) => {
    setForm((f) => ({
      ...f,
      categories: f.categories.includes(cat)
        ? f.categories.filter((c) => c !== cat)
        : [...f.categories, cat],
    }));
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setMessage({ type: "error", text: "Geolocation not supported" });
      return;
    }

    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation((prev) => ({
          ...prev,
          lat: position.coords.latitude.toFixed(6),
          lng: position.coords.longitude.toFixed(6),
        }));
        setGettingLocation(false);
        setMessage({ type: "success", text: "Location updated!" });
      },
      (err) => {
        setMessage({ type: "error", text: "Could not get location" });
        setGettingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

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
        whatsapp: form.whatsapp.trim(),
        categories: form.categories,
        hours: form.hours.trim(),
        delivery_fee: form.delivery_fee ? parseFloat(form.delivery_fee) : 0,
        min_order: form.min_order ? parseFloat(form.min_order) : 0,
        instagram: form.instagram.trim(),
        facebook: form.facebook.trim(),
        tiktok: form.tiktok.trim(),
        twitter: form.twitter.trim(),
        youtube: form.youtube.trim(),
        updated_at: serverTimestamp(),
      };

      // Upload logo
      if (logoFile) {
        const path = `vendors/logos/${user.uid}/${Date.now()}-${logoFile.name.replace(/\s+/g, "-")}`;
        updates.logoUrl = await uploadFile(logoFile, path);
      }

      // Upload cover
      if (coverFile) {
        const path = `vendors/covers/${user.uid}/${Date.now()}-${coverFile.name.replace(/\s+/g, "-")}`;
        const url = await uploadFile(coverFile, path);
        
        if (coverType === "video") {
          updates.cover_video_url = url;
          updates.cover_image_url = "";
        } else {
          updates.cover_image_url = url;
          updates.cover_video_url = "";
        }
      }

      // Location
      if (location.lat && location.lng) {
        updates.location = {
          lat: parseFloat(location.lat),
          lng: parseFloat(location.lng),
          location_address: location.location_address.trim() || form.address.trim(),
        };
      }

      // Bank info
      if (showBankEdit && bankInfo.bank_name) {
        updates.bank_info = {
          bank_name: bankInfo.bank_name.trim(),
          account_holder: bankInfo.account_holder.trim(),
          account_last4: newAccountNumber ? newAccountNumber.slice(-4) : bankInfo.account_last4,
          routing_number: bankInfo.routing_number.trim(),
          account_type: bankInfo.account_type,
        };
      }

      await updateDoc(doc(db, "vendors", user.uid), updates);

      setVendor((v: any) => ({ ...v, ...updates }));
      setLogoFile(null);
      setLogoPreview(null);
      setCoverFile(null);
      setCoverPreview(null);
      setNewAccountNumber("");
      setShowBankEdit(false);
      setCompressionStatus("");

      setMessage({ type: "success", text: "Settings saved!" });
    } catch (err: any) {
      console.error("Save error:", err);
      setMessage({ type: "error", text: err.message || "Failed to save" });
    }

    setSaving(false);
  };

  const removeLogo = async () => {
    if (!confirm("Remove logo?")) return;
    await updateDoc(doc(db, "vendors", user.uid), { logoUrl: "", updated_at: serverTimestamp() });
    setVendor((v: any) => ({ ...v, logoUrl: "" }));
    setMessage({ type: "success", text: "Logo removed" });
  };

  const removeCover = async () => {
    if (!confirm("Remove cover?")) return;
    await updateDoc(doc(db, "vendors", user.uid), {
      cover_image_url: "",
      cover_video_url: "",
      updated_at: serverTimestamp(),
    });
    setVendor((v: any) => ({ ...v, cover_image_url: "", cover_video_url: "" }));
    setCoverPreview(null);
    setCoverFile(null);
    setCompressionStatus("");
    setMessage({ type: "success", text: "Cover removed" });
  };

  if (loading) return <LoadingSpinner text="Loading settings..." />;

  const currentCoverUrl = vendor?.cover_video_url || vendor?.cover_image_url;
  const isCurrentCoverVideo = !!vendor?.cover_video_url;

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

      {/* Messages */}
      {message && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between ${
            message.type === "success"
              ? "bg-green-50 text-green-800 border border-green-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          <span className="flex items-center gap-2">
            {message.type === "success" ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            {message.text}
          </span>
          <button onClick={() => setMessage(null)}><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* COVER MEDIA */}
      <Card title="Cover Media">
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Upload an image or video. Videos over 8MB are auto-compressed.
          </p>

          {/* Compression Progress */}
          {isCompressing && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-blue-800">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="font-medium">{compressionStatus}</span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2.5">
                <div
                  className="bg-blue-600 h-2.5 rounded-full transition-all"
                  style={{ width: `${compressionProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Compression Complete */}
          {!isCompressing && compressionStatus && (
            <div className="flex items-center gap-2 text-green-700 bg-green-50 px-3 py-2 rounded-lg text-sm">
              <CheckCircle2 className="h-4 w-4" />
              {compressionStatus}
            </div>
          )}

          {/* Preview */}
          <div className="relative h-40 sm:h-48 rounded-xl overflow-hidden bg-gray-100">
            {coverPreview ? (
              coverType === "video" ? (
                <video
                  key={coverPreview}
                  src={coverPreview}
                  autoPlay
                  muted
                  loop
                  playsInline
                  className="w-full h-full object-cover"
                />
              ) : (
                <Image src={coverPreview} fill alt="Cover" className="object-cover" />
              )
            ) : currentCoverUrl ? (
              isCurrentCoverVideo ? (
                <video
                  key={currentCoverUrl}
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

            {/* Upload buttons */}
            {!isCompressing && (
              <div className="absolute bottom-3 right-3 flex gap-2">
                <label className="cursor-pointer bg-white/90 backdrop-blur px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 shadow-lg hover:bg-white transition">
                  <ImageIcon className="h-4 w-4" />
                  Image
                  <input
                    type="file"
                    hidden
                    accept="image/*"
                    onChange={(e) => e.target.files?.[0] && selectCoverImage(e.target.files[0])}
                  />
                </label>
                <label className="cursor-pointer bg-white/90 backdrop-blur px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 shadow-lg hover:bg-white transition">
                  <Video className="h-4 w-4" />
                  Video
                  <input
                    type="file"
                    hidden
                    accept="video/mp4,video/webm,video/mov,video/quicktime"
                    onChange={(e) => e.target.files?.[0] && selectCoverVideo(e.target.files[0])}
                  />
                </label>
              </div>
            )}
          </div>

          {/* Type indicator */}
          {(currentCoverUrl || coverPreview) && !isCompressing && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500 flex items-center gap-2">
                {(coverPreview ? coverType === "video" : isCurrentCoverVideo) ? (
                  <><Video className="h-4 w-4" /> Video</>
                ) : (
                  <><ImageIcon className="h-4 w-4" /> Image</>
                )}
              </span>
              <button onClick={removeCover} className="text-red-600 text-sm font-medium flex items-center gap-1">
                <Trash2 className="h-3.5 w-3.5" /> Remove
              </button>
            </div>
          )}
        </div>
      </Card>

      {/* LOGO & STORE NAME */}
      <Card title="Store Identity">
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Image
                src={logoPreview || vendor?.logoUrl || "/placeholder.png"}
                width={80}
                height={80}
                alt="Logo"
                className="rounded-xl border object-cover"
              />
              <label className="absolute -bottom-2 -right-2 cursor-pointer bg-sb-primary text-white p-2 rounded-full shadow-lg">
                <Camera className="h-4 w-4" />
                <input type="file" hidden accept="image/*" onChange={(e) => e.target.files?.[0] && selectLogo(e.target.files[0])} />
              </label>
            </div>
            <div>
              <p className="text-sm text-gray-500">Store Logo</p>
              {vendor?.logoUrl && (
                <button onClick={removeLogo} className="text-red-600 text-sm font-medium">Remove</button>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Store className="inline h-4 w-4 mr-1" /> Store Name *
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-sb-primary focus:border-transparent"
            />
          </div>

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
      <Card title="Categories">
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

      {/* CONTACT */}
      <Card title="Contact Information">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <MapPin className="inline h-4 w-4 mr-1" /> Address
            </label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="w-full px-4 py-3 border rounded-xl"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Phone className="inline h-4 w-4 mr-1" /> Phone
              </label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full px-4 py-3 border rounded-xl"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <MessageCircle className="inline h-4 w-4 mr-1 text-green-600" /> WhatsApp
              </label>
              <input
                type="tel"
                value={form.whatsapp}
                onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                className="w-full px-4 py-3 border rounded-xl"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Mail className="inline h-4 w-4 mr-1" /> Email
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-4 py-3 border rounded-xl"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Globe className="inline h-4 w-4 mr-1" /> Website
            </label>
            <input
              type="url"
              value={form.website}
              onChange={(e) => setForm({ ...form, website: e.target.value })}
              className="w-full px-4 py-3 border rounded-xl"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Clock className="inline h-4 w-4 mr-1" /> Store Hours
            </label>
            <input
              type="text"
              value={form.hours}
              onChange={(e) => setForm({ ...form, hours: e.target.value })}
              className="w-full px-4 py-3 border rounded-xl"
              placeholder="Mon-Fri 9AM-6PM"
            />
          </div>
        </div>
      </Card>

      {/* SOCIAL MEDIA */}
      <Card title="Social Media">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
              <Instagram className="h-4 w-4 text-pink-600" /> Instagram
            </label>
            <input
              type="text"
              value={form.instagram}
              onChange={(e) => setForm({ ...form, instagram: e.target.value })}
              className="w-full px-4 py-3 border rounded-xl"
              placeholder="@username"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
              <Facebook className="h-4 w-4 text-blue-600" /> Facebook
            </label>
            <input
              type="text"
              value={form.facebook}
              onChange={(e) => setForm({ ...form, facebook: e.target.value })}
              className="w-full px-4 py-3 border rounded-xl"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
              <TikTokIcon className="h-4 w-4" /> TikTok
            </label>
            <input
              type="text"
              value={form.tiktok}
              onChange={(e) => setForm({ ...form, tiktok: e.target.value })}
              className="w-full px-4 py-3 border rounded-xl"
              placeholder="@username"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                <Twitter className="h-4 w-4" /> X
              </label>
              <input
                type="text"
                value={form.twitter}
                onChange={(e) => setForm({ ...form, twitter: e.target.value })}
                className="w-full px-4 py-3 border rounded-xl"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                <Youtube className="h-4 w-4 text-red-600" /> YouTube
              </label>
              <input
                type="text"
                value={form.youtube}
                onChange={(e) => setForm({ ...form, youtube: e.target.value })}
                className="w-full px-4 py-3 border rounded-xl"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* DELIVERY */}
      <Card title="Delivery Settings">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Fee (RD$)</label>
            <input
              type="number"
              value={form.delivery_fee}
              onChange={(e) => setForm({ ...form, delivery_fee: e.target.value })}
              className="w-full px-4 py-3 border rounded-xl"
              min="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Min Order (RD$)</label>
            <input
              type="number"
              value={form.min_order}
              onChange={(e) => setForm({ ...form, min_order: e.target.value })}
              className="w-full px-4 py-3 border rounded-xl"
              min="0"
            />
          </div>
        </div>
      </Card>

      {/* LOCATION */}
      <Card title="Store Location">
        <div className="space-y-4">
          <button
            onClick={getCurrentLocation}
            disabled={gettingLocation}
            className="flex items-center gap-2 px-4 py-2.5 bg-sb-primary text-white rounded-xl font-medium text-sm disabled:opacity-50"
          >
            <Locate className={`h-4 w-4 ${gettingLocation ? "animate-spin" : ""}`} />
            {gettingLocation ? "Getting..." : "Use Current Location"}
          </button>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Latitude</label>
              <input
                type="text"
                value={location.lat}
                onChange={(e) => setLocation({ ...location, lat: e.target.value })}
                className="w-full px-4 py-3 border rounded-xl"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Longitude</label>
              <input
                type="text"
                value={location.lng}
                onChange={(e) => setLocation({ ...location, lng: e.target.value })}
                className="w-full px-4 py-3 border rounded-xl"
              />
            </div>
          </div>

          {location.lat && location.lng && (
            <a
              href={`https://www.google.com/maps?q=${location.lat},${location.lng}`}
              target="_blank"
              className="inline-flex items-center gap-2 text-sm text-sb-primary hover:underline"
            >
              <ExternalLink className="h-4 w-4" /> View on Map
            </a>
          )}
        </div>
      </Card>

      {/* BANK INFO */}
      <Card title="Bank / Payout">
        <div className="space-y-4">
          {bankInfo.bank_name && !showBankEdit ? (
            <div className="bg-gray-50 rounded-xl p-4 space-y-2">
              <div className="flex justify-between"><span className="text-gray-500">Bank</span><span className="font-medium">{bankInfo.bank_name}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Account</span><span className="font-medium">•••• {bankInfo.account_last4}</span></div>
              <button onClick={() => setShowBankEdit(true)} className="text-sb-primary text-sm font-medium">Edit</button>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={bankInfo.bank_name}
                    onChange={(e) => setBankInfo({ ...bankInfo, bank_name: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 border rounded-xl"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Account Holder</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={bankInfo.account_holder}
                    onChange={(e) => setBankInfo({ ...bankInfo, account_holder: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 border rounded-xl"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Account #</label>
                  <div className="relative">
                    <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="password"
                      value={newAccountNumber}
                      onChange={(e) => setNewAccountNumber(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border rounded-xl"
                      placeholder={bankInfo.account_last4 ? `•••• ${bankInfo.account_last4}` : ""}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Routing #</label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      value={bankInfo.routing_number}
                      onChange={(e) => setBankInfo({ ...bankInfo, routing_number: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 border rounded-xl"
                    />
                  </div>
                </div>
              </div>
              <div className="flex gap-4">
                {(["checking", "savings"] as const).map((type) => (
                  <label key={type} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={bankInfo.account_type === type}
                      onChange={() => setBankInfo({ ...bankInfo, account_type: type })}
                      className="w-4 h-4 text-sb-primary"
                    />
                    <span className="capitalize">{type}</span>
                  </label>
                ))}
              </div>
            </>
          )}
        </div>
      </Card>

      {/* SAVE */}
      <div className="sticky bottom-4 flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving || isCompressing}
          className="flex items-center gap-2 px-6 py-3 bg-sb-primary text-white rounded-xl font-semibold shadow-lg hover:bg-sb-primary/90 disabled:opacity-50"
        >
          {saving ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</>
          ) : (
            <><Save className="h-4 w-4" /> Save Settings</>
          )}
        </button>
      </div>
    </div>
  );
}
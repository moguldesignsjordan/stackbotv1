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
import { useLanguage } from "@/contexts/LanguageContext";
import { TranslationKey } from "@/lib/translations";
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
import StoreHoursEditor from "@/components/vendor/StoreHoursEditor";
import type { StoreHours } from "@/lib/utils/store-hours";

// Category keys mapping for translations
const CATEGORY_KEYS: { key: TranslationKey; value: string }[] = [
  { key: 'vendor.settings.categories.restaurants' as TranslationKey, value: "Restaurants" },
  { key: 'vendor.settings.categories.groceries' as TranslationKey, value: "Groceries" },
  { key: 'vendor.settings.categories.beauty' as TranslationKey, value: "Beauty & Wellness" },
  { key: 'vendor.settings.categories.taxi' as TranslationKey, value: "Taxi & Transport" },
  { key: 'vendor.settings.categories.tours' as TranslationKey, value: "Tours & Activities" },
  { key: 'vendor.settings.categories.professional' as TranslationKey, value: "Professional Services" },
  { key: 'vendor.settings.categories.homeRepair' as TranslationKey, value: "Home Repair & Maintenance" },
  { key: 'vendor.settings.categories.electronics' as TranslationKey, value: "Electronics & Gadgets" },
  { key: 'vendor.settings.categories.cleaning' as TranslationKey, value: "Cleaning Services" },
  { key: 'vendor.settings.categories.retail' as TranslationKey, value: "Retail Shops" },
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
  const { t, language } = useLanguage();
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
    store_hours: null as StoreHours | null,
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
          store_hours: data.store_hours || null,
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

          // Make dimensions even (required for most codecs)
          width = width % 2 === 0 ? width : width - 1;
          height = height % 2 === 0 ? height : height - 1;

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d")!;

          // Try to use MediaRecorder for compression
          const stream = canvas.captureStream(30);

          // Add audio if present
          try {
            const audioCtx = new AudioContext();
            const source = audioCtx.createMediaElementSource(video);
            const dest = audioCtx.createMediaStreamDestination();
            source.connect(dest);
            source.connect(audioCtx.destination);
            dest.stream.getAudioTracks().forEach((track) => stream.addTrack(track));
          } catch (e) {
            console.log("No audio track or audio context failed");
          }

          const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
            ? "video/webm;codecs=vp9"
            : "video/webm";

          const targetBitrate = Math.floor((MAX_VIDEO_SIZE_MB * 8 * 1024 * 1024) / duration * 0.8);

          const recorder = new MediaRecorder(stream, {
            mimeType,
            videoBitsPerSecond: Math.min(targetBitrate, 2500000),
          });

          const chunks: Blob[] = [];
          recorder.ondataavailable = (e) => chunks.push(e.data);

          recorder.onstop = () => {
            URL.revokeObjectURL(videoUrl);
            const blob = new Blob(chunks, { type: mimeType });
            const compressedFile = new File(
              [blob],
              file.name.replace(/\.[^.]+$/, ".webm"),
              { type: mimeType }
            );

            const finalSizeMB = compressedFile.size / (1024 * 1024);
            setCompressionStatus(`Compressed: ${fileSizeMB.toFixed(1)}MB → ${finalSizeMB.toFixed(1)}MB`);
            setIsCompressing(false);
            resolve(compressedFile);
          };

          recorder.onerror = (e) => {
            URL.revokeObjectURL(videoUrl);
            setIsCompressing(false);
            reject(e);
          };

          recorder.start();
          video.currentTime = 0;

          setCompressionStatus("Compressing...");

          video.onended = () => recorder.stop();

          video.ontimeupdate = () => {
            const progress = (video.currentTime / duration) * 100;
            setCompressionProgress(Math.min(progress, 99));
          };

          await video.play();
        } catch (err) {
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

  const handleCoverSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isVideo = file.type.startsWith("video/");
    setCoverType(isVideo ? "video" : "image");

    if (isVideo) {
      try {
        const compressed = await compressVideo(file);
        setCoverFile(compressed);
        setCoverPreview(URL.createObjectURL(compressed));
      } catch (err) {
        console.error("Video compression error:", err);
        setMessage({ type: "error", text: "Failed to process video" });
      }
    } else {
      setCoverFile(file);
      setCoverPreview(URL.createObjectURL(file));
    }
  };

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setMessage({ type: "error", text: "Geolocation not supported" });
      return;
    }

    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude.toString();
        const lng = pos.coords.longitude.toString();

        // Reverse geocode
        try {
          const res = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
          );
          const data = await res.json();
          const address = data.results?.[0]?.formatted_address || "";
          setLocation({ lat, lng, location_address: address });
        } catch {
          setLocation({ lat, lng, location_address: "" });
        }
        setGettingLocation(false);
      },
      () => {
        setMessage({ type: "error", text: "Failed to get location" });
        setGettingLocation(false);
      }
    );
  };

  const uploadFile = async (file: File, path: string): Promise<string> => {
    const storage = getStorage();
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file);
    return getDownloadURL(storageRef);
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
        store_hours: form.store_hours || null,
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

      setMessage({ type: "success", text: t('vendor.settings.saved' as TranslationKey) });
    } catch (err: any) {
      console.error("Save error:", err);
      setMessage({ type: "error", text: err.message || t('vendor.settings.error' as TranslationKey) });
    }

    setSaving(false);
  };

  const removeLogo = async () => {
    if (!confirm(t('vendor.settings.removeLogo' as TranslationKey))) return;
    await updateDoc(doc(db, "vendors", user.uid), { logoUrl: "", updated_at: serverTimestamp() });
    setVendor((v: any) => ({ ...v, logoUrl: "" }));
    setMessage({ type: "success", text: t('vendor.settings.logoRemoved' as TranslationKey) });
  };

  const removeCover = async () => {
    if (!confirm(t('vendor.settings.removeCover' as TranslationKey))) return;
    await updateDoc(doc(db, "vendors", user.uid), {
      cover_image_url: "",
      cover_video_url: "",
      updated_at: serverTimestamp(),
    });
    setVendor((v: any) => ({ ...v, cover_image_url: "", cover_video_url: "" }));
    setCoverPreview(null);
    setCoverFile(null);
    setCompressionStatus("");
    setMessage({ type: "success", text: t('vendor.settings.coverRemoved' as TranslationKey) });
  };

  const toggleCategory = (categoryValue: string) => {
    setForm((prev) => ({
      ...prev,
      categories: prev.categories.includes(categoryValue)
        ? prev.categories.filter((c) => c !== categoryValue)
        : [...prev.categories, categoryValue],
    }));
  };

  if (loading) return <LoadingSpinner text={t('common.loading' as TranslationKey)} />;

  const currentCoverUrl = vendor?.cover_video_url || vendor?.cover_image_url;
  const isCurrentCoverVideo = !!vendor?.cover_video_url;

  return (
    <div className="space-y-6 max-w-3xl pb-24">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl sm:text-3xl font-bold">{t('vendor.settings.title' as TranslationKey)}</h1>
        {vendor?.slug && (
          <Link
            href={`/store/${vendor.slug}`}
            target="_blank"
            className="flex items-center gap-1 text-sb-primary font-semibold text-sm hover:underline"
          >
            {t('vendor.settings.viewStorefront' as TranslationKey)}
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
      <Card title={t('vendor.settings.coverMedia' as TranslationKey)}>
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            {t('vendor.settings.coverMediaDesc' as TranslationKey)}
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
                <label className="flex items-center gap-1.5 px-3 py-2 bg-white/90 hover:bg-white rounded-lg cursor-pointer text-sm font-medium shadow-sm">
                  <ImageIcon className="h-4 w-4" />
                  {t('vendor.settings.uploadImage' as TranslationKey)}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleCoverSelect}
                    className="hidden"
                  />
                </label>
                <label className="flex items-center gap-1.5 px-3 py-2 bg-white/90 hover:bg-white rounded-lg cursor-pointer text-sm font-medium shadow-sm">
                  <Video className="h-4 w-4" />
                  {t('vendor.settings.uploadVideo' as TranslationKey)}
                  <input
                    type="file"
                    accept="video/*"
                    onChange={handleCoverSelect}
                    className="hidden"
                  />
                </label>
                {(currentCoverUrl || coverPreview) && (
                  <button
                    onClick={removeCover}
                    className="flex items-center gap-1.5 px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium shadow-sm"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* LOGO */}
      <Card title={t('vendor.settings.logo' as TranslationKey)}>
        <div className="flex items-center gap-6">
          <div className="relative w-24 h-24 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
            {logoPreview || vendor?.logoUrl ? (
              <Image
                src={logoPreview || vendor?.logoUrl}
                fill
                alt="Logo"
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <Store className="w-8 h-8" />
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 px-4 py-2 bg-sb-primary text-white rounded-xl cursor-pointer font-medium text-sm hover:bg-sb-primary/90">
              <Camera className="h-4 w-4" />
              {t('vendor.settings.uploadLogo' as TranslationKey)}
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoSelect}
                className="hidden"
              />
            </label>
            {vendor?.logoUrl && (
              <button
                onClick={removeLogo}
                className="text-sm text-red-500 hover:underline"
              >
                <Trash2 className="h-3 w-3 inline mr-1" />
                {t('vendor.settings.edit' as TranslationKey)}
              </button>
            )}
          </div>
        </div>
      </Card>

      {/* BASIC INFO */}
      <Card title={t('vendor.settings.storeInfo' as TranslationKey)}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('vendor.settings.storeName' as TranslationKey)}
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-4 py-3 border rounded-xl"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('vendor.settings.description' as TranslationKey)}
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-3 border rounded-xl resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('vendor.settings.categories' as TranslationKey)}
            </label>
            <p className="text-xs text-gray-500 mb-3">
              {t('vendor.settings.selectCategories' as TranslationKey)}
            </p>
            <div className="flex flex-wrap gap-2">
              {CATEGORY_KEYS.map(({ key, value }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => toggleCategory(value)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                    form.categories.includes(value)
                      ? "bg-sb-primary text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {t(key)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* CONTACT */}
      <Card title={t('vendor.settings.contactInfo' as TranslationKey)}>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                <Phone className="h-4 w-4 text-gray-400" /> {t('vendor.settings.phone' as TranslationKey)}
              </label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full px-4 py-3 border rounded-xl"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                <Mail className="h-4 w-4 text-gray-400" /> {t('vendor.settings.email' as TranslationKey)}
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-4 py-3 border rounded-xl"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                <Globe className="h-4 w-4 text-gray-400" /> {t('vendor.settings.website' as TranslationKey)}
              </label>
              <input
                type="url"
                value={form.website}
                onChange={(e) => setForm({ ...form, website: e.target.value })}
                className="w-full px-4 py-3 border rounded-xl"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-green-500" /> {t('vendor.settings.whatsapp' as TranslationKey)}
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
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
              <MapPin className="h-4 w-4 text-gray-400" /> {t('vendor.settings.address' as TranslationKey)}
            </label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="w-full px-4 py-3 border rounded-xl"
            />
          </div>
          <div>
            <StoreHoursEditor
              value={form.store_hours}
              onChange={(hours) => setForm({ ...form, store_hours: hours })}
              language={language}
            />
          </div>
        </div>
      </Card>

      {/* SOCIAL MEDIA */}
      <Card title={t('vendor.settings.socialMedia' as TranslationKey)}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
              <Instagram className="h-4 w-4 text-pink-500" /> Instagram
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
      <Card title={t('vendor.settings.deliverySettings' as TranslationKey)}>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('vendor.settings.deliveryFee' as TranslationKey)} (RD$)
            </label>
            <input
              type="number"
              value={form.delivery_fee}
              onChange={(e) => setForm({ ...form, delivery_fee: e.target.value })}
              className="w-full px-4 py-3 border rounded-xl"
              min="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('vendor.settings.minOrder' as TranslationKey)} (RD$)
            </label>
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
      <Card title={t('vendor.settings.storeLocation' as TranslationKey)}>
        <div className="space-y-4">
          <button
            onClick={getCurrentLocation}
            disabled={gettingLocation}
            className="flex items-center gap-2 px-4 py-2.5 bg-sb-primary text-white rounded-xl font-medium text-sm disabled:opacity-50"
          >
            <Locate className={`h-4 w-4 ${gettingLocation ? "animate-spin" : ""}`} />
            {gettingLocation 
              ? t('vendor.settings.getting' as TranslationKey) 
              : t('vendor.settings.useCurrentLocation' as TranslationKey)
            }
          </button>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('vendor.settings.latitude' as TranslationKey)}
              </label>
              <input
                type="text"
                value={location.lat}
                onChange={(e) => setLocation({ ...location, lat: e.target.value })}
                className="w-full px-4 py-3 border rounded-xl"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('vendor.settings.longitude' as TranslationKey)}
              </label>
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
              <ExternalLink className="h-4 w-4" /> {t('vendor.settings.viewOnMap' as TranslationKey)}
            </a>
          )}
        </div>
      </Card>

      {/* BANK INFO */}
      <Card title={t('vendor.settings.bankPayout' as TranslationKey)}>
        <div className="space-y-4">
          {bankInfo.bank_name && !showBankEdit ? (
            <div className="bg-gray-50 rounded-xl p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-500">{t('vendor.settings.bank' as TranslationKey)}</span>
                <span className="font-medium">{bankInfo.bank_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">{t('vendor.settings.account' as TranslationKey)}</span>
                <span className="font-medium">•••• {bankInfo.account_last4}</span>
              </div>
              <button onClick={() => setShowBankEdit(true)} className="text-sb-primary text-sm font-medium">
                {t('vendor.settings.edit' as TranslationKey)}
              </button>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('vendor.settings.bankName' as TranslationKey)}
                </label>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('vendor.settings.accountHolder' as TranslationKey)}
                </label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('vendor.settings.accountNumber' as TranslationKey)}
                  </label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('vendor.settings.routingNumber' as TranslationKey)}
                  </label>
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
                    <span className="capitalize">
                      {t(`vendor.settings.${type}` as TranslationKey)}
                    </span>
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
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> 
              {t('vendor.settings.saving' as TranslationKey)}
            </>
          ) : (
            <>
              <Save className="h-4 w-4" /> 
              {t('vendor.settings.save' as TranslationKey)}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
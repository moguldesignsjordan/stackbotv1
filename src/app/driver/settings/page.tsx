// src/app/driver/settings/page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { doc, onSnapshot, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import {
  Camera,
  ArrowLeft,
  Loader2,
  CheckCircle,
  AlertCircle,
  User,
  Phone,
  Truck,
  Mail,
} from 'lucide-react';
import Link from 'next/link';

// ============================================================================
// TRANSLATIONS
// ============================================================================
const translations = {
  es: {
    title: 'Configuración',
    profilePhoto: 'Foto de Perfil',
    changePhoto: 'Cambiar foto',
    addPhoto: 'Agregar foto',
    name: 'Nombre completo',
    email: 'Correo electrónico',
    phone: 'Número de teléfono',
    vehicle: 'Tipo de vehículo',
    vehiclePlate: 'Placa del vehículo',
    motorcycle: 'Motocicleta',
    bicycle: 'Bicicleta',
    car: 'Automóvil',
    van: 'Furgoneta',
    saveChanges: 'Guardar cambios',
    saving: 'Guardando...',
    saved: '¡Cambios guardados!',
    errorSaving: 'Error al guardar los cambios',
    errorUpload: 'Error al subir la foto',
    uploading: 'Subiendo foto...',
    back: 'Atrás',
    loading: 'Cargando...',
    personalInfo: 'Información Personal',
    vehicleInfo: 'Información del Vehículo',
    tapToChange: 'Toca para cambiar',
  },
  en: {
    title: 'Settings',
    profilePhoto: 'Profile Photo',
    changePhoto: 'Change photo',
    addPhoto: 'Add photo',
    name: 'Full name',
    email: 'Email address',
    phone: 'Phone number',
    vehicle: 'Vehicle type',
    vehiclePlate: 'Vehicle plate',
    motorcycle: 'Motorcycle',
    bicycle: 'Bicycle',
    car: 'Car',
    van: 'Van',
    saveChanges: 'Save changes',
    saving: 'Saving...',
    saved: 'Changes saved!',
    errorSaving: 'Error saving changes',
    errorUpload: 'Error uploading photo',
    uploading: 'Uploading photo...',
    back: 'Back',
    loading: 'Loading...',
    personalInfo: 'Personal Information',
    vehicleInfo: 'Vehicle Information',
    tapToChange: 'Tap to change',
  },
};

type Language = 'es' | 'en';

interface DriverProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  photoURL?: string;
  vehicleType?: string;
  vehiclePlate?: string;
  [key: string]: any;
}

const VEHICLE_TYPES = ['motorcycle', 'bicycle', 'car', 'van'] as const;

export default function DriverSettings() {
  const fileRef = useRef<HTMLInputElement>(null);

  const [language, setLanguage] = useState<Language>('es');
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<DriverProfile | null>(null);

  // editable fields mirror profile; initialized once profile loads
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [vehicleType, setVehicleType] = useState<string>('motorcycle');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [photoURL, setPhotoURL] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const t = translations[language];

  // ── language ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const saved = localStorage.getItem('stackbot-driver-lang') as Language;
    if (saved === 'es' || saved === 'en') setLanguage(saved);
  }, []);

  // ── auth ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => setUserId(user?.uid ?? null));
    return () => unsub();
  }, []);

  // ── driver doc listener ──────────────────────────────────────────────────
  useEffect(() => {
    if (!userId) return;
    const unsubscribe = onSnapshot(doc(db, 'drivers', userId), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const p: DriverProfile = {
          id: snap.id,
          name: data.name || '',
          email: data.email || '',
          phone: data.phone || '',
          photoURL: data.photoURL || null,
          vehicleType: data.vehicleType || 'motorcycle',
          vehiclePlate: data.vehiclePlate || '',
        };
        setProfile(p);
        // seed form fields (only on first load to avoid overwriting while user types)
        setName(p.name);
        setPhone(p.phone || '');
        setVehicleType(p.vehicleType || 'motorcycle');
        setVehiclePlate(p.vehiclePlate || '');
        setPhotoURL(p.photoURL || null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [userId]);

  // ── show toast helper ────────────────────────────────────────────────────
  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  // ── photo upload ─────────────────────────────────────────────────────────
  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    // basic client validation: image, < 5 MB
    if (!file.type.startsWith('image/')) {
      showToast('error', t.errorUpload);
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('error', language === 'es' ? 'La foto no puede ser mayor a 5 MB' : 'Photo must be under 5 MB');
      return;
    }

    setUploadingPhoto(true);
    try {
      const storage = getStorage();
      const storageRef = ref(storage, `driver_photos/${userId}/profile.jpg`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);

      // persist to Firestore immediately so layout's onSnapshot picks it up
      await updateDoc(doc(db, 'drivers', userId), {
        photoURL: url,
        updatedAt: serverTimestamp(),
      });

      setPhotoURL(url);
      showToast('success', language === 'es' ? '¡Foto actualizada!' : 'Photo updated!');
    } catch (err) {
      console.error('Photo upload error:', err);
      showToast('error', t.errorUpload);
    } finally {
      setUploadingPhoto(false);
      // reset input so the same file can be re-selected if needed
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  // ── save profile fields ──────────────────────────────────────────────────
  const handleSave = async () => {
    if (!userId) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'drivers', userId), {
        name,
        phone,
        vehicleType,
        vehiclePlate,
        updatedAt: serverTimestamp(),
      });
      showToast('success', t.saved);
    } catch (err) {
      console.error('Save error:', err);
      showToast('error', t.errorSaving);
    } finally {
      setSaving(false);
    }
  };

  // ── vehicle type label ───────────────────────────────────────────────────
  const vehicleLabel = (v: string) => {
    const map: Record<string, string> = {
      motorcycle: t.motorcycle,
      bicycle: t.bicycle,
      car: t.car,
      van: t.van,
    };
    return map[v] || v;
  };

  // ── loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-[#55529d] mx-auto mb-3" />
          <p className="text-gray-500">{t.loading}</p>
        </div>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Page header (inside layout's chrome — sits below layout's sticky header) */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 flex items-center gap-3">
        <Link href="/driver" className="p-1 -ml-1 text-gray-500 hover:text-gray-800 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-lg font-semibold text-gray-900">{t.title}</h1>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`mx-4 mt-4 flex items-start gap-3 p-3 rounded-xl border ${
            toast.type === 'success'
              ? 'bg-green-50 border-green-200'
              : 'bg-red-50 border-red-200'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          )}
          <p className={`text-sm ${toast.type === 'success' ? 'text-green-700' : 'text-red-600'}`}>
            {toast.message}
          </p>
        </div>
      )}

      <div className="px-4 pt-6 space-y-6">
        {/* ─── Profile Photo ──────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center">
          <p className="text-sm font-medium text-gray-500 mb-4">{t.profilePhoto}</p>

          {/* Avatar circle — tappable */}
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploadingPhoto}
            className="relative w-28 h-28 mx-auto rounded-full overflow-hidden border-4 border-[#55529d] shadow-md hover:opacity-80 transition-opacity focus:outline-none"
          >
            {photoURL ? (
              <img src={photoURL} alt={profile?.name || 'Avatar'} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-[#55529d]/10 flex items-center justify-center">
                <User className="w-14 h-14 text-[#55529d]/40" />
              </div>
            )}

            {/* overlay label */}
            <div className="absolute inset-0 bg-black/30 flex items-end justify-center pb-2">
              {uploadingPhoto ? (
                <Loader2 className="w-5 h-5 animate-spin text-white" />
              ) : (
                <span className="text-white text-xs font-semibold drop-shadow">
                  {photoURL ? t.changePhoto : t.addPhoto}
                </span>
              )}
            </div>
          </button>

          {/* hidden file input */}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePhotoChange}
          />

          <p className="text-xs text-gray-400 mt-3">{t.tapToChange}</p>
        </div>

        {/* ─── Personal Info ──────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{t.personalInfo}</p>
          </div>

          {/* Name */}
          <div className="px-4 py-3 border-b border-gray-100">
            <label className="flex items-center gap-2 text-sm text-gray-500 mb-1.5">
              <User className="w-4 h-4" />
              {t.name}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full text-sm text-gray-900 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#55529d] focus:border-transparent transition"
            />
          </div>

          {/* Email (read-only) */}
          <div className="px-4 py-3 border-b border-gray-100">
            <label className="flex items-center gap-2 text-sm text-gray-500 mb-1.5">
              <Mail className="w-4 h-4" />
              {t.email}
            </label>
            <div className="w-full text-sm text-gray-400 bg-gray-100 border border-gray-200 rounded-xl px-3 py-2.5 cursor-not-allowed">
              {profile?.email || '—'}
            </div>
          </div>

          {/* Phone */}
          <div className="px-4 py-3">
            <label className="flex items-center gap-2 text-sm text-gray-500 mb-1.5">
              <Phone className="w-4 h-4" />
              {t.phone}
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full text-sm text-gray-900 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#55529d] focus:border-transparent transition"
            />
          </div>
        </div>

        {/* ─── Vehicle Info ───────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{t.vehicleInfo}</p>
          </div>

          {/* Vehicle Type – pill selector */}
          <div className="px-4 py-3 border-b border-gray-100">
            <label className="flex items-center gap-2 text-sm text-gray-500 mb-2.5">
              <Truck className="w-4 h-4" />
              {t.vehicle}
            </label>
            <div className="flex flex-wrap gap-2">
              {VEHICLE_TYPES.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setVehicleType(v)}
                  className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                    vehicleType === v
                      ? 'bg-[#55529d] text-white border-[#55529d]'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-[#55529d]'
                  }`}
                >
                  {vehicleLabel(v)}
                </button>
              ))}
            </div>
          </div>

          {/* Vehicle Plate */}
          <div className="px-4 py-3">
            <label className="flex items-center gap-2 text-sm text-gray-500 mb-1.5">
              <Truck className="w-4 h-4" />
              {t.vehiclePlate}
            </label>
            <input
              type="text"
              value={vehiclePlate}
              onChange={(e) => setVehiclePlate(e.target.value)}
              placeholder="—"
              className="w-full text-sm text-gray-900 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#55529d] focus:border-transparent transition"
            />
          </div>
        </div>

        {/* ─── Save Button ─────────────────────────────────────────────── */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 py-4 bg-[#55529d] hover:bg-[#444280] disabled:opacity-60 text-white font-semibold rounded-2xl shadow-sm transition-all"
        >
          {saving ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>{t.saving}</span>
            </>
          ) : (
            <span>{t.saveChanges}</span>
          )}
        </button>
      </div>
    </div>
  );
}
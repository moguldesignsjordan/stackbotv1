// src/app/driver/settings/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { doc, updateDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase/config';
import { signOut } from 'firebase/auth';
import { ArrowLeft, User, Phone, Mail, Car, Bike, Star, Package, Shield, CheckCircle, AlertCircle, Loader2, Globe, LogOut, Save } from 'lucide-react';
interface DriverProfile { id: string; name: string; email: string; phone?: string; photoURL?: string; vehicleType?: string; vehiclePlate?: string; vehicleColor?: string; city?: string; status: string; verified?: boolean; rating?: number; totalDeliveries?: number; createdAt?: any; }

const translations = {
  es: {
    title: 'Configuración',
    back: 'Volver',
    profileTitle: 'Información Personal',
    name: 'Nombre',
    namePlaceholder: 'Tu nombre completo',
    email: 'Correo Electrónico',
    phone: 'Teléfono / WhatsApp',
    phonePlaceholder: '+1 809 123 4567',
    vehicleTitle: 'Información del Vehículo',
    vehicleType: 'Tipo de Vehículo',
    vehiclePlate: 'Placa',
    vehiclePlatePlaceholder: 'A123456',
    vehicleColor: 'Color',
    vehicleColorPlaceholder: 'Rojo',
    vehicles: { motorcycle: 'Motocicleta', car: 'Carro', bicycle: 'Bicicleta', scooter: 'Scooter' },
    statsTitle: 'Estadísticas',
    totalDeliveries: 'Entregas Totales',
    rating: 'Calificación',
    memberSince: 'Miembro desde',
    accountTitle: 'Cuenta',
    verified: 'Verificado',
    notVerified: 'No Verificado',
    verificationPending: 'Verificación pendiente',
    saveChanges: 'Guardar Cambios',
    saving: 'Guardando...',
    logout: 'Cerrar Sesión',
    saved: '¡Cambios guardados!',
    errorSaving: 'Error al guardar',
    loading: 'Cargando...',
  },
  en: {
    title: 'Settings',
    back: 'Back',
    profileTitle: 'Personal Information',
    name: 'Name',
    namePlaceholder: 'Your full name',
    email: 'Email',
    phone: 'Phone / WhatsApp',
    phonePlaceholder: '+1 809 123 4567',
    vehicleTitle: 'Vehicle Information',
    vehicleType: 'Vehicle Type',
    vehiclePlate: 'Plate',
    vehiclePlatePlaceholder: 'A123456',
    vehicleColor: 'Color',
    vehicleColorPlaceholder: 'Red',
    vehicles: { motorcycle: 'Motorcycle', car: 'Car', bicycle: 'Bicycle', scooter: 'Scooter' },
    statsTitle: 'Statistics',
    totalDeliveries: 'Total Deliveries',
    rating: 'Rating',
    memberSince: 'Member since',
    accountTitle: 'Account',
    verified: 'Verified',
    notVerified: 'Not Verified',
    verificationPending: 'Verification pending',
    saveChanges: 'Save Changes',
    saving: 'Saving...',
    logout: 'Logout',
    saved: 'Changes saved!',
    errorSaving: 'Error saving',
    loading: 'Loading...',
  },
};

type Language = 'es' | 'en';
type VehicleType = 'motorcycle' | 'car' | 'bicycle' | 'scooter';

export default function DriverSettingsPage() {
  const router = useRouter();
  const [language, setLanguage] = useState<Language>('es');
  const [profile, setProfile] = useState<DriverProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [vehicleType, setVehicleType] = useState<VehicleType>('motorcycle');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [vehicleColor, setVehicleColor] = useState('');

  const t = translations[language];
  const userId = auth.currentUser?.uid;

  useEffect(() => {
    const savedLang = localStorage.getItem('stackbot-driver-lang') as Language;
    if (savedLang && (savedLang === 'es' || savedLang === 'en')) setLanguage(savedLang);
  }, []);

  const toggleLanguage = () => {
    const newLang = language === 'es' ? 'en' : 'es';
    setLanguage(newLang);
    localStorage.setItem('stackbot-driver-lang', newLang);
  };

  useEffect(() => {
    if (!userId) return;
    const driverRef = doc(db, 'drivers', userId);
    const unsubscribe = onSnapshot(driverRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as DriverProfile;
        setProfile({ ...data, id: docSnap.id });
        setName(data.name || '');
        setPhone(data.phone || '');
        setVehicleType((data.vehicleType || 'motorcycle') as VehicleType);
        setVehiclePlate(data.vehiclePlate || '');
        setVehicleColor(data.vehicleColor || '');
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [userId]);

  const handleSave = async () => {
    if (!userId) return;
    setSaving(true);
    setMessage(null);
    try {
      const driverRef = doc(db, 'drivers', userId);
      await updateDoc(driverRef, { name, phone, vehicleType, vehiclePlate: vehiclePlate.toUpperCase(), vehicleColor, updatedAt: serverTimestamp() });
      setMessage({ type: 'success', text: t.saved });
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      console.error('Error saving:', err);
      setMessage({ type: 'error', text: t.errorSaving });
      setTimeout(() => setMessage(null), 5000);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      if (profile?.isOnline) {
        const driverRef = doc(db, 'drivers', userId!);
        await updateDoc(driverRef, { isOnline: false, status: 'offline', updatedAt: serverTimestamp() });
      }
      await signOut(auth);
      router.push('/driver/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const formatDate = (timestamp: unknown): string => {
    if (!timestamp) return '-';
    const date = typeof timestamp === 'object' && 'toDate' in timestamp ? (timestamp as { toDate: () => Date }).toDate() : new Date(timestamp as string);
    return date.toLocaleDateString(language === 'es' ? 'es-DO' : 'en-US', { year: 'numeric', month: 'long' });
  };

  const vehicleIcons: Record<VehicleType, React.ReactNode> = {
    motorcycle: <Bike className="w-5 h-5" />,
    car: <Car className="w-5 h-5" />,
    bicycle: <Bike className="w-5 h-5" />,
    scooter: <Bike className="w-5 h-5" />,
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-purple-400 mx-auto" />
          <p className="text-gray-400 mt-2">{t.loading}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white pb-8">
      <header className="sticky top-0 z-40 bg-gray-900/95 backdrop-blur-sm border-b border-gray-800 safe-top">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => router.push('/driver')} className="p-2 -ml-2 text-gray-400 hover:text-white transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-semibold text-white">{t.title}</h1>
          <button onClick={toggleLanguage} className="p-2 -mr-2 text-gray-400 hover:text-white transition-colors">
            <Globe className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="px-4 py-6 space-y-6">
        {message && (
          <div className={`flex items-start gap-3 p-3 rounded-xl ${message.type === 'success' ? 'bg-purple-500/10 border border-purple-500/30' : 'bg-red-500/10 border border-red-500/30'}`}>
            {message.type === 'success' ? <CheckCircle className="w-5 h-5 text-purple-400 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />}
            <p className={`text-sm ${message.type === 'success' ? 'text-purple-300' : 'text-red-300'}`}>{message.text}</p>
          </div>
        )}

        <div className="bg-gray-800/50 rounded-2xl p-5 border border-gray-700/50">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-purple-400" />
            {t.profileTitle}
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">{t.name}</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder={t.namePlaceholder} className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">{t.email}</label>
              <div className="flex items-center gap-3 px-4 py-3 bg-gray-900/30 border border-gray-700/50 rounded-xl text-gray-400">
                <Mail className="w-5 h-5" />
                <span>{profile?.email}</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">{t.phone}</label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={t.phonePlaceholder} className="w-full pl-12 pr-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all" />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gray-800/50 rounded-2xl p-5 border border-gray-700/50">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Car className="w-5 h-5 text-blue-400" />
            {t.vehicleTitle}
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">{t.vehicleType}</label>
              <div className="grid grid-cols-2 gap-3">
                {(['motorcycle', 'car', 'bicycle', 'scooter'] as VehicleType[]).map((type) => (
                  <button key={type} type="button" onClick={() => setVehicleType(type)} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${vehicleType === type ? 'bg-purple-500/20 border-purple-500 text-purple-400' : 'bg-gray-900/50 border-gray-700 text-gray-400 hover:border-gray-600'}`}>
                    {vehicleIcons[type]}
                    <span className="text-sm font-medium">{t.vehicles[type]}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">{t.vehiclePlate}</label>
                <input type="text" value={vehiclePlate} onChange={(e) => setVehiclePlate(e.target.value.toUpperCase())} placeholder={t.vehiclePlatePlaceholder} className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all uppercase" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">{t.vehicleColor}</label>
                <input type="text" value={vehicleColor} onChange={(e) => setVehicleColor(e.target.value)} placeholder={t.vehicleColorPlaceholder} className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all" />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gray-800/50 rounded-2xl p-5 border border-gray-700/50">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-400" />
            {t.statsTitle}
          </h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center mx-auto mb-2">
                <Package className="w-6 h-6 text-purple-400" />
              </div>
              <p className="text-2xl font-bold text-white">{profile?.totalDeliveries || 0}</p>
              <p className="text-xs text-gray-500">{t.totalDeliveries}</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-amber-500/20 rounded-xl flex items-center justify-center mx-auto mb-2">
                <Star className="w-6 h-6 text-amber-400" />
              </div>
              <p className="text-2xl font-bold text-white">{profile?.rating?.toFixed(1) || '5.0'}</p>
              <p className="text-xs text-gray-500">{t.rating}</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center mx-auto mb-2">
                <Shield className="w-6 h-6 text-blue-400" />
              </div>
              <p className="text-sm font-medium text-white">{formatDate(profile?.createdAt)}</p>
              <p className="text-xs text-gray-500">{t.memberSince}</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-800/50 rounded-2xl p-5 border border-gray-700/50">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-purple-400" />
            {t.accountTitle}
          </h2>
          <div className="flex items-center justify-between p-3 bg-gray-900/30 rounded-xl">
            <div className="flex items-center gap-3">
              {profile?.isVerified ? <CheckCircle className="w-5 h-5 text-purple-400" /> : <AlertCircle className="w-5 h-5 text-amber-400" />}
              <span className="text-gray-300">{profile?.isVerified ? t.verified : t.notVerified}</span>
            </div>
            {!profile?.isVerified && <span className="text-xs text-amber-400">{t.verificationPending}</span>}
          </div>
        </div>

        <button onClick={handleSave} disabled={saving} className="w-full flex items-center justify-center gap-2 py-4 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 text-white font-semibold rounded-xl transition-all">
          {saving ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>{t.saving}</span>
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              <span>{t.saveChanges}</span>
            </>
          )}
        </button>

        <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 py-4 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-semibold rounded-xl border border-red-500/30 transition-all">
          <LogOut className="w-5 h-5" />
          <span>{t.logout}</span>
        </button>
      </main>
    </div>
  );
}
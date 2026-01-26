// src/app/driver/account/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase/config';
import { signOut } from 'firebase/auth';
import {
  User,
  Mail,
  Phone,
  Car,
  MapPin,
  Calendar,
  CheckCircle,
  Shield,
  LogOut,
  Loader2,
  AlertCircle,
} from 'lucide-react';

interface DriverProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  photoURL?: string;
  vehicleType: string;
  vehiclePlate: string;
  vehicleColor?: string;
  city?: string;
  status: string;
  verified: boolean;
  rating: number;
  totalDeliveries: number;
  createdAt: any;
}

const translations = {
  es: {
    title: 'Mi Cuenta',
    personalInfo: 'Información Personal',
    vehicleInfo: 'Información del Vehículo',
    name: 'Nombre',
    email: 'Correo Electrónico',
    phone: 'Teléfono',
    vehicle: 'Vehículo',
    plate: 'Placa',
    color: 'Color',
    city: 'Ciudad',
    totalDeliveries: 'Entregas Totales',
    rating: 'Calificación',
    memberSince: 'Miembro desde',
    verified: 'Verificado',
    notVerified: 'No Verificado',
    vehicles: {
      motorcycle: 'Motocicleta',
      car: 'Carro',
      bicycle: 'Bicicleta',
      scooter: 'Scooter',
    },
    logout: 'Cerrar Sesión',
    logoutConfirm: '¿Cerrar sesión?',
    logoutDesc: 'Tendrás que iniciar sesión nuevamente',
    cancel: 'Cancelar',
    confirm: 'Sí, Cerrar Sesión',
  },
  en: {
    title: 'My Account',
    personalInfo: 'Personal Information',
    vehicleInfo: 'Vehicle Information',
    name: 'Name',
    email: 'Email',
    phone: 'Phone',
    vehicle: 'Vehicle',
    plate: 'Plate',
    color: 'Color',
    city: 'City',
    totalDeliveries: 'Total Deliveries',
    rating: 'Rating',
    memberSince: 'Member since',
    verified: 'Verified',
    notVerified: 'Not Verified',
    vehicles: {
      motorcycle: 'Motorcycle',
      car: 'Car',
      bicycle: 'Bicycle',
      scooter: 'Scooter',
    },
    logout: 'Log Out',
    logoutConfirm: 'Log out?',
    logoutDesc: "You'll need to sign in again",
    cancel: 'Cancel',
    confirm: 'Yes, Log Out',
  },
};

type Language = 'es' | 'en';

export default function DriverAccountPage() {
  const router = useRouter();
  const [language, setLanguage] = useState<Language>('es');
  const [profile, setProfile] = useState<DriverProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const t = translations[language];
  const userId = auth.currentUser?.uid;

  useEffect(() => {
    const savedLang = localStorage.getItem('stackbot-driver-lang') as Language;
    if (savedLang && (savedLang === 'es' || savedLang === 'en')) {
      setLanguage(savedLang);
    }
  }, []);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(doc(db, 'drivers', userId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setProfile({
          id: docSnap.id,
          name: data.name || '',
          email: data.email || auth.currentUser?.email || '',
          phone: data.phone || '',
          photoURL: data.photoURL,
          vehicleType: data.vehicleType || '',
          vehiclePlate: data.vehiclePlate || '',
          vehicleColor: data.vehicleColor,
          city: data.city,
          status: data.status || 'offline',
          verified: data.verified || false,
          rating: data.rating || 5.0,
          totalDeliveries: data.totalDeliveries || 0,
          createdAt: data.createdAt,
        });
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId]);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      if (userId) {
        await updateDoc(doc(db, 'drivers', userId), { status: 'offline' });
      }
      await signOut(auth);
      router.push('/driver/login');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setLoggingOut(false);
      setShowLogoutModal(false);
    }
  };

  const getVehicleLabel = (type: string) => {
    const vehicles = t.vehicles as Record<string, string>;
    return vehicles[type] || type;
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '-';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString(language === 'es' ? 'es-DO' : 'en-US', {
      year: 'numeric',
      month: 'long',
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-[#55529d]" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] px-4">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Profile not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-4 space-y-6">
      <div className="bg-white rounded-2xl p-6 border border-gray-100 text-center">
        <div className="relative w-24 h-24 mx-auto mb-4">
          {profile.photoURL ? (
            <Image
              src={profile.photoURL}
              alt={profile.name}
              fill
              className="rounded-full object-cover"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-[#55529d] text-white text-2xl font-bold flex items-center justify-center">
              {getInitials(profile.name)}
            </div>
          )}
          {profile.verified && (
            <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center border-4 border-white">
              <CheckCircle className="w-4 h-4 text-white" />
            </div>
          )}
        </div>

        <h1 className="text-xl font-bold text-gray-900">{profile.name}</h1>
        <div className="flex items-center justify-center gap-2 mt-1">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
            profile.verified ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
          }`}>
            {profile.verified ? (
              <>
                <Shield className="w-3 h-3" />
                {t.verified}
              </>
            ) : (
              t.notVerified
            )}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t border-gray-100">
          <div>
            <p className="text-2xl font-bold text-gray-900">{profile.totalDeliveries}</p>
            <p className="text-xs text-gray-500">{t.totalDeliveries}</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">★ {profile.rating.toFixed(1)}</p>
            <p className="text-xs text-gray-500">{t.rating}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">{t.personalInfo}</h2>
        </div>
        <div className="divide-y divide-gray-100">
          <div className="px-4 py-3 flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <User className="w-5 h-5 text-gray-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500">{t.name}</p>
              <p className="font-medium text-gray-900 truncate">{profile.name}</p>
            </div>
          </div>
          <div className="px-4 py-3 flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <Mail className="w-5 h-5 text-gray-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500">{t.email}</p>
              <p className="font-medium text-gray-900 truncate">{profile.email}</p>
            </div>
          </div>
          <div className="px-4 py-3 flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <Phone className="w-5 h-5 text-gray-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500">{t.phone}</p>
              <p className="font-medium text-gray-900">{profile.phone || '-'}</p>
            </div>
          </div>
          {profile.city && (
            <div className="px-4 py-3 flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                <MapPin className="w-5 h-5 text-gray-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500">{t.city}</p>
                <p className="font-medium text-gray-900">{profile.city}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">{t.vehicleInfo}</h2>
        </div>
        <div className="divide-y divide-gray-100">
          <div className="px-4 py-3 flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Car className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500">{t.vehicle}</p>
              <p className="font-medium text-gray-900">{getVehicleLabel(profile.vehicleType)}</p>
            </div>
          </div>
          <div className="px-4 py-3 flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <span className="text-sm font-bold text-gray-500">#</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500">{t.plate}</p>
              <p className="font-medium text-gray-900 font-mono">{profile.vehiclePlate}</p>
            </div>
          </div>
          {profile.vehicleColor && (
            <div className="px-4 py-3 flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500">{t.color}</p>
                <p className="font-medium text-gray-900">{profile.vehicleColor}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
            <Calendar className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500">{t.memberSince}</p>
            <p className="font-medium text-gray-900">{formatDate(profile.createdAt)}</p>
          </div>
        </div>
      </div>

      <button
        onClick={() => setShowLogoutModal(true)}
        className="w-full flex items-center justify-center gap-2 py-3 text-red-600 font-medium hover:bg-red-50 rounded-xl transition-colors"
      >
        <LogOut className="w-5 h-5" />
        {t.logout}
      </button>

      {showLogoutModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <LogOut className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 text-center mb-2">{t.logoutConfirm}</h3>
            <p className="text-sm text-gray-600 text-center mb-6">{t.logoutDesc}</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 py-3 border border-gray-200 rounded-xl font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                {t.cancel}
              </button>
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="flex-1 py-3 bg-red-500 text-white rounded-xl font-semibold hover:bg-red-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {loggingOut && <Loader2 className="w-4 h-4 animate-spin" />}
                {t.confirm}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
